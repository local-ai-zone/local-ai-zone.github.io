/**
 * Enhanced Search Integration
 * Integrates SearchBox, FilterTags, and SearchStateManager with the existing premium app
 */

class EnhancedSearchIntegration {
    constructor(premiumApp) {
        this.premiumApp = premiumApp;
        this.searchBox = null;
        this.filterTags = null;
        this.stateManager = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🔍 Initializing Enhanced Search Integration...');
            
            // Wait for premium app to be ready
            await this.waitForPremiumApp();
            
            // Initialize state manager
            this.stateManager = new SearchStateManager();
            console.log('✅ SearchStateManager initialized');
            
            // Initialize components
            this.initializeSearchBox();
            this.initializeFilterTags();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Apply initial state
            this.applyInitialState();
            
            // Update search index when models are loaded
            this.updateSearchIndex();
            
            this.isInitialized = true;
            console.log('🎉 Enhanced Search Integration initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Search Integration:', error);
        }
    }
    
    async waitForPremiumApp() {
        return new Promise((resolve) => {
            const checkApp = () => {
                if (this.premiumApp && this.premiumApp.models && this.premiumApp.models.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkApp, 100);
                }
            };
            checkApp();
        });
    }
    
    initializeSearchBox() {
        // Replace existing search input with enhanced search box
        const existingSearch = document.getElementById('model-search');
        if (existingSearch) {
            const searchContainer = existingSearch.parentElement;
            
            // Create new container for enhanced search
            const enhancedContainer = document.createElement('div');
            enhancedContainer.className = 'enhanced-search-wrapper';
            
            // Replace existing search
            searchContainer.replaceChild(enhancedContainer, existingSearch);
            
            // Initialize SearchBox component
            this.searchBox = new SearchBox(enhancedContainer, {
                debounceMs: 300,
                maxSuggestions: 8,
                enableFuzzySearch: true
            });
            
            console.log('✅ SearchBox initialized');
        }
    }
    
    initializeFilterTags() {
        // Find or create container for filter tags
        let filterTagsContainer = document.getElementById('active-filters');
        
        if (!filterTagsContainer) {
            // Create container if it doesn't exist
            const filterSection = document.querySelector('.premium-filter-section');
            if (filterSection) {
                filterTagsContainer = document.createElement('div');
                filterTagsContainer.id = 'active-filters';
                filterTagsContainer.className = 'filter-tags-container';
                
                // Insert after filter controls
                const filterControls = filterSection.querySelector('#filter-controls');
                if (filterControls) {
                    filterControls.parentNode.insertBefore(filterTagsContainer, filterControls.nextSibling);
                }
            }
        }
        
        if (filterTagsContainer) {
            this.filterTags = new FilterTags(filterTagsContainer);
            console.log('✅ FilterTags initialized');
        }
    }
    
    setupEventListeners() {
        // Search box events
        if (this.searchBox) {
            this.searchBox.container.addEventListener('search', (e) => {
                this.handleSearch(e.detail);
            });
        }
        
        // Filter tags events
        if (this.filterTags) {
            this.filterTags.container.addEventListener('filterRemoved', (e) => {
                this.handleFilterRemoved(e.detail);
            });
            
            this.filterTags.container.addEventListener('filtersCleared', () => {
                this.handleFiltersCleared();
            });
        }
        
        // State manager events
        if (this.stateManager) {
            this.stateManager.addListener((newState, oldState) => {
                this.handleStateChange(newState, oldState);
            });
        }
        
        // Existing filter controls
        this.setupFilterControlListeners();
        
        // Sort control
        this.setupSortControlListener();
        
        console.log('✅ Event listeners set up');
    }
    
    setupFilterControlListeners() {
        const filterControls = [
            { id: 'quantization-filter', type: 'quantization' },
            { id: 'model-type-filter', type: 'modelType' },
            { id: 'license-filter', type: 'license' },
            { id: 'cpu-filter', type: 'cpu' },
            { id: 'ram-filter', type: 'ram' },
            { id: 'gpu-filter', type: 'gpu' }
        ];
        
        filterControls.forEach(({ id, type }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.handleFilterChange(type, e.target.value);
                });
            }
        });
        
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.handleFiltersCleared();
            });
        }
    }
    
    setupSortControlListener() {
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [field, direction] = e.target.value.split('-');
                this.handleSortChange(field, direction);
            });
        }
    }
    
    handleSearch(searchDetail) {
        const { query, results, resultCount } = searchDetail;
        
        // Update state
        this.stateManager.updateState({
            searchQuery: query,
            pagination: { ...this.stateManager.getState().pagination, page: 1 }
        });
        
        // Update filter tag for search
        if (query) {
            this.filterTags.addFilter('search', query, `"${query}"`, resultCount);
        } else {
            this.filterTags.removeFilter('search', query);
        }
        
        // Apply search to premium app
        this.applyFiltersToApp();
    }
    
    handleFilterChange(type, value) {
        const currentState = this.stateManager.getState();
        const newFilters = { ...currentState.filters, [type]: value };
        
        this.stateManager.updateState({
            filters: newFilters,
            pagination: { ...currentState.pagination, page: 1 }
        });
        
        // Update filter tags
        if (value !== 'all') {
            const displayText = this.getFilterDisplayText(type, value);
            this.filterTags.addFilter(type, value, displayText);
        } else {
            this.filterTags.removeFilter(type, value);
        }
        
        // Apply filters to premium app
        this.applyFiltersToApp();
    }
    
    handleFilterRemoved(detail) {
        const { type, value } = detail;
        const currentState = this.stateManager.getState();
        
        if (type === 'search') {
            // Clear search
            this.stateManager.updateState({ searchQuery: '' });
            if (this.searchBox) {
                const input = this.searchBox.container.querySelector('#enhanced-model-search');
                if (input) input.value = '';
            }
        } else {
            // Clear filter
            const newFilters = { ...currentState.filters, [type]: 'all' };
            this.stateManager.updateState({ filters: newFilters });
            
            // Update UI control
            const controlId = this.getFilterControlId(type);
            const control = document.getElementById(controlId);
            if (control) control.value = 'all';
        }
        
        this.applyFiltersToApp();
    }
    
    handleFiltersCleared() {
        // Clear all filters and search
        this.stateManager.clearState();
        
        // Clear search box
        if (this.searchBox) {
            const input = this.searchBox.container.querySelector('#enhanced-model-search');
            if (input) {
                input.value = '';
                const clearBtn = this.searchBox.container.querySelector('.search-clear');
                if (clearBtn) clearBtn.style.display = 'none';
            }
        }
        
        // Reset all filter controls
        const filterControls = [
            'quantization-filter', 'model-type-filter', 'license-filter',
            'cpu-filter', 'ram-filter', 'gpu-filter'
        ];
        
        filterControls.forEach(id => {
            const control = document.getElementById(id);
            if (control) control.value = 'all';
        });
        
        // Reset sort control
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = 'likeCount-desc';
        
        this.applyFiltersToApp();
    }
    
    handleSortChange(field, direction) {
        this.stateManager.updateState({
            sorting: { field, direction }
        });
        
        this.applyFiltersToApp();
    }
    
    handleStateChange(newState, oldState) {
        // Update filter tags based on state
        this.syncFilterTagsWithState(newState);
        
        // Update results count
        if (this.filterTags && this.premiumApp) {
            const filteredCount = this.premiumApp.filteredModels ? this.premiumApp.filteredModels.length : 0;
            const totalCount = this.premiumApp.models ? this.premiumApp.models.length : 0;
            this.filterTags.updateResultsCount(filteredCount, totalCount);
        }
    }
    
    syncFilterTagsWithState(state) {
        if (!this.filterTags) return;
        
        // Clear existing tags
        this.filterTags.activeFilters.clear();
        
        // Add search tag
        if (state.searchQuery) {
            this.filterTags.addFilter('search', state.searchQuery, `"${state.searchQuery}"`);
        }
        
        // Add filter tags
        Object.entries(state.filters).forEach(([type, value]) => {
            if (value !== 'all' && typeof value === 'string') {
                const displayText = this.getFilterDisplayText(type, value);
                this.filterTags.addFilter(type, value, displayText);
            }
        });
    }
    
    applyInitialState() {
        const state = this.stateManager.getState();
        
        // Apply search query
        if (state.searchQuery && this.searchBox) {
            const input = this.searchBox.container.querySelector('#enhanced-model-search');
            if (input) {
                input.value = state.searchQuery;
                const clearBtn = this.searchBox.container.querySelector('.search-clear');
                if (clearBtn) clearBtn.style.display = 'flex';
            }
        }
        
        // Apply filters to UI controls
        Object.entries(state.filters).forEach(([type, value]) => {
            const controlId = this.getFilterControlId(type);
            const control = document.getElementById(controlId);
            if (control && typeof value === 'string') {
                control.value = value;
            }
        });
        
        // Apply sort
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.value = `${state.sorting.field}-${state.sorting.direction}`;
        }
        
        // Sync filter tags
        this.syncFilterTagsWithState(state);
        
        // Apply to premium app
        this.applyFiltersToApp();
    }
    
    applyFiltersToApp() {
        if (!this.premiumApp || !this.stateManager) return;
        
        const state = this.stateManager.getState();
        
        // Apply search
        if (state.searchQuery) {
            this.premiumApp.handleSearch(state.searchQuery, false);
        } else {
            // Reset to all models with current filters
            this.premiumApp.handleFilter();
        }
        
        // Apply sort
        const sortValue = `${state.sorting.field}-${state.sorting.direction}`;
        this.premiumApp.handleSort(sortValue);
        
        // Update results count
        if (this.filterTags) {
            const filteredCount = this.premiumApp.filteredModels ? this.premiumApp.filteredModels.length : 0;
            const totalCount = this.premiumApp.models ? this.premiumApp.models.length : 0;
            this.filterTags.updateResultsCount(filteredCount, totalCount);
        }
    }
    
    updateSearchIndex() {
        if (this.searchBox && this.premiumApp && this.premiumApp.models) {
            this.searchBox.updateIndex(this.premiumApp.models);
            console.log('✅ Search index updated');
        }
    }
    
    getFilterDisplayText(type, value) {
        const displayTexts = {
            quantization: value,
            modelType: value,
            license: value.length > 20 ? value.substring(0, 17) + '...' : value,
            cpu: `${value}+ cores`,
            ram: `${value}+ GB`,
            gpu: value === 'required' ? 'GPU Required' : 'No GPU Needed'
        };
        
        return displayTexts[type] || value;
    }
    
    getFilterControlId(type) {
        const controlIds = {
            quantization: 'quantization-filter',
            modelType: 'model-type-filter',
            license: 'license-filter',
            cpu: 'cpu-filter',
            ram: 'ram-filter',
            gpu: 'gpu-filter'
        };
        
        return controlIds[type] || `${type}-filter`;
    }
    
    // Public API methods
    getSearchQuery() {
        return this.stateManager ? this.stateManager.getSearchQuery() : '';
    }
    
    getActiveFilters() {
        return this.filterTags ? this.filterTags.getActiveFilters() : [];
    }
    
    clearSearch() {
        if (this.searchBox) {
            this.searchBox.clearSearch();
        }
    }
    
    clearAllFilters() {
        this.handleFiltersCleared();
    }
    
    getShareableURL() {
        return this.stateManager ? this.stateManager.getShareableURL() : window.location.href;
    }
    
    // Debug methods
    debugState() {
        if (this.stateManager) {
            this.stateManager.debugState();
        }
        
        console.log('Enhanced Search Integration State:', {
            isInitialized: this.isInitialized,
            hasSearchBox: !!this.searchBox,
            hasFilterTags: !!this.filterTags,
            hasStateManager: !!this.stateManager,
            activeFilters: this.getActiveFilters(),
            searchQuery: this.getSearchQuery()
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSearchIntegration;
} else {
    window.EnhancedSearchIntegration = EnhancedSearchIntegration;
}