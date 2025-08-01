/**
 * Verification script for engagement metrics state management integration
 * Tests state management, data validation, and subscription handling
 */

// Mock Helpers if not available
if (typeof window.Helpers === 'undefined') {
    window.Helpers = {
        deepClone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },
        getUniqueValues: function(array, field) {
            return [...new Set(array.map(item => item[field]))];
        }
    };
}

class EngagementStateVerifier {
    constructor() {
        this.testResults = [];
        this.appState = null;
        this.dataService = null;
        this.subscriptionLog = [];
    }

    /**
     * Run all verification tests
     */
    async runAllTests() {
        console.log('🧪 Starting Engagement State Management Verification...');
        
        try {
            this.initializeServices();
            await this.testStateInitialization();
            await this.testEngagementFilterIntegration();
            await this.testDataValidation();
            await this.testStateSubscriptions();
            await this.testStatePersistence();
            
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            this.addResult('Verification Error', false, error.message);
        }
    }

    /**
     * Initialize services for testing
     */
    initializeServices() {
        console.log('🔧 Initializing services...');
        
        this.appState = new AppState();
        this.dataService = new DataService();
        
        // Set up subscription logging
        this.appState.subscribe((newState, previousState) => {
            this.subscriptionLog.push({
                timestamp: Date.now(),
                changes: this.detectStateChanges(previousState, newState)
            });
        });
        
        this.addResult('Service Initialization', true, 'AppState and DataService initialized');
    }

    /**
     * Test state initialization with engagement metrics
     */
    async testStateInitialization() {
        console.log('🏁 Testing state initialization...');
        
        // Test initial state structure
        const initialState = this.appState.getState();
        
        // Check engagement filter defaults
        const hasEngagementFilters = (
            typeof initialState.filters.likeCountMin === 'number' &&
            typeof initialState.filters.likeCountMax === 'number' &&
            initialState.filters.likeCountMin === 0 &&
            initialState.filters.likeCountMax === Infinity
        );
        
        this.addResult(
            'Engagement Filter Defaults',
            hasEngagementFilters,
            `likeCountMin: ${initialState.filters.likeCountMin}, likeCountMax: ${initialState.filters.likeCountMax}`
        );

        // Test with mock data
        const mockModels = this.createMockModels();
        this.appState.setModels(mockModels);
        
        const stateWithModels = this.appState.getState();
        const modelsLoaded = stateWithModels.allModels.length === mockModels.length;
        
        this.addResult(
            'Models Loading',
            modelsLoaded,
            `Loaded ${stateWithModels.allModels.length} models`
        );

        // Check engagement metrics in loaded models
        const hasEngagementData = stateWithModels.allModels.every(model => 
            typeof model.likeCount === 'number' && model.likeCount >= 0
        );
        
        this.addResult(
            'Engagement Metrics Present',
            hasEngagementData,
            hasEngagementData ? 'All models have valid likeCount' : 'Some models missing likeCount'
        );
    }

    /**
     * Test engagement filter integration
     */
    async testEngagementFilterIntegration() {
        console.log('🔍 Testing engagement filter integration...');
        
        // Test setting engagement filter
        this.appState.setEngagementFilter(10, 100);
        const state1 = this.appState.getState();
        
        const filterSet = (
            state1.filters.likeCountMin === 10 &&
            state1.filters.likeCountMax === 100
        );
        
        this.addResult(
            'Set Engagement Filter',
            filterSet,
            `Filter range: ${state1.filters.likeCountMin} - ${state1.filters.likeCountMax}`
        );

        // Test clearing engagement filter
        this.appState.clearEngagementFilter();
        const state2 = this.appState.getState();
        
        const filterCleared = (
            state2.filters.likeCountMin === 0 &&
            state2.filters.likeCountMax === Infinity
        );
        
        this.addResult(
            'Clear Engagement Filter',
            filterCleared,
            `Filter cleared to: ${state2.filters.likeCountMin} - ${state2.filters.likeCountMax}`
        );

        // Test engagement filter statistics
        const stats = this.appState.getEngagementFilterStats();
        const hasValidStats = (
            typeof stats === 'object' &&
            typeof stats.totalLikes === 'number' &&
            typeof stats.avgLikes === 'number' &&
            typeof stats.maxLikes === 'number' &&
            typeof stats.modelsWithLikes === 'number'
        );
        
        this.addResult(
            'Engagement Filter Statistics',
            hasValidStats,
            `Total likes: ${stats.totalLikes}, Avg: ${stats.avgLikes.toFixed(1)}, Max: ${stats.maxLikes}`
        );

        // Test active filters include engagement
        this.appState.setEngagementFilter(25, 150);
        const activeFilters = this.appState.getActiveFilters();
        const hasEngagementInActiveFilters = activeFilters.some(filter => 
            filter.toLowerCase().includes('likes')
        );
        
        this.addResult(
            'Active Filters Include Engagement',
            hasEngagementInActiveFilters,
            `Active filters: ${activeFilters.join(', ')}`
        );
    }

    /**
     * Test data validation for engagement metrics
     */
    async testDataValidation() {
        console.log('✅ Testing data validation...');
        
        // Test valid model validation
        const validModel = {
            modelName: "Test Model",
            quantFormat: "Q4_K_M",
            fileSize: 4200000000,
            fileSizeFormatted: "4.2 GB",
            modelType: "Chat",
            license: "Apache-2.0",
            downloadCount: 1500,
            likeCount: 25,
            huggingFaceLink: "https://huggingface.co/test",
            directDownloadLink: "https://example.com/test.gguf"
        };
        
        const isValidModel = this.dataService.validateModelData(validModel);
        this.addResult(
            'Valid Model Validation',
            isValidModel,
            'Model with engagement metrics passes validation'
        );

        // Test engagement number sanitization
        const testCases = [
            { input: 25, expected: 25 },
            { input: 25.7, expected: 25 },
            { input: -5, expected: 0 },
            { input: "invalid", expected: 0 },
            { input: null, expected: 0 },
            { input: undefined, expected: 0 }
        ];
        
        let sanitizationPassed = true;
        const sanitizationResults = [];
        
        testCases.forEach(testCase => {
            const result = this.dataService._sanitizeEngagementNumber(testCase.input);
            const passed = result === testCase.expected;
            sanitizationPassed = sanitizationPassed && passed;
            sanitizationResults.push(`${testCase.input}→${result}`);
        });
        
        this.addResult(
            'Engagement Number Sanitization',
            sanitizationPassed,
            sanitizationResults.join(', ')
        );

        // Test data statistics include engagement
        const mockModels = this.createMockModels();
        const stats = this.dataService.getDataStats(mockModels);
        const hasEngagementStats = (
            typeof stats.totalLikes === 'number' &&
            typeof stats.avgLikes === 'number' &&
            typeof stats.modelsWithLikes === 'number' &&
            typeof stats.maxLikes === 'number'
        );
        
        this.addResult(
            'Data Statistics Include Engagement',
            hasEngagementStats,
            `Total: ${stats.totalLikes}, Avg: ${stats.avgLikes.toFixed(1)}, With likes: ${stats.modelsWithLikes}`
        );
    }

    /**
     * Test state subscriptions with engagement metrics
     */
    async testStateSubscriptions() {
        console.log('📡 Testing state subscriptions...');
        
        const initialLogLength = this.subscriptionLog.length;
        
        // Test subscription on engagement filter change
        this.appState.setEngagementFilter(50, 200);
        const afterFilterChange = this.subscriptionLog.length;
        
        this.addResult(
            'Subscription on Filter Change',
            afterFilterChange > initialLogLength,
            `Subscription events: ${initialLogLength} → ${afterFilterChange}`
        );

        // Test subscription on search change
        const beforeSearch = this.subscriptionLog.length;
        this.appState.setSearchQuery("engagement test");
        const afterSearch = this.subscriptionLog.length;
        
        this.addResult(
            'Subscription on Search Change',
            afterSearch > beforeSearch,
            `Subscription events: ${beforeSearch} → ${afterSearch}`
        );

        // Test subscription on sorting change to engagement field
        const beforeSort = this.subscriptionLog.length;
        this.appState.setSorting('likeCount', 'desc');
        const afterSort = this.subscriptionLog.length;
        
        this.addResult(
            'Subscription on Engagement Sort',
            afterSort > beforeSort,
            `Subscription events: ${beforeSort} → ${afterSort}`
        );
    }

    /**
     * Test state persistence across component interactions
     */
    async testStatePersistence() {
        console.log('💾 Testing state persistence...');
        
        // Set up complex state
        this.appState.setSearchQuery("persistence test");
        this.appState.setEngagementFilter(30, 120);
        this.appState.setSorting('likeCount', 'asc');
        this.appState.updateFilters({ quantFormat: 'Q4_K_M' });
        
        const state = this.appState.getState();
        
        // Check all state components persist
        const statePersisted = (
            state.searchQuery === "persistence test" &&
            state.filters.likeCountMin === 30 &&
            state.filters.likeCountMax === 120 &&
            state.sorting.field === 'likeCount' &&
            state.sorting.direction === 'asc' &&
            state.filters.quantFormat === 'Q4_K_M'
        );
        
        this.addResult(
            'State Persistence',
            statePersisted,
            `Search: "${state.searchQuery}", Engagement: ${state.filters.likeCountMin}-${state.filters.likeCountMax}, Sort: ${state.sorting.field} ${state.sorting.direction}`
        );

        // Test state consistency after multiple operations
        const initialState = this.appState.getState();
        
        // Perform multiple operations
        this.appState.clearEngagementFilter();
        this.appState.setEngagementFilter(10, 50);
        this.appState.setCurrentPage(2);
        this.appState.setSorting('downloadCount', 'desc');
        
        const finalState = this.appState.getState();
        
        // Check that non-engagement state is preserved where expected
        const consistencyMaintained = (
            finalState.searchQuery === initialState.searchQuery &&
            finalState.filters.quantFormat === initialState.filters.quantFormat &&
            finalState.filters.likeCountMin === 10 &&
            finalState.filters.likeCountMax === 50
        );
        
        this.addResult(
            'State Consistency',
            consistencyMaintained,
            'State remains consistent across multiple operations'
        );
    }

    /**
     * Create mock models for testing
     */
    createMockModels() {
        return [
            {
                modelName: "High Engagement Model",
                quantFormat: "Q4_K_M",
                fileSize: 4200000000,
                fileSizeFormatted: "4.2 GB",
                modelType: "Chat",
                license: "Apache-2.0",
                downloadCount: 5000,
                likeCount: 250,
                huggingFaceLink: "https://huggingface.co/high-engagement",
                directDownloadLink: "https://example.com/high.gguf"
            },
            {
                modelName: "Medium Engagement Model",
                quantFormat: "Q8_0",
                fileSize: 8100000000,
                fileSizeFormatted: "8.1 GB",
                modelType: "Code",
                license: "MIT",
                downloadCount: 3200,
                likeCount: 75,
                huggingFaceLink: "https://huggingface.co/medium-engagement",
                directDownloadLink: "https://example.com/medium.gguf"
            },
            {
                modelName: "Low Engagement Model",
                quantFormat: "Q4_K_M",
                fileSize: 2800000000,
                fileSizeFormatted: "2.8 GB",
                modelType: "Chat",
                license: "Apache-2.0",
                downloadCount: 800,
                likeCount: 5,
                huggingFaceLink: "https://huggingface.co/low-engagement",
                directDownloadLink: "https://example.com/low.gguf"
            },
            {
                modelName: "No Engagement Model",
                quantFormat: "Q5_K_M",
                fileSize: 5500000000,
                fileSizeFormatted: "5.5 GB",
                modelType: "Instruct",
                license: "CC-BY-4.0",
                downloadCount: 1200,
                likeCount: 0,
                huggingFaceLink: "https://huggingface.co/no-engagement",
                directDownloadLink: "https://example.com/none.gguf"
            }
        ];
    }

    /**
     * Detect changes between state objects
     */
    detectStateChanges(oldState, newState) {
        const changes = [];
        
        if (!oldState) return ['initial state'];
        
        if (oldState.searchQuery !== newState.searchQuery) {
            changes.push('searchQuery');
        }
        
        if (JSON.stringify(oldState.filters) !== JSON.stringify(newState.filters)) {
            changes.push('filters');
        }
        
        if (JSON.stringify(oldState.sorting) !== JSON.stringify(newState.sorting)) {
            changes.push('sorting');
        }
        
        if (oldState.allModels.length !== newState.allModels.length) {
            changes.push('allModels');
        }
        
        if (oldState.filteredModels.length !== newState.filteredModels.length) {
            changes.push('filteredModels');
        }
        
        return changes.length > 0 ? changes : ['minor update'];
    }

    /**
     * Add test result
     */
    addResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * Display final results
     */
    displayResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n📊 Engagement State Management Verification Results:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`  - ${result.name}: ${result.message}`);
                });
        }
        
        console.log('\n🔍 Subscription Log Summary:');
        console.log(`Total subscription events: ${this.subscriptionLog.length}`);
        
        if (this.subscriptionLog.length > 0) {
            const recentEvents = this.subscriptionLog.slice(-5);
            console.log('Recent events:');
            recentEvents.forEach(event => {
                console.log(`  - ${new Date(event.timestamp).toLocaleTimeString()}: ${event.changes.join(', ')}`);
            });
        }
        
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: (passedTests / totalTests) * 100,
            results: this.testResults
        };
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.EngagementStateVerifier = EngagementStateVerifier;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngagementStateVerifier;
}

// Auto-run if loaded directly in browser
if (typeof window !== 'undefined' && window.AppState && window.DataService) {
    const verifier = new EngagementStateVerifier();
    verifier.runAllTests();
}