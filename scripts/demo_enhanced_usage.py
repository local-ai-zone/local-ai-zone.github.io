#!/usr/bin/env python3
"""
Demonstration of enhanced data extraction usage.

This script shows how to use the two-phase approach:
1. Download raw data once with enhanced limits
2. Use raw data for multiple purposes beyond standard processing

Usage:
    python demo_enhanced_usage.py <HF_TOKEN>
"""

import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict

# Add the scripts directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simplified_gguf_fetcher import SimplifiedGGUFetcher


def download_enhanced_data(token=None):
    """Phase 1: Download raw data with enhanced limits."""
    print("=" * 60)
    print("PHASE 1: DOWNLOADING ENHANCED DATASET")
    print("=" * 60)
    print("Enhanced limits:")
    print("- Recent models: 90 days (was 30)")
    print("- Top models: 200 (was 50)")
    print("- API limit: 1000 (was 500)")
    print()
    
    fetcher = SimplifiedGGUFetcher(token=token)
    
    print("Starting download...")
    fetcher.download_data()
    
    # Check if raw data was created
    if os.path.exists(fetcher.raw_data_file):
        with open(fetcher.raw_data_file, 'r') as f:
            raw_data = json.load(f)
        
        print(f"✅ Raw data downloaded successfully!")
        print(f"📁 File: {fetcher.raw_data_file}")
        print(f"📊 Models: {len(raw_data)}")
        return raw_data
    else:
        print("❌ Raw data download failed!")
        return []


def analyze_engagement_trends(raw_data):
    """Enhanced functionality: Analyze engagement trends."""
    print("\n" + "=" * 60)
    print("ENHANCED ANALYSIS: ENGAGEMENT TRENDS")
    print("=" * 60)
    
    if not raw_data:
        print("No data to analyze")
        return
    
    # Engagement analysis by time periods
    now = datetime.now()
    periods = {
        'last_7_days': [],
        'last_30_days': [],
        'last_90_days': [],
        'older': []
    }
    
    for model in raw_data:
        created_at = model.get('created_at')
        likes = model.get('likes', 0)
        downloads = model.get('downloads', 0)
        
        if created_at and likes is not None and downloads is not None:
            try:
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at
                
                days_ago = (now - created_date.replace(tzinfo=None)).days
                
                model_data = {
                    'id': model.get('id', ''),
                    'likes': likes,
                    'downloads': downloads,
                    'days_ago': days_ago
                }
                
                if days_ago <= 7:
                    periods['last_7_days'].append(model_data)
                elif days_ago <= 30:
                    periods['last_30_days'].append(model_data)
                elif days_ago <= 90:
                    periods['last_90_days'].append(model_data)
                else:
                    periods['older'].append(model_data)
            except:
                periods['older'].append({
                    'id': model.get('id', ''),
                    'likes': likes,
                    'downloads': downloads,
                    'days_ago': 999
                })
    
    # Calculate engagement statistics by period
    print("📈 Engagement Trends by Time Period:")
    print()
    
    for period_name, models in periods.items():
        if models:
            total_likes = sum(m['likes'] for m in models)
            total_downloads = sum(m['downloads'] for m in models)
            avg_likes = total_likes / len(models)
            avg_downloads = total_downloads / len(models)
            
            print(f"🕒 {period_name.replace('_', ' ').title()}:")
            print(f"   Models: {len(models)}")
            print(f"   Total likes: {total_likes:,}")
            print(f"   Total downloads: {total_downloads:,}")
            print(f"   Avg likes per model: {avg_likes:.1f}")
            print(f"   Avg downloads per model: {avg_downloads:.1f}")
            
            # Top models in this period
            top_models = sorted(models, key=lambda x: x['likes'], reverse=True)[:3]
            print(f"   Top models by likes:")
            for i, model in enumerate(top_models, 1):
                print(f"     {i}. {model['id']} - {model['likes']:,} likes")
            print()


def analyze_model_ecosystem(raw_data):
    """Enhanced functionality: Analyze the model ecosystem."""
    print("=" * 60)
    print("ENHANCED ANALYSIS: MODEL ECOSYSTEM")
    print("=" * 60)
    
    if not raw_data:
        print("No data to analyze")
        return
    
    # Model type distribution
    model_types = defaultdict(int)
    license_distribution = defaultdict(int)
    size_distribution = defaultdict(int)
    quantization_formats = defaultdict(int)
    
    total_size = 0
    total_files = 0
    
    for model in raw_data:
        model_id = model.get('id', '').lower()
        
        # Categorize model types
        if 'llama' in model_id:
            model_types['LLaMA'] += 1
        elif 'mistral' in model_id:
            model_types['Mistral'] += 1
        elif 'qwen' in model_id:
            model_types['Qwen'] += 1
        elif 'gemma' in model_id:
            model_types['Gemma'] += 1
        elif 'phi' in model_id:
            model_types['Phi'] += 1
        elif 'deepseek' in model_id:
            model_types['DeepSeek'] += 1
        else:
            model_types['Other'] += 1
        
        # License analysis
        card_data = model.get('cardData', {})
        license_info = card_data.get('license', 'Not specified')
        license_distribution[license_info] += 1
        
        # File analysis
        siblings = model.get('siblings', [])
        for sibling in siblings:
            if isinstance(sibling, dict):
                filename = sibling.get('rfilename', '')
                if filename.lower().endswith('.gguf'):
                    total_files += 1
                    
                    # Size analysis
                    size = sibling.get('size', 0)
                    if size:
                        total_size += size
                        size_gb = size / (1024**3)
                        if size_gb < 1:
                            size_distribution['< 1 GB'] += 1
                        elif size_gb < 5:
                            size_distribution['1-5 GB'] += 1
                        elif size_gb < 10:
                            size_distribution['5-10 GB'] += 1
                        else:
                            size_distribution['> 10 GB'] += 1
                    
                    # Quantization analysis
                    filename_upper = filename.upper()
                    quant_patterns = ['Q4_K_M', 'Q4_K_S', 'Q5_K_M', 'Q8_0', 'Q4_0', 'F16', 'F32']
                    for pattern in quant_patterns:
                        if pattern in filename_upper:
                            quantization_formats[pattern] += 1
                            break
                    else:
                        quantization_formats['Other'] += 1
    
    # Display ecosystem analysis
    print("🏗️  Model Architecture Distribution:")
    for model_type, count in sorted(model_types.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(raw_data)) * 100
        print(f"   {model_type}: {count} models ({percentage:.1f}%)")
    
    print(f"\n📄 License Distribution:")
    for license_name, count in sorted(license_distribution.items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / len(raw_data)) * 100
        print(f"   {license_name}: {count} models ({percentage:.1f}%)")
    
    print(f"\n💾 File Size Distribution:")
    for size_range, count in sorted(size_distribution.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_files) * 100 if total_files > 0 else 0
        print(f"   {size_range}: {count} files ({percentage:.1f}%)")
    
    print(f"\n🔧 Quantization Format Distribution:")
    for quant_format, count in sorted(quantization_formats.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_files) * 100 if total_files > 0 else 0
        print(f"   {quant_format}: {count} files ({percentage:.1f}%)")
    
    if total_size > 0:
        avg_size_gb = (total_size / total_files) / (1024**3)
        total_size_tb = total_size / (1024**4)
        print(f"\n📊 Storage Statistics:")
        print(f"   Total GGUF files: {total_files:,}")
        print(f"   Total storage: {total_size_tb:.2f} TB")
        print(f"   Average file size: {avg_size_gb:.2f} GB")


def generate_custom_report(raw_data):
    """Enhanced functionality: Generate custom report."""
    print("=" * 60)
    print("ENHANCED FUNCTIONALITY: CUSTOM REPORT")
    print("=" * 60)
    
    if not raw_data:
        print("No data to analyze")
        return
    
    # Create custom filtered dataset
    high_engagement_models = []
    recent_popular_models = []
    large_models = []
    
    now = datetime.now()
    cutoff_date = now - timedelta(days=30)
    
    for model in raw_data:
        likes = model.get('likes', 0)
        downloads = model.get('downloads', 0)
        created_at = model.get('created_at')
        
        # High engagement models (top 10% by likes)
        if likes > 100:  # Threshold for high engagement
            high_engagement_models.append(model)
        
        # Recent popular models
        if created_at:
            try:
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at
                
                if created_date.replace(tzinfo=None) >= cutoff_date and likes > 10:
                    recent_popular_models.append(model)
            except:
                pass
        
        # Large models (> 5GB)
        siblings = model.get('siblings', [])
        for sibling in siblings:
            if isinstance(sibling, dict):
                filename = sibling.get('rfilename', '')
                size = sibling.get('size', 0)
                if filename.lower().endswith('.gguf') and size > 5 * (1024**3):  # > 5GB
                    large_models.append(model)
                    break
    
    # Sort by engagement
    high_engagement_models.sort(key=lambda x: x.get('likes', 0), reverse=True)
    recent_popular_models.sort(key=lambda x: x.get('likes', 0), reverse=True)
    large_models.sort(key=lambda x: x.get('downloads', 0), reverse=True)
    
    print("🔥 High Engagement Models (Top 10):")
    for i, model in enumerate(high_engagement_models[:10], 1):
        print(f"   {i}. {model.get('id', 'Unknown')} - {model.get('likes', 0):,} likes, {model.get('downloads', 0):,} downloads")
    
    print(f"\n🆕 Recent Popular Models (Last 30 days, Top 10):")
    for i, model in enumerate(recent_popular_models[:10], 1):
        print(f"   {i}. {model.get('id', 'Unknown')} - {model.get('likes', 0):,} likes")
    
    print(f"\n🐘 Large Models (>5GB, Top 10 by downloads):")
    for i, model in enumerate(large_models[:10], 1):
        print(f"   {i}. {model.get('id', 'Unknown')} - {model.get('downloads', 0):,} downloads")
    
    # Save custom reports
    reports = {
        'high_engagement_models.json': high_engagement_models[:50],
        'recent_popular_models.json': recent_popular_models[:50],
        'large_models.json': large_models[:50]
    }
    
    print(f"\n💾 Saving custom reports:")
    for filename, data in reports.items():
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        print(f"   ✅ {filename} - {len(data)} models")


def process_standard_output(raw_data_file):
    """Phase 2: Generate standard output using raw data."""
    print("\n" + "=" * 60)
    print("PHASE 2: STANDARD PROCESSING")
    print("=" * 60)
    
    if not os.path.exists(raw_data_file):
        print("❌ Raw data file not found!")
        return False
    
    fetcher = SimplifiedGGUFetcher()
    
    print("Processing raw data for standard output...")
    fetcher.process_data()
    
    # Check if output was created
    if os.path.exists(fetcher.output_file):
        with open(fetcher.output_file, 'r') as f:
            output_data = json.load(f)
        
        print(f"✅ Standard output generated!")
        print(f"📁 File: {fetcher.output_file}")
        print(f"📊 Entries: {len(output_data)}")
        
        # Copy to root for website
        import shutil
        shutil.copy2(fetcher.output_file, 'gguf_models.json')
        print(f"📁 Website copy: gguf_models.json")
        
        return True
    else:
        print("❌ Standard output generation failed!")
        return False


def main():
    """Demonstrate enhanced data extraction usage."""
    print("=" * 80)
    print("ENHANCED DATA EXTRACTION - DEMONSTRATION")
    print("=" * 80)
    print("This demo shows how the enhanced two-phase approach enables:")
    print("1. Download comprehensive raw data once (90 days + 200 top models)")
    print("2. Use raw data for multiple enhanced analyses")
    print("3. Generate standard output for website")
    print("=" * 80)
    
    # Get token
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1]
    else:
        token = os.getenv('HF_TOKEN')
    
    if not token:
        print("❌ No Hugging Face token provided!")
        print("Usage: python demo_enhanced_usage.py <HF_TOKEN>")
        return False
    
    try:
        # Phase 1: Download enhanced dataset
        raw_data = download_enhanced_data(token)
        
        if not raw_data:
            print("❌ Failed to download raw data!")
            return False
        
        # Enhanced functionality: Multiple analyses using the same raw data
        analyze_engagement_trends(raw_data)
        analyze_model_ecosystem(raw_data)
        generate_custom_report(raw_data)
        
        # Phase 2: Standard processing
        fetcher = SimplifiedGGUFetcher()
        success = process_standard_output(fetcher.raw_data_file)
        
        # Summary
        print("\n" + "=" * 80)
        print("DEMONSTRATION SUMMARY")
        print("=" * 80)
        
        if success:
            print("🎉 DEMONSTRATION SUCCESSFUL!")
            print("\nWhat was accomplished:")
            print("✅ Downloaded comprehensive dataset with enhanced limits")
            print("✅ Performed engagement trend analysis")
            print("✅ Analyzed model ecosystem distribution")
            print("✅ Generated custom filtered reports")
            print("✅ Created standard output for website")
            
            print(f"\nFiles created:")
            files_created = [
                'data/raw_models_data.json',
                'gguf_models.json',
                'high_engagement_models.json',
                'recent_popular_models.json',
                'large_models.json'
            ]
            
            for file_path in files_created:
                if os.path.exists(file_path):
                    size = os.path.getsize(file_path) / 1024  # KB
                    print(f"   📁 {file_path} ({size:.1f} KB)")
            
            print(f"\n💡 Key Benefits:")
            print("• Raw data downloaded once, used for multiple purposes")
            print("• Enhanced limits provide more comprehensive dataset")
            print("• Flexible analysis capabilities beyond standard processing")
            print("• Efficient workflow for data-driven insights")
            
        else:
            print("⚠️  DEMONSTRATION PARTIALLY SUCCESSFUL")
            print("Enhanced analysis completed, but standard processing failed.")
        
        return success
        
    except Exception as e:
        print(f"❌ Demonstration failed: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)