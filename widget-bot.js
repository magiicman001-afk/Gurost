/**
 * Widget Bot — classifies a free-text/voice command and routes it to a
 * REAL capability, or responds honestly when the command needs
 * something that doesn't exist yet (Gmail/Calendar OAuth, specifically —
 * flagged repeatedly across earlier rounds, still not built, still a
 * real external verification process, not something this file can
 * shortcut).
 *
 * The honesty rule this file follows: never respond to a
 * calendar/email command as if it did something. Say plainly what's
 * missing, and offer a real alternative where one genuinely exists —
 * e.g. "schedule a meeting" can't touch an external calendar, but it
 * CAN create a real Gurost video room (meeting-bot.js, already real),
 * which is a genuine, different, still-useful thing to offer instead
 * of a flat no.
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const assistantBot = require("./bots/assistant-bot");
const sketchBot = require("./sketch-bot");
const researchBot = require("./bots/research-bot");
const reminders = require("./lib/reminders");
const meetingBot = require("./meeting-bot");
const { supabase } = require("./lib/db");
const memoryClient = require("./guide/memory-client");
const userLearning = require("./user-learning");

const CLASSIFY_SYSTEM = `You are classifying a command given to a business assistant widget.

Output ONLY valid JSON: {"intent": "draft_content"|"sketch_diagram"|"remind_me"|"meeting_summary"|"calendar_query"|"schedule_meeting"|"email_action"|"research"|"unclear", "extractedTask": "the core task/content, cleaned up"}

Rules:
- "draft_content": writing/drafting anything (emails, blog posts, messages) — the CONTENT itself, not sending it anywhere.
- "sketch_diagram": flowcharts, process flows, org charts, wireframes, diagrams of any kind.
- "remind_me": explicit reminder requests.
- "meeting_summary": asking to summarize a past meeting.
- "calendar_query": asking what's on a calendar, checking schedule/availability.
- "schedule_meeting": asking to schedule/book/set up a meeting with someone.
- "email_action": asking to actually SEND an email or read an inbox (distinct from just drafting text).
- "research": asking to research, look into, or find information about a topic, trend, or competitor.
- "unclear": doesn't fit any category confidently.`;

async function classify(commandText) {
  const { parsed } = await callClaude({
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: commandText }],
    maxTokens: 150,
    model: CLAUDE_MODEL_FAST
  });
  return parsed;
}

const NOT_CONNECTED_MESSAGE = (feature) =>
  `I don't have access to ${feature} yet — that needs a real Google/Microsoft connection, which requires account verification neither of us can complete inside this chat. Nothing about this is faked; it's just not connected.`;

/**
 * The main entry point — classifies, then routes to a real handler.
 * Returns { type, ...payload } where type tells the widget frontend
 * how to render the result (text, diagram, reminder-confirmation,
 * honest-decline).
 */
async function handleCommand(userId, workspaceId, commandText) {
  const classification = await classify(commandText);

  switch (classification.intent) {
    case "draft_content": {
      // handleTask's real contract wants actual business background as
      // businessContext, not the command itself — using the raw
      // command there would be a mismatch, not just lower quality.
      // This uses the user's REAL stored company profile
      // (guide/memory-client.js, already real) when one exists, and
      // says so honestly when it doesn't rather than inventing context.
      const profile = await memoryClient.getCompanyProfile(userId).catch(() => null);
      const businessContext = profile
        ? JSON.stringify(profile)
        : "No company profile stored yet for this user — respond generically rather than assuming industry or business specifics.";
      const result = await assistantBot.handleTask(businessContext, classification.extractedTask, { userId, workspaceId });
      return { type: "text", content: result.output, modelUsed: result.modelUsed };
    }

    case "sketch_diagram": {
      const diagram = await sketchBot.generateDiagram(classification.extractedTask);
      return { type: "diagram", ...diagram };
    }

    case "research": {
      const result = await researchBot.research(classification.extractedTask);
      return { type: "research", ...result };
    }

    case "remind_me": {
      const reminder = await reminders.createReminder(userId, commandText);
      return { type: "reminder_created", ...reminder };
    }

    case "meeting_summary": {
      // Real, own-data lookup — no calendar needed: the most recent
      // meeting session this user actually owns and actually ended,
      // queried from Gurost's own database. Genuinely different from
      // "read my calendar" (external, not built) — this only looks at
      // meetings Gurost itself already knows about.
      const { data: recentSession } = await supabase
        .from("meeting_sessions")
        .select("id, ended_at")
        .eq("owner_user_id", userId)
        .eq("status", "ended")
        .order("ended_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentSession) {
        return { type: "text", content: "I don't see a recent Gurost meeting to summarize — this only works for meetings run through Gurost's own Meeting Co-Pilot, not external calendar events." };
      }
      const summary = await meetingBot.getSummary(recentSession.id, userId);
      return summary
        ? { type: "meeting_summary", sessionId: recentSession.id, ...summary }
        : { type: "text", content: "Found a recent meeting, but no summary exists for it — you may not have approved any snippets to capture during it." };
    }

    case "schedule_meeting": {
      // Honest alternative, not a flat decline — real, because
      // meeting-bot.js's video rooms genuinely exist, unlike external
      // calendar scheduling.
      return {
        type: "offer_alternative",
        content: "I can't add this to an external calendar yet — that needs a real Google/Microsoft connection that isn't set up. What I CAN do right now: create a real Gurost video meeting room and send you a real join link. Want that instead?",
        offeredAction: "create_video_room"
      };
    }

    case "calendar_query":
      return { type: "not_connected", content: NOT_CONNECTED_MESSAGE("your calendar") };

    case "email_action":
      return { type: "not_connected", content: NOT_CONNECTED_MESSAGE("your email account") };

    default:
      return { type: "text", content: "I'm not sure what you're asking for — could you rephrase it? I can draft content, sketch diagrams, set reminders, and summarize Gurost meetings." };
  }
}

/**
 * Real self-learning feedback — reuses guide/memory-client.js's
 * existing recordDecision() (already real, already used by Guide Bot's
 * suggestions) rather than building a parallel tracking table just for
 * the widget. After recording, refreshes the user's real style profile
 * (user-learning.js, already real) so the NEXT widget command actually
 * benefits from this feedback, not just some future unrelated call.
 */
async function recordFeedback(userId, commandText, decision, note) {
  await memoryClient.recordDecision(userId, { message: commandText }, decision, note);
  // Best-effort — a failed profile refresh shouldn't fail the feedback
  // recording itself, which already succeeded.
  await userLearning.updateStyleProfile(userId).catch((err) => {
    console.warn("[widget-bot] Style profile refresh failed after feedback:", err.message);
  });
  return { recorded: true };
}

module.exports = { classify, handleCommand, recordFeedback };
