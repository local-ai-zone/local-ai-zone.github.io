#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Banner Generation System for Local AI Zone
 * Generates social media banner (1200x630px) with current statistics
 */
class BannerGenerator {
    constructor() {
        this.bannerPath = path.join(__dirname, '..', 'social-banner.html');
        this.outputPath = path.join(__dirname, '..', 'og-image.png');
        this.fallbackPath = path.join(__dirname, '..', 'og-image-fallback.png');
        this.modelsDataPath = path.join(__dirname, '..', 'gguf_models.json');
    }

    /**
     * Read and parse model statistics from gguf_models.json
     */
    async getModelStatistics() {
        try {
            const data = await fs.readFile(this.modelsDataPath, 'utf8');
            const models = JSON.parse(data);
            
            const stats = {
                totalModels: models.length,
                totalDownloads: models.reduce((sum, model) => sum + (model.downloadCount || 0), 0),
                totalLikes: models.reduce((sum, model) => sum + (model.likeCount || 0), 0),
                lastUpdated: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            };

            // Format model count for display
            if (stats.totalModels >= 1000) {
                stats.modelCountFormatted = `${Math.floor(stats.totalModels / 1000)}K+`;
            } else {
                stats.modelCountFormatted = `${stats.totalModels}+`;
            }

            console.log('📊 Model Statistics:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Error reading model statistics:', error.message);
            // Return fallback statistics
            return {
                totalModels: 40000,
                modelCountFormatted: '40K+',
                totalDownloads: 0,
                totalLikes: 0,
                lastUpdated: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            };
        }
    }

    /**
     * Inject dynamic content into banner HTML
     */
    async prepareBannerHTML(stats) {
        try {
            let bannerHTML = await fs.readFile(this.bannerPath, 'utf8');
            
            // Replace dynamic content placeholders
            bannerHTML = bannerHTML.replace(
                '<div class="stat-number" id="model-count">40,000+</div>',
                `<div class="stat-number" id="model-count">${stats.modelCountFormatted}</div>`
            );
            
            bannerHTML = bannerHTML.replace(
                '<span id="update-timestamp">Today</span>',
                `<span id="update-timestamp">${stats.lastUpdated}</span>`
            );

            // Format date for the stat card (short format)
            const shortDate = new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            bannerHTML = bannerHTML.replace(
                '<div class="stat-number" id="last-update-date">Aug 2</div>',
                `<div class="stat-number" id="last-update-date">${shortDate}</div>`
            );

            return bannerHTML;
        } catch (error) {
            console.error('❌ Error preparing banner HTML:', error.message);
            throw error;
        }
    }

    /**
     * Generate banner image using Puppeteer
     */
    async generateBanner() {
        let browser = null;
        
        try {
            console.log('🚀 Starting banner generation...');
            
            // Get current statistics
            const stats = await this.getModelStatistics();
            
            // Prepare HTML with dynamic content
            const bannerHTML = await this.prepareBannerHTML(stats);
            
            // Launch browser
            console.log('🌐 Launching browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process'
                ]
            });
            
            const page = await browser.newPage();
            
            // Set viewport to exact banner dimensions
            await page.setViewport({
                width: 1200,
                height: 630,
                deviceScaleFactor: 2 // High DPI for better quality
            });
            
            // Set content and wait for fonts to load
            await page.setContent(bannerHTML, {
                waitUntil: ['networkidle0', 'domcontentloaded']
            });
            
            // Wait for fonts to load
            await page.evaluateHandle('document.fonts.ready');
            
            // Additional wait to ensure everything is rendered
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('📸 Capturing screenshot...');
            
            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                clip: {
                    x: 0,
                    y: 0,
                    width: 1200,
                    height: 630
                },
                omitBackground: false
            });
            
            // Save the banner
            await fs.writeFile(this.outputPath, screenshot);
            
            console.log('✅ Banner generated successfully:', this.outputPath);
            
            // Validate the generated image
            await this.validateBanner();
            
            return {
                success: true,
                outputPath: this.outputPath,
                stats: stats
            };
            
        } catch (error) {
            console.error('❌ Error generating banner:', error.message);
            
            // Try to use fallback banner if available
            await this.handleFallback();
            
            return {
                success: false,
                error: error.message,
                fallbackUsed: true
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Validate generated banner image
     */
    async validateBanner() {
        try {
            const stats = await fs.stat(this.outputPath);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            console.log(`📏 Banner validation:`);
            console.log(`   File size: ${fileSizeKB} KB`);
            console.log(`   Path: ${this.outputPath}`);
            
            // Check if file size is reasonable (not too small, not too large)
            if (stats.size < 10000) { // Less than 10KB might indicate an error
                throw new Error(`Generated banner file is too small (${fileSizeKB} KB)`);
            }
            
            if (stats.size > 2000000) { // More than 2MB is too large for web
                console.warn(`⚠️  Banner file is quite large (${fileSizeKB} KB). Consider optimization.`);
            }
            
            console.log('✅ Banner validation passed');
            
        } catch (error) {
            console.error('❌ Banner validation failed:', error.message);
            throw error;
        }
    }

    /**
     * Handle fallback when banner generation fails
     */
    async handleFallback() {
        try {
            // Check if fallback banner exists
            await fs.access(this.fallbackPath);
            
            // Copy fallback to main banner location
            await fs.copyFile(this.fallbackPath, this.outputPath);
            
            console.log('🔄 Using fallback banner');
        } catch (error) {
            console.warn('⚠️  No fallback banner available');
        }
    }

    /**
     * Create a simple fallback banner
     */
    async createFallbackBanner() {
        console.log('🎨 Creating fallback banner...');
        
        // This would create a simple text-based banner as fallback
        // For now, we'll just log that this should be implemented
        console.log('ℹ️  Fallback banner creation not implemented yet');
    }
}

/**
 * CLI interface
 */
async function main() {
    const generator = new BannerGenerator();
    
    try {
        const result = await generator.generateBanner();
        
        if (result.success) {
            console.log('\n🎉 Banner generation completed successfully!');
            console.log(`📊 Statistics used:`);
            console.log(`   Models: ${result.stats.modelCountFormatted}`);
            console.log(`   Last updated: ${result.stats.lastUpdated}`);
        } else {
            console.log('\n❌ Banner generation failed');
            if (result.fallbackUsed) {
                console.log('🔄 Fallback banner was used');
            }
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Export for testing
module.exports = BannerGenerator;

// Run if called directly
if (require.main === module) {
    main();
}