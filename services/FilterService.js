/**
 * FilterService handles filtering and search functionality for GGUF models
 * Provides efficient filtering algorithms and filter option extraction
 */
export class FilterService {
  constructor() {
    this.availableOptions = null;
  }

  /**
   * Apply filters to a list of models based on FilterState
   * @param {ProcessedModel[]} models - Array of processed models
   * @param {FilterState} filterState - Current filter state
   * @returns {ProcessedModel[]} Filtered array of models
   */
  applyFilters(models, filterState) {
    if (!Array.isArray(models)) {
      console.warn('Invalid models array provided to applyFilters');
      return [];
    }

    let filteredModels = models;

    // Apply quantization filter using workflow format
    if (filterState.quantizations && filterState.quantizations.length > 0) {
      filteredModels = filteredModels.filter(model => 
        filterState.quantizations.includes(model.quantFormat)
      );
    }

    // Apply architecture filter using workflow format
    if (filterState.architectures && filterState.architectures.length > 0) {
      filteredModels = filteredModels.filter(model => 
        filterState.architectures.includes(model.modelType)
      );
    }

    // Apply model type filter using workflow format
    if (filterState.families && filterState.families.length > 0) {
      filteredModels = filteredModels.filter(model => 
        filterState.families.includes(model.modelType)
      );
    }

    // Apply size range filter using workflow format
    if (filterState.sizeRanges && filterState.sizeRanges.length > 0) {
      filteredModels = filteredModels.filter(model => 
        this.matchesSizeRange(model.fileSize, filterState.sizeRanges)
      );
    }

    // Apply text search filter
    if (filterState.searchQuery && filterState.searchQuery.trim().length > 0) {
      const searchTerm = filterState.searchQuery.toLowerCase().trim();
      filteredModels = filteredModels.filter(model => 
        model.searchText.includes(searchTerm)
      );
    }

    return filteredModels;
  }

  /**
   * Check if a model's size matches any of the selected size ranges
   * @param {number} sizeBytes - Model size in bytes
   * @param {string[]} sizeRanges - Array of selected size range strings
   * @returns {boolean} True if model matches any selected range
   */
  matchesSizeRange(sizeBytes, sizeRanges) {
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    
    return sizeRanges.some(range => {
      switch (range) {
        case '<1GB':
          return sizeGB < 1;
        case '1-4GB':
          return sizeGB >= 1 && sizeGB <= 4;
        case '4-8GB':
          return sizeGB > 4 && sizeGB <= 8;
        case '8-16GB':
          return sizeGB > 8 && sizeGB <= 16;
        case '16-32GB':
          return sizeGB > 16 && sizeGB <= 32;
        case '>32GB':
          return sizeGB > 32;
        default:
          return false;
      }
    });
  }

  /**
   * Extract unique filter options from the dataset
   * @param {ProcessedModel[]} models - Array of processed models
   * @returns {FilterOptions} Object containing available filter options
   */
  getAvailableOptions(models) {
    if (!Array.isArray(models)) {
      console.warn('Invalid models array provided to getAvailableOptions');
      return this.getEmptyFilterOptions();
    }

    // Cache the options to avoid recalculation
    if (this.availableOptions && models.length === this.lastModelsLength) {
      return this.availableOptions;
    }

    const quantizations = new Set();
    const architectures = new Set();
    const families = new Set();
    const sizeCounts = {
      '<1GB': 0,
      '1-4GB': 0,
      '4-8GB': 0,
      '8-16GB': 0,
      '16-32GB': 0,
      '>32GB': 0
    };

    models.forEach(model => {
      // Collect quantization types using workflow format
      if (model.quantFormat && model.quantFormat !== 'Unknown') {
        quantizations.add(model.quantFormat);
      }

      // Collect model types using workflow format
      if (model.modelType && model.modelType !== 'Unknown') {
        architectures.add(model.modelType);
      }

      // Collect model types as families using workflow format
      if (model.modelType && model.modelType !== 'Unknown') {
        families.add(model.modelType);
      }

      // Count size ranges using workflow format
      const sizeGB = model.fileSize / (1024 * 1024 * 1024);
      if (sizeGB < 1) {
        sizeCounts['<1GB']++;
      } else if (sizeGB <= 4) {
        sizeCounts['1-4GB']++;
      } else if (sizeGB <= 8) {
        sizeCounts['4-8GB']++;
      } else if (sizeGB <= 16) {
        sizeCounts['8-16GB']++;
      } else if (sizeGB <= 32) {
        sizeCounts['16-32GB']++;
      } else {
        sizeCounts['>32GB']++;
      }
    });

    this.availableOptions = {
      quantizations: Array.from(quantizations).sort(),
      architectures: Array.from(architectures).sort(),
      families: Array.from(families).sort(),
      modelTypes: Array.from(architectures).sort(), // Same as architectures for workflow format
      sizeRanges: Object.entries(sizeCounts)
        .filter(([_, count]) => count > 0)
        .map(([range, count]) => ({ range, count }))
        .sort((a, b) => {
          // Sort size ranges in logical order
          const order = ['<1GB', '1-4GB', '4-8GB', '8-16GB', '16-32GB', '>32GB'];
          return order.indexOf(a.range) - order.indexOf(b.range);
        })
    };

    this.lastModelsLength = models.length;
    return this.availableOptions;
  }

  /**
   * Get empty filter options structure
   * @returns {FilterOptions} Empty filter options
   */
  getEmptyFilterOptions() {
    return {
      quantizations: [],
      architectures: [],
      families: [],
      modelTypes: [],
      sizeRanges: []
    };
  }

  /**
   * Update filter option counts based on current filtered results
   * @param {ProcessedModel[]} allModels - All available models
   * @param {FilterState} currentFilters - Current filter state
   * @returns {FilterOptions} Filter options with updated counts
   */
  updateFilterCounts(allModels, currentFilters) {
    if (!Array.isArray(allModels)) {
      return this.getEmptyFilterOptions();
    }

    // For each filter type, calculate how many models would remain
    // if that filter option was selected (in addition to current filters)
    const baseOptions = this.getAvailableOptions(allModels);
    
    // Calculate counts for quantizations
    const quantizationCounts = baseOptions.quantizations.map(quant => {
      const testFilter = { ...currentFilters, quantizations: [quant] };
      const filteredCount = this.applyFilters(allModels, testFilter).length;
      return { option: quant, count: filteredCount };
    });

    // Calculate counts for architectures
    const architectureCounts = baseOptions.architectures.map(arch => {
      const testFilter = { ...currentFilters, architectures: [arch] };
      const filteredCount = this.applyFilters(allModels, testFilter).length;
      return { option: arch, count: filteredCount };
    });

    // Calculate counts for families
    const familyCounts = baseOptions.families.map(family => {
      const testFilter = { ...currentFilters, families: [family] };
      const filteredCount = this.applyFilters(allModels, testFilter).length;
      return { option: family, count: filteredCount };
    });

    // Calculate counts for size ranges
    const sizeRangeCounts = baseOptions.sizeRanges.map(({ range }) => {
      const testFilter = { ...currentFilters, sizeRanges: [range] };
      const filteredCount = this.applyFilters(allModels, testFilter).length;
      return { range, count: filteredCount };
    });

    return {
      quantizations: quantizationCounts,
      architectures: architectureCounts,
      families: familyCounts,
      sizeRanges: sizeRangeCounts
    };
  }

  /**
   * Perform efficient text search across models
   * @param {ProcessedModel[]} models - Array of models to search
   * @param {string} searchQuery - Search query string
   * @returns {ProcessedModel[]} Models matching the search query
   */
  performTextSearch(models, searchQuery) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return models;
    }

    const searchTerm = searchQuery.toLowerCase().trim();
    const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

    return models.filter(model => {
      // Check if all search terms are present in the model's searchable text
      return searchTerms.every(term => model.searchText.includes(term));
    });
  }

  /**
   * Get suggested search terms based on available models
   * @param {ProcessedModel[]} models - Array of available models
   * @param {string} partialQuery - Partial search query
   * @returns {string[]} Array of suggested search terms
   */
  getSuggestedSearchTerms(models, partialQuery = '') {
    if (!Array.isArray(models) || models.length === 0) {
      return [];
    }

    const query = partialQuery.toLowerCase().trim();
    const suggestions = new Set();

    models.forEach(model => {
      // Add model name suggestions using workflow format
      if (model.modelName && model.modelName.toLowerCase().includes(query)) {
        suggestions.add(model.modelName);
      }

      // Add model type suggestions using workflow format
      if (model.modelType && model.modelType !== 'Unknown' && model.modelType.toLowerCase().includes(query)) {
        suggestions.add(model.modelType);
      }

      // Add quantization suggestions using workflow format
      if (model.quantFormat && model.quantFormat !== 'Unknown' && model.quantFormat.toLowerCase().includes(query)) {
        suggestions.add(model.quantFormat);
      }
    });

    return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Clear cached filter options (useful when data changes)
   */
  clearCache() {
    this.availableOptions = null;
    this.lastModelsLength = null;
  }

  /**
   * Validate filter state object
   * @param {FilterState} filterState - Filter state to validate
   * @returns {boolean} True if filter state is valid
   */
  validateFilterState(filterState) {
    if (!filterState || typeof filterState !== 'object') {
      return false;
    }

    // Check that arrays are actually arrays
    const arrayFields = ['quantizations', 'architectures', 'families', 'sizeRanges'];
    for (const field of arrayFields) {
      if (filterState[field] && !Array.isArray(filterState[field])) {
        return false;
      }
    }

    // Check that searchQuery is a string if present
    if (filterState.searchQuery && typeof filterState.searchQuery !== 'string') {
      return false;
    }

    return true;
  }
}

/**
 * @typedef {Object} FilterState
 * @property {string[]} quantizations - Selected quantization types
 * @property {string[]} sizeRanges - Selected size ranges
 * @property {string[]} architectures - Selected architectures
 * @property {string[]} families - Selected families
 * @property {string} searchQuery - Text search query
 */

/**
 * @typedef {Object} FilterOptions
 * @property {string[]} quantizations - Available quantization options
 * @property {string[]} architectures - Available architecture options
 * @property {string[]} families - Available family options
 * @property {Object[]} sizeRanges - Available size range options with counts
 */

/**
 * @typedef {Object} ProcessedModel
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} modelId - Original HuggingFace model ID
 * @property {string} filename - Original filename
 * @property {string} url - Download URL
 * @property {number} sizeBytes - File size in bytes
 * @property {string} sizeFormatted - Human-readable size
 * @property {string} quantization - Quantization type
 * @property {string} architecture - Inferred architecture
 * @property {string} family - Model family
 * @property {number} downloads - Download count
 * @property {string} lastModified - Last modified date
 * @property {string[]} tags - Generated tags
 * @property {string} searchText - Combined searchable text
 */