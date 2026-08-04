"""Modernize the top-20 model lists in the ranking guides to 2026 models.

Each entry is an <h3>N. Old Model - Description</h3> followed by a
Model Specifications block (<p><strong>Model Specifications</strong></p> with
a <ul> of Parameters/Context/License/Hardware). We replace both the heading
and the spec lines using a per-guide ordered mapping. Idempotent: entries
whose heading already matches a new model are left alone.
"""
import io
import os
import re
import sys

# guide slug -> ordered list of (old_heading_fragment, new_heading, new_specs)
# new_specs is a list of 4 <li> strings (Parameters, Context, License, Hardware).
UPDATES = {
    'best-ai-coding-assistant-models-ultimate-ranking-2025.html': [
        ('CodeLlama 34B - Meta', 'Qwen3-Coder-480B-A35B - The Open Coding Flagship',
         ['Parameters: 480B total / 35B active (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM, multi-GPU for full precision (GGUF from 13GB)']),
        ('GPT-4 Turbo - OpenAI', 'DeepSeek-V4-Pro - The Reasoning Coding Engine',
         ['Parameters: ~1.6T total / 49B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT (open weights)',
          'Hardware Requirements: 128GB+ RAM (GGUF from 40GB)']),
        ('Claude 3 Opus - Anthropic', 'GLM-5 - The Agentic Coding Specialist',
         ['Parameters: 355B total / 32B active (MoE)',
          'Context Length: 200K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM (GGUF from 20GB)']),
        ('Qwen2.5-Coder 32B - Alibaba', 'Qwen3-Coder-30B-A3B - The Efficient Coder',
         ['Parameters: 30B total / 3B active (MoE)',
          'Context Length: 128K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 16-32GB RAM, runs on 8GB VRAM']),
        ('DeepSeek-Coder V2 33B - Advanced', 'DeepSeek-V4-Flash - The Fast Coder',
         ['Parameters: ~284B total / 13B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT',
          'Hardware Requirements: 32-64GB RAM (GGUF from 8GB)']),
    ],
    'best-ai-analysis-models-ultimate-ranking-2025.html': [
        ('DeepSeek R1 (32B) - The Transparent', 'DeepSeek-V4-Pro - The Transparent Analytical Reasoner',
         ['Parameters: ~1.6T total / 49B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT (open weights)',
          'Hardware Requirements: 128GB+ RAM (GGUF from 40GB)']),
        ('Claude 3 Opus - The Comprehensive', 'Qwen3-Next-480B - The Business Intelligence Workhorse',
         ['Parameters: 480B total / 36.6B active (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM (GGUF from 36GB)']),
        ('GPT-4 Turbo - The Versatile', 'GLM-4.7 - The Versatile Data Analysis Partner',
         ['Parameters: 355B total / 32B active (MoE)',
          'Context Length: 200K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64GB RAM (GGUF from 18GB)']),
        ('Qwen 3 (32B) - The Multilingual', 'Qwen3-Next-80B-A3B - The Multilingual Analysis Specialist',
         ['Parameters: 80B total / 3.3B active (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 16-32GB RAM (GGUF from 5GB)']),
    ],
    'best-ai-brainstorming-models-ultimate-ranking-2025.html': [
        ('Claude 3 Opus - The Creative Philosopher', 'Kimi K2.7 - The Creative Philosopher',
         ['Parameters: 1T total / 32B active (MoE)',
          'Context Length: 256K tokens',
          'License: Modified MIT (open weights)',
          'Hardware Requirements: 64-128GB RAM (GGUF from 32GB)']),
        ('Gemini Pro - The Multimodal', 'MiniMax M2.7 - The Multimodal Creative Innovator',
         ['Parameters: 236B total / 5B active (MoE)',
          'Context Length: 1M tokens',
          'License: Commercial-friendly open weights',
          'Hardware Requirements: 32-64GB RAM (GGUF from 13GB)']),
        ('Llama 3.1 (70B) - The Open', 'Llama 4 Scout - The Open Creative Foundation',
         ['Parameters: 109B total / 17B active (MoE)',
          'Context Length: 10M tokens',
          'License: Llama 4 Community License',
          'Hardware Requirements: 32-64GB RAM (GGUF from 13GB)']),
        ('Qwen 3 (32B) - The Multilingual', 'Qwen3-235B-A35B - The Multilingual Creative Explorer',
         ['Parameters: 235B total / 35B active (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM (GGUF from 28GB)']),
        ('Mistral Large - The Efficient', 'Mistral Large 3 - The Efficient Creative Specialist',
         ['Parameters: 675B total / 41B active (MoE)',
          'Context Length: 262K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM (GGUF from 41GB)']),
        ('Hermes 3 (70B) - The Conversational', 'Hermes 4 - The Conversational Creative Collaborator',
         ['Parameters: Qwen3-based MoE',
          'Context Length: 128K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 32-64GB RAM']),
        ('Yi-34B - The Balanced', 'Nemotron-3-Nano-30B-A3B - The Balanced Creative Assistant',
         ['Parameters: 30B total / 3B active (MoE)',
          'Context Length: 128K tokens',
          'License: NVIDIA Open Model License',
          'Hardware Requirements: 16-32GB RAM (GGUF from 3GB)']),
        ('Mixtral 8x22B - The Specialized', 'DeepSeek-V4-Flash - The Specialized Creative Ensemble',
         ['Parameters: ~284B total / 13B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT',
          'Hardware Requirements: 32-64GB RAM (GGUF from 8GB)']),
    ],
    'best-ai-multilingual-models-ultimate-ranking-2025.html': [
        ('Qwen 2.5 (Alibaba) - The Multilingual', 'Qwen3-Next (Alibaba) - The Multilingual Champion',
         ['Parameters: 80B-480B (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 16-128GB RAM depending on size']),
        ('Yi-34B (01.AI) - The Bilingual', 'GLM-4.7 (Zhipu) - The Bilingual Excellence Leader',
         ['Parameters: 355B total / 32B active (MoE)',
          'Context Length: 200K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64GB RAM (GGUF from 18GB)']),
        ('GPT-4 (OpenAI) - The Versatile', 'DeepSeek-V4 (DeepSeek) - The Versatile Multilingual Powerhouse',
         ['Parameters: ~1.6T total / 49B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT (open weights)',
          'Hardware Requirements: 128GB+ RAM (GGUF from 40GB)']),
        ('Claude 3 Opus (Anthropic) - The Culturally', 'MiniMax M2.7 (MiniMax) - The Culturally Intelligent Assistant',
         ['Parameters: 236B total / 5B active (MoE)',
          'Context Length: 1M tokens',
          'License: Commercial-friendly open weights',
          'Hardware Requirements: 32-64GB RAM (GGUF from 13GB)']),
        ('Gemma 2 27B (Google) - The Open-Source', 'Gemma 4 26B (Google) - The Open-Source Multilingual Solution',
         ['Parameters: 26B total / 4B active (MoE)',
          'Context Length: 128K+ tokens',
          'License: Gemma Terms of Use',
          'Hardware Requirements: 16-32GB RAM (GGUF from 5GB)']),
    ],
    'best-ai-research-assistant-models-ultimate-ranking-2025.html': [
        ('DeepSeek R1 (32B) - The Reasoning', 'DeepSeek-V4-Pro - The Reasoning Pioneer',
         ['Parameters: ~1.6T total / 49B active (MoE)',
          'Context Length: 1M tokens',
          'License: MIT (open weights)',
          'Hardware Requirements: 128GB+ RAM (GGUF from 40GB)']),
        ('Claude 3 Opus - The Comprehensive', 'Kimi K3 - The Comprehensive Scholar',
         ['Parameters: 2.8T total / 32B active (MoE)',
          'Context Length: 1M tokens',
          'License: Modified MIT (open weights)',
          'Hardware Requirements: 128GB+ RAM (GGUF from 64GB)']),
        ('GPT-4 Turbo - The Versatile', 'Qwen3-Next-480B - The Versatile Research Partner',
         ['Parameters: 480B total / 36.6B active (MoE)',
          'Context Length: 256K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 64-128GB RAM (GGUF from 36GB)']),
        ('Qwen 3 (32B) - The Multilingual', 'GLM-4.7-Flash - The Multilingual Research Expert',
         ['Parameters: 30B total / 3B active (MoE)',
          'Context Length: 200K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 16-32GB RAM (GGUF from 4GB)']),
        ('Gemini Pro - The Multimodal', 'Gemini 3.1 Pro (API) - The Multimodal Research Assistant',
         ['Parameters: closed (API only)',
          'Context Length: 2M tokens',
          'License: Proprietary API',
          'Hardware Requirements: none (cloud)']),
        ('Llama 3.1 (70B) - The Open', 'Llama 4 Scout - The Open Research Foundation',
         ['Parameters: 109B total / 17B active (MoE)',
          'Context Length: 10M tokens',
          'License: Llama 4 Community License',
          'Hardware Requirements: 32-64GB RAM (GGUF from 13GB)']),
    ],
    'top-20-local-ai-models-mobile-ai-agents-guide-2025.html': [
        ('Llama 3.2 3B', 'Qwen3-4B - The Mobile Reasoning Default',
         ['Parameters: 4B dense',
          'Context Length: 128K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 4-8GB RAM, runs on modern phones']),
        ('Phi-3 Mini', 'Phi-4-mini - The Edge Math Specialist',
         ['Parameters: 3.8B dense',
          'Context Length: 128K tokens',
          'License: MIT',
          'Hardware Requirements: 4-8GB RAM, 300+ tok/s on-device']),
        ('TinyLlama', 'Llama 4 Scout (1B distill) - The Tiny All-Rounder',
         ['Parameters: 1B class',
          'Context Length: 128K tokens',
          'License: Llama 4 Community License',
          'Hardware Requirements: 2-4GB RAM']),
        ('StableLM 3B 4E1T', 'Ministral 3 3B - The Efficient On-Device Model',
         ['Parameters: 3B dense',
          'Context Length: 128K+ tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 4GB RAM']),
        ('ReMM SLERP L2 3B', 'GLM-4-1.5B - The Agentic Tiny Model',
         ['Parameters: 1.5B dense',
          'Context Length: 128K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 2-4GB RAM']),
        ('NeuralHermes 2.5 Yi 1.5B', 'Qwen3-1.7B - The Compact Chat Model',
         ['Parameters: 1.7B dense',
          'Context Length: 32K tokens',
          'License: Apache 2.0',
          'Hardware Requirements: 2-4GB RAM']),
        ('OpenELM 1.1B', 'Gemma 3 1B - The Lightweight Open Model',
         ['Parameters: 1B dense',
          'Context Length: 32K tokens',
          'License: Gemma Terms of Use',
          'Hardware Requirements: 2GB RAM']),
        ('Grok-1 0.5B', 'Nemotron-3-Nano-30B-A3B (mini) - The Reasoning Nano',
         ['Parameters: 30B total / 3B active (MoE)',
          'Context Length: 128K tokens',
          'License: NVIDIA Open Model License',
          'Hardware Requirements: 16GB RAM (GGUF from 3GB)']),
    ],
}


def spec_block(specs):
    lis = '\n'.join(f'            <li>{s}</li>' for s in specs)
    return f'''        <p><strong>Model Specifications</strong>:</p>
        <ul>
{lis}
        </ul>'''


def main(paths):
    for path in paths:
        slug = os.path.basename(path)
        if slug not in UPDATES:
            continue
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        changed = 0
        for old_frag, new_heading, specs in UPDATES[slug]:
            # Match the h3 whose text contains old_frag (keep the number prefix)
            m = re.search(r'(<h3>\d+\. )([^<]*)' + re.escape(old_frag[:20]) + r'[^<]*</h3>', text)
            if not m:
                print('  NO MATCH:', old_frag[:40])
                continue
            # Build replacement: heading + following Model Specifications block
            head_end = m.end()
            spec_p = re.search(
                r'\n(\s*)<p><strong>Model Specifications</strong>:</p>\n'
                r'(?:\s*<ul>.*?</ul>)\n?',
                text[head_end:], re.S)
            num = m.group(1)
            if spec_p:
                repl = f'{num}{new_heading}</h3>\n\n' + spec_block(specs)
                text = text[:m.start()] + repl + text[head_end + spec_p.end():]
            else:
                repl = f'{num}{new_heading}</h3>'
                text = text[:m.start()] + repl + text[m.end():]
            changed += 1
        if changed:
            with io.open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
        print(f'{slug}: {changed} entries updated')


if __name__ == '__main__':
    main(sys.argv[1:])
