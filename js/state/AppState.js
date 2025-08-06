/**
 * Centralized state management for GGUF Model Discovery
 * Handles application state, subscriptions, and state updates
 */

class AppState {
    constructor() {
        this.state = {
            // Data state
            allModels: [],
            filteredModels: [],
            lastUpdateTime: null,
            isLoading: false,
            error: null,

            // Search and filter state
            searchQuery: '',
            filters: {
                quantFormat: 'all',
                modelType: 'all',
                license: 'all',
                fileSizeMin: 0,
                fileSizeMax: Infinity,
                downloadCountMin: 0,
                downloadCountMax: Infinity,
                likeCountMin: 0,
                likeCountMax: Infinity
            },

            // Sorting state
            sorting: {
                field: 'downloadCount',
                direction: 'desc'
            },

            // Pagination state
            pagination: {
                currentPage: 1,
                itemsPerPage: 60,
                totalItems: 0,
                totalPages: 0
            },

            // UI state
            activeFilters: [],
            selectedModels: new Set(),
            viewMode: 'grid'
        };

        // Subscribers for state changes
        this.subscribers = new Map();
        this.nextSubscriberId = 0;

        // Bind methods
        this.updateState = this.updateState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.getState = this.getState.bind(this);
    }

    /**
     * Get current state (read-only)
     * @returns {object} Current application state
     */
    getState() {
        // Use custom deep clone that handles Infinity properly
        return this._deepCloneState(this.state);
    }

    /**
     * Deep clone state object handling special values like Infinity
     * @private
     * @param {object} obj - Object to clone
     * @returns {object} Cloned object
     */
    _deepCloneState(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this._deepCloneState(item));
        }

        if (obj instanceof Set) {
            return new Set([...obj]);
        }

        if (obj instanceof Map) {
            return new Map([...obj]);
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this._deepCloneState(obj[key]);
            }
        }

        return cloned;
    }

    /**
     * Update application state and notify subscribers
     * @param {object} updates - State updates to apply
     * @param {boolean} silent - Skip notifications if true
     */
    updateState(updates, silent = false) {
        const previousState = this._deepCloneState(this.state);
        
        // Apply updates to state
        this.state = this._mergeState(this.state, updates);
        
        // Recalculate derived state
        this._updateDerivedState();
        
        // Notify subscribers unless silent
        if (!silent) {
            this._notifySubscribers(previousState, this.state);
        }
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Callback function to call on state changes
     * @param {Array} watchKeys - Specific state keys to watch (optional)
     * @returns {number} Subscription ID for unsubscribing
     */
    subscribe(callback, watchKeys = null) {
        const subscriptionId = this.nextSubscriberId++;
        
        this.subscribers.set(subscriptionId, {
            callback,
            watchKeys
        });
        
        return subscriptionId;
    }

    /**
     * Unsubscribe from state changes
     * @param {number} subscriptionId - Subscription ID to remove
     */
    unsubscribe(subscriptionId) {
        this.subscribers.delete(subscriptionId);
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Loading state
     * @param {string} error - Error message if any
     */
    setLoading(isLoading, error = null) {
        this.updateState({
            isLoading,
            error
        });
    }

    /**
     * Set all models data
     * @param {Array} models - Array of model objects
     * @param {string} lastUpdateTime - Last update timestamp
     */
    setModels(models, lastUpdateTime = null) {
        this.updateState({
            allModels: models,
            lastUpdateTime: lastUpdateTime || new Date().toISOString(),
            isLoading: false,
            error: null
        });
    }

    /**
     * Update search query
     * @param {string} query - Search query string
     */
    setSearchQuery(query) {
        this.updateState({
            searchQuery: query,
            pagination: {
                ...this.state.pagination,
                currentPage: 1 // Reset to first page on search
            }
        });
    }

    /**
     * Update filters
     * @param {object} filterUpdates - Filter updates to apply
     */
    updateFilters(filterUpdates) {
        this.updateState({
            filters: {
                ...this.state.filters,
                ...filterUpdates
            },
            pagination: {
                ...this.state.pagination,
                currentPage: 1 // Reset to first page on filter change
            }
        });
    }

    /**
     * Update sorting
     * @param {string} field - Field to sort by
     * @param {string} direction - Sort direction ('asc' or 'desc')
     */
    setSorting(field, direction) {
        this.updateState({
            sorting: { field, direction },
            pagination: {
                ...this.state.pagination,
                currentPage: 1 // Reset to first page on sort change
            }
        });
    }

    /**
     * Set current page
     * @param {number} page - Page number to navigate to
     */
    setCurrentPage(page) {
        const totalPages = this.state.pagination.totalPages;
        const validPage = Math.max(1, Math.min(page, totalPages));
        
        this.updateState({
            pagination: {
                ...this.state.pagination,
                currentPage: validPage
            }
        });
    }

    /**
     * Clear all filters and search
     */
    clearFilters() {
        this.updateState({
            searchQuery: '',
            filters: {
                quantFormat: 'all',
                modelType: 'all',
                license: 'all',
                fileSizeMin: 0,
                fileSizeMax: Infinity,
                downloadCountMin: 0,
                downloadCountMax: Infinity,
                likeCountMin: 0,
                likeCountMax: Infinity
            },
            pagination: {
                ...this.state.pagination,
                currentPage: 1
            }
        });
    }

    /**
     * Update engagement filter range
     * @param {number} minLikes - Minimum like count
     * @param {number} maxLikes - Maximum like count
     */
    setEngagementFilter(minLikes, maxLikes) {
        this.updateFilters({
            likeCountMin: Math.max(0, Number(minLikes) || 0),
            likeCountMax: maxLikes === undefined ? Infinity : Math.max(0, Number(maxLikes) || Infinity)
        });
    }

    /**
     * Clear engagement filters only
     */
    clearEngagementFilter() {
        this.updateFilters({
            likeCountMin: 0,
            likeCountMax: Infinity
        });
    }

    /**
     * Get engagement filter statistics from current state
     * @returns {object} Engagement filter statistics
     */
    getEngagementFilterStats() {
        const { allModels, filteredModels, filters } = this.state;
        
        if (!allModels.length) {
            return {
                totalLikes: 0,
                avgLikes: 0,
                maxLikes: 0,
                modelsWithLikes: 0,
                isFiltered: false
            };
        }

        const totalLikes = allModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const avgLikes = totalLikes / allModels.length;
        const maxLikes = Math.max(...allModels.map(model => model.likeCount || 0));
        const modelsWithLikes = allModels.filter(model => (model.likeCount || 0) > 0).length;
        
        const isFiltered = filters.likeCountMin > 0 || filters.likeCountMax < Infinity;
        
        return {
            totalLikes,
            avgLikes,
            maxLikes,
            modelsWithLikes,
            isFiltered,
            filteredCount: filteredModels.length,
            filterRange: {
                min: filters.likeCountMin,
                max: filters.likeCountMax
            }
        };
    }

    /**
     * Get paginated models for current page
     * @returns {Array} Array of models for current page
     */
    getCurrentPageModels() {
        const { currentPage, itemsPerPage } = this.state.pagination;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        return this.state.filteredModels.slice(startIndex, endIndex);
    }

    /**
     * Get active filter summary
     * @returns {Array} Array of active filter descriptions
     */
    getActiveFilters() {
        const filters = [];
        const { searchQuery, filters: stateFilters } = this.state;
        
        if (searchQuery) {
            filters.push(`Search: "${searchQuery}"`);
        }
        
        if (stateFilters.quantFormat !== 'all') {
            filters.push(`Quantization: ${stateFilters.quantFormat}`);
        }
        
        if (stateFilters.modelType !== 'all') {
            filters.push(`Type: ${stateFilters.modelType}`);
        }
        
        if (stateFilters.license !== 'all') {
            filters.push(`License: ${stateFilters.license}`);
        }

        // Add file size filter if active
        if (stateFilters.fileSizeMin > 0 || stateFilters.fileSizeMax < Infinity) {
            const minSize = window.Formatters ? 
                window.Formatters.formatFileSize(stateFilters.fileSizeMin) : 
                stateFilters.fileSizeMin;
            const maxSize = stateFilters.fileSizeMax === Infinity ? 
                '∞' : 
                (window.Formatters ? window.Formatters.formatFileSize(stateFilters.fileSizeMax) : stateFilters.fileSizeMax);
            filters.push(`Size: ${minSize} - ${maxSize}`);
        }

        // Add download count filter if active
        if (stateFilters.downloadCountMin > 0 || stateFilters.downloadCountMax < Infinity) {
            const minDownloads = window.Formatters ? 
                window.Formatters.formatDownloadCount(stateFilters.downloadCountMin) : 
                stateFilters.downloadCountMin;
            const maxDownloads = stateFilters.downloadCountMax === Infinity ? 
                '∞' : 
                (window.Formatters ? window.Formatters.formatDownloadCount(stateFilters.downloadCountMax) : stateFilters.downloadCountMax);
            filters.push(`Downloads: ${minDownloads} - ${maxDownloads}`);
        }

        // Add engagement filter if active
        if (stateFilters.likeCountMin > 0 || stateFilters.likeCountMax < Infinity) {
            const minLikes = window.Formatters ? 
                window.Formatters.formatEngagementNumber(stateFilters.likeCountMin) : 
                stateFilters.likeCountMin;
            const maxLikes = stateFilters.likeCountMax === Infinity ? 
                '∞' : 
                (window.Formatters ? window.Formatters.formatEngagementNumber(stateFilters.likeCountMax) : stateFilters.likeCountMax);
            filters.push(`Likes: ${minLikes} - ${maxLikes}`);
        }
        
        return filters;
    }

    /**
     * Merge state updates with current state
     * @private
     * @param {object} currentState - Current state
     * @param {object} updates - Updates to apply
     * @returns {object} Merged state
     */
    _mergeState(currentState, updates) {
        const newState = this._deepCloneState(currentState);
        
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                newState[key] = {
                    ...newState[key],
                    ...updates[key]
                };
            } else {
                newState[key] = updates[key];
            }
        });
        
        return newState;
    }

    /**
     * Update derived state based on current state
     * @private
     */
    _updateDerivedState() {
        // Update active filters
        this.state.activeFilters = this.getActiveFilters();
        
        // Update pagination totals
        this.state.pagination.totalItems = this.state.filteredModels.length;
        this.state.pagination.totalPages = Math.ceil(
            this.state.filteredModels.length / this.state.pagination.itemsPerPage
        );
        
        // Ensure current page is valid
        if (this.state.pagination.currentPage > this.state.pagination.totalPages) {
            this.state.pagination.currentPage = Math.max(1, this.state.pagination.totalPages);
        }
    }

    /**
     * Notify all subscribers of state changes
     * @private
     * @param {object} previousState - Previous state
     * @param {object} newState - New state
     */
    _notifySubscribers(previousState, newState) {
        this.subscribers.forEach(({ callback, watchKeys }) => {
            // If specific keys are watched, check if any of them changed
            if (watchKeys && Array.isArray(watchKeys)) {
                const hasChanges = watchKeys.some(key => {
                    return JSON.stringify(previousState[key]) !== JSON.stringify(newState[key]);
                });
                
                if (hasChanges) {
                    callback(newState, previousState);
                }
            } else {
                // No specific keys watched, notify on any change
                callback(newState, previousState);
            }
        });
    }
}

// Export for use in other modules
window.AppState = AppState;