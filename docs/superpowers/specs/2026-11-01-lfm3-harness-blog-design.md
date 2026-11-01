# LFM3 Harness deep-dive blog post — design spec

Date: 2026-11-01
Status: approved by user (outline + packaging) on 2026-11-01

## Goal

A deep-dive technical blog post about the LFM3 Harness app (site: https://lfm3-harness.github.io/, source: https://github.com/LFM3-Harness/LFM3-Harness), written for a technical AI-craft audience. Angle A: "the harness, not the model" — how a sub-2B-model stack is made trustworthy by the system around it.

## Deliverables

- `blog/lfm3-harness-deep-dive.html` — standalone post following the existing deep-dive template (compare `blog/minimax-m3-1-flash-deep-dive.html`, and `docs/BLOG_POST_TEMPLATE.md` / `docs/BLOG_CSS_NAMING.md`).
- `blog/lfm3-harness-deep-dive-hero.png` — 1200×630 OG hero.
- Registration entries in `blog.html`, `feed.xml`, `sitemap.xml` (newest-first patterns). `blog/October_2026_AI_Model_Updates.html` is not touched.
- No git push; local commits only when the user asks.

## Thesis

A 1.7B–2B model cannot be trusted to be right, but a harness can make it safe to use: capability hints are separated from authority, no model approves its own work, and "I finished" is a claim that must be proven on disk.

## Source of truth

Shallow clone at `C:/Users/MY-PC/.qoder/tmp/lfm3-harness-repo` (main @ 16 commits, v0.1.1) plus https://lfm3-harness.github.io/. Every number, constant, and quotation in the post must be re-verified against the clone before delivery (facts gate). References section deep-links exact repo files.

## Section outline

1. Why the harness is the product — small models + loose harness = confident nonsense; rails, not scale.
2. What the app actually is — folder-picked chat-first coworker (Win/Linux); four roles (d1-2B router, LFM3-1.7B actor, VL-2B vision, Audio-2B voice); free chat vs verified tasks; key-facts table (32k context, ~4.9 GB weights, 15.2 MB installer, CPU-only, MIT).
3. Architecture: one executable, four subprocesses, three databases — no sidecar/no engine HTTP server; llama.cpp b11960 children pinned to 127.0.0.1:8080–8083; fixed command line ("no planner-provided text is accepted"); identity-poll with IdentityMismatch hard-fail; Windows job-object kill-on-close, Linux process groups; separate run journal / chat.db ("a conversation is not a verified run") / jobs.db; artifacts(sha256 UNIQUE) append-only journal; inline CSS topology diagram.
4. Routing: a decision model with veto-limited influence — 7 intents; <24-char messages skip d1; MIN_DECISION_CONFIDENCE_BPS=5500; first-match keyword fallback; native /v1/systemone choice protocol (chat/completions → 501 by design); confident `general` never overrides; route grants hints, never authority.
5. The trust machinery — exact-diff Allow-once/Deny cards, APPROVAL_TTL=600s; path-escape refusal before touching the filesystem (paths.rs header); preflight write gate WRITE_GATE_FLOOR_BPS=7500 (aligned/uncertain/contradicts → Allow/Advise/Hold; Hold shows no approval card); evidence gate EVIDENCE_GATE_FLOOR_BPS=6500 (advisory only); gate prompt split "REQUEST (the person's words, the only authorization)" vs "PROPOSED ACTION (model-authored, untrusted)".
6. Refusing to let the model declare victory — `finish refused: {path} does not exist or is empty; keep working`; re-read-before-finish; empty/placeholder and source-overwrite refusals; frozen SHA-256 acceptance contracts never weakened across retries; screen_qa/voice_intake/doc_extract remain human_review_only because automatic semantic pass needs a ≥3 packaged-run holdout that was never performed.
7. Benchmark forensics — 2026-10-31 multimodel run: 21/21 router but 14/21 keywords-alone; d1 consulted 21/21, replaced route 20×, 0 regressions, overrides won 7/7, blind spots recovered 3/3, median route latency 122 ms; 12/12 chat turns; vision 2/2; voice 1/1; TTS+ASR 2/2 at 0% WER; gates: 2 write-gate consults (55% fell below floor), 8 evidence consults / 2 advisories, 2 inconclusive rejections. Bug 1: d1 called on /v1/chat/completions → HTTP 501, routing silently keyword-only — fixed to /v1/systemone. Bug 2: approved actions stuck `approved` (store accepted only pending→ transitions); approved→applied|failed now preserves decided_at. agent50: 43/50 harness pass (86%), semantic 41/50, 2 false passes (t27/t36, "too long" word bounds), 0 false failures, search weakest 1/5, avg 5.7 turns, median 30.5 s. Published caveats: one machine, one run, synthetic fixtures, zero real contradictory-write holds.
8. The Python→Rust rewrite and its enforcement — removal is verified not promised: accept.ps1 no-Python check; smoke asserts installed tree contains no Python source; models/llama.cpp/demo/missions preserved; legacy .lfm3/ data not migrated.
9. Design lessons for constrained agents — hints ≠ authority; every loop capped (12 tool rounds, max_plan_steps 8, run timeout 900 s); per-role sampling (actor temp 0.1/top-k 50/RP 1.1, gates greedy, chat 0.3, TTS 1.0/top-k 128); fail-closed defaults (loopback-only, packaging refuses non-loopback endpoints, allow_download forbidden in Packaged profile, unsigned-installer honesty).
10. Limitations and open questions — README Known gaps quoted faithfully: routing/search/report/streamed-calls/cancellation/approval-expiry not qualified against real models; semantic holdout not performed; llama-tts not exercised end-to-end in-app; limits.max_tokens unwired (executor hardcoded 512, planner 1536); GPU excluded (-ngl 0); no macOS; interrupted jobs reported, not resumed.
11. Conclusion + References (repo file paths + site + release) + FAQ + "Need help with this?" + contact block.

## Voice & format rules

- Second-person-adjacent engineer voice; concrete constants and file paths over adjectives; no marketing superlatives; disclose the project is community-built and not affiliated with Liquid AI.
- All figures attributed as "the project's own benchmark" with its caveats attached (per user preference for measured real-model runs, honesty about single-run data).
- HTML head mirrors the template: SEO meta, OG/Twitter, JSON-LD (Article + FAQPage), stylesheets ../css/premium-styles.css, custom.css, blog-article.css, theme.css, theme-overrides.css, contact-form.css; author Hussain Nazary.
- Tables use `.table-scroll`; images use relative blog paths; anchors on all h2.

## Verification plan

1. Facts gate: grep the clone for each quoted constant/line; correct the post if any mismatch.
2. Render locally (file:// or `python -m http.server`) and screenshot desktop width; check TOC anchors, tables, diagram, code blocks.
3. Link check: relative hrefs resolve to existing files; external URLs return 200.
4. Validate feed.xml/sitemap.xml remain well-formed XML after edits.
