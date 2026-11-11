# Blog Refresh Plan — All Article Content (Aug 2026)

**Goal:** Bring every article page listed on `blog.html` up to date — current models, 2026 titles/dates, consistent premium theme, and clean page structure.

## 1. Scope & Current State

| Category | Pages | Status |
|---|---|---|
| `blog/` posts | 3 | 2 fresh (Aug 2026 legal-AI posts); **1 stale** (`ai-updates-august-2026.html` covers an older model snapshot) |
| `guides/` | 13 | **All stale** — "2025" titles, published Oct 2025, reference GPT-4 / Llama 3 / Claude 3 (no GPT-5 / Llama 4 / Claude 4 / Gemini 3) |
| `brands/` | 37 | **6 done** (Kimi, MiniMax, GLM, Nemotron, Qwen, DeepSeek); **31 legacy** pages still 2025-era (e.g. Bard — discontinued) |
| `cpu/` | 28 | **All stale** — "2025" titles, outdated top-model recommendations |
| **Total** | **81** | |

### Technical debt found on guides/cpu (and 31 legacy brands)
1. **Nested-article template bug** — every guide/CPU page has 2 `<article>` shells, 2 headers, 3 `<h1>`, 2 related-articles sections (same bug already fixed on brands + blog).
2. **Legacy double-nav** — `main-nav` bar stacks above the premium header on all 13 guides + 28 CPU pages.
3. **Broken canonicals** — e.g. `guides/what-is-ai-quantization...html` declares canonical `guides/quantization-guide.html` (page doesn't exist).
4. **Stale SEO** — publish dates Oct 2025, "2025" in titles/descriptions, sitemap lastmods.
5. *(Fixed already: invisible white-on-white hero titles — blue hero gradient is now shared in `css/blog-article.css`.)*

## 2. Current Landscape Reference (Aug 2026)

**Closed-source frontier:** GPT-5.2 / **GPT-5.6 Sol** (OpenAI) · **Claude 4.6 Opus/Sonnet** + Claude Code, Claude 5 "Fennec" imminent (Anthropic) · **Gemini 3.1 Pro / Deep Think**, 2M context (Google) · **Grok 4.5**, Grok 5 training (xAI).

**Open-weight (for local-AI pages):** Llama 4 Scout/Maverick (10M context) · Mistral Large 3 (675B/41B active) · Phi-4 family · **DeepSeek-V4 Pro/Flash** (1M context) · **Qwen3-Next 480B / Qwen3.5** · **GLM-4.7 → GLM-5** · **Kimi K2.7/K3** · **MiniMax M2/M3** · **Nemotron 3 Nano/Super/Ultra**.

## 3. Phased Execution Plan

### Phase 0 — Basecamp (scriptable, ~1 batch)
- Run `scripts/validate-seo-preservation.js` + `scripts/validate-sitemap.js` to capture baseline.
- Extend the nesting-unwrap + main-nav-removal to **guides/ (13)** and **cpu/ (28)** using the proven pattern (the one-off script was deleted; recreate as `scripts/normalize-article-template.py`, kept this time).
- Verify all 81 pages render: 1 `<article>`, 1 `<h1>`, 1 breadcrumb, 1 related section.

### Phase 1 — News post (highest urgency, 1 page)
- Rewrite `blog/ai-updates-august-2026.html` sections: DeepSeek-R1 → **DeepSeek-V4**; Llama 3.2 → **Llama 4**; add Claude 4.6 / Gemini 3.1 / GPT-5.6 / Grok 4.5 / open-weight 2026 recap. Update `modified_time`, add an "Updated Aug 2026" badge.

### Phase 2 — Brand pages (31 pages; pattern already established)
- For each legacy page, add a "Latest Models (2026)" section + benchmarks table, using the Kimi/MiniMax pattern.
- **Refresh-first (active brands):** qwen ✅, deepseek ✅, glm ✅, gemma, llama, mistral/mixtral, phi, yi, claude (open-weights), gemini, grok, gpt4-oss, dolphin, wizardlm, vicuna, openchat.
- **Retire/history pages:** bard (renamed to Gemini), bert/t5/bge/e5 (embedding foundations), alpaca/codellama/stablelm/zephyr/orca (2023-24 era) — keep but frame as "foundations & history" with a pointer to current families, or merge/redirect.
- Update sitemap `lastmod` + blog.html card excerpts.

### Phase 3 — Guides (13 pages)
1. **Ranking guides (6):** best-ai-analysis, best-ai-brainstorming, best-ai-coding-assistant, best-ai-multilingual, best-ai-research-assistant, top-20-mobile — replace stale top-20 tables with 2026 model lists (Qwen3/GLM-4.7/Nemotron/Kimi + GPT-5.x/Claude 4.6/Gemini 3.1 where relevant).
2. **Technical guides (3):** quantization, parameters, context-length — update model examples, add 2026 models (1M context now mainstream).
3. **Prompt guides (2):** coding-prompts, research-prompts — refresh tool references (Claude Code, Codex, Cursor-class agents).
4. **Licensing guide (1):** update for 2026 license changes (Llama 4/Mistral/MiniMax).
5. All: title "2025"→"2026", dates → `published 2025-10-17, modified 2026-08-04`, **fix canonical URLs** to actual file paths.

### Phase 4 — CPU & hardware (28 pages)
- Refresh each "Top 5 GGUF models" list with current models + quantizations (Qwen3-Next-80B, GLM-4.7, Nemotron-Nano-30B, Phi-4, MiniMax M2 — matched to each CPU's RAM tiers).
- Update titles/dates/canonicals; regenerate related-model links against real `models/*.html` pages.

### Phase 5 — Cross-cutting close-out
- `blog.html`: refresh all card excerpts + section ordering; add an "Updated" date to each card.
- `sitemap.xml`: regenerate/update lastmods for all touched pages.
- Re-run SEO validation scripts; final link check (no 404s); light+dark preview spot-checks; code review per phase.

## 4. Consistency Rules (apply to every page)
- Keep the premium blue theme + white-title hero (already shared via CSS).
- Exactly one `<h1>`, one breadcrumb, one related-articles section, no legacy `main-nav`.
- Add "Latest models + benchmarks" as an `h2` near the top of each refreshed page.
- Meta: keep `published_time`, set `modified_time` to 2026-08-04; canonical must equal the real file path.
- Related-article links must be correct relative paths (no `brands/` prefix inside `brands/`).

## 5. Validation per phase
1. Structure check: `div/section/article/h1` counts balanced; 1 h1.
2. Link check: every internal href resolves (script reused from brand pass).
3. Sitemap XML parses; all listed files exist.
4. Preview spot-check (light + dark) on a sample from each batch.
5. `code-reviewer-deepseek-flash` review per phase.

## 6. Estimated effort
- Phase 0 (mechanical): ~30 min, one batch.
- Phase 1 (news): ~15 min.
- Phase 2 (brands): the big lift — 31 pages ≈ 3-4 batches; ~10 pages per batch.
- Phase 3 (guides): ≈ 2 batches (rankings first).
- Phase 4 (cpu): ≈ 2 batches (template-driven, mostly table swaps).
- Phase 5: ~30 min.

Total: roughly 9-10 parallel batches. Ready to start with **Phase 0 + 1** on your go.
