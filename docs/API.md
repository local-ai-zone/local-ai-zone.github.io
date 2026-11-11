# API Documentation

## Overview

The GGUF Model Discovery platform uses a combination of static JSON data and dynamic JavaScript APIs to provide model information and functionality.

## Data API

### Model Data Structure

```typescript
interface GGUFModel {
  modelName: string;           // Display name of the model
  description: string;         // Model description
  quantization: string;        // Quantization type (Q4_0, Q4_K_M, etc.)
  fileSize: number;           // File size in bytes
  downloadCount: number;      // Number of downloads
  likeCount: number;          // Number of likes/stars
  license: string;            // License type
  modelType: string;          // Model category (LLaMA, BERT, etc.)
  downloadUrl: string;        // Direct download URL
  huggingFaceUrl?: string;    // Hugging Face model page URL
  tags?: string[];            // Additional tags
  createdAt?: string;         // Creation timestamp
  updatedAt?: string;         // Last update timestamp
}
```

### Data Endpoints

#### Get All Models
```javascript
// Static JSON endpoint
fetch('./gguf_models.json')
  .then(response => response.json())
  .then(models => {
    // Array of GGUFModel objects
  });
```

#### Model Statistics
```javascript
// Computed from model data
const stats = {
  totalModels: models.length,
  totalDownloads: models.reduce((sum, m) => sum + m.downloadCount, 0),
  totalLikes: models.reduce((sum, m) => sum + m.likeCount, 0),
  lastUpdated: new Date().toISOString()
};
```

## JavaScript API

### Core Application

#### PremiumGGUFApp Class

```javascript
class PremiumGGUFApp {
  constructor();
  
  // Initialization
  async initialize(): Promise<void>;
  
  // Data management
  async loadModels(): Promise<GGUFModel[]>;
  getFilteredModels(): GGUFModel[];
  
  // Search and filtering
  searchModels(query: string): void;
  applyFilters(filters: FilterOptions): void;
  sortModels(sortBy: string, direction: 'asc' | 'desc'): void;
  
  // UI updates
  renderModels(models: GGUFModel[]): void;
  updatePagination(currentPage: number, totalPages: number): void;
  showNotification(message: string, type: 'success' | 'error' | 'info'): void;
}
```

### Services

#### DataService

```javascript
class DataService {
  // Fetch model data
  static async fetchModels(): Promise<GGUFModel[]>;
  
  // Cache management
  static getCachedModels(): GGUFModel[] | null;
  static setCachedModels(models: GGUFModel[]): void;
  static clearCache(): void;
  
  // Statistics
  static getModelStats(models: GGUFModel[]): ModelStats;
}
```

#### FilterService

```javascript
class FilterService {
  // Filter operations
  static filterBySearch(models: GGUFModel[], query: string): GGUFModel[];
  static filterByQuantization(models: GGUFModel[], quantization: string): GGUFModel[];
  static filterByModelType(models: GGUFModel[], modelType: string): GGUFModel[];
  static filterByLicense(models: GGUFModel[], license: string): GGUFModel[];
  
  // Sort operations
  static sortModels(models: GGUFModel[], sortBy: string, direction: string): GGUFModel[];
  
  // Filter options
  static getUniqueQuantizations(models: GGUFModel[]): string[];
  static getUniqueModelTypes(models: GGUFModel[]): string[];
  static getUniqueLicenses(models: GGUFModel[]): string[];
}
```

### Components

#### ModelCard Component

```javascript
class ModelCard {
  constructor(model: GGUFModel);
  
  // Rendering
  render(): HTMLElement;
  
  // Event handlers
  onDownloadClick(event: Event): void;
  onCopyClick(event: Event): void;
  onLikeClick(event: Event): void;
  
  // Updates
  updateEngagementMetrics(likes: number, downloads: number): void;
}
```

#### SearchFilter Component

```javascript
class SearchFilter {
  constructor(container: HTMLElement);
  
  // Initialization
  initialize(): void;
  
  // Event handlers
  onSearchInput(query: string): void;
  onFilterChange(filterType: string, value: string): void;
  onSortChange(sortBy: string, direction: string): void;
  
  // State management
  getActiveFilters(): FilterState;
  clearAllFilters(): void;
}
```

### Utilities

#### Formatters

```javascript
// File size formatting
formatFileSize(bytes: number): string;

// Number formatting
formatNumber(num: number): string;

// Date formatting
formatDate(date: string | Date): string;

// URL validation
isValidUrl(url: string): boolean;
```

#### Engagement Utils

```javascript
// Engagement calculations
calculatePopularityScore(model: GGUFModel): number;
getEngagementLevel(score: number): 'low' | 'medium' | 'high';
formatEngagementMetrics(model: GGUFModel): EngagementMetrics;
```

## Events API

### Custom Events

The application emits custom events for various interactions:

```javascript
// Model selection
document.addEventListener('model:selected', (event) => {
  const model = event.detail.model;
});

// Search performed
document.addEventListener('search:performed', (event) => {
  const query = event.detail.query;
  const results = event.detail.results;
});

// Filter applied
document.addEventListener('filter:applied', (event) => {
  const filters = event.detail.filters;
  const resultCount = event.detail.resultCount;
});

// Model downloaded
document.addEventListener('model:downloaded', (event) => {
  const model = event.detail.model;
});
```

### Event Dispatching

```javascript
// Dispatch custom events
function dispatchModelEvent(eventType, model) {
  const event = new CustomEvent(eventType, {
    detail: { model },
    bubbles: true
  });
  document.dispatchEvent(event);
}
```

## Error Handling

### Error Types

```javascript
class APIError extends Error {
  constructor(message, status, endpoint) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
```

### Error Handling Patterns

```javascript
// Async error handling
async function safeApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API call failed:', error);
    showNotification('Failed to load data. Please try again.', 'error');
    return null;
  }
}

// Validation with error handling
function validateModel(model) {
  if (!model.modelName) {
    throw new ValidationError('Model name is required', 'modelName');
  }
  if (!model.downloadUrl) {
    throw new ValidationError('Download URL is required', 'downloadUrl');
  }
  return true;
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load model data on demand
2. **Virtual Scrolling**: Render only visible items
3. **Debounced Search**: Limit search API calls
4. **Caching**: Cache API responses locally
5. **Pagination**: Limit results per page

### Performance Monitoring

```javascript
// Performance timing
const performanceTimer = {
  start(label) {
    performance.mark(`${label}-start`);
  },
  
  end(label) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label}: ${measure.duration}ms`);
  }
};
```

## Security

### Content Security Policy

The application implements strict CSP headers:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' api.github.com huggingface.co;
```

### Input Sanitization

```javascript
// Sanitize user input
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .substring(0, 100); // Limit length
}

// Validate URLs
function isValidModelUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && 
           (parsed.hostname === 'huggingface.co' || 
            parsed.hostname.endsWith('.huggingface.co'));
  } catch {
    return false;
  }
}
```

## Rate Limiting

### Client-side Rate Limiting

```javascript
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }
  
  recordRequest() {
    this.requests.push(Date.now());
  }
}
```

## Testing API

### Test Utilities

```javascript
// Mock data generation
function generateMockModel(overrides = {}) {
  return {
    modelName: 'test-model',
    description: 'Test model description',
    quantization: 'Q4_0',
    fileSize: 1024 * 1024 * 100, // 100MB
    downloadCount: 1000,
    likeCount: 50,
    license: 'MIT',
    modelType: 'LLaMA',
    downloadUrl: 'https://example.com/model.gguf',
    ...overrides
  };
}

// Test assertions
function assertModelValid(model) {
  assert(model.modelName, 'Model name is required');
  assert(model.downloadUrl, 'Download URL is required');
  assert(typeof model.fileSize === 'number', 'File size must be a number');
}
```

This API documentation provides comprehensive coverage of all the JavaScript APIs, data structures, and integration points in the GGUF Model Discovery platform.