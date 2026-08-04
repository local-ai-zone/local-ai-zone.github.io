/**
 * Premium GGUF Model Discovery Application
 * Business-class interface with enhanced model cards and professional styling
 */

class PremiumGGUFApp {
    constructor() {
        this.models = [];
        this.filteredModels = [];
        this.currentPage = 1;
        this.itemsPerPage = 60; // More items per page with smaller cards
        this.isLoading = false;
        
        // Date calculation cache for performance optimization
        this.dateCache = new Map();
        
        // Preferred copy format for multi-part files (list | aria2c | wget),
        // persisted across pagination re-renders.
        this.copyMode = 'list';
        
        // Cache of HF tree-API lookups for shard directories, so repeated
        // copy clicks (or same-repo cards) don't hammer the API.
        // key: `${modelId}::${dir}` → { verified: bool, urls: string[] }
        this.shardTreeCache = new Map();
        
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
        
        // Make app instance globally available for active filters
        window.app = this;
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
            
            // Restore persisted grid/list view preference
            this.applySavedView();
            
            // Honor deep links (#model=<slug>&quant=<QUANT>)
            this.applyDeepLinkState();
            
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
            
            // Group entries by model repo: one card per model, with every
            // GGUF file available via a file/quantization selector.
            this.models = this.groupModelsByRepo(data);
            this.filteredModels = [...this.models];
            
            // Sort by like count (most liked first)
            this.filteredModels.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
            console.log('🔄 Models sorted by like count');
            
            // Update header stats
            this.updateHeaderStats();
            console.log('📊 Header stats updated');
            
            console.log(`✅ Successfully loaded ${this.models.length} models (${data.length} files)`);
            
        } catch (error) {
            console.error('❌ Error loading models:', error);
            throw error;
        }
    }
    
    /**
     * Group flat file entries into model objects.
     *
     * gguf_models.json contains ONE entry per (model, file) pair, so a model
     * with Q4_K_M + Q8_0 + F16 files appears multiple times. Group by repo
     * so the grid shows one card per model, with `model.files` holding every
     * file for the file/quantization selector.
     *
     * @param {Array} entries - flat file entries from gguf_models.json
     * @returns {Array} grouped model objects: {...primaryEntry, files: [...]}
     */
    groupModelsByRepo(entries) {
        const groups = new Map();
        
        for (const entry of entries) {
            const key = entry.modelId || entry.huggingFaceLink || entry.modelName;
            if (!groups.has(key)) {
                groups.set(key, { entries: [] });
            }
            groups.get(key).entries.push(entry);
        }
        
        const models = [];
        for (const group of groups.values()) {
            // Sort files biggest first: default selector entry = largest file
            group.entries.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
            // Base the card on the largest (default-selected) file so the
            // badge/size/hardware shown match what the selector starts on.
            // Like/download counts are repo-level, identical across files.
            const model = Object.assign({}, group.entries[0], { files: group.entries });
            models.push(model);
        }
        
        return models;
    }

    /**
     * Quantization values for a model (all its files, or just the primary).
     * @param {Object} model - grouped model object
     * @returns {Array<string>} quantization formats
     */
    getModelQuants(model) {
        if (model.files && model.files.length > 1) {
            return model.files.map((f) => f.quantFormat || 'Unknown');
        }
        return [model.quantFormat || 'Unknown'];
    }

    /**
     * Mirror of scripts/slug-utils.js createSlug — single source of truth is
     * the shared script, kept in sync so #model= deep links match prerendered
     * page slugs (models/{slug}.html).
     * @param {string} name - model name
     * @returns {string} URL-safe slug
     */
    createSlug(name) {
        return String(name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Parse deep-link state from the URL hash (#model=<slug>&quant=<QUANT>).
     * @returns {{model: string, quant: string}} empty strings when absent
     */
    getDeepLinkState() {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        return {
            model: (params.get('model') || '').toLowerCase(),
            quant: (params.get('quant') || '').toUpperCase(),
        };
    }

    /**
     * Persist a file selection in the URL hash so reloads and shares keep it.
     * @param {Object} model - grouped model object
     * @param {Object} file - selected file entry
     */
    updateDeepLinkHash(model, file) {
        const slug = this.createSlug(model.modelName);
        const quant = (file && file.quantFormat) || '';
        const hash = `#model=${encodeURIComponent(slug)}&quant=${encodeURIComponent(quant)}`;
        if (window.location.hash === hash) return;
        try {
            // replaceState avoids history spam; may throw on file:// or
            // sandboxed iframes, so the URL simply stays stale in those cases.
            window.history.replaceState(null, '', hash);
        } catch (error) {
            console.warn('Could not update URL hash:', error);
        }
    }

    /**
     * Apply deep-link state from the URL hash on load / hashchange.
     * Locates the model, jumps to its page, selects the matching file,
     * and scrolls the card into view.
     */
    applyDeepLinkState() {
        const { model: slug, quant } = this.getDeepLinkState();
        if (!slug) return;
        
        // The slug must reference a real model — otherwise keep the user's
        // current filter/search state untouched (no noisy filter reset).
        const allModel = this.models.find((m) => this.createSlug(m.modelName) === slug);
        if (!allModel) return;
        
        // Find the model in the current filtered set; if filtered out, reset
        // filters so the deep-linked model is guaranteed visible.
        let model = this.filteredModels.find((m) => this.createSlug(m.modelName) === slug);
        if (!model) {
            this.clearAllFilters();
            model = this.filteredModels.find((m) => this.createSlug(m.modelName) === slug);
        }
        if (!model) return;
        
        // Jump to the page that contains this model
        const modelIndex = this.filteredModels.indexOf(model);
        const targetPage = Math.floor(modelIndex / this.itemsPerPage) + 1;
        if (this.currentPage !== targetPage) {
            this.currentPage = targetPage;
            this.renderModels();
        }
        
        // Find the rendered card and select the matching file/quant
        const card = document.querySelector(`.premium-model-card[data-model-slug="${slug}"]`);
        if (!card) return;
        
        if (quant && model.files && model.files.length > 1) {
            const fileIndex = model.files.findIndex((f) => (f.quantFormat || '').toUpperCase() === quant);
            if (fileIndex > -1) {
                const select = card.querySelector('.model-file-select');
                if (select && select.value !== String(fileIndex)) {
                    select.value = String(fileIndex);
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
        
        // Scroll to + briefly highlight the card
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('deep-link-flash');
        setTimeout(() => card.classList.remove('deep-link-flash'), 2500);
        
        console.log(`🔗 Deep link applied: ${slug}${quant ? ` (${quant})` : ''}`);
    }

    /**
     * Count distinct quantization formats offered by a multi-file model.
     * @param {Object} model - grouped model object
     * @returns {number} distinct quants (falls back to file count for
     *   legacy entries where every file is 'Unknown')
     */
    getQuantCount(model) {
        if (!model.files || model.files.length < 2) return 1;
        const quants = new Set(
            model.files.map((f) => f.quantFormat).filter((q) => q && q !== 'Unknown')
        );
        return quants.size > 0 ? quants.size : model.files.length;
    }

    /**
     * Small "N quants" chip shown on the card header of multi-file models.
     * @param {Object} model - grouped model object
     * @returns {string} chip HTML or '' for single-file models
     */
    generateQuantChipHTML(model) {
        if (!model.files || model.files.length < 2) return '';
        const count = this.getQuantCount(model);
        // Hide when only one distinct quant (e.g. base + MTP variant of the
        // same Q4_K_M) — a "1 quants" chip would be confusing.
        if (count < 2) return '';
        return `<span class="model-quant-chip" title="${count} quantization formats available">${count} quants</span>`;
    }

    /**
     * Build a file/quantization selector for models with multiple files.
     * @param {Object} model - grouped model object
     * @returns {string} HTML or '' when the model has a single file
     */
    generateFileSelectorHTML(model) {
        if (!model.files || model.files.length < 2) return '';
        
        // When several files share the same quant+size (e.g. MTP variants),
        // append a short filename so options are distinguishable.
        const pairCount = {};
        model.files.forEach((file) => {
            const key = `${file.quantFormat || 'Unknown'}|${file.fileSizeFormatted || this.formatFileSize(file.fileSize)}`;
            pairCount[key] = (pairCount[key] || 0) + 1;
        });
        
        const options = model.files.map((file, i) => {
            const size = file.fileSizeFormatted || this.formatFileSize(file.fileSize);
            const key = `${file.quantFormat || 'Unknown'}|${size}`;
            let label = `${file.quantFormat || 'Unknown'} — ${size}`;
            const parts = parseInt(file.shardParts, 10);
            if (parts > 0) label += ` · ${parts} part${parts === 1 ? '' : 's'}`;
            if (pairCount[key] > 1) {
                const shortName = String(file.filename || '').split('/').pop() || 'file';
                label += ` (${shortName})`;
            }
            const selected = i === 0 ? ' selected' : '';
            return `<option value="${i}"${selected}>${label}</option>`;
        }).join('');
        
        return `
            <div class="metadata-item file-selector-item">
                <div class="metadata-label">Available Files (${model.files.length})</div>
                <div class="metadata-value">
                    <select class="model-file-select" aria-label="Select model file">
                        ${options}
                    </select>
                </div>
            </div>
        `;
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
            const noResultsMessage = this.getNoResultsMessage();
            modelGrid.innerHTML = `
                <div class="premium-loading-container">
                    <div style="text-align: center; color: var(--neutral-600);">
                        <h3>No models found</h3>
                        <p>${noResultsMessage}</p>
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
        card.setAttribute('data-model-slug', this.createSlug(model.modelName));
        
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
        
        card.innerHTML = `
            <div class="model-card-header">
                <div class="model-badge-group">
                    <div class="model-number-badge">
                        #${sequentialNumber}
                    </div>
                    ${this.generateQuantChipHTML(model)}
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
            
            <div class="model-info">
                <div class="model-repository-section">
                    <div class="repository-name" title="${this.extractRepositoryName(model.directDownloadLink)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                        </svg>
                        ${this.extractRepositoryName(model.directDownloadLink)}
                    </div>
                </div>
                
                <div class="model-title-section">
                    <h3 class="model-name" title="${model.modelName}">
                        ${this.formatModelName(model.modelName)}
                    </h3>
                </div>
                
                ${this.generateFileSelectorHTML(model)}
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
                            <span class="file-size-value">${model.fileSizeFormatted || this.formatFileSize(model.fileSize)}</span>
                            ${this.generatePartsNote(model)}
                        </div>
                    </div>
                </div>
                
                <div class="metadata-item hardware-requirements hardware-span">
                    <div class="metadata-label">Min. Hardware</div>
                    <div class="metadata-value">
                        <div class="hardware-specs">
                            ${this.generateHardwareRequirements(model)}
                        </div>
                    </div>
                </div>
                
                <div class="metadata-item">
                    <div class="metadata-label">Capability</div>
                    <div class="metadata-value">
                        ${this.formatCapability(model.modelCapability || 'text')}
                    </div>
                </div>
                
                <div class="metadata-item">
                    <div class="metadata-label">License</div>
                    <div class="metadata-value" title="${model.license}">
                        ${this.formatLicense(model.license)}
                    </div>
                </div>
                
                <div class="metadata-item upload-date-item">
                    <div class="metadata-label">Upload Date</div>
                    <div class="metadata-value">
                        <div class="upload-date-display">
                            <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            ${this.formatUploadDate(model.uploadDate)}
                        </div>
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
    

    generateActionButtons(model) {
        let buttons = '';

        // Add the new GGUF Loader button first
        buttons += `
            <a href="https://github.com/GGUFloader/gguf-loader" 
               class="gguf-loader-run-btn" 
               target="_blank" 
               rel="noopener noreferrer">
                <span class="btn-icon">🔋</span>
                Run with GGUF Loader
            </a>
        `;
        
        if (model.directDownloadLink) {
            const dl = this.getDownloadTargets(model);
            const parts = parseInt(model.shardParts, 10);
            buttons += `
                <div class="action-group">
                    <a href="${dl.href}" 
                       class="premium-btn btn-primary" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       data-action="direct-download"
                       ${parts > 0 ? `data-sharded="${parts}"` : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        <span class="btn-label">${parts > 0 ? `Download ${parts} Parts` : 'Direct Download'}</span>
                    </a>
                    <button class="copy-btn" 
                            data-copy-text="${dl.copy}" 
                            data-copy-download
                            title="${parts > 0 ? 'Copy all parts link' : 'Copy download link'}"
                            aria-label="${parts > 0 ? 'Copy all parts link' : 'Copy download link'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
            `;
            // Show the "Copy All Parts Links" button whenever ANY file in the
            // model is sharded (the default/largest file may not be), then
            // sync its visibility to the file actually selected below.
            const anySharded = (model.files || [model]).some(
                (f) => parseInt(f && f.shardParts, 10) > 1
            );
            if (anySharded) {
                const defaultUrls = this.getShardPartURLs(model);
                const partCount = defaultUrls.length || parts || 0;
                const defaultSharded = defaultUrls.length > 1;
                const activeMode = this.copyMode || 'list';
                const modeOptions = [
                    { mode: 'list', label: 'List' },
                    { mode: 'aria2c', label: 'aria2c' },
                    { mode: 'wget', label: 'wget' },
                ];
                const modeButtons = modeOptions.map(({ mode, label }) => `
                    <button type="button"
                            class="copy-mode-opt${mode === activeMode ? ' active' : ''}"
                            data-copy-mode="${mode}"
                            aria-pressed="${mode === activeMode}"
                            title="Copy as ${mode === 'list' ? 'one URL per line' : 'a single ' + mode + ' command'}">${label}</button>
                `).join('');
                buttons += `
                    <div class="action-group copy-all-block" data-copy-mode="${activeMode}" style="display: ${defaultSharded ? '' : 'none'}">
                        <div class="copy-mode-toggle" role="group" aria-label="Copy format">
                            ${modeButtons}
                        </div>
                        <button class="premium-btn btn-secondary copy-all-parts-btn" 
                                data-action="copy-all-parts"
                                data-shard-count="${partCount}"
                                title="Copy every part's download link so you can grab the whole model"
                                aria-label="Copy all ${partCount} part download links">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <span class="btn-label">${this.copyAllLabel(activeMode, partCount)}</span>
                        </button>
                    </div>
                `;
            }
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
        
        if (!model.directDownloadLink && !model.huggingFaceLink) {
            buttons += `
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
    
    generateHardwareRequirements(model) {
        // Estimate hardware requirements based on file size
        const fileSize = model.fileSize || 0;
        const fileSizeGB = fileSize / (1024 * 1024 * 1024);
        
        let cpu = '2+';
        let ram = '4GB';
        let gpu = '❌';
        
        // Estimate requirements based on model size
        if (fileSizeGB > 20) {
            cpu = '8+';
            ram = '32GB';
            gpu = 'Req';
        } else if (fileSizeGB > 10) {
            cpu = '6+';
            ram = '16GB';
            gpu = 'Opt';
        } else if (fileSizeGB > 5) {
            cpu = '4+';
            ram = '8GB';
            gpu = 'Opt';
        }
        
        // Use actual hardware requirements if available
        if (model.minCpuCores) cpu = `${model.minCpuCores}+`;
        if (model.minRamGB) ram = `${model.minRamGB}GB`;
        if (model.gpuRequired !== undefined) {
            gpu = model.gpuRequired ? 'Req' : 'No';
        }
        
        return `
            <div class="hw-spec">
                <span class="hw-label">Core:</span>
                <span class="hw-value">${cpu}</span>
            </div>
            <div class="hw-spec">
                <span class="hw-label">RAM:</span>
                <span class="hw-value">${ram}</span>
            </div>
            <div class="hw-spec">
                <span class="hw-label">GPU:</span>
                <span class="hw-value">${gpu}</span>
            </div>
        `;
    }
    
    addCardEventListeners(card, model) {
        // File / quantization selector: swap size, download link, and hardware
        const fileSelect = card.querySelector('.model-file-select');
        if (fileSelect && model.files && model.files.length > 1) {
            fileSelect.addEventListener('change', (e) => {
                const file = model.files[parseInt(e.target.value, 10)];
                if (!file) return;
                
                // Quantization badge
                const badge = card.querySelector('.quantization-badge');
                if (badge) badge.textContent = file.quantFormat || 'N/A';
                
                // File size + parts note
                const sizeValue = card.querySelector('.file-size-value');
                if (sizeValue) sizeValue.textContent = file.fileSizeFormatted || this.formatFileSize(file.fileSize);
                const partsNote = card.querySelector('.file-parts-note');
                const partsHTML = this.generatePartsNote(file);
                if (partsNote && partsHTML) {
                    partsNote.outerHTML = partsHTML;
                } else if (partsNote) {
                    partsNote.remove();
                } else if (partsHTML) {
                    const sizeDisplay = card.querySelector('.file-size-display');
                    if (sizeDisplay) sizeDisplay.insertAdjacentHTML('beforeend', partsHTML);
                }
                
                // Direct download link + its copy button (repo tree for shards)
                const dl = this.getDownloadTargets(file);
                const downloadLink = card.querySelector('[data-action="direct-download"]');
                if (downloadLink) downloadLink.href = dl.href;
                const dlParts = parseInt(file.shardParts, 10);
                if (downloadLink) {
                    const label = downloadLink.querySelector('.btn-label');
                    if (label) label.textContent = dlParts > 0 ? `Download ${dlParts} Parts` : 'Direct Download';
                    if (dlParts > 0) downloadLink.setAttribute('data-sharded', dlParts);
                    else downloadLink.removeAttribute('data-sharded');
                }
                const downloadCopy = card.querySelector('.copy-btn[data-copy-download]');
                if (downloadCopy) {
                    downloadCopy.dataset.copyText = dl.copy;
                    const tip = dlParts > 0 ? 'Copy all parts link' : 'Copy download link';
                    downloadCopy.title = tip;
                    downloadCopy.setAttribute('aria-label', tip);
                }
                
                // Copy All Parts Links: show only for sharded files, update count
                const copyAllBlock = card.querySelector('.copy-all-block');
                if (copyAllBlock) {
                    const urls = this.getShardPartURLs(file);
                    if (urls.length > 1) {
                        copyAllBlock.style.display = '';
                        const copyAllParts = copyAllBlock.querySelector('[data-action="copy-all-parts"]');
                        if (copyAllParts) {
                            copyAllParts.dataset.shardCount = urls.length;
                            const mode = copyAllBlock.dataset.copyMode || 'list';
                            const label = copyAllParts.querySelector('.btn-label');
                            if (label) label.textContent = this.copyAllLabel(mode, urls.length);
                            copyAllParts.title = "Copy every part's download link so you can grab the whole model";
                        }
                    } else {
                        copyAllBlock.style.display = 'none';
                    }
                }
                
                // Hardware requirements
                const hardware = card.querySelector('.hardware-specs');
                if (hardware) hardware.innerHTML = this.generateHardwareRequirements(file);
                
                // Persist the selection in the URL hash for deep-linking
                this.updateDeepLinkHash(model, file);
                
                console.log(`🔄 Switched ${model.modelName} to ${file.filename}`);
            });
        }
        
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
        
        // Copy All Parts Links: join every shard's resolve URL, formatted by
        // the selected mode (list / aria2c / wget).
        const copyAllBlock = card.querySelector('.copy-all-block');
        const copyAllParts = card.querySelector('[data-action="copy-all-parts"]');
        if (copyAllBlock) {
            // Mode toggle: flip active state, aria-pressed, and the button label
            const modeButtons = copyAllBlock.querySelectorAll('.copy-mode-opt');
            modeButtons.forEach((opt) => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    modeButtons.forEach((o) => {
                        o.classList.remove('active');
                        o.setAttribute('aria-pressed', 'false');
                    });
                    opt.classList.add('active');
                    opt.setAttribute('aria-pressed', 'true');
                    const mode = opt.dataset.copyMode || 'list';
                    this.copyMode = mode; // persist across pagination re-renders
                    copyAllBlock.dataset.copyMode = mode;
                    if (copyAllParts) {
                        const label = copyAllParts.querySelector('.btn-label');
                        if (label) label.textContent = this.copyAllLabel(mode, parseInt(copyAllParts.dataset.shardCount, 10) || 0);
                    }
                });
            });
        }
        if (copyAllParts) {
            copyAllParts.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Use the currently selected file so switching quants copies
                // the right shard set.
                const fileSelect = card.querySelector('.model-file-select');
                const file = (fileSelect && model.files) ? model.files[parseInt(fileSelect.value, 10)] : model;
                const derived = this.getShardPartURLs(file);
                if (derived.length > 1) {
                    const mode = (copyAllBlock && copyAllBlock.dataset.copyMode) || 'list';
                    // Verify against the HF tree API; falls back to the repo
                    // tree link when derived names don't match reality.
                    const { verified, urls } = await this.verifyShardURLs(file);
                    let text = this.formatShardCopy(urls, mode);
                    if (!verified && urls.length < 2) {
                        // No reliable per-part set: copy the tree link instead
                        const tree = this.getDownloadTargets(file);
                        text = tree.copy;
                    }
                    try {
                        await navigator.clipboard.writeText(text);
                        const what = verified
                            ? `${urls.length} part links (${mode})`
                            : (urls.length < 2 ? 'repo tree link' : `${urls.length} part links (${mode})`);
                        this.showNotification(`Copied ${what} to clipboard!`, 'success');
                        copyAllParts.style.background = 'var(--success-100)';
                        copyAllParts.style.color = 'var(--success-700)';
                        setTimeout(() => {
                            copyAllParts.style.background = '';
                            copyAllParts.style.color = '';
                        }, 2000);
                    } catch (error) {
                        this.showNotification('Failed to copy', 'error');
                    }
                } else {
                    this.showNotification('Could not build part links for this file', 'error');
                }
            });
        }
        
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
        
        const capabilityFilter = document.getElementById('capability-filter');
        if (capabilityFilter) {
            capabilityFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter) {
            licenseFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        // Hardware requirement filters
        const cpuFilter = document.getElementById('cpu-filter');
        if (cpuFilter) {
            cpuFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        const ramFilter = document.getElementById('ram-filter');
        if (ramFilter) {
            ramFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        const gpuFilter = document.getElementById('gpu-filter');
        if (gpuFilter) {
            gpuFilter.addEventListener('change', (e) => {
                this.handleFilter();
            });
        }
        
        // Recent upload filter
        const recentFilter = document.getElementById('recent-filter');
        if (recentFilter) {
            recentFilter.addEventListener('change', (e) => {
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
        
        // Re-apply deep links when the hash changes (back/forward, manual edits)
        window.addEventListener('hashchange', () => {
            this.applyDeepLinkState();
        });
        
        // Grid / List view toggle
        const viewButtons = document.querySelectorAll('.view-btn[data-view]');
        viewButtons.forEach((btn) => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });
    }
    
    /**
     * Switch between grid and list card layouts, persisting the choice.
     * @param {string} view - 'grid' or 'list'
     */
    setView(view) {
        if (view !== 'grid' && view !== 'list') return;
        
        const modelGrid = document.getElementById('model-grid');
        if (modelGrid) {
            modelGrid.classList.toggle('list-view', view === 'list');
        }
        
        document.querySelectorAll('.view-btn[data-view]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        try {
            localStorage.setItem('gguf-view', view);
        } catch (error) {
            // localStorage may be unavailable (private mode / file://)
        }
        
        console.log(`👁 View switched to ${view}`);
    }
    
    /**
     * Restore the persisted view preference on load.
     */
    applySavedView() {
        try {
            const saved = localStorage.getItem('gguf-view');
            if (saved === 'list') this.setView('list');
        } catch (error) {
            // ignore
        }
    }
    
    handleSearch(query, resetFilters = true) {
        let baseModels = this.models;
        
        // If not resetting filters, apply current filter state first
        if (!resetFilters) {
            const quantizationFilter = document.getElementById('quantization-filter');
            const capabilityFilter = document.getElementById('capability-filter');
            const licenseFilter = document.getElementById('license-filter');
            const cpuFilter = document.getElementById('cpu-filter');
            const ramFilter = document.getElementById('ram-filter');
            const gpuFilter = document.getElementById('gpu-filter');
            const recentFilter = document.getElementById('recent-filter');
            
            const selectedQuantization = quantizationFilter ? quantizationFilter.value : 'all';
            const selectedCapability = capabilityFilter ? capabilityFilter.value : 'all';
            const selectedLicense = licenseFilter ? licenseFilter.value : 'all';
            const selectedCpu = cpuFilter ? cpuFilter.value : 'all';
            const selectedRam = ramFilter ? ramFilter.value : 'all';
            const selectedGpu = gpuFilter ? gpuFilter.value : 'all';
            const selectedRecent = recentFilter ? recentFilter.value : 'all';
            
            baseModels = this.models.filter(model => {
                if (selectedQuantization !== 'all' && !this.getModelQuants(model).includes(selectedQuantization)) {
                    return false;
                }
                if (selectedCapability !== 'all' && (model.modelCapability || 'text') !== selectedCapability) {
                    return false;
                }
                if (selectedLicense !== 'all' && model.license !== selectedLicense) {
                    return false;
                }
                
                // Hardware requirement filters
                if (selectedCpu !== 'all') {
                    const requiredCores = parseInt(selectedCpu);
                    if (!model.minCpuCores || model.minCpuCores < requiredCores) {
                        return false;
                    }
                }
                
                if (selectedRam !== 'all') {
                    const requiredRam = parseInt(selectedRam);
                    if (!model.minRamGB || model.minRamGB < requiredRam) {
                        return false;
                    }
                }
                
                if (selectedGpu !== 'all') {
                    if (selectedGpu === 'required' && !model.gpuRequired) {
                        return false;
                    }
                    if (selectedGpu === 'not-required' && model.gpuRequired) {
                        return false;
                    }
                }
                
                // Recent upload filter with caching and improved error handling
                if (selectedRecent !== 'all') {
                    const daysAgo = parseInt(selectedRecent);
                    const cutoffDate = this.getCachedCutoffDate(daysAgo);
                    
                    if (!model.uploadDate) {
                        return false; // Exclude models without upload date
                    }
                    
                    const uploadDate = this.parseUploadDateSafely(model.uploadDate);
                    if (!uploadDate) {
                        return false; // Exclude models with invalid upload date
                    }
                    
                    if (uploadDate < cutoffDate) {
                        return false; // Exclude models older than cutoff
                    }
                }
                
                return true;
            });
        }
        
        if (!query.trim()) {
            this.filteredModels = [...baseModels];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredModels = baseModels.filter(model => {
                const quants = this.getModelQuants(model).join(' ').toLowerCase();
                return (model.modelName && model.modelName.toLowerCase().includes(lowerQuery)) ||
                    quants.includes(lowerQuery) ||
                    (model.modelType && model.modelType.toLowerCase().includes(lowerQuery)) ||
                    (model.license && model.license.toLowerCase().includes(lowerQuery));
            });
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
        // Get unique values for filters (across ALL files of every model)
        const quantizations = [...new Set(
            this.models.flatMap(m => this.getModelQuants(m))
        )].filter(q => q && q !== 'Unknown').sort();
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
        
        // Capability filter options are already in HTML (static list)
        
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
        const capabilityFilter = document.getElementById('capability-filter');
        const licenseFilter = document.getElementById('license-filter');
        const cpuFilter = document.getElementById('cpu-filter');
        const ramFilter = document.getElementById('ram-filter');
        const gpuFilter = document.getElementById('gpu-filter');
        const recentFilter = document.getElementById('recent-filter');
        
        const selectedQuantization = quantizationFilter ? quantizationFilter.value : 'all';
        const selectedCapability = capabilityFilter ? capabilityFilter.value : 'all';
        const selectedLicense = licenseFilter ? licenseFilter.value : 'all';
        const selectedCpu = cpuFilter ? cpuFilter.value : 'all';
        const selectedRam = ramFilter ? ramFilter.value : 'all';
        const selectedGpu = gpuFilter ? gpuFilter.value : 'all';
        const selectedRecent = recentFilter ? recentFilter.value : 'all';
        
        console.log('🔧 Hardware filters applied:', {
            cpu: selectedCpu,
            ram: selectedRam,
            gpu: selectedGpu
        });
        
        this.filteredModels = this.models.filter(model => {
            if (selectedQuantization !== 'all' && !this.getModelQuants(model).includes(selectedQuantization)) {
                return false;
            }
            if (selectedCapability !== 'all' && (model.modelCapability || 'text') !== selectedCapability) {
                return false;
            }
            if (selectedLicense !== 'all' && model.license !== selectedLicense) {
                return false;
            }
            
            // Hardware requirement filters
            if (selectedCpu !== 'all') {
                const requiredCores = parseInt(selectedCpu);
                if (!model.minCpuCores || model.minCpuCores < requiredCores) {
                    return false;
                }
            }
            
            if (selectedRam !== 'all') {
                const requiredRam = parseInt(selectedRam);
                if (!model.minRamGB || model.minRamGB < requiredRam) {
                    return false;
                }
            }
            
            if (selectedGpu !== 'all') {
                if (selectedGpu === 'required' && !model.gpuRequired) {
                    return false;
                }
                if (selectedGpu === 'not-required' && model.gpuRequired) {
                    return false;
                }
            }
            
            // Recent upload filter with caching and improved error handling
            if (selectedRecent !== 'all') {
                const daysAgo = parseInt(selectedRecent);
                const cutoffDate = this.getCachedCutoffDate(daysAgo);
                
                if (!model.uploadDate) {
                    return false; // Exclude models without upload date
                }
                
                const uploadDate = this.parseUploadDateSafely(model.uploadDate);
                if (!uploadDate) {
                    return false; // Exclude models with invalid upload date
                }
                
                if (uploadDate < cutoffDate) {
                    return false; // Exclude models older than cutoff
                }
            }
            
            return true;
        });
        
        console.log(`🔧 Filtered ${this.models.length} models to ${this.filteredModels.length} models`);
        
        // Apply current search if any
        const searchInput = document.getElementById('model-search');
        if (searchInput && searchInput.value.trim()) {
            this.handleSearch(searchInput.value, false); // Don't reset filters
            return;
        }
        
        this.currentPage = 1;
        this.renderModels();
        this.updateActiveFiltersDisplay();
    }
    
    /**
     * Get cached cutoff date for performance optimization
     * @param {number} days - Number of days ago
     * @returns {Date} Cutoff date
     */
    getCachedCutoffDate(days) {
        if (!this.dateCache.has(days)) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            this.dateCache.set(days, cutoff);
            
            // Clear cache after 1 hour to ensure dates stay current
            setTimeout(() => {
                this.dateCache.delete(days);
            }, 3600000);
        }
        return this.dateCache.get(days);
    }
    
    /**
     * Safely parse upload date with error handling
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseUploadDateSafely(dateString) {
        try {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            console.warn('Invalid upload date:', dateString, error);
            return null;
        }
    }
    
    /**
     * Update active filters display
     */
    updateActiveFiltersDisplay() {
        const activeFiltersContainer = document.getElementById('active-filters');
        if (!activeFiltersContainer) return;
        
        const activeFilters = this.getActiveFilters();
        
        if (activeFilters.length === 0) {
            activeFiltersContainer.innerHTML = '';
            activeFiltersContainer.style.display = 'none';
            return;
        }
        
        activeFiltersContainer.style.display = 'block';
        activeFiltersContainer.innerHTML = `
            <div class="active-filters-header">
                <span class="active-filters-label">Active Filters:</span>
                <button class="clear-all-active-filters" onclick="app.clearAllFilters()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Clear All
                </button>
            </div>
            <div class="active-filters-list">
                ${activeFilters.map(filter => `
                    <div class="active-filter-tag" data-filter="${filter.type}">
                        <span class="filter-icon">${filter.icon}</span>
                        <span class="filter-text">${filter.label}: ${filter.value}</span>
                        <button class="remove-filter-btn" onclick="app.removeActiveFilter('${filter.type}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Get currently active filters
     * @returns {Array} Array of active filter objects
     */
    getActiveFilters() {
        const activeFilters = [];
        
        // Check quantization filter
        const quantizationFilter = document.getElementById('quantization-filter');
        if (quantizationFilter && quantizationFilter.value !== 'all') {
            activeFilters.push({
                type: 'quantization',
                label: 'Quantization',
                value: quantizationFilter.value,
                icon: '⭐'
            });
        }
        
        // Check capability filter
        const capabilityFilter = document.getElementById('capability-filter');
        if (capabilityFilter && capabilityFilter.value !== 'all') {
            activeFilters.push({
                type: 'capability',
                label: 'Capability',
                value: capabilityFilter.value,
                icon: '🎯'
            });
        }
        
        // Check license filter
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter && licenseFilter.value !== 'all') {
            activeFilters.push({
                type: 'license',
                label: 'License',
                value: licenseFilter.value,
                icon: '🔒'
            });
        }
        
        // Check CPU filter
        const cpuFilter = document.getElementById('cpu-filter');
        if (cpuFilter && cpuFilter.value !== 'all') {
            activeFilters.push({
                type: 'cpu',
                label: 'CPU Cores',
                value: `${cpuFilter.value}+ cores`,
                icon: '🖥️'
            });
        }
        
        // Check RAM filter
        const ramFilter = document.getElementById('ram-filter');
        if (ramFilter && ramFilter.value !== 'all') {
            activeFilters.push({
                type: 'ram',
                label: 'RAM',
                value: `${ramFilter.value}+ GB`,
                icon: '💾'
            });
        }
        
        // Check GPU filter
        const gpuFilter = document.getElementById('gpu-filter');
        if (gpuFilter && gpuFilter.value !== 'all') {
            const gpuValue = gpuFilter.value === 'required' ? 'GPU Required' : 'No GPU Needed';
            activeFilters.push({
                type: 'gpu',
                label: 'GPU',
                value: gpuValue,
                icon: '🎮'
            });
        }
        
        // Check recent upload filter
        const recentFilter = document.getElementById('recent-filter');
        if (recentFilter && recentFilter.value !== 'all') {
            const timeLabels = {
                '7': 'Last 7 days',
                '30': 'Last 30 days',
                '90': 'Last 90 days',
                '180': 'Last 6 months'
            };
            activeFilters.push({
                type: 'recent',
                label: 'Recent Uploaded',
                value: timeLabels[recentFilter.value] || `Last ${recentFilter.value} days`,
                icon: '📅'
            });
        }
        
        return activeFilters;
    }
    
    /**
     * Get contextual no results message based on active filters
     * @returns {string} Appropriate message for no results
     */
    getNoResultsMessage() {
        const recentFilter = document.getElementById('recent-filter');
        const activeFilters = this.getActiveFilters();
        
        // Check if recent upload filter is active
        if (recentFilter && recentFilter.value !== 'all') {
            const timeLabels = {
                '7': 'last 7 days',
                '30': 'last 30 days',
                '90': 'last 90 days',
                '180': 'last 6 months'
            };
            const timeLabel = timeLabels[recentFilter.value] || `last ${recentFilter.value} days`;
            
            if (activeFilters.length === 1) {
                return `No models were uploaded in the ${timeLabel}. Try selecting a longer timeframe.`;
            } else {
                return `No models match your criteria for the ${timeLabel}. Try adjusting your filters or selecting a longer timeframe.`;
            }
        }
        
        // General message for other filter combinations
        if (activeFilters.length > 0) {
            return 'No models match your current filter criteria. Try adjusting or clearing some filters.';
        }
        
        // Default message
        return 'Try adjusting your search or filter criteria.';
    }
    
    /**
     * Remove a specific active filter
     * @param {string} filterType - Type of filter to remove
     */
    removeActiveFilter(filterType) {
        const filterMap = {
            'quantization': 'quantization-filter',
            'capability': 'capability-filter',
            'license': 'license-filter',
            'cpu': 'cpu-filter',
            'ram': 'ram-filter',
            'gpu': 'gpu-filter',
            'recent': 'recent-filter'
        };
        
        const filterId = filterMap[filterType];
        if (filterId) {
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.value = 'all';
                this.handleFilter();
            }
        }
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
        
        const capabilityFilter = document.getElementById('capability-filter');
        if (capabilityFilter) {
            capabilityFilter.value = 'all';
        }
        
        const licenseFilter = document.getElementById('license-filter');
        if (licenseFilter) {
            licenseFilter.value = 'all';
        }
        
        // Reset hardware filters
        const cpuFilter = document.getElementById('cpu-filter');
        if (cpuFilter) {
            cpuFilter.value = 'all';
        }
        
        const ramFilter = document.getElementById('ram-filter');
        if (ramFilter) {
            ramFilter.value = 'all';
        }
        
        const gpuFilter = document.getElementById('gpu-filter');
        if (gpuFilter) {
            gpuFilter.value = 'all';
        }
        
        // Reset recent upload filter
        const recentFilter = document.getElementById('recent-filter');
        if (recentFilter) {
            recentFilter.value = 'all';
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
    
    formatCapability(capability) {
        const capabilityConfig = {
            vision: { label: 'Vision', color: '#8B5CF6' },
            embedding: { label: 'Embedding', color: '#06B6D4' },
            code: { label: 'Code', color: '#10B981' },
            audio: { label: 'Audio', color: '#F59E0B' },
            text: { label: 'Text', color: '#6B7280' }
        };
        
        const config = capabilityConfig[capability] || capabilityConfig.text;
        return `<span class="capability-badge" style="--capability-color: ${config.color}">${config.label}</span>`;
    }
    
    formatLicense(license) {
        if (!license || license === 'Not specified') return 'Open Source';
        return license.length > 15 ? license.substring(0, 12) + '...' : license;
    }
    
    /**
     * Extract repository name from download link
     * @param {string} downloadLink - The download link URL
     * @returns {string} Repository name or 'Unknown Repository'
     */
    /**
     * Small "· N parts" note for sharded files, or '' when not sharded.
     * @param {Object} file - model entry (may carry shardParts)
     * @returns {string} HTML fragment
     */
    generatePartsNote(file) {
        const parts = parseInt((file && file.shardParts) || 0, 10);
        if (!(parts > 0)) return '';
        return `<span class="file-parts-note" title="Split into ${parts} parts — the size shown is the combined total">· ${parts} part${parts === 1 ? '' : 's'}</span>`;
    }

    /**
     * Download target for a file. Multi-part (sharded) files have no single
     * self-contained download, so point at the repo tree (the directory that
     * holds every part) instead of one part's resolve URL. Copy the tree link
     * too, so users grabbing the URL get the whole set, not 1/N of it.
     * @param {Object} file - model entry
     * @returns {Object} { href, copy } URLs
     */
    getDownloadTargets(file) {
        const parts = parseInt((file && file.shardParts) || 0, 10);
        const modelId = (file && file.modelId) || '';
        if (parts > 0 && modelId) {
            // Directory containing the shards: strip the filename, keep subdirs.
            // Encode each segment — GGUF filenames can contain spaces/parens
            // (e.g. "Qwen2.5 7B/model.gguf" → tree/main/Qwen2.5%207B).
            const filename = String(file.filename || '').replace(/\\/g, '/');
            const dir = filename.includes('/') ? filename.split('/').slice(0, -1).map(encodeURIComponent).join('/') : '';
            const tree = `https://huggingface.co/${modelId}/tree/main${dir ? '/' + dir : ''}`;
            return { href: tree, copy: tree };
        }
        const direct = (file && file.directDownloadLink) || '';
        return { href: direct, copy: direct };
    }

    /**
     * Derive every individual shard resolve URL for a sharded file.
     *
     * The catalog stores only part 1's filename (e.g.
     * ``BF16/model-00001-of-00041.gguf``) plus ``shardParts`` (41). Sibling
     * parts follow the ``-NNNNN-of-NNNNN`` convention with the same zero-
     * padding, so the full set is: ``model-00001-of-00041.gguf`` …
     * ``model-00041-of-00041.gguf``, each resolved under the same repo.
     *
     * @param {Object} file - model entry (needs filename, modelId, shardParts)
     * @returns {Array<string>} one resolve URL per part, or [] when not sharded
     */
    getShardPartURLs(file) {
        const filename = String(file.filename || '').replace(/\\/g, '/');
        // Lookahead keeps ".gguf" out of match[0] so it survives in suffix.
        const match = /-(\d+)-of-(\d+)(?=\.gguf$)/i.exec(filename);
        if (!match) return [];
        // The filename's own "of-N" total is authoritative; shardParts is the
        // fallback when the filename was normalized differently.
        const total = parseInt(match[2], 10) || parseInt((file && file.shardParts) || 0, 10);
        if (!(total > 1)) return [];
        const modelId = (file && file.modelId) || '';
        if (!modelId) return [];

        const partNumWidth = match[1].length;
        const totalWidth = match[2].length;
        const prefix = filename.slice(0, match.index);
        const suffix = filename.slice(match.index + match[0].length); // ".gguf"
        const urls = [];
        for (let i = 1; i <= total; i++) {
            const part = String(i).padStart(partNumWidth, '0');
            const totalStr = String(total).padStart(totalWidth, '0');
            const partFilename = `${prefix}-${part}-of-${totalStr}${suffix}`;
            urls.push(`https://huggingface.co/${modelId}/resolve/main/${partFilename}`);
        }
        return urls;
    }

    /**
     * Resolve the repository path for a sharded file (its directory).
     * @param {Object} file - model entry
     * @returns {string} e.g. "BF16" or "" for root-level files
     */
    shardDirOf(file) {
        const filename = String((file && file.filename) || '').replace(/\\/g, '/');
        return filename.includes('/') ? filename.split('/').slice(0, -1).join('/') : '';
    }

    /**
     * Verify derived shard URLs against the real HuggingFace repo tree.
     *
     * Derived URLs assume zero-padded naming matches the repo. Pathological
     * repos (e.g. Mixtral-8x22B with 3 overlapping shard families) break that
     * assumption, so before copying we ask the HF tree API which files actually
     * exist and keep only the derived URLs that match. If fewer than two match,
     * we fall back to the repo tree link (one URL) so users never copy a set
     * of 404 links.
     *
     * Results are cached per (modelId, dir) so repeated clicks don't re-hit
     * the API. The caller decides what to copy:
     * - `verified: true`  → every URL in `urls` exists on disk
     * - `verified: false` with `urls.length >= 2` → network/API failure; the
     *   derived set is unverifiable but returned optimistically (better a
     *   maybe-stale set than a broken copy).
     * - `verified: false` with `urls.length < 2` → derivation mismatched the
     *   repo; the caller should fall back to the repo tree link.
     *
     * @param {Object} file - model entry
     * @returns {Promise<{verified: boolean, urls: string[]}>}
     */
    async verifyShardURLs(file) {
        const modelId = (file && file.modelId) || '';
        const dir = this.shardDirOf(file);
        const cacheKey = `${modelId}::${dir}`;
        if (this.shardTreeCache.has(cacheKey)) {
            return this.shardTreeCache.get(cacheKey);
        }
        
        const derived = this.getShardPartURLs(file);
        // Nothing sharded → nothing to verify (shouldn't happen; defensive)
        if (derived.length < 2) {
            const empty = { verified: false, urls: derived };
            this.shardTreeCache.set(cacheKey, empty);
            return empty;
        }
        
        // Ask the tree API which files exist in the shard directory.
        const dirPath = dir ? '/' + dir.split('/').map(encodeURIComponent).join('/') : '';
        const apiUrl = `https://huggingface.co/api/models/${modelId}/tree/main${dirPath}`;
        let actualFiles = new Set();
        try {
            const response = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`tree API ${response.status}`);
            const entries = await response.json();
            for (const entry of Array.isArray(entries) ? entries : []) {
                if (entry && entry.type === 'file' && entry.path) {
                    actualFiles.add(String(entry.path).replace(/\\/g, '/'));
                }
            }
        } catch (error) {
            // Offline / rate-limited / CORS: keep the derived set, mark unverified
            const fallback = { verified: false, urls: derived };
            this.shardTreeCache.set(cacheKey, fallback);
            return fallback;
        }
        
        // Keep only derived URLs whose filename actually exists in the tree.
        // Decode defensively: a literal '%' in a filename would make
        // decodeURIComponent throw, which must not kill the copy handler.
        const prefix = `https://huggingface.co/${modelId}/resolve/main/`;
        const verifiedUrls = derived.filter((url) => {
            const raw = url.slice(prefix.length);
            let filename = raw;
            try {
                filename = decodeURIComponent(raw);
            } catch (error) {
                // Un-decodable (e.g. trailing '%') — compare raw, then give up
                // if the tree only has the decoded form (rare; still safe).
            }
            return actualFiles.has(filename) || actualFiles.has(raw);
        });
        
        // Cache the outcome (even verified results) so we never re-fetch.
        const outcome = { verified: verifiedUrls.length >= 2, urls: verifiedUrls };
        this.shardTreeCache.set(cacheKey, outcome);
        return outcome;
    }

    /**
     * Format a shard URL list for the clipboard in the chosen mode.
     *
     * Modes:
     * - ``'list'``   — one URL per line (default, download managers/curl -K)
     * - ``'aria2c'`` — a single aria2c command with every part as an argument,
     *                  resumable via -c, 16 connections per server (-x16 -s16)
     * - ``'wget'``   — a single wget command with every part, resumable (-c)
     *
     * URLs are double-quoted so filenames with spaces (e.g. "Qwen2.5 7B/")
     * survive pasting into a shell.
     *
     * @param {Array<string>} urls - shard resolve URLs
     * @param {string} mode - 'list' | 'aria2c' | 'wget'
     * @returns {string} clipboard-ready text
     */
    formatShardCopy(urls, mode) {
        const list = Array.isArray(urls) ? urls : [];
        if (!list.length) return '';
        if (mode === 'aria2c') {
            return `aria2c -x16 -s16 -c ${list.map((u) => `"${u}"`).join(' ')}`;
        }
        if (mode === 'wget') {
            return `wget -c ${list.map((u) => `"${u}"`).join(' ')}`;
        }
        // default: plain list, one per line
        return list.join('\n');
    }

    /**
     * Human-readable label for the copy-all button reflecting the mode.
     * @param {string} mode - 'list' | 'aria2c' | 'wget'
     * @param {number} count - number of shard parts
     * @returns {string} e.g. "Copy All Parts Links (41)" / "Copy as aria2c (41)"
     */
    copyAllLabel(mode, count) {
        const n = count || 0;
        if (mode === 'aria2c') return `Copy as aria2c (${n})`;
        if (mode === 'wget') return `Copy as wget (${n})`;
        return `Copy All Parts Links (${n})`;
    }

    extractRepositoryName(downloadLink) {
        if (!downloadLink) return 'Unknown Repository';
        
        try {
            // Extract repository name from HuggingFace URL
            // Example: https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1/resolve/main/gguf/mxbai-embed-large-v1-f16.gguf
            // Should return: Source: mixedbread-ai
            
            const url = new URL(downloadLink);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            // For HuggingFace links, the repository name is the 1st path part (username)
            if (url.hostname.includes('huggingface.co') && pathParts.length >= 2) {
                return `Source: ${pathParts[0]}`;
            }
            
            // For other URLs, try to get a meaningful name
            return 'Source: Unknown';
        } catch (error) {
            console.warn('Error extracting repository name:', error);
            return 'Source: Unknown';
        }
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