#!/usr/bin/env node

/**
 * Test script for SEO generation
 * This script tests the SEO generation functionality locally
 */

const SEOGenerator = require('./generate-seo.js');
const fs = require('fs');

async function testSEOGeneration() {
    console.log('🧪 Testing SEO Generation...\n');
    
    try {
        const generator = new SEOGenerator();
        await generator.generateAll();
        
        console.log('\n✅ SEO Generation Test Results:');
        
        // Check if files were created
        const files = ['sitemap.xml', 'robots.txt', 'seo-metadata.json'];
        files.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                console.log(`  ✓ ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
            } else {
                console.log(`  ✗ ${file} - Missing`);
            }
        });
        
        // Check sitemap content
        if (fs.existsSync('sitemap.xml')) {
            const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
            const urlCount = (sitemap.match(/<loc>/g) || []).length;
            console.log(`  📄 Sitemap contains ${urlCount} URLs`);
        }
        
        // Check SEO metadata
        if (fs.existsSync('seo-metadata.json')) {
            const metadata = JSON.parse(fs.readFileSync('seo-metadata.json', 'utf8'));
            const modelCount = Object.keys(metadata.models || {}).length;
            console.log(`  🏷️ SEO metadata for ${modelCount} models`);
        }
        
        console.log('\n🎉 SEO generation test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ SEO generation test failed:', error.message);
        process.exit(1);
    }
}

// Run test if this script is executed directly
if (require.main === module) {
    testSEOGeneration();
}

module.exports = testSEOGeneration;