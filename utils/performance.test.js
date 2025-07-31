/**
 * Tests for performance monitoring and optimization utilities
 * Verifies performance measurement, DOM optimization, and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceMonitor,
  DOMPerformance,
  MemoryManager,
  LazyLoader,
  performanceMonitor,
  memoryManager,
  debounce,
  throttle,
  isLowEndDevice,
  getPerformanceRecommendations
} from './performance.js';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    
    // Mock performance.now()
    global.performance = {
      now: vi.fn(() => Date.now())
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Timing Measurements', () => {
    it('should start and end timing correctly', () => {
      global.performance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);

      monitor.startTiming('test-operation');
      const duration = monitor.endTiming('test-operation');

      expect(duration).toBe(100);
      
      const metric = monitor.getMetrics('test-operation');
      expect(metric.startTime).toBe(100);
      expect(metric.endTime).toBe(200);
      expect(metric.duration).toBe(100);
    });

    it('should warn about slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.performance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(250); // 150ms duration

      monitor.startTiming('slow-operation');
      monitor.endTiming('slow-operation');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected: slow-operation took 150.00ms')
      );
    });

    it('should handle ending non-existent timing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const duration = monitor.endTiming('non-existent');
      
      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance metric "non-existent" was not started'
      );
    });
  });

  describe('Function Measurement', () => {
    it('should measure synchronous function execution', () => {
      global.performance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);

      const testFn = vi.fn(() => 'result');
      const result = monitor.measure('sync-test', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
      
      const metric = monitor.getMetrics('sync-test');
      expect(metric.duration).toBe(50);
    });

    it('should measure asynchronous function execution', async () => {
      global.performance.now
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);

      const asyncFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      const result = await monitor.measureAsync('async-test', asyncFn);

      expect(result).toBe('async-result');
      expect(asyncFn).toHaveBeenCalled();
      
      const metric = monitor.getMetrics('async-test');
      expect(metric.duration).toBe(100);
    });
  });

  describe('Configuration', () => {
    it('should disable monitoring when set to false', () => {
      monitor.setEnabled(false);
      
      const testFn = vi.fn(() => 'result');
      const result = monitor.measure('disabled-test', testFn);

      expect(result).toBe('result');
      expect(monitor.getMetrics('disabled-test')).toBeUndefined();
    });

    it('should clear all metrics', () => {
      monitor.startTiming('test1');
      monitor.startTiming('test2');
      
      expect(monitor.getMetrics().size).toBe(2);
      
      monitor.clearMetrics();
      expect(monitor.getMetrics().size).toBe(0);
    });
  });
});

describe('DOMPerformance', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    
    // Mock document.createDocumentFragment
    global.document.createDocumentFragment = vi.fn(() => ({
      appendChild: vi.fn(),
      childNodes: []
    }));
  });

  describe('DOM Operations', () => {
    it('should batch DOM operations using document fragment', () => {
      const operations = vi.fn((fragment) => {
        fragment.appendChild(document.createElement('div'));
        return 'result';
      });

      const result = DOMPerformance.batchDOMOperations(operations);

      expect(result).toBe('result');
      expect(operations).toHaveBeenCalled();
      expect(document.createDocumentFragment).toHaveBeenCalled();
    });

    it('should optimize DOM updates with requestAnimationFrame', async () => {
      global.requestAnimationFrame = vi.fn((callback) => {
        setTimeout(callback, 16);
        return 1;
      });

      const operation = vi.fn();
      const promise = DOMPerformance.optimizedDOMUpdate(operation);

      expect(operation).not.toHaveBeenCalled();
      
      await promise;
      expect(operation).toHaveBeenCalled();
    });

    it('should measure layout thrashing', () => {
      // Mock offsetHeight to simulate layout calculations
      Object.defineProperty(document.body, 'offsetHeight', {
        get: vi.fn(() => 100)
      });

      global.performance.now = vi.fn()
        .mockReturnValueOnce(100) // start
        .mockReturnValueOnce(110) // before operation
        .mockReturnValueOnce(120) // after operation
        .mockReturnValueOnce(130); // end

      const operation = vi.fn();
      const metrics = DOMPerformance.measureLayoutThrashing(operation);

      expect(metrics.totalTime).toBe(30);
      expect(metrics.operationTime).toBe(10);
      expect(metrics.layoutTime).toBe(20);
    });

    it('should create optimized elements', () => {
      const element = DOMPerformance.createOptimizedElement('div', {
        className: 'test-class',
        id: 'test-id',
        style: { color: 'red', fontSize: '16px' }
      }, 'Test content');

      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test-class');
      expect(element.id).toBe('test-id');
      expect(element.textContent).toBe('Test content');
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });
  });
});

describe('MemoryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  describe('Cleanup Management', () => {
    it('should register and execute cleanup tasks', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      manager.registerCleanup(cleanup1);
      manager.registerCleanup(cleanup2);

      manager.cleanup();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorCleanup = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const normalCleanup = vi.fn();

      manager.registerCleanup(errorCleanup);
      manager.registerCleanup(normalCleanup);

      manager.cleanup();

      expect(consoleSpy).toHaveBeenCalledWith('Error during cleanup:', expect.any(Error));
      expect(normalCleanup).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    it('should return memory info when available', () => {
      global.performance.memory = {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
        jsHeapSizeLimit: 200000000
      };

      const memInfo = manager.getMemoryInfo();

      expect(memInfo.usedJSHeapSize).toBe(50000000);
      expect(memInfo.totalJSHeapSize).toBe(100000000);
      expect(memInfo.jsHeapSizeLimit).toBe(200000000);
      expect(memInfo.usedPercentage).toBe(25);
    });

    it('should return null when memory info is not available', () => {
      global.performance.memory = undefined;

      const memInfo = manager.getMemoryInfo();
      expect(memInfo).toBeNull();
    });

    it('should detect high memory usage', () => {
      global.performance.memory = {
        usedJSHeapSize: 160000000,
        jsHeapSizeLimit: 200000000
      };

      expect(manager.isMemoryUsageHigh(80)).toBe(true);
      expect(manager.isMemoryUsageHigh(90)).toBe(false);
    });
  });
});

describe('LazyLoader', () => {
  let lazyLoader;

  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      callback
    }));

    lazyLoader = new LazyLoader({ threshold: '100px' });
  });

  afterEach(() => {
    if (lazyLoader) {
      lazyLoader.destroy();
    }
  });

  it('should set up intersection observer', () => {
    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    );
  });

  it('should observe elements for lazy loading', () => {
    const element = document.createElement('div');
    const loadCallback = vi.fn();

    lazyLoader.observe(element, loadCallback);

    expect(element.dataset.lazyLoad).toBe('true');
    expect(element.dataset.loadCallback).toBe(loadCallback.toString());
    expect(lazyLoader.observer.observe).toHaveBeenCalledWith(element);
  });

  it('should load element when intersecting', () => {
    const element = document.createElement('div');
    const loadCallback = vi.fn();
    
    element.dataset.loadCallback = 'element.classList.add("loaded")';
    
    lazyLoader.loadElement(element);

    expect(lazyLoader.loadedElements.has(element)).toBe(true);
    expect(element.dataset.lazyLoad).toBeUndefined();
    expect(element.dataset.loadCallback).toBeUndefined();
  });

  it('should handle load callback errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const element = document.createElement('div');
    
    element.dataset.loadCallback = 'throw new Error("Load error")';
    
    lazyLoader.loadElement(element);

    expect(consoleSpy).toHaveBeenCalledWith('Error loading lazy element:', expect.any(Error));
  });

  it('should destroy properly', () => {
    lazyLoader.destroy();

    expect(lazyLoader.observer.disconnect).toHaveBeenCalled();
    expect(lazyLoader.observer).toBeNull();
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Device Detection', () => {
  beforeEach(() => {
    // Reset navigator mocks
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: 4
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      writable: true,
      value: 4
    });
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: { effectiveType: '4g' }
    });
  });

  describe('isLowEndDevice', () => {
    it('should detect low-end device based on hardware concurrency', () => {
      navigator.hardwareConcurrency = 2;
      expect(isLowEndDevice()).toBe(true);
    });

    it('should detect low-end device based on device memory', () => {
      navigator.deviceMemory = 2;
      expect(isLowEndDevice()).toBe(true);
    });

    it('should detect low-end device based on connection speed', () => {
      navigator.connection = { effectiveType: 'slow-2g' };
      expect(isLowEndDevice()).toBe(true);
    });

    it('should return false for high-end device', () => {
      navigator.hardwareConcurrency = 8;
      navigator.deviceMemory = 8;
      navigator.connection = { effectiveType: '4g' };
      
      expect(isLowEndDevice()).toBe(false);
    });
  });

  describe('getPerformanceRecommendations', () => {
    it('should recommend virtual scrolling for low-end devices', () => {
      navigator.hardwareConcurrency = 2;
      
      const recommendations = getPerformanceRecommendations();
      
      expect(recommendations.enableVirtualScrolling).toBe(true);
      expect(recommendations.reduceAnimations).toBe(true);
      expect(recommendations.increaseDebouncingDelay).toBe(true);
      expect(recommendations.isLowEndDevice).toBe(true);
    });

    it('should recommend optimizations for high memory usage', () => {
      // Mock high memory usage
      global.performance.memory = {
        usedJSHeapSize: 160000000,
        jsHeapSizeLimit: 200000000
      };

      const recommendations = getPerformanceRecommendations();
      
      expect(recommendations.enableVirtualScrolling).toBe(true);
      expect(recommendations.batchDOMUpdates).toBe(true);
    });

    it('should always recommend lazy loading', () => {
      const recommendations = getPerformanceRecommendations();
      expect(recommendations.enableLazyLoading).toBe(true);
    });
  });
});

describe('Global Instances', () => {
  it('should provide global performance monitor instance', () => {
    expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
  });

  it('should provide global memory manager instance', () => {
    expect(memoryManager).toBeInstanceOf(MemoryManager);
  });
});