"""Render the two static graphics for the Inkling 2 Mini deep-dive post.

Usage:
    python scripts/generate-inkling-2-mini-images.py

Produces:
    blog/inkling-2-mini-hero.png                    1200x630 OG hero
    blog/inkling-2-mini-vs-qwen-3-8-27b.png         1400x860 comparison chart

Pillow only (tested with Pillow 11.3.0). Numbers come from the Thinking Machines
model card and launch post, November 2026.
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


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = y / h
            px[x, y] = tuple(lerp(top[i], bottom[i], t) for i in range(3))
    return img.convert("RGBA")


def glow(size, draw_fn, color, radius):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer), color)
    return layer.filter(ImageFilter.GaussianBlur(radius))


def build_hero():
    W, H = 1200, 630
    img = gradient((W, H), (7, 18, 40), (13, 39, 72))

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 48):
        gd.line((x, 0, x, H), fill=(120, 170, 230, 16))
    for y in range(0, H, 48):
        gd.line((0, y, W, y), fill=(120, 170, 230, 16))
    img = Image.alpha_composite(img, grid)

    def halo(d, c):
        d.ellipse((250, 150, 980, 500), fill=(*c, 90))

    img = Image.alpha_composite(img, glow((W, H), halo, (28, 120, 210), 80))
    d = ImageDraw.Draw(img)

    d.text((60, 40), "THINKING MACHINES LAB  /  DEEP-DIVE RESEARCH", font=font(17, True), fill=(96, 196, 236))
    d.text((60, 70), "INKLING 2 MINI", font=font(44, True), fill=(240, 248, 255))
    d.text((62, 124), "A 26B looped MoE that runs on a laptop - side by side with Qwen3.8-27B",
           font=font(19), fill=(158, 184, 214))

    # Four layer blocks; middle two are traversed three times.
    blocks = [("PRELUDE", "1x", 62, 274, (86, 116, 156)),
              ("CORE A", "3x", 258, 274, (36, 178, 220)),
              ("CORE B", "3x", 454, 274, (36, 178, 220)),
              ("FINAL", "1x", 650, 274, (86, 116, 156))]
    for label, passes, x, y, color in blocks:
        d.rounded_rectangle((x, y, x + 166, y + 118), radius=16, fill=(11, 32, 62), outline=(*color, 255), width=3)
        d.text((x + 16, y + 14), label, font=font(17, True), fill=(*color, 255))
        d.text((x + 16, y + 48), passes, font=font(38, True), fill=(232, 244, 255))
        d.text((x + 16, y + 92), "6 layers", font=font(15), fill=(150, 176, 206))

    for x in (232, 428, 624):
        d.line((x, 333, x + 22, 333), fill=(120, 170, 210), width=4)
        d.polygon([(x + 24, 333), (x + 16, 328), (x + 16, 338)], fill=(120, 170, 210))

    # Loop arc over the two core blocks.
    d.arc((250, 206, 620, 320), 190, 350, fill=(52, 214, 232), width=4)
    d.text((306, 184), "middle 12 layers x3  =  48 visits per token", font=font(18, True), fill=(52, 214, 232))

    stats = [("26.4B", "total parameters"), ("3.4B", "active per pass"),
             ("5.4B", "effective active"), ("~20 GB", "NVFP4 + MXFP8")]
    x = 62
    for value, label in stats:
        d.rounded_rectangle((x, 428, x + 252, 524), radius=12, fill=(12, 34, 66), outline=(54, 92, 132), width=1)
        d.text((x + 16, 444), value, font=font(28, True), fill=(96, 214, 236))
        d.text((x + 16, 484), label, font=font(16), fill=(158, 184, 214))
        x += 270

    d.rectangle((0, 570, W, H), fill=(5, 12, 28, 235))
    d.text((60, 588), "Released November 20, 2026   |   Apache 2.0   |   1M-token context   |   text + image in",
           font=font(17), fill=(146, 174, 204))

    out = BLOG / "inkling-2-mini-hero.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


METRICS = [
    ("DeepSWE v1.1", 48.2, 42.2),
    ("SWE-bench Pro v2 Hard", 77.9, 73.8),
    ("BrowseComp", 79.0, 61.6),
    ("Vals Index v2.2", 46.5, 29.8),
]


def build_comparison():
    W, H = 1400, 860
    img = gradient((W, H), (9, 17, 39), (10, 30, 58))
    d = ImageDraw.Draw(img)

    d.text((56, 38), "INKLING 2 MINI  vs  QWEN3.8-27B", font=font(38, True), fill=(238, 247, 255))
    d.text((58, 90), "Same class, different route: looped 26.4B MoE vs dense 27B - Thinking Machines' own figures",
           font=font(19), fill=(158, 184, 214))

    for label, color, x in [("Inkling 2 Mini", (52, 214, 232), 58), ("Qwen3.8-27B", (126, 142, 166), 400)]:
        d.rounded_rectangle((x, 140, x + 22, 162), radius=5, fill=color)
        d.text((x + 32, 138), label, font=font(18), fill=(198, 216, 236))

    bar_x, bar_w = 350, 960
    for i, (name, inkling, qwen) in enumerate(METRICS):
        y = 206 + i * 152
        d.text((58, y + 30), name, font=font(22, True), fill=(226, 238, 250))
        for j, (value, color, label) in enumerate(((inkling, (52, 214, 232), "Inkling"),
                                                    (qwen, (126, 142, 166), "Qwen3.8"))):
            by = y + j * 46
            length = int(bar_w * value / 100)
            d.rounded_rectangle((bar_x, by, bar_x + bar_w, by + 32), radius=6, fill=(26, 44, 72))
            d.rounded_rectangle((bar_x, by, bar_x + length, by + 32), radius=6, fill=color)
            d.text((bar_x + 12, by + 5), f"{value:.1f}%", font=font(17, True), fill=(8, 18, 34))
            d.text((bar_x + bar_w + 14, by + 5), label, font=font(15), fill=(150, 176, 206))
        d.text((bar_x + 10, y + 100), f"delta  {inkling - qwen:+.1f} points", font=font(17, True), fill=(52, 214, 232))

    d.rectangle((0, 826, W, H), fill=(6, 13, 30, 235))
    d.text((56, 838), "Vendor-run benchmarks; evaluation setups vary by model. Full tables and Qwen wins are in the article.",
           font=font(16), fill=(136, 162, 194))

    out = BLOG / "inkling-2-mini-vs-qwen-3-8-27b.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    for path in (build_hero(), build_comparison()):
        print(f"{path.name}: {path.stat().st_size:,} bytes")
