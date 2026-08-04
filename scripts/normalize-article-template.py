"""Normalize legacy article pages (guides/, cpu/, brands/) to the clean template.

Idempotent per file; safe to run more than once. Fixes:
  1. Removes the legacy dark `main-nav` stacked above the premium header.
  2. Iteratively unwraps nested-article shells (older pages were nested 2-4
     levels deep): keeps only the innermost article + one related section.
  3. Removes the content-level duplicate <h1>.
  4. Removes RENDERED placeholder cards (`<a href="{{RELATED_ARTICLE_URL}}">`).
  5. Rewrites canonical / og:url / JSON-LD @id / data-url to the real URL.
  6. Fixes broken relative link prefixes (`guides/`, `cpu/`, `brands/`).
  7. Updates article:modified_time and the visible "Last Updated:" line.
"""
import io
import os
import re
import sys

BASE = 'https://local-ai-zone.github.io'
MODIFIED = '2026-08-04T00:00:00Z'
MODIFIED_DISPLAY = 'August 4, 2026'
ART_RE = re.compile(r'<article(?:\s+id="article-content")?\s+class="blog-article">')

def art_matches(text):
    return ART_RE.findall(text)

def first_art(text):
    return ART_RE.search(text).start()

def second_art(text):
    m1 = ART_RE.search(text)
    return ART_RE.search(text, m1.end()).start()

NAV_RE = re.compile(
    r'    <!-- Main Navigation -->\n'
    r'    <nav class="main-nav"[^>]*>.*?</nav>\n'
    r'[ \t]*\n',
    re.S)
CARD_RE = re.compile(
    r'\n[ \t]*<a href="\{\{RELATED_ARTICLE_URL\}\}" class="article-card">.*?</a>',
    re.S)

# Old guide slugs -> real file names (navigation-header blocks reference them)
GUIDE_SLUGS = {
    'best-prompting-techniques-coding.html': 'ai-coding-prompts-master-techniques-2025.html',
    'llm-license-types.html': 'ai-model-licensing-complete-legal-guide-2025.html',
    'model-parameters.html': 'what-is-ai-model-3b-7b-30b-parameters-guide-2025.html',
    'model-parameters-explained.html': 'what-is-ai-model-3b-7b-30b-parameters-guide-2025.html',
    'best-prompting-techniques-research.html': 'ai-research-prompts-expert-strategies-2025.html',
    'top-analysis-models.html': 'best-ai-analysis-models-ultimate-ranking-2025.html',
    'top-brainstorming-models.html': 'best-ai-brainstorming-models-ultimate-ranking-2025.html',
    'top-coding-assistant-models.html': 'best-ai-coding-assistant-models-ultimate-ranking-2025.html',
    'top-multilingual-models.html': 'best-ai-multilingual-models-ultimate-ranking-2025.html',
    'top-research-assistant-models.html': 'best-ai-research-assistant-models-ultimate-ranking-2025.html',
    'context-length-guide.html': 'context-length-optimization-ultimate-guide-2025.html',
    'quantization-guide.html': 'what-is-ai-quantization-q4-k-m-q8-gguf-guide-2025.html',
    'top-mobile-ai-models.html': 'top-20-local-ai-models-mobile-ai-agents-guide-2025.html',
    'model-types-and-architectures.html': 'what-is-ai-model-3b-7b-30b-parameters-guide-2025.html',
    'best-prompting-techniques-analysis.html': 'best-ai-analysis-models-ultimate-ranking-2025.html',
    'best-prompting-techniques-brainstorming.html': 'best-ai-brainstorming-models-ultimate-ranking-2025.html',
}

def fix(path):
    with io.open(path, encoding='utf-8') as f:
        text = f.read()
    orig = text
    d = os.path.dirname(path)
    realname = os.path.basename(path)
    real_url = '{}/{}/{}'.format(BASE, d, realname)

    # 1) Remove legacy main-nav (0 or 1 matches)
    text, n = NAV_RE.subn('', text)
    assert n <= 1, '{}: {} main-nav blocks'.format(path, n)

    # 2) Iteratively unwrap nested article shells
    guard = 0
    while len(art_matches(text)) > 1:
        guard += 1
        assert guard < 20, '{}: too many nested shells'.format(path)
        outer_open = first_art(text)
        inner_open = second_art(text)
        between = text[outer_open:inner_open]
        assert '<header class="article-header"' in between, '{}: shell has no header'.format(path)
        assert between.count('<div class="article-content">') == 1, '{}: shell content div'.format(path)
        assert between.count('<div class="container">') == 1, '{}: shell container'.format(path)
        assert '<nav class="breadcrumb-nav"' in between, '{}: shell has no breadcrumb'.format(path)
        text = text[:outer_open] + text[inner_open:]

    # 2b) Dedupe breadcrumbs: keep the one inside <main>, drop any before it
    if text.count('<nav class="breadcrumb-nav"') == 2:
        main_pos = text.index('<main')
        first_bc = text.index('<nav class="breadcrumb-nav"')
        if first_bc < main_pos:
            end = text.index('</nav>', first_bc) + len('</nav>')
            text = text[:first_bc] + text[end:]

    # 3) Remove content-level duplicate <h1> (header already carries the title)
    content_div = text.index('<div class="article-content">', first_art(text))
    m = re.search(r'<h1>(.*?)</h1>', text[content_div:], re.S)
    if m:
        text = text[:content_div + m.start()] + text[content_div + m.end():]

    # 4) Keep the first related-articles section; drop orphan closings + duplicates
    inner_close = text.index('</article>')
    rel_idx = text.find('<section class="related-articles-section"', inner_close)
    if rel_idx != -1:
        rel1_end = text.index('</section>', rel_idx) + len('</section>')
        main_close = text.rindex('</main>')
        container_close = text.rindex('</div>', rel1_end, main_close)
        if text[rel1_end:container_close].strip():
            text = text[:rel1_end] + text[container_close:]

    # 5) Remove rendered placeholder cards
    text = CARD_RE.sub('', text)

    # 6) Rewrite canonical/og:url/JSON-LD/data-url to the real URL
    m = re.search(r'<link rel="canonical" href="([^"]+)"', text)
    if m and m.group(1) != real_url:
        old_url = m.group(1)
        assert old_url in text, '{}: canonical url not found in body'.format(path)
        text = text.replace(old_url, real_url)

    # 7) Fix broken relative link prefixes
    for prefix in ('guides/', 'cpu/', 'brands/'):
        text = text.replace('href="' + prefix, 'href="')

    # 7b) Rewrite old guide slugs referenced in navigation blocks
    for slug, real in GUIDE_SLUGS.items():
        text = text.replace('href="' + slug + '"', 'href="' + real + '"')
    # 7c) search.html does not exist; point it at the blog listing
    text = text.replace('href="../search.html"', 'href="../blog.html"')

    # 8) Update modified dates
    text = re.sub(r'article:modified_time" content="[^"]+"',
                  'article:modified_time" content="' + MODIFIED + '"', text)
    text = re.sub(r'Last Updated:</strong>[^<]+',
                  'Last Updated:</strong> ' + MODIFIED_DISPLAY, text)

    # sanity
    assert text.count('<nav class="main-nav"') == 0, '{}: main-nav remains'.format(path)
    assert len(art_matches(text)) == 1, '{}: article != 1'.format(path)
    assert text.count('<nav class="breadcrumb-nav"') == 1, '{}: breadcrumb != 1'.format(path)
    assert text.count('<section class="related-articles-section') <= 1, '{}: related != <=1'.format(path)
    assert text.count('<h1') == 1, '{}: h1 != 1'.format(path)
    assert '<a href="{{RELATED' not in text, '{}: rendered placeholder remains'.format(path)
    assert 'href="guides/' not in text and 'href="cpu/' not in text and 'href="brands/' not in text, \
        '{}: broken prefix remains'.format(path)
    if text == orig:
        print('SKIP', path, '(already normalized)')
        return

    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print('FIXED', path, '->', real_url)

for p in sys.argv[1:]:
    fix(p)
print('done')
