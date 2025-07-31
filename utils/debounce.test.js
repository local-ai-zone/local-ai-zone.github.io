/**
 * Tests for debounce utility functions
 * Verifies debouncing, throttling, and performance optimization utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  debounce,
  throttle,
  debounceSearch,
  debounceFilter,
  debounceResize,
  throttleScroll,
  rafThrottle
} from './debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls when called multiple times', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute immediately when immediate option is true', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100, { immediate: true });

    debouncedFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: function() {
        return this.value;
      }
    };

    const debouncedMethod = debounce(obj.method, 100);
    const result = debouncedMethod.call(obj);

    vi.advanceTimersByTime(100);
    expect(result).toBe(42);
  });

  it('should support cancel method', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn.cancel();

    vi.advanceTimersByTime(100);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should support flush method', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn.flush();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should limit function execution frequency', () => {
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

  it('should execute on leading edge by default', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should respect leading option', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100, { leading: false });

    throttledFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should support cancel method', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    throttledFn.cancel();

    vi.advanceTimersByTime(100);
    // Should still be called once from the initial leading execution
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('debounceSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce search function calls', () => {
    const mockSearchFn = vi.fn();
    const debouncedSearch = debounceSearch(mockSearchFn, 300);

    debouncedSearch('test');
    debouncedSearch('test query');
    debouncedSearch('test query final');

    expect(mockSearchFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(mockSearchFn).toHaveBeenCalledTimes(1);
    expect(mockSearchFn).toHaveBeenCalledWith('test query final');
  });

  it('should execute immediately for empty queries', () => {
    const mockSearchFn = vi.fn();
    const debouncedSearch = debounceSearch(mockSearchFn, 300);

    debouncedSearch('');
    expect(mockSearchFn).toHaveBeenCalledWith('');
  });

  it('should not search again for same query', () => {
    const mockSearchFn = vi.fn();
    const debouncedSearch = debounceSearch(mockSearchFn, 300);

    debouncedSearch('test');
    vi.advanceTimersByTime(300);
    
    debouncedSearch('test'); // Same query
    vi.advanceTimersByTime(300);

    expect(mockSearchFn).toHaveBeenCalledTimes(1);
  });

  it('should support immediate search method', () => {
    const mockSearchFn = vi.fn();
    const debouncedSearch = debounceSearch(mockSearchFn, 300);

    debouncedSearch.immediate('immediate query');
    expect(mockSearchFn).toHaveBeenCalledWith('immediate query');
  });

  it('should support cancel method', () => {
    const mockSearchFn = vi.fn();
    const debouncedSearch = debounceSearch(mockSearchFn, 300);

    debouncedSearch('test');
    debouncedSearch.cancel();

    vi.advanceTimersByTime(300);
    expect(mockSearchFn).not.toHaveBeenCalled();
  });
});

describe('debounceFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce filter function calls', () => {
    const mockFilterFn = vi.fn();
    const debouncedFilter = debounceFilter(mockFilterFn, 150);

    const filters1 = { quantization: ['Q4_K_M'] };
    const filters2 = { quantization: ['Q4_K_M', 'Q8_0'] };

    debouncedFilter(filters1);
    debouncedFilter(filters2);

    expect(mockFilterFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(mockFilterFn).toHaveBeenCalledTimes(1);
    expect(mockFilterFn).toHaveBeenCalledWith(filters2);
  });

  it('should not filter again for same filters', () => {
    const mockFilterFn = vi.fn();
    const debouncedFilter = debounceFilter(mockFilterFn, 150);

    const filters = { quantization: ['Q4_K_M'] };

    debouncedFilter(filters);
    vi.advanceTimersByTime(150);
    
    debouncedFilter(filters); // Same filters
    vi.advanceTimersByTime(150);

    expect(mockFilterFn).toHaveBeenCalledTimes(1);
  });

  it('should support immediate filter method', () => {
    const mockFilterFn = vi.fn();
    const debouncedFilter = debounceFilter(mockFilterFn, 150);

    const filters = { quantization: ['Q4_K_M'] };
    debouncedFilter.immediate(filters);

    expect(mockFilterFn).toHaveBeenCalledWith(filters);
  });
});

describe('debounceResize', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce resize function with default delay', () => {
    const mockResizeFn = vi.fn();
    const debouncedResize = debounceResize(mockResizeFn);

    debouncedResize();
    debouncedResize();
    debouncedResize();

    expect(mockResizeFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250); // Default delay
    expect(mockResizeFn).toHaveBeenCalledTimes(1);
  });

  it('should use custom delay', () => {
    const mockResizeFn = vi.fn();
    const debouncedResize = debounceResize(mockResizeFn, 500);

    debouncedResize();

    vi.advanceTimersByTime(250);
    expect(mockResizeFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(mockResizeFn).toHaveBeenCalledTimes(1);
  });
});

describe('throttleScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle scroll function with default delay', () => {
    const mockScrollFn = vi.fn();
    const throttledScroll = throttleScroll(mockScrollFn);

    throttledScroll();
    throttledScroll();
    throttledScroll();

    expect(mockScrollFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(16); // Default delay
    throttledScroll();

    expect(mockScrollFn).toHaveBeenCalledTimes(2);
  });

  it('should use custom delay', () => {
    const mockScrollFn = vi.fn();
    const throttledScroll = throttleScroll(mockScrollFn, 100);

    throttledScroll();
    expect(mockScrollFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttledScroll();
    expect(mockScrollFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttledScroll();
    expect(mockScrollFn).toHaveBeenCalledTimes(2);
  });
});

describe('rafThrottle', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    global.cancelAnimationFrame = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should throttle function using requestAnimationFrame', () => {
    const mockFn = vi.fn();
    const rafThrottledFn = rafThrottle(mockFn);

    rafThrottledFn();
    rafThrottledFn();
    rafThrottledFn();

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should support cancel method', () => {
    const mockFn = vi.fn();
    const rafThrottledFn = rafThrottle(mockFn);

    rafThrottledFn();
    rafThrottledFn.cancel();

    expect(global.cancelAnimationFrame).toHaveBeenCalled();

    vi.advanceTimersByTime(16);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should pass arguments correctly', () => {
    const mockFn = vi.fn();
    const rafThrottledFn = rafThrottle(mockFn);

    rafThrottledFn('arg1', 'arg2');

    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should preserve this context', () => {
    const obj = {
      value: 42,
      method: function() {
        return this.value;
      }
    };

    const rafThrottledMethod = rafThrottle(obj.method);
    rafThrottledMethod.call(obj);

    vi.advanceTimersByTime(16);
    expect(obj.method).toHaveBeenCalled();
  });
});