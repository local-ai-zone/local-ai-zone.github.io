/**
 * VirtualScrollGrid component for efficient rendering of large model datasets
 * Implements virtual scrolling to handle thousands of models without performance issues
 */
export class VirtualScrollGrid {
  constructor(options = {}) {
    this.element = null;
    this.models = [];
    this.filteredModels = [];
    this.modelCards = new Map();
    this.visibleCards = new Map();
    
    // Virtual scrolling configuration
    this.itemHeight = options.itemHeight || 280; // Estimated card height
    this.containerHeight = options.containerHeight || window.innerHeight;
    this.buffer = options.buffer || 5; // Extra items to render outside viewport
    this.threshold = options.threshold || 1000; // Enable virtual scrolling for >1000 items
    
    // Scroll state
    this.scrollTop = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleCount = 0;
    
    // Performance optimization
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.resizeObserver = null;
    
    // Lazy loading
    this.intersectionObserver = null;
    this.lazyLoadThreshold = 200; // px from viewport
    
    // Bind methods
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Create and return the virtual scroll grid DOM element
   * @returns {HTMLElement} The grid container element
   */
  render() {
    this.element = document.createElement('main');
    this.element.className = `
      min-h-screen mobile-padding py-8
      transition-all duration-300 ease-in-out
      relative overflow-auto
    `.replace(/\s+/g, ' ').trim();
    
    this.element.innerHTML = `
      <!-- Virtual scroll container -->
      <div id="virtual-container" class="relative">
        <!-- Spacer for total height -->
        <div id="virtual-spacer" class="w-full" style="height: 0px;"></div>
        
        <!-- Visible items container -->
        <div id="visible-container" class="grid-responsive absolute top-0 left-0 right-0">
          <!-- Visible model cards will be inserted here -->
        </div>
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
          <p class="text-gray-600">Please wait while we fetch the latest model data.</p>
        </div>
      </div>
      
      <!-- Performance indicator -->
      <div id="perf-indicator" class="hidden fixed bottom-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
        Virtual scrolling enabled
      </div>
    `;

    // Set up event listeners
    this.element.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Set up resize observer
    this.setupResizeObserver();
    
    // Set up intersection observer for lazy loading
    this.setupIntersectionObserver();

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
    this.filteredModels = [...models];
    this.ModelCardClass = ModelCardClass;
    
    const container = this.element.querySelector('#virtual-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');
    const perfIndicator = this.element.querySelector('#perf-indicator');

    // Hide loading state
    loadingState.classList.add('hidden');

    if (models.length === 0) {
      // Show empty state
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      perfIndicator.classList.add('hidden');
      return;
    }

    // Show models container
    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Determine if virtual scrolling should be enabled
    const useVirtualScrolling = models.length > this.threshold;
    
    if (useVirtualScrolling) {
      perfIndicator.classList.remove('hidden');
      this.enableVirtualScrolling();
    } else {
      perfIndicator.classList.add('hidden');
      this.disableVirtualScrolling();
    }

    // Calculate layout and render visible items
    this.calculateLayout();
    this.renderVisibleItems();
  }

  /**
   * Apply filters to the model list
   * @param {Array} filteredModels - Filtered array of models
   */
  applyFilters(filteredModels) {
    this.filteredModels = filteredModels;
    
    const perfIndicator = this.element?.querySelector('#perf-indicator');
    
    if (this.filteredModels.length > this.threshold) {
      this.enableVirtualScrolling();
      if (perfIndicator) {
        perfIndicator.classList.remove('hidden');
      }
    } else {
      this.disableVirtualScrolling();
      if (perfIndicator) {
        perfIndicator.classList.add('hidden');
      }
    }
    
    this.calculateLayout();
    this.renderVisibleItems();
  }

  /**
   * Enable virtual scrolling mode
   */
  enableVirtualScrolling() {
    if (!this.element) return;
    
    this.element.classList.add('virtual-scroll-enabled');
    this.calculateVisibleRange();
  }

  /**
   * Disable virtual scrolling mode and render all items
   */
  disableVirtualScrolling() {
    if (!this.element) return;
    
    this.element.classList.remove('virtual-scroll-enabled');
    this.renderAllItems();
  }

  /**
   * Calculate layout dimensions and visible range
   */
  calculateLayout() {
    if (!this.element) return;

    const spacer = this.element.querySelector('#virtual-spacer');
    if (!spacer) return;

    // Calculate total height based on number of items
    const totalHeight = this.filteredModels.length * this.itemHeight;
    spacer.style.height = `${totalHeight}px`;

    // Update container height
    this.containerHeight = this.element.clientHeight;
    this.visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + (this.buffer * 2);

    this.calculateVisibleRange();
  }

  /**
   * Calculate which items should be visible based on scroll position
   */
  calculateVisibleRange() {
    this.startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
    this.endIndex = Math.min(
      this.filteredModels.length - 1,
      this.startIndex + this.visibleCount
    );
  }

  /**
   * Render only the visible items in the viewport
   */
  renderVisibleItems() {
    if (!this.element || !this.ModelCardClass) return;

    const visibleContainer = this.element.querySelector('#visible-container');
    if (!visibleContainer) return;

    // Clear existing visible cards
    this.clearVisibleCards();

    // Check if virtual scrolling is enabled
    const isVirtualScrolling = this.filteredModels.length > this.threshold;

    if (isVirtualScrolling) {
      // Render only visible items
      const fragment = document.createDocumentFragment();
      
      for (let i = this.startIndex; i <= this.endIndex; i++) {
        const model = this.filteredModels[i];
        if (!model) continue;

        const cardElement = this.createModelCard(model, i);
        fragment.appendChild(cardElement);
      }

      visibleContainer.appendChild(fragment);
      
      // Position the visible container
      visibleContainer.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
    } else {
      // Render all items with lazy loading
      this.renderAllItems();
    }
  }

  /**
   * Render all items (for small datasets)
   */
  renderAllItems() {
    if (!this.element || !this.ModelCardClass) return;

    const visibleContainer = this.element.querySelector('#visible-container');
    if (!visibleContainer) return;

    // Clear existing cards
    this.clearVisibleCards();

    // Reset transform
    visibleContainer.style.transform = 'translateY(0px)';

    // Create all cards with lazy loading
    const fragment = document.createDocumentFragment();
    
    this.filteredModels.forEach((model, index) => {
      const cardElement = this.createModelCard(model, index);
      
      // Add lazy loading for images and heavy content
      if (index > 20) { // Lazy load after first 20 items
        cardElement.classList.add('lazy-load');
        cardElement.dataset.index = index;
      }
      
      fragment.appendChild(cardElement);
    });

    visibleContainer.appendChild(fragment);
  }

  /**
   * Create a model card element
   * @param {Object} model - Model data
   * @param {number} index - Item index
   * @returns {HTMLElement} Card element
   */
  createModelCard(model, index) {
    // Check if card already exists
    let modelCard = this.modelCards.get(model.id);
    
    if (!modelCard) {
      modelCard = new this.ModelCardClass(model);
      this.modelCards.set(model.id, modelCard);
    }

    const cardElement = modelCard.render();
    
    // Add staggered animation for small datasets
    if (this.filteredModels.length <= this.threshold) {
      cardElement.style.animationDelay = `${Math.min(index * 50, 1000)}ms`;
      cardElement.classList.add('animate-slide-up');
    }

    // Store reference for cleanup
    this.visibleCards.set(model.id, modelCard);
    
    return cardElement;
  }

  /**
   * Handle scroll events with throttling
   */
  handleScroll() {
    if (!this.element) return;

    this.scrollTop = this.element.scrollTop;
    this.isScrolling = true;

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Only update if virtual scrolling is enabled
    if (this.filteredModels.length > this.threshold) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        this.calculateVisibleRange();
        this.renderVisibleItems();
      });
    }

    // Set scrolling state to false after delay
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  }

  /**
   * Handle resize events
   */
  handleResize() {
    if (!this.element) return;

    const newHeight = this.element.clientHeight;
    if (newHeight !== this.containerHeight) {
      this.containerHeight = newHeight;
      this.calculateLayout();
      this.renderVisibleItems();
    }
  }

  /**
   * Set up resize observer
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.element) {
          this.handleResize();
          break;
        }
      }
    });

    if (this.element) {
      this.resizeObserver.observe(this.element);
    }
  }

  /**
   * Set up intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if (!window.IntersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const cardElement = entry.target;
            cardElement.classList.remove('lazy-load');
            this.intersectionObserver.unobserve(cardElement);
          }
        });
      },
      {
        rootMargin: `${this.lazyLoadThreshold}px`,
        threshold: 0.1
      }
    );
  }

  /**
   * Clear visible cards
   */
  clearVisibleCards() {
    this.visibleCards.clear();
    
    const visibleContainer = this.element?.querySelector('#visible-container');
    if (visibleContainer) {
      visibleContainer.innerHTML = '';
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (!this.element) return;

    const container = this.element.querySelector('#virtual-container');
    const emptyState = this.element.querySelector('#empty-state');
    const loadingState = this.element.querySelector('#loading-state');

    container.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
  }

  /**
   * Get current models
   * @returns {Array} Current filtered models array
   */
  getModels() {
    return [...this.filteredModels];
  }

  /**
   * Get the number of currently displayed models
   * @returns {number} Number of models
   */
  getModelCount() {
    return this.filteredModels.length;
  }

  /**
   * Scroll to a specific model
   * @param {string} modelId - The model ID to scroll to
   */
  scrollToModel(modelId) {
    const modelIndex = this.filteredModels.findIndex(model => model.id === modelId);
    if (modelIndex === -1) return;

    const targetScrollTop = modelIndex * this.itemHeight;
    this.element.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    // Remove event listeners
    if (this.element) {
      this.element.removeEventListener('scroll', this.handleScroll);
    }

    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Clear timeouts
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Clear cards
    this.modelCards.forEach(card => {
      if (card.destroy) {
        card.destroy();
      }
    });
    this.modelCards.clear();
    this.visibleCards.clear();

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.models = [];
    this.filteredModels = [];
  }
}