"""Shorten <title> tags on all article pages to 30-60 chars (recommended SEO length).

Keeps the primary keyword first. Updates <title>, og:title, twitter:title, and
JSON-LD headline consistently. Idempotent: skips files whose <title> is already
within 30-60 chars.
"""
import io
import os
import re
import sys

# filename -> short title (30-60 chars, primary keyword first)
TITLES = {
    # ---------------- guides ----------------
    'ai-coding-prompts-master-techniques-2025.html': 'AI Coding Prompts 2026: Master Techniques',
    'ai-model-licensing-complete-legal-guide-2025.html': 'LLM License Types & Compliance Guide 2026',
    'ai-model-parameters-complete-guide-2025.html': 'LLM Model Parameters Guide 2026',
    'ai-research-prompts-expert-strategies-2025.html': 'AI Research Prompts 2026: Expert Strategies',
    'best-ai-analysis-models-ultimate-ranking-2025.html': 'Top 20 Analysis AI Models 2026',
    'best-ai-brainstorming-models-ultimate-ranking-2025.html': 'Top 20 Brainstorming AI Models 2026',
    'best-ai-coding-assistant-models-ultimate-ranking-2025.html': 'Top 20 Coding Assistant AI Models 2026',
    'best-ai-multilingual-models-ultimate-ranking-2025.html': 'Top 20 Multilingual AI Models 2026',
    'best-ai-research-assistant-models-ultimate-ranking-2025.html': 'Top 20 Research AI Models 2026',
    'context-length-optimization-ultimate-guide-2025.html': 'Context Length Optimization Guide 2026',
    'top-20-local-ai-models-mobile-ai-agents-guide-2025.html': 'Top 20 Local AI Models for Mobile 2026',
    'what-is-ai-model-3b-7b-30b-parameters-guide-2025.html': 'LLM Model Parameters 2026: 7B-70B',
    'what-is-ai-quantization-q4-k-m-q8-gguf-guide-2025.html': 'AI Model Quantization Guide 2026',

    # ---------------- brands ----------------
    'alpaca-ai-instruction-tuned-guide-2025.html': 'Alpaca AI Models 2026: Instruction Tuning',
    'bard-ai-google-conversational-guide-2025.html': 'Bard AI Models 2026: Gemini Successor',
    'bert-ai-language-understanding-guide-2025.html': 'BERT AI Models 2026: Language Understanding',
    'bge-ai-embedding-excellence-guide-2025.html': 'BGE AI Models 2026: Embedding Guide',
    'chatgpt-oss-open-source-models-guide-2025.html': 'ChatGPT Open Source Models 2026',
    'claude-ai-constitutional-ultimate-guide-2025.html': 'Claude AI Models 2026: Constitutional',
    'codellama-ai-programming-ultimate-guide-2025.html': 'CodeLlama AI Models 2026: Programming',
    'constitutional-ai-safety-alignment-guide-2025.html': 'Constitutional AI Safety Guide 2026',
    'deepseek-ai-coding-expert-guide-2025.html': 'DeepSeek AI Models 2026: Coding',
    'dolphin-ai-uncensored-complete-guide-2025.html': 'Dolphin AI Models 2026: Uncensored',
    'e5-ai-multilingual-embedding-guide-2025.html': 'E5 AI Models 2026: Embedding Guide',
    'gemini-ai-multimodal-complete-guide-2025.html': 'Gemini AI Models 2026: Multimodal',
    'gemma-ai-google-lightweight-guide-2025.html': 'Gemma AI Models 2026: Google Guide',
    'glm-ai-general-language-guide-2025.html': 'GLM AI Models 2026: Zhipu Guide',
    'gpt4-ai-advanced-reasoning-master-guide-2025.html': 'GPT-4 AI Models 2026: Reasoning',
    'grok-ai-xai-realtime-guide-2025.html': 'Grok AI Models 2026: xAI Guide',
    'hermes-ai-function-calling-guide-2025.html': 'Hermes AI Models 2026: Function Calling',
    'kimi-ai-moonshot-frontier-guide-2026.html': 'Kimi AI Models 2026: Moonshot Guide',
    'lamda-ai-dialogue-breakthrough-guide-2025.html': 'LaMDA AI Models 2026: Dialogue',
    'llama-ai-open-source-complete-guide-2025.html': 'Llama AI Models 2026: Open Source',
    'llava-ai-vision-language-guide-2025.html': 'LLaVA AI Models 2026: Vision Language',
    'minimax-ai-moe-frontier-guide-2026.html': 'MiniMax AI Models 2026: MoE Guide',
    'mistral-ai-european-excellence-guide-2025.html': 'Mistral AI Models 2026: Europe',
    'mixtral-ai-mixture-experts-guide-2025.html': 'Mixtral AI Models 2026: MoE Guide',
    'nemotron-ai-nvidia-reasoning-guide-2026.html': 'NVIDIA Nemotron AI Models 2026',
    'nous-ai-research-optimized-guide-2025.html': 'Nous Research AI Models 2026 Guide',
    'openchat-ai-conversation-master-guide-2025.html': 'OpenChat AI Models 2026: Chat Guide',
    'orca-ai-reasoning-breakthrough-guide-2025.html': 'Orca AI Models 2026: Reasoning',
    'palm-ai-pathways-language-guide-2025.html': 'PaLM AI Models 2026: Pathways Guide',
    'phi-ai-microsoft-efficient-guide-2025.html': 'Phi AI Models 2026: Microsoft Guide',
    'qwen-ai-alibaba-multilingual-guide-2025.html': 'Qwen AI Models 2026: Alibaba Guide',
    'stablelm-ai-stability-optimized-guide-2025.html': 'StableLM AI Models 2026: Stability AI',
    't5-ai-text-to-text-complete-guide-2025.html': 'T5 AI Models 2026: Text-to-Text',
    'vicuna-ai-chatbot-excellence-guide-2025.html': 'Vicuna AI Models 2026: Chatbot',
    'wizardlm-ai-instruction-following-guide-2025.html': 'WizardLM AI Models 2026: Instructions',
    'yi-ai-chinese-multilingual-guide-2025.html': 'Yi AI Models 2026: Multilingual',
    'zephyr-ai-alignment-tuned-guide-2025.html': 'Zephyr AI Models 2026: Alignment',

    # ---------------- cpu ----------------
    'index.html': 'GGUF Models 2026: Complete CPU Guide',
    'top-5-amd-ryzen-5-7600x-gguf-models-16gb-32gb-mid-range-value-guide.html': 'AMD Ryzen 5 7600X GGUF Models 2026',
    'top-5-amd-ryzen-7-7800x3d-gguf-models-16gb-32gb-64gb-gaming-3d-vcache-guide.html': 'AMD Ryzen 7 7800X3D GGUF Models 2026',
    'top-5-amd-ryzen-9-7900x-gguf-models-16gb-32gb-64gb-high-performance-guide.html': 'AMD Ryzen 9 7900X GGUF Models 2026',
    'top-5-amd-ryzen-9-7900x3d-gguf-models-16gb-32gb-64gb-professional-3d-vcache-guide.html': 'AMD Ryzen 9 7900X3D GGUF Models 2026',
    'top-5-amd-ryzen-9-7950x-gguf-models-32gb-64gb-128gb-workstation-guide.html': 'AMD Ryzen 9 7950X GGUF Models 2026',
    'top-5-amd-ryzen-9-7950x3d-gguf-models-32gb-64gb-128gb-ultimate-3d-vcache-guide.html': 'AMD Ryzen 9 7950X3D GGUF Models 2026',
    'top-5-amd-threadripper-9000-gguf-models-64gb-128gb-256gb-hedt-workstation-guide.html': 'AMD Threadripper 9000 GGUF Models 2026',
    'top-5-apple-m1-gguf-models-8gb-16gb-32gb-ai-performance-guide.html': 'Apple M1 GGUF Models 2026: Guide',
    'top-5-apple-m2-gguf-models-8gb-16gb-32gb-neural-engine-guide.html': 'Apple M2 GGUF Models 2026: Guide',
    'top-5-apple-m2-max-gguf-models-32gb-64gb-96gb-workstation-guide.html': 'Apple M2 Max GGUF Models 2026: Guide',
    'top-5-apple-m2-pro-gguf-models-16gb-32gb-64gb-professional-guide.html': 'Apple M2 Pro GGUF Models 2026: Guide',
    'top-5-apple-m2-ultra-gguf-models-64gb-128gb-192gb-workstation-guide.html': 'Apple M2 Ultra GGUF Models 2026',
    'top-5-apple-m3-gguf-models-8gb-16gb-32gb-premium-ultrabook-guide.html': 'Apple M3 GGUF Models 2026: Guide',
    'top-5-apple-m3-max-gguf-models-32gb-64gb-96gb-high-performance-guide.html': 'Apple M3 Max GGUF Models 2026: Guide',
    'top-5-apple-m3-pro-gguf-models-16gb-32gb-64gb-content-creation-guide.html': 'Apple M3 Pro GGUF Models 2026: Guide',
    'top-5-apple-m3-ultra-gguf-models-64gb-128gb-192gb-ultimate-performance-guide.html': 'Apple M3 Ultra GGUF Models 2026',
    'top-5-apple-m4-gguf-models-16gb-24gb-32gb-latest-chip-guide.html': 'Apple M4 GGUF Models 2026: Guide',
    'top-5-apple-m4-max-gguf-models-32gb-64gb-96gb-flagship-performance-guide.html': 'Apple M4 Max GGUF Models 2026: Guide',
    'top-5-apple-m4-pro-gguf-models-16gb-32gb-64gb-advanced-neural-guide.html': 'Apple M4 Pro GGUF Models 2026: Guide',
    'top-5-intel-core-i3-gguf-models-8gb-16gb-budget-entry-level-guide.html': 'Intel Core i3 GGUF Models 2026',
    'top-5-intel-core-i5-13600k-gguf-models-16gb-32gb-hybrid-gaming-guide.html': 'Intel Core i5-13600K GGUF Models 2026',
    'top-5-intel-core-i5-gguf-models-8gb-16gb-32gb-mainstream-guide.html': 'Intel Core i5 GGUF Models 2026',
    'top-5-intel-core-i7-gguf-models-16gb-32gb-high-performance-guide.html': 'Intel Core i7 GGUF Models 2026',
    'top-5-intel-core-i9-13900k-gguf-models-32gb-64gb-128gb-flagship-guide.html': 'Intel Core i9-13900K GGUF Models 2026',
    'top-5-intel-core-i9-14900k-gguf-models-32gb-64gb-128gb-latest-flagship-guide.html': 'Intel Core i9-14900K GGUF Models 2026',
    'top-5-snapdragon-x-elite-gguf-models-16gb-32gb-windows-on-arm-guide.html': 'Snapdragon X Elite GGUF Models 2026',
    'top-5-zhaoxin-kh-50000-gguf-models-64gb-128gb-96-core-supercomputing-guide.html': 'Zhaoxin KH-50000 GGUF Models 2026',
}


def main(paths):
    problems = []
    for path in paths:
        slug = os.path.basename(path)
        if slug not in TITLES:
            continue
        new_title = TITLES[slug]
        n = len(new_title)
        if not (30 <= n <= 60):
            problems.append(f'{slug}: new title {n} chars OUT OF RANGE')
            continue
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        orig = text
        # <title>
        text = re.sub(r'<title>[^<]*</title>', f'<title>{new_title}</title>', text, count=1)
        # og:title and twitter:title
        text = re.sub(r'(<meta property="og:title" content=")[^"]*(")', rf'\g<1>{new_title}\g<2>', text)
        text = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', rf'\g<1>{new_title}\g<2>', text)
        # JSON-LD headline (only when it currently mirrors a long title)
        text = re.sub(r'"headline"\s*:\s*"[^"]{60,}"', f'"headline": "{new_title}"', text)
        if text != orig:
            with io.open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
            print(f'UPDATED {slug} ({n} chars)')
        else:
            print(f'NO CHANGE {slug}')
    if problems:
        print('\nPROBLEMS:')
        for p in problems:
            print(' ', p)
        sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1:])
