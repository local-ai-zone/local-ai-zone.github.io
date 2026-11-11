#!/usr/bin/env python3
"""
Model classification for identifying finetuned vs base models
"""

import re
from typing import Dict, List, Optional
from .config import FilterConfig


class ModelClassifier:
    """Classifies models as finetuned or base models using pattern matching"""
    
    def __init__(self, config: FilterConfig):
        self.config = config
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for efficient matching"""
        # Create case-insensitive patterns for finetuning detection
        self.finetune_patterns = [
            re.compile(rf'\b{pattern}\b', re.IGNORECASE) 
            for pattern in self.config.finetune_patterns
        ]
        
        # Common base model patterns (these are NOT finetuned)
        base_patterns = [
            r'\b(llama|mistral|qwen|deepseek|phi|gemma|falcon|mpt)\b',
            r'\b\d+[bm]\b',  # Size indicators like 7b, 13b, 70b
            r'\bbase\b',
            r'\bfoundation\b'
        ]
        self.base_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in base_patterns]
    
    def is_finetuned(self, model: Dict) -> bool:
        """
        Determine if a model is finetuned based on name and metadata
        
        Args:
            model: Model dictionary with 'modelName' and other metadata
            
        Returns:
            True if model appears to be finetuned, False otherwise
        """
        model_name = (model.get('modelName') or '').lower()
        model_id = (model.get('huggingFaceLink') or '').lower()
        
        # Check for finetuning patterns in model name
        for pattern in self.finetune_patterns:
            if pattern.search(model_name) or pattern.search(model_id):
                return True
        
        # Special case: CodeLlama with instruct/chat is finetuned
        if 'codellama' in model_name and ('instruct' in model_name or 'chat' in model_name):
            return True
        
        # Additional heuristics for finetuning detection
        finetune_indicators = [
            # Training method indicators
            'dpo', 'rlhf', 'sft', 'ppo',
            # Specific use case indicators
            'medical', 'legal', 'finance', 'science',
            # Language-specific variants
            'chinese', 'japanese', 'korean', 'german', 'french',
            # Additional patterns from test cases
            'orca', 'wizard'
        ]
        
        for indicator in finetune_indicators:
            if indicator in model_name or indicator in model_id:
                return True
        
        return False
    
    def is_base_model(self, model: Dict) -> bool:
        """
        Determine if a model is a base/foundation model
        
        Args:
            model: Model dictionary with 'modelName' and other metadata
            
        Returns:
            True if model appears to be a base model, False otherwise
        """
        # If it's clearly finetuned, it's not a base model
        if self.is_finetuned(model):
            return False
        
        model_name = (model.get('modelName') or '').lower()
        model_id = (model.get('huggingFaceLink') or '').lower()
        
        # Check for base model patterns
        for pattern in self.base_patterns:
            if pattern.search(model_name) or pattern.search(model_id):
                return True
        
        # Additional base model indicators
        base_indicators = [
            'base', 'foundation', 'pretrained', 'raw',
            # Original model names without modifications
            'llama-2', 'llama-3', 'mistral-7b', 'qwen', 'deepseek',
            # Size indicators often indicate base models
            '7b', '13b', '70b', '1b', '3b', '8b', '6.7b'
        ]
        
        for indicator in base_indicators:
            if indicator in model_name or indicator in model_id:
                return True
        
        # If no finetuning indicators found, assume it's a base model
        # (conservative approach to avoid removing legitimate base models)
        return True
    
    def get_base_model_group(self, model: Dict) -> str:
        """
        Extract the base model group identifier for grouping similar models
        
        Args:
            model: Model dictionary with 'modelName' and other metadata
            
        Returns:
            Base model group identifier (e.g., 'llama-2-7b', 'mistral-7b')
        """
        model_name = (model.get('modelName') or '').lower()
        
        # Extract base model architecture and size
        base_group = model_name
        
        # Remove common finetuning suffixes
        for pattern in self.config.finetune_patterns:
            base_group = re.sub(rf'\b{pattern}\b.*', '', base_group, flags=re.IGNORECASE)
        
        # Remove version numbers and other modifiers
        base_group = re.sub(r'v\d+\.?\d*', '', base_group)
        base_group = re.sub(r'\b(gguf|ggml)\b', '', base_group)
        base_group = re.sub(r'\b(q\d+_\w+|f16|bf16)\b', '', base_group)
        
        # Clean up whitespace and normalize
        base_group = re.sub(r'\s+', ' ', base_group).strip()
        base_group = re.sub(r'[^\w\s-]', '', base_group)
        
        # If empty after cleaning, use original name
        if not base_group:
            base_group = model_name
        
        return base_group
    
    def extract_model_size(self, model: Dict) -> Optional[str]:
        """
        Extract model size indicator (e.g., '7b', '13b', '70b')
        
        Args:
            model: Model dictionary with 'modelName' and other metadata
            
        Returns:
            Model size string or None if not found
        """
        model_name = (model.get('modelName') or '').lower()
        
        # Look for size patterns
        size_patterns = [
            r'\b(\d+\.?\d*[bm])\b',  # 7b, 13b, 70b, 1.5b, etc.
            r'\b(\d+\.?\d*)\s*billion\b',  # 7 billion
            r'\b(\d+\.?\d*)\s*million\b'   # 100 million
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, model_name)
            if match:
                return match.group(1)
        
        return None