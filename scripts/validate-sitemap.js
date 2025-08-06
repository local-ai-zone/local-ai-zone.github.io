#!/usr/bin/env node

/**
 * Sitemap Validation Script
 * 
 * This script validates the generated sitemap against Google's sitemap guidelines
 * and provides detailed reports on compliance and improvements.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

class SitemapValidator {
    constructor() {
        this.validationResults = {
            isValid: true,
            errors: [],
            warnings: [],
            statistics: {},
            compliance: {},
            recommendations: []
        };
    }

    async validateSitemap(sitemapPath = 'sitemap.xml') {
        console.log('🔍 Starting sitemap validation...');
        console.log('=====================================');

        try {
            // Check if sitemap exists
            if (!fs.existsSync(sitemapPath)) {
                this.addError(`Sitemap file not found: ${sitemapPath}`);
                return this.validationResults;
            }

            // Read and parse sitemap
            const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
            
            // Perform validation checks
            await this.validateXMLStructure(sitemapContent);
            await this.validateURLs(sitemapContent);
            await this.validateSEOCompliance(sitemapContent);
            await this.validateGoogleGuidelines(sitemapContent);
            await this.generateStatistics(sitemapContent);
            
            // Check for sitemap index
            if (fs.existsSync('sitemap-index.xml')) {
                await this.validateSitemapIndex('sitemap-index.xml');
            }

            // Generate final report
            this.generateFinalReport();

        } catch (error) {
            this.addError(`Critical validation error: ${error.message}`);
        }

        return this.validationResults;
    }

    async validateXMLStructure(content) {
        console.log('📄 Validating XML structure...');

        // Check XML declaration
        if (!content.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
            this.addError('Missing or incorrect XML declaration');
        }

        // Check root element
        if (!content.includes('<urlset') && !content.includes('<sitemapindex')) {
            this.addError('Missing required root element (urlset or sitemapindex)');
        }

        // Check namespace
        if (content.includes('<urlset') && !content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
            this.addError('Missing or incorrect XML namespace for urlset');
        }

        if (content.includes('<sitemapindex') && !content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
            this.addError('Missing or incorrect XML namespace for sitemapindex');
        }

        // Check for invalid characters
        const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
        if (invalidChars.test(content)) {
            this.addError('Contains invalid XML characters');
        }

        // Check for balanced tags
        const urlOpenTags = (content.match(/<url>/g) || []).length;
        const urlCloseTags = (content.match(/<\/url>/g) || []).length;
        if (urlOpenTags !== urlCloseTags) {
            this.addError('Unbalanced URL tags');
        }

        // Check file size
        const fileSizeBytes = Buffer.byteLength(content, 'utf8');
        const maxSizeBytes = 52428800; // 50MB
        if (fileSizeBytes > maxSizeBytes) {
            this.addError(`Sitemap exceeds maximum file size: ${fileSizeBytes} bytes (max: ${maxSizeBytes})`);
        } else {
            console.log(`✅ File size OK: ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);
        }

        console.log('✅ XML structure validation complete');
    }

    async validateURLs(content) {
        console.log('🔗 Validating URLs...');

        const urlMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
        const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

        console.log(`📊 Found ${urls.length} URLs to validate`);

        let validURLs = 0;
        let invalidURLs = 0;
        const urlIssues = [];

        for (const url of urls) {
            try {
                const urlObj = new URL(url);

                // Check protocol
                if (urlObj.protocol !== 'https:') {
                    urlIssues.push(`Non-HTTPS URL: ${url}`);
                    invalidURLs++;
                    continue;
                }

                // Check for hash fragments
                if (url.includes('#')) {
                    urlIssues.push(`URL contains hash fragment: ${url}`);
                    invalidURLs++;
                    continue;
                }

                // Check for proper encoding
                if (url !== encodeURI(decodeURI(url))) {
                    this.addWarning(`URL may have encoding issues: ${url}`);
                }

                validURLs++;

            } catch (error) {
                urlIssues.push(`Invalid URL format: ${url}`);
                invalidURLs++;
            }
        }

        // Report URL validation results
        console.log(`✅ Valid URLs: ${validURLs}`);
        if (invalidURLs > 0) {
            console.log(`❌ Invalid URLs: ${invalidURLs}`);
            urlIssues.forEach(issue => this.addError(issue));
        }

        // Check for duplicates
        const uniqueURLs = new Set(urls);
        if (uniqueURLs.size !== urls.length) {
            const duplicateCount = urls.length - uniqueURLs.size;
            this.addError(`Found ${duplicateCount} duplicate URLs`);
        } else {
            console.log('✅ No duplicate URLs found');
        }

        // Check URL count limits
        if (urls.length > 50000) {
            this.addError(`Too many URLs in single sitemap: ${urls.length} (max: 50,000)`);
        }

        console.log('✅ URL validation complete');
    }

    async validateSEOCompliance(content) {
        console.log('🎯 Validating SEO compliance...');

        // Check lastmod dates
        const lastmodMatches = content.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
        const dates = lastmodMatches.map(match => match.replace(/<\/?lastmod>/g, ''));

        let validDates = 0;
        let invalidDates = 0;

        for (const date of dates) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const dateObj = new Date(date);
                if (dateObj.toString() !== 'Invalid Date') {
                    validDates++;
                } else {
                    this.addError(`Invalid date value: ${date}`);
                    invalidDates++;
                }
            } else {
                this.addError(`Invalid date format: ${date} (expected YYYY-MM-DD)`);
                invalidDates++;
            }
        }

        console.log(`✅ Valid dates: ${validDates}`);
        if (invalidDates > 0) {
            console.log(`❌ Invalid dates: ${invalidDates}`);
        }

        // Check changefreq values
        const changefreqMatches = content.match(/<changefreq>([^<]+)<\/changefreq>/g) || [];
        const changefreqs = changefreqMatches.map(match => match.replace(/<\/?changefreq>/g, ''));
        const validChangefreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

        let validChangefreqCount = 0;
        let invalidChangefreqCount = 0;

        for (const changefreq of changefreqs) {
            if (validChangefreqs.includes(changefreq)) {
                validChangefreqCount++;
            } else {
                this.addError(`Invalid changefreq value: ${changefreq}`);
                invalidChangefreqCount++;
            }
        }

        console.log(`✅ Valid changefreq values: ${validChangefreqCount}`);
        if (invalidChangefreqCount > 0) {
            console.log(`❌ Invalid changefreq values: ${invalidChangefreqCount}`);
        }

        // Check priority values
        const priorityMatches = content.match(/<priority>([^<]+)<\/priority>/g) || [];
        const priorities = priorityMatches.map(match => match.replace(/<\/?priority>/g, ''));

        let validPriorityCount = 0;
        let invalidPriorityCount = 0;

        for (const priority of priorities) {
            const numPriority = parseFloat(priority);
            if (!isNaN(numPriority) && numPriority >= 0.0 && numPriority <= 1.0) {
                validPriorityCount++;
            } else {
                this.addError(`Invalid priority value: ${priority} (must be 0.0-1.0)`);
                invalidPriorityCount++;
            }
        }

        console.log(`✅ Valid priority values: ${validPriorityCount}`);
        if (invalidPriorityCount > 0) {
            console.log(`❌ Invalid priority values: ${invalidPriorityCount}`);
        }

        console.log('✅ SEO compliance validation complete');
    }

    async validateGoogleGuidelines(content) {
        console.log('🌐 Validating Google sitemap guidelines...');

        const compliance = {
            xmlDeclaration: content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
            properNamespace: content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
            httpsOnly: !content.includes('<loc>http://'),
            noHashFragments: !content.includes('#'),
            validFileSize: Buffer.byteLength(content, 'utf8') <= 52428800,
            urlCountLimit: (content.match(/<url>/g) || []).length <= 50000
        };

        this.validationResults.compliance = compliance;

        // Report compliance
        Object.entries(compliance).forEach(([check, passed]) => {
            const status = passed ? '✅' : '❌';
            const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
            console.log(`${status} ${checkName}: ${passed ? 'PASS' : 'FAIL'}`);
            
            if (!passed) {
                this.validationResults.isValid = false;
            }
        });

        // Additional Google-specific checks
        const urls = (content.match(/<loc>([^<]+)<\/loc>/g) || [])
            .map(match => match.replace(/<\/?loc>/g, ''));

        // Check for consistent domain
        const domains = new Set();
        urls.forEach(url => {
            try {
                const urlObj = new URL(url);
                domains.add(urlObj.hostname);
            } catch (error) {
                // Invalid URL already caught in URL validation
            }
        });

        if (domains.size > 1) {
            this.addWarning(`Multiple domains found in sitemap: ${Array.from(domains).join(', ')}`);
        }

        // Check for robots.txt compatibility
        this.addRecommendation('Ensure robots.txt includes sitemap location: Sitemap: https://local-ai-zone.github.io/sitemap.xml');

        console.log('✅ Google guidelines validation complete');
    }

    async validateSitemapIndex(indexPath) {
        console.log('📑 Validating sitemap index...');

        const indexContent = fs.readFileSync(indexPath, 'utf8');

        // Check XML structure
        if (!indexContent.includes('<sitemapindex')) {
            this.addError('Sitemap index missing sitemapindex root element');
        }

        // Check namespace
        if (!indexContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
            this.addError('Sitemap index missing correct namespace');
        }

        // Extract sitemap references
        const sitemapMatches = indexContent.match(/<loc>([^<]+)<\/loc>/g) || [];
        const sitemapURLs = sitemapMatches.map(match => match.replace(/<\/?loc>/g, ''));

        console.log(`📊 Found ${sitemapURLs.length} sitemap references in index`);

        // Validate each referenced sitemap exists
        for (const sitemapURL of sitemapURLs) {
            try {
                const urlObj = new URL(sitemapURL);
                const filename = path.basename(urlObj.pathname);
                
                if (!fs.existsSync(filename)) {
                    this.addError(`Referenced sitemap file not found: ${filename}`);
                }
            } catch (error) {
                this.addError(`Invalid sitemap URL in index: ${sitemapURL}`);
            }
        }

        console.log('✅ Sitemap index validation complete');
    }

    async generateStatistics(content) {
        console.log('📊 Generating statistics...');

        const urls = (content.match(/<loc>([^<]+)<\/loc>/g) || [])
            .map(match => match.replace(/<\/?loc>/g, ''));

        const statistics = {
            totalURLs: urls.length,
            fileSize: Buffer.byteLength(content, 'utf8'),
            fileSizeMB: (Buffer.byteLength(content, 'utf8') / 1024 / 1024).toFixed(2),
            urlsByType: {},
            priorityDistribution: {},
            changefreqDistribution: {}
        };

        // Analyze URL types
        urls.forEach(url => {
            if (url.includes('/models/')) {
                statistics.urlsByType.models = (statistics.urlsByType.models || 0) + 1;
            } else if (url.includes('/guides/')) {
                statistics.urlsByType.guides = (statistics.urlsByType.guides || 0) + 1;
            } else if (url.includes('/cpu/')) {
                statistics.urlsByType.cpu = (statistics.urlsByType.cpu || 0) + 1;
            } else if (url.includes('/brands/')) {
                statistics.urlsByType.brands = (statistics.urlsByType.brands || 0) + 1;
            } else {
                statistics.urlsByType.other = (statistics.urlsByType.other || 0) + 1;
            }
        });

        // Analyze priority distribution
        const priorities = (content.match(/<priority>([^<]+)<\/priority>/g) || [])
            .map(match => match.replace(/<\/?priority>/g, ''));
        
        priorities.forEach(priority => {
            statistics.priorityDistribution[priority] = (statistics.priorityDistribution[priority] || 0) + 1;
        });

        // Analyze changefreq distribution
        const changefreqs = (content.match(/<changefreq>([^<]+)<\/changefreq>/g) || [])
            .map(match => match.replace(/<\/?changefreq>/g, ''));
        
        changefreqs.forEach(changefreq => {
            statistics.changefreqDistribution[changefreq] = (statistics.changefreqDistribution[changefreq] || 0) + 1;
        });

        this.validationResults.statistics = statistics;

        // Display statistics
        console.log(`📊 Total URLs: ${statistics.totalURLs}`);
        console.log(`📊 File size: ${statistics.fileSizeMB} MB`);
        console.log('📊 URLs by type:');
        Object.entries(statistics.urlsByType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

        console.log('✅ Statistics generation complete');
    }

    generateFinalReport() {
        console.log('\n📋 VALIDATION REPORT');
        console.log('=====================================');

        // Overall status
        const status = this.validationResults.isValid ? '✅ VALID' : '❌ INVALID';
        console.log(`Overall Status: ${status}`);

        // Error summary
        if (this.validationResults.errors.length > 0) {
            console.log(`\n❌ Errors (${this.validationResults.errors.length}):`);
            this.validationResults.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        // Warning summary
        if (this.validationResults.warnings.length > 0) {
            console.log(`\n⚠️  Warnings (${this.validationResults.warnings.length}):`);
            this.validationResults.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }

        // Recommendations
        if (this.validationResults.recommendations.length > 0) {
            console.log(`\n💡 Recommendations (${this.validationResults.recommendations.length}):`);
            this.validationResults.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }

        // Compliance summary
        console.log('\n🌐 Google Guidelines Compliance:');
        Object.entries(this.validationResults.compliance).forEach(([check, passed]) => {
            const status = passed ? '✅' : '❌';
            const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
            console.log(`   ${status} ${checkName}`);
        });

        // Statistics summary
        const stats = this.validationResults.statistics;
        console.log('\n📊 Statistics Summary:');
        console.log(`   Total URLs: ${stats.totalURLs}`);
        console.log(`   File Size: ${stats.fileSizeMB} MB`);
        console.log(`   URL Types: ${Object.keys(stats.urlsByType).length}`);

        console.log('\n=====================================');
        
        if (this.validationResults.isValid) {
            console.log('🎉 Sitemap validation PASSED! Ready for search engine submission.');
        } else {
            console.log('❌ Sitemap validation FAILED. Please fix the errors above.');
        }
    }

    addError(message) {
        this.validationResults.errors.push(message);
        this.validationResults.isValid = false;
    }

    addWarning(message) {
        this.validationResults.warnings.push(message);
    }

    addRecommendation(message) {
        this.validationResults.recommendations.push(message);
    }

    async saveReport(outputPath = 'sitemap-validation-report.json') {
        const report = {
            ...this.validationResults,
            timestamp: new Date().toISOString(),
            validator: 'SEO Sitemap Validator v1.0'
        };

        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Validation report saved to: ${outputPath}`);
    }
}

// CLI execution
async function main() {
    const validator = new SitemapValidator();
    
    // Get sitemap path from command line arguments
    const sitemapPath = process.argv[2] || 'sitemap.xml';
    
    try {
        const results = await validator.validateSitemap(sitemapPath);
        await validator.saveReport();
        
        // Exit with appropriate code
        process.exit(results.isValid ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SitemapValidator };