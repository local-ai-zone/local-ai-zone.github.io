/**
 * Performance Dashboard Component
 * Real-time performance monitoring display
 * Requirements: 5.1
 */

export class PerformanceDashboard {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.isVisible = false;
    this.updateInterval = null;
    this.element = null;
    
    this.init();
  }

  /**
   * Initialize the dashboard
   */
  init() {
    this.createElement();
    this.setupEventListeners();
    this.setupKeyboardShortcut();
  }

  /**
   * Create the dashboard element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'performance-dashboard';
    this.element.className = 'fixed top-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 hidden max-w-md';
    this.element.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900">Performance Monitor</h3>
        <button id="close-dashboard" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-3">
        <!-- Core Web Vitals -->
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Core Web Vitals</h4>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-gray-50 p-2 rounded">
              <div class="font-medium">LCP</div>
              <div id="lcp-value" class="text-gray-600">-</div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <div class="font-medium">FID</div>
              <div id="fid-value" class="text-gray-600">-</div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <div class="font-medium">CLS</div>
              <div id="cls-value" class="text-gray-600">-</div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <div class="font-medium">FCP</div>
              <div id="fcp-value" class="text-gray-600">-</div>
            </div>
          </div>
        </div>
        
        <!-- Custom Metrics -->
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Custom Metrics</h4>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between">
              <span>Page Load:</span>
              <span id="page-load-value" class="font-mono">-</span>
            </div>
            <div class="flex justify-between">
              <span>Avg Search:</span>
              <span id="search-avg-value" class="font-mono">-</span>
            </div>
            <div class="flex justify-between">
              <span>Resources:</span>
              <span id="resources-value" class="font-mono">-</span>
            </div>
          </div>
        </div>
        
        <!-- Budget Status -->
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Budget Status</h4>
          <div id="budget-status" class="space-y-1 text-xs">
            <!-- Budget items will be populated here -->
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex space-x-2 pt-2 border-t border-gray-200">
          <button id="export-data" class="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
            Export Data
          </button>
          <button id="clear-data" class="flex-1 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
            Clear Data
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.element);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close button
    this.element.querySelector('#close-dashboard').addEventListener('click', () => {
      this.hide();
    });
    
    // Export data button
    this.element.querySelector('#export-data').addEventListener('click', () => {
      this.exportData();
    });
    
    // Clear data button
    this.element.querySelector('#clear-data').addEventListener('click', () => {
      this.clearData();
    });
  }

  /**
   * Set up keyboard shortcut to toggle dashboard
   */
  setupKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+P or Cmd+Shift+P to toggle dashboard
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Show the dashboard
   */
  show() {
    this.isVisible = true;
    this.element.classList.remove('hidden');
    this.startUpdating();
  }

  /**
   * Hide the dashboard
   */
  hide() {
    this.isVisible = false;
    this.element.classList.add('hidden');
    this.stopUpdating();
  }

  /**
   * Toggle dashboard visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Start updating the dashboard
   */
  startUpdating() {
    this.updateDisplay();
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000); // Update every second
  }

  /**
   * Stop updating the dashboard
   */
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update the dashboard display
   */
  updateDisplay() {
    const summary = this.monitor.getPerformanceSummary();
    
    // Update Core Web Vitals
    this.updateElement('lcp-value', this.formatMetric(summary.coreWebVitals.lcp, 'ms'));
    this.updateElement('fid-value', this.formatMetric(summary.coreWebVitals.fid, 'ms'));
    this.updateElement('cls-value', this.formatMetric(summary.coreWebVitals.cls, ''));
    this.updateElement('fcp-value', this.formatMetric(summary.coreWebVitals.fcp, 'ms'));
    
    // Update Custom Metrics
    this.updateElement('page-load-value', this.formatMetric(summary.customMetrics.pageLoadTime, 'ms'));
    this.updateElement('search-avg-value', this.formatMetric(summary.customMetrics.averageSearchTime, 'ms'));
    this.updateElement('resources-value', summary.resourceSummary.totalResources || 0);
    
    // Update Budget Status
    this.updateBudgetStatus(summary.budgetStatus);
  }

  /**
   * Update an element's text content
   */
  updateElement(id, value) {
    const element = this.element.querySelector(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Format a metric value
   */
  formatMetric(value, unit) {
    if (value === null || value === undefined) return '-';
    return `${value}${unit}`;
  }

  /**
   * Update budget status display
   */
  updateBudgetStatus(budgetStatus) {
    const container = this.element.querySelector('#budget-status');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(budgetStatus).forEach((metricName) => {
      const budget = budgetStatus[metricName];
      const statusClass = budget.status === 'pass' ? 'text-green-600' : 'text-red-600';
      const statusIcon = budget.status === 'pass' ? '✓' : '✗';
      
      const budgetItem = document.createElement('div');
      budgetItem.className = 'flex justify-between items-center';
      budgetItem.innerHTML = `
        <span>${metricName}:</span>
        <span class="${statusClass}">${statusIcon} ${budget.value}/${budget.budget}</span>
      `;
      
      container.appendChild(budgetItem);
    });
  }

  /**
   * Export performance data
   */
  exportData() {
    const data = this.monitor.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Performance data exported successfully');
  }

  /**
   * Clear performance data
   */
  clearData() {
    if (confirm('Are you sure you want to clear all performance data?')) {
      // Reset monitor data
      this.monitor.metrics.searchPerformance = [];
      this.monitor.metrics.userInteractions = [];
      this.monitor.metrics.resourceTimings = [];
      
      this.showNotification('Performance data cleared');
      this.updateDisplay();
    }
  }

  /**
   * Show a notification
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Destroy the dashboard
   */
  destroy() {
    this.stopUpdating();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Auto-initialize if performance monitor is available
if (typeof window !== 'undefined' && window.performanceMonitor) {
  window.performanceDashboard = new PerformanceDashboard(window.performanceMonitor);
}