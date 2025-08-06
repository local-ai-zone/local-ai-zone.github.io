# Requirements Document

## Introduction

This feature involves completely integrating the spam filtering system from `reduce_model_spam.py` into the `simplified_gguf_fetcher.py` script. The goal is to replace the current basic filtering logic in the fetcher with the comprehensive spam reduction system, while preserving all the data downloading and Hugging Face extraction functionality. This will consolidate the two scripts into one unified tool that downloads, processes, and filters GGUF models in a single workflow.

## Requirements

### Requirement 1

**User Story:** As a developer running the GGUF fetcher, I want the complete spam filtering system integrated into the processing phase, so that I get a fully filtered dataset without needing to run separate scripts.

#### Acceptance Criteria

1. WHEN the process_data method is called THEN the system SHALL replace the current _filter_gguf_models method with the complete spam filtering engine
2. WHEN spam filtering is applied THEN the system SHALL use all filtering components from reduce_model_spam.py including the engine, classifier, and backup manager
3. WHEN spam filtering completes THEN the system SHALL log comprehensive filtering statistics and generate detailed reports
4. WHEN the integration is complete THEN the system SHALL maintain all existing data downloading and Hugging Face API functionality unchanged

### Requirement 2

**User Story:** As a developer, I want all spam filtering configuration options available through command line arguments, so that I can control all aspects of the filtering process.

#### Acceptance Criteria

1. WHEN running the fetcher script THEN the system SHALL accept all command line arguments that were available in reduce_model_spam.py
2. WHEN spam filtering arguments are provided THEN the system SHALL pass them to the integrated FilterConfig
3. WHEN no spam filtering arguments are provided THEN the system SHALL use the same default values as reduce_model_spam.py
4. IF invalid configuration values are provided THEN the system SHALL validate using the existing FilterConfig validation logic

### Requirement 3

**User Story:** As a developer, I want the option to disable spam filtering entirely, so that I can get the raw processed dataset when needed for debugging or analysis.

#### Acceptance Criteria

1. WHEN a disable-spam-filter flag is provided THEN the system SHALL skip the spam filtering engine entirely
2. WHEN spam filtering is disabled THEN the system SHALL only apply basic GGUF file detection without any quality filtering
3. WHEN spam filtering is disabled THEN the system SHALL log that advanced filtering was skipped
4. WHEN spam filtering is disabled THEN the system SHALL still process all GGUF files and extract model information

### Requirement 4

**User Story:** As a developer, I want automatic backup functionality integrated into the fetcher, so that I have recovery options without running separate backup commands.

#### Acceptance Criteria

1. WHEN spam filtering is enabled THEN the system SHALL use the integrated backup manager to create backups
2. WHEN backup creation is requested THEN the system SHALL create backups using the same logic as reduce_model_spam.py
3. WHEN backup is disabled via configuration THEN the system SHALL skip backup creation entirely
4. WHEN backup operations occur THEN the system SHALL log backup status and file paths

### Requirement 5

**User Story:** As a developer, I want comprehensive logging and reporting of the entire process, so that I can monitor both data collection and filtering performance.

#### Acceptance Criteria

1. WHEN the integrated system runs THEN the system SHALL maintain all existing download and processing logs
2. WHEN spam filtering runs THEN the system SHALL generate the same detailed reports as reduce_model_spam.py
3. WHEN verbose logging is enabled THEN the system SHALL provide detailed information about both data collection and filtering decisions
4. WHEN the process completes THEN the system SHALL provide a unified summary covering download, processing, and filtering statistics

### Requirement 6

**User Story:** As a developer, I want the reduce_model_spam.py script functionality to be completely absorbed into the fetcher, so that I have a single unified tool for the entire workflow.

#### Acceptance Criteria

1. WHEN the integration is complete THEN the system SHALL include all spam_filter module imports and dependencies
2. WHEN the integration is complete THEN the system SHALL include all filtering logic including classifier, engine, and configuration components
3. WHEN the integration is complete THEN the system SHALL preserve all existing command line interface options from both scripts
4. WHEN the integration is complete THEN the reduce_model_spam.py script SHALL become redundant as all its functionality is available in the fetcher