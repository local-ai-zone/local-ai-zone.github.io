#!/usr/bin/env python3
"""
Quantization variant selection with trusted uploader support and size-based filtering
"""

import re
from typing import Dict, List, Optional
from .config import FilterConfig


class QuantizationSelector:
    """Selects optimal quantized variants based on size, uploader trust, and downloads"""
    
    def __init__(self, config: FilterConfig):
        self.config = config
    
    def select_variants_for_group(self, base_model: Dict, variants: List[Dict]) -> List[Dict]:
        """
        Select optimal variants for a model group
        
        Args:
            base_model: The base/foundation model (always kept)
            variants: List of quantized variants to filter
            
        Returns:
            List of selected models including base model and filtered variants
        """
        selected = [base_model] if base_model else []
        
        if not variants:
            return selected
        
        # Filter out small models first
        valid_variants = [
            v for v in variants 
            if v.get('fileSize', 0) >= self.config.min_size_bytes
        ]
        
        if not valid_variants:
            return selected
        
        # Sort variants by file size (descending - largest first)
        valid_variants.sort(key=lambda x: x.get('fileSize', 0), reverse=True)
        
        # Apply quantization filtering logic
        filtered_variants = self.filter_quantized_variants(valid_variants)
        selected.extend(filtered_variants)
        
        return selected
    
    def filter_quantized_variants(self, variants: List[Dict]) -> List[Dict]:
        """
        Filter quantized variants based on size drops and uploader trust
        
        Args:
            variants: List of quantized variants sorted by size (descending)
            
        Returns:
            List of selected variants
        """
        if not variants:
            return []
        
        kept_variants = []
        
        for variant in variants:
            if self.should_keep_variant(variant, kept_variants):
                kept_variants.append(variant)
        
        return kept_variants
    
    def should_keep_variant(self, variant: Dict, kept_variants: List[Dict]) -> bool:
        """
        Determine if a variant should be kept based on filtering criteria
        
        Args:
            variant: The variant to evaluate
            kept_variants: List of already kept variants
            
        Returns:
            True if variant should be kept, False otherwise
        """
        # Always keep the first variant (largest)
        if not kept_variants:
            return True
        
        # Check if from trusted uploader
        if self.is_trusted_uploader(variant):
            # Trusted uploaders get more lenient treatment
            if self.meets_download_threshold(variant, min_downloads=50):  # Lower threshold
                return True
        
        # For non-trusted uploaders, apply stricter criteria
        if not self.meets_download_threshold(variant, self.config.min_downloads):
            return False
        
        # Check size drop requirement
        last_kept = kept_variants[-1]
        if self.has_significant_size_drop(variant, last_kept, self.config.size_drop_threshold):
            return True
        
        # Special case: if this is a significantly different quantization format
        # and has good download numbers, consider keeping it
        if self.is_different_quantization_family(variant, kept_variants):
            download_count = variant.get('downloadCount', 0)
            if download_count >= self.config.min_downloads * 2:  # Higher threshold
                return True
        
        return False
    
    def has_significant_size_drop(self, variant: Dict, last_kept: Dict, threshold: float = 0.05) -> bool:
        """
        Check if variant has significant size reduction compared to last kept variant
        
        Args:
            variant: Current variant to check
            last_kept: Last variant that was kept
            threshold: Minimum size reduction ratio (default 5%)
            
        Returns:
            True if size drop is significant enough
        """
        current_size = variant.get('fileSize', 0)
        last_size = last_kept.get('fileSize', 0)
        
        if last_size == 0:
            return True
        
        size_ratio = current_size / last_size
        size_drop = 1.0 - size_ratio
        
        return size_drop > threshold
    
    def is_trusted_uploader(self, model: Dict) -> bool:
        """
        Check if model is from a trusted uploader
        
        Args:
            model: Model dictionary with metadata
            
        Returns:
            True if from trusted uploader, False otherwise
        """
        uploader = self.extract_uploader_from_model_id(model)
        return uploader.lower() in [u.lower() for u in self.config.trusted_uploaders]
    
    def meets_download_threshold(self, model: Dict, min_downloads: int = None) -> bool:
        """
        Check if model meets minimum download requirement
        
        Args:
            model: Model dictionary with download count
            min_downloads: Minimum download threshold (uses config default if None)
            
        Returns:
            True if meets threshold, False otherwise
        """
        if min_downloads is None:
            min_downloads = self.config.min_downloads
        
        download_count = model.get('downloadCount', 0)
        if download_count is None:
            download_count = 0
        return download_count >= min_downloads
    
    def extract_uploader_from_model_id(self, model: Dict) -> str:
        """
        Extract uploader name from Hugging Face model ID
        
        Args:
            model: Model dictionary with huggingFaceLink or similar
            
        Returns:
            Uploader name or empty string if not found
        """
        # Try to extract from huggingFaceLink
        hf_link = model.get('huggingFaceLink', '')
        if hf_link:
            # Extract from URL like https://huggingface.co/TheBloke/model-name
            match = re.search(r'huggingface\.co/([^/]+)/', hf_link)
            if match:
                return match.group(1)
        
        # Try to extract from directDownloadLink
        download_link = model.get('directDownloadLink', '')
        if download_link:
            # Skip CDN links as they don't contain uploader info
            if 'cdn-lfs.huggingface.co' not in download_link:
                match = re.search(r'huggingface\.co/([^/]+)/', download_link)
                if match:
                    return match.group(1)
        
        # Try to extract from model name if it contains uploader info
        model_name = model.get('modelName', '')
        # Look for patterns like "TheBloke/model-name" or "TheBloke - Model Name"
        uploader_patterns = [
            r'^([^/\-\s]+)[/\-]\s*',  # "TheBloke/model" or "TheBloke - model"
            r'\b([A-Z][a-z]+(?:[A-Z][a-z]*)*)\s+\-',  # "TheBloke - model"
        ]
        
        for pattern in uploader_patterns:
            match = re.search(pattern, model_name)
            if match:
                potential_uploader = match.group(1)
                # Check if it looks like a username (not a model name part)
                if len(potential_uploader) > 2 and not potential_uploader.lower() in ['the', 'a', 'an']:
                    return potential_uploader
        
        return ''
    
    def is_different_quantization_family(self, variant: Dict, kept_variants: List[Dict]) -> bool:
        """
        Check if variant represents a different quantization family
        
        Args:
            variant: Current variant to check
            kept_variants: List of already kept variants
            
        Returns:
            True if this is a different quantization family
        """
        current_quant = variant.get('quantFormat', '').upper()
        kept_quants = [v.get('quantFormat', '').upper() for v in kept_variants]
        
        # Define quantization families
        quant_families = {
            'Q4': ['Q4_0', 'Q4_1', 'Q4_K_S', 'Q4_K_M'],
            'Q5': ['Q5_0', 'Q5_1', 'Q5_K_S', 'Q5_K_M'],
            'Q6': ['Q6_K'],
            'Q8': ['Q8_0'],
            'IQ': ['IQ1_S', 'IQ2_XXS', 'IQ3_XXS', 'IQ4_XS'],
            'F16': ['F16', 'BF16'],
            'Q2': ['Q2_K'],
            'Q3': ['Q3_K_S', 'Q3_K_M', 'Q3_K_L']
        }
        
        # Find family of current variant
        current_family = None
        for family, formats in quant_families.items():
            if any(current_quant.startswith(fmt) for fmt in formats):
                current_family = family
                break
        
        if not current_family:
            return True  # Unknown format, consider it different
        
        # Check if we already have this family
        for kept_quant in kept_quants:
            for family, formats in quant_families.items():
                if family == current_family and any(kept_quant.startswith(fmt) for fmt in formats):
                    return False  # Same family already kept
        
        return True  # Different family
    
    def get_quantization_priority(self, quant_format: str) -> int:
        """
        Get priority score for quantization format (lower = higher priority)
        
        Args:
            quant_format: Quantization format string
            
        Returns:
            Priority score (0 = highest priority)
        """
        quant = quant_format.upper()
        
        # Priority order (most useful formats first)
        priority_map = {
            'F16': 0, 'BF16': 1,  # Full precision
            'Q8_0': 2,  # Very high quality
            'Q6_K': 3,  # High quality
            'Q5_K_M': 4, 'Q5_K_S': 5,  # Good balance
            'Q4_K_M': 6, 'Q4_K_S': 7,  # Most popular
            'IQ4_XS': 8,  # Efficient
            'Q4_0': 9, 'Q4_1': 10,  # Legacy
            'Q3_K_M': 11, 'Q3_K_S': 12,  # Smaller
            'Q2_K': 13,  # Very small
            'IQ3_XXS': 14, 'IQ2_XXS': 15, 'IQ1_S': 16  # Minimal
        }
        
        return priority_map.get(quant, 999)  # Unknown formats get low priority