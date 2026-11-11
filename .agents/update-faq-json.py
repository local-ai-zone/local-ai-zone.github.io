#!/usr/bin/env python3
"""
Update FAQ JSON-LD structured data to add Haiku 5.5 and update "What should teams watch for"
"""

import re
import json

file_path = r"e:\local-ai-zone.github.io\blog\October_2026_AI_Model_Updates.html"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# New Haiku FAQ JSON
haiku_faq = {
    "@type": "Question",
    "name": "What is Claude Haiku 5.5?",
    "acceptedAnswer": {
        "@type": "Answer",
        "text": "Claude Haiku 5.5 was released on October 7, 2026 by Anthropic. It is priced at $0.10 per million input tokens and $0.50 per million output tokens for contexts up to 100K tokens, stepping to $0.50/$2.50 for longer contexts. It supports a 1M-token context window, 128K output tokens per response, and the effort parameter. It is 75 to 90 percent cheaper than Claude Haiku 4.5 and is available on the Claude Platform, AWS Bedrock, Google Cloud Vertex AI, and Microsoft Azure. It is Anthropic's answer to GPT-6 Luna in the sub-dollar-per-task tier."
    }
}

# Updated "What should teams watch for" text
updated_watch_text = "Three things. First, Mistral Large 4 weights — Mistral says they ship by end of October, with Reuters reporting October 27; this turns a guardrailed preview into something the local ecosystem can quantize and run. Second, whether any frontier lab repeats OpenAI's move of cancelling a release after internal safety tests, because that changes how much an announced model can be relied on in a roadmap at all. Third, Haiku 4.5's retirement timeline — now that Haiku 5.5 has shipped (October 7) with 75-90% cost savings, teams running Haiku 4.5 should plan migration paths."

# Find the FAQ JSON-LD section
faq_pattern = r'("FAQPage",\s+"mainEntity":\s+\[)(.*?)(\]\s+})'
faq_match = re.search(faq_pattern, content, re.DOTALL)

if not faq_match:
    print("Could not find FAQ JSON-LD section")
    exit(1)

# Parse the FAQ array (it's not pure JSON due to formatting, so we need to be careful)
# Instead of parsing, let's use string replacement

# 1. Add Haiku FAQ after Sonnet FAQ
sonnet_faq_end = '{"@type": "Question", "name": "What is Claude Sonnet 5.5?", "acceptedAnswer": {"@type": "Answer", "text": "Claude Sonnet 5.5 launched September 28, 2026 at the same $2/$10 per million tokens as Sonnet 5, with cache reads at $0.20. Anthropic says it runs more than 30% faster and costs up to 30% less per task, and Artificial Analysis measures it at 56.0 on Intelligence Index v4.3.2 — second only to Opus 5.5. It leads Terminal-Bench 4.0 at 63.6% against Opus 5.5\'s 59.6%, and it is now the model behind the free tier on claude.ai. At max effort it spent 410 million tokens on the index run and costs $7.60 a task, against $1.08 at high effort."}},'

haiku_faq_json = '        {"@type": "Question", "name": "What is Claude Haiku 5.5?", "acceptedAnswer": {"@type": "Answer", "text": "Claude Haiku 5.5 was released on October 7, 2026 by Anthropic. It is priced at $0.10 per million input tokens and $0.50 per million output tokens for contexts up to 100K tokens, stepping to $0.50/$2.50 for longer contexts. It supports a 1M-token context window, 128K output tokens per response, and the effort parameter. It is 75 to 90 percent cheaper than Claude Haiku 4.5 and is available on the Claude Platform, AWS Bedrock, Google Cloud Vertex AI, and Microsoft Azure. It is Anthropic\'s answer to GPT-6 Luna in the sub-dollar-per-task tier."}},'

if sonnet_faq_end in content:
    content = content.replace(sonnet_faq_end, sonnet_faq_end + '\n' + haiku_faq_json)
    print("Added Haiku FAQ after Sonnet FAQ")
else:
    print("Could not find Sonnet FAQ end marker")

# 2. Update "What should teams watch for"
old_watch_text = '"What should teams watch for in the rest of October 2026?", "acceptedAnswer": {"@type": "Answer", "text": "Three things: general availability for Gemini 4 Argon, which has a published price and no date; Claude Haiku 5.5, which Anthropic has said is coming and which would compete directly with GPT-6 Luna\'s $0.07-per-task economics; and whether any frontier lab repeats OpenAI\'s move of cancelling a release after internal safety tests, since that changes how much an announced model can be relied on in a roadmap."}'

new_watch_text = '"What should teams watch for in the rest of October 2026?", "acceptedAnswer": {"@type": "Answer", "text": "Three things. First, Mistral Large 4 weights — Mistral says they ship by end of October, with Reuters reporting October 27. Second, whether any frontier lab repeats OpenAI\'s move of cancelling a release after internal safety tests, because that changes how much an announced model can be relied on in a roadmap. Third, Haiku 4.5\'s retirement timeline — now that Haiku 5.5 has shipped (October 7) with 75-90% cost savings, teams running Haiku 4.5 should plan migration paths."}'

if old_watch_text in content:
    content = content.replace(old_watch_text, new_watch_text)
    print("Updated 'What should teams watch for' FAQ")
else:
    print("Could not find old watch text")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("FAQ JSON-LD updates complete!")
