/**
 * MobileFilters Component for GGUF Model Discovery
 * Provides collapsible filter sections and touch-friendly controls for mobile devices
 */

class MobileFilters {
    constructor(container) {
        this.container = container;
        this.isCollapsed = true;
        this.activeGroups = new Set();
        this.activeFilterCount = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.enhanceForMobile = this.enhanceForMobile.bind(this);
        this.createCollapsibleStructure = this.createCollapsibleStructure.bind(this);
        this.toggleFilters = this.toggleFilters.bind(this);
        this.toggleSection = this.toggleSection.bind(this);
        this.updateActiveFilterCount = this.updateActiveFilterCount.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        this.init();
    }
    
    init() {
        this.enhanceForMobile();
        this.attachEventListeners();
        this.setupTouchGestures();
    }
    
    enhanceForMobile() {
        if (window.innerWidth <= 768) {
            this.createCollapsibleStructure();
        }
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.createCollapsibleStructure();
            } else {
                this.removeCollapsibleStructure();
            }
        });
    }
    
    createCollapsibleStructure() {
        // Skip if already mobile-enhanced
        if (this.container.querySelector('.mobile-filter-header')) {
            return;
        }
        
        const filterGroups = this.container.querySelectorAll('.filter-group');
        
        // Create mobile filter header
        const header = document.createElement('div');
        header.className = 'mobile-filter-header';
        header.innerHTML = `
            <button class="mobile-filter-toggle" type="button" aria-expanded="false">
                <div class="toggle-content">
                    <div class="toggle-icon-text">
                        <svg class="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
                        </svg>
                        <span class="toggle-text">Filters</span>
                    </div>
                    <div class="toggle-indicators">
                        <div class="active-filter-count" style="display: none;">
                            <span class="count">0</span>
                        </div>
                        <svg class="toggle-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 12,15 18,9"/>
                        </svg>
                    </div>
                </div>
            </button>
        `;
        
        this.container.insertBefore(header, this.container.firstChild);
        
        // Create collapsible filter container
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'mobile-filters-container';
        filtersContainer.style.display = 'none';
        
        // Group filters into logical sections
        const sections = [
            {
                title: 'Content Filters',
                icon: '📋',
                filters: ['quantization-filter', 'model-type-filter', 'license-filter'],
                description: 'Filter by model properties'
            },
            {
                title: 'Hardware Requirements',
                icon: '🖥️',
                filters: ['cpu-filter', 'ram-filter', 'gpu-filter'],
                description: 'Filter by system requirements'
            },
            {
                title: 'Performance Metrics',
                icon: '📊',
                filters: ['download-filter', 'engagement-filter'],
                description: 'Filter by popularity and usage'
            }
        ];
        
        sections.forEach(section => {
            this.createFilterSection(section, filtersContainer);
        });
        
        // Add clear all filters button
        const clearAllSection = document.createElement('div');
        clearAllSection.className = 'mobile-clear-section';
        clearAllSection.innerHTML = `
            <button class="mobile-clear-all-btn" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                Clear All Filters
            </button>
        `;
        filtersContainer.appendChild(clearAllSection);
        
        this.container.appendChild(filtersContainer);
        
        // Hide original filter groups on mobile
        filterGroups.forEach(group => {
            group.style.display = 'none';
        });
    }
    
    createFilterSection(section, container) {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'mobile-filter-section';
        sectionElement.innerHTML = `
            <button class="filter-section-header" type="button" data-section="${section.title}" aria-expanded="false">
                <div class="section-info">
                    <div class="section-icon-title">
                        <span class="section-icon">${section.icon}</span>
                        <div class="section-text">
                            <span class="section-title">${section.title}</span>
                            <span class="section-description">${section.description}</span>
                        </div>
                    </div>
                    <svg class="section-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 12,15 18,9"/>
                    </svg>
                </div>
            </button>
            <div class="filter-section-content" style="display: none;">
                <div class="section-filters"></div>
            </div>
        `;
        
        const content = sectionElement.querySelector('.section-filters');
        
        // Move relevant filter groups to this section
        section.filters.forEach(filterId => {
            const originalFilter = document.getElementById(filterId);
            if (originalFilter) {
                const filterGroup = originalFilter.closest('.filter-group');
                if (filterGroup) {
                    // Clone the filter group for mobile
                    const mobileFilterGroup = this.createMobileFilterGroup(filterGroup, filterId);
                    content.appendChild(mobileFilterGroup);
                }
            }
        });
        
        container.appendChild(sectionElement);
    }
    
    createMobileFilterGroup(originalGroup, filterId) {
        const mobileGroup = document.createElement('div');
        mobileGroup.className = 'mobile-filter-group';
        
        const label = originalGroup.querySelector('.filter-label');
        const select = originalGroup.querySelector('select');
        
        if (label && select) {
            mobileGroup.innerHTML = `
                <div class="mobile-filter-item">
                    <label class="mobile-filter-label" for="mobile-${filterId}">
                        ${label.textContent}
                    </label>
                    <div class="mobile-select-wrapper">
                        <select id="mobile-${filterId}" class="mobile-filter-select" data-original-id="${filterId}">
                            ${select.innerHTML}
                        </select>
                        <svg class="select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 12,15 18,9"/>
                        </svg>
                    </div>
                </div>
            `;
            
            // Sync values
            const mobileSelect = mobileGroup.querySelector('.mobile-filter-select');
            mobileSelect.value = select.value;
            
            // Add change listener to sync with original
            mobileSelect.addEventListener('change', (e) => {
                select.value = e.target.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                this.updateActiveFilterCount();
            });
        }
        
        return mobileGroup;
    }
    
    removeCollapsibleStructure() {
        // Remove mobile-specific elements
        const mobileHeader = this.container.querySelector('.mobile-filter-header');
        const mobileContainer = this.container.querySelector('.mobile-filters-container');
        
        if (mobileHeader) {
            mobileHeader.remove();
        }
        
        if (mobileContainer) {
            mobileContainer.remove();
        }
        
        // Show original filter groups
        const filterGroups = this.container.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            group.style.display = '';
        });
    }
    
    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.mobile-filter-toggle')) {
                this.toggleFilters();
            } else if (e.target.closest('.filter-section-header')) {
                const button = e.target.closest('.filter-section-header');
                const section = button.dataset.section;
                this.toggleSection(section);
            } else if (e.target.closest('.mobile-clear-all-btn')) {
                this.clearAllFilters();
            }
        });
        
        // Listen for filter changes to update count
        this.container.addEventListener('change', (e) => {
            if (e.target.matches('.mobile-filter-select')) {
                this.updateActiveFilterCount();
            }
        });
    }
    
    setupTouchGestures() {
        const header = this.container.querySelector('.mobile-filter-header');
        if (!header) return;
        
        header.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        header.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }
    
    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        this.touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = this.touchStartY - this.touchEndY;
        
        // Swipe up to open filters, swipe down to close
        if (Math.abs(swipeDistance) > 50) {
            if (swipeDistance > 0 && this.isCollapsed) {
                // Swipe up - open filters
                this.toggleFilters();
            } else if (swipeDistance < 0 && !this.isCollapsed) {
                // Swipe down - close filters
                this.toggleFilters();
            }
        }
    }
    
    toggleFilters() {
        const content = this.container.querySelector('.mobile-filters-container');
        const toggle = this.container.querySelector('.mobile-filter-toggle');
        const chevron = this.container.querySelector('.toggle-chevron');
        
        if (!content || !toggle || !chevron) return;
        
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            // Closing filters
            content.style.maxHeight = content.scrollHeight + 'px';
            content.offsetHeight; // Force reflow
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            
            setTimeout(() => {
                content.style.display = 'none';
            }, 300);
            
            chevron.style.transform = 'rotate(0deg)';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.classList.remove('active');
        } else {
            // Opening filters
            content.style.display = 'block';
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            
            // Force reflow
            content.offsetHeight;
            
            content.style.maxHeight = content.scrollHeight + 'px';
            content.style.opacity = '1';
            
            // Clean up after animation
            setTimeout(() => {
                content.style.maxHeight = 'none';
            }, 300);
            
            chevron.style.transform = 'rotate(180deg)';
            toggle.setAttribute('aria-expanded', 'true');
            toggle.classList.add('active');
        }
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    toggleSection(sectionName) {
        const section = this.container.querySelector(`[data-section="${sectionName}"]`);
        if (!section) return;
        
        const content = section.parentElement.querySelector('.filter-section-content');
        const chevron = section.querySelector('.section-toggle');
        
        const isOpen = this.activeGroups.has(sectionName);
        
        if (isOpen) {
            // Closing section
            content.style.maxHeight = content.scrollHeight + 'px';
            content.offsetHeight; // Force reflow
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            
            setTimeout(() => {
                content.style.display = 'none';
            }, 250);
            
            chevron.style.transform = 'rotate(0deg)';
            section.setAttribute('aria-expanded', 'false');
            section.classList.remove('active');
            this.activeGroups.delete(sectionName);
        } else {
            // Opening section
            content.style.display = 'block';
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            
            // Force reflow
            content.offsetHeight;
            
            content.style.maxHeight = content.scrollHeight + 'px';
            content.style.opacity = '1';
            
            // Clean up after animation
            setTimeout(() => {
                content.style.maxHeight = 'none';
            }, 250);
            
            chevron.style.transform = 'rotate(180deg)';
            section.setAttribute('aria-expanded', 'true');
            section.classList.add('active');
            this.activeGroups.add(sectionName);
        }
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
    
    clearAllFilters() {
        // Clear all mobile filter selects
        const mobileSelects = this.container.querySelectorAll('.mobile-filter-select');
        mobileSelects.forEach(select => {
            const originalId = select.dataset.originalId;
            const originalSelect = document.getElementById(originalId);
            
            if (originalSelect) {
                // Reset to first option (usually "All")
                select.selectedIndex = 0;
                originalSelect.selectedIndex = 0;
                originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Clear search if present
        const searchInput = document.getElementById('model-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        this.updateActiveFilterCount();
        
        // Show success feedback
        this.showClearFeedback();
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
    }
    
    showClearFeedback() {
        const clearBtn = this.container.querySelector('.mobile-clear-all-btn');
        if (!clearBtn) return;
        
        const originalText = clearBtn.innerHTML;
        clearBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
            </svg>
            Filters Cleared
        `;
        clearBtn.classList.add('success');
        
        setTimeout(() => {
            clearBtn.innerHTML = originalText;
            clearBtn.classList.remove('success');
        }, 2000);
    }
    
    updateActiveFilterCount() {
        let count = 0;
        
        // Count active filters
        const mobileSelects = this.container.querySelectorAll('.mobile-filter-select');
        mobileSelects.forEach(select => {
            if (select.value && select.value !== 'all' && select.value !== '') {
                count++;
            }
        });
        
        // Check search input
        const searchInput = document.getElementById('model-search');
        if (searchInput && searchInput.value.trim()) {
            count++;
        }
        
        this.activeFilterCount = count;
        
        // Update counter display
        const counter = this.container.querySelector('.active-filter-count');
        const countSpan = counter?.querySelector('.count');
        
        if (counter && countSpan) {
            if (count > 0) {
                counter.style.display = 'flex';
                countSpan.textContent = count;
                counter.setAttribute('aria-label', `${count} active filters`);
            } else {
                counter.style.display = 'none';
            }
        }
        
        // Update toggle button state
        const toggle = this.container.querySelector('.mobile-filter-toggle');
        if (toggle) {
            if (count > 0) {
                toggle.classList.add('has-filters');
            } else {
                toggle.classList.remove('has-filters');
            }
        }
    }
    
    // Public API methods
    getActiveFilterCount() {
        return this.activeFilterCount;
    }
    
    isFiltersOpen() {
        return !this.isCollapsed;
    }
    
    openFilters() {
        if (this.isCollapsed) {
            this.toggleFilters();
        }
    }
    
    closeFilters() {
        if (!this.isCollapsed) {
            this.toggleFilters();
        }
    }
    
    openSection(sectionName) {
        if (!this.activeGroups.has(sectionName)) {
            this.toggleSection(sectionName);
        }
    }
    
    closeSection(sectionName) {
        if (this.activeGroups.has(sectionName)) {
            this.toggleSection(sectionName);
        }
    }
    
    destroy() {
        // Clean up event listeners and DOM modifications
        this.removeCollapsibleStructure();
        
        // Remove resize listener
        window.removeEventListener('resize', this.enhanceForMobile);
    }
}

// Export for use in other modules
window.MobileFilters = MobileFilters;