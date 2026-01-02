#!/usr/bin/env node

/**
 * Puppeteer Model Pre-rendering Script
 * 
 * This script pre-renders individual model pages for better SEO and performance.
 * It processes the top 500 models by likes, creating static HTML files for each.
 * 
 * Features:
 * - Concurrent processing with 5 browser tabs for speed
 * - Error handling with retry logic
 * - Progress tracking and logging
 * - Estimated runtime: 10-15 minutes for 500 models
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ModelPrerenderer {
    constructor() {
        this.baseUrl = 'https://local-ai-zone.github.io';
        this.baseOutputDir = 'models';
        this.concurrency = 5;
        this.maxRetries = 1;
        this.pageTimeout = 60000; // 60 seconds
        this.browser = null;

        // Use single flat folder structure
        this.outputDir = this.baseOutputDir;

        this.stats = {
            total: 0,
            processed: 0,
            failed: 0,
            retried: 0
        };
    }

    /**
     * Load and process models data from JSON file
     */
    async loadModelsData() {
        try {
            console.log('📊 Loading models data...');
            const dataPath = path.join(__dirname, '../gguf_models.json');
            const rawData = await fs.readFile(dataPath, 'utf8');
            const modelsData = JSON.parse(rawData);

            console.log(`📈 Loaded ${modelsData.length} model entries`);

            // Create unique models map to avoid duplicates
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

            // Sort by likes descending and take top 500
            const sortedModels = Array.from(uniqueModels.values())
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 100);

            console.log(`🎯 Selected top ${sortedModels.length} models for pre-rendering`);
            console.log(`📊 Like range: ${sortedModels[0]?.likes} - ${sortedModels[sortedModels.length - 1]?.likes}`);

            return sortedModels;

        } catch (error) {
            console.error('❌ Error loading models data:', error);
            throw error;
        }
    }

    /**
     * Create URL-friendly slug from model name
     */
    createSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    /**
       * Initialize browser and output directory
       */
    async initialize() {
        console.log('🚀 Initializing browser and output directory...');


        // Create date-based output directory
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.outputDir}`);
        } catch (error) {
            console.error('❌ Error creating output directory:', error);
            throw error;
        }

        // Launch browser with optimized settings
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        console.log('🌐 Browser launched successfully');
    }

    /**
     * Pre-render a single model page
     */
    async prerenderModel(model, retryCount = 0) {
        const url = `${this.baseUrl}/?model=${encodeURIComponent(model.slug)}`;
        const filename = `${model.slug}.html`;
        const filepath = path.join(this.outputDir, filename);

        let page = null;

        try {
            // Create new page
            page = await this.browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1200, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (compatible; ModelPrerenderer/1.0)');

            // Navigate to model page
            console.log(`🔄 Processing: ${model.name} (${model.likes} likes)`);

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.pageTimeout
            });

            // Wait for model content to load with longer timeout
            await page.waitForSelector('#model-grid', { timeout: 30000 });

            // Get fully rendered HTML
            const html = await page.content();

            // Save to file
            await fs.writeFile(filepath, html, 'utf8');

            this.stats.processed++;
            console.log(`✅ Saved: ${filename} (${this.stats.processed}/${this.stats.total})`);

        } catch (error) {
            console.error(`❌ Error processing ${model.name}:`, error.message);

            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Retrying ${model.name} (attempt ${retryCount + 1})`);
                this.stats.retried++;
                await this.prerenderModel(model, retryCount + 1);
            } else {
                this.stats.failed++;
                console.error(`💥 Failed after ${this.maxRetries} retries: ${model.name}`);
            }
        } finally {
            // Always close the page
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Process models with concurrency control
     */
    async processModels(models) {
        this.stats.total = models.length;
        console.log(`🎯 Starting pre-rendering of ${models.length} models with ${this.concurrency} concurrent tabs`);

        const startTime = Date.now();

        // Process models in batches with concurrency limit
        for (let i = 0; i < models.length; i += this.concurrency) {
            const batch = models.slice(i, i + this.concurrency);
            const promises = batch.map(model => this.prerenderModel(model));

            // Wait for current batch to complete
            await Promise.allSettled(promises);

            // Progress update
            const progress = Math.min(i + this.concurrency, models.length);
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = progress / elapsed;
            const eta = (models.length - progress) / rate;

            console.log(`📊 Progress: ${progress}/${models.length} (${(progress / models.length * 100).toFixed(1)}%) - ETA: ${Math.round(eta / 60)}min`);
        }

        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`🎉 Pre-rendering completed in ${Math.round(totalTime / 60)} minutes`);
        console.log(`📈 Stats: ${this.stats.processed} processed, ${this.stats.failed} failed, ${this.stats.retried} retried`);
        console.log(`📅 Files saved in: ${this.outputDir}`);
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }

    /**
     * Main execution function
     */
    async run() {
        try {
            console.log('🚀 Starting Model Pre-rendering Process');
            console.log('⏱️  Estimated runtime: 10-15 minutes for 500 models');
            console.log('');

            // Load models data
            const models = await this.loadModelsData();

            // Initialize browser and directories
            await this.initialize();

            // Process all models
            await this.processModels(models);

            console.log('');
            console.log('✅ Pre-rendering process completed successfully!');

        } catch (error) {
            console.error('💥 Pre-rendering process failed:', error);
            process.exit(1);
        } finally {
            // Always cleanup
            await this.cleanup();
        }
    }
}

// Run the prerenderer if this script is executed directly
if (require.main === module) {
    const prerenderer = new ModelPrerenderer();
    prerenderer.run();
}

module.exports = ModelPrerenderer;