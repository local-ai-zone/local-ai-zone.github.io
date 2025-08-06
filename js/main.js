/**
 * Main application entry point for GGUF Model Discovery
 * Initializes and coordinates all components with state management
 * Implements default sorting by downloadCount (descending) and error handling
 */

class GGUFModelApp {
    constructor() {
        // Core services
        this.appState = null;
        this.dataService = null;
        this.filterService = null;
        
        // Components
        this.header = null;
        this.searchFilter = null;
        this.modelGrid = null;
        this.pagination = null;
        
        // Application state
        this.isInitialized = false;
        this.isLoading = false;
        this.hasError = false;
        this.isProcessingStateChange = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleError = this.handleError.bind(this);
        this.clearAllFilters = this.clearAllFilters.bind(this);
        this.destroy = this.destroy.bind(this);
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing GGUF Model Discovery App...');
            
            // Show loading state
            console.log('📱 Showing loading screen...');
            this.showLoadingScreen();
            
            // Initialize core services
            console.log('⚙️ Initializing core services...');
            this.initializeServices();
            console.log('✅ Core services initialized');
            
            // Load initial data
            console.log('📊 Loading initial data...');
            await this.loadData();
            console.log('✅ Data loaded successfully');
            
            // Initialize components
            console.log('🧩 Initializing components...');
            this.initializeComponents();
            console.log('✅ Components initialized');
            
            // Set up global event handlers
            console.log('🎯 Setting up event handlers...');
            this.setupGlobalEventHandlers();
            console.log('✅ Event handlers set up');
            
            // Handle URL parameters for direct model access
            console.log('🔗 Processing URL parameters...');
            this.handleURLParameters();
            console.log('✅ URL parameters processed');
            
            // Subscribe to state changes for data processing
            console.log('🔄 Setting up state subscription...');
            this.setupStateSubscription();
            console.log('✅ State subscription set up');
            
            // Hide loading screen
            console.log('🎉 Hiding loading screen...');
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('🎊 GGUF Model Discovery App initialized successfully!');
            
            // Dispatch initialization event
            this.dispatchEvent('appInitialized', {
                timestamp: Date.now(),
                version: '1.0.0'
            });
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleError(error);
        }
    }

    /**
     * Initialize core services
     */
    initializeServices() {
        // Initialize state management
        this.appState = new AppState();
        
        // Initialize data service
        this.dataService = new DataService();
        
        // Initialize filter service
        this.filterService = new FilterService();
        
        console.log('Core services initialized');
    }

    /**
     * Load initial data from JSON file with performance optimizations
     */
    async loadData() {
        try {
            this.isLoading = true;
            this.appState.setLoading(true);
            
            console.log('Loading GGUF models data...');
            
            // Configure performance settings based on expected data size
            this.configurePerformanceSettings();
            
            // Load models from JSON file
            const models = await this.dataService.loadModels('./gguf_models.json');
            const lastUpdateTime = this.dataService.getLastUpdateTime();
            
            // Validate engagement metrics for all models
            if (window.EngagementValidation) {
                console.log('🔍 Validating engagement metrics...');
                const validationResults = window.EngagementValidation.batchValidateEngagementMetrics(models);
                console.log(`Engagement validation completed: ${validationResults.validModels}/${validationResults.totalModels} valid models`);
                
                if (validationResults.modelsWithErrors > 0) {
                    console.warn(`⚠️ ${validationResults.modelsWithErrors} models had engagement data errors`);
                }
                if (validationResults.modelsWithWarnings > 0) {
                    console.warn(`⚠️ ${validationResults.modelsWithWarnings} models had engagement data warnings`);
                }
                
                // Use validated models
                models.splice(0, models.length, ...validationResults.validatedModels);
            }
            
            // Build indexes for large datasets
            if (models.length > 1000) {
                console.log('Building search and filter indexes for large dataset...');
                this.filterService.buildIndexes(models);
                
                // Warm up caches with common operations
                this.filterService.warmUpCaches(models);
            }
            
            // Set models in state with default sorting (downloadCount descending)
            this.appState.setModels(models, lastUpdateTime);
            
            // Apply initial filtering and sorting with timeout
            console.log('🔄 Starting initial data processing...');
            setTimeout(() => {
                this.processModelsData();
            }, 100);
            
            console.log(`Successfully loaded ${models.length} models`);
            
            // Log performance statistics
            this.logPerformanceStats();
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.appState.setLoading(false, error.message);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Initialize UI components with performance optimizations
     */
    initializeComponents() {
        try {
            console.log('🧩 Starting component initialization...');
            
            // Initialize SearchFilter component  
            console.log('🔍 Initializing SearchFilter...');
            this.searchFilter = new SearchFilter('filter-controls', this.appState, this.filterService);
            console.log('✅ SearchFilter initialized');
            
            // Initialize ModelGrid component with performance settings
            console.log('📋 Initializing ModelGrid...');
            const gridOptions = {
                cardsPerPage: 60,
                animateCards: true,
                enableBatching: true,
                batchSize: 10,
                enableRecycling: true
            };
            
            // Adjust settings for large datasets
            const state = this.appState.getState();
            if (state.allModels && state.allModels.length > 10000) {
                gridOptions.enableBatching = true;
                gridOptions.batchSize = 20;
                gridOptions.animateCards = false; // Disable animations for better performance
            }
            
            this.modelGrid = new ModelGrid('model-grid', gridOptions);
            console.log('✅ ModelGrid initialized');
            
            // Initialize Pagination component
            console.log('📄 Initializing Pagination...');
            this.pagination = new Pagination('pagination-container', this.appState);
            console.log('✅ Pagination initialized');
            
            // Initialize simple header updates (instead of full Header component)
            console.log('📊 Initializing header updates...');
            this.initializeHeaderUpdates();
            console.log('✅ Header updates initialized');
            
            // Set up periodic memory optimization
            console.log('🧠 Setting up memory optimization...');
            this.setupMemoryOptimization();
            console.log('✅ Memory optimization set up');
            
            console.log('✅ All UI components initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize components:', error);
            console.error('Error details:', error.stack);
            throw error;
        }
    }

    /**
     * Render basic UI without complex components
     */
    renderBasicUI() {
        const state = this.appState.getState();
        const models = state.allModels || [];
        
        // Update model count
        const modelCountDisplay = document.getElementById('model-count-display');
        if (modelCountDisplay) {
            modelCountDisplay.textContent = `${models.length.toLocaleString()} models`;
        }
        
        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `${models.length.toLocaleString()} models available`;
        }
        
        // Render first 20 models in the grid
        const modelGrid = document.getElementById('model-grid');
        if (modelGrid && models.length > 0) {
            const modelsToShow = models.slice(0, 20);
            
            modelGrid.innerHTML = modelsToShow.map((model, index) => `
                <div class="model-card bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <div class="model-card-header flex justify-between items-start mb-4">
                        <div class="model-number bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                            #${index + 1}
                        </div>
                        <div class="download-count flex items-center gap-1 text-sm text-gray-500">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                            </svg>
                            ${this.formatDownloadCount(model.downloadCount)}
                        </div>
                    </div>
                    
                    <div class="model-name-container flex items-start justify-between mb-4">
                        <h3 class="model-name text-lg font-semibold text-gray-900 flex-1 pr-2" title="${model.modelName}">
                            ${this.formatModelName(model.modelName)}
                        </h3>
                        <button class="copy-button opacity-0 hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600" 
                                onclick="this.copyToClipboard('${model.modelName}')" 
                                title="Copy model name">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="model-details grid grid-cols-2 gap-2 text-sm mb-4">
                        <div><span class="text-gray-500">Quantization:</span></div>
                        <div><span class="quantization-badge bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">${model.quantFormat || 'N/A'}</span></div>
                        
                        <div><span class="text-gray-500">File Size:</span></div>
                        <div><span class="font-medium">${model.fileSizeFormatted || 'N/A'}</span></div>
                        
                        <div><span class="text-gray-500">Model Type:</span></div>
                        <div><span class="font-medium">${model.modelType || 'N/A'}</span></div>
                        
                        <div><span class="text-gray-500">License:</span></div>
                        <div><span class="font-medium">${model.license || 'N/A'}</span></div>
                        
                        <div><span class="text-gray-500">Upload Date:</span></div>
                        <div><span class="font-medium">${this.formatUploadDate(model.uploadDate)}</span></div>
                    </div>
                    
                    <div class="model-actions space-y-2">
                        ${model.directDownloadLink ? `
                            <div class="btn-group flex items-center gap-1">
                                <a href="${model.directDownloadLink}" 
                                   class="btn btn-primary flex-1 text-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                   target="_blank" rel="noopener noreferrer">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="inline mr-2">
                                        <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                                    </svg>
                                    Direct Download
                                </a>
                                <button class="copy-button p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors" 
                                        onclick="this.copyToClipboard('${model.directDownloadLink}')" 
                                        title="Copy download link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                        ${model.huggingFaceLink ? `
                            <div class="btn-group flex items-center gap-1">
                                <a href="${model.huggingFaceLink}" 
                                   class="btn btn-secondary flex-1 text-center py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                   target="_blank" rel="noopener noreferrer">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="inline mr-2">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                    HuggingFace
                                </a>
                                <button class="copy-button p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors" 
                                        onclick="this.copyToClipboard('${model.huggingFaceLink}')" 
                                        title="Copy HuggingFace link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
            
            // Add copy functionality
            window.copyToClipboard = async function(text) {
                try {
                    await navigator.clipboard.writeText(text);
                    if (window.notifications) {
                        window.notifications.success('Copied to clipboard!');
                    } else {
                        alert('Copied to clipboard!');
                    }
                } catch (err) {
                    console.error('Failed to copy:', err);
                    if (window.notifications) {
                        window.notifications.error('Failed to copy');
                    } else {
                        alert('Failed to copy');
                    }
                }
            };
        }
    }

    /**
     * Format download count
     */
    formatDownloadCount(count) {
        if (!count || count === 0) return '0';
        if (count >= 1000000000) return (count / 1000000000).toFixed(1) + 'B';
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }

    /**
     * Format model name
     */
    formatModelName(modelName) {
        if (!modelName) return 'Unknown Model';
        if (modelName.length > 50) return modelName.substring(0, 47) + '...';
        return modelName;
    }

    /**
     * Format upload date
     */
    formatUploadDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const uploadDate = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - uploadDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Show relative time for recent uploads
            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays <= 7) {
                return `${diffDays} days ago`;
            } else if (diffDays <= 30) {
                const weeks = Math.floor(diffDays / 7);
                return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
            } else if (diffDays <= 365) {
                const months = Math.floor(diffDays / 30);
                return months === 1 ? '1 month ago' : `${months} months ago`;
            } else {
                const years = Math.floor(diffDays / 365);
                return years === 1 ? '1 year ago' : `${years} years ago`;
            }
        } catch (error) {
            console.error('Error formatting upload date:', error);
            return 'Unknown';
        }
    }

    /**
     * Initialize simple header updates
     */
    initializeHeaderUpdates() {
        // Subscribe to state changes for header updates
        this.appState.subscribe((newState) => {
            this.updateHeaderDisplay(newState);
        }, ['allModels', 'filteredModels', 'lastUpdateTime']);
    }

    /**
     * Update header display elements
     * @param {object} state - Current application state
     */
    updateHeaderDisplay(state) {
        try {
            // Update data timestamp
            const timestampElement = document.getElementById('data-timestamp');
            if (timestampElement && state.lastUpdateTime) {
                const formattedTime = Formatters.formatTimestamp(state.lastUpdateTime);
                timestampElement.textContent = `Last updated: ${formattedTime}`;
            }
            
            // Update engagement statistics
            this.updateEngagementStats(state);
            
        } catch (error) {
            console.error('Error updating header display:', error);
        }
    }

    /**
     * Update engagement statistics in header
     * @param {object} state - Current application state
     */
    updateEngagementStats(state) {
        try {
            const { allModels = [], filteredModels = [] } = state;
            
            // Calculate total likes
            const allTotalLikes = allModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
            const filteredTotalLikes = filteredModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
            
            // Update total likes display
            const totalLikesElement = document.getElementById('total-likes');
            if (totalLikesElement) {
                if (filteredModels.length !== allModels.length) {
                    // Show filtered vs total
                    const formattedFiltered = Formatters.formatEngagementNumber(filteredTotalLikes);
                    const formattedTotal = Formatters.formatEngagementNumber(allTotalLikes);
                    totalLikesElement.textContent = `❤️ ${formattedFiltered} of ${formattedTotal} likes`;
                    totalLikesElement.title = `${filteredTotalLikes.toLocaleString()} likes in filtered results of ${allTotalLikes.toLocaleString()} total likes`;
                } else {
                    // Show total only
                    const formatted = Formatters.formatEngagementNumber(allTotalLikes);
                    totalLikesElement.textContent = `❤️ ${formatted} total likes`;
                    totalLikesElement.title = `${allTotalLikes.toLocaleString()} total likes across all models`;
                }
            }
            
            // Calculate and update average likes
            const modelsToUse = filteredModels.length !== allModels.length ? filteredModels : allModels;
            const avgLikes = modelsToUse.length > 0 ? filteredTotalLikes / modelsToUse.length : 0;
            
            const avgLikesElement = document.getElementById('avg-likes');
            if (avgLikesElement) {
                const formatted = Formatters.formatEngagementNumber(Math.round(avgLikes));
                avgLikesElement.textContent = `Avg: ${formatted} likes`;
                avgLikesElement.title = `Average ${avgLikes.toFixed(1)} likes per model`;
            }
            
            // Update model count with engagement context
            const modelCountElement = document.getElementById('model-count');
            if (modelCountElement) {
                const modelsWithLikes = allModels.filter(model => (model.likeCount || 0) > 0).length;
                
                if (filteredModels.length !== allModels.length) {
                    const filteredWithLikes = filteredModels.filter(model => (model.likeCount || 0) > 0).length;
                    modelCountElement.textContent = `${filteredModels.length} of ${allModels.length} models`;
                    modelCountElement.title = `${filteredWithLikes} models with likes in filtered results, ${modelsWithLikes} total with likes`;
                } else {
                    modelCountElement.textContent = `${allModels.length} models`;
                    modelCountElement.title = `${modelsWithLikes} models have engagement data`;
                }
            }
            
        } catch (error) {
            console.error('Error updating engagement stats:', error);
        }
    }

    /**
     * Set up global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle window resize for responsive updates
        window.addEventListener('resize', 
            Helpers.debounce(() => {
                if (this.modelGrid) {
                    this.modelGrid._updateResponsiveLayout();
                }
            }, 250)
        );
        
        // Handle visibility change for data refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Optionally refresh data when page becomes visible
                this.checkForDataRefresh();
            }
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
        
        // Add keyboard shortcuts help
        this._setupKeyboardShortcutsHelp();
        
        // Handle search input from header
        const searchInput = document.getElementById('model-search');
        if (searchInput) {
            const debouncedSearch = Helpers.debounce((query) => {
                this.appState.setSearchQuery(query);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
        
        // Handle sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [field, direction] = e.target.value.split('-');
                this.appState.setSorting(field, direction || 'desc');
                
                // Add visual indicator for engagement-based sorting
                if (field === 'likeCount') {
                    sortSelect.classList.add('engagement-sort');
                } else {
                    sortSelect.classList.remove('engagement-sort');
                }
            });
        }
        
        console.log('Global event handlers set up');
    }

    /**
     * Handle URL parameters for direct model access
     * Supports URLs like: ?model=model-name-slug
     */
    handleURLParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const modelParam = urlParams.get('model');
            
            if (modelParam) {
                console.log(`🔗 Direct model access requested: ${modelParam}`);
                
                // Set search query to the model name (converted from slug)
                const modelName = this.slugToModelName(modelParam);
                if (modelName) {
                    // Set search query to filter to this specific model
                    this.appState.setSearchQuery(modelName);
                    
                    // Update the search input to show the query
                    const searchInput = document.getElementById('model-search');
                    if (searchInput) {
                        searchInput.value = modelName;
                    }
                    
                    console.log(`✅ Filtered to model: ${modelName}`);
                } else {
                    // If we can't convert the slug, try using it as-is
                    this.appState.setSearchQuery(modelParam.replace(/-/g, ' '));
                    
                    const searchInput = document.getElementById('model-search');
                    if (searchInput) {
                        searchInput.value = modelParam.replace(/-/g, ' ');
                    }
                    
                    console.log(`✅ Searching for: ${modelParam}`);
                }
            }
        } catch (error) {
            console.error('Error handling URL parameters:', error);
        }
    }

    /**
     * Convert URL slug back to model name
     * This is a best-effort conversion since the original casing is lost
     */
    slugToModelName(slug) {
        try {
            // Get all models from state
            const state = this.appState.getState();
            const models = state.allModels || [];
            
            // Find model with matching slug
            const matchingModel = models.find(model => {
                const modelSlug = model.modelName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                return modelSlug === slug;
            });
            
            return matchingModel ? matchingModel.modelName : null;
        } catch (error) {
            console.error('Error converting slug to model name:', error);
            return null;
        }
    }

    /**
     * Set up state change subscription for data processing
     */
    setupStateSubscription() {
        this.appState.subscribe((newState, previousState) => {
            this.handleStateChange(newState, previousState);
        });
    }

    /**
     * Handle state changes and update UI accordingly
     * @param {object} newState - New application state
     * @param {object} previousState - Previous application state
     */
    handleStateChange(newState, previousState) {
        try {
            // Prevent infinite loops by checking if we're already processing
            if (this.isProcessingStateChange) {
                console.log('⚠️ State change already in progress, skipping...');
                return;
            }
            
            this.isProcessingStateChange = true;
            
            console.log('🔄 Handling state change...');
            
            // Check if we need to reprocess the data
            const needsReprocessing = (
                newState.searchQuery !== previousState.searchQuery ||
                JSON.stringify(newState.filters) !== JSON.stringify(previousState.filters) ||
                JSON.stringify(newState.sorting) !== JSON.stringify(previousState.sorting) ||
                newState.allModels.length !== previousState.allModels.length
            );
            
            console.log('🔍 Needs reprocessing:', needsReprocessing);
            
            if (needsReprocessing) {
                this.processModelsData();
            }
            
            // Update sort visual indicator
            this.updateSortVisualIndicator(newState.sorting);
            
            // Update model grid if filtered models or pagination changed
            const needsGridUpdate = (
                newState.filteredModels !== previousState.filteredModels ||
                newState.pagination.currentPage !== previousState.pagination.currentPage
            );
            
            console.log('📋 Needs grid update:', needsGridUpdate);
            
            if (needsGridUpdate) {
                this.updateModelGrid();
            }
            
            // Update results count display
            this.updateResultsDisplay(newState);
            
            console.log('✅ State change handled successfully');
            
        } catch (error) {
            console.error('❌ Error handling state change:', error);
            this.handleError(error);
        } finally {
            // Always reset the processing flag
            this.isProcessingStateChange = false;
        }
    }

    /**
     * Process models data with current filters and sorting
     */
    processModelsData() {
        try {
            console.log('🔄 Processing models data...');
            const state = this.appState.getState();
            const { allModels, searchQuery, filters, sorting } = state;
            
            console.log('📊 State data:', {
                modelsCount: allModels.length,
                searchQuery,
                hasFilters: Object.keys(filters).length > 0,
                sorting
            });
            
            if (allModels.length === 0) {
                console.log('⚠️ No models to process');
                this.appState.updateState({ filteredModels: [] });
                return;
            }
            
            // Apply filters, search, and sorting with error handling
            console.log('🔍 Applying filters...');
            try {
                const processedModels = this.filterService.applyAllFilters(allModels, {
                    searchQuery,
                    filters,
                    sorting
                });
                
                console.log('✅ Processed models:', processedModels.length);
                
                // Update state with processed models
                this.appState.updateState({ filteredModels: processedModels });
                
            } catch (filterError) {
                console.error('❌ Error in filtering, using all models:', filterError);
                // Fallback to all models if filtering fails
                this.appState.updateState({ filteredModels: allModels });
            }
            
        } catch (error) {
            console.error('❌ Error processing models data:', error);
            this.handleError(error);
        }
    }

    /**
     * Update model grid with current page data
     */
    updateModelGrid() {
        try {
            console.log('🔄 Updating model grid...');
            const state = this.appState.getState();
            const { pagination } = state;
            
            // Get models for current page
            const currentPageModels = this.appState.getCurrentPageModels();
            console.log('📄 Current page models:', currentPageModels.length);
            
            // Calculate starting index for sequential numbering
            const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
            
            // Update grid with error handling
            if (this.modelGrid && typeof this.modelGrid.renderCards === 'function') {
                this.modelGrid.renderCards(currentPageModels, startIndex);
                console.log('✅ Model grid updated successfully');
            } else {
                console.warn('⚠️ ModelGrid not available or renderCards method missing');
            }
            
        } catch (error) {
            console.error('❌ Error updating model grid:', error);
            this.handleError(error);
        }
    }

    /**
     * Update results display elements
     * @param {object} state - Current application state
     */
    updateResultsDisplay(state) {
        try {
            // Update results count
            const resultsCount = document.getElementById('results-count');
            if (resultsCount) {
                const { filteredModels, allModels } = state;
                if (filteredModels.length !== allModels.length) {
                    resultsCount.textContent = `Showing ${filteredModels.length.toLocaleString()} of ${allModels.length.toLocaleString()} models`;
                } else {
                    resultsCount.textContent = `${allModels.length.toLocaleString()} models available`;
                }
            }
            
            // Update model count in header
            const modelCountDisplay = document.getElementById('model-count-display');
            if (modelCountDisplay) {
                const { filteredModels, allModels } = state;
                if (filteredModels.length !== allModels.length) {
                    modelCountDisplay.textContent = `${filteredModels.length.toLocaleString()} of ${allModels.length.toLocaleString()} models`;
                } else {
                    modelCountDisplay.textContent = `${allModels.length.toLocaleString()} models`;
                }
            }
            
            // Update active filters display
            this.updateActiveFiltersDisplay(state);
            
        } catch (error) {
            console.error('Error updating results display:', error);
        }
    }

    /**
     * Update active filters display
     * @param {object} state - Current application state
     */
    updateActiveFiltersDisplay(state) {
        const activeFiltersContainer = document.getElementById('active-filters');
        if (!activeFiltersContainer) return;
        
        const activeFilters = state.activeFilters || [];
        
        if (activeFilters.length === 0) {
            activeFiltersContainer.innerHTML = '';
            return;
        }
        
        activeFiltersContainer.innerHTML = activeFilters.map(filter => `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ${filter}
                <button type="button" class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white" onclick="window.app.clearSpecificFilter('${filter}')">
                    <span class="sr-only">Remove filter</span>
                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path stroke-linecap="round" stroke-width="1.5" d="m1 1 6 6m0-6-6 6" />
                    </svg>
                </button>
            </span>
        `).join('');
    }

    /**
     * Handle keyboard shortcuts and navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K to focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.getElementById('model-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape to clear search or close modals
        if (event.key === 'Escape') {
            const searchInput = document.getElementById('model-search');
            if (searchInput && document.activeElement === searchInput) {
                searchInput.value = '';
                this.appState.setSearchQuery('');
                searchInput.blur();
            }
            
            // Close any open tooltips or modals
            document.querySelectorAll('.copy-tooltip').forEach(tooltip => {
                tooltip.style.opacity = '0';
            });
        }
        
        // Ctrl/Cmd + R to refresh data
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            this.refresh();
        }
        
        // Arrow keys for pagination navigation
        if (event.target === document.body || event.target === document.documentElement) {
            switch (event.key) {
                case 'ArrowLeft':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this._navigatePage('prev');
                    }
                    break;
                case 'ArrowRight':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this._navigatePage('next');
                    }
                    break;
                case 'Home':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this._navigatePage('first');
                    }
                    break;
                case 'End':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this._navigatePage('last');
                    }
                    break;
            }
        }
        
        // Number keys for quick page navigation (1-9)
        if (event.key >= '1' && event.key <= '9' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const pageNumber = parseInt(event.key);
            const state = this.appState.getState();
            if (pageNumber <= state.pagination.totalPages) {
                this.appState.setCurrentPage(pageNumber);
            }
        }
        
        // F key to focus filters
        if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const firstFilter = document.querySelector('.filter-select');
            if (firstFilter) {
                firstFilter.focus();
            }
        }
    }

    /**
     * Navigate pagination using keyboard shortcuts
     * @param {string} direction - Navigation direction (prev, next, first, last)
     * @private
     */
    _navigatePage(direction) {
        if (!this.pagination) return;
        
        switch (direction) {
            case 'prev':
                this.pagination.goToPrevious();
                break;
            case 'next':
                this.pagination.goToNext();
                break;
            case 'first':
                this.pagination.goToFirst();
                break;
            case 'last':
                this.pagination.goToLast();
                break;
        }
    }

    /**
     * Check if data needs refreshing
     */
    checkForDataRefresh() {
        const lastUpdate = this.dataService.getLastUpdateTime();
        if (lastUpdate) {
            const hoursSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
            
            // Suggest refresh if data is more than 24 hours old
            if (hoursSinceUpdate > 24) {
                console.log('Data is more than 24 hours old, consider refreshing');
                // Could show a notification here
            }
        }
    }

    /**
     * Clear all filters and search
     */
    clearAllFilters() {
        try {
            // Clear search input
            const searchInput = document.getElementById('model-search');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Clear sort select
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.value = 'downloadCount-desc'; // Reset to default
                sortSelect.classList.remove('engagement-sort');
            }
            
            // Clear filters in state
            this.appState.clearFilters();
            
            // Reset sorting to default
            this.appState.setSorting('downloadCount', 'desc');
            
            console.log('All filters cleared');
            
        } catch (error) {
            console.error('Error clearing filters:', error);
            this.handleError(error);
        }
    }

    /**
     * Clear a specific filter
     * @param {string} filterText - Filter text to remove
     */
    clearSpecificFilter(filterText) {
        // This would need more sophisticated logic to map filter text back to state
        // For now, just clear all filters
        this.clearAllFilters();
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            loadingScreen.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Handle application errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('Application error:', error);
        this.hasError = true;
        
        // Update state with error
        this.appState.setLoading(false, error.message);
        
        // Show error message to user
        this.showErrorMessage(error.message);
        
        // Dispatch error event
        this.dispatchEvent('appError', {
            error: error.message,
            timestamp: Date.now()
        });
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        // Use notification system if available
        if (window.notifications) {
            window.notifications.error(message, 8000);
            return;
        }

        // Fallback to old method
        let errorContainer = document.getElementById('app-error');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'app-error';
            errorContainer.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 max-w-md';
            document.body.appendChild(errorContainer);
        }
        
        errorContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <strong class="font-bold">Error:</strong>
                    <span class="block sm:inline">${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-red-700 hover:text-red-900">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.remove();
            }
        }, 10000);
    }

    /**
     * Dispatch custom application events
     * @param {string} eventType - Event type
     * @param {object} detail - Event detail data
     */
    dispatchEvent(eventType, detail = {}) {
        const event = new CustomEvent(`ggufApp${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: {
                app: this,
                timestamp: Date.now(),
                ...detail
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Update visual indicator for engagement-based sorting
     * @param {object} sorting - Current sorting state
     */
    updateSortVisualIndicator(sorting) {
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect && sorting) {
            if (sorting.field === 'likeCount') {
                sortSelect.classList.add('engagement-sort');
            } else {
                sortSelect.classList.remove('engagement-sort');
            }
        }
    }

    /**
     * Get application statistics
     * @returns {object} Application statistics
     */
    getStats() {
        const state = this.appState ? this.appState.getState() : {};
        
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            hasError: this.hasError,
            totalModels: state.allModels ? state.allModels.length : 0,
            filteredModels: state.filteredModels ? state.filteredModels.length : 0,
            currentPage: state.pagination ? state.pagination.currentPage : 1,
            totalPages: state.pagination ? state.pagination.totalPages : 1,
            lastUpdate: this.dataService ? this.dataService.getLastUpdateTime() : null
        };
    }

    /**
     * Refresh application data
     */
    async refresh() {
        try {
            console.log('Refreshing application data...');
            
            // Show notification about refresh starting
            if (window.notifications) {
                window.notifications.info('Refreshing model data...', 2000);
            }
            
            this.showLoadingScreen();
            
            // Clear cache and reload data
            this.dataService.clearCache();
            await this.loadData();
            
            this.hideLoadingScreen();
            
            console.log('Application data refreshed successfully');
            
            // Show success notification
            if (window.notifications) {
                const state = this.appState.getState();
                const modelCount = state.allModels.length;
                window.notifications.success(`Successfully refreshed ${modelCount.toLocaleString()} models!`);
            }
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.handleError(error);
        }
    }

    /**
     * Configure performance settings based on dataset size and device capabilities
     */
    configurePerformanceSettings() {
        // Detect device capabilities
        const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                              navigator.deviceMemory <= 2;
        
        // Configure DataService performance
        this.dataService.configurePerformance({
            maxCacheSize: isLowEndDevice ? 2 : 5,
            enableCompression: true,
            compressionThreshold: isLowEndDevice ? 5000 : 10000
        });
        
        // Configure FilterService performance
        this.filterService.configurePerformance({
            enableCaching: true,
            maxCacheSize: isLowEndDevice ? 50 : 100,
            batchSize: isLowEndDevice ? 500 : 1000
        });
        
        console.log('Performance settings configured for device capabilities:', {
            isLowEndDevice,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory
        });
    }

    /**
     * Set up periodic memory optimization
     */
    setupMemoryOptimization() {
        // Run memory optimization every 5 minutes
        this.memoryOptimizationInterval = setInterval(() => {
            this.optimizeMemory();
        }, 5 * 60 * 1000);
        
        // Also run on visibility change (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.optimizeMemory(), 1000);
            }
        });
    }

    /**
     * Optimize memory usage across all components
     */
    optimizeMemory() {
        console.log('Running application-wide memory optimization...');
        
        try {
            // Optimize DataService memory
            if (this.dataService) {
                this.dataService.optimizeMemory();
            }
            
            // Clear FilterService caches if they're getting large
            if (this.filterService) {
                const stats = this.filterService.getPerformanceStats();
                if (stats.searchCacheSize + stats.filterCacheSize + stats.sortCacheSize > 200) {
                    this.filterService.clearCaches();
                    console.log('FilterService caches cleared due to size');
                }
            }
            
            // Optimize ModelGrid memory
            if (this.modelGrid) {
                this.modelGrid.optimizeMemory();
            }
            
            console.log('Memory optimization complete');
            
        } catch (error) {
            console.error('Error during memory optimization:', error);
        }
    }

    /**
     * Log performance statistics
     */
    logPerformanceStats() {
        const stats = {
            app: this.getStats(),
            dataService: this.dataService ? this.dataService.getPerformanceStats() : null,
            filterService: this.filterService ? this.filterService.getPerformanceStats() : null,
            modelGrid: this.modelGrid ? this.modelGrid.getPerformanceStats() : null
        };
        
        console.log('Application Performance Statistics:', stats);
        
        // Warn about potential performance issues
        if (stats.dataService && stats.dataService.averageLoadTime > 5000) {
            console.warn('Data loading is slow (>5s), consider optimizing data source');
        }
        
        if (stats.app.totalModels > 50000) {
            console.warn('Large dataset detected, performance optimizations are active');
        }
    }

    /**
     * Get detailed performance metrics
     * @returns {object} Detailed performance metrics
     */
    getDetailedStats() {
        return {
            application: this.getStats(),
            dataService: this.dataService ? this.dataService.getPerformanceStats() : null,
            filterService: this.filterService ? this.filterService.getPerformanceStats() : null,
            modelGrid: this.modelGrid ? this.modelGrid.getPerformanceStats() : null,
            memory: {
                usedJSHeapSize: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
                totalJSHeapSize: performance.memory ? performance.memory.totalJSHeapSize : 'N/A',
                jsHeapSizeLimit: performance.memory ? performance.memory.jsHeapSizeLimit : 'N/A'
            },
            timing: {
                navigationStart: performance.timing ? performance.timing.navigationStart : 'N/A',
                loadEventEnd: performance.timing ? performance.timing.loadEventEnd : 'N/A',
                domContentLoadedEventEnd: performance.timing ? performance.timing.domContentLoadedEventEnd : 'N/A'
            }
        };
    }

    /**
     * Setup keyboard shortcuts help modal
     * @private
     */
    _setupKeyboardShortcutsHelp() {
        // Add help trigger (? key)
        document.addEventListener('keydown', (event) => {
            if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                // Only show help if not typing in an input
                if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
                    event.preventDefault();
                    this._showKeyboardShortcutsModal();
                }
            }
        });
    }

    /**
     * Show keyboard shortcuts help modal
     * @private
     */
    _showKeyboardShortcutsModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('keyboard-shortcuts-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'keyboard-shortcuts-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-slideUp">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
                    <button class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onclick="this.closest('#keyboard-shortcuts-modal').remove()">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Search models</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+K</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Focus filters</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+F</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Previous page</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+←</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Next page</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+→</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">First page</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+Home</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Last page</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+End</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Go to page (1-9)</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+1-9</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Copy model name</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+C</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Refresh data</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+R</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Show this help</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">?</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Close/Cancel</span>
                        <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
                    </div>
                </div>
                <div class="mt-6 text-center">
                    <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" onclick="this.closest('#keyboard-shortcuts-modal').remove()">
                        Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Focus the close button for accessibility
        setTimeout(() => {
            const closeButton = modal.querySelector('button');
            if (closeButton) closeButton.focus();
        }, 100);
    }

    /**
     * Enhanced loading screen with progress indication
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.setAttribute('aria-hidden', 'false');
            
            // Add enhanced loading content
            loadingScreen.innerHTML = `
                <div class="text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p class="text-gray-600 mb-2">Loading GGUF Model Index...</p>
                    <div class="w-64 bg-gray-200 rounded-full h-2 mb-4">
                        <div class="bg-blue-600 h-2 rounded-full loading-progress" style="width: 0%"></div>
                    </div>
                    <p class="text-sm text-gray-500" id="loading-status">Initializing...</p>
                </div>
            `;
            
            // Simulate progress
            this._simulateLoadingProgress();
        }
    }

    /**
     * Simulate loading progress for better UX
     * @private
     */
    _simulateLoadingProgress() {
        const progressBar = document.querySelector('.loading-progress');
        const statusText = document.getElementById('loading-status');
        
        if (!progressBar || !statusText) return;

        const steps = [
            { progress: 20, text: 'Loading data service...' },
            { progress: 40, text: 'Fetching model data...' },
            { progress: 60, text: 'Processing models...' },
            { progress: 80, text: 'Initializing components...' },
            { progress: 100, text: 'Ready!' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                progressBar.style.width = `${step.progress}%`;
                statusText.textContent = step.text;
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 300);

        // Store interval reference for cleanup
        this._loadingProgressInterval = interval;
    }

    /**
     * Hide loading screen with fade out animation
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            // Clear progress interval
            if (this._loadingProgressInterval) {
                clearInterval(this._loadingProgressInterval);
                this._loadingProgressInterval = null;
            }
            
            // Fade out animation
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.3s ease-out';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loadingScreen.setAttribute('aria-hidden', 'true');
                loadingScreen.style.opacity = '';
                loadingScreen.style.transition = '';
            }, 300);
        }
    }

    /**
     * Destroy the application and clean up resources
     */
    destroy() {
        try {
            console.log('Destroying GGUF Model Discovery App...');
            
            // Clear memory optimization interval
            if (this.memoryOptimizationInterval) {
                clearInterval(this.memoryOptimizationInterval);
                this.memoryOptimizationInterval = null;
            }
            
            // Clear loading progress interval
            if (this._loadingProgressInterval) {
                clearInterval(this._loadingProgressInterval);
                this._loadingProgressInterval = null;
            }
            
            // Note: Header updates are handled via state subscription, no component to destroy
            
            if (this.searchFilter) {
                this.searchFilter.destroy();
                this.searchFilter = null;
            }
            
            if (this.modelGrid) {
                this.modelGrid.destroy();
                this.modelGrid = null;
            }
            
            if (this.pagination) {
                this.pagination.destroy();
                this.pagination = null;
            }
            
            // Clear services
            if (this.dataService) {
                this.dataService.clearCache();
                this.dataService = null;
            }
            
            if (this.filterService) {
                this.filterService.clearCaches();
                this.filterService = null;
            }
            
            this.appState = null;
            
            // Remove event listeners
            document.removeEventListener('keydown', this.handleKeyboardShortcuts);
            
            // Reset state
            this.isInitialized = false;
            this.isLoading = false;
            this.hasError = false;
            
            // Final memory optimization
            this.optimizeMemory();
            
            console.log('Application destroyed successfully');
            
        } catch (error) {
            console.error('Error destroying application:', error);
        }
    }
}

// Initialize the application and make it globally available
window.app = new GGUFModelApp();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GGUFModelApp;
}