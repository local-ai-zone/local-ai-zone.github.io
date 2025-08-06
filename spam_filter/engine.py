#!/usr/bin/env python3
"""
Main spam filter engine for processing model data
"""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from .config import FilterConfig
from .classifier import ModelClassifier
from .quantization_selector import QuantizationSelector
from .backup_manager import BackupManager
from .hardware_calculator import HardwareRequirementsCalculator


@dataclass
class ProcessingReport:
    """Detailed statistics about the filtering process"""
    
    # Overall statistics
    total_processed: int = 0
    total_kept: int = 0
    total_removed: int = 0
    
    # Removal reasons
    small_models_removed: int = 0
    finetuned_removed: int = 0
    quantization_variants_removed: int = 0
    variants_removed_by_size: int = 0
    variants_removed_by_uploader: int = 0
    variants_removed_by_downloads: int = 0
    
    # Kept statistics
    base_models_kept: int = 0
    quantized_variants_kept: int = 0
    trusted_uploader_variants_kept: int = 0
    
    # Size and performance
    size_reduction_mb: int = 0
    processing_time_seconds: float = 0.0
    
    # Model group statistics
    model_group_stats: Dict[str, Dict[str, int]] = field(default_factory=dict)
    
    # Error tracking
    errors: List[str] = field(default_factory=list)
    
    def add_group_stats(self, group_name: str, original_count: int, kept_count: int):
        """Add statistics for a model group"""
        self.model_group_stats[group_name] = {
            'original': original_count,
            'kept': kept_count,
            'removed': original_count - kept_count
        }
    
    def calculate_totals(self):
        """Calculate derived statistics"""
        self.total_removed = self.total_processed - self.total_kept


@dataclass
class FilterResult:
    """Result object containing filtered data and metadata"""
    
    filtered_models: List[Dict]
    original_count: int
    filtered_count: int
    removed_count: int
    backup_path: Optional[str]
    processing_report: ProcessingReport
    errors: List[str]
    
    @property
    def success(self) -> bool:
        """Check if filtering was successful"""
        return len(self.errors) == 0 and self.filtered_count > 0


class SpamFilterEngine:
    """Main engine for filtering model spam from GGUF model datasets"""
    
    def __init__(self, config: FilterConfig):
        """Initialize the spam filter engine"""
        self.config = config
        self.classifier = ModelClassifier(config)
        self.selector = QuantizationSelector(config)
        self.backup_manager = BackupManager()
        self.hardware_calculator = HardwareRequirementsCalculator(config)
        
        # Setup logging
        if config.detailed_logging:
            logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)  
  
    def filter_models(self, raw_models: List[Dict]) -> FilterResult:
        """Main filtering pipeline that processes raw model data"""
        import time
        start_time = time.time()
        
        report = ProcessingReport()
        errors = []
        
        try:
            # Step 1: Extract GGUF files from raw model data
            self.logger.info("Step 1: Extracting GGUF files from raw model data")
            gguf_models = self._extract_gguf_models(raw_models, report, errors)
            report.total_processed = len(gguf_models)  # Set after extraction
            self.logger.info(f"Extracted {len(gguf_models)} GGUF models from {len(raw_models)} raw models")
            
            # Step 2: Remove small models (< 100MB)
            self.logger.info("Step 2: Removing small models")
            filtered_models = self._remove_small_models(gguf_models, report)
            self.logger.info(f"Removed {report.small_models_removed} small models, {len(filtered_models)} remaining")
            
            # Step 3: Remove finetuned models
            self.logger.info("Step 3: Removing finetuned models")
            base_models = self._remove_finetuned_models(filtered_models, report)
            self.logger.info(f"Removed {report.finetuned_removed} finetuned models, {len(base_models)} remaining")
            
            # Step 4: Group models by base architecture
            self.logger.info("Step 4: Grouping models by base architecture")
            model_groups = self._group_models_by_base(base_models)
            self.logger.info(f"Created {len(model_groups)} model groups")
            
            # Step 5: Filter variants within each group
            self.logger.info("Step 5: Filtering variants within groups")
            final_models = self._filter_variants_in_groups(model_groups, report)
            self.logger.info(f"Final result: {len(final_models)} models after variant filtering")
            
            # Step 6: Add hardware requirements to models
            self.logger.info("Step 6: Calculating hardware requirements")
            enhanced_models = self._add_hardware_requirements(final_models)
            self.logger.info(f"Added hardware requirements to {len(enhanced_models)} models")
            
            # Calculate final statistics
            report.total_kept = len(enhanced_models)
            report.processing_time_seconds = time.time() - start_time
            report.calculate_totals()
            
            return FilterResult(
                filtered_models=enhanced_models,
                original_count=len(gguf_models),  # Use GGUF models count, not raw models
                filtered_count=len(enhanced_models),
                removed_count=len(gguf_models) - len(enhanced_models),
                backup_path=None,
                processing_report=report,
                errors=errors
            )
            
        except Exception as e:
            self.logger.error(f"Error during filtering: {str(e)}")
            errors.append(f"Filtering failed: {str(e)}")
            
            return FilterResult(
                filtered_models=[],
                original_count=report.total_processed,
                filtered_count=0,
                removed_count=report.total_processed,
                backup_path=None,
                processing_report=report,
                errors=errors
            )
    
    def _extract_gguf_models(self, raw_models: List[Dict], report: ProcessingReport, errors: List[str]) -> List[Dict]:
        """Extract GGUF files from raw Hugging Face model data and convert to expected format"""
        gguf_models = []
        
        for raw_model in raw_models:
            try:
                # Skip if no GGUF files
                if not self._has_gguf_files(raw_model):
                    continue
                
                # Extract GGUF files from siblings
                gguf_files = self._get_gguf_files(raw_model)
                
                for gguf_file in gguf_files:
                    try:
                        model = self._convert_to_expected_format(raw_model, gguf_file)
                        if model:
                            gguf_models.append(model)
                    except Exception as e:
                        errors.append(f"Error converting model {raw_model.get('id', 'unknown')}: {str(e)}")
                        continue
                        
            except Exception as e:
                errors.append(f"Error processing raw model {raw_model.get('id', 'unknown')}: {str(e)}")
                continue
        
        return gguf_models
    
    def _has_gguf_files(self, raw_model: Dict) -> bool:
        """Check if raw model has GGUF files"""
        siblings = raw_model.get('siblings', [])
        return any(
            sibling.get('rfilename', '').lower().endswith('.gguf')
            for sibling in siblings
        )
    
    def _get_gguf_files(self, raw_model: Dict) -> List[Dict]:
        """Extract GGUF files from siblings"""
        siblings = raw_model.get('siblings', [])
        return [
            sibling for sibling in siblings
            if sibling.get('rfilename', '').lower().endswith('.gguf')
        ]
    
    def _convert_to_expected_format(self, raw_model: Dict, gguf_file: Dict) -> Optional[Dict]:
        """Convert raw model + GGUF file to expected format"""
        try:
            model_id = raw_model.get('id', '')
            filename = gguf_file.get('rfilename', '')
            file_size = gguf_file.get('size', 0)
            
            # Extract model name from ID
            model_name = self._extract_model_name(model_id, filename)
            
            # Extract quantization format from filename
            quant_format = self._extract_quantization_format(filename)
            
            # Format file size
            file_size_formatted = self._format_file_size(file_size)
            
            # Extract model type
            model_type = self._extract_model_type(model_id, filename)
            
            # Build HF link
            hf_link = f"https://huggingface.co/{model_id}"
            
            # Build direct download link
            download_link = f"https://huggingface.co/{model_id}/resolve/main/{filename}"
            
            return {
                'modelName': model_name,
                'quantFormat': quant_format,
                'fileSize': file_size,
                'fileSizeFormatted': file_size_formatted,
                'modelType': model_type,
                'license': 'Not specified',
                'downloadCount': raw_model.get('downloads', 0),
                'likeCount': raw_model.get('likes', 0),
                'huggingFaceLink': hf_link,
                'directDownloadLink': download_link,
                'uploadDate': raw_model.get('created_at', None)  # Add upload date from created_at
            }
            
        except Exception as e:
            self.logger.error(f"Error converting model {raw_model.get('id', 'unknown')}: {str(e)}")
            return None
    
    def _extract_model_name(self, model_id: str, filename: str) -> str:
        """Extract clean model name from model ID and filename"""
        name = model_id.split('/')[-1] if '/' in model_id else model_id
        name = re.sub(r'-gguf', '', name, flags=re.IGNORECASE)
        name = re.sub(r'-q\d+_\w+', '', name, flags=re.IGNORECASE)
        name = ' '.join(word.capitalize() for word in re.split(r'[-_]', name))
        return name 
   
    def _extract_quantization_format(self, filename: str) -> str:
        """Extract quantization format from filename"""
        filename_lower = filename.lower()
        
        quant_patterns = [
            (r'bf16', 'BF16'), (r'f16', 'F16'),  # Check BF16 before F16
            (r'q8_0', 'Q8_0'), (r'q6_k', 'Q6_K'), (r'q5_k_m', 'Q5_K_M'),
            (r'q5_k_s', 'Q5_K_S'), (r'q5_0', 'Q5_0'), (r'q5_1', 'Q5_1'),
            (r'q4_k_m', 'Q4_K_M'), (r'q4_k_s', 'Q4_K_S'), (r'q4_0', 'Q4_0'),
            (r'q4_1', 'Q4_1'), (r'q3_k_m', 'Q3_K_M'), (r'q3_k_s', 'Q3_K_S'),
            (r'q3_k_l', 'Q3_K_L'), (r'q2_k', 'Q2_K'), (r'iq4_xs', 'IQ4_XS'),
            (r'iq3_xxs', 'IQ3_XXS'), (r'iq2_xxs', 'IQ2_XXS'), (r'iq1_s', 'IQ1_S'),
        ]
        
        for pattern, format_name in quant_patterns:
            if re.search(pattern, filename_lower):
                return format_name
        
        return 'Unknown'
    
    def _extract_model_type(self, model_id: str, filename: str) -> str:
        """Extract model type/architecture"""
        text = (model_id + ' ' + filename).lower()
        
        type_patterns = [
            (r'\bllama\b', 'Llama'), (r'\bmistral\b', 'Mistral'), (r'\bqwen\b', 'Qwen'),
            (r'\bgemma\b', 'Gemma'), (r'\bdeepseek\b', 'DeepSeek'), (r'\bphi\b', 'Phi'),
            (r'\bfalcon\b', 'Falcon'), (r'\bmpt\b', 'MPT'), (r'\bbert\b', 'BERT'),
            (r'\bembed\b', 'BERT'),
        ]
        
        for pattern, model_type in type_patterns:
            if re.search(pattern, text):
                return model_type
        
        return 'Unknown'
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.0f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
    
    def _remove_small_models(self, models: List[Dict], report: ProcessingReport) -> List[Dict]:
        """Remove models smaller than minimum size threshold"""
        filtered = []
        
        for model in models:
            file_size = model.get('fileSize', 0)
            if file_size >= self.config.min_size_bytes:
                filtered.append(model)
            else:
                report.small_models_removed += 1
        
        return filtered
    
    def _remove_finetuned_models(self, models: List[Dict], report: ProcessingReport) -> List[Dict]:
        """Remove finetuned models, keeping only base models"""
        filtered = []
        
        for model in models:
            if self.classifier.is_base_model(model):
                filtered.append(model)
            else:
                report.finetuned_removed += 1
        
        return filtered
    
    def _group_models_by_base(self, models: List[Dict]) -> Dict[str, List[Dict]]:
        """Group models by their base architecture"""
        groups = defaultdict(list)
        
        for model in models:
            base_group = self.classifier.get_base_model_group(model)
            groups[base_group].append(model)
        
        return dict(groups)
    
    def _filter_variants_in_groups(self, model_groups: Dict[str, List[Dict]], report: ProcessingReport) -> List[Dict]:
        """Filter variants within each model group"""
        final_models = []
        
        for group_name, models in model_groups.items():
            original_count = len(models)
            
            # Separate base models from quantized variants
            base_models = []
            variants = []
            
            for model in models:
                quant_format = model.get('quantFormat', '').upper()
                if quant_format in ['F16', 'BF16'] or 'base' in model.get('modelName', '').lower():
                    base_models.append(model)
                else:
                    variants.append(model)
            
            # Select best base model (largest if multiple)
            base_model = None
            if base_models:
                base_model = max(base_models, key=lambda x: x.get('fileSize', 0))
                report.base_models_kept += 1
            
            # Filter variants using quantization selector
            selected_variants = []
            if variants:
                selected_variants = self.selector.select_variants_for_group(None, variants)
                final_models.extend(selected_variants)
                report.quantized_variants_kept += len(selected_variants)
                report.quantization_variants_removed += len(variants) - len(selected_variants)
                
                # Count trusted uploader variants
                for variant in selected_variants:
                    if self.selector.is_trusted_uploader(variant):
                        report.trusted_uploader_variants_kept += 1
            
            # Add base model if we have one
            if base_model:
                final_models.append(base_model)
            
            # Record group statistics
            kept_count = (1 if base_model else 0) + len(selected_variants)
            report.add_group_stats(group_name, original_count, kept_count)
        
        return final_models
    
    def _add_hardware_requirements(self, models: List[Dict]) -> List[Dict]:
        """Add hardware requirements to each model"""
        enhanced_models = []
        
        for model in models:
            try:
                enhanced_model = self.hardware_calculator.calculate_requirements(model)
                enhanced_models.append(enhanced_model)
            except Exception as e:
                self.logger.error(f"Failed to calculate hardware requirements for {model.get('modelName', 'unknown')}: {e}")
                # Add the original model without hardware requirements as fallback
                enhanced_models.append(model)
        
        return enhanced_models
    
    def create_backup(self, models: List[Dict]) -> Optional[str]:
        """Create backup of original model data"""
        if not self.config.backup_enabled:
            return None
        
        try:
            return self.backup_manager.create_backup(models)
        except Exception as e:
            self.logger.error(f"Failed to create backup: {str(e)}")
            return None 
   
    def generate_report(self, result: FilterResult) -> str:
        """Generate human-readable processing report"""
        report = result.processing_report
        
        lines = [
            "=== Model Spam Filtering Report ===",
            f"Processing Time: {report.processing_time_seconds:.2f} seconds",
            "",
            "=== Overall Statistics ===",
            f"Total Models Processed: {report.total_processed:,}",
            f"Models Kept: {report.total_kept:,}",
            f"Models Removed: {report.total_removed:,}",
            f"Removal Rate: {(report.total_removed / report.total_processed * 100):.1f}%" if report.total_processed > 0 else "Removal Rate: 0.0%",
            "",
            "=== Removal Breakdown ===",
            f"Small Models Removed: {report.small_models_removed:,}",
            f"Finetuned Models Removed: {report.finetuned_removed:,}",
            f"Quantization Variants Removed: {report.quantization_variants_removed:,}",
            "",
            "=== Kept Models Breakdown ===",
            f"Base Models Kept: {report.base_models_kept:,}",
            f"Quantized Variants Kept: {report.quantized_variants_kept:,}",
            f"Trusted Uploader Variants: {report.trusted_uploader_variants_kept:,}",
            "",
        ]
        
        if report.model_group_stats:
            lines.extend([
                "=== Top Model Groups ===",
                "Group Name | Original | Kept | Removed"
            ])
            
            # Sort by original count, show top 10
            sorted_groups = sorted(
                report.model_group_stats.items(),
                key=lambda x: x[1]['original'],
                reverse=True
            )[:10]
            
            for group_name, stats in sorted_groups:
                lines.append(
                    f"{group_name[:30]:30} | {stats['original']:8} | {stats['kept']:4} | {stats['removed']:7}"
                )
        
        if result.errors:
            lines.extend([
                "",
                "=== Errors ===",
                f"Total Errors: {len(result.errors)}"
            ])
            for error in result.errors[:5]:  # Show first 5 errors
                lines.append(f"- {error}")
            if len(result.errors) > 5:
                lines.append(f"... and {len(result.errors) - 5} more errors")
        
        return "\n".join(lines)