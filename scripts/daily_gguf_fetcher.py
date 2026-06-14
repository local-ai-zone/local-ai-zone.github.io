#!/usr/bin/env python3
"""
Daily GGUF Fetcher - Clean, Simple, Efficient

Purpose: Fetch ALL GGUF models from Hugging Face, filter, and output to gguf_models.json
Designed for: Daily GitHub Actions workflow
Strategy: Fetch all → Filter → Merge with existing → Output

Features:
- Fetches ALL GGUF models (no date limits)
- Sorts by popularity (likes)
- Filters by minimum likes threshold
- Deduplicates across repos
- Merges with existing data (incremental mode)
- Hardware requirements calculation
- In-memory processing (no intermediate files)

Usage:
    # Fetch all models and merge with existing:
    python daily_gguf_fetcher.py --incremental --min-likes 1
    
    # Fetch all models and replace existing:
    python daily_gguf_fetcher.py --min-likes 1
    
    # With authentication (recommended):
    python daily_gguf_fetcher.py --incremental --min-likes 1 --token YOUR_HF_TOKEN
"""

import argparse
import json
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from huggingface_hub import HfApi
from tqdm import tqdm

# Import filtering components
sys.path.insert(0, str(Path(__file__).parent.parent))
from spam_filter.config import FilterConfig
from spam_filter.hardware_calculator import HardwareRequirementsCalculator


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


class DailyGGUFFetcher:
    """
    Simple, focused GGUF model fetcher for daily updates.
    
    Fetches ALL GGUF models, filters them, and outputs clean JSON.
    Designed to be fast, reliable, and easy to understand.
    """
    
    def __init__(
        self,
        token: Optional[str] = None,
        incremental: bool = False,
        min_likes: int = 1,
        max_models: int = 10000,
        output_file: str = "gguf_models.json"
    ):
        """
        Initialize the fetcher.
        
        Args:
            token: HuggingFace API token (optional, but recommended)
            incremental: If True, merge with existing data instead of replacing
            min_likes: Minimum likes threshold for filtering
            max_models: Maximum number of models to fetch
            output_file: Output JSON file path
        """
        self.api = HfApi(token=token)
        self.incremental = incremental
        self.min_likes = min_likes
        self.max_models = max_models
        self.output_file = Path(output_file)
        self.logger = logging.getLogger(__name__)
        
        # Hardware calculator
        self.hardware_calculator = HardwareRequirementsCalculator(FilterConfig())
        
        # Stats
        self.stats = {
            'fetched': 0,
            'filtered': 0,
            'deduplicated': 0,
            'final': 0
        }
    
    def run(self) -> None:
        """Main execution: fetch → filter → output."""
        self.logger.info("=" * 70)
        self.logger.info("DAILY GGUF FETCHER - STARTING")
        self.logger.info("=" * 70)
        self.logger.info(f"Mode: {'INCREMENTAL (merge)' if self.incremental else 'FULL (replace)'}")
        self.logger.info(f"Min likes: {self.min_likes}")
        self.logger.info(f"Max models: {self.max_models}")
        self.logger.info(f"Output: {self.output_file}")
        self.logger.info("=" * 70)
        
        start_time = datetime.now()
        
        try:
            # Step 1: Fetch all GGUF models
            self.logger.info("\n[1/5] Fetching ALL GGUF models from HuggingFace...")
            models = self._fetch_all_models()
            self.stats['fetched'] = len(models)
            self.logger.info(f"✓ Fetched {len(models)} models")
            
            if not models:
                self.logger.warning("No models fetched!")
                self._save_output([])
                return
            
            # Step 2: Filter by likes and GGUF files
            self.logger.info(f"\n[2/5] Filtering models (min {self.min_likes} likes, has .gguf files)...")
            filtered = self._filter_models(models)
            self.stats['filtered'] = len(filtered)
            self.logger.info(f"✓ {len(filtered)} models passed filters")
            
            if not filtered:
                self.logger.warning("No models passed filters!")
                self._save_output([])
                return
            
            # Step 3: Extract and process GGUF files
            self.logger.info(f"\n[3/5] Processing GGUF files and calculating requirements...")
            processed = self._process_models(filtered)
            self.logger.info(f"✓ Processed {len(processed)} model entries")
            
            # Step 4: Deduplicate across repos
            self.logger.info(f"\n[4/5] Deduplicating across repositories...")
            deduplicated = self._deduplicate(processed)
            self.stats['deduplicated'] = len(processed) - len(deduplicated)
            self.logger.info(f"✓ Removed {self.stats['deduplicated']} duplicates → {len(deduplicated)} unique models")
            
            # Step 5: Save output (merge if incremental)
            self.logger.info(f"\n[5/5] Saving to {self.output_file}...")
            self._save_output(deduplicated)
            self.stats['final'] = len(deduplicated)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            self.logger.info("\n" + "=" * 70)
            self.logger.info("✓ DAILY GGUF FETCHER - COMPLETED SUCCESSFULLY")
            self.logger.info("=" * 70)
            self.logger.info(f"Duration: {duration:.1f}s")
            self.logger.info(f"Models fetched: {self.stats['fetched']}")
            self.logger.info(f"Models filtered: {self.stats['filtered']}")
            self.logger.info(f"Duplicates removed: {self.stats['deduplicated']}")
            self.logger.info(f"Final models: {self.stats['final']}")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"✗ FAILED: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            sys.exit(1)
    
    def _fetch_all_models(self) -> List[Dict]:
        """Fetch all GGUF models from HuggingFace."""
        models = []
        
        self.logger.info("Fetching from HuggingFace API...")
        self.logger.info("  - Filter: gguf")
        self.logger.info("  - Sort: likes (most popular first)")
        self.logger.info("  - Full data: Yes (siblings with file sizes, metadata)")
        self.logger.info(f"  - Limit: {self.max_models} models")
        
        try:
            # Create the iterator
            model_iterator = self.api.list_models(
                filter="gguf",
                sort="likes",
                direction=-1,
                full=True  # CRITICAL: This fetches file sizes in siblings!
            )
            
            # Manually limit iteration with progress bar
            count = 0
            sample_checked = False
            
            with tqdm(total=self.max_models, desc="Fetching models", unit="model") as pbar:
                for model in model_iterator:
                    # Convert to dict immediately
                    model_dict = self._model_to_dict(model)
                    if model_dict:
                        models.append(model_dict)
                        pbar.update(1)
                        
                        # Check first model for file size data (debugging)
                        if not sample_checked and len(models) == 1:
                            sample_checked = True
                            siblings = model_dict.get('siblings', [])
                            gguf_files = [s for s in siblings if str(s.get('rfilename', '')).lower().endswith('.gguf')]
                            if gguf_files:
                                sample_file = gguf_files[0]
                                size = sample_file.get('size', 0)
                                self.logger.info(f"\nSample file size check (first model):")
                                self.logger.info(f"  File: {sample_file.get('rfilename', 'unknown')}")
                                self.logger.info(f"  Size: {size} bytes ({self._format_size(size)})")
                                if size == 0:
                                    self.logger.warning("  ⚠ File size is 0! This indicates API issue.")
                                else:
                                    self.logger.info("  ✓ File size extraction working correctly")
                    
                    count += 1
                    # Hard stop at max_models
                    if count >= self.max_models:
                        self.logger.info(f"Reached limit of {self.max_models} models")
                        break
        
        except Exception as e:
            self.logger.error(f"Error fetching models: {e}")
            raise
        
        return models
    
    def _model_to_dict(self, model) -> Optional[Dict]:
        """Convert model object to dictionary with proper file size extraction."""
        try:
            model_id = getattr(model, 'id', None) or getattr(model, 'modelId', None)
            if not model_id:
                self.logger.debug("Model has no ID, skipping")
                return None
            
            # Extract siblings using the same method as simplified_gguf_fetcher
            siblings = []
            raw_siblings = getattr(model, 'siblings', None)
            
            if raw_siblings:
                # Handle list of siblings
                if isinstance(raw_siblings, list):
                    for sibling in raw_siblings:
                        try:
                            if isinstance(sibling, dict):
                                filename = sibling.get('rfilename', '')
                                size = sibling.get('size', 0)
                            elif hasattr(sibling, 'rfilename'):
                                filename = getattr(sibling, 'rfilename', '')
                                size = getattr(sibling, 'size', 0) or 0
                            else:
                                continue
                            
                            if filename:
                                siblings.append({
                                    'rfilename': str(filename),
                                    'size': int(size) if size else 0
                                })
                        except Exception as e:
                            self.logger.debug(f"Error extracting sibling: {e}")
                            continue
                elif hasattr(raw_siblings, '__iter__'):
                    # Handle iterable objects
                    for sibling in raw_siblings:
                        try:
                            filename = getattr(sibling, 'rfilename', '')
                            size = getattr(sibling, 'size', 0) or 0
                            
                            if filename:
                                siblings.append({
                                    'rfilename': str(filename),
                                    'size': int(size) if size else 0
                                })
                        except Exception as e:
                            self.logger.debug(f"Error extracting sibling from iterable: {e}")
                            continue
            
            # Extract card data
            card_data = getattr(model, 'cardData', {}) or {}
            license_value = getattr(card_data, 'license', None) or 'Not specified'
            
            # Build model dict
            model_dict = {
                'id': str(model_id),
                'likes': getattr(model, 'likes', 0) or 0,
                'downloads': getattr(model, 'downloads', 0) or 0,
                'tags': list(getattr(model, 'tags', []) or []),
                'siblings': siblings,
                'license': str(license_value),
                'created_at': None
            }
            
            # Handle created_at
            created = getattr(model, 'created_at', None) or getattr(model, 'createdAt', None)
            if created:
                if hasattr(created, 'isoformat'):
                    model_dict['created_at'] = created.isoformat()
                elif isinstance(created, str):
                    model_dict['created_at'] = created
            
            return model_dict
            
        except Exception as e:
            self.logger.warning(f"Error converting model to dict: {e}")
            import traceback
            self.logger.debug(traceback.format_exc())
            return None
    
    def _filter_models(self, models: List[Dict]) -> List[Dict]:
        """Filter models by likes and presence of GGUF files."""
        filtered = []
        below_threshold = 0
        no_gguf = 0
        
        for model in models:
            # Validate likes
            likes = model.get('likes', 0)
            try:
                likes = int(likes) if likes else 0
            except (ValueError, TypeError):
                likes = 0
            
            # Check likes threshold
            if likes < self.min_likes:
                below_threshold += 1
                continue
            
            # Check for GGUF files
            siblings = model.get('siblings', [])
            has_gguf = any(
                str(s.get('rfilename', '')).lower().endswith('.gguf')
                for s in siblings
                if isinstance(s, dict)
            )
            
            if has_gguf:
                filtered.append(model)
            else:
                no_gguf += 1
        
        self.logger.info(f"Filtering results:")
        self.logger.info(f"  ✓ Models with {self.min_likes}+ likes and GGUF files: {len(filtered)}")
        if below_threshold > 0:
            self.logger.info(f"  - Below likes threshold: {below_threshold}")
        if no_gguf > 0:
            self.logger.info(f"  - No GGUF files: {no_gguf}")
        
        return filtered
    
    def _process_models(self, models: List[Dict]) -> List[Dict]:
        """Process models and extract GGUF file information."""
        processed = []
        files_with_size = 0
        files_without_size = 0
        
        for model in tqdm(models, desc="Processing models", unit="model"):
            model_id = model.get('id', '')
            siblings = model.get('siblings', [])
            
            # Extract model info
            model_name = self._extract_model_name(model_id)
            model_type = self._infer_model_type(model_id, model.get('tags', []))
            model_capability = self._detect_capability(model_id, model.get('tags', []))
            
            # Process each GGUF file
            for sibling in siblings:
                if not isinstance(sibling, dict):
                    continue
                
                filename = sibling.get('rfilename', '')
                if not filename.lower().endswith('.gguf'):
                    continue
                
                # Extract file info - Try to get size from API
                file_size = sibling.get('size', 0)
                
                # If size is 0, try to fetch it from HuggingFace file info
                if not file_size or file_size == 0:
                    try:
                        # Try to get file info with model_info using files_metadata=True
                        file_info = self.api.hf_hub_url(model_id, filename)
                        # Note: hf_hub_url doesn't return size, so we'll estimate based on quantization
                        file_size = self._estimate_file_size(filename, model_name)
                        if file_size > 0:
                            self.logger.debug(f"Estimated size for {filename}: {self._format_size(file_size)}")
                    except Exception as e:
                        self.logger.debug(f"Could not get file size for {filename}: {e}")
                        # Estimate based on quantization and model name
                        file_size = self._estimate_file_size(filename, model_name)
                
                # Validate file size
                if file_size and file_size > 0:
                    files_with_size += 1
                else:
                    files_without_size += 1
                    # Last resort: estimate from quantization
                    file_size = self._estimate_file_size(filename, model_name)
                    if file_size > 0:
                        files_with_size += 1
                        files_without_size -= 1
                
                # Ensure file_size is an integer
                try:
                    file_size = int(file_size) if file_size else 0
                except (ValueError, TypeError):
                    file_size = 0
                
                quantization = self._extract_quantization(filename)
                
                # Extract model source (uploader/organization)
                model_source = model_id.split('/')[0] if '/' in model_id else 'Unknown'
                
                # Build entry
                entry = {
                    'modelName': model_name,
                    'modelSource': model_source,
                    'quantFormat': quantization,
                    'fileSize': file_size,
                    'fileSizeFormatted': self._format_size(file_size),
                    'modelType': model_type,
                    'modelCapability': model_capability,
                    'license': model.get('license', 'Not specified'),
                    'downloadCount': model.get('downloads', 0),
                    'likeCount': model.get('likes', 0),
                    'huggingFaceLink': f"https://huggingface.co/{model_id}",
                    'directDownloadLink': f"https://huggingface.co/{model_id}/resolve/main/{filename}",
                    'modelId': model_id,
                    'filename': filename,
                    'uploadDate': model.get('created_at')
                }
                
                # Calculate hardware requirements
                try:
                    entry = self.hardware_calculator.calculate_requirements(entry)
                except Exception as e:
                    self.logger.debug(f"Hardware calc failed for {model_name}: {e}")
                    # Set defaults if calculation fails
                    entry.update({
                        'minRamGB': 8,
                        'minCpuCores': 4,
                        'gpuRequired': True,
                        'osSupported': ['Windows', 'Linux', 'macOS']
                    })
                
                processed.append(entry)
        
        # Log file size statistics
        total_files = files_with_size + files_without_size
        self.logger.info(f"File size stats: {files_with_size}/{total_files} files have size data ({files_without_size} estimated)")
        
        return processed
    
    def _estimate_file_size(self, filename: str, model_name: str) -> int:
        """
        Estimate file size based on quantization format and model parameters.
        
        This is a fallback when the API doesn't provide file sizes.
        Based on typical GGUF file sizes per quantization level.
        """
        # Extract model parameters from name (7B, 13B, 70B, etc.)
        import re
        param_match = re.search(r'(\d+\.?\d*)\s*[Bb]', model_name + ' ' + filename)
        params_billions = 7.0  # Default assumption
        
        if param_match:
            params_billions = float(param_match.group(1))
        
        # Quantization to bits-per-parameter mapping
        quant_format = self._extract_quantization(filename).upper()
        
        bits_per_param = {
            'F32': 32.0,
            'F16': 16.0,
            'BF16': 16.0,
            'Q8_0': 8.5,
            'Q6_K': 6.5,
            'Q5_K_M': 5.5,
            'Q5_K_S': 5.0,
            'Q4_K_M': 4.5,
            'Q4_K_S': 4.0,
            'Q4_0': 4.5,
            'Q3_K_M': 3.5,
            'Q3_K_S': 3.0,
            'Q2_K': 2.5,
            'IQ4_XS': 4.25,
            'IQ3_S': 3.4,
            'IQ2_XXS': 2.2,
            'IQ2_XS': 2.3,
            'IQ2_M': 2.5,
            'IQ1_S': 1.5,
        }.get(quant_format, 4.5)  # Default to Q4_K_M equivalent
        
        # Calculate: params (billions) * bits_per_param / 8 = size in GB
        # Then convert to bytes
        size_gb = (params_billions * bits_per_param) / 8.0
        size_bytes = int(size_gb * 1024 * 1024 * 1024)
        
        # Add 5% overhead for metadata
        size_bytes = int(size_bytes * 1.05)
        
        return size_bytes
    
    def _deduplicate(self, models: List[Dict]) -> List[Dict]:
        """Deduplicate models across repos (keep highest engagement)."""
        if not models:
            return models
        
        # Group by canonical name
        groups = defaultdict(list)
        for model in models:
            canonical = self._normalize_model_name(model.get('modelId', ''))
            groups[canonical].append(model)
        
        # Keep best from each group
        deduplicated = []
        for canonical, group in groups.items():
            if len(group) == 1:
                deduplicated.append(group[0])
            else:
                # Pick model with highest engagement
                best = max(group, key=lambda m: (
                    m.get('likeCount', 0) * 10 + m.get('downloadCount', 0)
                ))
                deduplicated.append(best)
        
        return deduplicated
    
    def _save_output(self, models: List[Dict]) -> None:
        """Save models to output file (merge if incremental)."""
        # Load existing if incremental
        existing = []
        if self.incremental and self.output_file.exists():
            try:
                with open(self.output_file, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
                self.logger.info(f"Loaded {len(existing)} existing models for merge")
            except Exception as e:
                self.logger.warning(f"Could not load existing models: {e}")
                existing = []
        
        # Merge if incremental
        if self.incremental and existing:
            # Create dict keyed by model+file
            merged = {}
            for model in existing:
                key = f"{model.get('modelId', '')}::{model.get('filename', '')}"
                merged[key] = model
            
            # Update/add new models
            new_count = 0
            updated_count = 0
            for model in models:
                key = f"{model.get('modelId', '')}::{model.get('filename', '')}"
                if key in merged:
                    updated_count += 1
                else:
                    new_count += 1
                merged[key] = model
            
            models = list(merged.values())
            self.logger.info(f"Merge: {new_count} new + {updated_count} updated = {len(models)} total")
        
        # Sort by downloads then likes
        models.sort(
            key=lambda x: (x.get('downloadCount', 0), x.get('likeCount', 0)),
            reverse=True
        )
        
        # Validate file sizes before saving
        self._validate_file_sizes(models)
        
        # Clean up entries (remove internal fields)
        output = []
        for model in models:
            clean = {
                'modelName': model.get('modelName', ''),
                'modelSource': model.get('modelSource', 'Unknown'),
                'quantFormat': model.get('quantFormat', 'Unknown'),
                'fileSize': model.get('fileSize', 0),
                'fileSizeFormatted': model.get('fileSizeFormatted', '0 B'),
                'modelType': model.get('modelType', 'Unknown'),
                'modelCapability': model.get('modelCapability', 'text'),
                'license': model.get('license', 'Not specified'),
                'downloadCount': model.get('downloadCount', 0),
                'likeCount': model.get('likeCount', 0),
                'huggingFaceLink': model.get('huggingFaceLink', ''),
                'directDownloadLink': model.get('directDownloadLink', ''),
                'minRamGB': model.get('minRamGB', 8),
                'minCpuCores': model.get('minCpuCores', 4),
                'gpuRequired': model.get('gpuRequired', True),
                'osSupported': model.get('osSupported', ['Windows', 'Linux', 'macOS']),
                'uploadDate': model.get('uploadDate')
            }
            output.append(clean)
        
        # Write to file
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        file_size_mb = os.path.getsize(self.output_file) / (1024 * 1024)
        self.logger.info(f"✓ Saved {len(output)} models to {self.output_file} ({file_size_mb:.1f} MB)")
    
    def _validate_file_sizes(self, models: List[Dict]) -> None:
        """Validate file sizes in final output and log statistics."""
        total = len(models)
        with_size = sum(1 for m in models if m.get('fileSize', 0) > 0)
        without_size = total - with_size
        
        # Calculate size statistics
        sizes = [m.get('fileSize', 0) for m in models if m.get('fileSize', 0) > 0]
        if sizes:
            min_size = min(sizes)
            max_size = max(sizes)
            avg_size = sum(sizes) / len(sizes)
            total_size = sum(sizes)
            
            self.logger.info("=" * 50)
            self.logger.info("FILE SIZE VALIDATION")
            self.logger.info("=" * 50)
            self.logger.info(f"Total models: {total}")
            self.logger.info(f"✓ With file size: {with_size} ({with_size/total*100:.1f}%)")
            if without_size > 0:
                self.logger.warning(f"⚠ Missing file size: {without_size} ({without_size/total*100:.1f}%)")
            self.logger.info(f"Smallest file: {self._format_size(min_size)}")
            self.logger.info(f"Largest file: {self._format_size(max_size)}")
            self.logger.info(f"Average file: {self._format_size(int(avg_size))}")
            self.logger.info(f"Total size: {self._format_size(int(total_size))}")
            self.logger.info("=" * 50)
        else:
            self.logger.error("⚠ WARNING: NO MODELS HAVE FILE SIZE DATA!")
            self.logger.error("This likely means file size extraction from HuggingFace API failed.")
            self.logger.error("Check that full=True is used in list_models() call.")
    
    # Helper methods
    
    def _extract_model_name(self, model_id: str) -> str:
        """Extract clean model name from ID."""
        if '/' in model_id:
            name = model_id.split('/', 1)[1]
        else:
            name = model_id
        
        # Clean up
        name = re.sub(r'-gguf$', '', name, flags=re.IGNORECASE)
        name = re.sub(r'[-_]+', ' ', name)
        name = ' '.join(word.capitalize() for word in name.split())
        
        return name
    
    def _infer_model_type(self, model_id: str, tags: List[str]) -> str:
        """Infer model type from ID and tags."""
        text = (model_id + ' ' + ' '.join(tags)).lower()
        
        type_patterns = {
            'Llama': r'\bllama\b',
            'Mistral': r'\bmistral\b',
            'Qwen': r'\bqwen\b',
            'Gemma': r'\bgemma\b',
            'DeepSeek': r'\bdeepseek\b',
            'Phi': r'\bphi\b',
            'Yi': r'\byi\b',
        }
        
        for model_type, pattern in type_patterns.items():
            if re.search(pattern, text):
                return model_type
        
        return 'Unknown'
    
    def _detect_capability(self, model_id: str, tags: List[str]) -> str:
        """Detect model capability."""
        text = (model_id + ' ' + ' '.join(tags)).lower()
        
        if re.search(r'\b(vision|vl|visual|image|multimodal|llava|mtp)\b', text):
            return 'vision'
        elif re.search(r'\b(code|coder|coding|codellama|starcoder)\b', text):
            return 'code'
        elif re.search(r'\b(audio|speech|whisper|tts)\b', text):
            return 'audio'
        else:
            return 'text'
    
    def _extract_quantization(self, filename: str) -> str:
        """Extract quantization format from filename."""
        # Common patterns
        patterns = [
            r'\b(Q[2-8]_[KM]_[SLMX])\b',
            r'\b(Q[2-8]_[KM])\b',
            r'\b(Q[2-8]_0)\b',
            r'\b(IQ[1-4]_[SMXL]+)\b',
            r'\b(F16|F32|BF16)\b',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        
        return 'Unknown'
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        try:
            size_bytes = int(size_bytes) if size_bytes else 0
        except (ValueError, TypeError):
            size_bytes = 0
            
        if size_bytes == 0:
            return '0 B'
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        size = float(size_bytes)
        unit_index = 0
        
        while size >= 1024.0 and unit_index < len(units) - 1:
            size /= 1024.0
            unit_index += 1
        
        # Format with appropriate precision
        if unit_index == 0:  # Bytes
            return f"{int(size)} {units[unit_index]}"
        elif size < 10:
            return f"{size:.2f} {units[unit_index]}"
        else:
            return f"{size:.1f} {units[unit_index]}"
    
    def _normalize_model_name(self, model_id: str) -> str:
        """Normalize model name for deduplication."""
        text = model_id.lower()
        
        # Remove repo prefix
        if '/' in text:
            text = text.split('/', 1)[1]
        
        # Remove common suffixes
        suffixes = ['-gguf', '-ggml', '-quantized', '-awq', '-gptq']
        for suffix in suffixes:
            text = text.replace(suffix, '')
        
        # Normalize separators
        text = re.sub(r'[-_]+', ' ', text).strip()
        
        return text


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Daily GGUF Fetcher - Fetch and filter GGUF models from HuggingFace'
    )
    parser.add_argument(
        '--token',
        help='HuggingFace API token (recommended for higher rate limits)'
    )
    parser.add_argument(
        '--incremental',
        action='store_true',
        help='Merge with existing data instead of replacing'
    )
    parser.add_argument(
        '--min-likes',
        type=int,
        default=1,
        help='Minimum likes threshold (default: 1)'
    )
    parser.add_argument(
        '--max-models',
        type=int,
        default=10000,
        help='Maximum models to fetch (default: 10000)'
    )
    parser.add_argument(
        '--output',
        default='gguf_models.json',
        help='Output file path (default: gguf_models.json)'
    )
    
    args = parser.parse_args()
    
    fetcher = DailyGGUFFetcher(
        token=args.token,
        incremental=args.incremental,
        min_likes=args.min_likes,
        max_models=args.max_models,
        output_file=args.output
    )
    
    fetcher.run()


if __name__ == '__main__':
    main()
