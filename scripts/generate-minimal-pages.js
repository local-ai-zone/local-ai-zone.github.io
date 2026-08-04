#!/usr/bin/env node

/**
 * Minimal Page Generator for GGUF Models
 * 
 * Creates lightweight HTML pages under 5KB for each model
 * with essential SEO and model information only
 */

const fs = require('fs').promises;
const path = require('path');
const { createSlug } = require('./slug-utils');
const { deriveShardPartURLs, shardDirectoryOf, shardTreeUrl, htmlEscape } = require('./shard-urls');

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
            totalSize: 0,
            removedStale: 0
        };
        this.generatedSlugs = new Set();
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
     * Calculate hardware requirements for a model
     */
    calculateHardwareRequirements(model) {
        try {
            // Validate input
            if (!model || !model.modelName) {
                return { minCpuCores: 4, minRamGB: 8, gpuRequired: false, osSupported: ["Windows", "Linux", "macOS"] };
            }

            // Extract parameter count from model name if available
            const parameterMatch = model.modelName.match(/(\d+(?:\.\d+)?)[Bb]/i);
            const estimatedParams = parameterMatch ? parseFloat(parameterMatch[1]) * 1000000000 : null;
            
            // Calculate requirements based on file size and parameters
            const fileSize = model.fileSize || 0;
            const fileSizeGB = fileSize / (1024 * 1024 * 1024);
            
            // CPU requirements based on model size
            let minCpuCores = 4; // Default
            if (estimatedParams) {
                if (estimatedParams >= 70000000000) minCpuCores = 12; // 70B+ models
                else if (estimatedParams >= 13000000000) minCpuCores = 8; // 13B+ models
                else if (estimatedParams >= 7000000000) minCpuCores = 6; // 7B+ models
            } else if (fileSizeGB >= 40) {
                minCpuCores = 12;
            } else if (fileSizeGB >= 8) {
                minCpuCores = 8;
            } else if (fileSizeGB >= 4) {
                minCpuCores = 6;
            }
            
            // RAM requirements (2x file size with quantization adjustments)
            let ramMultiplier = 2.0;
            if (model.quantFormat && model.quantFormat.includes('Q4')) {
                ramMultiplier = 1.5; // 4-bit quantization uses less RAM
            } else if (model.quantFormat && model.quantFormat.includes('Q8')) {
                ramMultiplier = 1.8; // 8-bit quantization
            }
            
            const minRamGB = Math.max(4, Math.ceil(fileSizeGB * ramMultiplier));
            
            // GPU requirements for large models
            const gpuRequired = estimatedParams ? estimatedParams >= 13000000000 : fileSizeGB >= 8;
            
            return {
                minCpuCores,
                minRamGB,
                gpuRequired,
                osSupported: ["Windows", "Linux", "macOS"]
            };
        } catch (error) {
            console.warn(`Error calculating hardware requirements for ${model?.modelName || 'unknown model'}:`, error.message);
            return { minCpuCores: 4, minRamGB: 8, gpuRequired: false, osSupported: ["Windows", "Linux", "macOS"] };
        }
    }

    /**
     * Format engagement metrics with validation
     */
    formatEngagementMetrics(model) {
        try {
            const likeCount = model.likeCount || 0;
            
            // Validate like count
            if (typeof likeCount !== 'number' || likeCount < 0 || isNaN(likeCount)) {
                return { display: false, html: '' };
            }
            
            if (likeCount === 0) {
                return {
                    display: false,
                    html: ''
                };
            }
            
            const formattedCount = this.formatDownloadCount(likeCount);
            const heartIcon = likeCount >= 100 ? '💖' : likeCount >= 50 ? '❤️' : '🤍';
            
            return {
                display: true,
                html: `<div class="engagement-count" title="${likeCount} likes">
                    <span class="engagement-icon">${heartIcon}</span>
                    <span class="engagement-number">${formattedCount}</span>
                </div>`
            };
        } catch (error) {
            console.warn(`Error formatting engagement metrics for ${model?.modelName || 'unknown model'}:`, error.message);
            return { display: false, html: '' };
        }
    }

    /**
     * Generate system requirements HTML
     */
    generateSystemRequirementsHTML(requirements, model) {
        if (!requirements.minCpuCores && !requirements.minRamGB) {
            return '';
        }
        
        return `
            <div class="system-requirements">
                <h4 class="requirements-title">System Requirements</h4>
                <div class="requirements-grid">
                    <div class="requirement-item">
                        <div class="requirement-icon">🖥️</div>
                        <div class="requirement-content">
                            <span class="requirement-label">CPU</span>
                            <span class="requirement-value">${requirements.minCpuCores}+ cores</span>
                        </div>
                    </div>
                    <div class="requirement-item">
                        <div class="requirement-icon">💾</div>
                        <div class="requirement-content">
                            <span class="requirement-label">RAM</span>
                            <span class="requirement-value">${requirements.minRamGB}+ GB</span>
                        </div>
                    </div>
                    ${requirements.gpuRequired ? `
                        <div class="requirement-item gpu-required">
                            <div class="requirement-icon">🎮</div>
                            <div class="requirement-content">
                                <span class="requirement-label">GPU</span>
                                <span class="requirement-value">Recommended</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                ${this.generateHardwareCompatibilityHTML(model, requirements)}
            </div>
        `;
    }

    /**
     * Generate hardware compatibility indicator
     */
    generateHardwareCompatibilityHTML(model, requirements) {
        // Simple compatibility check based on common hardware configurations
        const commonConfigs = [
            { name: 'Entry Level', cpu: 4, ram: 8, gpu: false },
            { name: 'Mid Range', cpu: 6, ram: 16, gpu: false },
            { name: 'High End', cpu: 8, ram: 32, gpu: true },
            { name: 'Enthusiast', cpu: 12, ram: 64, gpu: true }
        ];
        
        const compatibleConfigs = commonConfigs.filter(config => 
            config.cpu >= requirements.minCpuCores && 
            config.ram >= requirements.minRamGB &&
            (!requirements.gpuRequired || config.gpu)
        );
        
        if (compatibleConfigs.length === 0) {
            return `
                <div class="compatibility-indicator">
                    <span class="compatibility-status incompatible">⚠️ High-end hardware required</span>
                </div>
            `;
        }
        
        const lowestCompatible = compatibleConfigs[0];
        return `
            <div class="compatibility-indicator">
                <span class="compatibility-status compatible">✅ ${lowestCompatible.name}+ compatible</span>
            </div>
        `;
    }

    /**
     * Format upload date for display
     */
    formatUploadDate(uploadDate) {
        try {
            if (!uploadDate) {
                return 'Upload date not available';
            }
            
            const date = new Date(uploadDate);
            if (isNaN(date.getTime())) {
                return 'Upload date not available';
            }
            
            // Check if it's within the last 7 days for "Recently uploaded" label
            const now = new Date();
            const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const formattedDate = date.toLocaleDateString('en-US', options);
            
            if (daysDiff <= 7) {
                return `${formattedDate} (Recently uploaded)`;
            }
            
            return formattedDate;
        } catch (error) {
            console.warn(`Error formatting upload date for ${uploadDate}:`, error.message);
            return 'Upload date not available';
        }
    }

    /**
     * Generate minimal HTML template that replicates the model card design
     */
    generateMinimalHTML(model) {
        const slug = createSlug(model.modelName);
        const pageUrl = `${this.baseUrl}/models/${slug}.html`;
        const formattedDownloadCount = this.formatDownloadCount(model.downloadCount);
        const formattedModelName = this.formatModelName(model.modelName);
        const formattedUploadDate = this.formatUploadDate(model.uploadDate);
        
        // Calculate hardware requirements
        const hardwareReqs = this.calculateHardwareRequirements(model);
        
        // Format engagement metrics
        const engagementMetrics = this.formatEngagementMetrics(model);
        
        // Multi-part (sharded) files: derive the full URL set + repo tree.
        // Static pages have no JS, so the copy affordance is a <details>
        // block whose <textarea> holds every part URL for manual copy.
        //
        // "Sharded" is decided by the shardParts FIELD (like the app's
        // getDownloadTargets), so a sharded-but-unparseable filename still
        // gets the "· N parts" chip + tree download link; only the URL-list
        // textarea needs a parseable filename (deriveShardPartURLs).
        const shardPartsField = parseInt(model.shardParts, 10) || 0;
        // Gated on modelId only (like shardTreeUrl): with modelId present,
        // isSharded ⟹ shardTree non-empty, so chip ⟺ tree ⟺ label by
        // construction. The huggingFaceLink OR would create a page that
        // claims "· N parts" while the download button grabs a single part.
        const isSharded = shardPartsField > 1 && !!(model.modelId);
        const shardUrls = deriveShardPartURLs(model);
        const shardTree = shardTreeUrl(model);
        const shardDir = shardDirectoryOf(model);
        const partsCount = isSharded ? shardPartsField : 0;
        const downloadHref = isSharded && shardTree ? shardTree : (model.directDownloadLink || '#');
        const downloadLabel = isSharded && shardTree ? `Download ${partsCount} Parts` : 'Download GGUF';
        
        // SEO: multi-part models get the "(N parts)" marker in the title and
        // a "split into N parts" clause in the descriptions, differentiating
        // them from single-file quant pages of the same model.
        const titlePartsSuffix = partsCount > 1 ? ` (${partsCount} parts)` : '';
        const descPartsClause = partsCount > 1 ? ` Split into ${partsCount} parts.` : '';
        const seoTitle = `${model.modelName} - GGUF Model${titlePartsSuffix}`;
        const seoDescription = `Download ${model.modelName} GGUF model. ${model.fileSizeFormatted || 'N/A'}, ${model.downloadCount.toLocaleString()} downloads, ${model.likeCount} likes.${descPartsClause}`;
        const seoOgDescription = `Download ${model.modelName} GGUF model. ${model.fileSizeFormatted || 'N/A'}, ${model.downloadCount.toLocaleString()} downloads.${descPartsClause}`;
        
        // When the filename's own "of-N" total disagrees with shardParts
        // (pathological repos with overlapping shard families), the derived
        // URL list may point at files that don't exist. Mirror the app's
        // "fall back to the tree on mismatch" behavior: keep the chip + tree
        // link, skip the URL-list textarea.
        const shardTotalMatches = (() => {
            const m = /-(\d+)-of-(\d+)(?=\.gguf$)/i.exec(String(model.filename || '').replace(/\\/g, '/'));
            return !m || parseInt(m[2], 10) === shardPartsField;
        })();
        const showCopyBlock = shardUrls.length > 1 && shardTotalMatches;
        
        // JSON-LD structured data for search engines: sharded pages expose
        // the full multi-part file inventory (one DataDownload per shard).
        // Only advertise the derived URL list when it's trustworthy — the
        // same mismatch guard that skips the copy-block textarea applies,
        // so pathological repos never publish possibly-404 shard URLs.
        // Reuse the SEO title/description so JSON-LD never diverges from
        // the visible <title> and meta description.
        const jsonLd = this.generateJSONLD(model, showCopyBlock ? shardUrls : [], seoTitle, seoDescription);
        
        // Parts UI CSS is emitted only on sharded pages (keeps plain pages lean).
        const partsCss = partsCount > 1
            ? '.parts-count{font-size:0.75rem;color:var(--secondary-color);font-weight:500}'
            + '.parts-box{margin-top:0.5rem;border:1px solid var(--border-color);border-radius:var(--border-radius);background:#F8FAFC}'
            + '.parts-box summary{cursor:pointer;padding:0.625rem 0.75rem;font-size:0.8125rem;font-weight:600;color:var(--primary-color)}'
            + '.parts-box summary:hover{background:#EFF6FF}'
            + '.parts-list{display:block;width:100%;box-sizing:border-box;padding:0.5rem;margin:0;border:0;border-top:1px solid var(--border-color);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:0.6875rem;line-height:1.5;color:var(--text-primary);background:var(--card-background);resize:vertical;overflow:auto}'
            + '.parts-hint{margin:0;padding:0.5rem 0.75rem;font-size:0.6875rem;color:var(--text-secondary)}'
            + '.parts-hint a{color:var(--primary-color)}'
            // The one-click copy button is a progressive enhancement: hidden
            // by default, revealed only when the inline script adds the 'js'
            // class to <html>. Without JS the select-all textarea remains.
            + '.parts-copy-btn{display:none;margin:0.625rem 0.75rem 0;padding:0.375rem 0.75rem;border:0;border-radius:var(--border-radius);background:var(--primary-color);color:#fff;font-size:0.75rem;font-weight:600;cursor:pointer}'
            + 'html.js .parts-copy-btn{display:inline-block}'
            + '.parts-copy-btn:hover{background:#2563EB}'
            + '.parts-status{color:var(--success-color);font-weight:600}'
            : '';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${seoTitle}</title>
<meta name="description" content="${seoDescription}">
<meta name="keywords" content="${model.modelName}, GGUF, ${model.quantFormat}, ${model.modelCapability || 'text'}, download, AI model">
<link rel="canonical" href="${pageUrl}">
<meta property="og:title" content="${seoTitle}">
<meta property="og:description" content="${seoOgDescription}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
${jsonLd}
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
.engagement-count .engagement-icon{font-size:0.875rem}
.engagement-count .engagement-number{font-weight:500}
.model-name-container{margin-bottom:1rem}
.model-name{font-size:1.125rem;font-weight:600;color:var(--text-primary);margin:0;word-break:break-word}
.model-details{display:grid;grid-template-columns:auto 1fr;gap:0.5rem 1rem;margin-bottom:1.5rem;font-size:0.875rem}
.detail-label{color:var(--text-secondary);font-weight:500}
.detail-value{color:var(--text-primary)}
.quantization-badge{background:#EFF6FF;color:var(--primary-color);padding:0.125rem 0.5rem;border-radius:9999px;font-size:0.75rem;font-weight:500}
.capability-badge{padding:0.125rem 0.5rem;border-radius:var(--border-radius);font-size:0.75rem;font-weight:600;text-transform:capitalize}
.system-requirements{margin-bottom:1.5rem;padding:1rem;background:#F8FAFC;border:1px solid var(--border-color);border-radius:var(--border-radius)}
.requirements-title{font-size:0.875rem;font-weight:600;color:var(--text-primary);margin-bottom:0.75rem}
.requirements-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.75rem}
.requirement-item{display:flex;align-items:center;gap:0.5rem}
.requirement-item.gpu-required{grid-column:1/-1}
.requirement-icon{font-size:1rem}
.requirement-content{display:flex;flex-direction:column;gap:0.125rem}
.requirement-label{font-size:0.75rem;color:var(--text-secondary);font-weight:500}
.requirement-value{font-size:0.75rem;color:var(--text-primary);font-weight:600}
.compatibility-indicator{margin-top:0.5rem;text-align:center}
.compatibility-status{font-size:0.75rem;padding:0.25rem 0.5rem;border-radius:var(--border-radius);font-weight:500}
.compatibility-status.compatible{background:#DCFCE7;color:#166534}
.compatibility-status.incompatible{background:#FEE2E2;color:#DC2626}
.model-actions{display:flex;gap:0.5rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;border-radius:var(--border-radius);text-decoration:none;font-size:0.875rem;font-weight:500;transition:var(--transition)}
.btn-primary{background:var(--primary-color);color:white}
.btn-primary:hover{background:#2563EB}
.btn-secondary{background:#F3F4F6;color:var(--text-primary);border:1px solid var(--border-color)}
.btn-secondary:hover{background:#E5E7EB}
.meta{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color);font-size:0.75rem;color:var(--text-secondary)}
.meta a{color:var(--primary-color);text-decoration:none}
.meta a:hover{text-decoration:underline}
${partsCss}
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
${engagementMetrics.display ? engagementMetrics.html : ''}
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
<span class="detail-value">${model.fileSizeFormatted}${partsCount > 1 ? ` <span class="parts-count" title="Split into ${partsCount} parts — the size shown is the combined total">· ${partsCount} parts</span>` : ''}</span>
<span class="detail-label">Capability:</span>
<span class="detail-value">${this.formatCapability(model.modelCapability || 'text')}</span>
<span class="detail-label">License:</span>
<span class="detail-value" title="${model.license}">${model.license || 'Not specified'}</span>
<span class="detail-label">Upload Date:</span>
<span class="detail-value">${formattedUploadDate}</span>
</div>
${this.generateSystemRequirementsHTML(hardwareReqs, model)}
<div class="model-actions">
<a href="${downloadHref}" class="btn btn-primary">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
<polyline points="7,10 12,15 17,10"/>
<line x1="12" y1="15" x2="12" y2="3"/>
</svg>
${downloadLabel}
</a>
<a href="${model.huggingFaceLink}" class="btn btn-secondary">
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
</svg>
Hugging Face
</a>
</div>
${showCopyBlock ? `
<details class="parts-box">
<summary>Copy All Parts Links (${shardUrls.length})</summary>
<button type="button" class="parts-copy-btn">Copy All ${shardUrls.length} Links</button>
<textarea class="parts-list" readonly rows="${Math.min(8, shardUrls.length)}" onclick="this.select()" aria-label="All ${shardUrls.length} part download URLs">${htmlEscape(shardUrls.join('\n'))}</textarea>
<p class="parts-hint"><span class="parts-status" aria-live="polite"></span>Select all (Ctrl+A / Cmd+A) then copy, or <a href="${shardTree}">browse the ${shardDir ? `${htmlEscape(shardDir)} folder` : 'files'} on Hugging Face</a>.</p>
</details>
<script>
(function () {
    'use strict';
    // Progressive enhancement for the copy block: reveal the one-click
    // button and wire it up. Without JS the button stays hidden and the
    // select-all textarea above remains fully functional.
    document.documentElement.classList.add('js');
    var box = document.querySelector('.parts-box');
    if (!box) return;
    var btn = box.querySelector('.parts-copy-btn');
    var list = box.querySelector('.parts-list');
    var status = box.querySelector('.parts-status');
    if (!btn || !list || !status) return;
    btn.addEventListener('click', function () {
        var text = list.value;
        var count = text.split('\\n').length;
        var done = function () {
            status.textContent = 'Copied ' + count + ' part links to clipboard!';
            btn.textContent = 'Copied!';
            setTimeout(function () {
                status.textContent = '';
                btn.textContent = 'Copy All ' + count + ' Links';
            }, 2500);
        };
        function fallbackCopy() {
            list.focus(); list.select();
            try {
                if (document.execCommand('copy')) { done(); return; }
            } catch (e) {}
            // execCommand failed too — leave the textarea selected and tell
            // the user to press Ctrl+C (the no-JS fallback still applies).
            status.textContent = 'Select the text and press Ctrl+C to copy';
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () {
                // Async API rejected (permissions / sandboxed frame): fall
                // back to the legacy execCommand path, which often still
                // works where writeText is blocked.
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }
    });
})();
</script>
` : ''}
<div class="meta">
<p>Pre-rendered page for ${model.modelName}. <a href="${this.baseUrl}/?model=${encodeURIComponent(slug)}">View in full site</a> | <a href="${this.baseUrl}">Browse all models</a></p>
</div>
</div>
</div>
</body>
</html>`;
    }

    /**
     * JSON-LD structured data (schema.org Dataset) for the page.
     *
     * Sharded model pages carry the FULL file inventory as a
     * ``distribution`` array of ``DataDownload`` entries (one per part), so
     * search engines index every shard URL, not just part 1. Emitted on
     * sharded pages only; plain single-file pages stay lean.
     *
     * @param {Object} model - model entry
     * @param {string[]} shardUrls - derived part URLs (may be [])
     * @param {string} seoTitle - page title (already includes the parts marker)
     * @param {string} seoDescription - meta description (already includes the
     *   parts clause), kept in sync with the visible metadata
     * @returns {string} JSON-LD <script> HTML, or '' for non-sharded pages
     */
    generateJSONLD(model, shardUrls, seoTitle, seoDescription) {
        const parts = parseInt(model.shardParts, 10) || 0;
        if (!(parts > 1)) return '';
        
        const slug = createSlug(model.modelName);
        const pageUrl = `${this.baseUrl}/models/${slug}.html`;
        const urls = Array.isArray(shardUrls) ? shardUrls : [];
        
        const distribution = urls.map((url) => {
            let filename = String(url.split('/').pop() || '');
            try {
                filename = decodeURIComponent(filename);
            } catch (error) {
                // Un-decodable tail — keep raw
            }
            return {
                '@type': 'DataDownload',
                name: filename,
                contentUrl: url,
                encodingFormat: 'application/octet-stream'
            };
        });
        
        const data = {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: seoTitle || `${model.modelName} - GGUF Model`,
            description: seoDescription || `Download ${model.modelName} GGUF model. ${model.fileSizeFormatted || 'N/A'}, ${model.downloadCount.toLocaleString()} downloads, ${model.likeCount} likes.`,
            url: pageUrl,
            sameAs: model.huggingFaceLink || undefined,
            license: model.license || 'Not specified',
            dateCreated: model.uploadDate || undefined,
            publisher: { '@type': 'Organization', name: 'Local AI Zone' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
            isAccessibleForFree: true,
            ...(distribution.length > 1 ? { distribution } : {})
        };
        
        // JSON-LD inside <script> must never contain "</script>": escape '<'
        // as \u003c (valid JSON, decoded back to '<' by parsers).
        const json = JSON.stringify(data).replace(/</g, '\\u003c');
        return `\n<script type="application/ld+json">\n${json}\n</script>`;
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
     * Format capability with colored badge
     */
    formatCapability(capability) {
        const capabilityConfig = {
            vision: { label: 'Vision', color: '#8B5CF6' },
            embedding: { label: 'Embedding', color: '#06B6D4' },
            code: { label: 'Code', color: '#10B981' },
            audio: { label: 'Audio', color: '#F59E0B' },
            text: { label: 'Text', color: '#6B7280' },
            moe: { label: 'Multi-Model (MoE)', color: '#EC4899' }
        };
        
        const config = capabilityConfig[capability] || capabilityConfig.text;
        return `<span class="capability-badge" style="background:${config.color}15;color:${config.color};border:1px solid ${config.color}30">${config.label}</span>`;
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
                const slug = createSlug(model.modelName);
                const filename = `${slug}.html`;
                const filepath = path.join(this.outputDir, filename);
                
                const html = this.generateMinimalHTML(model);
                
                // Validate HTML before writing
                if (!html || html.length < 100) {
                    throw new Error('Generated HTML is too short or empty');
                }
                
                await fs.writeFile(filepath, html, 'utf8');
                // Redundant on the run() path (selection pre-populates the set),
                // but a safety net when generatePages() is called directly.
                this.generatedSlugs.add(slug);
                
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
     * Remove pre-rendered pages whose models are no longer in the current
     * top-N selection, so stale pages can't accumulate and produce 404s.
     *
     * Only deletes slug-shaped files (``<slug>.html``) — anything else in the
     * output directory (README, assets, subfolders) is left untouched.
     */
    async cleanupStalePages() {
        // Safety guard: an empty keep-set means the catalog produced no models
        // (e.g. gguf_models.json is `[]`). Deleting every page then would wipe
        // the whole models/ directory — never do that.
        if (this.generatedSlugs.size === 0) {
            console.log('⚠️  Skipping cleanup: no models in the current selection');
            return;
        }
        
        console.log('🧹 Cleaning up stale pages...');
        
        let files;
        try {
            files = await fs.readdir(this.outputDir);
        } catch (error) {
            console.error(`⚠️  Could not read output directory ${this.outputDir}:`, error.message);
            return;
        }
        
        const slugShape = /^[a-z0-9-]+\.html$/;
        
        for (const file of files) {
            // Only consider slug-shaped model pages
            if (!slugShape.test(file)) {
                continue;
            }
            
            const slug = file.replace(/\.html$/, '');
            if (this.generatedSlugs.has(slug)) {
                continue;
            }
            
            try {
                await fs.unlink(path.join(this.outputDir, file));
                this.stats.removedStale++;
                console.log(`🗑️  Removed stale page: ${file}`);
            } catch (error) {
                console.warn(`⚠️  Could not remove ${file}:`, error.message);
            }
        }
        
        if (this.stats.removedStale === 0) {
            console.log('✨ No stale pages to remove');
        } else {
            console.log(`🧹 Cleanup complete: removed ${this.stats.removedStale} stale page(s)`);
        }
    }

    /**
     * Main execution
     */
    async run() {
        try {
            console.log('🎯 Starting Enhanced Minimal Page Generation');
            console.log('📏 Target: Under 5KB per page');
            console.log('🚀 Features: Hardware requirements, engagement metrics, system requirements\n');
            
            const models = await this.loadModelsData();
            
            // The keep-set comes from the SELECTION (top-N models), not from
            // which writes happened to succeed this run. If a page write fails
            // transiently, its existing page must NOT be treated as stale and
            // deleted — cleanup only removes pages outside the selection.
            this.generatedSlugs = new Set(
                models.map((m) => createSlug(m.modelName)).filter(Boolean)
            );
            
            await this.generatePages(models);
            await this.cleanupStalePages();
            
            const avgSize = (this.stats.totalSize / this.stats.processed / 1024).toFixed(2);
            const totalSizeMB = (this.stats.totalSize / 1024 / 1024).toFixed(2);
            
            // Calculate feature statistics
            const modelsWithHardwareReqs = models.filter(m => {
                const reqs = this.calculateHardwareRequirements(m);
                return reqs.minCpuCores > 0 || reqs.minRamGB > 0;
            }).length;
            
            const modelsWithEngagement = models.filter(m => (m.likeCount || 0) > 0).length;
            
            console.log('\n✅ Enhanced minimal page generation completed!');
            console.log(`📊 Generated: ${this.stats.processed} pages`);
            console.log(`❌ Failed: ${this.stats.failed} pages`);
            console.log(`🗑️ Stale pages removed: ${this.stats.removedStale}`);
            console.log(`📏 Average size: ${avgSize} KB per page`);
            console.log(`💾 Total size: ${totalSizeMB} MB`);
            console.log(`🖥️ Models with hardware requirements: ${modelsWithHardwareReqs}`);
            console.log(`❤️ Models with engagement data: ${modelsWithEngagement}`);
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