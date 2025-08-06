#!/usr/bin/env python3
"""
Hardware requirements calculator for GGUF models
"""

import re
import logging
from typing import Dict, Optional, List
from .config import FilterConfig


class HardwareRequirementsCalculator:
    """Calculate hardware requirements for GGUF models based on size and characteristics"""
    
    def __init__(self, config: FilterConfig):
        """Initialize with configuration parameters"""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Regex patterns for parameter extraction from model names
        self.param_patterns = [
            r'(\d+(?:\.\d+)?)[Bb](?:\s|$|-)',  # 7B, 13B, 70B, etc.
            r'(\d+(?:\.\d+)?)B-',              # 7B-, 13B-, etc.
            r'-(\d+(?:\.\d+)?)[Bb]-',          # -7B-, -13B-, etc.
            r'_(\d+(?:\.\d+)?)[Bb]_',          # _7B_, _13B_, etc.
        ]
    
    def calculate_requirements(self, model: Dict) -> Dict:
        """
        Calculate hardware requirements for a single model
        
        Args:
            model: Model dictionary containing at least fileSize and modelName
            
        Returns:
            Dictionary with hardware requirement fields added
        """
        try:
            # Create a copy to avoid modifying the original
            enhanced_model = model.copy()
            
            # Extract and validate model characteristics
            file_size = model.get('fileSize', 0)
            model_name = model.get('modelName', '')
            quant_format = model.get('quantFormat', '')
            
            # Validate file_size is numeric
            if not isinstance(file_size, (int, float)) or file_size < 0:
                raise ValueError(f"Invalid file_size: {file_size}")
            
            # Validate model_name is string-like
            if model_name is None:
                model_name = ''
            elif not isinstance(model_name, str):
                model_name = str(model_name)
            
            # Validate quant_format is string-like
            if quant_format is None:
                quant_format = ''
            elif not isinstance(quant_format, str):
                quant_format = str(quant_format)
            
            # Estimate parameters
            estimated_params = self.estimate_parameters(model)
            
            # Calculate hardware requirements
            enhanced_model['minRamGB'] = self.calculate_ram_requirements(int(file_size), quant_format)
            enhanced_model['minCpuCores'] = self.calculate_cpu_requirements(estimated_params, int(file_size))
            enhanced_model['gpuRequired'] = self.determine_gpu_requirement(estimated_params, int(file_size), quant_format)
            enhanced_model['osSupported'] = self.get_os_support(model)
            
            if self.config.detailed_logging:
                self.logger.info(
                    f"Hardware requirements calculated for {model_name}: "
                    f"RAM={enhanced_model['minRamGB']}GB, "
                    f"CPU={enhanced_model['minCpuCores']} cores, "
                    f"GPU={'required' if enhanced_model['gpuRequired'] else 'optional'}, "
                    f"Estimated params={estimated_params}"
                )
            
            return enhanced_model
            
        except Exception as e:
            self.logger.error(f"Error calculating hardware requirements for {model.get('modelName', 'unknown')}: {e}")
            return self._apply_default_requirements(model)
    
    def estimate_parameters(self, model: Dict) -> Optional[int]:
        """
        Estimate parameter count from model name and file size
        
        Args:
            model: Model dictionary
            
        Returns:
            Estimated parameter count in billions, or None if cannot estimate
        """
        model_name = model.get('modelName', '')
        file_size = model.get('fileSize', 0)
        
        # Try to extract parameter count from model name
        for pattern in self.param_patterns:
            match = re.search(pattern, model_name, re.IGNORECASE)
            if match:
                try:
                    param_str = match.group(1)
                    param_count = float(param_str)
                    # Convert to actual parameter count (billions to individual parameters)
                    return int(param_count * 1_000_000_000)
                except (ValueError, IndexError):
                    continue
        
        # Fallback: estimate from file size
        # Rough heuristic: 1B parameters ≈ 1-2GB for quantized models
        if file_size > 0:
            # Conservative estimate: assume 1.5GB per billion parameters for quantized models
            estimated_billions = file_size / (1.5 * 1024 * 1024 * 1024)
            if estimated_billions > 0.5:  # Only return if reasonable estimate
                return int(estimated_billions * 1_000_000_000)
        
        return None
    
    def calculate_ram_requirements(self, file_size: int, quant_format: str) -> int:
        """
        Calculate minimum RAM requirements using realistic market values
        
        Args:
            file_size: Model file size in bytes
            quant_format: Quantization format string
            
        Returns:
            Minimum RAM in GB (realistic market values: 8, 16, 32, 64, 128)
        """
        if file_size <= 0:
            return 8  # Default minimum
        
        # Convert file size to GB
        file_size_gb = file_size / (1024 * 1024 * 1024)
        
        # Base calculation: RAM = file_size * multiplier
        base_ram = file_size_gb * self.config.ram_multiplier
        
        # Apply quantization reduction for efficient formats
        if self._is_efficient_quantization(quant_format):
            base_ram *= (1 - self.config.quantization_ram_reduction)
        
        # Round to realistic market RAM configurations
        if base_ram <= 8:
            return 8    # 8GB - Entry level
        elif base_ram <= 16:
            return 16   # 16GB - Mid-range standard
        elif base_ram <= 32:
            return 32   # 32GB - High-end gaming/workstation
        elif base_ram <= 64:
            return 64   # 64GB - Professional workstation
        else:
            return 128  # 128GB+ - High-end server/workstation
    
    def calculate_cpu_requirements(self, estimated_params: Optional[int], file_size: int) -> int:
        """
        Calculate minimum CPU core requirements using realistic market values
        
        Args:
            estimated_params: Estimated parameter count
            file_size: Model file size in bytes
            
        Returns:
            Minimum CPU cores (realistic market values: 4, 6, 8, 12, 16)
        """
        # Use parameter count if available
        if estimated_params is not None:
            if estimated_params <= self.config.small_model_threshold:  # ≤2B parameters
                return 4  # Entry-level quad-core processors
            elif estimated_params <= self.config.medium_model_threshold:  # ~7B parameters
                return 6  # Mid-range hexa-core processors (Intel i5, AMD Ryzen 5)
            elif estimated_params <= 30_000_000_000:  # ~30B parameters
                return 8  # High-end octa-core processors (Intel i7, AMD Ryzen 7)
            elif estimated_params <= 70_000_000_000:  # ~70B parameters
                return 12  # Enthusiast processors (Intel i9, AMD Ryzen 9)
            else:  # Very large models (>70B)
                return 16  # High-end workstation processors
        
        # Fallback: use file size with realistic core counts
        file_size_gb = file_size / (1024 * 1024 * 1024)
        if file_size_gb <= 2:
            return 4  # Small models
        elif file_size_gb <= 6:
            return 6  # Medium models
        elif file_size_gb <= 15:
            return 8  # Large models
        elif file_size_gb <= 40:
            return 12  # Very large models
        else:
            return 16  # Extremely large models
    
    def determine_gpu_requirement(self, estimated_params: Optional[int], file_size: int, quant_format: str) -> bool:
        """
        Determine if GPU is required for good performance
        
        Args:
            estimated_params: Estimated parameter count
            file_size: Model file size in bytes
            quant_format: Quantization format string
            
        Returns:
            True if GPU is required, False if CPU inference is viable
        """
        # Large models generally require GPU
        if estimated_params is not None and estimated_params >= self.config.gpu_required_threshold:
            return True
        
        # Fallback: use file size (large files likely need GPU)
        file_size_gb = file_size / (1024 * 1024 * 1024)
        if file_size_gb >= 8:  # Conservative threshold
            return True
        
        # Small, well-quantized models can run on CPU
        if self._is_efficient_quantization(quant_format) and file_size_gb <= 4:
            return False
        
        # Default to GPU required for better performance
        return True
    
    def get_os_support(self, model: Dict) -> List[str]:
        """
        Determine supported operating systems
        
        Args:
            model: Model dictionary
            
        Returns:
            List of supported OS strings
        """
        # For now, return default OS support
        # Future enhancement: analyze model metadata for OS-specific requirements
        return self.config.default_os_support.copy()
    
    def _is_efficient_quantization(self, quant_format: str) -> bool:
        """Check if quantization format is efficient (4-bit or similar)"""
        if not quant_format:
            return False
        
        # Common efficient quantization formats
        efficient_formats = ['Q4_', 'Q3_', 'Q2_', 'IQ4_', 'IQ3_', 'IQ2_']
        return any(quant_format.upper().startswith(fmt) for fmt in efficient_formats)
    
    def _apply_default_requirements(self, model: Dict) -> Dict:
        """Apply conservative default hardware requirements when calculation fails"""
        enhanced_model = model.copy()
        file_size = model.get('fileSize', 0)
        
        # Safely calculate file size in GB
        try:
            if isinstance(file_size, (int, float)) and file_size > 0:
                file_size_gb = max(1, file_size / (1024 * 1024 * 1024))
            else:
                file_size_gb = 1  # Default to 1GB if invalid
        except (TypeError, ZeroDivisionError):
            file_size_gb = 1
        
        # Conservative defaults using realistic market values
        # RAM: Round up to next realistic configuration
        base_ram = file_size_gb * 3  # 3x file size
        if base_ram <= 8:
            enhanced_model['minRamGB'] = 8
        elif base_ram <= 16:
            enhanced_model['minRamGB'] = 16
        elif base_ram <= 32:
            enhanced_model['minRamGB'] = 32
        else:
            enhanced_model['minRamGB'] = 64
        
        enhanced_model['minCpuCores'] = 8  # Conservative 8-core default
        enhanced_model['gpuRequired'] = True  # Conservative assumption
        enhanced_model['osSupported'] = self.config.default_os_support.copy()
        
        self.logger.warning(f"Applied default hardware requirements for {model.get('modelName', 'unknown')}")
        return enhanced_model