"""Render the two static graphics for the Bonsai 2.5 deep-dive post.

Usage:
    python scripts/generate-bonsai-2-5-images.py

Produces:
    blog/bonsai-2-5-27b-hero.png          1200x630 OG hero
    blog/bonsai-2-5-vs-2-comparison.png   1400x820 side-by-side benchmark chart

No third-party dependencies beyond Pillow (tested with Pillow 11.3.0).
All numbers are copied from the Bonsai 2.5 model card / whitepaper.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"

FONT_DIR = Path("C:/Windows/Fonts")
REGULAR = str(FONT_DIR / "segoeui.ttf")
BOLD = str(FONT_DIR / "segoeuib.ttf")


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient(size, top, bottom, diagonal=True):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (y / h * 0.72 + x / w * 0.28) if diagonal else y / h
            px[x, y] = tuple(lerp(top[i], bottom[i], t) for i in range(3))
    return img


def glow_layer(size, draw_fn, color, radius):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_fn(d, color)
    return layer.filter(ImageFilter.GaussianBlur(radius))


def build_hero():
    W, H = 1200, 630
    img = gradient((W, H), (8, 16, 38), (12, 34, 68)).convert("RGBA")

    # Soft radial glow behind the chips.
    def ring(d, color):
        d.ellipse((390, 90, 940, 560), fill=(*color, 110))

    img = Image.alpha_composite(img, glow_layer((W, H), ring, (34, 122, 214), 90))

    # Circuit grid.
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 48):
        gd.line((x, 0, x, H), fill=(120, 170, 230, 16), width=1)
    for y in range(0, H, 48):
        gd.line((0, y, W, y), fill=(120, 170, 230, 16), width=1)
    img = Image.alpha_composite(img, grid)
    d = ImageDraw.Draw(img)

    # Kicker + headline.
    d.text((64, 46), "LOCAL AI ZONE  /  DEEP-DIVE RESEARCH", font=font(18, True), fill=(96, 196, 236))
    d.text((64, 80), "TERNARY BONSAI 2.5 27B", font=font(34, True), fill=(236, 245, 255))
    d.text((66, 128), "Same weights. A different agent.", font=font(21), fill=(160, 182, 210))

    # Ghost predecessor chip (same physical size, lower contrast).
    d.rounded_rectangle((836, 248, 1164, 452), radius=24, outline=(92, 116, 152, 140), width=2)
    d.text((866, 282), "BONSAI 2", font=font(30, True), fill=(104, 126, 158))
    d.text((868, 328), "5.93 GB  /  1.76 bpw", font=font(18), fill=(88, 108, 138))
    d.text((868, 362), "September 17, 2026", font=font(17), fill=(76, 94, 122))

    # Main chip with glow.
    def chip(draw, color):
        draw.rounded_rectangle((356, 208, 812, 470), radius=30, fill=(*color, 180))

    img = Image.alpha_composite(img, glow_layer((W, H), chip, (24, 134, 230), 26))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((356, 208, 812, 470), radius=30, fill=(11, 30, 62, 255), outline=(72, 182, 244, 255), width=3)
    d.text((400, 250), "BONSAI 2.5", font=font(48, True), fill=(245, 250, 255))
    d.text((402, 318), "27B  /  5.93 GB  /  1.76 bpw", font=font(21), fill=(134, 214, 244))
    d.text((402, 358), "FP16-level tool calling", font=font(22, True), fill=(230, 242, 252))
    d.text((402, 394), "90% of FP16 agentic coding", font=font(20), fill=(178, 200, 224))

    # Orbit nodes and connector lines.
    nodes = [
        (250, 300, ">_"),
        (880, 520, "{}"),
        (320, 500, "="),
        (960, 170, "#"),
    ]
    for nx, ny, label in nodes:
        d.line((584, 339, nx, ny), fill=(70, 150, 210, 170), width=2)
        d.ellipse((nx - 26, ny - 26, nx + 26, ny + 26), fill=(14, 44, 82), outline=(74, 176, 232), width=2)
        bb = d.textbbox((0, 0), label, font=font(20, True))
        d.text((nx - (bb[2] - bb[0]) / 2, ny - (bb[3] - bb[1]) / 2 - 6), label,
               font=font(20, True), fill=(186, 224, 246))

    # Footer band.
    d.rectangle((0, 574, W, H), fill=(5, 12, 28, 230))
    d.text((64, 592), "Bonsai 2  ->  Bonsai 2.5   |   November 24, 2026   |   Apache 2.0",
           font=font(18), fill=(146, 174, 204))

    out = BLOG / "bonsai-2-5-27b-hero.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


METRICS = [
    ("AppWorld", 93.2, 51.2, 90.5),
    ("DeepSWE", 30.1, 0.0, 27.0),
    ("SWE-bench Verified", 80.6, 60.8, 75.6),
    ("Agentic coding avg", 60.5, 37.9, 54.2),
]


def build_comparison():
    W, H = 1400, 860
    img = gradient((W, H), (10, 18, 40), (11, 30, 58), diagonal=False).convert("RGBA")
    d = ImageDraw.Draw(img)

    d.text((56, 40), "BONSAI 2  vs  BONSAI 2.5", font=font(38, True), fill=(238, 247, 255))
    d.text((58, 92), "Same Qwen3.8-27B base, same 5.93 GB ternary weights - thinking mode, xhigh",
           font=font(20), fill=(158, 184, 214))

    legend = [("Qwen3.8 FP16 (53.8 GB)", (126, 142, 166)),
              ("Bonsai 2 (5.93 GB)", (224, 164, 74)),
              ("Bonsai 2.5 (5.93 GB)", (52, 214, 232))]
    lx = 58
    for label, color in legend:
        d.rounded_rectangle((lx, 138, lx + 22, 160), radius=5, fill=color)
        d.text((lx + 32, 138), label, font=font(17), fill=(198, 216, 236))
        lx += 370

    bar_x, bar_w = 340, 950
    row_y = [196, 340, 484, 628]
    colors = [(126, 142, 166), (224, 164, 74), (52, 214, 232)]
    labels = ["FP16", "Bonsai 2", "Bonsai 2.5"]

    for (name, fp16, b2, b25), y in zip(METRICS, row_y):
        d.text((58, y + 34), name, font=font(21, True), fill=(226, 238, 250))
        for i, value in enumerate((fp16, b2, b25)):
            by = y + i * 40
            length = int(bar_w * value / 100.0)
            d.rounded_rectangle((bar_x, by, bar_x + bar_w, by + 28), radius=6, fill=(26, 44, 72))
            if length > 0:
                d.rounded_rectangle((bar_x, by, bar_x + length, by + 28), radius=6, fill=colors[i])
            value_text = f"{value:.1f}"
            if length > 66:
                d.text((bar_x + 12, by + 3), value_text, font=font(16, True), fill=(8, 18, 34))
            else:
                d.text((bar_x + length + 10, by + 3), value_text, font=font(16, True), fill=(206, 224, 242))
            d.text((bar_x + bar_w + 14, by + 2), labels[i], font=font(15), fill=(150, 176, 206))
        delta = b25 - b2
        d.text((bar_x + 10, y + 122), f"delta  {delta:+.1f}", font=font(17, True), fill=(52, 214, 232))

    d.rectangle((0, 826, W, H), fill=(6, 13, 30, 235))
    d.text((56, 838), "Vendor-run benchmarks (PrismML whitepaper, November 2026); figures are claims to verify on your own hardware.",
           font=font(16), fill=(136, 162, 194))

    out = BLOG / "bonsai-2-5-vs-2-comparison.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    for path in (build_hero(), build_comparison()):
        print(f"{path.name}: {path.stat().st_size:,} bytes")
