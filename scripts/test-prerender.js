#!/usr/bin/env node

/**
 * Test script for model pre-rendering
 * This script tests the pre-rendering functionality with a small sample
 */

const ModelPrerenderer = require('./prerender-models.js');
const fs = require('fs').promises;

class TestPrerenderer extends ModelPrerenderer {
    constructor() {
        super();
        this.baseOutputDir = 'test-models';
        this.outputDir = this.baseOutputDir;
        this.concurrency = 2; // Lower concurrency for testing
    }

    /**
     * Load a small sample of models for testing
     */
    async loadModelsData() {
        try {
            console.log('📊 Loading sample models data for testing...');
            const dataPath = require('path').join(__dirname, '../data/gguf_models.json');
            const rawData = await fs.readFile(dataPath, 'utf8');
            const modelsData = JSON.parse(rawData);
            
            // Create unique models map
            const uniqueModels = new Map();
            
            modelsData.forEach(model => {
                const key = model.modelName;
                if (!uniqueModels.has(key) || uniqueModels.get(key).likeCount < model.likeCount) {
                    uniqueModels.set(key, {
                        name: model.modelName,
                        likes: model.likeCount || 0,
                        slug: this.createSlug(model.modelName)
                    });
                }
            });
            
            // Take only top 5 models for testing
            const testModels = Array.from(uniqueModels.values())
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 5);
            
            console.log(`🎯 Selected ${testModels.length} models for testing`);
            testModels.forEach((model, i) => {
                console.log(`  ${i + 1}. ${model.name} (${model.likes} likes)`);
            });
            
            return testModels;
            
        } catch (error) {
            console.error('❌ Error loading test models data:', error);
            throw error;
        }
    }
}

async function runTest() {
    console.log('🧪 Testing Model Pre-rendering...\n');
    
    try {
        const testPrerenderer = new TestPrerenderer();
        await testPrerenderer.run();
        
        // Check results
        console.log('\n✅ Pre-rendering Test Results:');
        
        try {
            const testDir = 'test-models';
            
            const files = await fs.readdir(testDir);
            const htmlFiles = files.filter(f => f.endsWith('.html'));
            
            console.log(`  📁 Generated ${htmlFiles.length} HTML files in ${testDir}:`);
            for (const file of htmlFiles) {
                const stats = await fs.stat(`${testDir}/${file}`);
                console.log(`    ✓ ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
            }
            
        } catch (error) {
            console.log('  ❌ No files generated or error reading directory');
        }
        
        console.log('\n🎉 Pre-rendering test completed!');
        
    } catch (error) {
        console.error('\n❌ Pre-rendering test failed:', error.message);
        process.exit(1);
    }
}

// Run test if this script is executed directly
if (require.main === module) {
    runTest();
}

module.exports = runTest;