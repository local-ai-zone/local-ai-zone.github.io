#!/usr/bin/env node

/**
 * Sitemap Monitoring Script
 * 
 * This script provides ongoing monitoring for the sitemap system:
 * - Monitors sitemap health and accessibility
 * - Tracks URL changes and additions
 * - Monitors search engine crawling behavior
 * - Provides alerts for issues
 * - Generates regular health reports
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

class SitemapMonitor {
    constructor() {
        this.config = {
            baseURL: 'https://local-ai-zone.github.io',
            sitemapURL: 'https://local-ai-zone.github.io/sitemap.xml',
            monitoringInterval: 24 * 60 * 60 * 1000, // 24 hours
            alertThresholds: {
                maxResponseTime: 5000, // 5 seconds
                minURLCount: 100,
                maxErrorRate: 0.05, // 5%
                maxFileSizeMB: 45 // 45MB (under 50MB limit)
            },
            reportRetentionDays: 30,
            reportsDir: 'monitoring-reports'
        };
        
        this.monitoringData = {
            timestamp: new Date().toISOString(),
            checks: [],
            alerts: [],
            statistics: {},
            trends: {}
        };
    }

    async startMonitoring() {
        console.log('📊 Starting sitemap monitoring...');
        console.log('=====================================');

        try {
            // Create reports directory
            if (!fs.existsSync(this.config.reportsDir)) {
                fs.mkdirSync(this.config.reportsDir, { recursive: true });
            }

            // Run initial health check
            await this.runHealthCheck();
            
            // Analyze trends if historical data exists
            await this.analyzeTrends();
            
            // Generate monitoring report
            await this.generateMonitoringReport();
            
            // Check for alerts
            await this.checkAlerts();
            
            console.log('✅ Monitoring cycle completed');
            
        } catch (error) {
            console.error('❌ Monitoring error:', error.message);
            this.addAlert('critical', `Monitoring system error: ${error.message}`);
        }
    }

    async runHealthCheck() {
        console.log('🔍 Running sitemap health check...');

        const checks = [
            this.checkSitemapAccessibility(),
            this.checkSitemapStructure(),
            this.checkURLHealth(),
            this.checkFileSize(),
            this.checkContentFreshness(),
            this.checkSearchEngineCompatibility()
        ];

        const results = await Promise.allSettled(checks);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                this.monitoringData.checks.push(result.value);
            } else {
                this.addAlert('error', `Health check ${index + 1} failed: ${result.reason}`);
            }
        });

        console.log(`✅ Health check completed: ${this.monitoringData.checks.length} checks run`);
    }

    async checkSitemapAccessibility() {
        const startTime = Date.now();
        
        try {
            // Check local file
            if (!fs.existsSync('sitemap.xml')) {
                throw new Error('Local sitemap.xml not found');
            }

            const stats = fs.statSync('sitemap.xml');
            const responseTime = Date.now() - startTime;

            return {
                name: 'Sitemap Accessibility',
                status: 'pass',
                responseTime,
                fileSize: stats.size,
                lastModified: stats.mtime.toISOString(),
                details: 'Sitemap file accessible locally'
            };

        } catch (error) {
            return {
                name: 'Sitemap Accessibility',
                status: 'fail',
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    async checkSitemapStructure() {
        try {
            const content = fs.readFileSync('sitemap.xml', 'utf8');
            
            const structureChecks = {
                hasXMLDeclaration: content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
                hasUrlset: content.includes('<urlset'),
                hasNamespace: content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
                hasValidClosing: content.includes('</urlset>'),
                noHashFragments: !content.includes('#'),
                httpsOnly: !content.includes('<loc>http://'),
                validXML: this.isValidXML(content)
            };

            const passedChecks = Object.values(structureChecks).filter(Boolean).length;
            const totalChecks = Object.keys(structureChecks).length;
            const score = (passedChecks / totalChecks) * 100;

            return {
                name: 'Sitemap Structure',
                status: score === 100 ? 'pass' : score >= 80 ? 'warning' : 'fail',
                score: `${score.toFixed(1)}%`,
                details: structureChecks,
                passedChecks,
                totalChecks
            };

        } catch (error) {
            return {
                name: 'Sitemap Structure',
                status: 'fail',
                error: error.message
            };
        }
    }

    async checkURLHealth() {
        try {
            const content = fs.readFileSync('sitemap.xml', 'utf8');
            const urlMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
            const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

            const urlStats = {
                totalURLs: urls.length,
                uniqueURLs: new Set(urls).size,
                duplicates: urls.length - new Set(urls).size,
                httpsURLs: urls.filter(url => url.startsWith('https://')).length,
                httpURLs: urls.filter(url => url.startsWith('http://')).length,
                invalidURLs: 0,
                urlTypes: {}
            };

            // Analyze URL types
            urls.forEach(url => {
                try {
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    
                    if (pathname.includes('/models/')) {
                        urlStats.urlTypes.models = (urlStats.urlTypes.models || 0) + 1;
                    } else if (pathname.includes('/guides/')) {
                        urlStats.urlTypes.guides = (urlStats.urlTypes.guides || 0) + 1;
                    } else if (pathname.includes('/cpu/')) {
                        urlStats.urlTypes.cpu = (urlStats.urlTypes.cpu || 0) + 1;
                    } else if (pathname.includes('/brands/')) {
                        urlStats.urlTypes.brands = (urlStats.urlTypes.brands || 0) + 1;
                    } else {
                        urlStats.urlTypes.other = (urlStats.urlTypes.other || 0) + 1;
                    }
                } catch (error) {
                    urlStats.invalidURLs++;
                }
            });

            const healthScore = ((urlStats.httpsURLs / urlStats.totalURLs) * 100).toFixed(1);

            return {
                name: 'URL Health',
                status: urlStats.invalidURLs === 0 && urlStats.httpURLs === 0 ? 'pass' : 'warning',
                statistics: urlStats,
                healthScore: `${healthScore}%`,
                details: `${urlStats.totalURLs} URLs analyzed, ${urlStats.invalidURLs} invalid, ${urlStats.duplicates} duplicates`
            };

        } catch (error) {
            return {
                name: 'URL Health',
                status: 'fail',
                error: error.message
            };
        }
    }

    async checkFileSize() {
        try {
            const stats = fs.statSync('sitemap.xml');
            const fileSizeMB = stats.size / (1024 * 1024);
            const maxSizeMB = this.config.alertThresholds.maxFileSizeMB;

            return {
                name: 'File Size',
                status: fileSizeMB <= maxSizeMB ? 'pass' : 'warning',
                fileSizeMB: fileSizeMB.toFixed(2),
                maxSizeMB,
                utilizationPercent: ((fileSizeMB / 50) * 100).toFixed(1), // 50MB is Google's limit
                details: `File size: ${fileSizeMB.toFixed(2)} MB (limit: 50 MB)`
            };

        } catch (error) {
            return {
                name: 'File Size',
                status: 'fail',
                error: error.message
            };
        }
    }

    async checkContentFreshness() {
        try {
            const content = fs.readFileSync('sitemap.xml', 'utf8');
            const lastmodMatches = content.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
            const dates = lastmodMatches.map(match => match.replace(/<\/?lastmod>/g, ''));

            if (dates.length === 0) {
                return {
                    name: 'Content Freshness',
                    status: 'warning',
                    details: 'No lastmod dates found'
                };
            }

            const now = new Date();
            const recentDates = dates.filter(date => {
                const dateObj = new Date(date);
                const daysDiff = (now - dateObj) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30; // Within last 30 days
            });

            const freshnessScore = (recentDates.length / dates.length) * 100;

            return {
                name: 'Content Freshness',
                status: freshnessScore >= 50 ? 'pass' : freshnessScore >= 25 ? 'warning' : 'fail',
                freshnessScore: `${freshnessScore.toFixed(1)}%`,
                recentUpdates: recentDates.length,
                totalDates: dates.length,
                details: `${recentDates.length} of ${dates.length} URLs updated in last 30 days`
            };

        } catch (error) {
            return {
                name: 'Content Freshness',
                status: 'fail',
                error: error.message
            };
        }
    }

    async checkSearchEngineCompatibility() {
        try {
            const content = fs.readFileSync('sitemap.xml', 'utf8');
            
            const compatibilityChecks = {
                validXMLDeclaration: content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
                correctNamespace: content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
                noHashFragments: !content.includes('#'),
                httpsOnly: !content.includes('<loc>http://'),
                validDateFormat: this.checkDateFormats(content),
                validPriorityValues: this.checkPriorityValues(content),
                validChangefreqValues: this.checkChangefreqValues(content),
                properEncoding: !content.includes('&') || content.includes('&amp;')
            };

            const passedChecks = Object.values(compatibilityChecks).filter(Boolean).length;
            const totalChecks = Object.keys(compatibilityChecks).length;
            const compatibilityScore = (passedChecks / totalChecks) * 100;

            return {
                name: 'Search Engine Compatibility',
                status: compatibilityScore === 100 ? 'pass' : compatibilityScore >= 90 ? 'warning' : 'fail',
                compatibilityScore: `${compatibilityScore.toFixed(1)}%`,
                checks: compatibilityChecks,
                passedChecks,
                totalChecks,
                details: `${passedChecks}/${totalChecks} compatibility checks passed`
            };

        } catch (error) {
            return {
                name: 'Search Engine Compatibility',
                status: 'fail',
                error: error.message
            };
        }
    }

    async analyzeTrends() {
        console.log('📈 Analyzing trends...');

        try {
            const reportFiles = fs.readdirSync(this.config.reportsDir)
                .filter(file => file.startsWith('monitoring-report-') && file.endsWith('.json'))
                .sort()
                .slice(-7); // Last 7 reports

            if (reportFiles.length < 2) {
                console.log('ℹ️  Insufficient historical data for trend analysis');
                return;
            }

            const historicalData = reportFiles.map(file => {
                try {
                    const filePath = path.join(this.config.reportsDir, file);
                    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
                } catch (error) {
                    return null;
                }
            }).filter(Boolean);

            // Analyze URL count trends
            const urlCounts = historicalData.map(data => {
                const urlHealthCheck = data.checks?.find(check => check.name === 'URL Health');
                return urlHealthCheck?.statistics?.totalURLs || 0;
            });

            // Analyze file size trends
            const fileSizes = historicalData.map(data => {
                const fileSizeCheck = data.checks?.find(check => check.name === 'File Size');
                return parseFloat(fileSizeCheck?.fileSizeMB || 0);
            });

            this.monitoringData.trends = {
                urlCountTrend: this.calculateTrend(urlCounts),
                fileSizeTrend: this.calculateTrend(fileSizes),
                historicalDataPoints: historicalData.length,
                analysisDate: new Date().toISOString()
            };

            console.log(`✅ Trend analysis completed with ${historicalData.length} data points`);

        } catch (error) {
            console.log(`⚠️  Trend analysis failed: ${error.message}`);
        }
    }

    calculateTrend(values) {
        if (values.length < 2) return 'insufficient_data';
        
        const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
        const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
        
        const change = ((recent - older) / older) * 100;
        
        if (Math.abs(change) < 5) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }

    async checkAlerts() {
        console.log('🚨 Checking for alerts...');

        const checks = this.monitoringData.checks;
        
        // Check for failed health checks
        const failedChecks = checks.filter(check => check.status === 'fail');
        failedChecks.forEach(check => {
            this.addAlert('error', `Health check failed: ${check.name} - ${check.error || 'Unknown error'}`);
        });

        // Check for warnings
        const warningChecks = checks.filter(check => check.status === 'warning');
        warningChecks.forEach(check => {
            this.addAlert('warning', `Health check warning: ${check.name} - ${check.details || 'Check details'}`);
        });

        // Check specific thresholds
        const urlHealthCheck = checks.find(check => check.name === 'URL Health');
        if (urlHealthCheck && urlHealthCheck.statistics) {
            const totalURLs = urlHealthCheck.statistics.totalURLs;
            if (totalURLs < this.config.alertThresholds.minURLCount) {
                this.addAlert('warning', `Low URL count: ${totalURLs} (minimum: ${this.config.alertThresholds.minURLCount})`);
            }
        }

        const fileSizeCheck = checks.find(check => check.name === 'File Size');
        if (fileSizeCheck && parseFloat(fileSizeCheck.fileSizeMB) > this.config.alertThresholds.maxFileSizeMB) {
            this.addAlert('warning', `Large file size: ${fileSizeCheck.fileSizeMB} MB (threshold: ${this.config.alertThresholds.maxFileSizeMB} MB)`);
        }

        // Check trends for concerning patterns
        if (this.monitoringData.trends.urlCountTrend === 'decreasing') {
            this.addAlert('info', 'URL count is decreasing - monitor for content issues');
        }

        if (this.monitoringData.trends.fileSizeTrend === 'increasing') {
            this.addAlert('info', 'File size is increasing - monitor for size limits');
        }

        console.log(`🚨 Alert check completed: ${this.monitoringData.alerts.length} alerts generated`);
    }

    addAlert(level, message) {
        this.monitoringData.alerts.push({
            level,
            message,
            timestamp: new Date().toISOString()
        });
    }

    async generateMonitoringReport() {
        console.log('📋 Generating monitoring report...');

        // Calculate overall health score
        const checks = this.monitoringData.checks;
        const passedChecks = checks.filter(check => check.status === 'pass').length;
        const totalChecks = checks.length;
        const healthScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

        // Compile statistics
        this.monitoringData.statistics = {
            overallHealthScore: healthScore.toFixed(1),
            totalChecks,
            passedChecks,
            failedChecks: checks.filter(check => check.status === 'fail').length,
            warningChecks: checks.filter(check => check.status === 'warning').length,
            alertCount: this.monitoringData.alerts.length,
            criticalAlerts: this.monitoringData.alerts.filter(alert => alert.level === 'critical').length,
            errorAlerts: this.monitoringData.alerts.filter(alert => alert.level === 'error').length,
            warningAlerts: this.monitoringData.alerts.filter(alert => alert.level === 'warning').length
        };

        // Generate report
        const report = {
            ...this.monitoringData,
            config: this.config,
            reportVersion: '1.0',
            generatedBy: 'Sitemap Monitor'
        };

        // Save report
        const reportFilename = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
        const reportPath = path.join(this.config.reportsDir, reportFilename);
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Report saved: ${reportPath}`);

        // Clean up old reports
        await this.cleanupOldReports();

        // Print summary
        this.printMonitoringSummary();
    }

    async cleanupOldReports() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.reportRetentionDays);

            const reportFiles = fs.readdirSync(this.config.reportsDir)
                .filter(file => file.startsWith('monitoring-report-') && file.endsWith('.json'));

            let deletedCount = 0;
            for (const file of reportFiles) {
                const filePath = path.join(this.config.reportsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`🗑️  Cleaned up ${deletedCount} old reports`);
            }

        } catch (error) {
            console.log(`⚠️  Report cleanup failed: ${error.message}`);
        }
    }

    printMonitoringSummary() {
        console.log('\n📊 MONITORING SUMMARY');
        console.log('=====================================');
        
        const stats = this.monitoringData.statistics;
        console.log(`Overall Health Score: ${stats.overallHealthScore}%`);
        console.log(`Health Checks: ${stats.passedChecks}/${stats.totalChecks} passed`);
        
        if (stats.failedChecks > 0) {
            console.log(`❌ Failed Checks: ${stats.failedChecks}`);
        }
        
        if (stats.warningChecks > 0) {
            console.log(`⚠️  Warning Checks: ${stats.warningChecks}`);
        }

        console.log(`🚨 Total Alerts: ${stats.alertCount}`);
        
        if (stats.criticalAlerts > 0) {
            console.log(`💥 Critical Alerts: ${stats.criticalAlerts}`);
        }
        
        if (stats.errorAlerts > 0) {
            console.log(`❌ Error Alerts: ${stats.errorAlerts}`);
        }
        
        if (stats.warningAlerts > 0) {
            console.log(`⚠️  Warning Alerts: ${stats.warningAlerts}`);
        }

        // Print alerts
        if (this.monitoringData.alerts.length > 0) {
            console.log('\n🚨 ACTIVE ALERTS:');
            this.monitoringData.alerts.forEach((alert, index) => {
                const icon = alert.level === 'critical' ? '💥' : 
                           alert.level === 'error' ? '❌' : 
                           alert.level === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${index + 1}. ${icon} ${alert.message}`);
            });
        }

        // Print trends
        if (this.monitoringData.trends.historicalDataPoints > 1) {
            console.log('\n📈 TRENDS:');
            console.log(`  URL Count: ${this.monitoringData.trends.urlCountTrend}`);
            console.log(`  File Size: ${this.monitoringData.trends.fileSizeTrend}`);
        }

        console.log('=====================================');
        
        const overallStatus = stats.criticalAlerts > 0 ? '💥 CRITICAL' :
                             stats.errorAlerts > 0 ? '❌ ERROR' :
                             stats.warningAlerts > 0 ? '⚠️  WARNING' : '✅ HEALTHY';
        
        console.log(`System Status: ${overallStatus}`);
    }

    // Utility methods
    isValidXML(content) {
        try {
            // Basic XML validation - check for balanced tags
            const openTags = (content.match(/<[^\/][^>]*>/g) || []).length;
            const closeTags = (content.match(/<\/[^>]*>/g) || []).length;
            const selfClosingTags = (content.match(/<[^>]*\/>/g) || []).length;
            
            return openTags === closeTags + selfClosingTags;
        } catch (error) {
            return false;
        }
    }

    checkDateFormats(content) {
        const dates = (content.match(/<lastmod>([^<]+)<\/lastmod>/g) || [])
            .map(match => match.replace(/<\/?lastmod>/g, ''));
        
        return dates.every(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
    }

    checkPriorityValues(content) {
        const priorities = (content.match(/<priority>([^<]+)<\/priority>/g) || [])
            .map(match => match.replace(/<\/?priority>/g, ''));
        
        return priorities.every(priority => {
            const num = parseFloat(priority);
            return !isNaN(num) && num >= 0.0 && num <= 1.0;
        });
    }

    checkChangefreqValues(content) {
        const changefreqs = (content.match(/<changefreq>([^<]+)<\/changefreq>/g) || [])
            .map(match => match.replace(/<\/?changefreq>/g, ''));
        
        const validValues = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
        return changefreqs.every(freq => validValues.includes(freq));
    }
}

// CLI execution
async function main() {
    const command = process.argv[2];
    const monitor = new SitemapMonitor();

    try {
        switch (command) {
            case 'run':
                await monitor.startMonitoring();
                break;
                
            case 'health':
                await monitor.runHealthCheck();
                monitor.printMonitoringSummary();
                break;
                
            default:
                console.log('Usage:');
                console.log('  node monitor-sitemap.js run     - Run full monitoring cycle');
                console.log('  node monitor-sitemap.js health  - Run health check only');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Monitoring error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SitemapMonitor };