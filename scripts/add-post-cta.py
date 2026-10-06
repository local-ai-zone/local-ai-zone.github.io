#!/usr/bin/env python3
"""Add the per-post contact CTA to blog posts.

Run from the repo root:  python scripts/add-post-cta.py [--dry-run]

Use after publishing a new post, so every post keeps its own help button.

Each post gets a card at the end of the article inviting the reader to ask for
help. Its button opens the site-wide contact form with the subject pre-filled
for that article (the form already submits the page URL as `source`).

The subject comes from the post's own h1: the main title before any <br>
subtitle, trimmed at a natural clause break. Anchors, in priority order:
topic section, </article>, <footer>, </body>, </html>, then EOF.
Line endings are preserved per file and the run is idempotent, so it is safe to
re-run over the whole folder.

The button needs the EmailJS SDK to actually send; posts that already carry the
tag are left alone, and --dry-run reports any post still missing it.
"""
import glob
import html
import os
import re
import sys

H1 = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S | re.I)
TITLE = re.compile(r'<title[^>]*>(.*?)</title>', re.S | re.I)
SITE_SUFFIX = re.compile(r'\s*[-\u2013|]\s*Local AI Zone\s*$', re.I)

ANCHORS = [
    '<section class="kv-related"',
    '</article>',
    '<footer',
    '</body>',
    '</html>',
]

BLOCK = '''<!-- Need help with this post? -->
<section class="post-help" aria-labelledby="post-help-title">
    <div class="post-help-inner">
        <h2 class="post-help-title" id="post-help-title">Need help with this?</h2>
        <p class="post-help-text">Tell me what you&rsquo;re working on and I&rsquo;ll help you work
        through it &mdash; where you got stuck, what you&rsquo;re trying to build, which model to
        pick. Your message arrives with this article attached, so I&rsquo;ll know exactly what
        you&rsquo;re reading.</p>
        <button type="button" class="post-help-btn" data-contact-open data-contact-subject="{SUBJECT}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Ask me about this post</span>
        </button>
    </div>
</section>'''


def clean(fragment):
    """HTML fragment -> plain single-spaced text."""
    fragment = fragment.split('<br')[0]          # drop any subtitle after a break
    fragment = re.sub(r'<[^>]+>', ' ', fragment)  # tags become spaces, not deletions
    fragment = html.unescape(fragment)
    return re.sub(r'\s+', ' ', fragment).strip()


def shorten(text):
    """Trim a title to a comfortable subject line at a natural break."""
    for sep, minimum in ((':', 11), ('\u2014', 20), ('\u2013', 20)):
        if sep in text:
            head = text.split(sep, 1)[0].strip()
            if len(head) >= minimum:
                text = head
                break
    if len(text) > 72:
        text = text[:72].rsplit(' ', 1)[0]
    return text.strip().strip(',;:-\u2013\u2014').strip()


def subject_for(text):
    # <title> first: it is the reliable per-post name. Some posts carry a stale
    # header h1 copied from another template (migrate-claude-to-local-ai.html)
    # and some use h1 for section headings (qwen3-8-flash-next-deep-dive.html).
    m = TITLE.search(text)
    if m:
        s = shorten(clean(SITE_SUFFIX.sub('', html.unescape(m.group(1)))))
        if len(s) >= 8:
            return s
    m = H1.search(text)
    if m:
        s = shorten(clean(m.group(1)))
        if len(s) >= 8:
            return s
    return None


def indent_of(text, pos):
    start = text.rfind('\n', 0, pos) + 1
    line = text[start:pos]
    return line[:len(line) - len(line.lstrip())]


def process(path, dry_run=False):
    raw = open(path, 'rb').read()
    eol = '\r\n' if b'\r\n' in raw else '\n'
    text = raw.decode('utf-8')

    if 'post-help-btn' in text:
        return 'already-present', None

    short = subject_for(text)
    if not short:
        return 'NO-TITLE', None
    subject = 'Help with: ' + short

    pos = None
    for anchor in ANCHORS:
        if anchor in text:
            pos = text.index(anchor)
            break

    block = BLOCK.replace('{SUBJECT}', html.escape(subject, quote=True))
    indent = indent_of(text, pos) if pos is not None else '    '
    payload = eol.join(indent + ln if ln.strip() else '' for ln in block.split('\n'))

    if pos is None:
        text = text.rstrip() + eol + eol + payload + eol
    else:
        text = text[:pos] + payload + eol + eol + text[pos:]

    if not dry_run:
        open(path, 'w', encoding='utf-8', newline='').write(text)
    return 'injected', subject


def main():
    dry = '--dry-run' in sys.argv
    files = sorted(glob.glob('blog/*.html'))
    subjects = {}
    bad = []
    for f in files:
        status, subject = process(f, dry_run=dry)
        name = os.path.basename(f)
        if status.startswith('NO-'):
            bad.append((name, status))
        if subject:
            subjects.setdefault(subject, []).append(name)
        print(f'{status:15s} {len(subject or ""):3d}  {name[:44]:44s} {subject or ""}')

    print(f'\n{len(files)} posts scanned')

    # the form can only send if the page loads the EmailJS SDK
    missing_sdk = []
    for f in files:
        text = open(f, encoding='utf-8').read()
        if 'contact-form.js' in text and 'email.min.js' not in text:
            missing_sdk.append(os.path.basename(f))
    if missing_sdk:
        print(f'\nWARNING: {len(missing_sdk)} post(s) have the form but not the EmailJS SDK,')
        print('so submissions will fail until the SDK script tag is added:')
        for n in missing_sdk:
            print('  ' + n)

    dupes = {s: n for s, n in subjects.items() if len(n) > 1}
    if dupes:
        print('\nshared subjects (page URL still distinguishes them):')
        for s, n in dupes.items():
            print(f'  {s}  ->  {n}')
    if bad:
        print('\nproblems:', bad)
        return 1
    print('DRY RUN (nothing written)' if dry else 'written')
    return 0


if __name__ == '__main__':
    sys.exit(main())
