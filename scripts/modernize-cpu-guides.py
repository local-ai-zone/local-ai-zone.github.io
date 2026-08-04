"""Modernize CPU guide 'Top 5 GGUF Model Recommendations' tables.

Each table lists 5 models with (Rank, Model Name, Quantization, File Size,
Use Case, Download). We pick 2026 models per RAM tier and replace all 5 rows,
linking the Download column to this site's own model pages (../models/...).
Idempotent: skips tables that already start with a 2026 model.
"""
import io
import os
import re
import sys

# tier -> [(model name, quant, size, use case, local model page slug)]
TIERS = {
    4: [
        ('Qwen3-1.7B', 'Q4_K_M', '1.1 GB', 'Best tiny all-rounder', 'qwen3-1-7b.html'),
        ('Qwen3-0.6B', 'Q4_K_M', '0.5 GB', 'Minimal footprint', 'qwen3-0-6b.html'),
        ('Phi-4-mini', 'Q4_K_M', '2.3 GB', 'Math & reasoning (tight fit)', 'phi-4-mini-instruct.html'),
        ('Gemma 3 1B', 'Q4_K_M', '0.8 GB', 'Lightweight generation', 'gemma-3-1b-it-qat-q4-0.html'),
        ('Qwen3-Embedding-0.6B', 'F16', '1.2 GB', 'Local RAG embeddings', 'qwen3-embedding-0-6b.html'),
    ],
    8: [
        ('Qwen3-4B', 'Q4_K_M', '2.5 GB', 'Best small all-rounder', 'qwen3-4b.html'),
        ('Phi-4-mini', 'Q4_K_M', '2.3 GB', 'Math & reasoning specialist', 'phi-4-mini-instruct.html'),
        ('Gemma 4 E4B', 'Q4_K_M', '2.6 GB', 'Efficient MoE on low RAM', 'gemma-4-e4b-it.html'),
        ('Qwen3-1.7B', 'Q4_K_M', '1.1 GB', 'Lightweight chat', 'qwen3-1-7b.html'),
        ('Qwen3-0.6B', 'Q4_K_M', '0.5 GB', 'Minimal footprint', 'qwen3-0-6b.html'),
    ],
    16: [
        ('Qwen3-8B', 'Q4_K_M', '5.2 GB', 'High-quality reasoning', 'qwen3-8b.html'),
        ('Qwen3-14B', 'Q4_K_M', '9.0 GB', 'Balanced generation', 'qwen3-14b.html'),
        ('Phi-4', 'Q4_K_M', '8.9 GB', 'Math & code specialist', 'phi-4.html'),
        ('Mistral Small 3 24B', 'Q4_K_M', '13.2 GB', 'Large dense option', 'mistral-small-3-1-24b-instruct-2503.html'),
        ('Ministral 3 14B', 'Q4_K_M', '8.8 GB', 'Efficient reasoning', 'ministral-3-14b-instruct-2512.html'),
    ],
    32: [
        ('Qwen3-30B-A3B', 'Q4_K_M', '17.5 GB', 'Best MoE value', 'qwen3-30b-a3b-instruct-2507.html'),
        ('GLM-4.7-Flash', 'Q4_K_M', '17.0 GB', 'Agentic + coding', 'glm-4-7-flash.html'),
        ('Nemotron-3-Nano-30B-A3B', 'Q4_K_M', '17.0 GB', 'Reasoning-tuned MoE', 'nemotron-3-nano-30b-a3b.html'),
        ('Gemma 4 26B-A4B', 'Q4_K_M', '15.2 GB', 'Efficient flagship', 'gemma-4-26b-a4b-it.html'),
        ('Qwen3-Coder-30B-A3B', 'Q4_K_M', '17.5 GB', 'Coding specialist', 'qwen3-coder-30b-a3b-instruct.html'),
    ],
    64: [
        ('Qwen3-Next-80B-A3B', 'Q4_K_M', '47 GB', 'Best overall MoE', 'qwen3-next-80b-a3b-instruct.html'),
        ('Llama 4 Scout', 'Q4_K_M', '63 GB', '10M-token context', 'llama-4-scout-17b-16e-instruct.html'),
        ('Nemotron-3-Super-120B-A12B', 'Q4_K_M', '66 GB', 'Frontier reasoning', 'nvidia-nemotron-3-super-120b-a12b.html'),
        ('Gemma 4 31B', 'Q4_K_M', '18 GB', 'Flagship dense', 'gemma-4-31b-it.html'),
        ('Qwen3-30B-A3B (Q8)', 'Q8_0', '35 GB', 'Max-quality small MoE', 'qwen3-30b-a3b-instruct-2507.html'),
    ],
    96: [
        ('Qwen3-235B-A22B', 'Q3_K_M', '98 GB', 'Frontier general MoE', 'qwen3-235b-a22b-instruct-2507.html'),
        ('DeepSeek-V4-Flash', 'Q2_K_M', '80 GB', 'Frontier reasoning, 1M ctx', 'deepseek-v4-flash.html'),
        ('MiniMax M2.7', 'Q3_K_M', '99 GB', '1M-context MoE', 'minimax-m2-7.html'),
        ('Nemotron-3-Super-120B-A12B', 'Q6_K', '99 GB', 'Max-quality reasoning', 'nvidia-nemotron-3-super-120b-a12b.html'),
        ('Llama 4 Maverick', 'Q2_K_M', '111 GB', '400B agentic frontier', 'llama-4-maverick-17b-128e-instruct.html'),
    ],
    128: [
        ('DeepSeek-V4-Flash', 'Q3_K_M', '118 GB', 'Frontier reasoning, 1M ctx', 'deepseek-v4-flash.html'),
        ('Qwen3-235B-A22B', 'Q4_K_M', '131 GB', 'Max-quality MoE', 'qwen3-235b-a22b-instruct-2507.html'),
        ('MiniMax M2.5', 'Q4_K_M', '131 GB', '1M-context champion', 'minimax-m2-5.html'),
        ('Qwen3-Coder-480B-A35B', 'Q2_K_M', '133 GB', 'Flagship coding', 'qwen3-coder-480b-a35b-instruct.html'),
        ('Llama 4 Maverick', 'Q3_K_M', '167 GB', '400B agentic frontier', 'llama-4-maverick-17b-128e-instruct.html'),
    ],
    192: [
        ('DeepSeek-V4-Flash', 'Q4_K_M', '158 GB', 'Frontier reasoning, 1M ctx', 'deepseek-v4-flash.html'),
        ('MiniMax M2.7', 'Q4_K_M', '131 GB', '1M-context MoE', 'minimax-m2-7.html'),
        ('Qwen3-Coder-480B-A35B', 'Q2_K_M', '133 GB', 'Flagship coding', 'qwen3-coder-480b-a35b-instruct.html'),
        ('Llama 4 Maverick', 'Q3_K_M', '167 GB', '400B agentic frontier', 'llama-4-maverick-17b-128e-instruct.html'),
        ('Qwen3-235B-A22B', 'Q5_K_M', '164 GB', 'Max-quality general', 'qwen3-235b-a22b-instruct-2507.html'),
    ],
    256: [
        ('Qwen3-Coder-480B-A35B', 'Q3_K_M', '200 GB', 'Flagship coding', 'qwen3-coder-480b-a35b-instruct.html'),
        ('DeepSeek-V4-Flash', 'Q5_K_M', '197 GB', 'Frontier reasoning, 1M ctx', 'deepseek-v4-flash.html'),
        ('Llama 4 Maverick', 'Q4_K_M', '222 GB', '400B agentic frontier', 'llama-4-maverick-17b-128e-instruct.html'),
        ('MiniMax M3', 'Q4_K_M', '160 GB', 'Next-gen 1M-context MoE', 'minimax-m3.html'),
        ('Qwen3-235B-A22B', 'Q6_K', '197 GB', 'Max-quality general', 'qwen3-235b-a22b-instruct-2507.html'),
    ],
}

# Slugs that should not be touched (index page)
SKIP = {'index.html'}

# Markers of a modernized table: any of these model names in a row
MODERN = ('Qwen3-', 'GLM-4.7', 'Nemotron-3', 'Gemma 4', 'Llama 4', 'DeepSeek-V4',
          'MiniMax', 'Phi-4', 'Mistral Small 3', 'Ministral 3', 'Qwen3-Coder')


def tier_from_heading(heading):
    m = re.search(r'(\d+)\s*GB', heading)
    if not m:
        return None
    gb = int(m.group(1))
    if gb < 4:
        return None  # leave sub-4GB tiers untouched
    # snap to nearest defined tier
    keys = sorted(TIERS)
    return min(keys, key=lambda k: abs(k - gb))


def rows_html(tier):
    rows = []
    for i, (name, quant, size, use, slug) in enumerate(TIERS[tier], 1):
        rows.append(f'''                <tr>
                    <td>{i}</td>
                    <td><strong>{name}</strong></td>
                    <td>{quant}</td>
                    <td>{size}</td>
                    <td>{use}</td>
                    <td><a href="../models/{slug}">Download</a></td>
                </tr>''')
    return '\n'.join(rows)


def main(paths):
    for path in paths:
        slug = os.path.basename(path)
        if slug in SKIP:
            continue
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        changed = 0
        tier = None
        # Split into chunks starting at each tier-bearing heading. Two known
        # patterns: '<h3>Top 5 GGUF Model Recommendations ...' and
        # '<h2>...GB RAM Configuration</h2>'. Both carry the RAM tier.
        parts = re.split(r'(<h[23]>(?:Top 5 GGUF Model Recommendations|.*?GB RAM Configuration)[^<]*</h[23]>)', text)
        out = []
        for part in parts:
            if part.startswith(('<h3>Top 5', '<h2>')):
                out.append(part)
                tier = tier_from_heading(part)
                if tier is None:
                    continue
                continue
            if tier is not None and '<table>' in part:
                m = re.search(r'(<table>.*?</table>)', part, re.S)
                cells = re.findall(r'<strong>([^<]+)</strong>', m.group(1))
                if m and not any(any(x in c for x in MODERN) for c in cells):
                    # Preserve the existing header row (column names vary by page)
                    thead = re.search(r'(<thead>.*?</thead>)', m.group(1), re.S)
                    head_html = thead.group(1) if thead else ''
                    new_table = '<table>' + head_html + '\n            <tbody>\n' + rows_html(tier) + '\n            </tbody>\n        </table>'
                    part = part[:m.start()] + new_table + part[m.end():]
                    changed += 1
                    tier = None
            out.append(part)
        text = ''.join(out)
        if changed:
            with io.open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
        print(f'{slug}: {changed} tables updated')


if __name__ == '__main__':
    main(sys.argv[1:])
