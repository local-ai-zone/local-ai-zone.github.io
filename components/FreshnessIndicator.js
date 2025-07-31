/**
 * Freshness Indicator Component
 * 
 * Displays data freshness information and staleness warnings to users.
 * Shows last sync time, freshness status, and provides visual indicators.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */
export class FreshnessIndicator {
  constructor() {
    this.element = null;
    this.freshnessData = null;
    this.updateInterval = null;
  }

  /**
   * Create and return the freshness indicator DOM element
   * @param {Object} freshnessData - Freshness data from the API
   * @returns {HTMLElement} The freshness indicator element
   */
  render(freshnessData = null) {
    this.freshnessData = freshnessData;
    
    this.element = document.createElement('div');
    this.element.className = 'freshness-indicator';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-label', 'Data freshness status');
    
    if (!freshnessData) {
      this.element.innerHTML = this._renderLoadingState();
      return this.element;
    }
    
    this.element.innerHTML = this._renderFreshnessContent(freshnessData);
    
    // Start periodic updates to show elapsed time
    this._startPeriodicUpdates();
    
    return this.element;
  }

  /**
   * Update the freshness indicator with new data
   * @param {Object} freshnessData - Updated freshness data
   */
  update(freshnessData) {
    this.freshnessData = freshnessData;
    if (this.element) {
      this.element.innerHTML = this._renderFreshnessContent(freshnessData);
    }
  }

  /**
   * Render loading state while freshness data is being fetched
   * @returns {string} HTML for loading state
   */
  _renderLoadingState() {
    return `
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <div class="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
        <span>Loading data freshness...</span>
      </div>
    `;
  }

  /**
   * Render the main freshness content
   * @param {Object} data - Freshness data
   * @returns {string} HTML for freshness indicator
   */
  _renderFreshnessContent(data) {
    const statusConfig = this._getStatusConfig(data);
    const stalenessWarning = this._shouldShowStalenessWarning(data);
    
    return `
      <div class="freshness-container">
        ${this._renderMainIndicator(data, statusConfig)}
        ${stalenessWarning ? this._renderStalenessWarning(data) : ''}
        ${this._renderDetailedInfo(data)}
      </div>
    `;
  }

  /**
   * Render the main freshness indicator
   * @param {Object} data - Freshness data
   * @param {Object} statusConfig - Status configuration
   * @returns {string} HTML for main indicator
   */
  _renderMainIndicator(data, statusConfig) {
    return `
      <div class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="flex items-center gap-2">
          <span class="text-lg" role="img" aria-label="${statusConfig.ariaLabel}">
            ${statusConfig.icon}
          </span>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-900">
              Data Last Updated
            </span>
            <span class="text-xs text-${statusConfig.color}-600 font-medium">
              ${data.timeMessage}
            </span>
          </div>
        </div>
        
        <div class="flex-1 text-right">
          <div class="text-xs text-gray-500">
            ${data.lastSyncFormatted}
          </div>
          <div class="text-xs text-gray-400">
            ${data.totalModels.toLocaleString()} models processed
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render staleness warning if needed
   * @param {Object} data - Freshness data
   * @returns {string} HTML for staleness warning
   */
  _renderStalenessWarning(data) {
    if (!data.showStalenessWarning) return '';
    
    const warnings = data.stalenessWarnings || [];
    const isVeryStale = data.hoursSinceSync > 25;
    
    return `
      <div class="mt-2 p-3 bg-${isVeryStale ? 'red' : 'yellow'}-50 border border-${isVeryStale ? 'red' : 'yellow'}-200 rounded-lg">
        <div class="flex items-start gap-2">
          <span class="text-${isVeryStale ? 'red' : 'yellow'}-600 text-sm" role="img" aria-label="Warning">
            ${isVeryStale ? '⚠️' : '⏰'}
          </span>
          <div class="flex-1">
            <h4 class="text-sm font-medium text-${isVeryStale ? 'red' : 'yellow'}-800 mb-1">
              ${isVeryStale ? 'Data May Be Outdated' : 'Data Freshness Notice'}
            </h4>
            <div class="text-xs text-${isVeryStale ? 'red' : 'yellow'}-700 space-y-1">
              ${warnings.length > 0 ? warnings.map(warning => `<div>• ${warning}</div>`).join('') : ''}
              ${isVeryStale ? '<div>• Consider refreshing the page or checking back later</div>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render detailed freshness information (collapsible)
   * @param {Object} data - Freshness data
   * @returns {string} HTML for detailed info
   */
  _renderDetailedInfo(data) {
    return `
      <details class="mt-2">
        <summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 select-none">
          <span class="inline-flex items-center gap-1">
            <svg class="w-3 h-3 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            View detailed freshness information
          </span>
        </summary>
        <div class="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="font-medium">Sync Mode:</span> ${data.syncMode}
            </div>
            <div>
              <span class="font-medium">Sync Duration:</span> ${data.syncDuration}s
            </div>
            <div>
              <span class="font-medium">Freshness Score:</span> ${(data.freshnessScore * 100).toFixed(1)}%
            </div>
            <div>
              <span class="font-medium">Models with Timestamps:</span> ${data.modelsWithTimestamps.toLocaleString()}
            </div>
          </div>
          <div class="pt-2 border-t border-gray-200">
            <span class="font-medium">Status:</span> 
            <span class="capitalize">${data.overallStatus.replace('_', ' ')}</span>
            (${data.hoursSinceSync.toFixed(1)} hours since last sync)
          </div>
        </div>
      </details>
    `;
  }

  /**
   * Get status configuration based on freshness data
   * @param {Object} data - Freshness data
   * @returns {Object} Status configuration
   */
  _getStatusConfig(data) {
    const configs = {
      fresh: {
        icon: '✅',
        color: 'green',
        ariaLabel: 'Data is fresh and up to date'
      },
      stale: {
        icon: '⚠️',
        color: 'yellow',
        ariaLabel: 'Data is slightly outdated'
      },
      very_stale: {
        icon: '❌',
        color: 'red',
        ariaLabel: 'Data is significantly outdated'
      }
    };
    
    return configs[data.overallStatus] || configs.fresh;
  }

  /**
   * Determine if staleness warning should be shown
   * @param {Object} data - Freshness data
   * @returns {boolean} Whether to show staleness warning
   */
  _shouldShowStalenessWarning(data) {
    return data.showStalenessWarning || 
           data.hoursSinceSync > 25 || 
           (data.stalenessWarnings && data.stalenessWarnings.length > 0);
  }

  /**
   * Start periodic updates to show elapsed time
   */
  _startPeriodicUpdates() {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Update every minute to show current elapsed time
    this.updateInterval = setInterval(() => {
      if (this.freshnessData && this.element) {
        // Recalculate hours since sync
        const now = new Date();
        const lastSync = new Date(this.freshnessData.lastSyncTimestamp);
        const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
        
        // Update the data
        const updatedData = {
          ...this.freshnessData,
          hoursSinceSync: hoursSinceSync,
          timeMessage: this._generateTimeMessage(hoursSinceSync),
          overallStatus: this._determineOverallStatus(hoursSinceSync),
          showStalenessWarning: hoursSinceSync > 25
        };
        
        this.update(updatedData);
      }
    }, 60000); // Update every minute
  }

  /**
   * Generate user-friendly time message
   * @param {number} hoursSinceSync - Hours since last sync
   * @returns {string} Time message
   */
  _generateTimeMessage(hoursSinceSync) {
    if (hoursSinceSync < 1) {
      return "Updated less than 1 hour ago";
    } else if (hoursSinceSync < 24) {
      return `Updated ${Math.floor(hoursSinceSync)} hours ago`;
    } else {
      const days = Math.floor(hoursSinceSync / 24);
      const remainingHours = Math.floor(hoursSinceSync % 24);
      if (days === 1 && remainingHours === 0) {
        return "Updated 1 day ago";
      } else if (remainingHours === 0) {
        return `Updated ${days} days ago`;
      } else {
        return `Updated ${days} day${days > 1 ? 's' : ''} and ${remainingHours} hours ago`;
      }
    }
  }

  /**
   * Determine overall status based on hours since sync
   * @param {number} hoursSinceSync - Hours since last sync
   * @returns {string} Overall status
   */
  _determineOverallStatus(hoursSinceSync) {
    if (hoursSinceSync <= 24) {
      return 'fresh';
    } else if (hoursSinceSync <= 25) {
      return 'stale';
    } else {
      return 'very_stale';
    }
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.element = null;
    this.freshnessData = null;
  }
}