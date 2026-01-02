/**
 * Production Monitoring Script
 * Monitors blog posts for 404 errors, broken links, and performance issues
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Configuration
const config = {
    // Set your production domain here
    productionDomain: process.env.PRODUCTION_DOMAIN || 'https://your-domain.com',
    timeout: 10000, // 10 seconds
    userAgent: 'Mozilla/5.0 (compatible; BlogMonitor/1.0)'
};

// Results tracking
const results = {
    totalUrls: 0,
    successfulUrls: 0,
    failedUrls: 0,
    errors: [],
    warnings: [],
    performanceIssues: [],
    urlStatus: []
};

/**
 * Get all blog post URLs
 */
function getBlogPostUrls() {
    const urls = [];
    const directories = ['guides', 'brands', 'cpu'];
    
    directories.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
            files.forEach(file => {
                urls.push(`/${dir}/${file}`);
            });
        }
    });
    
    return urls;
}

/**
 * Check URL status
 */
function checkUrl(url) {
    return new Promise((resolve) => {
        const fullUrl = `${config.productionDomain}${url}`;
        const urlObj = new URL(fullUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const startTime = Date.now();
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'HEAD',
            headers: {
                'User-Agent': config.userAgent
            },
            timeout: config.timeout
        };
        
        const req = protocol.request(options, (res) => {
            const loadTime = Date.now() - startTime;
            
            resolve({
                url,
                statusCode: res.statusCode,
                loadTime,
                success: res.statusCode >= 200 && res.statusCode < 400,
                headers: res.headers
            });
        });
        
        req.on('error', (error) => {
            resolve({
                url,
                statusCode: 0,
                loadTime: Date.now() - startTime,
                success: false,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                url,
                statusCode: 0,
                loadTime: config.timeout,
                success: false,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

/**
 * Monitor URLs
 */
async function monitorUrls(urls) {
    console.log(`\n${colors.cyan}Monitoring ${urls.length} blog post URLs...${colors.reset}\n`);
    
    for (const url of urls) {
        results.totalUrls++;
        
        const result = await checkUrl(url);
        results.urlStatus.push(result);
        
        if (result.success) {
            results.successfulUrls++;
            console.log(`${colors.green}✓${colors.reset} ${url} (${result.statusCode}) - ${result.loadTime}ms`);
            
            // Check for performance issues
            if (result.loadTime > 2000) {
                const warning = `Slow load time: ${url} (${result.loadTime}ms)`;
                results.performanceIssues.push(warning);
                console.log(`  ${colors.yellow}⚠ Slow load time (${result.loadTime}ms)${colors.reset}`);
            }
        } else {
            results.failedUrls++;
            console.log(`${colors.red}✗${colors.reset} ${url} (${result.statusCode || 'ERROR'})`);
            
            if (result.error) {
                console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
                results.errors.push(`${url}: ${result.error}`);
            } else if (result.statusCode === 404) {
                results.errors.push(`404 Not Found: ${url}`);
            } else if (result.statusCode >= 500) {
                results.errors.push(`Server Error (${result.statusCode}): ${url}`);
            } else {
                results.errors.push(`Failed (${result.statusCode}): ${url}`);
            }
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * Generate monitoring report
 */
function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        domain: config.productionDomain,
        summary: {
            totalUrls: results.totalUrls,
            successfulUrls: results.successfulUrls,
            failedUrls: results.failedUrls,
            errorCount: results.errors.length,
            warningCount: results.warnings.length,
            performanceIssuesCount: results.performanceIssues.length,
            averageLoadTime: results.urlStatus.reduce((sum, r) => sum + r.loadTime, 0) / results.urlStatus.length,
            maxLoadTime: Math.max(...results.urlStatus.map(r => r.loadTime)),
            minLoadTime: Math.min(...results.urlStatus.map(r => r.loadTime))
        },
        urlStatus: results.urlStatus,
        errors: results.errors,
        warnings: results.warnings,
        performanceIssues: results.performanceIssues,
        status: results.failedUrls === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    };
    
    // Save JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportFilename = `monitoring-reports/monitoring-report-${timestamp}.json`;
    
    // Ensure directory exists
    if (!fs.existsSync('monitoring-reports')) {
        fs.mkdirSync('monitoring-reports');
    }
    
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    
    // Generate markdown summary
    let markdown = '# Production Monitoring Report\n\n';
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Domain:** ${config.productionDomain}\n\n`;
    markdown += `**Status:** ${report.status === 'HEALTHY' ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}\n\n`;
    
    markdown += '## Summary\n\n';
    markdown += `- Total URLs Checked: ${report.summary.totalUrls}\n`;
    markdown += `- Successful: ${report.summary.successfulUrls}\n`;
    markdown += `- Failed: ${report.summary.failedUrls}\n`;
    markdown += `- Errors: ${report.summary.errorCount}\n`;
    markdown += `- Performance Issues: ${report.summary.performanceIssuesCount}\n`;
    markdown += `- Average Load Time: ${Math.round(report.summary.averageLoadTime)}ms\n`;
    markdown += `- Max Load Time: ${Math.round(report.summary.maxLoadTime)}ms\n`;
    markdown += `- Min Load Time: ${Math.round(report.summary.minLoadTime)}ms\n\n`;
    
    if (results.errors.length > 0) {
        markdown += '## Errors\n\n';
        results.errors.forEach(error => {
            markdown += `- ${error}\n`;
        });
        markdown += '\n';
    }
    
    if (results.performanceIssues.length > 0) {
        markdown += '## Performance Issues\n\n';
        results.performanceIssues.forEach(issue => {
            markdown += `- ${issue}\n`;
        });
        markdown += '\n';
    }
    
    if (results.warnings.length > 0) {
        markdown += '## Warnings\n\n';
        results.warnings.forEach(warning => {
            markdown += `- ${warning}\n`;
        });
        markdown += '\n';
    }
    
    markdown += '## Recommendations\n\n';
    
    if (results.failedUrls > 0) {
        markdown += '- **Fix 404 Errors:** Update sitemap.xml and check for broken links\n';
        markdown += '- **Check Server Logs:** Investigate server errors and failed requests\n';
    }
    
    if (results.performanceIssues.length > 0) {
        markdown += '- **Optimize Performance:** Review slow-loading pages and optimize assets\n';
        markdown += '- **Enable Caching:** Ensure proper cache headers are set\n';
        markdown += '- **Use CDN:** Consider using a CDN for static assets\n';
    }
    
    if (results.failedUrls === 0 && results.performanceIssues.length === 0) {
        markdown += '- All blog posts are loading successfully\n';
        markdown += '- Performance is within acceptable limits\n';
        markdown += '- Continue regular monitoring\n';
    }
    
    fs.writeFileSync('production-monitoring-summary.md', markdown);
    
    return report;
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Production Blog Post Monitoring${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`\n${colors.cyan}Domain: ${config.productionDomain}${colors.reset}`);
    
    // Check if production domain is configured
    if (config.productionDomain === 'https://your-domain.com') {
        console.log(`\n${colors.yellow}⚠ Warning: Production domain not configured${colors.reset}`);
        console.log(`${colors.yellow}  Set PRODUCTION_DOMAIN environment variable or update config${colors.reset}`);
        console.log(`${colors.yellow}  Example: PRODUCTION_DOMAIN=https://example.com node scripts/monitor-production.js${colors.reset}\n`);
        
        // Run in local mode
        console.log(`${colors.cyan}Running in LOCAL VALIDATION mode...${colors.reset}\n`);
        const urls = getBlogPostUrls();
        console.log(`Found ${urls.length} blog post URLs to validate\n`);
        
        urls.forEach(url => {
            console.log(`  • ${url}`);
        });
        
        console.log(`\n${colors.yellow}To monitor production, set PRODUCTION_DOMAIN and run again${colors.reset}\n`);
        return;
    }
    
    // Get blog post URLs
    const urls = getBlogPostUrls();
    
    if (urls.length === 0) {
        console.log(`\n${colors.red}✗ No blog post URLs found${colors.reset}\n`);
        return;
    }
    
    // Monitor URLs
    await monitorUrls(urls);
    
    // Generate report
    console.log(`\n${colors.cyan}Generating report...${colors.reset}`);
    const report = generateReport();
    
    // Print summary
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Monitoring Summary${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`Total URLs: ${report.summary.totalUrls}`);
    console.log(`Successful: ${colors.green}${report.summary.successfulUrls}${colors.reset}`);
    console.log(`Failed: ${report.summary.failedUrls > 0 ? colors.red : colors.green}${report.summary.failedUrls}${colors.reset}`);
    console.log(`Errors: ${report.summary.errorCount > 0 ? colors.red : colors.green}${report.summary.errorCount}${colors.reset}`);
    console.log(`Performance Issues: ${report.summary.performanceIssuesCount > 0 ? colors.yellow : colors.green}${report.summary.performanceIssuesCount}${colors.reset}`);
    console.log(`Average Load Time: ${Math.round(report.summary.averageLoadTime)}ms`);
    
    console.log(`\n${colors.cyan}Reports saved:${colors.reset}`);
    console.log(`  • monitoring-reports/monitoring-report-*.json`);
    console.log(`  • production-monitoring-summary.md`);
    
    if (report.status === 'HEALTHY') {
        console.log(`\n${colors.green}✓ All blog posts are healthy${colors.reset}\n`);
    } else {
        console.log(`\n${colors.yellow}⚠ Issues detected - review the report for details${colors.reset}\n`);
    }
}

// Run monitoring
runMonitoring().catch(error => {
    console.error(`${colors.red}✗ Monitoring failed: ${error.message}${colors.reset}`);
    process.exit(1);
});
