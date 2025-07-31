/**
 * Performance Optimization Utilities
 * Handles resource preloading, lazy loading, and performance monitoring
 * Requirements: 5.1, 5.2
 */

/**
 * Performance Optimizer Class
 * Manages various performance optimization techniques
 */
export class PerformanceOptimizer {
  constructor() {
    this.observer = null;
    this.preloadedResources = new Set();
    this.lazyElements = new Map();
    this.performanceMetrics = {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0
    };
    
    this.init();
  }

  /**
   * Initialize performance optimizations
   */
  init() {
    this.setupIntersectionObserver();
    this.preloadCriticalResources();
    this.optimizeImages();
    this.setupPerformanceMonitoring();
    this.registerServiceWorker();
  }

  /**
   * Set up Intersection Observer for lazy loading
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.loadLazyElement(entry.target);
              this.observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources() {
    const criticalResources = [
      { href: './gguf_models.json', as: 'fetch', type: 'application/json' },
      { href: './styles/main.css', as: 'style' },
      { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', as: 'style' }
    ];

    criticalResources.forEach((resource) => {
      if (!this.preloadedResources.has(resource.href)) {
        this.preloadResource(resource);
        this.preloadedResources.add(resource.href);
      }
    });
  }

  /**
   * Preload a specific resource
   */
  preloadResource({ href, as, type, crossorigin }) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    
    // Add error handling
    link.onerror = () => {
      console.warn(`Failed to preload resource: ${href}`);
    };
    
    document.head.appendChild(link);
  }

  /**
   * Optimize images with lazy loading
   */
  optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      this.setupLazyImage(img);
    });
  }

  /**
   * Set up lazy loading for an image
   */
  setupLazyImage(img) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadLazyElement(img);
    }
  }

  /**
   * Load a lazy element
   */
  loadLazyElement(element) {
    if (element.tagName === 'IMG' && element.dataset.src) {
      // Create a new image to preload
      const newImg = new Image();
      newImg.onload = () => {
        element.src = element.dataset.src;
        element.classList.add('loaded');
        element.removeAttribute('data-src');
      };
      newImg.onerror = () => {
        element.classList.add('error');
        console.warn('Failed to load image:', element.dataset.src);
      };
      newImg.src = element.dataset.src;
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    this.measureCoreWebVitals();
    
    // Monitor custom metrics
    this.measureCustomMetrics();
    
    // Set up performance observer
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }

  /**
   * Measure Core Web Vitals
   */
  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
        console.log('LCP:', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP measurement not supported');
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.performanceMetrics.firstInputDelay = entry.processingStart - entry.startTime;
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID measurement not supported');
      }

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.performanceMetrics.cumulativeLayoutShift = clsValue;
        console.log('CLS:', clsValue);
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS measurement not supported');
      }
    }
  }

  /**
   * Measure custom performance metrics
   */
  measureCustomMetrics() {
    // Page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.performanceMetrics.loadTime = loadTime;
      console.log('Page Load Time:', loadTime);
    });

    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.performanceMetrics.firstContentfulPaint = entry.startTime;
            console.log('FCP:', entry.startTime);
          }
        });
      });
      
      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP measurement not supported');
      }
    }
  }

  /**
   * Set up performance observer for resource timing
   */
  setupPerformanceObserver() {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // Log slow resources
        if (entry.duration > 1000) {
          console.warn('Slow resource:', entry.name, entry.duration);
        }
      });
    });
    
    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource timing not supported');
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              this.showUpdateNotification();
            }
          });
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CACHE_UPDATED') {
            console.log('Cache updated by service worker');
          }
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex-1">
          <p class="text-sm font-medium">New version available!</p>
          <p class="text-xs opacity-90">Refresh to get the latest updates.</p>
        </div>
        <button id="refresh-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
          Refresh
        </button>
        <button id="dismiss-btn" class="text-white opacity-75 hover:opacity-100">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Handle refresh button
    notification.querySelector('#refresh-btn').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Handle dismiss button
    notification.querySelector('#dismiss-btn').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Optimize bundle loading with dynamic imports
   */
  async loadModuleWhenNeeded(modulePath, condition = true) {
    if (!condition) return null;
    
    try {
      const module = await import(modulePath);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      return null;
    }
  }

  /**
   * Prefetch resources for next navigation
   */
  prefetchNextPageResources(urls) {
    urls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Report performance metrics (for monitoring)
   */
  reportPerformanceMetrics() {
    const metrics = this.getPerformanceMetrics();
    
    // Log to console for development
    console.table(metrics);
    
    // In production, you might want to send to analytics
    if (window.gtag) {
      window.gtag('event', 'performance_metrics', {
        custom_map: {
          load_time: metrics.loadTime,
          fcp: metrics.firstContentfulPaint,
          lcp: metrics.largestContentfulPaint,
          cls: metrics.cumulativeLayoutShift,
          fid: metrics.firstInputDelay
        }
      });
    }
    
    return metrics;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.lazyElements.clear();
    this.preloadedResources.clear();
  }
}

// Create and export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();