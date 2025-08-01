/**
 * Premium GGUF Model Discovery Application
 * Business-class interface with enhanced model cards and professional styling
 */

class PremiumGGUFApp {
    constructor() {
        this.models = [];
        this.filteredModels = [];
        this.currentPage = 1;
        this.itemsPerPage = 48; // More items per page with smaller cards
        this.isLoading = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadModels = this.loadModels.bind(this);
        this.renderModels = this.renderModels.bind(this);
        this.createPremiumModelCard = this.createPremiumModelCard.bind(this);
        
        // Auto-initialize
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Premium GGUF Discovery...');
            
            // Check if required utilities are available
            if (typeof Helpers === 'undefined') {
                throw new Error('Helpers utility not loaded');
            }
            if (typeof Formatters === 'undefined') {
                throw new Error('Formatters utility not loaded');
            }
            console.log('✅ Utilities loaded successfully');
            
            // Show loading screen
            this.showLoadingScreen();
            console.log('✅ Loading screen shown');
            
            // Load models data
            await this.loadModels();
            console.log('✅ Models loaded successfully');
            
            // Setup event handlers
            this.setupEventHandlers();
            console.log('✅ Event handlers set up');
            
            // Setup GGUF Loader branding
            this.setupGGUFBranding();
            console.log('✅ GGUF Loader branding set up');
            
            // Initial render
            this.renderModels();
            console.log('✅ Models rendered');
            
            // Hide loading screen
            this.hideLoadingScreen();
            console.log('✅ Loading screen hidden');
            
            console.log('🎉 Premium GGUF Discovery initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Premium GGUF App:', error);
            console.error('Error stack:', error.stack);
            this.showError(error.message);
        }
    }
    
    async loadModels() {
        try {
            console.log('📊 Loading models data...');
            
            const response = await fetch('./gguf_models.json');
            console.log('📡 Fetch response:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📋 Raw data loaded:', data.length, 'items');
            
            if (!Array.isArray(data)) {
                throw new Error('Data is not an array');
            }
            
            if (data.length === 0) {
                throw new Error('No models found in data');
            }
            
            this.models = data;
            this.filteredModels = [...data];
            
            // Sort by like count (most liked first)
            this.filteredModels.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
            console.log('🔄 Models sorted by like count');
            
            // Update header stats
            this.updateHeaderStats();
            console.log('📊 Header stats updated');
            
            console.log(`✅ Successfully loaded ${this.models.length} models`);
            
        } catch (error) {
            console.error('❌ Error loading models:', error);
            throw error;
        }
    }
    
    updateHeaderStats() {
        const modelCountDisplay = document.getElementById('model-count-display');
        const timestampDisplay = document.getElementById('data-timestamp');
        
        if (modelCountDisplay) {
            modelCountDisplay.textContent = `${this.models.length.toLocaleString()}`;
        }
        
        if (timestampDisplay) {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            timestampDisplay.textContent = now.toLocaleDateString('en-US', options);
        }
        
        // Update loading screen stats
        const loadingModelCount = document.getElementById('loading-model-count');
        if (loadingModelCount) {
            loadingModelCount.textContent = `${this.models.length.toLocaleString()}+`;
        }
    }
    
    renderModels() {
        console.log('🎨 Starting to render models...');
        
        const modelGrid = document.getElementById('model-grid');
        if (!modelGrid) {
            console.error('❌ Model grid element not found');
            return;
        }
        console.log('✅ Model grid element found');
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentPageModels = this.filteredModels.slice(startIndex, endIndex);
        
        console.log(`📄 Pagination: Page ${this.currentPage}, showing ${currentPageModels.length} models (${startIndex}-${endIndex})`);
        
        // Clear existing content
        modelGrid.innerHTML = '';
        
        if (currentPageModels.length === 0) {
            console.log('⚠️ No models to display');
            modelGrid.innerHTML = `
                <div class="premium-loading-container">
                    <div style="text-align: center; color: var(--neutral-600);">
                        <h3>No models found</h3>
                        <p>Try adjusting your search or filter criteria.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Render model cards
        console.log(`🃏 Creating ${currentPageModels.length} model cards...`);
        currentPageModels.forEach((model, index) => {
            const globalIndex = startIndex + index + 1;
            try {
                const cardElement = this.createPremiumModelCard(model, globalIndex);
                modelGrid.appendChild(cardElement);
                console.log(`✅ Card ${globalIndex} created: ${model.modelName}`);
            } catch (error) {
                console.error(`❌ Error creating card ${globalIndex}:`, error);
            }
        });
        
        // Update results count
        this.updateResultsCount();
        console.log('📊 Results count updated');
        
        // Render pagination
        this.renderPagination();
        console.log('📄 Pagination rendered');
        
        console.log('🎉 Model rendering completed successfully!');
    }
    
    createPremiumModelCard(model, sequentialNumber) {
        const card = document.createElement('div');
        card.className = 'premium-model-card';
        card.setAttribute('data-model-id', sequentialNumber);
        
        // Determine popularity level
        const downloadCount = model.downloadCount || 0;
        let popularityLevel = '';
        let popularityColor = '';
        
        if (downloadCount > 1000000) {
            popularityLevel = '🔥 Trending';
            popularityColor = 'var(--error-500)';
        } else if (downloadCount > 100000) {
            popularityLevel = '⭐ Popular';
            popularityColor = 'var(--warning-500)';
        } else if (downloadCount > 10000) {
            popularityLevel = '📈 Rising';
            popularityColor = 'var(--success-500)';
        }
        
        // Generate model description based on type and quantization
        const description = this.generateModelDescription(model);
        
        card.innerHTML = `
            <div class="model-card-header">
                <div class="model-number-badge">
                    #${sequentialNumber}
                </div>
                <div class="download-stats">
                    <div class="download-count">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        ${this.formatDownloadCount(downloadCount)}
                    </div>
                    <div class="like-count">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        ${this.formatEngagementCount(model.likeCount || 0)}
                    </div>
                    ${popularityLevel ? `
                        <div class="popularity-indicator" style="color: ${popularityColor}">
                            ${popularityLevel}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="model-title-section">
                <h3 class="model-name" title="${model.modelName}">
                    ${this.formatModelName(model.modelName)}
                </h3>
                <p class="model-description">
                    ${description}
                </p>
            </div>
            
            <div class="model-metadata">
                <div class="metadata-item">
                    <div class="metadata-label">Quantization</div>
                    <div class="metadata-value">
                        <span class="quantization-badge">
                            ${model.quantFormat || 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="metadata-item">
                    <div class="metadata-label">File Size</div>
                    <div class="metadata-value">
                        <div class="file-size-display">
                            <svg class="size-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            ${model.fileSizeFormatted || this.formatFileSize(model.fileSize)}
                        </div>
                    </div>
                </div>
                
                <div class="metadata-item">
                    <div class="metadata-label">Model Type</div>
                    <div class="metadata-value">
                        ${this.formatModelType(model.modelType)}
                    </div>
                </div>
                
                <div class="metadata-item">
                    <div class="metadata-label">License</div>
                    <div class="metadata-value" title="${model.license}">
                        ${this.formatLicense(model.license)}
                    </div>
                </div>
            </div>
            
            <div class="model-actions">
                ${this.generateActionButtons(model)}
            </div>
        `;
        
        // Add event listeners
        this.addCardEventListeners(card, model);
        
        return card;
    }
    
    generateModelDescription(model) {
        const type = model.modelType || 'AI Model';
        const quant = model.quantFormat || 'Standard';
        const size = model.fileSizeFormatted || 'Unknown size';
        
        const descriptions = [
            `High-performance ${type.toLowerCase()} optimized with ${quant} quantization for efficient deployment.`,
            `Professional-grade ${type.toLowerCase()} featuring ${quant} compression technology.`,
            `Enterprise-ready ${type.toLowerCase()} with ${quant} quantization for optimal performance.`,
            `Advanced ${type.toLowerCase()} utilizing ${quant} quantization for production environments.`,
            `State-of-the-art ${type.toLowerCase()} with ${quant} optimization for scalable applications.`
        ];
        
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    generateActionButtons(model) {
        let buttons = '';
        
        if (model.directDownloadLink) {
            buttons += `
                <div class="action-group">
                    <a href="${model.directDownloadLink}" 
                       class="premium-btn btn-primary" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       data-action="direct-download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Direct Download
                    </a>
                    <button class="copy-btn" 
                            data-copy-text="${model.directDownloadLink}" 
                            title="Copy download link"
                            aria-label="Copy download link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        if (model.huggingFaceLink) {
            buttons += `
                <div class="action-group">
                    <a href="${model.huggingFaceLink}" 
                       class="premium-btn btn-secondary" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       data-action="huggingface">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                        </svg>
                        View on HuggingFace
                    </a>
                    <button class="copy-btn" 
                            data-copy-text="${model.huggingFaceLink}" 
                            title="Copy HuggingFace link"
                            aria-label="Copy HuggingFace link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        if (!buttons) {
            buttons = `
                <div class="action-group">
                    <button class="premium-btn btn-secondary" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        No Downloads Available
                    </button>
                </div>
            `;
        }
        
        return buttons;
    }
    
    addCardEventListeners(card, model) {
        // Copy button functionality
        const copyButtons = card.querySelectorAll('.copy-btn');
        copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const textToCopy = button.dataset.copyText;
                if (textToCopy) {
                    try {
                        await navigator.clipboard.writeText(textToCopy);
                        this.showNotification('Copied to clipboard!', 'success');
                        
                        // Visual feedback
                        button.style.background = 'var(--success-100)';
                        button.style.color = 'var(--success-700)';
                        
                        setTimeout(() => {
                            button.style.background = '';
                            button.style.color = '';
                        }, 2000);
                        
                    } catch (error) {
                        this.showNotification('Failed to copy', 'error');
                    }
                }
            });
        });
        
        // Download tracking
        const downloadLinks = card.querySelectorAll('[data-action]');
        downloadLinks.forEach(link => {
            link.addEventListener('click', () => {
                const action = link.dataset.action;
                console.log(`Download tracked: ${model.modelName} via ${action}`);
                
                // Add download animation
                link.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    link.style.transform = '';
                }, 150);
            });
        });
        
        // Card hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    }
    
    setupEventHandlers() {
        // Populate filter options
        this.populateFilterOptions();
        
        // Mobile header toggle
        this.setupMobileHeaderToggle();
        
        // Search functionality
        const searchInput = document.getElementById('model-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
            
            // Keyboard shortcut (Cmd/Ctrl + K)
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                    // Auto-expand header on mobile if collapsed
                    this.expandMobileHeader();
                }
            });
        }
        
        // Sort functionality
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSort(e.target.value);
            });
        }
        
        // Filter functionality
        const quantizationFilter = document.getElementById('quantization-filter');
        if (quantizationFilter) {
            quantizationFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        const modelTypeFilter = document.getElementById('model-type-filter');
        if (modelTypeFilter) {
            modelTypeFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter) {
            licenseFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        // Clear filters
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }
    
    handleSearch(query, resetFilters = true) {
        let baseModels = this.models;
        
        // If not resetting filters, apply current filter state first
        if (!resetFilters) {
            const quantizationFilter = document.getElementById('quantization-filter');
            const modelTypeFilter = document.getElementById('model-type-filter');
            const licenseFilter = document.getElementById('license-filter');
            
            const selectedQuantization = quantizationFilter ? quantizationFilter.value : 'all';
            const selectedModelType = modelTypeFilter ? modelTypeFilter.value : 'all';
            const selectedLicense = licenseFilter ? licenseFilter.value : 'all';
            
            baseModels = this.models.filter(model => {
                if (selectedQuantization !== 'all' && model.quantFormat !== selectedQuantization) {
                    return false;
                }
                if (selectedModelType !== 'all' && model.modelType !== selectedModelType) {
                    return false;
                }
                if (selectedLicense !== 'all' && model.license !== selectedLicense) {
                    return false;
                }
                return true;
            });
        }
        
        if (!query.trim()) {
            this.filteredModels = [...baseModels];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredModels = baseModels.filter(model => 
                (model.modelName && model.modelName.toLowerCase().includes(lowerQuery)) ||
                (model.quantFormat && model.quantFormat.toLowerCase().includes(lowerQuery)) ||
                (model.modelType && model.modelType.toLowerCase().includes(lowerQuery)) ||
                (model.license && model.license.toLowerCase().includes(lowerQuery))
            );
        }
        
        this.currentPage = 1;
        this.renderModels();
    }
    
    handleSort(sortValue) {
        const [field, direction] = sortValue.split('-');
        
        this.filteredModels.sort((a, b) => {
            let aVal = a[field] || 0;
            let bVal = b[field] || 0;
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        this.currentPage = 1;
        this.renderModels();
    }
    
    populateFilterOptions() {
        // Get unique values for filters
        const quantizations = [...new Set(this.models.map(m => m.quantFormat).filter(q => q && q !== 'Unknown'))].sort();
        const modelTypes = [...new Set(this.models.map(m => m.modelType).filter(t => t && t !== 'Unknown'))].sort();
        const licenses = [...new Set(this.models.map(m => m.license).filter(l => l && l !== 'Not specified'))].sort();
        
        // Populate quantization filter
        const quantizationFilter = document.getElementById('quantization-filter');
        if (quantizationFilter) {
            quantizations.forEach(quant => {
                const option = document.createElement('option');
                option.value = quant;
                option.textContent = quant;
                quantizationFilter.appendChild(option);
            });
        }
        
        // Populate model type filter
        const modelTypeFilter = document.getElementById('model-type-filter');
        if (modelTypeFilter) {
            modelTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                modelTypeFilter.appendChild(option);
            });
        }
        
        // Populate license filter
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter) {
            licenses.forEach(license => {
                const option = document.createElement('option');
                option.value = license;
                option.textContent = license.length > 20 ? license.substring(0, 17) + '...' : license;
                licenseFilter.appendChild(option);
            });
        }
        
        console.log('✅ Filter options populated');
    }
    
    handleFilter() {
        const quantizationFilter = document.getElementById('quantization-filter');
        const modelTypeFilter = document.getElementById('model-type-filter');
        const licenseFilter = document.getElementById('license-filter');
        
        const selectedQuantization = quantizationFilter ? quantizationFilter.value : 'all';
        const selectedModelType = modelTypeFilter ? modelTypeFilter.value : 'all';
        const selectedLicense = licenseFilter ? licenseFilter.value : 'all';
        
        this.filteredModels = this.models.filter(model => {
            if (selectedQuantization !== 'all' && model.quantFormat !== selectedQuantization) {
                return false;
            }
            if (selectedModelType !== 'all' && model.modelType !== selectedModelType) {
                return false;
            }
            if (selectedLicense !== 'all' && model.license !== selectedLicense) {
                return false;
            }
            return true;
        });
        
        // Apply current search if any
        const searchInput = document.getElementById('model-search');
        if (searchInput && searchInput.value.trim()) {
            this.handleSearch(searchInput.value, false); // Don't reset filters
            return;
        }
        
        this.currentPage = 1;
        this.renderModels();
    }
    
    clearAllFilters() {
        // Reset search
        const searchInput = document.getElementById('model-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Reset sort
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.value = 'likeCount-desc';
        }
        
        // Reset filters
        const quantizationFilter = document.getElementById('quantization-filter');
        if (quantizationFilter) {
            quantizationFilter.value = 'all';
        }
        
        const modelTypeFilter = document.getElementById('model-type-filter');
        if (modelTypeFilter) {
            modelTypeFilter.value = 'all';
        }
        
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter) {
            licenseFilter.value = 'all';
        }
        
        // Reset data
        this.filteredModels = [...this.models];
        this.filteredModels.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        this.currentPage = 1;
        this.renderModels();
        
        this.showNotification('Filters cleared', 'info');
    }
    
    setupGGUFBranding() {
        const banner = document.getElementById('gguf-banner');
        if (!banner) return;
        
        let lastScrollY = window.scrollY;
        let isScrollingDown = false;
        let scrollTimeout;
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Determine scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down and past threshold
                if (!isScrollingDown) {
                    isScrollingDown = true;
                    banner.classList.add('hidden');
                }
            } else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
                // Scrolling up or near top
                if (isScrollingDown) {
                    isScrollingDown = false;
                    banner.classList.remove('hidden');
                }
            }
            
            lastScrollY = currentScrollY;
            
            // Clear any existing timeout
            clearTimeout(scrollTimeout);
            
            // Show banner after scroll stops for better UX
            scrollTimeout = setTimeout(() => {
                if (currentScrollY <= 50) {
                    banner.classList.remove('hidden');
                }
            }, 150);
        };
        
        // Throttle scroll events for better performance
        let ticking = false;
        const throttledScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', throttledScroll, { passive: true });
        
        console.log('✅ GGUF Loader banner scroll behavior initialized');
    }
    
    updateResultsCount() {
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            const total = this.filteredModels.length;
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, total);
            
            if (total === this.models.length) {
                resultsCount.textContent = `${total.toLocaleString()} premium models`;
            } else {
                resultsCount.textContent = `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${total.toLocaleString()} models`;
            }
        }
    }
    
    renderPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(this.filteredModels.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination-nav">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.currentPage - 1}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,18 9,12 15,6"/>
                    </svg>
                    Previous
                </button>
            `;
        }
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.currentPage + 1}">
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9,18 15,12 9,6"/>
                    </svg>
                </button>
            `;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Add event listeners
        const paginationBtns = paginationContainer.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderModels();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
    
    // Utility methods
    formatDownloadCount(count) {
        if (!count || count === 0) return '0';
        if (count >= 1000000000) return (count / 1000000000).toFixed(1) + 'B';
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }
    
    formatEngagementCount(count) {
        if (!count || count === 0) return '0';
        if (count >= 1000000) return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'K';
        return count.toString();
    }
    
    formatModelName(name) {
        if (!name) return 'Unknown Model';
        return name.length > 60 ? name.substring(0, 57) + '...' : name;
    }
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }
    
    formatModelType(type) {
        return type && type !== 'Unknown' ? type : 'AI Model';
    }
    
    formatLicense(license) {
        if (!license || license === 'Not specified') return 'Open Source';
        return license.length > 15 ? license.substring(0, 12) + '...' : license;
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div style="text-align: center; color: white;">
                        <h2>Error Loading Models</h2>
                        <p>${message}</p>
                        <button onclick="location.reload()" 
                                style="background: white; color: var(--primary-600); border: none; padding: var(--space-3) var(--space-6); border-radius: var(--radius-lg); font-weight: 600; cursor: pointer; margin-top: var(--space-4);">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    setupMobileHeaderToggle() {
        const toggleBtn = document.getElementById('mobile-header-toggle');
        const headerContent = document.getElementById('header-content');
        
        if (!toggleBtn || !headerContent) return;
        
        let isExpanded = false;
        
        toggleBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                headerContent.classList.remove('collapsed');
                headerContent.classList.add('expanded');
                toggleBtn.classList.add('active');
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                headerContent.classList.remove('expanded');
                headerContent.classList.add('collapsed');
                toggleBtn.classList.remove('active');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Initialize as collapsed on mobile
        if (window.innerWidth <= 768) {
            headerContent.classList.add('collapsed');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Desktop: always show header content
                headerContent.classList.remove('collapsed', 'expanded');
                toggleBtn.classList.remove('active');
                isExpanded = false;
            } else if (window.innerWidth <= 768 && !isExpanded) {
                // Mobile: collapse if not manually expanded
                headerContent.classList.add('collapsed');
                headerContent.classList.remove('expanded');
            }
        });
        
        console.log('✅ Mobile header toggle set up');
    }
    
    expandMobileHeader() {
        const toggleBtn = document.getElementById('mobile-header-toggle');
        const headerContent = document.getElementById('header-content');
        
        if (window.innerWidth <= 768 && headerContent && headerContent.classList.contains('collapsed')) {
            headerContent.classList.remove('collapsed');
            headerContent.classList.add('expanded');
            if (toggleBtn) {
                toggleBtn.classList.add('active');
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? 'var(--success-50)' : type === 'error' ? 'var(--error-50)' : 'var(--primary-50)'};
            color: ${type === 'success' ? 'var(--success-800)' : type === 'error' ? 'var(--error-800)' : 'var(--primary-800)'};
            border: 1px solid ${type === 'success' ? 'var(--success-200)' : type === 'error' ? 'var(--error-200)' : 'var(--primary-200)'};
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            margin-bottom: var(--space-2);
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    setupGGUFBranding() {
        const banner = document.getElementById('gguf-banner');
        if (!banner) return;
        
        let lastScrollY = window.scrollY;
        let isScrollingDown = false;
        let scrollTimeout;
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Determine scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down and past threshold
                if (!isScrollingDown) {
                    isScrollingDown = true;
                    banner.classList.add('hidden');
                }
            } else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
                // Scrolling up or near top
                if (isScrollingDown) {
                    isScrollingDown = false;
                    banner.classList.remove('hidden');
                }
            }
            
            lastScrollY = currentScrollY;
            
            // Clear any existing timeout
            clearTimeout(scrollTimeout);
            
            // Show banner after scroll stops for better UX
            scrollTimeout = setTimeout(() => {
                if (currentScrollY <= 50) {
                    banner.classList.remove('hidden');
                }
            }, 150);
        };
        
        // Throttle scroll events for better performance
        let ticking = false;
        const throttledScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', throttledScroll, { passive: true });
        
        console.log('✅ GGUF Loader banner scroll behavior initialized');
    }
}

// Export for global use
window.PremiumGGUFApp = PremiumGGUFApp;