/**
 * Filter and search service for GGUF Model Discovery
 * Handles searching, filtering, and sorting of model data
 * Optimized for large datasets (40,000-100,000 models)
 */

class FilterService {
    constructor() {
        // Performance optimization caches
        this.searchCache = new Map();
        this.filterCache = new Map();
        this.sortCache = new Map();
        this.indexCache = new Map();
        
        // Performance settings
        this.maxCacheSize = 100;
        this.enableCaching = true;
        this.batchSize = 1000;
        
        // Pre-built indexes for faster filtering
        this.fieldIndexes = new Map();
        this.isIndexed = false;
        
        // Bind methods
        this.searchModels = this.searchModels.bind(this);
        this.filterModels = this.filterModels.bind(this);
        this.sortModels = this.sortModels.bind(this);
        this.sortByLikeCount = this.sortByLikeCount.bind(this);
        this.applyAllFilters = this.applyAllFilters.bind(this);
        this.buildIndexes = this.buildIndexes.bind(this);
        this.clearCaches = this.clearCaches.bind(this);
    }

    /**
     * Build indexes for faster filtering and searching
     * @param {Array} models - Array of model objects to index
     */
    buildIndexes(models) {
        if (!Array.isArray(models) || models.length === 0) {
            return;
        }

        console.log(`Building indexes for ${models.length} models...`);
        const startTime = performance.now();

        // Clear existing indexes
        this.fieldIndexes.clear();

        // Build indexes for filterable fields
        const indexableFields = ['quantFormat', 'modelType', 'license'];
        
        indexableFields.forEach(field => {
            const fieldIndex = new Map();
            
            models.forEach((model, index) => {
                const value = model[field];
                if (value) {
                    const normalizedValue = value.toLowerCase();
                    if (!fieldIndex.has(normalizedValue)) {
                        fieldIndex.set(normalizedValue, []);
                    }
                    fieldIndex.get(normalizedValue).push(index);
                }
            });
            
            this.fieldIndexes.set(field, fieldIndex);
        });

        // Build search index for text fields
        const searchIndex = new Map();
        const searchFields = ['modelName', 'quantFormat', 'modelType', 'license'];
        
        models.forEach((model, index) => {
            searchFields.forEach(field => {
                const value = model[field];
                if (value && typeof value === 'string') {
                    // Create n-grams for partial matching
                    const words = value.toLowerCase().split(/[\s\-_]+/);
                    words.forEach(word => {
                        if (word.length >= 2) {
                            // Add full word
                            if (!searchIndex.has(word)) {
                                searchIndex.set(word, new Set());
                            }
                            searchIndex.get(word).add(index);
                            
                            // Add prefixes for autocomplete
                            for (let i = 2; i <= word.length; i++) {
                                const prefix = word.substring(0, i);
                                if (!searchIndex.has(prefix)) {
                                    searchIndex.set(prefix, new Set());
                                }
                                searchIndex.get(prefix).add(index);
                            }
                        }
                    });
                }
            });
        });

        this.fieldIndexes.set('search', searchIndex);
        this.isIndexed = true;

        const endTime = performance.now();
        console.log(`Indexes built in ${(endTime - startTime).toFixed(2)}ms`);
    }

    /**
     * Search models by text query across multiple fields (optimized)
     * @param {Array} models - Array of model objects
     * @param {string} query - Search query string
     * @returns {Array} Filtered array of models
     */
    searchModels(models, query) {
        if (!query || !query.trim()) {
            return models;
        }

        const searchTerm = query.toLowerCase().trim();
        
        // Check cache first
        if (this.enableCaching) {
            const cacheKey = `search:${searchTerm}:${models.length}`;
            if (this.searchCache.has(cacheKey)) {
                return this.searchCache.get(cacheKey);
            }
        }

        let results;

        // Use index-based search if available and models array is large
        if (this.isIndexed && models.length > 1000) {
            results = this._searchWithIndex(models, searchTerm);
        } else {
            // Fallback to linear search for smaller datasets
            results = this._searchLinear(models, searchTerm);
        }

        // Cache results
        if (this.enableCaching) {
            this._addToCache(this.searchCache, `search:${searchTerm}:${models.length}`, results);
        }

        return results;
    }

    /**
     * Index-based search for large datasets
     * @private
     * @param {Array} models - Array of model objects
     * @param {string} searchTerm - Search term
     * @returns {Array} Filtered models
     */
    _searchWithIndex(models, searchTerm) {
        const searchIndex = this.fieldIndexes.get('search');
        if (!searchIndex) {
            return this._searchLinear(models, searchTerm);
        }

        const matchingIndexes = new Set();
        const words = searchTerm.split(/\s+/);

        words.forEach(word => {
            if (word.length >= 2) {
                // Find exact matches and prefixes
                for (const [indexedTerm, indexes] of searchIndex.entries()) {
                    if (indexedTerm.includes(word)) {
                        indexes.forEach(index => matchingIndexes.add(index));
                    }
                }
            }
        });

        return Array.from(matchingIndexes)
            .map(index => models[index])
            .filter(model => model); // Filter out any undefined models
    }

    /**
     * Linear search fallback
     * @private
     * @param {Array} models - Array of model objects
     * @param {string} searchTerm - Search term
     * @returns {Array} Filtered models
     */
    _searchLinear(models, searchTerm) {
        const searchFields = ['modelName', 'quantFormat', 'modelType', 'license'];

        return models.filter(model => {
            return searchFields.some(field => {
                const fieldValue = model[field];
                if (!fieldValue) return false;
                
                return fieldValue.toLowerCase().includes(searchTerm);
            });
        });
    }

    /**
     * Filter models by quantization format (optimized)
     * @param {Array} models - Array of model objects
     * @param {string} format - Quantization format to filter by
     * @returns {Array} Filtered array of models
     */
    filterByQuantization(models, format) {
        if (!format || format === 'all') {
            return models;
        }

        // Use index-based filtering for large datasets
        if (this.isIndexed && models.length > 1000) {
            return this._filterWithIndex(models, 'quantFormat', format);
        }

        // Linear filtering for smaller datasets
        return models.filter(model => {
            return model.quantFormat && 
                   model.quantFormat.toLowerCase() === format.toLowerCase();
        });
    }

    /**
     * Filter models by model type (optimized)
     * @param {Array} models - Array of model objects
     * @param {string} type - Model type to filter by
     * @returns {Array} Filtered array of models
     */
    filterByType(models, type) {
        if (!type || type === 'all') {
            return models;
        }

        // Use index-based filtering for large datasets
        if (this.isIndexed && models.length > 1000) {
            return this._filterWithIndex(models, 'modelType', type);
        }

        // Linear filtering for smaller datasets
        return models.filter(model => {
            return model.modelType && 
                   model.modelType.toLowerCase() === type.toLowerCase();
        });
    }

    /**
     * Filter models by license (optimized)
     * @param {Array} models - Array of model objects
     * @param {string} license - License to filter by
     * @returns {Array} Filtered array of models
     */
    filterByLicense(models, license) {
        if (!license || license === 'all') {
            return models;
        }

        // Use index-based filtering for large datasets
        if (this.isIndexed && models.length > 1000) {
            return this._filterWithIndex(models, 'license', license);
        }

        // Linear filtering for smaller datasets
        return models.filter(model => {
            return model.license && 
                   model.license.toLowerCase() === license.toLowerCase();
        });
    }

    /**
     * Index-based filtering for large datasets
     * @private
     * @param {Array} models - Array of model objects
     * @param {string} field - Field to filter by
     * @param {string} value - Value to filter for
     * @returns {Array} Filtered models
     */
    _filterWithIndex(models, field, value) {
        const fieldIndex = this.fieldIndexes.get(field);
        if (!fieldIndex) {
            // Fallback to linear search if index not available
            return models.filter(model => {
                return model[field] && 
                       model[field].toLowerCase() === value.toLowerCase();
            });
        }

        const normalizedValue = value.toLowerCase();
        const matchingIndexes = fieldIndex.get(normalizedValue) || [];
        
        return matchingIndexes
            .map(index => models[index])
            .filter(model => model); // Filter out any undefined models
    }

    /**
     * Filter models by file size range
     * @param {Array} models - Array of model objects
     * @param {number} minSize - Minimum file size in bytes
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {Array} Filtered array of models
     */
    filterByFileSize(models, minSize = 0, maxSize = Infinity) {
        if (minSize === 0 && maxSize === Infinity) {
            return models;
        }

        return models.filter(model => {
            const fileSize = model.fileSize || 0;
            return fileSize >= minSize && fileSize <= maxSize;
        });
    }

    /**
     * Filter models by download count range
     * @param {Array} models - Array of model objects
     * @param {number} minDownloads - Minimum download count
     * @param {number} maxDownloads - Maximum download count
     * @returns {Array} Filtered array of models
     */
    filterByDownloadCount(models, minDownloads = 0, maxDownloads = Infinity) {
        if (minDownloads === 0 && maxDownloads === Infinity) {
            return models;
        }

        return models.filter(model => {
            const downloadCount = model.downloadCount || 0;
            return downloadCount >= minDownloads && downloadCount <= maxDownloads;
        });
    }

    /**
     * Filter models by engagement metrics (like count) range with validation
     * @param {Array} models - Array of model objects
     * @param {number} minLikes - Minimum like count
     * @param {number} maxLikes - Maximum like count
     * @returns {Array} Filtered array of models
     */
    filterByEngagement(models, minLikes = 0, maxLikes = Infinity) {
        // Validate filter parameters
        const validatedMin = this._validateEngagementFilterValue(minLikes, 'minLikes');
        const validatedMax = this._validateEngagementFilterValue(maxLikes, 'maxLikes');
        
        // If both values are at their defaults, no filtering needed
        if (validatedMin === 0 && validatedMax === Infinity) {
            return models;
        }

        // Ensure min <= max
        if (validatedMin > validatedMax) {
            console.warn(`FilterService: Invalid engagement range (min: ${validatedMin}, max: ${validatedMax}), swapping values`);
            const temp = validatedMin;
            validatedMin = validatedMax;
            validatedMax = temp;
        }

        return models.filter(model => {
            try {
                // Use validation utility if available
                if (window.EngagementValidation) {
                    const validation = window.EngagementValidation.validateEngagementMetric(
                        model.likeCount, 
                        model.modelName || 'unknown', 
                        'likeCount'
                    );
                    
                    if (!validation.isValid) {
                        // Include models with invalid engagement data if min is 0
                        return validatedMin === 0;
                    }
                    
                    const likeCount = validation.value;
                    return likeCount >= validatedMin && likeCount <= validatedMax;
                } else {
                    // Fallback validation
                    const likeCount = this._sanitizeEngagementValue(model.likeCount);
                    return likeCount >= validatedMin && likeCount <= validatedMax;
                }
            } catch (error) {
                console.error(`FilterService: Error filtering model ${model.modelName || 'unknown'} by engagement:`, error);
                // Include model in results if filtering fails and min is 0
                return validatedMin === 0;
            }
        });
    }

    /**
     * Validate engagement filter values
     * @private
     * @param {any} value - Filter value to validate
     * @param {string} paramName - Parameter name for error logging
     * @returns {number} Validated filter value
     */
    _validateEngagementFilterValue(value, paramName) {
        try {
            // Handle null/undefined
            if (value == null) {
                return paramName === 'minLikes' ? 0 : Infinity;
            }

            // Handle string values
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed === '' || trimmed.toLowerCase() === 'infinity') {
                    return paramName === 'minLikes' ? 0 : Infinity;
                }
                
                const parsed = parseFloat(trimmed);
                if (isNaN(parsed)) {
                    console.warn(`FilterService: Invalid ${paramName} string "${value}", using default`);
                    return paramName === 'minLikes' ? 0 : Infinity;
                }
                value = parsed;
            }

            // Convert to number
            const num = Number(value);
            
            // Check if it's a valid number
            if (isNaN(num) || !isFinite(num)) {
                console.warn(`FilterService: Invalid ${paramName} value "${value}", using default`);
                return paramName === 'minLikes' ? 0 : Infinity;
            }

            // Ensure non-negative
            const sanitized = Math.max(0, Math.floor(num));
            
            if (sanitized !== num) {
                console.debug(`FilterService: ${paramName} value ${value} sanitized to ${sanitized}`);
            }

            return sanitized;
            
        } catch (error) {
            console.error(`FilterService: Error validating ${paramName} value "${value}":`, error);
            return paramName === 'minLikes' ? 0 : Infinity;
        }
    }

    /**
     * Sanitize engagement value for filtering (fallback when validation utility not available)
     * @private
     * @param {any} value - Engagement value to sanitize
     * @returns {number} Sanitized engagement value
     */
    _sanitizeEngagementValue(value) {
        if (value == null || isNaN(value)) {
            return 0;
        }
        return Math.max(0, Math.floor(Number(value)));
    }

    /**
     * Filter models by hardware requirements
     * @param {Array} models - Array of model objects
     * @param {object} hardwareFilters - Hardware filter criteria
     * @returns {Array} Filtered array of models
     */
    filterByHardwareRequirements(models, hardwareFilters) {
        if (!hardwareFilters || Object.keys(hardwareFilters).length === 0) {
            return models;
        }

        return models.filter(model => {
            // CPU filter
            if (hardwareFilters.minCpuCores && hardwareFilters.minCpuCores !== 'all') {
                const requiredCores = parseInt(hardwareFilters.minCpuCores);
                if (!model.minCpuCores || model.minCpuCores < requiredCores) {
                    return false;
                }
            }
            
            // RAM filter
            if (hardwareFilters.minRamGB && hardwareFilters.minRamGB !== 'all') {
                const requiredRam = parseInt(hardwareFilters.minRamGB);
                if (!model.minRamGB || model.minRamGB < requiredRam) {
                    return false;
                }
            }
            
            // GPU filter
            if (hardwareFilters.gpuRequired && hardwareFilters.gpuRequired !== 'all') {
                if (hardwareFilters.gpuRequired === 'required' && !model.gpuRequired) {
                    return false;
                }
                if (hardwareFilters.gpuRequired === 'not-required' && model.gpuRequired) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Apply all filters to models (optimized for large datasets)
     * @param {Array} models - Array of model objects
     * @param {object} filters - Filter criteria object
     * @param {string} searchQuery - Search query string
     * @returns {Array} Filtered array of models
     */
    filterModels(models, filters, searchQuery = '') {
        // Check cache first for complete filter combination
        if (this.enableCaching) {
            const cacheKey = this._createFilterCacheKey(filters, searchQuery, models.length);
            if (this.filterCache.has(cacheKey)) {
                return this.filterCache.get(cacheKey);
            }
        }

        const startTime = performance.now();
        let filteredModels;

        // For large datasets, use batch processing
        if (models.length > 10000) {
            filteredModels = this._filterLargeDataset(models, filters, searchQuery);
        } else {
            filteredModels = this._filterStandard(models, filters, searchQuery);
        }

        const endTime = performance.now();
        console.log(`Filtered ${models.length} models to ${filteredModels.length} in ${(endTime - startTime).toFixed(2)}ms`);

        // Cache results
        if (this.enableCaching) {
            const cacheKey = this._createFilterCacheKey(filters, searchQuery, models.length);
            this._addToCache(this.filterCache, cacheKey, filteredModels);
        }

        return filteredModels;
    }

    /**
     * Standard filtering for smaller datasets
     * @private
     */
    _filterStandard(models, filters, searchQuery) {
        let filteredModels = [...models];

        // Apply search filter first
        if (searchQuery) {
            filteredModels = this.searchModels(filteredModels, searchQuery);
        }

        // Apply quantization filter
        if (filters.quantFormat && filters.quantFormat !== 'all') {
            filteredModels = this.filterByQuantization(filteredModels, filters.quantFormat);
        }

        // Apply model type filter
        if (filters.modelType && filters.modelType !== 'all') {
            filteredModels = this.filterByType(filteredModels, filters.modelType);
        }

        // Apply license filter
        if (filters.license && filters.license !== 'all') {
            filteredModels = this.filterByLicense(filteredModels, filters.license);
        }

        // Apply file size filter
        if (filters.fileSizeMin !== undefined || filters.fileSizeMax !== undefined) {
            filteredModels = this.filterByFileSize(
                filteredModels, 
                filters.fileSizeMin || 0, 
                filters.fileSizeMax || Infinity
            );
        }

        // Apply download count filter
        if (filters.downloadCountMin !== undefined || filters.downloadCountMax !== undefined) {
            filteredModels = this.filterByDownloadCount(
                filteredModels, 
                filters.downloadCountMin || 0, 
                filters.downloadCountMax || Infinity
            );
        }

        // Apply engagement metrics filter
        if (filters.likeCountMin !== undefined || filters.likeCountMax !== undefined) {
            filteredModels = this.filterByEngagement(
                filteredModels, 
                filters.likeCountMin || 0, 
                filters.likeCountMax || Infinity
            );
        }

        // Apply hardware requirements filter
        if (filters.minCpuCores || filters.minRamGB || filters.gpuRequired) {
            const hardwareFilters = {
                minCpuCores: filters.minCpuCores,
                minRamGB: filters.minRamGB,
                gpuRequired: filters.gpuRequired
            };
            filteredModels = this.filterByHardwareRequirements(filteredModels, hardwareFilters);
        }

        return filteredModels;
    }

    /**
     * Optimized filtering for large datasets using batch processing
     * @private
     */
    _filterLargeDataset(models, filters, searchQuery) {
        const batchSize = this.batchSize;
        const results = [];
        
        // Process in batches to avoid blocking the UI
        for (let i = 0; i < models.length; i += batchSize) {
            const batch = models.slice(i, i + batchSize);
            const filteredBatch = this._filterStandard(batch, filters, searchQuery);
            results.push(...filteredBatch);
            
            // Yield control to prevent UI blocking
            if (i % (batchSize * 10) === 0) {
                // Allow other tasks to run
                setTimeout(() => {}, 0);
            }
        }
        
        return results;
    }

    /**
     * Create cache key for filter combination
     * @private
     */
    _createFilterCacheKey(filters, searchQuery, modelCount) {
        const filterStr = JSON.stringify(filters);
        return `filter:${searchQuery}:${filterStr}:${modelCount}`;
    }

    /**
     * Sort models by specified field and direction (optimized)
     * @param {Array} models - Array of model objects
     * @param {string} field - Field to sort by
     * @param {string} direction - Sort direction ('asc' or 'desc')
     * @returns {Array} Sorted array of models
     */
    sortModels(models, field, direction = 'desc') {
        if (!field) {
            return models;
        }

        // Check cache first
        if (this.enableCaching) {
            const cacheKey = `sort:${field}:${direction}:${models.length}`;
            if (this.sortCache.has(cacheKey)) {
                const cachedIndexes = this.sortCache.get(cacheKey);
                return cachedIndexes.map(index => models[index]).filter(model => model);
            }
        }

        // For large datasets, use optimized sorting
        if (models.length > 10000) {
            return this._sortLargeDataset(models, field, direction);
        }

        // Standard sorting for smaller datasets
        const sortedModels = [...models];
        const isAscending = direction === 'asc';

        sortedModels.sort((a, b) => {
            let valueA = a[field];
            let valueB = b[field];

            // Handle null/undefined values
            if (valueA == null && valueB == null) return 0;
            if (valueA == null) return isAscending ? -1 : 1;
            if (valueB == null) return isAscending ? 1 : -1;

            // Handle different data types
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            // Perform comparison
            let comparison = 0;
            if (valueA < valueB) {
                comparison = -1;
            } else if (valueA > valueB) {
                comparison = 1;
            }

            return isAscending ? comparison : -comparison;
        });

        return sortedModels;
    }

    /**
     * Optimized sorting for large datasets using indexed approach
     * @private
     * @param {Array} models - Array of model objects
     * @param {string} field - Field to sort by
     * @param {string} direction - Sort direction
     * @returns {Array} Sorted models
     */
    _sortLargeDataset(models, field, direction) {
        const isAscending = direction === 'asc';
        
        // Create array of [value, originalIndex] pairs for stable sorting
        const indexedValues = models.map((model, index) => ({
            value: model[field],
            index,
            model
        }));

        // Sort the indexed values
        indexedValues.sort((a, b) => {
            let valueA = a.value;
            let valueB = b.value;

            // Handle null/undefined values
            if (valueA == null && valueB == null) return a.index - b.index; // Stable sort
            if (valueA == null) return isAscending ? -1 : 1;
            if (valueB == null) return isAscending ? 1 : -1;

            // Handle different data types
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            // Perform comparison
            let comparison = 0;
            if (valueA < valueB) {
                comparison = -1;
            } else if (valueA > valueB) {
                comparison = 1;
            } else {
                // Values are equal, maintain stable sort by original index
                comparison = a.index - b.index;
            }

            return isAscending ? comparison : -comparison;
        });

        // Cache the sorted indexes for future use
        if (this.enableCaching) {
            const cacheKey = `sort:${field}:${direction}:${models.length}`;
            const sortedIndexes = indexedValues.map(item => item.index);
            this._addToCache(this.sortCache, cacheKey, sortedIndexes);
        }

        return indexedValues.map(item => item.model);
    }

    /**
     * Sort models by like count (engagement metrics)
     * @param {Array} models - Array of model objects
     * @param {string} direction - Sort direction ('asc' or 'desc')
     * @returns {Array} Sorted array of models
     */
    sortByLikeCount(models, direction = 'desc') {
        return this.sortModels(models, 'likeCount', direction);
    }

    /**
     * Apply all filters, search, and sorting
     * @param {Array} models - Array of model objects
     * @param {object} options - Options object with filters, search, and sorting
     * @returns {Array} Processed array of models
     */
    applyAllFilters(models, options = {}) {
        const {
            searchQuery = '',
            filters = {},
            sorting = { field: 'downloadCount', direction: 'desc' }
        } = options;

        // Apply filters and search
        let processedModels = this.filterModels(models, filters, searchQuery);

        // Apply sorting
        if (sorting.field) {
            processedModels = this.sortModels(processedModels, sorting.field, sorting.direction);
        }

        return processedModels;
    }

    /**
     * Get filter statistics
     * @param {Array} originalModels - Original array of models
     * @param {Array} filteredModels - Filtered array of models
     * @returns {object} Filter statistics
     */
    getFilterStats(originalModels, filteredModels) {
        return {
            totalModels: originalModels.length,
            filteredModels: filteredModels.length,
            filteredPercentage: originalModels.length > 0 
                ? (filteredModels.length / originalModels.length * 100).toFixed(1)
                : 0,
            removedModels: originalModels.length - filteredModels.length
        };
    }

    /**
     * Get suggested search terms based on model data
     * @param {Array} models - Array of model objects
     * @param {number} limit - Maximum number of suggestions
     * @returns {Array} Array of suggested search terms
     */
    getSuggestedSearchTerms(models, limit = 10) {
        if (!Array.isArray(models) || models.length === 0) {
            return [];
        }

        const termFrequency = new Map();
        const searchFields = ['modelName', 'quantFormat', 'modelType'];

        models.forEach(model => {
            searchFields.forEach(field => {
                const value = model[field];
                if (value && typeof value === 'string') {
                    // Extract words from the field value
                    const words = value.toLowerCase()
                        .split(/[\s\-_]+/)
                        .filter(word => word.length > 2);
                    
                    words.forEach(word => {
                        termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
                    });
                }
            });
        });

        // Sort by frequency and return top suggestions
        return Array.from(termFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([term]) => term);
    }

    /**
     * Validate filter values
     * @param {object} filters - Filter object to validate
     * @returns {object} Validated filter object
     */
    validateFilters(filters) {
        const validatedFilters = {};

        // Validate quantization format
        if (filters.quantFormat && typeof filters.quantFormat === 'string') {
            validatedFilters.quantFormat = filters.quantFormat;
        } else {
            validatedFilters.quantFormat = 'all';
        }

        // Validate model type
        if (filters.modelType && typeof filters.modelType === 'string') {
            validatedFilters.modelType = filters.modelType;
        } else {
            validatedFilters.modelType = 'all';
        }

        // Validate license
        if (filters.license && typeof filters.license === 'string') {
            validatedFilters.license = filters.license;
        } else {
            validatedFilters.license = 'all';
        }

        // Validate file size range
        validatedFilters.fileSizeMin = Math.max(0, Number(filters.fileSizeMin) || 0);
        validatedFilters.fileSizeMax = filters.fileSizeMax === undefined 
            ? Infinity 
            : Math.max(validatedFilters.fileSizeMin, Number(filters.fileSizeMax) || Infinity);

        // Validate download count range
        validatedFilters.downloadCountMin = Math.max(0, Number(filters.downloadCountMin) || 0);
        validatedFilters.downloadCountMax = filters.downloadCountMax === undefined 
            ? Infinity 
            : Math.max(validatedFilters.downloadCountMin, Number(filters.downloadCountMax) || Infinity);

        // Validate engagement metrics range
        validatedFilters.likeCountMin = Math.max(0, Number(filters.likeCountMin) || 0);
        validatedFilters.likeCountMax = filters.likeCountMax === undefined 
            ? Infinity 
            : Math.max(validatedFilters.likeCountMin, Number(filters.likeCountMax) || Infinity);

        // Validate hardware requirements filters
        if (filters.minCpuCores && typeof filters.minCpuCores === 'string') {
            validatedFilters.minCpuCores = filters.minCpuCores;
        } else {
            validatedFilters.minCpuCores = 'all';
        }

        if (filters.minRamGB && typeof filters.minRamGB === 'string') {
            validatedFilters.minRamGB = filters.minRamGB;
        } else {
            validatedFilters.minRamGB = 'all';
        }

        if (filters.gpuRequired && typeof filters.gpuRequired === 'string') {
            validatedFilters.gpuRequired = filters.gpuRequired;
        } else {
            validatedFilters.gpuRequired = 'all';
        }

        // Validate download count range
        validatedFilters.downloadCountMin = Math.max(0, Number(filters.downloadCountMin) || 0);
        validatedFilters.downloadCountMax = filters.downloadCountMax === undefined 
            ? Infinity 
            : Math.max(validatedFilters.downloadCountMin, Number(filters.downloadCountMax) || Infinity);

        // Validate engagement metrics range
        validatedFilters.likeCountMin = Math.max(0, Number(filters.likeCountMin) || 0);
        validatedFilters.likeCountMax = filters.likeCountMax === undefined 
            ? Infinity 
            : Math.max(validatedFilters.likeCountMin, Number(filters.likeCountMax) || Infinity);

        return validatedFilters;
    }

    /**
     * Create filter summary text
     * @param {object} filters - Active filters
     * @param {string} searchQuery - Search query
     * @returns {string} Human-readable filter summary
     */
    createFilterSummary(filters, searchQuery = '') {
        const parts = [];

        if (searchQuery) {
            parts.push(`searching for "${searchQuery}"`);
        }

        if (filters.quantFormat && filters.quantFormat !== 'all') {
            parts.push(`quantization: ${filters.quantFormat}`);
        }

        if (filters.modelType && filters.modelType !== 'all') {
            parts.push(`type: ${filters.modelType}`);
        }

        if (filters.license && filters.license !== 'all') {
            parts.push(`license: ${filters.license}`);
        }

        if (parts.length === 0) {
            return 'showing all models';
        }

        return parts.join(', ');
    }

    /**
     * Clear all caches and reset performance optimizations
     */
    clearCaches() {
        this.searchCache.clear();
        this.filterCache.clear();
        this.sortCache.clear();
        this.indexCache.clear();
        this.fieldIndexes.clear();
        this.isIndexed = false;
        console.log('FilterService caches cleared');
    }

    /**
     * Add item to cache with size management
     * @private
     * @param {Map} cache - Cache to add to
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     */
    _addToCache(cache, key, value) {
        // Implement LRU cache behavior
        if (cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        cache.set(key, value);
    }

    /**
     * Get performance statistics
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        return {
            searchCacheSize: this.searchCache.size,
            filterCacheSize: this.filterCache.size,
            sortCacheSize: this.sortCache.size,
            indexCacheSize: this.indexCache.size,
            isIndexed: this.isIndexed,
            indexedFields: Array.from(this.fieldIndexes.keys()),
            enableCaching: this.enableCaching,
            batchSize: this.batchSize,
            maxCacheSize: this.maxCacheSize
        };
    }

    /**
     * Configure performance settings
     * @param {object} settings - Performance settings
     */
    configurePerformance(settings = {}) {
        if (settings.enableCaching !== undefined) {
            this.enableCaching = settings.enableCaching;
        }
        
        if (settings.maxCacheSize !== undefined) {
            this.maxCacheSize = Math.max(10, settings.maxCacheSize);
        }
        
        if (settings.batchSize !== undefined) {
            this.batchSize = Math.max(100, settings.batchSize);
        }
        
        console.log('FilterService performance settings updated:', {
            enableCaching: this.enableCaching,
            maxCacheSize: this.maxCacheSize,
            batchSize: this.batchSize
        });
    }

    /**
     * Warm up caches with common filter combinations
     * @param {Array} models - Models to warm up with
     * @param {Array} commonFilters - Common filter combinations
     */
    warmUpCaches(models, commonFilters = []) {
        if (!this.enableCaching || models.length === 0) {
            return;
        }

        console.log('Warming up FilterService caches...');
        const startTime = performance.now();

        // Build indexes first
        this.buildIndexes(models);

        // Pre-compute common filter combinations
        const defaultFilters = [
            { quantFormat: 'all', modelType: 'all', license: 'all' },
            { quantFormat: 'Q4_0', modelType: 'all', license: 'all' },
            { quantFormat: 'Q8_0', modelType: 'all', license: 'all' },
            { quantFormat: 'F16', modelType: 'all', license: 'all' },
            ...commonFilters
        ];

        defaultFilters.forEach(filters => {
            this.filterModels(models, filters, '');
        });

        // Pre-compute common sorts
        const commonSorts = [
            { field: 'downloadCount', direction: 'desc' },
            { field: 'modelName', direction: 'asc' },
            { field: 'fileSize', direction: 'desc' }
        ];

        commonSorts.forEach(({ field, direction }) => {
            this.sortModels(models, field, direction);
        });

        const endTime = performance.now();
        console.log(`FilterService caches warmed up in ${(endTime - startTime).toFixed(2)}ms`);
    }
}

// Export for use in other modules
window.FilterService = FilterService;