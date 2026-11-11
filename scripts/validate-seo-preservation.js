const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

/**
 * SEO Validation Script for Blog Post Integration
 * Validates that all SEO elements are preserved in migrated blog posts
 */

const directories = ['guides', 'brands', 'cpu'];
const results = {
    totalFiles: 0,
    passed: 0,
    failed: 0,
    issues: []
};

// SEO validation checks
const seoChecks = {
    metaTags: {
        name: 'Meta Tags',
        required: ['description', 'keywords'],
        check: ($) => {
            const issues = [];
            const metaTags = {};
            
            $('meta[name]').each((i, el) => {
                const name = $(el).attr('name');
                const content = $(el).attr('content');
                metaTags[name] = content;
            });
            
            seoChecks.metaTags.required.forEach(tag => {
                if (!metaTags[tag] || metaTags[tag].trim() === '') {
                    issues.push(`Missing or empty meta tag: ${tag}`);
                }
            });
            
            return { passed: issues.length === 0, issues, data: metaTags };
        }
    },
    
    openGraph: {
        name: 'Open Graph Tags',
        required: ['og:title', 'og:description', 'og:type', 'og:url'],
        check: ($) => {
            const issues = [];
            const ogTags = {};
            
            $('meta[property^="og:"]').each((i, el) => {
                const property = $(el).attr('property');
                const content = $(el).attr('content');
                ogTags[property] = content;
            });
            
            seoChecks.openGraph.required.forEach(tag => {
                if (!ogTags[tag] || ogTags[tag].trim() === '') {
                    issues.push(`Missing or empty Open Graph tag: ${tag}`);
                }
            });
            
            return { passed: issues.length === 0, issues, data: ogTags };
        }
    },
    
    twitterCard: {
        name: 'Twitter Card Tags',
        required: ['twitter:card', 'twitter:title', 'twitter:description'],
        check: ($) => {
            const issues = [];
            const twitterTags = {};
            
            $('meta[name^="twitter:"]').each((i, el) => {
                const name = $(el).attr('name');
                const content = $(el).attr('content');
                twitterTags[name] = content;
            });
            
            seoChecks.twitterCard.required.forEach(tag => {
                if (!twitterTags[tag] || twitterTags[tag].trim() === '') {
                    issues.push(`Missing or empty Twitter Card tag: ${tag}`);
                }
            });
            
            return { passed: issues.length === 0, issues, data: twitterTags };
        }
    },
    
    structuredData: {
        name: 'Structured Data (JSON-LD)',
        check: ($) => {
            const issues = [];
            const jsonLdScripts = $('script[type="application/ld+json"]');
            
            if (jsonLdScripts.length === 0) {
                issues.push('No JSON-LD structured data found');
                return { passed: false, issues, data: null };
            }
            
            let validJsonLd = false;
            jsonLdScripts.each((i, el) => {
                try {
                    const jsonLd = JSON.parse($(el).html());
                    if (jsonLd['@type'] && jsonLd['@context']) {
                        validJsonLd = true;
                    }
                } catch (e) {
                    issues.push(`Invalid JSON-LD syntax: ${e.message}`);
                }
            });
            
            if (!validJsonLd && issues.length === 0) {
                issues.push('JSON-LD missing required @type or @context');
            }
            
            return { passed: validJsonLd, issues, data: jsonLdScripts.length };
        }
    },
    
    canonicalUrl: {
        name: 'Canonical URL',
        check: ($) => {
            const issues = [];
            const canonical = $('link[rel="canonical"]');
            
            if (canonical.length === 0) {
                issues.push('Missing canonical URL');
                return { passed: false, issues, data: null };
            }
            
            const href = canonical.attr('href');
            if (!href || href.trim() === '') {
                issues.push('Canonical URL is empty');
                return { passed: false, issues, data: null };
            }
            
            // Check if it's a valid URL format
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
                issues.push('Canonical URL should be absolute (include protocol)');
            }
            
            return { passed: issues.length === 0, issues, data: href };
        }
    },
    
    headingHierarchy: {
        name: 'Heading Hierarchy',
        check: ($) => {
            const issues = [];
            const headings = [];
            
            $('h1, h2, h3, h4, h5, h6').each((i, el) => {
                const level = parseInt(el.name.substring(1));
                const text = $(el).text().trim().substring(0, 50);
                headings.push({ level, text });
            });
            
            // Check for single h1
            const h1Count = headings.filter(h => h.level === 1).length;
            if (h1Count === 0) {
                issues.push('No h1 heading found');
            } else if (h1Count > 1) {
                issues.push(`Multiple h1 headings found (${h1Count})`);
            }
            
            // Check for proper hierarchy (no skipping levels)
            for (let i = 1; i < headings.length; i++) {
                const prev = headings[i - 1].level;
                const curr = headings[i].level;
                
                if (curr > prev + 1) {
                    issues.push(`Heading hierarchy skip: h${prev} to h${curr} (${headings[i].text})`);
                }
            }
            
            return { 
                passed: issues.length === 0, 
                issues, 
                data: { count: headings.length, h1Count, headings: headings.slice(0, 5) }
            };
        }
    },
    
    titleTag: {
        name: 'Title Tag',
        check: ($) => {
            const issues = [];
            const title = $('title').text();
            
            if (!title || title.trim() === '') {
                issues.push('Missing or empty title tag');
            } else if (title.length < 30) {
                issues.push(`Title too short (${title.length} chars, recommended 30-60)`);
            } else if (title.length > 60) {
                issues.push(`Title too long (${title.length} chars, recommended 30-60)`);
            }
            
            return { passed: issues.length === 0, issues, data: title };
        }
    }
};

function validateFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    
    const fileResults = {
        file: filePath,
        passed: true,
        checks: {}
    };
    
    // Run all SEO checks
    Object.keys(seoChecks).forEach(checkKey => {
        const check = seoChecks[checkKey];
        const result = check.check($);
        
        fileResults.checks[checkKey] = {
            name: check.name,
            passed: result.passed,
            issues: result.issues,
            data: result.data
        };
        
        if (!result.passed) {
            fileResults.passed = false;
        }
    });
    
    return fileResults;
}

function generateReport(allResults) {
    console.log('\n' + '='.repeat(80));
    console.log('SEO PRESERVATION VALIDATION REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total Files Checked: ${results.totalFiles}`);
    console.log(`Passed: ${results.passed} ✓`);
    console.log(`Failed: ${results.failed} ✗`);
    console.log(`Success Rate: ${((results.passed / results.totalFiles) * 100).toFixed(1)}%\n`);
    
    // Summary by check type
    console.log('SUMMARY BY CHECK TYPE:');
    console.log('-'.repeat(80));
    
    const checkSummary = {};
    Object.keys(seoChecks).forEach(checkKey => {
        checkSummary[checkKey] = { passed: 0, failed: 0 };
    });
    
    allResults.forEach(fileResult => {
        Object.keys(fileResult.checks).forEach(checkKey => {
            if (fileResult.checks[checkKey].passed) {
                checkSummary[checkKey].passed++;
            } else {
                checkSummary[checkKey].failed++;
            }
        });
    });
    
    Object.keys(checkSummary).forEach(checkKey => {
        const check = seoChecks[checkKey];
        const summary = checkSummary[checkKey];
        const total = summary.passed + summary.failed;
        const rate = ((summary.passed / total) * 100).toFixed(1);
        
        console.log(`${check.name}: ${summary.passed}/${total} (${rate}%) ${summary.failed === 0 ? '✓' : '✗'}`);
    });
    
    // Failed files details
    if (results.failed > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('FAILED FILES DETAILS:');
        console.log('='.repeat(80) + '\n');
        
        allResults.filter(r => !r.passed).forEach(fileResult => {
            console.log(`\n📄 ${fileResult.file}`);
            console.log('-'.repeat(80));
            
            Object.keys(fileResult.checks).forEach(checkKey => {
                const check = fileResult.checks[checkKey];
                if (!check.passed) {
                    console.log(`\n  ✗ ${check.name}:`);
                    check.issues.forEach(issue => {
                        console.log(`    - ${issue}`);
                    });
                }
            });
        });
    }
    
    // Sample of passed files
    const passedFiles = allResults.filter(r => r.passed);
    if (passedFiles.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('SAMPLE PASSED FILES (showing first 5):');
        console.log('='.repeat(80) + '\n');
        
        passedFiles.slice(0, 5).forEach(fileResult => {
            console.log(`✓ ${fileResult.file}`);
        });
        
        if (passedFiles.length > 5) {
            console.log(`  ... and ${passedFiles.length - 5} more`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS:');
    console.log('='.repeat(80) + '\n');
    
    if (results.failed === 0) {
        console.log('✓ All SEO elements are properly preserved!');
        console.log('✓ Meta tags, Open Graph, Twitter Cards, and structured data are present.');
        console.log('✓ Canonical URLs are correctly set.');
        console.log('✓ Heading hierarchy follows SEO best practices.');
    } else {
        console.log('⚠ Some files have SEO issues that need attention:');
        console.log('  1. Review failed files and add missing meta tags');
        console.log('  2. Ensure all Open Graph and Twitter Card tags are present');
        console.log('  3. Validate JSON-LD structured data syntax');
        console.log('  4. Fix heading hierarchy issues (single h1, no level skipping)');
        console.log('  5. Verify canonical URLs are absolute and correct');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
}

function saveDetailedReport(allResults) {
    const reportPath = 'seo-validation-report.json';
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: results.totalFiles,
            passed: results.passed,
            failed: results.failed,
            successRate: ((results.passed / results.totalFiles) * 100).toFixed(1) + '%'
        },
        files: allResults
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Detailed report saved to: ${reportPath}\n`);
}

// Main execution
console.log('Starting SEO preservation validation...\n');

const allResults = [];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`⚠ Directory not found: ${dir}`);
        return;
    }
    
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(dir, f));
    
    console.log(`Checking ${files.length} files in ${dir}/...`);
    
    files.forEach(filePath => {
        results.totalFiles++;
        const fileResult = validateFile(filePath);
        allResults.push(fileResult);
        
        if (fileResult.passed) {
            results.passed++;
        } else {
            results.failed++;
        }
    });
});

// Generate and display report
generateReport(allResults);
saveDetailedReport(allResults);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
