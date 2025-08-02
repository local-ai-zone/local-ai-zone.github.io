# Design Document

## Overview

This design enhances the existing SimplifiedGGUFetcher class to increase data collection scope from top 50 to top 200 most liked models and from 30 to 90 days for recent models, while maintaining robust deduplication. The design focuses on minimal code changes to existing methods while ensuring performance and reliability.

## Architecture

The enhancement maintains the existing two-phase architecture:

1. **Download Phase**: Enhanced to fetch larger datasets with updated limits
2. **Process Phase**: Unchanged, continues to process the larger dataset efficiently

The core architecture remains the same with modifications only to the data collection parameters and related logging.

## Components and Interfaces

### Modified Components

#### SimplifiedGGUFetcher Class
- **_fetch_recent_models()**: Updated to use 90-day timeframe
- **_fetch_top_models()**: Updated to fetch 200 models instead of 50
- **Logging methods**: Updated to reflect new limits in all messages

#### Configuration Constants
- `RECENT_DAYS_LIMIT`: Changed from 30 to 90
- `TOP_MODELS_LIMIT`: Changed from 50 to 200
- `RECENT_MODELS_API_LIMIT`: Increased from 500 to 1000 to accommodate 90-day window

### Unchanged Components
- Deduplication logic (already handles duplicates by model ID)
- Batch processing with threading
- Error handling and validation
- Output generation and formatting

## Data Models

### Enhanced Data Collection Parameters

```python
# New configuration constants
RECENT_DAYS_LIMIT = 90  # Previously 30
TOP_MODELS_LIMIT = 200  # Previously 50
RECENT_MODELS_API_LIMIT = 1000  # Previously 500
```

### Data Flow

1. **Recent Models Collection**:
   - Calculate 90 days ago from current date
   - Fetch up to 1000 models sorted by creation date
   - Filter to include only models from last 90 days
   - Log updated statistics

2. **Top Models Collection**:
   - Fetch top 200 models sorted by likes
   - Maintain existing sorting and filtering logic
   - Log updated statistics

3. **Deduplication**:
   - Combine both datasets
   - Remove duplicates by model ID (existing logic)
   - Log deduplication statistics

## Error Handling

### Enhanced Error Scenarios

1. **Increased API Load**: 
   - Maintain existing rate limiting and retry logic
   - Monitor for API timeout issues with larger requests
   - Use existing ThreadPoolExecutor with appropriate worker limits

2. **Memory Usage**:
   - Larger datasets may increase memory usage
   - Existing streaming and batch processing should handle this
   - Monitor memory usage during processing

3. **Processing Time**:
   - Longer processing times expected with more data
   - Existing progress logging will provide better visibility
   - Maintain existing timeout and error recovery mechanisms

### Error Recovery
- Maintain existing graceful degradation
- Continue processing if one data source fails
- Preserve existing logging and error reporting

## Testing Strategy

### Unit Tests
1. **Configuration Validation**:
   - Test that new limits are correctly applied
   - Verify date calculations use 90-day window
   - Confirm API calls use updated limits

2. **Deduplication Testing**:
   - Test with overlapping datasets
   - Verify duplicate removal accuracy
   - Test edge cases with identical model IDs

### Integration Tests
1. **End-to-End Data Flow**:
   - Test complete download and process cycle
   - Verify output contains expected number of unique models
   - Test with real API data (limited scope)

2. **Performance Testing**:
   - Measure processing time with larger datasets
   - Monitor memory usage during processing
   - Test API rate limiting behavior

### Validation Tests
1. **Data Quality**:
   - Verify no duplicate models in final output
   - Confirm date ranges are correctly applied
   - Validate engagement metrics are preserved

2. **Logging Verification**:
   - Confirm all log messages reflect new limits
   - Verify statistics are accurate
   - Test error message clarity

## Implementation Details

### Code Changes Required

1. **Constants Definition**:
   ```python
   # Add at class level or module level
   RECENT_DAYS_LIMIT = 90
   TOP_MODELS_LIMIT = 200
   RECENT_MODELS_API_LIMIT = 1000
   ```

2. **_fetch_recent_models() Updates**:
   - Replace hardcoded `30` with `RECENT_DAYS_LIMIT`
   - Update API limit from 500 to `RECENT_MODELS_API_LIMIT`
   - Update all log messages to reference 90 days

3. **_fetch_top_models() Updates**:
   - Replace hardcoded `50` with `TOP_MODELS_LIMIT`
   - Update log messages to reference 200 models

4. **Logging Updates**:
   - Update all hardcoded references to "30 days" and "50 models"
   - Use dynamic references to the constants in log messages

### Performance Considerations

1. **API Efficiency**:
   - Larger API requests may take longer
   - Existing pagination and filtering should handle increased load
   - Monitor for API rate limiting

2. **Memory Management**:
   - Larger datasets will use more memory
   - Existing streaming processing should scale appropriately
   - Consider memory usage monitoring

3. **Processing Time**:
   - Expect proportional increase in processing time
   - Existing progress logging provides visibility
   - Batch processing should scale well

## Deployment Considerations

### Backward Compatibility
- Changes are parameter updates only
- No breaking changes to API or data format
- Existing consumers will receive more data without modification

### Monitoring
- Enhanced logging provides visibility into larger datasets
- Existing error handling and reporting remain functional
- Monitor for performance impacts in production

### Rollback Strategy
- Simple parameter reversion if issues arise
- No database or schema changes required
- Existing backup and recovery processes apply