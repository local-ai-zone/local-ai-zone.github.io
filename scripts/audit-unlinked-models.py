#!/usr/bin/env python3
"""Scan every blog post for model names that have a matching /models/ page and
report the ones that are never linked.

Model pages are prerendered as models/<slug>.html, where <slug> is createSlug()
of the model name (scripts/slug-utils.js). Prose, however, writes model names
however it likes: "Qwen3.8-Flash-Next", "Clef-flash", "POCKET-Darwin-180B".
So the scanner never builds a slug function of its own — it normalises text to
a token stream and joins tokens with '-', which is exactly what createSlug()
produces, then looks the result up against the pages that really exist.

Matching tiers (a mention must satisfy all of its tier's rules):
  exact    the token run *is* a page slug
  fuzzy    the token run is a prefix or a suffix of exactly one page slug
           (models prose shortens: "V4-Flash" -> deepseek-v4-flash)

Guards against the false positives that plain substring matching produces:
  * the match must start on a word-span start and end on a word-span end, so
    "MAI-Voice-2.1-Flash" can never contribute a tail match on "...-1-flash"
    and "Claude Fable 5.1" cannot stop inside "5.1";
  * fuzzy matches must be a prefix or a suffix of the page slug, so section
    numbers like "8.1 The interface" cannot match tinydolphin-2-8-1-1b;
  * at least one token must contain a digit — "models", "checkpoint",
    "encoder" are page names too, and also ordinary English words;
  * header/nav/footer/script blocks are stripped and the <article> region is
    preferred, so site chrome does not count as a mention.

Output is a report, not a gate: exit 0 always, unless --strict is given and
unlinked mentions exist. Use --json for machine-readable output.

Usage:
  python scripts/audit-unlinked-models.py
  python scripts/audit-unlinked-models.py --min-mentions 3 --snippets 3
  python scripts/audit-unlinked-models.py --post blog/july-2026-ai-model-roundup.html
  python scripts/audit-unlinked-models.py --json
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HREF = re.compile(
    r'href="(?:https?://local-ai-zone\.github\.io)?(?:\.\./|/)models/'
    r'([^"#?]+?)(?:\.html)?"', re.I)
TOKEN = re.compile(r"[a-z0-9]+", re.I)
ATTACH = set("-._/+&@#:")            # characters that glue tokens into one word span
MAX_WINDOW = 14
MIN_FUZZY = 2


def read(path: str) -> str:
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def visible_text(html: str) -> str:
    """Body copy only: drop boilerplate blocks, then prefer the <article> region."""
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    html = re.sub(
        r"<script\b.*?</script>|<style\b.*?</style>|<head\b.*?</head>|"
        r"<nav\b.*?</nav>|<header\b.*?</header>|<footer\b.*?</footer>",
        " ", html, flags=re.S | re.I)
    m = re.search(r"<article\b.*?</article>", html, flags=re.S | re.I)
    if m:
        html = m.group(0)
    html = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html)


def has_digit(run) -> bool:
    return any(any(c.isdigit() for c in tok) for tok in run)


def has_word(run) -> bool:
    """At least one real word: stops '4.7' matching glm-4-7, '2.3' -> ltx-2-3."""
    return any(len(t) >= 4 and any(c.isalpha() for c in t) for t in run)


def tokenise(text: str):
    """[(word, start, end, span_start, span_end)] with lower-cased words."""
    out = []
    for m in TOKEN.finditer(text):
        word = m.group(0).lower()
        before = text[m.start() - 1] if m.start() else " "
        after = text[m.end()] if m.end() < len(text) else " "
        span_start = not (before.isalnum() or before in ATTACH)
        span_end = not (after.isalnum() or after in ATTACH)
        out.append((word, m.start(), m.end(), span_start, span_end))
    return out


def load_pages(models_dir: str) -> dict:
    """slug -> {tokens: tuple, path: str} for every prerendered model page."""
    pages = {}
    for f in sorted(os.listdir(models_dir)):
        if not f.endswith(".html"):
            continue
        slug = f[:-5]
        pages[slug] = {
            "tokens": tuple(re.findall(r"[a-z0-9]+", slug.lower())),
            "path": "models/" + f,
        }
    return pages


def build_indexes(pages: dict):
    """by_first: exact-tier gate.  partial: prefix/suffix runs -> {slug}."""
    by_first = defaultdict(list)
    partial = defaultdict(set)
    for slug, meta in pages.items():
        toks = meta["tokens"]
        if not toks:
            continue
        by_first[toks[0]].append(slug)
        for length in range(MIN_FUZZY, len(toks)):
            partial[toks[:length]].add(slug)      # prefix (prose drops the tail)
            partial[toks[-length:]].add(slug)     # suffix (prose drops the vendor)
    return by_first, partial


def scan_text(toks, by_first, partial, pages, digit_filter=True):
    """Greedy longest-match -> [(slug, kind, start_index, length)]."""
    words = [t[0] for t in toks]
    found = []
    i, n = 0, len(words)
    while i < n:
        match = None
        if words[i] in by_first:                                   # exact tier
            for length in range(min(MAX_WINDOW, n - i), 0, -1):
                run = words[i:i + length]
                if not toks[i][3] or not toks[i + length - 1][4]:  # span start/end
                    continue
                if "-".join(run) in pages and (not digit_filter or has_digit(run)):
                    match = ("-".join(run), "exact", i, length)
                    break
        if match is None:                                          # fuzzy tier
            for length in range(min(MAX_WINDOW, n - i), MIN_FUZZY - 1, -1):
                run = words[i:i + length]
                if not toks[i][3] or not toks[i + length - 1][4]:
                    continue
                if digit_filter and not has_digit(run):
                    continue
                if not has_word(run):                          # fuzzy tier only
                    continue
                hits = partial.get(tuple(run))
                if hits and len(hits) == 1:
                    match = (next(iter(hits)), "fuzzy", i, length)
                    break
        if match:
            found.append(match)
            i += match[3]
        else:
            i += 1
    return found


def audit(blog_paths, pages, by_first, partial, digit_filter=True):
    per_post = {}
    for path in blog_paths:
        html = read(path)
        linked = {m.group(1) for m in HREF.finditer(html)}
        text = visible_text(html)
        toks = tokenise(text)
        hits = scan_text(toks, by_first, partial, pages, digit_filter)

        counts = Counter()
        kinds = defaultdict(set)
        snippets = {}
        for slug, kind, idx, length in hits:
            counts[slug] += 1
            kinds[slug].add(kind)
            if slug not in snippets:
                start, end = toks[idx][1], toks[idx + length - 1][2]
                lo, hi = max(0, start - 70), min(len(text), end + 70)
                snippets[slug] = ("…" if lo else "") + text[lo:hi].strip() + ("…" if hi < len(text) else "")
        per_post[path] = {"linked": linked, "mentions": counts, "kinds": kinds,
                          "snippets": snippets}
    return per_post


def main(argv=None):
    ap = argparse.ArgumentParser(description="Report model pages named in blog posts but never linked.")
    ap.add_argument("--blog-dir", default="blog")
    ap.add_argument("--models-dir", default="models")
    ap.add_argument("--post", action="append", default=[], help="limit to specific post(s); repeatable")
    ap.add_argument("--min-mentions", type=int, default=1, help="hide models with fewer mentions")
    ap.add_argument("--snippets", type=int, default=3, help="example mentions printed per model")
    ap.add_argument("--limit", type=int, default=0, help="print at most N rows per section (0 = all)")
    ap.add_argument("--include-site", action="store_true",
                    help="also count links from non-blog pages such as index.html")
    ap.add_argument("--no-digit-filter", dest="digit_filter", action="store_false",
                    help="also match names with no digits (Clef-flash, Muse Spark) — noisier")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true", help="exit 1 when unlinked mentions exist")
    args = ap.parse_args(argv)

    pages = load_pages(args.models_dir)
    by_first, partial = build_indexes(pages)

    posts = []
    for p in args.post:
        if os.path.exists(p):
            posts.append(p)
        elif os.path.exists(os.path.join(args.blog_dir, p)):
            posts.append(os.path.join(args.blog_dir, p))
        else:
            print("post not found: %s (looked in . and %s/)" % (p, args.blog_dir), file=sys.stderr)
            return 2
    if not posts:
        posts = sorted(glob.glob(os.path.join(args.blog_dir, "*.html")))
    if not posts:
        print("no blog posts found in %s" % args.blog_dir)
        return 1

    per_post = audit(posts, pages, by_first, partial, args.digit_filter)

    site_linked = set()
    if args.include_site:
        for f in glob.glob("*.html"):
            site_linked |= {m.group(1) for m in HREF.finditer(read(f))}

    mentions = Counter()
    exact = Counter()
    fuzzy = Counter()
    linked_posts = Counter()
    post_hits = defaultdict(list)
    snippets = defaultdict(list)
    for path, data in per_post.items():
        for slug, count in data["mentions"].items():
            mentions[slug] += count
            if "exact" in data["kinds"][slug]:
                exact[slug] += count
            else:
                fuzzy[slug] += count
            if slug in data["linked"]:
                linked_posts[slug] += 1
            post_hits[slug].append((path, count, slug in data["linked"]))
            if len(snippets[slug]) < args.snippets:
                snippets[slug].append((path, data["snippets"].get(slug, "")))

    unlinked_exact = [s for s in mentions
                      if exact[s] and linked_posts[s] == 0
                      and not (args.include_site and s in site_linked)]
    unlinked_fuzzy = [s for s in mentions
                      if not exact[s] and linked_posts[s] == 0
                      and not (args.include_site and s in site_linked)]
    partial_linked = [s for s in mentions
                      if linked_posts[s] > 0 and len(post_hits[s]) > linked_posts[s]]
    for bucket in (unlinked_exact, unlinked_fuzzy, partial_linked):
        bucket.sort(key=lambda s: (-mentions[s], s))
        bucket[:] = [s for s in bucket if mentions[s] >= args.min_mentions]

    if args.json:
        def row(slug):
            return {"page": pages[slug]["path"], "slug": slug, "mentions": mentions[slug],
                    "exact_mentions": exact[slug], "fuzzy_mentions": fuzzy[slug],
                    "linked_from_posts": linked_posts[slug], "site_linked": slug in site_linked,
                    "posts": [{"post": p, "mentions": c, "linked": l} for p, c, l in post_hits[slug]],
                    "snippets": [{"post": p, "text": t} for p, t in snippets[slug]]}
        print(json.dumps({
            "posts_scanned": len(posts), "model_pages": len(pages),
            "named": len(mentions),
            "never_linked_exact": [row(s) for s in unlinked_exact],
            "never_linked_fuzzy": [row(s) for s in unlinked_fuzzy],
            "partially_linked": [row(s) for s in partial_linked],
        }, indent=2))
        return 1 if (args.strict and unlinked_exact) else 0

    print("MODEL-LINK AUDIT — %d blog post(s) scanned" % len(posts))
    with_exact = [s for s in mentions if exact[s]]
    only_fuzzy = [s for s in mentions if not exact[s]]
    print("model pages on disk: %d | named in posts: %d (%d with exact-name mentions, %d only by a shortened form)"
          % (len(pages), len(mentions), len(with_exact), len(only_fuzzy)))
    print("named and linked from at least one post: %d | never linked: %d exact + %d fuzzy to review"
          % (sum(1 for s in mentions if linked_posts[s]), len(unlinked_exact), len(unlinked_fuzzy)))
    if not args.include_site:
        print("(link counts cover blog posts only; rerun with --include-site to count index.html too)")

    def show(bucket, heading, budget):
        print("\n%s" % heading)
        if not bucket:
            print("  (none)")
            return 0
        shown = bucket[:budget] if budget else bucket
        for slug in shown:
            kind = "exact" if exact[slug] else "fuzzy"
            print("  %5d mention(s) in %2d post(s)  [%s]  %s"
                  % (mentions[slug], len(post_hits[slug]), kind, pages[slug]["path"]))
            for post, text in snippets[slug]:
                print("        %-44s %s" % (os.path.relpath(post, args.blog_dir), text))
        return len(bucket) - len(shown)

    hidden = 0
    hidden += show(unlinked_exact, "NEVER LINKED — named in a post, no <a> to a /models/ page anywhere", args.limit)
    hidden += show(unlinked_fuzzy, "NEVER LINKED (fuzzy) — only a shortened/prefix form matched; verify by eye", args.limit)
    hidden += show(partial_linked, "PARTIALLY LINKED — linked from some posts, named without a link in others", args.limit)

    linked_ok = sorted(s for s in mentions if linked_posts[s] > 0)
    print("\nLINKED OK — %d model page(s): %s%s" % (
        len(linked_ok), ", ".join(linked_ok[:10]), " …" if len(linked_ok) > 10 else ""))
    if hidden:
        print("(%d row(s) hidden — raise --limit or use --json)" % hidden)

    return 1 if (args.strict and unlinked_exact) else 0


if __name__ == "__main__":
    sys.exit(main())
