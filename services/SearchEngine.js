/**
 * SearchEngine - Fast text search with indexing for GGUF models
 * 
 * This class provides fast text search capabilities with pre-built search indexes
 * for model names, descriptions, tags, and metadata. Optimized for real-time search.
 * 
 * Task 4.1: Create real-time search functionality
 * Requirements: 1.2, 6.1, 6.2
 */

/**
 * SearchEngine class for fast model searching
 * Implements search indexing for model names, descriptions, and tags
 * Requirements: 1.2, 6.1, 6.2
 */
export class SearchEngine {
  constructor() {
    // Search indexes
    this.searchIndex = new Map();
    this.models = [];
    this.isIndexed = false;
    
    // Search configuration
    this.config = {
      minQueryLength: 1,
      maxResults: 1000,
      fuzzyThreshold: 0.6,
      enableFuzzySearch: true,
      caseSensitive: false
    };
    
    // Performance tracking
    this.searchStats = {
      totalSearches: 0,
      averageSearchTime: 0,
      lastSearchTime: 0
    };
  }

  /**
   * Index models for fast searching
   * Creates searchable text indexes for all model properties
   * @param {Array} models - Array of model objects to index
   */
  indexModels(models) {
    console.log('🔍 Building search index for', models.length, 'models...');
    const startTime = performance.now();
    
    this.models = models;
    this.searchIndex.clear();
    
    models.forEach((model, index) => {
      const searchableText = this.createSearchableText(model);
      const searchTokens = this.tokenizeText(searchableText);
      
      // Store search data for this model
      this.searchIndex.set(index, {
        model,
        searchableText: searchableText.toLowerCase(),
        tokens: searchTokens,
        // Pre-computed metadata for faster filtering
        metadata: {
          architecture: 'Unknown',
          quantizations: [],
          // organization: this.extractOrganization(model.huggingFaceLink), // COMMENTED OUT: No longer using HF URLs
          organization: 'Unknown', // Placeholder value since we don't extract from HF URLs anymore
          // modelName: this.extractModelName(model.huggingFaceLink), // COMMENTED OUT: No longer using HF URLs
          modelName: model.modelName || 'Unknown', // Use direct property from workflow data
          fileCount: model.files ? model.files.length : 0,
          downloads: model.downloadCount || 0,
          lastModified: model.lastModified || null
        }
      });
    });
    
    const indexTime = performance.now() - startTime;
    this.isIndexed = true;
    
    console.log(`✅ Search index built in ${indexTime.toFixed(2)}ms`);
    console.log(`📊 Indexed ${models.length} models with ${this.searchIndex.size} entries`);
  }

  /**
   * Create searchable text from model data
   * @param {Object} model - Model object
   * @returns {string} Searchable text string
   */
  createSearchableText(model) {
    const parts = [];
    
    // Model name and type from workflow format
    parts.push(model.modelName || '');
    parts.push(model.modelType || '');
    parts.push(model.quantFormat || '');
    
    // COMMENTED OUT: No longer extracting organization and model name from huggingFaceLink
    // The workflow data already provides modelName directly, no need to parse URLs
    // if (model.huggingFaceLink) {
    //   parts.push(this.extractOrganization(model.huggingFaceLink));
    //   parts.push(this.extractModelName(model.huggingFaceLink));
    // }
    
    // Extract filename from directDownloadLink
    if (model.directDownloadLink) {
      const filename = model.directDownloadLink.split('/').pop() || '';
      parts.push(filename);
    }
    
    // Tags if available
    if (model.tags && Array.isArray(model.tags)) {
      parts.push(...model.tags);
    }
    
    // Description if available
    if (model.description) {
      parts.push(model.description);
    }
    
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Tokenize text for search indexing
   * @param {string} text - Text to tokenize
   * @returns {Set} Set of search tokens
   */
  tokenizeText(text) {
    const tokens = new Set();
    const normalizedText = text.toLowerCase();
    
    // Split by common delimiters
    const words = normalizedText.split(/[\s\-_\/\.\,\(\)\[\]]+/);
    
    words.forEach(word => {
      if (word.length >= 1) {
        tokens.add(word);
        
        // Add partial matches for longer words
        if (word.length > 3) {
          for (let i = 2; i <= word.length - 1; i++) {
            tokens.add(word.substring(0, i));
          }
        }
      }
    });
    
    return tokens;
  }

  /**
   * Perform fast text search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of matching models with scores
   */
  search(query, options = {}) {
    const searchStart = performance.now();
    
    if (!this.isIndexed) {
      console.warn('⚠️ Search index not built. Call indexModels() first.');
      return [];
    }
    
    // Handle empty query
    if (!query || query.trim().length < this.config.minQueryLength) {
      return this.models.map((model, index) => ({
        model,
        score: 1.0,
        matches: []
      }));
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const queryTokens = this.tokenizeText(normalizedQuery);
    const results = [];
    
    // Search through indexed models
    for (const [index, indexData] of this.searchIndex.entries()) {
      const score = this.calculateSearchScore(normalizedQuery, queryTokens, indexData);
      
      if (score > 0) {
        results.push({
          model: indexData.model,
          score,
          matches: this.findMatches(normalizedQuery, indexData.searchableText),
          metadata: indexData.metadata
        });
      }
    }
    
    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, this.config.maxResults);
    
    // Update search statistics
    const searchTime = performance.now() - searchStart;
    this.updateSearchStats(searchTime);
    
    console.log(`🔍 Search "${query}" found ${limitedResults.length} results in ${searchTime.toFixed(2)}ms`);
    
    return limitedResults;
  }

  /**
   * Calculate search score for a model
   * @param {string} query - Normalized search query
   * @param {Set} queryTokens - Query tokens
   * @param {Object} indexData - Index data for the model
   * @returns {number} Search score (0-1)
   */
  calculateSearchScore(query, queryTokens, indexData) {
    let score = 0;
    const { searchableText, tokens } = indexData;
    
    // Exact match bonus
    if (searchableText.includes(query)) {
      score += 1.0;
    }
    
    // Token matching
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (tokens.has(token)) {
        matchedTokens++;
        score += 0.5;
      }
    }
    
    // Token coverage bonus
    if (queryTokens.size > 0) {
      const coverage = matchedTokens / queryTokens.size;
      score += coverage * 0.3;
    }
    
    // Model name exact match bonus (highest priority) using workflow format
    if (indexData.model.modelName && indexData.model.modelName.toLowerCase().includes(query)) {
      score += 2.0;
    }
    
    // Model type match bonus using workflow format
    if (indexData.model.modelType && indexData.model.modelType.toLowerCase().includes(query)) {
      score += 1.5;
    }
    
    // COMMENTED OUT: Organization match bonus using Hugging Face URL
    // No longer extracting organization from huggingFaceLink since we work with workflow data directly
    // if (indexData.model.huggingFaceLink) {
    //   const organization = this.extractOrganization(indexData.model.huggingFaceLink).toLowerCase();
    //   if (organization.includes(query)) {
    //     score += 1.2;
    //   }
    // }
    
    // Model type match bonus using workflow format
    if (indexData.model.modelType && indexData.model.modelType.toLowerCase().includes(query)) {
      score += 1.0;
    }
    
    // Quantization match bonus using workflow format
    if (indexData.model.quantFormat && indexData.model.quantFormat.toLowerCase().includes(query)) {
      score += 0.8;
    }
    
    // Popularity boost (small influence) using workflow format
    const downloads = indexData.model.downloadCount || 0;
    if (downloads > 0) {
      score += Math.min(downloads / 100000, 0.1);
    }
    
    return Math.min(score, 10.0); // Cap maximum score
  }

  /**
   * Find text matches in searchable content
   * @param {string} query - Search query
   * @param {string} text - Text to search in
   * @returns {Array} Array of match objects
   */
  findMatches(query, text) {
    const matches = [];
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    let index = textLower.indexOf(queryLower);
    while (index !== -1) {
      matches.push({
        start: index,
        end: index + query.length,
        text: text.substring(index, index + query.length)
      });
      index = textLower.indexOf(queryLower, index + 1);
    }
    
    return matches;
  }



  /**
   * Extract organization from Hugging Face URL
   * @param {string} url - Hugging Face URL
   * @returns {string} Organization name
   * 
   * COMMENTED OUT: No longer using Hugging Face URLs for data extraction
   * The application now works entirely with pre-generated workflow data
   * and doesn't need to parse Hugging Face URLs for organization information.
   */
  // extractOrganization(url) {
  //   if (!url) return '';
  //   try {
  //     const urlObj = new URL(url);
  //     const pathParts = urlObj.pathname.split('/').filter(Boolean);
  //     return pathParts.length > 0 ? pathParts[0] : '';
  //   } catch {
  //     return '';
  //   }
  // }

  /**
   * Extract model name from Hugging Face URL
   * @param {string} url - Hugging Face URL
   * @returns {string} Model name
   * 
   * COMMENTED OUT: No longer using Hugging Face URLs for data extraction
   * The application now works entirely with pre-generated workflow data
   * and doesn't need to parse Hugging Face URLs for model name information.
   */
  // extractModelName(url) {
  //   if (!url) return '';
  //   try {
  //     const urlObj = new URL(url);
  //     const pathParts = urlObj.pathname.split('/').filter(Boolean);
  //     return pathParts.length > 1 ? pathParts[1] : (pathParts.length === 1 ? pathParts[0] : '');
  //   } catch {
  //     return '';
  //   }
  // }

  /**
   * Update search performance statistics
   * @param {number} searchTime - Time taken for search in milliseconds
   */
  updateSearchStats(searchTime) {
    this.searchStats.totalSearches++;
    this.searchStats.lastSearchTime = searchTime;
    
    // Calculate rolling average
    const alpha = 0.1; // Smoothing factor
    if (this.searchStats.averageSearchTime === 0) {
      this.searchStats.averageSearchTime = searchTime;
    } else {
      this.searchStats.averageSearchTime = 
        (alpha * searchTime) + ((1 - alpha) * this.searchStats.averageSearchTime);
    }
  }

  /**
   * Get search performance statistics
   * @returns {Object} Search statistics
   */
  getSearchStats() {
    return {
      ...this.searchStats,
      isIndexed: this.isIndexed,
      indexSize: this.searchIndex.size,
      modelCount: this.models.length
    };
  }

  /**
   * Clear search index and reset
   */
  clearIndex() {
    this.searchIndex.clear();
    this.models = [];
    this.isIndexed = false;
    this.searchStats = {
      totalSearches: 0,
      averageSearchTime: 0,
      lastSearchTime: 0
    };
    console.log('🗑️ Search index cleared');
  }

  /**
   * Update search configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Search configuration updated:', this.config);
  }
}

// Export singleton instance for global use
export const searchEngine = new SearchEngine();

// Export class for custom instances
export default SearchEngine;