# App Builder: status (read-only review)

Written 2026-10-12 (Web Claude) from reading the code (`bots/app-bot.js`, the `/api/app-builder/*` and `/api/deploy*` routes in
`server.js`, `public/app-builder.html`, `lib/app-build-state.js`, `lib/deploy.js`, `project-state.js`) and running its tests.
**Nothing was run against the live site** (my sandbox cannot reach Render, Supabase or OpenRouter, and OpenRouter has no credit),
so "works" below means "the code and tests say so", and "verified live" is stated separately. No code was changed.
Per the priority rule in `CLAUDE.md`: the App Builder waits until the Website Builder is launch-ready, except fixes that already shipped.

## 1. What it is

You describe a business or an app. Gurost builds three things in order, and streams progress to the page over a WebSocket:
1. **Schema**: the plan of what data the app stores (tables), for Postgres (or the engine chosen).
2. **Backend**: the server code (routes that read and write that data).
3. **Frontend**: the screens (React-style files with images fulfilled by the image bot), kept self-contained so they can preview.
Then **review** (aislop, a deterministic code-quality scanner, plus the review bot), **auto-fix** of Critical/High findings by the
fix bot, and a **runtime check** (the backend is actually run in a sandbox; if it crashes, one fix attempt and a second run).

## 2. What works (by the code and its tests)

| Area | State | Evidence |
|---|---|---|
| Three-stage build with live stage events | Built | `buildAppStaged` in `bots/app-bot.js`; stage events broadcast per stage |
| Stall watchdog | Built | the build fails cleanly after `APP_BUILD_TIMEOUT_MS` (default 150 s) **with no progress**; the clock restarts at every stage event, so slow-but-moving builds are not killed |
| Pause, correct, resume during a build | Built | `/api/app-builder/pause`, `/correct`, `/resume`; a correction is folded into the next stage's prompt |
| Retry after a failed build keeps finished stages | Built | `resumeProjectId` reuses the schema and the backend when they finished (`lib/app-build-state.js`; `test/app-build-resume.test.js`) |
| Honest plain-words errors | Built | `buildState.failBuild`; the page shows the stage that stopped (Bug S fix) |
| Placeholder and empty-file filtering | Built | `dropPlaceholderFiles`, `sweepPlaceholders` (`test/app-placeholders.test.js`) |
| Edit an existing app by instruction | Built | `/api/app-builder/edit` → `editApp`; base64 images are stashed so they do not blow the model context (`test/app-edit.test.js`) |
| Review, auto-fix, runtime sandbox check | Built | route code above; result saved as `codeReview`, `verified`, `buildReport`; "built but not fully checked" is reported honestly if the checks themselves fail |
| Deploy gate | Built | blocked if unresolved Critical issues, if the sandbox still crashes after the retry, or if required API keys have not been entered |
| One-click deploy | Built, **not verified live** | `lib/deploy.js`: frontend to Vercel, backend to a fresh GitHub repo then Render, schema applied to Postgres (Neon when `NEON_API_KEY` is set); each part reports success or failure separately |
| API key vault | Built | `api-key-vault.js`; the page asks for the app's own keys in a modal before deploy |
| Projects survive refresh and redeploy | **Server side built** (`0c3a008`, 2026-10-11) | saved to Supabase `project_state` and re-loaded on demand. **The App Builder page does not yet remember the last project on a bare visit** (see 4.2) |
| Preview | Best effort | frontend shown in a sandboxed iframe; its API calls are intercepted with a clear "no live backend in preview" answer. The real app only exists after deploy |
| Models | Routed | backend, edits, Pulse: Kimi K2.6 first; frontend: GLM-5.2 first (24,000-token budget); `:free` fallbacks when there is no credit |

## 3. Tests

`test/app-build-resume`, `app-build-state`, `app-edit`, `app-imports`, `app-placeholders`, `app-structure`: 10 tests at file level. In my
sandbox 5 of those fail only because `@supabase/supabase-js` is not installed here; on GitHub CI the whole suite passed on the last run
(2026-10-12). There is **no automated test of a whole build** (it needs a model, so it is not run in CI) and **no test of the deploy path**.

## 4. What is broken or unproven

### 4.1 Unproven live (from `CLAUDE.md`, still true)
- GLM frontend speed: the first live `[code-call] app-frontend` log line (`secs=`, `chars/s=`) is the proof.
- Early app preview (the frontend shown before the end of the build).
- WebSocket reconnect during a long build.
- One-click deploy end to end (Vercel + Render + Neon). A Vercel setting called Deployment Protection made published *website* URLs
  ask visitors to log in; an app frontend would hit the same wall.

### 4.2 Known gaps
1. **No "remember the last project" on a refresh.** The Website Builder got it (`shared/last-project.js`, `0c3a008`); `app-builder.html`
   only reads `?projectId=` from the address. A refresh without it loses the page's place even though the server has the project.
   Small fix (one script include and a few lines), but it is App Builder work and waits for the priority rule.
2. **WebSocket auth risk (S3a/S3d):** the page re-opens `/ws/guide` on every drop. If Laptop Claude's S3a uses short-lived tickets, every
   retry must fetch a fresh one and an auth-error close must stop the retry loop. `app-builder.html` also passes a client-supplied
   `userId` in the socket URL. Check before S3a goes live.
3. **Design quality is not governed.** The Website Builder is getting the section library, palettes and a premium gate. The App Builder
   frontend is still "the model designs it", with the industry palette as a hint. Expect it to look like the Website Builder did at 4 out of 10.
4. **Stages run one after another** (schema, backend, then frontend). The planned speed-up (derive the API endpoints from the schema, run
   backend and frontend together; target schema + max(backend, frontend), under 3 minutes) is not built and waits for the GLM speed check.
5. **Per-user GitHub:** deploy pushes the backend to a repo under the one server `GITHUB_TOKEN`, so every customer's code lands in the owner's
   GitHub. That breaks the principle "the user owns their code from day one" and must be per-user (OAuth) **before real customers**.
6. **Backend repos were public: FIXED 2026-10-12 (`0dc0909`).** All repos are now private and a test guards it. Still to do by hand: switch any
   older public `gurost-<8 chars>` repo to private. Open: Render must be able to read a private repo (not verified live).
7. **Pulse parity:** Analyze with Apply/Skip cards and the file-structure diagram (Mermaid) do not exist in either builder (parked 2026-10-08).
8. **Limits and money:** free-plan project counting was based on in-memory projects until the persistence fix; re-check it. Paid models fail
   with 402 until OpenRouter is topped up, so none of the above can be tested on real models today.
9. **No test that a generated app actually runs for a user** beyond the backend sandbox start: the frontend is not executed in CI.

## 5. Realistic timeline

Honest framing: I can size the work I can see; the unknowns are in the live checks (4.1) and deploy (Vercel/Render), which have never
been exercised end to end by me.

| Phase | Work | Estimate (focused days of Web Claude) | Starts when |
|---|---|---|---|
| A. Verify | Top up OpenRouter; one real build; read the `[code-call]` lines; check preview, reconnect, and one deploy to a test account; list what breaks | 1 to 2 | Website Builder launch-ready, OpenRouter funded |
| B. Fix the launch blockers | Remember-last-project; private backend repos; per-user GitHub login (the largest, about 2 to 3 days, with Laptop Claude for the OAuth/session parts); Vercel protection handling; WebSocket reconnect fix | 4 to 6 | after A |
| C. Quality | Apply the premium idea to apps: a small library of app screens (dashboard, table, form, login) and the palettes; a score for apps | 5 to 8 | after B; reuses the Website Builder pieces |
| D. Speed | Parallel stages | 1 to 2 | after the GLM speed is confirmed |
| E. Parity | Pulse Analyze/Apply cards, Mermaid file diagram | 2 to 3 | last |

So roughly **2 to 3 weeks** of focused work from the day the Website Builder is launch-ready to an App Builder that is safe to sell
(A + B + a basic C), and about **4 weeks** to also have the quality and speed work. These are estimates with wide error bars, not promises.
Calendar time depends on how fast the Website Builder lands (its remaining work is in `docs/WEBSITE_BUILDER_V2_SPEC.md`) and on
your phone-testing evenings, which are the real gate on every release.

## 6. What I would NOT do

- Start any of this before the Website Builder is launch-ready (your rule), except an outright security hole. The public backend repos were
  such a case and were fixed on 2026-10-12 as a one-word exception.
- Promise customers deploys yet. Deploy has never been verified live by this team, and the shared-GitHub gap (item 5) breaks a core principle.
