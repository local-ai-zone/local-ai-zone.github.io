/**
 * Header component for GGUF Model Index
 * Provides sticky header with site title, subtitle, model count, freshness indicator, and GGUF Loader link
 */
import { FreshnessIndicator } from './FreshnessIndicator.js';

export class Header {
  constructor() {
    this.element = null;
    this.modelCountElement = null;
    this.freshnessIndicator = new FreshnessIndicator();
    this.freshnessContainer = null;
    this.currentModelCount = 0;
  }

  /**
   * Create and return the header DOM element
   * @returns {HTMLElement} The header element
   */
  render() {
    this.element = document.createElement('header');
    this.element.className = 'sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm';
    this.element.setAttribute('role', 'banner');
    this.element.setAttribute('aria-label', 'Site header');
    
    this.element.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col gap-4">
          <!-- Main header row -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Title and subtitle section -->
            <div class="flex-1">
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1" id="site-title">
                🧠 GGUF Model Index
              </h1>
              <p class="text-sm sm:text-base text-gray-600" aria-describedby="site-title">
                Powered and improved by GGUF Loader Team
              </p>
            </div>
            
            <!-- Stats and actions section -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" role="complementary" aria-label="Site statistics and actions">
              <!-- Model count -->
              <div class="text-sm sm:text-base text-gray-700 font-medium" role="status" aria-live="polite" aria-label="Model count">
                Total Models Listed: <span id="model-count" class="text-blue-600 font-semibold" aria-label="Current model count">0</span>
              </div>
              
              <!-- GGUF Loader button -->
              <a 
                href="https://ggufloader.github.io" 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Visit GGUF Loader website (opens in new tab)"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
                GGUF Loader
              </a>
            </div>
          </div>
          
          <!-- Freshness indicator row -->
          <div id="freshness-container" class="freshness-indicator-container">
            <!-- Freshness indicator will be inserted here -->
          </div>
        </div>
      </div>
    `;

    // Store references to elements for updates
    this.modelCountElement = this.element.querySelector('#model-count');
    this.freshnessContainer = this.element.querySelector('#freshness-container');
    
    // Initialize freshness indicator
    if (this.freshnessContainer) {
      const freshnessElement = this.freshnessIndicator.render();
      this.freshnessContainer.appendChild(freshnessElement);
    }
    
    return this.element;
  }

  /**
   * Update the displayed model count
   * @param {number} count - The current number of models
   */
  updateModelCount(count) {
    this.currentModelCount = count;
    if (this.modelCountElement) {
      this.modelCountElement.textContent = count.toLocaleString();
    }
  }

  /**
   * Update the freshness indicator with new data
   * @param {Object} freshnessData - Freshness data from the API
   */
  updateFreshnessIndicator(freshnessData) {
    if (this.freshnessIndicator) {
      this.freshnessIndicator.update(freshnessData);
    }
  }

  /**
   * Get the current model count
   * @returns {number} The current model count
   */
  getModelCount() {
    return this.currentModelCount;
  }

  /**
   * Destroy the component and clean up event listeners
   */
  destroy() {
    if (this.freshnessIndicator) {
      this.freshnessIndicator.destroy();
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.element = null;
    this.modelCountElement = null;
    this.freshnessContainer = null;
    this.freshnessIndicator = null;
  }
}