/**
 * SearchStateManager for URL parameter handling and localStorage persistence
 * Manages search and filter state across browser sessions and URL sharing
 */

class SearchStateManager {
    constructor() {
        this.storageKey = 'gguf-search-state';
        this.urlParams = new URLSearchParams(window.location.search);
        this.state = this.getInitialState();
        this.listeners = new Set();
        
        // Bind methods
        this.updateState = this.updateState.bind(this);
        this.getState = this.getState.bind(this);
        this.clearState = this.clearState.bind(this);
        
        // Listen for browser navigation
        window.addEventListener('popstate', () => {
            this.handlePopState();
        });
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
                gpu: urlState.gpu || savedState.gpu || 'all',
                fileSize: urlState.fileSize || savedState.fileSize || { min: 0, max: Infinity },
                downloads: urlState.downloads || savedState.downloads || { min: 0, max: Infinity },
                engagement: urlState.engagement || savedState.engagement || { min: 0, max: Infinity }
            },
            sorting: {
                field: urlState.sortField || savedState.sortField || 'likeCount',
                direction: urlState.sortDir || savedState.sortDir || 'desc'
            },
            view: urlState.view || savedState.view || 'grid',
            pagination: {
                page: parseInt(urlState.page) || savedState.page || 1,
                itemsPerPage: parseInt(urlState.itemsPerPage) || savedState.itemsPerPage || 60
            }
        };
    }
    
    getStateFromURL() {
        const state = {
            searchQuery: this.urlParams.get('q') || '',
            quantization: this.urlParams.get('quant') || 'all',
            modelType: this.urlParams.get('type') || 'all',
            license: this.urlParams.get('license') || 'all',
            cpu: this.urlParams.get('cpu') || 'all',
            ram: this.urlParams.get('ram') || 'all',
            gpu: this.urlParams.get('gpu') || 'all',
            sortField: this.urlParams.get('sort') || 'likeCount',
            sortDir: this.urlParams.get('dir') || 'desc',
            view: this.urlParams.get('view') || 'grid',
            page: this.urlParams.get('page') || '1',
            itemsPerPage: this.urlParams.get('limit') || '60'
        };
        
        // Parse range filters
        const fileSizeRange = this.urlParams.get('fileSize');
        if (fileSizeRange) {
            const [min, max] = fileSizeRange.split('-').map(Number);
            state.fileSize = { min: min || 0, max: max || Infinity };
        }
        
        const downloadsRange = this.urlParams.get('downloads');
        if (downloadsRange) {
            const [min, max] = downloadsRange.split('-').map(Number);
            state.downloads = { min: min || 0, max: max || Infinity };
        }
        
        const engagementRange = this.urlParams.get('engagement');
        if (engagementRange) {
            const [min, max] = engagementRange.split('-').map(Number);
            state.engagement = { min: min || 0, max: max || Infinity };
        }
        
        return state;
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
        const oldState = { ...this.state };
        this.state = this.mergeState(this.state, updates);
        
        // Save to storage
        this.saveToStorage();
        
        // Update URL
        this.updateURL();
        
        // Notify listeners
        this.notifyListeners(this.state, oldState);
    }
    
    mergeState(currentState, updates) {
        const newState = { ...currentState };
        
        // Handle nested objects properly
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                newState[key] = { ...currentState[key], ...updates[key] };
            } else {
                newState[key] = updates[key];
            }
        });
        
        return newState;
    }
    
    saveToStorage() {
        try {
            // Only save non-default values to keep storage lean
            const stateToSave = this.getMinimalState();
            localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save search state:', error);
        }
    }
    
    getMinimalState() {
        const minimal = {};
        
        // Only save non-default values
        if (this.state.searchQuery) {
            minimal.searchQuery = this.state.searchQuery;
        }
        
        // Filters
        const defaultFilters = ['all'];
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (typeof value === 'object') {
                // Range filters
                if (value.min !== 0 || value.max !== Infinity) {
                    minimal[key] = value;
                }
            } else if (!defaultFilters.includes(value)) {
                minimal[key] = value;
            }
        });
        
        // Sorting
        if (this.state.sorting.field !== 'likeCount') {
            minimal.sortField = this.state.sorting.field;
        }
        if (this.state.sorting.direction !== 'desc') {
            minimal.sortDir = this.state.sorting.direction;
        }
        
        // View
        if (this.state.view !== 'grid') {
            minimal.view = this.state.view;
        }
        
        // Pagination
        if (this.state.pagination.page !== 1) {
            minimal.page = this.state.pagination.page;
        }
        if (this.state.pagination.itemsPerPage !== 60) {
            minimal.itemsPerPage = this.state.pagination.itemsPerPage;
        }
        
        return minimal;
    }
    
    updateURL() {
        const params = new URLSearchParams();
        
        // Only add non-default values to keep URLs clean
        if (this.state.searchQuery) {
            params.set('q', this.state.searchQuery);
        }
        
        // Filters
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (typeof value === 'object') {
                // Range filters
                if (value.min !== 0 || value.max !== Infinity) {
                    const rangeStr = value.max === Infinity ? 
                        `${value.min}-` : 
                        `${value.min}-${value.max}`;
                    params.set(key, rangeStr);
                }
            } else if (value !== 'all') {
                const paramKey = key === 'quantization' ? 'quant' : key;
                params.set(paramKey, value);
            }
        });
        
        // Sorting
        if (this.state.sorting.field !== 'likeCount') {
            params.set('sort', this.state.sorting.field);
        }
        if (this.state.sorting.direction !== 'desc') {
            params.set('dir', this.state.sorting.direction);
        }
        
        // View
        if (this.state.view !== 'grid') {
            params.set('view', this.state.view);
        }
        
        // Pagination
        if (this.state.pagination.page !== 1) {
            params.set('page', this.state.pagination.page);
        }
        if (this.state.pagination.itemsPerPage !== 60) {
            params.set('limit', this.state.pagination.itemsPerPage);
        }
        
        // Update URL without page reload
        const newURL = params.toString() ? 
            `${window.location.pathname}?${params.toString()}` : 
            window.location.pathname;
            
        if (newURL !== window.location.href) {
            window.history.replaceState(
                { searchState: this.state }, 
                '', 
                newURL
            );
        }
    }
    
    handlePopState() {
        // Handle browser back/forward navigation
        this.urlParams = new URLSearchParams(window.location.search);
        const urlState = this.getStateFromURL();
        
        // Update state without triggering URL update
        this.state = this.mergeState(this.state, urlState);
        
        // Notify listeners
        this.notifyListeners(this.state, {});
    }
    
    getState() {
        return { ...this.state };
    }
    
    clearState() {
        const defaultState = {
            searchQuery: '',
            filters: {
                quantization: 'all',
                modelType: 'all',
                license: 'all',
                cpu: 'all',
                ram: 'all',
                gpu: 'all',
                fileSize: { min: 0, max: Infinity },
                downloads: { min: 0, max: Infinity },
                engagement: { min: 0, max: Infinity }
            },
            sorting: {
                field: 'likeCount',
                direction: 'desc'
            },
            view: 'grid',
            pagination: {
                page: 1,
                itemsPerPage: 60
            }
        };
        
        this.state = defaultState;
        localStorage.removeItem(this.storageKey);
        window.history.replaceState(null, '', window.location.pathname);
        
        // Notify listeners
        this.notifyListeners(this.state, {});
    }
    
    // Event system for state changes
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    notifyListeners(newState, oldState) {
        this.listeners.forEach(callback => {
            try {
                callback(newState, oldState);
            } catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }
    
    // Utility methods
    getSearchQuery() {
        return this.state.searchQuery;
    }
    
    getFilters() {
        return { ...this.state.filters };
    }
    
    getSorting() {
        return { ...this.state.sorting };
    }
    
    getView() {
        return this.state.view;
    }
    
    getPagination() {
        return { ...this.state.pagination };
    }
    
    // Batch updates for performance
    batchUpdate(updates) {
        this.updateState(updates);
    }
    
    // Generate shareable URL
    getShareableURL() {
        const params = new URLSearchParams();
        
        if (this.state.searchQuery) {
            params.set('q', this.state.searchQuery);
        }
        
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (typeof value === 'object') {
                if (value.min !== 0 || value.max !== Infinity) {
                    const rangeStr = value.max === Infinity ? 
                        `${value.min}-` : 
                        `${value.min}-${value.max}`;
                    params.set(key, rangeStr);
                }
            } else if (value !== 'all') {
                const paramKey = key === 'quantization' ? 'quant' : key;
                params.set(paramKey, value);
            }
        });
        
        const baseURL = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        return params.toString() ? `${baseURL}?${params.toString()}` : baseURL;
    }
    
    // Debug methods
    debugState() {
        console.log('Current Search State:', this.state);
        console.log('URL Params:', Object.fromEntries(this.urlParams));
        console.log('Storage:', this.getStateFromStorage());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchStateManager;
} else {
    window.SearchStateManager = SearchStateManager;
}