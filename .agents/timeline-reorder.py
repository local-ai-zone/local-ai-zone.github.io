#!/usr/bin/env python3
"""
Reorder timeline cards in October 2026 AI Model Updates blog post
from oldest-first to newest-first, and insert Claude Haiku 5.5 (Oct 7) card.
"""

import re

file_path = r"e:\local-ai-zone.github.io\blog\October_2026_AI_Model_Updates.html"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the Oct 7 Haiku card to insert
haiku_card = """                <div class="model-release">
                    <div class="model-badge">Oct 7</div>
                    <div class="model-badge" style="background: #d97757;">Anthropic</div>
                    <h3>Claude Haiku 5.5 released</h3>
                    <p>Anthropic shipped Claude Haiku 5.5 on October 7, 2026 — the small/fast tier answer to GPT-6 Luna's $0.07-per-task economics. Pricing is <strong>$0.10 per million input tokens and $0.50 per million output</strong> (up to 100K context), rising to $0.50/$2.50 over 100K, with a 1M-token context window, 128K output tokens, and full effort-parameter support. That is 75–90% cheaper than Claude Haiku 4.5. Available on the Claude Platform, AWS Bedrock, Google Cloud Vertex AI, and Microsoft Azure.</p>
                </div>
"""

# Find the timeline section - from Sep 27 card to the verification window card
# We need to extract all cards, reorder them, add Haiku, then replace

# Pattern to match from Sep 27 card through Oct 3-6 verification
pattern = r'(                <div class="model-release">\s+<div class="model-badge">Sep 27</div>.*?<div class="model-badge">Oct 3–6</div>.*?</div>)'

match = re.search(pattern, content, re.DOTALL)
if not match:
    print("Could not find timeline section")
    exit(1)

timeline_section = match.group(1)

# Split into individual cards - each starts with <div class="model-release">
cards = re.split(r'(?=                <div class="model-release")', timeline_section)
cards = [c for c in cards if c.strip()]  # Remove empty

print(f"Found {len(cards)} cards")

# Extract date from each card to help with reordering
def get_date_key(card):
    """Extract sortable date key from card"""
    date_match = re.search(r'<div class="model-badge">(Sep \d+|Oct \d+|Oct \d+–\d+)</div>', card)
    if not date_match:
        return "9999"  # Put at end if no date
    
    date_str = date_match.group(1)
    
    # Convert to sortable format (reverse order: newer first)
    if date_str.startswith("Sep"):
        day = int(date_str.split()[1])
        return f"1_{30-day:02d}"  # Sep dates sorted reverse within Sep
    elif date_str.startswith("Oct"):
        if "–" in date_str:  # Range like "Oct 3–6"
            return "9_99"  # Put verification window at end
        day = int(date_str.split()[1])
        return f"0_{100-day:02d}"  # Oct dates sorted reverse (higher = newer)
    
    return "9999"

# Sort cards by date (newest first)
sorted_cards = sorted(cards, key=get_date_key)

# Insert Haiku card after Oct 12 (which should be position 2 after Oct 13)
# Find Oct 12 position in sorted cards
oct12_idx = None
for i, card in enumerate(sorted_cards):
    if 'Oct 12' in card and 'Meta Muse Wonder' in card:
        oct12_idx = i
        break

if oct12_idx is not None:
    # Insert Haiku card right after Oct 12
    sorted_cards.insert(oct12_idx + 1, haiku_card)
    print(f"Inserted Haiku card after Oct 12 at position {oct12_idx + 1}")

# Also update verification window text
for i, card in enumerate(sorted_cards):
    if 'Verification window' in card:
        sorted_cards[i] = card.replace(
            'Oct 3–6',
            'Oct 3–14'
        ).replace(
            'Beyond Mistral\'s October 6 preview, Meta\'s October 12 frontier entry, and Google\'s October 13 general availability for Gemini 4 Argon',
            'Beyond Claude Haiku 5.5 (October 7), Mistral Large 4 preview (October 6), Meta Muse Wonder (October 12), and Gemini 4 Argon general availability (October 13)'
        ).replace(
            'the Mistral preview was read on October 7, and Meta Muse Wonder plus Gemini 4 Argon GA details were added October 14',
            'Mistral Large 4 was read October 7, Claude Haiku 5.5 was added October 7, and Meta Muse Wonder plus Gemini 4 Argon GA details were added October 14'
        )

# Reconstruct timeline section
new_timeline = ''.join(sorted_cards)

# Replace in content
new_content = content.replace(timeline_section, new_timeline)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Timeline reordered and Haiku card added successfully!")
print("\nNew order:")
for i, card in enumerate(sorted_cards[:15], 1):
    date_match = re.search(r'<div class="model-badge">([^<]+)</div>', card)
    title_match = re.search(r'<h3>([^<]+)</h3>', card)
    if date_match and title_match:
        print(f"{i}. {date_match.group(1)} - {title_match.group(1)}")
