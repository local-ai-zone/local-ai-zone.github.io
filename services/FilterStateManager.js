/**
 * FilterStateManager handles filter state management, URL persistence, and validation
 * Provides centralized management of filter state with URL synchronization
 */
export class FilterStateManager {
  constructor() {
    this.defaultState = this.getDefaultFilterState();
    this.currentState = { ...this.defaultState };
    this.listeners = new Set();
  }

  /**
   * Get the default filter state
   * @returns {FilterState} Default filter state
   */
  getDefaultFilterState() {
    return {
      quantizations: [],
      architectures: [],
      families: [],
      sizeRanges: [],
      searchQuery: ''
    };
  }

  /**
   * Get the current filter state
   * @returns {FilterState} Current filter state
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * Update the filter state
   * @param {Partial<FilterState>} updates - Partial filter state updates
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  updateState(updates, updateUrl = true) {
    const previousState = { ...this.currentState };
    
    // Validate updates before applying
    if (!this.validateStateUpdates(updates)) {
      console.warn('Invalid filter state updates provided:', updates);
      return;
    }

    // Apply updates to current state
    this.currentState = {
      ...this.currentState,
      ...updates
    };

    // Update URL if requested
    if (updateUrl) {
      this.updateUrlFromState();
    }

    // Notify listeners of state change
    this.notifyListeners(this.currentState, previousState);
  }

  /**
   * Reset filter state to default values
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  resetState(updateUrl = true) {
    const previousState = { ...this.currentState };
    this.currentState = { ...this.defaultState };

    if (updateUrl) {
      this.updateUrlFromState();
    }

    this.notifyListeners(this.currentState, previousState);
  }

  /**
   * Clear specific filter categories
   * @param {string[]} categories - Array of filter categories to clear
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  clearFilters(categories, updateUrl = true) {
    const previousState = { ...this.currentState };
    const updates = {};

    categories.forEach(category => {
      if (category === 'searchQuery') {
        updates[category] = '';
      } else if (Array.isArray(this.currentState[category])) {
        updates[category] = [];
      }
    });

    this.updateState(updates, updateUrl);
  }

  /**
   * Add a value to a filter array
   * @param {string} category - Filter category (quantizations, architectures, etc.)
   * @param {string} value - Value to add
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  addFilterValue(category, value, updateUrl = true) {
    if (!Array.isArray(this.currentState[category])) {
      console.warn(`Cannot add value to non-array filter category: ${category}`);
      return;
    }

    if (!this.currentState[category].includes(value)) {
      const updatedArray = [...this.currentState[category], value];
      this.updateState({ [category]: updatedArray }, updateUrl);
    }
  }

  /**
   * Remove a value from a filter array
   * @param {string} category - Filter category (quantizations, architectures, etc.)
   * @param {string} value - Value to remove
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  removeFilterValue(category, value, updateUrl = true) {
    if (!Array.isArray(this.currentState[category])) {
      console.warn(`Cannot remove value from non-array filter category: ${category}`);
      return;
    }

    const updatedArray = this.currentState[category].filter(item => item !== value);
    this.updateState({ [category]: updatedArray }, updateUrl);
  }

  /**
   * Toggle a value in a filter array (add if not present, remove if present)
   * @param {string} category - Filter category
   * @param {string} value - Value to toggle
   * @param {boolean} updateUrl - Whether to update the URL (default: true)
   */
  toggleFilterValue(category, value, updateUrl = true) {
    if (!Array.isArray(this.currentState[category])) {
      console.warn(`Cannot toggle value in non-array filter category: ${category}`);
      return;
    }

    if (this.currentState[category].includes(value)) {
      this.removeFilterValue(category, value, updateUrl);
    } else {
      this.addFilterValue(category, value, updateUrl);
    }
  }

  /**
   * Load filter state from URL parameters
   * @returns {FilterState} Filter state loaded from URL
   */
  loadStateFromUrl() {
    try {
      if (typeof window === 'undefined') {
        return this.defaultState;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const state = { ...this.defaultState };

      // Load array-based filters
      const arrayFilters = ['quantizations', 'architectures', 'families', 'sizeRanges'];
      arrayFilters.forEach(filter => {
        const param = urlParams.get(filter);
        if (param) {
          state[filter] = param.split(',').filter(item => item.trim().length > 0);
        }
      });

      // Load search query
      const searchQuery = urlParams.get('search');
      if (searchQuery) {
        state.searchQuery = decodeURIComponent(searchQuery);
      }

      // Validate loaded state
      if (this.validateFilterState(state)) {
        this.currentState = state;
        this.notifyListeners(this.currentState, this.defaultState);
        return state;
      } else {
        console.warn('Invalid filter state loaded from URL, using defaults');
        return this.defaultState;
      }
    } catch (error) {
      console.error('Error loading filter state from URL:', error);
      return this.defaultState;
    }
  }

  /**
   * Update URL parameters based on current filter state
   */
  updateUrlFromState() {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      
      const url = new URL(window.location);
      const params = url.searchParams;

      // Clear existing filter parameters
      const filterParams = ['quantizations', 'architectures', 'families', 'sizeRanges', 'search'];
      filterParams.forEach(param => params.delete(param));

      // Add current filter values to URL
      const arrayFilters = ['quantizations', 'architectures', 'families', 'sizeRanges'];
      arrayFilters.forEach(filter => {
        if (this.currentState[filter] && this.currentState[filter].length > 0) {
          params.set(filter, this.currentState[filter].join(','));
        }
      });

      // Add search query
      if (this.currentState.searchQuery && this.currentState.searchQuery.trim().length > 0) {
        params.set('search', encodeURIComponent(this.currentState.searchQuery));
      }

      // Update URL without triggering page reload
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Error updating URL from filter state:', error);
    }
  }

  /**
   * Check if current state has any active filters
   * @returns {boolean} True if any filters are active
   */
  hasActiveFilters() {
    const arrayFilters = ['quantizations', 'architectures', 'families', 'sizeRanges'];
    
    // Check array filters
    const hasArrayFilters = arrayFilters.some(filter => 
      this.currentState[filter] && this.currentState[filter].length > 0
    );

    // Check search query
    const hasSearchQuery = Boolean(this.currentState.searchQuery && 
      this.currentState.searchQuery.trim().length > 0);

    return hasArrayFilters || hasSearchQuery;
  }

  /**
   * Get count of active filters
   * @returns {number} Number of active filter values
   */
  getActiveFilterCount() {
    let count = 0;
    
    const arrayFilters = ['quantizations', 'architectures', 'families', 'sizeRanges'];
    arrayFilters.forEach(filter => {
      if (this.currentState[filter]) {
        count += this.currentState[filter].length;
      }
    });

    if (this.currentState.searchQuery && this.currentState.searchQuery.trim().length > 0) {
      count += 1;
    }

    return count;
  }

  /**
   * Add a listener for filter state changes
   * @param {Function} listener - Callback function to call on state changes
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
  }

  /**
   * Remove a listener for filter state changes
   * @param {Function} listener - Callback function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   * @param {FilterState} newState - New filter state
   * @param {FilterState} previousState - Previous filter state
   */
  notifyListeners(newState, previousState) {
    this.listeners.forEach(listener => {
      try {
        listener(newState, previousState);
      } catch (error) {
        console.error('Error in filter state listener:', error);
      }
    });
  }

  /**
   * Validate filter state updates
   * @param {Partial<FilterState>} updates - State updates to validate
   * @returns {boolean} True if updates are valid
   */
  validateStateUpdates(updates) {
    if (!updates || typeof updates !== 'object') {
      return false;
    }

    const arrayFields = ['quantizations', 'architectures', 'families', 'sizeRanges'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (arrayFields.includes(key)) {
        if (!Array.isArray(value)) {
          return false;
        }
        // Check that all array items are strings
        if (!value.every(item => typeof item === 'string')) {
          return false;
        }
      } else if (key === 'searchQuery') {
        if (typeof value !== 'string') {
          return false;
        }
      } else {
        // Unknown field
        console.warn(`Unknown filter field: ${key}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate complete filter state
   * @param {FilterState} state - Filter state to validate
   * @returns {boolean} True if state is valid
   */
  validateFilterState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    const requiredFields = ['quantizations', 'architectures', 'families', 'sizeRanges', 'searchQuery'];
    
    // Check all required fields are present
    for (const field of requiredFields) {
      if (!(field in state)) {
        return false;
      }
    }

    // Validate field types
    const arrayFields = ['quantizations', 'architectures', 'families', 'sizeRanges'];
    for (const field of arrayFields) {
      if (!Array.isArray(state[field])) {
        return false;
      }
      if (!state[field].every(item => typeof item === 'string')) {
        return false;
      }
    }

    if (typeof state.searchQuery !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Initialize the filter state manager (call this on app startup)
   */
  initialize() {
    // Load initial state from URL
    this.loadStateFromUrl();

    // Listen for browser back/forward navigation
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.loadStateFromUrl();
      });
    }
  }

  /**
   * Cleanup resources (call this on app shutdown)
   */
  destroy() {
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.loadStateFromUrl);
    }
  }
}

/**
 * @typedef {Object} FilterState
 * @property {string[]} quantizations - Selected quantization types
 * @property {string[]} sizeRanges - Selected size ranges
 * @property {string[]} architectures - Selected architectures
 * @property {string[]} families - Selected families
 * @property {string} searchQuery - Text search query
 */