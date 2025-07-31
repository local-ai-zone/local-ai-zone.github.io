/**
 * GGUF Model Discovery - Main Application Entry Point
 * 
 * This is the main entry point for the GGUF Model Discovery application.
 * It loads pre-generated JSON files and provides model discovery functionality.
 * NO API calls to Hugging Face are made from the frontend.
 * 
 * Task 3.3: Build JavaScript application core
 * Task 4.1: Create real-time search functionality
 * Requirements: 1.1, 1.3, 1.2, 6.1, 6.2
 */


import { debounceSearch } from './utils/debounce.js';
import { ModelCard } from './components/ModelCard.js';
import { seoManager } from './utils/seoManager.js';
import { Router } from './utils/router.js';
import { performanceOptimizer } from './utils/performanceOptimizer.js';
import { performanceMonitor } from './utils/performanceMonitor.js';
import { PerformanceDashboard } from './components/PerformanceDashboard.js';
import { DataService } from './services/DataService.js';

/**
 * URL State Manager for bookmarkable filtered views
 * Requirements: 6.3
 */
class URLStateManager {
  constructor(app = null) {
    this.urlParams = new URLSearchParams(window.location.search);
    this.app = app;
  }

  /**
   * Update URL with current filter state and pagination
   * @param {Object} filterState - Current filter state
   * @param {string} searchQuery - Current search query
   */
  updateURL(filterState, searchQuery) {
    const params = new URLSearchParams();
    
    // Add search query
    if (searchQuery && searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    
    // Add filters
    if (filterState.quantization) {
      params.set('quantization', filterState.quantization);
    }
    if (filterState.architecture) {
      params.set('architecture', filterState.architecture);
    }
    if (filterState.sizeRange) {
      params.set('size', filterState.sizeRange);
    }
    if (filterState.sortBy && filterState.sortBy !== 'name') {
      params.set('sort', filterState.sortBy);
    }
    if (filterState.sortOrder && filterState.sortOrder !== 'asc') {
      params.set('order', filterState.sortOrder);
    }
    
    // Add pagination state
    if (this.app && this.app.currentPage && this.app.currentPage > 1) {
      params.set('page', this.app.currentPage.toString());
    }
    
    // Update URL without page reload
    const newURL = params.toString() ? 
      `${window.location.pathname}?${params.toString()}` : 
      window.location.pathname;
    
    window.history.replaceState({}, '', newURL);
  }

  /**
   * Load filter state from URL parameters
   * @returns {Object} Filter state from URL
   */
  loadFromURL() {
    return {
      searchQuery: this.urlParams.get('q') || '',
      quantization: this.urlParams.get('quantization') || '',
      architecture: this.urlParams.get('architecture') || '',
      sizeRange: this.urlParams.get('size') || '',
      sortBy: this.urlParams.get('sort') || 'name',
      sortOrder: this.urlParams.get('order') || 'asc',
      page: parseInt(this.urlParams.get('page')) || 1
    };
  }

  /**
   * Clear all URL parameters
   */
  clearURL() {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

console.log('🧠 GGUF Model Discovery - Application Starting...');

/**
 * Model Discovery Application Class
 * Loads pre-generated JSON files and provides model discovery functionality
 * Requirements: 1.1, 1.3
 */
class ModelDiscoveryApp {
  constructor() {
    // Application State
    this.allModels = [];
    this.filteredModels = [];
    // searchResults removed - using simple searchText filtering now
    this.currentPage = 1;
    this.modelsPerPage = 50; // Changed to 50 models per page for pagination
    this.isLoading = false;
    this.searchQuery = '';
    this.sortBy = 'name';
    this.metadata = null;

    // Data Service for workflow data handling
    this.dataService = new DataService();

    // DOM Elements
    this.searchInput = null;
    this.modelGrid = null;
    this.resultsCount = null;
    this.loadMoreButton = null;
    this.sortSelect = null;
    this.filterControls = null;

    // Search functionality with debouncing
    this.debouncedSearch = debounceSearch(this.performSearch.bind(this), 300);
    
    // Search state
    this.isSearchActive = false;
    this.lastSearchQuery = '';
    
    // Filter state
    this.activeFilters = {
      quantization: '',
      architecture: '',
      sizeRange: '',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    
    // URL state management
    this.urlStateManager = new URLStateManager(this);
    
    // SEO Manager reference
    this.seoManager = seoManager;
    
    // Router for SEO-friendly URLs (initialized after DOM is ready)
    this.router = null;
  }

  /**
   * Initialize the application
   * Requirements: 1.1, 1.3
   */
  async init() {
    try {
      console.log('🔧 Initializing Model Discovery App...');

      // Set up DOM references
      this.setupDOMReferences();

      // Set up event listeners
      this.setupEventListeners();

      // Load model data from static JSON files (NO API calls to Hugging Face)
      await this.loadStaticModelData();

      // Initialize the UI with loaded data
      this.initializeUI();

      // Apply initial rendering
      this.renderModels();
      
      // Initialize router for SEO-friendly URLs
      this.router = new Router(this);

      console.log('✅ Model Discovery App initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.showError('Failed to initialize the application. Please refresh the page.');
    }
  }

  /**
   * Set up DOM element references
   */
  setupDOMReferences() {
    this.searchInput = document.getElementById('model-search');
    this.modelGrid = document.getElementById('model-grid');
    this.resultsCount = document.getElementById('results-count');
    this.loadMoreButton = document.getElementById('load-more');
    this.sortSelect = document.getElementById('sort-select');
    this.filterControls = document.getElementById('filter-controls');

    // Validate required elements
    const requiredElements = {
      'model-search': this.searchInput,
      'model-grid': this.modelGrid,
      'results-count': this.resultsCount,
      'sort-select': this.sortSelect,
      'filter-controls': this.filterControls
    };

    for (const [id, element] of Object.entries(requiredElements)) {
      if (!element) {
        throw new Error(`Required element not found: ${id}`);
      }
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search input with real-time search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.debouncedSearch(this.searchQuery);
      });
      
      // Clear search on Escape key
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.clearSearch();
        }
      });
    }

    // Sort select
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.activeFilters.sortBy = e.target.value;
        this.sortBy = e.target.value; // Keep for backward compatibility
        this.sortModels();
        this.renderModels();
        this.updateURL();
      });
    }

    // Load more button
    if (this.loadMoreButton) {
      this.loadMoreButton.addEventListener('click', () => {
        this.loadMoreModels();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput?.focus();
      }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.urlStateManager = new URLStateManager(this);
      this.loadFiltersFromURL();
    });
  }

  /**
   * Load model data from workflow output with dynamic data handling
   * Handles variable model counts (2000-6000+ models) and graceful error handling
   * Requirements: 1.1, 1.3, 3.1, 3.5, 8.1
   */
  async loadStaticModelData() {
    this.setLoading(true, 'Loading workflow model data...');

    try {
      console.log('📁 Loading models from workflow data...');
      
      // Use DataService to load models with robust error handling
      this.allModels = await this.dataService.loadModels();
      
      // Get model statistics for dynamic handling
      const modelStats = this.dataService.getModelStats();
      const dataStatus = this.dataService.getDataStatus();
      
      console.log(`✅ Loaded ${modelStats.formattedCount} models from workflow`);
      console.log(`📊 Dataset status: ${dataStatus.status} - ${dataStatus.message}`);
      
      // Handle empty or minimal datasets gracefully
      if (dataStatus.isEmpty) {
        console.warn('⚠️ No models available from workflow data');
        this.showEmptyDatasetMessage();
      } else if (dataStatus.isMinimal) {
        console.warn(`⚠️ Minimal dataset: ${modelStats.formattedCount} models`);
        this.showMinimalDatasetWarning(modelStats);
      } else if (modelStats.isLarge) {
        console.info(`🚀 Large dataset: ${modelStats.formattedCount} models - performance optimizations active`);
        this.enablePerformanceOptimizations();
      }

      // Load additional metadata if available
      try {
        const metadataResponse = await fetch('./gguf_models_estimated_sizes.json');
        if (metadataResponse.ok) {
          const sizeData = await metadataResponse.json();
          this.metadata = { estimatedSizes: sizeData };
          console.log('✅ Loaded model size estimates');
        }
      } catch (metadataError) {
        console.warn('⚠️ Could not load size metadata:', metadataError.message);
      }

      // Load freshness indicators
      await this.loadFreshnessData();

      // Initialize filtered models with all models
      this.filteredModels = [...this.allModels];

      // Log final statistics
      if (modelStats.breakdown) {
        console.log('📈 Dataset breakdown:', {
          modelTypes: modelStats.breakdown.modelTypes,
          quantFormats: modelStats.breakdown.quantFormats,
          totalSizeGB: modelStats.breakdown.totalFileSizeGB,
          averageDownloads: modelStats.breakdown.averageDownloads
        });
      }

      console.log('🔒 All data loaded from workflow files - no external API calls made');

    } catch (error) {
      console.error('❌ Failed to load workflow model data:', error);
      
      // Handle workflow data loading failures gracefully
      await this.handleWorkflowDataFailure(error);
      
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load freshness data and initialize freshness indicators
   */
  async loadFreshnessData() {
    try {
      console.log('🕐 Loading freshness indicators...');
      const response = await fetch('./data/freshness_indicators.json');
      
      if (response.ok) {
        this.freshnessData = await response.json();
        console.log('✅ Loaded freshness indicators');
        this.initializeFreshnessIndicator();
      } else {
        console.warn('⚠️ Could not load freshness indicators, using fallback');
        this.createFallbackFreshnessData();
      }
    } catch (error) {
      console.warn('⚠️ Failed to load freshness data:', error.message);
      this.createFallbackFreshnessData();
    }
  }

  /**
   * Create fallback freshness data when indicators are not available
   */
  createFallbackFreshnessData() {
    const now = new Date();
    this.freshnessData = {
      lastSyncTimestamp: now.toISOString(),
      lastSyncFormatted: now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
      hoursSinceSync: 0,
      overallStatus: 'unknown',
      statusColor: 'gray',
      statusIcon: '❓',
      timeMessage: 'Freshness data unavailable',
      freshnessScore: 0,
      totalModels: this.allModels ? this.allModels.length : 0,
      modelsWithTimestamps: 0,
      syncDuration: 0,
      syncMode: 'unknown',
      syncSuccess: true,
      stalenessWarnings: ['Freshness indicators could not be loaded'],
      showStalenessWarning: true
    };
    this.initializeFreshnessIndicator();
  }

  /**
   * Initialize the freshness indicator in the header
   */
  initializeFreshnessIndicator() {
    const container = document.getElementById('freshness-indicator-container');
    if (container && this.freshnessData) {
      // Import and initialize the freshness indicator
      import('./components/FreshnessIndicator.js').then(({ FreshnessIndicator }) => {
        this.freshnessIndicator = new FreshnessIndicator();
        const indicatorElement = this.freshnessIndicator.render(this.freshnessData);
        container.appendChild(indicatorElement);
        console.log('✅ Freshness indicator initialized');
      }).catch(error => {
        console.warn('⚠️ Could not initialize freshness indicator:', error);
      });
    }
  }

  /**
   * Initialize the UI components
   */
  initializeUI() {
    // Update results count and model count display
    this.updateResultsCount();
    this.updateModelCountDisplay();

    // Set up filter controls (basic implementation)
    this.setupFilterControls();

    // Hide loading screen
    this.hideLoadingScreen();
  }

  /**
   * Update the model count display in the header with dynamic data from workflow
   */
  updateModelCountDisplay() {
    const modelCountDisplay = document.getElementById('model-count-display');
    if (!modelCountDisplay) return;

    if (!this.allModels || this.allModels.length === 0) {
      // Handle empty or loading state
      modelCountDisplay.innerHTML = `
        <span class="font-medium text-gray-500">Total Models:</span> 
        <span class="text-gray-400">Loading...</span>
      `;
      return;
    }

    const modelCount = this.allModels.length;
    const formattedCount = modelCount.toLocaleString();
    
    // Determine status and styling based on model count
    let statusClass = 'text-blue-600';
    let statusIcon = '';
    let statusMessage = '';

    if (modelCount === 0) {
      statusClass = 'text-gray-400';
      statusIcon = '⚠️ ';
      statusMessage = 'No models available';
    } else if (modelCount < 100) {
      statusClass = 'text-yellow-600';
      statusIcon = '⚠️ ';
      statusMessage = 'Minimal dataset';
    } else if (modelCount < 1000) {
      statusClass = 'text-orange-600';
      statusIcon = '📊 ';
      statusMessage = 'Limited dataset';
    } else if (modelCount >= 2000 && modelCount <= 6000) {
      statusClass = 'text-green-600';
      statusIcon = '✅ ';
      statusMessage = 'Normal dataset';
    } else if (modelCount > 6000) {
      statusClass = 'text-blue-600';
      statusIcon = '🚀 ';
      statusMessage = 'Large dataset';
    } else {
      statusClass = 'text-blue-600';
      statusIcon = '📊 ';
      statusMessage = 'Dataset loaded';
    }

    modelCountDisplay.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="font-medium text-gray-700">Total Models:</span> 
        <span class="${statusClass} font-semibold">${statusIcon}${formattedCount}</span>
        <span class="text-xs text-gray-500 hidden sm:inline" title="${statusMessage}">
          (${statusMessage})
        </span>
      </div>
    `;

    // Add tooltip for mobile
    modelCountDisplay.setAttribute('title', `${formattedCount} models available - ${statusMessage}`);
  }

  /**
   * Show message for empty dataset
   */
  showEmptyDatasetMessage() {
    const modelGrid = document.getElementById('model-grid');
    if (modelGrid) {
      modelGrid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <div class="text-gray-400 mb-6">
            <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">No Models Available</h3>
          <p class="text-gray-600 mb-4 max-w-md mx-auto">
            The workflow data is currently empty. This may be due to:
          </p>
          <ul class="text-sm text-gray-500 mb-6 space-y-1">
            <li>• Workflow data is still being generated</li>
            <li>• Data file is temporarily unavailable</li>
            <li>• Network connectivity issues</li>
          </ul>
          <button onclick="window.location.reload()" 
                  class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Refresh Page
          </button>
        </div>
      `;
    }
  }

  /**
   * Show warning for minimal dataset
   * @param {Object} modelStats - Model statistics
   */
  showMinimalDatasetWarning(modelStats) {
    const warningContainer = document.createElement('div');
    warningContainer.className = 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6';
    warningContainer.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Limited Dataset</h3>
          <p class="mt-1 text-sm text-yellow-700">
            Only ${modelStats.formattedCount} models are currently available. The full dataset may still be loading.
          </p>
        </div>
      </div>
    `;

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.insertBefore(warningContainer, mainContent.firstChild);
    }
  }

  /**
   * Enable performance optimizations for large datasets
   */
  enablePerformanceOptimizations() {
    console.log('🚀 Enabling performance optimizations for large dataset');
    
    // Reduce models per page for better performance
    this.modelsPerPage = 8;
    
    // Enable virtual scrolling if available
    if (this.performanceOptimizer) {
      this.performanceOptimizer.enableVirtualScrolling();
    }
    
    // Show performance notice
    const performanceNotice = document.createElement('div');
    performanceNotice.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6';
    performanceNotice.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">Large Dataset Detected</h3>
          <p class="mt-1 text-sm text-blue-700">
            Performance optimizations are active for the ${this.allModels.length.toLocaleString()} available models.
          </p>
        </div>
      </div>
    `;

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.insertBefore(performanceNotice, mainContent.firstChild);
    }
  }

  /**
   * Handle workflow data loading failures gracefully
   * @param {Error} error - The error that occurred
   */
  async handleWorkflowDataFailure(error) {
    console.error('🚨 Workflow data loading failed:', error);
    
    // Try to provide fallback or recovery options
    const errorContainer = document.createElement('div');
    errorContainer.className = 'bg-red-50 border border-red-200 rounded-lg p-6 mb-6';
    errorContainer.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-lg font-medium text-red-800 mb-2">Unable to Load Model Data</h3>
          <p class="text-sm text-red-700 mb-4">
            There was a problem loading the workflow model data. This could be due to:
          </p>
          <ul class="text-sm text-red-600 mb-4 space-y-1 list-disc list-inside">
            <li>Network connectivity issues</li>
            <li>Workflow data file is temporarily unavailable</li>
            <li>Data format incompatibility</li>
            <li>Server maintenance in progress</li>
          </ul>
          <div class="flex space-x-3">
            <button onclick="window.location.reload()" 
                    class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
              Retry Loading
            </button>
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.insertBefore(errorContainer, mainContent.firstChild);
    }

    // Set empty state for graceful degradation
    this.allModels = [];
    this.filteredModels = [];
    this.showEmptyDatasetMessage();
  }

  /**
   * Set up enhanced filter controls with more options
   * Requirements: 6.1, 6.2, 6.3
   */
  setupFilterControls() {
    if (!this.filterControls) return;

    // Extract unique values for filters from workflow data
    const quantizations = [...new Set(
      this.allModels.map(model => model.quantFormat)
    )].filter(Boolean).sort();

    const architectures = [...new Set(
      this.allModels.map(model => model.modelType)
    )].filter(Boolean).sort();

    // Calculate size ranges using fileSize field with GB conversion
    const sizeRanges = [
      { value: 'small', label: 'Small (< 4GB)', count: 0 },
      { value: 'medium', label: 'Medium (4-8GB)', count: 0 },
      { value: 'large', label: 'Large (8-16GB)', count: 0 },
      { value: 'xlarge', label: 'X-Large (> 16GB)', count: 0 }
    ];

    // Count models in each size range using fileSize field
    this.allModels.forEach(model => {
      const sizeGB = model.fileSize / (1024 * 1024 * 1024);
      if (sizeGB < 4) sizeRanges[0].count++;
      else if (sizeGB < 8) sizeRanges[1].count++;
      else if (sizeGB < 16) sizeRanges[2].count++;
      else sizeRanges[3].count++;
    });

    // Create enhanced filter HTML
    this.filterControls.innerHTML = `
      <div class="filter-group">
        <label for="quantization-filter" class="block text-sm font-medium text-gray-700 mb-1">Quantization</label>
        <select id="quantization-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Quantizations</option>
          ${quantizations.map(q => `<option value="${q}">${q}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="architecture-filter" class="block text-sm font-medium text-gray-700 mb-1">Architecture</label>
        <select id="architecture-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Architectures</option>
          ${architectures.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="size-filter" class="block text-sm font-medium text-gray-700 mb-1">Model Size</label>
        <select id="size-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Sizes</option>
          ${sizeRanges.filter(r => r.count > 0).map(r => 
            `<option value="${r.value}">${r.label} (${r.count})</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="sort-order-filter" class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <select id="sort-order-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div class="filter-group flex items-end">
        <button id="clear-filters-btn" class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
          Clear All Filters
        </button>
      </div>
    `;

    // Add filter event listeners
    const quantizationFilter = document.getElementById('quantization-filter');
    const architectureFilter = document.getElementById('architecture-filter');
    const sizeFilter = document.getElementById('size-filter');
    const sortOrderFilter = document.getElementById('sort-order-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    if (quantizationFilter) {
      quantizationFilter.addEventListener('change', (e) => {
        this.activeFilters.quantization = e.target.value;
        this.applyFilters();
      });
    }
    if (architectureFilter) {
      architectureFilter.addEventListener('change', (e) => {
        this.activeFilters.architecture = e.target.value;
        this.applyFilters();
      });
    }
    if (sizeFilter) {
      sizeFilter.addEventListener('change', (e) => {
        this.activeFilters.sizeRange = e.target.value;
        this.applyFilters();
      });
    }
    if (sortOrderFilter) {
      sortOrderFilter.addEventListener('change', (e) => {
        this.activeFilters.sortOrder = e.target.value;
        this.sortModels();
        this.renderModels();
        this.updateURL();
      });
    }
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Load initial state from URL
    this.loadFiltersFromURL();
  }



  /**
   * Perform search on models using pre-computed searchText field
   * Requirements: 6.1, 6.2, 6.3, 6.5
   */
  performSearch(query) {
    console.log('🔍 Performing search for:', query);
    
    // Update search state
    this.isSearchActive = query && query.length > 0;
    this.lastSearchQuery = query;
    
    if (this.isSearchActive) {
      // Use pre-computed searchText field for fast search
      const searchTerm = query.toLowerCase().trim();
      const searchedModels = this.allModels.filter(model => 
        model.searchText && model.searchText.includes(searchTerm)
      );
      
      // Apply additional filters to search results
      this.filteredModels = this.applyAdditionalFilters(searchedModels);
      
      console.log(`📊 Search found ${searchedModels.length} results, ${this.filteredModels.length} after filters`);
    } else {
      // No search query - show all models with filters applied
      this.filteredModels = this.applyAdditionalFilters(this.allModels);
    }

    // Reset pagination to page 1 when search changes
    this.currentPage = 1;
    this.sortModels();
    this.renderModels();
    
    // Update SEO meta tags for search results
    this.updateSearchSEO(query, this.filteredModels.length);
  }

  /**
   * Apply additional filters (non-search filters) to model list
   * Requirements: 6.1, 6.2
   * @param {Array} models - Models to filter
   * @returns {Array} Filtered models
   */
  applyAdditionalFilters(models) {
    return models.filter(model => {
      // Quantization filter using quantFormat field directly
      if (this.activeFilters.quantization) {
        if (model.quantFormat !== this.activeFilters.quantization) return false;
      }

      // Model type filter using modelType field from workflow
      if (this.activeFilters.architecture) {
        if (model.modelType !== this.activeFilters.architecture) return false;
      }

      // Size filtering using fileSize field with GB conversion
      if (this.activeFilters.sizeRange) {
        const sizeGB = model.fileSize / (1024 * 1024 * 1024);
        let matchesSize = false;
        
        switch (this.activeFilters.sizeRange) {
          case 'small':
            matchesSize = sizeGB < 4;
            break;
          case 'medium':
            matchesSize = sizeGB >= 4 && sizeGB < 8;
            break;
          case 'large':
            matchesSize = sizeGB >= 8 && sizeGB < 16;
            break;
          case 'xlarge':
            matchesSize = sizeGB >= 16;
            break;
          default:
            matchesSize = true;
        }
        
        if (!matchesSize) return false;
      }

      return true;
    });
  }

  /**
   * Apply all filters (search + additional filters) and reset pagination
   * Requirements: 6.1, 6.2, 6.3, 3.1, 3.5, 8.1
   */
  applyFilters() {
    // Reset to page 1 when filters change
    this.currentPage = 1;
    
    // Trigger search with current query (which will also apply additional filters)
    this.performSearch(this.searchQuery);
    
    // Update URL state for bookmarkable views
    this.updateURL();
  }

  /**
   * Load filters from URL parameters including pagination state
   * Requirements: 6.3, 3.1, 3.5, 8.1
   */
  loadFiltersFromURL() {
    const urlState = this.urlStateManager.loadFromURL();
    
    // Set search query
    if (urlState.searchQuery) {
      this.searchQuery = urlState.searchQuery;
      if (this.searchInput) {
        this.searchInput.value = urlState.searchQuery;
      }
    }
    
    // Set filter values
    this.activeFilters.quantization = urlState.quantization;
    this.activeFilters.architecture = urlState.architecture;
    this.activeFilters.sizeRange = urlState.sizeRange;
    this.activeFilters.sortBy = urlState.sortBy;
    this.activeFilters.sortOrder = urlState.sortOrder;
    
    // Set pagination state
    this.currentPage = urlState.page;
    
    // Update UI elements
    const quantizationFilter = document.getElementById('quantization-filter');
    const architectureFilter = document.getElementById('architecture-filter');
    const sizeFilter = document.getElementById('size-filter');
    const sortOrderFilter = document.getElementById('sort-order-filter');
    
    if (quantizationFilter) quantizationFilter.value = urlState.quantization;
    if (architectureFilter) architectureFilter.value = urlState.architecture;
    if (sizeFilter) sizeFilter.value = urlState.sizeRange;
    if (sortOrderFilter) sortOrderFilter.value = urlState.sortOrder;
    if (this.sortSelect) this.sortSelect.value = urlState.sortBy;
    
    // Apply filters if any are set
    if (urlState.searchQuery || urlState.quantization || urlState.architecture || 
        urlState.sizeRange || urlState.sortBy !== 'name' || urlState.sortOrder !== 'asc') {
      this.applyFilters();
    }
  }

  /**
   * Update URL with current filter state and pagination
   * Requirements: 6.3, 3.1, 3.5, 8.1
   */
  updateURL() {
    this.urlStateManager.updateURL(this.activeFilters, this.searchQuery);
  }

  /**
   * Clear all filters and reset to default state
   */
  clearAllFilters() {
    // Reset filter state
    this.activeFilters = {
      quantization: '',
      architecture: '',
      sizeRange: '',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    
    // Clear search
    this.clearSearch();
    
    // Reset UI elements
    const quantizationFilter = document.getElementById('quantization-filter');
    const architectureFilter = document.getElementById('architecture-filter');
    const sizeFilter = document.getElementById('size-filter');
    const sortOrderFilter = document.getElementById('sort-order-filter');
    
    if (quantizationFilter) quantizationFilter.value = '';
    if (architectureFilter) architectureFilter.value = '';
    if (sizeFilter) sizeFilter.value = '';
    if (sortOrderFilter) sortOrderFilter.value = 'asc';
    if (this.sortSelect) this.sortSelect.value = 'name';
    
    // Clear URL
    this.urlStateManager.clearURL();
    
    // Apply filters (which will show all models)
    this.applyFilters();
    
    console.log('🗑️ All filters cleared');
  }

  /**
   * Clear search and reset to all models
   */
  clearSearch() {
    this.searchQuery = '';
    this.searchInput.value = '';
    this.isSearchActive = false;
    this.lastSearchQuery = '';
    // searchResults removed - using simple searchText filtering now
    
    // Cancel any pending debounced search
    this.debouncedSearch.cancel();
    
    // Apply filters to all models
    this.applyFilters();
    
    console.log('🗑️ Search cleared');
  }

  /**
   * Handle search input (legacy method - now uses performSearch)
   */
  handleSearch() {
    this.performSearch(this.searchQuery);
  }

  /**
   * Sort models based on current sort criteria with order support
   * Requirements: 5.1, 5.2, 8.2
   */
  sortModels() {
    const sortBy = this.activeFilters.sortBy || this.sortBy;
    const sortOrder = this.activeFilters.sortOrder || 'asc';
    
    this.filteredModels.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          // Use modelName field directly from workflow
          comparison = (a.modelName || '').localeCompare(b.modelName || '');
          break;
        case 'downloads':
          // Use downloadCount field for download-based sorting
          comparison = (a.downloadCount || 0) - (b.downloadCount || 0);
          break;
        case 'updated':
          comparison = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
          break;
        case 'size':
          // Use fileSize field from workflow for size sorting
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'popularity':
          // Use downloadCount field for popularity sorting (alias for downloads)
          comparison = (a.downloadCount || 0) - (b.downloadCount || 0);
          break;
        default:
          comparison = 0;
      }
      
      // Apply sort order
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Render models to the grid with pagination (50 models per page)
   * Requirements: 1.3, 3.1, 3.5, 8.1
   */
  renderModels() {
    if (!this.modelGrid) return;

    // Calculate models to show for current page (50 per page)
    const startIndex = (this.currentPage - 1) * this.modelsPerPage;
    const endIndex = startIndex + this.modelsPerPage;
    const modelsToShow = this.filteredModels.slice(startIndex, endIndex);

    // Clear grid
    this.modelGrid.innerHTML = '';

    if (this.filteredModels.length === 0) {
      this.modelGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m6 0V7a2 2 0 012 2v4M9 6.306V7a2 2 0 00-2-2H7a2 2 0 00-2 2v4.01M15 6.306V7a2 2 0 012 2v4.01"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No models found</h3>
          <p class="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      `;
      this.renderPaginationControls();
      this.updateResultsCount();
      return;
    }

    // Render model cards using the ModelCard component
    modelsToShow.forEach(model => {
      // Create model card with enhanced options
      const modelCard = new ModelCard(model, {
        lazyLoad: true,
        showSearchHighlight: this.isSearchActive,
        searchQuery: this.searchQuery
      });

      const cardElement = modelCard.createElement();
      this.modelGrid.appendChild(cardElement);
    });

    // Render pagination controls
    this.renderPaginationControls();

    // Update results count
    this.updateResultsCount();
  }

  /**
   * Create a model card element with search highlighting
   * Requirements: 1.3, 1.2, 6.1
   */
  createModelCard(model) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Model: ${model.modelId}`);

    // Search highlighting now uses simple searchQuery matching

    // Extract model name and organization with highlighting
    const [org, ...nameParts] = model.modelId.split('/');
    const modelName = nameParts.join('/') || org;
    const organization = nameParts.length > 0 ? org : '';

    // Apply search highlighting
    const highlightedModelName = this.highlightSearchTerms(modelName, this.searchQuery);
    const highlightedOrganization = this.highlightSearchTerms(organization, this.searchQuery);

    // Format download count
    const downloadCount = model.downloads ? this.formatNumber(model.downloads) : 'N/A';

    // Format last modified date
    const lastModified = model.lastModified ? 
      new Date(model.lastModified).toLocaleDateString() : 'N/A';

    // Create file list - simplified for workflow format
    const fileList = model.files ? model.files.map(file => {
      return `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
          <span class="font-mono text-gray-700">${file.filename}</span>
        </div>
      `;
    }).join('') : '<p class="text-gray-500 text-sm">No files available</p>';

    // Add search score indicator if this is a search result
    const searchScoreIndicator = searchResult && searchResult.score > 1 ? 
      `<div class="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
        Match: ${Math.round(searchResult.score * 10) / 10}
      </div>` : '';

    card.innerHTML = `
      ${searchScoreIndicator}
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900 truncate" title="${model.modelId}">
            ${highlightedModelName}
          </h3>
          ${organization ? `<p class="text-sm text-gray-600">${highlightedOrganization}</p>` : ''}
        </div>
        <div class="flex-shrink-0 ml-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ${this.highlightSearchTerms(this.extractArchitecture(model.modelId), this.searchQuery)}
          </span>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center text-sm text-gray-600 space-x-4">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
            ${downloadCount} downloads
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            ${lastModified}
          </div>
        </div>
      </div>

      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-900 mb-2">Available Files:</h4>
        <div class="space-y-1 max-h-32 overflow-y-auto">
          ${fileList}
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">
          ${model.files ? model.files.length : 0} file${model.files && model.files.length !== 1 ? 's' : ''}
        </span>
        <!-- COMMENTED OUT: Hugging Face link removed since we no longer use HF URLs -->
        <!--
        <a 
          href="https://huggingface.co/${model.modelId}" 
          target="_blank" 
          rel="noopener noreferrer"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label="View ${model.modelId} on Hugging Face"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
          View Model
        </a>
        -->
      </div>
    `;

    return card;
  }

  /**
   * Render pagination controls with page numbers (1, 2, 3, ... Next, Previous)
   * Requirements: 3.1, 3.5, 8.1
   */
  renderPaginationControls() {
    const totalPages = Math.ceil(this.filteredModels.length / this.modelsPerPage);
    
    // Find or create pagination container
    let paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) {
      paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination-controls';
      paginationContainer.className = 'flex justify-center items-center space-x-2 mt-8';
      
      // Insert after model grid
      const modelGridParent = this.modelGrid.parentNode;
      modelGridParent.insertBefore(paginationContainer, this.modelGrid.nextSibling);
    }

    // Clear existing pagination
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = `px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
      this.currentPage === 1 
        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
    }`;
    prevButton.textContent = 'Previous';
    prevButton.disabled = this.currentPage === 1;
    prevButton.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    paginationContainer.appendChild(prevButton);

    // Page numbers with smart truncation
    const maxVisiblePages = 7;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Always show first page
    if (startPage > 1) {
      this.createPageButton(paginationContainer, 1);
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-3 py-2 text-gray-500';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }

    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
      this.createPageButton(paginationContainer, i);
    }

    // Always show last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-3 py-2 text-gray-500';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
      this.createPageButton(paginationContainer, totalPages);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = `px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
      this.currentPage === totalPages 
        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
    }`;
    nextButton.textContent = 'Next';
    nextButton.disabled = this.currentPage === totalPages;
    nextButton.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    paginationContainer.appendChild(nextButton);
  }

  /**
   * Create a page number button
   * @param {HTMLElement} container - Container to append button to
   * @param {number} pageNumber - Page number
   */
  createPageButton(container, pageNumber) {
    const button = document.createElement('button');
    const isCurrentPage = pageNumber === this.currentPage;
    
    button.className = `px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
      isCurrentPage
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
    }`;
    button.textContent = pageNumber.toString();
    button.setAttribute('aria-label', `Go to page ${pageNumber}`);
    button.setAttribute('aria-current', isCurrentPage ? 'page' : 'false');
    
    if (!isCurrentPage) {
      button.addEventListener('click', () => this.goToPage(pageNumber));
    }
    
    container.appendChild(button);
  }

  /**
   * Navigate to a specific page
   * @param {number} pageNumber - Page number to navigate to
   */
  goToPage(pageNumber) {
    const totalPages = Math.ceil(this.filteredModels.length / this.modelsPerPage);
    
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === this.currentPage) {
      return;
    }
    
    this.currentPage = pageNumber;
    this.renderModels();
    
    // Scroll to top of results
    const resultsSection = document.getElementById('model-grid');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Update URL to preserve pagination state
    this.updateURL();
  }

  /**
   * Load more models (legacy method - now redirects to pagination)
   */
  loadMoreModels() {
    const totalPages = Math.ceil(this.filteredModels.length / this.modelsPerPage);
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Update the load more button visibility (hidden for pagination)
   */
  updateLoadMoreButton(hasMore) {
    if (!this.loadMoreButton) return;

    // Hide load more button since we're using pagination
    this.loadMoreButton.classList.add('hidden');
  }

  /**
   * Update results count display with pagination information (Showing X-Y of Z models format)
   * Requirements: 3.1, 3.5, 8.1
   */
  updateResultsCount() {
    if (!this.resultsCount) return;

    const total = this.filteredModels.length;
    const totalModels = this.allModels.length;
    
    if (total === 0) {
      this.resultsCount.textContent = 'No models found';
      this.updateActiveFiltersDisplay();
      return;
    }

    // Calculate showing range for current page
    const startIndex = (this.currentPage - 1) * this.modelsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.modelsPerPage, total);
    
    let countText = '';
    
    if (this.isSearchActive) {
      // Show search results count with pagination
      countText = `Showing ${startIndex}-${endIndex} of ${total} search results for "${this.lastSearchQuery}"`;
    } else {
      // Show regular filter results with pagination
      if (total === totalModels) {
        countText = `Showing ${startIndex}-${endIndex} of ${total} models`;
      } else {
        countText = `Showing ${startIndex}-${endIndex} of ${total} models (filtered from ${totalModels} total)`;
      }
    }
    
    this.resultsCount.textContent = countText;
    
    // Update active filters display
    this.updateActiveFiltersDisplay();
  }

  /**
   * Update the display of active filters
   * Requirements: 6.1, 6.2
   */
  updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;

    const activeFilterTags = [];

    // Add search query tag
    if (this.isSearchActive && this.lastSearchQuery) {
      activeFilterTags.push({
        type: 'search',
        label: `Search: "${this.lastSearchQuery}"`,
        value: this.lastSearchQuery
      });
    }

    // Add filter tags
    if (this.activeFilters.quantization) {
      activeFilterTags.push({
        type: 'quantization',
        label: `Quantization: ${this.activeFilters.quantization}`,
        value: this.activeFilters.quantization
      });
    }

    if (this.activeFilters.architecture) {
      activeFilterTags.push({
        type: 'architecture',
        label: `Architecture: ${this.activeFilters.architecture}`,
        value: this.activeFilters.architecture
      });
    }

    if (this.activeFilters.sizeRange) {
      const sizeLabels = {
        small: 'Small (< 4GB)',
        medium: 'Medium (4-8GB)',
        large: 'Large (8-16GB)',
        xlarge: 'X-Large (> 16GB)'
      };
      activeFilterTags.push({
        type: 'size',
        label: `Size: ${sizeLabels[this.activeFilters.sizeRange]}`,
        value: this.activeFilters.sizeRange
      });
    }

    // Add sort tag if not default
    if (this.activeFilters.sortBy !== 'name' || this.activeFilters.sortOrder !== 'asc') {
      const sortLabel = `Sort: ${this.activeFilters.sortBy} (${this.activeFilters.sortOrder})`;
      activeFilterTags.push({
        type: 'sort',
        label: sortLabel,
        value: `${this.activeFilters.sortBy}-${this.activeFilters.sortOrder}`
      });
    }

    // Render filter tags
    activeFiltersContainer.innerHTML = activeFilterTags.map(tag => `
      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
        ${tag.label}
        <button 
          class="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
          onclick="window.modelDiscoveryApp.removeFilter('${tag.type}', '${tag.value}')"
          aria-label="Remove ${tag.label} filter"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </span>
    `).join('');
  }

  /**
   * Remove a specific filter
   * @param {string} filterType - Type of filter to remove
   * @param {string} filterValue - Value of filter to remove
   */
  removeFilter(filterType, filterValue) {
    switch (filterType) {
      case 'search':
        this.clearSearch();
        break;
      case 'quantization':
        this.activeFilters.quantization = '';
        const quantizationFilter = document.getElementById('quantization-filter');
        if (quantizationFilter) quantizationFilter.value = '';
        break;
      case 'architecture':
        this.activeFilters.architecture = '';
        const architectureFilter = document.getElementById('architecture-filter');
        if (architectureFilter) architectureFilter.value = '';
        break;
      case 'size':
        this.activeFilters.sizeRange = '';
        const sizeFilter = document.getElementById('size-filter');
        if (sizeFilter) sizeFilter.value = '';
        break;
      case 'sort':
        this.activeFilters.sortBy = 'name';
        this.activeFilters.sortOrder = 'asc';
        if (this.sortSelect) this.sortSelect.value = 'name';
        const sortOrderFilter = document.getElementById('sort-order-filter');
        if (sortOrderFilter) sortOrderFilter.value = 'asc';
        break;
    }

    this.applyFilters();
  }

  /**
   * Set loading state
   */
  setLoading(isLoading, message = 'Loading...') {
    this.isLoading = isLoading;
    
    const globalLoading = document.getElementById('global-loading');
    const loadingMessage = document.getElementById('loading-message');
    
    if (globalLoading) {
      if (isLoading) {
        globalLoading.classList.remove('hidden');
        if (loadingMessage) {
          loadingMessage.textContent = message;
        }
      } else {
        globalLoading.classList.add('hidden');
      }
    }
  }

  /**
   * Hide the initial loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorContainer = document.getElementById('error-toast-container');
    if (!errorContainer) {
      console.error('Error container not found, showing alert:', message);
      alert(message);
      return;
    }

    const errorToast = document.createElement('div');
    errorToast.className = 'bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg';
    errorToast.setAttribute('role', 'alert');
    errorToast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-red-800">${message}</p>
        </div>
        <div class="ml-auto pl-3">
          <button class="inline-flex text-red-400 hover:text-red-600" onclick="this.parentElement.parentElement.parentElement.remove()">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;

    errorContainer.appendChild(errorToast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorToast.parentNode) {
        errorToast.remove();
      }
    }, 5000);
  }

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Highlight search terms in text
   * @param {string} text - Text to highlight
   * @param {string} searchQuery - Search query to highlight
   * @returns {string} HTML with highlighted terms
   */
  highlightSearchTerms(text, searchQuery) {
    if (!searchQuery || !text || !this.isSearchActive) {
      return text;
    }
    
    const query = searchQuery.trim();
    if (query.length === 0) {
      return text;
    }
    
    // Escape special regex characters in the search query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    try {
      // Create case-insensitive regex for highlighting
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    } catch (error) {
      console.warn('Error highlighting search terms:', error);
      return text;
    }
  }

  /**
   * Get search statistics for debugging
   * @returns {Object} Search statistics
   */
  getSearchStats() {
    return {
      isSearchActive: this.isSearchActive,
      searchQuery: this.searchQuery,
      filteredResultsCount: this.filteredModels.length,
      searchMethod: 'searchText field'
    };
  }

  /**
   * Debounce utility function (legacy - now using imported debounce)
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Update SEO meta tags for search results
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results found
   */
  updateSearchSEO(query, resultCount) {
    if (query && query.trim()) {
      const meta = seoManager.generateSearchPageMeta(query, resultCount);
      seoManager.updateMetaTags(meta);
      
      // Update breadcrumbs for search
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: `Search: "${query}"` }
      ];
      seoManager.updateBreadcrumbs(breadcrumbs);
      
      // Generate search results structured data
      const searchStructuredData = seoManager.generateSearchResultsStructuredData(
        query, 
        this.filteredModels.slice(0, 10), 
        resultCount
      );
      seoManager.updateStructuredData('search-results-data', searchStructuredData);
    } else {
      // Reset to default meta tags when no search
      const meta = seoManager.generateSearchPageMeta('', resultCount);
      seoManager.updateMetaTags(meta);
      
      // Reset breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'GGUF Models' }
      ];
      seoManager.updateBreadcrumbs(breadcrumbs);
    }
  }

  /**
   * Update SEO for individual model view
   * @param {Object} model - Model data
   */
  updateModelSEO(model) {
    const meta = seoManager.generateModelPageMeta(model);
    seoManager.updateMetaTags(meta);
    
    // Update breadcrumbs for model page
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Models', url: '/' },
      { name: model.family || 'Unknown', url: `/family/${(model.family || 'unknown').toLowerCase()}` },
      { name: model.name || model.id }
    ];
    seoManager.updateBreadcrumbs(breadcrumbs);
  }

  /**
   * Update SEO for family view
   * @param {string} family - Family name
   * @param {number} modelCount - Number of models in family
   */
  updateFamilySEO(family, modelCount) {
    const meta = seoManager.generateFamilyPageMeta(family, modelCount);
    seoManager.updateMetaTags(meta);
    
    // Update breadcrumbs for family page
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Models', url: '/' },
      { name: `${family} Models` }
    ];
    seoManager.updateBreadcrumbs(breadcrumbs);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize performance optimizations first
    console.log('🚀 Initializing performance optimizations...');
    
    const app = new ModelDiscoveryApp();
    await app.init();
    
    // Initialize performance dashboard
    const performanceDashboard = new PerformanceDashboard(performanceMonitor);
    
    // Report initial performance metrics
    setTimeout(() => {
      performanceOptimizer.reportPerformanceMetrics();
      performanceMonitor.generateReport();
    }, 2000);
    
    // Make app globally available for debugging
    window.modelDiscoveryApp = app;
    window.performanceOptimizer = performanceOptimizer;
    window.performanceMonitor = performanceMonitor;
    window.performanceDashboard = performanceDashboard;
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    
    // Show error in loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div class="text-center">
          <div class="text-red-600 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Application Error</h1>
          <p class="text-gray-600 mb-4">Failed to load the GGUF Model Index.</p>
          <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Reload Application
          </button>
        </div>
      `;
    }
  }
});

// Handle global errors gracefully
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('✅ GGUF Model Discovery - Application script loaded');