const fs = require('fs');
const path = require('path');

/**
 * Improved SEO Sitemap Generation Script
 * 
 * This script implements a comprehensive sitemap generation system that:
 * - Eliminates hash-based URLs in favor of proper HTML pages
 * - Scans all content directories (guides/, cpu/, brands/, models/)
 * - Implements duplicate URL detection and resolution
 * - Applies proper SEO metadata (priority, changefreq, lastmod)
 * - Provides comprehensive error handling and logging
 * - Generates detailed reports for monitoring and debugging
 */

class Logger {
    constructor() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message };
        this.logs.push(logEntry);
        
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📄';
        console.log(`${prefix} ${message}`);
    }

    error(message, error = null) {
        this.errors.push({ message, error: error?.message, stack: error?.stack });
        this.log(`ERROR: ${message}`, 'error');
    }

    warn(message) {
        this.warnings.push(message);
        this.log(`WARNING: ${message}`, 'warn');
    }

    getReport() {
        return {
            totalLogs: this.logs.length,
            errors: this.errors,
            warnings: this.warnings,
            errorCount: this.errors.length,
            warningCount: this.warnings.length
        };
    }
}

class ContentScanner {
    constructor(logger) {
        this.logger = logger;
        this.contentInventory = {
            models: [],
            guides: [],
            cpu: [],
            brands: [],
            main: []
        };
    }

    scanDirectories(directories) {
        this.logger.log('🔍 Starting content directory scan...');
        
        for (const directory of directories) {
            try {
                if (!fs.existsSync(directory)) {
                    this.logger.warn(`Directory ${directory} does not exist`);
                    continue;
                }

                this.logger.log(`📁 Scanning ${directory} directory...`);
                const files = fs.readdirSync(directory);
                const htmlFiles = files.filter(file => file.endsWith('.html'));
                
                let processedCount = 0;
                for (const file of htmlFiles) {
                    try {
                        const filePath = path.join(directory, file);
                        const stats = fs.statSync(filePath);
                        
                        const fileInfo = {
                            name: file,
                            path: filePath,
                            relativePath: `${directory}/${file}`,
                            exists: true,
                            lastModified: stats.mtime.toISOString(),
                            size: stats.size
                        };

                        this.contentInventory[directory].push(fileInfo);
                        processedCount++;
                    } catch (fileError) {
                        this.logger.error(`Error processing file ${file} in ${directory}`, fileError);
                    }
                }

                this.logger.log(`✅ Found ${processedCount} HTML files in ${directory}`);
            } catch (dirError) {
                this.logger.error(`Error scanning directory ${directory}`, dirError);
            }
        }

        return this.contentInventory;
    }

    scanModelsData(jsonFilePath) {
        this.logger.log('📊 Scanning models data from JSON...');
        
        try {
            if (!fs.existsSync(jsonFilePath)) {
                this.logger.error(`Models JSON file not found: ${jsonFilePath}`);
                return [];
            }

            const rawData = fs.readFileSync(jsonFilePath, 'utf8');
            const modelsData = JSON.parse(rawData);
            
            if (!Array.isArray(modelsData)) {
                this.logger.error('Models data is not an array');
                return [];
            }

            this.logger.log(`📊 Found ${modelsData.length} model entries in JSON`);

            const processedModels = [];
            const seenSlugs = new Set();

            for (let i = 0; i < modelsData.length; i++) {
                try {
                    const model = modelsData[i];
                    
                    if (!model.modelName) {
                        this.logger.warn(`Model at index ${i} has no modelName`);
                        continue;
                    }

                    // Generate URL-safe slug
                    const slug = this.generateSlug(model.modelName);
                    if (!slug) {
                        this.logger.warn(`Generated empty slug for model: ${model.modelName}`);
                        continue;
                    }

                    // Skip duplicates
                    if (seenSlugs.has(slug)) {
                        continue;
                    }
                    seenSlugs.add(slug);

                    const htmlPath = `models/${slug}.html`;
                    const exists = fs.existsSync(htmlPath);

                    const modelInfo = {
                        name: model.modelName,
                        slug: slug,
                        htmlPath: htmlPath,
                        exists: exists,
                        lastModified: exists ? fs.statSync(htmlPath).mtime.toISOString() : null,
                        originalData: model
                    };

                    if (exists) {
                        processedModels.push(modelInfo);
                    } else {
                        this.logger.warn(`HTML file not found for model: ${model.modelName} (${htmlPath})`);
                    }
                } catch (modelError) {
                    this.logger.error(`Error processing model at index ${i}`, modelError);
                }
            }

            this.contentInventory.models = processedModels;
            this.logger.log(`✅ Processed ${processedModels.length} models with existing HTML files`);
            
            return processedModels;
        } catch (error) {
            this.logger.error('Error scanning models data', error);
            return [];
        }
    }

    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    validateFiles(files) {
        this.logger.log('🔍 Validating file accessibility...');
        
        const validationResults = {
            valid: [],
            invalid: [],
            totalChecked: files.length
        };

        for (const file of files) {
            try {
                if (fs.existsSync(file.path || file.htmlPath)) {
                    validationResults.valid.push(file);
                } else {
                    validationResults.invalid.push(file);
                    this.logger.warn(`File not accessible: ${file.path || file.htmlPath}`);
                }
            } catch (error) {
                validationResults.invalid.push(file);
                this.logger.error(`Error validating file: ${file.path || file.htmlPath}`, error);
            }
        }

        this.logger.log(`✅ Validation complete: ${validationResults.valid.length} valid, ${validationResults.invalid.length} invalid`);
        return validationResults;
    }

    getInventory() {
        return this.contentInventory;
    }
}

class URLProcessor {
    constructor(logger, baseURL = 'https://local-ai-zone.github.io') {
        this.logger = logger;
        this.baseURL = baseURL;
    }

    generateModelURLs(models) {
        this.logger.log('🔗 Generating model URLs...');
        
        const urls = [];
        for (const model of models) {
            try {
                if (!model.exists) {
                    continue;
                }

                const url = {
                    loc: `${this.baseURL}/${model.htmlPath}`,
                    lastmod: new Date(model.lastModified).toISOString().split('T')[0],
                    changefreq: 'weekly',
                    priority: '0.8',
                    contentType: 'model',
                    source: 'json',
                    originalPath: model.htmlPath,
                    validated: false,
                    isDuplicate: false,
                    metadata: {
                        modelName: model.name,
                        slug: model.slug
                    }
                };

                if (this.validateURL(url.loc)) {
                    url.validated = true;
                    urls.push(url);
                } else {
                    this.logger.warn(`Invalid model URL generated: ${url.loc}`);
                }
            } catch (error) {
                this.logger.error(`Error generating URL for model: ${model.name}`, error);
            }
        }

        this.logger.log(`✅ Generated ${urls.length} model URLs`);
        return urls;
    }

    generateContentURLs(contentInventory) {
        this.logger.log('🔗 Generating content URLs...');
        
        const urls = [];
        const contentTypeMap = {
            guides: { priority: '0.7', changefreq: 'monthly' },
            cpu: { priority: '0.6', changefreq: 'monthly' },
            brands: { priority: '0.6', changefreq: 'monthly' }
        };

        for (const [contentType, files] of Object.entries(contentInventory)) {
            if (contentType === 'models' || contentType === 'main') {
                continue; // Skip models (handled separately) and main
            }

            const typeConfig = contentTypeMap[contentType] || { priority: '0.5', changefreq: 'monthly' };

            for (const file of files) {
                try {
                    const url = {
                        loc: `${this.baseURL}/${file.relativePath}`,
                        lastmod: new Date(file.lastModified).toISOString().split('T')[0],
                        changefreq: typeConfig.changefreq,
                        priority: typeConfig.priority,
                        contentType: contentType,
                        source: 'file',
                        originalPath: file.relativePath,
                        validated: false,
                        isDuplicate: false,
                        metadata: {
                            fileName: file.name,
                            fileSize: file.size
                        }
                    };

                    if (this.validateURL(url.loc)) {
                        url.validated = true;
                        urls.push(url);
                    } else {
                        this.logger.warn(`Invalid content URL generated: ${url.loc}`);
                    }
                } catch (error) {
                    this.logger.error(`Error generating URL for file: ${file.name}`, error);
                }
            }
        }

        // Add homepage
        const homeURL = {
            loc: this.baseURL,
            lastmod: new Date().toISOString().split('T')[0],
            changefreq: 'daily',
            priority: '1.0',
            contentType: 'main',
            source: 'generated',
            originalPath: '/',
            validated: true,
            isDuplicate: false,
            metadata: {
                isHomepage: true
            }
        };

        urls.push(homeURL);

        this.logger.log(`✅ Generated ${urls.length} content URLs (including homepage)`);
        return urls;
    }

    validateURL(urlString) {
        try {
            const url = new URL(urlString);
            // Must be HTTPS and not contain hash fragments
            return url.protocol === 'https:' && !urlString.includes('#');
        } catch {
            return false;
        }
    }

    validateURLs(urls) {
        this.logger.log('🔍 Validating all URLs...');
        
        const results = {
            valid: [],
            invalid: [],
            totalChecked: urls.length
        };

        for (const url of urls) {
            if (this.validateURL(url.loc)) {
                url.validated = true;
                results.valid.push(url);
            } else {
                url.validated = false;
                results.invalid.push(url);
                this.logger.warn(`Invalid URL: ${url.loc}`);
            }
        }

        this.logger.log(`✅ URL validation complete: ${results.valid.length} valid, ${results.invalid.length} invalid`);
        return results;
    }
}

class DuplicateResolver {
    constructor(logger) {
        this.logger = logger;
    }

    detectDuplicates(urls) {
        this.logger.log('🔍 Detecting duplicate URLs...');
        
        const urlMap = new Map();
        const duplicateGroups = [];

        for (const url of urls) {
            if (urlMap.has(url.loc)) {
                // Found duplicate
                const existing = urlMap.get(url.loc);
                let duplicateGroup = duplicateGroups.find(group => 
                    group.some(item => item.loc === url.loc)
                );

                if (!duplicateGroup) {
                    duplicateGroup = [existing];
                    duplicateGroups.push(duplicateGroup);
                }

                duplicateGroup.push(url);
            } else {
                urlMap.set(url.loc, url);
            }
        }

        this.logger.log(`🔍 Found ${duplicateGroups.length} duplicate groups`);
        return duplicateGroups;
    }

    resolveDuplicates(duplicateGroups) {
        this.logger.log('🔧 Resolving duplicate URLs...');
        
        const resolutionReport = [];
        const resolvedURLs = [];

        for (const group of duplicateGroups) {
            try {
                // Resolution rules:
                // 1. Prefer HTML files over generated URLs
                // 2. Prefer higher priority values
                // 3. Prefer more recent lastmod dates
                
                const sorted = group.sort((a, b) => {
                    // Rule 1: HTML files first
                    if (a.source === 'file' && b.source !== 'file') return -1;
                    if (b.source === 'file' && a.source !== 'file') return 1;
                    
                    // Rule 2: Higher priority
                    const priorityDiff = parseFloat(b.priority) - parseFloat(a.priority);
                    if (priorityDiff !== 0) return priorityDiff;
                    
                    // Rule 3: More recent date
                    return new Date(b.lastmod) - new Date(a.lastmod);
                });

                const winner = sorted[0];
                const losers = sorted.slice(1);

                // Mark losers as duplicates
                for (const loser of losers) {
                    loser.isDuplicate = true;
                }

                resolvedURLs.push(winner);

                resolutionReport.push({
                    url: winner.loc,
                    winner: {
                        source: winner.source,
                        priority: winner.priority,
                        lastmod: winner.lastmod
                    },
                    losers: losers.map(loser => ({
                        source: loser.source,
                        priority: loser.priority,
                        lastmod: loser.lastmod
                    })),
                    reason: 'Duplicate resolution applied'
                });

            } catch (error) {
                this.logger.error(`Error resolving duplicate group for URL: ${group[0]?.loc}`, error);
            }
        }

        this.logger.log(`✅ Resolved ${resolutionReport.length} duplicate groups`);
        return { resolvedURLs, resolutionReport };
    }

    generateReport(duplicates) {
        return {
            totalDuplicateGroups: duplicates.length,
            totalDuplicateURLs: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
            duplicateDetails: duplicates.map(group => ({
                url: group[0].loc,
                count: group.length,
                sources: group.map(item => item.source)
            }))
        };
    }
}

class PriorityCalculator {
    constructor(logger) {
        this.logger = logger;
        this.priorityRules = {
            main: 1.0,
            model: 0.8,
            guides: 0.7,
            cpu: 0.6,
            brands: 0.6,
            default: 0.5
        };
        
        this.changefreqRules = {
            main: 'daily',
            model: 'weekly',
            guides: 'monthly',
            cpu: 'monthly',
            brands: 'monthly',
            default: 'monthly'
        };
    }

    calculatePriority(url, metadata = {}) {
        const contentType = url.contentType || 'default';
        return this.priorityRules[contentType] || this.priorityRules.default;
    }

    determineChangeFreq(url, metadata = {}) {
        const contentType = url.contentType || 'default';
        return this.changefreqRules[contentType] || this.changefreqRules.default;
    }

    setLastModified(url, fileStats = null) {
        if (fileStats && fileStats.mtime) {
            return fileStats.mtime.toISOString().split('T')[0];
        }
        
        if (url.lastmod) {
            return url.lastmod;
        }
        
        return new Date().toISOString().split('T')[0];
    }

    enhanceURLs(urls) {
        this.logger.log('🎯 Calculating SEO priorities and metadata...');
        
        const enhancedURLs = [];
        
        for (const url of urls) {
            try {
                const enhanced = { ...url };
                
                // Recalculate priority if needed
                const calculatedPriority = this.calculatePriority(enhanced);
                if (calculatedPriority !== parseFloat(enhanced.priority)) {
                    enhanced.priority = calculatedPriority.toString();
                }
                
                // Recalculate changefreq if needed
                const calculatedChangefreq = this.determineChangeFreq(enhanced);
                if (calculatedChangefreq !== enhanced.changefreq) {
                    enhanced.changefreq = calculatedChangefreq;
                }
                
                // Ensure lastmod is properly formatted
                enhanced.lastmod = this.setLastModified(enhanced);
                
                enhancedURLs.push(enhanced);
            } catch (error) {
                this.logger.error(`Error enhancing URL: ${url.loc}`, error);
                enhancedURLs.push(url); // Include original if enhancement fails
            }
        }
        
        this.logger.log(`✅ Enhanced ${enhancedURLs.length} URLs with SEO metadata`);
        return enhancedURLs;
    }
}

class SitemapGenerator {
    constructor(logger) {
        this.logger = logger;
        this.maxURLsPerSitemap = 50000;
        this.maxFileSize = 52428800; // 50MB
    }

    generateSitemap(urls) {
        this.logger.log('📄 Generating XML sitemap...');
        
        try {
            // Filter out invalid and duplicate URLs
            const validURLs = urls.filter(url => url.validated && !url.isDuplicate);
            
            if (validURLs.length === 0) {
                throw new Error('No valid URLs to include in sitemap');
            }

            // Check if we need multiple sitemap files
            if (validURLs.length > this.maxURLsPerSitemap) {
                return this.generateMultipleSitemaps(validURLs);
            }

            const xmlContent = this.generateSingleSitemap(validURLs);
            
            // Validate XML size
            if (Buffer.byteLength(xmlContent, 'utf8') > this.maxFileSize) {
                this.logger.warn('Sitemap exceeds maximum file size, splitting into multiple files');
                return this.generateMultipleSitemaps(validURLs);
            }

            this.logger.log(`✅ Generated sitemap with ${validURLs.length} URLs`);
            
            return {
                sitemaps: [{ filename: 'sitemap.xml', content: xmlContent }],
                needsIndex: false,
                totalURLs: validURLs.length
            };
            
        } catch (error) {
            this.logger.error('Error generating sitemap', error);
            throw error;
        }
    }

    generateSingleSitemap(urls) {
        const lines = [];
        lines.push('<?xml version="1.0" encoding="UTF-8"?>');
        lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

        // Sort URLs by priority (highest first) and then alphabetically for consistency
        const sortedUrls = urls.sort((a, b) => {
            const priorityDiff = parseFloat(b.priority) - parseFloat(a.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return a.loc.localeCompare(b.loc);
        });

        for (const url of sortedUrls) {
            lines.push('  <url>');
            lines.push(`    <loc>${this.escapeXML(url.loc)}</loc>`);
            lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
            lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
            lines.push(`    <priority>${url.priority}</priority>`);
            lines.push('  </url>');
        }

        lines.push('</urlset>');
        return lines.join('\n');
    }

    generateMultipleSitemaps(urls) {
        this.logger.log(`📄 Generating multiple sitemap files for ${urls.length} URLs...`);
        
        const sitemaps = [];
        const chunks = this.chunkArray(urls, this.maxURLsPerSitemap);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const filename = i === 0 ? 'sitemap.xml' : `sitemap-${i + 1}.xml`;
            const content = this.generateSingleSitemap(chunk);
            
            sitemaps.push({ filename, content });
        }

        return {
            sitemaps,
            needsIndex: sitemaps.length > 1,
            totalURLs: urls.length
        };
    }

    generateSitemapIndex(sitemaps, baseURL) {
        this.logger.log('📄 Generating sitemap index...');
        
        const lines = [];
        lines.push('<?xml version="1.0" encoding="UTF-8"?>');
        lines.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

        const now = new Date().toISOString().split('T')[0];
        
        for (const sitemap of sitemaps) {
            lines.push('  <sitemap>');
            lines.push(`    <loc>${baseURL}/${sitemap.filename}</loc>`);
            lines.push(`    <lastmod>${now}</lastmod>`);
            lines.push('  </sitemap>');
        }

        lines.push('</sitemapindex>');
        return lines.join('\n');
    }

    validateXML(xmlContent) {
        try {
            // Basic XML validation
            if (!xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
                return { valid: false, error: 'Missing XML declaration' };
            }

            if (!xmlContent.includes('<urlset') && !xmlContent.includes('<sitemapindex')) {
                return { valid: false, error: 'Missing required root element' };
            }

            // Check for proper namespace
            if (xmlContent.includes('<urlset') && !xmlContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
                return { valid: false, error: 'Missing or incorrect XML namespace' };
            }

            // Check for common XML issues
            const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
            if (invalidChars.test(xmlContent)) {
                return { valid: false, error: 'Contains invalid XML characters' };
            }

            // Validate URL structure - no hash fragments
            if (xmlContent.includes('#')) {
                return { valid: false, error: 'Contains hash fragments in URLs' };
            }

            // Validate that all URLs are HTTPS
            const httpUrls = xmlContent.match(/<loc>http:\/\//g);
            if (httpUrls && httpUrls.length > 0) {
                return { valid: false, error: 'Contains non-HTTPS URLs' };
            }

            // Validate date format (YYYY-MM-DD)
            const dates = xmlContent.match(/<lastmod>([^<]+)<\/lastmod>/g);
            if (dates) {
                for (const dateMatch of dates) {
                    const date = dateMatch.match(/<lastmod>([^<]+)<\/lastmod>/)[1];
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        return { valid: false, error: `Invalid date format: ${date}` };
                    }
                }
            }

            // Check for balanced tags
            const urlOpenTags = (xmlContent.match(/<url>/g) || []).length;
            const urlCloseTags = (xmlContent.match(/<\/url>/g) || []).length;
            if (urlOpenTags !== urlCloseTags) {
                return { valid: false, error: 'Unbalanced URL tags' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

class SitemapOrchestrator {
    constructor() {
        this.logger = new Logger();
        this.contentScanner = new ContentScanner(this.logger);
        this.urlProcessor = new URLProcessor(this.logger);
        this.duplicateResolver = new DuplicateResolver(this.logger);
        this.priorityCalculator = new PriorityCalculator(this.logger);
        this.sitemapGenerator = new SitemapGenerator(this.logger);
        
        this.config = {
            baseURL: 'https://local-ai-zone.github.io',
            contentDirectories: ['guides', 'cpu', 'brands'],
            modelsJsonPath: 'gguf_models.json',
            outputFiles: {
                sitemap: 'sitemap.xml',
                sitemapIndex: 'sitemap-index.xml',
                report: 'sitemap-generation-report.json'
            }
        };
    }

    async generate() {
        try {
            this.logger.log('🚀 Starting improved sitemap generation...');
            this.logger.log('=====================================');

            // Step 1: Scan content directories
            const contentInventory = this.contentScanner.scanDirectories(this.config.contentDirectories);
            
            // Step 2: Scan models data
            const models = this.contentScanner.scanModelsData(this.config.modelsJsonPath);
            
            // Step 3: Generate URLs
            const modelURLs = this.urlProcessor.generateModelURLs(models);
            const contentURLs = this.urlProcessor.generateContentURLs(contentInventory);
            const allURLs = [...modelURLs, ...contentURLs];
            
            // Step 4: Validate URLs
            const validationResults = this.urlProcessor.validateURLs(allURLs);
            
            // Step 5: Detect and resolve duplicates
            const duplicateGroups = this.duplicateResolver.detectDuplicates(validationResults.valid);
            const { resolvedURLs, resolutionReport } = this.duplicateResolver.resolveDuplicates(duplicateGroups);
            
            // Step 6: Enhance URLs with SEO metadata
            const enhancedURLs = this.priorityCalculator.enhanceURLs([...validationResults.valid]);
            
            // Step 7: Generate sitemap
            const sitemapResult = this.sitemapGenerator.generateSitemap(enhancedURLs);
            
            // Step 7.5: Validate generated XML
            for (const sitemap of sitemapResult.sitemaps) {
                const validation = this.sitemapGenerator.validateXML(sitemap.content);
                if (!validation.valid) {
                    throw new Error(`XML validation failed for ${sitemap.filename}: ${validation.error}`);
                }
                this.logger.log(`✅ XML validation passed for ${sitemap.filename}`);
            }
            
            // Step 8: Write files
            await this.writeFiles(sitemapResult);
            
            // Step 9: Generate comprehensive report
            const report = this.generateReport({
                contentInventory,
                models,
                allURLs,
                validationResults,
                duplicateGroups,
                resolutionReport,
                enhancedURLs,
                sitemapResult
            });
            
            // Step 10: Write report
            fs.writeFileSync(this.config.outputFiles.report, JSON.stringify(report, null, 2));
            
            this.printSummary(report);
            
            return report;
            
        } catch (error) {
            this.logger.error('Critical error during sitemap generation', error);
            throw error;
        }
    }

    async writeFiles(sitemapResult) {
        try {
            // Write main sitemap(s)
            for (const sitemap of sitemapResult.sitemaps) {
                fs.writeFileSync(sitemap.filename, sitemap.content);
                this.logger.log(`📄 Written ${sitemap.filename}`);
            }
            
            // Write sitemap index if needed
            if (sitemapResult.needsIndex) {
                const indexContent = this.sitemapGenerator.generateSitemapIndex(
                    sitemapResult.sitemaps, 
                    this.config.baseURL
                );
                fs.writeFileSync(this.config.outputFiles.sitemapIndex, indexContent);
                this.logger.log(`📄 Written ${this.config.outputFiles.sitemapIndex}`);
            }
            
        } catch (error) {
            this.logger.error('Error writing sitemap files', error);
            throw error;
        }
    }

    generateReport(data) {
        const logReport = this.logger.getReport();
        
        return {
            timestamp: new Date().toISOString(),
            summary: {
                totalURLs: data.enhancedURLs.filter(url => url.validated && !url.isDuplicate).length,
                duplicatesFound: data.duplicateGroups.length,
                duplicatesResolved: data.resolutionReport.length,
                errorsCount: logReport.errorCount,
                warningsCount: logReport.warningCount,
                sitemapFiles: data.sitemapResult.sitemaps.map(s => s.filename)
            },
            urlsByType: this.calculateURLsByType(data.enhancedURLs),
            contentInventory: {
                models: data.models.length,
                guides: data.contentInventory.guides.length,
                cpu: data.contentInventory.cpu.length,
                brands: data.contentInventory.brands.length
            },
            duplicateResolution: data.resolutionReport,
            validation: {
                totalChecked: data.validationResults.totalChecked,
                valid: data.validationResults.valid.length,
                invalid: data.validationResults.invalid.length
            },
            improvements: {
                hashURLsEliminated: 'All hash-based URLs eliminated in favor of HTML pages',
                duplicateDetection: `${data.duplicateGroups.length} duplicate groups detected and resolved`,
                contentDirectoriesScanned: `${this.config.contentDirectories.join(', ')} directories scanned`,
                validationApplied: 'URL validation and SEO metadata applied to all entries',
                comprehensiveErrorHandling: 'Comprehensive error handling and logging implemented'
            },
            logs: logReport
        };
    }

    calculateURLsByType(urls) {
        const validURLs = urls.filter(url => url.validated && !url.isDuplicate);
        const counts = {};
        
        for (const url of validURLs) {
            const type = url.contentType || 'unknown';
            counts[type] = (counts[type] || 0) + 1;
        }
        
        return counts;
    }

    printSummary(report) {
        this.logger.log('=====================================');
        this.logger.log('🎉 Improved sitemap generation completed!');
        this.logger.log(`✅ Generated sitemap with ${report.summary.totalURLs} URLs`);
        this.logger.log('📈 Summary:');
        
        for (const [type, count] of Object.entries(report.urlsByType)) {
            this.logger.log(`   - ${type} pages: ${count}`);
        }
        
        this.logger.log(`   - Duplicates resolved: ${report.summary.duplicatesResolved}`);
        this.logger.log(`   - Errors: ${report.summary.errorsCount}`);
        this.logger.log(`   - Warnings: ${report.summary.warningsCount}`);
        this.logger.log('');
        this.logger.log('🔍 Key improvements:');
        this.logger.log('   - ✅ Eliminated all hash-based URLs (#model=name)');
        this.logger.log('   - ✅ Only included existing HTML pages');
        this.logger.log('   - ✅ Scanned all content directories (guides/, cpu/, brands/, models/)');
        this.logger.log('   - ✅ Applied proper SEO priorities and metadata');
        this.logger.log('   - ✅ Implemented duplicate URL detection and resolution');
        this.logger.log('   - ✅ Added comprehensive error handling and logging');
        this.logger.log('   - ✅ Modular, maintainable architecture');
        this.logger.log('');
        this.logger.log(`📊 Report saved to: ${this.config.outputFiles.report}`);
        
        if (report.summary.errorsCount > 0) {
            this.logger.log('');
            this.logger.log('⚠️  Errors encountered (see report for details)');
        }
        
        if (report.summary.warningsCount > 0) {
            this.logger.log('');
            this.logger.log('⚠️  Warnings generated (see report for details)');
        }
    }
}

// Main execution
if (require.main === module) {
    const orchestrator = new SitemapOrchestrator();
    
    orchestrator.generate()
        .then(report => {
            console.log('\n🎉 Sitemap generation completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Sitemap generation failed:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
        });
}

module.exports = {
    SitemapOrchestrator,
    Logger,
    ContentScanner,
    URLProcessor,
    DuplicateResolver,
    PriorityCalculator,
    SitemapGenerator
};