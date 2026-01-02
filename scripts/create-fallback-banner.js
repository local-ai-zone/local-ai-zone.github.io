#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Creates a simple fallback banner for when main generation fails
 */
class FallbackBannerCreator {
    constructor() {
        this.outputPath = path.join(__dirname, '..', 'og-image-fallback.png');
    }

    /**
     * Generate a simple HTML-based fallback banner
     */
    async createFallbackBanner() {
        const fallbackHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1200, height=630">
    <title>Local AI Zone - Fallback Banner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin: 0;
            padding: 60px 80px;
            box-sizing: border-box;
        }
        
        .container {
            text-align: center;
            color: #1e3a8a;
            max-width: 1040px;
            max-height: 510px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        
        .logo {
            font-size: 80px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 16px;
            color: #1e40af;
        }
        
        .subtitle {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 40px;
            color: #3730a3;
        }
        
        .stats {
            display: flex;
            gap: 60px;
            justify-content: center;
            margin-bottom: 30px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #1e40af;
        }
        
        .stat-label {
            font-size: 16px;
            color: #6366f1;
            margin-top: 8px;
        }
        
        .footer {
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">⚡</div>
        <h1 class="title">Local AI Zone</h1>
        <p class="subtitle">Direct Access to GGUF Models for Local LLMs</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">40K+</div>
                <div class="stat-label">GGUF Models</div>
            </div>
            <div class="stat">
                <div class="stat-number">Daily</div>
                <div class="stat-label">Updates</div>
            </div>
        </div>
        
        <div class="footer">Compatible with llama.cpp, LM Studio, Ollama, GGUF Loader</div>
    </div>
</body>
</html>`;

        let browser = null;
        
        try {
            console.log('🎨 Creating fallback banner...');
            
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            
            const page = await browser.newPage();
            
            await page.setViewport({
                width: 1200,
                height: 630,
                deviceScaleFactor: 1
            });
            
            await page.setContent(fallbackHTML, {
                waitUntil: 'domcontentloaded'
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const screenshot = await page.screenshot({
                type: 'png',
                clip: {
                    x: 0,
                    y: 0,
                    width: 1200,
                    height: 630
                }
            });
            
            await fs.writeFile(this.outputPath, screenshot);
            
            console.log('✅ Fallback banner created:', this.outputPath);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error creating fallback banner:', error.message);
            return false;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

// CLI interface
async function main() {
    const creator = new FallbackBannerCreator();
    
    try {
        const success = await creator.createFallbackBanner();
        
        if (success) {
            console.log('\n🎉 Fallback banner created successfully!');
        } else {
            console.log('\n❌ Failed to create fallback banner');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Export for testing
module.exports = FallbackBannerCreator;

// Run if called directly
if (require.main === module) {
    main();
}