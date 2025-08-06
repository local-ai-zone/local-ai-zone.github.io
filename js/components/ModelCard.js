/**
 * ModelCard Component for GGUF Model Discovery
 * Displays individual model information with download links and sequential numbering
 */

class ModelCard {
    /**
     * Create a ModelCard instance
     * @param {Object} modelData - Model data object
     * @param {number} sequentialNumber - Sequential number for the card (starting from 1)
     */
    constructor(modelData, sequentialNumber) {
        this.data = modelData;
        this.number = sequentialNumber;
        this.element = null;
    }

    /**
     * Render the model card HTML
     * @returns {HTMLElement} The rendered card element
     */
    render() {
        // Create the main card container
        this.element = Helpers.createElement('div', {
            className: 'model-card',
            dataset: {
                modelId: this.number,
                modelName: this.data.modelName
            }
        });

        // Build the card content
        this.element.innerHTML = this._generateCardHTML();
        
        // Bind event handlers
        this._bindEvents();
        
        return this.element;
    }

    /**
     * Generate the HTML content for the card
     * @returns {string} HTML string for the card content
     * @private
     */
    _generateCardHTML() {
        const formattedDownloadCount = Formatters.formatDownloadCount(this.data.downloadCount);
        const formattedModelName = Formatters.formatModelName(this.data.modelName);
        const formattedQuantization = Formatters.formatQuantization(this.data.quantFormat);
        const formattedLicense = Formatters.formatLicense(this.data.license);
        const formattedModelType = Formatters.formatModelType(this.data.modelType);

        return `
            <div class="model-card-header">
                <div class="model-number">#${this.number}</div>
                <div class="model-metrics">
                    <div class="download-count" title="${this.data.downloadCount.toLocaleString()} downloads">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                        </svg>
                        ${formattedDownloadCount}
                    </div>
                    ${this._generateEngagementMetrics()}
                </div>
            </div>
            
            <div class="model-name-container">
                <h3 class="model-name" title="${this.data.modelName}">${formattedModelName}</h3>
                <button class="copy-button" data-copy-text="${this.data.modelName}" title="Copy model name" aria-label="Copy model name to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span class="copy-tooltip">Copy name</span>
                </button>
            </div>
            
            <div class="model-details">
                <span class="detail-label">Quantization:</span>
                <span class="detail-value">
                    <span class="quantization-badge">${formattedQuantization}</span>
                </span>
                
                <span class="detail-label">File Size:</span>
                <span class="detail-value">${this.data.fileSizeFormatted || Formatters.formatFileSize(this.data.fileSize)}</span>
                
                <span class="detail-label">Model Type:</span>
                <span class="detail-value">${formattedModelType}</span>
                
                <span class="detail-label">License:</span>
                <span class="detail-value" title="${this.data.license}">${formattedLicense}</span>
            </div>
            
            ${this._generateSystemRequirementsHTML()}
            
            <div class="model-actions">
                ${this._generateDownloadButtons()}
            </div>
        `;
    }

    /**
     * Generate engagement metrics HTML with comprehensive error handling and fallback display
     * @returns {string} HTML string for engagement metrics
     * @private
     */
    _generateEngagementMetrics() {
        try {
            // Use validation utility to get display configuration
            const displayConfig = window.EngagementValidation ? 
                window.EngagementValidation.getEngagementDisplayConfig(this.data) :
                this._getFallbackDisplayConfig();

            // Don't display anything if engagement data is not available or invalid
            if (!displayConfig.shouldDisplay) {
                return this._generateEngagementFallback(displayConfig);
            }

            const likeCount = this.data.likeCount || 0;
            const formattedLikeCount = displayConfig.displayValue;
            const engagementClass = displayConfig.displayClass;
            const tooltip = displayConfig.tooltip;
            const heartIcon = window.EngagementUtils ? 
                window.EngagementUtils.getHeartIcon(likeCount) : '❤️';
            const badge = window.EngagementUtils ? 
                window.EngagementUtils.getEngagementBadge(likeCount) : null;
            const shouldHighlight = window.EngagementUtils ? 
                window.EngagementUtils.shouldHighlightEngagement(likeCount) : false;

            let engagementHTML = `
                <div class="engagement-count ${engagementClass} ${shouldHighlight ? 'engagement-highlight' : ''}" 
                     title="${tooltip}"
                     data-engagement-value="${likeCount}">
                    ${displayConfig.showIcon ? `<span class="engagement-icon">${heartIcon}</span>` : ''}
                    <span class="engagement-number">${formattedLikeCount}</span>
                </div>
            `;

            // Add engagement badge for high-engagement models
            if (badge) {
                engagementHTML += `
                    <div class="engagement-badge ${engagementClass}">
                        ${badge}
                    </div>
                `;
            }

            return engagementHTML;
            
        } catch (error) {
            console.error(`Error generating engagement metrics for model ${this.data.modelName}:`, error);
            return this._generateEngagementError();
        }
    }

    /**
     * Generate fallback engagement display when data is unavailable but we want to show something
     * @private
     * @param {Object} displayConfig - Display configuration
     * @returns {string} HTML string for fallback display
     */
    _generateEngagementFallback(displayConfig) {
        // Only show fallback for zero values, not for completely missing/invalid data
        if (displayConfig.displayClass === 'engagement-zero') {
            return `
                <div class="engagement-count engagement-zero" 
                     title="${displayConfig.tooltip}"
                     data-engagement-value="0">
                    <span class="engagement-icon">🤍</span>
                    <span class="engagement-number">0</span>
                </div>
            `;
        }
        
        // For invalid/missing data, don't display anything
        return '';
    }

    /**
     * Generate error display for engagement metrics
     * @private
     * @returns {string} HTML string for error display
     */
    _generateEngagementError() {
        return `
            <div class="engagement-count engagement-error" 
                 title="Error loading engagement data"
                 data-engagement-error="true">
                <span class="engagement-icon">⚠️</span>
                <span class="engagement-number">N/A</span>
            </div>
        `;
    }

    /**
     * Generate system requirements HTML section
     * @returns {string} HTML string for system requirements section
     * @private
     */
    _generateSystemRequirementsHTML() {
        const { minCpuCores, minRamGB, gpuRequired } = this.data;
        
        // Only show if hardware data is available
        if (!minCpuCores && !minRamGB && gpuRequired === undefined) {
            return '';
        }
        
        let requirementsHTML = '<div class="system-requirements">';
        requirementsHTML += '<h4 class="requirements-title">System Requirements</h4>';
        requirementsHTML += '<div class="requirements-grid">';
        
        // CPU Requirements
        if (minCpuCores) {
            requirementsHTML += `
                <div class="requirement-item">
                    <div class="requirement-icon">🖥️</div>
                    <div class="requirement-content">
                        <span class="requirement-label">CPU Cores</span>
                        <span class="requirement-value">${minCpuCores}+ cores</span>
                    </div>
                </div>
            `;
        }
        
        // RAM Requirements
        if (minRamGB) {
            requirementsHTML += `
                <div class="requirement-item">
                    <div class="requirement-icon">💾</div>
                    <div class="requirement-content">
                        <span class="requirement-label">RAM</span>
                        <span class="requirement-value">${minRamGB}+ GB</span>
                    </div>
                </div>
            `;
        }
        
        // GPU Requirements (only show if required)
        if (gpuRequired === true) {
            requirementsHTML += `
                <div class="requirement-item gpu-required">
                    <div class="requirement-icon">🎮</div>
                    <div class="requirement-content">
                        <span class="requirement-label">GPU</span>
                        <span class="requirement-value">Required</span>
                    </div>
                </div>
            `;
        }
        
        requirementsHTML += '</div></div>';
        return requirementsHTML;
    }

    /**
     * Get fallback display configuration when validation utility is not available
     * @private
     * @returns {Object} Fallback display configuration
     */
    _getFallbackDisplayConfig() {
        const likeCount = this.data.likeCount;
        
        // Basic validation without the utility
        if (likeCount == null || isNaN(likeCount) || likeCount < 0) {
            return {
                shouldDisplay: false,
                displayValue: 'N/A',
                displayClass: 'engagement-unavailable',
                tooltip: 'Engagement data unavailable',
                showIcon: false
            };
        }

        if (likeCount === 0) {
            return {
                shouldDisplay: true,
                displayValue: '0',
                displayClass: 'engagement-zero',
                tooltip: 'No likes yet',
                showIcon: true
            };
        }

        return {
            shouldDisplay: true,
            displayValue: window.Formatters ? 
                window.Formatters.formatEngagementNumber(likeCount) : 
                likeCount.toString(),
            displayClass: 'engagement-valid',
            tooltip: `${likeCount} likes`,
            showIcon: true
        };
    }

    /**
     * Generate download buttons HTML
     * @returns {string} HTML string for download buttons
     * @private
     */
    _generateDownloadButtons() {
        let buttonsHTML = '';

        // Direct download button with copy functionality
        if (this.data.directDownloadLink) {
            buttonsHTML += `
                <div class="btn-group">
                    <a href="${this.data.directDownloadLink}" 
                       class="btn btn-primary download-btn" 
                       data-download-type="direct"
                       title="Download directly"
                       target="_blank"
                       rel="noopener noreferrer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                        </svg>
                        Direct Download
                    </a>
                    <button class="copy-button copy-link-btn" 
                            data-copy-text="${this.data.directDownloadLink}" 
                            title="Copy direct download link" 
                            aria-label="Copy direct download link to clipboard">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span class="copy-tooltip">Copy link</span>
                    </button>
                </div>
            `;
        }

        // HuggingFace link button with copy functionality
        if (this.data.huggingFaceLink) {
            buttonsHTML += `
                <div class="btn-group">
                    <a href="${this.data.huggingFaceLink}" 
                       class="btn btn-secondary huggingface-btn" 
                       data-download-type="huggingface"
                       title="View on HuggingFace"
                       target="_blank"
                       rel="noopener noreferrer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        HuggingFace
                    </a>
                    <button class="copy-button copy-link-btn" 
                            data-copy-text="${this.data.huggingFaceLink}" 
                            title="Copy HuggingFace link" 
                            aria-label="Copy HuggingFace link to clipboard">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span class="copy-tooltip">Copy link</span>
                    </button>
                </div>
            `;
        }

        // If no download links are available, show a disabled message
        if (!buttonsHTML) {
            buttonsHTML = `
                <div class="btn btn-secondary disabled" title="No download links available">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    No Downloads
                </div>
            `;
        }

        return buttonsHTML;
    }

    /**
     * Bind event handlers to the card
     * @private
     */
    _bindEvents() {
        if (!this.element) return;

        // Add click tracking for download buttons
        const downloadButtons = this.element.querySelectorAll('.download-btn, .huggingface-btn');
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this._handleDownloadClick(e, button);
            });
        });

        // Add copy functionality for all copy buttons
        const copyButtons = this.element.querySelectorAll('.copy-button');
        copyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._handleCopyClick(button);
            });
        });

        // Enhanced keyboard navigation support
        this.element.addEventListener('keydown', (e) => {
            this._handleKeyboardNavigation(e);
        });

        // Make card focusable for keyboard navigation
        this.element.setAttribute('tabindex', '0');
        this.element.setAttribute('role', 'article');
        this.element.setAttribute('aria-label', `Model ${this.data.modelName}, #${this.number}`);

        // Add focus/blur handlers for keyboard navigation indicator
        this.element.addEventListener('focus', () => {
            document.body.classList.add('keyboard-nav-active');
        });

        this.element.addEventListener('blur', () => {
            // Remove keyboard nav indicator after a delay to allow for focus transitions
            setTimeout(() => {
                if (!document.activeElement || !document.activeElement.closest('.model-card')) {
                    document.body.classList.remove('keyboard-nav-active');
                }
            }, 100);
        });
    }

    /**
     * Handle download button clicks
     * @param {Event} event - Click event
     * @param {HTMLElement} button - Clicked button
     * @private
     */
    _handleDownloadClick(event, button) {
        const downloadType = button.dataset.downloadType;
        
        // Track download analytics (if needed)
        this._trackDownload(downloadType);
        
        // Add visual feedback
        button.classList.add('downloading');
        setTimeout(() => {
            button.classList.remove('downloading');
        }, 1000);
    }

    /**
     * Track download events for analytics
     * @param {string} downloadType - Type of download (direct, huggingface)
     * @private
     */
    _trackDownload(downloadType) {
        // This could be extended to send analytics data
        console.log(`Download tracked: ${this.data.modelName} via ${downloadType}`);
        
        // Dispatch custom event for external tracking
        const event = new CustomEvent('modelDownload', {
            detail: {
                modelName: this.data.modelName,
                downloadType: downloadType,
                sequentialNumber: this.number,
                modelData: this.data
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle copy button clicks
     * @param {HTMLElement} button - Copy button element
     * @private
     */
    async _handleCopyClick(button) {
        const textToCopy = button.dataset.copyText;
        if (!textToCopy) return;

        const success = await Helpers.copyToClipboard(textToCopy);
        
        if (success) {
            this._showCopySuccess(button);
            this._trackCopyAction(textToCopy);
        } else {
            this._showCopyError(button);
        }
    }

    /**
     * Show copy success feedback
     * @param {HTMLElement} button - Copy button element
     * @private
     */
    _showCopySuccess(button) {
        const tooltip = button.querySelector('.copy-tooltip');
        const originalText = tooltip.textContent;
        
        // Update button appearance
        button.classList.add('copy-success');
        tooltip.textContent = 'Copied!';
        
        // Show success animation
        button.style.animation = 'bounce 0.6s ease-out';
        
        // Reset after delay
        setTimeout(() => {
            button.classList.remove('copy-success');
            tooltip.textContent = originalText;
            button.style.animation = '';
        }, 2000);
    }

    /**
     * Show copy error feedback
     * @param {HTMLElement} button - Copy button element
     * @private
     */
    _showCopyError(button) {
        const tooltip = button.querySelector('.copy-tooltip');
        const originalText = tooltip.textContent;
        
        tooltip.textContent = 'Copy failed';
        tooltip.style.background = 'var(--error-color)';
        
        setTimeout(() => {
            tooltip.textContent = originalText;
            tooltip.style.background = '';
        }, 2000);
    }

    /**
     * Track copy actions for analytics
     * @param {string} copiedText - Text that was copied
     * @private
     */
    _trackCopyAction(copiedText) {
        const event = new CustomEvent('modelCopy', {
            detail: {
                modelName: this.data.modelName,
                copiedText: copiedText,
                sequentialNumber: this.number,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);

        // Show success notification
        if (window.notifications) {
            const isLink = copiedText.startsWith('http');
            const message = isLink ? 'Link copied to clipboard!' : 'Model name copied to clipboard!';
            window.notifications.success(message);
        }
    }

    /**
     * Handle keyboard navigation within the card
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    _handleKeyboardNavigation(e) {
        const focusableElements = this.element.querySelectorAll(
            'a, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement);

        switch (e.key) {
            case 'Enter':
            case ' ':
                if (document.activeElement === this.element) {
                    // If card itself is focused, activate first button
                    e.preventDefault();
                    const firstButton = this.element.querySelector('.btn:not(.disabled)');
                    if (firstButton) {
                        firstButton.click();
                    }
                }
                break;

            case 'ArrowRight':
            case 'Tab':
                if (!e.shiftKey && currentIndex >= 0 && currentIndex < focusableArray.length - 1) {
                    e.preventDefault();
                    focusableArray[currentIndex + 1].focus();
                }
                break;

            case 'ArrowLeft':
                if (currentIndex > 0) {
                    e.preventDefault();
                    focusableArray[currentIndex - 1].focus();
                } else if (currentIndex === 0) {
                    e.preventDefault();
                    this.element.focus();
                }
                break;

            case 'Escape':
                this.element.focus();
                break;

            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+C to copy model name
                    e.preventDefault();
                    this._handleCopyClick(this.element.querySelector('.copy-button'));
                }
                break;
        }
    }

    /**
     * Copy model name to clipboard (legacy method for backward compatibility)
     * @private
     */
    async _copyModelName() {
        const copyButton = this.element.querySelector('.copy-button');
        if (copyButton) {
            await this._handleCopyClick(copyButton);
        }
    }

    /**
     * Update the card's sequential number
     * @param {number} newNumber - New sequential number
     */
    updateNumber(newNumber) {
        this.number = newNumber;
        if (this.element) {
            const numberElement = this.element.querySelector('.model-number');
            if (numberElement) {
                numberElement.textContent = `#${newNumber}`;
            }
            this.element.dataset.modelId = newNumber;
        }
    }

    /**
     * Get the card's current data
     * @returns {Object} Model data object
     */
    getData() {
        return { ...this.data };
    }

    /**
     * Get the card's sequential number
     * @returns {number} Sequential number
     */
    getNumber() {
        return this.number;
    }

    /**
     * Update card data for recycling (performance optimization)
     * @param {Object} newModelData - New model data
     * @param {number} newSequentialNumber - New sequential number
     */
    updateData(newModelData, newSequentialNumber) {
        this.data = newModelData;
        this.number = newSequentialNumber;
        
        // Update dataset attributes
        if (this.element) {
            this.element.dataset.modelId = this.number;
            this.element.dataset.modelName = this.data.modelName;
            
            // Re-generate content
            this.element.innerHTML = this._generateCardHTML();
            
            // Re-bind events
            this._bindEvents();
        }
    }

    /**
     * Get the sequential number of this card
     * @returns {number} Sequential number
     */
    getNumber() {
        return this.number;
    }

    /**
     * Get the model data for this card
     * @returns {Object} Model data
     */
    getData() {
        return this.data;
    }

    /**
     * Destroy the card and clean up event listeners
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.data = null;
    }

    /**
     * Check if the card matches a search query
     * @param {string} query - Search query
     * @returns {boolean} True if card matches query
     */
    matchesSearch(query) {
        if (!query) return true;
        
        const searchableFields = [
            this.data.modelName,
            this.data.quantFormat,
            this.data.modelType,
            this.data.license
        ];
        
        const lowerQuery = query.toLowerCase();
        return searchableFields.some(field => 
            field && field.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Check if the card matches filter criteria
     * @param {Object} filters - Filter criteria object
     * @returns {boolean} True if card matches filters
     */
    matchesFilters(filters) {
        if (!filters) return true;
        
        // Check quantization filter
        if (filters.quantFormat && filters.quantFormat !== 'all') {
            if (this.data.quantFormat !== filters.quantFormat) {
                return false;
            }
        }
        
        // Check model type filter
        if (filters.modelType && filters.modelType !== 'all') {
            if (this.data.modelType !== filters.modelType) {
                return false;
            }
        }
        
        // Check license filter
        if (filters.license && filters.license !== 'all') {
            if (this.data.license !== filters.license) {
                return false;
            }
        }
        
        // Check file size range
        if (filters.fileSizeRange) {
            const [min, max] = filters.fileSizeRange;
            if (this.data.fileSize < min || this.data.fileSize > max) {
                return false;
            }
        }
        
        // Check download count range
        if (filters.downloadRange) {
            const [min, max] = filters.downloadRange;
            if (this.data.downloadCount < min || this.data.downloadCount > max) {
                return false;
            }
        }
        
        // Check engagement metrics range (like count)
        if (filters.likeRange) {
            const [min, max] = filters.likeRange;
            const likeCount = this.data.likeCount || 0;
            if (likeCount < min || likeCount > max) {
                return false;
            }
        }
        
        return true;
    }
}

// Export for use in other modules
window.ModelCard = ModelCard;