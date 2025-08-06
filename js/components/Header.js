/**
 * Header component for GGUF Model Discovery
 * Displays last update time, data freshness, and model counts
 */

class Header {
    constructor(containerId, appState) {
        this.container = document.getElementById(containerId);
        this.appState = appState;
        
        if (!this.container) {
            throw new Error(`Header container with ID '${containerId}' not found`);
        }

        // Component state
        this.lastUpdateTime = null;
        this.totalCount = 0;
        this.filteredCount = 0;
        this.allModels = [];
        this.filteredModels = [];
        
        // Bind methods
        this.render = this.render.bind(this);
        this.updateStats = this.updateStats.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
        
        // Subscribe to state changes
        this.subscriptionId = this.appState.subscribe(
            this.handleStateChange,
            ['allModels', 'filteredModels', 'lastUpdateTime', 'activeFilters']
        );
        
        // Initial render
        this.render();
    }

    /**
     * Handle state changes from AppState
     * @param {object} newState - New application state
     */
    handleStateChange(newState) {
        const { allModels, filteredModels, lastUpdateTime } = newState;
        
        this.lastUpdateTime = lastUpdateTime;
        this.totalCount = allModels.length;
        this.filteredCount = filteredModels.length;
        this.allModels = allModels;
        this.filteredModels = filteredModels;
        
        this.updateStats();
    }

    /**
     * Render the header component
     */
    render() {
        this.container.innerHTML = `
            <div class="header">
                <div class="container">
                    <div class="header-content">
                        <div class="header-left">
                            <div class="header-logo-section">
                                <div class="header-logo" onclick="window.location.href='/'">
                                    <img src="logo.svg" alt="Local AI Zone Logo" class="logo-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                    <div class="logo-fallback" style="display: none;">
                                        <svg class="logo-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </div>
                                <div class="header-text">
                                    <h1 class="header-title">
                                        🧠 GGUF Model Discovery
                                    </h1>
                                    <div class="header-subtitle">
                                        Enhanced AI Model Browser
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="header-right">
                            <div class="header-stats">
                                <div class="stat-item" id="model-count-stat">
                                    <span class="stat-label">Models:</span>
                                    <span class="stat-value" id="model-count-value">Loading...</span>
                                </div>
                                
                                <div class="stat-item" id="total-likes-stat">
                                    <span class="stat-label">❤️ Total Likes:</span>
                                    <span class="stat-value" id="total-likes-value">--</span>
                                </div>
                                
                                <div class="stat-item" id="avg-likes-stat">
                                    <span class="stat-label">Avg Likes:</span>
                                    <span class="stat-value" id="avg-likes-value">--</span>
                                </div>
                                
                                <div class="stat-item" id="update-time-stat">
                                    <span class="stat-label">Updated:</span>
                                    <span class="stat-value" id="update-time-value">--</span>
                                </div>
                                
                                <div class="freshness-indicator" id="freshness-indicator">
                                    <span class="freshness-dot"></span>
                                    <span class="freshness-text">Unknown</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="header-filters" id="active-filters-display">
                        <!-- Active filters will be displayed here -->
                    </div>
                </div>
            </div>
        `;
        
        // Apply initial styles
        this._applyStyles();
    }

    /**
     * Update statistics display
     */
    updateStats() {
        this._updateModelCount();
        this._updateEngagementStats();
        this._updateLastUpdateTime();
        this._updateDataFreshness();
        this._updateActiveFilters();
    }

    /**
     * Update model count display
     * @private
     */
    _updateModelCount() {
        const countElement = document.getElementById('model-count-value');
        if (!countElement) return;

        if (this.filteredCount !== this.totalCount) {
            countElement.textContent = `${this.filteredCount.toLocaleString()} of ${this.totalCount.toLocaleString()}`;
            countElement.classList.add('filtered');
        } else {
            countElement.textContent = this.totalCount.toLocaleString();
            countElement.classList.remove('filtered');
        }
    }

    /**
     * Update engagement statistics display
     * @private
     */
    _updateEngagementStats() {
        this._updateTotalLikes();
        this._updateAverageLikes();
    }

    /**
     * Update total likes display
     * @private
     */
    _updateTotalLikes() {
        const totalLikesElement = document.getElementById('total-likes-value');
        if (!totalLikesElement) return;

        // Calculate total likes for all models and filtered models
        const allTotalLikes = this.allModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const filteredTotalLikes = this.filteredModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);

        if (this.filteredCount !== this.totalCount) {
            // Show filtered likes vs total likes
            const formattedFiltered = window.Formatters ? 
                window.Formatters.formatEngagementNumber(filteredTotalLikes) : 
                filteredTotalLikes.toLocaleString();
            const formattedTotal = window.Formatters ? 
                window.Formatters.formatEngagementNumber(allTotalLikes) : 
                allTotalLikes.toLocaleString();
            
            totalLikesElement.textContent = `${formattedFiltered} of ${formattedTotal}`;
            totalLikesElement.classList.add('filtered');
            totalLikesElement.title = `${filteredTotalLikes.toLocaleString()} likes in filtered results of ${allTotalLikes.toLocaleString()} total likes`;
        } else {
            // Show total likes for all models
            const formatted = window.Formatters ? 
                window.Formatters.formatEngagementNumber(allTotalLikes) : 
                allTotalLikes.toLocaleString();
            
            totalLikesElement.textContent = formatted;
            totalLikesElement.classList.remove('filtered');
            totalLikesElement.title = `${allTotalLikes.toLocaleString()} total likes across all models`;
        }
    }

    /**
     * Update average likes display
     * @private
     */
    _updateAverageLikes() {
        const avgLikesElement = document.getElementById('avg-likes-value');
        if (!avgLikesElement) return;

        // Calculate average likes for the current view (filtered or all)
        const modelsToUse = this.filteredCount !== this.totalCount ? this.filteredModels : this.allModels;
        const totalLikes = modelsToUse.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const avgLikes = modelsToUse.length > 0 ? totalLikes / modelsToUse.length : 0;

        const formatted = window.Formatters ? 
            window.Formatters.formatEngagementNumber(Math.round(avgLikes)) : 
            Math.round(avgLikes).toString();

        avgLikesElement.textContent = formatted;
        
        if (this.filteredCount !== this.totalCount) {
            avgLikesElement.classList.add('filtered');
            avgLikesElement.title = `Average ${avgLikes.toFixed(1)} likes per model in filtered results`;
        } else {
            avgLikesElement.classList.remove('filtered');
            avgLikesElement.title = `Average ${avgLikes.toFixed(1)} likes per model`;
        }
    }

    /**
     * Update last update time display
     * @private
     */
    _updateLastUpdateTime() {
        const timeElement = document.getElementById('update-time-value');
        if (!timeElement) return;

        if (this.lastUpdateTime) {
            const formattedTime = this._formatUpdateTime(this.lastUpdateTime);
            timeElement.textContent = formattedTime;
            timeElement.title = `Last updated: ${Formatters.formatTimestamp(this.lastUpdateTime)}`;
        } else {
            timeElement.textContent = 'Unknown';
            timeElement.title = 'Update time not available';
        }
    }

    /**
     * Update data freshness indicator
     * @private
     */
    _updateDataFreshness() {
        const freshnessElement = document.getElementById('freshness-indicator');
        if (!freshnessElement) return;

        const freshness = Formatters.getDataFreshness(this.lastUpdateTime);
        
        // Update classes
        freshnessElement.className = `freshness-indicator freshness-${freshness.status}`;
        
        // Update text
        const textElement = freshnessElement.querySelector('.freshness-text');
        if (textElement) {
            textElement.textContent = freshness.text;
        }
        
        // Update title for accessibility with engagement data info
        freshnessElement.title = this._getFreshnessDescriptionWithEngagement(freshness);
    }

    /**
     * Update active filters display
     * @private
     */
    _updateActiveFilters() {
        const filtersElement = document.getElementById('active-filters-display');
        if (!filtersElement) return;

        const state = this.appState.getState();
        const activeFilters = state.activeFilters || [];

        if (activeFilters.length === 0) {
            filtersElement.style.display = 'none';
            return;
        }

        filtersElement.style.display = 'block';
        filtersElement.innerHTML = `
            <div class="active-filters">
                <span class="filters-label">Active filters:</span>
                <div class="filter-tags">
                    ${activeFilters.map(filter => `
                        <span class="filter-tag">
                            ${filter}
                            <button class="filter-remove" onclick="this.parentElement.remove()" aria-label="Remove filter">
                                ×
                            </button>
                        </span>
                    `).join('')}
                </div>
                <button class="clear-filters-btn" onclick="window.app.clearAllFilters()" title="Clear all filters">
                    Clear All
                </button>
            </div>
        `;
    }

    /**
     * Format update time for display
     * @private
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time string
     */
    _formatUpdateTime(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffHours < 1) {
                return 'Just now';
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Get freshness description for accessibility
     * @private
     * @param {object} freshness - Freshness object
     * @returns {string} Description text
     */
    _getFreshnessDescription(freshness) {
        switch (freshness.status) {
            case 'fresh':
                return 'Data is fresh (updated within 24 hours)';
            case 'recent':
                return 'Data is recent (updated within 72 hours)';
            case 'stale':
                return 'Data is stale (updated more than 72 hours ago)';
            default:
                return 'Data freshness unknown';
        }
    }

    /**
     * Get freshness description with engagement data info for accessibility
     * @private
     * @param {object} freshness - Freshness object
     * @returns {string} Description text including engagement data info
     */
    _getFreshnessDescriptionWithEngagement(freshness) {
        const baseDescription = this._getFreshnessDescription(freshness);
        
        // Add engagement data context
        const totalLikes = this.allModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const modelsWithLikes = this.allModels.filter(model => (model.likeCount || 0) > 0).length;
        
        const engagementInfo = totalLikes > 0 ? 
            ` • Includes ${totalLikes.toLocaleString()} likes across ${modelsWithLikes} models` : 
            ' • No engagement data available';
        
        return baseDescription + engagementInfo;
    }

    /**
     * Apply component styles
     * @private
     */
    _applyStyles() {
        // Add component-specific styles if not already added
        if (!document.getElementById('header-styles')) {
            const style = document.createElement('style');
            style.id = 'header-styles';
            style.textContent = `
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .header-logo-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .header-logo {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    transition: var(--transition);
                    border-radius: var(--border-radius);
                    padding: 0.25rem;
                }

                .header-logo:hover {
                    transform: scale(1.05);
                    opacity: 0.9;
                }

                .logo-image {
                    height: 40px;
                    width: auto;
                    max-width: 200px;
                    display: block;
                }

                .logo-fallback {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background: var(--primary-color);
                    border-radius: var(--border-radius);
                    color: white;
                }

                .logo-icon {
                    width: 24px;
                    height: 24px;
                }

                .header-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .header-subtitle {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    font-weight: 400;
                }

                .header-stats {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    font-size: 0.875rem;
                    flex-wrap: wrap;
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .stat-label {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .stat-value {
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .stat-value.filtered {
                    color: var(--primary-color);
                }

                .freshness-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: help;
                }

                .freshness-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .freshness-fresh {
                    background-color: #DCFCE7;
                    color: #166534;
                }

                .freshness-fresh .freshness-dot {
                    background-color: #10B981;
                }

                .freshness-recent {
                    background-color: #FEF3C7;
                    color: #92400E;
                }

                .freshness-recent .freshness-dot {
                    background-color: #F59E0B;
                }

                .freshness-stale {
                    background-color: #FEE2E2;
                    color: #991B1B;
                }

                .freshness-stale .freshness-dot {
                    background-color: #EF4444;
                }

                .active-filters {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 0;
                    border-top: 1px solid var(--border-color);
                    margin-top: 1rem;
                }

                .filters-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                    flex-shrink: 0;
                }

                .filter-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    flex: 1;
                }

                .filter-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    background: var(--primary-color);
                    color: white;
                    border-radius: var(--border-radius);
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .filter-remove {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                    line-height: 1;
                    padding: 0;
                    margin-left: 0.25rem;
                }

                .filter-remove:hover {
                    opacity: 0.8;
                }

                .clear-filters-btn {
                    background: var(--card-background);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--border-radius);
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .clear-filters-btn:hover {
                    background: var(--background-color);
                }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-logo-section {
                        gap: 0.5rem;
                    }

                    .logo-image {
                        height: 36px;
                        max-width: 150px;
                    }

                    .logo-fallback {
                        width: 36px;
                        height: 36px;
                    }

                    .logo-icon {
                        width: 20px;
                        height: 20px;
                    }

                    .header-stats {
                        flex-wrap: wrap;
                        gap: 1rem;
                        justify-content: flex-start;
                    }

                    .stat-item {
                        min-width: fit-content;
                    }

                    .active-filters {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .filter-tags {
                        width: 100%;
                    }
                }

                @media (max-width: 480px) {
                    .header-logo-section {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .logo-image {
                        height: 32px;
                        max-width: 100px;
                    }

                    .logo-fallback {
                        width: 32px;
                        height: 32px;
                    }

                    .logo-icon {
                        width: 18px;
                        height: 18px;
                    }

                    .header-stats {
                        gap: 0.75rem;
                        font-size: 0.8rem;
                    }

                    .stat-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.125rem;
                    }

                    .stat-label {
                        font-size: 0.75rem;
                    }
                }

                @media (max-width: 320px) {
                    .logo-image {
                        height: 28px;
                        max-width: 80px;
                    }

                    .logo-fallback {
                        width: 28px;
                        height: 28px;
                    }

                    .logo-icon {
                        width: 16px;
                        height: 16px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.subscriptionId) {
            this.appState.unsubscribe(this.subscriptionId);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
window.Header = Header;