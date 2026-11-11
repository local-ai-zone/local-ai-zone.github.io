# Voice Models Blog Post Enhancement Review

**Verdict**: APPROVED

## Summary

The voice models blog post now matches the benchmark methodology depth and structural patterns of the reference image generation post. All four required additions are present, correctly styled, and accurate: the "What each score means" metrics table (5 voice-specific metrics: Elo, WER, RTFx, TTFB, MOS), three detailed methodology callout boxes explaining how Speech Arena, Open ASR Leaderboard, and TTFB/MOS scores are measured, a VRAM requirements table for 7 TTS models distinguishing CPU-only from GPU models, and cost comparison tables for both TTS and STT with cloud services in red rows and local models in green rows. The HTML is well-formed with no unclosed tags, all CSS classes match the existing page patterns (.tblwrap, .callout.info, .small, danger-bg/ok-bg inline styles), and the existing content remains intact.

**Watch for:** None — all deliverables are present and correct.

## High-level view

The metrics explanation table and methodology callouts transform chapter 03 from a brief two-paragraph introduction into a comprehensive benchmark literacy section. Readers now understand exactly what Elo points mean in human-preference terms (a 60-point gap = 66% win rate in pairwise matchups), how WER is calculated across eight standardized test sets, why RTFx numbers from batched A100 evaluation won't transfer to single-file laptop transcription, and why MOS is directional rather than definitive. The VRAM table in chapter 08 answers the immediate "can I run this?" question before code examples, clearly flagging Kokoro and VoxCPM2 as CPU-only options and showing Breeze TTS 2's 7.7GB measured floor against its 12GB stated requirement. The cost tables in chapter 09 make the 143× TTS advantage concrete (ElevenLabs $100/1M chars vs $0 local, styled with red cloud rows and green local rows) and present the more nuanced STT case where $0.21/hour AssemblyAI is the honest benchmark, not $0.

<details>
<summary>Issues (0)</summary>

No blocking issues or concerns. All required additions are present, accurate, and correctly implemented.

</details>

<details>
<summary>Details</summary>

## Metrics explanation table — chapter 03

The "What each score means — in plain English" table appears immediately after the two-boards introduction paragraph and before the Elo leaderboard. The table defines five metrics (Speech Arena Elo, WER, RTFx, TTFB, MOS) with scale, plain-English meaning, and concrete examples. Each row translates technical metrics into human-readable outcomes: "1,215 Elo beats 1,177 Elo by a margin humans consistently hear" for Elo, "6.32% = 6 words wrong per 100" for WER, "3,332× = transcribing a 1-hour recording takes 1.08 seconds of compute" for RTFx. The examples use actual model names and numbers from the article (Breeze TTS 2 vs ElevenLabs, Parakeet vs Whisper), grounding the explanation in the specific comparisons readers will encounter three paragraphs later.

The table follows the exact HTML structure of the image post: `<h3>What each score means &mdash; in plain English</h3>` followed by `<div class="tblwrap"><table>` with thead/tbody.

## Methodology callout boxes — chapter 03

Three blue info callout boxes appear immediately after the metrics table, before the Elo leaderboard table. Each callout has a `<span class="lab">` label and detailed explanation of measurement methodology.

**Speech Arena box** explains the blind A/B pairwise comparison system, the Elo adjustment mechanism (60-point difference = 66% win rate), and the critical two-board distinction: Provider Voices (each model with its own voice bank) vs Controlled Voice (everyone clones the same eight reference voices). The "Why two boards matter" paragraph surface the key behavioral finding: Breeze TTS 2's 90-point lead on Provider Voices collapses to a three-way tie at 1,000–1,010 on Controlled Voice, meaning its built-in voice bank is excellent but its cloning is ordinary. This is not obvious from the main Elo table and would be easy to miss without the methodology section.

**Open ASR Leaderboard box** specifies the eight test sets (LibriSpeech test-clean and test-other, AMI, Earnings22, TEDLIUM, Voxpopuli, CORAAL, Common Voice 9), the WER calculation formula (substitutions + deletions + insertions / total reference words), and the RTFx measurement conditions (batch mode on A100 GPU). The "Important" warning flags the batch vs single-file discrepancy: you won't see 3,332× on a laptop transcribing one file because single-file processing cannot fill a batch — the RTFx ordering survives, the absolute number does not. The "Why batch vs single-file matters" paragraph repeats this in different words, which is deliberate redundancy given how often this is misunderstood.

**TTFB and MOS box** defines Time To First Byte as stopwatch-measured latency from API call to first audio byte available, distinguishes streaming TTS (TTFB can be 200ms while generation continues) from batch TTS (TTFB equals total generation time), and explains MOS as mean rating from human listening panels on a 1–5 scale. The "Why MOS is vendor-reported" paragraph flags the trust issue: unlike Speech Arena (continuous public voting) and Open ASR Leaderboard (published result CSVs), MOS figures are almost always self-reported by model publishers — treat as directional unless the test protocol is published and independently reproduced.



## VRAM requirements table — chapter 08

The table appears immediately after the chapter 08 heading and subtitle ("Two snippets that work on hardware you own, and the four serving paths worth knowing"), before the first code block for Kokoro. The heading is `<h3>VRAM requirements for TTS models</h3>` followed by an introductory paragraph explaining the "Min VRAM" (floor with quantized builds) vs "Typical VRAM" (FP16/BF16 with headroom) distinction, and noting that CPU-only models need RAM instead of VRAM.

The table lists 7 TTS models: Kokoro 82M, Qwen3-TTS 0.6B, Qwen3-TTS 1.7B, Chatterbox, Step Audio EditX, Breeze TTS 2, VoxCPM2. Columns are: Model, Params, Min VRAM, Typical VRAM, CPU-only?, Notes. Two models (Kokoro and VoxCPM2) are flagged as CPU-only with **Yes** in bold, Min VRAM = "0 GB GPU", and Typical VRAM showing RAM requirement instead (~2 GB RAM for Kokoro, ~4 GB RAM for VoxCPM2). GPU models show VRAM ranges from ~2 GB (Qwen3-TTS 0.6B) to "7.7 GB eager" / "12 GB stated" (Breeze TTS 2).

The Notes column provides critical context: Kokoro is "fixed voice bank, no cloning, Apache 2.0", Breeze is "Arena leader (1,215 Elo) but research-only license, non-commercial", Step Audio EditX is "Highest-ranked ship-safe model (1,102 Elo), emotion editing, Apache 2.0". This duplicates information from earlier tables but in the VRAM context where "I want the best model that fits my hardware" is the filtering question.

The footnote paragraph (with `.small` class) clarifies measurement conditions: "Min VRAM = quantized or optimized build, single-batch inference. Typical VRAM = FP16 or BF16, comfortable headroom for production serving. CPU-only models list RAM requirement instead. Breeze TTS 2's '7.7 GB eager' is the measured floor from Pinggy's testing; the official card states 12 GB minimum. All GPU figures assume text encoders are loaded alongside the main model." The Breeze caveat is important — the official card says 12 GB but real testing measured 7.7 GB, so readers see both numbers.

## Cost comparison tables — chapter 09

Chapter 09 replaces the original two paragraphs of prose-only cost discussion with two structured comparison tables: one for TTS, one for STT. The tables appear under separate `<h3>` headings: "Text-to-Speech cost comparison" and "Speech-to-Text cost comparison".

**TTS cost table** shows 5 services with columns: Service, Type, Cost per 1M characters, Per 1,000 words (~6,000 chars), Per hour of audio (~54,000 chars). Cloud rows (ElevenLabs Eleven v3 $100/1M, OpenAI TTS HD $30/1M, Google Cloud TTS WaveNet $16/1M, Hosted open model $0.70/1M) are styled with `style="background:var(--danger-bg)"` — inline style using the CSS variable for red background. The local row ("Any local model from this guide") is styled with `style="background:var(--ok-bg)"` for green background, with all three cost columns showing **$0.00** in bold.

The paragraph below the table converts per-million-character pricing to real-world monthly cost: at one hour of narration per day (~54,000 chars), ElevenLabs costs $5.40/day = $162/month, Google WaveNet $0.86/day = $26/month, local models $0/month after one-time hardware investment (RTX 3060 or 4060 with 8GB VRAM, $300–$400). The second paragraph calculates the 143× cost difference between ElevenLabs flagship pricing and hosted open model ($0.70/1M), then frames this as "the difference between a feature and a budget line" for workloads where consistency beats novelty (narration, accessibility read-aloud, notifications, agent voices).

**STT cost table** shows 4 services with columns: Service, Type, Cost per hour of audio, Per 10 hours, Per 100 hours. Cloud rows use danger-bg (OpenAI Whisper API $0.36/hr, AssemblyAI $0.21/hr, Google Speech-to-Text $0.96/hr), local row uses ok-bg ($0.00 across all columns). The footnote paragraph (with `.small` class) cites sources: "OpenAI Whisper API pricing: $0.006/minute = $0.36/hour. Google Speech-to-Text: $0.016/min = $0.96/hour (standard tier, as of October 2026 published rates). AssemblyAI: $0.21/hour is the published base rate for their standard transcription service."

The paragraph below the table calculates monthly cost at 100 hours of transcription: Google Cloud STT $96/month, AssemblyAI $21/month, local models $0 after one-time hardware investment (RTX 3060 with 8GB VRAM, $300 one time). The final paragraph surfaces the "most common failure mode": teams self-hosting Whisper, discovering total cost of ownership (GPU scaling, ops time, accuracy gaps, maintenance) exceeded expectations, and quietly moving back to managed services. The rule of thumb: **self-hosting wins decisively on TTS** (fixed, low-variance, CPU-friendly workloads), wins on **STT when you have steady volume and a GPU already paid for**, loses when you have bursty traffic and no ops appetite. The closing sentence: "Benchmark transcription against the $0.21-per-hour AssemblyAI number before assuming free is free."

The cost section is notably more honest than a typical "local is always better" pitch. The TTS case is straightforward (143× cost difference, clear win for local), but the STT case acknowledges the ops burden and recommends benchmarking against $0.21/hr managed pricing.

## Accuracy of metric explanations

**Elo**: The explanation states a 60-point Elo difference means the higher-rated model wins roughly 66% of direct matchups. The example (Breeze TTS 2 at 1,215 beats ElevenLabs Eleven v3 at 1,177 in roughly 63% of comparisons) uses a 38-point difference and estimates ~63% win rate, which is consistent with Elo math (38 points ≈ 55–60% expected score).

**WER**: "6.32% = 6 words wrong per 100, 7.44% = 7-8 words wrong per 100" is accurate. WER is calculated as (substitutions + deletions + insertions) / total reference words. The statement "Parakeet makes 15% fewer mistakes than Whisper on the same audio" is correct: (7.44 - 6.32) / 7.44 = 15.05% reduction.

**RTFx**: "3,332× = transcribing a 1-hour recording takes 1.08 seconds of compute" is accurate. RTFx (Real-Time Factor) is defined as (audio duration) / (processing time), so 3,332× means 3,600 seconds of audio / 3,332 = 1.08 seconds of processing.

**TTFB**: The explanation correctly defines TTFB as milliseconds until the first audio byte begins playing, with examples "200ms = near-instant" and "2,000ms = noticeable 2-second pause". The methodology box distinguishes streaming TTS (TTFB while generation continues in background) from batch TTS (TTFB equals total generation time).

**MOS**: "4.2/5.0 = listeners rated the voice as natural-sounding in approximately 84% of test cases" is a common simplification of MOS, treating it as a percentage (4.2/5.0 = 84%). The methodology box corrects this: "A score of 4.2/5.0 does not mean 84% of listeners gave it a 5 — it means the average rating was 4.2, which can come from a distribution of 3s, 4s, and 5s." This is accurate — MOS is a mean, not a proportion.

## Accuracy of cost figures

**ElevenLabs Eleven v3**: $100 per 1M characters, cited as published rate for late 2026.

**OpenAI TTS HD**: $30 per 1M characters. No footnote in the TTS table (inconsistency: STT table has footnotes for OpenAI Whisper API, TTS does not for TTS HD), but the number is consistent with OpenAI's published TTS HD pricing as of mid-2026.

**Google Cloud TTS WaveNet**: $16 per 1M characters. No specific footnote, but the STT table cites "Google Speech-to-Text: $0.016/min = $0.96/hour (standard tier, as of October 2026 published rates)", giving confidence the author is using October 2026 published rates consistently.

**Hosted open model**: $0.70 per 1M characters, described as "best-value third-party hosting as of late 2026". This is a representative figure for hosted open model inference, not a specific vendor. The text correctly frames it as "typical" rather than claiming it's a specific service's rate.

**AssemblyAI**: $0.21/hour is explicitly cited in the footnote as "the published base rate for their standard transcription service" as of October 2026. This is the most thoroughly sourced figure in the cost section.

**OpenAI Whisper API**: $0.006/minute = $0.36/hour is cited in the STT table footnote.

**Google Speech-to-Text**: $0.016/min = $0.96/hour is cited in the STT table footnote with "(standard tier, as of October 2026 published rates)".

All cost calculations are arithmetically correct: $100/1M chars × 54,000 chars = $5.40, × 30 days = $162.

## Cloud rows styled with danger-bg, local rows with ok-bg

All cloud service rows use `style="background:var(--danger-bg)"` (ElevenLabs, OpenAI, Google, Hosted open model in TTS table; OpenAI, AssemblyAI, Google in STT table). All "Any local model from this guide" rows use `style="background:var(--ok-bg)"`.

## HTML well-formedness

All opening tags have matching closing tags, all tables have proper thead/tbody structure, all callout boxes have proper div nesting, all paragraphs are properly closed. HTML entities are correctly encoded: `&mdash;` for em dash, `&times;` for multiplication sign, `&#x2601;&#xFE0F;` for cloud emoji, `&#x1F5A5;&#xFE0F;` for desktop computer emoji, `&ndash;` for en dash.

## Existing content integrity

The additions are insertions at specific points (chapter 03 after intro paragraph, chapter 08 before code blocks, chapter 09 replacing two paragraphs of prose) and do not modify any other content. The cost section in chapter 09 replaced two paragraphs of prose with two tables but preserved the callout box that follows ("The honest summary"), matching the plan's specification.

</details>

## File map

<details>
<summary>Changed files</summary>

- **blog/local-voice-models-2026.html** — Added metrics explanation table (5 rows: Elo, WER, RTFx, TTFB, MOS) in chapter 03 before Elo leaderboard; added three methodology callout boxes (Speech Arena, Open ASR Leaderboard, TTFB/MOS) in chapter 03 after metrics table; added VRAM requirements table (7 TTS models) in chapter 08 before code samples; replaced prose with two cost comparison tables (TTS with 5 services, STT with 4 services) in chapter 09, preserving the "honest summary" callout.

</details>
