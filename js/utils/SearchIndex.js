/**
 * SearchIndex utility for building and querying search indexes
 * Provides fast search capabilities with autocomplete support
 */

class SearchIndex {
    constructor() {
        this.modelNameIndex = new Map();
        this.quantizationIndex = new Map();
        this.modelTypeIndex = new Map();
        this.licenseIndex = new Map();
        this.fullTextIndex = new Map();
        this.fuzzyIndex = new Map();
        this.models = [];
        this.isBuilt = false;
    }
    
    buildIndex(models) {
        if (!Array.isArray(models) || models.length === 0) {
            console.warn('SearchIndex: No models provided for indexing');
            return;
        }
        
        console.log(`SearchIndex: Building search index for ${models.length} models...`);
        const startTime = performance.now();
        
        this.models = models;
        this.clearIndexes();
        
        models.forEach((model, index) => {
            this.indexModel(model, index);
        });
        
        this.isBuilt = true;
        const endTime = performance.now();
        console.log(`SearchIndex: Index built in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    clearIndexes() {
        this.modelNameIndex.clear();
        this.quantizationIndex.clear();
        this.modelTypeIndex.clear();
        this.licenseIndex.clear();
        this.fullTextIndex.clear();
        this.fuzzyIndex.clear();
    }
    
    indexModel(model, index) {
        // Index model name
        if (model.modelName) {
            this.addToIndex(this.modelNameIndex, model.modelName, index);
            this.addToFullTextIndex(model.modelName, index);
        }
        
        // Index quantization format
        if (model.quantFormat) {
            this.addToIndex(this.quantizationIndex, model.quantFormat, index);
            this.addToFullTextIndex(model.quantFormat, index);
        }
        
        // Index model type
        if (model.modelType) {
            this.addToIndex(this.modelTypeIndex, model.modelType, index);
            this.addToFullTextIndex(model.modelType, index);
        }
        
        // Index license
        if (model.license) {
            this.addToIndex(this.licenseIndex, model.license, index);
            this.addToFullTextIndex(model.license, index);
        }
    }
    
    addToIndex(index, value, modelIndex) {
        const normalizedValue = value.toLowerCase();
        
        if (!index.has(normalizedValue)) {
            index.set(normalizedValue, {
                originalValue: value,
                modelIndexes: new Set(),
                count: 0
            });
        }
        
        const entry = index.get(normalizedValue);
        entry.modelIndexes.add(modelIndex);
        entry.count = entry.modelIndexes.size;
    }
    
    addToFullTextIndex(text, modelIndex) {
        const words = this.tokenize(text);
        
        words.forEach(word => {
            if (word.length >= 2) {
                // Add full word
                if (!this.fullTextIndex.has(word)) {
                    this.fullTextIndex.set(word, new Set());
                }
                this.fullTextIndex.get(word).add(modelIndex);
                
                // Add prefixes for autocomplete (2-4 characters)
                for (let i = 2; i <= Math.min(word.length, 4); i++) {
                    const prefix = word.substring(0, i);
                    if (!this.fullTextIndex.has(prefix)) {
                        this.fullTextIndex.set(prefix, new Set());
                    }
                    this.fullTextIndex.get(prefix).add(modelIndex);
                }
            }
        });
    }
    
    tokenize(text) {
        return text.toLowerCase()
            .split(/[\s\-_\.]+/)
            .filter(word => word.length > 0);
    }
    
    async search(query, options = {}) {
        if (!this.isBuilt) {
            console.warn('SearchIndex: Index not built yet');
            return [];
        }
        
        if (!query || !query.trim()) {
            return this.models.slice(0, options.maxResults || 1000);
        }
        
        const searchTerms = this.tokenize(query);
        const matchingIndexes = new Set();
        
        // Search in full text index
        searchTerms.forEach(term => {
            // Exact matches
            if (this.fullTextIndex.has(term)) {
                this.fullTextIndex.get(term).forEach(index => matchingIndexes.add(index));
            }
            
            // Prefix matches
            for (const [indexedTerm, indexes] of this.fullTextIndex.entries()) {
                if (indexedTerm.startsWith(term) || indexedTerm.includes(term)) {
                    indexes.forEach(index => matchingIndexes.add(index));
                }
            }
        });
        
        // Fuzzy matching if enabled
        if (options.fuzzy && matchingIndexes.size < 10) {
            const fuzzyMatches = this.fuzzySearch(query);
            fuzzyMatches.forEach(index => matchingIndexes.add(index));
        }
        
        // Convert to models and limit results
        const results = Array.from(matchingIndexes)
            .map(index => this.models[index])
            .filter(model => model)
            .slice(0, options.maxResults || 1000);
        
        return results;
    }
    
    fuzzySearch(query) {
        const matches = new Set();
        const lowerQuery = query.toLowerCase();
        const maxDistance = Math.floor(query.length / 3); // Allow 1 error per 3 characters
        
        for (const [term, indexes] of this.fullTextIndex.entries()) {
            if (this.levenshteinDistance(lowerQuery, term) <= maxDistance) {
                indexes.forEach(index => matches.add(index));
            }
        }
        
        return matches;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    getModelNameMatches(query, limit = 5) {
        const matches = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [key, entry] of this.modelNameIndex.entries()) {
            if (key.includes(lowerQuery)) {
                matches.push({
                    name: entry.originalValue,
                    count: entry.count,
                    relevance: this.calculateRelevance(key, lowerQuery)
                });
            }
        }
        
        return matches
            .sort((a, b) => b.relevance - a.relevance || b.count - a.count)
            .slice(0, limit);
    }
    
    getQuantizationMatches(query, limit = 5) {
        const matches = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [key, entry] of this.quantizationIndex.entries()) {
            if (key.includes(lowerQuery)) {
                matches.push({
                    format: entry.originalValue,
                    count: entry.count,
                    relevance: this.calculateRelevance(key, lowerQuery)
                });
            }
        }
        
        return matches
            .sort((a, b) => b.relevance - a.relevance || b.count - a.count)
            .slice(0, limit);
    }
    
    getTypeMatches(query, limit = 5) {
        const matches = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [key, entry] of this.modelTypeIndex.entries()) {
            if (key.includes(lowerQuery)) {
                matches.push({
                    type: entry.originalValue,
                    count: entry.count,
                    relevance: this.calculateRelevance(key, lowerQuery)
                });
            }
        }
        
        return matches
            .sort((a, b) => b.relevance - a.relevance || b.count - a.count)
            .slice(0, limit);
    }
    
    getLicenseMatches(query, limit = 5) {
        const matches = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [key, entry] of this.licenseIndex.entries()) {
            if (key.includes(lowerQuery)) {
                matches.push({
                    license: entry.originalValue,
                    count: entry.count,
                    relevance: this.calculateRelevance(key, lowerQuery)
                });
            }
        }
        
        return matches
            .sort((a, b) => b.relevance - a.relevance || b.count - a.count)
            .slice(0, limit);
    }
    
    calculateRelevance(text, query) {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        // Exact match gets highest score
        if (lowerText === lowerQuery) return 100;
        
        // Starts with query gets high score
        if (lowerText.startsWith(lowerQuery)) return 80;
        
        // Contains query gets medium score
        if (lowerText.includes(lowerQuery)) return 60;
        
        // Fuzzy match gets lower score
        const distance = this.levenshteinDistance(lowerQuery, lowerText);
        const maxLength = Math.max(lowerQuery.length, lowerText.length);
        return Math.max(0, 40 - (distance / maxLength) * 40);
    }
    
    // Get suggestions for autocomplete
    getSuggestions(query, limit = 8) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        // Model name suggestions
        const modelMatches = this.getModelNameMatches(lowerQuery, 3);
        modelMatches.forEach(match => {
            suggestions.push({
                type: 'model',
                text: match.name,
                value: match.name,
                count: match.count,
                icon: '🤖'
            });
        });
        
        // Quantization suggestions
        const quantMatches = this.getQuantizationMatches(lowerQuery, 2);
        quantMatches.forEach(match => {
            suggestions.push({
                type: 'quantization',
                text: match.format,
                value: match.format,
                count: match.count,
                icon: '⚙️'
            });
        });
        
        // Type suggestions
        const typeMatches = this.getTypeMatches(lowerQuery, 2);
        typeMatches.forEach(match => {
            suggestions.push({
                type: 'type',
                text: match.type,
                value: match.type,
                count: match.count,
                icon: '📋'
            });
        });
        
        return suggestions.slice(0, limit);
    }
    
    // Statistics
    getIndexStats() {
        return {
            totalModels: this.models.length,
            modelNames: this.modelNameIndex.size,
            quantizations: this.quantizationIndex.size,
            modelTypes: this.modelTypeIndex.size,
            licenses: this.licenseIndex.size,
            fullTextTerms: this.fullTextIndex.size,
            isBuilt: this.isBuilt
        };
    }
    
    // Debug methods
    debugIndex() {
        console.log('SearchIndex Stats:', this.getIndexStats());
        console.log('Sample model names:', Array.from(this.modelNameIndex.keys()).slice(0, 10));
        console.log('Sample quantizations:', Array.from(this.quantizationIndex.keys()).slice(0, 10));
        console.log('Sample types:', Array.from(this.modelTypeIndex.keys()).slice(0, 10));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchIndex;
} else {
    window.SearchIndex = SearchIndex;
}