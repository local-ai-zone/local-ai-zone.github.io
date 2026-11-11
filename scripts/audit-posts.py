#!/usr/bin/env python3
"""Audit blog posts for copy-paste / template artefacts.

A post is often created by copying a sibling post and rewriting the body. When
that happens the donor's identity tends to survive in the places that are easy
to miss: the banner <h1>, the canonical link, og:url, the JSON-LD headline and
mainEntityOfPage, the breadcrumb, the FAQ schema, and the declared reading time
and word count. This script checks every post in blog/ and reports what drifted.

    python scripts/audit-posts.py

Exit status is 1 when a real problem is found (so it can gate a build), 0 when
the corpus is clean. Checks that are informational only (reused sentences
between sibling posts) do not affect the exit status.

What it checks
--------------
  A  every self-referential URL in the head / JSON-LD points at this file
  B  page identity is not borrowed from another post (title, banner h1,
     og:title, twitter:title, JSON-LD headline)
  C  body sentences and FAQ questions shared verbatim with another post
  D  FAQ schema questions that have no visible counterpart in the page body
  E  relative links to local pages that do not exist
  F  relative image sources that do not exist (commented-out photo slots and
     absolute site paths are ignored)
  G  declared read-time and JSON-LD wordCount against the real body size,
     using the site's own 200-words-per-minute convention
"""
import glob
import html
import json
import os
import re
import sys
from collections import defaultdict

COMMENT = re.compile(r'<!--.*?-->', re.S)
SCRIPT_JSON = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
SCRIPT_ANY = re.compile(r'<script\b.*?</script>', re.S | re.I)
STYLE = re.compile(r'<style\b.*?</style>', re.S | re.I)
TAGS = re.compile(r'<[^>]+>')
H1 = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S | re.I)
ARTICLE_TITLE = re.compile(r'<h1[^>]*class="[^"]*\barticle-title\b[^"]*"[^>]*>(.*?)</h1>', re.S | re.I)
TITLE = re.compile(r'<title[^>]*>(.*?)</title>', re.S | re.I)
META = re.compile(r'<meta\s+([^>]+)>', re.I)
LINK = re.compile(r'<link\s+([^>]+)>', re.I)
# Two body wrappers are in use: the older posts use a div.article-content, the
# newer ones wrap the article in <main>. Either way the body ends at the first
# trailing block below.
BODY_OPEN = re.compile(r'<div[^>]*class="[^"]*\barticle-content\b[^"]*"[^>]*>|<main[^>]*>', re.I)
READTIME = re.compile(r'<span class="article-read-time">\s*[^<]*?(\d+)\s*min read')
VISIBLE_FAQ = re.compile(r'id="faq"|class="[^"]*\bfaq\b|frequently asked questions|— FAQ|>FAQ<|\bFAQ\b', re.I)
SUMMARY = re.compile(r'<summary[^>]*>(.*?)</summary>', re.S | re.I)
H3 = re.compile(r'<h3[^>]*>(.*?)</h3>', re.S | re.I)
STOP = set('a an the is are was were do does did can you i we it its to of and or for in on at with how what which why when who should would could my our your'.split())
HREF = re.compile(r'href=["\']([^"\'#?]+)["\']', re.I)
SRC = re.compile(r'(?:src|data-src)=["\']([^"\'#?]+)["\']', re.I)
WORD = re.compile(r"[A-Za-z0-9][A-Za-z0-9'\-\.]*")
SITE = 'https://local-ai-zone.github.io/'
WPM = 200

# Shared chrome that legitimately repeats across every post.
BODY_END = ['kv-related', 'related-posts', 'class="related-card', 'read more',
            'about the author', 'class="post-help"', 'id="post-help"',
            'contact-tab-button', 'contact-form-panel', '<!-- Contact',
            '</article', '</main', '<footer', '<!-- /page -->']


def attr(fragment, name):
    m = re.search(rf'{name}=["\']([^"\']*)["\']', fragment, re.I)
    return m.group(1) if m else ''


def text_of(fragment):
    return re.sub(r'\s+', ' ', html.unescape(TAGS.sub(' ', fragment))).strip()


def norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def slug_of(url):
    return url.rstrip('/').split('/')[-1].split('#')[0]


def strip_comments(text):
    return COMMENT.sub(' ', text)


def overlap(a, b):
    """Token overlap between two question strings, ignoring stop words."""
    ta = {t for t in norm(a).split() if t not in STOP and len(t) > 1}
    tb = {t for t in norm(b).split() if t not in STOP and len(t) > 1}
    return len(ta & tb) / min(len(ta), len(tb)) if ta and tb else 0


def article_region(text):
    m = BODY_OPEN.search(text)
    if not m:
        return text
    rest = text[m.end():]
    low = rest.lower()
    end = min((low.find(k.lower()) for k in BODY_END if low.find(k.lower()) != -1),
              default=len(rest))
    return rest[:end]


def sentences(text):
    out = []
    for part in re.split(r'(?<=[.!?])\s+', re.sub(r'\s+', ' ', text)):
        part = part.strip()
        if len(part) >= 70 and len(WORD.findall(part)) >= 12:
            out.append(norm(part))
    return out


def ld_nodes(text):
    for block in SCRIPT_JSON.findall(text):
        try:
            data = json.loads(block)
        except Exception:
            continue
        for node in (data if isinstance(data, list) else [data]):
            if isinstance(node, dict):
                yield node


def analyse(path):
    raw = open(path, 'rb').read()
    text = raw.decode('utf-8', errors='ignore')
    clean = strip_comments(text)

    body_open = BODY_OPEN.search(clean)
    h1s = [(m.start(), text_of(m.group(1))) for m in H1.finditer(clean)]
    body_h1 = ''
    if body_open is not None:
        for pos, value in h1s:
            if pos > body_open.end():
                body_h1 = value
                break

    title = TITLE.search(clean)
    metas = defaultdict(list)
    for fragment in META.findall(clean):
        key = attr(fragment, 'property') or attr(fragment, 'name')
        if key:
            metas[key.lower()].append(attr(fragment, 'content'))
    urls = []
    for fragment in LINK.findall(clean):
        href = attr(fragment, 'href')
        rel = attr(fragment, 'rel').lower()
        if href.startswith(SITE) and rel in ('canonical', 'alternate'):
            urls.append((f'link rel={rel}', href))
    for key in ('og:url', 'twitter:url'):
        for value in metas.get(key, []):
            if value.startswith(SITE):
                urls.append((key, value))

    headline = pageid = ''
    faqs = []
    declared_words = 0
    for node in ld_nodes(clean):
        headline = headline or node.get('headline') or ''
        pid = node.get('mainEntityOfPage', '')
        if isinstance(pid, dict):
            pid = pid.get('@id') or pid.get('url') or ''
        pageid = pageid or pid
        if isinstance(node.get('wordCount'), int):
            declared_words = node['wordCount']
        if node.get('@type') == 'FAQPage':
            for q in node.get('mainEntity') or []:
                if isinstance(q, dict) and q.get('name'):
                    faqs.append(q['name'])
        if node.get('@type') == 'BreadcrumbList':
            items = node.get('itemListElement') or []
            if items and items[-1].get('item', '').startswith(SITE):
                urls.append(('breadcrumb', items[-1]['item']))

    body_visible = text_of(STYLE.sub(' ', SCRIPT_ANY.sub(' ', article_region(clean))))
    body_norm = norm(body_visible)
    markup = SCRIPT_ANY.sub(' ', clean)
    visible_questions = [text_of(m.group(1)) for m in SUMMARY.finditer(markup)]
    visible_questions += [text_of(m.group(1)) for m in H3.finditer(markup)
                          if '?' in m.group(1)]
    return dict(path=path, name=os.path.basename(path), text=text, clean=clean,
                visible_faq=bool(VISIBLE_FAQ.search(markup)),
                visible_questions=visible_questions,
                title=text_of(title.group(1)) if title else '',
                banner_h1=text_of(ARTICLE_TITLE.search(clean).group(1))
                if ARTICLE_TITLE.search(clean) else (h1s[0][1] if h1s else ''),
                body_h1=body_h1, ogtitle=(metas.get('og:title') or [''])[0],
                twitter_title=(metas.get('twitter:title') or [''])[0],
                headline=headline, pageid=pageid, urls=urls, faqs=faqs,
                declared_words=declared_words,
                words=len(WORD.findall(body_visible)),
                readtime=int(READTIME.search(clean).group(1)) if READTIME.search(clean) else None,
                sentences=sentences(body_visible), body_norm=body_norm,
                body_set=set(WORD.findall(body_visible.lower())))


def fix_metadata(posts):
    """Rewrite declared reading time and wordCount from the measured body size.

    Enabled with --fix-metadata so content changes (for example rendering a FAQ
    from the schema) can be followed by one command that brings the declared
    figures back in line. Line endings are preserved.
    """
    changed = []
    for p in posts:
        text = open(p['path'], encoding='utf-8', newline='').read()
        real_minutes = max(1, -(-p['words'] // WPM))
        new = text
        notes = []
        m = READTIME.search(new)
        if m and int(m.group(1)) != real_minutes:
            notes.append(f'read-time {m.group(1)} -> {real_minutes}')
            new = new[:m.start(1)] + str(real_minutes) + new[m.end(1):]
        for m2 in reversed(list(re.finditer(r'"wordCount":\s*(\d+)', new))):
            declared = int(m2.group(1))
            if abs(declared - p['words']) > max(100, 0.15 * p['words']):
                notes.append(f'wordCount {declared} -> {p["words"]}')
                new = new[:m2.start(1)] + str(p['words']) + new[m2.end(1):]
        if notes:
            assert new.count('\n') - new.count('\r\n') == text.count('\n') - text.count('\r\n')
            open(p['path'], 'w', encoding='utf-8', newline='').write(new)
            changed.append((p['name'], p['words'], real_minutes, '; '.join(notes)))
    for name, words, minutes, note in changed:
        print(f'  {name:56s} {words:6d}w {minutes:3d}m  {note}')
    print(f'\n{len(changed)} post(s) had declared metadata refreshed')


def main():
    posts = [analyse(p) for p in sorted(glob.glob('blog/*.html'))]
    if '--fix-metadata' in sys.argv:
        fix_metadata(posts)
        posts = [analyse(p['path']) for p in posts]
        print()
    by_name = {p['name']: p for p in posts}
    errors = defaultdict(list)
    notes = defaultdict(list)

    identity = defaultdict(set)
    for p in posts:
        for key in ('title', 'banner_h1', 'ogtitle', 'twitter_title', 'headline'):
            if p[key]:
                identity[norm(p[key])].add(p['name'])
                identity[norm(re.sub(r'\s*-\s*Local AI Zone\s*$', '', p[key]))].add(p['name'])

    for p in posts:
        name = p['name']
        # A. self-referential URLs must point at this file
        for label, url in p['urls']:
            if slug_of(url) != name:
                errors['A self-referential URL points at another file'].append(f'{name}: {label} -> {slug_of(url)}')
        if p['pageid'] and slug_of(p['pageid']) != name:
            errors['A self-referential URL points at another file'].append(
                f'{name}: mainEntityOfPage -> {slug_of(p["pageid"])}')

        # B. identity borrowed from another post
        for key in ('title', 'banner_h1', 'ogtitle', 'twitter_title', 'headline'):
            val = p[key]
            if not val:
                continue
            others = {o for o in identity[norm(val)] if o != name}
            if others:
                errors['B identity borrowed from another post'].append(
                    f'{name}: {key} "{val[:60]}" also used by {sorted(others)}')

        # D. FAQ schema with no visible FAQ section, or wording that never matches
        if p['faqs']:
            if not p['visible_faq']:
                errors['D FAQ schema with no visible FAQ on the page'].append(
                    f'{name}: {len(p["faqs"])} schema question(s) and no visible FAQ section')
            else:
                for q in p['faqs']:
                    if not any(overlap(norm(q), v) >= 0.6 for v in p['visible_questions']):
                        notes['D schema question not matched by the visible FAQ'].append(
                            f'{name}: "{q[:70]}"')

        # E/F. dead links and missing images
        for href in HREF.findall(p['clean']):
            if href.startswith(('http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:', '/')):
                continue
            target = href.split('#')[0]
            if target.endswith(('.html', '.htm')) and \
                    not os.path.exists(os.path.normpath(os.path.join('blog', target))):
                errors['E link to a page that does not exist'].append(f'{name}: {href}')
        for src in SRC.findall(p['clean']):
            if src.startswith(('http://', 'https://', 'data:', '/')):
                continue
            if not os.path.exists(os.path.normpath(os.path.join('blog', src))):
                errors['F image that does not exist'].append(f'{name}: {src}')

        # G. declared metadata vs the real body
        real_minutes = max(1, -(-p['words'] // WPM))
        if p['readtime'] and abs(p['readtime'] - real_minutes) > 1:
            errors['G reading time does not match the body'].append(
                f'{name}: says {p["readtime"]} min, body is {p["words"]} words (~{real_minutes} min)')
        if p['declared_words'] and abs(p['declared_words'] - p['words']) > max(100, 0.15 * p['words']):
            errors['G wordCount does not match the body'].append(
                f'{name}: says {p["declared_words"]}, body is {p["words"]} words')

    # C. shared FAQ questions
    faq_owner = defaultdict(set)
    for p in posts:
        for q in p['faqs']:
            faq_owner[norm(q)].add(p['name'])
    for q, owners in sorted(faq_owner.items()):
        if len(owners) > 1:
            notes['C identical FAQ question on 2+ posts'].append(f'"{q[:70]}" on {sorted(owners)}')

    # C. shared sentences and near-duplicate bodies
    sent_owner = defaultdict(set)
    for p in posts:
        for s in set(p['sentences']):
            sent_owner[s].add(p['name'])
    pair_sentences = defaultdict(set)
    for s, owners in sent_owner.items():
        if len(owners) > 1:
            for a in sorted(owners):
                for b in sorted(owners):
                    if a < b:
                        pair_sentences[(a, b)].add(s)
    for (a, b), shared in sorted(pair_sentences.items()):
        sa, sb = by_name[a]['body_set'], by_name[b]['body_set']
        jac = len(sa & sb) / len(sa | sb) if sa and sb else 0
        line = f'{a} <-> {b}: {len(shared)} shared sentence(s), Jaccard {jac:.2f}'
        if jac >= 0.5:
            errors['C one post is largely a copy of another'].append(line)
        else:
            # Sentences about the same model legitimately reappear in a deep dive
            # and in a comparison post; flagging them for review, not as a defect.
            notes['C sentences reused between sibling posts'].append(line)

    total = sum(len(v) for v in errors.values())
    print(f'audited {len(posts)} posts')
    for group in ('A self-referential URL points at another file',
                  'B identity borrowed from another post',
                  'C one post is largely a copy of another',
                  'D FAQ schema with no visible FAQ on the page',
                  'E link to a page that does not exist',
                  'F image that does not exist',
                  'G reading time does not match the body',
                  'G wordCount does not match the body'):
        if errors[group]:
            print(f'\n[{group}]  ({len(errors[group])})')
            for line in errors[group]:
                print('  ' + line)
    if total == 0:
        print('\nno copy-paste or template artefacts found')
    else:
        print(f'\n{total} PROBLEM(S)')
    for group in ('C identical FAQ question on 2+ posts',
                  'C sentences reused between sibling posts',
                  'D schema question not matched by the visible FAQ'):
        if notes[group]:
            print(f'\n[note] {group}  ({len(notes[group])})')
            for line in notes[group][:12]:
                print('  ' + line)
            if len(notes[group]) > 12:
                print(f'  ... and {len(notes[group]) - 12} more')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
