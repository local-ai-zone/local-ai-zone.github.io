/**
 * Debounce utility functions for performance optimization
 * Prevents excessive function calls during rapid user interactions
 */

/**
 * Creates a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @param {Object} options - Additional options
 * @param {boolean} options.immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, delay, options = {}) {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let result;
  
  const { immediate = false } = options;

  const debounced = function(...args) {
    lastArgs = args;
    lastThis = this;

    const callNow = immediate && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        result = func.apply(lastThis, lastArgs);
      }
    }, delay);

    if (callNow) {
      result = func.apply(lastThis, lastArgs);
    }

    return result;
  };

  // Add cancel method
  debounced.cancel = function() {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  // Add flush method
  debounced.flush = function() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      result = func.apply(lastThis, lastArgs);
    }
    return result;
  };

  return debounced;
}

/**
 * Creates a throttled version of a function
 * @param {Function} func - The function to throttle
 * @param {number} delay - The delay in milliseconds
 * @param {Object} options - Additional options
 * @param {boolean} options.leading - Execute on leading edge
 * @param {boolean} options.trailing - Execute on trailing edge
 * @returns {Function} Throttled function
 */
export function throttle(func, delay, options = {}) {
  let timeoutId;
  let lastExecTime = 0;
  let lastArgs;
  let lastThis;
  let result;
  
  const { leading = true, trailing = true } = options;

  const throttled = function(...args) {
    lastArgs = args;
    lastThis = this;
    
    const now = Date.now();
    const timeSinceLastExec = now - lastExecTime;

    const execute = () => {
      lastExecTime = now;
      result = func.apply(lastThis, lastArgs);
    };

    if (leading && timeSinceLastExec >= delay) {
      execute();
    } else if (trailing) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (Date.now() - lastExecTime >= delay) {
          execute();
        }
      }, delay - timeSinceLastExec);
    }

    return result;
  };

  // Add cancel method
  throttled.cancel = function() {
    clearTimeout(timeoutId);
    timeoutId = null;
    lastExecTime = 0;
  };

  return throttled;
}

/**
 * Creates a debounced search function optimized for search inputs
 * @param {Function} searchFunc - The search function to debounce
 * @param {number} delay - The delay in milliseconds (default: 300)
 * @returns {Function} Debounced search function
 */
export function debounceSearch(searchFunc, delay = 300) {
  let timeoutId;
  let lastQuery = '';
  let isSearching = false;

  const debouncedSearch = function(query) {
    // If query is empty, execute immediately
    if (!query || query.trim().length === 0) {
      clearTimeout(timeoutId);
      lastQuery = '';
      isSearching = false;
      return searchFunc('');
    }

    // If query is the same as last query, don't search again
    if (query === lastQuery && !isSearching) {
      return;
    }

    lastQuery = query;
    isSearching = true;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      isSearching = false;
      searchFunc(query);
    }, delay);
  };

  // Add immediate search method
  debouncedSearch.immediate = function(query) {
    clearTimeout(timeoutId);
    lastQuery = query;
    isSearching = false;
    return searchFunc(query);
  };

  // Add cancel method
  debouncedSearch.cancel = function() {
    clearTimeout(timeoutId);
    isSearching = false;
  };

  return debouncedSearch;
}

/**
 * Creates a debounced filter function for multiple filter criteria
 * @param {Function} filterFunc - The filter function to debounce
 * @param {number} delay - The delay in milliseconds (default: 150)
 * @returns {Function} Debounced filter function
 */
export function debounceFilter(filterFunc, delay = 150) {
  let timeoutId;
  let lastFilters = null;
  let isFiltering = false;

  const debouncedFilter = function(filters) {
    // Compare filters to avoid unnecessary calls
    if (lastFilters && JSON.stringify(filters) === JSON.stringify(lastFilters) && !isFiltering) {
      return;
    }

    lastFilters = { ...filters };
    isFiltering = true;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      isFiltering = false;
      filterFunc(filters);
    }, delay);
  };

  // Add immediate filter method
  debouncedFilter.immediate = function(filters) {
    clearTimeout(timeoutId);
    lastFilters = { ...filters };
    isFiltering = false;
    return filterFunc(filters);
  };

  // Add cancel method
  debouncedFilter.cancel = function() {
    clearTimeout(timeoutId);
    isFiltering = false;
  };

  return debouncedFilter;
}

/**
 * Creates a debounced resize handler
 * @param {Function} resizeFunc - The resize function to debounce
 * @param {number} delay - The delay in milliseconds (default: 250)
 * @returns {Function} Debounced resize function
 */
export function debounceResize(resizeFunc, delay = 250) {
  return debounce(resizeFunc, delay, { immediate: false });
}

/**
 * Creates a throttled scroll handler
 * @param {Function} scrollFunc - The scroll function to throttle
 * @param {number} delay - The delay in milliseconds (default: 16)
 * @returns {Function} Throttled scroll function
 */
export function throttleScroll(scrollFunc, delay = 16) {
  return throttle(scrollFunc, delay, { leading: true, trailing: true });
}

/**
 * Request animation frame based throttling for smooth animations
 * @param {Function} func - The function to throttle
 * @returns {Function} RAF throttled function
 */
export function rafThrottle(func) {
  let rafId;
  let lastArgs;
  let lastThis;

  const throttled = function(...args) {
    lastArgs = args;
    lastThis = this;

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        func.apply(lastThis, lastArgs);
      });
    }
  };

  throttled.cancel = function() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}