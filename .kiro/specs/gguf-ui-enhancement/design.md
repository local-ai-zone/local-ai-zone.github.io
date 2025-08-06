# Design Document

## Overview

The enhanced GGUF Model Discovery UI will be a modern, responsive web interface optimized for browsing large datasets (40,000-100,000 models) with efficient pagination, comprehensive search/filtering, and clear data presentation. The design focuses on performance, usability, and displaying all model metadata in an organized manner.

## Architecture

### Frontend Architecture
- **Modular JavaScript architecture** with files limited to 500 lines maximum
- **Component-based structure** with single-responsibility classes
- **State management** using a simple centralized state object
- **Virtual pagination** to handle large datasets efficiently
- **Debounced search** and real-time filtering

### File Structure
```
js/
├── main.js              (~100 lines) - App initialization
├── state/
│   └── AppState.js      (~200 lines) - Centralized state management
├── components/
│   ├── Header.js        (~150 lines) - Header with update info
│   ├── SearchFilter.js  (~300 lines) - Search and filter controls
│   ├── ModelCard.js     (~200 lines) - Individual model card
│   ├── ModelGrid.js     (~250 lines) - Grid container and rendering
│   └── Pagination.js    (~200 lines) - Page navigation
├── services/
│   ├── DataService.js   (~300 lines) - Data loading and caching
│   └── FilterService.js (~400 lines) - Search/filter logic
└── utils/
    ├── formatters.js    (~150 lines) - Data formatting utilities
    └── helpers.js       (~200 lines) - General helper functions
```

### Data Flow
1. Load JSON data from `gguf_models.json` on page initialization
2. Apply default sorting (downloadCount descending)
3. Process search/filter queries in memory
4. Paginate results (50 per page)
5. Render model cards with sequential numbering

## Components and Interfaces

### Component Responsibilities (Max 500 lines each)

#### 1. Header.js (~150 lines)
```javascript
class Header {
  // Displays last update time and data freshness
  // Shows total model count and current filter status
  render() { /* Render header HTML */ }
  updateStats(totalCount, filteredCount) { /* Update counters */ }
}
```

#### 2. SearchFilter.js (~300 lines)
```javascript
class SearchFilter {
  // Handles search input and all filter controls
  // Emits events for state changes
  initializeFilters() { /* Setup filter dropdowns */ }
  handleSearch(query) { /* Process search input */ }
  handleFilterChange(type, value) { /* Process filter changes */ }
}
```

#### 3. ModelCard.js (~200 lines)
```javascript
class ModelCard {
  constructor(modelData, sequentialNumber) {
    this.data = modelData;
    this.number = sequentialNumber;
  }
  render() { /* Generate card HTML */ }
  bindEvents() { /* Attach click handlers */ }
}
```

#### 4. ModelGrid.js (~250 lines)
```javascript
class ModelGrid {
  // Manages grid container and card rendering
  // Handles responsive layout
  renderCards(models, startIndex) { /* Render 50 cards */ }
  updateLayout() { /* Handle responsive changes */ }
  clearGrid() { /* Clear current cards */ }
}
```

#### 5. Pagination.js (~200 lines)
```javascript
class Pagination {
  // Handles page navigation and numbering
  // Shows: [< Prev] [1] [2] [3] ... [Next >]
  render(currentPage, totalPages) { /* Generate pagination */ }
  handlePageChange(page) { /* Navigate to page */ }
}
```

#### 6. DataService.js (~300 lines)
```javascript
class DataService {
  // Handles data loading and caching
  async loadModels() { /* Load JSON data */ }
  getLastUpdateTime() { /* Extract update timestamp */ }
  cacheData(data) { /* Cache for performance */ }
}
```

#### 7. FilterService.js (~400 lines)
```javascript
class FilterService {
  // Core search and filter logic
  searchModels(models, query) { /* Text search */ }
  filterByQuantization(models, format) { /* Filter logic */ }
  filterByType(models, type) { /* Filter logic */ }
  sortModels(models, field, direction) { /* Sort logic */ }
}
```

#### 8. AppState.js (~200 lines)
```javascript
class AppState {
  // Centralized state management
  constructor() { this.state = { /* initial state */ }; }
  updateState(changes) { /* Update and notify */ }
  subscribe(callback) { /* Event subscription */ }
}
```

## Data Models

### Model Data Structure
```javascript
{
  "modelName": "string",
  "quantFormat": "string", 
  "fileSize": "number",
  "fileSizeFormatted": "string",
  "modelType": "string",
  "license": "string", 
  "downloadCount": "number",
  "huggingFaceLink": "string",
  "directDownloadLink": "string"
}
```

### UI State Model
```javascript
{
  searchQuery: "",
  filters: {
    quantFormat: "all",
    modelType: "all", 
    license: "all",
    fileSizeRange: [0, Infinity],
    downloadRange: [0, Infinity]
  },
  sorting: {
    field: "downloadCount",
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

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Header: Last Update • Data Freshness • Count   │
├─────────────────────────────────────────────────┤
│ Search: [_______________] 🔍                    │
│ Filters: [Quant▼] [Type▼] [License▼] [Size▼]   │
├─────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ #1  │ │ #2  │ │ #3  │ │ #4  │ │ #5  │        │
│ │Card │ │Card │ │Card │ │Card │ │Card │        │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
│ ... (10 rows × 5 cards = 50 per page)          │
├─────────────────────────────────────────────────┤
│ Pagination: [<] [1][2][3]...[999] [>]          │
└─────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Desktop (1200px+)**: 5 cards per row
- **Tablet (768px-1199px)**: 3 cards per row  
- **Mobile (320px-767px)**: 1-2 cards per row

### Color Scheme
- **Primary**: Blue (#3B82F6) for actions and links
- **Secondary**: Gray (#6B7280) for text and borders
- **Success**: Green (#10B981) for fresh data indicator
- **Warning**: Yellow (#F59E0B) for stale data
- **Error**: Red (#EF4444) for very old data

## Error Handling

### Data Loading Errors
- Display fallback message if JSON fails to load
- Show retry button for network errors
- Graceful degradation for partial data

### Search/Filter Errors
- Handle empty results with helpful messaging
- Validate filter inputs and show constraints
- Reset filters if invalid combinations occur

### Performance Safeguards
- Debounce search input (300ms delay)
- Limit concurrent filter operations
- Show loading states for heavy operations

## Testing Strategy

### Unit Tests
- Test DataManager search/filter/sort functions
- Test pagination calculations
- Test component rendering logic

### Integration Tests  
- Test search + filter combinations
- Test pagination with different dataset sizes
- Test responsive layout across devices

### Performance Tests
- Load testing with 100,000 model dataset
- Search performance benchmarks
- Memory usage monitoring during filtering

### User Acceptance Tests
- Test complete user workflows (search → filter → paginate)
- Verify all model data fields display correctly
- Test mobile usability and touch interactions