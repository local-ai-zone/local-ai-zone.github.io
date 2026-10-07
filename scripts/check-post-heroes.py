#!/usr/bin/env python3
"""Check that every blog post has its own hero image, and that all three image
slots in its head point at it.

Every post used to share the site-wide /og-image.png, so a link preview of any
post showed the same card and nothing tied the image to the article. The
registry in scripts/generate-post-images.js now holds one 1200x630 hero per post.
This script keeps that invariant honest when a post is added later:

    python scripts/check-post-heroes.py

Exit status is 1 when a post is missing a hero, when the PNG is not a 1200x630
image, or when og:image / twitter:image / JSON-LD "image" disagree, and 0 when
all 38 posts are covered. The image size is read from the PNG header, so the
check needs no image library.

What it checks
--------------
  A  the registry defines exactly one hero per post and no two heroes share a
     filename or a post
  B  every post in blog/ is registered, its hero PNG exists and its IHDR says
     1200x630
  C  og:image, twitter:image and the Article node's JSON-LD "image" all point
     at that hero, with og:image:width/height and non-empty alt text
  D  no post still points at the site-wide /og-image.png fallback
"""
import glob
import json
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY = os.path.join(ROOT, 'scripts', 'generate-post-images.js')
BLOG = os.path.join(ROOT, 'blog')
SITE = 'https://local-ai-zone.github.io/'
FALLBACK = SITE + 'og-image.png'
ARTICLE_TYPES = ('Article', 'TechArticle', 'ScholarlyArticle', 'BlogPosting', 'NewsArticle')

ENTRY = re.compile(r"file: '([^']+)',\s*kind: '(\w+)',\s*layout: '(\w+)',\s*post: '([^']+)'")
META = re.compile(r'<meta\b[^>]*>', re.I)
ATTR = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')
LD = re.compile(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', re.S)


def metas(text):
    """Social tags, whatever attribute order the post happens to use."""
    out = {}
    for tag in META.findall(text):
        a = dict(ATTR.findall(tag))
        key = a.get('property') or a.get('name')
        if key:
            out.setdefault(key, a.get('content', ''))
    return out


def png_size(path):
    """Width/height from the IHDR chunk, no image library required."""
    with open(path, 'rb') as fh:
        head = fh.read(24)
    if len(head) < 24 or head[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    return int.from_bytes(head[16:20], 'big'), int.from_bytes(head[20:24], 'big')


def article_images(text):
    """Every "image" value on an Article node, plus any JSON-LD that will not parse."""
    found, broken = [], []
    for block in LD.findall(text):
        try:
            data = json.loads(block)
        except ValueError as exc:
            broken.append(str(exc))
            continue
        for node in (data if isinstance(data, list) else [data]):
            if not isinstance(node, dict):
                continue
            types = node.get('@type', '')
            types = types if isinstance(types, list) else [types]
            if not any(t in ARTICLE_TYPES for t in types):
                continue
            img = node.get('image')
            if isinstance(img, list):
                found += [(i if isinstance(i, str) else (i or {}).get('url'), node) for i in img]
            elif isinstance(img, dict):
                found.append((img.get('url'), node))
            else:
                found.append((img, node))
    return found, broken


def main():
    js = open(REGISTRY, encoding='utf-8', errors='replace').read()
    body = js[js.index('const IMAGES = ['):js.index('function buildHtml')]
    posts_hero = defaultdict(list)
    for file, kind, _layout, post in ENTRY.findall(body):
        if kind == 'hero':
            posts_hero[os.path.basename(post)].append(file)

    errors = defaultdict(list)

    # A. one hero per post, unique filenames
    for post, heroes in sorted(posts_hero.items()):
        if len(heroes) > 1:
            errors['A post registered with more than one hero'].append(
                '%s: %s' % (post, ', '.join(heroes)))
    by_file = defaultdict(list)
    for post, heroes in posts_hero.items():
        for h in heroes:
            by_file[h].append(post)
    for h, owners in sorted(by_file.items()):
        if len(owners) > 1:
            errors['A two posts share one hero file'].append('%s: %s' % (h, ', '.join(owners)))

    on_disk = sorted(os.path.basename(p) for p in glob.glob(os.path.join(BLOG, '*.html')))
    if not on_disk:
        errors['B no posts found'].append(BLOG)
    covered = 0
    for post in on_disk:
        heroes = posts_hero.get(post)
        if not heroes:
            errors['B post has no hero in the registry'].append(post)
            continue
        path = os.path.join(BLOG, heroes[0])
        if not os.path.exists(path):
            errors['B hero PNG missing'].append('%s -> %s' % (post, heroes[0]))
            continue
        size = png_size(path)
        if size != (1200, 630):
            errors['B hero is not 1200x630'].append('%s: %s -> %s' % (post, heroes[0], size))
            continue
        covered += 1

        # C/D. the three image slots must agree
        text = open(os.path.join(BLOG, post), encoding='utf-8', errors='replace').read()
        want = SITE + 'blog/' + heroes[0]
        m = metas(text)
        for tag in ('og:image', 'twitter:image'):
            if m.get(tag) != want:
                errors['C image slot does not point at this post\'s hero'].append(
                    '%s: %s = %s' % (post, tag, m.get(tag) or '(absent)'))
        if (m.get('og:image:width'), m.get('og:image:height')) != ('1200', '630'):
            errors['C og:image:width/height not 1200x630'].append(
                '%s: %s x %s' % (post, m.get('og:image:width'), m.get('og:image:height')))
        for tag in ('og:image:alt', 'twitter:image:alt'):
            if not m.get(tag):
                errors['C missing alt text'].append('%s: %s' % (post, tag))
        found, broken = article_images(text)
        for msg in broken:
            errors['C JSON-LD block is not valid JSON'].append('%s: %s' % (post, msg))
        if not found:
            errors['C Article JSON-LD has no image'].append(post)
        for value, node in found:
            if value != want:
                errors['C JSON-LD image does not point at this post\'s hero'].append(
                    '%s: %s = %s' % (post, (node or {}).get('@type', '?'), value or '(absent)'))
        if FALLBACK in text:
            errors['D still points at the site-wide fallback'].append(
                '%s: %s' % (post, FALLBACK))

    total = sum(len(v) for v in errors.values())
    print('%d post(s) in blog/, %d hero(es) in the registry, %d fully wired'
          % (len(on_disk), len(by_file), covered))
    for group in ('A post registered with more than one hero',
                  'A two posts share one hero file',
                  'B no posts found',
                  'B post has no hero in the registry',
                  'B hero PNG missing',
                  'B hero is not 1200x630',
                  "C image slot does not point at this post's hero",
                  'C og:image:width/height not 1200x630',
                  'C missing alt text',
                  'C Article JSON-LD has no image',
                  'C JSON-LD block is not valid JSON',
                  "C JSON-LD image does not point at this post's hero",
                  'D still points at the site-wide fallback'):
        if errors[group]:
            print('\n[%s]  (%d)' % (group, len(errors[group])))
            for line in errors[group]:
                print('  ' + line)
    if total:
        print('\n%d PROBLEM(S)' % total)
        return 1
    if len(by_file) < len(on_disk):
        print('\nno per-post hero problems, but the registry holds fewer heroes than posts')
        return 1
    print('\nevery post has its own 1200x630 hero, wired into og:image, twitter:image and JSON-LD')
    return 0


if __name__ == '__main__':
    sys.exit(main())
