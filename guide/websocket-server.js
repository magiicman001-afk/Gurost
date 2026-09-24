/**
 * Real-time channel between a project's frontend session(s) and the
 * Guide Bot — now also the real-time collaboration channel. Multiple
 * connections can share the same projectId; all of them see each
 * other's presence and every applied change live, not just their own.
 *
 * Server -> client messages:
 *   { type: "suggestion",     suggestion }
 *   { type: "applied",        html, summary }              (this connection's own action)
 *   { type: "collab_update",  html, summary, appliedBy }    (ANY collaborator's action, incl. REST)
 *   { type: "presence",       users: [userId, ...] }
 *   { type: "acknowledged",   message }
 *   { type: "voice_response", audioBase64 }
 *   { type: "error",          error }
 *
 * Client -> server messages:
 *   { type: "pulse_audio", audioBase64, mimeType }
 *   { type: "pulse_text",  text }
 */

const { WebSocketServer } = require("ws");
const guideBot = require("./guide-bot");
const voiceClient = require("./voice-client");
const correctionBot = require("../bots/correction-bot");
const integrator = require("../bots/integrator-bot");
const { withProjectLock } = require("../lib/project-lock");

// projectId -> Set<{ ws, userId }>. Module-level so both the connection
// handler and the exported broadcastProjectUpdate() (called from
// server.js's REST /api/pulse route) share the same room state.
const ROOMS = new Map();

function getRoom(projectId) {
  if (!ROOMS.has(projectId)) ROOMS.set(projectId, new Set());
  return ROOMS.get(projectId);
}

function presenceList(projectId) {
  return [...getRoom(projectId)].map((c) => c.userId);
}

function broadcastToRoom(projectId, message, excludeWs) {
  const payload = JSON.stringify(message);
  for (const client of getRoom(projectId)) {
    if (client.ws === excludeWs) continue;
    if (client.ws.readyState === client.ws.OPEN) client.ws.send(payload);
  }
}

function broadcastPresence(projectId) {
  broadcastToRoom(projectId, { type: "presence", users: presenceList(projectId) });
}

/**
 * Called from server.js's REST /api/pulse route after a correction
 * lands there, so WebSocket-connected collaborators see it live even
 * though the change itself came in over plain HTTP, not the socket.
 * No-op (not an error) if nobody's connected to this project's room.
 */
function broadcastProjectUpdate(projectId, message) {
  if (message && (message.type === "stage_progress" || message.type === "error")) {
    const history = STATUS_HISTORY.get(projectId) || [];
    history.push(message);
    STATUS_HISTORY.set(projectId, history.slice(-30));
  }
  broadcastToRoom(projectId, message);
}

// projectId -> recent build status messages. Builds start the moment the
// REST call returns, so early stages (or an immediate failure) are often
// broadcast before the browser's socket has connected; replaying them on
// join means a late joiner still sees real progress and real errors
// instead of sitting on "Starting…" forever.
const STATUS_HISTORY = new Map();

function attachGuideBotSocket(httpServer, PROJECTS) {
  // noServer + a path-checked upgrade listener, not { server, path }: with
  // ws's { server } option every WebSocketServer on the same HTTP server
  // runs handleUpgrade on EVERY upgrade and aborts the ones whose path
  // doesn't match - so the /ws/meeting server was destroying every
  // /ws/guide socket about a second after it opened.
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req, socket, head) => {
    if (new URL(req.url, "http://localhost").pathname !== "/ws/guide") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    const userId = url.searchParams.get("userId");

    if (!projectId || !userId) {
      ws.close(1008, "projectId and userId query params are required");
      return;
    }

    const room = getRoom(projectId);
    const client = { ws, userId };
    room.add(client);
    broadcastPresence(projectId); // let everyone know someone joined, including the new arrival
    for (const past of STATUS_HISTORY.get(projectId) || []) ws.send(JSON.stringify(past));

    let pendingSuggestion = null;

    async function pushSuggestions() {
      const project = PROJECTS.get(projectId);
      if (!project) return;
      try {
        const { suggestions } = await guideBot.analyzeAndSuggest(project, userId);
        for (const s of suggestions) {
          pendingSuggestion = s;
          ws.send(JSON.stringify({ type: "suggestion", suggestion: s }));
        }
      } catch (err) {
        // Background suggestions are optional - a failure here must not
        // arrive as type "error", which builder pages treat as the build
        // itself failing (it hid the live progress panel mid-build).
        console.warn(`[guide-bot] Suggestion pass failed for project ${projectId}:`, err.message);
        ws.send(JSON.stringify({ type: "suggestion_unavailable", error: err.message }));
      }
    }

    pushSuggestions();
    const interval = setInterval(pushSuggestions, 45000);

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.send(JSON.stringify({ type: "error", error: "Malformed message." }));
      }

      const project = PROJECTS.get(projectId);
      if (!project) return ws.send(JSON.stringify({ type: "error", error: "Project not found." }));

      try {
        let transcript;
        if (msg.type === "pulse_audio") {
          const audioBuffer = Buffer.from(msg.audioBase64, "base64");
          transcript = await voiceClient.transcribe(audioBuffer, msg.mimeType || "audio/webm");
        } else if (msg.type === "pulse_text") {
          transcript = msg.text;
        } else {
          return;
        }

        const classified = guideBot.classifyVoiceResponse(transcript);
        let result;

        // Same lock used by the REST /api/pulse route — a voice
        // correction from one collaborator and a typed correction from
        // another, arriving at nearly the same moment, now queue
        // instead of racing. See lib/project-lock.js.
        if (classified.intent === "accept" && pendingSuggestion) {
          result = await withProjectLock(projectId, async () => {
            const r = await correctionBot.applyCorrection(project.currentHtml, pendingSuggestion.action_hint);
            integrator.integrateCorrection(project, r);
            return r;
          });
          await guideBot.recordResponse(userId, pendingSuggestion, "accepted");
          ws.send(JSON.stringify({ type: "applied", html: project.currentHtml, summary: result.summary }));
          broadcastToRoom(projectId, { type: "collab_update", html: project.currentHtml, summary: result.summary, appliedBy: userId }, ws);
          pendingSuggestion = null;
        } else if (classified.intent === "reject" && pendingSuggestion) {
          await guideBot.recordResponse(userId, pendingSuggestion, "rejected");
          ws.send(JSON.stringify({ type: "acknowledged", message: "Skipped." }));
          pendingSuggestion = null;
        } else {
          const instruction = classified.instruction || transcript;
          result = await withProjectLock(projectId, async () => {
            const r = await correctionBot.applyCorrection(project.currentHtml, instruction);
            integrator.integrateCorrection(project, r);
            return r;
          });
          ws.send(JSON.stringify({ type: "applied", html: project.currentHtml, summary: result.summary }));
          broadcastToRoom(projectId, { type: "collab_update", html: project.currentHtml, summary: result.summary, appliedBy: userId }, ws);
        }

        try {
          const audio = await voiceClient.speak(result ? result.summary : "Okay.");
          ws.send(JSON.stringify({ type: "voice_response", audioBase64: audio.toString("base64") }));
        } catch {
          // voice is a nice-to-have on top of the already-applied change
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", error: err.message }));
      }
    });

    ws.on("close", () => {
      clearInterval(interval);
      room.delete(client);
      if (room.size === 0) ROOMS.delete(projectId);
      else broadcastPresence(projectId);
    });
  });

  return wss;
}

module.exports = { attachGuideBotSocket, broadcastProjectUpdate, presenceList };
