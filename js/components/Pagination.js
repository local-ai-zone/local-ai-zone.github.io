/**
 * Pagination Component for GGUF Model Discovery
 * Handles numbered page navigation with previous/next buttons and page jump functionality
 * Maintains consistent numbering across pages and filters with ellipsis for large page counts
 */

class Pagination {
    /**
     * Create a Pagination instance
     * @param {string} containerId - ID of the pagination container element
     * @param {AppState} appState - Application state manager
     * @param {Object} options - Configuration options
     */
    constructor(containerId, appState, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.appState = appState;
        
        if (!this.container) {
            throw new Error(`Pagination container with ID "${containerId}" not found`);
        }

        if (!this.appState) {
            throw new Error('AppState instance is required for Pagination');
        }

        // Configuration options
        this.options = {
            maxVisiblePages: 7, // Maximum number of page buttons to show
            showFirstLast: true, // Show first/last page buttons
            showPrevNext: true, // Show previous/next buttons
            showPageInfo: true, // Show "Page X of Y" info
            enableKeyboardNav: true, // Enable keyboard navigation
            ...options
        };

        // State
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.itemsPerPage = 60;
        this.isRendering = false;

        // Bind methods
        this.render = this.render.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handleKeyboardNav = this.handleKeyboardNav.bind(this);
        this.goToPage = this.goToPage.bind(this);
        this.goToPrevious = this.goToPrevious.bind(this);
        this.goToNext = this.goToNext.bind(this);
        this.goToFirst = this.goToFirst.bind(this);
        this.goToLast = this.goToLast.bind(this);

        // Initialize
        this._initialize();
    }

    /**
     * Initialize the pagination component
     * @private
     */
    _initialize() {
        // Add pagination classes
        this.container.className = 'pagination-container';
        
        // Add ARIA attributes
        this.container.setAttribute('role', 'navigation');
        this.container.setAttribute('aria-label', 'Pagination Navigation');

        // Subscribe to state changes
        this.stateSubscription = this.appState.subscribe(
            (newState) => this._handleStateChange(newState),
            ['pagination', 'filteredModels']
        );

        // Setup keyboard navigation if enabled
        if (this.options.enableKeyboardNav) {
            this._setupKeyboardNavigation();
        }

        // Initial render
        this._updateFromState();
        this.render();
    }

    /**
     * Handle state changes from AppState
     * @param {Object} newState - New application state
     * @private
     */
    _handleStateChange(newState) {
        const pagination = newState.pagination;
        const hasChanged = (
            this.currentPage !== pagination.currentPage ||
            this.totalPages !== pagination.totalPages ||
            this.totalItems !== pagination.totalItems ||
            this.itemsPerPage !== pagination.itemsPerPage
        );

        if (hasChanged) {
            this._updateFromState();
            this.render();
        }
    }

    /**
     * Update internal state from AppState
     * @private
     */
    _updateFromState() {
        const state = this.appState.getState();
        const pagination = state.pagination;

        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;
        this.totalItems = pagination.totalItems;
        this.itemsPerPage = pagination.itemsPerPage;
    }

    /**
     * Render the pagination component
     */
    render() {
        if (this.isRendering) {
            return;
        }

        this.isRendering = true;

        try {
            // Don't render if there's only one page or no items
            if (this.totalPages <= 1) {
                this.container.innerHTML = '';
                this.container.style.display = 'none';
                return;
            }

            this.container.style.display = 'block';

            // Generate pagination HTML
            const paginationHTML = this._generatePaginationHTML();
            this.container.innerHTML = paginationHTML;

            // Bind event listeners
            this._bindEventListeners();

            // Dispatch render event
            this._dispatchEvent('paginationRendered', {
                currentPage: this.currentPage,
                totalPages: this.totalPages,
                totalItems: this.totalItems
            });

        } catch (error) {
            console.error('Error rendering pagination:', error);
            this._showErrorState();
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Generate pagination HTML structure
     * @returns {string} HTML string for pagination
     * @private
     */
    _generatePaginationHTML() {
        const pages = this._calculateVisiblePages();
        
        return `
            <div class="pagination-wrapper">
                ${this.options.showPageInfo ? this._generatePageInfo() : ''}
                <nav class="pagination-nav" aria-label="Page navigation">
                    <ul class="pagination-list">
                        ${this._generateNavigationButtons(pages)}
                    </ul>
                </nav>
            </div>
        `;
    }

    /**
     * Generate page information display
     * @returns {string} Page info HTML
     * @private
     */
    _generatePageInfo() {
        const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
        
        return `
            <div class="pagination-info" aria-live="polite">
                <span class="text-sm text-gray-700">
                    Showing <span class="font-medium">${startItem.toLocaleString()}</span> 
                    to <span class="font-medium">${endItem.toLocaleString()}</span> 
                    of <span class="font-medium">${this.totalItems.toLocaleString()}</span> models
                </span>
            </div>
        `;
    }

    /**
     * Generate navigation buttons HTML
     * @param {Array} pages - Array of page objects to display
     * @returns {string} Navigation buttons HTML
     * @private
     */
    _generateNavigationButtons(pages) {
        let html = '';

        // Previous button
        if (this.options.showPrevNext) {
            html += this._generatePrevButton();
        }

        // First page button (if not in visible range)
        if (this.options.showFirstLast && pages[0]?.page > 1) {
            html += this._generatePageButton(1, false);
            if (pages[0]?.page > 2) {
                html += this._generateEllipsis('start');
            }
        }

        // Page buttons
        pages.forEach(pageObj => {
            html += this._generatePageButton(pageObj.page, pageObj.isCurrent);
        });

        // Last page button (if not in visible range)
        if (this.options.showFirstLast && pages[pages.length - 1]?.page < this.totalPages) {
            if (pages[pages.length - 1]?.page < this.totalPages - 1) {
                html += this._generateEllipsis('end');
            }
            html += this._generatePageButton(this.totalPages, false);
        }

        // Next button
        if (this.options.showPrevNext) {
            html += this._generateNextButton();
        }

        return html;
    }

    /**
     * Generate previous button HTML with mobile optimizations
     * @returns {string} Previous button HTML
     * @private
     */
    _generatePrevButton() {
        const isDisabled = this.currentPage <= 1;
        const disabledClass = isDisabled ? 'pagination-button-disabled' : '';
        const ariaDisabled = isDisabled ? 'aria-disabled="true"' : '';
        const isMobile = window.innerWidth <= 767;

        return `
            <li class="pagination-item">
                <button 
                    type="button"
                    class="pagination-button pagination-prev ${disabledClass}"
                    data-action="prev"
                    ${ariaDisabled}
                    ${isDisabled ? 'disabled' : ''}
                    aria-label="Go to previous page"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    <span class="${isMobile ? 'sr-only' : 'sm:not-sr-only sm:ml-2'}">Previous</span>
                </button>
            </li>
        `;
    }

    /**
     * Generate next button HTML with mobile optimizations
     * @returns {string} Next button HTML
     * @private
     */
    _generateNextButton() {
        const isDisabled = this.currentPage >= this.totalPages;
        const disabledClass = isDisabled ? 'pagination-button-disabled' : '';
        const ariaDisabled = isDisabled ? 'aria-disabled="true"' : '';
        const isMobile = window.innerWidth <= 767;

        return `
            <li class="pagination-item">
                <button 
                    type="button"
                    class="pagination-button pagination-next ${disabledClass}"
                    data-action="next"
                    ${ariaDisabled}
                    ${isDisabled ? 'disabled' : ''}
                    aria-label="Go to next page"
                >
                    <span class="${isMobile ? 'sr-only' : 'sm:not-sr-only sm:mr-2'}">Next</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </li>
        `;
    }

    /**
     * Generate page button HTML
     * @param {number} pageNumber - Page number
     * @param {boolean} isCurrent - Whether this is the current page
     * @returns {string} Page button HTML
     * @private
     */
    _generatePageButton(pageNumber, isCurrent) {
        const currentClass = isCurrent ? 'pagination-button-current' : '';
        const ariaCurrent = isCurrent ? 'aria-current="page"' : '';

        return `
            <li class="pagination-item">
                <button 
                    type="button"
                    class="pagination-button pagination-page ${currentClass}"
                    data-action="page"
                    data-page="${pageNumber}"
                    ${ariaCurrent}
                    aria-label="Go to page ${pageNumber}"
                >
                    ${pageNumber}
                </button>
            </li>
        `;
    }

    /**
     * Generate ellipsis HTML
     * @param {string} position - Position of ellipsis ('start' or 'end')
     * @returns {string} Ellipsis HTML
     * @private
     */
    _generateEllipsis(position) {
        return `
            <li class="pagination-item">
                <span class="pagination-ellipsis" aria-hidden="true">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c0-.552-.448-1-1-1s-1 .448-1 1 .448 1 1 1 1-.448 1-1zm-6 0c0-.552-.448-1-1-1s-1 .448-1 1 .448 1 1 1 1-.448 1-1zm12 0c0-.552-.448-1-1-1s-1 .448-1 1 .448 1 1 1 1-.448 1-1z"/>
                    </svg>
                </span>
            </li>
        `;
    }

    /**
     * Calculate which pages should be visible based on current page and total pages
     * @returns {Array} Array of page objects with page number and current status
     * @private
     */
    _calculateVisiblePages() {
        const pages = [];
        const maxVisible = this.options.maxVisiblePages;
        
        if (this.totalPages <= maxVisible) {
            // Show all pages if total is less than max visible
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push({
                    page: i,
                    isCurrent: i === this.currentPage
                });
            }
        } else {
            // Calculate range around current page
            const halfVisible = Math.floor(maxVisible / 2);
            let startPage = Math.max(1, this.currentPage - halfVisible);
            let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
            
            // Adjust start if we're near the end
            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push({
                    page: i,
                    isCurrent: i === this.currentPage
                });
            }
        }
        
        return pages;
    }

    /**
     * Bind event listeners to pagination buttons with mobile enhancements
     * @private
     */
    _bindEventListeners() {
        // Delegate click events to the container
        this.container.addEventListener('click', this.handlePageChange);
        
        // Add keyboard navigation
        if (this.options.enableKeyboardNav) {
            this.container.addEventListener('keydown', this.handleKeyboardNav);
        }

        // Add mobile-specific touch interactions
        this._setupMobileTouchInteractions();
        
        // Add swipe gesture support for mobile
        this._setupSwipeGestures();
    }

    /**
     * Setup mobile touch interactions for better feedback
     * @private
     */
    _setupMobileTouchInteractions() {
        const isMobile = window.innerWidth <= 767;
        
        if (isMobile) {
            const buttons = this.container.querySelectorAll('.pagination-button');
            
            buttons.forEach(button => {
                button.addEventListener('touchstart', (e) => {
                    if (!button.disabled) {
                        button.classList.add('touch-active');
                    }
                }, { passive: true });
                
                button.addEventListener('touchend', (e) => {
                    setTimeout(() => {
                        button.classList.remove('touch-active');
                    }, 150);
                }, { passive: true });
            });
        }
    }

    /**
     * Setup swipe gestures for mobile pagination navigation
     * @private
     */
    _setupSwipeGestures() {
        const isMobile = window.innerWidth <= 767;
        
        if (isMobile && 'ontouchstart' in window) {
            let startX = 0;
            let startY = 0;
            let endX = 0;
            let endY = 0;
            
            this.container.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });
            
            this.container.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX;
                endY = e.changedTouches[0].clientY;
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const minSwipeDistance = 50;
                
                // Only process horizontal swipes
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        // Swipe right - go to previous page
                        this.goToPrevious();
                    } else {
                        // Swipe left - go to next page
                        this.goToNext();
                    }
                }
            }, { passive: true });
        }
    }

    /**
     * Handle page change events
     * @param {Event} event - Click event
     */
    handlePageChange(event) {
        event.preventDefault();
        
        const button = event.target.closest('button[data-action]');
        if (!button || button.disabled) {
            return;
        }

        const action = button.dataset.action;
        const page = parseInt(button.dataset.page);

        switch (action) {
            case 'prev':
                this.goToPrevious();
                break;
            case 'next':
                this.goToNext();
                break;
            case 'page':
                if (page && page !== this.currentPage) {
                    this.goToPage(page);
                }
                break;
        }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNav(event) {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.goToPrevious();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.goToNext();
                break;
            case 'Home':
                event.preventDefault();
                this.goToFirst();
                break;
            case 'End':
                event.preventDefault();
                this.goToLast();
                break;
        }
    }

    /**
     * Navigate to a specific page
     * @param {number} page - Page number to navigate to
     */
    goToPage(page) {
        const targetPage = Math.max(1, Math.min(page, this.totalPages));
        
        if (targetPage !== this.currentPage) {
            this.appState.setCurrentPage(targetPage);
            this._dispatchEvent('pageChanged', {
                previousPage: this.currentPage,
                currentPage: targetPage,
                totalPages: this.totalPages
            });
        }
    }

    /**
     * Navigate to the previous page
     */
    goToPrevious() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    /**
     * Navigate to the next page
     */
    goToNext() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    /**
     * Navigate to the first page
     */
    goToFirst() {
        this.goToPage(1);
    }

    /**
     * Navigate to the last page
     */
    goToLast() {
        this.goToPage(this.totalPages);
    }

    /**
     * Setup keyboard navigation for the entire component
     * @private
     */
    _setupKeyboardNavigation() {
        // Make container focusable
        this.container.setAttribute('tabindex', '0');
        
        // Add focus styles
        this.container.addEventListener('focus', () => {
            this.container.classList.add('pagination-focused');
        });
        
        this.container.addEventListener('blur', () => {
            this.container.classList.remove('pagination-focused');
        });
    }

    /**
     * Show error state when rendering fails
     * @private
     */
    _showErrorState() {
        this.container.innerHTML = `
            <div class="pagination-error">
                <p class="text-sm text-red-600">
                    Error loading pagination. Please refresh the page.
                </p>
            </div>
        `;
    }

    /**
     * Dispatch custom pagination events
     * @param {string} eventType - Type of event
     * @param {Object} detail - Event detail data
     * @private
     */
    _dispatchEvent(eventType, detail = {}) {
        const event = new CustomEvent(`pagination${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: {
                paginationId: this.containerId,
                timestamp: Date.now(),
                ...detail
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current pagination state
     * @returns {Object} Current pagination state
     */
    getState() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems,
            itemsPerPage: this.itemsPerPage,
            isRendering: this.isRendering
        };
    }

    /**
     * Update pagination options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    /**
     * Destroy the pagination component and clean up resources
     */
    destroy() {
        // Remove event listeners
        this.container.removeEventListener('click', this.handlePageChange);
        this.container.removeEventListener('keydown', this.handleKeyboardNav);
        
        // Unsubscribe from state changes
        if (this.stateSubscription) {
            this.appState.unsubscribe(this.stateSubscription);
        }
        
        // Clear container
        this.container.innerHTML = '';
        this.container.className = '';
        this.container.removeAttribute('role');
        this.container.removeAttribute('aria-label');
        this.container.removeAttribute('tabindex');
        
        // Reset state
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.isRendering = false;
    }
}

// Export for use in other modules
window.Pagination = Pagination;