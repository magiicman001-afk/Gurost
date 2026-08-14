# Gurost — Complete Testing Guide

This guide tests what actually exists in the codebase. Where something requested elsewhere wasn't built, that's stated instead of a fake test step for it.

**Prerequisites**: all SQL migrations run (every file's header comment has its own), `.env` populated per `README.md`'s "What you must configure" section, server running (`npm start`), frontend pages served from the same origin.

---

## 1. Signup and Login

1. Open `signup.html`. Fill in email + password (8+ chars) + confirm password. Submit.
2. **Expected**: redirected to `onboarding.html`, `localStorage` has `gurost_api_key`/`gurost_user_id`.
3. In a private window, log in with the same credentials via the Log In tab.
4. **Expected**: redirected to `dashboard.html`, `gurost_jwt` set.
5. Re-signup with the same email. **Expected**: `400`, "already exists."
6. Log in with a wrong password. **Expected**: `401`, generic "Invalid email or password" (doesn't reveal which field was wrong).

## 2. Website Builder

1. From `onboarding.html`, enter a description, click through to "Build My First Site."
2. **Expected**: redirected to `builder.html`, `/api/generate` fires, 4 variants render as clickable cards.
3. Click one. **Expected**: `/api/select` fires, preview updates, Deploy enables.
4. Type a correction, click Send. **Expected**: `/api/pulse` (correct) fires, preview updates, log entry appears.
5. Hold/release the Pulse button with text still in the box. **Expected**: same correction flow fires — sends typed text, not live audio (see README's Main Builder note).

## 3. App Builder

1. `POST /api/generate` with `{ "prompt": "...", "mode": "app" }` (no frontend mode-toggle exists yet).
2. **Expected**: `appFiles`, `codeReview` (hasCritical: false on a clean run), `sandboxResult` (pass: true, or skipped if `E2B_API_KEY` unset).

## 4. Revamp Engine

1. `POST /api/revamp/audit` with `{ "url": "<public site>" }`. **Expected**: crawl + Lighthouse + grounded `issues`.
2. `POST /api/revamp/rebuild` with `approvedFixes`. **Expected**: rebuilt HTML preserving unselected sections.

## 5. Pulse Button

Covered inline above — hold/release on any page shows idle/listening/processing/confirmed states (`shared/pulse-widget.js`, no backend call needed to see the animation itself).

## 6. Business Assistant

1. `POST /api/assistant` with a task. **Expected**: generated content, `modelUsed` reflects Haiku/Sonnet routing.
2. `POST /api/assistant/suggest`. **Expected**: suggestions with a grounded `reasoning` field, not generic.
3. `POST /api/assistant/schedule`, wait for/manually trigger the nightly job, `GET /api/assistant/briefing`. **Expected**: real drafts.

## 7. Meeting Co-Pilot

1. `POST /api/meeting/create`. **Expected**: `sessionId` + consent notice.
2. `POST /api/meeting/consent` per participant. **Expected**: `status` becomes `"active"` only once all agree; one decline sets `"declined"`.
3. Stream audio to `/ws/meeting?sessionId=...&userId=...`. **Expected**: `should_i_take_this_in` messages for flagged moments (needs `DEEPGRAM_API_KEY`).
4. Approve some snippets, `POST /api/meeting/end`. **Expected**: tailored summary from only approved snippets — test two users approving different snippets to confirm different summaries.

**No frontend page exists for this** — API/WebSocket only in this version.

## 8. Multi-User Account

1. `POST /api/team/create`, `POST /api/team/invite`, `POST /api/team/accept-invite` as a different user.
2. Try exceeding `teamSeats` for the plan. **Expected**: rejected.
3. `POST /api/bot/name`, `GET /api/bot/identity`.

## 9. Internal Coding Assistant

1. `POST /api/coding/suggest`. **Expected**: a suggestion + explanation.
2. `POST /api/coding/feedback`. **Expected**: stored for semantic recall.
3. **Not testable, not built**: real-time collaborative editing.

## 10. Admin Dashboard

1. Set your email in `ADMIN_EMAILS`.
2. Open `admin.html`, enter your API key. **Expected**: metrics render.
3. Confirm Claude Cost is aggregate, not per-user.
4. `POST /api/admin/users/:userId/deactivate`, then confirm that user gets `401`.
5. `POST /api/swarm/run`. **Expected**: segment health report; if any fail syntax check, a proposal appears in `GET /api/swarm/proposals` and nothing on disk changes.

## 11. All 12 Frontend Pages

| Page | What to check |
|---|---|
| `index.html` | Nav swaps to "Go to Dashboard" when logged in |
| `signup.html` | Real signup/login calls |
| `pricing.html` | Free→signup; Pro/Ultimate→real Stripe Checkout |
| `onboarding.html` | 3 steps navigate; final button triggers real generation |
| `builder.html` | See section 2 |
| `pulse-widget.html` | Static showcase, no backend calls expected |
| `templates.html` | Real generation with template-specific prompts |
| `dashboard.html` | Real project list + briefing |
| `resources.html` | Static — no backend for docs exists, intentional |
| `review.html` | Real `codeReview`/`sandboxResult` |
| `deploy.html` | Real `/api/deploy/one-click`, real per-component status |
| `settings.html` | Real plan display; Delete Account is honest about not being self-service |

## 12. All Links and Buttons

```bash
cd gurost-frontend
for f in *.html; do
  grep -oE 'href="[a-zA-Z0-9_./?=-]+\.html[^"]*"' "$f" | sed 's/href="//;s/"//' | sed 's/?.*//' | sort -u | while read link; do
    [ -n "$link" ] && [ "$link" != "#" ] && [ ! -f "$link" ] && echo "BROKEN in $f: $link"
  done
done
```

## 13. Deploy to Render

Not a repeatable "test" — it's a one-time infra setup (create the Render service, set every env var). Once deployed: confirm `POST /api/auth/login` with bad credentials returns a clean `401` (not a 500 from a missing env var), and check logs for `[scheduler]`/`[nanobot-swarm]` startup lines confirming cron actually fired.

---

## Known gaps this guide won't pretend to test

- Voice input is typed-text-standing-in-for-speech throughout the frontend.
- Resources/support has no backend.
- Nanobot Swarm never writes fixes to disk — a human applies the proposed fix via PR.
