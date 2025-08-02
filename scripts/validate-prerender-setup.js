#!/usr/bin/env node

/**
 * Validation script for pre-rendering setup
 * Tests the setup without running full browser automation
 */

const fs = require('fs').promises;
const path = require('path');

async function validateSetup() {
    console.log('🔍 Validating Pre-rendering Setup...\n');
    
    const checks = [];
    
    try {
        // Check if data file exists
        const dataPath = path.join(__dirname, '../gguf_models.json');
        try {
            const stats = await fs.stat(dataPath);
            checks.push({
                name: 'Data file exists',
                status: '✅',
                details: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
            });
        } catch (error) {
            checks.push({
                name: 'Data file exists',
                status: '❌',
                details: 'File not found'
            });
        }
        
        // Check if puppeteer is available
        try {
            require('puppeteer');
            checks.push({
                name: 'Puppeteer available',
                status: '✅',
                details: 'Module found'
            });
        } catch (error) {
            checks.push({
                name: 'Puppeteer available',
                status: '❌',
                details: 'Module not found - run npm install puppeteer'
            });
        }
        
        // Check if main site is accessible (basic check)
        const baseUrl = 'https://local-ai-zone.github.io';
        checks.push({
            name: 'Base URL configured',
            status: '✅',
            details: baseUrl
        });
        
        // Test data processing
        try {
            const rawData = await fs.readFile(dataPath, 'utf8');
            const modelsData = JSON.parse(rawData);
            
            // Create unique models map
            const uniqueModels = new Map();
            modelsData.forEach(model => {
                const key = model.modelName;
                if (!uniqueModels.has(key) || uniqueModels.get(key).likeCount < model.likeCount) {
                    uniqueModels.set(key, {
                        name: model.modelName,
                        likes: model.likeCount || 0
                    });
                }
            });
            
            const topModels = Array.from(uniqueModels.values())
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 500);
            
            checks.push({
                name: 'Data processing',
                status: '✅',
                details: `${topModels.length} models ready for pre-rendering`
            });
            
            // Show top 5 models
            console.log('📊 Top 5 models by likes:');
            topModels.slice(0, 5).forEach((model, i) => {
                console.log(`  ${i + 1}. ${model.name} (${model.likes} likes)`);
            });
            console.log('');
            
        } catch (error) {
            checks.push({
                name: 'Data processing',
                status: '❌',
                details: error.message
            });
        }
        
        // Check output directory creation
        try {
            await fs.mkdir('test-output', { recursive: true });
            await fs.rmdir('test-output');
            checks.push({
                name: 'Directory creation',
                status: '✅',
                details: 'Can create output directories'
            });
        } catch (error) {
            checks.push({
                name: 'Directory creation',
                status: '❌',
                details: error.message
            });
        }
        
        // Display results
        console.log('🔍 Validation Results:');
        checks.forEach(check => {
            console.log(`  ${check.status} ${check.name}: ${check.details}`);
        });
        
        const passed = checks.filter(c => c.status === '✅').length;
        const total = checks.length;
        
        console.log('');
        if (passed === total) {
            console.log('🎉 All checks passed! Pre-rendering setup is ready.');
            console.log('');
            console.log('📝 Next steps:');
            console.log('  1. Run: node scripts/test-prerender.js (for local testing)');
            console.log('  2. Run: node scripts/prerender-models.js (for full pre-rendering)');
            console.log('  3. Deploy via GitHub Actions workflow');
        } else {
            console.log(`⚠️  ${total - passed} checks failed. Please fix the issues above.`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

// Run validation if this script is executed directly
if (require.main === module) {
    validateSetup();
}

module.exports = validateSetup;