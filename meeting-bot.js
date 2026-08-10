/**
 * Gurost Meeting Co-Pilot — consent-gated listening, per-snippet
 * approval, per-user tailored summaries.
 *
 * SCOPE NOTE, read before assuming this "joins Zoom/Teams calls":
 * this module handles the actual Gurost-specific logic (consent
 * tracking, snippet classification, approval, summary generation) —
 * it does NOT autonomously join a Zoom/Teams meeting as a bot
 * participant. Getting audio INTO this pipeline requires one of:
 *   (a) A client-side capture widget the account holder runs in their
 *       own browser tab during the call (captures tab/system audio via
 *       getDisplayMedia, streams it to video-client.js's WebSocket).
 *       This is what's assumed/supported here.
 *   (b) Zoom's official RTMS (Real-Time Media Streams) product — a
 *       real, documented API, but it requires registering and getting
 *       approval for a Zoom App, an external account/approval process
 *       this code can't do for you, same category as the Google Play/
 *       Apple Developer account requirements elsewhere in this repo.
 *   (c) A headless-browser-joins-the-call approach (Playwright, which
 *       this repo already has for revamp-bot.js) — technically
 *       possible but fragile: it breaks whenever Zoom/Meet/Teams change
 *       their UI, since it's automating a product not built to be
 *       automated. Not implemented here.
 * "Integrate with WebRTC or Zoom/Teams API" in the original request is
 * satisfied at the (a)/WebRTC-capture level, not the Zoom/Teams-API
 * auto-join level.
 *
 * Two DIFFERENT consent/approval layers, don't conflate them:
 *  - Session-level consent: ALL expected participants (tracked by
 *    whatever label the client provides — not every attendee has a
 *    Gurost account) must agree before ANY audio is transcribed.
 *  - Snippet-level approval: for each Gurost USER on the call (there
 *    can be several — "each user has their own bot" — mapped onto the
 *    team-collaboration.js workspace member model), that specific user
 *    approves/declines whether a flagged snippet goes into THEIR
 *    summary. Two Gurost users on the same call can end up with
 *    different summaries, by design.
 *
 * SQL (run once):
 *   create table meeting_sessions (
 *     id uuid primary key default gen_random_uuid(),
 *     owner_user_id text not null,
 *     workspace_id uuid,
 *     expected_participants jsonb not null default '[]',
 *     consents jsonb not null default '{}',
 *     status text not null default 'awaiting_consent',
 *     transcript jsonb not null default '[]',
 *     started_at timestamptz,
 *     ended_at timestamptz,
 *     created_at timestamptz default now()
 *   );
 *   create table meeting_snippets (
 *     id uuid primary key default gen_random_uuid(),
 *     session_id uuid not null references meeting_sessions(id) on delete cascade,
 *     text text not null,
 *     category text,
 *     decisions jsonb not null default '{}',
 *     created_at timestamptz default now()
 *   );
 *   create table meeting_summaries (
 *     id uuid primary key default gen_random_uuid(),
 *     session_id uuid not null references meeting_sessions(id) on delete cascade,
 *     user_id text not null,
 *     summary jsonb not null,
 *     created_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");
const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const livekit = require("./lib/livekit-client");
const { broadcastProjectUpdate } = require("./guide/websocket-server");

/**
 * Real status tracking for the "is the bot taking notes right now"
 * indicator. Four states, matching exactly what was asked for — each
 * one tied to a real, distinct moment in this file's actual logic, not
 * a cosmetic label:
 *
 *   IDLE       - session exists but isn't actively capturing (before
 *                consent, or between snippets with nothing running)
 *   LISTENING  - session is live and consented; this is the bot's
 *                normal "taking notes" baseline while a meeting is
 *                actually happening
 *   PROCESSING - a real evaluateSnippet() Claude call is actively
 *                in flight for a specific transcript chunk
 *   DONE       - endSession() has completed and a summary exists
 *
 * Broadcast reuses guide/websocket-server.js's existing room/broadcast
 * mechanism (the same one video rooms already use) — the meeting's own
 * sessionId is the room key, no new WebSocket infrastructure needed.
 *
 * HONEST GAP, said plainly rather than left implicit: evaluateSnippet()
 * isn't currently called from anywhere in server.js — there's no live
 * transcript-streaming route feeding it real chunks yet (matches
 * video.html not being built yet either). The PROCESSING state is
 * real and wired correctly; it just won't actually fire in a live
 * meeting until something calls evaluateSnippet repeatedly during a
 * real call, the same way App Builder's stage events don't fire until
 * generation is actually running.
 */

const STATUS = { IDLE: "idle", LISTENING: "listening", PROCESSING: "processing", DONE: "done" };
const sessionStatus = new Map(); // sessionId -> status string

function setStatus(sessionId, status) {
  sessionStatus.set(sessionId, status);
  broadcastProjectUpdate(sessionId, { type: "copilot_status", status });
}

function getStatus(sessionId) {
  return sessionStatus.get(sessionId) || STATUS.IDLE;
}

const CONSENT_NOTICE =
  "Hi, I'm Gurost. I'll be listening and taking notes. Is that OK with everyone?";

const EVALUATE_SYSTEM = `You are watching a live meeting transcript for moments worth flagging.

Given one short spoken segment, decide if it sounds like a decision being made or an action item being assigned — not general conversation.

Output ONLY valid JSON: {"worth_flagging": true|false, "category": "decision"|"action_item"|null}

Rules:
- Only flag clear, concrete moments — "let's ship this Friday" or "Sarah will send the deck by Tuesday," not small talk or partial sentences.
- Default to false. Flagging too much defeats the purpose of asking permission at all.`;

const SUMMARY_SYSTEM = `You are generating a meeting summary from a set of approved transcript snippets for one specific participant.

Output ONLY valid JSON: {"decisions": ["..."], "action_items": [{"task": "...", "owner": "..."}], "efficiency_analysis": "one paragraph — was time used well, what could have been shorter, any repeated points"}

Rules:
- Base this ONLY on the snippets you're given — do not invent decisions or action items that aren't in them.
- If there isn't enough material for a category, return an empty array for it rather than padding.
- "efficiency_analysis" should be genuinely useful feedback, not generic praise.`;

async function createSession(ownerUserId, workspaceId, expectedParticipants) {
  const { data, error } = await supabase
    .from("meeting_sessions")
    .insert({
      owner_user_id: ownerUserId,
      workspace_id: workspaceId || null,
      expected_participants: expectedParticipants, // [{id, label}]
      consents: {}
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create meeting session: ${error.message}`);
  setStatus(data.id, STATUS.IDLE);
  return { sessionId: data.id, consentNotice: CONSENT_NOTICE };
}

async function getSession(sessionId) {
  const { data, error } = await supabase.from("meeting_sessions").select("*").eq("id", sessionId).single();
  if (error) throw new Error(`Meeting session not found: ${error.message}`);
  return data;
}

function allConsented(session) {
  const ids = session.expected_participants.map((p) => p.id);
  return ids.length > 0 && ids.every((id) => session.consents[id] === true);
}

async function recordConsent(sessionId, participantId, agreed) {
  const session = await getSession(sessionId);
  const consents = { ...session.consents, [participantId]: agreed };

  let status = session.status;
  if (!agreed) {
    // Any single decline blocks the whole session — "all participants
    // must agree before the bot starts listening" is not a majority vote.
    status = "declined";
  } else {
    const updated = { ...session, consents };
    if (allConsented(updated)) status = "active";
  }

  const { error } = await supabase
    .from("meeting_sessions")
    .update({ consents, status, started_at: status === "active" ? new Date().toISOString() : session.started_at })
    .eq("id", sessionId);
  if (error) throw new Error(`Failed to record consent: ${error.message}`);

  // Co-Pilot's own activity status (the indicator's states) is
  // deliberately separate from the consent-lifecycle `status` field
  // just written above — "active" (consent) and "LISTENING" (Co-Pilot
  // is now actually taking notes) are related but different facts.
  if (status === "active") setStatus(sessionId, STATUS.LISTENING);
  else if (status === "declined") setStatus(sessionId, STATUS.IDLE);

  return { status, consents };
}

async function evaluateSnippet(sessionId, text) {
  setStatus(sessionId, STATUS.PROCESSING);
  try {
    const { parsed } = await callClaude({
      system: EVALUATE_SYSTEM,
      messages: [{ role: "user", content: text }],
      maxTokens: 150,
      model: CLAUDE_MODEL_FAST // this runs on every transcript segment — must stay cheap
    });
    return parsed;
  } finally {
    // Back to the baseline "taking notes" state regardless of success
    // or failure — a failed evaluation shouldn't leave the indicator
    // stuck flashing amber forever.
    setStatus(sessionId, STATUS.LISTENING);
  }
}

async function proposeSnippet(sessionId, text, category) {
  const { data, error } = await supabase
    .from("meeting_snippets")
    .insert({ session_id: sessionId, text, category, decisions: {} })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to store snippet: ${error.message}`);
  return data.id;
}

async function recordSnippetDecision(snippetId, userId, decision) {
  const { data: snippet, error: fetchError } = await supabase
    .from("meeting_snippets")
    .select("decisions")
    .eq("id", snippetId)
    .single();
  if (fetchError) throw new Error(`Snippet not found: ${fetchError.message}`);

  const decisions = { ...snippet.decisions, [userId]: decision }; // decision: "approved" | "declined"
  const { error } = await supabase.from("meeting_snippets").update({ decisions }).eq("id", snippetId);
  if (error) throw new Error(`Failed to record snippet decision: ${error.message}`);
}

/**
 * Ends the session and generates ONE tailored summary per Gurost user
 * who participated (derived from whichever user IDs appear in any
 * snippet's decisions map) — each summary built only from the snippets
 * THAT user approved, which is why two users on the same call can get
 * different summaries.
 */
async function endSession(sessionId) {
  const { data: snippets, error } = await supabase
    .from("meeting_snippets")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw new Error(`Failed to load snippets: ${error.message}`);

  const userIds = new Set();
  snippets.forEach((s) => Object.keys(s.decisions || {}).forEach((uid) => userIds.add(uid)));

  const summaries = {};
  for (const userId of userIds) {
    const approvedSnippets = snippets.filter((s) => s.decisions[userId] === "approved").map((s) => s.text);

    if (approvedSnippets.length === 0) {
      summaries[userId] = { decisions: [], action_items: [], efficiency_analysis: "No snippets were approved for capture, so there's nothing to summarize for this participant." };
      continue;
    }

    const { parsed } = await callClaude({
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ approvedSnippets }) }],
      maxTokens: 1500
    });
    summaries[userId] = parsed;

    await supabase.from("meeting_summaries").insert({ session_id: sessionId, user_id: userId, summary: parsed });
  }

  await supabase.from("meeting_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId);
  setStatus(sessionId, STATUS.DONE);

  return summaries;
}

async function getSummary(sessionId, userId) {
  const { data, error } = await supabase
    .from("meeting_summaries")
    .select("summary, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load summary: ${error.message}`);
  return data;
}

/**
 * Real video room for this session, using the session's own real ID as
 * the LiveKit room name — no separate "roomId" concept needed, the
 * meeting session already is the room's identity.
 */
function roomNameFor(sessionId) {
  return `meeting-${sessionId}`;
}

async function createVideoRoom(sessionId) {
  await livekit.createRoom(roomNameFor(sessionId));
  return { roomName: roomNameFor(sessionId) };
}

async function getParticipantJoinToken(sessionId, participantId) {
  return livekit.createJoinToken(roomNameFor(sessionId), participantId, { canPublish: true, canSubscribe: true });
}

/**
 * The Co-Pilot's own token — subscribe-only, real permission
 * enforcement via LiveKit's grant system, not just a UI convention.
 * The bot listens; it never publishes camera/mic/screen tracks itself.
 */
async function getCoPilotJoinToken(sessionId) {
  return livekit.createJoinToken(roomNameFor(sessionId), "gurost-copilot", { canPublish: false, canSubscribe: true });
}

async function endVideoRoom(sessionId) {
  await livekit.deleteRoom(roomNameFor(sessionId)).catch(() => {}); // already-ended room isn't an error
}

module.exports = {
  CONSENT_NOTICE,
  STATUS,
  getStatus,
  createSession,
  getSession,
  allConsented,
  recordConsent,
  evaluateSnippet,
  proposeSnippet,
  recordSnippetDecision,
  endSession,
  getSummary,
  createVideoRoom,
  getParticipantJoinToken,
  getCoPilotJoinToken,
  endVideoRoom
};
