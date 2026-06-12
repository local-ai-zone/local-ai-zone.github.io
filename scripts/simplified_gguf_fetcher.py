#!/usr/bin/env python3
"""
Simplified GGUF Fetcher

A two-phase system that downloads model data from Hugging Face API once,
then processes it locally to extract essential GGUF model information with
integrated spam filtering.

Phase 1 (Download): Fetch recent models sorted by createdAt, save raw data
Phase 2 (Process): Extract required fields from saved data, apply spam filtering, 
                   filter by 10+ likes, generate output

Enhanced with:
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
import sys
import time
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


class SimplifiedGGUFetcher:
    """
    Main class for fetching and processing GGUF model data from Hugging Face.
    
    Implements a two-phase approach:
    1. Download: Fetch recent models sorted by createdAt (SINGLE API REQUEST)
    2. Process: Extract required fields, filter by 10+ likes, generate output
    """
    
    # Default configuration constants
    DEFAULT_CONFIG = {
        'recent_days_limit': 90,
        'api_limit': 1000,
        'incremental_days_limit': 7,
        'incremental_api_limit': 100,
        'min_likes_threshold': 10,
        'max_workers': 10,
        'output_dir': '.',
        'data_dir': 'data',
        'rate_limit_calls_per_second': 5.0,
        'max_retries': 3,
        'retry_base_delay': 1.0,
        'memory_warning_threshold_mb': 100,
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
                                'size': int(size) if size else 0
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
                                'size': int(size) if size else 0
                            })
                    except Exception as e:
                        self.logger.debug(f"Error extracting sibling from iterable: {e}")
                        continue
                        
        except Exception as e:
            self.logger.debug(f"Error in _safe_extract_siblings: {e}")
        
        return siblings
    
    def download_data(self) -> None:
        """
        Phase 1: Download model data from Hugging Face API and save locally.
        
        Makes a SINGLE API REQUEST to fetch recent GGUF models sorted by createdAt.
        """
        self.logger.info("=" * 50)
        self.logger.info("STARTING DOWNLOAD PHASE")
        self.logger.info(f"Mode: {'INCREMENTAL' if self.incremental else 'FULL'}")
        self.logger.info(f"Dry run: {self.dry_run}")
        self.logger.info("=" * 50)
        
        self.stats['start_time'] = datetime.now()
        
        try:
            # Fetch recent models - SINGLE REQUEST, sorted by createdAt
            self.logger.info("Fetching recent GGUF models sorted by creation date...")
            recent_models = self._fetch_recent_models()
            self.stats['models_fetched'] = len(recent_models)
            
            if recent_models:
                self.logger.info(f"Saving {len(recent_models)} raw model records...")
                if not self.dry_run:
                    self._save_raw_data(recent_models)
                else:
                    self.logger.info(f"DRY RUN: Would save raw data to {self.raw_data_file}")
            else:
                self.logger.warning("No models found to download")
            
            self._save_metadata()
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            self.logger.info("=" * 50)
            self.logger.info("DOWNLOAD PHASE COMPLETED SUCCESSFULLY")
            self.logger.info(f"Duration: {duration:.1f}s")
            self.logger.info(f"API calls made: {self.stats['api_calls']}")
            self.logger.info("=" * 50)
            
        except Exception as e:
            self.logger.error(f"Download phase failed: {e}")
            self.stats['errors'].append(str(e))
            raise
    
    def _fetch_recent_models(self) -> List:
        """
        Fetch models uploaded recently with GGUF filter.
        Makes a SINGLE API REQUEST sorted by createdAt.
        
        Returns:
            List of model objects from recent period
        """
        # Calculate date based on mode
        if self.incremental:
            cutoff_date = datetime.now() - timedelta(days=self.INCREMENTAL_DAYS_LIMIT)
            api_limit = self.INCREMENTAL_API_LIMIT
            mode_text = "INCREMENTAL"
        else:
            cutoff_date = datetime.now() - timedelta(days=self.RECENT_DAYS_LIMIT)
            api_limit = self.API_LIMIT
            mode_text = "FULL"
        
        self.logger.info(
            f"{mode_text} MODE: Fetching GGUF models created since {cutoff_date.strftime('%Y-%m-%d')}"
        )
        
        try:
            # Get models with GGUF filter, sorted by creation date (newest first)
            self.logger.info("Making single API request to Hugging Face...")
            self.stats['api_calls'] += 1
            
            models = list(self.api.list_models(
                filter="gguf",
                sort="createdAt",
                direction=-1,  # Newest first
                limit=api_limit
            ))
            
            self.logger.info(f"Retrieved {len(models)} models from API")
            
            # Filter models by created_at field with safety buffer
            recent_models = []
            skipped_no_date = 0
            skipped_too_old = 0
            consecutive_old = 0
            SAFETY_BUFFER = 10  # Number of consecutive old models before breaking
            
            for model in models:
                try:
                    if hasattr(model, 'created_at') and model.created_at:
                        created_date = model.created_at
                        if isinstance(created_date, str):
                            try:
                                created_date = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                            except (ValueError, AttributeError):
                                skipped_no_date += 1
                                continue
                        
                        if isinstance(created_date, datetime):
                            created_date = created_date.replace(tzinfo=None)
                            
                            if created_date >= cutoff_date:
                                recent_models.append(model)
                                consecutive_old = 0  # Reset counter
                            else:
                                skipped_too_old += 1
                                consecutive_old += 1
                                # Only break after seeing multiple consecutive old models
                                if consecutive_old >= SAFETY_BUFFER:
                                    self.logger.debug(f"Breaking after {SAFETY_BUFFER} consecutive old models")
                                    break
                        else:
                            skipped_no_date += 1
                    else:
                        skipped_no_date += 1
                except Exception as e:
                    self.logger.debug(f"Error processing model {safe_getattr(model, 'id', 'unknown')}: {e}")
                    skipped_no_date += 1
                    continue
            
            days_text = f"last {self.INCREMENTAL_DAYS_LIMIT} days" if self.incremental else f"last {self.RECENT_DAYS_LIMIT} days"
            self.logger.info(f"Recent models summary:")
            self.logger.info(f"  - Models found in {days_text}: {len(recent_models)}")
            self.logger.info(f"  - Models skipped (no date): {skipped_no_date}")
            self.logger.info(f"  - Models skipped (too old): {skipped_too_old}")
            
            return recent_models
            
        except Exception as e:
            self.logger.error(f"Failed to fetch recent models: {e}")
            self.logger.warning("Continuing with empty recent models list")
            return []
    
    def _save_raw_data(self, models: List) -> None:
        """
        Save raw model data to JSON file.
        Fetches detailed file info for each model using parallel API requests.
        
        Args:
            models: List of model objects to save
        """
        if not models:
            self.logger.warning("No models to save")
            return
        
        self.logger.info(f"Fetching detailed info for {len(models)} models using parallel requests...")
        
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
            
            def fetch_model_details(model):
                """Fetch detailed info for a single model with retry logic."""
                model_id = safe_getattr(model, 'id', 'unknown')
                
                # Initialize with defaults
                siblings = []
                likes = 0
                downloads = 0
                tags = []
                card_data = {}
                last_modified = None
                created_at = None
                
                try:
                    # Fetch detailed model info with retry and rate limiting
                    detailed_info = self._fetch_model_info_with_retry(model_id)
                    
                    # Safely extract siblings - this is the main fix for the KeyError issue
                    siblings = self._safe_extract_siblings(detailed_info)
                    
                    # Safely extract other fields
                    likes = safe_getattr(detailed_info, 'likes', 0) or 0
                    downloads = safe_getattr(detailed_info, 'downloads', 0) or 0
                    tags = safe_getattr(detailed_info, 'tags', []) or []
                    card_data = safe_getattr(detailed_info, 'cardData', {}) or {}
                    last_modified = safe_getattr(detailed_info, 'lastModified', None)
                    created_at = safe_getattr(detailed_info, 'created_at', None)
                                
                except Exception as e:
                    # API call failed - fall back to basic model data
                    self.logger.debug(f"API call failed for {model_id}, using basic data: {e}")
                    
                    # Try to extract siblings from the original model object
                    siblings = self._safe_extract_siblings(model)
                    
                    # Extract other fields from original model
                    likes = safe_getattr(model, 'likes', 0) or 0
                    downloads = safe_getattr(model, 'downloads', 0) or 0
                    tags = safe_getattr(model, 'tags', []) or []
                    card_data = safe_getattr(model, 'cardData', {}) or {}
                    last_modified = safe_getattr(model, 'lastModified', None)
                    created_at = safe_getattr(model, 'created_at', None)
                
                # Validate engagement metrics
                likes = self._validate_engagement_metric(likes, model_id, 'likes')
                downloads = self._validate_engagement_metric(downloads, model_id, 'downloads')
                
                # Build model dictionary
                model_dict = {
                    'id': model_id,
                    'downloads': downloads,
                    'likes': likes,
                    'tags': list(tags) if tags else [],
                    'siblings': siblings,
                    'cardData': dict(card_data) if card_data else {},
                    'lastModified': last_modified,
                    'created_at': created_at
                }
                
                # Convert datetime objects to ISO strings
                if model_dict['lastModified'] and hasattr(model_dict['lastModified'], 'isoformat'):
                    model_dict['lastModified'] = model_dict['lastModified'].isoformat()
                elif isinstance(model_dict['lastModified'], str):
                    pass  # Already a string
                else:
                    model_dict['lastModified'] = None
                    
                if model_dict['created_at'] and hasattr(model_dict['created_at'], 'isoformat'):
                    model_dict['created_at'] = model_dict['created_at'].isoformat()
                elif isinstance(model_dict['created_at'], str):
                    pass  # Already a string
                else:
                    model_dict['created_at'] = None
                
                return model_dict, likes
            
            # Use ThreadPoolExecutor for parallel processing
            self.logger.info(f"Using {self.MAX_WORKERS} parallel workers")
            
            with ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
                future_to_model = {executor.submit(fetch_model_details, model): model for model in models}
                
                with tqdm(total=len(models), desc="Fetching model details", unit="model") as pbar:
                    for future in as_completed(future_to_model):
                        model_for_error = future_to_model[future]
                        model_id_for_error = safe_getattr(model_for_error, 'id', 'unknown')
                        try:
                            result = future.result()
                            
                            if not isinstance(result, tuple) or len(result) != 2:
                                self.logger.error(f"Invalid result from {model_id_for_error}: {type(result)}")
                                failed_count += 1
                                pbar.update(1)
                                continue
                                
                            model_dict, likes = result
                            
                            # Always save model data
                            models_data.append(model_dict)
                            success_count += 1
                            
                            # Update engagement statistics
                            if likes > 0:
                                engagement_stats['models_with_likes'] += 1
                                engagement_stats['total_likes'] += likes
                                engagement_stats['max_likes'] = max(engagement_stats['max_likes'], likes)
                                engagement_stats['min_likes'] = min(engagement_stats['min_likes'], likes)
                            else:
                                engagement_stats['models_missing_likes'] += 1
                                
                        except Exception as e:
                            failed_count += 1
                            self.logger.error(f"Critical error processing {model_id_for_error}: {type(e).__name__}: {e}")
                            if self.logger.isEnabledFor(logging.DEBUG):
                                import traceback
                                self.logger.debug(traceback.format_exc())
                        
                        pbar.update(1)
            
            # In incremental mode, merge with existing raw data
            if self.incremental and self.raw_data_file.exists():
                try:
                    with open(self.raw_data_file, 'r', encoding='utf-8') as f:
                        existing_raw = json.load(f)
                    existing_by_id = {m.get('id', ''): m for m in existing_raw if isinstance(m, dict)}
                    for model_dict in models_data:
                        existing_by_id[model_dict.get('id', '')] = model_dict
                    models_data = list(existing_by_id.values())
                    self.logger.info(f"Merged with {len(existing_raw)} existing models -> {len(models_data)} total")
                except Exception as e:
                    self.logger.warning(f"Failed to load existing raw data for merge: {e}")

            # Save to JSON file
            with open(self.raw_data_file, 'w', encoding='utf-8') as f:
                json.dump(models_data, f, indent=2, ensure_ascii=False)
            
            # Calculate and display statistics
            avg_likes = engagement_stats['total_likes'] / max(engagement_stats['models_with_likes'], 1)
            if engagement_stats['min_likes'] == float('inf'):
                engagement_stats['min_likes'] = 0
            
            file_size_mb = os.path.getsize(self.raw_data_file) / (1024 * 1024)
            
            self.logger.info(f"Save summary:")
            self.logger.info(f"  - Successfully saved: {success_count} models")
            self.logger.info(f"  - Failed: {failed_count} models")
            self.logger.info(f"  - Output file: {self.raw_data_file} ({file_size_mb:.1f}MB)")
            self.logger.info(f"Engagement metrics:")
            self.logger.info(f"  - Models with likes: {engagement_stats['models_with_likes']}")
            self.logger.info(f"  - Models with no likes: {engagement_stats['models_missing_likes']}")
            self.logger.info(f"  - Total likes: {engagement_stats['total_likes']:,}")
            if engagement_stats['models_with_likes'] > 0:
                self.logger.info(f"  - Average likes: {avg_likes:.1f}")
                self.logger.info(f"  - Like range: {engagement_stats['min_likes']} to {engagement_stats['max_likes']:,}")
            
        except Exception as e:
            self.logger.error(f"Critical error saving raw data: {e}")
            raise
    
    def process_data(self) -> None:
        """
        Phase 2: Process downloaded data and generate final output.
        """
        self.logger.info("=" * 50)
        self.logger.info("STARTING PROCESS PHASE")
        self.logger.info(f"Dry run: {self.dry_run}")
        self.logger.info("=" * 50)
        
        self.stats['start_time'] = datetime.now()
        
        try:
            # Step 1: Load raw data
            self.logger.info("Step 1/6: Loading raw model data...")
            raw_models = self._load_raw_data()
            if not raw_models:
                self.logger.warning("No raw data found, nothing to process")
                self._generate_output([])
                return
            
            # Step 2: Filter models with 10+ likes
            self.logger.info(f"Step 2/6: Filtering models with {self.MIN_LIKES_THRESHOLD}+ likes...")
            liked_models = self._filter_by_likes(raw_models)
            
            if not liked_models:
                self.logger.warning(f"No models with {self.MIN_LIKES_THRESHOLD}+ likes found")
                self._generate_output([])
                return
            
            # Step 3: Apply spam filtering or basic GGUF filtering
            if self.disable_spam_filter:
                self.logger.info("Step 3/6: Basic GGUF filtering (spam filtering disabled)...")
                models_with_gguf = self._filter_gguf_models(liked_models)
                
                models_without_gguf = len(liked_models) - len(models_with_gguf)
                self.logger.info(f"Basic filtering summary:")
                self.logger.info(f"  - Models loaded: {len(liked_models)}")
                self.logger.info(f"  - Models with GGUF files: {len(models_with_gguf)}")
                self.logger.info(f"  - Models without GGUF files: {models_without_gguf}")
                
                if not models_with_gguf:
                    self.logger.warning("No models with GGUF files found")
                    self._generate_output([])
                    return
                
                # Step 4: Process each model
                self.logger.info("Step 4/6: Processing models and extracting GGUF file information...")
                processed_models = self._process_models(models_with_gguf)
                
                # Step 5: Skip spam filtering
                self.logger.info("Step 5/6: Skipping spam filtering (disabled)")
                final_models = processed_models
                
            else:
                self.logger.info("Step 3/6: Applying integrated spam filtering...")
                
                filter_result = self.spam_engine.filter_models(liked_models)
                
                if not filter_result.success:
                    self.logger.error("Spam filtering failed:")
                    for error in filter_result.errors:
                        self.logger.error(f"  - {error}")
                    raise Exception("Spam filtering failed")
                
                self.logger.info("Step 4/6: Spam filtering completed")
                report = self.spam_engine.generate_report(filter_result)
                self.logger.info("\n" + report)
                
                self.logger.info("Step 5/6: Using spam-filtered models")
                final_models = filter_result.filtered_models
            
            self.stats['models_processed'] = len(final_models)
            
            # Step 6: Generate final output
            self.logger.info("Step 6/6: Generating final output...")
            if not self.dry_run:
                self._generate_output(final_models)
            else:
                self.logger.info(f"DRY RUN: Would generate output for {len(final_models)} models")
            
            self._save_metadata()
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            self.logger.info("=" * 50)
            self.logger.info("PROCESS PHASE COMPLETED SUCCESSFULLY")
            self.logger.info(f"Duration: {duration:.1f}s")
            self.logger.info("=" * 50)
            
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
            
            file_size = sibling.get('size', 0)
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
    
    def _generate_output(self, processed_models: List[Dict]) -> None:
        """Generate final JSON output file."""
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
                key = f"{model.get('modelId', '')}::{model.get('filename', '')}"
                model_dict[key] = model
            
            new_count = 0
            updated_count = 0
            for model in processed_models:
                key = f"{model.get('modelId', '')}::{model.get('filename', '')}"
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
            
            output_entry = {
                'modelName': model.get('modelName', ''),
                'quantFormat': model.get('quantFormat', 'Unknown'),
                'fileSize': model.get('fileSize', 0),
                'fileSizeFormatted': model.get('fileSizeFormatted', '0 B'),
                'modelType': model.get('modelType', 'Unknown'),
                'modelCapability': model.get('modelCapability', 'text'),
                'license': model.get('license', 'Not specified'),
                'downloadCount': model.get('downloadCount', 0),
                'likeCount': like_count,
                'huggingFaceLink': model.get('huggingFaceLink', ''),
                'directDownloadLink': model.get('directDownloadLink', ''),
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
        choices=['download', 'process'],
        help='Specific phase to run (default: run both phases)'
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
        else:
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
