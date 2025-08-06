# Design Document

## Overview

The model spam reduction system will implement intelligent filtering to reduce clutter in the GGUF model database by removing excessive finetuned variants and keeping only base models plus their most useful quantized versions. The system builds upon the existing model processing pipeline and introduces configurable filtering logic that can identify finetuned models, apply size-based filtering, and maintain model diversity while reducing redundancy.

## Architecture

The spam reduction system follows a pipeline architecture that integrates with the existing model processing workflow:

```
Raw Model Data → Spam Filter → Filtered Model Data → UI Display
     ↑                ↓
Backup System ← Processing Reports
```

### Core Components

1. **Spam Filter Engine**: Main filtering logic that processes model data
2. **Model Classifier**: Identifies finetuned vs base models using pattern matching
3. **Quantization Selector**: Chooses optimal quantized variants based on size and popularity
4. **Configuration Manager**: Handles filtering parameters and settings
5. **Backup System**: Creates and manages data backups
6. **Report Generator**: Produces filtering statistics and summaries

## Components and Interfaces

### SpamFilterEngine

The main orchestrator that coordinates the filtering process:

```python
class SpamFilterEngine:
    def __init__(self, config: FilterConfig):
        self.config = config
        self.classifier = ModelClassifier()
        self.selector = QuantizationSelector(config)
        self.backup_manager = BackupManager()
        self.reporter = ReportGenerator()
    
    def filter_models(self, models: List[Dict]) -> FilterResult:
        # Main filtering pipeline:
        # 1. Remove small models (< 100MB)
        # 2. Remove finetuned models
        # 3. Group by base model
        # 4. For each group: keep base + filtered quantized variants
        pass
    
    def group_models_by_base(self, models: List[Dict]) -> Dict[str, List[Dict]]:
        # Group models by their base architecture/name
        pass
    
    def create_backup(self, models: List[Dict]) -> str:
        # Create backup before filtering
        pass
    
    def generate_report(self, original: List[Dict], filtered: List[Dict]) -> Dict:
        # Generate filtering statistics
        pass
```

### ModelClassifier

Identifies finetuned models using pattern matching and metadata analysis:

```python
class ModelClassifier:
    FINETUNE_PATTERNS = [
        'instruct', 'chat', 'code', 'alpaca', 'vicuna', 'wizard',
        'orca', 'dolphin', 'airoboros', 'guanaco', 'openassistant'
    ]
    
    def is_finetuned(self, model: Dict) -> bool:
        # Check model name and metadata for finetuning indicators
        pass
    
    def is_base_model(self, model: Dict) -> bool:
        # Identify base/foundation models
        pass
    
    def get_base_model_group(self, model: Dict) -> str:
        # Group models by their base architecture
        pass
```

### QuantizationSelector

Selects optimal quantized variants using sophisticated filtering based on size differences, uploader trust, and download counts:

```python
class QuantizationSelector:
    TRUSTED_UPLOADERS = [
        'TheBloke', 'lmstudio', 'ggml-org', 'koboldai', 
        'NousResearch', 'abacaj', 'OpenAccessAI'
    ]
    
    def select_variants_for_group(self, base_model: Dict, variants: List[Dict]) -> List[Dict]:
        # Main selection logic for a model group
        # Always keep base model, then filter quantized variants
        pass
    
    def filter_quantized_variants(self, variants: List[Dict]) -> List[Dict]:
        # Sort by size descending and apply filtering criteria
        pass
    
    def should_keep_variant(self, variant: Dict, kept_variants: List[Dict]) -> bool:
        # Check if variant meets keeping criteria based on size, uploader, downloads
        pass
    
    def has_significant_size_drop(self, variant: Dict, last_kept: Dict, threshold: float = 0.05) -> bool:
        # Check if variant is >5% smaller than last kept variant
        pass
    
    def is_trusted_uploader(self, model: Dict) -> bool:
        # Check if model is from a trusted uploader
        pass
    
    def meets_download_threshold(self, model: Dict, min_downloads: int = 100) -> bool:
        # Check if model meets minimum download requirement
        pass
    
    def extract_uploader_from_model_id(self, model_id: str) -> str:
        # Extract uploader name from Hugging Face model ID
        pass
```

### FilterConfig

Configuration management for filtering parameters:

```python
@dataclass
class FilterConfig:
    min_size_bytes: int = 100 * 1024 * 1024  # 100MB minimum
    size_drop_threshold: float = 0.05  # 5% minimum size reduction to keep variant
    min_downloads: int = 100  # Minimum downloads for non-trusted uploaders
    trusted_uploaders: List[str] = field(default_factory=lambda: [
        'TheBloke', 'lmstudio', 'ggml-org', 'koboldai', 
        'NousResearch', 'abacaj', 'OpenAccessAI'
    ])
    finetune_patterns: List[str] = field(default_factory=lambda: [
        'instruct', 'chat', 'code', 'alpaca', 'vicuna', 'wizard',
        'orca', 'dolphin', 'airoboros', 'guanaco', 'openassistant'
    ])
    backup_enabled: bool = True
    detailed_logging: bool = True
```

## Data Models

### FilterResult

Result object containing filtered data and metadata:

```python
@dataclass
class FilterResult:
    filtered_models: List[Dict]
    original_count: int
    filtered_count: int
    removed_count: int
    backup_path: Optional[str]
    processing_report: Dict
    errors: List[str]
```

### ProcessingReport

Detailed statistics about the filtering process:

```python
@dataclass
class ProcessingReport:
    total_processed: int
    finetuned_removed: int
    small_models_removed: int
    quantization_variants_removed: int
    variants_removed_by_size: int
    variants_removed_by_uploader: int
    variants_removed_by_downloads: int
    base_models_kept: int
    quantized_variants_kept: int
    trusted_uploader_variants_kept: int
    size_reduction_mb: int
    processing_time_seconds: float
    model_group_stats: Dict[str, Dict[str, int]]  # group -> {original: X, kept: Y}
```

## Error Handling

The system implements comprehensive error handling at multiple levels:

### Input Validation
- Validate model data structure and required fields
- Handle missing or malformed model metadata
- Gracefully skip models with incomplete data

### Processing Errors
- Continue processing if individual models fail
- Log detailed error information for debugging
- Maintain processing statistics even with errors

### File System Errors
- Handle backup creation failures gracefully
- Implement atomic file operations to prevent corruption
- Provide rollback capability if filtering fails

### Memory Management
- Process models in batches for large datasets
- Implement progress tracking for long-running operations
- Clean up temporary data structures

## Testing Strategy

### Unit Tests
- **ModelClassifier Tests**: Verify finetuning detection accuracy with various model names and patterns
- **QuantizationSelector Tests**: Test size calculation and variant selection logic
- **FilterConfig Tests**: Validate configuration parsing and validation
- **Error Handling Tests**: Ensure graceful handling of malformed data

### Integration Tests
- **End-to-End Filtering**: Test complete filtering pipeline with sample datasets
- **Backup and Restore**: Verify backup creation and data integrity
- **Performance Tests**: Measure processing time with large model datasets
- **Configuration Tests**: Test different filtering configurations

### Test Data
- Create representative test datasets with various model types
- Include edge cases: very small models, models without quantization, malformed data
- Test with real model data samples to validate pattern matching

### Validation Tests
- **Before/After Comparison**: Verify filtering results meet requirements
- **Data Integrity**: Ensure no corruption of kept models
- **Reversibility**: Test backup and restore functionality
- **Report Accuracy**: Validate processing statistics and reports

## Implementation Phases

### Phase 1: Core Filtering Logic
- Implement ModelClassifier with pattern matching
- Create QuantizationSelector with size-based selection
- Basic FilterConfig and error handling

### Phase 2: Integration and Backup
- Integrate with existing model processing pipeline
- Implement backup system and atomic operations
- Add comprehensive logging and progress tracking

### Phase 3: Reporting and Configuration
- Create detailed processing reports
- Add configurable filtering parameters
- Implement validation and testing framework

### Phase 4: Optimization and Polish
- Performance optimization for large datasets
- Enhanced error handling and recovery
- Documentation and user guides