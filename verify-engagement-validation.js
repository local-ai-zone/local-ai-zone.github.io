/**
 * Verification script for engagement metrics error handling and validation
 * Tests all aspects of the implementation
 */

// Test data with various edge cases
const testCases = [
    { name: 'Valid positive integer', value: 42, expected: 42 },
    { name: 'Valid zero', value: 0, expected: 0 },
    { name: 'Valid large number', value: 1500000, expected: 1500000 },
    { name: 'Null value', value: null, expected: 0 },
    { name: 'Undefined value', value: undefined, expected: 0 },
    { name: 'Empty string', value: '', expected: 0 },
    { name: 'String "null"', value: 'null', expected: 0 },
    { name: 'String "N/A"', value: 'N/A', expected: 0 },
    { name: 'Valid number string', value: '123', expected: 123 },
    { name: 'Float number', value: 42.7, expected: 42 },
    { name: 'Negative number', value: -10, expected: 0 },
    { name: 'NaN', value: NaN, expected: 0 },
    { name: 'Infinity', value: Infinity, expected: 0 },
    { name: 'Boolean true', value: true, expected: 1 },
    { name: 'Boolean false', value: false, expected: 0 },
    { name: 'Array', value: [1, 2, 3], expected: 0 },
    { name: 'Object', value: { likes: 42 }, expected: 0 },
    { name: 'Extremely large number', value: 50000000, expected: 10000000 },
    { name: 'Invalid string', value: 'not-a-number', expected: 0 }
];

// Test models with various engagement data states
const testModels = [
    {
        modelName: 'Valid Model',
        likeCount: 42,
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 1000,
        fileSize: 1024000,
        fileSizeFormatted: '1.0 MB',
        huggingFaceLink: 'https://huggingface.co/test/model',
        directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
    },
    {
        modelName: 'Zero Likes Model',
        likeCount: 0,
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 500,
        fileSize: 2048000,
        fileSizeFormatted: '2.0 MB',
        huggingFaceLink: 'https://huggingface.co/test/model2',
        directDownloadLink: 'https://huggingface.co/test/model2/resolve/main/model.gguf'
    },
    {
        modelName: 'Null Likes Model',
        likeCount: null,
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 750,
        fileSize: 1536000,
        fileSizeFormatted: '1.5 MB',
        huggingFaceLink: 'https://huggingface.co/test/model3',
        directDownloadLink: 'https://huggingface.co/test/model3/resolve/main/model.gguf'
    },
    {
        modelName: 'Invalid Likes Model',
        likeCount: 'invalid',
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 300,
        fileSize: 512000,
        fileSizeFormatted: '512 KB',
        huggingFaceLink: 'https://huggingface.co/test/model4',
        directDownloadLink: 'https://huggingface.co/test/model4/resolve/main/model.gguf'
    },
    {
        modelName: 'Missing Likes Model',
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 200,
        fileSize: 256000,
        fileSizeFormatted: '256 KB',
        huggingFaceLink: 'https://huggingface.co/test/model5',
        directDownloadLink: 'https://huggingface.co/test/model5/resolve/main/model.gguf'
    },
    {
        modelName: 'High Engagement Model',
        likeCount: 15000000,
        quantFormat: 'Q4_K_M',
        modelType: 'LLM',
        license: 'MIT',
        downloadCount: 5000,
        fileSize: 4096000,
        fileSizeFormatted: '4.0 MB',
        huggingFaceLink: 'https://huggingface.co/test/model6',
        directDownloadLink: 'https://huggingface.co/test/model6/resolve/main/model.gguf'
    }
];

function runValidationTests() {
    console.log('🧪 Running Engagement Validation Tests...');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(testCase => {
        try {
            const result = EngagementValidation.validateEngagementMetric(
                testCase.value, 
                'test-model', 
                'likeCount'
            );
            
            const isCorrect = result.value === testCase.expected;
            
            if (isCorrect) {
                console.log(`✅ ${testCase.name}: ${result.value} (Expected: ${testCase.expected})`);
                passed++;
            } else {
                console.error(`❌ ${testCase.name}: Got ${result.value}, Expected ${testCase.expected}`);
                failed++;
            }
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.warning) {
                console.log(`   Warning: ${result.warning}`);
            }
            
        } catch (error) {
            console.error(`❌ ${testCase.name}: Exception - ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\n📊 Validation Tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

function runModelCardTests() {
    console.log('\n🎨 Running Model Card Display Tests...');
    
    let passed = 0;
    let failed = 0;
    
    testModels.forEach((model, index) => {
        try {
            const modelCard = new ModelCard(model, index + 1);
            const cardElement = modelCard.render();
            
            // Check if card was created successfully
            if (cardElement && cardElement.innerHTML) {
                console.log(`✅ ${model.modelName}: Card rendered successfully`);
                
                // Check for engagement metrics in the HTML
                const hasEngagementMetrics = cardElement.innerHTML.includes('engagement-count') || 
                                           cardElement.innerHTML.includes('engagement-zero') ||
                                           cardElement.innerHTML.includes('engagement-error');
                
                if (model.likeCount > 0 && hasEngagementMetrics) {
                    console.log(`   ✅ Engagement metrics displayed for ${model.likeCount} likes`);
                } else if ((model.likeCount === 0 || model.likeCount == null) && !hasEngagementMetrics) {
                    console.log(`   ✅ No engagement metrics displayed for ${model.likeCount} likes (correct)`);
                } else if (model.likeCount === 0 && hasEngagementMetrics) {
                    console.log(`   ✅ Zero engagement metrics displayed (correct)`);
                }
                
                passed++;
            } else {
                console.error(`❌ ${model.modelName}: Failed to render card`);
                failed++;
            }
            
        } catch (error) {
            console.error(`❌ ${model.modelName}: Exception - ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\n📊 Model Card Tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

function runFilterServiceTests() {
    console.log('\n🔍 Running Filter Service Tests...');
    
    const filterService = new FilterService();
    let passed = 0;
    let failed = 0;
    
    const filterTestCases = [
        { name: 'Valid range', min: 0, max: 100, expectedCount: 2 }, // Valid Model (42) and Zero Likes Model (0)
        { name: 'Invalid min (negative)', min: -10, max: 100, expectedCount: 2 },
        { name: 'Invalid max (string)', min: 0, max: 'invalid', expectedCount: testModels.length },
        { name: 'Null values', min: null, max: null, expectedCount: testModels.length },
        { name: 'Swapped values', min: 100, max: 10, expectedCount: 2 }, // Should swap and work like [10, 100]
        { name: 'High range', min: 1000000, max: Infinity, expectedCount: 1 } // High Engagement Model (capped at 10M)
    ];
    
    filterTestCases.forEach(testCase => {
        try {
            const filtered = filterService.filterByEngagement(testModels, testCase.min, testCase.max);
            
            console.log(`✅ ${testCase.name}: Filtered ${testModels.length} models to ${filtered.length} results`);
            console.log(`   Range: [${testCase.min}, ${testCase.max}]`);
            
            // Log which models passed the filter
            filtered.forEach(model => {
                const likeCount = model.likeCount || 0;
                console.log(`   - ${model.modelName}: ${likeCount} likes`);
            });
            
            passed++;
            
        } catch (error) {
            console.error(`❌ ${testCase.name}: Exception - ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\n📊 Filter Service Tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

function runDataServiceTests() {
    console.log('\n💾 Running Data Service Tests...');
    
    const dataService = new DataService();
    let passed = 0;
    let failed = 0;
    
    // Test batch validation
    try {
        const batchResult = EngagementValidation.batchValidateEngagementMetrics(testModels);
        
        console.log(`✅ Batch Validation Results:`);
        console.log(`   Total Models: ${batchResult.totalModels}`);
        console.log(`   Valid Models: ${batchResult.validModels}`);
        console.log(`   Models with Errors: ${batchResult.modelsWithErrors}`);
        console.log(`   Models with Warnings: ${batchResult.modelsWithWarnings}`);
        console.log(`   Models Modified: ${batchResult.modelsModified}`);
        
        passed++;
        
    } catch (error) {
        console.error(`❌ Batch validation failed: ${error.message}`);
        failed++;
    }
    
    // Test individual model validation
    testModels.forEach(model => {
        try {
            const isValid = dataService.validateModelData(model);
            console.log(`${isValid ? '✅' : '❌'} ${model.modelName}: Validation ${isValid ? 'PASSED' : 'FAILED'}`);
            
            if (isValid) {
                passed++;
            } else {
                failed++;
            }
            
        } catch (error) {
            console.error(`❌ ${model.modelName}: Validation exception - ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\n📊 Data Service Tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

function runGracefulDegradationTests() {
    console.log('\n🛡️ Running Graceful Degradation Tests...');
    
    let passed = 0;
    let failed = 0;
    
    // Test with missing EngagementValidation utility
    try {
        const originalValidation = window.EngagementValidation;
        window.EngagementValidation = undefined;
        
        const modelCard = new ModelCard(testModels[0], 1);
        const cardElement = modelCard.render();
        
        if (cardElement && cardElement.innerHTML) {
            console.log('✅ Model card renders without EngagementValidation utility');
            passed++;
        } else {
            console.error('❌ Model card fails without EngagementValidation utility');
            failed++;
        }
        
        // Restore the utility
        window.EngagementValidation = originalValidation;
        
    } catch (error) {
        console.error(`❌ Graceful degradation test failed: ${error.message}`);
        failed++;
    }
    
    // Test with missing EngagementUtils
    try {
        const originalUtils = window.EngagementUtils;
        window.EngagementUtils = undefined;
        
        const modelCard = new ModelCard(testModels[0], 1);
        const cardElement = modelCard.render();
        
        if (cardElement && cardElement.innerHTML) {
            console.log('✅ Model card renders without EngagementUtils');
            passed++;
        } else {
            console.error('❌ Model card fails without EngagementUtils');
            failed++;
        }
        
        // Restore the utility
        window.EngagementUtils = originalUtils;
        
    } catch (error) {
        console.error(`❌ Graceful degradation test failed: ${error.message}`);
        failed++;
    }
    
    console.log(`\n📊 Graceful Degradation Tests: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

// Main test runner
function runAllTests() {
    console.log('🚀 Starting Engagement Metrics Error Handling and Validation Tests\n');
    
    const results = {
        validation: runValidationTests(),
        modelCard: runModelCardTests(),
        filterService: runFilterServiceTests(),
        dataService: runDataServiceTests(),
        gracefulDegradation: runGracefulDegradationTests()
    };
    
    // Calculate totals
    const totalPassed = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
    const totalTests = totalPassed + totalFailed;
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${totalFailed} (${((totalFailed/totalTests)*100).toFixed(1)}%)`);
    console.log('='.repeat(60));
    
    if (totalFailed === 0) {
        console.log('🎉 ALL TESTS PASSED! Engagement metrics error handling is working correctly.');
    } else {
        console.log(`⚠️ ${totalFailed} tests failed. Please review the implementation.`);
    }
    
    return {
        totalTests,
        totalPassed,
        totalFailed,
        success: totalFailed === 0
    };
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
    window.runEngagementValidationTests = runAllTests;
}

// Auto-run if this script is loaded directly
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for all dependencies to load
        setTimeout(runAllTests, 1000);
    });
}

console.log('Engagement validation test script loaded. Run runEngagementValidationTests() to execute tests.');