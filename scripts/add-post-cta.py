#!/usr/bin/env python3
"""Add the per-post contact CTA and the site-wide contact form to posts.

Run from the repo root:  python scripts/add-post-cta.py [--dry-run]

Covers blog/*.html and guides/*.html, so use it after publishing a new post in
either folder.

Each post gets, at the end of the article, a card inviting the reader to ask for
help. Its button opens the site-wide contact form with the subject pre-filled
for that article (the form already submits the page URL as `source`).

Posts that do not already carry the contact form (the slide-out panel and the
tab button that opens it) get that too, along with the stylesheet it needs.

The subject comes from the post's own title: the <title> tag, then the first
h1, trimmed at a natural clause break. Anchors, in priority order: topic
section, </article>, <footer>, </body>, </html>, then EOF.
Line endings are preserved per file and the run is idempotent, so it is safe to
re-run over both folders.

The form needs the EmailJS SDK to actually send; posts that already carry the
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
# A consolidated page that only redirects to the surviving guide has no article
# to put a CTA in.
REDIRECT = re.compile(r'<meta\s+http-equiv=["\']refresh["\']', re.I)
STYLESHEET = re.compile(r'<link\s+rel=["\']stylesheet["\'][^>]*>', re.I)
CONTACT_CSS = '<link rel="stylesheet" href="../css/contact-form.css">'

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

CONTACT_FORM = '''<!-- Contact Form Tab Button -->
<button id="contact-tab-button" 
        class="contact-tab-button" 
        aria-label="Open contact form"
        aria-expanded="false"
        aria-controls="contact-form-panel"
        type="button">
    <svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
    <span class="contact-text">Contact</span>
</button>

<!-- Contact Form Panel -->
<div id="contact-form-panel" 
     class="contact-form-panel" 
     role="dialog" 
     aria-labelledby="contact-form-title"
     aria-modal="true"
     aria-hidden="true">
    <div class="contact-form-header">
        <h2 id="contact-form-title">Contact Us</h2>
        <button class="contact-form-close" 
                aria-label="Close contact form"
                type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </div>

    <form id="contact-form" class="contact-form" novalidate aria-label="Contact form">
        <div class="form-group">
            <label for="contact-name" class="form-label">
                Name <span class="required-indicator" aria-label="required">*</span>
            </label>
            <input type="text" 
                   id="contact-name" 
                   name="name"
                   class="form-input"
                   placeholder="Your name"
                   required
                   aria-required="true"
                   aria-describedby="contact-name-error">
            <div id="contact-name-error" 
                 class="form-error" 
                 role="alert"
                 aria-live="polite"></div>
        </div>

        <div class="form-group">
            <label for="contact-email" class="form-label">
                Email <span class="required-indicator" aria-label="required">*</span>
            </label>
            <input type="email" 
                   id="contact-email" 
                   name="email"
                   class="form-input"
                   placeholder="your.email@example.com"
                   required
                   aria-required="true"
                   aria-describedby="contact-email-error">
            <div id="contact-email-error" 
                 class="form-error" 
                 role="alert"
                 aria-live="polite"></div>
        </div>

        <div class="form-group">
            <label for="contact-subject" class="form-label">
                Subject <span class="required-indicator" aria-label="required">*</span>
            </label>
            <input type="text" 
                   id="contact-subject" 
                   name="subject"
                   class="form-input"
                   placeholder="What is this about?"
                   required
                   aria-required="true"
                   aria-describedby="contact-subject-error">
            <div id="contact-subject-error" 
                 class="form-error" 
                 role="alert"
                 aria-live="polite"></div>
        </div>

        <div class="form-group">
            <label for="contact-message" class="form-label">
                Message <span class="required-indicator" aria-label="required">*</span>
            </label>
            <textarea id="contact-message" 
                      name="message"
                      class="form-input form-textarea"
                      rows="6"
                      placeholder="Your message..."
                      required
                      aria-required="true"
                      aria-describedby="contact-message-error"></textarea>
            <div id="contact-message-error" 
                 class="form-error" 
                 role="alert"
                 aria-live="polite"></div>
        </div>

        <button type="submit" class="form-submit" aria-label="Send message">
            <span class="btn-text">Send Message</span>
            <svg class="btn-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display: none;">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
            </svg>
        </button>
    </form>

    <div class="contact-form-status" role="status" aria-live="polite" aria-atomic="true"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
<script src="../js/components/contact-form.js"></script>
<script>
    // Initialize contact form
    document.addEventListener('DOMContentLoaded', () => {
        new ContactForm();
    });
</script>'''


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


def line_start_of(text, pos):
    """Start of the line at pos, when only whitespace precedes the anchor.

    Inserting at the anchor itself would push that whitespace onto the block's
    first line and leave the anchor unindented; inserting at the line start
    keeps both the block and the anchor lined up with their neighbours.
    """
    start = text.rfind('\n', 0, pos) + 1
    return pos if text[start:pos].strip() else start


def indent_block(text, pos, block, eol):
    """Re-indent a block to the indentation of the line at pos."""
    indent = indent_of(text, pos) if pos is not None else '    '
    return eol.join(indent + ln if ln.strip() else '' for ln in block.split('\n'))


def add_css(text, eol):
    """Add the contact-form stylesheet after the last stylesheet link."""
    links = list(STYLESHEET.finditer(text))
    if not links:
        return text, False
    last = links[-1]
    text = text[:last.end()] + eol + indent_of(text, last.start()) + CONTACT_CSS + text[last.end():]
    return text, True


def add_contact_form(text, eol):
    """Add the slide-out contact form, its SDK and the init call before </body>."""
    if '</body>' not in text:
        return text, False
    pos = text.rindex('</body>')
    payload = indent_block(text, pos, CONTACT_FORM, eol)
    return text[:pos] + payload + eol + text[pos:], True


def add_post_help(text, eol, subject):
    pos = None
    for anchor in ANCHORS:
        if anchor in text:
            pos = text.index(anchor)
            break
    block = BLOCK.replace('{SUBJECT}', html.escape(subject, quote=True))
    if pos is None:
        payload = indent_block(text, pos, block, eol)
        return text.rstrip() + eol + eol + payload + eol
    indent = indent_of(text, pos)
    pos = line_start_of(text, pos)
    payload = eol.join(indent + ln if ln.strip() else '' for ln in block.split('\n'))
    return text[:pos] + payload + eol + eol + text[pos:]


def process(path, dry_run=False):
    raw = open(path, 'rb').read()
    eol = '\r\n' if b'\r\n' in raw else '\n'
    original = raw.decode('utf-8')

    if REDIRECT.search(original):
        return 'redirect-stub', None, []

    text = original
    actions = []
    if 'contact-form.css' not in original:
        text, added = add_css(text, eol)
        if added:
            actions.append('css')
    if 'contact-form-panel' not in original:
        text, added = add_contact_form(text, eol)
        if added:
            actions.append('form')

    subject = None
    if 'post-help-btn' not in original:
        short = subject_for(text)
        if not short:
            return 'NO-TITLE', None, actions
        subject = 'Help with: ' + short
        text = add_post_help(text, eol, subject)
        actions.append('cta')

    if actions and not dry_run:
        open(path, 'w', encoding='utf-8', newline='').write(text)
    return ('updated' if actions else 'already-present'), subject, actions


def main():
    dry = '--dry-run' in sys.argv
    scanned = 0
    changed = 0
    subjects = {}
    bad = []
    stubs = []
    for folder in ('blog', 'guides'):
        files = sorted(glob.glob(f'{folder}/*.html'))
        print(f'{folder}/  ({len(files)} pages)')
        for f in files:
            scanned += 1
            status, subject, actions = process(f, dry_run=dry)
            name = os.path.basename(f)
            if status == 'redirect-stub':
                stubs.append(name)
                continue
            if status.startswith('NO-'):
                bad.append((name, status))
            if actions:
                changed += 1
            if subject:
                subjects.setdefault(subject, []).append(name)
            marks = {'css': '+css', 'form': '+form', 'cta': '+cta'}
            print(f'  {status:15s} {len(subject or ""):3d}  '
                  f'{" ".join(marks[a] for a in actions) or "-":16s} '
                  f'{name[:44]:44s} {subject or ""}')
        print()

    print(f'{scanned} pages scanned, {changed} changed')

    # the form can only send if the page loads the EmailJS SDK
    missing_sdk = []
    for folder in ('blog', 'guides'):
        for f in sorted(glob.glob(f'{folder}/*.html')):
            text = open(f, encoding='utf-8').read()
            if 'contact-form.js' in text and 'email.min.js' not in text:
                missing_sdk.append(f)
    if missing_sdk:
        print(f'\nWARNING: {len(missing_sdk)} page(s) have the form but not the EmailJS SDK,')
        print('so submissions will fail until the SDK script tag is added:')
        for n in missing_sdk:
            print('  ' + n)

    if stubs:
        print('\nskipped redirect stubs:', stubs)

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
