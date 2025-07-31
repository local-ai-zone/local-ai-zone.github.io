import { loadingStateManager, createLoadingHook } from '../utils/loadingStateManager.js';
import { errorHandler } from '../utils/errorHandler.js';

/**
 * ModelGrid component for responsive model card layout
 * Provides CSS Grid layout with responsive breakpoints and mobile optimization
 */
export class ModelGrid {
  constructor() {
    this.element = null;
    this.models = [];
    this.modelCards = new Map();
    this.loadingHook = createLoadingHook('model-grid');
    this.retryCallbacks = new Map();
  }

  /**
   * Create and return the model grid DOM element
   * @returns {HTMLElement} The grid container element
   */
  render() {
    this.element = document.createElement('main');
    this.element.className = `
      min-h-screen mobile-padding py-8
      transition-all duration-300 ease-in-out
    `.replace(/\s+/g, ' ').trim();
    
    // Add accessibility attributes
    this.element.setAttribute('id', 'main-content');
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Model grid');
    
    this.element.innerHTML = `
      <!-- Models container -->
      <div id="models-container" class="grid-responsive" role="grid" aria-label="Available models" data-keyboard-navigation="true">
        <!-- Model cards will be inserted here -->
      </div>
      
      <!-- Empty state -->
      <div id="empty-state" class="hidden text-center py-16">
        <div class="max-w-md mx-auto">
          <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No models found</h3>
          <p class="text-gray-600">Try adjusting your filters to see more results.</p>
        </div>
      </div>
      
      <!-- Loading state -->
      <div id="loading-state" class="text-center py-16">
        <div class="max-w-md mx-auto">
          <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Loading models...</h3>
          <p class="text-gray-600" id="loading-message">Please wait while we fetch the latest model data.</p>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div id="loading-progress" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error state -->
      <div id="error-state" class="hidden text-center py-16">
        <div class="max-w-md mx-auto">
          <svg class="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load models</h3>
          <p class="text-gray-600 mb-4" id="error-message">Something went wrong while loading the model data.</p>
          <div class="space-y-2">
            <button 
              id="retry-button" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
            <button 
              id="refresh-button" 
              class="block mx-auto px-4 py-2 text-blue-600 hover:text-blue-800 focus:outline-none focus:underline transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    `;

    // Set up error state event listeners
    this.setupErrorStateListeners();
    
    // Set up loading state listener
    this.setupLoadingStateListener();

    return this.element;
  }

  /**
   * Update the grid with new models
   * @param {Array} models - Array of model objects
   * @param {Function} ModelCardClass - ModelCard class constructor
   */
  updateModels(models, ModelCardClass) {
    if (!this.element) return;

    this.models = models;
    const container = this.element.querySelector('#models-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');

    // Hide loading state
    loadingState.classList.add('hidden');

    if (models.length === 0) {
      // Show empty state
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    // Show models container
    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Clear existing cards
    this.clearCards();

    // Create new cards with staggered animation
    models.forEach((model, index) => {
      const modelCard = new ModelCardClass(model);
      const cardElement = modelCard.render();
      
      // Add staggered animation delay
      cardElement.style.animationDelay = `${index * 50}ms`;
      cardElement.classList.add('animate-slide-up');
      
      // Store reference
      this.modelCards.set(model.id, modelCard);
      
      // Add to container
      container.appendChild(cardElement);
    });

    // Set up keyboard navigation for model cards
    this._setupKeyboardNavigation();

    // Trigger layout recalculation for smooth animations
    this._triggerLayoutRecalc();
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');

    container.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
  }

  /**
   * Clear all model cards
   */
  clearCards() {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    
    // Destroy existing cards
    this.modelCards.forEach(card => {
      card.destroy();
    });
    this.modelCards.clear();

    // Clear container
    container.innerHTML = '';
  }

  /**
   * Get a specific model card by ID
   * @param {string} modelId - The model ID
   * @returns {Object|null} The model card instance
   */
  getModelCard(modelId) {
    return this.modelCards.get(modelId) || null;
  }

  /**
   * Update a specific model card
   * @param {string} modelId - The model ID
   * @param {Object} newModelData - Updated model data
   */
  updateModelCard(modelId, newModelData) {
    const card = this.modelCards.get(modelId);
    if (card) {
      card.updateModel(newModelData);
    }
  }

  /**
   * Get current models
   * @returns {Array} Current models array
   */
  getModels() {
    return [...this.models];
  }

  /**
   * Get the number of currently displayed models
   * @returns {number} Number of models
   */
  getModelCount() {
    return this.models.length;
  }

  /**
   * Trigger layout recalculation for smooth animations
   * @private
   */
  _triggerLayoutRecalc() {
    if (!this.element) return;

    // Force reflow to ensure animations work properly
    requestAnimationFrame(() => {
      if (!this.element) return; // Check again in case component was destroyed
      
      const container = this.element.querySelector('#models-container');
      if (container) {
        container.offsetHeight; // Trigger reflow
      }
    });
  }

  /**
   * Handle responsive layout changes
   * This method can be called when screen size changes
   */
  handleResize() {
    // The CSS Grid will handle most responsive changes automatically
    // This method is available for any additional JavaScript-based adjustments
    this._triggerLayoutRecalc();
  }

  /**
   * Scroll to a specific model card
   * @param {string} modelId - The model ID to scroll to
   */
  scrollToModel(modelId) {
    const card = this.modelCards.get(modelId);
    if (card && card.element) {
      card.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  /**
   * Add CSS classes for mobile-specific styling
   * @param {boolean} isMobile - Whether device is mobile
   */
  setMobileMode(isMobile) {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    if (isMobile) {
      container.classList.add('mobile-grid');
      this.element.classList.add('mobile-layout');
    } else {
      container.classList.remove('mobile-grid');
      this.element.classList.remove('mobile-layout');
    }
  }

  /**
   * Set up error state event listeners
   */
  setupErrorStateListeners() {
    if (!this.element) return;

    const retryButton = this.element.querySelector('#retry-button');
    const refreshButton = this.element.querySelector('#refresh-button');

    if (retryButton) {
      retryButton.addEventListener('click', () => {
        const retryCallback = this.retryCallbacks.get('load-models');
        if (retryCallback) {
          this.showLoading();
          retryCallback();
        }
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  /**
   * Set up loading state listener
   */
  setupLoadingStateListener() {
    loadingStateManager.addListener('load-models', (state) => {
      this.updateLoadingState(state);
    });
  }

  /**
   * Update loading state UI
   * @param {Object} state - Loading state
   */
  updateLoadingState(state) {
    if (!this.element) return;

    const loadingMessage = this.element.querySelector('#loading-message');
    const loadingProgress = this.element.querySelector('#loading-progress');

    if (loadingMessage && state.message) {
      loadingMessage.textContent = state.message;
    }

    if (loadingProgress && typeof state.progress === 'number') {
      loadingProgress.style.width = `${state.progress}%`;
    }
  }

  /**
   * Show error state
   * @param {Error} error - Error to display
   * @param {Function} retryCallback - Callback for retry action
   */
  showError(error, retryCallback = null) {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');
    const errorState = this.element.querySelector('#error-state');
    const errorMessage = this.element.querySelector('#error-message');
    const retryButton = this.element.querySelector('#retry-button');

    // Hide other states
    container.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');

    // Show error state
    errorState.classList.remove('hidden');

    // Update error message
    if (errorMessage) {
      const userMessage = errorHandler.getUserMessage(error);
      errorMessage.textContent = userMessage;
    }

    // Store retry callback
    if (retryCallback) {
      this.retryCallbacks.set('load-models', retryCallback);
      if (retryButton) {
        retryButton.classList.remove('hidden');
      }
    } else {
      if (retryButton) {
        retryButton.classList.add('hidden');
      }
    }
  }

  /**
   * Show loading with enhanced progress tracking
   */
  showLoading() {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');
    const errorState = this.element.querySelector('#error-state');

    container.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    loadingState.classList.remove('hidden');

    // Reset progress
    const loadingProgress = this.element.querySelector('#loading-progress');
    if (loadingProgress) {
      loadingProgress.style.width = '0%';
    }
  }

  /**
   * Set up keyboard navigation for the model grid
   * @private
   */
  _setupKeyboardNavigation() {
    if (!this.element) return;

    const container = this.element.querySelector('#models-container');
    if (!container) return;

    // Import keyboard navigation utilities
    import('../utils/keyboardNavigation.js').then(({ createRovingTabindex }) => {
      // Set up roving tabindex for model cards
      createRovingTabindex(container, '.model-card');
    });

    // Add keyboard event listener to the grid
    container.addEventListener('keydown', this._handleGridKeyDown.bind(this));
  }

  /**
   * Handle keyboard events for the model grid
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleGridKeyDown(event) {
    const modelCards = Array.from(this.element.querySelectorAll('.model-card'));
    const currentIndex = modelCards.indexOf(event.target);
    
    if (currentIndex === -1) return;

    let nextIndex = -1;
    const columns = this._getGridColumns();

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = Math.min(currentIndex + 1, modelCards.length - 1);
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = Math.min(currentIndex + columns, modelCards.length - 1);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = Math.max(currentIndex - columns, 0);
        break;
        
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
        
      case 'End':
        event.preventDefault();
        nextIndex = modelCards.length - 1;
        break;
        
      case 'PageDown':
        event.preventDefault();
        nextIndex = Math.min(currentIndex + (columns * 3), modelCards.length - 1);
        break;
        
      case 'PageUp':
        event.preventDefault();
        nextIndex = Math.max(currentIndex - (columns * 3), 0);
        break;
    }

    if (nextIndex !== -1 && nextIndex !== currentIndex) {
      modelCards[nextIndex].focus();
      this._announceGridNavigation(nextIndex + 1, modelCards.length);
    }
  }

  /**
   * Get the number of columns in the current grid layout
   * @returns {number} Number of columns
   * @private
   */
  _getGridColumns() {
    const container = this.element?.querySelector('#models-container');
    if (!container) return 1;

    const containerWidth = container.offsetWidth;
    
    // Based on Tailwind responsive grid classes
    if (containerWidth >= 1280) return 4; // xl: 4 columns
    if (containerWidth >= 1024) return 3;  // lg: 3 columns
    if (containerWidth >= 768) return 2;   // md: 2 columns
    return 1; // sm: 1 column
  }

  /**
   * Announce grid navigation to screen readers
   * @param {number} position - Current position (1-based)
   * @param {number} total - Total number of items
   * @private
   */
  _announceGridNavigation(position, total) {
    const announcement = `Model ${position} of ${total}`;
    
    // Create announcement element
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      if (announcer.parentNode) {
        document.body.removeChild(announcer);
      }
    }, 1000);
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    // Remove loading state listener
    loadingStateManager.removeListener('load-models', this.updateLoadingState);

    // Clear all cards
    this.clearCards();

    // Clear retry callbacks
    this.retryCallbacks.clear();

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.models = [];
  }
}