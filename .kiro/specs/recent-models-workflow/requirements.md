# Requirements Document

## Introduction

This feature modifies the existing GGUF model data collection workflow to expand the coverage of popular models by increasing the number of top liked models fetched from 200 to 1000, while maintaining the existing 90-day recent models collection. This will provide better coverage of both popular established models and recently uploaded models.

## Requirements

### Requirement 1

**User Story:** As a model discovery platform, I want to download models uploaded in the last 90 days AND the top 1000 most liked models (instead of top 200), so that I can provide comprehensive coverage of both recent and popular models.

#### Acceptance Criteria

1. WHEN the workflow runs THEN the system SHALL fetch models uploaded within the last 90 days from Hugging Face
2. WHEN fetching popular models THEN the system SHALL retrieve the top 1000 most liked models instead of the current 200
3. WHEN combining model lists THEN the system SHALL deduplicate models that appear in both recent and top liked lists
4. WHEN processing the model list THEN the system SHALL maintain all existing spam filtering and data processing capabilities
5. WHEN the workflow completes THEN the system SHALL generate the same output format as the current system

### Requirement 2

**User Story:** As a system administrator, I want the workflow to handle the increased data volume efficiently, so that performance remains acceptable despite fetching 5x more popular models.

#### Acceptance Criteria

1. WHEN fetching the top 1000 models THEN the system SHALL use efficient API calls and batch processing
2. WHEN processing the larger dataset THEN the system SHALL maintain reasonable memory usage and processing time
3. WHEN errors occur during model fetching THEN the system SHALL handle failures gracefully and continue processing
4. WHEN the workflow runs THEN the system SHALL complete within acceptable time limits for the increased dataset size

### Requirement 3

**User Story:** As a developer, I want comprehensive logging of the expanded data collection process, so that I can monitor the impact of the increased scope and troubleshoot any issues.

#### Acceptance Criteria

1. WHEN the workflow starts THEN the system SHALL log that it's fetching top 1000 models instead of 200
2. WHEN fetching top models THEN the system SHALL log progress and statistics for the 1000 model retrieval
3. WHEN deduplicating models THEN the system SHALL log how many duplicates were found between recent and top liked lists
4. WHEN the workflow completes THEN the system SHALL provide summary statistics showing recent models, top models, duplicates removed, and final processed count

### Requirement 4

**User Story:** As a content curator, I want the ability to configure the number of top models fetched, so that I can adjust the popular model coverage based on changing needs.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL support configurable parameters for top models count (default 1000)
2. WHEN the system initializes THEN the system SHALL support configurable parameters for days lookback (default 90)
3. WHEN invalid configuration values are provided THEN the system SHALL use default values and log warnings
4. WHEN configuration changes are made THEN the system SHALL apply them in the next workflow run without code changes