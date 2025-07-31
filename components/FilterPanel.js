import { debounceSearch } from '../utils/debounce.js';
import { accessibilityChecker } from '../services/AccessibilityComplianceChecker.js';

/**
 * FilterPanel component for collapsible filter menu
 * Provides checkbox groups for quantization, architecture, family filters and size ranges
 */
export class FilterPanel {
  constructor(onFiltersChange) {
    this.element = null;
    this.onFiltersChange = onFiltersChange || (() => {});
    this.isOpen = false;
    this.filters = {
      quantization: [],
      architecture: [],
      family: [],
      sizeRange: null,
      searchQuery: ''
    };
    this.availableOptions = {
      quantization: [],
      architecture: [],
      family: []
    };
    
    // Debounced search functionality
    this.debouncedSearch = debounceSearch((query) => {
      this.filters.searchQuery = query;
      this.onFiltersChange(this.filters);
    }, 300);
    
    // Bind methods
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
    this.handleSizeRangeChange = this.handleSizeRangeChange.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.handleClearAll = this.handleClearAll.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    // Touch gesture properties
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.isSwiping = false;
  }

  /**
   * Create and return the filter panel DOM element
   * @returns {HTMLElement} The panel element
   */
  render() {
    this.element = document.createElement('div');
    this.element.className = `
      fixed top-4 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] 
      sm:w-80 sm:max-w-[calc(100vw-2rem)]
      max-sm:fixed max-sm:inset-x-4 max-sm:top-4 max-sm:w-auto max-sm:max-w-none
      bg-white rounded-lg shadow-xl border border-gray-200
      transform transition-all duration-300 ease-in-out
      touch-manipulation filter-panel
      ${this.isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
      max-sm:${this.isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
    `.replace(/\s+/g, ' ').trim();
    
    // Add accessibility attributes
    this.element.setAttribute('id', 'filter-panel');
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-labelledby', 'filter-panel-title');
    this.element.setAttribute('aria-modal', 'false');
    this.element.setAttribute('data-keyboard-navigation', 'true');
    
    // Add data attribute to help accessibility checker identify this as a dialog
    this.element.setAttribute('data-dialog-type', 'filter-panel');
    
    this.element.innerHTML = `
      <div class="p-4 sm:p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4 sm:mb-6">
          <h3 id="filter-panel-title" class="text-base sm:text-lg font-semibold text-gray-900" data-dialog-title="true">Filter Models</h3>
          <div class="flex items-center gap-2">
            <button 
              id="clear-all-btn" 
              class="touch-target text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium transition-colors px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label="Clear all filters"
            >
              Clear All
            </button>
            <!-- Close button for mobile -->
            <button 
              id="close-panel-btn" 
              class="touch-target sm:hidden p-1 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label="Close filter panel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div class="mb-4 sm:mb-6">
          <label for="search-input" class="block text-sm font-medium text-gray-700 mb-2">Search Models</label>
          <div id="search-help" class="sr-only">Type to search models by name, architecture, or family</div>
          <div class="relative">
            <input
              type="text"
              id="search-input"
              placeholder="Search by name, architecture, or family..."
              class="w-full px-3 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              role="searchbox"
              aria-describedby="search-help"
              autocomplete="off"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Filter Groups -->
        <div class="space-y-4 sm:space-y-6 max-h-[60vh] sm:max-h-none overflow-y-auto" role="group" aria-label="Filter options">
          <!-- Size Range Filter -->
          <fieldset class="filter-group">
            <legend class="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Model Size</legend>
            <div class="space-y-1 sm:space-y-2" id="size-range-group" role="radiogroup" aria-labelledby="size-range-legend" data-keyboard-navigation="true">
              ${this._renderSizeRangeOptions()}
            </div>
          </fieldset>

          <!-- Quantization Filter -->
          <fieldset class="filter-group">
            <legend class="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quantization</legend>
            <div class="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto" id="quantization-group" role="group" aria-labelledby="quantization-legend" data-keyboard-navigation="true">
              ${this._renderCheckboxGroup('quantization')}
            </div>
          </fieldset>

          <!-- Architecture Filter -->
          <fieldset class="filter-group">
            <legend class="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Architecture</legend>
            <div class="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto" id="architecture-group" role="group" aria-labelledby="architecture-legend" data-keyboard-navigation="true">
              ${this._renderCheckboxGroup('architecture')}
            </div>
          </fieldset>

          <!-- Family Filter -->
          <fieldset class="filter-group">
            <legend class="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Model Family</legend>
            <div class="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto" id="family-group" role="group" aria-labelledby="family-legend" data-keyboard-navigation="true">
              ${this._renderCheckboxGroup('family')}
            </div>
          </fieldset>
        </div>

        <!-- Filter Summary -->
        <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
          <div class="text-xs sm:text-sm text-gray-600" id="filter-summary">
            ${this._renderFilterSummary()}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this._attachEventListeners();
    
    // Add keyboard navigation
    this._setupKeyboardNavigation();
    
    // Validate and fix accessibility issues
    this._validateAccessibility();
    
    return this.element;
  }

  /**
   * Render size range options
   * @returns {string} HTML string for size range options
   * @private
   */
  _renderSizeRangeOptions() {
    const sizeRanges = [
      { value: 'small', label: '< 1GB', icon: '💎' },
      { value: 'medium', label: '1GB - 4GB', icon: '📦' },
      { value: 'large', label: '4GB - 8GB', icon: '📚' },
      { value: 'xlarge', label: '8GB - 16GB', icon: '🗃️' },
      { value: 'xxlarge', label: '> 16GB', icon: '🏗️' }
    ];

    return sizeRanges.map(range => `
      <label class="touch-target flex items-center space-x-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 p-2 sm:p-2 rounded-md transition-colors filter-option">
        <input 
          type="radio" 
          name="sizeRange" 
          value="${range.value}"
          class="w-4 h-4 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
          ${this.filters.sizeRange === range.value ? 'checked' : ''}
          aria-describedby="size-${range.value}-desc"
        >
        <span class="text-base sm:text-lg flex-shrink-0" aria-hidden="true">${range.icon}</span>
        <span class="text-sm sm:text-sm text-gray-700 flex-1" id="size-${range.value}-desc">${range.label}</span>
      </label>
    `).join('');
  }

  /**
   * Render checkbox group for a filter type
   * @param {string} filterType - The type of filter (quantization, architecture, family)
   * @returns {string} HTML string for checkbox group
   * @private
   */
  _renderCheckboxGroup(filterType) {
    const options = this.availableOptions[filterType] || [];
    
    if (options.length === 0) {
      return '<p class="text-sm text-gray-500 italic">No options available</p>';
    }

    return options.map(option => `
      <label class="touch-target flex items-center space-x-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 p-2 sm:p-2 rounded-md transition-colors filter-option">
        <input 
          type="checkbox" 
          value="${this._escapeAttribute(option)}"
          data-filter-type="${filterType}"
          class="w-4 h-4 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
          ${this.filters[filterType].includes(option) ? 'checked' : ''}
          aria-describedby="${filterType}-${this._escapeAttribute(option)}-desc"
        >
        <span class="text-sm sm:text-sm text-gray-700 flex-1 truncate" id="${filterType}-${this._escapeAttribute(option)}-desc">${this._escapeHtml(option)}</span>
        <span class="text-xs text-gray-500 flex-shrink-0" data-count="${this._escapeAttribute(option)}" aria-label="Available models">0</span>
      </label>
    `).join('');
  }

  /**
   * Render filter summary
   * @returns {string} HTML string for filter summary
   * @private
   */
  _renderFilterSummary() {
    const activeFilters = [];
    
    if (this.filters.sizeRange) {
      activeFilters.push(`Size: ${this.filters.sizeRange}`);
    }
    
    if (this.filters.quantization.length > 0) {
      activeFilters.push(`Quantization: ${this.filters.quantization.length}`);
    }
    
    if (this.filters.architecture.length > 0) {
      activeFilters.push(`Architecture: ${this.filters.architecture.length}`);
    }
    
    if (this.filters.family.length > 0) {
      activeFilters.push(`Family: ${this.filters.family.length}`);
    }

    if (activeFilters.length === 0) {
      return 'No filters applied';
    }

    return `Active filters: ${activeFilters.join(', ')}`;
  }

  /**
   * Attach event listeners to the panel
   * @private
   */
  _attachEventListeners() {
    if (!this.element) return;

    // Clear all button
    const clearAllBtn = this.element.querySelector('#clear-all-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', this.handleClearAll);
    }

    // Close button (mobile)
    const closePanelBtn = this.element.querySelector('#close-panel-btn');
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => this.close());
    }

    // Search input listener
    const searchInput = this.element.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearchInput);
      searchInput.value = this.filters.searchQuery || '';
    }

    // Checkbox change events
    const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleCheckboxChange);
    });

    // Size range change events
    const sizeRadios = this.element.querySelectorAll('input[name="sizeRange"]');
    sizeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleSizeRangeChange);
    });

    // Touch gesture support for mobile
    if (this.element) {
      this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }

    // Click outside to close (when open)
    if (this.isOpen) {
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside);
      }, 100);
    }
  }

  /**
   * Validate and fix accessibility issues
   * @private
   */
  _validateAccessibility() {
    if (!this.element) return;

    try {
      // Use AccessibilityComplianceChecker to validate the dialog
      const results = accessibilityChecker.validateDialogAccessibility(this.element);
      
      // Log results for debugging (can be removed in production)
      if (results.appliedFixes.length > 0) {
        console.log('FilterPanel accessibility fixes applied:', results.appliedFixes);
      }
      
      if (results.warnings.length > 0) {
        console.warn('FilterPanel accessibility warnings:', results.warnings);
      }
      
      if (results.errors.length > 0) {
        console.error('FilterPanel accessibility errors:', results.errors);
      }
    } catch (error) {
      console.error('Failed to validate FilterPanel accessibility:', error);
    }
  }

  /**
   * Set up keyboard navigation for the filter panel
   * @private
   */
  _setupKeyboardNavigation() {
    if (!this.element) return;

    // Add keydown listener to the panel
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Set up custom event listeners for keyboard shortcuts
    document.addEventListener('closeFilterPanel', () => this.close());
  }

  /**
   * Handle keyboard events for the filter panel
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        // Focus the filter button after closing
        setTimeout(() => {
          const filterButton = document.querySelector('button[aria-controls="filter-panel"]');
          if (filterButton) {
            filterButton.focus();
          }
        }, 100);
        break;
      
      case 'Tab':
        // Handle focus trap when panel is open
        if (this.isOpen) {
          this._handleFocusTrap(event);
        }
        break;
        
      case 'Enter':
      case ' ':
        // Handle activation for filter options
        if (event.target.classList.contains('filter-option')) {
          const input = event.target.querySelector('input');
          if (input) {
            event.preventDefault();
            input.click();
          }
        }
        break;
    }
  }

  /**
   * Handle focus trap within the filter panel
   * @param {KeyboardEvent} event - Tab key event
   * @private
   */
  _handleFocusTrap(event) {
    const focusableElements = this._getFocusableElements();
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab - moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab - moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Get all focusable elements within the filter panel
   * @returns {Element[]} Array of focusable elements
   * @private
   */
  _getFocusableElements() {
    if (!this.element) return [];

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(this.element.querySelectorAll(selector))
      .filter(el => this._isElementVisible(el));
  }

  /**
   * Check if element is visible
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is visible
   * @private
   */
  _isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  }

  /**
   * Handle checkbox change events
   * @param {Event} event - Change event
   * @private
   */
  handleCheckboxChange(event) {
    const checkbox = event.target;
    const filterType = checkbox.getAttribute('data-filter-type');
    const value = checkbox.value;

    if (checkbox.checked) {
      if (!this.filters[filterType].includes(value)) {
        this.filters[filterType].push(value);
      }
    } else {
      this.filters[filterType] = this.filters[filterType].filter(item => item !== value);
    }

    this._updateFilterSummary();
    this.onFiltersChange(this.filters);
  }

  /**
   * Handle size range change events
   * @param {Event} event - Change event
   * @private
   */
  handleSizeRangeChange(event) {
    const radio = event.target;
    this.filters.sizeRange = radio.checked ? radio.value : null;

    this._updateFilterSummary();
    this.onFiltersChange(this.filters);
  }

  /**
   * Handle search input with debouncing
   * @param {Event} event - Input event
   * @private
   */
  handleSearchInput(event) {
    const query = event.target.value;
    this.debouncedSearch(query);
  }

  /**
   * Handle clear all filters
   * @private
   */
  handleClearAll() {
    this.filters = {
      quantization: [],
      architecture: [],
      family: [],
      sizeRange: null,
      searchQuery: ''
    };

    // Update UI
    if (this.element) {
      const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
      });

      const radios = this.element.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.checked = false;
      });

      const searchInput = this.element.querySelector('#search-input');
      if (searchInput) {
        searchInput.value = '';
      }
    }

    this._updateFilterSummary();
    this.onFiltersChange(this.filters);
  }

  /**
   * Handle click outside to close panel
   * @param {Event} event - Click event
   * @private
   */
  handleClickOutside(event) {
    if (this.element && !this.element.contains(event.target)) {
      this.close();
    }
  }

  /**
   * Handle touch start for swipe gestures
   * @param {TouchEvent} event - Touch event
   * @private
   */
  handleTouchStart(event) {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    this.isSwiping = false;
  }

  /**
   * Handle touch move for swipe gestures
   * @param {TouchEvent} event - Touch event
   * @private
   */
  handleTouchMove(event) {
    if (event.touches.length !== 1 || !this.isOpen) return;
    
    const touch = event.touches[0];
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    
    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;
    
    // Check if this is a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.isSwiping = true;
      
      // For mobile, swipe right to close (panel slides from right)
      if (deltaX > 0 && window.innerWidth <= 640) {
        // Prevent default scrolling during swipe
        event.preventDefault();
        
        // Apply transform to show swipe progress
        const progress = Math.min(deltaX / 100, 1);
        if (this.element) {
          this.element.style.transform = `translateX(${deltaX * 0.5}px)`;
          this.element.style.opacity = `${1 - progress * 0.3}`;
        }
      }
    }
  }

  /**
   * Handle touch end for swipe gestures
   * @param {TouchEvent} event - Touch event
   * @private
   */
  handleTouchEnd(event) {
    if (!this.isSwiping || !this.isOpen) {
      // Reset transform if no swipe occurred
      if (this.element) {
        this.element.style.transform = '';
        this.element.style.opacity = '';
      }
      return;
    }
    
    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;
    
    // Reset transform
    if (this.element) {
      this.element.style.transform = '';
      this.element.style.opacity = '';
    }
    
    // Check if swipe threshold was met
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50 && window.innerWidth <= 640) {
      // Swipe right to close on mobile
      this.close();
    }
    
    this.isSwiping = false;
  }

  /**
   * Update filter summary display
   * @private
   */
  _updateFilterSummary() {
    if (!this.element) return;

    const summaryElement = this.element.querySelector('#filter-summary');
    if (summaryElement) {
      summaryElement.innerHTML = this._renderFilterSummary();
    }
  }

  /**
   * Set available filter options
   * @param {Object} options - Available options for each filter type
   */
  setAvailableOptions(options) {
    this.availableOptions = {
      quantization: options.quantization || [],
      architecture: options.architecture || [],
      family: options.family || []
    };

    // Re-render if element exists
    if (this.element) {
      this._updateFilterGroups();
    }
  }

  /**
   * Update filter groups with new options
   * @private
   */
  _updateFilterGroups() {
    if (!this.element) return;

    const quantizationGroup = this.element.querySelector('#quantization-group');
    if (quantizationGroup) {
      quantizationGroup.innerHTML = this._renderCheckboxGroup('quantization');
    }

    const architectureGroup = this.element.querySelector('#architecture-group');
    if (architectureGroup) {
      architectureGroup.innerHTML = this._renderCheckboxGroup('architecture');
    }

    const familyGroup = this.element.querySelector('#family-group');
    if (familyGroup) {
      familyGroup.innerHTML = this._renderCheckboxGroup('family');
    }

    // Re-attach event listeners for new elements
    this._attachEventListeners();
  }

  /**
   * Update option counts
   * @param {Object} counts - Count for each option
   */
  updateOptionCounts(counts) {
    if (!this.element) return;

    Object.keys(counts).forEach(option => {
      const countElement = this.element.querySelector(`[data-count="${option}"]`);
      if (countElement) {
        countElement.textContent = counts[option].toLocaleString();
      }
    });
  }

  /**
   * Open the filter panel
   */
  open() {
    this.isOpen = true;
    if (this.element) {
      // Handle mobile vs desktop animations
      if (window.innerWidth <= 640) {
        // Mobile: slide down from top
        this.element.className = this.element.className.replace(
          '-translate-y-full opacity-0 pointer-events-none',
          'translate-y-0 opacity-100'
        );
      } else {
        // Desktop: slide in from right
        this.element.className = this.element.className.replace(
          'translate-x-full opacity-0 pointer-events-none',
          'translate-x-0 opacity-100'
        );
      }
      
      // Update aria-modal
      this.element.setAttribute('aria-modal', 'true');
      
      // Focus the first focusable element
      setTimeout(() => {
        const focusableElements = this._getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 100);
      
      // Add click outside listener
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside);
      }, 100);
    }
  }

  /**
   * Close the filter panel
   */
  close() {
    this.isOpen = false;
    if (this.element) {
      // Handle mobile vs desktop animations
      if (window.innerWidth <= 640) {
        // Mobile: slide up to top
        this.element.className = this.element.className.replace(
          'translate-y-0 opacity-100',
          '-translate-y-full opacity-0 pointer-events-none'
        );
      } else {
        // Desktop: slide out to right
        this.element.className = this.element.className.replace(
          'translate-x-0 opacity-100',
          'translate-x-full opacity-0 pointer-events-none'
        );
      }
      
      // Update aria-modal
      this.element.setAttribute('aria-modal', 'false');
      
      // Remove click outside listener
      document.removeEventListener('click', this.handleClickOutside);
    }
  }

  /**
   * Toggle the filter panel
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Get current filter state
   * @returns {Object} Current filters
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Set filter state
   * @param {Object} filters - Filter state to set
   */
  setFilters(filters) {
    this.filters = {
      quantization: filters.quantization || [],
      architecture: filters.architecture || [],
      family: filters.family || [],
      sizeRange: filters.sizeRange || null
    };

    // Update UI if element exists
    if (this.element) {
      this._updateUIFromFilters();
      this._updateFilterSummary();
    }
  }

  /**
   * Update UI elements based on current filter state
   * @private
   */
  _updateUIFromFilters() {
    if (!this.element) return;

    // Update checkboxes
    const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const filterType = checkbox.getAttribute('data-filter-type');
      const value = checkbox.value;
      checkbox.checked = this.filters[filterType].includes(value);
    });

    // Update radio buttons
    const radios = this.element.querySelectorAll('input[name="sizeRange"]');
    radios.forEach(radio => {
      radio.checked = radio.value === this.filters.sizeRange;
    });
  }

  /**
   * Get open state
   * @returns {boolean} Whether panel is open
   */
  getIsOpen() {
    return this.isOpen;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape HTML attributes to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeAttribute(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Destroy the component and clean up event listeners
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('click', this.handleClickOutside);
    
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
    }
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.element = null;
    this.onFiltersChange = null;
  }
}