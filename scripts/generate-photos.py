#!/usr/bin/env python3
"""
Makes the photographs for the template library with a FREE, open model, on a GPU (a free Google Colab session is enough).
Run it ONCE; the pictures are then committed into the repo and every template uses them. Nothing is generated per customer.

Colab, three cells:
  1)  !pip -q install -U diffusers transformers accelerate sentencepiece pillow
  2)  (upload this file and the scripts/photo-prompts folder, or git clone the repo)
  3)  !python scripts/generate-photos.py bakery sanctuary

First try one picture:  !python scripts/generate-photos.py bakery --limit 1
Output: templates/_media/<industry>/photo/<name>.webp   (square, 1536 px; the templates crop it to fit)

Default model: FLUX.2 [klein] 4B (Apache-2.0, about 13 GB of graphics memory). Another free-for-business choice: --model Tongyi-MAI/Z-Image-Turbo.
Check the licence on the model's own page before commercial use. This script was written without a GPU to test on, so if the first run
complains, the message will say which setting to change (--steps, --guidance, --model); nothing else in Gurost depends on it.
"""
import argparse, json, os, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("industries", nargs="+", help="bakery sanctuary ...")
    ap.add_argument("--model", default="black-forest-labs/FLUX.2-klein-4B")
    ap.add_argument("--size", type=int, default=1536)
    ap.add_argument("--steps", type=int, default=4, help="klein is a few-step model; raise to 20-28 for a non-distilled model")
    ap.add_argument("--guidance", type=float, default=1.0)
    ap.add_argument("--variants", type=int, default=1, help="pictures per name; name.webp is the first, name-2.webp ... the rest")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--limit", type=int, default=0, help="only the first N pictures (a quick test)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "templates", "_media"))
    a = ap.parse_args()

    import torch
    from diffusers import DiffusionPipeline
    pipe = DiffusionPipeline.from_pretrained(a.model, torch_dtype=torch.bfloat16)
    try:
        pipe.to("cuda")
    except Exception:
        pipe.enable_model_cpu_offload()  # smaller graphics cards

    done = 0
    for ind in a.industries:
        spec = json.load(open(os.path.join(os.path.dirname(__file__), "photo-prompts", f"{ind}.json")))
        out = os.path.join(a.out, spec["industry"], "photo")
        os.makedirs(out, exist_ok=True)
        for name, subject in spec["images"].items():
            for v in range(a.variants):
                if a.limit and done >= a.limit:
                    return
                gen = torch.Generator("cuda" if torch.cuda.is_available() else "cpu").manual_seed(a.seed + v)
                img = pipe(prompt=f'{subject}, {spec["style"]}', height=a.size, width=a.size, num_inference_steps=a.steps, guidance_scale=a.guidance, generator=gen).images[0]
                path = os.path.join(out, f"{name}.webp" if v == 0 else f"{name}-{v + 1}.webp")
                img.save(path, "WEBP", quality=86, method=6)
                print("made", path, flush=True)
                done += 1

if __name__ == "__main__":
    sys.exit(main())
