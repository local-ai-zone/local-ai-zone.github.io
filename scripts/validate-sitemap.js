const fs = require('fs');
const path = require('path');

/**
 * Sitemap Validation and Update Script
 * 
 * This script:
 * 1. Verifies all migrated blog post URLs are in sitemap
 * 2. Updates lastmod dates to current date
 * 3. Validates sitemap XML syntax
 * 4. Generates a report for Google Search Console submission
 */

const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const BLOG_DIRECTORIES = ['guides', 'brands', 'cpu'];
const BASE_URL = 'https://local-ai-zone.github.io';

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Get all HTML files from blog directories
function getBlogPostFiles() {
    const blogPosts = [];
    
    BLOG_DIRECTORIES.forEach(dir => {
        const dirPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath)
                .filter(file => file.endsWith('.html') && file !== 'index.html' && file !== 'cpu_page_template.html')
                .filter(file => {
                    // Skip redirect/noindex pages (e.g. deduplicated guides)
                    try {
                        const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
                        return !/noindex/.test(content);
                    } catch (err) {
                        return true;
                    }
                });
            
            files.forEach(file => {
                blogPosts.push({
                    directory: dir,
                    filename: file,
                    url: `${BASE_URL}/${dir}/${file}`
                });
            });
        }
    });
    
    return blogPosts;
}

// Parse sitemap XML using regex (simple approach)
function parseSitemap() {
    try {
        const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
        
        // Extract all URL entries
        const urlRegex = /<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>\s*<changefreq>(.*?)<\/changefreq>\s*<priority>(.*?)<\/priority>\s*<\/url>/gs;
        const urls = [];
        let match;
        
        while ((match = urlRegex.exec(xml)) !== null) {
            urls.push({
                loc: match[1],
                lastmod: match[2],
                changefreq: match[3],
                priority: match[4]
            });
        }
        
        return { xml, urls };
    } catch (error) {
        console.error('❌ Error parsing sitemap:', error.message);
        throw error;
    }
}

// Validate sitemap structure
function validateSitemapStructure(xml) {
    const errors = [];
    
    // Check for XML declaration
    if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
        errors.push('Missing XML declaration');
    }
    
    // Check for urlset element
    if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
        errors.push('Missing or invalid <urlset> element');
    }
    
    // Check for closing urlset
    if (!xml.includes('</urlset>')) {
        errors.push('Missing closing </urlset> tag');
    }
    
    // Check for basic URL structure
    const urlCount = (xml.match(/<url>/g) || []).length;
    const closingUrlCount = (xml.match(/<\/url>/g) || []).length;
    
    if (urlCount !== closingUrlCount) {
        errors.push(`Mismatched <url> tags: ${urlCount} opening, ${closingUrlCount} closing`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        urlCount
    };
}

// Check if all blog posts are in sitemap
function checkBlogPostCoverage(sitemapUrls, blogPosts) {
    const sitemapUrlSet = new Set(sitemapUrls.map(entry => entry.loc));
    
    const missing = [];
    const present = [];
    
    blogPosts.forEach(post => {
        if (sitemapUrlSet.has(post.url)) {
            present.push(post);
        } else {
            missing.push(post);
        }
    });
    
    return { missing, present };
}

// Update lastmod dates for blog posts
function updateBlogPostDates(xml, blogPosts) {
    const currentDate = getCurrentDate();
    const blogPostUrls = blogPosts.map(post => post.url);
    let updatedCount = 0;
    let updatedXml = xml;
    
    blogPostUrls.forEach(url => {
        // Find and update the lastmod date for this URL
        const urlPattern = new RegExp(
            `(<url>\\s*<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>\\s*<lastmod>)([^<]+)(<\\/lastmod>)`,
            'g'
        );
        
        const newXml = updatedXml.replace(urlPattern, (match, before, oldDate, after) => {
            updatedCount++;
            return `${before}${currentDate}${after}`;
        });
        
        updatedXml = newXml;
    });
    
    return { updatedXml, updatedCount };
}

// Add missing blog posts to sitemap
function addMissingBlogPosts(xml, missingPosts) {
    const currentDate = getCurrentDate();
    
    if (missingPosts.length === 0) {
        return { updatedXml: xml, addedCount: 0 };
    }
    
    // Find the closing </urlset> tag
    const closingTag = '</urlset>';
    const closingIndex = xml.lastIndexOf(closingTag);
    
    if (closingIndex === -1) {
        throw new Error('Could not find closing </urlset> tag');
    }
    
    // Build new URL entries
    const newEntries = missingPosts.map(post => {
        return `  <url>
    <loc>${post.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join('\n');
    
    // Insert new entries before closing tag
    const updatedXml = xml.slice(0, closingIndex) + newEntries + '\n' + xml.slice(closingIndex);
    
    return { updatedXml, addedCount: missingPosts.length };
}

// Write updated sitemap
function writeSitemap(xml) {
    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
}

// Generate validation report
function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalBlogPosts: results.totalBlogPosts,
            presentInSitemap: results.presentCount,
            missingFromSitemap: results.missingCount,
            addedToSitemap: results.addedCount,
            datesUpdated: results.updatedCount,
            validationPassed: results.validationPassed
        },
        validation: {
            structureValid: results.structureValid,
            errors: results.validationErrors
        },
        missingPosts: results.missingPosts,
        nextSteps: [
            'Review the updated sitemap.xml file',
            'Submit sitemap to Google Search Console at: https://search.google.com/search-console',
            'Monitor for crawl errors in Search Console',
            'Verify all blog post URLs are accessible'
        ]
    };
    
    return report;
}

// Main execution
function main() {
    console.log('🔍 Sitemap Validation and Update\n');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Get all blog posts
        console.log('\n📁 Scanning blog directories...');
        const blogPosts = getBlogPostFiles();
        console.log(`   Found ${blogPosts.length} blog posts`);
        
        BLOG_DIRECTORIES.forEach(dir => {
            const count = blogPosts.filter(p => p.directory === dir).length;
            console.log(`   - ${dir}: ${count} posts`);
        });
        
        // Step 2: Parse sitemap
        console.log('\n📄 Parsing sitemap.xml...');
        const { xml, urls } = parseSitemap();
        console.log(`   Found ${urls.length} URLs in sitemap`);
        
        // Step 3: Validate sitemap structure
        console.log('\n✅ Validating sitemap structure...');
        const validation = validateSitemapStructure(xml);
        if (validation.valid) {
            console.log('   ✓ Sitemap structure is valid');
            console.log(`   ✓ Found ${validation.urlCount} URL entries`);
        } else {
            console.log('   ✗ Sitemap has validation errors:');
            validation.errors.forEach(err => console.log(`     - ${err}`));
        }
        
        // Step 4: Check blog post coverage
        console.log('\n🔎 Checking blog post coverage...');
        const coverage = checkBlogPostCoverage(urls, blogPosts);
        console.log(`   ✓ ${coverage.present.length} blog posts found in sitemap`);
        
        if (coverage.missing.length > 0) {
            console.log(`   ⚠ ${coverage.missing.length} blog posts missing from sitemap:`);
            coverage.missing.forEach(post => {
                console.log(`     - ${post.directory}/${post.filename}`);
            });
        } else {
            console.log('   ✓ All blog posts are in sitemap');
        }
        
        // Step 5: Update dates
        console.log('\n📅 Updating lastmod dates...');
        const { updatedXml: xmlAfterDates, updatedCount } = updateBlogPostDates(xml, blogPosts);
        console.log(`   ✓ Updated ${updatedCount} blog post dates to ${getCurrentDate()}`);
        
        // Step 6: Add missing posts
        let addedCount = 0;
        let finalXml = xmlAfterDates;
        if (coverage.missing.length > 0) {
            console.log('\n➕ Adding missing blog posts...');
            const result = addMissingBlogPosts(xmlAfterDates, coverage.missing);
            finalXml = result.updatedXml;
            addedCount = result.addedCount;
            console.log(`   ✓ Added ${addedCount} blog posts to sitemap`);
        }
        
        // Step 7: Write updated sitemap
        console.log('\n💾 Writing updated sitemap...');
        writeSitemap(finalXml);
        console.log('   ✓ Sitemap updated successfully');
        
        // Step 8: Generate report
        const results = {
            totalBlogPosts: blogPosts.length,
            presentCount: coverage.present.length,
            missingCount: coverage.missing.length,
            addedCount: addedCount,
            updatedCount: updatedCount,
            validationPassed: validation.valid,
            structureValid: validation.valid,
            validationErrors: validation.errors,
            missingPosts: coverage.missing.map(p => `${p.directory}/${p.filename}`)
        };
        
        const report = generateReport(results);
        const reportPath = path.join(__dirname, '..', 'sitemap-validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📊 Report saved to: sitemap-validation-report.json`);
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ SITEMAP VALIDATION COMPLETE\n');
        console.log('Summary:');
        console.log(`  • Total blog posts: ${blogPosts.length}`);
        console.log(`  • Present in sitemap: ${coverage.present.length}`);
        console.log(`  • Added to sitemap: ${addedCount}`);
        console.log(`  • Dates updated: ${updatedCount}`);
        console.log(`  • Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
        
        console.log('\n📋 Next Steps:');
        console.log('  1. Review sitemap.xml file');
        console.log('  2. Submit to Google Search Console:');
        console.log('     https://search.google.com/search-console');
        console.log('  3. Monitor for crawl errors');
        console.log('  4. Verify blog post URLs are accessible');
        
        if (!validation.valid) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };
