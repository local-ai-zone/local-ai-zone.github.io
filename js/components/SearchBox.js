/**
 * Enhanced SearchBox Component with autocomplete and fuzzy matching
 * Provides debounced search, suggestions dropdown, and keyboard navigation
 */

class SearchBox {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            debounceMs: 300,
            maxSuggestions: 8,
            enableFuzzySearch: true,
            ...options
        };
        
        this.searchIndex = new SearchIndex();
        this.fuzzyMatcher = new FuzzyMatcher();
        this.debounceTimer = null;
        this.isLoading = false;
        this.selectedSuggestionIndex = -1;
        this.suggestions = [];
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.buildSearchIndex();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="enhanced-search-container">
                <div class="search-input-wrapper">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="search" 
                           id="enhanced-model-search" 
                           class="enhanced-search-input" 
                           placeholder="Search models, types, quantization..."
                           aria-label="Search models"
                           autocomplete="off"
                           role="combobox"
                           aria-expanded="false"
                           aria-haspopup="listbox">
                    <div class="search-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                    </div>
                    <button class="search-clear" style="display: none;" aria-label="Clear search" type="button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="search-suggestions" style="display: none;" role="listbox" aria-label="Search suggestions">
                    <div class="suggestions-list"></div>
                </div>
                <div class="search-no-results" style="display: none;">
                    <div class="no-results-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <p>No results found</p>
                        <small>Try different keywords or check your spelling</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const input = this.container.querySelector('#enhanced-model-search');
        const clearBtn = this.container.querySelector('.search-clear');
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        
        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        input.addEventListener('focus', () => this.handleFocus());
        input.addEventListener('blur', (e) => this.handleBlur(e));
        
        clearBtn.addEventListener('click', () => this.clearSearch());
        
        // Handle suggestion clicks
        suggestionsContainer.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                this.selectSuggestion(suggestionItem.dataset.value);
            }
        });
        
        // Handle clicks outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    handleInput(event) {
        const query = event.target.value.trim();
        
        // Show/hide clear button
        const clearBtn = this.container.querySelector('.search-clear');
        clearBtn.style.display = query ? 'flex' : 'none';
        
        // Reset selection
        this.selectedSuggestionIndex = -1;
        
        // Debounce search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.options.debounceMs);
        
        // Show suggestions for queries > 1 character
        if (query.length > 1) {
            this.showSuggestions(query);
        } else {
            this.hideSuggestions();
        }
    }
    
    handleKeydown(event) {
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        const isVisible = suggestionsContainer.style.display !== 'none';
        
        if (!isVisible) return;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.navigateSuggestions(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateSuggestions(-1);
                break;
            case 'Enter':
                event.preventDefault();
                if (this.selectedSuggestionIndex >= 0) {
                    const selectedSuggestion = this.suggestions[this.selectedSuggestionIndex];
                    this.selectSuggestion(selectedSuggestion.value);
                } else {
                    this.performSearch(event.target.value);
                    this.hideSuggestions();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.hideSuggestions();
                event.target.blur();
                break;
        }
    }
    
    handleFocus() {
        const input = this.container.querySelector('#enhanced-model-search');
        const query = input.value.trim();
        
        if (query.length > 1) {
            this.showSuggestions(query);
        }
    }
    
    handleBlur(event) {
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.hideSuggestions();
            }
        }, 150);
    }
    
    navigateSuggestions(direction) {
        const suggestionItems = this.container.querySelectorAll('.suggestion-item');
        
        if (suggestionItems.length === 0) return;
        
        // Remove current selection
        if (this.selectedSuggestionIndex >= 0) {
            suggestionItems[this.selectedSuggestionIndex].classList.remove('selected');
        }
        
        // Update selection index
        this.selectedSuggestionIndex += direction;
        
        if (this.selectedSuggestionIndex < 0) {
            this.selectedSuggestionIndex = suggestionItems.length - 1;
        } else if (this.selectedSuggestionIndex >= suggestionItems.length) {
            this.selectedSuggestionIndex = 0;
        }
        
        // Add new selection
        suggestionItems[this.selectedSuggestionIndex].classList.add('selected');
        suggestionItems[this.selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
        
        // Update input aria attributes
        const input = this.container.querySelector('#enhanced-model-search');
        input.setAttribute('aria-activedescendant', suggestionItems[this.selectedSuggestionIndex].id);
    }
    
    async performSearch(query) {
        this.showLoading(true);
        
        try {
            const results = await this.searchIndex.search(query, {
                fuzzy: this.options.enableFuzzySearch,
                maxResults: 1000
            });
            
            // Show no results message if needed
            this.showNoResults(query && results.length === 0);
            
            // Emit search event
            this.container.dispatchEvent(new CustomEvent('search', {
                detail: { query, results, resultCount: results.length }
            }));
            
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showSuggestions(query) {
        this.suggestions = this.generateSuggestions(query);
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        const suggestionsList = this.container.querySelector('.suggestions-list');
        const input = this.container.querySelector('#enhanced-model-search');
        
        if (this.suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
            return;
        }
        
        suggestionsList.innerHTML = this.suggestions.map((suggestion, index) => `
            <div class="suggestion-item" 
                 role="option" 
                 id="suggestion-${index}"
                 data-index="${index}"
                 data-value="${suggestion.value}"
                 aria-selected="false">
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <div class="suggestion-text">${this.highlightMatch(suggestion.text, query)}</div>
                    <div class="suggestion-type">${suggestion.type}</div>
                </div>
                <div class="suggestion-count">${suggestion.count}</div>
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
        this.selectedSuggestionIndex = -1;
    }
    
    hideSuggestions() {
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        const input = this.container.querySelector('#enhanced-model-search');
        
        suggestionsContainer.style.display = 'none';
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        this.selectedSuggestionIndex = -1;
    }
    
    selectSuggestion(value) {
        const input = this.container.querySelector('#enhanced-model-search');
        input.value = value;
        this.hideSuggestions();
        this.performSearch(value);
        
        // Show clear button
        const clearBtn = this.container.querySelector('.search-clear');
        clearBtn.style.display = 'flex';
    }
    
    clearSearch() {
        const input = this.container.querySelector('#enhanced-model-search');
        const clearBtn = this.container.querySelector('.search-clear');
        
        input.value = '';
        clearBtn.style.display = 'none';
        this.hideSuggestions();
        this.showNoResults(false);
        
        // Emit clear event
        this.container.dispatchEvent(new CustomEvent('search', {
            detail: { query: '', results: [], resultCount: 0 }
        }));
        
        input.focus();
    }
    
    showLoading(show) {
        const loadingIndicator = this.container.querySelector('.search-loading');
        loadingIndicator.style.display = show ? 'flex' : 'none';
        this.isLoading = show;
    }
    
    showNoResults(show) {
        const noResultsContainer = this.container.querySelector('.search-no-results');
        noResultsContainer.style.display = show ? 'block' : 'none';
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    generateSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        // Model name suggestions
        const modelMatches = this.searchIndex.getModelNameMatches(lowerQuery, 3);
        modelMatches.forEach(match => {
            suggestions.push({
                icon: '🤖',
                text: match.name,
                type: 'Model',
                value: match.name,
                count: match.count
            });
        });
        
        // Quantization suggestions
        const quantMatches = this.searchIndex.getQuantizationMatches(lowerQuery, 2);
        quantMatches.forEach(match => {
            suggestions.push({
                icon: '⚙️',
                text: match.format,
                type: 'Quantization',
                value: match.format,
                count: match.count
            });
        });
        
        // Model type suggestions
        const typeMatches = this.searchIndex.getTypeMatches(lowerQuery, 2);
        typeMatches.forEach(match => {
            suggestions.push({
                icon: '📋',
                text: match.type,
                type: 'Type',
                value: match.type,
                count: match.count
            });
        });
        
        return suggestions.slice(0, this.options.maxSuggestions);
    }
    
    buildSearchIndex() {
        // This will be called when models data is available
        // For now, we'll set up the structure
        if (window.premiumApp && window.premiumApp.models) {
            this.searchIndex.buildIndex(window.premiumApp.models);
        }
    }
    
    updateIndex(models) {
        this.searchIndex.buildIndex(models);
    }
    
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchBox;
} else {
    window.SearchBox = SearchBox;
}