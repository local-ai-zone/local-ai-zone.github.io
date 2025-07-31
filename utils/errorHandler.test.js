/**
 * Tests for error handling utilities
 * Verifies error handling, retry mechanisms, and user-friendly error messages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AppError,
  ErrorHandler,
  RetryManager,
  ErrorTypes,
  ErrorSeverity,
  errorHandler,
  retryManager,
  withErrorHandling,
  createSafeAsync,
  validateData
} from './errorHandler.js';

describe('AppError', () => {
  it('should create error with default values', () => {
    const error = new AppError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ErrorTypes.UNKNOWN);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.context).toEqual({});
    expect(error.timestamp).toBeDefined();
  });

  it('should create error with custom values', () => {
    const context = { userId: '123' };
    const error = new AppError('Network error', ErrorTypes.NETWORK, ErrorSeverity.HIGH, context);
    
    expect(error.message).toBe('Network error');
    expect(error.type).toBe(ErrorTypes.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context).toEqual(context);
  });

  it('should convert to JSON correctly', () => {
    const error = new AppError('Test error', ErrorTypes.VALIDATION, ErrorSeverity.LOW);
    const json = error.toJSON();
    
    expect(json.name).toBe('AppError');
    expect(json.message).toBe('Test error');
    expect(json.type).toBe(ErrorTypes.VALIDATION);
    expect(json.severity).toBe(ErrorSeverity.LOW);
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Handling', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError('Test error', ErrorTypes.NETWORK);
      const result = handler.handleError(appError);
      
      expect(result.error).toBe(appError);
      expect(result.userMessage).toBe('Unable to load data. Please check your internet connection and try again.');
      expect(result.canRetry).toBe(false);
    });

    it('should convert generic error to AppError', () => {
      const genericError = new Error('Generic error');
      const result = handler.handleError(genericError);
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('Generic error');
      expect(result.error.type).toBe(ErrorTypes.UNKNOWN);
    });

    it('should categorize TypeError correctly', () => {
      const typeError = new TypeError('Cannot read property');
      const result = handler.handleError(typeError);
      
      expect(result.error.type).toBe(ErrorTypes.COMPONENT);
      expect(result.error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('fetch failed');
      const result = handler.handleError(networkError);
      
      expect(result.error.type).toBe(ErrorTypes.NETWORK);
      expect(result.error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Error Logging', () => {
    it('should log error to internal log', () => {
      const error = new AppError('Test error');
      handler.logError(error);
      
      const log = handler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Test error');
    });

    it('should maintain log size limit', () => {
      handler.maxLogSize = 2;
      
      handler.logError(new AppError('Error 1'));
      handler.logError(new AppError('Error 2'));
      handler.logError(new AppError('Error 3'));
      
      const log = handler.getErrorLog();
      expect(log).toHaveLength(2);
      expect(log[0].message).toBe('Error 2');
      expect(log[1].message).toBe('Error 3');
    });

    it('should log to console based on severity', () => {
      handler.logError(new AppError('Critical', ErrorTypes.UNKNOWN, ErrorSeverity.CRITICAL));
      handler.logError(new AppError('High', ErrorTypes.UNKNOWN, ErrorSeverity.HIGH));
      handler.logError(new AppError('Medium', ErrorTypes.UNKNOWN, ErrorSeverity.MEDIUM));
      handler.logError(new AppError('Low', ErrorTypes.UNKNOWN, ErrorSeverity.LOW));
      
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Messages', () => {
    it('should return appropriate message for network errors', () => {
      const error = new AppError('Network error', ErrorTypes.NETWORK);
      const message = handler.getUserMessage(error);
      
      expect(message).toBe('Unable to load data. Please check your internet connection and try again.');
    });

    it('should return appropriate message for data parsing errors', () => {
      const error = new AppError('Parse error', ErrorTypes.DATA_PARSING);
      const message = handler.getUserMessage(error);
      
      expect(message).toBe('There was a problem processing the data. Please try refreshing the page.');
    });

    it('should return generic message for unknown errors', () => {
      const error = new AppError('Unknown error', ErrorTypes.UNKNOWN);
      const message = handler.getUserMessage(error);
      
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Retry Management', () => {
    it('should allow retry for network errors', () => {
      const error = new AppError('Network error', ErrorTypes.NETWORK);
      expect(handler.canRetry(error)).toBe(true);
    });

    it('should allow retry for data parsing errors', () => {
      const error = new AppError('Parse error', ErrorTypes.DATA_PARSING);
      expect(handler.canRetry(error)).toBe(true);
    });

    it('should not allow retry for component errors', () => {
      const error = new AppError('Component error', ErrorTypes.COMPONENT);
      expect(handler.canRetry(error)).toBe(false);
    });

    it('should track retry counts', () => {
      const error = new AppError('Network error', ErrorTypes.NETWORK);
      
      expect(handler.getRetryCount(error)).toBe(0);
      
      handler.incrementRetryCount(error);
      expect(handler.getRetryCount(error)).toBe(1);
      
      handler.incrementRetryCount(error);
      expect(handler.getRetryCount(error)).toBe(2);
      
      handler.resetRetryCount(error);
      expect(handler.getRetryCount(error)).toBe(0);
    });

    it('should respect max retry limit', () => {
      const error = new AppError('Network error', ErrorTypes.NETWORK);
      handler.maxRetries = 2;
      
      expect(handler.canRetry(error)).toBe(true);
      
      handler.incrementRetryCount(error);
      handler.incrementRetryCount(error);
      expect(handler.canRetry(error)).toBe(false);
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners of errors', () => {
      const listener = vi.fn();
      handler.addErrorListener(listener);
      
      const error = new AppError('Test error');
      handler.handleError(error);
      
      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should remove listeners correctly', () => {
      const listener = vi.fn();
      handler.addErrorListener(listener);
      handler.removeErrorListener(listener);
      
      const error = new AppError('Test error');
      handler.handleError(error);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      handler.addErrorListener(errorListener);
      handler.addErrorListener(normalListener);
      
      const error = new AppError('Test error');
      handler.handleError(error);
      
      expect(console.error).toHaveBeenCalledWith('Error in error listener:', expect.any(Error));
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should provide error statistics', () => {
      handler.logError(new AppError('Error 1', ErrorTypes.NETWORK, ErrorSeverity.HIGH));
      handler.logError(new AppError('Error 2', ErrorTypes.NETWORK, ErrorSeverity.MEDIUM));
      handler.logError(new AppError('Error 3', ErrorTypes.VALIDATION, ErrorSeverity.LOW));
      
      const stats = handler.getErrorStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorTypes.NETWORK]).toBe(2);
      expect(stats.byType[ErrorTypes.VALIDATION]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.recent).toHaveLength(3);
    });
  });
});

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxRetries: 2,
      baseDelay: 100,
      backoffFactor: 2
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await retryManager.retry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    
    const retryPromise = retryManager.retry(operation);
    
    // Advance timers for retries
    await vi.advanceTimersByTimeAsync(100); // First retry
    await vi.advanceTimersByTimeAsync(200); // Second retry
    
    const result = await retryPromise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should respect max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fail'));
    
    const retryPromise = retryManager.retry(operation);
    
    // Advance timers for all retries
    await vi.advanceTimersByTimeAsync(100); // First retry
    await vi.advanceTimersByTimeAsync(200); // Second retry
    
    await expect(retryPromise).rejects.toThrow('Always fail');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    const retryPromise = retryManager.retry(operation, { onRetry });
    
    await vi.advanceTimersByTimeAsync(100);
    
    await retryPromise;
    
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 100);
  });

  it('should respect shouldRetry callback', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('No retry'));
    const shouldRetry = vi.fn().mockReturnValue(false);
    
    await expect(retryManager.retry(operation, { shouldRetry })).rejects.toThrow('No retry');
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withErrorHandling', () => {
    it('should handle successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withErrorHandling(operation);
      
      expect(result).toBe('success');
    });

    it('should handle failed operation', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(withErrorHandling(operation)).rejects.toThrow();
    });

    it('should retry when retryable is true', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValue('success');
      
      const resultPromise = withErrorHandling(operation, { retryable: true });
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      expect(result).toBe('success');
    });
  });

  describe('createSafeAsync', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const safeFn = createSafeAsync(fn);
      
      const result = await safeFn();
      
      expect(result).toBe('success');
    });

    it('should return null on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'));
      const safeFn = createSafeAsync(fn);
      
      const result = await safeFn();
      
      expect(result).toBeNull();
    });

    it('should return default value on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'));
      const safeFn = createSafeAsync(fn, { defaultValue: 'default' });
      
      const result = await safeFn();
      
      expect(result).toBe('default');
    });
  });

  describe('validateData', () => {
    it('should pass valid data', () => {
      const validator = (data) => typeof data === 'string';
      
      expect(() => validateData('valid', validator)).not.toThrow();
    });

    it('should throw on invalid data', () => {
      const validator = (data) => typeof data === 'string';
      
      expect(() => validateData(123, validator)).toThrow(AppError);
    });

    it('should use custom error message', () => {
      const validator = () => false;
      
      expect(() => validateData('data', validator, 'Custom error')).toThrow('Custom error');
    });
  });
});