#!/usr/bin/env python3
"""
Configuration management for model spam filtering
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class FilterConfig:
    """Configuration parameters for model spam filtering"""
    
    # Size filtering
    min_size_bytes: int = 100 * 1024 * 1024  # 100MB minimum
    size_drop_threshold: float = 0.05  # 5% minimum size reduction to keep variant
    
    # Download and popularity thresholds
    min_downloads: int = 100  # Minimum downloads for non-trusted uploaders
    
    # Trusted uploaders list
    trusted_uploaders: List[str] = field(default_factory=lambda: [
        'TheBloke', 'lmstudio', 'ggml-org', 'koboldai', 
        'NousResearch', 'abacaj', 'OpenAccessAI', 'microsoft',
        'meta-llama', 'mistralai', 'google', 'anthropic'
    ])
    
    # Finetuning detection patterns
    finetune_patterns: List[str] = field(default_factory=lambda: [
        'instruct', 'chat', 'code', 'alpaca', 'vicuna', 'wizard',
        'orca', 'dolphin', 'airoboros', 'guanaco', 'openassistant',
        'uncensored', 'roleplay', 'storytelling', 'creative',
        'assistant', 'helpful', 'harmless', 'honest'
    ])
    
    # System settings
    backup_enabled: bool = True
    detailed_logging: bool = True
    
    # Hardware calculation parameters
    ram_multiplier: float = 2.0  # Base RAM multiplier (2x file size)
    quantization_ram_reduction: float = 0.3  # RAM reduction for 4-bit quant
    small_model_threshold: int = 2_000_000_000  # 2B parameters
    medium_model_threshold: int = 7_000_000_000  # 7B parameters
    large_model_threshold: int = 13_000_000_000  # 13B parameters
    gpu_required_threshold: int = 13_000_000_000  # 13B parameters
    default_os_support: List[str] = field(default_factory=lambda: ["Windows", "Linux", "macOS"])
    
    def validate(self) -> List[str]:
        """Validate configuration parameters and return any errors"""
        errors = []
        
        if self.min_size_bytes <= 0:
            errors.append("min_size_bytes must be positive")
            
        if not (0.0 < self.size_drop_threshold < 1.0):
            errors.append("size_drop_threshold must be between 0 and 1")
            
        if self.min_downloads < 0:
            errors.append("min_downloads must be non-negative")
            
        if not self.trusted_uploaders:
            errors.append("trusted_uploaders list cannot be empty")
            
        if not self.finetune_patterns:
            errors.append("finetune_patterns list cannot be empty")
            
        # Hardware calculation validation
        if self.ram_multiplier <= 0:
            errors.append("ram_multiplier must be positive")
            
        if not (0.0 <= self.quantization_ram_reduction <= 1.0):
            errors.append("quantization_ram_reduction must be between 0 and 1")
            
        if self.small_model_threshold <= 0:
            errors.append("small_model_threshold must be positive")
            
        if self.medium_model_threshold <= self.small_model_threshold:
            errors.append("medium_model_threshold must be greater than small_model_threshold")
            
        if self.large_model_threshold <= self.medium_model_threshold:
            errors.append("large_model_threshold must be greater than medium_model_threshold")
            
        if self.gpu_required_threshold <= 0:
            errors.append("gpu_required_threshold must be positive")
            
        if not self.default_os_support:
            errors.append("default_os_support list cannot be empty")
            
        return errors