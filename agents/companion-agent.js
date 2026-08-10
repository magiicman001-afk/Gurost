/**
 * Companion Agent — real, thin dispatcher over the 5 existing user-
 * support and learning bots. Same reasoning as builder-agent.js and
 * guardian-agent.js: nothing underneath is touched or deprecated.
 */

const assistantBot = require("../bots/assistant-bot");
const guideBot = require("../guide/guide-bot");
const meetingBot = require("../meeting-bot");
const userLearning = require("../user-learning");
const industryRag = require("../industry-rag");

module.exports = {
  // Assistant (bots/assistant-bot.js — unchanged)
  handleTask: assistantBot.handleTask,
  suggestActions: assistantBot.suggestActions,
  classifyVoiceResponse: assistantBot.classifyVoiceResponse,
  isComplexTask: assistantBot.isComplexTask,

  // Guide (guide/guide-bot.js — unchanged)
  analyzeAndSuggest: guideBot.analyzeAndSuggest,
  recordGuideResponse: guideBot.recordResponse,
  detectMissingSections: guideBot.detectMissingSections,

  // Meeting (meeting-bot.js — unchanged)
  meetingConsentNotice: meetingBot.CONSENT_NOTICE,
  getMeetingStatus: meetingBot.getStatus,
  createMeetingSession: meetingBot.createSession,
  getMeetingSession: meetingBot.getSession,
  allConsented: meetingBot.allConsented,
  recordMeetingConsent: meetingBot.recordConsent,
  evaluateMeetingSnippet: meetingBot.evaluateSnippet,
  proposeMeetingSnippet: meetingBot.proposeSnippet,
  recordSnippetDecision: meetingBot.recordSnippetDecision,
  endMeetingSession: meetingBot.endSession,
  getMeetingSummary: meetingBot.getSummary,
  createVideoRoom: meetingBot.createVideoRoom,
  getParticipantJoinToken: meetingBot.getParticipantJoinToken,
  getCoPilotJoinToken: meetingBot.getCoPilotJoinToken,

  // Learning (user-learning.js — unchanged)
  updateStyleProfile: userLearning.updateStyleProfile,
  getStyleProfile: userLearning.getStyleProfile,
  styleClauseFor: userLearning.styleClauseFor,

  // Industry knowledge (industry-rag.js — unchanged)
  addIndustrySource: industryRag.addSource,
  listIndustrySources: industryRag.listSources,
  scrapeIndustry: industryRag.scrapeIndustry,
  queryIndustry: industryRag.queryIndustry
};
