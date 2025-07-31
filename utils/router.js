/**
 * Simple Client-Side Router for SEO-friendly URLs
 * Handles routing for model pages, family pages, and search
 */

export class Router {
    constructor(app) {
        this.app = app;
        this.routes = new Map();
        this.currentRoute = null;
        
        // Initialize router
        this.setupRoutes();
        this.bindEvents();
        this.handleInitialRoute();
    }

    /**
     * Setup route patterns
     */
    setupRoutes() {
        this.routes.set(/^\/model\/([^\/]+)$/, this.handleModelRoute.bind(this));
        this.routes.set(/^\/family\/([^\/]+)$/, this.handleFamilyRoute.bind(this));
        this.routes.set(/^\/search$/, this.handleSearchRoute.bind(this));
        this.routes.set(/^\/$/, this.handleHomeRoute.bind(this));
    }

    /**
     * Bind browser events
     */
    bindEvents() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.handleRoute(window.location.pathname + window.location.search);
        });

        // Handle internal link clicks
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href^="/"]');
            if (link && !link.target && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.navigate(link.href);
            }
        });
    }

    /**
     * Handle initial page load route
     */
    handleInitialRoute() {
        const path = window.location.pathname + window.location.search;
        this.handleRoute(path, false);
    }

    /**
     * Navigate to a new route
     * @param {string} url - URL to navigate to
     */
    navigate(url) {
        const path = new URL(url, window.location.origin).pathname + 
                    new URL(url, window.location.origin).search;
        
        if (path !== window.location.pathname + window.location.search) {
            window.history.pushState({}, '', url);
            this.handleRoute(path);
        }
    }

    /**
     * Handle route matching and execution
     * @param {string} path - Path to handle
     * @param {boolean} updateHistory - Whether to update browser history
     */
    handleRoute(path, updateHistory = true) {
        const pathname = path.split('?')[0];
        
        for (const [pattern, handler] of this.routes) {
            const match = pathname.match(pattern);
            if (match) {
                this.currentRoute = { pattern, handler, match, path };
                handler(match, path);
                return;
            }
        }
        
        // No route matched - handle as 404
        this.handle404(path);
    }

    /**
     * Handle home route
     */
    handleHomeRoute(match, path) {
        // Default behavior - show all models
        this.app.clearFilters();
        
        // Update SEO for home page
        document.title = 'GGUF Model Discovery - Browse & Download AI Models | GGUF Index';
        
        // Update breadcrumbs
        if (this.app.seoManager) {
            const breadcrumbs = [
                { name: 'Home', url: '/' },
                { name: 'GGUF Models' }
            ];
            this.app.seoManager.updateBreadcrumbs(breadcrumbs);
        }
    }

    /**
     * Handle model detail route
     * @param {Array} match - Regex match results
     * @param {string} path - Full path
     */
    handleModelRoute(match, path) {
        const modelSlug = match[1];
        const modelId = this.slugToModelId(modelSlug);
        
        // Find the model in the loaded data
        const model = this.app.allModels.find(m => m.id === modelId || m.modelId === modelId);
        
        if (model) {
            this.showModelDetail(model);
        } else {
            this.handle404(path);
        }
    }

    /**
     * Handle family route
     * @param {Array} match - Regex match results
     * @param {string} path - Full path
     */
    handleFamilyRoute(match, path) {
        const familySlug = match[1];
        const family = familySlug.replace(/-/g, ' ');
        
        // Filter models by family
        const familyModels = this.app.allModels.filter(model => {
            const modelFamily = (model.family || model.modelId?.split('/')[0] || '').toLowerCase();
            return modelFamily === family.toLowerCase();
        });
        
        if (familyModels.length > 0) {
            this.showFamilyModels(family, familyModels);
        } else {
            this.handle404(path);
        }
    }

    /**
     * Handle search route
     * @param {Array} match - Regex match results
     * @param {string} path - Full path
     */
    handleSearchRoute(match, path) {
        const urlParams = new URLSearchParams(path.split('?')[1] || '');
        const query = urlParams.get('q') || '';
        
        // Set search query and perform search
        if (query) {
            this.app.searchQuery = query;
            const searchInput = document.getElementById('model-search');
            if (searchInput) {
                searchInput.value = query;
            }
            this.app.performSearch(query);
        }
    }

    /**
     * Show model detail view
     * @param {Object} model - Model data
     */
    showModelDetail(model) {
        // Update SEO for model page
        if (this.app.updateModelSEO) {
            this.app.updateModelSEO(model);
        }
        
        // Create model detail view
        this.renderModelDetail(model);
    }

    /**
     * Show family models view
     * @param {string} family - Family name
     * @param {Array} models - Models in family
     */
    showFamilyModels(family, models) {
        // Update SEO for family page
        if (this.app.updateFamilySEO) {
            this.app.updateFamilySEO(family, models.length);
        }
        
        // Filter app to show only family models
        this.app.filteredModels = models;
        this.app.renderModels();
        
        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `${models.length} models from ${family}`;
        }
    }

    /**
     * Render model detail page
     * @param {Object} model - Model data
     */
    renderModelDetail(model) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        const modelSlug = this.modelIdToSlug(model.id || model.modelId);
        
        mainContent.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div class="p-6">
                        <div class="flex items-start justify-between mb-6">
                            <div>
                                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                                    ${model.name || model.id || model.modelId}
                                </h1>
                                <p class="text-lg text-gray-600 mb-4">
                                    ${model.description || `GGUF quantized AI model from ${model.family || 'Hugging Face'}`}
                                </p>
                                <div class="flex items-center space-x-4 text-sm text-gray-500">
                                    <span>👥 ${(model.downloads || 0).toLocaleString()} downloads</span>
                                    <span>🏗️ ${model.architecture || 'Unknown'} architecture</span>
                                    <span>📦 ${model.family || 'Unknown'} family</span>
                                </div>
                            </div>
                            <a href="/" class="btn-secondary">← Back to Models</a>
                        </div>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h2 class="text-xl font-semibold text-gray-900 mb-4">Available Files</h2>
                                <div class="space-y-3">
                                    ${(model.files || []).map(file => `
                                        <div class="border border-gray-200 rounded-lg p-4">
                                            <div class="flex items-center justify-between mb-2">
                                                <h3 class="font-medium text-gray-900">${file.filename}</h3>
                                                <span class="text-sm text-gray-500">${file.size || 'Unknown size'}</span>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    ${file.quantization || 'Unknown'}
                                                </span>
                                                <a href="${file.downloadUrl}" 
                                                   class="btn-primary btn-sm"
                                                   target="_blank" 
                                                   rel="noopener noreferrer">
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div>
                                <h2 class="text-xl font-semibold text-gray-900 mb-4">Model Information</h2>
                                <dl class="space-y-3">
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500">Model ID</dt>
                                        <dd class="text-sm text-gray-900">${model.id || model.modelId}</dd>
                                    </div>
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500">Architecture</dt>
                                        <dd class="text-sm text-gray-900">${model.architecture || 'Unknown'}</dd>
                                    </div>
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500">Family</dt>
                                        <dd class="text-sm text-gray-900">${model.family || 'Unknown'}</dd>
                                    </div>
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500">Total Size</dt>
                                        <dd class="text-sm text-gray-900">${this.formatBytes(model.totalSize || 0)}</dd>
                                    </div>
                                    <div>
                                        <dt class="text-sm font-medium text-gray-500">Available Quantizations</dt>
                                        <dd class="text-sm text-gray-900">
                                            <div class="flex flex-wrap gap-1 mt-1">
                                                ${(model.quantizations || []).map(q => `
                                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                        ${q}
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </dd>
                                    </div>
                                    ${model.tags && model.tags.length > 0 ? `
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Tags</dt>
                                            <dd class="text-sm text-gray-900">
                                                <div class="flex flex-wrap gap-1 mt-1">
                                                    ${model.tags.map(tag => `
                                                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            ${tag}
                                                        </span>
                                                    `).join('')}
                                                </div>
                                            </dd>
                                        </div>
                                    ` : ''}
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Handle 404 errors
     * @param {string} path - Path that wasn't found
     */
    handle404(path) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <div class="text-6xl mb-4">🤖</div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <p class="text-lg text-gray-600 mb-8">
                        The page you're looking for doesn't exist or the model couldn't be found.
                    </p>
                    <a href="/" class="btn-primary">← Back to Models</a>
                </div>
            `;
        }
        
        // Update page title
        document.title = 'Page Not Found | GGUF Model Discovery';
    }

    /**
     * Convert model ID to URL slug
     * @param {string} modelId - Model ID
     * @returns {string} URL slug
     */
    modelIdToSlug(modelId) {
        return modelId.replace('/', '--').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    }

    /**
     * Convert URL slug back to model ID
     * @param {string} slug - URL slug
     * @returns {string} Model ID
     */
    slugToModelId(slug) {
        return slug.replace('--', '/');
    }



    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}