#!/usr/bin/env node

/**
 * Local Pre-rendering Test Script
 * Tests pre-rendering against a local server for faster development
 */

const ModelPrerenderer = require('./prerender-models.js');
const fs = require('fs').promises;
const http = require('http');
const path = require('path');

class LocalTestPrerenderer extends ModelPrerenderer {
    constructor(localPort = 8000) {
        super();
        this.baseUrl = `http://localhost:${localPort}`;
        this.baseOutputDir = 'test-models-local';
        this.outputDir = this.baseOutputDir; // Use single flat folder structure
        this.concurrency = 1; // Lower concurrency for local testing
        this.pageTimeout = 15000; // Shorter timeout for local server
        this.localPort = localPort;
    }

    /**
     * Check if local server is running
     */
    async checkLocalServer() {
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}`, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => {
                resolve(false);
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    /**
     * Load only 3 models for quick local testing
     */
    async loadModelsData() {
        try {
            console.log('📊 Loading sample models data for local testing...');
            const dataPath = path.join(__dirname, '../data/gguf_models.json');
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
            
            // Take only top 3 models for quick local testing
            const testModels = Array.from(uniqueModels.values())
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 3);
            
            console.log(`🎯 Selected ${testModels.length} models for local testing:`);
            testModels.forEach((model, i) => {
                console.log(`  ${i + 1}. ${model.name} (${model.likes} likes)`);
            });
            
            return testModels;
            
        } catch (error) {
            console.error('❌ Error loading test models data:', error);
            throw error;
        }
    }

    /**
     * Run local test with server check
     */
    async run() {
        try {
            console.log('🧪 Starting Local Pre-rendering Test');
            console.log(`🌐 Testing against: ${this.baseUrl}`);
            console.log('');
            
            // Check if local server is running
            console.log('🔍 Checking if local server is running...');
            const serverRunning = await this.checkLocalServer();
            
            if (!serverRunning) {
                console.log('❌ Local server is not running!');
                console.log('');
                console.log('📝 To start a local server:');
                console.log('  1. Python: python -m http.server 8000');
                console.log('  2. Node.js: npx http-server -p 8000');
                console.log('  3. PHP: php -S localhost:8000');
                console.log('');
                console.log('Then run this test again.');
                process.exit(1);
            }
            
            console.log('✅ Local server is running');
            console.log('');
            
            // Load models data
            const models = await this.loadModelsData();
            
            // Initialize browser and directories
            await this.initialize();
            
            // Process models
            await this.processModels(models);
            
            console.log('');
            console.log('✅ Local pre-rendering test completed successfully!');
            
        } catch (error) {
            console.error('💥 Local pre-rendering test failed:', error);
            process.exit(1);
        } finally {
            // Always cleanup
            await this.cleanup();
        }
    }
}

async function runLocalTest() {
    console.log('🧪 Local Pre-rendering Test...\n');
    
    try {
        const localPrerenderer = new LocalTestPrerenderer();
        await localPrerenderer.run();
        
        // Check results
        console.log('\n✅ Local Pre-rendering Test Results:');
        
        try {
            const testDir = 'test-models-local';
            
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
        
        console.log('\n🎉 Local pre-rendering test completed!');
        console.log('\n📝 Next steps:');
        console.log('  1. Check the generated files in test-models-local/');
        console.log('  2. Run full test: node scripts/test-prerender.js');
        console.log('  3. Run production: node scripts/prerender-models.js');
        
    } catch (error) {
        console.error('\n❌ Local pre-rendering test failed:', error.message);
        process.exit(1);
    }
}

// Run test if this script is executed directly
if (require.main === module) {
    runLocalTest();
}

module.exports = runLocalTest;