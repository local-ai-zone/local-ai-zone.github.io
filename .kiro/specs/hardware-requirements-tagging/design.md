# Design Document

## Overview

The hardware requirements tagging system will extend the existing model processing pipeline to automatically calculate and add hardware requirement fields to each model's data structure. The system will analyze model characteristics including file size, quantization format, and inferred parameter count to generate accurate hardware requirements that help users select compatible models.

## Architecture

The hardware requirements system will be implemented as a new component that integrates with the existing spam filter pipeline. It will process models after the spam filtering stage and before final output generation.

### Integration Points

1. **Spam Filter Engine Integration**: The hardware requirements calculator will be called from the `SpamFilterEngine` after model filtering is complete
2. **Model Data Enhancement**: Hardware requirement fields will be added to the existing model JSON structure
3. **Configuration System**: Hardware calculation parameters will be configurable through the existing `FilterConfig` system

### Data Flow

```
Raw Models → Spam Filter → Hardware Requirements Calculator → Enhanced Models → JSON Output
```

## Components and Interfaces

### HardwareRequirementsCalculator

Primary component responsible for calculating hardware requirements for individual models.

```python
class HardwareRequirementsCalculator:
    def __init__(self, config: FilterConfig):
        """Initialize with configuration parameters"""
        
    def calculate_requirements(self, model: Dict) -> Dict:
        """Calculate hardware requirements for a single model"""
        
    def estimate_parameters(self, model: Dict) -> Optional[int]:
        """Estimate parameter count from model name and file size"""
        
    def calculate_ram_requirements(self, file_size: int, quant_format: str) -> int:
        """Calculate minimum RAM requirements"""
        
    def calculate_cpu_requirements(self, estimated_params: Optional[int], file_size: int) -> int:
        """Calculate minimum CPU core requirements"""
        
    def determine_gpu_requirement(self, estimated_params: Optional[int], file_size: int, quant_format: str) -> bool:
        """Determine if GPU is required for good performance"""
        
    def get_os_support(self, model: Dict) -> List[str]:
        """Determine supported operating systems"""
```

### Configuration Extensions

Extend the existing `FilterConfig` class to include hardware calculation parameters:

```python
@dataclass
class FilterConfig:
    # ... existing fields ...
    
    # Hardware calculation parameters
    ram_multiplier: float = 2.0  # Base RAM multiplier (2x file size)
    quantization_ram_reduction: float = 0.3  # RAM reduction for 4-bit quant
    small_model_threshold: int = 2_000_000_000  # 2B parameters
    medium_model_threshold: int = 7_000_000_000  # 7B parameters
    large_model_threshold: int = 13_000_000_000  # 13B parameters
    gpu_required_threshold: int = 13_000_000_000  # 13B parameters
    default_os_support: List[str] = field(default_factory=lambda: ["Windows", "Linux", "macOS"])
```

### Parameter Estimation Logic

Since parameter counts are not directly available in the model data, the system will use heuristics to estimate them:

1. **Name-based Detection**: Extract parameter information from model names (e.g., "7B", "13B", "70B")
2. **Size-based Estimation**: Use file size and quantization format to estimate parameters
3. **Fallback Logic**: Use conservative estimates when parameter count cannot be determined

## Data Models

### Enhanced Model Structure

The existing model JSON structure will be extended with hardware requirement fields:

```json
{
  "modelName": "Example Model 7B",
  "quantFormat": "Q4_K_M",
  "fileSize": 4000000000,
  "fileSizeFormatted": "3.7 GB",
  "modelType": "Unknown",
  "license": "Not specified",
  "downloadCount": 1500,
  "likeCount": 25,
  "huggingFaceLink": "https://...",
  "directDownloadLink": "https://...",
  
  // New hardware requirement fields
  "minCpuCores": 6,
  "minRamGB": 8,
  "gpuRequired": false,
  "osSupported": ["Windows", "Linux", "macOS"]
}
```

### Hardware Requirements Schema

```python
@dataclass
class HardwareRequirements:
    min_cpu_cores: int
    min_ram_gb: int
    gpu_required: bool
    os_supported: List[str]
```

## Error Handling

### Graceful Degradation

When hardware requirements cannot be calculated accurately:

1. **Missing Parameter Count**: Use conservative estimates based on file size
2. **Unknown Quantization**: Assume no quantization benefits for RAM calculation
3. **Calculation Errors**: Log errors and use safe default values
4. **Invalid Model Data**: Skip hardware calculation and log warning

### Default Values

When calculation fails completely, use these conservative defaults:
- `minCpuCores`: 8 (safe for most models)
- `minRamGB`: File size in GB × 3 (conservative multiplier)
- `gpuRequired`: true (conservative assumption)
- `osSupported`: ["Windows", "Linux", "macOS"]

### Error Logging

All calculation errors and fallbacks will be logged with appropriate detail levels:
- INFO: Successful calculations with parameter estimates
- WARNING: Fallback to default values due to missing data
- ERROR: Calculation failures requiring manual review

## Testing Strategy

### Unit Tests

1. **Parameter Estimation Tests**: Verify parameter extraction from model names
2. **RAM Calculation Tests**: Test RAM calculations with various file sizes and quantization formats
3. **CPU Requirement Tests**: Verify CPU core assignments based on parameter counts
4. **GPU Requirement Tests**: Test GPU requirement logic for different model sizes
5. **Error Handling Tests**: Verify graceful handling of invalid or missing data

### Integration Tests

1. **Pipeline Integration**: Test hardware requirements calculation within the spam filter pipeline
2. **Configuration Tests**: Verify configuration parameter effects on calculations
3. **Output Format Tests**: Ensure hardware requirements are properly added to JSON output

### Test Data

Create test models with known characteristics:
- Small quantized models (Q4_K_M, <2B parameters)
- Medium models (7B parameters, various quantizations)
- Large models (13B+ parameters)
- Models with missing or invalid data

### Performance Tests

1. **Calculation Speed**: Ensure hardware requirements don't significantly slow model processing
2. **Memory Usage**: Verify minimal memory overhead for calculations
3. **Batch Processing**: Test performance with large model datasets