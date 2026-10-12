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

const { wsJson } = require("../lib/brand");
const { WebSocketServer } = require("ws");
const guideBot = require("./guide-bot");
const voiceClient = require("./voice-client");
const correctionBot = require("../bots/correction-bot");
const integrator = require("../bots/integrator-bot");
const { withProjectLock } = require("../lib/project-lock");

// A socket has this long to send { type: "auth", token | apiKey } before it is closed.
const AUTH_TIMEOUT_MS = 10000;

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
  const payload = wsJson(message);
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
  if (message && !message.at) message.at = Date.now(); // replayed events keep their real time
  if (message && (message.type === "stage_progress" || message.type === "error" || message.type === "credibility_check")) {
    // Live-preview partials are whole pages (10-50KB); a late joiner
    // only needs the newest one, so earlier partials are dropped.
    const isPartial = message.type === "stage_progress" && message.status === "partial";
    const history = (STATUS_HISTORY.get(projectId) || []).filter((m) => !(isPartial && m.status === "partial"));
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
const KEEPALIVE_MS = Number(process.env.WS_KEEPALIVE_MS) || 25000;

function attachGuideBotSocket(httpServer, PROJECTS, {
  authenticate = (creds) => require("../auth").authenticateToken(creds),
  // Same as the REST routes: the project in memory, or restored from the database.
  loadProject = async (id) => {
    if (PROJECTS.has(id)) return PROJECTS.get(id);
    const restored = await require("../project-state").hydrateProjectIfMissing(id);
    if (restored) PROJECTS.set(id, restored);
    return restored;
  },
  authTimeoutMs = AUTH_TIMEOUT_MS,
  // The login cookie is only honoured on a socket opened by one of Gurost's own pages: browsers send
  // cookies on any site's WebSocket, so without this another site could act as the visitor.
  cookieOriginAllowed = (req) => require("../auth").sessions().originAllowed(req)
} = {}) {
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

  // Keepalive. A build can go quiet for a minute or more between messages, and hosting proxies close
  // connections that stay silent that long - a phone then never hears that a design finished. A ping every
  // 25s keeps the line open; one that gets no answer for two rounds is dead and is closed so the page
  // notices (and reconnects) instead of waiting on a socket that goes nowhere.
  const keepalive = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.missedPongs >= 2) { ws.terminate(); continue; }
      ws.missedPongs = (ws.missedPongs || 0) + 1;
      try { ws.ping(); } catch { /* closing */ }
    }
  }, KEEPALIVE_MS);
  keepalive.unref();
  wss.on("close", () => clearInterval(keepalive));

  wss.on("connection", (ws, req) => {
    ws.missedPongs = 0;
    ws.on("pong", () => { ws.missedPongs = 0; });
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      ws.close(1008, "projectId is required");
      return;
    }

    // Nothing reaches this socket - no history, no broadcasts, no Pulse edits -
    // until its FIRST message proves who it is and that the project is theirs
    // (owner, or an admin - the same rule as the REST routes). Audit 2026-10-08:
    // the URL's userId used to be trusted, so anyone with a project id could
    // read the build and run AI edits on someone else's site. The token comes in
    // the message, never the URL (URLs end up in logs); the user id comes from it.
    let userId = null;
    let room = null;
    let client = null;
    let interval = null;
    let checking = false;
    const authTimer = setTimeout(() => ws.close(4401, "Login required"), authTimeoutMs);

    // Close codes the pages act on: 4401 = the login is missing, expired or wrong (go and log in);
    // 4403 = logged in, but not this project (stop); 1011 = the check itself failed (try again later).
    async function admit(msg) {
      checking = true;
      clearTimeout(authTimer); // the login has arrived - a slow check is not a missing login
      let user, project;
      try {
        const cookie = !msg.token && !msg.apiKey && cookieOriginAllowed(req) ? req.headers.cookie : undefined;
        user = await authenticate({ token: msg.token, apiKey: msg.apiKey, cookie });
        project = user ? await loadProject(projectId) : null;
      } catch (err) {
        // Database or network trouble, not the person's login: never answer it with "log in again".
        console.warn(`[ws-auth] Login check failed for project ${projectId}:`, err.message);
        if (ws.readyState === ws.OPEN) ws.close(1011, "Try again");
        return;
      }
      // Closed while the login was being checked: nothing to join.
      if (ws.readyState !== ws.OPEN) return;
      if (!user) return ws.close(4401, "Login required");
      // One answer whether the project is missing or someone else's - no hint either way.
      if (!project || (project.userId !== user.id && !user.isAdmin)) return ws.close(4403, "Not allowed");
      userId = user.id;
      room = getRoom(projectId);
      client = { ws, userId };
      room.add(client);
      broadcastPresence(projectId); // let everyone know someone joined, including the new arrival
      for (const past of STATUS_HISTORY.get(projectId) || []) ws.send(wsJson(past));
      pushSuggestions();
      interval = setInterval(pushSuggestions, 45000);
    }

    let pendingSuggestion = null;

    async function pushSuggestions() {
      const project = PROJECTS.get(projectId);
      if (!project) return;
      try {
        const { suggestions } = await guideBot.analyzeAndSuggest(project, userId);
        for (const s of suggestions) {
          pendingSuggestion = s;
          ws.send(wsJson({ type: "suggestion", suggestion: s }));
        }
      } catch (err) {
        // Background suggestions are optional - a failure here must not
        // arrive as type "error", which builder pages treat as the build
        // itself failing (it hid the live progress panel mid-build).
        console.warn(`[guide-bot] Suggestion pass failed for project ${projectId}:`, err.message);
        ws.send(wsJson({ type: "suggestion_unavailable", error: err.message }));
      }
    }

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        if (!userId) return ws.close(4401, "Login required");
        return ws.send(wsJson({ type: "error", error: "Malformed message." }));
      }

      // Before login: the only message accepted is the login itself.
      if (!userId) {
        if (checking) return; // a login is being checked - nothing else until it's done
        if (msg.type !== "auth") return ws.close(4401, "Login required");
        return admit(msg);
      }

      const project = PROJECTS.get(projectId);
      if (!project) return ws.send(wsJson({ type: "error", error: "Project not found." }));

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
          ws.send(wsJson({ type: "applied", html: project.currentHtml, summary: result.summary }));
          broadcastToRoom(projectId, { type: "collab_update", html: project.currentHtml, summary: result.summary, appliedBy: userId }, ws);
          pendingSuggestion = null;
        } else if (classified.intent === "reject" && pendingSuggestion) {
          await guideBot.recordResponse(userId, pendingSuggestion, "rejected");
          ws.send(wsJson({ type: "acknowledged", message: "Skipped." }));
          pendingSuggestion = null;
        } else {
          const instruction = classified.instruction || transcript;
          result = await withProjectLock(projectId, async () => {
            const r = await correctionBot.applyCorrection(project.currentHtml, instruction);
            integrator.integrateCorrection(project, r);
            return r;
          });
          ws.send(wsJson({ type: "applied", html: project.currentHtml, summary: result.summary }));
          broadcastToRoom(projectId, { type: "collab_update", html: project.currentHtml, summary: result.summary, appliedBy: userId }, ws);
        }

        try {
          const audio = await voiceClient.speak(result ? result.summary : "Okay.");
          ws.send(wsJson({ type: "voice_response", audioBase64: audio.toString("base64") }));
        } catch {
          // voice is a nice-to-have on top of the already-applied change
        }
      } catch (err) {
        ws.send(wsJson({ type: "error", error: err.message }));
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimer);
      clearInterval(interval);
      if (!room) return; // never got in
      room.delete(client);
      if (room.size === 0) ROOMS.delete(projectId);
      else broadcastPresence(projectId);
    });
  });

  return wss;
}

module.exports = { attachGuideBotSocket, broadcastProjectUpdate, presenceList };
