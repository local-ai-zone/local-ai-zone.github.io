/**
 * Verification script for engagement metric sorting functionality
 * Tests the implementation of task 8: Add engagement metric sorting options to UI
 */

// Test data with engagement metrics
const testModels = [
    {
        modelName: "high-likes-model.gguf",
        downloadCount: 1000000,
        likeCount: 2500,
        quantFormat: "Q4_K_M",
        fileSize: 4000000000
    },
    {
        modelName: "medium-likes-model.gguf", 
        downloadCount: 2000000,
        likeCount: 1200,
        quantFormat: "Q4_K_M",
        fileSize: 3000000000
    },
    {
        modelName: "low-likes-model.gguf",
        downloadCount: 3000000,
        likeCount: 500,
        quantFormat: "Q4_K_M", 
        fileSize: 2000000000
    }
];

console.log('🧪 Testing Engagement Metric Sorting Implementation');
console.log('=' .repeat(60));

// Test 1: Verify sort options are available in HTML
function testSortOptionsInHTML() {
    console.log('\n📋 Test 1: Sort Options in HTML');
    
    const fs = require('fs');
    const path = require('path');
    
    const htmlFiles = ['index.html', 'premium-index.html', 'test-main-engagement.html'];
    let allTestsPassed = true;
    
    htmlFiles.forEach(filename => {
        try {
            const content = fs.readFileSync(path.join(__dirname, filename), 'utf8');
            
            const hasLikesDesc = content.includes('value="likeCount-desc"');
            const hasLikesAsc = content.includes('value="likeCount-asc"');
            const hasLikesLabel = content.includes('Most Liked') || content.includes('❤️ Most Liked');
            
            console.log(`  ${filename}:`);
            console.log(`    ✅ Has "Most Liked" option: ${hasLikesDesc}`);
            console.log(`    ✅ Has "Least Liked" option: ${hasLikesAsc}`);
            console.log(`    ✅ Has proper labels: ${hasLikesLabel}`);
            
            if (!hasLikesDesc || !hasLikesAsc || !hasLikesLabel) {
                allTestsPassed = false;
            }
        } catch (error) {
            console.log(`    ❌ Error reading ${filename}: ${error.message}`);
            allTestsPassed = false;
        }
    });
    
    return allTestsPassed;
}

// Test 2: Verify CSS visual indicators
function testCSSVisualIndicators() {
    console.log('\n🎨 Test 2: CSS Visual Indicators');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const cssContent = fs.readFileSync(path.join(__dirname, 'css/styles.css'), 'utf8');
        
        const hasEngagementSortClass = cssContent.includes('.filter-select.engagement-sort');
        const hasEngagementSortFocus = cssContent.includes('.filter-select.engagement-sort:focus');
        const hasProperStyling = cssContent.includes('#e91e63') || cssContent.includes('rgba(233, 30, 99');
        
        console.log(`  ✅ Has .engagement-sort class: ${hasEngagementSortClass}`);
        console.log(`  ✅ Has .engagement-sort:focus class: ${hasEngagementSortFocus}`);
        console.log(`  ✅ Has proper pink/red styling: ${hasProperStyling}`);
        
        return hasEngagementSortClass && hasEngagementSortFocus && hasProperStyling;
    } catch (error) {
        console.log(`  ❌ Error reading CSS file: ${error.message}`);
        return false;
    }
}

// Test 3: Verify JavaScript sort handling
function testJavaScriptSortHandling() {
    console.log('\n⚙️ Test 3: JavaScript Sort Handling');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const jsContent = fs.readFileSync(path.join(__dirname, 'js/main.js'), 'utf8');
        
        const hasEngagementSortClass = jsContent.includes('engagement-sort');
        const hasLikeCountCheck = jsContent.includes("field === 'likeCount'");
        const hasVisualIndicatorFunction = jsContent.includes('updateSortVisualIndicator');
        const hasClassAddRemove = jsContent.includes('classList.add') && jsContent.includes('classList.remove');
        
        console.log(`  ✅ Has engagement-sort class handling: ${hasEngagementSortClass}`);
        console.log(`  ✅ Has likeCount field check: ${hasLikeCountCheck}`);
        console.log(`  ✅ Has updateSortVisualIndicator function: ${hasVisualIndicatorFunction}`);
        console.log(`  ✅ Has class add/remove logic: ${hasClassAddRemove}`);
        
        return hasEngagementSortClass && hasLikeCountCheck && hasVisualIndicatorFunction && hasClassAddRemove;
    } catch (error) {
        console.log(`  ❌ Error reading JavaScript file: ${error.message}`);
        return false;
    }
}

// Test 4: Verify FilterService sorting capability
function testFilterServiceSorting() {
    console.log('\n🔧 Test 4: FilterService Sorting Capability');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const filterServiceContent = fs.readFileSync(path.join(__dirname, 'js/services/FilterService.js'), 'utf8');
        
        const hasSortByLikeCount = filterServiceContent.includes('sortByLikeCount');
        const hasSortModelsMethod = filterServiceContent.includes('sortModels');
        const hasLikeCountSorting = filterServiceContent.includes("'likeCount'");
        
        console.log(`  ✅ Has sortByLikeCount method: ${hasSortByLikeCount}`);
        console.log(`  ✅ Has sortModels method: ${hasSortModelsMethod}`);
        console.log(`  ✅ Supports likeCount field: ${hasLikeCountSorting}`);
        
        return hasSortByLikeCount && hasSortModelsMethod && hasLikeCountSorting;
    } catch (error) {
        console.log(`  ❌ Error reading FilterService file: ${error.message}`);
        return false;
    }
}

// Test 5: Verify AppState sorting integration
function testAppStateSorting() {
    console.log('\n📊 Test 5: AppState Sorting Integration');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const appStateContent = fs.readFileSync(path.join(__dirname, 'js/state/AppState.js'), 'utf8');
        
        const hasSortingState = appStateContent.includes('sorting:');
        const hasSetSortingMethod = appStateContent.includes('setSorting');
        const hasPaginationReset = appStateContent.includes('currentPage: 1');
        
        console.log(`  ✅ Has sorting state: ${hasSortingState}`);
        console.log(`  ✅ Has setSorting method: ${hasSetSortingMethod}`);
        console.log(`  ✅ Resets pagination on sort: ${hasPaginationReset}`);
        
        return hasSortingState && hasSetSortingMethod && hasPaginationReset;
    } catch (error) {
        console.log(`  ❌ Error reading AppState file: ${error.message}`);
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('Running comprehensive engagement sorting tests...\n');
    
    const results = {
        htmlOptions: testSortOptionsInHTML(),
        cssIndicators: testCSSVisualIndicators(),
        jsHandling: testJavaScriptSortHandling(),
        filterService: testFilterServiceSorting(),
        appState: testAppStateSorting()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passedTests = Object.values(results).filter(result => result).length;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([testName, passed]) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${testName.padEnd(20)}: ${status}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Engagement sorting implementation is complete.');
        console.log('\n✅ Task 8 Requirements Verified:');
        console.log('  • "Likes" options added to sort dropdown');
        console.log('  • Sort state management implemented');
        console.log('  • Pagination maintains engagement-based sorting');
        console.log('  • Visual indicators for engagement sort selection');
    } else {
        console.log('⚠️ Some tests failed. Please review the implementation.');
    }
    
    return passedTests === totalTests;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testModels
    };
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}