/**
 * Data loading and caching service for GGUF Model Discovery
 * Handles loading JSON data, caching, and data validation
 */

class DataService {
    constructor() {
        this.cache = new Map();
        this.lastUpdateTime = null;
        this.isLoading = false;
        
        // Memory management settings
        this.maxCacheSize = 5;
        this.enableCompression = true;
        this.compressionThreshold = 10000; // Compress datasets larger than 10k models
        
        // Performance monitoring
        this.loadTimes = [];
        this.maxLoadTimeHistory = 10;
        
        // Bind methods
        this.loadModels = this.loadModels.bind(this);
        this.getLastUpdateTime = this.getLastUpdateTime.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.optimizeMemory = this.optimizeMemory.bind(this);
    }

    /**
     * Load models from JSON file with caching and performance optimization
     * @param {string} url - URL to load data from (default: './gguf_models.json')
     * @param {boolean} forceReload - Force reload even if cached
     * @returns {Promise<Array>} Array of model objects
     */
    async loadModels(url = './gguf_models.json', forceReload = false) {
        const loadStartTime = performance.now();
        
        // Return cached data if available and not forcing reload
        if (!forceReload && this.cache.has(url)) {
            const cachedData = this._decompressData(this.cache.get(url));
            console.log(`Loaded ${cachedData.length} models from cache`);
            return cachedData;
        }

        // Prevent multiple simultaneous loads
        if (this.isLoading) {
            throw new Error('Data is already being loaded');
        }

        this.isLoading = true;

        try {
            console.log('Loading GGUF models data...');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rawData = await response.json();
            
            // Validate and process the data
            const processedData = this._processModelData(rawData);
            
            // Compress and cache the processed data
            const compressedData = this._compressData(processedData);
            this._addToCache(url, compressedData);
            this.lastUpdateTime = new Date().toISOString();
            
            // Record load time for performance monitoring
            const loadTime = performance.now() - loadStartTime;
            this._recordLoadTime(loadTime);
            
            console.log(`Successfully loaded ${processedData.length} models in ${loadTime.toFixed(2)}ms`);
            
            return processedData;

        } catch (error) {
            console.error('Failed to load models data:', error);
            throw new Error(`Failed to load models: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get the last update time
     * @returns {string|null} ISO timestamp of last update
     */
    getLastUpdateTime() {
        return this.lastUpdateTime;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        this.lastUpdateTime = null;
        this.loadTimes = [];
        console.log('Data cache cleared');
    }

    /**
     * Add data to cache with size management
     * @private
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    _addToCache(key, data) {
        // Implement LRU cache behavior
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log(`Removed oldest cache entry: ${firstKey}`);
        }
        
        this.cache.set(key, data);
    }

    /**
     * Compress data for memory efficiency
     * @private
     * @param {Array} data - Data to compress
     * @returns {any} Compressed data or original if compression not beneficial
     */
    _compressData(data) {
        if (!this.enableCompression || data.length < this.compressionThreshold) {
            return data;
        }

        try {
            // Simple compression: remove redundant fields and optimize strings
            const compressed = data.map(model => ({
                ...model,
                // Intern common strings to reduce memory usage
                quantFormat: this._internString(model.quantFormat),
                modelType: this._internString(model.modelType),
                license: this._internString(model.license)
            }));

            console.log(`Compressed ${data.length} models for caching`);
            return { compressed: true, data: compressed };
        } catch (error) {
            console.warn('Failed to compress data, using original:', error);
            return data;
        }
    }

    /**
     * Decompress cached data
     * @private
     * @param {any} cachedData - Cached data to decompress
     * @returns {Array} Decompressed data
     */
    _decompressData(cachedData) {
        if (!cachedData || !cachedData.compressed) {
            return cachedData;
        }

        return cachedData.data;
    }

    /**
     * String interning for memory optimization
     * @private
     * @param {string} str - String to intern
     * @returns {string} Interned string
     */
    _internString(str) {
        if (!this.stringPool) {
            this.stringPool = new Map();
        }

        if (this.stringPool.has(str)) {
            return this.stringPool.get(str);
        }

        this.stringPool.set(str, str);
        return str;
    }

    /**
     * Record load time for performance monitoring
     * @private
     * @param {number} loadTime - Load time in milliseconds
     */
    _recordLoadTime(loadTime) {
        this.loadTimes.push(loadTime);
        
        // Keep only recent load times
        if (this.loadTimes.length > this.maxLoadTimeHistory) {
            this.loadTimes.shift();
        }
    }

    /**
     * Optimize memory usage
     */
    optimizeMemory() {
        console.log('Optimizing DataService memory usage...');
        
        // Clear string pool if it gets too large
        if (this.stringPool && this.stringPool.size > 1000) {
            this.stringPool.clear();
            console.log('String pool cleared');
        }

        // Force garbage collection hint (if available)
        if (window.gc) {
            window.gc();
        }

        console.log('DataService memory optimization complete');
    }

    /**
     * Get performance statistics
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        const avgLoadTime = this.loadTimes.length > 0 
            ? this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length
            : 0;

        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            lastUpdateTime: this.lastUpdateTime,
            isLoading: this.isLoading,
            enableCompression: this.enableCompression,
            compressionThreshold: this.compressionThreshold,
            averageLoadTime: avgLoadTime,
            loadTimeHistory: [...this.loadTimes],
            stringPoolSize: this.stringPool ? this.stringPool.size : 0
        };
    }

    /**
     * Configure performance settings
     * @param {object} settings - Performance settings
     */
    configurePerformance(settings = {}) {
        if (settings.maxCacheSize !== undefined) {
            this.maxCacheSize = Math.max(1, settings.maxCacheSize);
        }
        
        if (settings.enableCompression !== undefined) {
            this.enableCompression = settings.enableCompression;
        }
        
        if (settings.compressionThreshold !== undefined) {
            this.compressionThreshold = Math.max(1000, settings.compressionThreshold);
        }

        console.log('DataService performance settings updated:', {
            maxCacheSize: this.maxCacheSize,
            enableCompression: this.enableCompression,
            compressionThreshold: this.compressionThreshold
        });
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            lastUpdateTime: this.lastUpdateTime,
            isLoading: this.isLoading
        };
    }

    /**
     * Validate model data structure
     * @param {object} model - Model object to validate
     * @returns {boolean} True if valid
     */
    validateModelData(model) {
        const requiredFields = [
            'modelName',
            'quantFormat',
            'fileSize',
            'fileSizeFormatted',
            'modelType',
            'license',
            'downloadCount',
            'huggingFaceLink',
            'directDownloadLink'
        ];

        // Check required fields
        const hasRequiredFields = requiredFields.every(field => {
            const hasField = model.hasOwnProperty(field);
            if (!hasField) {
                console.warn(`Model missing required field: ${field}`, model);
            }
            return hasField;
        });

        if (!hasRequiredFields) {
            return false;
        }

        // Validate engagement metrics if present with comprehensive checks
        if (model.hasOwnProperty('likeCount')) {
            const likeCount = model.likeCount;
            if (typeof likeCount !== 'number' || likeCount < 0 || !Number.isInteger(likeCount) || !isFinite(likeCount)) {
                console.warn(`Model ${model.modelName || 'unknown'}: Invalid likeCount: ${likeCount} (type: ${typeof likeCount})`);
                // Don't fail validation, just warn - we'll sanitize it during processing
            }
            
            // Check for suspiciously high values
            if (likeCount > 10_000_000) {
                console.warn(`Model ${model.modelName || 'unknown'}: Suspiciously high likeCount: ${likeCount}`);
            }
        }

        return true;
    }

    /**
     * Process and validate raw model data
     * @private
     * @param {Array} rawData - Raw data from JSON
     * @returns {Array} Processed and validated model data
     */
    _processModelData(rawData) {
        if (!Array.isArray(rawData)) {
            throw new Error('Invalid data format: expected array');
        }

        const processedModels = [];
        let invalidCount = 0;

        rawData.forEach((model, index) => {
            try {
                // Validate required fields
                if (!this.validateModelData(model)) {
                    invalidCount++;
                    return;
                }

                // Process and normalize the model data
                const processedModel = {
                    // Core identification
                    modelName: this._sanitizeString(model.modelName) || 'Unknown Model',
                    quantFormat: this._sanitizeString(model.quantFormat) || 'Unknown',
                    
                    // File information
                    fileSize: this._sanitizeNumber(model.fileSize) || 0,
                    fileSizeFormatted: this._sanitizeString(model.fileSizeFormatted) || '0 B',
                    
                    // Model metadata
                    modelType: this._sanitizeString(model.modelType) || 'Unknown',
                    license: this._sanitizeString(model.license) || 'Not specified',
                    
                    // Statistics
                    downloadCount: this._sanitizeNumber(model.downloadCount) || 0,
                    likeCount: this._sanitizeEngagementNumber(model.likeCount, model.modelName) || 0,
                    
                    // Links
                    huggingFaceLink: this._sanitizeUrl(model.huggingFaceLink) || '',
                    directDownloadLink: this._sanitizeUrl(model.directDownloadLink) || '',
                    
                    // Add internal ID for tracking
                    _id: `model_${index}`,
                    _processedAt: new Date().toISOString()
                };

                // Additional validation
                if (this._isValidProcessedModel(processedModel)) {
                    processedModels.push(processedModel);
                } else {
                    invalidCount++;
                }

            } catch (error) {
                console.warn(`Error processing model at index ${index}:`, error);
                invalidCount++;
            }
        });

        if (invalidCount > 0) {
            console.warn(`Skipped ${invalidCount} invalid models out of ${rawData.length} total`);
        }

        if (processedModels.length === 0) {
            throw new Error('No valid models found in data');
        }

        return processedModels;
    }

    /**
     * Sanitize string values
     * @private
     * @param {any} value - Value to sanitize
     * @returns {string} Sanitized string
     */
    _sanitizeString(value) {
        if (typeof value !== 'string') {
            return String(value || '');
        }
        return value.trim();
    }

    /**
     * Sanitize numeric values
     * @private
     * @param {any} value - Value to sanitize
     * @returns {number} Sanitized number
     */
    _sanitizeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : Math.max(0, num);
    }

    /**
     * Sanitize URL values
     * @private
     * @param {any} value - Value to sanitize
     * @returns {string} Sanitized URL
     */
    _sanitizeUrl(value) {
        if (typeof value !== 'string') {
            return '';
        }
        
        const trimmed = value.trim();
        
        // Basic URL validation
        try {
            new URL(trimmed);
            return trimmed;
        } catch {
            // If not a valid URL, return empty string
            return '';
        }
    }

    /**
     * Sanitize engagement metric values (like counts, stars, etc.) with comprehensive validation
     * @private
     * @param {any} value - Value to sanitize
     * @param {string} modelName - Model name for error logging
     * @returns {number} Sanitized engagement number
     */
    _sanitizeEngagementNumber(value, modelName = 'unknown') {
        try {
            // Handle null/undefined
            if (value == null) {
                return 0;
            }

            // Handle string values
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
                    return 0;
                }
                
                // Try to parse as number
                const parsed = Number(trimmed);
                if (isNaN(parsed)) {
                    console.warn(`Model ${modelName}: Invalid engagement string "${value}", defaulting to 0`);
                    return 0;
                }
                value = parsed;
            }

            // Convert to number
            const num = Number(value);
            
            // Check if it's a valid number
            if (isNaN(num)) {
                console.warn(`Model ${modelName}: Invalid engagement number: ${value}, defaulting to 0`);
                return 0;
            }

            // Check for infinity
            if (!isFinite(num)) {
                console.warn(`Model ${modelName}: Engagement number is infinite: ${value}, defaulting to 0`);
                return 0;
            }

            // Ensure it's a non-negative integer
            const sanitized = Math.max(0, Math.floor(num));
            
            // Sanity check for extremely large values
            if (sanitized > 10_000_000) {
                console.warn(`Model ${modelName}: Suspiciously high engagement number: ${value}, capping at 10M`);
                return 10_000_000;
            }
            
            // Log warning if value was modified
            if (sanitized !== num) {
                console.warn(`Model ${modelName}: Engagement number ${value} sanitized to ${sanitized}`);
            }

            return sanitized;
            
        } catch (error) {
            console.error(`Model ${modelName}: Error sanitizing engagement number ${value}:`, error);
            return 0;
        }
    }

    /**
     * Validate processed model
     * @private
     * @param {object} model - Processed model to validate
     * @returns {boolean} True if valid
     */
    _isValidProcessedModel(model) {
        // Check for minimum required data
        if (!model.modelName || model.modelName === 'Unknown Model') {
            return false;
        }
        
        if (!model.huggingFaceLink && !model.directDownloadLink) {
            return false;
        }
        
        if (model.fileSize < 0 || model.downloadCount < 0) {
            return false;
        }
        
        return true;
    }

    /**
     * Get unique values for filter options
     * @param {Array} models - Array of models
     * @returns {object} Object with unique values for each filterable field
     */
    getFilterOptions(models) {
        if (!Array.isArray(models) || models.length === 0) {
            return {
                quantFormats: [],
                modelTypes: [],
                licenses: []
            };
        }

        return {
            quantFormats: Helpers.getUniqueValues(models, 'quantFormat')
                .filter(format => format && format !== 'Unknown'),
            modelTypes: Helpers.getUniqueValues(models, 'modelType')
                .filter(type => type && type !== 'Unknown'),
            licenses: Helpers.getUniqueValues(models, 'license')
                .filter(license => license && license !== 'Not specified')
        };
    }

    /**
     * Get data statistics
     * @param {Array} models - Array of models
     * @returns {object} Statistics about the data
     */
    getDataStats(models) {
        if (!Array.isArray(models) || models.length === 0) {
            return {
                totalModels: 0,
                totalSize: 0,
                totalDownloads: 0,
                totalLikes: 0,
                avgFileSize: 0,
                avgDownloads: 0,
                avgLikes: 0,
                modelsWithLikes: 0,
                maxLikes: 0
            };
        }

        const totalSize = models.reduce((sum, model) => sum + (model.fileSize || 0), 0);
        const totalDownloads = models.reduce((sum, model) => sum + (model.downloadCount || 0), 0);
        const totalLikes = models.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const modelsWithLikes = models.filter(model => (model.likeCount || 0) > 0).length;
        const maxLikes = Math.max(...models.map(model => model.likeCount || 0));

        return {
            totalModels: models.length,
            totalSize,
            totalDownloads,
            totalLikes,
            avgFileSize: totalSize / models.length,
            avgDownloads: totalDownloads / models.length,
            avgLikes: totalLikes / models.length,
            modelsWithLikes,
            maxLikes,
            lastUpdate: this.lastUpdateTime
        };
    }
}

// Export for use in other modules
window.DataService = DataService;