# Ternary Bonsai 2.5 27B side-by-side deep-dive blog post — design spec

Date: 2026-11-26
Status: approved by user on 2026-11-26 (format = HTML paper-style post; depth = full deep dive; images = hero + comparison graphic)

## Goal

A deep-dive technical blog post about **Ternary Bonsai 2.5 27B** (Prism ML, released 2026-11-24), written for a technical local-AI audience, with the previous release **Bonsai 2 27B** compared side by side in every results chapter. The post lives next to the existing `blog/bonsai-2-27b-ternary-quantization-deep-dive.html` and cross-links to it.

Thesis: Bonsai 2.5 changes nothing about the weights — same Qwen3.8-27B hybrid-attention base, same ternary g128 format, same 1.76 bpw, same 5.93 GB — and changes almost everything about how the model behaves on a long agentic task. The story is "same footprint, agentic behavior recovered," not "a smaller model."

## Deliverables

- `blog/bonsai-2-5-27b-agentic-deep-dive.html` — standalone `paper-page` article using the same CSS/header/footer/related-posts pattern as the Bonsai 2 post, full SEO/JSON-LD scaffolding.
- `blog/bonsai-2-5-27b-hero.png` — 1200×630 OG hero (agentic/tool-use theme, Bonsai 2 → 2.5 framing).
- `blog/bonsai-2-5-vs-2-comparison.png` — side-by-side benchmark graphic (FP16 / Bonsai 2 / Bonsai 2.5) embedded in the results chapter.
- Registration in `blog.html` (JSON-LD item + article card, newest first), `feed.xml`, `sitemap.xml`, `new-posts.txt` if that file tracks recent posts.
- No git push; commit only if the user asks (per existing spec convention).

## Source of truth

Web research performed 2026-11-26. Primary sources:

| # | Source | URL |
| --- | --- | --- |
| 1 | PrismML whitepaper (Nov 2026) | https://raw.githubusercontent.com/PrismML-Eng/Bonsai-demo/main/bonsai-2-5-27b-whitepaper.pdf |
| 2 | PrismML docs model page | https://docs.prismml.com/models/bonsai-2-5-27b |
| 3 | Hugging Face GGUF model card | https://huggingface.co/prism-ml/Ternary-Bonsai-2.5-27B-GGUF |
| 4 | Hugging Face MLX model card | https://huggingface.co/prism-ml/Ternary-Bonsai-2.5-27B-mlx-2bit |
| 5 | PrismML announcement | https://prismml.com/news/bonsai-2-5-27b |
| 6 | PrismML press release | https://prismml.com/news/prismml-launches-ternary-bonsai-2-5-27b |
| 7 | 9to5Mac coverage | https://9to5mac.com/2026/11/24/prismmls-bonsai-2-5-brings-better-coding-and-tool-use-to-on-device-ai/ |
| 8 | The Decoder coverage | https://the-decoder.com/prismml-squeezes-an-agent-based-coding-model-with-27-billion-parameters-into-5-9-gb/ |
| 9 | eesel AI review (caveats) | https://www.eesel.ai/blog/ternary-bonsai-2-5-review |
| 10 | Tested Intelligence review (caveats) | https://testedintelligence.com/ternary-bonsai-2-5-27b-review-2026/ |
| 11 | Atomic Chat run guide | https://atomic.chat/blog/guides/how-to-run-bonsai-2-5-locally |
| 12 | Prior Bonsai 2 27B report (local) | `blog/bonsai-2-27b-ternary-quantization-deep-dive.html` |

Every numeric claim must be traced to one of these. Distinguish "vendor-run" figures from independent verification explicitly.

## Facts to use verbatim (fact gate before delivery)

### Identity — unchanged from Bonsai 2

| Item | Value |
| --- | --- |
| Base model | Qwen3.8-27B, hybrid-attention causal LM, architecture unchanged |
| Parameters | 27.36B total = 24.35B language (64 blocks) + 0.47B vision tower (27 blocks) + 2.54B embedding/lm-head |
| Architecture | Hybrid attention (~75% linear / ~25% full), SwiGLU MLP, RoPE, RMSNorm |
| Context | 262,144 tokens |
| Weight format | Ternary g128, FP16 scale per 128 weights, blockwise Hadamard rotation folded into stored weights |
| Size | 1.76 bits per weight, 5.93 GB in `PTQ1_0` (FP16 base = 53.8 GB) |
| Modalities | Text + image in, text out |
| Reasoning efforts | `xhigh` (default) or `medium`; `low` not supported (behaves close to `xhigh`) |
| License | Apache 2.0 |

### What changed (marked with dagger in source tables)

- Focus: agentic and tool-use tasks.
- Speculative decoding: MTP draft head included in every GGUF file; 1.5–1.8× decode speedup on NVIDIA GPUs, output matches plain decoding up to rounding noise. Separate `-mtp` GGUF repo also exists.
- Recommended decoding (thinking mode): temperature 1.0, top-p 0.95, top-k 20, min-p 0.0, presence penalty 0.0, repetition penalty 1.0. Bonsai 2 recommended `min_p = 0.05`; llama.cpp still applies 0.05 by default, so pass `--min-p 0` explicitly.
- `Q2_0` packing now sits in the main GGUF repo alongside `PTQ1_0` and `PQ2_0`; runs on stock llama.cpp `b11556` or newer (older builds load without warning and produce garbage — check `llama-cli --version`).
- Bonsai 2 weights remain at `prism-ml/Ternary-Bonsai-2-27B-gguf` and `-mlx-2bit`.

### Packings

| File | Size | Runtime |
| --- | --- | --- |
| `Ternary-Bonsai-2.5-27B-PTQ1_0.gguf` | 5.93 GB | PrismML llama.cpp binaries (upstream review pending) |
| `Ternary-Bonsai-2.5-27B-PQ2_0.gguf` | ~7.2 GB | PrismML llama.cpp binaries; source of MLX export |
| `Ternary-Bonsai-2.5-27B-Q2_0.gguf` | ~7.6 GB | Upstream llama.cpp `b11556`+ |
| MLX 2-bit pack | ~8.9 GB Apple silicon package | Mac / iPhone / iPad via MLX; text-only language model + FP16 vision tower, optional v2 MTP head |

### Agentic tool calling (%, thinking mode, xhigh)

| Benchmark | FP16 | Bonsai 2 | Bonsai 2.5 |
| --- | --- | --- | --- |
| τ²-Bench | 80.6 | 80.2 | 82.0 |
| τ³-Bench | 72.8 | 69.1 | 73.9 |
| BFCL v3 (native) | 71.2 | 70.3 | 72.6 |
| BFCL v4 | 70.8 | 64.4 | 67.2 |
| AppWorld | 93.2 | 51.2 | 90.5 |
| Average (5) | 77.7 | 67.0 | 77.2 |

Detail: AppWorld scenario completion 89.3% for 2.5 vs 80.4% for IQ3_XXS and 75.0% for IQ2_S. GSQ-RCO IQ2_XS scores 79.5 on τ²-Bench but 46.5 on AppWorld — writes a long script that guesses API calls and marks the task complete before seeing output in about 1 task in 5. BFCL v4 is the exception: 2.5 trails FP16 by 3.6 and IQ2_S by 0.5.

### Agentic coding (%, thinking mode, xhigh)

| Benchmark | FP16 | Bonsai 2 | Bonsai 2.5 |
| --- | --- | --- | --- |
| Terminal-Bench 2.1 | 70.8 | 52.8 | 60.1 |
| SWE-bench Verified | 80.6 | 60.8 | 75.6 |
| DeepSWE 1.1 | 30.1 | 0.0 | 27.0 |
| Average (3) | 60.5 | 37.9 | 54.2 |

Framing: Bonsai 2 kept 63% of FP16 on this suite and solved zero DeepSWE tasks; 2.5 keeps 90% (SWE-bench 94%, DeepSWE 90%, Terminal-Bench 85%).

### General capability by category (%, thinking mode — model card figures)

| Category | Benchmarks | FP16 | Bonsai 2 | Bonsai 2.5 |
| --- | --- | --- | --- | --- |
| Knowledge & reasoning | MMLU-Redux, GPQA Diamond, AA-LCR | 86.67 | 83.80 | 84.27 |
| Math | AIME26, HMMT26 | 93.15 | 89.00 | 90.10 |
| Coding | LiveCodeBench v6, BigCodeBench | 74.55 | 70.50 | 71.65 |
| Instruction following | IFBench, IFEval | 81.15 | 82.55 | 80.90 |
| Vision | 7 benchmarks incl. MMMU-Pro, CharXiv | 86.07 | 81.89 | 83.66 |
| Average (5 categories) | | 84.32 | 81.55 | 82.12 |

Note explicitly: docs/whitepaper quote the suite average as 84.4 / 82.3 and press as 84.4 / 82.1 — rounding and a 14-vs-16 benchmark count differ between sources; use the model-card table above as canonical and disclose the discrepancy. Per-benchmark regressions to call out: LiveCodeBench v6 83.8 → 83.0; BigCodeBench 57.2 → 60.3.

### Throughput

- MTP draft head: 1.5–1.8× decode speedup on NVIDIA GPUs.
- With MTP and kernels "now in testing": 2.3–3.0× faster decode than on Bonsai 2's release day on six of seven NVIDIA GPUs measured; ~300 tok/s on H200 and B200.
- Bonsai 2 release-day reference: ~143 tok/s on RTX 5090 (from prior post).

### Methodology caveats (must appear)

- τ²/τ³ now use a thinking-mode user simulator and BFCL v3 uses native tool calls, so these agentic figures are **not comparable with the original Bonsai 2 report**; the Bonsai 2 column here is a re-run under the new harness.
- All figures are PrismML's own (vendor-run), thinking mode `xhigh`, pass@1, reasoning block stripped before grading, EvalScope + vLLM on H100. No independent leaderboard entry on launch day (eesel AI), and reviewers advise treating the numbers as claims to verify on your own hardware (Tested Intelligence).
- Terminal-Bench 2.1 is the agentic benchmark furthest from FP16.
- Unmeasured horizons: MLE-bench, VendingBench, SWE-bench Pro (hours-long, multi-context-window work). Bonsai 2 kernel/KV-cache roadmap still applies: PTQ1_0 parity with PQ2_0, sub-4-bit KV caches, remove activation-side rotation overhead at batch size 1.

## Section outline (~14 chapters)

1. Abstract & how to read — the "same weights, different behavior" thesis; what the side-by-side tables mean.
2. Release context — Nov 24, 2026; agentic release of the Ternary Bonsai 27B line; where Bonsai 2 weights remain.
3. What stayed the same — base model, parameter split, hybrid attention, ternary g128, Hadamard rotation, 5.93 GB, 262K context, modalities, license. Cross-link to Bonsai 2 report for the format deep dive.
4. What changed — agentic focus, MTP draft head, sampling defaults, Q2_0 packaging, runtime support. Side-by-side "at a glance" spec table.
5. Why agentic work is the hard case — error compounding across tool calls, over-thinking/repetition, why a 0 on DeepSWE matters.
6. Agentic tool calling — full side-by-side table + AppWorld scenario analysis + failure-mode examples.
7. Agentic coding — full side-by-side table + retention percentages (63% → 90%).
8. General capability — category table, regressions, rounding discrepancy disclosure.
9. The big comparison graphic — embedded `bonsai-2-5-vs-2-comparison.png` with an HTML fallback table.
10. Throughput & speculative decoding — MTP mechanism, 1.5–1.8×, 2.3–3.0× vs release day, ~300 tok/s H200/B200; what "kernels in testing" means.
11. Packings & runtime changes — PTQ1_0 / PQ2_0 / Q2_0, stock llama.cpp `b11556` warning, MLX ~8.9 GB Apple package, vision tower as separate mmproj.
12. Deployment field guide — llama.cpp commands with `--min-p 0`, thinking vs instruct sampling table, MTP build, MLX Python snippet, API/serving notes.
13. Limitations, reception & roadmap — vendor-run caveat, BFCL v4/LiveCodeBench regressions, unmeasured horizons, kernel/KV roadmap, press reception.
14. Verdict + FAQ + sources — who should upgrade, who should stay on Bonsai 2; FAQ schema mirrored in head; sources table with document-dates note.

## Voice & format rules

- Follow the Bonsai 2 post's visual/structural language: `.paper-page`, `.ch` numbered chapter headings with anchors, `.table-scroll` for tables, `.mono` for literals, cover block, TOC, "Need help with this?" block, related posts, contact block.
- Second-person-adjacent engineer voice; concrete numbers and file names over adjectives; disclose vendor-run figures and caveats at the point of use, not only at the end.
- Head mirrors prior post: TechArticle JSON-LD (author Hussain Nazary, `datePublished` 2026-11-26, `dateModified` 2026-11-26, `wordCount` ~14000, `mainEntityOfPage`, publisher, image), FAQPage JSON-LD, BreadcrumbList, canonical/OG/Twitter/hreflang tags, keywords.
- All image references relative (`bonsai-2-5-...png`) from `blog/`; external URLs in sources are absolute.
- Title: "Ternary Bonsai 2.5 27B: FP16-Level Agents in 5.93 GB — A Side-by-Side Deep Dive".

## Verification plan

1. Facts gate: re-check every number in the "Facts to use verbatim" tables against sources 1–4; fix mismatches before delivery.
2. Render locally (`python -m http.server` in repo root, open the post) and screenshot at desktop width; check TOC anchors, tables, graphic, code blocks, theme toggle.
3. Link check: relative hrefs resolve; external source URLs reachable; canonical/OG URLs match the final filename.
4. Validate `blog.html`, `feed.xml`, `sitemap.xml` remain well-formed after registration edits.
5. Confirm the hero and comparison images are under 400 KB each where practical and have descriptive alt text.
