#!/usr/bin/env node

/**
 * Minimal Page Generator for GGUF Models
 * 
 * Creates lightweight HTML pages under 5KB for each model
 * with essential SEO and model information only
 */

const fs = require('fs').promises;
const path = require('path');

class MinimalPageGenerator {
    constructor() {
        this.baseUrl = 'https://local-ai-zone.github.io';
        this.outputDir = 'models';
        this.modelsData = [];
        this.uniqueModels = new Map();
        this.stats = {
            total: 0,
            processed: 0,
            failed: 0,
            totalSize: 0
        };
    }

    /**
     * Load and process models data
     */
    async loadModelsData() {
        try {
            console.log('📊 Loading models data...');
            const dataPath = path.join(__dirname, '../gguf_models.json');
            const rawData = await fs.readFile(dataPath, 'utf8');
            this.modelsData = JSON.parse(rawData);
            
            console.log(`📈 Loaded ${this.modelsData.length} model entries`);
            
            // Create unique models map
            this.modelsData.forEach(model => {
                const key = model.modelName;
                if (!this.uniqueModels.has(key) || this.uniqueModels.get(key).likeCount < model.likeCount) {
                    this.uniqueModels.set(key, model);
                }
            });
            
            // Sort by likes and take top 1000
            const sortedModels = Array.from(this.uniqueModels.values())
                .sort((a, b) => b.likeCount - a.likeCount)
                .slice(0, 1000);
            
            console.log(`🎯 Selected top ${sortedModels.length} models for minimal pages`);
            return sortedModels;
            
        } catch (error) {
            console.error('❌ Error loading models data:', error);
            throw error;
        }
    }

    /**
     * Create URL-friendly slug
     */
    createSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Generate minimal HTML template that replicates the model card design
     */
    generateMinimalHTML(model) {
        const slug = this.createSlug(model.modelName);
        const pageUrl = `${this.baseUrl}/models/${slug}.html`;
        const formattedDownloadCount = this.formatDownloadCount(model.downloadCount);
        const formattedModelName = this.formatModelName(model.modelName);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${model.modelName} - GGUF Model</title>
<meta name="description" content="Download ${model.modelName} GGUF model. ${model.fileSizeFormatted}, ${model.downloadCount.toLocaleString()} downloads, ${model.likeCount} likes.">
<meta name="keywords" content="${model.modelName}, GGUF, ${model.quantFormat}, ${model.modelType}, download, AI model">
<link rel="canonical" href="${pageUrl}">
<meta property="og:title" content="${model.modelName} - GGUF Model">
<meta property="og:description" content="Download ${model.modelName} GGUF model. ${model.fileSizeFormatted}, ${model.downloadCount.toLocaleString()} downloads.">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
<style>
:root{--primary-color:#3B82F6;--secondary-color:#6B7280;--success-color:#10B981;--card-background:#FFFFFF;--text-primary:#111827;--text-secondary:#6B7280;--border-color:#E5E7EB;--border-radius:8px;--shadow-md:0 4px 6px -1px rgba(0,0,0,0.1);--transition:all 0.2s ease-in-out}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F9FAFB;color:var(--text-primary);line-height:1.6;padding:20px}
.container{max-width:400px;margin:0 auto}
.model-card{background:var(--card-background);border:1px solid var(--border-color);border-radius:var(--border-radius);padding:1.5rem;box-shadow:var(--shadow-md)}
.model-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem}
.model-number{background:var(--primary-color);color:white;padding:0.25rem 0.5rem;border-radius:var(--border-radius);font-size:0.75rem;font-weight:600}
.model-metrics{display:flex;align-items:center;gap:0.75rem}
.download-count,.engagement-count{display:flex;align-items:center;gap:0.25rem;font-size:0.75rem;color:var(--text-secondary)}
.model-name-container{margin-bottom:1rem}
.model-name{font-size:1.125rem;font-weight:600;color:var(--text-primary);margin:0;word-break:break-word}
.model-details{display:grid;grid-template-columns:auto 1fr;gap:0.5rem 1rem;margin-bottom:1.5rem;font-size:0.875rem}
.detail-label{color:var(--text-secondary);font-weight:500}
.detail-value{color:var(--text-primary)}
.quantization-badge{background:#EFF6FF;color:var(--primary-color);padding:0.125rem 0.5rem;border-radius:9999px;font-size:0.75rem;font-weight:500}
.model-actions{display:flex;gap:0.5rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;border-radius:var(--border-radius);text-decoration:none;font-size:0.875rem;font-weight:500;transition:var(--transition)}
.btn-primary{background:var(--primary-color);color:white}
.btn-primary:hover{background:#2563EB}
.btn-secondary{background:#F3F4F6;color:var(--text-primary);border:1px solid var(--border-color)}
.btn-secondary:hover{background:#E5E7EB}
.meta{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color);font-size:0.75rem;color:var(--text-secondary)}
.meta a{color:var(--primary-color);text-decoration:none}
.meta a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="container">
<div class="model-card">
<div class="model-card-header">
<div class="model-number">#1</div>
<div class="model-metrics">
<div class="download-count" title="${model.downloadCount.toLocaleString()} downloads">
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
<path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
</svg>
${formattedDownloadCount}
</div>
${model.likeCount > 0 ? `<div class="engagement-count" title="${model.likeCount} likes">
<span class="engagement-icon">❤️</span>
<span class="engagement-number">${model.likeCount}</span>
</div>` : ''}
</div>
</div>
<div class="model-name-container">
<h3 class="model-name" title="${model.modelName}">${formattedModelName}</h3>
</div>
<div class="model-details">
<span class="detail-label">Quantization:</span>
<span class="detail-value">
<span class="quantization-badge">${model.quantFormat || 'Unknown'}</span>
</span>
<span class="detail-label">File Size:</span>
<span class="detail-value">${model.fileSizeFormatted}</span>
<span class="detail-label">Model Type:</span>
<span class="detail-value">${model.modelType || 'Unknown'}</span>
<span class="detail-label">License:</span>
<span class="detail-value" title="${model.license}">${model.license || 'Not specified'}</span>
</div>
<div class="model-actions">
<a href="${model.directDownloadLink}" class="btn btn-primary">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
<polyline points="7,10 12,15 17,10"/>
<line x1="12" y1="15" x2="12" y2="3"/>
</svg>
Download GGUF
</a>
<a href="${model.huggingFaceLink}" class="btn btn-secondary">
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
</svg>
Hugging Face
</a>
</div>
<div class="meta">
<p>Pre-rendered page for ${model.modelName}. <a href="${this.baseUrl}/?model=${encodeURIComponent(slug)}">View in full site</a> | <a href="${this.baseUrl}">Browse all models</a></p>
</div>
</div>
</div>
</body>
</html>`;
    }

    /**
     * Format download count like the main site
     */
    formatDownloadCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }

    /**
     * Format model name like the main site
     */
    formatModelName(name) {
        if (name.length > 50) return name.substring(0, 47) + '...';
        return name;
    }

    /**
     * Generate all minimal pages
     */
    async generatePages(models) {
        console.log('🚀 Creating output directory...');
        await fs.mkdir(this.outputDir, { recursive: true });
        
        this.stats.total = models.length;
        console.log(`📝 Generating ${models.length} minimal pages...`);
        
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            
            try {
                const slug = this.createSlug(model.modelName);
                const filename = `${slug}.html`;
                const filepath = path.join(this.outputDir, filename);
                
                const html = this.generateMinimalHTML(model);
                await fs.writeFile(filepath, html, 'utf8');
                
                const stats = await fs.stat(filepath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                
                this.stats.processed++;
                this.stats.totalSize += stats.size;
                
                console.log(`✅ ${filename} - ${sizeKB} KB (${this.stats.processed}/${this.stats.total})`);
                
                if (stats.size > 5120) { // 5KB = 5120 bytes
                    console.log(`⚠️  ${filename} exceeds 5KB limit!`);
                }
                
            } catch (error) {
                this.stats.failed++;
                console.error(`❌ Failed to generate ${model.modelName}:`, error.message);
            }
        }
    }

    /**
     * Main execution
     */
    async run() {
        try {
            console.log('🎯 Starting Minimal Page Generation');
            console.log('📏 Target: Under 5KB per page\n');
            
            const models = await this.loadModelsData();
            await this.generatePages(models);
            
            const avgSize = (this.stats.totalSize / this.stats.processed / 1024).toFixed(2);
            const totalSizeMB = (this.stats.totalSize / 1024 / 1024).toFixed(2);
            
            console.log('\n✅ Minimal page generation completed!');
            console.log(`📊 Generated: ${this.stats.processed} pages`);
            console.log(`❌ Failed: ${this.stats.failed} pages`);
            console.log(`📏 Average size: ${avgSize} KB per page`);
            console.log(`💾 Total size: ${totalSizeMB} MB`);
            console.log(`📁 Output: ${this.outputDir}/`);
            
        } catch (error) {
            console.error('💥 Generation failed:', error);
            process.exit(1);
        }
    }
}

// Run if executed directly
if (require.main === module) {
    const generator = new MinimalPageGenerator();
    generator.run();
}

module.exports = MinimalPageGenerator;