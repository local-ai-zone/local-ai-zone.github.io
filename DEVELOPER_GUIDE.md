# 🛠️ Developer Guide - GGUF Model Index

A comprehensive guide for developers working on the GGUF Model Index application.

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Build**: Vite (for development)
- **Module System**: ES6 Modules

### Design Principles
- **Accessibility First**: WCAG 2.1 AA compliance
- **Performance Optimized**: Virtual scrolling, lazy loading
- **Progressive Enhancement**: Works without JavaScript (basic functionality)
- **Mobile First**: Responsive design approach
- **Error Resilient**: Comprehensive error handling

## 📁 Project Structure

```
gguf-model-index/
├── src/
│   ├── components/              # UI Components
│   │   ├── Header.js           # Application header
│   │   ├── FilterButton.js     # Filter toggle button
│   │   ├── FilterPanel.js      # Advanced filtering interface
│   │   ├── ModelGrid.js        # Virtual scrolling grid
│   │   ├── ModelCard.js        # Individual model display
│   │   └── VirtualScrollGrid.js # Virtual scrolling implementation
│   ├── services/               # Business Logic
│   │   ├── DataService.js      # Data loading and processing
│   │   ├── FilterService.js    # Filtering logic
│   │   └── FilterStateManager.js # URL state management
│   ├── utils/                  # Utility Functions
│   │   ├── errorHandler.js     # Error management
│   │   ├── keyboardNavigation.js # Accessibility navigation
│   │   ├── loadingStateManager.js # Loading states
│   │   ├── performanceMonitor.js # Performance tracking
│   │   ├── lazyLoader.js       # Code splitting utilities
│   │   ├── debounce.js         # Debouncing utility
│   │   └── performance.js      # Performance utilities
│   ├── index.html              # Main HTML file
│   └── main.js                 # Application entry point
├── tests/                      # Test files (*.test.js)
├── docs/                       # Documentation
├── performance-test.js         # Performance validation
├── accessibility-test.js       # Accessibility validation
├── bundle-analysis.js          # Bundle size analysis
├── final-validation.js         # Complete validation suite
├── package.json               # Dependencies and scripts
├── vitest.config.js           # Test configuration
└── tailwind.config.js         # Styling configuration
```

## 🧩 Component Architecture

### Component Pattern
All components follow a consistent pattern:

```javascript
export class ComponentName {
  constructor(options = {}) {
    this.options = options;
    this.element = null;
    this.isDestroyed = false;
  }

  render() {
    // Create and return DOM element
  }

  update(data) {
    // Update component with new data
  }

  destroy() {
    // Clean up event listeners and references
  }
}
```

### Key Components

#### Header Component
```javascript
// src/components/Header.js
export class Header {
  constructor() {
    this.modelCount = 0;
  }

  render() {
    // Returns header element with title and count
  }

  updateModelCount(count) {
    // Updates the displayed model count
  }
}
```

#### FilterPanel Component
```javascript
// src/components/FilterPanel.js
export class FilterPanel {
  constructor(onFiltersChange) {
    this.onFiltersChange = onFiltersChange;
    this.isOpen = false;
    this.currentFilters = {};
  }

  render() {
    // Returns filter panel with all filter options
  }

  setFilterState(filters) {
    // Updates filter selections
  }

  open() / close() {
    // Controls panel visibility
  }
}
```

#### ModelGrid Component
```javascript
// src/components/ModelGrid.js
export class ModelGrid {
  constructor() {
    this.virtualGrid = null;
    this.models = [];
  }

  render() {
    // Returns grid container with virtual scrolling
  }

  updateModels(models) {
    // Updates displayed models
  }
}
```

## 🔧 Services Architecture

### DataService
Handles all data loading and processing:

```javascript
// src/services/DataService.js
export class DataService {
  async loadModels() {
    // Loads and processes model data
  }

  async fetchModelsData() {
    // Fetches raw model metadata
  }

  async fetchSizesData() {
    // Fetches size information
  }

  processRawData(modelsData, sizesData) {
    // Merges and processes data
  }
}
```

### FilterService
Manages filtering logic:

```javascript
// src/services/FilterService.js
export class FilterService {
  applyFilters(models, filters) {
    // Applies filter criteria to model list
  }

  getAvailableOptions(models) {
    // Extracts available filter options from data
  }

  updateFilterCounts(models, currentFilters) {
    // Updates filter option counts
  }
}
```

### FilterStateManager
Handles URL state management:

```javascript
// src/services/FilterStateManager.js
export class FilterStateManager {
  initialize() {
    // Sets up URL state management
  }

  updateState(filters) {
    // Updates URL with current filter state
  }

  getCurrentState() {
    // Returns current filter state from URL
  }
}
```

## 🎯 Key Features Implementation

### Virtual Scrolling
Efficient rendering of large datasets:

```javascript
// src/components/VirtualScrollGrid.js
export class VirtualScrollGrid {
  constructor(container, options) {
    this.container = container;
    this.itemHeight = options.itemHeight;
    this.buffer = options.buffer;
    this.visibleItems = [];
  }

  updateItems(items) {
    // Updates virtual scroll with new items
  }

  handleScroll() {
    // Calculates visible items and updates DOM
  }
}
```

### Error Handling
Comprehensive error management:

```javascript
// src/utils/errorHandler.js
export class ErrorHandler {
  handleError(error, options) {
    // Processes and displays errors
  }

  createAppError(error, context) {
    // Creates structured error objects
  }

  showUserError(error) {
    // Displays user-friendly error messages
  }
}
```

### Lazy Loading
Code splitting for performance:

```javascript
// src/utils/lazyLoader.js
export async function lazyLoadComponent(importFn, options) {
  // Dynamically loads components
}

export function createLazyComponent(importFn, options) {
  // Creates lazy-loaded component factory
}
```

## 🧪 Testing Strategy

### Test Structure
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Service interaction testing
- **Performance Tests**: Large dataset validation
- **Accessibility Tests**: WCAG compliance validation

### Running Tests
```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- src/components/Header.test.js

# Run tests in watch mode
npm test -- --watch

# Run performance tests
node performance-test.js

# Run accessibility tests
node accessibility-test.js

# Run bundle analysis
node bundle-analysis.js

# Run complete validation
node final-validation.js
```

### Test Examples

#### Component Testing
```javascript
// src/components/Header.test.js
import { describe, it, expect } from 'vitest';
import { Header } from './Header.js';

describe('Header', () => {
  it('should render with default model count', () => {
    const header = new Header();
    const element = header.render();
    expect(element.textContent).toContain('0 models');
  });

  it('should update model count', () => {
    const header = new Header();
    const element = header.render();
    header.updateModelCount(42);
    expect(element.textContent).toContain('42 models');
  });
});
```

#### Service Testing
```javascript
// src/services/FilterService.test.js
import { describe, it, expect } from 'vitest';
import { FilterService } from './FilterService.js';

describe('FilterService', () => {
  it('should filter models by quantization', () => {
    const service = new FilterService();
    const models = [
      { quantization: 'Q4_K_M' },
      { quantization: 'Q8_0' }
    ];
    const filters = { quantizations: ['Q4_K_M'] };
    
    const result = service.applyFilters(models, filters);
    expect(result).toHaveLength(1);
    expect(result[0].quantization).toBe('Q4_K_M');
  });
});
```

## 🚀 Performance Optimization

### Virtual Scrolling Implementation
```javascript
// Efficient rendering for large datasets
class VirtualScrollGrid {
  calculateVisibleRange() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / this.itemHeight) + this.buffer,
      this.items.length
    );
    
    return { startIndex, endIndex };
  }
}
```

### Debounced Search
```javascript
// Optimized search performance
import { debounce } from './utils/debounce.js';

class SearchComponent {
  constructor() {
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
  }

  handleInput(event) {
    this.debouncedSearch(event.target.value);
  }
}
```

### Lazy Loading
```javascript
// Code splitting for better initial load
async function loadFilterPanel() {
  const { FilterPanel } = await import('./components/FilterPanel.js');
  return FilterPanel;
}
```

## ♿ Accessibility Implementation

### Keyboard Navigation
```javascript
// src/utils/keyboardNavigation.js
export class KeyboardNavigation {
  constructor() {
    this.shortcuts = new Map();
    this.focusManager = new FocusManager();
  }

  registerShortcut(key, handler, description) {
    this.shortcuts.set(key, { handler, description });
  }

  handleKeyDown(event) {
    const shortcut = this.getShortcutKey(event);
    if (this.shortcuts.has(shortcut)) {
      event.preventDefault();
      this.shortcuts.get(shortcut).handler();
    }
  }
}
```

### ARIA Implementation
```javascript
// Proper ARIA attributes in components
render() {
  return createElement('div', {
    role: 'grid',
    'aria-label': 'GGUF Models',
    'aria-rowcount': this.models.length,
    'aria-colcount': this.columns
  });
}
```

### Focus Management
```javascript
// Focus trapping for modals
export class FocusManager {
  trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Implement focus trapping logic
  }
}
```

## 🔧 Development Workflow

### Setting Up Development Environment
```bash
# Clone repository
git clone <repository-url>
cd gguf-model-index

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode
npm test -- --watch
```

### Code Style Guidelines
- **ES6+ Features**: Use modern JavaScript features
- **Consistent Naming**: camelCase for variables, PascalCase for classes
- **Error Handling**: Always handle errors gracefully
- **Accessibility**: Include ARIA attributes and keyboard support
- **Performance**: Consider performance impact of changes
- **Documentation**: Document complex functions and classes

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Run tests before pushing
npm test
node final-validation.js

# Push and create pull request
git push origin feature/new-feature
```

## 🐛 Debugging

### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor data loading
- **Performance**: Profile rendering performance
- **Accessibility**: Use accessibility auditing tools

### Debug Utilities
```javascript
// Enable debug mode
localStorage.setItem('debug', 'true');

// Performance monitoring
import { performanceMonitor } from './utils/performanceMonitor.js';
performanceMonitor.startTiming('operation-name');

// Error tracking
import { errorHandler } from './utils/errorHandler.js';
errorHandler.getErrorStats();
```

### Common Issues
- **CORS Errors**: Use local server, not file:// protocol
- **Module Loading**: Check import/export syntax
- **Performance**: Monitor virtual scrolling efficiency
- **Accessibility**: Test with screen readers

## 📦 Build and Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Deployment Checklist
- [ ] Run all tests
- [ ] Validate accessibility
- [ ] Check performance metrics
- [ ] Test in multiple browsers
- [ ] Verify mobile responsiveness
- [ ] Update documentation

## 🤝 Contributing

### Pull Request Process
1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with tests
4. **Run** validation suite
5. **Submit** pull request with description

### Code Review Criteria
- **Functionality**: Does it work as expected?
- **Performance**: No performance regressions
- **Accessibility**: Maintains accessibility standards
- **Testing**: Includes appropriate tests
- **Documentation**: Updates relevant documentation

### Release Process
1. **Version bump** in package.json
2. **Update** CHANGELOG.md
3. **Tag** release in git
4. **Deploy** to production
5. **Monitor** for issues

---

**Happy coding! 🚀**