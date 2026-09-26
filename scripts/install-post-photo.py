#!/usr/bin/env python
"""Install a real screenshot or photo into one of the six prepared blog photo slots.

The six posts each carry a commented-out <figure> placeholder ("PHOTO SLOT"). This
script validates an image against the slot's spec, optimises it for the web, writes it
into blog/, and replaces the comment with live markup (dimensions, alt text and caption
taken from the file itself unless overridden).

    python scripts/install-post-photo.py --list
    python scripts/install-post-photo.py --slot=kv --file=~/Pictures/cache-hit.png
    python scripts/install-post-photo.py --slot=dispatch --file=shot.png \
        --alt "..." --caption "..." --dry-run
    python scripts/install-post-photo.py --check
    python scripts/install-post-photo.py --slot=kv --uninstall

Spec per slot: landscape, at least 1200px wide, ideally 1600x900 or larger, and under
400 KB once installed (PNG is kept when it fits; otherwise the image is re-encoded as
progressive JPEG and the markup is pointed at the .jpg).
"""

import argparse
import io
import os
import re
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: python -m pip install Pillow")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")

MAX_BYTES = 400 * 1024
MAX_WIDTH = 2560
MIN_WIDTH = 800
RECOMMENDED_WIDTH = 1600
TARGET_RATIO = 16 / 9

SLOTS = {
    "dispatch": {
        "post": "blog/September_2026_AI_Model_Updates.html",
        "file": "september-2026-local-models-dashboard.png",
        "subject": "your own GGUF model browser, or a desk shot of the rig running several of the month's open-weight releases",
        "capture": "node scripts/capture-post-screenshots.js --slot=dispatch",
    },
    "kv": {
        "post": "blog/deepseek-kv-cache-optimization-research-paper.html",
        "file": "deepseek-kv-cache-disk-hit.png",
        "subject": "a serving log showing KV cache reuse across two turns (prompt eval time collapsing on the second request)",
        "capture": "see scripts/PHOTO_SLOTS.md, slot kv",
    },
    "ffn": {
        "post": "blog/deepseek-ffn-moe-evolution-research-paper.html",
        "file": "deepseek-moe-expert-parallel-gpus.png",
        "subject": "a GPU utilisation dashboard or nvidia-smi capture during a MoE forward pass",
        "capture": "node scripts/capture-post-screenshots.js --slot=ffn --url=http://127.0.0.1:8080",
    },
    "context": {
        "post": "blog/context-management-agent-loops-research-paper.html",
        "file": "agent-context-compaction-notes.png",
        "subject": "a real agent session's notes file beside the session's token or context meter",
        "capture": "see scripts/PHOTO_SLOTS.md, slot context",
    },
    "agent": {
        "post": "blog/how-to-build-an-ai-agent-step-by-step-guide.html",
        "file": "ai-agent-run-terminal.png",
        "subject": "a terminal capture of a working agent run: the tool calls, the observations, the final answer",
        "capture": "python scripts/minimal-agent-loop.py  (then screenshot the terminal)",
    },
    "bonsai": {
        "post": "blog/bonsai-2-27b-ternary-quantization-deep-dive.html",
        "file": "bonsai-2-27b-rtx-5090.png",
        "subject": "llama-bench or llama.cpp printing the ternary Bonsai at roughly 143 tokens per second with the model size visible",
        "capture": "llama-bench -m <bonsai2-27b-ternary.gguf> -p 512 -n 128  (then screenshot the terminal)",
    },
}

COMMENT_RE = re.compile(r"[ \t]*<!--\s*PHOTO SLOT(?:\s*\([a-z]+\))?:[\s\S]*?-->")
FIGURE_RE = re.compile(r"<figure>[\s\S]*?</figure>")


def read(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def slot_paths(slot_id):
    slot = SLOTS[slot_id]
    post = os.path.join(ROOT, slot["post"].replace("/", os.sep))
    return slot, post


def prepare_image(src, dry_run=False):
    """Validate, cap and compress an image. Returns (bytes, extension, width, height, notes)."""
    notes = []
    image = Image.open(src)
    image.load()
    width, height = image.size

    if width < MIN_WIDTH:
        sys.exit(f"✗ {os.path.basename(src)} is {width}px wide — too small for a figure "
                 f"(minimum {MIN_WIDTH}px, ideally {RECOMMENDED_WIDTH}px or more).")
    if width < RECOMMENDED_WIDTH:
        notes.append(f"width {width}px is below the recommended {RECOMMENDED_WIDTH}px; it will still look fine at 1x")
    ratio = width / height
    if abs(ratio - TARGET_RATIO) > 0.28:
        notes.append(f"aspect ratio {ratio:.2f}:1 is far from 16:9 ({TARGET_RATIO:.2f}:1) — it will letterbox in the layout")

    if width > MAX_WIDTH:
        new_h = round(height * MAX_WIDTH / width)
        image = image.resize((MAX_WIDTH, new_h), Image.LANCZOS)
        notes.append(f"downscaled to {MAX_WIDTH}px wide")
        width, height = image.size

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    elif image.mode == "L":
        image = image.convert("RGB")

    # Prefer PNG when it fits (crisp text for screenshots), fall back to JPEG.
    if dry_run:
        png_bytes = b""
    else:
        buffer = io.BytesIO()
        image.save(buffer, format="PNG", optimize=True, compress_level=9)
        png_bytes = buffer.getvalue()

    if not dry_run and len(png_bytes) <= MAX_BYTES:
        return png_bytes, ".png", width, height, notes

    for quality in (90, 85, 80, 74, 68):
        if dry_run:
            break
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True, subsampling=1)
        if len(buffer.getvalue()) <= MAX_BYTES:
            notes.append(f"stored as JPEG q{quality} to stay under {MAX_BYTES // 1024} KB")
            return buffer.getvalue(), ".jpg", width, height, notes

    if dry_run:
        notes.append("dry run: no bytes written")
        return b"", ".png", width, height, notes

    sys.exit("✗ could not compress the image below 400 KB — crop it or shoot a smaller frame")


def replace_block(html, slot_file, extension, width, height, alt, caption):
    match = COMMENT_RE.search(html)
    if not match:
        sys.exit("✗ no PHOTO SLOT comment found in this post — it may already be installed "
                 "(use --uninstall to revert, or --check to inspect).")
    block = match.group(0)
    if slot_file.split(".")[0] not in block:
        sys.exit("✗ the open placeholder in this post is not the one this slot expects.")

    figure_match = FIGURE_RE.search(block)
    if not figure_match:
        sys.exit("✗ the placeholder comment does not contain a <figure> block.")

    figure = figure_match.group(0)
    stem = os.path.splitext(slot_file)[0]
    figure = re.sub(r'src="[^"]+"', f'src="{stem}{extension}"', figure)
    figure = re.sub(r'\bwidth="\d+"', f'width="{width}"', figure)
    figure = re.sub(r'\bheight="\d+"', f'height="{height}"', figure)
    if alt:
        figure = re.sub(r'alt="[^"]*"', f'alt="{alt}"', figure)
    if caption:
        figure = re.sub(r"<figcaption>[\s\S]*?</figcaption>", f"<figcaption>{caption}</figcaption>", figure)

    # Keep the placeholder comment's own indentation on the first line of the markup.
    leading = match.group(0)[: len(match.group(0)) - len(match.group(0).lstrip(" \t"))]
    return html[: match.start()] + leading + figure + html[match.end():], figure


def cmd_list():
    print(f"{'slot':10} {'state':10} {'post':46} target file")
    for slot_id, slot in SLOTS.items():
        post = os.path.join(ROOT, slot["post"].replace("/", os.sep))
        html = read(post)
        installed = COMMENT_RE.search(html) is None
        on_disk = [f for f in os.listdir(BLOG)
                   if f.startswith(os.path.splitext(slot["file"])[0]) and not f.startswith("_")]
        if installed and on_disk:
            state = "LIVE"
        elif installed:
            state = "BROKEN"
        else:
            state = "PENDING"
        print(f"{slot_id:10} {state:10} {slot['post']:46} {on_disk[0] if on_disk else slot['file']}")
        if state == "PENDING":
            print(f"{'':12}subject: {slot['subject']}")
            print(f"{'':12}capture: {slot['capture']}")
    pending = sum(1 for s in SLOTS.values()
                  if COMMENT_RE.search(read(os.path.join(ROOT, s["post"].replace("/", os.sep)))))
    print(f"\n{len(SLOTS) - pending}/{len(SLOTS)} slots filled")


def cmd_install(slot_id, src, alt, caption, dry_run):
    slot, post = slot_paths(slot_id)
    if not os.path.exists(src):
        sys.exit(f"✗ file not found: {src}")
    if not os.path.exists(post):
        sys.exit(f"✗ post not found: {slot['post']}")

    data, extension, width, height, notes = prepare_image(src, dry_run)
    stem = os.path.splitext(slot["file"])[0]
    target = os.path.join(BLOG, f"{stem}{extension}")

    print(f"slot      {slot_id} → {slot['post']}")
    print(f"source    {src}  ({os.path.getsize(src) / 1024:.0f} KB)")
    if not dry_run:
        with open(target, "wb") as handle:
            handle.write(data)
        print(f"installed blog/{stem}{extension}  ({len(data) / 1024:.0f} KB, {width}x{height})")
    else:
        print(f"would install blog/{stem}{extension}  ({width}x{height})")
    for note in notes:
        print(f"note      {note}")

    if alt is None:
        alt = f"{slot['subject'].capitalize()} — captured for this piece"
    url = f"{stem}{extension}"

    html = read(post)
    before = html
    html, figure = replace_block(html, slot["file"], extension, width, height, alt, caption)
    if html == before:
        sys.exit("✗ the placeholder was not replaced (unexpected markup).")
    if not dry_run:
        write(post, html)

    print(f"{'would publish' if dry_run else 'published '} {os.path.basename(post)}: placeholder comment → live <figure>")
    print(f"alt       {alt}")
    print("\nnext: node scripts/generate-seo.js   # registers the new image in the image sitemap")


def cmd_uninstall(slot_id):
    slot, post = slot_paths(slot_id)
    html = read(post)
    stem = os.path.splitext(slot["file"])[0]
    img = re.search(r'<img[^>]*src="' + re.escape(stem) + r'\.(?:png|jpe?g|webp)"', html)
    if not img:
        sys.exit("✗ no live figure for this slot in the post.")
    figure_start = html.rfind("<figure>", 0, img.start())
    figure_end = html.find("</figure>", img.end())
    if figure_start == -1 or figure_end == -1:
        sys.exit("✗ could not bracket the figure markup for this slot.")
    figure_end += len("</figure>")
    start = html.rfind("\n", 0, figure_start) + 1
    indent = html[start:figure_start]
    cfg = SLOTS[slot_id]
    comment = (
        f"{indent}<!-- PHOTO SLOT ({slot_id}): save a real screenshot to blog/{cfg['file']} "
        f"(landscape, 1600x900 or larger, under 400 KB), then run "
        f"python scripts/install-post-photo.py --slot={slot_id} --file=PATH. "
        f"Suggested subject: {cfg['subject']}.\n"
        + html[start:figure_end].rstrip()
        + f"\n{indent}-->\n"
    )
    write(post, html[:start] + comment + html[figure_end:])
    print(f"reverted {os.path.basename(post)}: live figure → placeholder comment (the image file is left in blog/)")


def cmd_check():
    problems = 0
    for slot_id, slot in SLOTS.items():
        post = os.path.join(ROOT, slot["post"].replace("/", os.sep))
        html = read(post)
        if COMMENT_RE.search(html):
            print(f"PENDING  {slot_id:10} placeholder still open")
            continue
        stem = os.path.splitext(slot["file"])[0]
        matches = [f for f in os.listdir(BLOG) if f.startswith(stem)]
        if not matches:
            print(f"BROKEN   {slot_id:10} live figure but no file in blog/")
            problems += 1
            continue
        name = matches[0]
        path = os.path.join(BLOG, name)
        width, height = Image.open(path).size
        size_kb = os.path.getsize(path) / 1024
        fig = re.search(r'<img[^>]*src="' + re.escape(name) + r'"[^>]*>', html)
        ok = fig is not None and f'width="{width}"' in (fig.group(0) if fig else "") \
            and f'height="{height}"' in (fig.group(0) if fig else "") and size_kb <= 400
        print(f"{'OK' if ok else 'CHECK':8} {slot_id:10} blog/{name}  {width}x{height}  {size_kb:.0f} KB")
        if not ok:
            problems += 1
            print(f"{'':9} markup and file disagree, or the file exceeds 400 KB")
    print(f"\n{len(SLOTS) - problems} of {len(SLOTS)} slots healthy")
    return problems


def main():
    parser = argparse.ArgumentParser(description="Install real screenshots into the prepared blog photo slots.")
    parser.add_argument("--list", action="store_true", help="show every slot and whether it is filled")
    parser.add_argument("--check", action="store_true", help="validate installed slots against the markup")
    parser.add_argument("--slot", choices=sorted(SLOTS), help="which slot to install into")
    parser.add_argument("--file", help="the screenshot or photo to install")
    parser.add_argument("--alt", help="override the alt text")
    parser.add_argument("--caption", help="override the visible caption")
    parser.add_argument("--dry-run", action="store_true", help="validate and report without writing")
    parser.add_argument("--uninstall", action="store_true", help="turn the live figure back into a placeholder")
    args = parser.parse_args()

    if args.list or not (args.slot or args.check):
        return cmd_list()
    if args.check:
        return cmd_check()
    if args.uninstall:
        return cmd_uninstall(args.slot)
    if not args.file:
        parser.error("--file is required when installing (or use --list / --check)")
    return cmd_install(args.slot, os.path.expanduser(args.file), args.alt, args.caption, args.dry_run)


if __name__ == "__main__":
    main()
