/**
 * Performance monitoring and optimization utilities
 * Provides tools for measuring and optimizing application performance
 */

/**
 * Performance monitor class for tracking application metrics
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = true;
  }

  /**
   * Start timing a performance metric
   * @param {string} name - Metric name
   */
  startTiming(name) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  /**
   * End timing a performance metric
   * @param {string} name - Metric name
   * @returns {number} Duration in milliseconds
   */
  endTiming(name) {
    if (!this.isEnabled) return 0;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return 0;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations
    if (metric.duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`);
    }

    return metric.duration;
  }

  /**
   * Measure the execution time of a function
   * @param {string} name - Metric name
   * @param {Function} func - Function to measure
   * @returns {*} Function result
   */
  measure(name, func) {
    if (!this.isEnabled) return func();
    
    this.startTiming(name);
    const result = func();
    this.endTiming(name);
    return result;
  }

  /**
   * Measure the execution time of an async function
   * @param {string} name - Metric name
   * @param {Function} func - Async function to measure
   * @returns {Promise<*>} Function result
   */
  async measureAsync(name, func) {
    if (!this.isEnabled) return func();
    
    this.startTiming(name);
    const result = await func();
    this.endTiming(name);
    return result;
  }

  /**
   * Get performance metrics
   * @param {string} name - Optional metric name
   * @returns {Object|Map} Metric data
   */
  getMetrics(name) {
    if (name) {
      return this.metrics.get(name);
    }
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

/**
 * DOM performance utilities
 */
export class DOMPerformance {
  /**
   * Batch DOM operations to minimize reflows
   * @param {Function} operations - Function containing DOM operations
   * @returns {*} Function result
   */
  static batchDOMOperations(operations) {
    // Use document fragment for multiple insertions
    const fragment = document.createDocumentFragment();
    
    // Execute operations with fragment
    const result = operations(fragment);
    
    return result;
  }

  /**
   * Optimize DOM manipulation by using requestAnimationFrame
   * @param {Function} operation - DOM operation to perform
   * @returns {Promise} Promise that resolves when operation is complete
   */
  static optimizedDOMUpdate(operation) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        operation();
        resolve();
      });
    });
  }

  /**
   * Measure layout thrashing
   * @param {Function} operation - Operation that might cause layout thrashing
   * @returns {Object} Performance metrics
   */
  static measureLayoutThrashing(operation) {
    const startTime = performance.now();
    
    // Force layout calculation
    document.body.offsetHeight;
    
    const beforeOperation = performance.now();
    operation();
    const afterOperation = performance.now();
    
    // Force layout calculation again
    document.body.offsetHeight;
    
    const endTime = performance.now();

    return {
      totalTime: endTime - startTime,
      operationTime: afterOperation - beforeOperation,
      layoutTime: (beforeOperation - startTime) + (endTime - afterOperation)
    };
  }

  /**
   * Create an optimized element with minimal reflows
   * @param {string} tagName - Element tag name
   * @param {Object} attributes - Element attributes
   * @param {string} textContent - Element text content
   * @returns {HTMLElement} Created element
   */
  static createOptimizedElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);
    
    // Set all attributes at once
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  constructor() {
    this.cleanupTasks = new Set();
    this.observers = new Map();
  }

  /**
   * Register a cleanup task
   * @param {Function} cleanupFunc - Cleanup function
   */
  registerCleanup(cleanupFunc) {
    this.cleanupTasks.add(cleanupFunc);
  }

  /**
   * Execute all cleanup tasks
   */
  cleanup() {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    this.cleanupTasks.clear();
  }

  /**
   * Monitor memory usage (if available)
   * @returns {Object|null} Memory info
   */
  getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  /**
   * Check if memory usage is high
   * @param {number} threshold - Threshold percentage (default: 80)
   * @returns {boolean} True if memory usage is high
   */
  isMemoryUsageHigh(threshold = 80) {
    const memInfo = this.getMemoryInfo();
    return memInfo ? memInfo.usedPercentage > threshold : false;
  }
}

/**
 * Lazy loading utilities
 */
export class LazyLoader {
  constructor(options = {}) {
    this.threshold = options.threshold || '200px';
    this.observer = null;
    this.loadedElements = new WeakSet();
    this.setupIntersectionObserver();
  }

  /**
   * Set up intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if (!window.IntersectionObserver) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
            this.loadElement(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: this.threshold,
        threshold: 0.1
      }
    );
  }

  /**
   * Observe an element for lazy loading
   * @param {HTMLElement} element - Element to observe
   * @param {Function} loadCallback - Callback to execute when element should load
   */
  observe(element, loadCallback) {
    if (!this.observer) return;

    element.dataset.lazyLoad = 'true';
    element.dataset.loadCallback = loadCallback.toString();
    this.observer.observe(element);
  }

  /**
   * Load an element
   * @param {HTMLElement} element - Element to load
   */
  loadElement(element) {
    if (this.loadedElements.has(element)) return;

    const loadCallback = element.dataset.loadCallback;
    if (loadCallback) {
      try {
        // Execute the load callback
        const func = new Function('element', loadCallback);
        func(element);
      } catch (error) {
        console.error('Error loading lazy element:', error);
      }
    }

    this.loadedElements.add(element);
    element.removeAttribute('data-lazy-load');
    element.removeAttribute('data-load-callback');
  }

  /**
   * Destroy the lazy loader
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadedElements = new WeakSet();
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Global memory manager instance
 */
export const memoryManager = new MemoryManager();

/**
 * Utility functions for common performance optimizations
 */

/**
 * Debounce function calls to improve performance
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function calls to improve performance
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Check if the current device has limited resources
 * @returns {boolean} True if device has limited resources
 */
export function isLowEndDevice() {
  // Check for various indicators of low-end devices
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const deviceMemory = navigator.deviceMemory || 1;

  return (
    hardwareConcurrency <= 2 ||
    deviceMemory <= 2 ||
    (connection && connection.effectiveType === 'slow-2g') ||
    (connection && connection.effectiveType === '2g')
  );
}

/**
 * Get performance recommendations based on current conditions
 * @returns {Object} Performance recommendations
 */
export function getPerformanceRecommendations() {
  const isLowEnd = isLowEndDevice();
  const memInfo = memoryManager.getMemoryInfo();
  const isHighMemoryUsage = memoryManager.isMemoryUsageHigh();

  return {
    enableVirtualScrolling: isLowEnd || isHighMemoryUsage,
    reduceAnimations: isLowEnd,
    increaseDebouncingDelay: isLowEnd,
    enableLazyLoading: true,
    batchDOMUpdates: isHighMemoryUsage,
    memoryInfo: memInfo,
    isLowEndDevice: isLowEnd
  };
}