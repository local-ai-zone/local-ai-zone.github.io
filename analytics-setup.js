/**
 * Analytics and Error Tracking Setup
 * Configures Google Analytics, performance monitoring, and error tracking
 */

class AnalyticsManager {
  constructor() {
    this.config = {
      googleAnalyticsId: window.GOOGLE_ANALYTICS_ID || null,
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      enableUserInteractionTracking: true,
      debugMode: window.location.hostname === 'localhost'
    };
    
    this.events = [];
    this.errors = [];
    this.performanceMetrics = {};
    
    this.init();
  }

  init() {
    this.setupGoogleAnalytics();
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.setupUserInteractionTracking();
    
    if (this.config.debugMode) {
      console.log('Analytics Manager initialized in debug mode');
    }
  }

  setupGoogleAnalytics() {
    if (!this.config.googleAnalyticsId) {
      if (this.config.debugMode) {
        console.log('Google Analytics ID not configured');
      }
      return;
    }

    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.googleAnalyticsId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', this.config.googleAnalyticsId, {
      page_title: document.title,
      page_location: window.location.href,
      custom_map: {
        custom_parameter_1: 'model_search',
        custom_parameter_2: 'filter_usage'
      }
    });

    if (this.config.debugMode) {
      console.log('Google Analytics initialized');
    }
  }

  setupPerformanceTracking() {
    if (!this.config.enablePerformanceTracking) return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          this.trackPerformance('page_load', {
            load_time: perfData.loadEventEnd - perfData.loadEventStart,
            dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            first_paint: this.getFirstPaint(),
            total_size: this.getTotalResourceSize()
          });
        }
      }, 0);
    });

    // Track Core Web Vitals
    this.trackCoreWebVitals();

    // Track search performance
    this.trackSearchPerformance();
  }

  setupErrorTracking() {
    if (!this.config.enableErrorTracking) return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });

    // Network errors
    this.setupNetworkErrorTracking();
  }

  setupUserInteractionTracking() {
    if (!this.config.enableUserInteractionTracking) return;

    // Search interactions
    document.addEventListener('input', (event) => {
      if (event.target.matches('[data-search-input]')) {
        this.debounce(() => {
          this.trackEvent('search', 'query_entered', {
            query_length: event.target.value.length,
            has_results: document.querySelectorAll('[data-model-card]').length > 0
          });
        }, 1000)();
      }
    });

    // Filter usage
    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-filter]')) {
        this.trackEvent('filter', 'applied', {
          filter_type: event.target.dataset.filter,
          filter_value: event.target.value,
          active_filters: this.getActiveFilters().length
        });
      }
    });

    // Model card interactions
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-model-card]')) {
        const modelCard = event.target.closest('[data-model-card]');
        const modelId = modelCard.dataset.modelId;
        
        if (event.target.matches('[data-download-link]')) {
          this.trackEvent('model', 'download_clicked', {
            model_id: modelId,
            file_type: event.target.dataset.fileType
          });
        } else if (event.target.matches('[data-model-link]')) {
          this.trackEvent('model', 'details_viewed', {
            model_id: modelId
          });
        }
      }
    });

    // Scroll depth tracking
    this.setupScrollTracking();
  }

  setupNetworkErrorTracking() {
    // Override fetch to track network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.trackError('network_error', {
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        return response;
      } catch (error) {
        this.trackError('network_error', {
          url: args[0],
          message: error.message
        });
        throw error;
      }
    };
  }

  setupScrollTracking() {
    let maxScroll = 0;
    const trackingPoints = [25, 50, 75, 90, 100];
    const tracked = new Set();

    const trackScroll = this.throttle(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      maxScroll = Math.max(maxScroll, scrollPercent);
      
      trackingPoints.forEach(point => {
        if (scrollPercent >= point && !tracked.has(point)) {
          tracked.add(point);
          this.trackEvent('engagement', 'scroll_depth', {
            scroll_depth: point
          });
        }
      });
    }, 1000);

    window.addEventListener('scroll', trackScroll);
  }

  trackCoreWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.trackPerformance('largest_contentful_paint', {
        value: lastEntry.startTime,
        element: lastEntry.element?.tagName
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      this.trackPerformance('first_input_delay', {
        value: firstInput.processingStart - firstInput.startTime,
        event_type: firstInput.name
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.trackPerformance('cumulative_layout_shift', {
        value: clsValue
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  trackSearchPerformance() {
    // Track search timing
    const originalSearch = window.searchEngine?.search;
    if (originalSearch) {
      window.searchEngine.search = (...args) => {
        const startTime = performance.now();
        const result = originalSearch.apply(window.searchEngine, args);
        const endTime = performance.now();
        
        this.trackPerformance('search_performance', {
          query: args[0],
          result_count: result.length,
          search_time: endTime - startTime
        });
        
        return result;
      };
    }
  }

  trackEvent(category, action, parameters = {}) {
    const event = {
      category,
      action,
      parameters,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    };

    this.events.push(event);

    // Send to Google Analytics
    if (window.gtag) {
      gtag('event', action, {
        event_category: category,
        ...parameters
      });
    }

    // Debug logging
    if (this.config.debugMode) {
      console.log('Analytics Event:', event);
    }

    // Limit stored events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  trackError(type, details) {
    const error = {
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    };

    this.errors.push(error);

    // Send to Google Analytics
    if (window.gtag) {
      gtag('event', 'exception', {
        description: `${type}: ${details.message || details.reason || 'Unknown error'}`,
        fatal: false
      });
    }

    // Debug logging
    if (this.config.debugMode) {
      console.error('Analytics Error:', error);
    }

    // Limit stored errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-50);
    }
  }

  trackPerformance(metric, data) {
    this.performanceMetrics[metric] = {
      ...data,
      timestamp: new Date().toISOString()
    };

    // Send to Google Analytics
    if (window.gtag) {
      gtag('event', 'timing_complete', {
        name: metric,
        value: Math.round(data.value || 0)
      });
    }

    // Debug logging
    if (this.config.debugMode) {
      console.log('Performance Metric:', metric, data);
    }
  }

  // Utility methods
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  getTotalResourceSize() {
    const resources = performance.getEntriesByType('resource');
    return resources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
  }

  getActiveFilters() {
    return Array.from(document.querySelectorAll('[data-filter]:checked'))
      .map(filter => ({
        type: filter.dataset.filter,
        value: filter.value
      }));
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Public API methods
  getEvents() {
    return [...this.events];
  }

  getErrors() {
    return [...this.errors];
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  exportData() {
    return {
      events: this.getEvents(),
      errors: this.getErrors(),
      performance: this.getPerformanceMetrics(),
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }

  clearData() {
    this.events = [];
    this.errors = [];
    this.performanceMetrics = {};
  }
}

// Initialize analytics when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.analyticsManager = new AnalyticsManager();
  });
} else {
  window.analyticsManager = new AnalyticsManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsManager;
}