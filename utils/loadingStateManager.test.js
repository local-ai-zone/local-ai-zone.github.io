/**
 * Tests for loading state management utilities
 * Verifies loading state management, progress tracking, and UI components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LoadingStateManager,
  ProgressTracker,
  LoadingUI,
  LoadingStates,
  loadingStateManager,
  withLoadingState,
  createLoadingHook
} from './loadingStateManager.js';

describe('LoadingStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LoadingStateManager();
  });

  describe('State Management', () => {
    it('should set and get loading state', () => {
      manager.setState('test-op', LoadingStates.LOADING, { message: 'Loading...' });
      
      const state = manager.getState('test-op');
      expect(state.id).toBe('test-op');
      expect(state.state).toBe(LoadingStates.LOADING);
      expect(state.message).toBe('Loading...');
      expect(state.timestamp).toBeDefined();
    });

    it('should return null for non-existent operation', () => {
      const state = manager.getState('non-existent');
      expect(state).toBeNull();
    });

    it('should check loading state correctly', () => {
      manager.setState('test-op', LoadingStates.LOADING);
      expect(manager.isLoading('test-op')).toBe(true);
      
      manager.setState('test-op', LoadingStates.SUCCESS);
      expect(manager.isLoading('test-op')).toBe(false);
    });

    it('should check error state correctly', () => {
      manager.setState('test-op', LoadingStates.ERROR, { error: new Error('Test') });
      expect(manager.hasError('test-op')).toBe(true);
      
      manager.setState('test-op', LoadingStates.SUCCESS);
      expect(manager.hasError('test-op')).toBe(false);
    });

    it('should check success state correctly', () => {
      manager.setState('test-op', LoadingStates.SUCCESS);
      expect(manager.isSuccess('test-op')).toBe(true);
      
      manager.setState('test-op', LoadingStates.ERROR);
      expect(manager.isSuccess('test-op')).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    it('should start loading correctly', () => {
      manager.startLoading('test-op', { message: 'Starting...', progress: 0 });
      
      const state = manager.getState('test-op');
      expect(state.state).toBe(LoadingStates.LOADING);
      expect(state.message).toBe('Starting...');
      expect(state.progress).toBe(0);
      expect(state.startTime).toBeDefined();
    });

    it('should set success correctly', () => {
      manager.startLoading('test-op');
      
      // Mock time passage
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // startLoading
        .mockReturnValueOnce(1500); // setSuccess
      
      manager.setSuccess('test-op', { data: 'result' });
      
      const state = manager.getState('test-op');
      expect(state.state).toBe(LoadingStates.SUCCESS);
      expect(state.data).toBe('result');
      expect(state.duration).toBe(500);
    });

    it('should set error correctly', () => {
      manager.startLoading('test-op');
      
      const error = new Error('Test error');
      manager.setError('test-op', error, { retryable: true, retryCount: 1 });
      
      const state = manager.getState('test-op');
      expect(state.state).toBe(LoadingStates.ERROR);
      expect(state.error).toBe(error);
      expect(state.retryable).toBe(true);
      expect(state.retryCount).toBe(1);
      expect(state.message).toBe('Test error');
    });

    it('should clear state correctly', () => {
      manager.setState('test-op', LoadingStates.LOADING);
      manager.clearState('test-op');
      
      expect(manager.getState('test-op')).toBeNull();
    });
  });

  describe('Progress Updates', () => {
    it('should update progress for loading operation', () => {
      manager.startLoading('test-op', { message: 'Loading...', progress: 0 });
      manager.updateProgress('test-op', 50, 'Half done');
      
      const state = manager.getState('test-op');
      expect(state.progress).toBe(50);
      expect(state.message).toBe('Half done');
    });

    it('should clamp progress values', () => {
      manager.startLoading('test-op');
      
      manager.updateProgress('test-op', -10);
      expect(manager.getState('test-op').progress).toBe(0);
      
      manager.updateProgress('test-op', 150);
      expect(manager.getState('test-op').progress).toBe(100);
    });

    it('should not update progress for non-loading operations', () => {
      manager.setState('test-op', LoadingStates.SUCCESS);
      manager.updateProgress('test-op', 50);
      
      const state = manager.getState('test-op');
      expect(state.progress).toBeUndefined();
    });
  });

  describe('Event Listeners', () => {
    it('should notify operation-specific listeners', () => {
      const listener = vi.fn();
      manager.addListener('test-op', listener);
      
      manager.setState('test-op', LoadingStates.LOADING);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ state: LoadingStates.LOADING }),
        undefined
      );
    });

    it('should notify global listeners', () => {
      const globalListener = vi.fn();
      manager.addGlobalListener(globalListener);
      
      manager.setState('test-op', LoadingStates.LOADING);
      
      expect(globalListener).toHaveBeenCalledWith(
        'test-op',
        expect.objectContaining({ state: LoadingStates.LOADING }),
        undefined
      );
    });

    it('should remove listeners correctly', () => {
      const listener = vi.fn();
      manager.addListener('test-op', listener);
      manager.removeListener('test-op', listener);
      
      manager.setState('test-op', LoadingStates.LOADING);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      manager.addListener('test-op', errorListener);
      manager.addListener('test-op', normalListener);
      
      manager.setState('test-op', LoadingStates.LOADING);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in loading state listener:', expect.any(Error));
      expect(normalListener).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Bulk Operations', () => {
    it('should get all loading operations', () => {
      manager.setState('op1', LoadingStates.LOADING);
      manager.setState('op2', LoadingStates.SUCCESS);
      manager.setState('op3', LoadingStates.LOADING);
      
      const loadingOps = manager.getLoadingOperations();
      expect(loadingOps).toHaveLength(2);
      expect(loadingOps.map(op => op.id)).toEqual(['op1', 'op3']);
    });

    it('should get all error operations', () => {
      manager.setState('op1', LoadingStates.ERROR, { error: new Error('Error 1') });
      manager.setState('op2', LoadingStates.SUCCESS);
      manager.setState('op3', LoadingStates.ERROR, { error: new Error('Error 2') });
      
      const errorOps = manager.getErrorOperations();
      expect(errorOps).toHaveLength(2);
      expect(errorOps.map(op => op.id)).toEqual(['op1', 'op3']);
    });

    it('should check if any operation is loading', () => {
      expect(manager.hasAnyLoading()).toBe(false);
      
      manager.setState('op1', LoadingStates.LOADING);
      expect(manager.hasAnyLoading()).toBe(true);
      
      manager.setState('op1', LoadingStates.SUCCESS);
      expect(manager.hasAnyLoading()).toBe(false);
    });

    it('should check if any operation has errors', () => {
      expect(manager.hasAnyErrors()).toBe(false);
      
      manager.setState('op1', LoadingStates.ERROR);
      expect(manager.hasAnyErrors()).toBe(true);
      
      manager.setState('op1', LoadingStates.SUCCESS);
      expect(manager.hasAnyErrors()).toBe(false);
    });

    it('should clear all states', () => {
      manager.setState('op1', LoadingStates.LOADING);
      manager.setState('op2', LoadingStates.ERROR);
      
      manager.clearAll();
      
      expect(manager.getState('op1')).toBeNull();
      expect(manager.getState('op2')).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should provide loading statistics', () => {
      manager.setState('op1', LoadingStates.LOADING);
      manager.setState('op2', LoadingStates.SUCCESS, { duration: 100 });
      manager.setState('op3', LoadingStates.ERROR, { duration: 200 });
      
      const stats = manager.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.loading).toBe(1);
      expect(stats.success).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.averageDuration).toBe(150);
    });

    it('should handle empty statistics', () => {
      const stats = manager.getStats();
      
      expect(stats.total).toBe(0);
      expect(stats.loading).toBe(0);
      expect(stats.success).toBe(0);
      expect(stats.error).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });
});

describe('ProgressTracker', () => {
  let manager;
  let tracker;

  beforeEach(() => {
    manager = new LoadingStateManager();
    manager.startLoading('test-op');
    tracker = new ProgressTracker(5, 'test-op', manager);
  });

  it('should initialize correctly', () => {
    expect(tracker.totalSteps).toBe(5);
    expect(tracker.currentStep).toBe(0);
    expect(tracker.operationId).toBe('test-op');
  });

  it('should advance to next step', () => {
    tracker.nextStep('Step 1 complete');
    
    expect(tracker.currentStep).toBe(1);
    
    const state = manager.getState('test-op');
    expect(state.progress).toBe(20); // 1/5 * 100
    expect(state.message).toBe('Step 1 complete');
  });

  it('should set specific step', () => {
    tracker.setStep(3, 'Step 3 active');
    
    expect(tracker.currentStep).toBe(3);
    
    const state = manager.getState('test-op');
    expect(state.progress).toBe(60); // 3/5 * 100
    expect(state.message).toBe('Step 3 active');
  });

  it('should not exceed total steps', () => {
    tracker.setStep(10);
    expect(tracker.currentStep).toBe(5);
    
    const state = manager.getState('test-op');
    expect(state.progress).toBe(100);
  });

  it('should complete correctly', () => {
    tracker.complete();
    
    expect(tracker.currentStep).toBe(5);
    
    const state = manager.getState('test-op');
    expect(state.progress).toBe(100);
  });

  it('should use default message when none provided', () => {
    tracker.nextStep();
    
    const state = manager.getState('test-op');
    expect(state.message).toBe('Step 1 of 5');
  });
});

describe('LoadingUI', () => {
  let container;
  let loadingUI;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    container = document.getElementById('container');
    loadingUI = new LoadingUI(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create loading UI element', () => {
    const state = { message: 'Loading...', progress: 50 };
    loadingUI.show(state);
    
    expect(loadingUI.element).toBeDefined();
    expect(loadingUI.element.classList.contains('loading-state')).toBe(true);
    expect(container.contains(loadingUI.element)).toBe(true);
  });

  it('should update content correctly', () => {
    const state = { message: 'Loading data...', progress: 75 };
    loadingUI.show(state);
    
    const messageEl = loadingUI.element.querySelector('.loading-message');
    const progressEl = loadingUI.element.querySelector('.progress-bar');
    
    expect(messageEl.textContent).toBe('Loading data...');
    expect(progressEl.style.width).toBe('75%');
  });

  it('should hide loading UI', () => {
    loadingUI.show({ message: 'Loading...' });
    loadingUI.hide();
    
    expect(loadingUI.element.classList.contains('hidden')).toBe(true);
  });

  it('should destroy correctly', () => {
    loadingUI.show({ message: 'Loading...' });
    loadingUI.destroy();
    
    expect(loadingUI.element).toBeNull();
    expect(container.children.length).toBe(0);
  });

  it('should respect options', () => {
    const customUI = new LoadingUI(container, {
      showProgress: false,
      showMessage: false,
      showSpinner: false,
      className: 'custom-loading'
    });
    
    customUI.show({ message: 'Loading...' });
    
    expect(customUI.element.classList.contains('custom-loading')).toBe(true);
    expect(customUI.element.querySelector('.loading-spinner')).toBeNull();
    expect(customUI.element.querySelector('.loading-message')).toBeNull();
    expect(customUI.element.querySelector('.loading-progress')).toBeNull();
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withLoadingState', () => {
    it('should manage loading state for successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const resultPromise = withLoadingState('test-op', operation);
      
      // Check loading state
      expect(loadingStateManager.isLoading('test-op')).toBe(true);
      
      const result = await resultPromise;
      
      expect(result).toBe('success');
      expect(loadingStateManager.isSuccess('test-op')).toBe(true);
    });

    it('should manage loading state for failed operation', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      
      await expect(withLoadingState('test-op', operation)).rejects.toThrow('Failed');
      
      expect(loadingStateManager.hasError('test-op')).toBe(true);
    });

    it('should support progress updates', async () => {
      const operation = vi.fn().mockImplementation(async (updateProgress) => {
        updateProgress(50, 'Half done');
        return 'success';
      });
      
      await withLoadingState('test-op', operation);
      
      // The final state should be success, but we can't easily test intermediate progress
      expect(loadingStateManager.isSuccess('test-op')).toBe(true);
    });
  });

  describe('createLoadingHook', () => {
    it('should create loading hook with all methods', () => {
      const hook = createLoadingHook('test-op');
      
      expect(hook.start).toBeInstanceOf(Function);
      expect(hook.success).toBeInstanceOf(Function);
      expect(hook.error).toBeInstanceOf(Function);
      expect(hook.updateProgress).toBeInstanceOf(Function);
      expect(hook.clear).toBeInstanceOf(Function);
      expect(hook.getState).toBeInstanceOf(Function);
      expect(hook.isLoading).toBeInstanceOf(Function);
      expect(hook.hasError).toBeInstanceOf(Function);
      expect(hook.isSuccess).toBeInstanceOf(Function);
    });

    it('should work with loading state manager', () => {
      const hook = createLoadingHook('test-op');
      
      hook.start('Starting...');
      expect(hook.isLoading()).toBe(true);
      
      hook.success({ data: 'result' });
      expect(hook.isSuccess()).toBe(true);
      
      const state = hook.getState();
      expect(state.data).toBe('result');
    });
  });
});

describe('Global Instance', () => {
  it('should provide global loading state manager instance', () => {
    expect(loadingStateManager).toBeInstanceOf(LoadingStateManager);
  });
});