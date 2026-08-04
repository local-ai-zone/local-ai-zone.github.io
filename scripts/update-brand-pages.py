"""Insert a "Latest Models (2026)" section into legacy brand pages.

Each brand gets a fresh section inserted right before its "Introduction to ..."
h2 heading, with current models, specs, and benchmarks (or a 2026 status update
for historical/legacy families). Idempotent: skips brands that already carry a
"Latest" section.
"""
import io
import os
import re
import sys

# slug: (section HTML)
BRANDS = {
    'gemma-ai-google-lightweight-guide-2025.html': """
        <h2>The Latest Gemma Models (2026): Gemma 4</h2>

        <p>Google's <strong>Gemma 4</strong> generation (April 2026) turned the Gemma family from a lightweight afterthought into a genuine open-weight contender. Where Gemma 3 trailed Llama and Qwen, Gemma 4 leapfrogs them on math, coding, and instruction following.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Total Params</th>
                <th>Active Params</th>
                <th>Context</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Gemma 4 31B Dense</td>
                <td>31B</td>
                <td>31B</td>
                <td>128K+</td>
                <td>Flagship dense</td>
            </tr>
            <tr>
                <td>Gemma 4 26B (A4B MoE)</td>
                <td>26B</td>
                <td>~4B</td>
                <td>128K+</td>
                <td>Efficient MoE</td>
            </tr>
            <tr>
                <td>Gemma 3 12B / 27B</td>
                <td>12-27B</td>
                <td>dense</td>
                <td>128K</td>
                <td>Previous generation</td>
            </tr>
        </table>

        <p><strong>Benchmark highlights (Gemma 4 31B):</strong> MMLU-Pro ~85.2, AIME 2026 (no tools) 89.2 — a massive jump from Gemma 3's ~20.8 — and LiveCodeBench v6 80.0. GGUF quantizations are available in the <a href="../models/gemma-4-26b-a4b-it.html">model repository</a>.</p>
    """,

    'llama-ai-open-source-complete-guide-2025.html': """
        <h2>The Latest Llama Models (2026): Llama 4</h2>

        <p>Meta's <strong>Llama 4</strong> herd (Scout &amp; Maverick, with the 2T-parameter Behemoth as the teacher) is Meta's first natively multimodal, Mixture-of-Experts generation — and its biggest architectural shift since Llama 1.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Total Params</th>
                <th>Active Params</th>
                <th>Context</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Llama 4 Scout</td>
                <td>109B</td>
                <td>17B</td>
                <td>10M tokens</td>
                <td>Record context, single-node</td>
            </tr>
            <tr>
                <td>Llama 4 Maverick</td>
                <td>400B</td>
                <td>17B</td>
                <td>1M+</td>
                <td>General-purpose workhorse</td>
            </tr>
            <tr>
                <td>Llama 4 Behemoth</td>
                <td>~2T</td>
                <td>teacher</td>
                <td>-</td>
                <td>Distillation teacher</td>
            </tr>
        </table>

        <p>Scout's <strong>10-million-token</strong> context (via interleaved iRoPE attention) is the largest ever shipped in an open model, and Maverick's ~1417 LMArena ELO beats GPT-4o-class models while activating just 17B parameters. Both are GGUF-friendly for local use.</p>
    """,

    'mistral-ai-european-excellence-guide-2025.html': """
        <h2>The Latest Mistral Models (2026): Mistral 3</h2>

        <p>Mistral's <strong>Mistral 3</strong> generation (December 2025, Apache 2.0) pairs a massive sparse-MoE flagship with a family of edge-optimized small models — all fully open-weight and commercially unrestricted.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Total Params</th>
                <th>Active Params</th>
                <th>Context</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Mistral Large 3</td>
                <td>675B</td>
                <td>41B</td>
                <td>~262K</td>
                <td>Flagship MoE</td>
            </tr>
            <tr>
                <td>Ministral 3 14B</td>
                <td>14B</td>
                <td>dense</td>
                <td>128K+</td>
                <td>Edge reasoning</td>
            </tr>
            <tr>
                <td>Ministral 3 3B / 8B</td>
                <td>3-8B</td>
                <td>dense</td>
                <td>128K+</td>
                <td>On-device</td>
            </tr>
        </table>

        <p>Large 3 debuts near the top of the open-source non-reasoning leaderboard, while the Ministral 3 14B reasoning variant scores <strong>85% on AIME 2025</strong>. Apache 2.0 licensing keeps it one of the safest commercial choices in open AI.</p>
    """,

    'mixtral-ai-mixture-experts-guide-2025.html': """
        <h2>Where Mixtral Stands in 2026</h2>

        <p>The Mixtral 8x7B and 8x22B models that pioneered open-source MoE remain historically important, but 2026's MoE frontier has moved decisively. The direct successor is <strong>Mistral Large 3</strong> (675B total / 41B active, Apache 2.0), which keeps Mistral's efficiency-first philosophy at frontier scale.</p>

        <p>Today's local MoE landscape is dominated by <strong>Qwen3-Next-80B-A3B</strong> (80B / 3.3B active), <strong>Llama 4 Scout</strong> (109B / 17B active, 10M context), <strong>DeepSeek-V4-Flash</strong> (~284B / 13B active, 1M context), and <strong>Nemotron-3-Nano-30B-A3B</strong> — all of which deliver far more capability per active parameter than the original Mixtral series.</p>
    """,

    'phi-ai-microsoft-efficient-guide-2025.html': """
        <h2>The Latest Phi Models (2026): Phi-4</h2>

        <p>Microsoft's <strong>Phi-4</strong> family continues to prove that small, densely-trained models can punch far above their weight class — especially for math, code, and step-by-step reasoning on constrained hardware.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Total Params</th>
                <th>Context</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Phi-4</td>
                <td>14B</td>
                <td>128K</td>
                <td>Reasoning &amp; math specialist</td>
            </tr>
            <tr>
                <td>Phi-4-mini</td>
                <td>3.8B</td>
                <td>128K</td>
                <td>Edge / low-VRAM</td>
            </tr>
            <tr>
                <td>Phi-4-multimodal</td>
                <td>5.6B</td>
                <td>128K</td>
                <td>Vision-language</td>
            </tr>
        </table>

        <p><strong>Benchmarks (Phi-4 14B):</strong> MMLU ~84.8, MATH ~80.4, HumanEval+ ~82.8. Phi-4-mini runs on 4GB VRAM at 300+ tok/s, making it one of the best picks for entry-level local setups.</p>
    """,

    'yi-ai-chinese-multilingual-guide-2025.html': """
        <h2>The Latest Yi Models and 2026 Status</h2>

        <p>01.AI's <strong>Yi-1.5</strong> series (6B / 9B / 34B) remains a solid bilingual (English/Chinese) open-weight option, but the 2026 landscape has shifted decisively toward larger Chinese open families. Alibaba's <strong>Qwen3-Next / Qwen3.5</strong>, <strong>DeepSeek-V4</strong>, and Zhipu's <strong>GLM-5</strong> now dominate Chinese-language open-source leadership with far larger context windows and stronger reasoning.</p>

        <p>For multilingual + coding work on local hardware, Qwen3-8B/14B and Qwen3-Next-80B-A3B are the recommended modern replacements, with Yi 1.5 34B still a reasonable mid-size choice where familiarity matters.</p>
    """,

    'gemini-ai-multimodal-complete-guide-2025.html': """
        <h2>The Latest Gemini Models (2026): Gemini 3.1</h2>

        <p>Google's <strong>Gemini 3.1 Pro</strong> and <strong>Gemini 3.1 Deep Think</strong> (February 2026) define the closed-source frontier for long-context and multimodal work — while the open-weight side is served by the <strong>Gemma 4</strong> family.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Context</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Gemini 3.1 Pro</td>
                <td>2M tokens</td>
                <td>General frontier + Workspace integration</td>
            </tr>
            <tr>
                <td>Gemini 3.1 Deep Think</td>
                <td>1M+</td>
                <td>Extended reasoning</td>
            </tr>
            <tr>
                <td>Gemini 3.1 Flash</td>
                <td>1M+</td>
                <td>Fast, cost-efficient tier</td>
            </tr>
        </table>

        <p>Highlights include a native <strong>2M-token</strong> context window, real-time Google Search grounding, and integrated image/video generation (Nano Banana / Veo). For local AI, Google's open <strong>Gemma 4</strong> line is the practical route — see the <a href="gemma-ai-google-lightweight-guide-2025.html">Gemma guide</a>.</p>
    """,

    'grok-ai-xai-realtime-guide-2025.html': """
        <h2>Where Grok Stands in 2026</h2>

        <p>xAI's <strong>Grok 4 / Grok 4.5</strong> remain closed, API/enterprise-only models — Grok 5 is in training on the Colossus cluster. The headline capability is still real-time X/web grounding plus heavy test-time compute (Grok 4 Heavy scored landmark results on Humanity's Last Exam and ARC-AGI v2).</p>

        <p>For local AI users, xAI open-sourced <strong>Grok Build 0.1</strong> (a coding agent and TUI, mid-2026), but there is no open-weight Grok LLM you can run yourself. The closest open reasoning alternatives are <strong>DeepSeek-V4</strong>, <strong>Qwen3-235B-Thinking</strong>, and <strong>Kimi K2 Thinking</strong>.</p>
    """,

    'gpt4-ai-advanced-reasoning-master-guide-2025.html': """
        <h2>The 2026 Landscape: From GPT-4 to GPT-5.x and Open Alternatives</h2>

        <p>This guide covers the GPT-4 era, which set the template for modern reasoning AI. In 2026, OpenAI's line has moved to <strong>GPT-5.2 / GPT-5.6 Sol</strong> (July 2026) with 400K+ context and dynamic test-time compute — and, more importantly for this site, open-weight models now rival it.</p>

        <p>The current open alternatives to GPT-5.x include <strong>DeepSeek-V4-Pro</strong> (GPQA ~90-94, LiveCodeBench 93.5), <strong>Qwen3-Next-480B</strong>, <strong>GLM-5</strong>, and <strong>Kimi K3</strong> — all runnable locally in GGUF form. GPT-4's concepts (tool use, chain-of-thought, RLHF) are now table stakes across every family in this guide.</p>
    """,

    'claude-ai-constitutional-ultimate-guide-2025.html': """
        <h2>The Latest Claude Models (2026): Claude 4.6 and Beyond</h2>

        <p>Anthropic's <strong>Claude 4.6</strong> (February 2026) remains the benchmark for software engineering and agentic coding, with <strong>Claude 5 "Fennec"</strong> previewed and focused on agent teams rather than raw scale.</p>

        <table class="compare-table">
            <tr>
                <th>Model</th>
                <th>Focus</th>
            </tr>
            <tr>
                <td>Claude Opus 4.6</td>
                <td>Flagship reasoning + coding</td>
            </tr>
            <tr>
                <td>Claude Sonnet 4.6</td>
                <td>Balanced workhorse</td>
            </tr>
            <tr>
                <td>Claude Code</td>
                <td>Native CLI/VS Code agent</td>
            </tr>
        </table>

        <p>Claude is closed-source (API/enterprise only) — Anthropic does not ship open weights. For local AI, the closest open coding and reasoning alternatives are <strong>Qwen3-Coder-480B</strong>, <strong>DeepSeek-V4</strong>, and <strong>Kimi K2.7</strong>.</p>
    """,

    'chatgpt-oss-open-source-models-guide-2025.html': """
        <h2>The 2026 Open-Source ChatGPT Alternatives</h2>

        <p>The dream of "open ChatGPT" is now fully realized. In 2026 the open-weight landscape matches or beats ChatGPT-era models on most benchmarks, with <strong>DeepSeek-V4</strong> (1M context, GPQA ~90-94), <strong>Qwen3.5</strong>, <strong>GLM-5</strong>, <strong>Mistral Large 3</strong>, and <strong>Llama 4</strong> leading the pack.</p>

        <p>Every one of these families ships GGUF quantizations for local deployment — so you can run a ChatGPT-class assistant entirely on your own machine, with your data never leaving it. The <a href="kimi-ai-moonshot-frontier-guide-2026.html">Kimi</a>, <a href="qwen-ai-alibaba-multilingual-guide-2025.html">Qwen</a>, and <a href="deepseek-ai-coding-expert-guide-2025.html">DeepSeek</a> guides cover the leading choices in depth.</p>
    """,

    'dolphin-ai-uncensored-complete-guide-2025.html': """
        <h2>The Latest Dolphin Models (2026): Dolphin 3</h2>

        <p>The <strong>Dolphin 3</strong> series (Eric Hartford / Cognitive Computations) continues the uncensored fine-tune tradition on modern foundations, with builds on <strong>Mistral 24B</strong> and <strong>Llama 3.1</strong> bases plus newer Qwen-based variants.</p>

        <p>Dolphin 3 models pair fully-compliant system prompts with no refusal guardrails, and remain optimized for local agentic workflows, coding, and multi-turn chat via Ollama and GGUF. Check the repository for current <a href="../models/dolphin-2-7-mixtral-8x7b.html">Dolphin GGUF builds</a>.</p>
    """,

    'hermes-ai-function-calling-guide-2025.html': """
        <h2>The Latest Hermes Models (2026): Hermes 4</h2>

        <p>Nous Research's <strong>Hermes 4</strong> generation brings best-in-class function calling and tool use to modern Qwen and Llama bases, with strong reasoning and agentic capabilities baked in.</p>

        <p>Hermes 4 remains one of the most popular choices for local agent frameworks (function-calling reliability matters more than raw benchmark scores), and is available in GGUF form for everything from 8B edge models to 70B-class deployments.</p>
    """,

    'nous-ai-research-optimized-guide-2025.html': """
        <h2>Nous Research in 2026</h2>

        <p>Nous Research remains a leading open-source lab. Their 2026 lineup centers on <strong>Hermes 4</strong> (function-calling specialists on Qwen3 bases), <strong>DeepHermes</strong> reasoning models, and community favorites like the Claude-4.7-Opus-abliterated fine-tunes — all optimized for local deployment and heavily used across the GGUF ecosystem.</p>

        <p>Browse the <a href="../models/nous-hermes-2-mixtral-8x7b-dpo.html">Nous GGUF builds</a> in the model repository for current options.</p>
    """,

    'openchat-ai-conversation-master-guide-2025.html': """
        <h2>Where OpenChat Stands in 2026</h2>

        <p>OpenChat's reinforcement-learning-tuned models were influential in 2023-24, but the project's releases have slowed and its 7B/13B era is now firmly legacy. Modern replacements for conversation quality and tool use are <strong>Qwen3-8B/14B</strong>, <strong>Llama 4 Scout</strong>, and <strong>Mistral Small 3</strong> — all with far larger context windows and better instruction following.</p>
    """,

    'wizardlm-ai-instruction-following-guide-2025.html': """
        <h2>Where WizardLM Stands in 2026</h2>

        <p>WizardLM's Evol-Instruct technique (WizardLM-2 8x22B, WizardCoder) pioneered synthetic instruction evolution and influenced virtually every modern fine-tune. The original team's flagship releases have slowed as native reasoning models took over, but the WizardCoder lineage lives on in <strong>DeepSeek-Coder</strong> and <strong>Qwen3-Coder</strong>.</p>

        <p>For instruction-following and coding today, the recommended local picks are <strong>Qwen3-Coder-30B-A3B</strong>, <strong>GLM-4.7</strong>, and <strong>DeepSeek-V4-Flash</strong>.</p>
    """,

    'vicuna-ai-chatbot-excellence-guide-2025.html': """
        <h2>Where Vicuna Stands in 2026</h2>

        <p>Vicuna (v1.3/v1.5, built on Llama 1/2) is historically monumental — it launched the LMSYS Chatbot Arena — but in 2026 it is a legacy benchmark model. Modern 7B-8B models like <strong>Llama 3.1/4</strong>, <strong>Qwen3</strong>, and <strong>Mistral 7B v0.3</strong> vastly outperform Vicuna with larger context and far better instruction following, making it only relevant as a point of comparison.</p>
    """,

    'codellama-ai-programming-ultimate-guide-2025.html': """
        <h2>Where CodeLlama Stands in 2026</h2>

        <p>CodeLlama (Llama 2 based) was the first widely-used open coding model, but it has been decisively superseded. Today's local coding picks are <strong>Qwen3-Coder-480B-A35B</strong> (SWE-bench ~69.6), <strong>DeepSeek-Coder-V3 / DeepSeek-V4</strong> (LiveCodeBench 93.5), <strong>GLM-4.7</strong>, and the newest <strong>Llama 4</strong> variants — all dramatically better at repository-scale coding and agentic workflows than CodeLlama.</p>
    """,

    'stablelm-ai-stability-optimized-guide-2025.html': """
        <h2>Where StableLM Stands in 2026</h2>

        <p>Stability AI's language-model efforts (StableLM 2/3) have largely wound down as the company refocused on image generation (Stable Diffusion 3.5 era). The models remain downloadable and fine-tunable, but there are no active StableLM flagship releases in 2026.</p>

        <p>For small local models with active maintenance, the recommended modern alternatives are <strong>Phi-4-mini</strong>, <strong>Qwen3-4B/8B</strong>, and <strong>Ministral 3 3B/8B</strong>.</p>
    """,

    'zephyr-ai-alignment-tuned-guide-2025.html': """
        <h2>Where Zephyr Stands in 2026</h2>

        <p>Hugging Face's Zephyr (built on Mistral 7B) proved that distillation + direct preference optimization could make a 7B model shine, and it remains a beloved open baseline. The Zephyr line itself has not seen flagship updates, but its techniques are everywhere in 2026's models.</p>

        <p>Modern alignment-tuned small models — <strong>Qwen3-8B</strong>, <strong>Llama 4 Scout</strong>, and <strong>Mistral Small 3</strong> — all outperform Zephyr's generation by a wide margin.</p>
    """,

    'orca-ai-reasoning-breakthrough-guide-2025.html': """
        <h2>Where Orca Stands in 2026</h2>

        <p>Microsoft's Orca series (Orca 2, Orca-Math) demonstrated that small models could mimic larger teachers' reasoning via explanation tuning. It remains a research milestone, but Microsoft's active open line has moved to <strong>Phi-4</strong>, which achieves far stronger math and reasoning in the same size class.</p>
    """,

    'alpaca-ai-instruction-tuned-guide-2025.html': """
        <h2>Alpaca: A Historical Landmark</h2>

        <p>Stanford's Alpaca (2023) proved that instruction-tuning a small open model on synthetic data could produce a compelling ChatGPT-like assistant — the spark that ignited the open-source fine-tuning movement. Every modern family in this guide (Llama, Qwen, Mistral, Gemma) descends from that idea.</p>

        <p>As a model, Alpaca is long retired; for the same role today, run <strong>Qwen3-8B</strong>, <strong>Llama 4 Scout</strong>, or <strong>Phi-4</strong> instead.</p>
    """,

    'bert-ai-language-understanding-guide-2025.html': """
        <h2>Where BERT Stands in 2026</h2>

        <p>BERT (2018) remains one of the most-used models in production NLP — but for embeddings, the 2026 state of the art has moved to retrieval-optimized families: <strong>BGE-M3 / BGE-3</strong>, <strong>NV-Embed v2</strong>, <strong>Qwen3-Embedding</strong>, and multilingual <strong>E5</strong> variants, all with far better dense + sparse + multi-vector retrieval.</p>

        <p>For RAG pipelines today, BGE-M3 and Qwen3-Embedding are the practical first choices, with modern rerankers on top. See the <a href="bge-ai-embedding-excellence-guide-2025.html">BGE guide</a> for details.</p>
    """,

    't5-ai-text-to-text-complete-guide-2025.html': """
        <h2>Where T5 Stands in 2026</h2>

        <p>Google's T5 "text-to-text" framework remains conceptually foundational, and T5/UL2-derived models still power summarization and translation pipelines. However, 2026's generation models (decoder-only LLMs like Gemma 4, Qwen3, and Llama 4) now handle those tasks natively with better quality, and the embedding side has moved to BGE-M3 / Qwen3-Embedding.</p>
    """,

    'bge-ai-embedding-excellence-guide-2025.html': """
        <h2>The Latest BGE Embeddings (2026): BGE-M3 and BGE-3</h2>

        <p>BAAI's BGE line remains the default choice for open-source embeddings, and it has kept pace through 2026 with <strong>BGE-M3</strong> (multi-lingual, dense + sparse + multi-vector) and the newer <strong>BGE-3</strong> generation, which leads the MTEB-style leaderboards for open models.</p>

        <p>Competing strongly: <strong>NV-Embed v2</strong> (NVIDIA) and <strong>Qwen3-Embedding</strong> (Alibaba). For retrieval-augmented local AI, BGE-M3 is the safest all-round pick; pair it with a reranker for best results.</p>
    """,

    'e5-ai-multilingual-embedding-guide-2025.html': """
        <h2>Where E5 Embeddings Stand in 2026</h2>

        <p>Microsoft's E5 family (especially E5-Mistral-7B) set the multilingual embedding standard and is still widely used. The 2026 landscape now includes <strong>NV-Embed v2</strong>, <strong>BGE-M3 / BGE-3</strong>, and <strong>Qwen3-Embedding</strong>, which edge it out on retrieval benchmarks — but E5 remains a solid, well-documented choice, especially for cross-lingual RAG.</p>
    """,

    'bard-ai-google-conversational-guide-2025.html': """
        <h2>Bard Has Been Replaced by Gemini</h2>

        <p>Google retired the Bard brand in 2024 — it is now <strong>Gemini</strong>, and by 2026 the flagship line is <strong>Gemini 3.1 Pro / Deep Think</strong> with a 2M-token context window and deep Workspace integration. For open-weight users, Google's <strong>Gemma 4</strong> family carries the same research heritage into local AI.</p>

        <p>See the <a href="gemini-ai-multimodal-complete-guide-2025.html">Gemini guide</a> for the full 2026 picture.</p>
    """,

    'lamda-ai-dialogue-breakthrough-guide-2025.html': """
        <h2>Where LaMDA Stands in 2026</h2>

        <p>LaMDA (2021-22) pioneered dialogue-specific training and its research fed directly into PaLM and then <strong>Gemini</strong>. As a product it never shipped publicly, and its lineage is now fully absorbed into Gemini 3.1. It remains historically significant — the first model tuned for open-ended conversation at scale.</p>
    """,

    'palm-ai-pathways-language-guide-2025.html': """
        <h2>Where PaLM Stands in 2026</h2>

        <p>Google's PaLM and PaLM 2 (Pathways) set the foundation for Gemini and are no longer active products — by 2026 the flagship line is <strong>Gemini 3.1</strong> (2M context, native multimodality), with the open-weight side served by <strong>Gemma 4</strong>. PaLM's mixture-of-experts and chain-of-thought research remains visible in every modern LLM.</p>
    """,

    'llava-ai-vision-language-guide-2025.html': """
        <h2>Where LLaVA Stands in 2026</h2>

        <p>LLaVA (Large Language and Vision Assistant) proved the visual-instruction-tuning recipe in 2023-24. In 2026 the open vision-language frontier is led by <strong>Qwen2.5-VL / Qwen3-VL</strong>, <strong>InternVL3</strong>, and multimodal <strong>Gemma 3/4</strong>, plus Kimi's <strong>Kimi-VL A3B</strong> for efficient on-device vision. LLaVA remains a clean educational baseline and a fine starting point for custom vision fine-tunes.</p>
    """,

    'constitutional-ai-safety-alignment-guide-2025.html': """
        <h2>Constitutional AI in 2026: Now Mainstream</h2>

        <p>Anthropic's Constitutional AI (RLAIF with explicit principles) — first showcased in Claude — has become standard practice across the industry. In 2026 nearly every major lab uses some form of principled, feedback-free alignment, and constitutional-style techniques underpin safety work in open models from <strong>Llama 4</strong>, <strong>Qwen3.5</strong>, and <strong>Gemma 4</strong>. For Claude itself, the line has moved to <strong>Claude 4.6</strong> and the imminent <strong>Claude 5</strong>.</p>
    """,
}

ANCHOR_RE = re.compile(r'(<div class="article-content">\s*\n)(.*?)(<h2>)', re.S)
HAVE_RE = re.compile(r'<h2>The Latest|<h2>Where .* Stands|<h2>.*: A Historical|<h2>Bard Has Been|<h2>The 2026|<h2>Constitutional AI in 2026|<h2>Alpaca: A Historical')

def main(paths):
    for path in paths:
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        slug = os.path.basename(path)
        if slug not in BRANDS:
            continue
        if HAVE_RE.search(text):
            print('SKIP (has section):', slug)
            continue
        section = BRANDS[slug]
        m = ANCHOR_RE.search(text)
        if not m:
            print('NO ANCHOR:', slug)
            continue
        insert = m.group(1) + m.group(2) + section.strip('\n') + '\n\n' + m.group(2) + m.group(3)
        text = text[:m.start()] + insert + text[m.end():]
        with io.open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
        print('UPDATED:', slug)

if __name__ == '__main__':
    main(sys.argv[1:])
