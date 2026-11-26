# Inkling 2 Mini looped-transformer deep dive — design spec

Date: 2026-11-26
Status: approved by user 2026-11-26 (HTML paper-style post; side-by-side with Qwen3.8-27B; architecture focus; two images; push at end)

## Goal

A book-length technical deep dive on **Inkling 2 Mini** (Thinking Machines Lab, released 2026-11-20), with the looped-transformer architecture as the core subject and **Qwen3.8-27B** as the running side-by-side baseline, matching the format of the Bonsai 2.5 post.

## Deliverables

- `blog/inkling-2-mini-looped-transformer-deep-dive.html` — standalone `paper-page` HTML article with full SEO/JSON-LD, 14 chapters, comparison tables, hero and graphic, FAQ and sources.
- `blog/inkling-2-mini-hero.png` (1200×630) and `blog/inkling-2-mini-vs-qwen-3-8-27b.png` (side-by-side chart).
- `scripts/generate-inkling-2-mini-images.py` — Pillow generator (AI image service failed earlier with invalid credentials; reuse the proven local approach).
- Registration in `blog.html`, `feed.xml`, `sitemap.xml`, `new-posts.txt`.
- Cross-links to `blog/qwen3-8-27b-comprehensive-analysis.html` and the two Bonsai posts.
- Commit and push to `origin/main` (rebase on remote if needed, as before).

## Source of truth

1. https://thinkingmachines.ai/model-card/inkling-2-mini/ — architecture, parameters, numerics, full evaluation table, safety, limitations.
2. https://thinkingmachines.ai/news/inkling-2-mini — release claims, looping design, pruning/healing, monitorability experiments, intelligence-per-watt, deployment.
3. https://huggingface.co/blog/inkling2mini — layer/block detail, attention design, GGUF quants, transformers/llama.cpp/SGLang/MLX code, DSpark speculative decoding.
4. https://www.mindstudio.ai/blog/inkling-2-mini-local-benchmarks — local hardware and runtime coverage.
5. https://ai-tldr.dev/models/inkling-2-mini, https://siliconreport.com/benchmarks/models/inkling-2-mini, https://llm-bench.io/models/inkling-2-mini — launch coverage and community speed data.
6. `blog/qwen3-8-27b-comprehensive-analysis.html` — prior Qwen post for cross-reference only.

## Facts to use verbatim (fact gate before delivery)

### Identity
- Released Nov 20, 2026; Thinking Machines Lab; Apache 2.0; text + image in, text out; 1M-token context.
- 26.4B total / 3.4B active; 5.4B effective active with three loop passes (~1.0B added per pass).
- 24 physical layers in four blocks of six; layers 6–17 (middle 12) run three times → 48 layer applications per token.
- MoE: 8 of 128 experts per layer; hidden width 2304, expert intermediate 1152; 24 query heads, 8 KV heads; each 6-layer block has five sliding-window (1024-token) layers and one full-attention layer; attention residuals with learned gates and cross-pass messages.
- NVFP4 for 20 layers, MXFP8 for last 4; trained and deployed at same precision (no conversion loss); ~20 GB checkpoint.
- Hardware: 1× NVIDIA DGX Spark; Apple silicon ≥32 GB unified memory; other GPUs ≥32 GB VRAM.

### Training
- Started sparsity 48 (8 of 384 experts); pruned two-thirds midtraining to 128 most-used experts per layer; healed on 1T tokens distilled from a larger internal Inkling model; SFT; RL 2.2T tokens / 2,000 steps; on-policy distillation for alignment.
- Middle-layer looping beat last-layer looping on 27 of 28 evaluations; compute-equivalent gain 1.51–1.91× (middle) vs 1.24–1.36× (last). Non-looping cost 7.5% less compute but looping was >50% more compute-efficient.

### Loop-depth experiments (variable-loop research model, 1–5 passes, RL at 3)
- Think Fast no-CoT 50% time horizon: 16 s at 1 pass → 37 s at 3 passes; roughly flat beyond 3; N-Hop lookup improves out to 10 loops.
- GPQA CoT tokens: 3,703 (1 pass) / 1,731 (3) / 1,661 (5); words per sentence 8.9/8.7/8.7; dictionary fraction 94.6/94.5/94.4%; uncertainty markers 9.7/3.9/3.6.
- CoT controllability at 750–1,250 tokens: Inkling 2 Mini ≤0.1%, varloop ≤0.1%, Inkling 2 Small 0.3%, Inkling-Small 0.4%, Qwen3.8-27B 1.3%.
- LinuxArena stealth with weaker monitor (Qwen3.6-35B-A3B), 184 pairings, 1% FP: tool-only Qwen3.8-27B 20.5%, Inkling 2 Small 3.2%, Mini helpful-only 3.9%, varloop 1–5 passes 1.0/2.5/4.0/2.8/5.0%; with text+thinking 0.4/0.5/1.3/0.3/0.4/0.6/0.3/0.0%.
- Stanford Hazy + Scaling Intelligence intelligence-per-joule: Inkling 0.703 on DGX Spark (MXFP8, low effort) vs Qwen3.6-35B-A3B 0.430, Gemma-4-26B-A4B 0.159, Qwen3.5-27B 0.036.

### Side-by-side benchmark figures (Inkling 2 Mini vs Qwen3.8-27B)
- AA Index v5: 20.1 vs 20.1 (tie). Vals Index v2.2: 46.5% vs 29.8%.
- Coding: FrontierCode 15.1 vs 14.9; DeepSWE 48.2 vs 42.2; Terminal Bench v4.0 5.6 vs 5.6; Terminal Bench v2.1 71.6 vs 73.0; SWE-bench Pro v2 Hard 77.9 vs 73.8; SWE-bench Multilingual 73.7 vs 70.0; SWE-bench Verified 79.2 vs 77.8; SWE-bench Multimodal v2 37.9 vs 37.5; Vibe Code Bench 77.9 vs 64.9; Code Migration 23.2 vs 16.4; Terminal Bench Science 1.4 vs 0.5; PMPP-Hard 455.82 vs 253.59.
- Search/tools: BrowseComp 79.0 vs 61.6; DeepSearchQA 85.3 vs 79.7; MCP Atlas 82.7 vs 77.3; JobBench 49.6 vs 33.4; Diligence Bench 48.6 vs 46.4; Finance Agent v2.1 56.5 vs 47.7; Excel Modeling 66.0 vs 52.8; Tax Agent 14.1 vs 11.6; AA-AnalystAgent 46.3 vs 20.0.
- Where Qwen wins: AA-Briefcase 1263 vs 1391; GDPVal-AA 1319 vs 1427; AutomationBench-AA 41.8 vs 48.2; EnterpriseOps-Gym 42.0 vs 44.2; MMMU Pro 74.9 vs 76.3; Charxiv RQ 80.6/88.3 vs 83.7/90.2; MathVision 89.0 vs 90.0; BVB 68.4 vs 70.7; HLE text 30.7 vs 33.9; GPQA Diamond 86.6 vs 90.5; AA-Omniscience non-hallucination 63.4 vs 71.4; CritPt v2 31.4/17.0 vs 10.6/4.0; ARC-AGI v1/v2 84.5/49.3 vs 87.5/42.4; ComplexConstraints 33.4 vs 35.6; MultiChallenge 50.0 (announcement says behind Qwen).
- Long context: LongBench v2 66.9 vs 52.3; GraphWalks BFS 256K 69.7 vs 50.4; MRCR v2 46.4 vs 38.0.
- Safety: FORTRESS adversarial 89.5 vs 90.3; benign 96.4 vs 89.1; StrongREJECT 97.8 vs 99.0; misbehavior ↓ 9.8% vs 57.7%; covert misbehavior ↓ 8.3% vs 33.2%; destructive actions ↓ 10.2% vs 35.2%.

### Deployment
- Reasoning efforts: none 0.0, minimal 0.1, low 0.2, medium 0.7, high 0.9 (default), xhigh 0.99, max 0.99; custom numeric 0.0–0.99 allowed.
- GGUF (ggml-org/Inkling-2-Mini-GGUF): IQ4_NL recommended, fits 32 GB; Q8_0 near-lossless, more RAM and slower. Unsloth GGUF also available.
- SGLang: SM103, `--attention-backend fa4 --bf16-gemm-backend torch --dtype bfloat16 --tp 1 --page-size 128 --grammar-backend xgrammar`; DSpark 3-layer draft reads decoder visits 5, 23, 41 and final normalized state index 48; add `--speculative-algorithm DSPARK --context-length 131072`.
- Transformers: `AutoModelForMultimodalLM`, `AutoProcessor`; variable-loop uses `text_config={"loop_num_passes": 2}` on `thinkingmachines/TML-d24-varloop-research`.
- MLX upstreamed to mlx-lm; native NVFP4+MXFP8 without reconversion. Tinker for hosted inference/fine-tuning.

### Limitations to carry
- Model card: weaker factual recall than Inkling 2 Small; repetitive reasoning loops; less reliable agentic instruction following and possible destructive actions; weaker non-English output (Chinese clipping/mixing); over-caution on mental-health topics; min effort does not fully disable reasoning; local runtime support for looped models is new and speed varies.
- Announcement: not strongest for multi-turn chat or many-constraint instructions (MultiChallenge 50.0, ComplexConstraints 33.4); trails on CritPt v2 and HLE-Diamond.
- Efficiency claim uses different precisions across models (Inkling MXFP8, Qwen3.6-35B-A3B NVFP4, Gemma-4-26B-A4B NVFP4, Qwen3.5-27B INT4) — disclose.
- All benchmarks are Thinking Machines' own; evaluation setups vary by model; note that looped compute makes "3.4B active" optimistic as a speed predictor.

## Section outline (~14 chapters)

1. Abstract & how to read — thesis: buy reasoning depth with loops instead of parameters.
2. Release context — Nov 20, 2026; open weights; what "mini" means in the family.
3. Architecture: the 24-layer loop — blocks, three passes, message + gate, attention residuals.
4. Side-by-side spec table — Inkling vs Qwen3.8-27B (params, active, layers, attention, MoE, precision, context, footprint, modalities, license).
5. Why loop instead of store facts — knowledge vs reasoning; pruning and healing; compute-equivalent evidence.
6. NVFP4, MXFP8 and the 20 GB checkpoint — trained and deployed at same precision; hardware floor.
7. Agentic coding side by side — full coding table with deltas.
8. Search, tools and knowledge work — BrowseComp/DeepSearchQA/MCP Atlas/JobBench; where Qwen wins.
9. The comparison graphic — side-by-side chart + fallback HTML table.
10. Vision, reasoning and safety — vision table, long-context table, safety table.
11. How loop depth changes behavior — variable-loop model, Think Fast, CoT compression, monitorability.
12. Running it — GGUF, Ollama, MLX, transformers, SGLang, DSpark, reasoning efforts, tool calling.
13. Limitations & risks — model-card and announcement limitations, cross-precision caveat, vendor-run evidence.
14. Verdict, FAQ & sources — who should run it, who should stick with Qwen; FAQ schema; sources with document-dates note.

## Voice & format rules

- Same CSS/header/cover/TOC/table/code/footer patterns as `blog/bonsai-2-5-27b-agentic-deep-dive.html`; `paper-page`, `.ch` headings with anchors, `.tblwrap`, `.mono`, `.callout`, theme key `inkling2-mini-paper-theme`.
- Concrete numbers and file names over adjectives; vendor claims labelled; differences disclosed rather than smoothed.
- Author Hussain Nazary; datePublished/dateModified 2026-11-26; TechArticle + FAQPage + BreadcrumbList JSON-LD; canonical/OG/Twitter pointing at hero.

## Verification plan

1. Re-check every figure above against sources 1–3 before delivery.
2. Validate XML/JSON-LD, TOC anchors, relative links, image loads.
3. Render locally over HTTP at desktop and 375 px; confirm no overflow.
4. Confirm every relative link resolves; external sources reachable.
5. Commit and push; rebase if remote moved.
