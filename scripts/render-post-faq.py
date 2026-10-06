#!/usr/bin/env python3
"""Render a post's FAQ structured data as a visible FAQ section.

Search engines require FAQ content that appears in structured data to also be
visible on the page. Several posts carry a FAQPage block but no FAQ a reader can
actually see, because the schema was copied from a template whose visible section
was never added. This walks every post, finds the FAQPage questions, and writes
them into the article as a real FAQ section.

The words are not invented: every question and answer is taken verbatim from the
post's own schema. Posts that already show a FAQ are left untouched, so the tool
is idempotent and safe to re-run.

    python scripts/render-post-faq.py --dry-run
    python scripts/render-post-faq.py --apply

After adding content, refresh the declared metadata with
    python scripts/audit-posts.py --fix-metadata
"""
import glob
import html
import json
import os
import re
import sys

BODY_OPEN = re.compile(r'<div[^>]*class="[^"]*\barticle-content\b[^"]*"[^>]*>|<main[^>]*>', re.I)
SCRIPT_ANY = re.compile(r'<script\b.*?</script>', re.S | re.I)
SCRIPT_JSON = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
COMMENT = re.compile(r'<!--.*?-->', re.S)
VISIBLE_FAQ = re.compile(r'id="faq"|class="[^"]*\bfaq\b|frequently asked questions|— FAQ|>FAQ<|\bFAQ\b', re.I)
# Kept in step with scripts/audit-posts.py: where the article body stops.
# Structural markers only: prose phrases like "read more" also occur *inside*
# related-post cards, which is not a valid place to start a section.
STRUCTURE = ['class="post-help"', 'id="post-help"', 'class="related-card', 'kv-related',
             '</main', '</article', '<footer', 'contact-tab-button', 'contact-form-panel']


def faq_items(text):
    """(question, answer) pairs from the post's FAQPage schema, in order."""
    for block in SCRIPT_JSON.findall(text):
        try:
            data = json.loads(block)
        except Exception:
            continue
        for node in (data if isinstance(data, list) else [data]):
            if not isinstance(node, dict) or node.get('@type') != 'FAQPage':
                continue
            items = []
            for q in node.get('mainEntity') or []:
                if not isinstance(q, dict):
                    continue
                answer = q.get('acceptedAnswer') or {}
                body = answer.get('text', '') if isinstance(answer, dict) else ''
                if q.get('name') and body:
                    items.append((re.sub(r'\s+', ' ', q['name']).strip(),
                                  re.sub(r'\s+', ' ', body).strip()))
            if items:
                return items
    return []


# Blocks that must follow the FAQ: references, then related-post cards, then the
# help call to action and the page furniture. The FAQ goes before whichever of
# them comes first, so it lands as the last real section of the article body.
SOURCES = re.compile(r'<div[^>]*>\s*<h[23][^>]*>\s*Sources\b|<h[23][^>]*>\s*Sources\b|id="sources"', re.I)
RELATED = re.compile(r'<div[^>]*class="[^"]*article-section[^"]*"[^>]*>\s*<h[23][^>]*>\s*Related\b'
                     r'|<h[23][^>]*>\s*Related\s+(?:Posts|Articles)\b', re.I)


def insertion_point(text):
    """Offset of the earliest block the FAQ should precede, or None."""
    body = BODY_OPEN.search(text)
    start = body.end() if body else 0
    anchors = []
    for pattern in (SOURCES, RELATED):
        match = pattern.search(text, start)
        if match:
            anchors.append(match.start())
    low = text.lower()
    for marker in STRUCTURE:
        pos = low.find(marker.lower(), start)
        if pos != -1:
            # step back to the tag that carries the marker
            tag = text.rfind('<', start, pos)
            anchors.append(tag if tag != -1 else pos)
    return min(anchors) if anchors else None


def section(items):
    out = ['', '<section id="faq" class="article-section faq">',
           '<h2>Frequently asked questions</h2>']
    for question, answer in items:
        out.append(f'<h3>{html.escape(question, quote=False)}</h3>')
        out.append(f'<p>{html.escape(answer, quote=False)}</p>')
    out += ['</section>', '']
    return out


def eol_of(text):
    """'crlf', 'lf' or 'mixed' - inserting content must not change this."""
    crlf = text.count('\r\n')
    lf = text.count('\n') - crlf
    if crlf and lf:
        return 'mixed'
    return 'crlf' if crlf else 'lf'


def main():
    apply = '--apply' in sys.argv
    if not apply and '--dry-run' not in sys.argv:
        print(__doc__)
        return 1

    done = []
    for path in sorted(glob.glob('blog/*.html')):
        text = open(path, encoding='utf-8', newline='').read()
        eol = eol_of(text)
        assert eol != 'mixed', f'{path} has mixed line endings'
        items = faq_items(text)
        if not items:
            continue
        markup = SCRIPT_ANY.sub(' ', COMMENT.sub(' ', text))
        if VISIBLE_FAQ.search(markup):
            continue  # a FAQ already shows on the page
        at = insertion_point(text)
        if at is None:
            print(f'  SKIP {os.path.basename(path)}: no insertion point')
            continue
        eolstr = '\r\n' if eol == 'crlf' else '\n'
        block = eolstr.join(section(items))
        new = text[:at] + block + eolstr + text[at:]
        done.append((os.path.basename(path), len(items)))
        if apply:
            assert eol_of(new) == eol, f'{path} line endings changed'
            open(path, 'w', encoding='utf-8', newline='').write(new)

    for name, count in done:
        print(f'  {name}: +{count} FAQ item(s)')
    print(f'\n{len(done)} post(s) {"updated" if apply else "would gain a visible FAQ"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
