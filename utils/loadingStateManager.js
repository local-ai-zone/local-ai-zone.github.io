/**
 * Loading state management utilities
 * Provides centralized loading state management with progress tracking and user feedback
 */

/**
 * Loading state types
 */
export const LoadingStates = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

/**
 * Loading state manager class
 */
export class LoadingStateManager {
  constructor() {
    this.states = new Map();
    this.listeners = new Map();
    this.globalListeners = new Set();
    this.progressTrackers = new Map();
  }

  /**
   * Set loading state for a specific operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {string} state - Loading state
   * @param {Object} data - Additional data (error, progress, etc.)
   */
  setState(operationId, state, data = {}) {
    const previousState = this.states.get(operationId);
    const newState = {
      id: operationId,
      state,
      timestamp: Date.now(),
      ...data
    };

    this.states.set(operationId, newState);

    // Notify operation-specific listeners
    const operationListeners = this.listeners.get(operationId) || new Set();
    operationListeners.forEach(listener => {
      try {
        listener(newState, previousState);
      } catch (error) {
        console.error('Error in loading state listener:', error);
      }
    });

    // Notify global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(operationId, newState, previousState);
      } catch (error) {
        console.error('Error in global loading state listener:', error);
      }
    });
  }

  /**
   * Get loading state for an operation
   * @param {string} operationId - Operation identifier
   * @returns {Object|null} Loading state
   */
  getState(operationId) {
    return this.states.get(operationId) || null;
  }

  /**
   * Check if operation is loading
   * @param {string} operationId - Operation identifier
   * @returns {boolean} Whether operation is loading
   */
  isLoading(operationId) {
    const state = this.getState(operationId);
    return state && state.state === LoadingStates.LOADING;
  }

  /**
   * Check if operation has error
   * @param {string} operationId - Operation identifier
   * @returns {boolean} Whether operation has error
   */
  hasError(operationId) {
    const state = this.getState(operationId);
    return state && state.state === LoadingStates.ERROR;
  }

  /**
   * Check if operation is successful
   * @param {string} operationId - Operation identifier
   * @returns {boolean} Whether operation is successful
   */
  isSuccess(operationId) {
    const state = this.getState(operationId);
    return state && state.state === LoadingStates.SUCCESS;
  }

  /**
   * Start loading for an operation
   * @param {string} operationId - Operation identifier
   * @param {Object} options - Loading options
   */
  startLoading(operationId, options = {}) {
    const { message = 'Loading...', progress = null } = options;
    
    this.setState(operationId, LoadingStates.LOADING, {
      message,
      progress,
      startTime: Date.now()
    });
  }

  /**
   * Set success state for an operation
   * @param {string} operationId - Operation identifier
   * @param {Object} data - Success data
   */
  setSuccess(operationId, data = {}) {
    const currentState = this.getState(operationId);
    const duration = currentState ? Date.now() - currentState.startTime : 0;
    
    this.setState(operationId, LoadingStates.SUCCESS, {
      ...data,
      duration
    });
  }

  /**
   * Set error state for an operation
   * @param {string} operationId - Operation identifier
   * @param {Error} error - Error object
   * @param {Object} options - Error options
   */
  setError(operationId, error, options = {}) {
    const { retryable = false, retryCount = 0 } = options;
    const currentState = this.getState(operationId);
    const duration = currentState ? Date.now() - currentState.startTime : 0;
    
    this.setState(operationId, LoadingStates.ERROR, {
      error,
      retryable,
      retryCount,
      duration,
      message: error.message || 'An error occurred'
    });
  }

  /**
   * Clear state for an operation
   * @param {string} operationId - Operation identifier
   */
  clearState(operationId) {
    this.states.delete(operationId);
    this.listeners.delete(operationId);
    this.progressTrackers.delete(operationId);
  }

  /**
   * Add listener for specific operation
   * @param {string} operationId - Operation identifier
   * @param {Function} listener - Listener function
   */
  addListener(operationId, listener) {
    if (!this.listeners.has(operationId)) {
      this.listeners.set(operationId, new Set());
    }
    this.listeners.get(operationId).add(listener);
  }

  /**
   * Remove listener for specific operation
   * @param {string} operationId - Operation identifier
   * @param {Function} listener - Listener function
   */
  removeListener(operationId, listener) {
    const operationListeners = this.listeners.get(operationId);
    if (operationListeners) {
      operationListeners.delete(listener);
      if (operationListeners.size === 0) {
        this.listeners.delete(operationId);
      }
    }
  }

  /**
   * Add global listener for all operations
   * @param {Function} listener - Listener function
   */
  addGlobalListener(listener) {
    this.globalListeners.add(listener);
  }

  /**
   * Remove global listener
   * @param {Function} listener - Listener function
   */
  removeGlobalListener(listener) {
    this.globalListeners.delete(listener);
  }

  /**
   * Update progress for an operation
   * @param {string} operationId - Operation identifier
   * @param {number} progress - Progress value (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(operationId, progress, message = '') {
    const currentState = this.getState(operationId);
    if (currentState && currentState.state === LoadingStates.LOADING) {
      this.setState(operationId, LoadingStates.LOADING, {
        ...currentState,
        progress: Math.max(0, Math.min(100, progress)),
        message: message || currentState.message
      });
    }
  }

  /**
   * Get all current loading operations
   * @returns {Array} Array of loading operations
   */
  getLoadingOperations() {
    return Array.from(this.states.entries())
      .filter(([_, state]) => state.state === LoadingStates.LOADING)
      .map(([id, state]) => ({ id, ...state }));
  }

  /**
   * Get all operations with errors
   * @returns {Array} Array of error operations
   */
  getErrorOperations() {
    return Array.from(this.states.entries())
      .filter(([_, state]) => state.state === LoadingStates.ERROR)
      .map(([id, state]) => ({ id, ...state }));
  }

  /**
   * Check if any operation is loading
   * @returns {boolean} Whether any operation is loading
   */
  hasAnyLoading() {
    return this.getLoadingOperations().length > 0;
  }

  /**
   * Check if any operation has errors
   * @returns {boolean} Whether any operation has errors
   */
  hasAnyErrors() {
    return this.getErrorOperations().length > 0;
  }

  /**
   * Set global loading state for the entire application
   * @param {boolean} isLoading - Whether the app is loading
   * @param {string} message - Loading message
   */
  setGlobalLoading(isLoading, message = 'Loading...') {
    const operationId = 'global-loading';
    
    if (isLoading) {
      this.startLoading(operationId, { message });
      
      // Update global loading UI
      this.updateGlobalLoadingUI(true, message);
    } else {
      this.setSuccess(operationId);
      
      // Update global loading UI
      this.updateGlobalLoadingUI(false);
    }
  }

  /**
   * Update global loading UI elements
   * @param {boolean} isLoading - Whether to show loading
   * @param {string} message - Loading message
   */
  updateGlobalLoadingUI(isLoading, message = '') {
    const globalLoadingEl = document.getElementById('global-loading');
    const loadingMessageEl = document.getElementById('loading-message');
    
    if (globalLoadingEl) {
      if (isLoading) {
        globalLoadingEl.classList.remove('hidden');
        if (loadingMessageEl && message) {
          loadingMessageEl.textContent = message;
        }
      } else {
        globalLoadingEl.classList.add('hidden');
      }
    }
  }

  /**
   * Check if global loading is active
   * @returns {boolean} Whether global loading is active
   */
  isGlobalLoading() {
    return this.isLoading('global-loading');
  }

  /**
   * Clear all states
   */
  clearAll() {
    this.states.clear();
    this.listeners.clear();
    this.progressTrackers.clear();
  }

  /**
   * Get loading statistics
   * @returns {Object} Loading statistics
   */
  getStats() {
    const allStates = Array.from(this.states.values());
    
    return {
      total: allStates.length,
      loading: allStates.filter(s => s.state === LoadingStates.LOADING).length,
      success: allStates.filter(s => s.state === LoadingStates.SUCCESS).length,
      error: allStates.filter(s => s.state === LoadingStates.ERROR).length,
      averageDuration: this.calculateAverageDuration(allStates)
    };
  }

  /**
   * Calculate average duration for completed operations
   * @param {Array} states - Array of states
   * @returns {number} Average duration in milliseconds
   */
  calculateAverageDuration(states) {
    const completedStates = states.filter(s => 
      s.duration && (s.state === LoadingStates.SUCCESS || s.state === LoadingStates.ERROR)
    );
    
    if (completedStates.length === 0) return 0;
    
    const totalDuration = completedStates.reduce((sum, state) => sum + state.duration, 0);
    return totalDuration / completedStates.length;
  }
}

/**
 * Progress tracker for operations with multiple steps
 */
export class ProgressTracker {
  constructor(totalSteps, operationId, loadingManager) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.operationId = operationId;
    this.loadingManager = loadingManager;
    this.stepMessages = [];
  }

  /**
   * Advance to next step
   * @param {string} message - Step message
   */
  nextStep(message = '') {
    this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
    if (message) {
      this.stepMessages[this.currentStep - 1] = message;
    }
    this.updateProgress();
  }

  /**
   * Set current step
   * @param {number} step - Step number (1-based)
   * @param {string} message - Step message
   */
  setStep(step, message = '') {
    this.currentStep = Math.max(1, Math.min(step, this.totalSteps));
    if (message) {
      this.stepMessages[this.currentStep - 1] = message;
    }
    this.updateProgress();
  }

  /**
   * Update progress in loading manager
   */
  updateProgress() {
    const progress = (this.currentStep / this.totalSteps) * 100;
    const message = this.stepMessages[this.currentStep - 1] || `Step ${this.currentStep} of ${this.totalSteps}`;
    
    this.loadingManager.updateProgress(this.operationId, progress, message);
  }

  /**
   * Complete the progress tracker
   */
  complete() {
    this.currentStep = this.totalSteps;
    this.updateProgress();
  }
}

/**
 * Loading state UI component helper
 */
export class LoadingUI {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showProgress: true,
      showMessage: true,
      showSpinner: true,
      className: 'loading-ui',
      ...options
    };
    this.element = null;
  }

  /**
   * Show loading state
   * @param {Object} state - Loading state
   */
  show(state) {
    if (!this.element) {
      this.createElement();
    }

    this.updateContent(state);
    this.element.classList.remove('hidden');
    
    if (this.container && !this.container.contains(this.element)) {
      this.container.appendChild(this.element);
    }
  }

  /**
   * Hide loading state
   */
  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
  }

  /**
   * Create loading UI element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = `${this.options.className} loading-state`;
    this.element.innerHTML = `
      <div class="loading-content">
        ${this.options.showSpinner ? '<div class="loading-spinner"></div>' : ''}
        ${this.options.showMessage ? '<div class="loading-message"></div>' : ''}
        ${this.options.showProgress ? '<div class="loading-progress"><div class="progress-bar"></div></div>' : ''}
      </div>
    `;
  }

  /**
   * Update loading content
   * @param {Object} state - Loading state
   */
  updateContent(state) {
    if (!this.element) return;

    const messageEl = this.element.querySelector('.loading-message');
    const progressEl = this.element.querySelector('.progress-bar');

    if (messageEl && state.message) {
      messageEl.textContent = state.message;
    }

    if (progressEl && typeof state.progress === 'number') {
      progressEl.style.width = `${state.progress}%`;
    }
  }

  /**
   * Destroy loading UI
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Global loading state manager instance
 */
export const loadingStateManager = new LoadingStateManager();

// Debug: Add version check
loadingStateManager._version = '1.0.1';
loadingStateManager._hasSetGlobalLoading = typeof loadingStateManager.setGlobalLoading === 'function';

console.log('LoadingStateManager initialized:', {
  version: loadingStateManager._version,
  hasSetGlobalLoading: loadingStateManager._hasSetGlobalLoading,
  methods: Object.getOwnPropertyNames(Object.getPrototypeOf(loadingStateManager))
});

/**
 * Utility functions for common loading scenarios
 */

/**
 * Wrap async operation with loading state management
 * @param {string} operationId - Operation identifier
 * @param {Function} operation - Async operation
 * @param {Object} options - Options
 * @returns {Promise} Operation result
 */
export async function withLoadingState(operationId, operation, options = {}) {
  const { 
    loadingMessage = 'Loading...',
    successMessage = 'Success',
    manager = loadingStateManager 
  } = options;

  try {
    manager.startLoading(operationId, { message: loadingMessage });
    const result = await operation((progress, message) => {
      manager.updateProgress(operationId, progress, message);
    });
    manager.setSuccess(operationId, { message: successMessage });
    return result;
  } catch (error) {
    manager.setError(operationId, error, { retryable: true });
    throw error;
  }
}

/**
 * Create a loading state hook for components
 * @param {string} operationId - Operation identifier
 * @param {LoadingStateManager} manager - Loading state manager
 * @returns {Object} Loading state hook
 */
export function createLoadingHook(operationId, manager = loadingStateManager) {
  return {
    start: (message) => manager.startLoading(operationId, { message }),
    success: (data) => manager.setSuccess(operationId, data),
    error: (error, options) => manager.setError(operationId, error, options),
    updateProgress: (progress, message) => manager.updateProgress(operationId, progress, message),
    clear: () => manager.clearState(operationId),
    getState: () => manager.getState(operationId),
    isLoading: () => manager.isLoading(operationId),
    hasError: () => manager.hasError(operationId),
    isSuccess: () => manager.isSuccess(operationId)
  };
}