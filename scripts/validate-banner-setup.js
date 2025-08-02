#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Validates the complete banner generation setup
 */
class BannerSetupValidator {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.requiredFiles = [
            'social-banner.html',
            'css/social-banner.css',
            'scripts/generate-banner.js',
            'scripts/test-banner-generation.js',
            'scripts/create-fallback-banner.js',
            'docs/BANNER_GENERATION.md'
        ];
        this.generatedFiles = [
            'og-image.png',
            'og-image-fallback.png'
        ];
    }

    /**
     * Check if all required files exist
     */
    async validateRequiredFiles() {
        console.log('📁 Validating required files...');
        
        let allFilesExist = true;
        
        for (const file of this.requiredFiles) {
            const filePath = path.join(this.rootDir, file);
            try {
                await fs.access(filePath);
                console.log(`✅ ${file}`);
            } catch (error) {
                console.log(`❌ ${file} - Missing`);
                allFilesExist = false;
            }
        }
        
        return allFilesExist;
    }

    /**
     * Check if generated files exist
     */
    async validateGeneratedFiles() {
        console.log('\n🖼️  Validating generated files...');
        
        let allFilesExist = true;
        
        for (const file of this.generatedFiles) {
            const filePath = path.join(this.rootDir, file);
            try {
                const stats = await fs.stat(filePath);
                const fileSizeKB = Math.round(stats.size / 1024);
                console.log(`✅ ${file} (${fileSizeKB} KB)`);
            } catch (error) {
                console.log(`❌ ${file} - Missing`);
                allFilesExist = false;
            }
        }
        
        return allFilesExist;
    }

    /**
     * Validate Open Graph meta tags in index.html
     */
    async validateMetaTags() {
        console.log('\n🏷️  Validating meta tags...');
        
        try {
            const indexPath = path.join(this.rootDir, 'index.html');
            const indexContent = await fs.readFile(indexPath, 'utf8');
            
            const requiredTags = [
                { tag: 'og:title', type: 'property' },
                { tag: 'og:description', type: 'property' },
                { tag: 'og:image', type: 'property' },
                { tag: 'og:image:width', type: 'property' },
                { tag: 'og:image:height', type: 'property' },
                { tag: 'og:url', type: 'property' },
                { tag: 'og:type', type: 'property' },
                { tag: 'twitter:card', type: 'name' },
                { tag: 'twitter:title', type: 'name' },
                { tag: 'twitter:description', type: 'name' },
                { tag: 'twitter:image', type: 'name' }
            ];
            
            let allTagsValid = true;
            
            for (const { tag, type } of requiredTags) {
                const pattern = new RegExp(`${type}="${tag}"[^>]*content="[^"]+"`);
                if (pattern.test(indexContent)) {
                    console.log(`✅ ${tag}`);
                } else {
                    console.log(`❌ ${tag} - Missing or invalid`);
                    allTagsValid = false;
                }
            }
            
            // Check for specific values
            if (indexContent.includes('content="1200"') && indexContent.includes('content="630"')) {
                console.log('✅ Image dimensions (1200x630)');
            } else {
                console.log('❌ Image dimensions - Incorrect or missing');
                allTagsValid = false;
            }
            
            if (indexContent.includes('og-image.png')) {
                console.log('✅ Banner image reference');
            } else {
                console.log('❌ Banner image reference - Missing');
                allTagsValid = false;
            }
            
            return allTagsValid;
            
        } catch (error) {
            console.error('❌ Error validating meta tags:', error.message);
            return false;
        }
    }

    /**
     * Validate banner HTML template
     */
    async validateBannerTemplate() {
        console.log('\n🎨 Validating banner template...');
        
        try {
            const bannerPath = path.join(this.rootDir, 'social-banner.html');
            const bannerContent = await fs.readFile(bannerPath, 'utf8');
            
            const requiredElements = [
                { element: 'id="model-count"', description: 'Model count placeholder' },
                { element: 'id="update-timestamp"', description: 'Update timestamp placeholder' },
                { element: 'class="main-title"', description: 'Main title' },
                { element: 'class="subtitle"', description: 'Subtitle' },
                { element: 'class="stat-card"', description: 'Statistics cards' },
                { element: 'class="compatibility-tools"', description: 'Compatibility section' }
            ];
            
            let allElementsValid = true;
            
            for (const { element, description } of requiredElements) {
                if (bannerContent.includes(element)) {
                    console.log(`✅ ${description}`);
                } else {
                    console.log(`❌ ${description} - Missing`);
                    allElementsValid = false;
                }
            }
            
            // Check viewport
            if (bannerContent.includes('width=1200, height=630')) {
                console.log('✅ Correct viewport dimensions');
            } else {
                console.log('❌ Viewport dimensions - Incorrect or missing');
                allElementsValid = false;
            }
            
            return allElementsValid;
            
        } catch (error) {
            console.error('❌ Error validating banner template:', error.message);
            return false;
        }
    }

    /**
     * Validate package.json scripts
     */
    async validatePackageScripts() {
        console.log('\n📦 Validating package.json scripts...');
        
        try {
            const packagePath = path.join(this.rootDir, 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);
            
            const requiredScripts = [
                'generate-banner',
                'test-banner',
                'create-fallback-banner'
            ];
            
            let allScriptsValid = true;
            
            for (const script of requiredScripts) {
                if (packageData.scripts && packageData.scripts[script]) {
                    console.log(`✅ ${script} script`);
                } else {
                    console.log(`❌ ${script} script - Missing`);
                    allScriptsValid = false;
                }
            }
            
            return allScriptsValid;
            
        } catch (error) {
            console.error('❌ Error validating package scripts:', error.message);
            return false;
        }
    }

    /**
     * Run comprehensive validation
     */
    async validateSetup() {
        console.log('🔍 Starting banner setup validation...\n');
        
        const validations = [
            { name: 'Required Files', fn: () => this.validateRequiredFiles() },
            { name: 'Generated Files', fn: () => this.validateGeneratedFiles() },
            { name: 'Meta Tags', fn: () => this.validateMetaTags() },
            { name: 'Banner Template', fn: () => this.validateBannerTemplate() },
            { name: 'Package Scripts', fn: () => this.validatePackageScripts() }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const validation of validations) {
            console.log(`\n--- ${validation.name} ---`);
            try {
                const result = await validation.fn();
                if (result) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`❌ ${validation.name} validation error:`, error.message);
                failed++;
            }
        }
        
        console.log('\n📊 Validation Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
        
        if (failed === 0) {
            console.log('\n🎉 Banner setup validation completed successfully!');
            console.log('🚀 Your social media banner system is ready to use.');
            console.log('\nNext steps:');
            console.log('• Run "npm run generate-banner" to create a new banner');
            console.log('• Run "npm run test-banner" to test the system');
            console.log('• Check the generated og-image.png file');
        } else {
            console.log('\n❌ Banner setup validation failed');
            console.log('Please fix the issues above before using the banner system.');
        }
        
        return failed === 0;
    }
}

/**
 * CLI interface
 */
async function main() {
    const validator = new BannerSetupValidator();
    
    try {
        const success = await validator.validateSetup();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n💥 Fatal validation error:', error.message);
        process.exit(1);
    }
}

// Export for testing
module.exports = BannerSetupValidator;

// Run if called directly
if (require.main === module) {
    main();
}