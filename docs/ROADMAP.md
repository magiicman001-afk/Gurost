# Gurost roadmap

Written 2026-10-13 (Web Claude) at Irfan's direction. Roadmap only: **nothing in this file is built.** Priority rule in `CLAUDE.md` still
applies: the Website Builder launches first. Related: `docs/FREE_AI_TOOLS.md` (tool-by-tool facts and what was checked),
`docs/PREMIUM_PIPELINE_SPEC.md`, `docs/MOBILE_APP_ROADMAP.md`.

## Phases

**Phase 1 (now)**
- Build animation v2 (marble staircase, night to day): built 2026-10-14; see `docs/MARBLE_PREVIEW_ANIMATION_SPEC.md`. Awaiting a look on Irfan's phone.
- Premium template library: 6 bakery + 3 animal sanctuary templates built 2026-10-14, industry packs in place (`docs/PREMIUM_TEMPLATE_LIBRARY.md`); next: 10 per industry, more industries, picker, media catalog.
- Website Builder complete.
- Free tier: Pixabay (plus Openverse and Unsplash fallbacks) and the section library.
- Paid tier: fal.ai images, once the account is topped up.

**Phase 2: after launch (20+ paying customers)**
- Stripe live.
- fal.ai plus RunPod Serverless GPU (below).
- 3D and video for the paid tier.

**Phase 3: after 100+ customers**
- Our own GPU server, only if it is cheaper at that scale.
- Always-on GPU.
- Custom model fine-tuning.

## Phase 2: GPU on demand (RunPod Serverless)

**Concept.** A serverless GPU that sleeps when not in use. It costs money only when a customer actually generates a 3D model or a video.

**How it works**
1. The customer asks for a 3D image or a motion video.
2. Gurost checks the plan (free: stock photos only; paid: continue).
3. Gurost sends the request to RunPod Serverless.
4. RunPod wakes a GPU worker (cold start, see warning 2).
5. The worker generates the asset (10 to 30 seconds, Irfan's estimate).
6. The worker returns the asset to Gurost.
7. The worker scales to zero when idle. The next request wakes it again.

```
[Customer asks for 3D]
      |
[Gurost checks plan]
      |-- Free: Pixabay stock photos only
      '-- Paid: RunPod
            |
      [RunPod wakes a GPU worker]
            |
      [Worker generates the asset, 10-30 s]
            |
      [Asset returned to Gurost]
            |
      [Customer sees the result]
            |
      [Worker scales to zero after idle]
```

**Cost model (Irfan's figures, NOT verified by us)**
- Idle: GBP 0 (scale to zero).
- Active: about GBP 0.001 to 0.005 per generation.
- 100 generations a month: about GBP 0.40. 1,000 a month: about GBP 4.
- See "What is not proven" below before quoting any of these.

**Proposed pricing (to confirm before launch)**
| Plan | GPU generations |
|---|---|
| Free | none (stock photos only) |
| Pro, GBP 20 a month | 20 included, then GBP 0.05 each |
| Business, GBP 50 a month | 100 included, then GBP 0.03 each |

**Tools to run on the GPU** (licences and requirements: `docs/FREE_AI_TOOLS.md`)
- TRELLIS.2 (3D from photos): Microsoft, MIT. Needs a 24 GB GPU.
- MOVA (video with audio): Apache-2.0.
- Nucleus-Image (AI images): Apache-2.0.
- TripoSG (3D generation): MIT claimed, not confirmed by us.

**Integration points**
- `bots/research-bot.js`: finding and generating assets.
- `bots/variant-bot.js` / the section library: hero images and videos.
- A new GPU bot that routes to RunPod when the plan allows it.
- `image-bot.js`-style provider interface: one function per tool, a plan check and a cost cap, behind a switch that is off by default.

**Warnings**
1. **RunPod storage billing is a trap.** Irfan's note: a stopped pod's volume costs $0.20 per GB a month, a running pod's $0.10, a network volume $0.07. Use a small disk plus a network volume. (Prices not re-checked; confirm on RunPod's pricing page before choosing.)
2. **Cold start.** First request after idle is slow: Irfan estimates 2 to 5 seconds, but loading a large model can take much longer. Mitigation: keep one warm worker (a small standing cost, which breaks the "idle = GBP 0" line). Decide after measuring.
3. **Spend must be capped.** Budget alert on RunPod, a spend cap per user, and a monthly cap for Gurost.

**Rules for when it is built**
- Enable only after Stripe works, after 20+ paying customers, and when the paid plans bring in enough revenue to fund it.
- Cap monthly GPU spend at GBP 50 (can be raised); alert at 80% of the cap.
- Log every GPU call (cost and duration).
- Honest errors and a credit refund when a job fails ("if we fail, we refund").

**What it means for customers:** free users get stock photos; paid users get AI-generated 3D and video; expect roughly 15 to 40 seconds per item (estimate).
**What it means for Gurost:** no fixed cost while idle (apart from any warm worker), a small variable cost per generation, funded by the paid plans.

### What is not proven (read before quoting numbers)
- The per-generation cost of GBP 0.001 to 0.005 is a hope, not a measurement. `docs/FREE_AI_TOOLS.md` section 4 explains why: start-up and model-loading time, not the generation itself, is usually most of the bill. A 3D model on an H100 takes seconds, but a 32B-parameter video model has no published generation time, so a 10-second clip may cost far more than a few pence.
- "Scales to zero after 5 seconds idle" and "keep a warm worker" pull in opposite directions. The idle timeout and the warm-worker choice are set per endpoint on RunPod and need a real test.
- Plan prices above are a proposal. Check the margin once one real job per tool has been measured: **seconds, price and start-up time go into `docs/FREE_AI_TOOLS.md` section 4.**
- Whether RunPod hosts or can run each model (and with which licence terms for the weights) has not been checked.

### Before switching it on
1. Add RunPod (and any model host) to the privacy policy provider list (`docs/PRIVACY_POLICY.md` section 3, `public/privacy.html`) and to `docs/AI_DATA_FLOW.md`. It receives customer images and prompts. Do this BEFORE the first real request.
2. Measure one real job per tool and record the numbers.
3. Add a viewer for `.glb` files and a video slot in the section library (neither exists today).
4. Stripe plan check, then enable for one paid test account.
