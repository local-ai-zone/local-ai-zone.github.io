/**
 * Production Deployment Validation Script
 * Validates blog post deployment and checks for common issues
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Blog directories to check
const blogDirectories = ['guides', 'brands', 'cpu'];

// Results tracking
const results = {
    totalFiles: 0,
    validFiles: 0,
    errors: [],
    warnings: [],
    brokenLinks: [],
    missingAssets: []
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

/**
 * Extract links from HTML content
 */
function extractLinks(html) {
    const linkRegex = /(?:href|src)=["']([^"']+)["']/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
        links.push(match[1]);
    }
    
    return links;
}

/**
 * Validate internal links in a file
 */
function validateInternalLinks(filePath, html) {
    const links = extractLinks(html);
    const fileDir = path.dirname(filePath);
    const brokenLinks = [];
    
    links.forEach(link => {
        // Skip external links, anchors, and data URIs
        if (link.startsWith('http') || link.startsWith('#') || link.startsWith('data:') || link.startsWith('mailto:')) {
            return;
        }
        
        // Resolve relative path
        const absolutePath = path.resolve(fileDir, link);
        
        // Check if file exists
        if (!fileExists(absolutePath)) {
            brokenLinks.push({
                file: filePath,
                link: link,
                resolvedPath: absolutePath
            });
        }
    });
    
    return brokenLinks;
}

/**
 * Validate required assets exist
 */
function validateAssets() {
    const requiredAssets = [
        'css/premium-styles.css',
        'css/blog-article.css',
        'css/blog-article.min.css',
        'logo.svg',
        'data/blog-articles.json'
    ];
    
    const missing = [];
    
    requiredAssets.forEach(asset => {
        if (!fileExists(asset)) {
            missing.push(asset);
        }
    });
    
    return missing;
}

/**
 * Validate blog post structure
 */
function validateBlogPost(filePath) {
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        const errors = [];
        
        // Check for required elements
        const requiredElements = [
            { pattern: /<article[^>]*class="blog-article"/, name: 'Article container' },
            { pattern: /<nav[^>]*class="breadcrumb-nav"/, name: 'Breadcrumb navigation' },
            { pattern: /<header[^>]*class="article-header"/, name: 'Article header' },
            { pattern: /<div[^>]*class="article-content"/, name: 'Article content' },
            { pattern: /href="\.\.\/css\/premium-styles\.css"/, name: 'Premium styles link' },
            { pattern: /href="\.\.\/css\/blog-article\.css"/, name: 'Blog article styles link' }
        ];
        
        requiredElements.forEach(({ pattern, name }) => {
            if (!pattern.test(html)) {
                errors.push(`Missing ${name}`);
            }
        });
        
        // Check for SEO meta tags
        if (!/<meta name="description"/.test(html)) {
            errors.push('Missing meta description');
        }
        
        // Check for proper heading hierarchy
        if (!/<h1[^>]*>/.test(html)) {
            errors.push('Missing h1 heading');
        }
        
        // Validate internal links
        const brokenLinks = validateInternalLinks(filePath, html);
        
        return {
            valid: errors.length === 0,
            errors,
            brokenLinks
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`Failed to read file: ${error.message}`],
            brokenLinks: []
        };
    }
}

/**
 * Validate all blog posts in a directory
 */
function validateDirectory(directory) {
    console.log(`\n${colors.cyan}Validating ${directory}/ directory...${colors.reset}`);
    
    if (!fs.existsSync(directory)) {
        console.log(`${colors.red}✗ Directory not found: ${directory}${colors.reset}`);
        results.errors.push(`Directory not found: ${directory}`);
        return;
    }
    
    const files = fs.readdirSync(directory).filter(f => f.endsWith('.html'));
    
    if (files.length === 0) {
        console.log(`${colors.yellow}⚠ No HTML files found in ${directory}${colors.reset}`);
        results.warnings.push(`No HTML files in ${directory}`);
        return;
    }
    
    console.log(`Found ${files.length} HTML files`);
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        results.totalFiles++;
        
        const validation = validateBlogPost(filePath);
        
        if (validation.valid) {
            results.validFiles++;
            console.log(`${colors.green}✓${colors.reset} ${file}`);
        } else {
            console.log(`${colors.red}✗${colors.reset} ${file}`);
            validation.errors.forEach(error => {
                console.log(`  ${colors.red}• ${error}${colors.reset}`);
                results.errors.push(`${filePath}: ${error}`);
            });
        }
        
        if (validation.brokenLinks.length > 0) {
            validation.brokenLinks.forEach(broken => {
                console.log(`  ${colors.yellow}⚠ Broken link: ${broken.link}${colors.reset}`);
                results.brokenLinks.push(broken);
            });
        }
    });
}

/**
 * Generate deployment report
 */
function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: results.totalFiles,
            validFiles: results.validFiles,
            invalidFiles: results.totalFiles - results.validFiles,
            errorCount: results.errors.length,
            warningCount: results.warnings.length,
            brokenLinksCount: results.brokenLinks.length,
            missingAssetsCount: results.missingAssets.length
        },
        errors: results.errors,
        warnings: results.warnings,
        brokenLinks: results.brokenLinks,
        missingAssets: results.missingAssets,
        status: results.errors.length === 0 && results.brokenLinks.length === 0 ? 'PASS' : 'FAIL'
    };
    
    // Save JSON report
    fs.writeFileSync(
        'deployment-validation-report.json',
        JSON.stringify(report, null, 2)
    );
    
    // Generate markdown summary
    let markdown = '# Deployment Validation Report\n\n';
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Status:** ${report.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n\n`;
    
    markdown += '## Summary\n\n';
    markdown += `- Total Files: ${report.summary.totalFiles}\n`;
    markdown += `- Valid Files: ${report.summary.validFiles}\n`;
    markdown += `- Invalid Files: ${report.summary.invalidFiles}\n`;
    markdown += `- Errors: ${report.summary.errorCount}\n`;
    markdown += `- Warnings: ${report.summary.warningCount}\n`;
    markdown += `- Broken Links: ${report.summary.brokenLinksCount}\n`;
    markdown += `- Missing Assets: ${report.summary.missingAssetsCount}\n\n`;
    
    if (results.missingAssets.length > 0) {
        markdown += '## Missing Assets\n\n';
        results.missingAssets.forEach(asset => {
            markdown += `- ${asset}\n`;
        });
        markdown += '\n';
    }
    
    if (results.errors.length > 0) {
        markdown += '## Errors\n\n';
        results.errors.forEach(error => {
            markdown += `- ${error}\n`;
        });
        markdown += '\n';
    }
    
    if (results.brokenLinks.length > 0) {
        markdown += '## Broken Links\n\n';
        results.brokenLinks.forEach(broken => {
            markdown += `- **File:** ${broken.file}\n`;
            markdown += `  - **Link:** ${broken.link}\n`;
            markdown += `  - **Resolved Path:** ${broken.resolvedPath}\n\n`;
        });
    }
    
    if (results.warnings.length > 0) {
        markdown += '## Warnings\n\n';
        results.warnings.forEach(warning => {
            markdown += `- ${warning}\n`;
        });
        markdown += '\n';
    }
    
    fs.writeFileSync('deployment-validation-summary.md', markdown);
    
    return report;
}

/**
 * Main validation function
 */
function runValidation() {
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Blog Post Deployment Validation${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    
    // Validate required assets
    console.log(`\n${colors.cyan}Checking required assets...${colors.reset}`);
    results.missingAssets = validateAssets();
    
    if (results.missingAssets.length === 0) {
        console.log(`${colors.green}✓ All required assets found${colors.reset}`);
    } else {
        console.log(`${colors.red}✗ Missing ${results.missingAssets.length} required assets${colors.reset}`);
        results.missingAssets.forEach(asset => {
            console.log(`  ${colors.red}• ${asset}${colors.reset}`);
        });
    }
    
    // Validate blog directories
    blogDirectories.forEach(dir => {
        validateDirectory(dir);
    });
    
    // Generate report
    console.log(`\n${colors.cyan}Generating report...${colors.reset}`);
    const report = generateReport();
    
    // Print summary
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Validation Summary${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`Total Files: ${report.summary.totalFiles}`);
    console.log(`Valid Files: ${colors.green}${report.summary.validFiles}${colors.reset}`);
    console.log(`Invalid Files: ${report.summary.invalidFiles > 0 ? colors.red : colors.green}${report.summary.invalidFiles}${colors.reset}`);
    console.log(`Errors: ${report.summary.errorCount > 0 ? colors.red : colors.green}${report.summary.errorCount}${colors.reset}`);
    console.log(`Warnings: ${report.summary.warningCount > 0 ? colors.yellow : colors.green}${report.summary.warningCount}${colors.reset}`);
    console.log(`Broken Links: ${report.summary.brokenLinksCount > 0 ? colors.red : colors.green}${report.summary.brokenLinksCount}${colors.reset}`);
    console.log(`Missing Assets: ${report.summary.missingAssetsCount > 0 ? colors.red : colors.green}${report.summary.missingAssetsCount}${colors.reset}`);
    
    console.log(`\n${colors.cyan}Reports saved:${colors.reset}`);
    console.log(`  • deployment-validation-report.json`);
    console.log(`  • deployment-validation-summary.md`);
    
    if (report.status === 'PASS') {
        console.log(`\n${colors.green}✓ Deployment validation PASSED${colors.reset}`);
        console.log(`${colors.green}  All blog posts are ready for production deployment${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}✗ Deployment validation FAILED${colors.reset}`);
        console.log(`${colors.red}  Please fix the errors before deploying to production${colors.reset}\n`);
        process.exit(1);
    }
}

// Run validation
runValidation();
