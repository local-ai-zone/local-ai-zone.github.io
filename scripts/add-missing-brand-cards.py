"""Add 13 missing brand cards to the blog.html 'AI Model Brands' grid.

Existing cards lead with trending brands (Kimi, MiniMax, GLM, Nemotron) then
list the rest alphabetically. This script inserts the 13 missing cards in
alphabetical position within the grid. Idempotent: skips slugs already present.
"""
import io
import re

# slug -> (card title, excerpt)
NEW_CARDS = {
    'constitutional-ai-safety-alignment-guide-2025.html': (
        'Constitutional AI Guide',
        'Principled, feedback-free AI alignment: the technique Anthropic pioneered, now industry standard.'),
    'e5-ai-multilingual-embedding-guide-2025.html': (
        'E5 Embedding Models Guide',
        'Microsoft E5 embeddings for multilingual RAG, semantic search, and cross-lingual retrieval.'),
    'gemini-ai-multimodal-complete-guide-2025.html': (
        'Google Gemini AI Models Guide',
        'Gemini 3.1 Pro and Deep Think: Google\'s 2M-context multimodal frontier and its open Gemma family.'),
    'gpt4-ai-advanced-reasoning-master-guide-2025.html': (
        'GPT-4 Family & Legacy Guide',
        'From GPT-4 to GPT-5.6: how OpenAI\'s reasoning lineage shaped today\'s local AI alternatives.'),
    'grok-ai-xai-realtime-guide-2025.html': (
        'Grok AI Models Guide',
        'xAI\'s Grok 4/4.5 with real-time X grounding and heavy test-time compute — plus open alternatives.'),
    'hermes-ai-function-calling-guide-2025.html': (
        'Hermes Function-Calling Guide',
        'Nous Research\'s Hermes 4: best-in-class function calling and tool use for local agents.'),
    'lamda-ai-dialogue-breakthrough-guide-2025.html': (
        'LaMDA Dialogue Model Guide',
        'Google\'s dialogue-pioneering LaMDA and how its research fed into PaLM and Gemini.'),
    'llava-ai-vision-language-guide-2025.html': (
        'LLaVA Vision-Language Guide',
        'The visual-instruction recipe that opened local vision AI — and today\'s successors.'),
    'nous-ai-research-optimized-guide-2025.html': (
        'Nous Research Guide',
        'Hermes 4, DeepHermes, and the open lab shaping the GGUF fine-tune ecosystem.'),
    'openchat-ai-conversation-master-guide-2025.html': (
        'OpenChat AI Guide',
        'The RL-tuned conversation pioneer — and the modern models that replaced it.'),
    'orca-ai-reasoning-breakthrough-guide-2025.html': (
        'Orca Reasoning Guide',
        'Microsoft\'s explanation-tuning milestone and the Phi-4 line it led to.'),
    'palm-ai-pathways-language-guide-2025.html': (
        'PaLM & Pathways Guide',
        'Google\'s Pathways foundation for Gemini — MoE and chain-of-thought roots.'),
    't5-ai-text-to-text-complete-guide-2025.html': (
        'T5 Text-to-Text Guide',
        'The unified text-to-text framework that still powers summarization pipelines.'),
}


def card(slug, title, excerpt):
    return (f'                <a href="brands/{slug}" class="article-card"><div class="article-card-content">'
            f'<h3 class="article-card-title">{title}</h3>'
            f'<p class="article-card-excerpt">{excerpt}</p>'
            f'<div class="article-card-footer"><span class="read-more-link">Read More &rarr;</span></div>'
            f'</div></a>')


def main():
    with io.open('blog.html', encoding='utf-8') as f:
        text = f.read()

    # Find the AI Model Brands grid: from its section-title h2 to the next h2
    m = re.search(
        r'(<h2 class="section-title">AI Model Brands</h2>\s*<div class="blog-grid">\s*)(.*?)(\s*</div>\s*\n\s*<h2 class="section-title">)',
        text, re.S)
    if not m:
        raise SystemExit('Brands grid section not found')
    prefix, grid, suffix = m.group(1), m.group(2), m.group(3)

    # Extract existing cards as (slug, full_card_text)
    cards = re.findall(r'(<a href="brands/([^"]+)" class="article-card">.*?</a>)', grid, re.S)
    existing_slugs = {slug: card_html for card_html, slug in cards}

    added = 0
    for slug, (title, excerpt) in NEW_CARDS.items():
        if slug in existing_slugs:
            continue
        existing_slugs[slug] = card(slug, title, excerpt)
        added += 1

    # Order: trending first (existing head order preserved), then alphabetical.
    # Keep the original card order for the trending group by sorting the whole
    # set alphabetically and moving the 4 trending slugs to the front.
    trending = ['kimi-ai-moonshot-frontier-guide-2026.html',
                'minimax-ai-moe-frontier-guide-2026.html',
                'glm-ai-general-language-guide-2025.html',
                'nemotron-ai-nvidia-reasoning-guide-2026.html']
    ordered = sorted(existing_slugs.items())
    # Trending group keeps its canonical order (not alphabetical)
    trending_ordered = [(s, existing_slugs[s]) for s in trending if s in existing_slugs]
    ordered = trending_ordered + [x for x in ordered if x[0] not in trending]
    new_grid = '\n' + '\n'.join(card_html for _, card_html in ordered) + '\n'

    text = text[:m.start()] + prefix + new_grid + suffix + text[m.end():]
    with io.open('blog.html', 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print(f'added {added} cards; grid now has {len(ordered)} brand cards')


if __name__ == '__main__':
    main()
