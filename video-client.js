/**
 * Audio ingestion for the Meeting Co-Pilot. Real-time transcription via
 * Deepgram's streaming endpoint (wss://api.deepgram.com/v1/listen —
 * confirmed against current docs: binary audio frames in, JSON
 * transcript events out, `Authorization: Token <key>` header).
 *
 * This is the WebRTC-capture side, not a Zoom/Teams auto-join bot — see
 * meeting-bot.js's header for the full explanation of that boundary.
 * The expected client is a small browser widget the account holder runs
 * alongside their call (captures tab/system audio via getDisplayMedia,
 * downsamples to 16kHz linear16 PCM, streams it here as binary frames).
 * Building that browser widget itself is a frontend task, out of scope
 * for this Node backend — this is the server-side counterpart it talks to.
 */

const WebSocket = require("ws");
const meetingBot = require("./meeting-bot");

// sessionId -> { deepgramSocket, clients: Set<{ ws, userId }> }
const SESSIONS = new Map();

function openDeepgramSocket(sessionId) {
  const dgSocket = new WebSocket(
    "wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en-US&sample_rate=16000&encoding=linear16&interim_results=false",
    { headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` } }
  );

  dgSocket.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const transcript = msg.channel?.alternatives?.[0]?.transcript;
    if (!msg.is_final || !transcript || !transcript.trim()) return;

    const entry = SESSIONS.get(sessionId);
    if (!entry) return;

    try {
      const evaluation = await meetingBot.evaluateSnippet(transcript);
      if (!evaluation.worth_flagging) return;

      const snippetId = await meetingBot.proposeSnippet(sessionId, transcript, evaluation.category);
      broadcast(sessionId, {
        type: "should_i_take_this_in",
        snippetId,
        text: transcript,
        category: evaluation.category
      });
    } catch (err) {
      console.warn(`[video-client] Snippet evaluation failed for session ${sessionId}:`, err.message);
    }
  });

  dgSocket.on("error", (err) => console.warn(`[video-client] Deepgram socket error (session ${sessionId}):`, err.message));

  // Keep-alive, per Deepgram's documented recommendation for streaming connections.
  const keepAlive = setInterval(() => {
    if (dgSocket.readyState === WebSocket.OPEN) dgSocket.send(JSON.stringify({ type: "KeepAlive" }));
  }, 8000);
  dgSocket.on("close", () => clearInterval(keepAlive));

  return dgSocket;
}

function broadcast(sessionId, message) {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  const payload = JSON.stringify(message);
  entry.clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
  });
}

function closeSession(sessionId) {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  entry.deepgramSocket.close();
  entry.clients.forEach((c) => c.ws.close());
  SESSIONS.delete(sessionId);
}

/**
 * Attaches the meeting WebSocket to the existing HTTP server, at
 * /ws/meeting?sessionId=...&userId=...
 *
 * Capacity note on "works for up to 20 users simultaneously": each
 * Gurost user connected to a session is one WebSocket client; each
 * distinct meeting session is one Deepgram streaming connection. 20
 * concurrent users across, say, 5 concurrent meetings is 5 Deepgram
 * connections + 20 WS clients — well within what a single Node process
 * handles. This hasn't been load-tested against a real Deepgram account
 * from here, same standing caveat as everything else in this build.
 */
function attachMeetingSocket(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: "/ws/meeting" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");

    if (!sessionId || !userId) {
      ws.close(1008, "Missing sessionId or userId");
      return;
    }

    let session;
    try {
      session = await meetingBot.getSession(sessionId);
    } catch {
      ws.close(1008, "Session not found");
      return;
    }
    if (session.status !== "active") {
      ws.close(1008, "Session not consented/active yet — complete /api/meeting/consent first.");
      return;
    }

    if (!SESSIONS.has(sessionId)) {
      SESSIONS.set(sessionId, { deepgramSocket: openDeepgramSocket(sessionId), clients: new Set() });
    }
    const entry = SESSIONS.get(sessionId);
    const client = { ws, userId };
    entry.clients.add(client);

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        // Raw audio frame — relay straight to Deepgram.
        if (entry.deepgramSocket.readyState === WebSocket.OPEN) entry.deepgramSocket.send(data);
        return;
      }
      // Text frame — a snippet decision from this user.
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "snippet_decision" && msg.snippetId && msg.decision) {
          meetingBot
            .recordSnippetDecision(msg.snippetId, userId, msg.decision)
            .catch((err) => console.warn("[video-client] Failed to record snippet decision:", err.message));
        }
      } catch {
        /* ignore malformed control messages */
      }
    });

    ws.on("close", () => {
      entry.clients.delete(client);
      // Last client gone doesn't auto-end the session — /api/meeting/end
      // is the explicit signal, since a brief disconnect/reconnect
      // shouldn't tear down an in-progress meeting's Deepgram connection.
    });
  });

  return { closeSession };
}

module.exports = { attachMeetingSocket };
