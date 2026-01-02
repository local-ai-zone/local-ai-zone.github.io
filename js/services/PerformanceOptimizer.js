/**
 * PerformanceOptimizer Service for GGUF Model Discovery
 * Provides Web Worker support and caching for filtering large datasets
 * Optimized for datasets up to 50,000 models
 */

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.indexCache = new Map();
        this.worker = null;
        this.workerPromises = new Map();
        this.requestId = 0;
        
        // Performance settings
        this.maxCacheSize = 200;
        this.maxIndexCacheSize = 50;
        this.workerTimeout = 10000; // 10 seconds
        this.batchSize = 2000;
        this.enableCaching = true;
        this.enableWorker = true;
        
        // Memory management
        this.memoryThreshold = 100 * 1024 * 1024; // 100MB
        this.lastCleanup = Date.now();
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        
        // Bind methods
        this.initWorker = this.initWorker.bind(this);
        this.optimizeFiltering = this.optimizeFiltering.bind(this);
        this.filterWithWorker = this.filterWithWorker.bind(this);
        this.filterMainThread = this.filterMainThread.bind(this);
        this.handleWorkerMessage = this.handleWorkerMessage.bind(this);
        this.generateCacheKey = this.generateCacheKey.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.getMemoryUsage = this.getMemoryUsage.bind(this);
        this.performMemoryCleanup = this.performMemoryCleanup.bind(this);
        
        this.initWorker();
        this.startMemoryMonitoring();
    }
    
    initWorker() {
        if (!this.enableWorker || typeof Worker === 'undefined') {
            console.log('PerformanceOptimizer: Web Workers not available, using main thread');
            return;
        }
        
        try {
            // Create worker with inline code to avoid external file dependency
            const workerCode = this.getWorkerCode();
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            this.worker = new Worker(workerUrl);
            this.worker.onmessage = this.handleWorkerMessage;
            this.worker.onerror = (error) => {
                console.error('PerformanceOptimizer: Worker error:', error);
                this.enableWorker = false;
                this.worker = null;
            };
            
            console.log('PerformanceOptimizer: Web Worker initialized successfully');
            
            // Clean up blob URL
            URL.revokeObjectURL(workerUrl);
            
        } catch (error) {
            console.error('PerformanceOptimizer: Failed to initialize Web Worker:', error);
            this.enableWorker = false;
            this.worker = null;
        }
    }
    
    getWorkerCode() {
        return `
            // Web Worker code for filtering large datasets
            class FilterWorker {
                constructor() {
                    this.searchIndex = new Map();
                    this.fieldIndexes = new Map();
                }
                
                buildSearchIndex(models) {
                    this.searchIndex.clear();
                    const searchFields = ['modelName', 'quantFormat', 'modelType', 'license'];
                    
                    models.forEach((model, index) => {
                        searchFields.forEach(field => {
                            const value = model[field];
                            if (value && typeof value === 'string') {
                                const words = value.toLowerCase().split(/[\\s\\-_]+/);
                                words.forEach(word => {
                                    if (word.length >= 2) {
                                        if (!this.searchIndex.has(word)) {
                                            this.searchIndex.set(word, new Set());
                                        }
                                        this.searchIndex.get(word).add(index);
                                        
                                        // Add prefixes for autocomplete
                                        for (let i = 2; i <= word.length; i++) {
                                            const prefix = word.substring(0, i);
                                            if (!this.searchIndex.has(prefix)) {
                                                this.searchIndex.set(prefix, new Set());
                                            }
                                            this.searchIndex.get(prefix).add(index);
                                        }
                                    }
                                });
                            }
                        });
                    });
                }
                
                buildFieldIndexes(models) {
                    this.fieldIndexes.clear();
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
                }
                
                searchModels(models, query) {
                    if (!query || !query.trim()) {
                        return Array.from({ length: models.length }, (_, i) => i);
                    }
                    
                    const searchTerm = query.toLowerCase().trim();
                    const matchingIndexes = new Set();
                    const words = searchTerm.split(/\\s+/);
                    
                    words.forEach(word => {
                        if (word.length >= 2) {
                            for (const [indexedTerm, indexes] of this.searchIndex.entries()) {
                                if (indexedTerm.includes(word)) {
                                    indexes.forEach(index => matchingIndexes.add(index));
                                }
                            }
                        }
                    });
                    
                    return Array.from(matchingIndexes);
                }
                
                filterByField(models, field, value) {
                    if (!value || value === 'all') {
                        return Array.from({ length: models.length }, (_, i) => i);
                    }
                    
                    const fieldIndex = this.fieldIndexes.get(field);
                    if (fieldIndex) {
                        const normalizedValue = value.toLowerCase();
                        return fieldIndex.get(normalizedValue) || [];
                    }
                    
                    // Fallback to linear search
                    const results = [];
                    models.forEach((model, index) => {
                        if (model[field] && model[field].toLowerCase() === value.toLowerCase()) {
                            results.push(index);
                        }
                    });
                    return results;
                }
                
                filterByRange(models, field, min, max) {
                    const results = [];
                    models.forEach((model, index) => {
                        const value = model[field] || 0;
                        if (value >= min && value <= max) {
                            results.push(index);
                        }
                    });
                    return results;
                }
                
                filterByHardware(models, hardwareFilters) {
                    const results = [];
                    
                    models.forEach((model, index) => {
                        let matches = true;
                        
                        // CPU filter
                        if (hardwareFilters.minCpuCores && hardwareFilters.minCpuCores !== 'all') {
                            const requiredCores = parseInt(hardwareFilters.minCpuCores);
                            if (!model.minCpuCores || model.minCpuCores < requiredCores) {
                                matches = false;
                            }
                        }
                        
                        // RAM filter
                        if (hardwareFilters.minRamGB && hardwareFilters.minRamGB !== 'all') {
                            const requiredRam = parseInt(hardwareFilters.minRamGB);
                            if (!model.minRamGB || model.minRamGB < requiredRam) {
                                matches = false;
                            }
                        }
                        
                        // GPU filter
                        if (hardwareFilters.gpuRequired && hardwareFilters.gpuRequired !== 'all') {
                            if (hardwareFilters.gpuRequired === 'required' && !model.gpuRequired) {
                                matches = false;
                            }
                            if (hardwareFilters.gpuRequired === 'not-required' && model.gpuRequired) {
                                matches = false;
                            }
                        }
                        
                        if (matches) {
                            results.push(index);
                        }
                    });
                    
                    return results;
                }
                
                intersectArrays(arrays) {
                    if (arrays.length === 0) return [];
                    if (arrays.length === 1) return arrays[0];
                    
                    // Convert to Sets for faster intersection
                    const sets = arrays.map(arr => new Set(arr));
                    let result = sets[0];
                    
                    for (let i = 1; i < sets.length; i++) {
                        const newResult = new Set();
                        for (const item of result) {
                            if (sets[i].has(item)) {
                                newResult.add(item);
                            }
                        }
                        result = newResult;
                    }
                    
                    return Array.from(result);
                }
                
                sortModels(modelIndexes, models, field, direction) {
                    const isAscending = direction === 'asc';
                    
                    const indexedValues = modelIndexes.map(index => ({
                        index,
                        value: models[index][field],
                        originalIndex: index
                    }));
                    
                    indexedValues.sort((a, b) => {
                        let valueA = a.value;
                        let valueB = b.value;
                        
                        // Handle null/undefined values
                        if (valueA == null && valueB == null) return a.originalIndex - b.originalIndex;
                        if (valueA == null) return isAscending ? -1 : 1;
                        if (valueB == null) return isAscending ? 1 : -1;
                        
                        // Handle different data types
                        if (typeof valueA === 'string' && typeof valueB === 'string') {
                            valueA = valueA.toLowerCase();
                            valueB = valueB.toLowerCase();
                        }
                        
                        let comparison = 0;
                        if (valueA < valueB) {
                            comparison = -1;
                        } else if (valueA > valueB) {
                            comparison = 1;
                        } else {
                            comparison = a.originalIndex - b.originalIndex;
                        }
                        
                        return isAscending ? comparison : -comparison;
                    });
                    
                    return indexedValues.map(item => item.index);
                }
                
                processRequest(data) {
                    const { models, filters, searchQuery, sorting } = data;
                    
                    try {
                        // Build indexes if not already built
                        if (this.searchIndex.size === 0) {
                            this.buildSearchIndex(models);
                        }
                        if (this.fieldIndexes.size === 0) {
                            this.buildFieldIndexes(models);
                        }
                        
                        const filterResults = [];
                        
                        // Apply search filter
                        if (searchQuery) {
                            filterResults.push(this.searchModels(models, searchQuery));
                        }
                        
                        // Apply field filters
                        if (filters.quantFormat && filters.quantFormat !== 'all') {
                            filterResults.push(this.filterByField(models, 'quantFormat', filters.quantFormat));
                        }
                        
                        if (filters.modelType && filters.modelType !== 'all') {
                            filterResults.push(this.filterByField(models, 'modelType', filters.modelType));
                        }
                        
                        if (filters.license && filters.license !== 'all') {
                            filterResults.push(this.filterByField(models, 'license', filters.license));
                        }
                        
                        // Apply range filters
                        if (filters.fileSizeMin !== undefined || filters.fileSizeMax !== undefined) {
                            filterResults.push(this.filterByRange(
                                models, 
                                'fileSize', 
                                filters.fileSizeMin || 0, 
                                filters.fileSizeMax || Infinity
                            ));
                        }
                        
                        if (filters.downloadCountMin !== undefined || filters.downloadCountMax !== undefined) {
                            filterResults.push(this.filterByRange(
                                models, 
                                'downloadCount', 
                                filters.downloadCountMin || 0, 
                                filters.downloadCountMax || Infinity
                            ));
                        }
                        
                        if (filters.likeCountMin !== undefined || filters.likeCountMax !== undefined) {
                            filterResults.push(this.filterByRange(
                                models, 
                                'likeCount', 
                                filters.likeCountMin || 0, 
                                filters.likeCountMax || Infinity
                            ));
                        }
                        
                        // Apply hardware filters
                        if (filters.minCpuCores || filters.minRamGB || filters.gpuRequired) {
                            const hardwareFilters = {
                                minCpuCores: filters.minCpuCores,
                                minRamGB: filters.minRamGB,
                                gpuRequired: filters.gpuRequired
                            };
                            filterResults.push(this.filterByHardware(models, hardwareFilters));
                        }
                        
                        // Intersect all filter results
                        let finalIndexes;
                        if (filterResults.length === 0) {
                            finalIndexes = Array.from({ length: models.length }, (_, i) => i);
                        } else {
                            finalIndexes = this.intersectArrays(filterResults);
                        }
                        
                        // Apply sorting
                        if (sorting && sorting.field) {
                            finalIndexes = this.sortModels(finalIndexes, models, sorting.field, sorting.direction);
                        }
                        
                        // Return the filtered model data
                        const results = finalIndexes.map(index => models[index]);
                        
                        return {
                            success: true,
                            results,
                            totalFiltered: results.length,
                            totalOriginal: models.length
                        };
                        
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message,
                            stack: error.stack
                        };
                    }
                }
            }
            
            const filterWorker = new FilterWorker();
            
            self.onmessage = function(e) {
                const { id, ...data } = e.data;
                const result = filterWorker.processRequest(data);
                
                self.postMessage({
                    id,
                    ...result
                });
            };
        `;
    }
    
    handleWorkerMessage(e) {
        const { id, success, results, error, totalFiltered, totalOriginal } = e.data;
        
        const promise = this.workerPromises.get(id);
        if (!promise) return;
        
        this.workerPromises.delete(id);
        
        if (success) {
            promise.resolve({
                results,
                totalFiltered,
                totalOriginal,
                fromWorker: true
            });
        } else {
            promise.reject(new Error(error || 'Worker processing failed'));
        }
    }
    
    async optimizeFiltering(models, filters, searchQuery = '', sorting = null) {
        const startTime = performance.now();
        
        // Generate cache key
        const cacheKey = this.generateCacheKey(filters, searchQuery, sorting, models.length);
        
        // Check cache first
        if (this.enableCaching && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            console.log(`PerformanceOptimizer: Cache hit for ${models.length} models (${(performance.now() - startTime).toFixed(2)}ms)`);
            return {
                ...cached,
                fromCache: true,
                processingTime: performance.now() - startTime
            };
        }
        
        let result;
        
        // Use Web Worker for large datasets
        if (this.enableWorker && this.worker && models.length > 10000) {
            try {
                result = await this.filterWithWorker(models, filters, searchQuery, sorting);
            } catch (error) {
                console.warn('PerformanceOptimizer: Worker failed, falling back to main thread:', error);
                result = await this.filterMainThread(models, filters, searchQuery, sorting);
            }
        } else {
            // Use main thread for smaller datasets or when worker is unavailable
            result = await this.filterMainThread(models, filters, searchQuery, sorting);
        }
        
        // Cache results
        if (this.enableCaching && result.results.length < 10000) { // Don't cache very large results
            this.addToCache(cacheKey, {
                results: result.results,
                totalFiltered: result.totalFiltered,
                totalOriginal: result.totalOriginal
            });
        }
        
        const processingTime = performance.now() - startTime;
        console.log(`PerformanceOptimizer: Filtered ${models.length} models to ${result.totalFiltered} in ${processingTime.toFixed(2)}ms`);
        
        return {
            ...result,
            processingTime
        };
    }
    
    async filterWithWorker(models, filters, searchQuery, sorting) {
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            
            // Store promise for resolution
            this.workerPromises.set(requestId, { resolve, reject });
            
            // Send data to worker
            this.worker.postMessage({
                id: requestId,
                models,
                filters,
                searchQuery,
                sorting
            });
            
            // Set timeout
            setTimeout(() => {
                if (this.workerPromises.has(requestId)) {
                    this.workerPromises.delete(requestId);
                    reject(new Error('Worker timeout'));
                }
            }, this.workerTimeout);
        });
    }
    
    async filterMainThread(models, filters, searchQuery, sorting) {
        // Use existing FilterService for main thread processing
        if (!window.FilterService) {
            throw new Error('FilterService not available');
        }
        
        const filterService = new window.FilterService();
        
        // Build indexes for better performance
        filterService.buildIndexes(models);
        
        const results = filterService.applyAllFilters(models, {
            searchQuery,
            filters,
            sorting: sorting || { field: 'likeCount', direction: 'desc' }
        });
        
        return {
            results,
            totalFiltered: results.length,
            totalOriginal: models.length,
            fromWorker: false
        };
    }
    
    generateCacheKey(filters, searchQuery, sorting, modelCount) {
        const filterStr = JSON.stringify(filters);
        const sortStr = sorting ? JSON.stringify(sorting) : '';
        return `filter:${searchQuery}:${filterStr}:${sortStr}:${modelCount}`;
    }
    
    addToCache(key, value) {
        // Implement LRU cache behavior
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            ...value,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
        this.indexCache.clear();
        console.log('PerformanceOptimizer: Cache cleared');
    }
    
    getMemoryUsage() {
        const cacheMemory = this.estimateCacheMemory();
        const indexMemory = this.estimateIndexMemory();
        
        return {
            cacheSize: this.cache.size,
            indexCacheSize: this.indexCache.size,
            estimatedCacheMemoryMB: (cacheMemory / 1024 / 1024).toFixed(2),
            estimatedIndexMemoryMB: (indexMemory / 1024 / 1024).toFixed(2),
            totalEstimatedMemoryMB: ((cacheMemory + indexMemory) / 1024 / 1024).toFixed(2),
            workerActive: !!this.worker,
            cachingEnabled: this.enableCaching
        };
    }
    
    estimateCacheMemory() {
        let totalSize = 0;
        
        for (const [key, value] of this.cache.entries()) {
            // Rough estimation: key size + JSON size of value
            totalSize += key.length * 2; // UTF-16 characters
            totalSize += JSON.stringify(value).length * 2;
        }
        
        return totalSize;
    }
    
    estimateIndexMemory() {
        let totalSize = 0;
        
        for (const [key, value] of this.indexCache.entries()) {
            totalSize += key.length * 2;
            totalSize += JSON.stringify(value).length * 2;
        }
        
        return totalSize;
    }
    
    startMemoryMonitoring() {
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastCleanup > this.cleanupInterval) {
                this.performMemoryCleanup();
                this.lastCleanup = now;
            }
        }, 60000); // Check every minute
    }
    
    performMemoryCleanup() {
        const memoryUsage = this.getMemoryUsage();
        const totalMemoryBytes = parseFloat(memoryUsage.totalEstimatedMemoryMB) * 1024 * 1024;
        
        if (totalMemoryBytes > this.memoryThreshold) {
            console.log('PerformanceOptimizer: Memory threshold exceeded, performing cleanup');
            
            // Remove oldest cache entries
            const cacheEntries = Array.from(this.cache.entries());
            const sortedEntries = cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Remove oldest 25% of entries
            const toRemove = Math.floor(sortedEntries.length * 0.25);
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(sortedEntries[i][0]);
            }
            
            // Clear index cache if still over threshold
            if (this.estimateCacheMemory() + this.estimateIndexMemory() > this.memoryThreshold) {
                this.indexCache.clear();
            }
            
            console.log(`PerformanceOptimizer: Cleanup completed, removed ${toRemove} cache entries`);
        }
    }
    
    // Hardware compatibility checking
    checkHardwareCompatibility(model, userHardware) {
        if (!model || !userHardware) {
            return {
                compatible: 'unknown',
                recommendations: [],
                score: 0
            };
        }
        
        const recommendations = [];
        let score = 100;
        let compatible = 'compatible';
        
        // Check CPU requirements
        if (model.minCpuCores && userHardware.cpuCores) {
            if (userHardware.cpuCores < model.minCpuCores) {
                compatible = 'incompatible';
                score -= 30;
                recommendations.push({
                    type: 'cpu',
                    current: userHardware.cpuCores,
                    required: model.minCpuCores,
                    message: `Upgrade to ${model.minCpuCores}+ CPU cores`
                });
            }
        }
        
        // Check RAM requirements
        if (model.minRamGB && userHardware.ramGB) {
            if (userHardware.ramGB < model.minRamGB) {
                if (compatible === 'compatible') compatible = 'requires-upgrade';
                score -= 25;
                recommendations.push({
                    type: 'ram',
                    current: userHardware.ramGB,
                    required: model.minRamGB,
                    message: `Upgrade to ${model.minRamGB}+ GB RAM`
                });
            }
        }
        
        // Check GPU requirements
        if (model.gpuRequired && !userHardware.hasGpu) {
            if (compatible === 'compatible') compatible = 'requires-upgrade';
            score -= 20;
            recommendations.push({
                type: 'gpu',
                current: false,
                required: true,
                message: 'GPU required for optimal performance'
            });
        }
        
        return {
            compatible,
            recommendations,
            score: Math.max(0, score)
        };
    }
    
    // Performance metrics
    getPerformanceMetrics() {
        return {
            cacheHitRate: this.calculateCacheHitRate(),
            averageProcessingTime: this.calculateAverageProcessingTime(),
            workerUtilization: this.calculateWorkerUtilization(),
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    calculateCacheHitRate() {
        // This would need to be tracked over time
        return 0; // Placeholder
    }
    
    calculateAverageProcessingTime() {
        // This would need to be tracked over time
        return 0; // Placeholder
    }
    
    calculateWorkerUtilization() {
        return this.workerPromises.size;
    }
    
    // Cleanup and destroy
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.clearCache();
        this.workerPromises.clear();
        
        console.log('PerformanceOptimizer: Destroyed');
    }
}

// Export for use in other modules
window.PerformanceOptimizer = PerformanceOptimizer;