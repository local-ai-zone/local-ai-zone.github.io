#!/usr/bin/env python3
"""
Simplified GGUF Fetcher - Optimized for Recently Added Models

OPTIMIZATION STRATEGY:
=====================
1. DOWNLOAD PHASE: Single API call with full=True
   - Fetches recently added models sorted by creation date (newest first)
   - Gets ALL data in one request: metadata, files (siblings), cardData
   - No per-model API calls needed
   - Saves raw data to data/raw_models_data.json

2. PROCESS PHASE: Local filtering from raw data
   - Loads raw data from local file (no API calls)
   - Filters by likes threshold (10+)
   - Extracts GGUF files and metadata
   - Applies spam filtering
   - Calculates hardware requirements
   - Outputs to gguf_models.json

USAGE:
======
# Full workflow (download + process):
python simplified_gguf_fetcher.py

# Download only (fetch recently added models):
python simplified_gguf_fetcher.py download

# Process only (filter local data to gguf_models.json):
python simplified_gguf_fetcher.py process

# Incremental mode (last 7 days only, merge with existing):
python simplified_gguf_fetcher.py --incremental

Enhanced with:
- Single API call for all data (full=True parameter)
- Focuses on recently added models (sorted by createdAt)
- Rate limiting for API calls
- Retry logic with exponential backoff
- Better memory management for large datasets
- Improved edge case handling
- Progress tracking with tqdm
- Configuration file support
- Dry-run mode
- Data versioning
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Callable, Union

from huggingface_hub import HfApi
from huggingface_hub.hf_api import ModelInfo, RepoFile
from tqdm import tqdm

# Import spam filter components
sys.path.insert(0, str(Path(__file__).parent.parent))
from spam_filter.config import FilterConfig
from spam_filter.engine import SpamFilterEngine
from spam_filter.hardware_calculator import HardwareRequirementsCalculator


def rate_limit(calls_per_second: float = 5.0):
    """Decorator to rate limit API calls to prevent overwhelming the server."""
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = min_interval - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator


def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
    """Decorator to retry failed API calls with exponential backoff."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger = logging.getLogger(__name__)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay:.1f}s..."
                        )
                        time.sleep(delay)
                        delay = min(delay * 2, max_delay)
                    else:
                        raise last_exception
            return None
        return wrapper
    return decorator


def safe_getattr(obj: Any, attr: str, default: Any = None) -> Any:
    """Safely get attribute from object, returning default if not found."""
    try:
        return getattr(obj, attr, default)
    except (KeyError, IndexError, TypeError, AttributeError):
        return default


def safe_dict_get(obj: Any, key: str, default: Any = None) -> Any:
    """Safely get dictionary value, handling both dict and object access."""
    try:
        if isinstance(obj, dict):
            return obj.get(key, default)
        elif hasattr(obj, '__getitem__'):
            try:
                return obj[key]
            except (KeyError, IndexError):
                return default
        else:
            return getattr(obj, key, default)
    except Exception:
        return default


def _parse_download_link(link: str) -> Optional[Tuple[str, str]]:
    """
    Parse ``modelId``/``filename`` out of a ``directDownloadLink`` URL.

    Used by the merge key, the legacy-entry backfill, and the size clamp so
    all three always agree on the same pair. Returns ``None`` if the link
    isn't a ``.../resolve/main/...`` download URL.
    """
    match = re.match(r'https://huggingface\.co/(.+?)/resolve/main/(.+)$', link or '')
    if match:
        return match.group(1), match.group(2)
    return None


class SimplifiedGGUFetcher:
    """
    Main class for fetching and processing GGUF model data from Hugging Face.
    
    Implements a two-phase approach:
    1. Download: Fetch models with full=True (SINGLE API REQUEST with all data)
    2. Process: Extract required fields, filter by 10+ likes, generate output
    """
    
    # Default configuration constants
    DEFAULT_CONFIG = {
        'recent_days_limit': None,  # No date limit - fetch ALL GGUF models
        'api_limit': 10000,         # Fetch up to 10,000 models
        'incremental_days_limit': None,  # No date limit for incremental either
        'incremental_api_limit': 10000,  # Fetch up to 10,000 models in incremental mode
        'min_likes_threshold': 1,   # Changed from 10 to 1 - get more models!
        'max_workers': 10,
        'output_dir': '.',
        'data_dir': 'data',
        'rate_limit_calls_per_second': 5.0,
        'max_retries': 3,
        'retry_base_delay': 1.0,
        'memory_warning_threshold_mb': 100,
        'max_raw_data_size_mb': 18,  # Stop before 20MB (GitHub limit)
    }
    
    def __init__(self, token: Optional[str] = None, filter_config: Optional[FilterConfig] = None, 
                 disable_spam_filter: bool = False, incremental: bool = False,
                 dry_run: bool = False, config: Optional[Dict] = None):
        """
        Initialize the fetcher with optional HF token and spam filtering configuration.
        
        Args:
            token: Optional Hugging Face API token for authenticated requests
            filter_config: Configuration for spam filtering (None to use defaults)
            disable_spam_filter: If True, skip spam filtering entirely
            incremental: If True, only fetch recent models and merge with existing data
            dry_run: If True, don't write any files
            config: Optional configuration dictionary to override defaults
        """
        self.api = HfApi(token=token)
        self.logger = logging.getLogger(__name__)
        self.dry_run = dry_run
        
        # Merge default config with user-provided config
        self.config = {**self.DEFAULT_CONFIG}
        if config:
            self.config.update(config)
        
        # Apply configuration
        self.RECENT_DAYS_LIMIT = self.config['recent_days_limit']
        self.API_LIMIT = self.config['api_limit']
        self.INCREMENTAL_DAYS_LIMIT = self.config['incremental_days_limit']
        self.INCREMENTAL_API_LIMIT = self.config['incremental_api_limit']
        self.MIN_LIKES_THRESHOLD = self.config['min_likes_threshold']
        self.MAX_WORKERS = min(self.config['max_workers'], 20)  # Cap at 20
        
        # File paths
        self.data_dir = Path(self.config['data_dir'])
        self.output_dir = Path(self.config['output_dir'])
        self.raw_data_file = self.data_dir / "raw_models_data.json"
        self.output_file = self.output_dir / "gguf_models.json"
        self.metadata_file = self.data_dir / "metadata.json"
        
        # Incremental mode flag
        self.incremental = incremental
        
        # Spam filtering configuration
        self.filter_config = filter_config or FilterConfig()
        self.disable_spam_filter = disable_spam_filter
        self.spam_engine = None if disable_spam_filter else SpamFilterEngine(self.filter_config)
        
        # Sane upper bound for a GGUF file (largest real models ≈ 860 GB at
        # FP16 / ~430 GB at Q8). Anything above this is an API/estimation
        # glitch (e.g. the old estimator regex turned "1781204855.BF16" into
        # "1781204855 billion params" → "3652861.5 TB").
        self.MAX_SANE_FILE_SIZE = 2 * 1024 ** 4  # 2 TiB

        # Hardware requirements calculator
        self.hardware_calculator = HardwareRequirementsCalculator(self.filter_config)
        
        # Statistics tracking
        self.stats = {
            'start_time': None,
            'end_time': None,
            'models_fetched': 0,
            'models_processed': 0,
            'api_calls': 0,
            'errors': [],
        }
        
        # Create directories if not in dry-run mode
        if not self.dry_run:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.output_dir.mkdir(parents=True, exist_ok=True)
    
    @rate_limit(calls_per_second=5.0)
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    def _fetch_model_info_with_retry(self, model_id: str) -> Any:
        """Fetch model info with rate limiting and retry logic."""
        self.stats['api_calls'] += 1
        return self.api.model_info(model_id, files_metadata=True)
    
    def _safe_extract_siblings(self, model_data: Any) -> List[Dict]:
        """Safely extract siblings data from various model data formats."""
        siblings = []
        
        try:
            # Try to get siblings attribute
            raw_siblings = safe_getattr(model_data, 'siblings', None)
            
            if raw_siblings is None:
                # Try dictionary access
                raw_siblings = safe_dict_get(model_data, 'siblings', None)
            
            if raw_siblings is None:
                return siblings
            
            # Handle different types of siblings data
            if isinstance(raw_siblings, list):
                for sibling in raw_siblings:
                    try:
                        if isinstance(sibling, dict):
                            filename = sibling.get('rfilename', '')
                            size = sibling.get('size', 0)
                        elif hasattr(sibling, 'rfilename'):
                            filename = safe_getattr(sibling, 'rfilename', '')
                            size = safe_getattr(sibling, 'size', 0) or 0
                        else:
                            continue
                        
                        if filename:
                            siblings.append({
                                'rfilename': str(filename),
                                'size': self._resolve_file_size(filename, size, model_data)
                            })
                    except Exception as e:
                        self.logger.debug(f"Error extracting sibling: {e}")
                        continue
            elif hasattr(raw_siblings, '__iter__'):
                # Handle iterable objects
                for sibling in raw_siblings:
                    try:
                        filename = safe_getattr(sibling, 'rfilename', '')
                        size = safe_getattr(sibling, 'size', 0) or 0
                        
                        if filename:
                            siblings.append({
                                'rfilename': str(filename),
                                'size': self._resolve_file_size(filename, size, model_data)
                            })
                    except Exception as e:
                        self.logger.debug(f"Error extracting sibling from iterable: {e}")
                        continue
                        
        except Exception as e:
            self.logger.debug(f"Error in _safe_extract_siblings: {e}")
        
        return siblings
    
    def _resolve_file_size(self, filename: str, size: int, model_data: Any = None) -> int:
        """
        Resolve a GGUF file's size, estimating it when the API returns 0/None.

        Newer huggingface_hub versions no longer include file sizes in
        ``list_models(full=True)`` results, so missing sizes are estimated from
        the quantization format and model parameter count to keep downstream
        size-based filtering (e.g. spam filter) working.
        """
        size = int(size) if size else 0
        if size > 0:
            return size
        if not filename or not str(filename).lower().endswith('.gguf'):
            return 0
        model_id = safe_getattr(model_data, 'id', '') or safe_dict_get(model_data, 'id', '')
        return self._estimate_file_size(filename, model_id)

    def _estimate_file_size(self, filename: str, model_id: str = '') -> int:
        """
        Estimate GGUF file size from quantization format and model parameters.

        Used as a fallback when the HuggingFace API doesn't provide file sizes.
        """
        # Extract model parameters from id/name (7B, 13B, 70B, etc.)
        # The lookahead prevents matching timestamps/IDs like "1781204855.BF16"
        # as "1781204855 billion" parameters (which produced absurd sizes).
        param_match = re.search(r'(\d+(?:\.\d+)?)\s*[Bb](?![A-Za-z0-9])', f"{model_id} {filename}")
        params_billions = 7.0  # Default assumption
        if param_match:
            params_billions = float(param_match.group(1))

        # Quantization to bits-per-parameter mapping
        quant_format = self._extract_quantization(filename).upper()
        bits_per_param = {
            'F32': 32.0, 'F16': 16.0, 'BF16': 16.0, 'Q8_0': 8.5, 'Q6_K': 6.5,
            'Q5_K_M': 5.5, 'Q5_K_S': 5.0, 'Q5_0': 5.0, 'Q5_1': 5.5,
            'Q4_K_M': 4.5, 'Q4_K_S': 4.0, 'Q4_0': 4.5, 'Q4_1': 4.5,
            'Q3_K_M': 3.5, 'Q3_K_S': 3.0, 'Q2_K': 2.5,
            'IQ4_XS': 4.25, 'IQ3_S': 3.4, 'IQ3_XXS': 3.1, 'IQ2_XXS': 2.2,
            'IQ2_XS': 2.3, 'IQ1_S': 1.5,
        }.get(quant_format, 4.5)  # Default to Q4_K_M equivalent

        # params (billions) * bits_per_param / 8 = size in GB, then to bytes
        size_gb = (params_billions * bits_per_param) / 8.0
        size_bytes = int(size_gb * 1024 * 1024 * 1024)

        # Add 5% overhead for metadata
        return int(size_bytes * 1.05)

    def _normalize_base_model_name(self, model_id: str, model_name: str = '') -> str:
        """
        Normalize model name to a canonical form for cross-repo deduplication.
        
        Strips repo-specific prefixes/suffixes, uploader names, and quantization
        markers to identify the same base model across different HuggingFace repos.
        
        Args:
            model_id: Full HuggingFace model ID (e.g., 'unsloth/Qwen3-Coder-Next-GGUF')
            model_name: Optional display name
            
        Returns:
            Normalized canonical name for grouping
        """
        # Use model_id for normalization (more reliable than display name)
        text = model_id.lower()
        
        # Remove uploader prefix (everything before the first '/')
        if '/' in text:
            text = text.split('/', 1)[1]
        
        # Remove common repo suffixes that don't change the base model
        # Applied multiple times for compound suffixes
        repo_suffixes = [
            '-gguf', '-ggml', '-quantized', '-awq', '-gptq', '-exl2',
            '-unsloth', '-exl3', '-mlx', '-kquant', '-imatrix',
            '-fp16', '-bf16', '-q4_k_m', '-q5_k_m', '-q8_0', '-q6_k',
            '-iq4_xs', '-iq3_xxs', '-iq2_xxs', '-iq1_s',
        ]
        for _ in range(3):  # Multiple passes for compound suffixes
            for suffix in repo_suffixes:
                if text.endswith(suffix):
                    text = text[:-len(suffix)]
        
        # Remove version suffixes like -v1, -v2, -chat, -instruct, -hf, etc.
        version_patterns = [
            r'-v\d+(\.\d+)?$', r'-chat(-hf)?$', r'-instruct(-v\d+(\.\d+)?)?$',
            r'-base$', r'-raw$', r'-pretrained$', r'-finetuned$',
            r'-distilled$', r'-merged$', r'-dpo$', r'-rlhf$', r'-sft$',
            r'-(chat|instruct|base|raw|pretrained|finetuned)(-\w+)*$',
        ]
        for pattern in version_patterns:
            text = re.sub(pattern, '', text)
        
        # Note: We intentionally keep size indicators (7B, 13B, 70B) as they
        # differentiate model variants. Only remove if the name ends with size
        # AND there's already a version number present (e.g., "llama-2-7b" → "llama 2")
        # This is handled by the version_patterns above for common cases.
        
        # Normalize separators
        text = re.sub(r'[-_]+', ' ', text).strip()
        text = re.sub(r'\s+', ' ', text)
        
        return text

    def _deduplicate_across_repos(self, models: List[Dict]) -> List[Dict]:
        """
        Deduplicate models across different HuggingFace repos.
        
        When the same base model (e.g., Qwen3-Coder-Next) is uploaded to multiple
        repos, keep only the entry from the repo with the highest engagement
        (likes + downloads). This prevents showing duplicate model info.
        
        Args:
            models: List of processed model entries (after _extract_model_info)
            
        Returns:
            Deduplicated list with one entry per unique base model
        """
        if not models:
            return models
        
        # Group models by normalized base name
        groups = defaultdict(list)
        for model in models:
            model_id = model.get('modelId', '')
            model_name = model.get('modelName', '')
            canonical = self._normalize_base_model_name(model_id, model_name)
            groups[canonical].append(model)
        
        deduplicated = []
        duplicates_removed = 0
        
        for canonical_name, group in groups.items():
            if len(group) == 1:
                deduplicated.append(group[0])
                continue
            
            # Multiple repos have this model - pick the best one
            # Score = likes * 10 + downloads (likes weighted higher)
            best = max(group, key=lambda m: (
                (m.get('likeCount', 0) or 0) * 10 + 
                (m.get('downloadCount', 0) or 0)
            ))
            deduplicated.append(best)
            duplicates_removed += len(group) - 1
        
        if duplicates_removed > 0:
            self.logger.info(
                f"Cross-repo deduplication: removed {duplicates_removed} duplicate "
                f"entries from {len(groups)} unique base models"
            )
        
        return deduplicated
    
    def run_direct_mode(self) -> None:
        """
        Direct mode: Fetch and process in memory without saving raw data.
        
        This mode:
        1. Fetches models directly from API (in memory)
        2. Processes and filters immediately
        3. Outputs only gguf_models.json
        4. Never writes raw_models_data.json to disk
        
        Perfect for GitHub Actions where raw data cache isn't needed.
        """
        self.logger.info("=" * 70)
        self.logger.info("DIRECT MODE: IN-MEMORY PROCESSING (NO RAW DATA FILE)")
        self.logger.info("=" * 70)
        self.logger.info(f"Mode: {'INCREMENTAL' if self.incremental else 'FULL'}")
        self.logger.info(f"Scope: ALL GGUF MODELS (no date limit)")
        self.logger.info(f"Sorting: By popularity (likes)")
        self.logger.info(f"Dry run: {self.dry_run}")
        self.logger.info("=" * 70)
        
        self.stats['start_time'] = datetime.now()
        
        try:
            # Step 1: Fetch models (in memory only)
            self.logger.info("\nStep 1/6: Fetching models from API (in memory)...")
            recent_models = self._fetch_recent_models()
            self.stats['models_fetched'] = len(recent_models)
            
            if not recent_models:
                self.logger.warning("No models fetched")
                self._generate_output([])
                return
            
            # Step 2: Convert model objects to dictionaries (in memory)
            self.logger.info(f"\nStep 2/6: Processing {len(recent_models)} models in memory...")
            models_data = []
            for model in tqdm(recent_models, desc="Converting models", unit="model"):
                model_id = safe_getattr(model, 'id', 'unknown')
                try:
                    siblings = self._safe_extract_siblings(model)
                    likes = safe_getattr(model, 'likes', 0) or 0
                    downloads = safe_getattr(model, 'downloads', 0) or 0
                    tags = safe_getattr(model, 'tags', []) or []
                    card_data = safe_getattr(model, 'cardData', {}) or {}
                    created_at = safe_getattr(model, 'created_at', None)
                    
                    likes = self._validate_engagement_metric(likes, model_id, 'likes')
                    downloads = self._validate_engagement_metric(downloads, model_id, 'downloads')
                    
                    model_dict = {
                        'id': model_id,
                        'downloads': downloads,
                        'likes': likes,
                        'tags': list(tags) if tags else [],
                        'siblings': siblings,
                        'cardData': {
                            'license': str(safe_getattr(card_data, 'license', '')) or '',
                            'license_name': str(safe_getattr(card_data, 'license_name', '')) or '',
                            'tags': list(safe_getattr(card_data, 'tags', []) or []),
                            'metadata': {k: str(v) for k, v in (safe_getattr(card_data, 'metadata', {}) or {}).items() if isinstance(k, str)},
                        } if card_data else {},
                        'created_at': created_at.isoformat() if created_at and hasattr(created_at, 'isoformat') else None,
                    }
                    
                    models_data.append(model_dict)
                except Exception as e:
                    self.logger.warning(f"Error processing {model_id}: {e}")
                    continue
            
            self.logger.info(f"Converted {len(models_data)} models to dictionaries")
            
            # Step 3: Filter by likes
            self.logger.info(f"\nStep 3/6: Filtering models with {self.MIN_LIKES_THRESHOLD}+ likes...")
            liked_models = [m for m in models_data if m.get('likes', 0) >= self.MIN_LIKES_THRESHOLD]
            self.logger.info(f"Models with {self.MIN_LIKES_THRESHOLD}+ likes: {len(liked_models)}")
            
            if not liked_models:
                self.logger.warning(f"No models with {self.MIN_LIKES_THRESHOLD}+ likes found")
                self._generate_output([])
                return
            
            # Step 4: Apply spam filtering or basic GGUF filtering
            if self.disable_spam_filter:
                self.logger.info("\nStep 4/6: Basic GGUF filtering...")
                models_with_gguf = self._filter_gguf_models(liked_models)
                self.logger.info(f"Models with GGUF files: {len(models_with_gguf)}")
                
                if not models_with_gguf:
                    self.logger.warning("No models with GGUF files found")
                    self._generate_output([])
                    return
                
                processed_models = self._process_models(models_with_gguf)
                final_models = processed_models
            else:
                self.logger.info("\nStep 4/6: Applying spam filtering...")
                filter_result = self.spam_engine.filter_models(liked_models)
                
                if not filter_result.success:
                    self.logger.error("Spam filtering failed")
                    raise Exception("Spam filtering failed")
                
                report = self.spam_engine.generate_report(filter_result)
                self.logger.info("\n" + report)
                final_models = filter_result.filtered_models
            
            # Step 5: Deduplicate
            self.logger.info("\nStep 5/6: Deduplicating models across repos...")
            pre_dedup = len(final_models)
            final_models = self._deduplicate_across_repos(final_models)
            self.logger.info(f"After deduplication: {len(final_models)} models (removed {pre_dedup - len(final_models)})")
            
            self.stats['models_processed'] = len(final_models)
            
            # Step 6: Generate output
            self.logger.info("\nStep 6/6: Generating gguf_models.json...")
            if not self.dry_run:
                self._generate_output(final_models)
            else:
                self.logger.info(f"DRY RUN: Would output {len(final_models)} models")
            
            if not self.dry_run:
                # Save minimal metadata (no raw data file info)
                metadata = {
                    'last_run': datetime.now().isoformat(),
                    'mode': 'direct',
                    'incremental': self.incremental,
                    'stats': {
                        'models_fetched': self.stats['models_fetched'],
                        'models_processed': self.stats['models_processed'],
                        'api_calls': self.stats['api_calls'],
                    }
                }
                with open(self.metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            self.logger.info("\n" + "=" * 70)
            self.logger.info("DIRECT MODE COMPLETED")
            self.logger.info(f"  Duration: {duration:.1f}s")
            self.logger.info(f"  API calls: {self.stats['api_calls']}")
            self.logger.info(f"  Models fetched: {len(recent_models)}")
            self.logger.info(f"  Final models: {len(final_models)}")
            self.logger.info(f"  Memory usage: No raw data file created ✓")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"Direct mode failed: {e}")
            self.stats['errors'].append(str(e))
            raise

    def download_data(self) -> None:
        """
        Phase 1: Download RECENTLY ADDED model data from Hugging Face API.
        
        OPTIMIZATION: ONE API CALL with full=True gets ALL data for recently added models:
        - Model metadata (likes, downloads, tags)
        - File list (siblings) with sizes
        - Card data (license, description)
        
        No per-model API calls needed. Everything comes from the listing endpoint.
        """
        self.logger.info("=" * 70)
        self.logger.info("PHASE 1: DOWNLOAD RECENTLY ADDED MODELS (SINGLE API CALL)")
        self.logger.info("=" * 70)
        self.logger.info(f"Mode: {'INCREMENTAL' if self.incremental else 'FULL'}")
        self.logger.info(f"Looking back: {self.INCREMENTAL_DAYS_LIMIT if self.incremental else self.RECENT_DAYS_LIMIT} days")
        self.logger.info(f"Dry run: {self.dry_run}")
        self.logger.info("=" * 70)
        
        self.stats['start_time'] = datetime.now()
        
        try:
            # SINGLE API CALL - Gets all recently added models sorted by creation date
            # with full=True to include all file and metadata information
            recent_models = self._fetch_recent_models()
            self.stats['models_fetched'] = len(recent_models)
            
            if recent_models:
                self.logger.info(f"\nSaving {len(recent_models)} raw model records to local storage...")
                if not self.dry_run:
                    self._save_raw_data(recent_models)
                else:
                    self.logger.info(f"DRY RUN: Would save raw data to {self.raw_data_file}")
            else:
                self.logger.warning("No recently added models found")
            
            if not self.dry_run:
                self._save_metadata()
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            self.logger.info("=" * 70)
            self.logger.info("DOWNLOAD PHASE COMPLETED")
            self.logger.info(f"  Duration: {duration:.1f}s")
            self.logger.info(f"  API calls: {self.stats['api_calls']} (single paginated request)")
            self.logger.info(f"  Models downloaded: {len(recent_models)}")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"Download phase failed: {e}")
            self.stats['errors'].append(str(e))
            raise
    
    def _fetch_recent_models(self) -> List:
        """
        Fetch ALL GGUF models with ONE API call (no date filters!).
        Uses full=True to get ALL data (siblings, cardData) in single request.
        
        Returns:
            List of all GGUF model objects sorted by likes (most popular first)
        """
        max_models = self.API_LIMIT
        if self.incremental:
            max_models = self.INCREMENTAL_API_LIMIT
        
        self.logger.info("=" * 50)
        self.logger.info("FETCHING ALL GGUF MODELS (NO DATE LIMIT)")
        self.logger.info(f"Single API call with full=True (includes all file data)")
        self.logger.info(f"Sorting by: LIKES (most popular first)")
        self.logger.info(f"Model limit: {max_models} models")
        self.logger.info(f"Mode: {'INCREMENTAL (merges with existing)' if self.incremental else 'FULL (replaces existing)'}")
        self.logger.info("=" * 50)
        
        try:
            self.stats['api_calls'] += 1
            
            models = []
            self.logger.info("Starting API pagination (sorted by likes, most popular first)...")
            
            for model in self.api.list_models(
                filter="gguf",
                sort="likes",      # Sort by likes for most popular models
                full=True,         # CRITICAL: Gets all data in ONE call (siblings, cardData, etc.)
            ):
                # Check model limit
                if len(models) >= max_models:
                    self.logger.info(f"Reached model limit ({max_models}), stopping...")
                    break
                
                models.append(model)
                
                # Progress logging
                if len(models) % 100 == 0 and len(models) > 0:
                    self.logger.info(f"  Progress: {len(models)} models fetched...")
                    
                    # Only check size limit in incremental mode
                    if self.incremental:
                        estimated_size_mb = (len(models) * 35) / 1024
                        if estimated_size_mb >= self.config['max_raw_data_size_mb']:
                            self.logger.warning(f"Approaching size limit ({self.config['max_raw_data_size_mb']}MB), stopping")
                            break
            
            self.logger.info("=" * 50)
            self.logger.info(f"API FETCH COMPLETED")
            self.logger.info(f"  - Total models fetched: {len(models)}")
            self.logger.info(f"  - All GGUF models (no date filter)")
            self.logger.info(f"  - Sorted by: LIKES (most popular first)")
            self.logger.info(f"  - API calls: 1 (with full=True)")
            self.logger.info("=" * 50)
            
            return models
            
        except Exception as e:
            self.logger.error(f"Failed to fetch models: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return []
    
    def _save_raw_data(self, models: List) -> None:
        """
        Save raw model data to JSON file.
        
        OPTIMIZATION: No per-model API calls needed - all data (siblings, cardData, etc.)
        comes directly from the full=True listing call.
        
        Args:
            models: List of model objects with full data already loaded
        """
        if not models:
            self.logger.warning("No models to save")
            return
        
        self.logger.info(f"\nProcessing {len(models)} models from API response...")
        self.logger.info("(No additional API calls - using full=True data)")
        
        try:
            models_data = []
            engagement_stats = {
                'models_with_likes': 0,
                'models_missing_likes': 0,
                'total_likes': 0,
                'max_likes': 0,
                'min_likes': float('inf')
            }
            
            success_count = 0
            failed_count = 0
            
            for model in tqdm(models, desc="Extracting model data", unit="model"):
                model_id = safe_getattr(model, 'id', 'unknown')
                
                try:
                    # Extract all data from the model object (no API calls)
                    siblings = self._safe_extract_siblings(model)
                    likes = safe_getattr(model, 'likes', 0) or 0
                    downloads = safe_getattr(model, 'downloads', 0) or 0
                    tags = safe_getattr(model, 'tags', []) or []
                    card_data = safe_getattr(model, 'cardData', {}) or {}
                    last_modified = safe_getattr(model, 'lastModified', None)
                    created_at = safe_getattr(model, 'created_at', None)
                    
                    likes = self._validate_engagement_metric(likes, model_id, 'likes')
                    downloads = self._validate_engagement_metric(downloads, model_id, 'downloads')
                    
                    model_dict = {
                        'id': model_id,
                        'downloads': downloads,
                        'likes': likes,
                        'tags': list(tags) if tags else [],
                        'siblings': siblings,
                        'cardData': {
                            'license': str(safe_getattr(card_data, 'license', '')) or '',
                            'license_name': str(safe_getattr(card_data, 'license_name', '')) or '',
                            'tags': list(safe_getattr(card_data, 'tags', []) or []),
                            'metadata': {k: str(v) for k, v in (safe_getattr(card_data, 'metadata', {}) or {}).items() if isinstance(k, str)},
                        } if card_data else {},
                        'lastModified': last_modified,
                        'created_at': created_at
                    }
                    
                    # Normalize date fields to ISO format strings
                    if model_dict['lastModified'] and hasattr(model_dict['lastModified'], 'isoformat'):
                        model_dict['lastModified'] = model_dict['lastModified'].isoformat()
                    elif not isinstance(model_dict['lastModified'], str):
                        model_dict['lastModified'] = None
                        
                    if model_dict['created_at'] and hasattr(model_dict['created_at'], 'isoformat'):
                        model_dict['created_at'] = model_dict['created_at'].isoformat()
                    elif not isinstance(model_dict['created_at'], str):
                        model_dict['created_at'] = None
                    
                    models_data.append(model_dict)
                    success_count += 1
                    
                    # Track engagement stats
                    if likes > 0:
                        engagement_stats['models_with_likes'] += 1
                        engagement_stats['total_likes'] += likes
                        engagement_stats['max_likes'] = max(engagement_stats['max_likes'], likes)
                        engagement_stats['min_likes'] = min(engagement_stats['min_likes'], likes)
                    else:
                        engagement_stats['models_missing_likes'] += 1
                        
                except Exception as e:
                    failed_count += 1
                    self.logger.error(f"Error processing {model_id}: {type(e).__name__}: {e}")
                    if self.logger.isEnabledFor(logging.DEBUG):
                        import traceback
                        self.logger.debug(traceback.format_exc())
            
            # In incremental mode, merge with existing raw data
            if self.incremental and self.raw_data_file.exists():
                try:
                    self.logger.info("\nMerging with existing raw data (incremental mode)...")
                    with open(self.raw_data_file, 'r', encoding='utf-8') as f:
                        existing_raw = json.load(f)
                    existing_by_id = {m.get('id', ''): m for m in existing_raw if isinstance(m, dict)}
                    for model_dict in models_data:
                        existing_by_id[model_dict.get('id', '')] = model_dict
                    models_data = list(existing_by_id.values())
                    self.logger.info(f"Merged: {len(existing_raw)} existing + {success_count} new = {len(models_data)} total")
                except Exception as e:
                    self.logger.warning(f"Failed to load existing raw data for merge: {e}")

            # Save to JSON file
            self.logger.info(f"\nWriting to {self.raw_data_file}...")
            with open(self.raw_data_file, 'w', encoding='utf-8') as f:
                json.dump(models_data, f, indent=2, ensure_ascii=False)
            
            # Calculate and display statistics
            avg_likes = engagement_stats['total_likes'] / max(engagement_stats['models_with_likes'], 1)
            if engagement_stats['min_likes'] == float('inf'):
                engagement_stats['min_likes'] = 0
            
            file_size_mb = os.path.getsize(self.raw_data_file) / (1024 * 1024)
            
            # Check if file size is safe for GitHub
            if file_size_mb > 20:
                self.logger.error(f"WARNING: File size ({file_size_mb:.1f}MB) exceeds GitHub 20MB limit!")
                self.logger.error("Consider using --incremental mode or reducing recent_days_limit")
            elif file_size_mb > 18:
                self.logger.warning(f"File size ({file_size_mb:.1f}MB) is close to GitHub 20MB limit")
            else:
                self.logger.info(f"File size ({file_size_mb:.1f}MB) is safe for GitHub (under 20MB)")
            
            self.logger.info("\n" + "=" * 50)
            self.logger.info("RAW DATA SAVE SUMMARY")
            self.logger.info("=" * 50)
            self.logger.info(f"Processing results:")
            self.logger.info(f"  - Successfully processed: {success_count} models")
            self.logger.info(f"  - Failed: {failed_count} models")
            self.logger.info(f"  - Total in file: {len(models_data)} models")
            self.logger.info(f"\nFile information:")
            self.logger.info(f"  - Output file: {self.raw_data_file}")
            self.logger.info(f"  - File size: {file_size_mb:.2f} MB (GitHub limit: 20MB)")
            self.logger.info(f"\nEngagement metrics:")
            self.logger.info(f"  - Models with likes: {engagement_stats['models_with_likes']}")
            self.logger.info(f"  - Models with no likes: {engagement_stats['models_missing_likes']}")
            self.logger.info(f"  - Total likes: {engagement_stats['total_likes']:,}")
            if engagement_stats['models_with_likes'] > 0:
                self.logger.info(f"  - Average likes: {avg_likes:.1f}")
                self.logger.info(f"  - Like range: {engagement_stats['min_likes']} to {engagement_stats['max_likes']:,}")
            self.logger.info("=" * 50)
            
        except Exception as e:
            self.logger.error(f"Critical error saving raw data: {e}")
            raise
    
    def process_data(self) -> None:
        """
        Phase 2: Process downloaded data and generate final gguf_models.json.
        
        OPTIMIZATION: All filtering is done locally from raw data (no API calls).
        Filters GGUF files, applies spam filtering, calculates hardware requirements.
        """
        self.logger.info("=" * 70)
        self.logger.info("PHASE 2: PROCESS RAW DATA → GGUF_MODELS.JSON")
        self.logger.info("=" * 70)
        self.logger.info(f"Local filtering only (no API calls)")
        self.logger.info(f"Dry run: {self.dry_run}")
        self.logger.info("=" * 70)
        
        self.stats['start_time'] = datetime.now()
        
        try:
            # Step 1: Load raw data (from Phase 1)
            self.logger.info("\nStep 1/6: Loading raw model data from local file...")
            raw_models = self._load_raw_data()
            if not raw_models:
                self.logger.warning("No raw data found, nothing to process")
                self.logger.info("Run download phase first: python simplified_gguf_fetcher.py download")
                self._generate_output([])
                return
            
            # Step 2: Filter models with 10+ likes
            self.logger.info(f"\nStep 2/6: Filtering models with {self.MIN_LIKES_THRESHOLD}+ likes...")
            liked_models = self._filter_by_likes(raw_models)
            
            if not liked_models:
                self.logger.warning(f"No models with {self.MIN_LIKES_THRESHOLD}+ likes found")
                self._generate_output([])
                return
            
            # Step 3: Apply spam filtering or basic GGUF filtering
            if self.disable_spam_filter:
                self.logger.info("\nStep 3/6: Basic GGUF filtering (spam filtering disabled)...")
                models_with_gguf = self._filter_gguf_models(liked_models)
                
                models_without_gguf = len(liked_models) - len(models_with_gguf)
                self.logger.info(f"\nBasic filtering summary:")
                self.logger.info(f"  - Models loaded: {len(liked_models)}")
                self.logger.info(f"  - Models with GGUF files: {len(models_with_gguf)}")
                self.logger.info(f"  - Models without GGUF files: {models_without_gguf}")
                
                if not models_with_gguf:
                    self.logger.warning("No models with GGUF files found")
                    self._generate_output([])
                    return
                
                # Step 4: Process each model
                self.logger.info("\nStep 4/6: Processing models and extracting GGUF file information...")
                processed_models = self._process_models(models_with_gguf)
                
                # Step 5: Skip spam filtering
                self.logger.info("\nStep 5/6: Skipping spam filtering (disabled)")
                final_models = processed_models
                
            else:
                self.logger.info("\nStep 3/6: Applying integrated spam filtering...")
                
                filter_result = self.spam_engine.filter_models(liked_models)
                
                if not filter_result.success:
                    self.logger.error("Spam filtering failed:")
                    for error in filter_result.errors:
                        self.logger.error(f"  - {error}")
                    raise Exception("Spam filtering failed")
                
                self.logger.info("\nStep 4/6: Spam filtering completed")
                report = self.spam_engine.generate_report(filter_result)
                self.logger.info("\n" + report)
                
                self.logger.info("\nStep 5/6: Using spam-filtered models")
                final_models = filter_result.filtered_models
            
            # Step 5.5: Deduplicate across repos
            self.logger.info("\nStep 5.5/6: Deduplicating models across repos...")
            pre_dedup_count = len(final_models)
            final_models = self._deduplicate_across_repos(final_models)
            self.logger.info(f"After deduplication: {len(final_models)} models (removed {pre_dedup_count - len(final_models)} duplicates)")
            
            self.stats['models_processed'] = len(final_models)
            
            # Step 6: Generate final output
            self.logger.info("\nStep 6/6: Generating final gguf_models.json...")
            if not self.dry_run:
                self._generate_output(final_models)
            else:
                self.logger.info(f"DRY RUN: Would generate output for {len(final_models)} models")
            
            if not self.dry_run:
                self._save_metadata()
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            self.logger.info("\n" + "=" * 70)
            self.logger.info("PROCESS PHASE COMPLETED")
            self.logger.info(f"  Duration: {duration:.1f}s")
            self.logger.info(f"  Final models in gguf_models.json: {len(final_models)}")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"Process phase failed: {e}")
            self.stats['errors'].append(str(e))
            raise
    
    def _save_metadata(self) -> None:
        """Save execution metadata for tracking and debugging."""
        if self.dry_run:
            return
            
        metadata = {
            'last_run': datetime.now().isoformat(),
            'mode': 'incremental' if self.incremental else 'full',
            'stats': {
                'models_fetched': self.stats['models_fetched'],
                'models_processed': self.stats['models_processed'],
                'api_calls': self.stats['api_calls'],
                'errors': self.stats['errors'],
            },
            'config': {
                'min_likes_threshold': self.MIN_LIKES_THRESHOLD,
                'spam_filter_enabled': not self.disable_spam_filter,
            }
        }
        
        if self.stats['start_time'] and self.stats['end_time']:
            metadata['duration_seconds'] = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
        
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    def _filter_by_likes(self, raw_models: List[Dict]) -> List[Dict]:
        """Filter models to only include those with MIN_LIKES_THRESHOLD or more likes."""
        liked_models = []
        below_threshold = 0
        no_likes_data = 0
        
        for model in raw_models:
            try:
                likes = model.get('likes', 0) or 0
                
                if likes >= self.MIN_LIKES_THRESHOLD:
                    liked_models.append(model)
                elif likes > 0:
                    below_threshold += 1
                else:
                    no_likes_data += 1
                    
            except Exception as e:
                self.logger.warning(f"Error filtering model {model.get('id', 'unknown')}: {e}")
                no_likes_data += 1
                continue
        
        self.logger.info(f"Likes filtering results:")
        self.logger.info(f"  - Models with {self.MIN_LIKES_THRESHOLD}+ likes: {len(liked_models)}")
        self.logger.info(f"  - Models below threshold: {below_threshold}")
        self.logger.info(f"  - Models with no likes data: {no_likes_data}")
        
        return liked_models
    
    def _load_raw_data(self) -> List[Dict]:
        """Load raw model data from JSON file with memory check."""
        try:
            if not self.raw_data_file.exists():
                self.logger.error(f"Raw data file not found: {self.raw_data_file}")
                self.logger.info("Run the download phase first to generate raw data")
                return []
            
            file_size_mb = os.path.getsize(self.raw_data_file) / (1024 * 1024)
            
            if file_size_mb > self.config['memory_warning_threshold_mb']:
                self.logger.warning(
                    f"Large data file: {file_size_mb:.1f}MB. "
                    f"This may use significant memory."
                )
            
            with open(self.raw_data_file, 'r', encoding='utf-8') as f:
                raw_models = json.load(f)
            
            self.logger.info(
                f"Loaded {len(raw_models)} models from {self.raw_data_file} "
                f"({file_size_mb:.1f}MB)"
            )
            return raw_models
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in raw data file: {e}")
            return []
        except MemoryError:
            self.logger.error("Not enough memory to load raw data file")
            return []
        except Exception as e:
            self.logger.error(f"Error loading raw data: {e}")
            return []
    
    def _filter_gguf_models(self, raw_models: List[Dict]) -> List[Dict]:
        """Filter models to only process those with .gguf files in siblings."""
        models_with_gguf = []
        skipped_no_siblings = 0
        skipped_no_gguf = 0
        
        for model in raw_models:
            try:
                siblings = model.get('siblings')
                
                if not siblings or not isinstance(siblings, list):
                    skipped_no_siblings += 1
                    continue
                
                has_gguf = any(
                    isinstance(s, dict) and str(s.get('rfilename', '')).lower().endswith('.gguf')
                    for s in siblings
                )
                
                if has_gguf:
                    models_with_gguf.append(model)
                else:
                    skipped_no_gguf += 1
                    
            except Exception as e:
                self.logger.warning(f"Error filtering model {model.get('id', 'unknown')}: {e}")
                skipped_no_siblings += 1
                continue
        
        self.logger.info(f"GGUF filtering results:")
        self.logger.info(f"  - Models with GGUF files: {len(models_with_gguf)}")
        self.logger.info(f"  - Models skipped: {skipped_no_siblings + skipped_no_gguf}")
        
        return models_with_gguf
    
    def _process_models(self, models: List[Dict]) -> List[Dict]:
        """Process each model and extract info for each GGUF file."""
        processed_models = []
        skipped_count = 0
        
        self.logger.info(f"Processing {len(models)} models...")
        
        for model in tqdm(models, desc="Processing models", unit="model"):
            model_id = model.get('id', 'unknown')
            
            try:
                model_entries = self._extract_model_info(model)
                processed_models.extend(model_entries)
                
            except Exception as e:
                self.logger.warning(f"Skipping model {model_id} due to error: {e}")
                skipped_count += 1
                continue
        
        self.logger.info(f"Model processing summary:")
        self.logger.info(f"  - Models processed: {len(models) - skipped_count}")
        self.logger.info(f"  - Models skipped: {skipped_count}")
        self.logger.info(f"  - Total GGUF entries: {len(processed_models)}")
        
        return processed_models
    
    def _extract_model_info(self, model_data: Dict) -> List[Dict]:
        """Extract info for each GGUF file in a model."""
        model_id = model_data.get('id', '')
        siblings = model_data.get('siblings', [])
        downloads = model_data.get('downloads', 0)
        likes = self._validate_engagement_metric(model_data.get('likes', 0), model_id, 'likes')
        tags = model_data.get('tags', [])
        card_data = model_data.get('cardData', {})
        
        model_name = self._extract_model_name(model_id)
        model_type = self._infer_model_type(model_id, tags)
        model_capability = self._detect_model_capability(model_id, tags, model_name)
        license_info = self._get_license(card_data)
        hf_link, _ = self._generate_links(model_id, "")
        upload_date = model_data.get('created_at', None)
        
        processed_entries = []
        
        for sibling in siblings:
            if not isinstance(sibling, dict):
                continue
                
            filename = sibling.get('rfilename', '')
            if not filename.lower().endswith('.gguf'):
                continue
            
            file_size = sibling.get('size', 0) or 0
            # Clamp implausible sizes (API glitches / estimator bugs)
            if file_size > self.MAX_SANE_FILE_SIZE:
                file_size = self._estimate_file_size(filename, model_id)
                file_size = int(file_size) if file_size else 0
            file_size_formatted = self._format_file_size(file_size)
            quantization = self._extract_quantization(filename)
            _, direct_download_link = self._generate_links(model_id, filename)
            
            entry = {
                'modelName': model_name,
                'quantFormat': quantization,
                'fileSize': file_size,
                'fileSizeFormatted': file_size_formatted,
                'modelType': model_type,
                'modelCapability': model_capability,
                'license': license_info,
                'downloadCount': downloads,
                'likeCount': likes,
                'huggingFaceLink': hf_link,
                'directDownloadLink': direct_download_link,
                'modelId': model_id,
                'filename': filename,
                'uploadDate': upload_date
            }
            
            try:
                entry = self.hardware_calculator.calculate_requirements(entry)
            except Exception as e:
                self.logger.warning(f"Hardware calc failed for {model_name}: {e}")
            
            processed_entries.append(entry)
        
        return processed_entries
    
    def _merge_key(self, model: Dict) -> str:
        """
        Build a stable merge key for a model entry.

        New entries carry ``modelId``/``filename``; legacy entries (older
        ``gguf_models.json`` snapshots) don't, so fall back to parsing them out
        of the ``directDownloadLink`` URL. Without this fallback, every legacy
        entry collapses to the key ``"::"`` and an incremental run wipes the
        existing dataset (16,519 → ~1,750 models).
        """
        model_id = model.get('modelId') or ''
        filename = model.get('filename') or ''
        if model_id and filename:
            return f"{model_id}::{filename}"
        parsed = _parse_download_link(model.get('directDownloadLink') or '')
        if parsed:
            return f"{parsed[0]}::{parsed[1]}"
        # Last resort: key on the full link so distinct entries never collapse
        return f"link::{model.get('directDownloadLink') or model.get('huggingFaceLink') or ''}"

    def _generate_output(self, processed_models: List[Dict]) -> None:
        """Generate final JSON output file."""
        if self.dry_run:
            self.logger.info(f"DRY RUN: Skipping output generation for {len(processed_models)} models")
            return
        existing_models = []
        if self.incremental and self.output_file.exists():
            self.logger.info("INCREMENTAL MODE: Loading existing models for merge...")
            try:
                with open(self.output_file, 'r', encoding='utf-8') as f:
                    existing_models = json.load(f)
                self.logger.info(f"Loaded {len(existing_models)} existing models")
            except Exception as e:
                self.logger.warning(f"Failed to load existing models: {e}")
                existing_models = []
        
        if not processed_models and not existing_models:
            self.logger.warning("No processed models to output")
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=2, ensure_ascii=False)
            return
        
        if self.incremental and existing_models:
            model_dict = {}
            for model in existing_models:
                key = self._merge_key(model)
                model_dict[key] = model
            
            new_count = 0
            updated_count = 0
            for model in processed_models:
                key = self._merge_key(model)
                if key in model_dict:
                    updated_count += 1
                else:
                    new_count += 1
                model_dict[key] = model
            
            processed_models = list(model_dict.values())
            self.logger.info(f"Merge: {new_count} new, {updated_count} updated, {len(processed_models)} total")
        
        # Sort by downloads (primary) and likes (secondary)
        sorted_models = sorted(processed_models, 
                             key=lambda x: (x.get('downloadCount', 0), x.get('likeCount', 0)), 
                             reverse=True)
        
        output_models = []
        for model in sorted_models:
            like_count = model.get('likeCount', 0)
            if like_count is None or not isinstance(like_count, (int, float)) or like_count < 0:
                like_count = 0
            else:
                like_count = int(like_count)
            
            # Backfill modelId/filename from the download link for legacy
            # entries that predate those fields, so future incremental merges
            # always key on the primary fields (see _merge_key).
            model_id = model.get('modelId') or ''
            filename = model.get('filename') or ''
            if not model_id or not filename:
                parsed = _parse_download_link(model.get('directDownloadLink') or '')
                if parsed:
                    model_id = model_id or parsed[0]
                    filename = filename or parsed[1]

            # Clamp legacy bogus sizes so incremental merges self-heal
            # previously-corrupted entries (e.g. old "3652861.5 TB" values).
            file_size = model.get('fileSize', 0) or 0
            if file_size > self.MAX_SANE_FILE_SIZE:
                file_size = self._estimate_file_size(filename, model_id)
                file_size = int(file_size) if file_size else 0

            output_entry = {
                'modelName': model.get('modelName', ''),
                'quantFormat': model.get('quantFormat', 'Unknown'),
                'fileSize': file_size,
                'fileSizeFormatted': self._format_file_size(file_size),
                'modelType': model.get('modelType', 'Unknown'),
                'modelCapability': model.get('modelCapability', 'text'),
                'license': model.get('license', 'Not specified'),
                'downloadCount': model.get('downloadCount', 0),
                'likeCount': like_count,
                'huggingFaceLink': model.get('huggingFaceLink', ''),
                'directDownloadLink': model.get('directDownloadLink', ''),
                'modelId': model_id,
                'filename': filename,
                'minRamGB': model.get('minRamGB', 8),
                'minCpuCores': model.get('minCpuCores', 4),
                'gpuRequired': model.get('gpuRequired', True),
                'osSupported': model.get('osSupported', ['Windows', 'Linux', 'macOS']),
                'uploadDate': model.get('uploadDate', None)
            }
            output_models.append(output_entry)
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output_models, f, indent=2, ensure_ascii=False)
        
        file_size_mb = os.path.getsize(self.output_file) / (1024 * 1024)
        
        self.logger.info(f"Output saved: {self.output_file} ({file_size_mb:.1f}MB)")
        self.logger.info(f"Total entries: {len(output_models)}")
        
        if output_models:
            unique_models = len(set(m.get('modelName', '') for m in output_models))
            self.logger.info(f"Unique models: {unique_models}")
            total_likes = sum(m.get('likeCount', 0) for m in output_models)
            self.logger.info(f"Total likes: {total_likes:,}")
    
    def _validate_engagement_metric(self, value, model_id: str, metric_name: str) -> int:
        """Validate and sanitize engagement metric values."""
        try:
            if value is None:
                return 0
            
            if isinstance(value, str):
                if value.strip() == '' or value.lower() in ['null', 'none', 'n/a']:
                    return 0
                try:
                    value = float(value)
                except ValueError:
                    return 0
            
            if isinstance(value, (int, float)):
                if not isinstance(value, int) and (value != value or value == float('inf') or value == float('-inf')):
                    return 0
                if value < 0:
                    return 0
                return int(value)
            
            return 0
                
        except Exception as e:
            self.logger.error(f"Error validating {metric_name} for {model_id}: {e}")
            return 0
    
    def _extract_model_name(self, model_id: str) -> str:
        """Extract clean model name from modelId."""
        if not model_id:
            return "Unknown Model"
        
        parts = model_id.split('/')
        model_name = parts[-1] if parts else model_id
        model_name = model_name.replace('-', ' ').replace('_', ' ')
        model_name = ' '.join(word.capitalize() for word in model_name.split())
        
        return model_name
    
    def _extract_quantization(self, filename: str) -> str:
        """Parse quantization patterns from .gguf filenames."""
        if not filename:
            return "Unknown"
        
        filename_upper = filename.upper()
        
        quant_patterns = [
            'Q4_K_M', 'Q4_K_S', 'Q5_K_M', 'Q5_K_S', 'Q3_K_M', 'Q3_K_S', 
            'Q6_K', 'Q2_K', 'Q8_0', 'Q4_0', 'Q4_1', 'Q5_0', 'Q5_1',
            'F16', 'F32', 'BF16', 'IQ1_S', 'IQ2_XXS', 'IQ3_S', 'IQ4_XS'
        ]
        
        for pattern in quant_patterns:
            if pattern in filename_upper:
                return pattern
        
        return "Unknown"
    
    def _detect_model_capability(self, model_id: str, tags: List[str], model_name: str = '') -> str:
        """Detect model capability type (vision, embedding, text, code, audio)."""
        if not model_id:
            return "text"
        
        search_text = f"{model_id} {model_name}".lower()
        tags_lower = [str(tag).lower() for tag in (tags or [])]
        all_text = search_text + ' ' + ' '.join(tags_lower)
        
        # Capability patterns in order of specificity
        capability_patterns = {
            'vision': ['vision', 'vl', 'image', 'llava', 'cogvlm', 'minicpm-v', 'qwen-vl', 
                      'qwen2-vl', 'internvl', 'idefics', 'fuyu', 'paligemma', 'moondream',
                      'multimodal', 'visual', 'img2txt', 'image-to-text'],
            'embedding': ['embed', 'bge-', 'e5-', 'gte-', 'nomic-embed', 'sentence-', 
                         'all-minilm', 'instructor', 'retrieval', 'dense-passage', 'contriever'],
            'code': ['code', 'coder', 'codellama', 'starcoder', 'deepseek-coder', 'codegen',
                    'santacoder', 'replit-code', 'wizardcoder', 'phind-code', 'magicoder'],
            'audio': ['whisper', 'audio', 'speech', 'tts', 'voice', 'wav2vec', 'hubert',
                     'speecht5', 'bark', 'musicgen', 'seamless', 'transcription']
        }
        
        for capability, patterns in capability_patterns.items():
            if any(pattern in all_text for pattern in patterns):
                return capability
        
        return "text"
    
    def _infer_model_type(self, model_id: str, tags: List[str]) -> str:
        """Check tags and model name for model type patterns."""
        if not model_id:
            return "Unknown"
        
        model_id_lower = model_id.lower()
        
        model_type_patterns = {
            'LLaMA': ['llama', 'llama-2', 'llama2', 'llama-3', 'llama3'],
            'Mistral': ['mistral', 'mixtral'],
            'Qwen': ['qwen'],
            'Gemma': ['gemma'],
            'Phi': ['phi-3', 'phi3', 'phi-2', 'phi'],
            'CodeLlama': ['codellama', 'code-llama'],
            'DeepSeek': ['deepseek'],
            'Falcon': ['falcon'],
            'GPT': ['gpt-', 'gpt2', 'gpt3'],
            'BERT': ['bert'],
            'Vicuna': ['vicuna'],
            'Zephyr': ['zephyr'],
            'Orca': ['orca'],
            'WizardLM': ['wizardlm', 'wizard'],
            'StableLM': ['stablelm'],
        }
        
        for model_type, patterns in model_type_patterns.items():
            if any(pattern in model_id_lower for pattern in patterns):
                return model_type
        
        return "Unknown"
    
    def _get_license(self, card_data: Dict) -> str:
        """Extract license from cardData metadata."""
        if not card_data or not isinstance(card_data, dict):
            return "Not specified"
        
        # Try multiple possible license fields
        license_value = (
            card_data.get('license') or 
            card_data.get('license_name') or
            card_data.get('metadata', {}).get('license')
        )
        
        if license_value:
            if isinstance(license_value, str) and license_value.strip():
                return license_value.strip()
            elif isinstance(license_value, list) and license_value:
                return next((str(item).strip() for item in license_value 
                           if isinstance(item, str) and item.strip()), "Not specified")
        
        return "Not specified"
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Convert bytes to human readable format."""
        if not size_bytes or size_bytes <= 0:
            return "0 B"
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        size = float(size_bytes)
        unit_index = 0
        
        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1
        
        if size >= 100:
            return f"{size:.0f} {units[unit_index]}"
        elif size >= 10:
            return f"{size:.1f} {units[unit_index]}"
        else:
            return f"{size:.2f} {units[unit_index]}"
    
    def _generate_links(self, model_id: str, filename: str) -> Tuple[str, str]:
        """Generate Hugging Face page and direct download links."""
        if not model_id:
            return ("", "")
        
        hugging_face_link = f"https://huggingface.co/{model_id}"
        direct_download_link = f"https://huggingface.co/{model_id}/resolve/main/{filename}" if filename else ""
        
        return (hugging_face_link, direct_download_link)


def setup_logging(verbose: bool = False, log_file: Optional[str] = None) -> None:
    """Configure logging with appropriate format and level."""
    handlers = [logging.StreamHandler()]
    
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=handlers
    )


def main():
    """Main entry point with command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Simplified GGUF Fetcher - Download and process GGUF model data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run both download and process phases
  %(prog)s download           # Run only download phase
  %(prog)s process            # Run only process phase
  %(prog)s --incremental      # Incremental mode (last 7 days only)
  %(prog)s --dry-run          # Preview without writing files
  %(prog)s --verbose          # Enable detailed logging
        """
    )
    
    parser.add_argument(
        'command',
        nargs='?',
        choices=['download', 'process', 'direct'],
        help='Specific phase to run (default: run both phases). Use "direct" for in-memory processing (no raw data files saved)'
    )
    
    parser.add_argument(
        '--token',
        help='Hugging Face API token for authenticated requests'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    parser.add_argument(
        '--log-file',
        help='Log output to file in addition to console'
    )
    
    parser.add_argument(
        '--disable-spam-filter',
        action='store_true',
        help='Disable spam filtering and use basic GGUF filtering only'
    )
    
    parser.add_argument(
        '--incremental',
        action='store_true',
        help='Incremental mode: only fetch recent models (last 7 days)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without writing any files (preview mode)'
    )
    
    parser.add_argument(
        '--min-likes',
        type=int,
        default=10,
        help='Minimum likes threshold (default: 10)'
    )
    
    parser.add_argument(
        '--min-size',
        type=int,
        default=100,
        help='Minimum model size in MB (default: 100)'
    )
    
    parser.add_argument(
        '--size-threshold',
        type=float,
        default=0.05,
        help='Minimum size drop threshold (default: 0.05 = 5%%)'
    )
    
    parser.add_argument(
        '--min-downloads',
        type=int,
        default=100,
        help='Minimum downloads for non-trusted uploaders (default: 100)'
    )
    
    parser.add_argument(
        '--max-workers',
        type=int,
        default=10,
        help='Maximum parallel workers (default: 10, max: 20)'
    )
    
    parser.add_argument(
        '--output-dir',
        default='.',
        help='Output directory for gguf_models.json (default: current directory)'
    )
    
    parser.add_argument(
        '--data-dir',
        default='data',
        help='Data directory for raw_models_data.json (default: ./data)'
    )
    
    parser.add_argument(
        '--config-file',
        help='JSON configuration file path'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(verbose=args.verbose, log_file=args.log_file)
    logger = logging.getLogger(__name__)
    
    # Load config file if provided
    config = {}
    if args.config_file:
        try:
            with open(args.config_file, 'r') as f:
                config = json.load(f)
            logger.info(f"Loaded configuration from {args.config_file}")
        except Exception as e:
            logger.error(f"Failed to load config file: {e}")
            sys.exit(1)
    
    # Override config with command line arguments
    if args.max_workers:
        config['max_workers'] = min(args.max_workers, 20)
    if args.output_dir:
        config['output_dir'] = args.output_dir
    if args.data_dir:
        config['data_dir'] = args.data_dir
    
    # Configure spam filter
    filter_config = None
    if not args.disable_spam_filter:
        filter_config = FilterConfig(
            min_size_bytes=args.min_size * 1024 * 1024,
            size_drop_threshold=args.size_threshold,
            min_downloads=args.min_downloads,
            backup_enabled=False,
            detailed_logging=args.verbose
        )
        
        config_errors = filter_config.validate()
        if config_errors:
            logger.error("Spam filter configuration errors:")
            for error in config_errors:
                logger.error(f"  - {error}")
            sys.exit(1)
    
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("SIMPLIFIED GGUF FETCHER - EXECUTION START")
    logger.info("=" * 60)
    logger.info(f"Start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Command: {args.command or 'both phases'}")
    logger.info(f"Mode: {'INCREMENTAL' if args.incremental else 'FULL'}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info(f"Min likes threshold: {args.min_likes}")
    logger.info(f"Max workers: {min(args.max_workers, 20)}")
    
    try:
        fetcher = SimplifiedGGUFetcher(
            token=args.token,
            filter_config=filter_config,
            disable_spam_filter=args.disable_spam_filter,
            incremental=args.incremental,
            dry_run=args.dry_run,
            config=config
        )
        
        if args.command == 'download':
            fetcher.download_data()
        elif args.command == 'process':
            fetcher.process_data()
        elif args.command == 'direct':
            # Direct mode: in-memory processing, no raw data file
            fetcher.run_direct_mode()
        else:
            # Default: run both phases
            fetcher.download_data()
            fetcher.process_data()
        
        end_time = datetime.now()
        duration = end_time - start_time
        logger.info("=" * 60)
        logger.info("EXECUTION COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info(f"Duration: {duration}")
        logger.info(f"Total API calls: {fetcher.stats['api_calls']}")
        
    except KeyboardInterrupt:
        logger.warning("Execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        end_time = datetime.now()
        duration = end_time - start_time
        logger.error("=" * 60)
        logger.error("EXECUTION FAILED")
        logger.error("=" * 60)
        logger.error(f"Error: {e}")
        logger.error(f"Duration before failure: {duration}")
        if args.verbose:
            import traceback
            logger.debug(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()