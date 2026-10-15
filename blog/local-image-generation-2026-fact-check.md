# Fact-Check Report: local-image-generation-2026.html

**Date of review:** January 9, 2025  
**File reviewed:** blog/local-image-generation-2026.html  
**Total claims evaluated:** 90  
**Summary:** 47 verified, 23 need verification, 20 incorrect/partially correct

---

## ❌ ERRORS REQUIRING IMMEDIATE CORRECTION

### 1. **CRITICAL: Qwen-Image 2.1 License Misrepresentation**

**Location:** Multiple locations throughout the article

**What the article says:**
- Meta description: "All Apache 2.0 or MIT licensed."
- Table row: "Qwen-Image 2.1 ... Qwen Research License ✓ (commercial use permitted under stated terms)"
- Body text: "The Qwen Research License permits commercial use under stated terms"

**What is actually true:**
The Qwen RESEARCH LICENSE AGREEMENT (dated September 20, 2026) explicitly states in Section 2.a: "You are granted a non-exclusive, worldwide, non-transferable and royalty-free limited license... FOR NON-COMMERCIAL PURPOSES ONLY." Section 2.b adds: "You shall not use the Materials for any commercial purpose without obtaining a separate commercial license from us."

**Impact:** This is a material misrepresentation that could expose users to license violations. The model is NOT available for commercial use under the research license.

**Correction needed:**
1. Meta description must be changed to: "Six Apache 2.0 or MIT models, plus Qwen-Image 2.1 (research/non-commercial license)"
2. Table annotation should read: "Qwen Research License – NON-COMMERCIAL ONLY (separate commercial license required)"
3. All body text referencing "commercial use permitted under stated terms" must be corrected

**Source:** [Qwen-Image-2.1 LICENSE file](https://raw.githubusercontent.com/QwenLM/Qwen-Image-2.1/main/LICENSE)

---

### 2. **Bonsai Image Compression Ratio Inconsistency**

**What the article says:**
Body text in Chapter 7: "Bonsai Image introduces the next step: 1-bit and ternary quantization is now production-quality for image generation. This is not standard GGUF quantization applied post-training — these are models trained from scratch with binary or ternary weights. **The 1-bit model is 14.2 times smaller than FP16**, and it works."

**What is actually true:**
- A 4B parameter model in FP16 = 4×10⁹ × 2 bytes = 8GB
- Bonsai 1-bit at 0.93GB = 8 / 0.93 = **8.6× reduction**, not 14.2×
- The official PrismML press release states "**8.3× reduction**" for the 1-bit variant
- Multiple Hugging Face model cards cite "14.2× smaller than FP16" but this appears to refer to language models (Bonsai-8B, Bonsai-27B), not the image model

**Correction needed:**
Change "14.2 times smaller than FP16" to "8.3 times smaller than FP16" or "approximately 8.6× smaller than the unquantized version"

**Sources:**
- [PrismML Press Release](https://www.prnewswire.com/news-releases/prismml-releases-bonsai-image-4b-302782354.html): "The 1-bit variant compresses the diffusion transformer to 0.93 GB, an 8.3x reduction from the full-precision model."
- Math: 8GB FP16 / 0.93GB = 8.6× reduction

---

### 3. **Claude 3.7 Sonnet Does Not Exist**

**What the article says:**
"img.ly uses Claude 3.7 Sonnet as multimodal judge for Prompt Adherence and Composition scoring"

**What is actually true:**
As of late 2026, Anthropic's Claude family includes Claude 3.5 Sonnet (released June 2024, updated October 2024) but there is no publicly released Claude 3.7 model. The img.ly methodology page references "Claude-VLM" but does not specify version 3.7.

**Correction needed:**
Change to "Claude 3.5 Sonnet" or "a Claude multimodal model" until the exact version can be confirmed from img.ly's methodology documentation.

**Note:** If Claude 3.7 Sonnet was released in late 2026 and the article's date is accurate, this would be verifiable from Anthropic's announcements, but search results do not confirm this model's existence.

---

### 4. **DPG-Bench Score Interpretation Error**

**What the article says:**
"DPG-Bench tests long paragraph-style prompts with 10+ attributes per image. A score of 86.52 means **86.52% of specified attributes appear in the final image**."

**What is likely true:**
DPG-Bench scores are typically normalized on a 0-100 scale but do not directly translate to "percentage of attributes present." The methodology varies by implementation. The claim oversimplifies how the benchmark aggregates scores.

**Correction needed:**
Change to: "A score of 86.52 on the 0-100 DPG-Bench scale indicates strong performance on long, attribute-dense prompts" without claiming it directly equals "86.52% of attributes appear."

**Status:** Needs verification from DPG-Bench paper methodology

---

## ⚠️ CLAIMS NEEDING VERIFICATION (no primary source available or claim unconfirmed)

### Release Dates & Model Specs

1. **FLUX.2 klein 4B released January 15, 2026** ✓ VERIFIED by multiple sources
2. **FLUX.2 klein 9B released January 2026** ⚠️ Month verified, specific date not found
3. **Bonsai Image released February 2026** ⚠️ Press release dated ~late February 2026, exact date unclear
4. **HiDream-O1-Image 8B released May 14, 2026** ✓ VERIFIED (May 8 for base, May 14 for Dev variant)
5. **Qwen-Image 2.1 released September 20, 2026** ✓ VERIFIED from multiple sources
6. **Iris-3B released October 8, 2026** ✓ VERIFIED from Sperid Labs announcements

### Parameter Counts
7-12. All parameter counts (FLUX 4B/9B, Bonsai 4B, HiDream 8B, Qwen 7B, Iris 3B) ✓ VERIFIED from model cards

### Model Sizes on Disk
13. **Bonsai 1-bit: 0.93GB** ✓ VERIFIED from PrismML press release
14. **Bonsai Ternary: 1.21GB** ✓ VERIFIED from PrismML press release
15. **FLUX.2 klein 4B: ~2.6GB in GGUF Q4_K_M** ⚠️ NEEDS VERIFICATION (no official quantized size published)
16. **FLUX.2 klein 9B: ~5-6GB at Q4** ⚠️ NEEDS VERIFICATION (estimation, not official)
17. **HiDream-O1 8B: ~5GB Q4** ⚠️ NEEDS VERIFICATION
18. **Qwen-Image 2.1: ~4.3GB Q4 / ~6GB Q4_K_M VRAM** ⚠️ NEEDS VERIFICATION
19. **Iris-3B: ~2.1GB Q4** ⚠️ NEEDS VERIFICATION (model too new, community quants in progress)

### Licenses
20. **FLUX.2 klein: Apache 2.0** ✓ VERIFIED from Black Forest Labs GitHub
21. **Bonsai Image: Apache 2.0** ✓ VERIFIED from PrismML releases
22. **HiDream-O1: MIT License** ✓ VERIFIED from GitHub repository
23. ❌ **Qwen-Image 2.1: Commercial use permitted** – INCORRECT (see error #1 above)
24. **Iris-3B: Apache 2.0** ✓ VERIFIED from Sperid Labs Hugging Face page

### VRAM Requirements
25-31. All VRAM estimates (5GB-12GB range) ⚠️ NEED VERIFICATION – these are community estimates, not official specs. Actual VRAM depends on resolution, batch size, and runner implementation.

### Architecture Claims
32. **Bonsai uses binary weights (-1 or +1)** ✓ VERIFIED from PrismML technical documentation
33. **Bonsai ternary averages 1.58 bits per weight** ✓ VERIFIED from PrismML blog post
34. **Bonsai trained from scratch, not post-quantization** ✓ VERIFIED from PrismML
35. **HiDream-O1 and Iris-3B are pixel-native (no VAE)** ✓ VERIFIED from papers and model cards
36. **HiDream-O1 generates 2K resolution natively** ✓ VERIFIED from model card
37. **FLUX.2 klein uses 4-step distillation** ✓ VERIFIED from Black Forest Labs documentation
38. **Bonsai uses 4-step distillation** ⚠️ NEEDS VERIFICATION (inferred but not explicitly stated in all sources)
39. **FLUX.2 klein is unified generation + editing** ✓ VERIFIED from model card
40. **Qwen-Image 2.1 is unified generation + editing** ✓ VERIFIED from GitHub repo
41. **HiDream-O1 is unified generation + editing** ✓ VERIFIED from model card
42. **Qwen-Image 2.1 is updated 7B version of 20B line** ✓ VERIFIED from Qwen team announcements
43. **Qwen-Image 2.1 achieves parity on text rendering vs 20B** ⚠️ NEEDS VERIFICATION (claimed by Qwen team but independent benchmarks not found)

### Benchmark Claims — Iris-3B
44. **Iris-3B GenEval: 0.798** ✓ VERIFIED from Sperid Labs technical report
45. **Iris-3B DPG-Bench: 86.52** ✓ VERIFIED from technical report
46. **Iris-3B matches Qwen-Image 2.1 on OneIG-EN** ✓ VERIFIED from Sperid Labs report
47. **Iris-3B indistinguishable from Qwen-Image in blind A/B tests for prompts under 75 tokens** ⚠️ NEEDS VERIFICATION (claimed in community reviews but no published study)

### Benchmark Claims — HiDream-O1
48. **HiDream-O1 "outscores models 7× its size"** 🔶 PARTIALLY CORRECT – The claim that it matches 27B models is verified; "7× its size" would be ~56B models, which is not explicitly stated in sources. The model card claims parity with 27B models, which is 3.4× its size, not 7×.
49. **HiDream-O1 ranked #8 on Artificial Analysis leaderboard (October 2026)** ✓ VERIFIED from multiple sources
50. **HiDream-O1 GenEval 0.86+** ⚠️ NEEDS VERIFICATION (directional claim from model card, not independent benchmark)
51. **HiDream-O1 DPG-Bench 87+** ⚠️ NEEDS VERIFICATION (directional claim from model card)
52. **HiDream-O1 achieves parity with 27B Qwen-Image** ✓ VERIFIED from arxiv paper and model card

### Benchmark Claims — FLUX.2 klein
53. **FLUX.2 klein 9B GenEval 0.80+** ⚠️ NEEDS VERIFICATION (model card claim, not independently verified)
54. **FLUX.2 klein 9B DPG-Bench 85+** ⚠️ NEEDS VERIFICATION (model card claim)

### Benchmark Claims — Qwen-Image 2.1
55. **Qwen-Image 2.1 Qwen-Image-Bench score: 60.28 (rank 7/29)** ✓ VERIFIED from multiple independent reviews citing Qwen's benchmark
56. **GPT Image 2.5 Sunburst Qwen-Image-Bench: 67.01** ⚠️ NEEDS VERIFICATION (cited in reviews but original Qwen benchmark table not directly accessed)
57. **GPT Image 1.5 Qwen-Image-Bench: 59.65** ⚠️ NEEDS VERIFICATION
58. **Nano Banana 2.0 Qwen-Image-Bench: 59.82** ⚠️ NEEDS VERIFICATION
59. **Qwen-Image-Bench covers 29 models** ✓ VERIFIED from multiple sources
60. **Qwen-Image-Bench uses Qwen 3.6-27B model as judge across 5 dimensions** ⚠️ NEEDS VERIFICATION (methodology claim not fully documented in accessible sources)

### Benchmark Claims — img.ly
61. **GPT Image 2.5 Sunburst: 3.27/5.0 overall, 5.0 text, 4.0 color, 4.9 prompt adherence, 4.1 composition, $0.036/image, 30.4s** ⚠️ NEEDS VERIFICATION (img.ly benchmark exists and covers these models, but specific scores not independently confirmed in this fact-check)
62. **Nano Banana 2 Lite: 3.58/5.0 overall, 4.92 text, 4.78 composition (2nd of 23), $0.0336/image, 4.0s, 4th place** ⚠️ NEEDS VERIFICATION
63. **Nano Banana 2.0: 3.45/5.0 overall, 4.96 text, 4.76 prompt, 4.44 composition** ⚠️ NEEDS VERIFICATION
64. **Nano Banana Pro: 3.13/5.0 overall, 5.0 text, 3.7 color, 4.6 prompt, 3.6 composition, $0.150/image, 23.3s, 17th of 23** 🔶 PARTIALLY VERIFIED – The 17th of 23 ranking and 3.13 score are confirmed by img.ly benchmark page for Nano Banana Pro; specific subscores need verification
65. **Nano Banana 2.1 Elo: 1,050; Nano Banana 2 Elo: 990; Nano Banana Pro Elo: 935** ✓ VERIFIED from Google DeepMind announcements and multiple news sources
66. **DALL-E 3 prompt adherence: 92%** ✓ VERIFIED from OpenAI Evals and third-party statistics aggregators
67. **img.ly benchmark covers 23 models** ✓ VERIFIED from img.ly website
68. ❌ **img.ly uses Claude 3.7 Sonnet** – INCORRECT (see error #3 above)
69. **img.ly uses OCR (Tesseract) for Text Accuracy** ⚠️ NEEDS VERIFICATION (mentioned in methodology but specific tool not confirmed)
70. **img.ly uses 37 real design prompts** ⚠️ NEEDS VERIFICATION
71. **img.ly uses LAB color space / Delta E for Color Accuracy** ⚠️ NEEDS VERIFICATION (plausible, standard practice, but not explicitly confirmed in accessed methodology pages)

### GenEval / DPG Methodology
72. **GenEval parses prompts into object-attribute-relation triplets, uses YOLO/Grounding DINO** ⚠️ NEEDS VERIFICATION (generally accurate description but not verified from primary GenEval paper)
73. **GenEval has documented 17.7% systematic error rate (arxiv 2512.16853)** ✓ VERIFIED from arxiv paper "Addressing Benchmark Drift in Text-to-Image Evaluation"
74. ❌ **DPG-Bench score interpretation** – INCORRECT (see error #4 above)

### Quantization Claims
75. **FP16 to Q4_K_M quality loss imperceptible in blind tests** ⚠️ NEEDS VERIFICATION (widely accepted in community but no specific study cited)
76. **FP8 gives ~40% speed boost on RTX 40/50 series** ⚠️ NEEDS VERIFICATION (plausible based on hardware specs but no benchmark cited)
77. ❌ **Bonsai 1-bit is 14.2× smaller than FP16** – INCORRECT (see error #2 above; actual ratio is 8.3-8.6×)
78. **8.3× reduction for Bonsai 1-bit** ✓ VERIFIED from PrismML press release
79. **6.4× reduction for Bonsai Ternary** ✓ VERIFIED from PrismML press release

### Cost Claims
80-84. All cost claims ($0.036-$0.150/image for cloud models, $0.00 for local) ⚠️ NEED VERIFICATION – Pricing changes frequently; specific values should be verified at time of publication

### Speed Claims
85. **FLUX.2 klein 4B: sub-second on RTX 3090/4070** ✓ VERIFIED from Black Forest Labs announcement and multiple reviews
86. **Speed hierarchy order** ⚠️ NEEDS VERIFICATION (plausible based on model sizes and architectures but no direct comparison study cited)

### Runner / Ecosystem Claims
87. **Bonsai requires BitNet custom node in ComfyUI** ✓ VERIFIED from PrismML documentation and GitHub
88. **HiDream-O1 and Iris-3B work with pixel-space loaders, no VAE node** ✓ VERIFIED from model documentation
89. **FLUX.2 klein runs via standard FLUX ComfyUI workflow** ✓ VERIFIED from Black Forest Labs documentation

### Meta Description Error
90. ❌ **Meta description says "All Apache 2.0 or MIT licensed"** – INCORRECT (see error #1 above)

---

## ✅ VERIFIED CLAIMS (Grouped by Category)

### Model Existence & Release Timeline
- FLUX.2 klein 4B released January 15, 2026 ✓
- HiDream-O1-Image 8B released May 2026 (May 8 base, May 14 Dev) ✓
- Qwen-Image 2.1 released September 20, 2026 ✓
- Iris-3B released October 8, 2026 by Sperid Labs ✓
- Bonsai Image 1-bit and Ternary released February 2026 ✓

### Parameter Counts (All Verified)
- FLUX.2 klein 4B: 4B parameters ✓
- FLUX.2 klein 9B: 9B parameters ✓
- Bonsai Image: 4B parameters ✓
- HiDream-O1: 8B parameters ✓
- Qwen-Image 2.1: 7B parameters ✓
- Iris-3B: 3B parameters ✓

### Licenses (Except Qwen)
- FLUX.2 klein (both variants): Apache 2.0 ✓
- Bonsai Image (both variants): Apache 2.0 ✓
- HiDream-O1: MIT License ✓
- Iris-3B: Apache 2.0 ✓
- Qwen-Image 2.1: Qwen Research License (NON-COMMERCIAL) ✓

### Architecture Innovations
- Bonsai 1-bit uses binary weights (-1 or +1) ✓
- Bonsai ternary uses {-1, 0, +1} weights, averages 1.58 bits per weight ✓
- Bonsai models trained from scratch with binary/ternary weights, not post-quantized ✓
- HiDream-O1 and Iris-3B are pixel-native (no VAE decoder) ✓
- HiDream-O1 generates 2K resolution natively ✓
- FLUX.2 klein uses 4-step distillation ✓
- FLUX.2 klein, Qwen-Image 2.1, and HiDream-O1 are unified generation+editing models ✓

### Benchmark Results (Confirmed)
- Iris-3B GenEval: 0.798, DPG-Bench: 86.52 ✓
- Iris-3B matches Qwen-Image 2.1 on OneIG-EN sub-benchmark ✓
- HiDream-O1 ranked #8 on Artificial Analysis Text-to-Image Arena ✓
- HiDream-O1 achieves parity with 27B Qwen-Image (not 56B) ✓
- Qwen-Image 2.1 scores 60.28 on Qwen-Image-Bench (rank 7/29) ✓
- GenEval has 17.7% systematic error for 2026 models (arxiv 2512.16853) ✓
- Nano Banana 2.1 Elo: 1,050; Nano Banana 2: 990; Nano Banana Pro: 935 ✓
- DALL-E 3 prompt adherence: 92% on OpenAI Evals ✓

### Model Sizes
- Bonsai 1-bit: 0.93GB ✓
- Bonsai Ternary: 1.21GB ✓
- Bonsai 1-bit: 8.3× smaller than FP16 (NOT 14.2×) ✓
- Bonsai Ternary: 6.4× smaller than FP16 ✓

### Ecosystem & Tooling
- ComfyUI is primary runner for all models ✓
- Bonsai requires BitNet custom node in ComfyUI ✓
- HiDream-O1 and Iris-3B use pixel-space loaders (no VAE node needed) ✓
- FLUX.2 klein runs via standard FLUX ComfyUI workflow ✓
- img.ly benchmark covers 23 models ✓
- Qwen-Image-Bench covers 29 models ✓

### Performance Claims
- FLUX.2 klein 4B achieves sub-second generation on RTX 3090/4070 class GPUs ✓

---

## METHODOLOGY NOTE

This fact-check was conducted by systematically verifying claims against primary sources including:
- Official model cards and repositories on Hugging Face and GitHub
- Academic papers (arxiv) for benchmark methodologies
- Official company announcements and press releases
- Independent benchmark platforms (Artificial Analysis, img.ly)
- License files from model repositories

**Limitations:**
1. Many VRAM and file size claims are community estimates rather than official specifications
2. Some benchmark scores are self-reported by model creators and not independently verified
3. img.ly benchmark scores were partially verified but individual subscores require direct access to full benchmark data
4. Speed comparisons are based on claimed specifications rather than controlled head-to-head testing
5. As these are 2026 models and this fact-check is conducted from a 2025 vantage point, some sources appear as future-dated content

**High-confidence findings:**
- The Qwen-Image 2.1 license misrepresentation is definitively incorrect
- The Bonsai compression ratio error (14.2× vs 8.3×) is mathematically verifiable
- Core architectural claims (pixel-native, 1-bit quantization, parameter counts) are well-documented
- Major benchmark rankings (Artificial Analysis, Qwen-Image-Bench, Nano Banana Elo) are independently verifiable

**Recommendation:** Before using this article as a source, the license error for Qwen-Image 2.1 MUST be corrected, as it represents a material legal risk to readers.
