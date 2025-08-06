# Requirements Document

## Introduction

This feature enhances the existing GGUF model data extraction system to increase the scope of data collection and improve data quality. The current system fetches the top 50 most liked models and models from the last 30 days. This enhancement will expand the collection to top 200 most liked models and models from the last 90 days, while implementing deduplication to ensure no repeated models in the final dataset.

## Requirements

### Requirement 1

**User Story:** As a website administrator, I want to collect data from the top 200 most liked models instead of top 50, so that I can provide users with a more comprehensive selection of popular models.

#### Acceptance Criteria

1. WHEN the data extraction process runs THEN the system SHALL fetch the top 200 most liked GGUF models instead of the current 50
2. WHEN fetching top liked models THEN the system SHALL sort models by likes in descending order
3. WHEN the top liked models are retrieved THEN the system SHALL log the updated count and highest like count for verification

### Requirement 2

**User Story:** As a website administrator, I want to collect models from the last 90 days instead of 30 days, so that I can capture more recently updated models for users.

#### Acceptance Criteria

1. WHEN the data extraction process runs THEN the system SHALL fetch models created or updated in the last 90 days instead of 30 days
2. WHEN calculating the date range THEN the system SHALL use 90 days ago from the current date as the cutoff
3. WHEN filtering recent models THEN the system SHALL include all models with created_at or lastModified dates within the 90-day window
4. WHEN logging recent models summary THEN the system SHALL display "90 days" instead of "30 days" in all log messages

### Requirement 3

**User Story:** As a website administrator, I want to ensure no duplicate models appear in the final dataset, so that the website displays unique models without redundancy.

#### Acceptance Criteria

1. WHEN combining top liked models and recent models THEN the system SHALL deduplicate models by their unique model ID
2. WHEN a model appears in both the top liked and recent models lists THEN the system SHALL keep only one instance of that model
3. WHEN deduplication is complete THEN the system SHALL log the number of duplicates removed
4. WHEN processing the final dataset THEN the system SHALL ensure each model ID appears only once

### Requirement 4

**User Story:** As a website administrator, I want the system to handle the increased data volume efficiently, so that performance remains acceptable despite the larger dataset.

#### Acceptance Criteria

1. WHEN fetching the increased number of models THEN the system SHALL maintain reasonable processing times
2. WHEN processing 200 top models and 90 days of recent models THEN the system SHALL use batch processing with appropriate threading
3. WHEN API rate limits are encountered THEN the system SHALL handle them gracefully without failing
4. WHEN logging progress THEN the system SHALL provide clear feedback about the processing status

### Requirement 5

**User Story:** As a developer, I want the configuration changes to be easily maintainable, so that future adjustments to limits and timeframes can be made efficiently.

#### Acceptance Criteria

1. WHEN updating the limits THEN the system SHALL use clear variable names and constants for the new values
2. WHEN the system runs THEN all log messages SHALL reflect the updated limits (200 models, 90 days)
3. WHEN errors occur THEN the system SHALL provide clear error messages that reference the correct limits
4. WHEN the system completes THEN the summary statistics SHALL accurately reflect the new data collection scope