# Requirements Document

## Introduction

Modify the existing `_fetch_top_models` method in the GGUF fetcher to collect the top 50 most liked models instead of the top 20 most downloaded models, providing better community-endorsed model discovery.

## Requirements

### Requirement 1

**User Story:** As a user discovering models, I want to see the most community-liked models in the dataset, so that I can find models that are genuinely appreciated by the community.

#### Acceptance Criteria

1. WHEN the `_fetch_top_models` method runs THEN the system SHALL fetch the top 50 most liked GGUF models from Hugging Face
2. WHEN the method queries the Hugging Face API THEN the system SHALL sort models by like count in descending order
3. WHEN the method returns results THEN the system SHALL provide 50 models instead of the current 20

### Requirement 2

**User Story:** As a developer running the data collection script, I want the top models section to prioritize engagement over downloads, so that the dataset includes community-endorsed models.

#### Acceptance Criteria

1. WHEN the script calls `_fetch_top_models` THEN the system SHALL use "likes" as the sorting criterion instead of "downloads"
2. WHEN the method processes the API response THEN the system SHALL validate that models have like count data
3. WHEN the method logs statistics THEN the system SHALL report like count ranges instead of download count ranges

### Requirement 3

**User Story:** As a system administrator monitoring the data collection, I want clear logging of the engagement-based collection, so that I can verify the system is working correctly.

#### Acceptance Criteria

1. WHEN the `_fetch_top_models` method runs THEN the system SHALL log that it's fetching "top 50 most liked" models
2. WHEN the method completes THEN the system SHALL log the highest like count among fetched models
3. WHEN the method encounters errors THEN the system SHALL maintain the same error handling as the current implementation