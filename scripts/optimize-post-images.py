"""Optimise generated post images: lossless PNG recompression, plus guarded palette
quantisation for the largest files (accepted only if the pixel difference is invisible)."""

import sys, os, glob, io
from PIL import Image, ImageChops

sys.stdout.reconfigure(encoding="utf-8")
os.chdir(r"E:\local-ai-zone.github.io")

files = sorted(glob.glob("blog/september-2026-*.png") + glob.glob("blog/deepseek-kv-*.png")
               + glob.glob("blog/deepseek-moe-*.png") + glob.glob("blog/context-*.png")
               + glob.glob("blog/ai-agent-*.png") + glob.glob("blog/how-to-build-ai-agent-hero.png")
               + glob.glob("blog/bonsai-2-27b-*.png") + glob.glob("blog/bonsai-ternary-*.png"))

total_before = total_after = 0
print(f"{'file':52} {'before':>9} {'after':>9} {'saved':>7}  mode")
for f in files:
    before = os.path.getsize(f)
    im = Image.open(f).convert("RGB")

    # 1. lossless recompression
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True, compress_level=9)
    best = buf.getvalue()
    mode = "recompressed"

    # 2. guarded palette quantisation for large files
    if before > 200 * 1024:
        qbuf = io.BytesIO()
        im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(
            qbuf, format="PNG", optimize=True, compress_level=9)
        qbytes = qbuf.getvalue()
        if len(qbytes) < len(best) * 0.85:
            quant = Image.open(io.BytesIO(qbytes)).convert("RGB")
            diff = ImageChops.difference(im, quant)
            stat = diff.resize((160, 90)).convert("L")
            mean_diff = sum(stat.getdata()) / (160 * 90)
            if mean_diff < 2.5:
                best, mode = qbytes, f"quantised 256c (mean diff {mean_diff:.2f})"
            else:
                mode = f"recompressed (quant rejected, diff {mean_diff:.2f})"

    if len(best) < before:
        with open(f, "wb") as out:
            out.write(best)
    after = os.path.getsize(f)
    total_before += before
    total_after += after
    print(f"{os.path.basename(f):52} {before/1024:8.0f}K {after/1024:8.0f}K {100*(before-after)/before:6.1f}%  {mode}")

print(f"\ntotal {total_before/1024/1024:.2f} MB -> {total_after/1024/1024:.2f} MB "
      f"({100*(total_before-total_after)/total_before:.1f}% smaller)")
