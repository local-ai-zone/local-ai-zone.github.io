#!/usr/bin/env node

/**
 * SEO Generation Script for GGUF Model Discovery
 * 
 * This script generates SEO optimization files:
 * - sitemap.xml
 * - robots.txt
 * - meta descriptions and structured data
 * - Open Graph meta tags
 * - Canonical URLs
 */

const fs = require('fs');
const path = require('path');

class SEOGenerator {
    constructor() {
        this.baseUrl = 'https://local-ai-zone.github.io';
        this.modelsData = [];
        this.uniqueModels = new Map();
        this.modelTypes = new Set();
        this.quantFormats = new Set();
        this.licenses = new Set();
    }

    /**
     * Load and process GGUF models data
     */
    loadModelsData() {
        try {
            const dataPath = path.join(__dirname, '../gguf_models.json');
            console.log('Loading models data...');
            
            const rawData = fs.readFileSync(dataPath, 'utf8');
            console.log('Parsing JSON data...');
            
            this.modelsData = JSON.parse(rawData);
            console.log(`Loaded ${this.modelsData.length} model entries`);
            
            // Process data to extract unique models and metadata
            this.processModelsData();
            
        } catch (error) {
            console.error('Error loading models data:', error);
            throw error;
        }
    }

    /**
     * Process models data to extract unique models and collect metadata
     */
    processModelsData() {
        console.log('Processing models data...');
        
        // Limit processing to avoid memory issues - take a sample for SEO generation
        const sampleSize = Math.min(this.modelsData.length, 10000);
        const sampleData = this.modelsData.slice(0, sampleSize);
        
        console.log(`Processing ${sampleData.length} model entries for SEO generation`);
        
        sampleData.forEach((model, index) => {
            if (index % 1000 === 0) {
                console.log(`Processed ${index} models...`);
            }
            
            // Create unique model identifier
            const modelKey = `${model.modelName}-${model.quantFormat}`;
            
            if (!this.uniqueModels.has(modelKey)) {
                this.uniqueModels.set(modelKey, model);
            }
            
            // Collect metadata for SEO
            if (model.modelType && model.modelType !== 'Unknown') {
                this.modelTypes.add(model.modelType);
            }
            if (model.quantFormat && model.quantFormat !== 'Unknown') {
                this.quantFormats.add(model.quantFormat);
            }
            if (model.license && model.license !== 'Not specified') {
                this.licenses.add(model.license);
            }
        });
        
        console.log(`Processed ${this.uniqueModels.size} unique models`);
        console.log(`Found ${this.modelTypes.size} model types, ${this.quantFormats.size} quantization formats`);
    }

    /**
     * Generate sitemap.xml
     */
    generateSitemap() {
        const sitemap = [];
        
        // Add header
        sitemap.push('<?xml version="1.0" encoding="UTF-8"?>');
        sitemap.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        
        // Add main pages
        const mainPages = [
            { url: '', priority: '1.0', changefreq: 'daily' },
            { url: '/premium-index.html', priority: '0.8', changefreq: 'weekly' }
        ];
        
        mainPages.forEach(page => {
            sitemap.push('  <url>');
            sitemap.push(`    <loc>${this.baseUrl}${page.url}</loc>`);
            sitemap.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
            sitemap.push(`    <changefreq>${page.changefreq}</changefreq>`);
            sitemap.push(`    <priority>${page.priority}</priority>`);
            sitemap.push('  </url>');
        });
        
        // Add model-specific pages (virtual URLs for SEO)
        const uniqueModelNames = new Set();
        this.uniqueModels.forEach(model => {
            uniqueModelNames.add(model.modelName);
        });
        
        uniqueModelNames.forEach(modelName => {
            const slug = this.createSlug(modelName);
            sitemap.push('  <url>');
            sitemap.push(`    <loc>${this.baseUrl}/#model=${encodeURIComponent(slug)}</loc>`);
            sitemap.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
            sitemap.push('    <changefreq>weekly</changefreq>');
            sitemap.push('    <priority>0.7</priority>');
            sitemap.push('  </url>');
        });
        
        // Add category pages
        this.modelTypes.forEach(type => {
            const slug = this.createSlug(type);
            sitemap.push('  <url>');
            sitemap.push(`    <loc>${this.baseUrl}/#type=${encodeURIComponent(slug)}</loc>`);
            sitemap.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
            sitemap.push('    <changefreq>weekly</changefreq>');
            sitemap.push('    <priority>0.6</priority>');
            sitemap.push('  </url>');
        });
        
        sitemap.push('</urlset>');
        
        const sitemapContent = sitemap.join('\n');
        fs.writeFileSync('sitemap.xml', sitemapContent);
        console.log('Generated sitemap.xml');
    }

    /**
     * Generate robots.txt
     */
    generateRobotsTxt() {
        const robots = [
            'User-agent: *',
            'Allow: /',
            '',
            '# Sitemap',
            `Sitemap: ${this.baseUrl}/sitemap.xml`,
            '',
            '# Crawl-delay for respectful crawling',
            'Crawl-delay: 1',
            '',
            '# Disallow crawling of test files',
            'Disallow: /test-*.html',
            'Disallow: /debug-*.html',
            'Disallow: /minimal-test.html',
            'Disallow: /simple-test.html',
            '',
            '# Disallow crawling of development files',
            'Disallow: /node_modules/',
            'Disallow: /scripts/',
            'Disallow: /.git/',
            'Disallow: /.github/',
            'Disallow: /venv/',
            '',
            '# Allow important resources',
            'Allow: /css/',
            'Allow: /js/',
            'Allow: /gguf_models.json'
        ];
        
        fs.writeFileSync('robots.txt', robots.join('\n'));
        console.log('Generated robots.txt');
    }

    /**
     * Generate SEO metadata for HTML injection
     */
    generateSEOMetadata() {
        const metadata = {
            site: {
                title: 'GGUF Model Discovery - Browse & Download AI Models',
                description: 'Discover and download GGUF format machine learning models. Browse thousands of quantized AI models with detailed information, download counts, and direct links.',
                keywords: this.generateSiteKeywords(),
                structuredData: this.generateSiteStructuredData()
            },
            models: this.generateModelMetadata()
        };
        
        fs.writeFileSync('seo-metadata.json', JSON.stringify(metadata, null, 2));
        console.log('Generated seo-metadata.json');
        
        return metadata;
    }

    /**
     * Generate site-wide keywords
     */
    generateSiteKeywords() {
        const keywords = [
            'GGUF models',
            'machine learning',
            'AI models',
            'quantized models',
            'model download',
            'Hugging Face',
            'LLaMA',
            'neural networks',
            'deep learning'
        ];
        
        // Add model types as keywords
        this.modelTypes.forEach(type => {
            keywords.push(`${type} models`);
        });
        
        // Add popular quantization formats
        const popularFormats = ['Q4_0', 'Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16'];
        popularFormats.forEach(format => {
            if (this.quantFormats.has(format)) {
                keywords.push(`${format} quantization`);
            }
        });
        
        return keywords.join(', ');
    }

    /**
     * Generate structured data for the site
     */
    generateSiteStructuredData() {
        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "GGUF Model Discovery",
            "description": "Browse and download GGUF format machine learning models",
            "url": this.baseUrl,
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": `${this.baseUrl}/#search={search_term_string}`
                },
                "query-input": "required name=search_term_string"
            },
            "mainEntity": {
                "@type": "DataCatalog",
                "name": "GGUF Model Catalog",
                "description": "Comprehensive catalog of GGUF format machine learning models",
                "numberOfItems": this.uniqueModels.size,
                "keywords": Array.from(this.modelTypes).join(', ')
            }
        };
    }

    /**
     * Generate metadata for individual models
     */
    generateModelMetadata() {
        const modelMetadata = {};
        
        // Limit to top models by download count for SEO metadata
        const topModels = Array.from(this.uniqueModels.values())
            .sort((a, b) => b.downloadCount - a.downloadCount)
            .slice(0, 1000); // Top 1000 models for detailed SEO
        
        console.log(`Generating SEO metadata for top ${topModels.length} models`);
        
        topModels.forEach((model, index) => {
            if (index % 100 === 0) {
                console.log(`Generated metadata for ${index} models...`);
            }
            
            const slug = this.createSlug(model.modelName);
            
            modelMetadata[slug] = {
                title: `${model.modelName} - ${model.quantFormat} GGUF Model`,
                description: this.generateModelDescription(model),
                keywords: this.generateModelKeywords(model),
                structuredData: this.generateModelStructuredData(model),
                openGraph: this.generateModelOpenGraph(model),
                canonical: `${this.baseUrl}/#model=${encodeURIComponent(slug)}`
            };
        });
        
        return modelMetadata;
    }

    /**
     * Generate description for a specific model
     */
    generateModelDescription(model) {
        const parts = [];
        
        parts.push(`Download ${model.modelName} in ${model.quantFormat} quantization format.`);
        
        if (model.modelType && model.modelType !== 'Unknown') {
            parts.push(`${model.modelType} model`);
        }
        
        parts.push(`File size: ${model.fileSizeFormatted}.`);
        
        if (model.downloadCount > 0) {
            parts.push(`${model.downloadCount.toLocaleString()} downloads.`);
        }
        
        if (model.likeCount > 0) {
            parts.push(`${model.likeCount} likes.`);
        }
        
        parts.push('Direct download from Hugging Face.');
        
        return parts.join(' ');
    }

    /**
     * Generate keywords for a specific model
     */
    generateModelKeywords(model) {
        const keywords = [
            model.modelName,
            model.quantFormat,
            'GGUF model',
            'download'
        ];
        
        if (model.modelType && model.modelType !== 'Unknown') {
            keywords.push(model.modelType);
            keywords.push(`${model.modelType} model`);
        }
        
        if (model.license && model.license !== 'Not specified') {
            keywords.push(model.license);
        }
        
        // Add size-based keywords
        const sizeGB = model.fileSize / (1024 * 1024 * 1024);
        if (sizeGB < 1) {
            keywords.push('small model');
        } else if (sizeGB < 5) {
            keywords.push('medium model');
        } else {
            keywords.push('large model');
        }
        
        return keywords.join(', ');
    }

    /**
     * Generate structured data for a specific model
     */
    generateModelStructuredData(model) {
        return {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": model.modelName,
            "description": this.generateModelDescription(model),
            "applicationCategory": "Machine Learning Model",
            "operatingSystem": "Cross-platform",
            "fileFormat": "GGUF",
            "fileSize": model.fileSizeFormatted,
            "downloadUrl": model.directDownloadLink,
            "url": model.huggingFaceLink,
            "aggregateRating": model.likeCount > 0 ? {
                "@type": "AggregateRating",
                "ratingValue": Math.min(5, Math.max(1, model.likeCount / 100)),
                "ratingCount": model.likeCount
            } : undefined,
            "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/DownloadAction",
                "userInteractionCount": model.downloadCount
            }
        };
    }

    /**
     * Generate Open Graph metadata for a specific model
     */
    generateModelOpenGraph(model) {
        return {
            title: `${model.modelName} - GGUF Model Download`,
            description: this.generateModelDescription(model),
            type: 'website',
            url: `${this.baseUrl}/#model=${encodeURIComponent(this.createSlug(model.modelName))}`,
            image: `${this.baseUrl}/og-image-model.png`, // Placeholder for model-specific image
            'image:alt': `${model.modelName} GGUF model preview`,
            'image:width': '1200',
            'image:height': '630'
        };
    }

    /**
     * Update HTML files with SEO metadata
     */
    updateHTMLWithSEO(metadata) {
        const htmlFiles = ['index.html', 'premium-index.html'];
        
        htmlFiles.forEach(filename => {
            if (fs.existsSync(filename)) {
                this.updateHTMLFile(filename, metadata);
            }
        });
    }

    /**
     * Update a specific HTML file with SEO metadata
     */
    updateHTMLFile(filename, metadata) {
        let content = fs.readFileSync(filename, 'utf8');
        
        // Update title
        content = content.replace(
            /<title>.*?<\/title>/,
            `<title>${metadata.site.title}</title>`
        );
        
        // Update meta description
        content = content.replace(
            /<meta name="description" content=".*?">/,
            `<meta name="description" content="${metadata.site.description}">`
        );
        
        // Update keywords
        content = content.replace(
            /<meta name="keywords" content=".*?">/,
            `<meta name="keywords" content="${metadata.site.keywords}">`
        );
        
        // Update or add canonical URL
        const canonicalRegex = /<link rel="canonical"[^>]*>/;
        if (canonicalRegex.test(content)) {
            content = content.replace(canonicalRegex, `<link rel="canonical" href="${this.baseUrl}/">`);
        } else {
            const headCloseIndex = content.indexOf('</head>');
            if (headCloseIndex !== -1) {
                const canonicalTag = `    <link rel="canonical" href="${this.baseUrl}/">\n`;
                content = content.slice(0, headCloseIndex) + canonicalTag + content.slice(headCloseIndex);
            }
        }
        
        // Remove existing structured data scripts to avoid duplicates
        content = content.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
        
        // Add structured data
        const structuredDataScript = `    <script type="application/ld+json">
${JSON.stringify(metadata.site.structuredData, null, 6)}
    </script>`;
        
        const headCloseIndex = content.indexOf('</head>');
        if (headCloseIndex !== -1) {
            content = content.slice(0, headCloseIndex) + structuredDataScript + '\n' + content.slice(headCloseIndex);
        }
        
        // Update Open Graph tags
        content = this.updateOpenGraphTags(content, {
            title: metadata.site.title,
            description: metadata.site.description,
            type: 'website',
            url: this.baseUrl,
            image: `${this.baseUrl}/og-image.png`
        });
        
        fs.writeFileSync(filename, content);
        console.log(`Updated ${filename} with SEO metadata`);
    }

    /**
     * Update Open Graph tags in HTML content
     */
    updateOpenGraphTags(content, ogData) {
        Object.entries(ogData).forEach(([property, value]) => {
            const ogProperty = property === 'image' ? 'og:image' : `og:${property}`;
            const regex = new RegExp(`<meta property="${ogProperty}" content="[^"]*">`, 'g');
            const newTag = `<meta property="${ogProperty}" content="${value}">`;
            
            if (regex.test(content)) {
                content = content.replace(regex, newTag);
            } else {
                // Add new tag if it doesn't exist
                const headCloseIndex = content.indexOf('</head>');
                if (headCloseIndex !== -1) {
                    content = content.slice(0, headCloseIndex) + `    ${newTag}\n` + content.slice(headCloseIndex);
                }
            }
        });
        
        return content;
    }

    /**
     * Create URL-friendly slug from model name
     */
    createSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Generate all SEO files
     */
    async generateAll() {
        console.log('Starting SEO generation...');
        
        try {
            // Load models data
            this.loadModelsData();
            
            // Generate all SEO files
            this.generateSitemap();
            this.generateRobotsTxt();
            const metadata = this.generateSEOMetadata();
            this.updateHTMLWithSEO(metadata);
            
            console.log('SEO generation completed successfully!');
            
            // Output summary
            console.log('\nSEO Generation Summary:');
            console.log(`- Generated sitemap with ${this.uniqueModels.size + Array.from(this.modelTypes).length + 2} URLs`);
            console.log(`- Created robots.txt with crawling directives`);
            console.log(`- Generated metadata for ${Object.keys(metadata.models).length} unique models`);
            console.log(`- Updated HTML files with structured data and meta tags`);
            
        } catch (error) {
            console.error('Error during SEO generation:', error);
            process.exit(1);
        }
    }
}

// Run the SEO generator if this script is executed directly
if (require.main === module) {
    const generator = new SEOGenerator();
    generator.generateAll();
}

module.exports = SEOGenerator;