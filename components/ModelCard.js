/**
 * ModelCard Component - Responsive model card with lazy loading and accessibility
 * 
 * This component creates responsive model cards with download links, metadata,
 * lazy loading for performance, hover states, and accessibility features.
 * 
 * Task 4.3: Build responsive model card components
 * Requirements: 1.3, 1.4
 */

/**
 * ModelCard class for creating responsive model cards
 * Requirements: 1.3, 1.4
 */
export class ModelCard {
  constructor(model, options = {}) {
    this.model = model;
    this.options = {
      lazyLoad: typeof window !== 'undefined' && 'IntersectionObserver' in window,
      showSearchHighlight: false,
      searchQuery: '',
      searchResult: null,
      ...options
    };

    this.element = null;
    this.isVisible = false;
    this.observer = null;
  }

  /**
   * Create the model card element
   * @returns {HTMLElement} Model card element
   */
  createElement() {
    const card = document.createElement('article');
    card.className = 'model-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 relative group';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Model: ${this.model.modelName || 'Unknown Model'}`);
    card.setAttribute('tabindex', '0');

    // Add data attributes for filtering and searching using workflow fields
    card.setAttribute('data-model-name', this.model.modelName || '');
    card.setAttribute('data-model-type', this.model.modelType || '');
    card.setAttribute('data-quant-format', this.model.quantFormat || '');
    card.setAttribute('data-downloads', this.model.downloadCount || 0);

    if (this.options.lazyLoad) {
      card.classList.add('lazy-load');
      this.setupLazyLoading(card);
    } else {
      this.renderCardContent(card);
    }

    this.element = card;
    return card;
  }

  /**
   * Set up lazy loading for the card
   * @param {HTMLElement} card - Card element
   */
  setupLazyLoading(card) {
    // Create placeholder content
    card.innerHTML = this.createPlaceholderContent();

    // Set up intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isVisible) {
            this.isVisible = true;
            this.renderCardContent(card);
            this.observer.unobserve(card);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.1
      });

      this.observer.observe(card);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.renderCardContent(card);
    }
  }

  /**
   * Create placeholder content for lazy loading
   * @returns {string} Placeholder HTML
   */
  createPlaceholderContent() {
    return `
      <div class="animate-pulse">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div class="flex-shrink-0 ml-4">
            <div class="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex items-center space-x-4">
            <div class="h-4 bg-gray-200 rounded w-20"></div>
            <div class="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div class="mb-4">
          <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div class="space-y-1">
            <div class="h-8 bg-gray-200 rounded"></div>
            <div class="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="h-4 bg-gray-200 rounded w-16"></div>
          <div class="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render the actual card content
   * @param {HTMLElement} card - Card element
   */
  renderCardContent(card) {
    // Use workflow fields directly
    const modelName = this.model.modelName || 'Unknown Model';
    const modelType = this.model.modelType || 'Unknown';
    const quantFormat = this.model.quantFormat || 'Unknown';
    const fileSizeFormatted = this.model.fileSizeFormatted || 'Unknown size';
    const downloadCount = this.model.downloadCount ? this.formatNumber(this.model.downloadCount) : 'N/A';
    const huggingFaceLink = this.model.huggingFaceLink || '#';
    const directDownloadLink = this.model.directDownloadLink || '#';

    // Apply search highlighting if enabled
    const highlightedModelName = this.options.showSearchHighlight ?
      this.highlightSearchTerms(modelName, this.options.searchQuery) : modelName;
    const highlightedModelType = this.options.showSearchHighlight ?
      this.highlightSearchTerms(modelType, this.options.searchQuery) : modelType;
    const highlightedQuantFormat = this.options.showSearchHighlight ?
      this.highlightSearchTerms(quantFormat, this.options.searchQuery) : quantFormat;

    // Add search score indicator if available
    const searchScoreIndicator = this.options.searchResult && this.options.searchResult.score > 1 ?
      `<div class="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        Match: ${Math.round(this.options.searchResult.score * 10) / 10}
      </div>` : '';

    card.innerHTML = `
      ${searchScoreIndicator}
      
      <!-- Header Section -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            <a href="${huggingFaceLink}" 
               target="_blank"
               rel="noopener noreferrer"
               class="hover:text-blue-600 focus:text-blue-600 focus:outline-none focus:underline"
               title="View ${modelName} on Hugging Face">
              ${highlightedModelName}
            </a>
          </h3>
        </div>
        <div class="flex-shrink-0 ml-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ${highlightedModelType}
          </span>
        </div>
      </div>

      <!-- Metadata Section -->
      <div class="mb-4">
        <div class="flex items-center text-sm text-gray-600 space-x-4 flex-wrap gap-y-1">
          <div class="flex items-center" title="Download count">
            <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
            <span>${downloadCount} downloads</span>
          </div>
          <div class="flex items-center" title="Quantization format">
            <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m6 0V7a2 2 0 012 2v4M9 6.306V7a2 2 0 00-2-2H7a2 2 0 00-2 2v4.01M15 6.306V7a2 2 0 012 2v4.01"></path>
            </svg>
            <span>${highlightedQuantFormat}</span>
          </div>
          <div class="flex items-center" title="File size">
            <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a1 1 0 011-1h4z"></path>
            </svg>
            <span>${fileSizeFormatted}</span>
          </div>
        </div>
      </div>

      <!-- File Information Section -->
      <div class="mb-4">
        <div class="text-sm font-medium text-gray-700 mb-2">File</div>
        ${this.createFileList()}
      </div>

      <!-- Footer Section -->
      <div class="flex items-center justify-between pt-4 border-t border-gray-100">
        <span class="text-sm text-gray-600">
          ${modelType} • ${quantFormat}
        </span>
        <div class="flex items-center space-x-2">
          <a 
            href="${huggingFaceLink}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            aria-label="View ${modelName} on Hugging Face (opens in new tab)"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            View Model
          </a>
          <a 
            href="${directDownloadLink}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            aria-label="Download ${modelName} GGUF file (opens in new tab)"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download
          </a>
        </div>
      </div>
    `;

    // Add keyboard navigation support
    this.setupKeyboardNavigation(card);

    // Add animation class for smooth appearance
    card.classList.add('animate-fade-in');
  }

  /**
   * Create formatted file list - simplified for workflow format
   * Each workflow entry represents a single file
   * Uses workflow's quantFormat field directly instead of extracting from filename
   * @returns {string} HTML for file list
   */
  createFileList() {
    // In workflow format, each model entry represents a single file
    // Extract filename from directDownloadLink
    const filename = this.extractFilename(this.model.directDownloadLink);
    const highlightedFilename = this.options.showSearchHighlight ?
      this.highlightSearchTerms(filename, this.options.searchQuery) : filename;

    // Use workflow's quantFormat field directly (no extraction needed)
    const quantFormat = this.model.quantFormat || 'Unknown';
    const fileSizeFormatted = this.model.fileSizeFormatted || 'Unknown size';

    return `
      <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors group/file">
        <div class="flex-1 min-w-0 mr-2">
          <div class="font-mono text-gray-700 truncate" title="${filename}">
            ${highlightedFilename}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            ${fileSizeFormatted}
          </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">${quantFormat}</span>
          <button 
            class="opacity-0 group-hover/file:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all"
            onclick="window.open('${this.model.directDownloadLink}', '_blank')"
            title="Download ${filename}"
            aria-label="Download ${filename}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Extract filename from directDownloadLink
   * @param {string} directDownloadLink - Direct download URL
   * @returns {string} Filename
   */
  extractFilename(directDownloadLink) {
    if (!directDownloadLink) return 'unknown.gguf';
    return directDownloadLink.split('/').pop() || 'unknown.gguf';
  }

  /**
   * Set up keyboard navigation for the card
   * @param {HTMLElement} card - Card element
   */
  setupKeyboardNavigation(card) {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Focus on the main action button
        const viewButton = card.querySelector('a[href*="huggingface.co"]');
        if (viewButton) {
          viewButton.click();
        }
      }
    });

    // Add focus styles
    card.addEventListener('focus', () => {
      card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
    });

    card.addEventListener('blur', () => {
      card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
    });
  }

  /**
   * Highlight search terms in text
   * @param {string} text - Text to highlight
   * @param {string} searchQuery - Search query
   * @returns {string} HTML with highlighted terms
   */
  highlightSearchTerms(text, searchQuery) {
    if (!searchQuery || !text) {
      return text;
    }

    const query = searchQuery.trim();
    if (query.length === 0) {
      return text;
    }

    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    } catch (error) {
      console.warn('Error highlighting search terms:', error);
      return text;
    }
  }





  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Render method for compatibility with tests
   * @returns {HTMLElement} Model card element
   */
  render() {
    if (!this.element) {
      this.element = this.createElement();
    }
    return this.element;
  }







  /**
   * Destroy the card and clean up resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.model = null;
  }
}

export default ModelCard;