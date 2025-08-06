# Requirements Document

## Introduction

This feature adds a "Recent Uploaded" filter option to the existing filter system in the GGUF Model Discovery interface. Users will be able to filter models based on their upload date to Hugging Face, allowing them to discover newly released models more easily. This filter will integrate seamlessly with the existing filter system and work in combination with other filters.

## Requirements

### Requirement 1

**User Story:** As a user browsing models, I want to filter by recently uploaded models, so that I can discover the latest AI models that have been released.

#### Acceptance Criteria

1. WHEN the filter section loads THEN the system SHALL display a "Recent Uploaded" filter dropdown with time-based options
2. WHEN a user selects a recent upload timeframe THEN the system SHALL filter models to show only those uploaded within that timeframe
3. WHEN the recent upload filter is applied THEN it SHALL work in combination with existing filters (quantization, model type, license, hardware)
4. WHEN no models match the recent upload criteria THEN the system SHALL display an appropriate "no results" message
5. WHEN the recent upload filter is cleared THEN the system SHALL return to showing all models (subject to other active filters)

### Requirement 2

**User Story:** As a user, I want multiple time range options for recent uploads, so that I can choose the appropriate timeframe based on my needs.

#### Acceptance Criteria

1. WHEN the recent upload filter dropdown is opened THEN the system SHALL provide options for "Last 7 days", "Last 30 days", "Last 90 days", and "Last 6 months"
2. WHEN a user selects "Last 7 days" THEN the system SHALL show only models uploaded within the past 7 days
3. WHEN a user selects "Last 30 days" THEN the system SHALL show only models uploaded within the past 30 days
4. WHEN a user selects "Last 90 days" THEN the system SHALL show only models uploaded within the past 90 days
5. WHEN a user selects "Last 6 months" THEN the system SHALL show only models uploaded within the past 6 months

### Requirement 3

**User Story:** As a user, I want the recent upload filter to integrate with the existing filter UI, so that it feels like a natural part of the interface.

#### Acceptance Criteria

1. WHEN the recent upload filter is displayed THEN it SHALL use the same styling and layout as existing filters
2. WHEN the recent upload filter is applied THEN it SHALL appear in the active filters display with other applied filters
3. WHEN a user clicks the "X" on the recent upload active filter tag THEN only that filter SHALL be removed
4. WHEN the "Clear All" button is clicked THEN the recent upload filter SHALL be cleared along with other filters
5. WHEN the recent upload filter has an icon THEN it SHALL use a calendar or clock icon to represent time-based filtering

### Requirement 4

**User Story:** As a user, I want the recent upload filter to work efficiently with large datasets, so that filtering remains responsive even with thousands of models.

#### Acceptance Criteria

1. WHEN the recent upload filter is applied THEN the filtering operation SHALL complete within 500ms for datasets up to 50,000 models
2. WHEN multiple filters including recent upload are applied THEN the system SHALL combine filters efficiently without redundant processing
3. WHEN the recent upload filter is used with search THEN both operations SHALL work together without performance degradation
4. WHEN the recent upload filter processes dates THEN it SHALL handle various date formats from the model data correctly
5. WHEN date calculations are performed THEN they SHALL account for timezone differences appropriately

### Requirement 5

**User Story:** As a user on mobile devices, I want the recent upload filter to be touch-friendly and accessible, so that I can use it effectively on smaller screens.

#### Acceptance Criteria

1. WHEN the recent upload filter is displayed on mobile THEN it SHALL have adequate touch targets and spacing
2. WHEN the filter dropdown is opened on mobile THEN the options SHALL be easily selectable with touch input
3. WHEN the recent upload active filter tag is shown on mobile THEN it SHALL be easily tappable for removal
4. WHEN the filter is used on mobile THEN it SHALL maintain the same functionality as desktop
5. WHEN the filter label is displayed on mobile THEN it SHALL remain readable and not be truncated

### Requirement 6

**User Story:** As a developer maintaining the system, I want the recent upload filter to handle edge cases gracefully, so that the application remains stable and user-friendly.

#### Acceptance Criteria

1. WHEN model data lacks upload date information THEN those models SHALL be excluded from recent upload filtering with appropriate logging
2. WHEN invalid date formats are encountered THEN the system SHALL handle them gracefully without breaking the filter
3. WHEN the system clock changes or timezone issues occur THEN the filter SHALL continue to work correctly
4. WHEN no models exist within the selected timeframe THEN the system SHALL display a helpful message suggesting trying a longer timeframe
5. WHEN the recent upload filter is combined with other filters that result in no matches THEN the system SHALL provide clear feedback about which filters are active