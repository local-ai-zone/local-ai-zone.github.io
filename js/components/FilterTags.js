/**
 * FilterTags Component for displaying active filters
 * Shows active filters with individual remove buttons and clear all functionality
 */

class FilterTags {
    constructor(container) {
        this.container = container;
        this.activeFilters = new Map();
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="active-filters-container" style="display: none;">
                <div class="active-filters-header">
                    <span class="active-filters-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                        Active Filters:
                    </span>
                    <button class="clear-all-filters" type="button" aria-label="Clear all filters">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                        Clear All
                    </button>
                </div>
                <div class="active-filters-list" role="list" aria-label="Active filters"></div>
                <div class="filter-results-summary">
                    <span class="results-text">Showing <span class="results-count">0</span> of <span class="total-count">0</span> models</span>
                </div>
            </div>
        `;
    }
    
    addFilter(type, value, displayText, count = null) {
        const filterKey = `${type}:${value}`;
        this.activeFilters.set(filterKey, {
            type,
            value,
            displayText: displayText || value,
            count
        });
        this.updateDisplay();
        
        // Emit filter added event
        this.container.dispatchEvent(new CustomEvent('filterAdded', {
            detail: { type, value, displayText, count }
        }));
    }
    
    removeFilter(type, value) {
        const filterKey = `${type}:${value}`;
        this.activeFilters.delete(filterKey);
        this.updateDisplay();
        
        // Emit filter removal event
        this.container.dispatchEvent(new CustomEvent('filterRemoved', {
            detail: { type, value }
        }));
    }
    
    clearAllFilters() {
        this.activeFilters.clear();
        this.updateDisplay();
        
        // Emit clear all event
        this.container.dispatchEvent(new CustomEvent('filtersCleared'));
    }
    
    hasFilters() {
        return this.activeFilters.size > 0;
    }
    
    getActiveFilters() {
        return Array.from(this.activeFilters.entries()).map(([key, filter]) => ({
            key,
            ...filter
        }));
    }
    
    updateResultsCount(filteredCount, totalCount) {
        const resultsCountSpan = this.container.querySelector('.results-count');
        const totalCountSpan = this.container.querySelector('.total-count');
        
        if (resultsCountSpan) {
            resultsCountSpan.textContent = filteredCount.toLocaleString();
        }
        if (totalCountSpan) {
            totalCountSpan.textContent = totalCount.toLocaleString();
        }
    }
    
    updateDisplay() {
        const container = this.container.querySelector('.active-filters-container');
        const list = this.container.querySelector('.active-filters-list');
        
        if (this.activeFilters.size === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        list.innerHTML = Array.from(this.activeFilters.entries()).map(([key, filter]) => `
            <div class="filter-tag" 
                 data-filter-key="${key}" 
                 role="listitem"
                 aria-label="${filter.displayText} filter">
                <span class="filter-tag-icon" aria-hidden="true">${this.getFilterIcon(filter.type)}</span>
                <span class="filter-tag-text">${filter.displayText}</span>
                ${filter.count !== null ? `<span class="filter-tag-count">(${filter.count})</span>` : ''}
                <button class="filter-tag-remove" 
                        data-type="${filter.type}" 
                        data-value="${filter.value}"
                        aria-label="Remove ${filter.displayText} filter"
                        type="button">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // Update accessibility
        this.updateAccessibility();
    }
    
    updateAccessibility() {
        const container = this.container.querySelector('.active-filters-container');
        const filterCount = this.activeFilters.size;
        
        // Update container aria-label
        container.setAttribute('aria-label', `${filterCount} active filter${filterCount !== 1 ? 's' : ''}`);
        
        // Announce changes to screen readers
        const announcement = filterCount === 0 
            ? 'All filters cleared' 
            : `${filterCount} filter${filterCount !== 1 ? 's' : ''} active`;
            
        this.announceToScreenReader(announcement);
    }
    
    announceToScreenReader(message) {
        // Create a temporary element for screen reader announcements
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    getFilterIcon(type) {
        const icons = {
            search: '🔍',
            quantization: '⚙️',
            modelType: '📋',
            license: '📄',
            cpu: '🖥️',
            ram: '💾',
            gpu: '🎮',
            fileSize: '📦',
            downloads: '📈',
            engagement: '❤️'
        };
        return icons[type] || '🏷️';
    }
    
    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.filter-tag-remove')) {
                const button = e.target.closest('.filter-tag-remove');
                const type = button.dataset.type;
                const value = button.dataset.value;
                this.removeFilter(type, value);
            } else if (e.target.closest('.clear-all-filters')) {
                this.clearAllFilters();
            }
        });
        
        // Keyboard navigation for filter tags
        this.container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('filter-tag-remove')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.target.click();
                }
            } else if (e.target.classList.contains('clear-all-filters')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.target.click();
                }
            }
        });
    }
    
    // Animation methods for smooth transitions
    animateFilterAdd(filterElement) {
        filterElement.style.opacity = '0';
        filterElement.style.transform = 'scale(0.8)';
        
        requestAnimationFrame(() => {
            filterElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            filterElement.style.opacity = '1';
            filterElement.style.transform = 'scale(1)';
        });
    }
    
    animateFilterRemove(filterElement, callback) {
        filterElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        filterElement.style.opacity = '0';
        filterElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            if (callback) callback();
        }, 200);
    }
    
    // Utility methods
    getFilterByKey(key) {
        return this.activeFilters.get(key);
    }
    
    hasFilter(type, value) {
        return this.activeFilters.has(`${type}:${value}`);
    }
    
    getFilterCount() {
        return this.activeFilters.size;
    }
    
    getFiltersByType(type) {
        return Array.from(this.activeFilters.entries())
            .filter(([key, filter]) => filter.type === type)
            .map(([key, filter]) => filter);
    }
    
    // Export filter state for persistence
    exportState() {
        return {
            filters: Array.from(this.activeFilters.entries()).map(([key, filter]) => ({
                key,
                ...filter
            }))
        };
    }
    
    // Import filter state from persistence
    importState(state) {
        if (state && state.filters) {
            this.activeFilters.clear();
            state.filters.forEach(filter => {
                this.activeFilters.set(filter.key, {
                    type: filter.type,
                    value: filter.value,
                    displayText: filter.displayText,
                    count: filter.count
                });
            });
            this.updateDisplay();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterTags;
} else {
    window.FilterTags = FilterTags;
}