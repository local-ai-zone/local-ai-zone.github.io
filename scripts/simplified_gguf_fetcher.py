#!/usr/bin/env python3
"""
Simplified GGUF Fetcher

A two-phase system that downloads model data from Hugging Face API once,
then processes it locally to extract essential GGUF model information with
integrated spam filtering.

Phase 1 (Download): Fetch recent models + top liked models, save raw data
Phase 2 (Process): Extract required fields from saved data, apply spam filtering, generate output
"""

import argparse
import json
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from huggingface_hub import HfApi

# Import spam filter components
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from spam_filter.config import FilterConfig
from spam_filter.engine import SpamFilterEngine
from spam_filter.hardware_calculator import HardwareRequirementsCalculator


class SimplifiedGGUFetcher:
    """
    Main class for fetching and processing GGUF model data from Hugging Face.
    
    Implements a two-phase approach:
    1. Download: Fetch model data from API and save locally
    2. Process: Extract required fields from saved data
    """
    
    # Configuration constants for data collection limits
    RECENT_DAYS_LIMIT = 90  # Days to look back for recent models
    TOP_MODELS_LIMIT = 1000  # Number of top liked models to fetch
    RECENT_MODELS_API_LIMIT = 1000  # API limit for recent models query
    
    def __init__(self, token: Optional[str] = None, filter_config: Optional[FilterConfig] = None, disable_spam_filter: bool = False):
        """
        Initialize the fetcher with optional HF token and spam filtering configuration.
        
        Args:
            token: Optional Hugging Face API token for authenticated requests
            filter_config: Configuration for spam filtering (None to use defaults)
            disable_spam_filter: If True, skip spam filtering entirely
        """
        self.api = HfApi(token=token)
        self.logger = logging.getLogger(__name__)
        
        # File paths
        self.raw_data_file = "data/raw_models_data.json"
        self.output_file = "gguf_models.json"  # Save directly to root directory
        
        # Spam filtering configuration
        self.filter_config = filter_config or FilterConfig()
        self.disable_spam_filter = disable_spam_filter
        self.spam_engine = None if disable_spam_filter else SpamFilterEngine(self.filter_config)
        
        # Hardware requirements calculator
        self.hardware_calculator = HardwareRequirementsCalculator(self.filter_config)
        
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
    
    def download_data(self) -> None:
        """
        Phase 1: Download model data from Hugging Face API and save locally.
        
        Fetches recent models (last 90 days) and top liked models,
        deduplicates them, and saves raw data for processing.
        """
        self.logger.info("=" * 50)
        self.logger.info("STARTING DOWNLOAD PHASE")
        self.logger.info("=" * 50)
        
        try:
            # Fetch both datasets with progress logging
            self.logger.info("Step 1/3: Fetching recent models...")
            recent_models = self._fetch_recent_models()
            
            self.logger.info("Step 2/3: Fetching top liked models...")
            top_models = self._fetch_top_models()
            
            self.logger.info("Step 3/3: Combining and deduplicating models...")
            
            # Combine both model lists
            all_models = recent_models + top_models
            
            # Deduplicate models by model ID
            seen_ids = set()
            deduplicated_models = []
            
            for model in all_models:
                try:
                    model_id = model.id
                    if model_id not in seen_ids:
                        seen_ids.add(model_id)
                        deduplicated_models.append(model)
                except Exception as e:
                    self.logger.warning(f"Error processing model during deduplication: {e}")
                    continue
            
            # Log summary statistics
            self.logger.info(f"Download Summary:")
            self.logger.info(f"  - Recent models (90 days): {len(recent_models)}")
            self.logger.info(f"  - Top liked models: {len(top_models)}")
            self.logger.info(f"  - Total before deduplication: {len(all_models)}")
            self.logger.info(f"  - Unique models after deduplication: {len(deduplicated_models)}")
            self.logger.info(f"  - Duplicates removed: {len(all_models) - len(deduplicated_models)}")
            
            # Save raw model data to JSON file
            self._save_raw_data(deduplicated_models)
            
            self.logger.info("=" * 50)
            self.logger.info("DOWNLOAD PHASE COMPLETED SUCCESSFULLY")
            self.logger.info("=" * 50)
            
        except Exception as e:
            self.logger.error(f"Download phase failed: {e}")
            raise
    
    def _fetch_recent_models(self) -> List[Dict]:
        """
        Fetch models uploaded in the last 90 days with GGUF filter.
        
        Returns:
            List of model dictionaries from the last 90 days
        """
        # Calculate date using RECENT_DAYS_LIMIT
        cutoff_date = datetime.now() - timedelta(days=self.RECENT_DAYS_LIMIT)
        self.logger.info(f"Fetching GGUF models created since {cutoff_date.strftime('%Y-%m-%d')}")
        
        try:
            # Get models with GGUF filter, sorted by creation date
            # Using a larger limit to ensure we get enough recent models
            self.logger.debug("Querying Hugging Face API for recent models...")
            models = list(self.api.list_models(
                filter="gguf",
                sort="createdAt",
                direction=-1,  # Newest first
                limit=self.RECENT_MODELS_API_LIMIT  # Get more models to filter by date
            ))
            
            self.logger.debug(f"Retrieved {len(models)} models from API, filtering by date...")
            
            # Filter models by created_at field to get last 90 days only
            recent_models = []
            skipped_no_date = 0
            skipped_too_old = 0
            
            for model in models:
                try:
                    if hasattr(model, 'created_at') and model.created_at:
                        # Parse the created_at datetime
                        created_date = model.created_at
                        if isinstance(created_date, str):
                            # If it's a string, parse it
                            try:
                                created_date = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                            except ValueError:
                                # Skip if we can't parse the date
                                skipped_no_date += 1
                                continue
                        
                        # Check if model was created in the last 90 days
                        if created_date.replace(tzinfo=None) >= cutoff_date:
                            recent_models.append(model)
                        else:
                            # Since models are sorted by creation date (newest first),
                            # we can break once we hit models older than 90 days
                            skipped_too_old += 1
                            break
                    else:
                        skipped_no_date += 1
                except Exception as e:
                    self.logger.debug(f"Error processing model {getattr(model, 'id', 'unknown')}: {e}")
                    skipped_no_date += 1
                    continue
            
            # Log summary statistics
            self.logger.info(f"Recent models summary:")
            self.logger.info(f"  - Models found in last 90 days: {len(recent_models)}")
            self.logger.info(f"  - Models skipped (no date): {skipped_no_date}")
            self.logger.info(f"  - Models skipped (too old): {skipped_too_old}")
            
            return recent_models
            
        except Exception as e:
            self.logger.error(f"Failed to fetch recent models: {e}")
            self.logger.warning("Continuing with empty recent models list")
            return []
    
    def _fetch_top_models(self) -> List[Dict]:
        """
        Fetch top 1000 most liked GGUF models of all time.
        
        Returns:
            List of top 1000 most liked model dictionaries
        """
        self.logger.info("Fetching top 1000 most liked GGUF models of all time...")
        
        try:
            # Get models with GGUF filter, sorted by likes in descending order
            self.logger.debug("Querying Hugging Face API for top liked models...")
            models = list(self.api.list_models(
                filter="gguf",
                sort="likes",
                direction=-1,  # Highest likes first
                limit=self.TOP_MODELS_LIMIT  # Top 1000 models
            ))
            
            # Log some statistics about the top models
            if models:
                top_likes = getattr(models[0], 'likes', 0) if models else 0
                self.logger.info(f"Top liked models summary:")
                self.logger.info(f"  - Models retrieved: {len(models)}")
                self.logger.info(f"  - Highest like count: {top_likes:,}")
            else:
                self.logger.warning("No top liked models found")
            
            return models
            
        except Exception as e:
            self.logger.error(f"Failed to fetch top liked models: {e}")
            self.logger.warning("Continuing with empty top models list")
            return []
    
    def _save_raw_data(self, models: List[Dict]) -> None:
        """
        Save raw model data to JSON file.
        
        Args:
            models: List of model dictionaries to save
        """
        if not models:
            self.logger.warning("No models to save")
            return
            
        self.logger.info(f"Saving {len(models)} models to {self.raw_data_file}...")
        
        try:
            # Convert model objects to dictionaries for JSON serialization
            models_data = []
            failed_models = 0
            engagement_stats = {
                'models_with_likes': 0,
                'models_missing_likes': 0,
                'total_likes': 0,
                'max_likes': 0,
                'min_likes': float('inf')
            }
            
            # Use batch processing with threading for efficiency
            self.logger.info(f"Fetching detailed info for {len(models)} models using batch processing...")
            models_data = self._batch_fetch_model_details(models, engagement_stats)
            failed_models = len(models) - len(models_data)
            
            # Save to JSON file
            with open(self.raw_data_file, 'w', encoding='utf-8') as f:
                json.dump(models_data, f, indent=2, ensure_ascii=False)
            
            # Calculate engagement statistics
            avg_likes = engagement_stats['total_likes'] / max(engagement_stats['models_with_likes'], 1)
            if engagement_stats['min_likes'] == float('inf'):
                engagement_stats['min_likes'] = 0
            
            # Log save summary statistics including engagement data
            self.logger.info(f"Save summary:")
            self.logger.info(f"  - Successfully saved: {len(models_data)} models")
            self.logger.info(f"  - Failed to process: {failed_models} models")
            self.logger.info(f"  - Output file: {self.raw_data_file}")
            
            # Log engagement data extraction statistics
            self.logger.info(f"Engagement metrics extraction:")
            self.logger.info(f"  - Models with like data: {engagement_stats['models_with_likes']}")
            self.logger.info(f"  - Models missing like data: {engagement_stats['models_missing_likes']}")
            self.logger.info(f"  - Total likes across all models: {engagement_stats['total_likes']:,}")
            if engagement_stats['models_with_likes'] > 0:
                self.logger.info(f"  - Average likes per model: {avg_likes:.1f}")
                self.logger.info(f"  - Like count range: {engagement_stats['min_likes']} to {engagement_stats['max_likes']:,}")
            
        except Exception as e:
            self.logger.error(f"Critical error saving raw data: {e}")
            raise
    
    def _batch_fetch_model_details(self, models: List[Dict], engagement_stats: Dict) -> List[Dict]:
        """
        Efficiently fetch detailed model information using batch processing with threading.
        
        Args:
            models: List of basic model objects from list_models
            engagement_stats: Dictionary to track engagement statistics
            
        Returns:
            List of processed model dictionaries with detailed info
        """
        models_data = []
        failed_models = 0
        
        def fetch_single_model(model):
            """Fetch detailed info for a single model"""
            try:
                model_id = getattr(model, 'id', 'unknown')
                
                # Try to get detailed model info with files and engagement metrics
                try:
                    detailed_model = self.api.model_info(model_id, files_metadata=True)
                    raw_siblings = getattr(detailed_model, 'siblings', [])
                    likes = getattr(detailed_model, 'likes', 0)
                except Exception as e:
                    # Fallback to basic model data if detailed fetch fails
                    self.logger.debug(f"Detailed fetch failed for {model_id}, using basic data: {e}")
                    detailed_model = model
                    raw_siblings = getattr(model, 'siblings', [])
                    likes = getattr(model, 'likes', 0)
                
                # Convert RepoSibling objects to dictionaries
                siblings = []
                for sibling in raw_siblings:
                    if hasattr(sibling, 'rfilename'):
                        sibling_dict = {
                            'rfilename': getattr(sibling, 'rfilename', ''),
                            'size': getattr(sibling, 'size', 0)
                        }
                        siblings.append(sibling_dict)
                
                # Validate and sanitize engagement metrics
                likes = self._validate_engagement_metric(likes, model_id, 'likes')
                
                # Convert the model object to a dictionary with the fields we need
                model_dict = {
                    'id': model_id,
                    'downloads': getattr(model, 'downloads', 0),
                    'likes': likes,
                    'tags': getattr(model, 'tags', []),
                    'siblings': siblings,
                    'cardData': getattr(model, 'cardData', {}),
                    'lastModified': getattr(model, 'lastModified', None),
                    'created_at': getattr(model, 'created_at', None)
                }
                
                # Convert datetime objects to ISO strings for JSON serialization
                if model_dict['lastModified'] and hasattr(model_dict['lastModified'], 'isoformat'):
                    model_dict['lastModified'] = model_dict['lastModified'].isoformat()
                if model_dict['created_at'] and hasattr(model_dict['created_at'], 'isoformat'):
                    model_dict['created_at'] = model_dict['created_at'].isoformat()
                
                return model_dict, likes
                
            except Exception as e:
                model_id = getattr(model, 'id', 'unknown')
                self.logger.error(f"Critical error processing model {model_id}: {e}")
                return None, 0
        
        # Use ThreadPoolExecutor for parallel processing
        max_workers = min(10, len(models))  # Limit concurrent requests to avoid rate limiting
        self.logger.info(f"Using {max_workers} parallel workers for batch processing")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_model = {executor.submit(fetch_single_model, model): model for model in models}
            
            # Process completed tasks
            for i, future in enumerate(as_completed(future_to_model), 1):
                try:
                    model_dict, likes = future.result()
                    if model_dict:
                        models_data.append(model_dict)
                        
                        # Update engagement statistics
                        if likes > 0:
                            engagement_stats['models_with_likes'] += 1
                            engagement_stats['total_likes'] += likes
                            engagement_stats['max_likes'] = max(engagement_stats['max_likes'], likes)
                            engagement_stats['min_likes'] = min(engagement_stats['min_likes'], likes)
                        else:
                            engagement_stats['models_missing_likes'] += 1
                    else:
                        failed_models += 1
                        
                    # Log progress every 10 models
                    if i % 10 == 0 or i == len(models):
                        self.logger.info(f"Batch progress: {i}/{len(models)} models processed ({(i/len(models)*100):.1f}%)")
                        
                except Exception as e:
                    failed_models += 1
                    self.logger.warning(f"Error processing batch result: {e}")
        
        self.logger.info(f"Batch processing completed: {len(models_data)} successful, {failed_models} failed")
        return models_data
    
    def _validate_engagement_metric(self, value: any, model_id: str, metric_name: str) -> int:
        """
        Validate and sanitize engagement metric values with comprehensive error handling.
        
        Args:
            value: Raw engagement metric value from API
            model_id: Model ID for error logging
            metric_name: Name of the metric for error logging
            
        Returns:
            Validated integer engagement metric (0 if invalid)
        """
        try:
            # Handle None/null values
            if value is None:
                self.logger.debug(f"Model {model_id}: {metric_name} is None, defaulting to 0")
                return 0
            
            # Handle string values that might be numeric
            if isinstance(value, str):
                if value.strip() == '' or value.lower() in ['null', 'none', 'n/a']:
                    self.logger.debug(f"Model {model_id}: {metric_name} is empty/null string, defaulting to 0")
                    return 0
                try:
                    value = float(value)
                except ValueError:
                    self.logger.warning(f"Model {model_id}: Invalid {metric_name} string '{value}', defaulting to 0")
                    return 0
            
            # Convert to number and validate
            if isinstance(value, (int, float)):
                # Check for NaN or infinity
                if not isinstance(value, int) and (value != value or value == float('inf') or value == float('-inf')):
                    self.logger.warning(f"Model {model_id}: {metric_name} is NaN/infinity ({value}), defaulting to 0")
                    return 0
                
                # Ensure non-negative
                if value < 0:
                    self.logger.warning(f"Model {model_id}: Negative {metric_name} ({value}), defaulting to 0")
                    return 0
                
                # Convert to integer and validate range
                int_value = int(value)
                
                # Sanity check for extremely large values (likely data errors)
                if int_value > 10_000_000:  # 10 million likes seems unreasonable
                    self.logger.warning(f"Model {model_id}: Suspiciously high {metric_name} ({int_value}), capping at 10M")
                    return 10_000_000
                
                # Log if value was modified during conversion
                if int_value != value:
                    self.logger.debug(f"Model {model_id}: {metric_name} converted from {value} to {int_value}")
                
                return int_value
            
            # Handle unexpected data types
            else:
                self.logger.warning(f"Model {model_id}: Unexpected {metric_name} type {type(value)} ({value}), defaulting to 0")
                return 0
                
        except Exception as e:
            self.logger.error(f"Model {model_id}: Error validating {metric_name} ({value}): {e}, defaulting to 0")
            return 0
    
    def process_data(self) -> None:
        """
        Phase 2: Process downloaded data and generate final output.
        
        Reads raw model data, extracts required fields for each GGUF file,
        applies spam filtering, and generates the final JSON output.
        """
        self.logger.info("=" * 50)
        self.logger.info("STARTING PROCESS PHASE")
        self.logger.info("=" * 50)
        
        try:
            # Step 1: Load raw data
            self.logger.info("Step 1/5: Loading raw model data...")
            raw_models = self._load_raw_data()
            if not raw_models:
                self.logger.warning("No raw data found, nothing to process")
                return
            
            # Step 2: Apply spam filtering or basic GGUF filtering
            if self.disable_spam_filter:
                self.logger.info("Step 2/5: Basic GGUF filtering (spam filtering disabled)...")
                models_with_gguf = self._filter_gguf_models(raw_models)
                
                models_without_gguf = len(raw_models) - len(models_with_gguf)
                self.logger.info(f"Basic filtering summary:")
                self.logger.info(f"  - Total models loaded: {len(raw_models)}")
                self.logger.info(f"  - Models with GGUF files: {len(models_with_gguf)}")
                self.logger.info(f"  - Models without GGUF files: {models_without_gguf}")
                
                if not models_with_gguf:
                    self.logger.warning("No models with GGUF files found, nothing to process")
                    return
                
                # Step 3: Process each model and extract info for each GGUF file
                self.logger.info("Step 3/5: Processing models and extracting GGUF file information...")
                processed_models = self._process_models(models_with_gguf)
                
                # Step 4: Skip spam filtering
                self.logger.info("Step 4/5: Skipping spam filtering (disabled)")
                final_models = processed_models
                
            else:
                self.logger.info("Step 2/5: Applying integrated spam filtering...")
                
                # Create backup if enabled
                backup_path = None
                if self.filter_config.backup_enabled:
                    self.logger.info("Creating backup of raw data...")
                    backup_path = self.spam_engine.create_backup(raw_models)
                    if backup_path:
                        self.logger.info(f"Backup created: {backup_path}")
                    else:
                        self.logger.warning("Failed to create backup")
                
                # Apply spam filtering
                filter_result = self.spam_engine.filter_models(raw_models)
                
                if not filter_result.success:
                    self.logger.error("Spam filtering failed:")
                    for error in filter_result.errors:
                        self.logger.error(f"  - {error}")
                    raise Exception("Spam filtering failed")
                
                # Generate and log filtering report
                self.logger.info("Step 3/5: Spam filtering completed")
                report = self.spam_engine.generate_report(filter_result)
                self.logger.info("\n" + report)
                
                # Step 4: Skip individual model processing (already done by spam filter)
                self.logger.info("Step 4/5: Using spam-filtered models (processing integrated)")
                final_models = filter_result.filtered_models
            
            # Step 5: Generate final output with proper sorting and formatting
            self.logger.info("Step 5/5: Generating final output...")
            self._generate_output(final_models)
            
            self.logger.info("=" * 50)
            self.logger.info("PROCESS PHASE COMPLETED SUCCESSFULLY")
            self.logger.info("=" * 50)
            
        except Exception as e:
            self.logger.error(f"Process phase failed: {e}")
            raise
    
    def _load_raw_data(self) -> List[Dict]:
        """
        Load raw model data from JSON file.
        
        Returns:
            List of raw model dictionaries, empty list if file not found or error
        """
        try:
            if not os.path.exists(self.raw_data_file):
                self.logger.error(f"Raw data file not found: {self.raw_data_file}")
                self.logger.info("Run the download phase first to generate raw data")
                return []
            
            with open(self.raw_data_file, 'r', encoding='utf-8') as f:
                raw_models = json.load(f)
            
            self.logger.info(f"Loaded {len(raw_models)} models from {self.raw_data_file}")
            return raw_models
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in raw data file: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error loading raw data: {e}")
            return []
    
    def _filter_gguf_models(self, raw_models: List[Dict]) -> List[Dict]:
        """
        Filter models to only process those with .gguf files in siblings.
        
        Args:
            raw_models: List of raw model dictionaries
            
        Returns:
            List of models that have GGUF files
        """
        models_with_gguf = []
        skipped_no_siblings = 0
        skipped_no_gguf = 0
        
        for model in raw_models:
            try:
                model_id = model.get('id', 'unknown')
                siblings = model.get('siblings')
                
                # Check if siblings data exists and is a list
                if not siblings or not isinstance(siblings, list):
                    self.logger.debug(f"Skipping {model_id}: no siblings data")
                    skipped_no_siblings += 1
                    continue
                
                # Check if any sibling file has .gguf extension
                has_gguf = False
                gguf_count = 0
                for sibling in siblings:
                    if isinstance(sibling, dict):
                        filename = sibling.get('rfilename', '')
                        if filename.lower().endswith('.gguf'):
                            has_gguf = True
                            gguf_count += 1
                
                if has_gguf:
                    models_with_gguf.append(model)
                    self.logger.debug(f"Model {model_id}: found {gguf_count} GGUF files")
                else:
                    self.logger.debug(f"Skipping {model_id}: no GGUF files found")
                    skipped_no_gguf += 1
                    
            except Exception as e:
                model_id = model.get('id', 'unknown')
                self.logger.warning(f"Error filtering model {model_id}: {e}")
                skipped_no_siblings += 1
                continue
        
        # Log detailed filtering statistics
        self.logger.info(f"GGUF filtering results:")
        self.logger.info(f"  - Models with GGUF files: {len(models_with_gguf)}")
        self.logger.info(f"  - Models skipped (no siblings): {skipped_no_siblings}")
        self.logger.info(f"  - Models skipped (no GGUF files): {skipped_no_gguf}")
        self.logger.info(f"  - Total skipped: {skipped_no_siblings + skipped_no_gguf}")
        
        return models_with_gguf
    
    def _process_models(self, models: List[Dict]) -> List[Dict]:
        """
        Process each model and extract info for each GGUF file.
        
        Creates separate entries for each GGUF file in a model and handles
        processing errors gracefully by skipping failed models.
        
        Args:
            models: List of model dictionaries with GGUF files
            
        Returns:
            List of processed model entries (one per GGUF file)
        """
        processed_models = []
        skipped_count = 0
        total_gguf_files = 0
        
        self.logger.info(f"Processing {len(models)} models...")
        
        for i, model in enumerate(models, 1):
            model_id = model.get('id', 'unknown')
            
            try:
                self.logger.debug(f"Processing model {i}/{len(models)}: {model_id}")
                
                # Extract info for each GGUF file in this model
                model_entries = self._extract_model_info(model)
                processed_models.extend(model_entries)
                total_gguf_files += len(model_entries)
                
                self.logger.debug(f"  -> Created {len(model_entries)} GGUF file entries")
                
                # Log progress every 10 models
                if i % 10 == 0 or i == len(models):
                    self.logger.info(f"Progress: {i}/{len(models)} models processed ({(i/len(models)*100):.1f}%)")
                
            except Exception as e:
                # Handle processing errors gracefully by skipping failed models
                self.logger.warning(f"Skipping model {model_id} due to processing error: {e}")
                skipped_count += 1
                continue
        
        # Log comprehensive processing statistics
        self.logger.info(f"Model processing summary:")
        self.logger.info(f"  - Models processed successfully: {len(models) - skipped_count}")
        self.logger.info(f"  - Models skipped due to errors: {skipped_count}")
        self.logger.info(f"  - Total GGUF file entries created: {len(processed_models)}")
        self.logger.info(f"  - Average GGUF files per model: {total_gguf_files / max(len(models) - skipped_count, 1):.1f}")
        
        return processed_models
    
    def _extract_model_info(self, model_data: Dict) -> List[Dict]:
        """
        Extract info for each GGUF file in a model.
        
        Args:
            model_data: Raw model dictionary from API
            
        Returns:
            List of processed model dictionaries (one per GGUF file)
        """
        model_id = model_data.get('id', '')
        siblings = model_data.get('siblings', [])
        downloads = model_data.get('downloads', 0)
        
        # Extract and validate engagement metrics with comprehensive error handling
        likes = self._validate_engagement_metric(model_data.get('likes', 0), model_id, 'likes')
        
        tags = model_data.get('tags', [])
        card_data = model_data.get('cardData', {})
        
        # Extract common fields that are the same for all GGUF files in this model
        model_name = self._extract_model_name(model_id)
        model_type = self._infer_model_type(model_id, tags)
        license_info = self._get_license(card_data)
        hf_link, _ = self._generate_links(model_id, "")  # Get HF link without filename
        
        # Extract upload date from created_at field
        upload_date = model_data.get('created_at', None)
        
        processed_entries = []
        
        # Process each GGUF file in the model
        for sibling in siblings:
            if not isinstance(sibling, dict):
                continue
                
            filename = sibling.get('rfilename', '')
            if not filename.lower().endswith('.gguf'):
                continue
            
            # Extract file-specific fields
            file_size = sibling.get('size', 0)
            file_size_formatted = self._format_file_size(file_size)
            quantization = self._extract_quantization(filename)
            _, direct_download_link = self._generate_links(model_id, filename)
            
            # Create entry for this GGUF file
            entry = {
                'modelName': model_name,
                'quantFormat': quantization,
                'fileSize': file_size,
                'fileSizeFormatted': file_size_formatted,
                'modelType': model_type,
                'license': license_info,
                'downloadCount': downloads,
                'likeCount': likes,  # Add engagement metrics
                'huggingFaceLink': hf_link,
                'directDownloadLink': direct_download_link,
                'modelId': model_id,
                'filename': filename,
                'uploadDate': upload_date  # Add upload date from created_at
            }
            
            # Calculate hardware requirements
            try:
                entry = self.hardware_calculator.calculate_requirements(entry)
                self.logger.debug(f"Hardware requirements calculated for {model_name} ({quantization})")
            except Exception as e:
                self.logger.warning(f"Failed to calculate hardware requirements for {model_name} ({quantization}): {e}")
                # Continue without hardware requirements if calculation fails
            
            processed_entries.append(entry)
        
        return processed_entries
    
    def _generate_output(self, processed_models: List[Dict]) -> None:
        """
        Generate JSON array with exactly 15 fields per model (10 original + 4 hardware requirements + 1 upload date).
        
        Sorts models by download count (highest first) and ensures engagement metrics are properly validated.
        
        Args:
            processed_models: List of processed model dictionaries
        """
        if not processed_models:
            self.logger.warning("No processed models to output, creating empty output file")
            # Create empty output file
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=2, ensure_ascii=False)
            self.logger.info(f"Created empty output file: {self.output_file}")
            return
        
        self.logger.info(f"Generating output from {len(processed_models)} processed entries...")
        
        # Validate and clean engagement metrics before sorting with comprehensive error handling
        validation_errors = 0
        for i, model in enumerate(processed_models):
            try:
                like_count = model.get('likeCount', 0)
                validated_likes = self._validate_engagement_metric(like_count, model.get('modelId', f'model_{i}'), 'likeCount')
                model['likeCount'] = validated_likes
                
                if validated_likes != like_count:
                    validation_errors += 1
                    
            except Exception as e:
                self.logger.error(f"Error validating engagement metrics for model {i}: {e}")
                model['likeCount'] = 0
                validation_errors += 1
        
        if validation_errors > 0:
            self.logger.warning(f"Fixed engagement metric validation errors in {validation_errors} models")
        
        # Sort models by download count (highest first), with engagement metrics as secondary sort
        self.logger.debug("Sorting models by download count (primary) and like count (secondary)...")
        sorted_models = sorted(processed_models, 
                             key=lambda x: (x.get('downloadCount', 0), x.get('likeCount', 0)), 
                             reverse=True)
        
        # Create output with exactly 15 fields per model (10 original + 4 hardware requirements + 1 upload date)
        output_models = []
        field_errors = 0
        
        for i, model in enumerate(sorted_models):
            try:
                # Validate and ensure we only include the required fields in the exact order
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
                    'license': model.get('license', 'Not specified'),
                    'downloadCount': model.get('downloadCount', 0),
                    'likeCount': like_count,  # Validated engagement metrics
                    'huggingFaceLink': model.get('huggingFaceLink', ''),
                    'directDownloadLink': model.get('directDownloadLink', ''),
                    # Hardware requirements
                    'minRamGB': model.get('minRamGB', 8),  # Default to 8GB if not calculated
                    'minCpuCores': model.get('minCpuCores', 4),  # Default to 4 cores if not calculated
                    'gpuRequired': model.get('gpuRequired', True),  # Default to GPU required if not calculated
                    'osSupported': model.get('osSupported', ['Windows', 'Linux', 'macOS']),  # Default OS support
                    # Upload date
                    'uploadDate': model.get('uploadDate', None)  # Handle missing or invalid dates by setting to null
                }
                output_models.append(output_entry)
            except Exception as e:
                field_errors += 1
                model_name = model.get('modelName', 'unknown')
                self.logger.warning(f"Error creating output entry for {model_name}: {e}")
                continue
        
        try:
            # Generate final JSON output
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(output_models, f, indent=2, ensure_ascii=False)
            
            # File saved directly to root directory for website access
            self.logger.info(f"Saved directly to root directory: {self.output_file}")
            
            # Log comprehensive output statistics
            self.logger.info(f"Output generation summary:")
            self.logger.info(f"  - Output file: {self.output_file}")
            self.logger.info(f"  - Total entries written: {len(output_models)}")
            self.logger.info(f"  - Entries with field errors: {field_errors}")
            
            # Log detailed statistics about the output
            if output_models:
                top_downloads = output_models[0].get('downloadCount', 0)
                bottom_downloads = output_models[-1].get('downloadCount', 0)
                unique_models = len(set(model.get('modelName', '') for model in output_models))
                unique_types = len(set(model.get('modelType', '') for model in output_models))
                unique_quants = len(set(model.get('quantFormat', '') for model in output_models))
                
                # Calculate engagement metrics statistics
                like_counts = [model.get('likeCount', 0) for model in output_models]
                total_likes = sum(like_counts)
                models_with_likes = sum(1 for likes in like_counts if likes > 0)
                max_likes = max(like_counts) if like_counts else 0
                avg_likes = total_likes / len(output_models) if output_models else 0
                
                self.logger.info(f"Content statistics:")
                self.logger.info(f"  - Unique model names: {unique_models}")
                self.logger.info(f"  - Unique model types: {unique_types}")
                self.logger.info(f"  - Unique quantization formats: {unique_quants}")
                self.logger.info(f"  - Download count range: {top_downloads:,} to {bottom_downloads:,}")
                
                # Log engagement metrics statistics
                self.logger.info(f"Engagement metrics statistics:")
                self.logger.info(f"  - Total likes across all entries: {total_likes:,}")
                self.logger.info(f"  - Entries with likes > 0: {models_with_likes}")
                self.logger.info(f"  - Entries with no likes: {len(output_models) - models_with_likes}")
                self.logger.info(f"  - Average likes per entry: {avg_likes:.1f}")
                self.logger.info(f"  - Maximum likes: {max_likes:,}")
                
                # Log top 3 models for verification
                self.logger.info(f"Top 3 models by downloads:")
                for i, model in enumerate(output_models[:3], 1):
                    name = model.get('modelName', 'Unknown')
                    downloads = model.get('downloadCount', 0)
                    likes = model.get('likeCount', 0)
                    model_type = model.get('modelType', 'Unknown')
                    self.logger.info(f"  {i}. {name} ({model_type}) - {downloads:,} downloads, {likes:,} likes")
            
        except Exception as e:
            self.logger.error(f"Critical error generating output file: {e}")
            raise
    
    def _extract_model_name(self, model_id: str) -> str:
        """
        Extract clean model name from modelId (remove org prefix, format nicely).
        
        Args:
            model_id: The full model ID like "microsoft/DialoGPT-medium"
            
        Returns:
            Clean model name like "DialoGPT Medium"
        """
        if not model_id:
            return "Unknown Model"
        
        # Split by '/' and take the last part (model name without org)
        parts = model_id.split('/')
        model_name = parts[-1] if parts else model_id
        
        # Replace hyphens and underscores with spaces
        model_name = model_name.replace('-', ' ').replace('_', ' ')
        
        # Title case the name (capitalize first letter of each word)
        model_name = ' '.join(word.capitalize() for word in model_name.split())
        
        return model_name
    
    def _extract_quantization(self, filename: str) -> str:
        """
        Parse quantization patterns (Q4_K_M, Q5_0, etc.) from .gguf filenames.
        
        Args:
            filename: The GGUF filename to parse
            
        Returns:
            Quantization format string, "Unknown" if pattern cannot be matched
        """
        if not filename:
            return "Unknown"
        
        # Convert to uppercase for consistent matching
        filename_upper = filename.upper()
        
        # Define quantization patterns in order of specificity (most specific first)
        quant_patterns = [
            'Q4_K_M', 'Q4_K_S', 'Q5_K_M', 'Q5_K_S', 'Q3_K_M', 'Q3_K_S', 
            'Q6_K', 'Q2_K', 'Q8_0', 'Q4_0', 'Q4_1', 'Q5_0', 'Q5_1',
            'F16', 'F32', 'BF16', 'IQ1_S', 'IQ2_XXS', 'IQ3_S', 'IQ4_XS'
        ]
        
        # Look for quantization patterns in the filename
        for pattern in quant_patterns:
            if pattern in filename_upper:
                return pattern
        
        # If no pattern found, return fallback
        return "Unknown"
    
    def _infer_model_type(self, model_id: str, tags: List[str]) -> str:
        """
        Check tags and model name for patterns (LLaMA, Mistral, Qwen, etc.).
        
        Args:
            model_id: The model ID to check for patterns
            tags: List of model tags to check
            
        Returns:
            Model type string, "Unknown" if type cannot be determined
        """
        if not model_id:
            return "Unknown"
        
        # Convert model_id and tags to lowercase for case-insensitive matching
        model_id_lower = model_id.lower()
        tags_lower = [tag.lower() for tag in (tags or [])]
        
        # Define model type patterns
        model_type_patterns = {
            'LLaMA': ['llama', 'llama-2', 'llama2', 'llama-3', 'llama3'],
            'Mistral': ['mistral', 'mixtral'],
            'Qwen': ['qwen', 'qwen1.5', 'qwen2'],
            'Gemma': ['gemma'],
            'Phi': ['phi-3', 'phi3', 'phi-2', 'phi'],
            'CodeLlama': ['codellama', 'code-llama'],
            'Yi': ['yi-34b', 'yi-6b', 'yi-'],
            'DeepSeek': ['deepseek'],
            'Falcon': ['falcon'],
            'MPT': ['mpt'],
            'GPT': ['gpt-', 'gpt2', 'gpt3'],
            'BERT': ['bert'],
            'T5': ['t5-'],
            'Vicuna': ['vicuna'],
            'Alpaca': ['alpaca'],
            'ChatGLM': ['chatglm'],
            'Baichuan': ['baichuan'],
            'InternLM': ['internlm'],
            'Zephyr': ['zephyr'],
            'Orca': ['orca'],
            'WizardLM': ['wizardlm', 'wizard'],
            'StableLM': ['stablelm'],
            'RedPajama': ['redpajama'],
            'OpenLLaMA': ['openllama'],
            'Dolly': ['dolly']
        }
        
        # Check model ID for patterns first (more reliable)
        for model_type, patterns in model_type_patterns.items():
            for pattern in patterns:
                if pattern in model_id_lower:
                    return model_type
        
        # Check tags for patterns
        for model_type, patterns in model_type_patterns.items():
            for pattern in patterns:
                for tag in tags_lower:
                    if pattern in tag:
                        return model_type
        
        # If no pattern found, return fallback
        return "Unknown"
    
    def _get_license(self, card_data: Dict) -> str:
        """
        Extract license from cardData metadata.
        
        Args:
            card_data: The cardData dictionary from model metadata
            
        Returns:
            License string, "Not specified" if license is missing
        """
        if not card_data or not isinstance(card_data, dict):
            return "Not specified"
        
        # Try to get license from various possible fields
        license_value = card_data.get('license')
        
        if not license_value:
            # Try alternative field names that might contain license info
            license_value = card_data.get('license_name')
        
        if not license_value:
            # Try to get from nested metadata
            metadata = card_data.get('metadata', {})
            if isinstance(metadata, dict):
                license_value = metadata.get('license')
        
        # If we found a license value, clean it up
        if license_value:
            if isinstance(license_value, str):
                license_value = license_value.strip()
                if license_value:
                    return license_value
            elif isinstance(license_value, list) and license_value:
                # If it's a list, take the first non-empty item
                for item in license_value:
                    if isinstance(item, str) and item.strip():
                        return item.strip()
        
        # If no license found, return fallback
        return "Not specified"
    
    def _format_file_size(self, size_bytes: int) -> str:
        """
        Convert bytes to human readable format (GB, MB, etc.).
        
        Args:
            size_bytes: File size in bytes
            
        Returns:
            Human readable size string like "4.2 GB", "0 B" if size is missing
        """
        if not size_bytes or size_bytes <= 0:
            return "0 B"
        
        # Define size units
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        
        # Convert to appropriate unit
        size = float(size_bytes)
        unit_index = 0
        
        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1
        
        # Format with appropriate precision
        if size >= 100:
            # For sizes >= 100, show no decimal places
            return f"{size:.0f} {units[unit_index]}"
        elif size >= 10:
            # For sizes >= 10, show 1 decimal place
            return f"{size:.1f} {units[unit_index]}"
        else:
            # For sizes < 10, show 2 decimal places
            return f"{size:.2f} {units[unit_index]}"
    
    def _generate_links(self, model_id: str, filename: str) -> Tuple[str, str]:
        """
        Generate Hugging Face page and direct download links.
        
        Args:
            model_id: The model ID like "microsoft/DialoGPT-medium"
            filename: The GGUF filename
            
        Returns:
            Tuple of (hugging_face_link, direct_download_link)
        """
        if not model_id:
            return ("", "")
        
        # Generate Hugging Face page link
        hugging_face_link = f"https://huggingface.co/{model_id}"
        
        # Generate direct download link
        if filename:
            direct_download_link = f"https://huggingface.co/{model_id}/resolve/main/{filename}"
        else:
            direct_download_link = ""
        
        return (hugging_face_link, direct_download_link)


def setup_logging() -> None:
    """Configure logging with appropriate format and level."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def main():
    """Main entry point with command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Simplified GGUF Fetcher - Download and process GGUF model data with integrated spam filtering",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run both download and process phases with spam filtering
  %(prog)s download           # Run only download phase
  %(prog)s process            # Run only process phase with spam filtering
  %(prog)s --disable-spam-filter  # Run without spam filtering (basic GGUF filtering only)
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
    
    # Spam filtering arguments
    parser.add_argument(
        '--disable-spam-filter',
        action='store_true',
        help='Disable spam filtering and use basic GGUF filtering only'
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
        help='Minimum size drop threshold for keeping variants (default: 0.05 = 5%%)'
    )
    
    parser.add_argument(
        '--min-downloads',
        type=int,
        default=100,
        help='Minimum downloads for non-trusted uploaders (default: 100)'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Disable backup creation'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger = logging.getLogger(__name__)
    
    # Create spam filter configuration
    filter_config = None
    if not args.disable_spam_filter:
        filter_config = FilterConfig(
            min_size_bytes=args.min_size * 1024 * 1024,  # Convert MB to bytes
            size_drop_threshold=args.size_threshold,
            min_downloads=args.min_downloads,
            backup_enabled=not args.no_backup,
            detailed_logging=args.verbose
        )
        
        # Validate configuration
        config_errors = filter_config.validate()
        if config_errors:
            logger.error("Spam filter configuration validation errors:")
            for error in config_errors:
                logger.error(f"  - {error}")
            sys.exit(1)
    
    # Log execution start
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("SIMPLIFIED GGUF FETCHER - EXECUTION START")
    logger.info("=" * 60)
    logger.info(f"Start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Command: {args.command or 'both phases'}")
    logger.info(f"Verbose logging: {args.verbose}")
    logger.info(f"HF Token provided: {'Yes' if args.token else 'No'}")
    logger.info(f"Spam filtering: {'Disabled' if args.disable_spam_filter else 'Enabled'}")
    
    if not args.disable_spam_filter:
        logger.info(f"Spam filter config:")
        logger.info(f"  - Min size: {args.min_size} MB")
        logger.info(f"  - Size threshold: {args.size_threshold}")
        logger.info(f"  - Min downloads: {args.min_downloads}")
        logger.info(f"  - Backup enabled: {not args.no_backup}")
    
    try:
        # Initialize fetcher
        logger.info("Initializing GGUF fetcher...")
        fetcher = SimplifiedGGUFetcher(
            token=args.token,
            filter_config=filter_config,
            disable_spam_filter=args.disable_spam_filter
        )
        
        # Execute requested phase(s)
        if args.command == 'download':
            logger.info("Executing download phase only")
            fetcher.download_data()
        elif args.command == 'process':
            logger.info("Executing process phase only")
            fetcher.process_data()
        else:
            logger.info("Executing both download and process phases")
            fetcher.download_data()
            fetcher.process_data()
        
        # Log successful completion
        end_time = datetime.now()
        duration = end_time - start_time
        logger.info("=" * 60)
        logger.info("EXECUTION COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info(f"End time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"Total duration: {duration}")
        logger.info("All phases completed without critical errors")
        
    except KeyboardInterrupt:
        logger.warning("Execution interrupted by user (Ctrl+C)")
        sys.exit(130)  # Standard exit code for Ctrl+C
    except Exception as e:
        # Log detailed error information
        end_time = datetime.now()
        duration = end_time - start_time
        logger.error("=" * 60)
        logger.error("EXECUTION FAILED")
        logger.error("=" * 60)
        logger.error(f"Error: {e}")
        logger.error(f"End time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.error(f"Duration before failure: {duration}")
        logger.error("Check the logs above for more details")
        sys.exit(1)


if __name__ == "__main__":
    main()