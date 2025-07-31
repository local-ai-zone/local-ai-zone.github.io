#!/usr/bin/env python3
"""
Generate SEO files (sitemap.xml and robots.txt) for the GGUF Models website.
This script creates the necessary SEO files for search engine optimization.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

def load_existing_models():
    """Load existing models data if available."""
    # Try the new data structure first
    models_file = Path('data/models.json')
    if models_file.exists():
        with open(models_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('models', [])
    
    # Try the legacy gguf_models.json file
    legacy_file = Path('gguf_models.json')
    if legacy_file.exists():
        with open(legacy_file, 'r', encoding='utf-8') as f:
            legacy_models = json.load(f)
            # Convert legacy format to new format
            converted_models = []
            for model in legacy_models:
                model_id = model.get('modelId', '')
                converted_models.append({
                    'id': model_id,
                    'name': model_id.split('/')[-1].replace('-', ' ').title() if model_id else 'Unknown',
                    'family': model_id.split('/')[0] if '/' in model_id else 'unknown',
                    'downloads': model.get('downloads', 0)
                })
            return converted_models
    
    # Return sample data if no models file exists
    return [
        {
            'id': 'microsoft/DialoGPT-medium',
            'name': 'DialoGPT Medium',
            'family': 'microsoft'
        },
        {
            'id': 'huggingface/CodeBERTa-small-v1',
            'name': 'CodeBERTa Small',
            'family': 'huggingface'
        }
    ]

def generate_sitemap(models):
    """Generate XML sitemap for SEO."""
    print("Generating sitemap...")
    
    # Get the repository name from environment or use default
    repo_name = os.getenv('GITHUB_REPOSITORY', 'username/gguf-models').split('/')[-1]
    base_url = f"https://{os.getenv('GITHUB_REPOSITORY_OWNER', 'username')}.github.io/{repo_name}"
    
    sitemap_content = ['<?xml version="1.0" encoding="UTF-8"?>']
    sitemap_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Add main page
    sitemap_content.extend([
        '  <url>',
        f'    <loc>{base_url}/</loc>',
        f'    <lastmod>{current_date}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>'
    ])
    
    # Add search page
    sitemap_content.extend([
        '  <url>',
        f'    <loc>{base_url}/search</loc>',
        f'    <lastmod>{current_date}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>'
    ])
    
    # Add model pages (limit to top 1000 for sitemap size)
    for model in models[:1000]:
        model_slug = model['id'].replace('/', '--').replace('_', '-')
        sitemap_content.extend([
            '  <url>',
            f'    <loc>{base_url}/model/{model_slug}</loc>',
            f'    <lastmod>{current_date}</lastmod>',
            '    <changefreq>weekly</changefreq>',
            '    <priority>0.6</priority>',
            '  </url>'
        ])
    
    # Add family pages
    families = set(model.get('family', 'unknown') for model in models)
    for family in sorted(families):
        family_slug = family.replace('/', '--').replace('_', '-').lower()
        sitemap_content.extend([
            '  <url>',
            f'    <loc>{base_url}/family/{family_slug}</loc>',
            f'    <lastmod>{current_date}</lastmod>',
            '    <changefreq>weekly</changefreq>',
            '    <priority>0.5</priority>',
            '  </url>'
        ])
        
    sitemap_content.append('</urlset>')
    
    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sitemap_content))
        
    print(f"Generated sitemap with {len(sitemap_content) - 2} URLs")

def generate_robots_txt():
    """Generate robots.txt file."""
    print("Generating robots.txt...")
    
    repo_name = os.getenv('GITHUB_REPOSITORY', 'username/gguf-models').split('/')[-1]
    base_url = f"https://{os.getenv('GITHUB_REPOSITORY_OWNER', 'username')}.github.io/{repo_name}"
    
    robots_content = [
        '# Robots.txt for GGUF Models Discovery Website',
        '# Generated automatically by data pipeline',
        '',
        'User-agent: *',
        'Allow: /',
        'Crawl-delay: 1',
        '',
        '# Sitemaps',
        f'Sitemap: {base_url}/sitemap.xml',
        '',
        '# Disallow crawling of API endpoints',
        'Disallow: /api/',
        'Disallow: /_next/',
        'Disallow: /admin/',
        '',
        '# Allow crawling of data files',
        'Allow: /data/',
        'Allow: /*.json',
        'Allow: /*.xml'
    ]
    
    with open('robots.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(robots_content))
        
    print("Generated robots.txt")

def main():
    """Main function to generate SEO files."""
    print("Starting SEO files generation...")
    
    # Load models data
    models = load_existing_models()
    print(f"Loaded {len(models)} models")
    
    # Generate SEO files
    generate_sitemap(models)
    generate_robots_txt()
    
    print("SEO files generation completed!")

if __name__ == "__main__":
    main()