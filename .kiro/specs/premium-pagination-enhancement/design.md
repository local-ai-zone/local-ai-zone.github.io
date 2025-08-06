# Design Document

## Overview

This feature modifies the premium-index.html pagination system to display 48 models per page and changes the default sorting to prioritize most liked models. The implementation focuses on two key changes: updating the `itemsPerPage` constant and modifying the default sort behavior in the PremiumGGUFApp class.

## Architecture

The changes will be made entirely within the existing `js/premium-app.js` file, leveraging the current pagination and sorting infrastructure without requiring new components or major architectural changes.

## Components and Interfaces

### PremiumGGUFApp Class Modifications

**itemsPerPage Property**
- Current value: 18
- New value: 48
- Impact: Affects `renderModels()` pagination calculations

**Default Sorting Logic**
- Current: Sort by `downloadCount` descending
- New: Sort by `likeCount` descending
- Location: `loadModels()` method and `clearAllFilters()` method

**Sort Dropdown Default**
- Current: "downloadCount-desc" (🔥 Most Popular)
- New: "likeCount-desc" (❤️ Most Liked)
- Location: HTML select element and JavaScript initialization

## Data Models

No changes to data models are required. The existing model objects already contain both `downloadCount` and `likeCount` properties needed for the sorting functionality.

## Error Handling

The existing error handling for pagination and sorting will continue to work without modification. The system already handles cases where `likeCount` is undefined by defaulting to 0.

## Testing Strategy

- Verify 48 models display per page on initial load
- Confirm default sorting shows highest liked models first
- Test pagination controls calculate correctly with 48-per-page
- Validate sort dropdown shows "Most Liked" as default selection
- Ensure filter/search operations maintain 48-per-page limit