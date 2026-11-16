from PIL import Image, ImageDraw, ImageFont
import os

# Set up paths
output_dir = r"e:\local-ai-zone.github.io\blog"

# Try to use a nice font, fall back to default if not available
try:
    title_font = ImageFont.truetype("arial.ttf", 48)
    large_font = ImageFont.truetype("arial.ttf", 72)
    medium_font = ImageFont.truetype("arial.ttf", 36)
    small_font = ImageFont.truetype("arial.ttf", 24)
    tiny_font = ImageFont.truetype("arial.ttf", 18)
except:
    title_font = ImageFont.load_default()
    large_font = ImageFont.load_default()
    medium_font = ImageFont.load_default()
    small_font = ImageFont.load_default()
    tiny_font = ImageFont.load_default()

# Color scheme
bg_color = (245, 247, 250)  # Light gray background
primary_color = (37, 99, 235)  # Blue
text_dark = (17, 24, 39)  # Dark gray
text_light = (107, 114, 128)  # Medium gray
accent_color = (16, 185, 129)  # Green
white = (255, 255, 255)

# ============================================
# IMAGE 1: Hero Image
# ============================================
def create_hero_image():
    width, height = 1200, 630
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((60, 60), "Qwen4-Max: The Complete Deep Dive", fill=text_dark, font=title_font)
    
    # Subtitle
    draw.text((60, 130), "Alibaba's API-only flagship: 43 on Intelligence Index v5 at $1.50/$4.50", 
              fill=text_light, font=small_font)
    draw.text((60, 165), "2.4T sparse MoE with 60% lower task costs - closed weights", 
              fill=text_light, font=small_font)
    
    # Four key stats boxes
    boxes = [
        {"title": "43 AA", "subtitle": "Intelligence Index v5\n#9 overall, trails\nKimi K3.1 Pro (46)", "x": 60, "y": 250},
        {"title": "$1.50 / $4.50", "subtitle": "Per million tokens\n62% cheaper than\nClaude Opus 5.5", "x": 360, "y": 250},
        {"title": "2.4T / 71B", "subtitle": "Sparse MoE architecture\n+ 328B N-gram embedding\n1M context, 393K output", "x": 660, "y": 250},
        {"title": "API Only", "subtitle": "No weights released\nBreaks open-weight\ntradition", "x": 960, "y": 250}
    ]
    
    for box in boxes:
        # Draw box background
        draw.rectangle([box["x"], box["y"], box["x"] + 230, box["y"] + 280], 
                      fill=white, outline=primary_color, width=2)
        
        # Draw title
        draw.text((box["x"] + 15, box["y"] + 20), box["title"], fill=primary_color, font=medium_font)
        
        # Draw subtitle
        lines = box["subtitle"].split('\n')
        y_offset = box["y"] + 80
        for line in lines:
            draw.text((box["x"] + 15, y_offset), line, fill=text_light, font=tiny_font)
            y_offset += 28
    
    # Footer
    draw.text((60, 580), "local-ai-zone.github.io", fill=text_light, font=small_font)
    
    img.save(os.path.join(output_dir, "qwen-4-deep-dive-hero.png"))
    print("✓ Created hero image")

# ============================================
# IMAGE 2: Intelligence Index v5 Ranking
# ============================================
def create_index_ranking_image():
    width, height = 800, 600
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((40, 30), "Intelligence Index v5 Rankings", fill=text_dark, font=medium_font)
    draw.text((40, 75), "November 2026", fill=text_light, font=small_font)
    
    # Rankings data (verified from web)
    rankings = [
        ("1", "Claude Fable 5.2", "65", True),
        ("2", "Gemini 4 Carbon", "60", False),
        ("3", "Claude Opus 5.5", "~57", False),
        ("...", "...", "...", False),
        ("7", "Kimi K3.1 Pro", "46", True),
        ("8", "DeepSeek V4.1", "~45", False),
        ("9", "Qwen4-Max", "43", True),
    ]
    
    y_start = 130
    for i, (rank, model, score, highlight) in enumerate(rankings):
        y = y_start + (i * 60)
        
        # Box background
        box_color = (224, 242, 254) if highlight else white
        draw.rectangle([40, y, 760, y + 50], fill=box_color, outline=primary_color if highlight else text_light, width=2)
        
        # Rank
        draw.text((60, y + 12), rank, fill=text_dark, font=small_font)
        
        # Model name
        draw.text((150, y + 12), model, fill=text_dark, font=small_font)
        
        # Score
        draw.text((650, y + 12), score, fill=primary_color if highlight else text_dark, font=small_font)
    
    # Note at bottom
    draw.text((40, 550), "Qwen4-Max positions #9, behind Kimi K3.1 Pro's open-weight record", 
              fill=text_light, font=tiny_font)
    
    img.save(os.path.join(output_dir, "qwen-4-v5-index.png"))
    print("✓ Created index ranking image")

# ============================================
# IMAGE 3: Cost Efficiency Chart
# ============================================
def create_cost_efficiency_image():
    width, height = 800, 600
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((40, 30), "Price Comparison: Output Tokens", fill=text_dark, font=medium_font)
    draw.text((40, 75), "Per Million Output Tokens", fill=text_light, font=small_font)
    
    # Data: (model, price, bar_length_multiplier, color)
    models_data = [
        ("Claude Opus 5.5", "$20.00", 4.44, (239, 68, 68)),
        ("Claude Sonnet 5.5", "$10.00", 2.22, (251, 146, 60)),
        ("Kimi K3.1 Pro", "$10.00", 2.22, (251, 146, 60)),
        ("Qwen4-Max", "$4.50", 1.0, accent_color),
    ]
    
    y_start = 150
    max_bar_width = 600
    
    for i, (model, price, multiplier, color) in enumerate(models_data):
        y = y_start + (i * 100)
        
        # Model name
        draw.text((40, y), model, fill=text_dark, font=small_font)
        
        # Price bar
        bar_width = int((max_bar_width / 4.44) * multiplier)
        draw.rectangle([40, y + 35, 40 + bar_width, y + 70], fill=color)
        
        # Price label
        draw.text((50 + bar_width, y + 38), price, fill=text_dark, font=small_font)
    
    # Savings callout
    draw.rectangle([40, 530, 760, 570], fill=(220, 252, 231), outline=accent_color, width=2)
    draw.text((50, 540), "Qwen4-Max: 77.5% cheaper output than Claude Opus 5.5", 
              fill=accent_color, font=small_font)
    
    img.save(os.path.join(output_dir, "qwen-4-cost-efficiency.png"))
    print("✓ Created cost efficiency image")

# ============================================
# Generate all images
# ============================================
if __name__ == "__main__":
    print("Generating Qwen4-Max images with correct information...")
    create_hero_image()
    create_index_ranking_image()
    create_cost_efficiency_image()
    print("\n✓ All images generated successfully!")
    print(f"Location: {output_dir}")
