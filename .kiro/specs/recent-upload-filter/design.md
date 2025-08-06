# Design Document

## Overview

The Recent Upload Filter feature adds a time-based filtering capability to the existing GGUF Model Discovery interface. This filter allows users to discover recently uploaded models by filtering based on their upload date to Hugging Face. The feature integrates seamlessly with the existing filter system and maintains the same performance standards.

## Architecture

### Data Layer Enhancement

The current data fetching system already collects `created_at` timestamps from the Hugging Face API and stores them in the raw data file (`data/raw_models_data.json`) in ISO 8601 format (e.g., "2025-08-02T17:31:12+00:00"). However, these dates are not included in the final output. The design will:

1. **Modify Data Processing**: Update the `simplified_gguf_fetcher.py` script to include `created_at` dates in the final JSON output
2. **Data Format**: Use the existing ISO 8601 strings from raw data for consistent parsing
3. **Backward Compatibility**: Ensure existing functionality remains unaffected

### Frontend Filter Integration

The filter will integrate with the existing filter system in `js/premium-app.js`:

1. **Filter UI**: Add a new filter dropdown in the existing filter section
2. **Filter Logic**: Extend the `handleFilter()` method to include date-based filtering
3. **Active Filter Display**: Include recent upload filter in the active filters display

## Components and Interfaces

### 1. Data Structure Enhancement

**Modified Output Schema** (in `gguf_models.json`):
```json
{
  "modelName": "string",
  "quantFormat": "string",
  "fileSize": "number",
  "fileSizeFormatted": "string",
  "modelType": "string",
  "license": "string",
  "downloadCount": "number",
  "likeCount": "number",
  "huggingFaceLink": "string",
  "directDownloadLink": "string",
  "minRamGB": "number",
  "minCpuCores": "number",
  "gpuRequired": "boolean",
  "osSupported": "array",
  "uploadDate": "string (ISO 8601)" // NEW FIELD
}
```

### 2. Backend Data Processing

**Modified `_generate_output()` method**:
- Include `uploadDate` field in the output entry
- Convert `created_at` datetime objects to ISO 8601 strings
- Handle missing or invalid dates gracefully

### 3. Frontend Filter Component

**HTML Structure**:
```html
<div class="filter-group">
    <label for="recent-filter" class="filter-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Recent Uploaded
    </label>
    <select id="recent-filter" class="premium-select">
        <option value="all">All Time</option>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="180">Last 6 months</option>
    </select>
</div>
```

**JavaScript Filter Logic**:
```javascript
// In handleFilter() method
const recentFilter = document.getElementById('recent-filter');
const selectedRecent = recentFilter ? recentFilter.value : 'all';

if (selectedRecent !== 'all') {
    const daysAgo = parseInt(selectedRecent);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    this.filteredModels = this.filteredModels.filter(model => {
        if (!model.uploadDate) return false;
        const uploadDate = new Date(model.uploadDate);
        return uploadDate >= cutoffDate;
    });
}
```

## Data Models

### Enhanced Model Data Structure

```typescript
interface GGUFModel {
    modelName: string;
    quantFormat: string;
    fileSize: number;
    fileSizeFormatted: string;
    modelType: string;
    license: string;
    downloadCount: number;
    likeCount: number;
    huggingFaceLink: string;
    directDownloadLink: string;
    minRamGB: number;
    minCpuCores: number;
    gpuRequired: boolean;
    osSupported: string[];
    uploadDate: string; // ISO 8601 format: "2025-01-15T10:30:00Z"
}
```

### Filter State Management

```typescript
interface FilterState {
    quantization: string;
    modelType: string;
    license: string;
    cpu: string;
    ram: string;
    gpu: string;
    recent: string; // NEW: "all" | "7" | "30" | "90" | "180"
}
```

## Error Handling

### Data Collection Errors

1. **Missing Upload Dates**: Models without `created_at` data will have `uploadDate` set to `null`
2. **Invalid Date Formats**: Malformed dates will be logged and set to `null`
3. **Timezone Handling**: All dates will be normalized to UTC for consistent filtering

### Frontend Error Handling

1. **Invalid Date Parsing**: Gracefully handle models with invalid `uploadDate` values
2. **Filter Fallback**: If date parsing fails, exclude the model from recent filtering
3. **User Feedback**: Display appropriate messages when no models match the selected timeframe

### Error Recovery Strategies

```javascript
// Safe date parsing with fallback
function parseUploadDate(dateString) {
    try {
        if (!dateString) return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        console.warn('Invalid upload date:', dateString);
        return null;
    }
}
```

## Testing Strategy

### Backend Testing

1. **Data Collection Tests**:
   - Verify `uploadDate` field is included in output
   - Test date format consistency (ISO 8601)
   - Validate handling of missing/invalid dates

2. **Integration Tests**:
   - Ensure existing functionality remains unaffected
   - Test with various date formats from Hugging Face API

### Frontend Testing

1. **Filter Functionality Tests**:
   - Test each time range option (7, 30, 90, 180 days)
   - Verify filter combination with existing filters
   - Test edge cases (no models in timeframe, invalid dates)

2. **UI/UX Tests**:
   - Verify filter appears in correct position
   - Test active filter display and removal
   - Validate mobile responsiveness

3. **Performance Tests**:
   - Measure filtering performance with large datasets
   - Test memory usage during date calculations
   - Verify sub-500ms filtering requirement

### Test Cases

```javascript
// Example test cases
describe('Recent Upload Filter', () => {
    test('filters models from last 7 days', () => {
        // Test implementation
    });
    
    test('handles models without upload dates', () => {
        // Test implementation
    });
    
    test('combines with other filters correctly', () => {
        // Test implementation
    });
    
    test('displays appropriate message when no results', () => {
        // Test implementation
    });
});
```

## Performance Considerations

### Date Calculation Optimization

1. **Caching**: Cache cutoff dates to avoid recalculating on each filter operation
2. **Batch Processing**: Process date comparisons efficiently for large datasets
3. **Memory Management**: Minimize object creation during filtering operations

### Implementation Strategy

```javascript
class DateFilterOptimizer {
    constructor() {
        this.cutoffDateCache = new Map();
    }
    
    getCutoffDate(days) {
        if (!this.cutoffDateCache.has(days)) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            this.cutoffDateCache.set(days, cutoff);
        }
        return this.cutoffDateCache.get(days);
    }
    
    clearCache() {
        this.cutoffDateCache.clear();
    }
}
```

## Integration Points

### Existing Filter System Integration

1. **Event Handlers**: Add event listener for the recent filter dropdown
2. **Filter State**: Include recent filter in `clearAllFilters()` method
3. **Active Filters**: Add recent filter to active filter display logic
4. **URL State**: Include recent filter in URL parameter handling (if implemented)

### Styling Integration

The recent upload filter will use the existing CSS classes and styling:
- `.filter-group` for container
- `.filter-label` for label styling
- `.premium-select` for dropdown styling
- Consistent icon styling with other filters

## Accessibility Considerations

1. **ARIA Labels**: Proper labeling for screen readers
2. **Keyboard Navigation**: Full keyboard accessibility for dropdown
3. **Focus Management**: Appropriate focus indicators
4. **Screen Reader Support**: Clear announcements for filter changes

## Future Enhancements

1. **Custom Date Ranges**: Allow users to specify custom date ranges
2. **Relative Date Display**: Show "uploaded X days ago" in model cards
3. **Trending Indicators**: Highlight recently uploaded models with visual indicators
4. **Sort by Upload Date**: Add upload date as a sort option