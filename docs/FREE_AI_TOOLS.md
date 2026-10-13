# Free and open-source AI tools for images, 3D, video and motion

Written 2026-10-13 (Web Claude) from Irfan's research list. **Spec only: nothing is built or wired, no code changed.**
Plain English. Each tool below was checked against its own Hugging Face page on 2026-10-13 where marked **checked**; anything else is
marked **not checked**. Developers' benchmark claims are theirs, not ours.

## 0. Decision and order of work
- Priority rule in `CLAUDE.md`: the Website Builder comes first. None of this is needed to launch it (Pixabay photos and the section library
  are enough). So: **Phase 2, after the Website Builder launch and after Stripe is live.** No GPU is rented and no code is wired now.
- Why wiring waits: a GPU path nobody can reach (no paying customers, no GPU, no keys) is code that rots untested. The work that pays
  now is knowing which tools we would use, what they cost and what could go wrong.

## 1. The catch (true, and it shapes everything)
These models need a **GPU**. Render's normal web services have none. So they cannot run inside Gurost. Options, cheapest first:
1. **Hosted by someone else** (fal.ai, Replicate, similar): pay per result, no servers for us. Whether a given open model is hosted
   there, and at what price, is **not checked**; fal.ai is already in our code for images (`image-bot.js`).
2. **A GPU rental service** (RunPod, Vast.ai, Modal and others) that starts a machine when a job arrives and stops it after. We pay by the
   second or hour. More work (a small job runner), cheaper per result at volume.
3. Our own GPU server: not now.

## 2. The tools (what is true, what is not yet checked)

### Images
| Tool | What it is | Licence | Notes |
|---|---|---|---|
| Nucleus-Image (**checked**) | Text to image. 17B parameters, about 2B used per image (mixture of experts) | Apache-2.0 | Authors report it matches or beats Qwen-Image, GPT Image 1 and Imagen 4 on their chosen tests (their numbers, base model, no post-training). VRAM not stated on the page. |
| HiDream-O1-Image (**checked**) | Text to image up to 2048x2048, long-text rendering, editing from a reference image | MIT | 8B (file says 9B). Needs a CUDA GPU; VRAM not stated. |
| LLaDA-Image | Image generation and editing | **not checked** | Not found by search. Verify before any plan. |

### 3D
| Tool | What it is | Licence | Notes |
|---|---|---|---|
| TRELLIS.2 (Microsoft) (**checked**) | Image to 3D model with PBR materials, exports `.glb` | MIT | 4B parameters. **Needs a GPU with at least 24 GB memory; tested only on A100 and H100 under Linux.** On an H100: about 3 s at 512 resolution, 17 s at 1024, 60 s at 1536. These times are for the card named, not for cheaper ones. |
| TripoSG (VAST-AI) | Image to 3D mesh | MIT (**not confirmed**: my page fetch was blocked) | The "1.5B, 20 to 30 s" figures are from the research list, not checked. Likely geometry only, textures not confirmed. |
| AssetFurnace (image-to-3dlab) | "Textured, rigged, animated characters" | **not checked** | **Could not find it** in a search. Treat as unverified until someone finds the repository. |

### Video and audio
| Tool | What it is | Licence | Notes |
|---|---|---|---|
| MOVA (OpenMOSS) (**checked**) | Video and matching audio generated together | **Apache-2.0** (not "MIT-style" as listed) | 32B parameters, 18B used at a time. The page gives **no GPU size, clip length or generation time**; the GitHub page must be read. A model this size is a heavy job; assume minutes per clip on a large card until measured. |

### Motion graphics in the browser (no GPU)
| Tool | What it is | Licence | Notes |
|---|---|---|---|
| mojs | JavaScript motion graphics library | MIT (from the list, **not checked**) | Runs in the visitor's browser, so costs us nothing to run. Compare with GSAP, which is already planned for Layer 2 polish; do not add a second animation library without a reason. |
| Encore | Web animation library | **not checked** | Not identified. Verify. |

## 3. Which tool for which tier (proposed, builds on `docs/PREMIUM_PIPELINE_SPEC.md` section 11)
| Tier | Images | 3D | Video | Motion |
|---|---|---|---|---|
| Free | Pixabay, Openverse, Unsplash photos (already built, `IMAGE_PROVIDER_ORDER`) and free text models | none | none | the section library's CSS and GSAP hooks |
| Paid | Hosted image models through fal.ai (already in code) | hosted 3D (TRELLIS.2 or TripoSG) when proven | short clips when proven | same |
| Higher paid / later | Our GPU job runner for the tools above when volume makes it cheaper than hosted | same | same | same |
Customers must see what each plan does and does not include (no hidden lock-in rule).

## 4. Cost estimate: what was claimed, and what I can and cannot support
Claimed in the research note: GPU about $0.20 to $1 per hour, one 3D model about $0.01, one 10-second video about $0.05.
- **Method is right:** cost per result = (seconds on the GPU / 3600) x price per hour.
- **The hourly price is probably too low for these models.** TRELLIS.2 was tested on A100 and H100, which usually rent for more than $1 an hour
  (current prices **not checked**; the $0.20 to $1 range is for smaller cards that may not fit a 24 GB model at higher resolutions).
  Example only: 3 s of H100 at a hypothetical $3 an hour is about $0.0025, plus the time to start the machine and load the model, which can be far
  longer than the 3 s of work. **Start-up and idle time, not the generation, is usually most of the cost** unless jobs are batched.
- **The 10-second video at $0.05 is not supported by anything I could check.** MOVA's page gives no generation time. Do not quote this number.
- So: "affordable for a paid tier" is plausible for images and 3D, **unproven for video**. Measure one real job on a rented GPU first and record the
  seconds, the price and the start-up time here.

## 5. Risks and checks before any build
1. **Licences:** the code licence is not always the weights' licence; read each model's licence for commercial use and for what we may do with the
   output. Apache-2.0 and MIT are permissive (checked for four tools), but verify the exact weights files.
2. **Privacy:** a customer's image or description sent to a hosted service or a rented GPU is a new provider. It must be added to the privacy
   policy list (`docs/PRIVACY_POLICY.md` section 3) and `docs/AI_DATA_FLOW.md` **before** it is switched on.
3. **Quality is unproven:** published benchmarks are the developers' own. Judge outputs on real customer prompts with Irfan's eyes (as with the 24 looks).
4. **Reliability:** GPU jobs fail, time out and queue. Each needs an honest error and a refund of credits (the "if we fail, we refund" principle).
5. **Abuse and cost:** limit jobs per user per day and cap spend per account, or one user can run up the bill.
6. **3D and video need somewhere to show up:** a `.glb` needs a viewer on the site (a web component such as `<model-viewer>`, licence not checked) and big
   files need storage and a fast CDN. Today the Website Builder has no 3D or video slot in the section library.
7. **Stripe is not live**, so there is no paid tier to route yet (`CLAUDE.md` Money section).

## 6. Order of work when the time comes
1. Irfan or Web Claude: verify the unchecked rows (TripoSG licence, AssetFurnace, LLaDA-Image, Encore, mojs).
2. One real test per tool on a rented GPU or hosted endpoint; write the seconds and cost into section 4.
3. Add the provider to the privacy policy and the AI data-flow doc.
4. A small provider interface in `image-bot.js` style (one function per tool, a tier check, a cost cap), behind a switch that is off by default.
5. A section-library slot for a 3D viewer and for video (new variants, same quality gate).
6. Stripe plan check, then switch on for one paid test account.
