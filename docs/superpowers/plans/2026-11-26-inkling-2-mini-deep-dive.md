# Inkling 2 Mini deep dive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a 14-chapter deep dive on Inkling 2 Mini with a side-by-side comparison to Qwen3.8-27B, an architecture focus, two generated graphics, site registration, verified numbers, and a push to origin/main.

**Architecture:** Standalone `paper-page` HTML article reusing the exact CSS/header/footer/TOC/table patterns of `blog/bonsai-2-5-27b-agentic-deep-dive.html`; two locally rendered PNG assets; four small registration edits.

**Tech Stack:** Static HTML/CSS, JSON-LD, RSS, XML sitemap, Pillow for graphics, PowerShell for validation, Python `http.server` + in-app browser for render checks.

**Spec:** `docs/superpowers/specs/2026-11-26-inkling-2-mini-deep-dive-design.md`

## Global Constraints

- Filename: `blog/inkling-2-mini-looped-transformer-deep-dive.html`; canonical `https://local-ai-zone.github.io/blog/inkling-2-mini-looped-transformer-deep-dive.html`.
- Title: `Inkling 2 Mini: A 26B Looped MoE That Runs on a Laptop — Side-by-Side with Qwen3.8-27B`.
- Author Hussain Nazary; dates 2026-11-26; CSS links identical to the Bonsai 2.5 post.
- Theme localStorage key: `inkling2-mini-paper-theme` (distinct from other posts).
- Images: `blog/inkling-2-mini-hero.png` (1200×630) and `blog/inkling-2-mini-vs-qwen-3-8-27b.png`.
- Every number from the spec fact table; vendor-run and cross-precision caveats stated at point of use.
- Commit and push to `origin/main`; rebase on remote if rejected; never force-push.

---

### Task 1: Fact gate

- [ ] **Step 1:** Re-fetch `https://thinkingmachines.ai/model-card/inkling-2-mini/` and `https://thinkingmachines.ai/news/inkling-2-mini`; confirm the identity, training, loop-experiment and benchmark numbers in the spec appear verbatim.
- [ ] **Step 2:** Re-fetch `https://huggingface.co/blog/inkling2mini`; confirm 24 layers / 48 visits, 8-of-128 experts, hidden 2304, window 1024, IQ4_NL and Q8_0, SGLang flags and DSpark draft inputs (visits 5, 23, 41, state 48).
- [ ] **Step 3:** Fix any mismatches inline in the spec before writing the article.

### Task 2: Generate the two graphics

- [ ] **Step 1:** Write `scripts/generate-inkling-2-mini-images.py` using Pillow (the AI image service previously returned invalid credentials). Hero: dark navy/cyan, 24 stacked layer bars with the middle 12 drawn three times as a loop, label "INKLING 2 MINI", subline "26.4B total / 3.4B active / 20 GB".
- [ ] **Step 2:** Comparison graphic: grouped bars, Inkling vs Qwen3.8-27B on DeepSWE 48.2/42.2, SWE-bench Pro v2 77.9/73.8, BrowseComp 79.0/61.6, Vals Index 46.5/29.8, with a footer noting vendor-run figures.
- [ ] **Step 3:** Run the script and inspect both PNGs with the read tool; fix clipping or overlap; keep each under ~400 KB.

### Task 3: Write the article

- [ ] **Step 1:** Copy the head structure from `blog/bonsai-2-5-27b-agentic-deep-dive.html` and replace title/description/keywords/canonical/OG/Twitter/JSON-LD (TechArticle, FAQPage with five questions, BreadcrumbList). Use `wordCount` ≈ 9000 after measuring.
- [ ] **Step 2:** Copy the site header, TOC (14 anchors `abstract`, `ch1`…`ch14`), cover with hero figure and six stat cells, related posts, post-help and contact boilerplate; change theme key to `inkling2-mini-paper-theme`.
- [ ] **Step 3:** Write chapters 1–6: abstract; release context; architecture (24 layers, four blocks of six, layers 6–17 looped 3×, 48 visits, learned gates/messages, attention residuals, 8-of-128 experts, 2304 width, sliding-window 1024, full attention); side-by-side spec table vs Qwen3.8-27B; why loop instead of storing facts (pruning/healing, 27-of-28, 1.51–1.91×); NVFP4/MXFP8 and the 20 GB checkpoint.
- [ ] **Step 4:** Write chapters 7–10: agentic coding table with all 12 rows and deltas; search/tool/knowledge work table with Qwen wins; graphic + HTML fallback table; vision, long-context and safety tables.
- [ ] **Step 5:** Write chapters 11–14: loop-depth experiments (Think Fast 16→37 s, CoT 3,703→1,661 tokens, controllability 0.1% vs 1.3%, LinuxArena stealth, intelligence-per-joule with cross-precision caveat); deployment (GGUF IQ4_NL/Q8_0, Ollama, MLX, transformers snippet with `AutoModelForMultimodalLM`, SGLang flags and DSpark, reasoning efforts 0.0–0.99, tool calling); limitations; verdict + FAQ + 11-row sources table with document-dates note.
- [ ] **Step 6:** Verify with `Select-String`: 15 `h2.ch` headings, both image references, ≥10 tables, all anchors present.

### Task 4: Register the post

- [ ] **Step 1:** Add position 26 `ListItem` to `blog.html` JSON-LD and an article card at the top of the card list (link + one-paragraph excerpt).
- [ ] **Step 2:** Add RSS item at top of `feed.xml` with `pubDate` `Thu, 26 Nov 2026 00:00:00 +0000`.
- [ ] **Step 3:** Add `<url>` block to `sitemap.xml` with hero + comparison images and `<lastmod>2026-11-26</lastmod>`.
- [ ] **Step 4:** Add the URL as the first line under the blog heading in `new-posts.txt`.
- [ ] **Step 5:** Confirm ≥6 matches across the four files.

### Task 5: Verify and publish

- [ ] **Step 1:** Validate `feed.xml`/`sitemap.xml` with `[xml]` and all JSON-LD blocks with `ConvertFrom-Json`.
- [ ] **Step 2:** Start `python -m http.server 8000`, open the post in the in-app browser over HTTP, check hero/comparison images load, 15 chapters, 14 TOC anchors, tables, desktop and 375 px widths.
- [ ] **Step 3:** Check every relative href resolves; confirm ≥10 occurrences of key figures (48.2, 77.9, 79.0, 46.5, 20.1, 26.4, 3.4, 5.4, 20 GB) and both caveats.
- [ ] **Step 4:** `git add -A`, commit `post: add Inkling 2 Mini looped-transformer deep dive`, push to `origin/main`; if rejected, `git pull --rebase origin main`, re-verify registrations and XML/JSON, then push again. No force push.
- [ ] **Step 5:** Report final commit hash and live URL.
