/**
 * ModelGrid Component for GGUF Model Discovery
 * Manages the grid container and rendering of model cards with responsive layout
 * Handles 60 cards per page with responsive breakpoints (5/3/1-2 cards per row)
 */

class ModelGrid {
    /**
     * Create a ModelGrid instance
     * @param {string} containerId - ID of the grid container element
     * @param {Object} options - Configuration options
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`ModelGrid container with ID "${containerId}" not found`);
        }

        // Configuration options
        this.options = {
            cardsPerPage: 60,
            enableVirtualization: true,
            enableLazyLoading: false,
            animateCards: true,
            enableBatching: true,
            batchSize: 10,
            enableRecycling: true,
            ...options
        };

        // State management
        this.currentCards = [];
        this.renderedCards = [];
        this.isRendering = false;
        this.observer = null;
        
        // Performance optimization state
        this.cardPool = [];
        this.visibleRange = { start: 0, end: 50 };
        this.scrollContainer = null;
        this.virtualHeight = 0;
        this.cardHeight = 300; // Estimated card height
        this.rowHeight = 320; // Estimated row height including gaps

        // Initialize the grid
        this._initialize();
    }

    /**
     * Initialize the grid container and setup responsive classes
     * @private
     */
    _initialize() {
        // Add responsive grid classes
        this.container.className = 'model-grid';
        
        // Setup intersection observer for lazy loading if enabled
        if (this.options.enableLazyLoading) {
            this._setupIntersectionObserver();
        }

        // Setup resize observer for responsive adjustments
        this._setupResizeObserver();

        // Add ARIA attributes for accessibility
        this.container.setAttribute('role', 'grid');
        this.container.setAttribute('aria-label', 'GGUF Model Cards Grid');
    }

    /**
     * Setup intersection observer for lazy loading
     * @private
     */
    _setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this._loadCardContent(entry.target);
                        }
                    });
                },
                {
                    rootMargin: '50px',
                    threshold: 0.1
                }
            );
        }
    }

    /**
     * Setup resize observer for responsive layout adjustments
     * @private
     */
    _setupResizeObserver() {
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => {
                this._updateResponsiveLayout();
            });
            resizeObserver.observe(this.container);
        } else {
            // Fallback to window resize event
            window.addEventListener('resize', 
                Helpers.debounce(() => this._updateResponsiveLayout(), 250)
            );
        }
    }

    /**
     * Update responsive layout based on container width and device capabilities
     * @private
     */
    _updateResponsiveLayout() {
        const containerWidth = this.container.offsetWidth;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const viewportWidth = window.innerWidth;
        
        // Remove existing responsive classes
        this.container.classList.remove(
            'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 
            'grid-cols-4', 'grid-cols-5', 'mobile-optimized', 'touch-optimized'
        );

        // Apply responsive grid classes based on enhanced breakpoints
        if (viewportWidth >= 1200) {
            // Large desktop (1200px+): 5 cards per row
            this.container.classList.add('grid-cols-5');
        } else if (viewportWidth >= 1024) {
            // Desktop (1024px-1199px): 4 cards per row
            this.container.classList.add('grid-cols-4');
        } else if (viewportWidth >= 768) {
            // Tablet (768px-1023px): 3 cards per row
            this.container.classList.add('grid-cols-3');
        } else if (viewportWidth >= 480) {
            // Large mobile (480px-767px): 2 cards per row
            this.container.classList.add('grid-cols-2');
            this.container.classList.add('mobile-optimized');
        } else {
            // Small mobile (320px-479px): 1 card per row
            this.container.classList.add('grid-cols-1');
            this.container.classList.add('mobile-optimized');
        }

        // Add touch-specific optimizations
        if (isTouchDevice) {
            this.container.classList.add('touch-optimized');
            this._optimizeForTouch();
        }

        // Adjust card spacing for mobile
        if (viewportWidth <= 767) {
            this._applyMobileSpacing();
        }
    }

    /**
     * Apply touch-specific optimizations
     * @private
     */
    _optimizeForTouch() {
        const cards = this.container.querySelectorAll('.model-card');
        cards.forEach(card => {
            // Ensure minimum touch target size
            const cardHeight = card.offsetHeight;
            if (cardHeight < 44) {
                card.style.minHeight = '44px';
            }

            // Add touch-friendly interaction feedback
            card.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: true });
            card.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: true });
        });
    }

    /**
     * Handle touch start events for visual feedback
     * @private
     */
    _handleTouchStart(event) {
        const card = event.currentTarget;
        card.classList.add('touch-active');
    }

    /**
     * Handle touch end events for visual feedback
     * @private
     */
    _handleTouchEnd(event) {
        const card = event.currentTarget;
        setTimeout(() => {
            card.classList.remove('touch-active');
        }, 150);
    }

    /**
     * Apply mobile-specific spacing and layout adjustments
     * @private
     */
    _applyMobileSpacing() {
        const viewportWidth = window.innerWidth;
        
        if (viewportWidth <= 479) {
            // Small mobile: tighter spacing
            this.container.style.gap = '0.75rem';
        } else if (viewportWidth <= 767) {
            // Large mobile: moderate spacing
            this.container.style.gap = '1rem';
        } else {
            // Reset to default spacing
            this.container.style.gap = '';
        }
    }

    /**
     * Render model cards in the grid (optimized for large datasets)
     * @param {Array} models - Array of model data objects
     * @param {number} startIndex - Starting index for sequential numbering
     * @param {boolean} append - Whether to append to existing cards or replace
     * @returns {Promise<void>}
     */
    async renderCards(models, startIndex = 0, append = false) {
        if (this.isRendering) {
            console.warn('ModelGrid is already rendering, skipping duplicate render call');
            return;
        }

        this.isRendering = true;
        const renderStartTime = performance.now();

        try {
            // Validate input
            if (!Array.isArray(models)) {
                throw new Error('Models must be an array');
            }

            // Limit to 60 cards per page as per requirements
            const cardsToRender = models.slice(0, this.options.cardsPerPage);
            
            // Clear existing cards if not appending
            if (!append) {
                this.clearGrid();
            }

            // Show loading state if no cards to render
            if (cardsToRender.length === 0) {
                this._showEmptyState();
                return;
            }

            // Use optimized rendering for large datasets
            if (cardsToRender.length > 20 && this.options.enableBatching) {
                await this._renderCardsBatched(cardsToRender, startIndex, append);
            } else {
                await this._renderCardsStandard(cardsToRender, startIndex, append);
            }

            // Update responsive layout
            this._updateResponsiveLayout();

            // Dispatch custom event
            this._dispatchGridUpdateEvent('cardsRendered', {
                cardCount: cardsToRender.length,
                totalCards: this.renderedCards.length,
                startIndex,
                append,
                renderTime: performance.now() - renderStartTime
            });

        } catch (error) {
            console.error('Error rendering model cards:', error);
            this._showErrorState(error.message);
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Standard rendering for smaller datasets
     * @private
     */
    async _renderCardsStandard(cardsToRender, startIndex, append) {
        // Create document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();
        const newCards = [];

        // Render each card
        for (let i = 0; i < cardsToRender.length; i++) {
            const model = cardsToRender[i];
            const sequentialNumber = startIndex + i + 1;

            try {
                // Try to reuse card from pool if recycling is enabled
                let cardElement, modelCard;
                
                if (this.options.enableRecycling && this.cardPool.length > 0) {
                    const pooledCard = this.cardPool.pop();
                    modelCard = pooledCard.modelCard;
                    cardElement = pooledCard.element;
                    
                    // Update the pooled card with new data
                    modelCard.updateData(model, sequentialNumber);
                    modelCard.render();
                } else {
                    // Create new ModelCard instance
                    modelCard = new ModelCard(model, sequentialNumber);
                    cardElement = modelCard.render();
                }

                // Add grid item classes and attributes
                cardElement.classList.add('model-grid-item');
                cardElement.setAttribute('role', 'gridcell');
                cardElement.setAttribute('tabindex', '0');

                // Add to fragment
                fragment.appendChild(cardElement);
                newCards.push(modelCard);

                // Setup lazy loading if enabled
                if (this.options.enableLazyLoading && this.observer) {
                    this.observer.observe(cardElement);
                }

            } catch (error) {
                console.error(`Error rendering card for model ${model.modelName}:`, error);
                // Continue rendering other cards
            }
        }

        // Add all cards to DOM at once for better performance
        this.container.appendChild(fragment);

        // Update state
        if (append) {
            this.renderedCards.push(...newCards);
        } else {
            this.renderedCards = newCards;
        }

        this.currentCards = cardsToRender;

        // Apply animations if enabled
        if (this.options.animateCards) {
            this._animateCardsIn();
        }
    }

    /**
     * Batched rendering for large datasets to prevent UI blocking
     * @private
     */
    async _renderCardsBatched(cardsToRender, startIndex, append) {
        const batchSize = this.options.batchSize;
        const newCards = [];
        
        // Clear existing cards if not appending
        if (!append) {
            this.renderedCards = [];
        }

        // Process cards in batches
        for (let i = 0; i < cardsToRender.length; i += batchSize) {
            const batch = cardsToRender.slice(i, i + batchSize);
            const batchFragment = document.createDocumentFragment();
            
            // Render batch
            for (let j = 0; j < batch.length; j++) {
                const model = batch[j];
                const sequentialNumber = startIndex + i + j + 1;

                try {
                    // Try to reuse card from pool if recycling is enabled
                    let cardElement, modelCard;
                    
                    if (this.options.enableRecycling && this.cardPool.length > 0) {
                        const pooledCard = this.cardPool.pop();
                        modelCard = pooledCard.modelCard;
                        cardElement = pooledCard.element;
                        
                        // Update the pooled card with new data
                        modelCard.updateData(model, sequentialNumber);
                        modelCard.render();
                    } else {
                        // Create new ModelCard instance
                        modelCard = new ModelCard(model, sequentialNumber);
                        cardElement = modelCard.render();
                    }

                    // Add grid item classes and attributes
                    cardElement.classList.add('model-grid-item');
                    cardElement.setAttribute('role', 'gridcell');
                    cardElement.setAttribute('tabindex', '0');

                    // Add to batch fragment
                    batchFragment.appendChild(cardElement);
                    newCards.push(modelCard);

                    // Setup lazy loading if enabled
                    if (this.options.enableLazyLoading && this.observer) {
                        this.observer.observe(cardElement);
                    }

                } catch (error) {
                    console.error(`Error rendering card for model ${model.modelName}:`, error);
                }
            }

            // Add batch to DOM
            this.container.appendChild(batchFragment);
            
            // Update state incrementally
            this.renderedCards.push(...newCards.slice(i, i + batch.length));

            // Yield control to prevent UI blocking
            if (i + batchSize < cardsToRender.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        this.currentCards = cardsToRender;

        // Apply animations if enabled (with delay for batched rendering)
        if (this.options.animateCards) {
            setTimeout(() => this._animateCardsIn(), 50);
        }
    }

    /**
     * Clear all cards from the grid (optimized with recycling)
     */
    clearGrid() {
        // Clean up intersection observer
        if (this.observer) {
            this.renderedCards.forEach(card => {
                if (card.element) {
                    this.observer.unobserve(card.element);
                }
            });
        }

        // Recycle cards if recycling is enabled
        if (this.options.enableRecycling) {
            this.renderedCards.forEach(card => {
                if (card.element && this.cardPool.length < 100) { // Limit pool size
                    // Remove from DOM but keep for reuse
                    card.element.remove();
                    this.cardPool.push({
                        modelCard: card,
                        element: card.element
                    });
                } else if (card.destroy) {
                    card.destroy();
                }
            });
        } else {
            // Destroy all card instances
            this.renderedCards.forEach(card => {
                if (card.destroy) {
                    card.destroy();
                }
            });
        }

        // Clear DOM efficiently
        if (this.container.children.length > 0) {
            // Use faster DOM clearing method
            this.container.textContent = '';
        }

        // Reset state
        this.renderedCards = [];
        this.currentCards = [];

        // Dispatch event
        this._dispatchGridUpdateEvent('gridCleared');
    }

    /**
     * Update grid with new data (replaces existing cards)
     * @param {Array} models - New model data
     * @param {number} startIndex - Starting index for numbering
     */
    async updateGrid(models, startIndex = 0) {
        await this.renderCards(models, startIndex, false);
    }

    /**
     * Append additional cards to the grid
     * @param {Array} models - Additional model data
     * @param {number} startIndex - Starting index for numbering
     */
    async appendCards(models, startIndex = 0) {
        await this.renderCards(models, startIndex, true);
    }

    /**
     * Show empty state when no models are available
     * @private
     */
    _showEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state col-span-full">
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                        </path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No models found</h3>
                    <p class="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
            </div>
        `;
    }

    /**
     * Show error state when rendering fails
     * @param {string} errorMessage - Error message to display
     * @private
     */
    _showErrorState(errorMessage) {
        this.container.innerHTML = `
            <div class="error-state col-span-full">
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z">
                        </path>
                    </svg>
                    <h3 class="text-lg font-medium text-red-900 mb-2">Error loading models</h3>
                    <p class="text-red-600">${errorMessage}</p>
                    <button onclick="location.reload()" class="mt-4 btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Animate cards in with staggered effect
     * @private
     */
    _animateCardsIn() {
        const cards = this.container.querySelectorAll('.model-grid-item');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50); // Stagger by 50ms
        });
    }

    /**
     * Load card content for lazy loading
     * @param {HTMLElement} cardElement - Card element to load
     * @private
     */
    _loadCardContent(cardElement) {
        // Implementation for lazy loading if needed
        // For now, cards are fully rendered immediately
        if (this.observer) {
            this.observer.unobserve(cardElement);
        }
    }

    /**
     * Dispatch custom grid events
     * @param {string} eventType - Type of event
     * @param {Object} detail - Event detail data
     * @private
     */
    _dispatchGridUpdateEvent(eventType, detail = {}) {
        const event = new CustomEvent(`modelGrid${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: {
                gridId: this.containerId,
                timestamp: Date.now(),
                ...detail
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current grid statistics
     * @returns {Object} Grid statistics
     */
    getStats() {
        return {
            totalCards: this.renderedCards.length,
            cardsPerPage: this.options.cardsPerPage,
            isRendering: this.isRendering,
            containerWidth: this.container.offsetWidth,
            containerHeight: this.container.offsetHeight
        };
    }

    /**
     * Get all rendered card instances
     * @returns {Array} Array of ModelCard instances
     */
    getRenderedCards() {
        return [...this.renderedCards];
    }

    /**
     * Find a card by its sequential number
     * @param {number} sequentialNumber - Sequential number to find
     * @returns {ModelCard|null} Found card or null
     */
    findCardByNumber(sequentialNumber) {
        return this.renderedCards.find(card => card.getNumber() === sequentialNumber) || null;
    }

    /**
     * Get memory usage statistics
     * @returns {Object} Memory usage statistics
     */
    getMemoryStats() {
        return {
            renderedCards: this.renderedCards.length,
            pooledCards: this.cardPool.length,
            currentCards: this.currentCards.length,
            domElements: this.container.children.length,
            estimatedMemoryUsage: this._estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage of the grid
     * @private
     * @returns {number} Estimated memory usage in bytes
     */
    _estimateMemoryUsage() {
        const cardMemoryEstimate = 2048; // Estimated bytes per card
        const poolMemoryEstimate = 1024; // Estimated bytes per pooled card
        
        return (this.renderedCards.length * cardMemoryEstimate) + 
               (this.cardPool.length * poolMemoryEstimate);
    }

    /**
     * Perform memory cleanup and optimization
     */
    optimizeMemory() {
        console.log('Optimizing ModelGrid memory usage...');
        
        // Limit card pool size
        const maxPoolSize = 50;
        if (this.cardPool.length > maxPoolSize) {
            const excessCards = this.cardPool.splice(maxPoolSize);
            excessCards.forEach(pooledCard => {
                if (pooledCard.modelCard.destroy) {
                    pooledCard.modelCard.destroy();
                }
            });
        }

        // Force garbage collection hint (if available)
        if (window.gc) {
            window.gc();
        }

        console.log('Memory optimization complete:', this.getMemoryStats());
    }

    /**
     * Configure performance settings
     * @param {Object} settings - Performance settings
     */
    configurePerformance(settings = {}) {
        if (settings.enableBatching !== undefined) {
            this.options.enableBatching = settings.enableBatching;
        }
        
        if (settings.batchSize !== undefined) {
            this.options.batchSize = Math.max(5, Math.min(50, settings.batchSize));
        }
        
        if (settings.enableRecycling !== undefined) {
            this.options.enableRecycling = settings.enableRecycling;
            
            // Clear pool if recycling is disabled
            if (!settings.enableRecycling) {
                this.cardPool.forEach(pooledCard => {
                    if (pooledCard.modelCard.destroy) {
                        pooledCard.modelCard.destroy();
                    }
                });
                this.cardPool = [];
            }
        }
        
        if (settings.animateCards !== undefined) {
            this.options.animateCards = settings.animateCards;
        }

        console.log('ModelGrid performance settings updated:', {
            enableBatching: this.options.enableBatching,
            batchSize: this.options.batchSize,
            enableRecycling: this.options.enableRecycling,
            animateCards: this.options.animateCards
        });
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.getStats(),
            ...this.getMemoryStats(),
            options: { ...this.options },
            isOptimized: this.options.enableBatching && this.options.enableRecycling
        };
    }

    /**
     * Destroy the grid and clean up resources
     */
    destroy() {
        console.log('Destroying ModelGrid...');
        
        // Clear all cards
        this.clearGrid();

        // Clean up card pool
        this.cardPool.forEach(pooledCard => {
            if (pooledCard.modelCard.destroy) {
                pooledCard.modelCard.destroy();
            }
        });
        this.cardPool = [];

        // Clean up observers
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Remove event listeners
        window.removeEventListener('resize', this._updateResponsiveLayout);

        // Clear container
        this.container.className = '';
        this.container.innerHTML = '';
        
        // Reset state
        this.currentCards = [];
        this.renderedCards = [];
        this.isRendering = false;
        this.visibleRange = { start: 0, end: 50 };
        
        console.log('ModelGrid destroyed');
    }
}

// Export for use in other modules
window.ModelGrid = ModelGrid;