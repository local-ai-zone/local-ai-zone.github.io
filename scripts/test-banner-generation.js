#!/usr/bin/env node

const BannerGenerator = require('./generate-banner.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test utilities for banner generation system
 */
class BannerTester {
    constructor() {
        this.testOutputDir = path.join(__dirname, '..', 'test-outputs');
        this.generator = new BannerGenerator();
    }

    /**
     * Ensure test output directory exists
     */
    async ensureTestDir() {
        try {
            await fs.mkdir(this.testOutputDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    /**
     * Test banner generation with mock data
     */
    async testWithMockData() {
        console.log('🧪 Testing banner generation with mock data...');
        
        try {
            // Create mock model data
            const mockData = [
                {
                    modelName: "Test Model 1",
                    downloadCount: 1000000,
                    likeCount: 500
                },
                {
                    modelName: "Test Model 2", 
                    downloadCount: 2000000,
                    likeCount: 750
                }
            ];

            // Temporarily replace the models file
            const originalPath = path.join(__dirname, '..', 'gguf_models.json');
            const backupPath = path.join(__dirname, '..', 'gguf_models.json.backup');
            
            // Backup original
            await fs.copyFile(originalPath, backupPath);
            
            // Write mock data
            await fs.writeFile(originalPath, JSON.stringify(mockData, null, 2));
            
            // Generate banner
            const result = await this.generator.generateBanner();
            
            // Restore original
            await fs.copyFile(backupPath, originalPath);
            await fs.unlink(backupPath);
            
            if (result.success) {
                console.log('✅ Mock data test passed');
                return true;
            } else {
                console.log('❌ Mock data test failed:', result.error);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Mock data test error:', error.message);
            return false;
        }
    }

    /**
     * Test banner generation with missing data file
     */
    async testWithMissingData() {
        console.log('🧪 Testing banner generation with missing data file...');
        
        try {
            const originalPath = path.join(__dirname, '..', 'gguf_models.json');
            const backupPath = path.join(__dirname, '..', 'gguf_models.json.backup');
            
            // Backup original
            await fs.copyFile(originalPath, backupPath);
            
            // Remove data file
            await fs.unlink(originalPath);
            
            // Generate banner (should use fallback data)
            const result = await this.generator.generateBanner();
            
            // Restore original
            await fs.copyFile(backupPath, originalPath);
            await fs.unlink(backupPath);
            
            if (result.success || result.fallbackUsed) {
                console.log('✅ Missing data test passed (fallback used)');
                return true;
            } else {
                console.log('❌ Missing data test failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Missing data test error:', error.message);
            return false;
        }
    }

    /**
     * Test banner file validation
     */
    async testBannerValidation() {
        console.log('🧪 Testing banner validation...');
        
        try {
            // Generate a banner first
            const result = await this.generator.generateBanner();
            
            if (!result.success) {
                console.log('❌ Could not generate banner for validation test');
                return false;
            }
            
            // Test validation
            await this.generator.validateBanner();
            
            console.log('✅ Banner validation test passed');
            return true;
            
        } catch (error) {
            console.error('❌ Banner validation test error:', error.message);
            return false;
        }
    }

    /**
     * Test social media meta tags
     */
    async testMetaTags() {
        console.log('🧪 Testing social media meta tags...');
        
        try {
            const indexPath = path.join(__dirname, '..', 'index.html');
            const indexContent = await fs.readFile(indexPath, 'utf8');
            
            // Check for required Open Graph tags
            const requiredOGTags = [
                'og:title',
                'og:description', 
                'og:image',
                'og:image:width',
                'og:image:height',
                'og:url',
                'og:type'
            ];
            
            // Check for required Twitter Card tags
            const requiredTwitterTags = [
                'twitter:card',
                'twitter:title',
                'twitter:description',
                'twitter:image'
            ];
            
            let allTagsFound = true;
            
            for (const tag of requiredOGTags) {
                if (!indexContent.includes(`property="${tag}"`)) {
                    console.log(`❌ Missing Open Graph tag: ${tag}`);
                    allTagsFound = false;
                }
            }
            
            for (const tag of requiredTwitterTags) {
                if (!indexContent.includes(`name="${tag}"`)) {
                    console.log(`❌ Missing Twitter Card tag: ${tag}`);
                    allTagsFound = false;
                }
            }
            
            if (allTagsFound) {
                console.log('✅ All required meta tags found');
                return true;
            } else {
                console.log('❌ Some meta tags are missing');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Meta tags test error:', error.message);
            return false;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting banner generation tests...\n');
        
        await this.ensureTestDir();
        
        const tests = [
            { name: 'Mock Data Test', fn: () => this.testWithMockData() },
            { name: 'Missing Data Test', fn: () => this.testWithMissingData() },
            { name: 'Banner Validation Test', fn: () => this.testBannerValidation() },
            { name: 'Meta Tags Test', fn: () => this.testMetaTags() }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            console.log(`\n--- ${test.name} ---`);
            try {
                const result = await test.fn();
                if (result) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`❌ ${test.name} threw an error:`, error.message);
                failed++;
            }
        }
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
        
        return failed === 0;
    }
}

/**
 * CLI interface
 */
async function main() {
    const tester = new BannerTester();
    
    try {
        const allPassed = await tester.runAllTests();
        
        if (allPassed) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Some tests failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 Fatal test error:', error.message);
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = BannerTester;

// Run if called directly
if (require.main === module) {
    main();
}