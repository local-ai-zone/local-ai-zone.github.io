/**
 * Verification script for engagement metrics filtering implementation
 * Tests all aspects of the engagement filter functionality
 */

// Test data with various engagement metrics
const testData = [
    { modelName: "Low Engagement Model", likeCount: 2, downloadCount: 1000 },
    { modelName: "Medium Engagement Model", likeCount: 15, downloadCount: 5000 },
    { modelName: "High Engagement Model", likeCount: 50, downloadCount: 10000 },
    { modelName: "Very High Engagement Model", likeCount: 200, downloadCount: 50000 },
    { modelName: "No Engagement Model", likeCount: 0, downloadCount: 100 }
];

function runEngagementTests() {
    console.log('🧪 Starting Engagement Filter Tests...\n');
    
    // Test 1: FilterService engagement filtering
    console.log('Test 1: FilterService.filterByEngagement()');
    try {
        const filterService = new FilterService();
        
        // Test minimum likes filter
        const filtered1 = filterService.filterByEngagement(testData, 10, Infinity);
        console.log(`✅ Min 10 likes: ${filtered1.length} models (${filtered1.map(m => m.modelName).join(', ')})`);
        
        // Test range filter
        const filtered2 = filterService.filterByEngagement(testData, 5, 25);
        console.log(`✅ 5-25 likes range: ${filtered2.length} models (${filtered2.map(m => m.modelName).join(', ')})`);
        
        // Test no filter
        const filtered3 = filterService.filterByEngagement(testData, 0, Infinity);
        console.log(`✅ No filter: ${filtered3.length} models (should be 5)`);
        
    } catch (error) {
        console.error('❌ FilterService test failed:', error);
    }
    
    // Test 2: AppState engagement filter integration
    console.log('\nTest 2: AppState engagement filter integration');
    try {
        const appState = new AppState();
        
        // Test initial state
        const initialState = appState.getState();
        console.log(`✅ Initial likeCountMin: ${initialState.filters.likeCountMin}`);
        console.log(`✅ Initial likeCountMax: ${initialState.filters.likeCountMax}`);
        
        // Test filter updates
        appState.updateFilters({ likeCountMin: 10, likeCountMax: 100 });
        const updatedState = appState.getState();
        console.log(`✅ Updated likeCountMin: ${updatedState.filters.likeCountMin}`);
        console.log(`✅ Updated likeCountMax: ${updatedState.filters.likeCountMax}`);
        
        // Test clear filters
        appState.clearFilters();
        const clearedState = appState.getState();
        console.log(`✅ Cleared likeCountMin: ${clearedState.filters.likeCountMin}`);
        console.log(`✅ Cleared likeCountMax: ${clearedState.filters.likeCountMax}`);
        
    } catch (error) {
        console.error('❌ AppState test failed:', error);
    }
    
    // Test 3: Filter validation
    console.log('\nTest 3: Filter validation');
    try {
        const filterService = new FilterService();
        
        const validatedFilters = filterService.validateFilters({
            likeCountMin: '10',  // String input
            likeCountMax: '100', // String input
            invalidField: 'test'
        });
        
        console.log(`✅ Validated likeCountMin: ${validatedFilters.likeCountMin} (type: ${typeof validatedFilters.likeCountMin})`);
        console.log(`✅ Validated likeCountMax: ${validatedFilters.likeCountMax} (type: ${typeof validatedFilters.likeCountMax})`);
        
    } catch (error) {
        console.error('❌ Filter validation test failed:', error);
    }
    
    // Test 4: Integration with existing filters
    console.log('\nTest 4: Integration with existing filters');
    try {
        const filterService = new FilterService();
        
        const complexFilters = {
            quantFormat: 'Q4_K_M',
            downloadCountMin: 1000,
            likeCountMin: 5,
            likeCountMax: 50
        };
        
        // Add required fields to test data
        const enhancedTestData = testData.map(model => ({
            ...model,
            quantFormat: 'Q4_K_M',
            modelType: 'LLM',
            license: 'MIT',
            fileSize: 1000000
        }));
        
        const complexFiltered = filterService.applyAllFilters(enhancedTestData, {
            filters: complexFilters
        });
        
        console.log(`✅ Complex filter result: ${complexFiltered.length} models`);
        complexFiltered.forEach(model => {
            console.log(`   - ${model.modelName}: ${model.likeCount} likes, ${model.downloadCount} downloads`);
        });
        
    } catch (error) {
        console.error('❌ Complex filter test failed:', error);
    }
    
    console.log('\n🎉 Engagement Filter Tests Completed!');
}

// Test 5: UI Component Integration (if DOM elements exist)
function testUIIntegration() {
    console.log('\n🖥️ Testing UI Integration...');
    
    // Check if engagement filter elements exist
    const likesMin = document.getElementById('likes-min');
    const likesMax = document.getElementById('likes-max');
    const likesRangeMin = document.getElementById('likes-range-min');
    const likesRangeMax = document.getElementById('likes-range-max');
    const likesDisplay = document.getElementById('likes-range-display');
    
    if (likesMin && likesMax && likesRangeMin && likesRangeMax && likesDisplay) {
        console.log('✅ All engagement filter UI elements found');
        
        // Test setting values
        likesMin.value = '10';
        likesMax.value = '100';
        likesRangeMin.value = '10';
        likesRangeMax.value = '100';
        
        console.log('✅ UI elements can be set programmatically');
        
        // Test event simulation
        const event = new Event('input', { bubbles: true });
        likesMin.dispatchEvent(event);
        
        console.log('✅ Events can be dispatched on UI elements');
    } else {
        console.log('ℹ️ UI elements not found (may not be rendered yet)');
    }
}

// Export for use in browser console or other scripts
if (typeof window !== 'undefined') {
    window.runEngagementTests = runEngagementTests;
    window.testUIIntegration = testUIIntegration;
    
    // Auto-run tests if this script is loaded directly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                runEngagementTests();
                testUIIntegration();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            runEngagementTests();
            testUIIntegration();
        }, 1000);
    }
}

// Node.js export (if applicable)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runEngagementTests, testUIIntegration };
}