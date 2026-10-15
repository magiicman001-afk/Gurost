# Website Builder: what is left to reach "launch-ready"

Written 2026-10-15 by Web Claude, from `CLAUDE.md`, `git log` and the commit messages. Priority rule (CLAUDE.md): the Website Builder
comes first, then the App Builder. **Nothing here has been seen on the live site by Web Claude** (this sandbox cannot reach it);
"fixed" below means "fixed in code and tested in a sandbox".

## 1. Your lettered bugs (A to E)

| Bug | What | State |
|---|---|---|
| A | Dashboard button missing on pages | **Fixed in code** 2026-10-14 (11 commits, `13d917c` to `8681cd2`); a test covers all 21 pages. Verify on the phone |
| B | Dashboard mic did not show it was recording | **Fixed in code** (`da6ec6f`): goes red, buzzes, beeps, rings only while recording. Verify on the phone |
| C | Speech cut off / half sentences | **Fixed in code** (`1694980`, `43d55b8`, `d8f5e8a`, `bb5e754`, `c719fe8`): keeps recording 300 ms after release, British English with punctuation, a touch taken away by the browser no longer sends half a sentence. Verify on the phone (iPhone Safari voice was never tested) |
| D | **Not found anywhere** in the docs, `CLAUDE.md` or commit messages | **Irfan: which one is Bug D?** I will not guess |
| E | Six Pulse buttons (the "Bug E, 1 of 6 ... 6 of 6" commits) | **All six fixed in code** 2026-10-15: Design (`abc686a`), Image (`a0aeeea`), Upload (`81a3ec1`), Share (`a92b900`), Save honesty (`2a2de3f`), Launch / Preview (`01364e4`). Verify each on a real template site and a real library site |

## 2. Open items from `CLAUDE.md` that still matter for the Website Builder

| Item | Why it matters | State / what is needed |
|---|---|---|
| Bug H / AA: project lost after a refresh | A customer who refreshes loses their place | Fixed in code (`0c3a008`); **not verified live**. Test: build, refresh, press Start building, expect the saved details |
| Bug U: sites used anchor-scroll, not real pages | Looks like a one-page toy | Fixed in code for library sites (`18a5589`); old-generator sites still use anchors. Verify live |
| Bug Y: hero image missing on a live library build (grey gradient) | First thing a customer sees | **Cause not traced.** Needs a live build and the generated HTML. Likely tied to image credit (Gemini prepayment depleted) |
| Bug Z: Pulse "Fix" offers (Apply / Fix all / Skip) | The "premium polish" promise | Never verified live; also known-broken item 1 may stop it working on a site with a generated image |
| Known broken 1: a generated image is inlined as base64 and blows the model context, so Pulse edits fail | Edits, Undo, Redo, History cannot be verified until this works | **Open.** Fix: upload generated images to `project-assets`, link by URL. Medium |
| Bug X: the word "DARK_MODE" in the nav of old-generator sites | Looks broken | Not blocking: the section library uses a fixed SVG toggle. Old generator only |
| Bug L: dashboard slow (30 s+) | First impression | Cause not proven; a log line `[dashboard] /api/projects took Xms` is there to read on Render |
| Known broken 4: free-plan project limit counts only in-memory projects; no delete-project route | Customers can be told to delete a project they cannot delete | **Open**, small to medium |
| Known broken 6: `gpt-oss-20b` in the free fallback list returns nothing | A free build can fail silently | **Open**, small (remove it from the list) |
| Known broken 8: "Corporate" brief hard-codes navy/slate | Fights the industry palette | Mostly moot if the section library and templates are on; check |
| Money: OpenRouter negative, Gemini image prepayment depleted | Paid models fail with 402; no AI images | **Irfan** must top up. Without it the live test is mostly rules and templates |

Already fixed by today's work (so remove from the old lists): Design Mode could not reach the preview (known broken 2, `abc686a`);
Pulse Image stuck on "Generating..." (known broken 7, `a0aeeea`); `/shared/<token>` 404 on template sites (`a92b900`).

## 3. Templates track (Track 2)

| Piece | State |
|---|---|
| 15 industries, 159 templates, real-3D models, photos and loops | Built and generated (2026-10-14) |
| 2b + 2c: example content is slots; a customer's site never shows the example business | Built (`7efeb9c`) |
| 2d: Launch / serve / take offline for a template site | Built (`8d80253`); **real Supabase row and subdomain never tried live** (`<slug>.gurost.com` needs the DNS plan, below) |
| 2a: auto-chooser (picks industry and layout from what the customer types) | Built and wired (`aa2f042`) but **OFF**: set `TEMPLATE_AUTOCHOOSE=1` on Render to try it. Test with 10 different prompts, including odd ones, before leaving it on |
| GitHub and Download for template sites | Say "not available yet" (honest, `01364e4`); a real export is still to build. This touches "the user owns their code from day one", so it is a launch blocker for the principle, not just a feature |
| "Add a page" | Not built (Pulse says so honestly) |

## 4. What "100%" needs, in order (my recommendation)

1. **Live pass on the phone** of everything marked "verify" above (one sitting, screenshots). Cheapest way to find what is actually broken.
2. **Top up OpenRouter and Gemini** (Irfan). Several of the open items cannot even be seen without them.
3. **Trace Bug Y** (hero image) on a live build, then fix.
4. **Known broken 1** (base64 images in edits): unblocks Pulse edits, Undo/Redo, Bug Z.
5. **Template export** (real Download / GitHub for template sites): protects the ownership promise.
6. **Turn on the auto-chooser** after a 10-prompt trial.
7. **Domain plan**: `<slug>.gurost.com` needs the DNS answers still outstanding (registrar, current `gurost.com` target). Nothing is to be touched in DNS until hostname routing is deployed.
8. **Layer 2 polish** (parked until the above): real fonts, Pixabay images, GSAP scroll effects, Lenis on published sites only, micro-interactions.
9. **Design score**: the target is 8/10 and the last honest estimate was about 4/10 before the section library and templates. Nobody has re-scored. Score three sites on the phone (Irfan) and write the number down.

## 5. Not Website Builder, but before real customers (from `CLAUDE.md`)

- Per-user GitHub (GAP 2): customer code lands in Irfan's GitHub account today. Private repos fix who can read it, not who owns it.
- Google/GitHub sign-in still store the Supabase token in the browser, not a cookie session (S3 item); admin login (S3e); `/ws/meeting` login.
- Session idle timeout (30 minutes, warning at 28): waiting for Irfan's go and Laptop Claude.
- Privacy policy needs a qualified adviser's review; OpenRouter `data_collection: "deny"` decision.
- Check that every old `gurost-checkpoint-*` and `gurost-<8 chars>` repo made before the private-repo fix is private.
- Google verification for Gmail and Calendar (weeks; start early).
