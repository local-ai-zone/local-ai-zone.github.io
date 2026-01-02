/**
 * Search and Filter component for GGUF Model Discovery
 * Handles search input, filter controls, and real-time filtering
 */

class SearchFilter {
    constructor(containerId, appState, filterService) {
        this.container = document.getElementById(containerId);
        this.appState = appState;
        this.filterService = filterService;
        
        if (!this.container) {
            throw new Error(`SearchFilter container with ID '${containerId}' not found`);
        }

        // Component state
        this.filterOptions = {
            quantFormats: [],
            modelTypes: [],
            licenses: []
        };
        
        // Debounced search function
        this.debouncedSearch = Helpers.debounce(this.handleSearch.bind(this), 300);
        
        // Bind methods
        this.render = this.render.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.clearAllFilters = this.clearAllFilters.bind(this);
        
        // Subscribe to state changes
        this.subscriptionId = this.appState.subscribe(
            this.handleStateChange,
            ['allModels', 'searchQuery', 'filters']
        );
        
        // Initial render
        this.render();
    }

    /**
     * Handle state changes from AppState
     * @param {object} newState - New application state
     */
    handleStateChange(newState) {
        const { allModels } = newState;
        
        if (allModels.length > 0) {
            this.updateFilterOptions(allModels);
            // Reinitialize engagement range when models are loaded
            setTimeout(() => this.initializeEngagementRange(), 100);
        }
    }

    /**
     * Render the search and filter component with mobile optimizations
     */
    render() {
        const isMobile = window.innerWidth <= 767;
        
        this.container.innerHTML = `
            <div class="search-filter-section">
                <div class="search-container">
                    <div class="search-input-wrapper">
                        <div class="search-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </div>
                        <input 
                            type="search" 
                            id="search-input"
                            class="search-input" 
                            placeholder="${isMobile ? 'Search models...' : 'Search models by name, quantization, type, or license...'}"
                            autocomplete="off"
                            spellcheck="false"
                            inputmode="search"
                            aria-label="Search GGUF models"
                        >
                        <button 
                            id="clear-search-btn" 
                            class="clear-search-btn" 
                            title="Clear search"
                            aria-label="Clear search"
                            style="display: none;"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="search-suggestions" id="search-suggestions" style="display: none;">
                        <!-- Search suggestions will be populated here -->
                    </div>
                </div>
                
                ${isMobile ? this._renderMobileFilterToggle() : ''}
                
                <div class="filters-container ${isMobile ? 'mobile-hidden' : ''}" id="filters-container">
                    <div class="filter-group">
                        <label class="filter-label" for="quantization-filter">Quantization</label>
                        <select id="quantization-filter" class="filter-select">
                            <option value="all">All Formats</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label" for="type-filter">Model Type</label>
                        <select id="type-filter" class="filter-select">
                            <option value="all">All Types</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label" for="license-filter">License</label>
                        <select id="license-filter" class="filter-select">
                            <option value="all">All Licenses</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label" for="size-filter">File Size</label>
                        <select id="size-filter" class="filter-select">
                            <option value="all">All Sizes</option>
                            <option value="small">< 1 GB</option>
                            <option value="medium">1 GB - 5 GB</option>
                            <option value="large">5 GB - 20 GB</option>
                            <option value="xlarge">> 20 GB</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label" for="downloads-filter">Popularity</label>
                        <select id="downloads-filter" class="filter-select">
                            <option value="all">All Models</option>
                            <option value="popular">Popular (>100K)</option>
                            <option value="trending">Trending (>1M)</option>
                            <option value="viral">Viral (>10M)</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label" for="likes-filter">Engagement (Likes)</label>
                        <div class="range-filter-container">
                            <div class="range-inputs">
                                <input 
                                    type="number" 
                                    id="likes-min" 
                                    class="range-input" 
                                    placeholder="Min"
                                    min="0"
                                    aria-label="Minimum like count"
                                    inputmode="numeric"
                                    style="font-size: 16px;"
                                >
                                <span class="range-separator">-</span>
                                <input 
                                    type="number" 
                                    id="likes-max" 
                                    class="range-input" 
                                    placeholder="Max"
                                    min="0"
                                    aria-label="Maximum like count"
                                    inputmode="numeric"
                                    style="font-size: 16px;"
                                >
                            </div>
                            <div class="range-slider-container">
                                <input 
                                    type="range" 
                                    id="likes-range-min" 
                                    class="range-slider range-slider-min" 
                                    min="0" 
                                    max="1000" 
                                    value="0"
                                    aria-label="Minimum like count slider"
                                    touch-action="pan-x"
                                >
                                <input 
                                    type="range" 
                                    id="likes-range-max" 
                                    class="range-slider range-slider-max" 
                                    min="0" 
                                    max="1000" 
                                    value="1000"
                                    aria-label="Maximum like count slider"
                                    touch-action="pan-x"
                                >
                            </div>
                            <div class="range-display">
                                <span id="likes-range-display">0 - 1000+ likes</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-actions">
                        <button id="clear-filters-btn" class="btn btn-secondary">
                            Clear Filters
                        </button>
                        <div class="filter-count" id="filter-count">
                            <!-- Filter count will be displayed here -->
                        </div>
                    </div>
                </div>
                
                ${isMobile ? this._renderMobileSwipeIndicator() : ''}
            </div>
        `;
        
        this.bindEvents();
        this._applyStyles();
        this._setupMobileInteractions();
    }

    /**
     * Render mobile filter toggle button
     * @private
     */
    _renderMobileFilterToggle() {
        return `
            <button id="mobile-filter-toggle" class="mobile-filter-toggle" aria-expanded="false">
                <span class="filter-toggle-text">Show Filters</span>
                <svg class="filter-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
        `;
    }

    /**
     * Render mobile swipe indicator for horizontal scrolling
     * @private
     */
    _renderMobileSwipeIndicator() {
        return `
            <div class="mobile-swipe-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                    <path d="M9 18l-6-6 6-6"/>
                </svg>
                Swipe to see more options
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                    <path d="M15 18l6-6-6-6"/>
                </svg>
            </div>
        `;
    }

    /**
     * Setup mobile-specific interactions
     * @private
     */
    _setupMobileInteractions() {
        const isMobile = window.innerWidth <= 767;
        
        if (isMobile) {
            this._setupMobileFilterToggle();
            this._setupTouchFeedback();
            this._preventZoomOnInputFocus();
        }

        // Setup responsive resize handler
        this._setupResponsiveHandler();
    }

    /**
     * Setup mobile filter toggle functionality
     * @private
     */
    _setupMobileFilterToggle() {
        const toggleBtn = document.getElementById('mobile-filter-toggle');
        const filtersContainer = document.getElementById('filters-container');
        
        if (toggleBtn && filtersContainer) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                const newState = !isExpanded;
                
                toggleBtn.setAttribute('aria-expanded', newState.toString());
                
                if (newState) {
                    filtersContainer.classList.remove('mobile-hidden');
                    filtersContainer.classList.add('mobile-visible');
                    toggleBtn.querySelector('.filter-toggle-text').textContent = 'Hide Filters';
                    toggleBtn.querySelector('.filter-toggle-icon').style.transform = 'rotate(180deg)';
                } else {
                    filtersContainer.classList.remove('mobile-visible');
                    filtersContainer.classList.add('mobile-hidden');
                    toggleBtn.querySelector('.filter-toggle-text').textContent = 'Show Filters';
                    toggleBtn.querySelector('.filter-toggle-icon').style.transform = 'rotate(0deg)';
                }
            });
        }
    }

    /**
     * Setup touch feedback for interactive elements
     * @private
     */
    _setupTouchFeedback() {
        const interactiveElements = this.container.querySelectorAll('button, select, input');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                element.classList.add('touch-active');
            }, { passive: true });
            
            element.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            }, { passive: true });
        });
    }

    /**
     * Prevent zoom on input focus for iOS devices
     * @private
     */
    _preventZoomOnInputFocus() {
        const inputs = this.container.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            // Ensure font-size is at least 16px to prevent zoom on iOS
            const computedStyle = window.getComputedStyle(input);
            const fontSize = parseFloat(computedStyle.fontSize);
            
            if (fontSize < 16) {
                input.style.fontSize = '16px';
            }
        });
    }

    /**
     * Setup responsive handler for layout changes
     * @private
     */
    _setupResponsiveHandler() {
        const handleResize = Helpers.debounce(() => {
            const wasMobile = this.container.querySelector('.mobile-filter-toggle') !== null;
            const isMobile = window.innerWidth <= 767;
            
            if (wasMobile !== isMobile) {
                // Re-render if mobile state changed
                this.render();
            }
        }, 250);
        
        window.addEventListener('resize', handleResize);
        
        // Store reference for cleanup
        this._resizeHandler = handleResize;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search input events
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
                this.updateClearSearchButton(e.target.value);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Filter select events
        const filterSelects = this.container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilterChange(e.target.id, e.target.value);
            });
        });

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Engagement filter controls
        this.bindEngagementFilterEvents();
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.appState.setSearchQuery(query.trim());
    }

    /**
     * Handle filter changes
     * @param {string} filterId - Filter element ID
     * @param {string} value - Selected value
     */
    handleFilterChange(filterId, value) {
        const filterUpdates = {};

        switch (filterId) {
            case 'quantization-filter':
                filterUpdates.quantFormat = value;
                break;
            case 'type-filter':
                filterUpdates.modelType = value;
                break;
            case 'license-filter':
                filterUpdates.license = value;
                break;
            case 'size-filter':
                this.handleSizeFilter(value, filterUpdates);
                break;
            case 'downloads-filter':
                this.handleDownloadsFilter(value, filterUpdates);
                break;
        }

        if (Object.keys(filterUpdates).length > 0) {
            this.appState.updateFilters(filterUpdates);
        }
    }

    /**
     * Handle file size filter
     * @param {string} value - Size filter value
     * @param {object} filterUpdates - Filter updates object
     */
    handleSizeFilter(value, filterUpdates) {
        const GB = 1024 * 1024 * 1024;
        
        switch (value) {
            case 'small':
                filterUpdates.fileSizeMin = 0;
                filterUpdates.fileSizeMax = GB;
                break;
            case 'medium':
                filterUpdates.fileSizeMin = GB;
                filterUpdates.fileSizeMax = 5 * GB;
                break;
            case 'large':
                filterUpdates.fileSizeMin = 5 * GB;
                filterUpdates.fileSizeMax = 20 * GB;
                break;
            case 'xlarge':
                filterUpdates.fileSizeMin = 20 * GB;
                filterUpdates.fileSizeMax = Infinity;
                break;
            default:
                filterUpdates.fileSizeMin = 0;
                filterUpdates.fileSizeMax = Infinity;
        }
    }

    /**
     * Handle downloads filter
     * @param {string} value - Downloads filter value
     * @param {object} filterUpdates - Filter updates object
     */
    handleDownloadsFilter(value, filterUpdates) {
        switch (value) {
            case 'popular':
                filterUpdates.downloadCountMin = 100000;
                filterUpdates.downloadCountMax = Infinity;
                break;
            case 'trending':
                filterUpdates.downloadCountMin = 1000000;
                filterUpdates.downloadCountMax = Infinity;
                break;
            case 'viral':
                filterUpdates.downloadCountMin = 10000000;
                filterUpdates.downloadCountMax = Infinity;
                break;
            default:
                filterUpdates.downloadCountMin = 0;
                filterUpdates.downloadCountMax = Infinity;
        }
    }

    /**
     * Bind engagement filter events
     */
    bindEngagementFilterEvents() {
        const likesMin = document.getElementById('likes-min');
        const likesMax = document.getElementById('likes-max');
        const likesRangeMin = document.getElementById('likes-range-min');
        const likesRangeMax = document.getElementById('likes-range-max');

        if (likesMin && likesMax && likesRangeMin && likesRangeMax) {
            // Initialize range values based on data
            this.initializeEngagementRange();

            // Number input events
            likesMin.addEventListener('input', (e) => {
                this.handleEngagementRangeChange('min', parseInt(e.target.value) || 0);
            });

            likesMax.addEventListener('input', (e) => {
                this.handleEngagementRangeChange('max', parseInt(e.target.value) || Infinity);
            });

            // Range slider events
            likesRangeMin.addEventListener('input', (e) => {
                this.handleEngagementRangeChange('min', parseInt(e.target.value));
            });

            likesRangeMax.addEventListener('input', (e) => {
                this.handleEngagementRangeChange('max', parseInt(e.target.value));
            });

            // Sync sliders to prevent overlap
            this.syncEngagementSliders();
        }
    }

    /**
     * Initialize engagement range based on available data
     */
    initializeEngagementRange() {
        const { allModels } = this.appState.getState();
        
        if (allModels.length > 0) {
            const likeCounts = allModels.map(model => model.likeCount || 0);
            const maxLikes = Math.max(...likeCounts);
            const rangeMax = Math.min(maxLikes, 1000); // Cap at 1000 for UI purposes
            
            // Update slider max values
            const likesRangeMin = document.getElementById('likes-range-min');
            const likesRangeMax = document.getElementById('likes-range-max');
            
            if (likesRangeMin && likesRangeMax) {
                likesRangeMin.max = rangeMax;
                likesRangeMax.max = rangeMax;
                likesRangeMax.value = rangeMax;
                
                this.updateEngagementDisplay(0, rangeMax);
            }
        }
    }

    /**
     * Handle engagement range changes
     * @param {string} type - 'min' or 'max'
     * @param {number} value - New value
     */
    handleEngagementRangeChange(type, value) {
        const likesMin = document.getElementById('likes-min');
        const likesMax = document.getElementById('likes-max');
        const likesRangeMin = document.getElementById('likes-range-min');
        const likesRangeMax = document.getElementById('likes-range-max');

        let minValue = parseInt(likesMin.value) || 0;
        let maxValue = parseInt(likesMax.value) || parseInt(likesRangeMax.max);

        if (type === 'min') {
            minValue = value;
            // Ensure min doesn't exceed max
            if (minValue > maxValue) {
                maxValue = minValue;
            }
        } else {
            maxValue = value;
            // Ensure max isn't less than min
            if (maxValue < minValue) {
                minValue = maxValue;
            }
        }

        // Update all controls
        likesMin.value = minValue;
        likesMax.value = maxValue === parseInt(likesRangeMax.max) ? '' : maxValue;
        likesRangeMin.value = minValue;
        likesRangeMax.value = maxValue;

        // Update display
        this.updateEngagementDisplay(minValue, maxValue);

        // Update filters
        this.appState.updateFilters({
            likeCountMin: minValue,
            likeCountMax: maxValue === parseInt(likesRangeMax.max) ? Infinity : maxValue
        });
    }

    /**
     * Update engagement range display
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     */
    updateEngagementDisplay(min, max) {
        const display = document.getElementById('likes-range-display');
        if (display) {
            const maxDisplay = max === parseInt(document.getElementById('likes-range-max').max) ? 
                `${max}+` : max.toString();
            display.textContent = `${min} - ${maxDisplay} likes`;
        }
    }

    /**
     * Sync engagement sliders to prevent overlap
     */
    syncEngagementSliders() {
        const likesRangeMin = document.getElementById('likes-range-min');
        const likesRangeMax = document.getElementById('likes-range-max');

        if (likesRangeMin && likesRangeMax) {
            const updateSliderStyles = () => {
                const min = parseInt(likesRangeMin.value);
                const max = parseInt(likesRangeMax.value);
                const rangeMax = parseInt(likesRangeMax.max);
                
                const minPercent = (min / rangeMax) * 100;
                const maxPercent = (max / rangeMax) * 100;
                
                // Update slider track styling
                const container = likesRangeMin.parentElement;
                container.style.setProperty('--range-min', `${minPercent}%`);
                container.style.setProperty('--range-max', `${maxPercent}%`);
            };

            likesRangeMin.addEventListener('input', updateSliderStyles);
            likesRangeMax.addEventListener('input', updateSliderStyles);
            
            // Initial styling
            updateSliderStyles();
        }
    }

    /**
     * Update filter options based on available models
     * @param {Array} models - Array of model objects
     */
    updateFilterOptions(models) {
        // Get unique values for each filter
        this.filterOptions.quantFormats = Helpers.getUniqueValues(models, 'quantFormat')
            .filter(format => format && format !== 'Unknown');
        this.filterOptions.modelTypes = Helpers.getUniqueValues(models, 'modelType')
            .filter(type => type && type !== 'Unknown');
        this.filterOptions.licenses = Helpers.getUniqueValues(models, 'license')
            .filter(license => license && license !== 'Not specified');

        // Update select options
        this.updateSelectOptions('quantization-filter', this.filterOptions.quantFormats);
        this.updateSelectOptions('type-filter', this.filterOptions.modelTypes);
        this.updateSelectOptions('license-filter', this.filterOptions.licenses);
    }

    /**
     * Update options for a select element
     * @param {string} selectId - Select element ID
     * @param {Array} options - Array of option values
     */
    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep the "All" option and add new options
        const allOption = select.querySelector('option[value="all"]');
        select.innerHTML = '';
        
        if (allOption) {
            select.appendChild(allOption);
        }

        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    /**
     * Clear search input
     */
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            this.handleSearch('');
            this.updateClearSearchButton('');
            searchInput.focus();
        }
    }

    /**
     * Clear all filters and search
     */
    clearAllFilters() {
        // Clear search
        this.clearSearch();
        
        // Reset all filter selects
        const filterSelects = this.container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.value = 'all';
        });

        // Reset engagement filter controls
        this.resetEngagementFilters();
        
        // Clear filters in state
        this.appState.clearFilters();
    }

    /**
     * Reset engagement filter controls to default values
     */
    resetEngagementFilters() {
        const likesMin = document.getElementById('likes-min');
        const likesMax = document.getElementById('likes-max');
        const likesRangeMin = document.getElementById('likes-range-min');
        const likesRangeMax = document.getElementById('likes-range-max');

        if (likesMin && likesMax && likesRangeMin && likesRangeMax) {
            const maxValue = parseInt(likesRangeMax.max);
            
            likesMin.value = '';
            likesMax.value = '';
            likesRangeMin.value = 0;
            likesRangeMax.value = maxValue;
            
            this.updateEngagementDisplay(0, maxValue);
        }
    }

    /**
     * Update clear search button visibility
     * @param {string} value - Current search value
     */
    updateClearSearchButton(value) {
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) {
            clearBtn.style.display = value.trim() ? 'flex' : 'none';
        }
    }

    /**
     * Apply component styles
     * @private
     */
    _applyStyles() {
        if (!document.getElementById('search-filter-styles')) {
            const style = document.createElement('style');
            style.id = 'search-filter-styles';
            style.textContent = `
                .search-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    color: var(--text-secondary);
                    z-index: 1;
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 3rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    font-size: 1rem;
                    transition: var(--transition);
                    background: var(--card-background);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .clear-search-btn {
                    position: absolute;
                    right: 0.75rem;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: var(--transition);
                }

                .clear-search-btn:hover {
                    color: var(--text-primary);
                    background: var(--background-color);
                }

                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--card-background);
                    border: 1px solid var(--border-color);
                    border-top: none;
                    border-radius: 0 0 var(--border-radius) var(--border-radius);
                    box-shadow: var(--shadow-md);
                    z-index: 10;
                    max-height: 200px;
                    overflow-y: auto;
                }

                .filter-actions {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .filter-count {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                @media (max-width: 768px) {
                    .filters-container {
                        grid-template-columns: 1fr;
                    }
                    
                    .filter-actions {
                        flex-direction: column;
                        align-items: stretch;
                    }
                }

                /* Engagement range filter styles */
                .range-filter-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .range-inputs {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .range-input {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    font-size: 0.875rem;
                    text-align: center;
                }

                .range-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .range-separator {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .range-slider-container {
                    position: relative;
                    height: 20px;
                    margin: 0.5rem 0;
                }

                .range-slider {
                    position: absolute;
                    width: 100%;
                    height: 4px;
                    background: transparent;
                    outline: none;
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: none;
                }

                .range-slider::-webkit-slider-track {
                    height: 4px;
                    background: var(--border-color);
                    border-radius: 2px;
                }

                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    pointer-events: all;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .range-slider::-moz-range-track {
                    height: 4px;
                    background: var(--border-color);
                    border-radius: 2px;
                    border: none;
                }

                .range-slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    pointer-events: all;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .range-slider-container::before {
                    content: '';
                    position: absolute;
                    top: 8px;
                    left: var(--range-min, 0%);
                    right: calc(100% - var(--range-max, 100%));
                    height: 4px;
                    background: var(--primary-color);
                    border-radius: 2px;
                    z-index: 1;
                }

                .range-display {
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                @media (max-width: 480px) {
                    .search-input {
                        padding-left: 2.5rem;
                        font-size: 0.875rem;
                    }
                    
                    .search-icon {
                        left: 0.75rem;
                    }

                    .range-inputs {
                        flex-direction: column;
                        gap: 0.25rem;
                    }

                    .range-input {
                        width: 100%;
                    }

                    .range-separator {
                        display: none;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.subscriptionId) {
            this.appState.unsubscribe(this.subscriptionId);
        }
        
        // Clean up resize handler
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
window.SearchFilter = SearchFilter;