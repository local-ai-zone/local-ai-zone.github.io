/**
 * Performance Monitoring System
 * Tracks page load times, search performance, and user interactions
 * Requirements: 5.1
 */

/**
 * Performance Monitor Class
 * Comprehensive performance tracking and reporting
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // Core Web Vitals
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      
      // Custom metrics
      pageLoadTime: null,
      searchPerformance: [],
      userInteractions: [],
      resourceTimings: [],
      
      // Performance budgets
      budgets: {
        pageLoadTime: 3000, // 3 seconds
        searchTime: 500,    // 500ms
        lcp: 2500,          // 2.5 seconds
        fid: 100,           // 100ms
        cls: 0.1            // 0.1 score
      }
    };
    
    this.observers = [];
    this.startTime = performance.now();
    this.isMonitoring = true;
    
    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    this.setupCoreWebVitals();
    this.setupCustomMetrics();
    this.setupResourceMonitoring();
    this.setupUserInteractionTracking();
    this.setupPerformanceBudgets();
    
    console.log('📊 Performance monitoring initialized');
  }

  /**
   * Set up Core Web Vitals monitoring
   */
  setupCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = Math.round(lastEntry.startTime);
          this.checkBudget('lcp', this.metrics.lcp);
          this.reportMetric('LCP', this.metrics.lcp, 'ms');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.metrics.fid = Math.round(entry.processingStart - entry.startTime);
            this.checkBudget('fid', this.metrics.fid);
            this.reportMetric('FID', this.metrics.fid, 'ms');
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cls = Math.round(clsValue * 1000) / 1000;
          this.checkBudget('cls', this.metrics.cls);
          this.reportMetric('CLS', this.metrics.cls, 'score');
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }

      // First Contentful Paint (FCP)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = Math.round(entry.startTime);
              this.reportMetric('FCP', this.metrics.fcp, 'ms');
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (e) {
        console.warn('FCP monitoring not supported');
      }
    }
  }

  /**
   * Set up custom performance metrics
   */
  setupCustomMetrics() {
    // Page load time
    window.addEventListener('load', () => {
      this.metrics.pageLoadTime = Math.round(performance.now() - this.startTime);
      this.checkBudget('pageLoadTime', this.metrics.pageLoadTime);
      this.reportMetric('Page Load Time', this.metrics.pageLoadTime, 'ms');
    });

    // Time to First Byte (TTFB)
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.metrics.ttfb = Math.round(entry.responseStart - entry.requestStart);
              this.reportMetric('TTFB', this.metrics.ttfb, 'ms');
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        console.warn('Navigation timing not supported');
      }
    }
  }

  /**
   * Set up resource monitoring
   */
  setupResourceMonitoring() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const resourceTiming = {
              name: entry.name,
              duration: Math.round(entry.duration),
              size: entry.transferSize || 0,
              type: this.getResourceType(entry.name),
              timestamp: Date.now()
            };
            
            this.metrics.resourceTimings.push(resourceTiming);
            
            // Alert on slow resources
            if (entry.duration > 2000) {
              this.reportSlowResource(resourceTiming);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource timing not supported');
      }
    }
  }

  /**
   * Set up user interaction tracking
   */
  setupUserInteractionTracking() {
    // Track search interactions
    document.addEventListener('input', (event) => {
      if (event.target.id === 'model-search') {
        const startTime = performance.now();
        
        // Track search performance
        const trackSearchEnd = () => {
          const endTime = performance.now();
          const searchTime = Math.round(endTime - startTime);
          
          this.metrics.searchPerformance.push({
            query: event.target.value,
            duration: searchTime,
            timestamp: Date.now()
          });
          
          this.checkBudget('searchTime', searchTime);
          this.reportMetric('Search Time', searchTime, 'ms');
        };
        
        // Use a timeout to capture the search completion
        setTimeout(trackSearchEnd, 100);
      }
    });

    // Track click interactions
    document.addEventListener('click', (event) => {
      const interaction = {
        type: 'click',
        target: event.target.tagName,
        className: event.target.className,
        timestamp: Date.now()
      };
      
      this.metrics.userInteractions.push(interaction);
      
      // Keep only last 100 interactions
      if (this.metrics.userInteractions.length > 100) {
        this.metrics.userInteractions = this.metrics.userInteractions.slice(-100);
      }
    });

    // Track scroll performance
    let scrollStartTime = null;
    document.addEventListener('scroll', () => {
      if (!scrollStartTime) {
        scrollStartTime = performance.now();
        
        // Debounce scroll end detection
        setTimeout(() => {
          const scrollTime = Math.round(performance.now() - scrollStartTime);
          if (scrollTime > 16) { // More than one frame
            this.reportMetric('Scroll Performance', scrollTime, 'ms');
          }
          scrollStartTime = null;
        }, 150);
      }
    });
  }

  /**
   * Set up performance budgets and alerts
   */
  setupPerformanceBudgets() {
    // Check budgets periodically
    setInterval(() => {
      this.checkAllBudgets();
    }, 30000); // Every 30 seconds
  }

  /**
   * Check if a metric exceeds its budget
   */
  checkBudget(metricName, value) {
    const budget = this.metrics.budgets[metricName];
    if (budget && value > budget) {
      this.reportBudgetExceeded(metricName, value, budget);
    }
  }

  /**
   * Check all performance budgets
   */
  checkAllBudgets() {
    Object.keys(this.metrics.budgets).forEach((metricName) => {
      const value = this.metrics[metricName];
      if (value !== null) {
        this.checkBudget(metricName, value);
      }
    });
  }

  /**
   * Report a performance metric
   */
  reportMetric(name, value, unit) {
    if (!this.isMonitoring) return;
    
    console.log(`📊 ${name}: ${value}${unit}`);
    
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name.toLowerCase().replace(/\s+/g, '_'),
        metric_value: value,
        metric_unit: unit
      });
    }
  }

  /**
   * Report budget exceeded
   */
  reportBudgetExceeded(metricName, value, budget) {
    console.warn(`⚠️ Performance budget exceeded: ${metricName} (${value} > ${budget})`);
    
    // Send alert to analytics
    if (window.gtag) {
      window.gtag('event', 'performance_budget_exceeded', {
        metric_name: metricName,
        actual_value: value,
        budget_value: budget,
        overage: value - budget
      });
    }
  }

  /**
   * Report slow resource
   */
  reportSlowResource(resource) {
    console.warn(`🐌 Slow resource detected: ${resource.name} (${resource.duration}ms)`);
    
    if (window.gtag) {
      window.gtag('event', 'slow_resource', {
        resource_name: resource.name,
        resource_type: resource.type,
        duration: resource.duration,
        size: resource.size
      });
    }
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.json')) return 'data';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      coreWebVitals: {
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls,
        fcp: this.metrics.fcp,
        ttfb: this.metrics.ttfb
      },
      customMetrics: {
        pageLoadTime: this.metrics.pageLoadTime,
        averageSearchTime: this.getAverageSearchTime(),
        totalInteractions: this.metrics.userInteractions.length
      },
      budgetStatus: this.getBudgetStatus(),
      resourceSummary: this.getResourceSummary()
    };
    
    return summary;
  }

  /**
   * Get average search time
   */
  getAverageSearchTime() {
    if (this.metrics.searchPerformance.length === 0) return null;
    
    const total = this.metrics.searchPerformance.reduce((sum, search) => sum + search.duration, 0);
    return Math.round(total / this.metrics.searchPerformance.length);
  }

  /**
   * Get budget status
   */
  getBudgetStatus() {
    const status = {};
    
    Object.keys(this.metrics.budgets).forEach((metricName) => {
      const value = this.metrics[metricName];
      const budget = this.metrics.budgets[metricName];
      
      if (value !== null) {
        status[metricName] = {
          value,
          budget,
          status: value <= budget ? 'pass' : 'fail',
          overage: value > budget ? value - budget : 0
        };
      }
    });
    
    return status;
  }

  /**
   * Get resource summary
   */
  getResourceSummary() {
    const summary = {
      totalResources: this.metrics.resourceTimings.length,
      totalSize: this.metrics.resourceTimings.reduce((sum, resource) => sum + resource.size, 0),
      slowResources: this.metrics.resourceTimings.filter(resource => resource.duration > 1000).length,
      byType: {}
    };
    
    // Group by type
    this.metrics.resourceTimings.forEach((resource) => {
      if (!summary.byType[resource.type]) {
        summary.byType[resource.type] = {
          count: 0,
          totalSize: 0,
          averageDuration: 0
        };
      }
      
      summary.byType[resource.type].count++;
      summary.byType[resource.type].totalSize += resource.size;
    });
    
    // Calculate averages
    Object.keys(summary.byType).forEach((type) => {
      const typeData = summary.byType[type];
      const typeResources = this.metrics.resourceTimings.filter(r => r.type === type);
      const totalDuration = typeResources.reduce((sum, r) => sum + r.duration, 0);
      typeData.averageDuration = Math.round(totalDuration / typeData.count);
    });
    
    return summary;
  }

  /**
   * Export performance data
   */
  exportData() {
    const data = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      summary: this.getPerformanceSummary()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const summary = this.getPerformanceSummary();
    
    console.group('📊 Performance Report');
    console.table(summary.coreWebVitals);
    console.table(summary.customMetrics);
    console.table(summary.budgetStatus);
    console.log('Resource Summary:', summary.resourceSummary);
    console.groupEnd();
    
    return summary;
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Restart monitoring
   */
  restart() {
    this.stop();
    this.isMonitoring = true;
    this.init();
  }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitor();