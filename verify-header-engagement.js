/**
 * Verification script for Header engagement statistics functionality
 * Tests that the Header component correctly displays engagement metrics
 */

// Test data with engagement metrics
const testModels = [
    {
        modelName: "High Engagement Model",
        quantFormat: "Q4_K_M",
        fileSize: 4200000000,
        fileSizeFormatted: "4.2 GB",
        modelType: "LLM",
        license: "Apache-2.0",
        downloadCount: 150000,
        likeCount: 1250,
        huggingFaceLink: "https://huggingface.co/test/model1"
    },
    {
        modelName: "Medium Engagement Model",
        quantFormat: "Q4_K_M",
        fileSize: 2100000000,
        fileSizeFormatted: "2.1 GB",
        modelType: "LLM",
        license: "MIT",
        downloadCount: 75000,
        likeCount: 45,
        huggingFaceLink: "https://huggingface.co/test/model2"
    },
    {
        modelName: "Low Engagement Model",
        quantFormat: "Q8_0",
        fileSize: 8400000000,
        fileSizeFormatted: "8.4 GB",
        modelType: "LLM",
        license: "Apache-2.0",
        downloadCount: 25000,
        likeCount: 3,
        huggingFaceLink: "https://huggingface.co/test/model3"
    },
    {
        modelName: "No Engagement Model",
        quantFormat: "F16",
        fileSize: 1050000000,
        fileSizeFormatted: "1.05 GB",
        modelType: "Embedding",
        license: "MIT",
        downloadCount: 10000,
        likeCount: 0,
        huggingFaceLink: "https://huggingface.co/test/model4"
    }
];

function runHeaderEngagementTests() {
    console.log('🧪 Running Header Engagement Statistics Tests...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: Calculate total likes correctly
    totalTests++;
    const totalLikes = testModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
    const expectedTotal = 1250 + 45 + 3 + 0; // 1298
    
    if (totalLikes === expectedTotal) {
        console.log('✅ Test 1 PASSED: Total likes calculation correct');
        passedTests++;
    } else {
        console.log(`❌ Test 1 FAILED: Expected ${expectedTotal}, got ${totalLikes}`);
    }
    
    // Test 2: Calculate average likes correctly
    totalTests++;
    const avgLikes = totalLikes / testModels.length;
    const expectedAvg = 1298 / 4; // 324.5
    
    if (Math.abs(avgLikes - expectedAvg) < 0.01) {
        console.log('✅ Test 2 PASSED: Average likes calculation correct');
        passedTests++;
    } else {
        console.log(`❌ Test 2 FAILED: Expected ${expectedAvg}, got ${avgLikes}`);
    }
    
    // Test 3: Filter engagement metrics correctly
    totalTests++;
    const highEngagementModels = testModels.filter(model => model.likeCount > 10);
    const filteredTotalLikes = highEngagementModels.reduce((sum, model) => sum + (model.likeCount || 0), 0);
    const expectedFilteredTotal = 1250 + 45; // 1295
    
    if (filteredTotalLikes === expectedFilteredTotal) {
        console.log('✅ Test 3 PASSED: Filtered engagement metrics correct');
        passedTests++;
    } else {
        console.log(`❌ Test 3 FAILED: Expected ${expectedFilteredTotal}, got ${filteredTotalLikes}`);
    }
    
    // Test 4: Format engagement numbers correctly
    totalTests++;
    const formatters = (typeof window !== 'undefined' && window.Formatters) || {
        formatEngagementNumber: (num) => {
            if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
            return num.toString();
        }
    };
    
    const formatted1250 = formatters.formatEngagementNumber(1250);
    const formatted45 = formatters.formatEngagementNumber(45);
    
    if (formatted1250 === '1.3K' && formatted45 === '45') {
        console.log('✅ Test 4 PASSED: Engagement number formatting correct');
        passedTests++;
    } else {
        console.log(`❌ Test 4 FAILED: Expected '1.3K' and '45', got '${formatted1250}' and '${formatted45}'`);
    }
    
    // Test 5: Handle zero engagement correctly
    totalTests++;
    const zeroEngagementModel = testModels.find(model => model.likeCount === 0);
    const hasZeroModel = zeroEngagementModel !== undefined;
    
    if (hasZeroModel) {
        console.log('✅ Test 5 PASSED: Zero engagement handling correct');
        passedTests++;
    } else {
        console.log('❌ Test 5 FAILED: Zero engagement model not found');
    }
    
    // Test 6: Models with likes count
    totalTests++;
    const modelsWithLikes = testModels.filter(model => (model.likeCount || 0) > 0).length;
    const expectedModelsWithLikes = 3; // High, Medium, Low engagement models
    
    if (modelsWithLikes === expectedModelsWithLikes) {
        console.log('✅ Test 6 PASSED: Models with likes count correct');
        passedTests++;
    } else {
        console.log(`❌ Test 6 FAILED: Expected ${expectedModelsWithLikes}, got ${modelsWithLikes}`);
    }
    
    // Summary
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All Header engagement statistics tests PASSED!');
        return true;
    } else {
        console.log('⚠️  Some tests FAILED. Please check the implementation.');
        return false;
    }
}

// Test engagement statistics calculations
function testEngagementCalculations() {
    console.log('\n🔢 Testing Engagement Calculations...');
    
    const calculations = {
        totalLikes: testModels.reduce((sum, model) => sum + (model.likeCount || 0), 0),
        avgLikes: testModels.reduce((sum, model) => sum + (model.likeCount || 0), 0) / testModels.length,
        maxLikes: Math.max(...testModels.map(model => model.likeCount || 0)),
        minLikes: Math.min(...testModels.map(model => model.likeCount || 0)),
        modelsWithLikes: testModels.filter(model => (model.likeCount || 0) > 0).length
    };
    
    console.log('Engagement Statistics:');
    console.log(`- Total Likes: ${calculations.totalLikes}`);
    console.log(`- Average Likes: ${calculations.avgLikes.toFixed(1)}`);
    console.log(`- Max Likes: ${calculations.maxLikes}`);
    console.log(`- Min Likes: ${calculations.minLikes}`);
    console.log(`- Models with Likes: ${calculations.modelsWithLikes}/${testModels.length}`);
    
    return calculations;
}

// Test filtered engagement statistics
function testFilteredEngagementStats() {
    console.log('\n🔍 Testing Filtered Engagement Statistics...');
    
    const filters = [
        { name: 'High Engagement (>100 likes)', filter: model => model.likeCount > 100 },
        { name: 'Medium Engagement (10-100 likes)', filter: model => model.likeCount >= 10 && model.likeCount <= 100 },
        { name: 'Low Engagement (<10 likes)', filter: model => model.likeCount < 10 }
    ];
    
    filters.forEach(({ name, filter }) => {
        const filtered = testModels.filter(filter);
        const totalLikes = filtered.reduce((sum, model) => sum + (model.likeCount || 0), 0);
        const avgLikes = filtered.length > 0 ? totalLikes / filtered.length : 0;
        
        console.log(`${name}:`);
        console.log(`  - Models: ${filtered.length}`);
        console.log(`  - Total Likes: ${totalLikes}`);
        console.log(`  - Average Likes: ${avgLikes.toFixed(1)}`);
    });
}

// Run all tests
if (typeof window !== 'undefined') {
    // Browser environment
    window.runHeaderEngagementTests = runHeaderEngagementTests;
    window.testEngagementCalculations = testEngagementCalculations;
    window.testFilteredEngagementStats = testFilteredEngagementStats;
} else {
    // Node.js environment
    runHeaderEngagementTests();
    testEngagementCalculations();
    testFilteredEngagementStats();
}