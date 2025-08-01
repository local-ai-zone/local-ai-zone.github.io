# Design Document

## Overview

The Model Engagement Metrics feature will extend the existing GGUF Model Discovery system to include like counts from Hugging Face models. This enhancement involves modifying the Python data fetcher to extract engagement metrics from the Hugging Face API and updating the frontend UI to display and filter by these metrics.

## Architecture

### Backend Changes (Python)
- **Data Extraction**: Modify `simplified_gguf_fetcher.py` to extract `likes` from Hugging Face model metadata
- **Data Processing**: Add engagement metrics to the JSON output structure
- **Error Handling**: Gracefully handle missing engagement data with default values

### Frontend Changes (JavaScript/HTML)
- **Data Model**: Extend model data structure to include `likeCount` field
- **UI Components**: Update ModelCard, SearchFilter, and Header components to display engagement metrics
- **Filtering**: Add range filters for like counts
- **Sorting**: Add sorting options for engagement metrics

### Data Flow
1. Python fetcher extracts engagement data from HF API → saves to raw data
2. Processing phase includes engagement metrics in final JSON output
3. Frontend loads enhanced model data with engagement metrics
4. UI displays engagement data in cards, filters, and statistics

## Components and Interfaces

### Backend Components

#### 1. Enhanced Data Extraction (`_save_raw_data` method)
```python
# Extract engagement metrics from detailed model info
model_dict = {
    'id': model_id,
    'downloads': getattr(model, 'downloads', 0),
    'likes': getattr(detailed_model, 'likes', 0),  # NEW
    'tags': getattr(model, 'tags', []),
    'siblings': siblings,
    'cardData': getattr(model, 'cardData', {}),
    'lastModified': getattr(model, 'lastModified', None),
    'created_at': getattr(model, 'created_at', None)
}
```

#### 2. Enhanced Output Generation (`_generate_output` method)
```python
# Add engagement metrics to final output
output_entry = {
    'modelName': model.get('modelName', ''),
    'quantFormat': model.get('quantFormat', 'Unknown'),
    'fileSize': model.get('fileSize', 0),
    'fileSizeFormatted': model.get('fileSizeFormatted', '0 B'),
    'modelType': model.get('modelType', 'Unknown'),
    'license': model.get('license', 'Not specified'),
    'downloadCount': model.get('downloadCount', 0),
    'likeCount': model.get('likeCount', 0),  # NEW
    'huggingFaceLink': model.get('huggingFaceLink', ''),
    'directDownloadLink': model.get('directDownloadLink', '')
}
```

### Frontend Components

#### 1. Enhanced ModelCard Component
```javascript
class ModelCard {
    render() {
        return `
            <div class="model-card">
                <div class="model-header">
                    <h3>${this.data.modelName}</h3>
                    <span class="model-number">#${this.number}</span>
                </div>
                <div class="model-metrics">
                    <div class="metric">
                        <i class="icon-download"></i>
                        <span>${this.formatNumber(this.data.downloadCount)}</span>
                    </div>
                    <div class="metric">
                        <i class="icon-heart"></i>
                        <span>${this.formatNumber(this.data.likeCount)}</span>
                    </div>
                </div>
                <!-- existing card content -->
            </div>
        `;
    }
}
```

#### 2. Enhanced SearchFilter Component
```javascript
class SearchFilter {
    initializeFilters() {
        // Add engagement metric range filters
        this.createRangeFilter('likeCount', 'Likes', 0, this.getMaxLikes());
        // existing filters...
    }
    
    createRangeFilter(field, label, min, max) {
        // Create dual-range slider for engagement metrics
    }
}
```

#### 3. Enhanced Header Component
```javascript
class Header {
    updateStats(totalCount, filteredCount, models) {
        const totalLikes = models.reduce((sum, m) => sum + m.likeCount, 0);
        const avgLikes = (totalLikes / models.length).toFixed(1);
        
        // Display engagement statistics in header
    }
}
```

#### 4. Enhanced FilterService
```javascript
class FilterService {
    filterByEngagement(models, likeRange) {
        return models.filter(model => 
            model.likeCount >= likeRange[0] && model.likeCount <= likeRange[1]
        );
    }
    
    sortByLikes(models, direction) {
        return models.sort((a, b) => {
            const aValue = a.likeCount || 0;
            const bValue = b.likeCount || 0;
            return direction === 'desc' ? bValue - aValue : aValue - bValue;
        });
    }
}
```

## Data Models

### Enhanced Model Data Structure
```javascript
{
  "modelName": "string",
  "quantFormat": "string", 
  "fileSize": "number",
  "fileSizeFormatted": "string",
  "modelType": "string",
  "license": "string", 
  "downloadCount": "number",
  "likeCount": "number",        // NEW
  "huggingFaceLink": "string",
  "directDownloadLink": "string"
}
```

### Enhanced UI State Model
```javascript
{
  searchQuery: "",
  filters: {
    quantFormat: "all",
    modelType: "all", 
    license: "all",
    fileSizeRange: [0, Infinity],
    downloadRange: [0, Infinity],
    likeRange: [0, Infinity]      // NEW
  },
  sorting: {
    field: "downloadCount", // can be "likeCount"
    direction: "desc"
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 50,
    totalItems: 0,
    totalPages: 0
  }
}
```

## User Interface Design

### Enhanced Model Card Layout
```
┌─────────────────────────────────────┐
│ Model Name                    #123  │
├─────────────────────────────────────┤
│ 📥 1.2K  ❤️ 23                   │
│ Q4_K_M • 4.2GB • Apache-2.0        │
│ [Download] [HuggingFace]            │
└─────────────────────────────────────┘
```

### Enhanced Filter Panel
```
Search: [_______________] 🔍
Filters: [Quant▼] [Type▼] [License▼] [Size▼]
Engagement: Likes [0 ═══●═══ 50]
Sort by: [Downloads▼] [Likes] [Name]
```

### Enhanced Header Statistics
```
┌─────────────────────────────────────────────────┐
│ Last Update: 2 hours ago • 🟢 Fresh Data        │
│ 45,231 models • 456K total likes               │
│ Showing 1-50 of 1,234 filtered results         │
└─────────────────────────────────────────────────┘
```

## Error Handling

### Backend Error Handling
- **Missing Engagement Data**: Default to 0 for both stars and likes when API doesn't provide data
- **API Rate Limits**: Implement retry logic with exponential backoff for engagement data fetching
- **Data Validation**: Ensure engagement metrics are non-negative integers

### Frontend Error Handling
- **Missing Metrics**: Display "N/A" or hide engagement metrics when data is unavailable
- **Filter Validation**: Prevent invalid range selections (min > max)
- **Sort Fallback**: Fall back to download count sorting if engagement sorting fails

## Testing Strategy

### Backend Tests
- Test engagement data extraction from HF API responses
- Test handling of models with missing engagement data
- Test JSON output format includes new fields
- Test data processing with various engagement metric values

### Frontend Tests
- Test model card rendering with engagement metrics
- Test engagement metric filtering functionality
- Test sorting by star count and like count
- Test header statistics calculation with engagement data

### Integration Tests
- Test complete data flow from Python extraction to frontend display
- Test filtering combinations including engagement metrics
- Test responsive design with additional metric displays

### Performance Tests
- Test filtering performance with engagement range filters
- Test sorting performance with engagement metrics
- Test memory usage with additional data fields