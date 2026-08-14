GUROST BATCH PUSH — read before uploading

REPLACE these on GitHub/Render (same filename, new content):
  server.js
  package.json
  smart-router.js
  image-bot.js
  .env.example
  README.md
  lib/claude-client.js

ADD these — brand new, nothing to replace:
  lib/openrouter-client.js
  production-readiness.js
  qa-bot1-click-tester.js
  qa-bot2-visual-checker.js
  qa-orchestrator.js

DELETE this one from GitHub — it's not in this zip on purpose,
it's been fully replaced by lib/openrouter-client.js:
  lib/omniroute-client.js
