# Ternary Bonsai 2.5 27B side-by-side deep dive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a new paper-style deep-dive post comparing Ternary Bonsai 2.5 27B with its predecessor Bonsai 2 27B side by side, with generated hero and comparison graphics, registered in the blog index, feed, sitemap, and new-posts list.

**Architecture:** A single standalone `paper-page` HTML article in `blog/`, reusing the exact CSS stack, header, cover, TOC, table, "Need help with this?", related-posts, and contact patterns of `blog/bonsai-2-27b-ternary-quantization-deep-dive.html`. Two generated PNG assets serve as OG hero and in-article comparison graphic. Four small registration edits make the post discoverable.

**Tech Stack:** Static HTML/CSS, JSON-LD (TechArticle, FAQPage, BreadcrumbList), RSS 2.0, XML sitemap, PowerShell for checks, Python `http.server` for local render.

**Spec:** `docs/superpowers/specs/2026-11-26-bonsai-2-5-deep-dive-design.md` (read it alongside this plan; its "Facts to use verbatim" section is authoritative).

## Global Constraints

- New post filename: `blog/bonsai-2-5-27b-agentic-deep-dive.html`. Canonical URL: `https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html`.
- Title verbatim: `Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive`.
- Author: `Hussain Nazary` in JSON-LD and `meta name="author"`; publisher/site `Local AI Zone`.
- Dates: `2026-11-26` for `datePublished`, `dateModified`, article meta, sitemap `lastmod`, RSS `Thu, 26 Nov 2026 00:00:00 +0000`.
- CSS links (relative, in this order): `../css/premium-styles.css`, `../css/custom.css`, `../css/blog-article.css`, `../css/theme.css`, `../css/theme-overrides.css`, `../css/contact-form.css`, `../css/blog-post.css`, `../css/blog-paper.css`.
- All numbers must come from the spec's fact table; vendor-run figures must be labelled as such at first use; the harness/non-comparability caveat and the launch-day "no independent leaderboard" caveat must both appear.
- Image filenames: `blog/bonsai-2-5-27b-hero.png` (1200×630), `blog/bonsai-2-5-vs-2-comparison.png`.
- No git push. Commit only if the user asks.
- Do not modify any existing post body, model page, or CSS file.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `docs/superpowers/plans/2026-11-26-bonsai-2-5-deep-dive.md` | This plan. |
| `blog/bonsai-2-5-27b-agentic-deep-dive.html` | The article: head/SEO schemas, cover, TOC, 14 chapters, tables, images, FAQ, sources, footer blocks. |
| `blog/bonsai-2-5-27b-hero.png` | OG/social hero. |
| `blog/bonsai-2-5-vs-2-comparison.png` | Side-by-side benchmark graphic embedded in chapter 9. |
| `blog.html` | Blog index: one new `ListItem` (position 25) and one new article card at the top of the card list. |
| `feed.xml` | One new `<item>` at the top of the channel. |
| `sitemap.xml` | One new `<url>` block with hero + comparison image entries. |
| `new-posts.txt` | One new URL line under the `# Recently added blog posts (blog/ directory)` heading. |

---

### Task 1: Fact gate against primary sources

**Files:**
- Read: `docs/superpowers/specs/2026-11-26-bonsai-2-5-deep-dive-design.md`
- Read (web): sources 1–4 in the spec's source table

**Interfaces:**
- Consumes: the "Facts to use verbatim" tables in the spec.
- Produces: a corrected fact set used verbatim by Tasks 3 and 4.

- [ ] **Step 1: Fetch the two authoritative model pages**

Run `webfetch` on `https://docs.prismml.com/models/bonsai-2-5-27b` and `https://huggingface.co/prism-ml/Ternary-Bonsai-2.5-27B-GGUF` (markdown format). Confirm these exact strings appear: `5.93`, `1.76`, `262,144`, `27.36B`, `PTQ1_0`, `PQ2_0`, `Q2_0`, `b11556`, `min_p`, `AppWorld`, `90.5`, `51.2`, `75.6`, `60.8`, `27.0`, `0.0`, `77.2`, `77.7`, `54.2`, `37.9`, `60.5`.

- [ ] **Step 2: Fetch the whitepaper text and confirm methodology caveats**

Run `webfetch` on `https://raw.githubusercontent.com/PrismML-Eng/Bonsai-demo/main/bonsai-2-5-27b-whitepaper.pdf` (or the HTML-rendered equivalent from the earlier research). Confirm: `not comparable with the Bonsai 2 report`, `user simulator`, `native tool calls`, `pass@1`, `xhigh`, `H100`, `EvalScope`, `vLLM`, `Terminal-Bench 2.1`, `MLE-bench`, `VendingBench`, `SWE-bench Pro`.

- [ ] **Step 3: Resolve the general-capability rounding discrepancy**

Confirm the model-card category table gives FP16 `84.32`, Bonsai 2 `81.55`, Bonsai 2.5 `82.12`, while docs/whitepaper round the five-category average to `84.4 / 82.3`. Use model-card figures as canonical and keep the disclosure sentence in chapter 8. If a fetched source contradicts any other spec number, edit the spec's fact table inline and note the correction before proceeding.

- [ ] **Step 4: Confirm prior-post cross-reference**

Run: `Select-String -Path blog/bonsai-2-27b-ternary-quantization-deep-dive.html -Pattern '98.2|143 tokens|5.93'` and confirm the prior post is the source of the Bonsai 2 release-day (`~143 tok/s`) reference used in chapter 10.

---

### Task 2: Generate the two images

**Files:**
- Create: `blog/bonsai-2-5-27b-hero.png`
- Create: `blog/bonsai-2-5-vs-2-comparison.png`

**Interfaces:**
- Consumes: the spec fact table.
- Produces: exactly two PNG paths referenced by the HTML in Task 3.

- [ ] **Step 1: Generate the hero**

Call `generate_image` with `path` = `blog/bonsai-2-5-27b-hero.png`, aspect ratio 1200×630 (16:9-ish), prompt: "clean editorial tech-magazine cover illustration, dark navy and electric-blue gradient background, a compact glowing ternary 27B model chip labeled 'BONSAI 2.5' at center, small agent tool icons (terminal, wrench, API brackets) orbiting it, a faint ghosted outline of a slightly larger 'BONSAI 2' chip behind it to suggest a same-size upgrade, subtle grid and circuit-trace texture, no photorealism, no text other than BONSAI 2.5, high-contrast, professional, minimal, no watermark". Wait for the saved-file notification.

- [ ] **Step 2: Generate the side-by-side comparison graphic**

Call `generate_image` with `path` = `blog/bonsai-2-5-vs-2-comparison.png`, prompt: "clean data-editorial infographic, three vertical columns side by side labeled 'Qwen3.8 FP16', 'Bonsai 2', 'Bonsai 2.5' with simple horizontal bar rows for AppWorld, DeepSWE, SWE-bench Verified and agentic coding average, the Bonsai 2.5 bars visibly higher, dark background, blue/teal/amber accents, crisp sans-serif labels, flat design, no watermark". Wait for the saved-file notification.

- [ ] **Step 3: Verify the files exist and are reasonably sized**

Run: `Get-ChildItem blog/bonsai-2-5-27b-hero.png, blog/bonsai-2-5-vs-2-comparison.png | Select-Object Name,Length,LastWriteTime`. Expected: both files present; each under ~1 MB. If either is oversized, re-run the generate call with a simpler prompt rather than compressing blindly.

---

### Task 3: Write the HTML article

**Files:**
- Create: `blog/bonsai-2-5-27b-agentic-deep-dive.html`

**Interfaces:**
- Consumes: corrected fact set from Task 1; both images from Task 2.
- Produces: a valid standalone HTML article whose internal anchors and relative image paths resolve.

- [ ] **Step 1: Copy the structural skeleton from the existing Bonsai 2 post**

Read `blog/bonsai-2-27b-ternary-quantization-deep-dive.html` lines 1–270 and 950–1060 to capture the exact head meta pattern, site header, cover block, TOC list, "Need help with this?" block, related-posts grid, and contact block. Reuse those structures verbatim, changing only titles, URLs, dates, keywords, description, and the article body. Keep `body class="paper-page has-site-header"`.

- [ ] **Step 2: Write the head and JSON-LD blocks**

Use this exact scaffold (fill description text with the thesis, not placeholders):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive</title>
<meta name="description" content="A side-by-side deep dive on Ternary Bonsai 2.5 27B, Prism ML's November 24, 2026 agentic release: the same Qwen3.8-27B hybrid-attention base, ternary g128 weights and 5.93 GB footprint as Bonsai 2, but FP16-level tool calling, 90% of FP16 agentic coding, an MTP draft head, and every benchmark delta from the previous version.">
<meta name="keywords" content="Bonsai 2.5 27B, Ternary Bonsai 2.5, Prism ML, agentic coding, tool calling, AppWorld, SWE-bench Verified, DeepSWE, Terminal-Bench 2.1, ternary quantization, 1.76 bits per weight, MTP, speculative decoding, GGUF, MLX, llama.cpp, local AI agents">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive",
  "alternativeHeadline": "Same 5.93 GB ternary weights, a different agent — Bonsai 2 vs Bonsai 2.5, benchmark by benchmark",
  "description": "A side-by-side deep dive on Ternary Bonsai 2.5 27B against Bonsai 2 27B and the FP16 Qwen3.8-27B base: what stayed identical, what changed, the full agentic and general-capability benchmark tables, MTP throughput, packaging, deployment, and limitations.",
  "author": {"@type": "Person", "name": "Hussain Nazary"},
  "datePublished": "2026-11-26",
  "dateModified": "2026-11-26",
  "keywords": "Bonsai 2.5 27B, Bonsai 2 27B, Prism ML, ternary quantization, agentic coding, tool calling, MTP, GGUF, MLX, local AI",
  "articleSection": "Research Paper",
  "inLanguage": "en-US",
  "isAccessibleForFree": true,
  "wordCount": 14000,
  "proficiencyLevel": "Expert",
  "mainEntityOfPage": "https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html",
  "publisher": {"@type": "Organization", "name": "Local AI Zone", "logo": {"@type": "ImageObject", "url": "https://local-ai-zone.github.io/logo.svg"}},
  "about": [
    {"@type": "Thing", "name": "Ternary Bonsai 2.5 27B"},
    {"@type": "Thing", "name": "Agentic AI"},
    {"@type": "Thing", "name": "Prism ML"},
    {"@type": "Thing", "name": "Quantization"},
    {"@type": "Thing", "name": "Edge AI"}
  ],
  "isPartOf": {"@type": "Blog", "name": "Local AI Zone — Blog", "url": "https://local-ai-zone.github.io/blog.html"},
  "image": {
    "@type": "ImageObject",
    "url": "https://local-ai-zone.github.io/blog/bonsai-2-5-27b-hero.png",
    "width": 1200, "height": 630,
    "caption": "Ternary Bonsai 2.5 27B: an agentic 27B model in 5.93 GB at 1.76 bits per weight"
  },
  "speakable": {"@type": "SpeakableSpecification", "cssSelector": ["h1", ".cover .sub"]}
}
</script>
```

Add the standard SEO metas (`canonical`, `hreflang` en/en-US/x-default, robots/googlebot/bingbot, rating, revisit-after, theme-color, creator, publisher), Open Graph and Twitter cards pointing at `bonsai-2-5-27b-hero.png`, a `FAQPage` script with the five questions in Task 3 Step 4, a `BreadcrumbList` script with the post as position 3, then the eight CSS links from Global Constraints and `logo.svg` icon.

- [ ] **Step 3: Write the cover and table of contents**

Cover: `<h1>Ternary Bonsai 2.5 27B<br><span class="thin">FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive</span></h1>`, a `.sub` line with release date and one-sentence thesis, the hero image at `bonsai-2-5-27b-hero.png` with descriptive alt, and a byline/date line. TOC: an ordered list of 14 anchors matching the chapter ids `abstract`, `ch1` … `ch14`, with the prior-post link as a "read the Bonsai 2 report first" note.

- [ ] **Step 4: Write chapters 1–5 (setup and thesis)**

Use `<h2 class="ch" id="..."><span class="chno">N</span> ...</h2>` headings, with `<h3>` subheads exactly as outlined. Required content:

- `abstract`: "same weights, different behavior" thesis; explain that every comparison table uses three columns — Qwen3.8-27B FP16 (53.8 GB), Bonsai 2 27B (5.93 GB), Bonsai 2.5 27B (5.93 GB) — and that a delta is a re-run under the 2.5 harness where noted.
- `ch1` Release context: Nov 24, 2026; agentic release of the Ternary Bonsai 27B line; replaces Bonsai 2 27B; Bonsai 2 weights stay at `prism-ml/Ternary-Bonsai-2-27B-gguf` and `-mlx-2bit`; Apache 2.0.
- `ch2` What stayed the same: full identity table from spec (base, 27.36B split, hybrid attention ~75/25, SwiGLU/RoPE/RMSNorm, ternary g128 + Hadamard, 1.76 bpw/5.93 GB, 262,144 ctx, text+image, xhigh/medium, Apache 2.0). Cross-link to the Bonsai 2 post for the format deep dive.
- `ch3` What changed: agentic focus; MTP draft head in every GGUF file (1.5–1.8× on NVIDIA); thinking-mode sampling temp 1.0/top-p 0.95/top-k 20/min-p 0.0 vs Bonsai 2's 0.05 and llama.cpp's default 0.05 requiring `--min-p 0`; `Q2_0` in the main repo; `low` reasoning effort unsupported. Include a side-by-side "at a glance" table with a "Changed?" column marking these five rows.
- `ch4` Why agentic work is the hard case: error compounding across tool calls, over-thinking and repetition, why DeepSWE 0 → 27.0 is the headline.
- `ch5` before results, a short "how to read the tables" note: all figures thinking mode `xhigh`, pass@1, reasoning block stripped, EvalScope + vLLM on H100, vendor-run.

- [ ] **Step 5: Write chapters 6–9 (the side-by-side results)**

Each table wrapped in `<div class="table-scroll"><table>...</table></div>`. Exact rows:

`ch6` Agentic tool calling:

| Benchmark | FP16 | Bonsai 2 | Bonsai 2.5 |
| τ²-Bench | 80.6 | 80.2 | 82.0 |
| τ³-Bench | 72.8 | 69.1 | 73.9 |
| BFCL v3 (native) | 71.2 | 70.3 | 72.6 |
| BFCL v4 | 70.8 | 64.4 | 67.2 |
| AppWorld | 93.2 | 51.2 | 90.5 |
| Average (5) | 77.7 | 67.0 | 77.2 |

Prose: FP16-level tool calling at one ninth the size; AppWorld scenario completion 89.3% vs IQ3_XXS 80.4% and IQ2_S 75.0%; GSQ-RCO IQ2_XS 79.5 on τ²-Bench but 46.5 on AppWorld because it guesses API calls and declares completion before seeing output; BFCL v4 exception (3.6 behind FP16, 0.5 behind IQ2_S); **harness caveat** — τ²/τ³ thinking-mode user simulator and BFCL v3 native tool calls make these not comparable to the original Bonsai 2 report.

`ch7` Agentic coding:

| Benchmark | FP16 | Bonsai 2 | Bonsai 2.5 |
| Terminal-Bench 2.1 | 70.8 | 52.8 | 60.1 |
| SWE-bench Verified | 80.6 | 60.8 | 75.6 |
| DeepSWE 1.1 | 30.1 | 0.0 | 27.0 |
| Average (3) | 60.5 | 37.9 | 54.2 |

Prose: retention 63% → 90% of FP16; SWE-bench 94%, DeepSWE 90%, Terminal-Bench 85%; scaffolds: Terminus-2 for Terminal-Bench, mini-SWE-agent for SWE-bench/DeepSWE.

`ch8` General capability — category table from spec (86.67/83.80/84.27; 93.15/89.00/90.10; 74.55/70.50/71.65; 81.15/82.55/80.90; 86.07/81.89/83.66; average 84.32/81.55/82.12). Include the rounding/14-vs-16 disclosure and the two regressions: LiveCodeBench v6 83.8 → 83.0 and BigCodeBench 57.2 → 60.3.

`ch9` The big comparison: embed `<img src="bonsai-2-5-vs-2-comparison.png" alt="Side-by-side benchmark graphic: FP16, Bonsai 2 and Bonsai 2.5 on AppWorld, DeepSWE, SWE-bench Verified and agentic coding average" loading="lazy" decoding="async">`, followed by an HTML fallback table repeating the headline deltas (AppWorld 51.2→90.5, DeepSWE 0.0→27.0, SWE-bench 60.8→75.6, coding avg 37.9→54.2, tool-calling avg 67.0→77.2) so the data survives if the image fails.

- [ ] **Step 6: Write chapters 10–14 (throughput, runtime, deployment, limits, verdict)**

- `ch10` Throughput & MTP: draft head 1.5–1.8× on NVIDIA, output matches plain decoding up to rounding noise; 2.3–3.0× faster than Bonsai 2 release day on 6 of 7 NVIDIA GPUs with kernels in testing, ~300 tok/s on H200/B200; Bonsai 2 release-day reference ~143 tok/s RTX 5090 from the prior post; label "kernels in testing" as a moving claim.
- `ch11` Packings & runtime: the four-row packing table from the spec; stock llama.cpp `b11556` requirement and the "older builds load without warning and produce garbage" warning; MLX ~8.9 GB Apple package for Mac/iPhone/iPad, text-only language model + FP16 vision tower, optional v2 MTP head; vision tower as separate `mmproj` loaded only for images.
- `ch12` Deployment field guide: llama.cpp command using the `PTQ1_0` file with `--min-p 0`; thinking vs instruct sampling table (thinking 1.0/0.95/20/0.0/0.0/1.0; instruct 0.7/0.80/20/0.0/1.5/1.0); a short Python MLX loader snippet adapted from the prior post; note that MTP builds need the `-mtp` repo; note WebGPU/API options are inherited from Bonsai 2 and should be checked for 2.5 availability before relying on them.
- `ch13` Limitations, reception & roadmap: vendor-run data with no independent leaderboard on launch day (eesel AI) and reviewers advising local verification (Tested Intelligence); BFCL v4 and LiveCodeBench v6 regressions; Terminal-Bench 2.1 furthest from FP16; unmeasured MLE-bench/VendingBench/SWE-bench Pro; kernel/KV-cache roadmap (PTQ1_0 parity, sub-4-bit KV, remove activation-side rotation overhead at batch 1).
- `ch14` Verdict + FAQ + sources: "who should upgrade" (local agent builders, tool-heavy coding workflows) vs "who should stay" (users wanting independent benchmarks or hosted service, sensitive to the two regressions). Five FAQ `<h3>` blocks whose text matches the FAQPage schema: what Bonsai 2.5 is; what changed vs Bonsai 2; does it fit in 5.93 GB; how much of FP16 agentic coding it keeps; which runtimes/files to use. Sources table with all 12 spec sources and a document-dates note ("assembled November 26, 2026, two days after release; figures will age").

- [ ] **Step 7: Reuse the footer blocks**

Copy the "Need help with this?" panel, related-posts grid (link the Bonsai 2 post first), and contact block from the prior post; update theme-toggle script key from `bonsai-paper-theme` to `bonsai-2-5-paper-theme` so the two posts don't share state.

- [ ] **Step 8: Structural check of the new HTML**

Run: `Select-String -Path blog/bonsai-2-5-27b-agentic-deep-dive.html -Pattern '<h2 class="ch"' | Measure-Object | Select-Object -ExpandProperty Count`. Expected: `14`. Run: `Select-String -Path blog/bonsai-2-5-27b-agentic-deep-dive.html -Pattern 'bonsai-2-5-27b-hero.png|bonsai-2-5-vs-2-comparison.png' | Measure-Object | Select-Object -ExpandProperty Count`. Expected: at least 4 (head meta, cover, schema, in-article image).

---

### Task 4: Register the post in the site

**Files:**
- Modify: `blog.html:178-182` (ItemList tail), `blog.html:297` (card list head)
- Modify: `feed.xml:79` (insert before first `<item>`)
- Modify: `sitemap.xml:30473` (insert before the Bonsai 2 `<url>` block)
- Modify: `new-posts.txt:14-15` (insert after the blog heading comment)

**Interfaces:**
- Consumes: canonical URL and title from Global Constraints.
- Produces: discoverable post in index, RSS, sitemap, and recent-posts list.

- [ ] **Step 1: Add the blog index `ListItem`**

Replace the tail at `blog.html` lines 177–181 with:

```html
      {
        "@type": "ListItem",
        "position": 24,
        "url": "https://local-ai-zone.github.io/blog/deepseek-v4-flash-deep-dive.html"
      },
      {
        "@type": "ListItem",
        "position": 25,
        "url": "https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html"
      }
```

- [ ] **Step 2: Add the article card**

Insert as the first card at `blog.html` line 297 (before the Qwen 4 card):

```html
<a href="blog/bonsai-2-5-27b-agentic-deep-dive.html" class="article-card"><div class="article-card-content"><h3 class="article-card-title">Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB</h3><p class="article-card-excerpt">Prism ML's November 24 agentic release keeps Bonsai 2's Qwen3.8-27B base, ternary g128 weights and 5.93 GB footprint, but takes AppWorld from 51.2 to 90.5, DeepSWE from 0 to 27.0 and agentic coding retention from 63% to 90% of FP16 — with MTP speculative decoding, new sampling defaults, and every side-by-side benchmark table.</p><div class="article-card-footer"><span class="read-more-link">Read More &rarr;</span></div></div></a>
```

- [ ] **Step 3: Add the RSS item**

Insert immediately before `feed.xml` line 80 (`    <item>`):

```xml
    <item>
      <title>Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive</title>
      <link>https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html</link>
      <guid isPermaLink="true">https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html</guid>
      <pubDate>Thu, 26 Nov 2026 00:00:00 +0000</pubDate>
      <description>Prism ML's agentic Bonsai 2.5 27B keeps the same 5.93 GB ternary format as Bonsai 2 but delivers FP16-level tool calling (77.2 vs 77.7) and 90% of FP16 agentic coding (54.2 vs 60.5), with side-by-side benchmark tables, MTP throughput, packaging changes and deployment guidance.</description>
    </item>
```

- [ ] **Step 4: Add the sitemap URL block**

Insert before the existing Bonsai 2 `<url>` at `sitemap.xml` line 30473:

```xml
  <url>
    <loc>https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html</loc>
    <image:image>
      <image:loc>https://local-ai-zone.github.io/blog/bonsai-2-5-27b-hero.png</image:loc>
      <image:title>Ternary Bonsai 2.5 27B: an agentic 27B model in 5.93 GB at 1.76 bits per weight</image:title>
    </image:image>
    <image:image>
      <image:loc>https://local-ai-zone.github.io/blog/bonsai-2-5-vs-2-comparison.png</image:loc>
      <image:title>Side-by-side benchmarks: Qwen3.8 FP16, Bonsai 2 and Bonsai 2.5</image:title>
    </image:image>
    <lastmod>2026-11-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
```

- [ ] **Step 5: Add the recent-posts line**

Insert as the first line under `# Recently added blog posts (blog/ directory)` in `new-posts.txt`:

```
https://local-ai-zone.github.io/blog/bonsai-2-5-27b-agentic-deep-dive.html
```

- [ ] **Step 6: Verify all four registrations**

Run: `Select-String -Path blog.html,feed.xml,sitemap.xml,new-posts.txt -Pattern 'bonsai-2-5-27b-agentic-deep-dive' | Measure-Object | Select-Object -ExpandProperty Count`. Expected: at least 5 matches (2 in blog.html, 1 in each other file).

---

### Task 5: Verify and hand off

**Files:**
- Read: all files touched in Tasks 2–4.

**Interfaces:**
- Consumes: all deliverables.
- Produces: a verified, publishable post; no further file changes unless a check fails.

- [ ] **Step 1: Validate XML well-formedness**

Run:

```powershell
[xml](Get-Content feed.xml -Raw) | Out-Null; if ($?) { "feed.xml OK" }
[xml](Get-Content sitemap.xml -Raw) | Out-Null; if ($?) { "sitemap.xml OK" }
```

Expected: both `OK`. If either throws, fix the inserted XML before continuing.

- [ ] **Step 2: Validate JSON-LD blocks parse**

Run (PowerShell extracts each `application/ld+json` block and parses it):

```powershell
$html = Get-Content blog/bonsai-2-5-27b-agentic-deep-dive.html -Raw
[regex]::Matches($html, '<script type="application/ld\+json">([\s\S]*?)</script>') | ForEach-Object {
  $_.Groups[1].Value | ConvertFrom-Json | Out-Null
  "JSON-LD block OK"
}
```

Expected: three `OK` lines (TechArticle, FAQPage, BreadcrumbList).

- [ ] **Step 3: Render locally and inspect**

Run `python -m http.server 8000` in the repo root (background), then open `http://localhost:8000/blog/bonsai-2-5-27b-agentic-deep-dive.html` in a browser. Check at desktop width: cover renders, hero and comparison images load, TOC anchors jump to all 14 chapters, tables scroll/wrap correctly, code blocks show, theme toggle works, footer blocks present. Check at mobile width: no horizontal overflow.

- [ ] **Step 4: Link check**

Run: `Select-String -Path blog/bonsai-2-5-27b-agentic-deep-dive.html -Pattern 'href="[^"]+"' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Sort-Object -Unique`. Verify every relative `../css/...`, `../logo.svg`, `../index.html`, `../about.html`, `../services.html`, `../blog.html`, `bonsai-2-27b-ternary-quantization-deep-dive.html`, and both PNG paths resolve to existing files. Verify external source URLs in the sources table are the ones listed in the spec.

- [ ] **Step 5: Content gate**

Run: `Select-String -Path blog/bonsai-2-5-27b-agentic-deep-dive.html -Pattern '90.5|27.0|75.6|54.2|77.2|5.93|1.76|not comparable|vendor|no independent' | Measure-Object | Select-Object -ExpandProperty Count`. Expected: at least 12. Also confirm the two disclosure caveats (harness non-comparability and launch-day lack of independent benchmarks) are present in prose, not just in sources.

- [ ] **Step 6: Report completion**

Print `git status --short` and list created/modified files. Do not push. Ask the user whether they want a local commit.

---

## Self-review notes

- Spec coverage: Task 1 = fact gate + sources; Task 2 = both images; Task 3 = all 14 chapters, SEO schemas, side-by-side tables, caveats, footer; Task 4 = all four registration files; Task 5 = verification plan items 1–5. No spec requirement lacks a task.
- Placeholder scan: no "TBD"/"TODO"/"implement later"; every code step includes literal content to insert. Prose steps state exact facts and framing rather than "write about X".
- Type/name consistency: canonical URL, filename, image names, anchor ids (`abstract`, `ch1`–`ch14`), and theme key `bonsai-2-5-paper-theme` are used identically across tasks.
