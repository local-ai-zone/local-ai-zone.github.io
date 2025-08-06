# Requirements Document

## Introduction

This feature aims to reduce spam in model lists by implementing intelligent filtering that removes finetuned models and keeps only base models plus one appropriately sized quantized version. The goal is to provide users with a cleaner, more focused model selection while maintaining essential variety in model sizes and formats.

## Requirements

### Requirement 1

**User Story:** As a user browsing models, I want to see only base models and their most useful quantized variants, so that I can quickly find relevant models without being overwhelmed by excessive finetuned variations.

#### Acceptance Criteria

1. WHEN the system processes model data THEN it SHALL identify and remove all finetuned models based on naming patterns and metadata
2. WHEN a base model is identified THEN the system SHALL always preserve the original full-precision version (F16/BF16)
3. WHEN selecting quantized variants THEN the system SHALL keep variants that have significant size drops (>5% smaller than previously kept variant) OR are from trusted uploaders
4. WHEN a quantized variant is from a trusted uploader THEN the system SHALL keep it regardless of size similarity if it meets download thresholds
5. WHEN a quantized variant has nearly identical size (within 5%) to an already kept model AND is from a non-trusted uploader AND has low downloads THEN the system SHALL skip it

### Requirement 2

**User Story:** As a developer maintaining the model database, I want the filtering logic to be configurable and reversible, so that I can adjust filtering criteria and restore original data if needed.

#### Acceptance Criteria

1. WHEN filtering is applied THEN the system SHALL create a backup of the original model data
2. WHEN filtering criteria are defined THEN they SHALL be configurable through parameters (size drop threshold, trusted uploaders list, minimum downloads)
3. WHEN the filtering process runs THEN it SHALL provide detailed logging of what was removed and why (size, uploader, downloads)
4. WHEN filtering is complete THEN the system SHALL generate a summary report showing before/after statistics including trusted uploader metrics

### Requirement 3

**User Story:** As a user, I want the filtered model list to maintain model diversity while reducing redundancy, so that I can still access different model sizes and capabilities without excessive variants.

#### Acceptance Criteria

1. WHEN identifying finetuned models THEN the system SHALL use pattern matching on model names to detect common finetuning indicators (instruct, chat, code, etc.)
2. WHEN calculating size differences THEN the system SHALL ensure at least 5% size reduction between kept quantized variants
3. WHEN multiple base models exist for the same architecture THEN the system SHALL preserve each distinct base model
4. WHEN no quantized version meets the size criteria AND none are from trusted uploaders THEN the system SHALL keep only the base model

### Requirement 4

**User Story:** As a user, I want to filter out very small models that are likely not useful for most applications, so that I can focus on models with sufficient capacity for meaningful tasks.

#### Acceptance Criteria

1. WHEN processing model data THEN the system SHALL remove all models with file size under 100MB
2. WHEN a model group has only small models THEN the system SHALL remove the entire group
3. WHEN calculating size differences for quantized versions THEN the system SHALL only consider models that are 100MB or larger
4. WHEN logging filtering results THEN the system SHALL report how many models were removed due to size constraints

### Requirement 5

**User Story:** As a system administrator, I want the filtering process to be automated and integrated with existing data processing workflows, so that model spam reduction happens automatically during data updates.

#### Acceptance Criteria

1. WHEN the filtering script is executed THEN it SHALL integrate with existing model processing pipeline
2. WHEN processing large datasets THEN the system SHALL handle memory efficiently and provide progress indicators
3. WHEN errors occur during filtering THEN the system SHALL log errors and continue processing remaining models
4. WHEN filtering is complete THEN the system SHALL update the main model data file atomically to prevent corruption