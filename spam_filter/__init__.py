#!/usr/bin/env python3
"""
Model spam filtering system

This package provides intelligent filtering for GGUF model databases to reduce
spam by removing excessive finetuned variants and keeping only base models
plus their most useful quantized versions.
"""

import logging
import sys
from typing import Dict, List

from .config import FilterConfig
from .classifier import ModelClassifier
from .quantization_selector import QuantizationSelector
from .backup_manager import BackupManager
from .engine import SpamFilterEngine

# Package version
__version__ = "1.0.0"

# Export main classes
__all__ = [
    'FilterConfig',
    'ModelClassifier', 
    'QuantizationSelector',
    'BackupManager',
    'SpamFilterEngine',
    'setup_logging'
]


def setup_logging(level: str = "INFO", detailed: bool = True) -> logging.Logger:
    """
    Set up logging configuration for the spam filter
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        detailed: Whether to include detailed formatting
        
    Returns:
        Configured logger instance
    """
    # Convert string level to logging constant
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # Create formatter
    if detailed:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:
        formatter = logging.Formatter('%(levelname)s: %(message)s')
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Return package-specific logger
    return logging.getLogger(__name__)


def validate_model_data(models: List[Dict]) -> List[str]:
    """
    Validate model data structure and return any issues found
    
    Args:
        models: List of model dictionaries to validate
        
    Returns:
        List of validation error messages
    """
    errors = []
    
    if not isinstance(models, list):
        errors.append("Model data must be a list")
        return errors
    
    if not models:
        errors.append("Model data is empty")
        return errors
    
    required_fields = ['modelName', 'fileSize', 'quantFormat']
    optional_fields = ['downloadCount', 'huggingFaceLink', 'directDownloadLink']
    
    for i, model in enumerate(models[:10]):  # Check first 10 models
        if not isinstance(model, dict):
            errors.append(f"Model {i} is not a dictionary")
            continue
        
        # Check required fields
        for field in required_fields:
            if field not in model:
                errors.append(f"Model {i} missing required field: {field}")
            elif not model[field]:
                errors.append(f"Model {i} has empty required field: {field}")
        
        # Validate data types
        if 'fileSize' in model and not isinstance(model['fileSize'], (int, float)):
            errors.append(f"Model {i} fileSize must be numeric")
        
        if 'downloadCount' in model and not isinstance(model['downloadCount'], (int, float)):
            errors.append(f"Model {i} downloadCount must be numeric")
    
    return errors


def get_package_info() -> Dict:
    """
    Get information about the spam filter package
    
    Returns:
        Dictionary with package information
    """
    return {
        'name': 'spam_filter',
        'version': __version__,
        'description': 'GGUF model spam filtering system',
        'components': [
            'FilterConfig - Configuration management',
            'ModelClassifier - Finetuning detection',
            'QuantizationSelector - Variant selection',
            'BackupManager - Data backup utilities'
        ]
    }