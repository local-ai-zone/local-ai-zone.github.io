# SEO Sitemap System Documentation

## Overview

The SEO Sitemap System is a comprehensive solution for generating, validating, and monitoring XML sitemaps that comply with Google's guidelines and maximize search engine optimization effectiveness.

## System Components

### 1. Sitemap Generator (`scripts/generate-seo.js`)
The core component that generates optimized XML sitemaps.

**Features:**
- Eliminates hash-based URLs in favor of proper HTML pages
- Scans all content directories (guides/, cpu/, brands/, models/)
- Implements duplicate URL detection and resolution
- Applies proper SEO metadata (priority, changefreq, lastmod)
- Provides comprehensive error handling and logging

**Usage:**
```bash
node scripts/generate-seo.js
```

**Output Files:**
- `sitemap.xml` - Main sitemap file
- `sitemap-index.xml` - Index file (if multiple sitemaps needed)
- `sitemap-generation-report.json` - Detailed generation report

### 2. Sitemap Validator (`scripts/validate-sitemap.js`)
Validates generated sitemaps against Google's guidelines.

**Features:**
- XML structure validation
- URL format and accessibility checking
- SEO compliance verification
- Google guidelines compliance checking
- Detailed validation reporting

**Usage:**
```bash
# Validate default sitemap.xml
node scripts/validate-sitemap.js

# Validate specific sitemap file
node scripts/validate-sitemap.js path/to/sitemap.xml
```

**Output:**
- Console validation report
- `sitemap-validation-report.json` - Detailed validation results

### 3. Deployment System (`scripts/deploy-sitemap.js`)
Handles safe deployment with backup and rollback capabilities.

**Features:**
- Automatic backup of existing sitemap
- Validation-gated deployment
- Automatic rollback on failure
- Manual rollback capability
- Comprehensive deployment reporting

**Usage:**
```bash
# Deploy new sitemap
node scripts/deploy-sitemap.js deploy

# Rollback to previous version
node scripts/deploy-sitemap.js rollback <deployment-id>

# List available backups
node scripts/deploy-sitemap.js list-backups
```

### 4. Monitoring System (`scripts/monitor-sitemap.js`)
Provides ongoing health monitoring and alerting.

**Features:**
- Automated health checks
- Trend analysis
- Configurable alerting
- Historical reporting
- Performance monitoring

**Usage:**
```bash
# Run full monitoring cycle
node scripts/monitor-sitemap.js run

# Run health check only
node scripts/monitor-sitemap.js health
```

## Configuration

### Default Configuration
```javascript
const config = {
    baseURL: 'https://local-ai-zone.github.io',
    contentDirectories: ['guides', 'cpu', 'brands'],
    modelsJsonPath: 'gguf_models.json',
    outputFiles: {
        sitemap: 'sitemap.xml',
        sitemapIndex: 'sitemap-index.xml',
        report: 'sitemap-generation-report.json'
    },
    limits: {
        maxURLsPerSitemap: 50000,
        maxFileSize: 52428800, // 50MB
        processingTimeout: 30000 // 30 seconds
    },
    priorities: {
        main: 1.0,
        models: 0.8,
        guides: 0.7,
        cpu: 0.6,
        brands: 0.6
    }
};
```

### SEO Metadata Rules

#### Priority Values
- **Homepage**: 1.0
- **Model Pages**: 0.8
- **Guide Pages**: 0.7
- **CPU Pages**: 0.6
- **Brand Pages**: 0.6

#### Change Frequency
- **Homepage**: daily
- **Model Pages**: weekly
- **Guide Pages**: monthly
- **CPU Pages**: monthly
- **Brand Pages**: monthly

## Testing

### Running Tests
```bash
# Run all sitemap tests
npx vitest run tests/sitemap.test.js

# Run tests with coverage
npx vitest run tests/sitemap.test.js --coverage

# Run tests in watch mode
npx vitest tests/sitemap.test.js
```

### Test Coverage
- URL processing and validation
- Duplicate detection and resolution
- XML generation and structure
- SEO compliance verification
- Error handling and recovery
- Performance benchmarks

## Monitoring and Alerts

### Health Checks
The monitoring system performs the following checks:

1. **Sitemap Accessibility** - Verifies sitemap file exists and is readable
2. **Sitemap Structure** - Validates XML structure and namespace
3. **URL Health** - Checks URL format, duplicates, and accessibility
4. **File Size** - Monitors file size against limits
5. **Content Freshness** - Analyzes lastmod dates for content updates
6. **Search Engine Compatibility** - Verifies Google guidelines compliance

### Alert Thresholds
```javascript
const alertThresholds = {
    maxResponseTime: 5000, // 5 seconds
    minURLCount: 100,
    maxErrorRate: 0.05, // 5%
    maxFileSizeMB: 45 // 45MB (under 50MB limit)
};
```

### Report Retention
- Monitoring reports are retained for 30 days
- Backup files are kept indefinitely (manual cleanup required)
- Validation reports are overwritten on each run

## Troubleshooting

### Common Issues

#### 1. Missing Content Directories
**Symptom**: Warning messages about missing directories
**Solution**: Ensure content directories exist or update configuration

#### 2. Large File Size
**Symptom**: File size warnings or errors
**Solution**: System automatically splits into multiple sitemaps

#### 3. Validation Failures
**Symptom**: Deployment blocked by validation errors
**Solution**: Check validation report for specific issues

#### 4. Duplicate URLs
**Symptom**: Duplicate URL warnings
**Solution**: System automatically resolves duplicates (prefer HTML over hash)

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=sitemap node scripts/generate-seo.js
```

### Log Files
- Generation logs: Included in generation report
- Validation logs: Console output and validation report
- Monitoring logs: Included in monitoring reports
- Deployment logs: Included in deployment reports

## Best Practices

### 1. Regular Monitoring
- Run monitoring checks daily
- Review weekly trend reports
- Set up automated alerts for critical issues

### 2. Content Management
- Update content regularly to maintain freshness scores
- Remove outdated content to prevent 404 errors
- Ensure all content has proper HTML pages (no hash URLs)

### 3. Performance Optimization
- Monitor file size growth
- Consider content archiving for very large sites
- Optimize image and asset sizes to improve page load times

### 4. SEO Optimization
- Review and adjust priority values based on content strategy
- Update changefreq values based on actual content update patterns
- Monitor search engine crawling behavior

## Integration

### CI/CD Integration
Add to your deployment pipeline:
```bash
# Generate new sitemap
node scripts/generate-seo.js

# Validate sitemap
node scripts/validate-sitemap.js

# Deploy if validation passes
if [ $? -eq 0 ]; then
    node scripts/deploy-sitemap.js deploy
fi
```

### Cron Job Setup
For automated monitoring:
```bash
# Add to crontab for daily monitoring at 2 AM
0 2 * * * cd /path/to/project && node scripts/monitor-sitemap.js run
```

### Robots.txt Integration
Ensure your robots.txt includes:
```
Sitemap: https://local-ai-zone.github.io/sitemap.xml
```

## API Reference

### SitemapOrchestrator Class
Main orchestrator for sitemap generation.

```javascript
const orchestrator = new SitemapOrchestrator();
const report = await orchestrator.generate();
```

### SitemapValidator Class
Validates sitemaps against standards.

```javascript
const validator = new SitemapValidator();
const results = await validator.validateSitemap('sitemap.xml');
```

### SitemapDeployer Class
Handles deployment with backup/rollback.

```javascript
const deployer = new SitemapDeployer();
await deployer.deploy();
```

### SitemapMonitor Class
Provides health monitoring capabilities.

```javascript
const monitor = new SitemapMonitor();
await monitor.startMonitoring();
```

## Support

### Getting Help
1. Check the troubleshooting section above
2. Review generated reports for detailed error information
3. Enable debug mode for additional logging
4. Check system requirements and dependencies

### Reporting Issues
When reporting issues, include:
- Error messages and stack traces
- Generated report files
- System configuration
- Steps to reproduce the issue

### Contributing
1. Run all tests before submitting changes
2. Update documentation for new features
3. Follow existing code style and patterns
4. Include test coverage for new functionality

---

**Last Updated**: August 6, 2025  
**Version**: 1.0  
**Compatibility**: Node.js 14+