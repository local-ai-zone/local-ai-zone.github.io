/**
 * Analytics Verification Script
 * Checks if analytics tracking is properly configured on blog posts
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

// Blog directories
const blogDirectories = ['guides', 'brands', 'cpu'];

// Results tracking
const results = {
    totalFiles: 0,
    filesWithAnalytics: 0,
    filesWithoutAnalytics: 0,
    analyticsProviders: {
        googleAnalytics: 0,
        googleTagManager: 0,
        plausible: 0,
        matomo: 0,
        other: 0
    },
    issues: []
};

/**
 * Detect analytics providers in HTML
 */
function detectAnalytics(html) {
    const providers = [];
    
    // Google Analytics (GA4)
    if (/gtag\(|googletagmanager\.com\/gtag\/js/.test(html)) {
        providers.push('Google Analytics (GA4)');
        results.analyticsProviders.googleAnalytics++;
    }
    
    // Google Tag Manager
    if (/googletagmanager\.com\/gtm\.js/.test(html)) {
        providers.push('Google Tag Manager');
        results.analyticsProviders.googleTagManager++;
    }
    
    // Plausible
    if (/plausible\.io\/js\//.test(html)) {
        providers.push('Plausible');
        results.analyticsProviders.plausible++;
    }
    
    // Matomo
    if (/matomo\.js|piwik\.js/.test(html)) {
        providers.push('Matomo');
        results.analyticsProviders.matomo++;
    }
    
    // Generic analytics detection
    if (/_gaq|_gat|analytics\.js|track\(/.test(html) && providers.length === 0) {
        providers.push('Other Analytics');
        results.analyticsProviders.other++;
    }
    
    return providers;
}

/**
 * Check for common analytics issues
 */
function checkAnalyticsIssues(filePath, html, providers) {
    const issues = [];
    
    // Check if analytics code is in the right place (should be in <head>)
    if (providers.length > 0) {
        const headContent = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        if (headContent) {
            const headHtml = headContent[1];
            
            // Check if GA4 is in head
            if (providers.includes('Google Analytics (GA4)') && !/gtag/.test(headHtml)) {
                issues.push('Google Analytics code should be in <head> section');
            }
            
            // Check if GTM is in head
            if (providers.includes('Google Tag Manager') && !/googletagmanager/.test(headHtml)) {
                issues.push('Google Tag Manager code should be in <head> section');
            }
        }
    }
    
    // Check for duplicate tracking codes
    const gaMatches = html.match(/gtag\(/g);
    if (gaMatches && gaMatches.length > 10) {
        issues.push('Possible duplicate Google Analytics tracking code');
    }
    
    // Check for missing noscript tags for GTM
    if (providers.includes('Google Tag Manager') && !/<noscript>[\s\S]*?googletagmanager/.test(html)) {
        issues.push('Missing <noscript> fallback for Google Tag Manager');
    }
    
    return issues;
}

/**
 * Verify analytics on a blog post
 */
function verifyBlogPost(filePath) {
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        results.totalFiles++;
        
        const providers = detectAnalytics(html);
        const issues = checkAnalyticsIssues(filePath, html, providers);
        
        if (providers.length > 0) {
            results.filesWithAnalytics++;
        } else {
            results.filesWithoutAnalytics++;
        }
        
        return {
            hasAnalytics: providers.length > 0,
            providers,
            issues
        };
    } catch (error) {
        return {
            hasAnalytics: false,
            providers: [],
            issues: [`Failed to read file: ${error.message}`]
        };
    }
}

/**
 * Verify analytics in a directory
 */
function verifyDirectory(directory) {
    console.log(`\n${colors.cyan}Checking ${directory}/ directory...${colors.reset}`);
    
    if (!fs.existsSync(directory)) {
        console.log(`${colors.red}✗ Directory not found: ${directory}${colors.reset}`);
        return;
    }
    
    const files = fs.readdirSync(directory).filter(f => f.endsWith('.html'));
    
    if (files.length === 0) {
        console.log(`${colors.yellow}⚠ No HTML files found${colors.reset}`);
        return;
    }
    
    console.log(`Found ${files.length} HTML files\n`);
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const verification = verifyBlogPost(filePath);
        
        if (verification.hasAnalytics) {
            console.log(`${colors.green}✓${colors.reset} ${file}`);
            console.log(`  ${colors.cyan}Providers: ${verification.providers.join(', ')}${colors.reset}`);
            
            if (verification.issues.length > 0) {
                verification.issues.forEach(issue => {
                    console.log(`  ${colors.yellow}⚠ ${issue}${colors.reset}`);
                    results.issues.push({ file: filePath, issue });
                });
            }
        } else {
            console.log(`${colors.red}✗${colors.reset} ${file}`);
            console.log(`  ${colors.red}No analytics tracking detected${colors.reset}`);
            results.issues.push({ file: filePath, issue: 'No analytics tracking' });
        }
    });
}

/**
 * Generate analytics report
 */
function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: results.totalFiles,
            filesWithAnalytics: results.filesWithAnalytics,
            filesWithoutAnalytics: results.filesWithoutAnalytics,
            coveragePercentage: Math.round((results.filesWithAnalytics / results.totalFiles) * 100),
            issuesCount: results.issues.length
        },
        analyticsProviders: results.analyticsProviders,
        issues: results.issues,
        status: results.filesWithoutAnalytics === 0 && results.issues.length === 0 ? 'PASS' : 'NEEDS_ATTENTION'
    };
    
    // Save JSON report
    fs.writeFileSync(
        'analytics-verification-report.json',
        JSON.stringify(report, null, 2)
    );
    
    // Generate markdown summary
    let markdown = '# Analytics Verification Report\n\n';
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Status:** ${report.status === 'PASS' ? '✅ PASS' : '⚠️ NEEDS ATTENTION'}\n\n`;
    
    markdown += '## Summary\n\n';
    markdown += `- Total Files: ${report.summary.totalFiles}\n`;
    markdown += `- Files with Analytics: ${report.summary.filesWithAnalytics}\n`;
    markdown += `- Files without Analytics: ${report.summary.filesWithoutAnalytics}\n`;
    markdown += `- Coverage: ${report.summary.coveragePercentage}%\n`;
    markdown += `- Issues: ${report.summary.issuesCount}\n\n`;
    
    markdown += '## Analytics Providers\n\n';
    markdown += `- Google Analytics (GA4): ${results.analyticsProviders.googleAnalytics} files\n`;
    markdown += `- Google Tag Manager: ${results.analyticsProviders.googleTagManager} files\n`;
    markdown += `- Plausible: ${results.analyticsProviders.plausible} files\n`;
    markdown += `- Matomo: ${results.analyticsProviders.matomo} files\n`;
    markdown += `- Other: ${results.analyticsProviders.other} files\n\n`;
    
    if (results.issues.length > 0) {
        markdown += '## Issues\n\n';
        results.issues.forEach(({ file, issue }) => {
            markdown += `- **${file}**: ${issue}\n`;
        });
        markdown += '\n';
    }
    
    markdown += '## Recommendations\n\n';
    
    if (results.filesWithoutAnalytics > 0) {
        markdown += '- Add analytics tracking to all blog posts\n';
        markdown += '- Ensure consistent tracking across all pages\n';
    }
    
    if (results.issues.length > 0) {
        markdown += '- Review and fix analytics implementation issues\n';
        markdown += '- Test analytics tracking in production\n';
    }
    
    if (report.status === 'PASS') {
        markdown += '- Analytics tracking is properly configured\n';
        markdown += '- Monitor analytics data regularly\n';
    }
    
    fs.writeFileSync('analytics-verification-summary.md', markdown);
    
    return report;
}

/**
 * Main verification function
 */
function runVerification() {
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Analytics Verification${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    
    // Verify blog directories
    blogDirectories.forEach(dir => {
        verifyDirectory(dir);
    });
    
    // Generate report
    console.log(`\n${colors.cyan}Generating report...${colors.reset}`);
    const report = generateReport();
    
    // Print summary
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Verification Summary${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`Total Files: ${report.summary.totalFiles}`);
    console.log(`With Analytics: ${colors.green}${report.summary.filesWithAnalytics}${colors.reset}`);
    console.log(`Without Analytics: ${report.summary.filesWithoutAnalytics > 0 ? colors.red : colors.green}${report.summary.filesWithoutAnalytics}${colors.reset}`);
    console.log(`Coverage: ${report.summary.coveragePercentage}%`);
    console.log(`Issues: ${report.summary.issuesCount > 0 ? colors.yellow : colors.green}${report.summary.issuesCount}${colors.reset}`);
    
    console.log(`\n${colors.cyan}Reports saved:${colors.reset}`);
    console.log(`  • analytics-verification-report.json`);
    console.log(`  • analytics-verification-summary.md`);
    
    if (report.status === 'PASS') {
        console.log(`\n${colors.green}✓ Analytics verification PASSED${colors.reset}\n`);
    } else {
        console.log(`\n${colors.yellow}⚠ Analytics needs attention - review the report${colors.reset}\n`);
    }
}

// Run verification
runVerification();
