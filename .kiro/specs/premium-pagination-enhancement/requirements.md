# Requirements Document

## Introduction

This feature enhances the premium-index.html page to display 48 model cards per page instead of the current 18, and changes the default sorting behavior to prioritize most liked models rather than most downloaded models. This improvement aims to provide better content discovery by showcasing community-preferred models while displaying more content per page for improved user experience.

## Requirements

### Requirement 1

**User Story:** As a user browsing the premium model discovery page, I want to see 48 model cards per page instead of 18, so that I can view more models without frequent pagination.

#### Acceptance Criteria

1. WHEN the premium-index.html page loads THEN the system SHALL display 48 model cards per page
2. WHEN pagination is active THEN each page SHALL contain exactly 48 model cards (except the last page which may contain fewer)
3. WHEN the user navigates between pages THEN the 48-per-page limit SHALL be maintained consistently
4. WHEN filters or search are applied THEN the 48-per-page limit SHALL still apply to the filtered results

### Requirement 2

**User Story:** As a user discovering new models, I want the default sorting to show the most liked models first, so that I can easily find community-recommended models.

#### Acceptance Criteria

1. WHEN the premium-index.html page loads THEN the system SHALL sort models by like count in descending order by default
2. WHEN no explicit sort option is selected THEN the system SHALL maintain the most-liked-first sorting
3. WHEN the page is refreshed or reloaded THEN the system SHALL default back to most-liked-first sorting
4. WHEN the user clears all filters THEN the system SHALL reset to most-liked-first sorting
5. WHEN the sort dropdown is displayed THEN "❤️ Most Liked" SHALL be the selected default option

### Requirement 3

**User Story:** As a user, I want the pagination controls to accurately reflect the new 48-per-page structure, so that I can navigate efficiently through the larger page sizes.

#### Acceptance Criteria

1. WHEN pagination controls are displayed THEN they SHALL calculate page numbers based on 48 items per page
2. WHEN the results count is shown THEN it SHALL accurately reflect the current page range (e.g., "Showing 1-48 of 3,147 models")
3. WHEN navigating to the last page THEN the system SHALL handle partial pages correctly (e.g., if 3,147 total models, last page shows models 3,121-3,147)
4. WHEN the total model count changes due to filtering THEN pagination SHALL recalculate based on the filtered count and 48-per-page limit