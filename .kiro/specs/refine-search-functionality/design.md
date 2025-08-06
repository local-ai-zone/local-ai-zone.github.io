# Design Document

## Overview

This design enhances the existing "Refine Your Search" functionality by implementing advanced search capabilities, improved filter management, state persistence, and performance optimizations. The solution builds upon the existing FilterService.js and premium UI architecture while adding sophisticated user experience features for handling large model datasets efficiently.

## Architecture

### System Integration
The enhancement integrates with existing components:
- **FilterService.js**: Extended with advanced filtering algorithms and caching
- **Premium UI Framework**: Enhanced with new interactive components
- **State Management**: New SearchStateManager for persistence and URL handling
- **Performance Layer**: IndexedDB caching and Web Workers for large dataset processing

### Component Architecture
```
┌─────────────────────────────────────────────────┐
│                 UI Layer                        │
├─────────────────────────────────────────────────┤
│ SearchBox │ FilterTags │ SortControls │ Mobile  │
├─────────────────────────────────────────────────┤
│              Service Layer                      │
├─────────────────────────────────────────────────┤
│ SearchService │ FilterService │ StateManager    │
├─────────────────────────────────────────────────┤
│              Data Layer                         │
├─────────────────────────────────────────────────┤
│ IndexCache │ WebWorker │ LocalStorage │ URLState │
└─────────────────────────────────────────────────┘
```

### File Structure
```
js/
├── services/
│   ├── FilterService.js          (existing - enhanced)
│   ├── SearchService.js          (new)
│   ├── SearchStateManager.js     (new)
│   └── PerformanceOptimizer.js   (new)
├── components/
│   ├── SearchBox.js              (new)
│   ├── FilterTags.js             (new)
│   ├── SortControls.js           (new)
│   └── MobileFilters.js          (new)
├── utils/
│   ├── SearchIndex.js            (new)
│   ├── FuzzyMatcher.js           (new)
│   └── CompatibilityChecker.js   (new)
└── workers/
    └── FilterWorker.js           (new)

css/
├── components/
│   ├── search-enhancements.css   (new)
│   ├── filter-tags.css           (new)
│   └── mobile-filters.css        (new)
```

## Components and Interfaces

### 1. Enhanced Search Box Component

#### SearchBox.js
```javascript
class SearchBox {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            debounceMs: 300,
            maxSuggestions: 8,
            enableFuzzySearch: true,
            ...options
        };
        
        this.searchIndex = new SearchIndex();
        this.fuzzyMatcher = new FuzzyMatcher();
        this.debounceTimer = null;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.buildSearchIndex();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="enhanced-search-container">
                <div class="search-input-wrapper">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="search" 
                           id="enhanced-model-search" 
                           class="enhanced-search-input" 
                           placeholder="Search models, types, quantization..."
                           aria-label="Search models"
                           autocomplete="off">
                    <div class="search-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                    </div>
                    <button class="search-clear" style="display: none;" aria-label="Clear search">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="search-suggestions" style="display: none;">
                    <div class="suggestions-list" role="listbox"></div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const input = this.container.querySelector('#enhanced-model-search');
        const clearBtn = this.container.querySelector('.search-clear');
        
        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        input.addEventListener('focus', () => this.handleFocus());
        input.addEventListener('blur', () => this.handleBlur());
        
        clearBtn.addEventListener('click', () => this.clearSearch());
    }
    
    handleInput(event) {
        const query = event.target.value.trim();
        
        // Show/hide clear button
        const clearBtn = this.container.querySelector('.search-clear');
        clearBtn.style.display = query ? 'flex' : 'none';
        
        // Debounce search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.options.debounceMs);
        
        // Show suggestions for queries > 1 character
        if (query.length > 1) {
            this.showSuggestions(query);
        } else {
            this.hideSuggestions();
        }
    }
    
    async performSearch(query) {
        this.showLoading(true);
        
        try {
            const results = await this.searchIndex.search(query, {
                fuzzy: this.options.enableFuzzySearch,
                maxResults: 1000
            });
            
            // Emit search event
            this.container.dispatchEvent(new CustomEvent('search', {
                detail: { query, results }
            }));
            
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            this.showLoading(false);
        }
    }
    
    showSuggestions(query) {
        const suggestions = this.generateSuggestions(query);
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        const suggestionsList = this.container.querySelector('.suggestions-list');
        
        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        suggestionsList.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" 
                 role="option" 
                 data-index="${index}"
                 data-value="${suggestion.value}">
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <div class="suggestion-text">${suggestion.text}</div>
                    <div class="suggestion-type">${suggestion.type}</div>
                </div>
                <div class="suggestion-count">${suggestion.count}</div>
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';
    }
    
    generateSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        // Model name suggestions
        const modelMatches = this.searchIndex.getModelNameMatches(lowerQuery, 3);
        modelMatches.forEach(match => {
            suggestions.push({
                icon: '🤖',
                text: match.name,
                type: 'Model',
                value: match.name,
                count: match.count
            });
        });
        
        // Quantization suggestions
        const quantMatches = this.searchIndex.getQuantizationMatches(lowerQuery, 2);
        quantMatches.forEach(match => {
            suggestions.push({
                icon: '⚙️',
                text: match.format,
                type: 'Quantization',
                value: match.format,
                count: match.count
            });
        });
        
        // Model type suggestions
        const typeMatches = this.searchIndex.getTypeMatches(lowerQuery, 2);
        typeMatches.forEach(match => {
            suggestions.push({
                icon: '📋',
                text: match.type,
                type: 'Type',
                value: match.type,
                count: match.count
            });
        });
        
        return suggestions.slice(0, this.options.maxSuggestions);
    }
}
```

### 2. Active Filter Tags Component

#### FilterTags.js
```javascript
class FilterTags {
    constructor(container) {
        this.container = container;
        this.activeFilters = new Map();
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="active-filters-container" style="display: none;">
                <div class="active-filters-header">
                    <span class="active-filters-label">Active Filters:</span>
                    <button class="clear-all-filters" type="button">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                        Clear All
                    </button>
                </div>
                <div class="active-filters-list"></div>
            </div>
        `;
    }
    
    addFilter(type, value, displayText) {
        this.activeFilters.set(`${type}:${value}`, {
            type,
            value,
            displayText: displayText || value
        });
        this.updateDisplay();
    }
    
    removeFilter(type, value) {
        this.activeFilters.delete(`${type}:${value}`);
        this.updateDisplay();
        
        // Emit filter removal event
        this.container.dispatchEvent(new CustomEvent('filterRemoved', {
            detail: { type, value }
        }));
    }
    
    clearAllFilters() {
        this.activeFilters.clear();
        this.updateDisplay();
        
        // Emit clear all event
        this.container.dispatchEvent(new CustomEvent('filtersCleared'));
    }
    
    updateDisplay() {
        const container = this.container.querySelector('.active-filters-container');
        const list = this.container.querySelector('.active-filters-list');
        
        if (this.activeFilters.size === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        list.innerHTML = Array.from(this.activeFilters.entries()).map(([key, filter]) => `
            <div class="filter-tag" data-filter-key="${key}">
                <span class="filter-tag-icon">${this.getFilterIcon(filter.type)}</span>
                <span class="filter-tag-text">${filter.displayText}</span>
                <button class="filter-tag-remove" 
                        data-type="${filter.type}" 
                        data-value="${filter.value}"
                        aria-label="Remove ${filter.displayText} filter">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }
    
    getFilterIcon(type) {
        const icons = {
            search: '🔍',
            quantization: '⚙️',
            modelType: '📋',
            license: '📄',
            cpu: '🖥️',
            ram: '💾',
            gpu: '🎮',
            fileSize: '📦',
            downloads: '📈'
        };
        return icons[type] || '🏷️';
    }
    
    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.filter-tag-remove')) {
                const button = e.target.closest('.filter-tag-remove');
                const type = button.dataset.type;
                const value = button.dataset.value;
                this.removeFilter(type, value);
            } else if (e.target.closest('.clear-all-filters')) {
                this.clearAllFilters();
            }
        });
    }
}
```

### 3. Search State Manager

#### SearchStateManager.js
```javascript
class SearchStateManager {
    constructor() {
        this.storageKey = 'gguf-search-state';
        this.urlParams = new URLSearchParams(window.location.search);
        this.state = this.getInitialState();
    }
    
    getInitialState() {
        // Priority: URL params > localStorage > defaults
        const urlState = this.getStateFromURL();
        const savedState = this.getStateFromStorage();
        
        return {
            searchQuery: urlState.searchQuery || savedState.searchQuery || '',
            filters: {
                quantization: urlState.quantization || savedState.quantization || 'all',
                modelType: urlState.modelType || savedState.modelType || 'all',
                license: urlState.license || savedState.license || 'all',
                cpu: urlState.cpu || savedState.cpu || 'all',
                ram: urlState.ram || savedState.ram || 'all',
                gpu: urlState.gpu || savedState.gpu || 'all'
            },
            sorting: {
                field: urlState.sortField || savedState.sortField || 'likeCount',
                direction: urlState.sortDir || savedState.sortDir || 'desc'
            },
            view: urlState.view || savedState.view || 'grid'
        };
    }
    
    getStateFromURL() {
        return {
            searchQuery: this.urlParams.get('q') || '',
            quantization: this.urlParams.get('quant') || 'all',
            modelType: this.urlParams.get('type') || 'all',
            license: this.urlParams.get('license') || 'all',
            cpu: this.urlParams.get('cpu') || 'all',
            ram: this.urlParams.get('ram') || 'all',
            gpu: this.urlParams.get('gpu') || 'all',
            sortField: this.urlParams.get('sort') || 'likeCount',
            sortDir: this.urlParams.get('dir') || 'desc',
            view: this.urlParams.get('view') || 'grid'
        };
    }
    
    getStateFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Failed to load saved search state:', error);
            return {};
        }
    }
    
    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.saveToStorage();
        this.updateURL();
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.warn('Failed to save search state:', error);
        }
    }
    
    updateURL() {
        const params = new URLSearchParams();
        
        // Only add non-default values to keep URLs clean
        if (this.state.searchQuery) {
            params.set('q', this.state.searchQuery);
        }
        
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (value !== 'all') {
                params.set(key === 'quantization' ? 'quant' : key, value);
            }
        });
        
        if (this.state.sorting.field !== 'likeCount') {
            params.set('sort', this.state.sorting.field);
        }
        
        if (this.state.sorting.direction !== 'desc') {
            params.set('dir', this.state.sorting.direction);
        }
        
        if (this.state.view !== 'grid') {
            params.set('view', this.state.view);
        }
        
        // Update URL without page reload
        const newURL = params.toString() ? 
            `${window.location.pathname}?${params.toString()}` : 
            window.location.pathname;
            
        window.history.replaceState(null, '', newURL);
    }
    
    getState() {
        return { ...this.state };
    }
    
    clearState() {
        this.state = this.getInitialState();
        localStorage.removeItem(this.storageKey);
        window.history.replaceState(null, '', window.location.pathname);
    }
}
```

### 4. Mobile Filter Enhancement

#### MobileFilters.js
```javascript
class MobileFilters {
    constructor(container) {
        this.container = container;
        this.isCollapsed = true;
        this.activeGroups = new Set();
        this.init();
    }
    
    init() {
        this.enhanceForMobile();
        this.attachEventListeners();
    }
    
    enhanceForMobile() {
        if (window.innerWidth <= 768) {
            this.createCollapsibleStructure();
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.createCollapsibleStructure();
            } else {
                this.removeCollapsibleStructure();
            }
        });
    }
    
    createCollapsibleStructure() {
        const filterGroups = this.container.querySelectorAll('.filter-group');
        
        // Create mobile filter header
        if (!this.container.querySelector('.mobile-filter-header')) {
            const header = document.createElement('div');
            header.className = 'mobile-filter-header';
            header.innerHTML = `
                <button class="mobile-filter-toggle" type="button">
                    <span class="toggle-text">Filters</span>
                    <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24">
                        <polyline points="6,9 12,15 18,9"/>
                    </svg>
                </button>
                <div class="active-filter-count" style="display: none;">
                    <span class="count">0</span>
                </div>
            `;
            
            this.container.insertBefore(header, this.container.firstChild);
        }
        
        // Group filters into collapsible sections
        const sections = [
            {
                title: 'Content Filters',
                icon: '📋',
                filters: ['quantization-filter', 'model-type-filter', 'license-filter']
            },
            {
                title: 'Hardware Requirements',
                icon: '🖥️',
                filters: ['cpu-filter', 'ram-filter', 'gpu-filter']
            }
        ];
        
        sections.forEach(section => {
            this.createFilterSection(section);
        });
    }
    
    createFilterSection(section) {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'mobile-filter-section';
        sectionElement.innerHTML = `
            <button class="filter-section-header" type="button" data-section="${section.title}">
                <div class="section-info">
                    <span class="section-icon">${section.icon}</span>
                    <span class="section-title">${section.title}</span>
                </div>
                <svg class="section-toggle" width="16" height="16" viewBox="0 0 24 24">
                    <polyline points="6,9 12,15 18,9"/>
                </svg>
            </button>
            <div class="filter-section-content" style="display: none;">
                <!-- Filter groups will be moved here -->
            </div>
        `;
        
        const content = sectionElement.querySelector('.filter-section-content');
        
        // Move relevant filter groups to this section
        section.filters.forEach(filterId => {
            const filterGroup = this.container.querySelector(`#${filterId}`)?.closest('.filter-group');
            if (filterGroup) {
                content.appendChild(filterGroup.cloneNode(true));
                filterGroup.style.display = 'none'; // Hide original
            }
        });
        
        this.container.appendChild(sectionElement);
    }
    
    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.mobile-filter-toggle')) {
                this.toggleFilters();
            } else if (e.target.closest('.filter-section-header')) {
                const button = e.target.closest('.filter-section-header');
                const section = button.dataset.section;
                this.toggleSection(section);
            }
        });
    }
    
    toggleFilters() {
        const content = this.container.querySelector('.premium-filters');
        const icon = this.container.querySelector('.toggle-icon');
        
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        } else {
            content.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
        }
    }
    
    toggleSection(sectionName) {
        const section = this.container.querySelector(`[data-section="${sectionName}"]`);
        const content = section.parentElement.querySelector('.filter-section-content');
        const icon = section.querySelector('.section-toggle');
        
        const isOpen = this.activeGroups.has(sectionName);
        
        if (isOpen) {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
            this.activeGroups.delete(sectionName);
        } else {
            content.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
            this.activeGroups.add(sectionName);
        }
    }
    
    updateActiveFilterCount(count) {
        const counter = this.container.querySelector('.active-filter-count');
        const countSpan = counter.querySelector('.count');
        
        if (count > 0) {
            counter.style.display = 'flex';
            countSpan.textContent = count;
        } else {
            counter.style.display = 'none';
        }
    }
}
```

### 5. Performance Optimization Layer

#### PerformanceOptimizer.js
```javascript
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.indexCache = new Map();
        this.worker = null;
        this.initWorker();
    }
    
    initWorker() {
        if (typeof Worker !== 'undefined') {
            this.worker = new Worker('js/workers/FilterWorker.js');
            this.worker.onmessage = (e) => this.handleWorkerMessage(e);
        }
    }
    
    async optimizeFiltering(models, filters, searchQuery) {
        const cacheKey = this.generateCacheKey(filters, searchQuery);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Use Web Worker for large datasets
        if (models.length > 10000 && this.worker) {
            return this.filterWithWorker(models, filters, searchQuery, cacheKey);
        }
        
        // Use main thread for smaller datasets
        return this.filterMainThread(models, filters, searchQuery, cacheKey);
    }
    
    async filterWithWorker(models, filters, searchQuery, cacheKey) {
        return new Promise((resolve, reject) => {
            const requestId = Date.now();
            
            this.worker.postMessage({
                id: requestId,
                models,
                filters,
                searchQuery
            });
            
            const handleResponse = (e) => {
                if (e.data.id === requestId) {
                    this.worker.removeEventListener('message', handleResponse);
                    
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    } else {
                        this.cache.set(cacheKey, e.data.results);
                        resolve(e.data.results);
                    }
                }
            };
            
            this.worker.addEventListener('message', handleResponse);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                this.worker.removeEventListener('message', handleResponse);
                reject(new Error('Worker timeout'));
            }, 5000);
        });
    }
    
    filterMainThread(models, filters, searchQuery, cacheKey) {
        // Use existing FilterService with optimizations
        const filterService = new FilterService();
        const results = filterService.applyAllFilters(models, {
            searchQuery,
            filters,
            sorting: { field: 'likeCount', direction: 'desc' }
        });
        
        this.cache.set(cacheKey, results);
        return results;
    }
    
    generateCacheKey(filters, searchQuery) {
        return `${searchQuery}:${JSON.stringify(filters)}`;
    }
    
    clearCache() {
        this.cache.clear();
        this.indexCache.clear();
    }
    
    getMemoryUsage() {
        return {
            cacheSize: this.cache.size,
            indexCacheSize: this.indexCache.size,
            estimatedMemoryMB: (this.cache.size * 0.1) + (this.indexCache.size * 0.05)
        };
    }
}
```

## Data Models

### Enhanced Filter State
```javascript
{
    searchQuery: "",
    filters: {
        quantization: "all",
        modelType: "all", 
        license: "all",
        cpu: "all",
        ram: "all",
        gpu: "all",
        fileSize: { min: 0, max: Infinity },
        downloads: { min: 0, max: Infinity }
    },
    sorting: {
        field: "likeCount",
        direction: "desc"
    },
    view: "grid",
    pagination: {
        page: 1,
        itemsPerPage: 60
    }
}
```

### Search Index Structure
```javascript
{
    modelNames: Map<string, ModelReference[]>,
    quantizations: Map<string, ModelReference[]>,
    modelTypes: Map<string, ModelReference[]>,
    licenses: Map<string, ModelReference[]>,
    fullTextIndex: Map<string, Set<number>>,
    fuzzyIndex: Map<string, FuzzyMatch[]>
}
```

## User Interface Design

### Enhanced Search Box
```
┌─────────────────────────────────────────────────┐
│ 🔍 [Search models, types, quantization...] ⌛ ✕ │
├─────────────────────────────────────────────────┤
│ 🤖 LLaMA-2-7B-Chat                    (1,234)  │
│ ⚙️ Q4_K_M                             (5,678)  │
│ 📋 Text Generation                    (2,345)  │
└─────────────────────────────────────────────────┘
```

### Active Filter Tags
```
┌─────────────────────────────────────────────────┐
│ Active Filters:                    [Clear All]  │
│ 🔍 "llama" ✕  ⚙️ Q4_K_M ✕  🖥️ 4+ cores ✕     │
│ 💾 8+ GB ✕                                      │
└─────────────────────────────────────────────────┘
```

### Mobile Filter Sections
```
┌─────────────────────────────────────────────────┐
│ Filters (3) ▼                                   │
├─────────────────────────────────────────────────┤
│ 📋 Content Filters ▼                           │
│   Quantization: [Q4_K_M ▼]                     │
│   Model Type: [All ▼]                          │
│   License: [All ▼]                             │
├─────────────────────────────────────────────────┤
│ 🖥️ Hardware Requirements ▶                     │
└─────────────────────────────────────────────────┘
```

## Error Handling

### Search Failures
- **Network Issues**: Graceful degradation with cached results
- **Invalid Queries**: Sanitization and user feedback
- **Performance Issues**: Automatic fallback to simpler algorithms

### State Management Errors
- **localStorage Failures**: Fallback to session storage or memory
- **URL Parameter Issues**: Validation and sanitization
- **State Corruption**: Reset to defaults with user notification

### Mobile Responsiveness
- **Touch Target Sizing**: Minimum 44px touch targets
- **Viewport Handling**: Proper scaling and zoom prevention
- **Performance on Low-End Devices**: Reduced animations and simplified layouts

## Testing Strategy

### Unit Tests
- Search algorithm accuracy and performance
- Filter combination logic
- State persistence and restoration
- Mobile responsive behavior

### Integration Tests
- Search + filter + sort combinations
- URL parameter handling
- Cross-browser compatibility
- Performance benchmarks

### User Experience Tests
- Search suggestion relevance
- Filter tag usability
- Mobile touch interactions
- Accessibility compliance (WCAG 2.1 AA)

### Performance Tests
- Large dataset handling (50,000+ models)
- Memory usage monitoring
- Search response times
- Mobile performance optimization