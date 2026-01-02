/**
 * Blog Post Migration Script
 * 
 * This script migrates existing blog posts to use the new blog post template
 * while preserving SEO meta tags and content.
 * 
 * Usage:
 *   node scripts/migrate-blog-posts.js [directory] [file]
 *   
 * Examples:
 *   node scripts/migrate-blog-posts.js guides                    # Migrate all files in guides/
 *   node scripts/migrate-blog-posts.js guides ai-coding-prompts-master-techniques-2025.html  # Migrate specific file
 *   node scripts/migrate-blog-posts.js --all                     # Migrate all directories
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { generateRelatedArticlesHTML } = require('./related-articles-generator');

// Directories containing blog posts
const BLOG_DIRECTORIES = ['guides', 'brands', 'cpu'];

// Template file path
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'blog-post-template.html');

/**
 * Extract meta tag content from DOM
 */
function extractMetaTag($, selector, attribute = 'content') {
    const element = $(selector);
    return element.length > 0 ? element.attr(attribute) : '';
}

/**
 * Extract all meta tags from the head section
 */
function extractMetaTags(document) {
    const $ = (selector) => {
        if (selector.startsWith('meta[name=')) {
            const name = selector.match(/name="([^"]+)"/)[1];
            const element = document.querySelector(`meta[name="${name}"]`);
            return {
                length: element ? 1 : 0,
                attr: (attr) => element ? element.getAttribute(attr) : ''
            };
        } else if (selector.startsWith('meta[property=')) {
            const property = selector.match(/property="([^"]+)"/)[1];
            const element = document.querySelector(`meta[property="${property}"]`);
            return {
                length: element ? 1 : 0,
                attr: (attr) => element ? element.getAttribute(attr) : ''
            };
        } else if (selector === 'title') {
            const element = document.querySelector('title');
            return {
                length: element ? 1 : 0,
                text: () => element ? element.textContent : ''
            };
        } else if (selector === 'link[rel="canonical"]') {
            const element = document.querySelector('link[rel="canonical"]');
            return {
                length: element ? 1 : 0,
                attr: (attr) => element ? element.getAttribute(attr) : ''
            };
        }
        return { length: 0, attr: () => '', text: () => '' };
    };

    const meta = {
        title: $('title').text() || '',
        description: extractMetaTag($, 'meta[name="description"]'),
        keywords: extractMetaTag($, 'meta[name="keywords"]'),
        author: extractMetaTag($, 'meta[name="author"]') || 'GGUF Loader Team',
        canonical: extractMetaTag($, 'link[rel="canonical"]', 'href'),
        
        // Open Graph
        ogTitle: extractMetaTag($, 'meta[property="og:title"]'),
        ogDescription: extractMetaTag($, 'meta[property="og:description"]'),
        ogUrl: extractMetaTag($, 'meta[property="og:url"]'),
        ogType: extractMetaTag($, 'meta[property="og:type"]') || 'article',
        
        // Twitter Card
        twitterCard: extractMetaTag($, 'meta[name="twitter:card"]') || 'summary_large_image',
        twitterTitle: extractMetaTag($, 'meta[name="twitter:title"]'),
        twitterDescription: extractMetaTag($, 'meta[name="twitter:description"]'),
        
        // Dates
        publishDate: extractMetaTag($, 'meta[property="article:published_time"]'),
        modifiedDate: extractMetaTag($, 'meta[property="article:modified_time"]')
    };

    // Extract JSON-LD structured data
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    meta.structuredData = [];
    scriptElements.forEach(script => {
        try {
            const data = JSON.parse(script.textContent);
            meta.structuredData.push(data);
            
            // Extract dates from structured data if not found in meta tags
            if (!meta.publishDate && data.datePublished) {
                meta.publishDate = data.datePublished;
            }
            if (!meta.modifiedDate && data.dateModified) {
                meta.modifiedDate = data.dateModified;
            }
        } catch (e) {
            console.warn('Failed to parse JSON-LD:', e.message);
        }
    });

    return meta;
}

/**
 * Extract main content from the blog post
 */
function extractContent(document) {
    const main = document.querySelector('main');
    if (!main) {
        console.warn('No <main> element found, using <body> content');
        return document.body.innerHTML;
    }
    return main.innerHTML;
}

/**
 * Determine category from file path
 */
function getCategoryFromPath(filePath) {
    if (filePath.includes('guides')) return 'Guides';
    if (filePath.includes('brands')) return 'Brands';
    if (filePath.includes('cpu')) return 'CPU';
    return 'Blog';
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'January 8, 2025';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Build new HTML from template
 */
function buildFromTemplate(templateHTML, meta, content, category, relativeUrl) {
    let html = templateHTML;
    
    // Extract clean title (remove site name suffix if present)
    const cleanTitle = meta.title.replace(/ - Local AI Zone.*$/, '').trim();
    
    // Generate related articles HTML
    const relatedArticlesHTML = generateRelatedArticlesHTML(relativeUrl, 6);
    
    // Replace placeholders
    const replacements = {
        '{{ARTICLE_TITLE}}': cleanTitle,
        '{{ARTICLE_DESCRIPTION}}': meta.description,
        '{{ARTICLE_KEYWORDS}}': meta.keywords,
        '{{ARTICLE_AUTHOR}}': meta.author,
        '{{ARTICLE_URL}}': meta.canonical || meta.ogUrl || `https://local-ai-zone.github.io/${relativeUrl}`,
        '{{ARTICLE_CATEGORY}}': category,
        '{{PUBLISH_DATE}}': meta.publishDate || '2025-01-08T00:00:00Z',
        '{{MODIFIED_DATE}}': meta.modifiedDate || meta.publishDate || '2025-01-08T00:00:00Z',
        '{{PUBLISH_DATE_FORMATTED}}': formatDate(meta.publishDate),
        '{{MODIFIED_DATE_FORMATTED}}': formatDate(meta.modifiedDate || meta.publishDate),
        '{{ARTICLE_CONTENT}}': content,
        '{{RELATED_ARTICLES}}': relatedArticlesHTML
    };
    
    // Perform replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.split(placeholder).join(value);
    }
    
    return html;
}

/**
 * Update relative paths in content
 */
function updateRelativePaths(content, currentDir) {
    // Update paths for assets that might be referenced
    // Most blog posts use ../styles_page.css which should become ../css/premium-styles.css
    // Images and other assets should maintain their relative paths
    
    // This is handled by the template, so we just return content as-is
    // The template already has correct paths (../css/premium-styles.css, etc.)
    return content;
}

/**
 * Migrate a single blog post file
 */
function migrateBlogPost(filePath, dryRun = false) {
    try {
        console.log(`\nProcessing: ${filePath}`);
        
        // Read existing file
        const html = fs.readFileSync(filePath, 'utf8');
        
        // Parse HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Extract metadata and content
        const meta = extractMetaTags(document);
        const content = extractContent(document);
        
        // Determine category and relative URL
        const category = getCategoryFromPath(filePath);
        const relativeUrl = filePath.replace(/\\/g, '/');
        
        // Read template
        const templateHTML = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        
        // Build new HTML
        const newHTML = buildFromTemplate(templateHTML, meta, content, category, relativeUrl);
        
        // Update relative paths
        const finalHTML = updateRelativePaths(newHTML, path.dirname(filePath));
        
        if (dryRun) {
            console.log('✓ Would migrate (dry run)');
            console.log(`  Title: ${meta.title}`);
            console.log(`  Category: ${category}`);
            console.log(`  Content length: ${content.length} chars`);
        } else {
            // Write updated file
            fs.writeFileSync(filePath, finalHTML, 'utf8');
            console.log('✓ Migrated successfully');
            console.log(`  Title: ${meta.title}`);
            console.log(`  Category: ${category}`);
        }
        
        return { success: true, file: filePath };
    } catch (error) {
        console.error(`✗ Error migrating ${filePath}:`, error.message);
        return { success: false, file: filePath, error: error.message };
    }
}

/**
 * Migrate all files in a directory
 */
function migrateDirectory(dirPath, dryRun = false) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migrating directory: ${dirPath}`);
    console.log('='.repeat(60));
    
    if (!fs.existsSync(dirPath)) {
        console.error(`Directory not found: ${dirPath}`);
        return { success: 0, failed: 0 };
    }
    
    const files = fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(dirPath, f));
    
    console.log(`Found ${files.length} HTML files`);
    
    const results = files.map(file => migrateBlogPost(file, dryRun));
    
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\nDirectory summary: ${success} succeeded, ${failed} failed`);
    
    return { success, failed };
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error(`Template not found: ${TEMPLATE_PATH}`);
        console.error('Please ensure templates/blog-post-template.html exists');
        process.exit(1);
    }
    
    // Parse arguments
    const dryRun = args.includes('--dry-run');
    const filteredArgs = args.filter(arg => arg !== '--dry-run');
    
    if (dryRun) {
        console.log('DRY RUN MODE - No files will be modified\n');
    }
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    if (filteredArgs.length === 0 || filteredArgs[0] === '--all') {
        // Migrate all directories
        console.log('Migrating all blog directories...\n');
        
        for (const dir of BLOG_DIRECTORIES) {
            const { success, failed } = migrateDirectory(dir, dryRun);
            totalSuccess += success;
            totalFailed += failed;
        }
    } else if (filteredArgs.length === 1) {
        // Migrate single directory
        const dir = filteredArgs[0];
        const { success, failed } = migrateDirectory(dir, dryRun);
        totalSuccess += success;
        totalFailed += failed;
    } else if (filteredArgs.length === 2) {
        // Migrate single file
        const dir = filteredArgs[0];
        const file = filteredArgs[1];
        const filePath = path.join(dir, file);
        
        console.log('Migrating single file...\n');
        const result = migrateBlogPost(filePath, dryRun);
        totalSuccess = result.success ? 1 : 0;
        totalFailed = result.success ? 0 : 1;
    } else {
        console.error('Invalid arguments');
        console.error('Usage:');
        console.error('  node scripts/migrate-blog-posts.js [--dry-run] [directory] [file]');
        console.error('  node scripts/migrate-blog-posts.js [--dry-run] --all');
        process.exit(1);
    }
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total files migrated: ${totalSuccess}`);
    console.log(`Total files failed: ${totalFailed}`);
    
    if (dryRun) {
        console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
    }
    
    process.exit(totalFailed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    migrateBlogPost,
    migrateDirectory,
    extractMetaTags,
    extractContent,
    getCategoryFromPath
};
