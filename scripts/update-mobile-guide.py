import io

f = 'guides/top-20-local-ai-models-mobile-ai-agents-guide-2025.html'
text = open(f, encoding='utf-8').read()
start = text.find('<h3>1. Qwen3-4B')
end = text.find('<h2>Performance Considerations</h2>')

entries = []
models = [
    ("1. Qwen3-4B - The Mobile Reasoning Default",
     "Qwen3-4B is Alibaba's newest compact reasoning model, specifically designed for edge devices and mobile applications. With its dense 4B design and strong reasoning for its size, it's the ideal mobile AI agent default for general language understanding and tool calling in 2026.",
     ["Parameters: 4B", "Recommended RAM: 4GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Content summarization, basic chat interfaces, on-device agents"]),
    ("2. Phi-4-mini - The Edge Math Specialist",
     "Microsoft's Phi-4-mini delivers exceptional reasoning and math performance in a 3.8B package, optimized specifically for edge and mobile deployments in 2026. It offers state-of-the-art reasoning capabilities for its size in a mobile-friendly format.",
     ["Parameters: 3.8B", "Recommended RAM: 4GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Mobile assistants, math tutoring, structured reasoning tasks"]),
    ("3. Gemma 4 E4B - The Multimodal Edge Model",
     "Google's Gemma 4 E4B is the newest edge-optimized model, offering native audio, video, and image understanding with QAT quantization-aware training and multi-token prediction — the strongest 2026 option for multimodal mobile agents.",
     ["Parameters: 4.5B effective (Per-Layer Embeddings)", "Recommended RAM: 4-8GB+", "Quantization: QAT-optimized, Q4_K_M", "Use cases: Vision + text agents, on-device multimodal apps, voice assistants"]),
    ("4. Ministral 3 14B (Reasoning) - The Efficient On-Device Powerhouse",
     "Mistral's newest reasoning-tuned Ministral brings frontier-adjacent reasoning to efficient on-device form, providing balanced capabilities for mobile applications requiring reliable, consistent performance.",
     ["Parameters: 14B", "Recommended RAM: 8-16GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Educational apps, note-taking, task management, research assistance"]),
    ("5. GLM-4-1V-9B-Thinking - The Agentic Tiny Model",
     "Zhipu's GLM-4-1V-9B-Thinking is optimized for mobile deployment with enhanced reasoning and vision capabilities while maintaining efficiency for edge devices.",
     ["Parameters: 9B", "Recommended RAM: 8GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Complex reasoning tasks, multi-step problem solving, visual agents"]),
    ("6. Qwen3-1.7B - The Compact Chat Model",
     "Qwen3-1.7B provides conversational capabilities optimized for mobile deployment, with strong reasoning for its size class.",
     ["Parameters: 1.7B", "Recommended RAM: 2GB+", "Quantization: Q4_K_M, Q3_K_L", "Use cases: Chat applications, voice assistants, lightweight agents"]),
    ("7. Gemma 3 1B - The Lightweight Open Model",
     "Google's Gemma 3 1B is the lightweight open model for on-device deployment, ideal for low-memory mobile AI agents and basic assistant tasks.",
     ["Parameters: 1B", "Recommended RAM: 2GB+", "Quantization: Q4_K_M, Q2_K", "Use cases: Basic chat, simple agent loops, notification intelligence"]),
    ("8. Nemotron-3-Nano-30B-A3B - The Reasoning Nano",
     "NVIDIA's Nemotron-3-Nano-30B-A3B brings enterprise reasoning to an efficient 3B-active MoE design — 30B of knowledge with a tiny active footprint suitable for capable mobile devices and edge boxes.",
     ["Parameters: 30B total / 3B active (MoE)", "Recommended RAM: 8GB+", "Quantization: Q4_K_M, Q2_K", "Use cases: Reasoning-heavy mobile agents, edge analytics, smart assistants"]),
    ("9. LFM2-5-1.2B-Thinking - The Ultra-Efficient Thinker",
     "Liquid AI's newest Liquid Foundation Model thinking variant packs dedicated reasoning into 1.2B parameters — the smallest 2026 model with an explicit thinking mode for ultra-low-power agents.",
     ["Parameters: 1.2B", "Recommended RAM: 1.5-2GB+", "Quantization: Q4_K_M, Q3_K_L", "Use cases: Wearables, IoT agents, low-latency on-device reasoning"]),
    ("10. MiniCPM5-1B - The Versatile Tiny Agent",
     "MiniCPM5-1B is the newest generation of the efficient MiniCPM family, delivering strong instruction following and agent capability in a sub-1GB footprint.",
     ["Parameters: 1B", "Recommended RAM: 1.5-2GB+", "Quantization: Q4_K_M, Q3_K_L", "Use cases: Wearable assistants, simple agents, embedded chat"]),
    ("11. Qwen3-VL-4B - The Visual Mobile Agent",
     "Qwen3-VL-4B is the compact vision-language option for mobile agents that need to understand screens, images, and documents on-device — Alibaba's newest small VL model.",
     ["Parameters: 4B (vision-language)", "Recommended RAM: 4-8GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Screen reading, OCR, photo understanding, visual agents"]),
    ("12. Llama 4 Scout (17B-16E) - The Efficient Frontier MoE",
     "Llama 4 Scout's 17B-active MoE delivers frontier-grade capability with a 10M-token context — for high-end tablets and edge boxes that need serious on-device intelligence.",
     ["Parameters: 109B total / 17B active (MoE)", "Recommended RAM: 16-32GB+", "Quantization: Q4_K_M, Q3_K_L", "Use cases: High-end mobile AI, on-device research, long-context agents"]),
    ("13. Gemma 4 E2B - The Ultra-Light Edge Model",
     "Google's Gemma 4 E2B is the smallest Gemma 4 tier — native multimodal understanding in a 2.3B package for phones with tight memory budgets.",
     ["Parameters: 2.3B (Per-Layer Embeddings)", "Recommended RAM: 2-4GB+", "Quantization: QAT-optimized", "Use cases: Budget phones, smart home devices, embedded agents"]),
    ("14. Qwen3-0.6B - The Micro Assistant",
     "Qwen3-0.6B is the entry-level Qwen3 for extreme low-power devices, providing basic reasoning and chat in under 1GB of memory.",
     ["Parameters: 0.6B", "Recommended RAM: 1GB+", "Quantization: Q4_K_M, Q3_K_S", "Use cases: Feature phones, IoT, embedded assistants"]),
    ("15. Phi-4-mini-Reasoning - The Tiny Reasoning Specialist",
     "Microsoft's Phi-4-mini-Reasoning variant adds an explicit reasoning mode to the efficient 3.8B Phi-4-mini base, ideal for structured on-device thinking tasks.",
     ["Parameters: 3.8B", "Recommended RAM: 4GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Multi-step reasoning, math on device, decision support"]),
    ("16. LFM2-700M - The Ultra-Micro Agent",
     "Liquid AI's LFM2-700M is one of the most efficient language models available, bringing usable intelligence to microcontrollers and ultra-low-power wearables.",
     ["Parameters: 0.7B", "Recommended RAM: 1GB", "Quantization: Q4_K_M, Q3_K_S", "Use cases: Microcontrollers, smart sensors, basic intent parsing"]),
    ("17. Nemotron-3-Nano-Omni-30B-A3B-Reasoning - The Omni Reasoning Nano",
     "NVIDIA's omni reasoning variant of Nemotron-3-Nano adds multimodal understanding to the efficient 30B-A3B design for on-device voice and vision agents.",
     ["Parameters: 30B total / 3B active (MoE)", "Recommended RAM: 8-16GB+", "Quantization: Q4_K_M", "Use cases: Voice assistants, multimodal edge agents, smart displays"]),
    ("18. MiniCPM5-1B-Claude-Fable5-Thinking - The Distilled Thinker",
     "Community distills of frontier reasoning into MiniCPM5-1B bring frontier-class thinking patterns to sub-1GB mobile form — the cutting edge of small-model distillation in 2026.",
     ["Parameters: 1B", "Recommended RAM: 1.5-2GB+", "Quantization: Q4_K_M, Q3_K_L", "Use cases: Reasoning-light wearables, distilled thinking agents"]),
    ("19. Phi-4-mini - The Reliable Edge Workhorse",
     "The original Phi-4-mini remains a dependable 2026 workhorse for mobile agents needing consistent, low-latency language understanding without the overhead of reasoning modes.",
     ["Parameters: 3.8B", "Recommended RAM: 4GB+", "Quantization: Q4_K_M, Q5_K_M", "Use cases: Fast chat, classification, lightweight automation"]),
]

for title, desc, specs in models:
    ul = "\n".join(f"                        <li>{s}</li>" for s in specs)
    entries.append(f"""                    <h3>{title}</h3>
                    <p>{desc}</p>
                    <ul>
{ul}
                    </ul>
""")

block = "\n".join(entries)
text = text[:start] + block + text[end:]
open(f, 'w', encoding='utf-8').write(text)
print(f"replaced {end-start} chars with {len(block)} chars")
