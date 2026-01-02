/**
 * Performance Benchmark Utilities for GGUF Model Discovery
 * Provides tools to measure and validate performance optimizations
 */

class PerformanceBenchmark {
    constructor() {
        this.benchmarks = new Map();
        this.results = [];
    }

    /**
     * Start a benchmark timer
     * @param {string} name - Benchmark name
     */
    start(name) {
        this.benchmarks.set(name, {
            startTime: performance.now(),
            startMemory: this._getMemoryUsage()
        });
    }

    /**
     * End a benchmark timer and record results
     * @param {string} name - Benchmark name
     * @returns {object} Benchmark results
     */
    end(name) {
        const benchmark = this.benchmarks.get(name);
        if (!benchmark) {
            console.warn(`Benchmark '${name}' was not started`);
            return null;
        }

        const endTime = performance.now();
        const endMemory = this._getMemoryUsage();
        
        const result = {
            name,
            duration: endTime - benchmark.startTime,
            memoryDelta: endMemory - benchmark.startMemory,
            timestamp: new Date().toISOString()
        };

        this.results.push(result);
        this.benchmarks.delete(name);

        console.log(`Benchmark '${name}': ${result.duration.toFixed(2)}ms, Memory: ${this._formatBytes(result.memoryDelta)}`);
        
        return result;
    }

    /**
     * Run a function and measure its performance
     * @param {string} name - Benchmark name
     * @param {Function} fn - Function to benchmark
     * @returns {Promise<any>} Function result
     */
    async measure(name, fn) {
        this.start(name);
        try {
            const result = await fn();
            this.end(name);
            return result;
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Get current memory usage
     * @private
     * @returns {number} Memory usage in bytes
     */
    _getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Format bytes to human readable format
     * @private
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const sign = bytes < 0 ? '-' : '+';
        return sign + (Math.abs(bytes) / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    /**
     * Get all benchmark results
     * @returns {Array} Array of benchmark results
     */
    getResults() {
        return [...this.results];
    }

    /**
     * Get benchmark statistics
     * @returns {object} Statistics
     */
    getStats() {
        if (this.results.length === 0) {
            return { count: 0, averageDuration: 0, totalMemoryDelta: 0 };
        }

        const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
        const totalMemoryDelta = this.results.reduce((sum, result) => sum + result.memoryDelta, 0);

        return {
            count: this.results.length,
            averageDuration: totalDuration / this.results.length,
            totalDuration,
            totalMemoryDelta,
            averageMemoryDelta: totalMemoryDelta / this.results.length
        };
    }

    /**
     * Clear all results
     */
    clear() {
        this.results = [];
        this.benchmarks.clear();
    }

    /**
     * Export results as JSON
     * @returns {string} JSON string of results
     */
    exportResults() {
        return JSON.stringify({
            results: this.results,
            stats: this.getStats(),
            timestamp: new Date().toISOString()
        }, null, 2);
    }
}

/**
 * Specific benchmarks for GGUF Model Discovery performance testing
 */
class GGUFPerformanceBenchmarks {
    constructor(app) {
        this.app = app;
        this.benchmark = new PerformanceBenchmark();
    }

    /**
     * Benchmark data loading performance
     * @returns {Promise<object>} Benchmark results
     */
    async benchmarkDataLoading() {
        return await this.benchmark.measure('dataLoading', async () => {
            await this.app.dataService.loadModels('./gguf_models.json', true);
        });
    }

    /**
     * Benchmark filtering performance
     * @param {Array} models - Models to filter
     * @param {object} filters - Filters to apply
     * @returns {object} Benchmark results
     */
    benchmarkFiltering(models, filters) {
        return this.benchmark.measure('filtering', () => {
            return this.app.filterService.filterModels(models, filters, '');
        });
    }

    /**
     * Benchmark search performance
     * @param {Array} models - Models to search
     * @param {string} query - Search query
     * @returns {object} Benchmark results
     */
    benchmarkSearch(models, query) {
        return this.benchmark.measure('search', () => {
            return this.app.filterService.searchModels(models, query);
        });
    }

    /**
     * Benchmark sorting performance
     * @param {Array} models - Models to sort
     * @param {string} field - Field to sort by
     * @param {string} direction - Sort direction
     * @returns {object} Benchmark results
     */
    benchmarkSorting(models, field, direction) {
        return this.benchmark.measure('sorting', () => {
            return this.app.filterService.sortModels(models, field, direction);
        });
    }

    /**
     * Benchmark grid rendering performance
     * @param {Array} models - Models to render
     * @param {number} startIndex - Starting index
     * @returns {Promise<object>} Benchmark results
     */
    async benchmarkGridRendering(models, startIndex = 0) {
        return await this.benchmark.measure('gridRendering', async () => {
            await this.app.modelGrid.renderCards(models, startIndex);
        });
    }

    /**
     * Run comprehensive performance test suite
     * @returns {Promise<object>} Complete benchmark results
     */
    async runComprehensiveTest() {
        console.log('Starting comprehensive performance test suite...');
        
        const state = this.app.appState.getState();
        const models = state.allModels;
        
        if (!models || models.length === 0) {
            throw new Error('No models available for testing');
        }

        // Test data loading
        await this.benchmarkDataLoading();

        // Test filtering with various combinations
        const filterTests = [
            { quantFormat: 'Q4_0' },
            { modelType: 'Unknown' },
            { license: 'Not specified' },
            { quantFormat: 'F16', modelType: 'Unknown' }
        ];

        for (const filters of filterTests) {
            await this.benchmarkFiltering(models, filters);
        }

        // Test search with various queries
        const searchQueries = ['model', 'llama', 'q4', 'f16', 'unknown'];
        for (const query of searchQueries) {
            this.benchmarkSearch(models, query);
        }

        // Test sorting
        const sortTests = [
            ['downloadCount', 'desc'],
            ['modelName', 'asc'],
            ['fileSize', 'desc']
        ];

        for (const [field, direction] of sortTests) {
            this.benchmarkSorting(models, field, direction);
        }

        // Test grid rendering
        const renderModels = models.slice(0, 50);
        await this.benchmarkGridRendering(renderModels);

        const results = {
            summary: this.benchmark.getStats(),
            details: this.benchmark.getResults(),
            modelCount: models.length,
            timestamp: new Date().toISOString()
        };

        console.log('Performance test suite completed:', results.summary);
        return results;
    }

    /**
     * Compare performance with and without optimizations
     * @returns {Promise<object>} Comparison results
     */
    async compareOptimizations() {
        console.log('Comparing performance with and without optimizations...');
        
        const state = this.app.appState.getState();
        const models = state.allModels;
        
        if (!models || models.length === 0) {
            throw new Error('No models available for testing');
        }

        // Test with optimizations enabled
        this.app.filterService.configurePerformance({
            enableCaching: true,
            maxCacheSize: 100
        });
        
        this.app.modelGrid.configurePerformance({
            enableBatching: true,
            enableRecycling: true
        });

        const optimizedResults = await this.runComprehensiveTest();
        this.benchmark.clear();

        // Test with optimizations disabled
        this.app.filterService.configurePerformance({
            enableCaching: false,
            maxCacheSize: 0
        });
        
        this.app.modelGrid.configurePerformance({
            enableBatching: false,
            enableRecycling: false
        });

        const unoptimizedResults = await this.runComprehensiveTest();

        // Re-enable optimizations
        this.app.filterService.configurePerformance({
            enableCaching: true,
            maxCacheSize: 100
        });
        
        this.app.modelGrid.configurePerformance({
            enableBatching: true,
            enableRecycling: true
        });

        const comparison = {
            optimized: optimizedResults.summary,
            unoptimized: unoptimizedResults.summary,
            improvement: {
                durationImprovement: ((unoptimizedResults.summary.averageDuration - optimizedResults.summary.averageDuration) / unoptimizedResults.summary.averageDuration * 100).toFixed(2) + '%',
                memoryImprovement: this.benchmark._formatBytes(unoptimizedResults.summary.averageMemoryDelta - optimizedResults.summary.averageMemoryDelta)
            },
            timestamp: new Date().toISOString()
        };

        console.log('Performance comparison completed:', comparison);
        return comparison;
    }

    /**
     * Get benchmark instance for custom tests
     * @returns {PerformanceBenchmark} Benchmark instance
     */
    getBenchmark() {
        return this.benchmark;
    }
}

// Export for use in other modules
window.PerformanceBenchmark = PerformanceBenchmark;
window.GGUFPerformanceBenchmarks = GGUFPerformanceBenchmarks;