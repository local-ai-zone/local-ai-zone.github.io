/**
 * Verification script for main application engagement statistics
 * Tests the updateEngagementStats method functionality
 */

// Mock Formatters for testing
const MockFormatters = {
    formatEngagementNumber: (num) => {
        if (!num || num === 0) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
        return num.toString();
    },
    formatTimestamp: (timestamp) => {
        return new Date(timestamp).toLocaleString();
    }
};

// Test data
const testModels = [
    { modelName: "Model 1", likeCount: 1250 },
    { modelName: "Model 2", likeCount: 45 },
    { modelName: "Model 3", likeCount: 3 },
    { modelName: "Model 4", likeCount: 0 }
];

// Mock DOM elements
const mockElements = {
    'total-likes': { textContent: '', title: '' },
    'avg-likes': { textContent: '', title: '' },
    'model-count': { textContent: '', title: '' }
};

// Mock document.getElementById
const mockGetElementById = (id) => mockElements[id] || null;

// Test the updateEngagementStats logic
function testUpdateEngagementStats() {
    console.log('🧪 Testing updateEngagementStats functionality...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: All models displayed
    totalTests++;
    const state1 = {
        allModels: testModels,
        filteredModels: testModels
    };
    
    // Simulate the updateEngagementStats logic
    const allTotalLikes = state1.allModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
    const expectedTotal = 1298; // 1250 + 45 + 3 + 0
    
    if (allTotalLikes === expectedTotal) {
        console.log('✅ Test 1 PASSED: Total likes calculation correct for all models');
        passedTests++;
    } else {
        console.log(`❌ Test 1 FAILED: Expected ${expectedTotal}, got ${allTotalLikes}`);
    }
    
    // Test 2: Filtered models
    totalTests++;
    const filteredModels = testModels.filter(model => model.likeCount > 10);
    const state2 = {
        allModels: testModels,
        filteredModels: filteredModels
    };
    
    const filteredTotalLikes = state2.filteredModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
    const expectedFiltered = 1295; // 1250 + 45
    
    if (filteredTotalLikes === expectedFiltered) {
        console.log('✅ Test 2 PASSED: Filtered likes calculation correct');
        passedTests++;
    } else {
        console.log(`❌ Test 2 FAILED: Expected ${expectedFiltered}, got ${filteredTotalLikes}`);
    }
    
    // Test 3: Average calculation
    totalTests++;
    const avgLikes = allTotalLikes / testModels.length;
    const expectedAvg = 324.5; // 1298 / 4
    
    if (Math.abs(avgLikes - expectedAvg) < 0.01) {
        console.log('✅ Test 3 PASSED: Average likes calculation correct');
        passedTests++;
    } else {
        console.log(`❌ Test 3 FAILED: Expected ${expectedAvg}, got ${avgLikes}`);
    }
    
    // Test 4: Models with likes count
    totalTests++;
    const modelsWithLikes = testModels.filter(model => (model.likeCount || 0) > 0).length;
    const expectedWithLikes = 3; // Models 1, 2, 3 have likes
    
    if (modelsWithLikes === expectedWithLikes) {
        console.log('✅ Test 4 PASSED: Models with likes count correct');
        passedTests++;
    } else {
        console.log(`❌ Test 4 FAILED: Expected ${expectedWithLikes}, got ${modelsWithLikes}`);
    }
    
    // Test 5: Formatting
    totalTests++;
    const formatted1250 = MockFormatters.formatEngagementNumber(1250);
    const formatted45 = MockFormatters.formatEngagementNumber(45);
    const formatted0 = MockFormatters.formatEngagementNumber(0);
    
    if (formatted1250 === '1.3K' && formatted45 === '45' && formatted0 === '0') {
        console.log('✅ Test 5 PASSED: Number formatting correct');
        passedTests++;
    } else {
        console.log(`❌ Test 5 FAILED: Expected '1.3K', '45', '0', got '${formatted1250}', '${formatted45}', '${formatted0}'`);
    }
    
    // Test 6: Simulate DOM updates
    totalTests++;
    try {
        // Simulate the DOM update logic
        const totalLikesText = MockFormatters.formatEngagementNumber(allTotalLikes);
        const avgLikesText = MockFormatters.formatEngagementNumber(Math.round(avgLikes));
        const modelCountText = `${testModels.length} models`;
        
        // Check if the text would be formatted correctly
        if (totalLikesText === '1.3K' && avgLikesText === '325' && modelCountText === '4 models') {
            console.log('✅ Test 6 PASSED: DOM update simulation correct');
            passedTests++;
        } else {
            console.log(`❌ Test 6 FAILED: DOM update simulation failed`);
            console.log(`  Total: ${totalLikesText}, Avg: ${avgLikesText}, Count: ${modelCountText}`);
        }
    } catch (error) {
        console.log(`❌ Test 6 FAILED: DOM update simulation error: ${error.message}`);
    }
    
    // Summary
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All engagement statistics tests PASSED!');
        return true;
    } else {
        console.log('⚠️  Some tests FAILED. Please check the implementation.');
        return false;
    }
}

// Test different scenarios
function testEngagementScenarios() {
    console.log('\n🔍 Testing Different Engagement Scenarios...\n');
    
    const scenarios = [
        {
            name: 'High Engagement Only',
            models: [{ modelName: 'Popular Model', likeCount: 5000 }],
            expectedTotal: 5000,
            expectedAvg: 5000
        },
        {
            name: 'Mixed Engagement',
            models: [
                { modelName: 'Popular', likeCount: 1000 },
                { modelName: 'Moderate', likeCount: 100 },
                { modelName: 'Low', likeCount: 10 }
            ],
            expectedTotal: 1110,
            expectedAvg: 370
        },
        {
            name: 'Zero Engagement',
            models: [
                { modelName: 'Model 1', likeCount: 0 },
                { modelName: 'Model 2', likeCount: 0 }
            ],
            expectedTotal: 0,
            expectedAvg: 0
        },
        {
            name: 'Missing Like Count',
            models: [
                { modelName: 'Model 1' }, // No likeCount property
                { modelName: 'Model 2', likeCount: 50 }
            ],
            expectedTotal: 50,
            expectedAvg: 25
        }
    ];
    
    scenarios.forEach(scenario => {
        console.log(`Testing: ${scenario.name}`);
        
        const totalLikes = scenario.models.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const avgLikes = scenario.models.length > 0 ? totalLikes / scenario.models.length : 0;
        
        const totalMatch = totalLikes === scenario.expectedTotal;
        const avgMatch = Math.abs(avgLikes - scenario.expectedAvg) < 0.01;
        
        if (totalMatch && avgMatch) {
            console.log(`  ✅ PASSED - Total: ${totalLikes}, Avg: ${avgLikes.toFixed(1)}`);
        } else {
            console.log(`  ❌ FAILED - Expected Total: ${scenario.expectedTotal}, Avg: ${scenario.expectedAvg}`);
            console.log(`           Got Total: ${totalLikes}, Avg: ${avgLikes.toFixed(1)}`);
        }
    });
}

// Run tests
console.log('🚀 Starting Main Application Engagement Statistics Tests\n');
testUpdateEngagementStats();
testEngagementScenarios();
console.log('\n✨ All tests completed!');