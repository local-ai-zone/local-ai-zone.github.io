/**
 * SEO Manager - Handles dynamic meta tags and structured data generation
 * for individual model pages and search results
 */

export class SEOManager {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.siteName = 'GGUF Model Discovery';
        this.defaultImage = `${this.baseUrl}/og-image.png`;
    }

    /**
     * Get the base URL for the site
     */
    getBaseUrl() {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        // Fallback for server-side or build-time generation
        return 'https://ggufloader.github.io';
    }

    /**
     * Generate structured data for a specific model
     */
    generateModelStructuredData(model) {
        const modelUrl = `${this.baseUrl}/model/${this.createModelSlug(model.id)}`;
        
        return {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": model.name || model.id,
            "description": model.description || `GGUF quantized AI model: ${model.name || model.id}`,
            "url": modelUrl,
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Cross-platform",
            "programmingLanguage": "GGUF",
            "author": {
                "@type": "Organization",
                "name": model.family || "Unknown",
                "url": `https://huggingface.co/${model.family || ''}`
            },
            "publisher": {
                "@type": "Organization",
                "name": "Hugging Face",
                "url": "https://huggingface.co"
            },
            "downloadUrl": model.files && model.files.length > 0 ? model.files[0].downloadUrl : null,
            "fileSize": model.totalSize ? `${model.totalSize} bytes` : null,
            "dateModified": model.lastModified || new Date().toISOString(),
            "isAccessibleForFree": true,
            "license": "https://huggingface.co/models/licenses",
            "keywords": [
                "GGUF",
                "AI model",
                "machine learning",
                "quantized model",
                model.architecture || "neural network",
                ...(model.tags || [])
            ].filter(Boolean),
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
            },
            "aggregateRating": model.downloads ? {
                "@type": "AggregateRating",
                "ratingValue": Math.min(5, Math.max(1, Math.log10(model.downloads + 1))),
                "ratingCount": model.downloads,
                "bestRating": 5,
                "worstRating": 1
            } : null,
            "mainEntity": {
                "@type": "Dataset",
                "name": `${model.name || model.id} - GGUF Files`,
                "description": `GGUF quantized files for ${model.name || model.id}`,
                "distribution": model.files ? model.files.map(file => ({
                    "@type": "DataDownload",
                    "name": file.filename,
                    "contentUrl": file.downloadUrl,
                    "encodingFormat": "application/octet-stream",
                    "contentSize": file.sizeBytes ? `${file.sizeBytes} bytes` : null
                })) : []
            }
        };
    }

    /**
     * Generate breadcrumb structured data
     */
    generateBreadcrumbStructuredData(breadcrumbs) {
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((crumb, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": crumb.name,
                "item": crumb.url ? `${this.baseUrl}${crumb.url}` : undefined
            }))
        };
    }

    /**
     * Generate search results structured data
     */
    generateSearchResultsStructuredData(query, results, totalCount) {
        return {
            "@context": "https://schema.org",
            "@type": "SearchResultsPage",
            "name": `Search Results for "${query}"`,
            "description": `Found ${totalCount} GGUF models matching "${query}"`,
            "url": `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
            "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": totalCount,
                "itemListElement": results.slice(0, 10).map((model, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "SoftwareApplication",
                        "name": model.name || model.id,
                        "url": `${this.baseUrl}/model/${this.createModelSlug(model.id)}`,
                        "description": model.description || `GGUF quantized AI model: ${model.name || model.id}`
                    }
                }))
            }
        };
    }

    /**
     * Update page meta tags dynamically
     */
    updateMetaTags(options) {
        const {
            title,
            description,
            keywords,
            image,
            url,
            type = 'website',
            model = null
        } = options;

        // Update title
        if (title) {
            document.title = `${title} | ${this.siteName}`;
            this.updateMetaTag('og:title', title);
            this.updateMetaTag('twitter:title', title);
        }

        // Update description
        if (description) {
            this.updateMetaTag('description', description);
            this.updateMetaTag('og:description', description);
            this.updateMetaTag('twitter:description', description);
        }

        // Update keywords
        if (keywords) {
            this.updateMetaTag('keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
        }

        // Update image
        if (image) {
            this.updateMetaTag('og:image', image);
            this.updateMetaTag('twitter:image', image);
        }

        // Update URL and canonical
        if (url) {
            const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
            this.updateMetaTag('og:url', fullUrl);
            this.updateCanonicalUrl(fullUrl);
        }

        // Update type
        this.updateMetaTag('og:type', type);

        // Update structured data
        if (model) {
            this.updateStructuredData('model-data', this.generateModelStructuredData(model));
        }
    }

    /**
     * Update canonical URL
     */
    updateCanonicalUrl(url) {
        let canonical = document.querySelector('link[rel="canonical"]');
        
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        
        canonical.href = url;
    }

    /**
     * Update or create a meta tag
     */
    updateMetaTag(name, content, tagType = 'meta') {
        if (!content) return;

        let selector;
        let attribute;

        if (tagType === 'link') {
            selector = `link[rel="${name}"]`;
            attribute = 'href';
        } else if (name.startsWith('og:') || name.startsWith('twitter:')) {
            selector = `meta[property="${name}"], meta[name="${name}"]`;
            attribute = 'content';
        } else {
            selector = `meta[name="${name}"]`;
            attribute = 'content';
        }

        let element = document.querySelector(selector);
        
        if (!element) {
            element = document.createElement(tagType);
            if (tagType === 'link') {
                element.rel = name;
            } else if (name.startsWith('og:')) {
                element.property = name;
            } else {
                element.name = name;
            }
            document.head.appendChild(element);
        }

        element.setAttribute(attribute, content);
    }

    /**
     * Update structured data script
     */
    updateStructuredData(id, data) {
        let script = document.getElementById(id);
        
        if (!script) {
            script = document.createElement('script');
            script.id = id;
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }

        script.textContent = JSON.stringify(data, null, 2);
    }

    /**
     * Create URL-friendly slug from model ID
     */
    createModelSlug(modelId) {
        return modelId.replace('/', '--').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    }

    /**
     * Generate meta tags for model page
     */
    generateModelPageMeta(model) {
        const modelSlug = this.createModelSlug(model.id);
        const modelUrl = `/model/${modelSlug}`;
        
        const title = `${model.name || model.id} - GGUF Model`;
        const description = model.description || 
            `Download ${model.name || model.id} GGUF quantized AI model. ` +
            `Available in ${model.quantizations?.length || 'multiple'} quantization formats. ` +
            `${model.downloads || 0} downloads from Hugging Face.`;
        
        const keywords = [
            model.name || model.id,
            'GGUF model',
            'AI model download',
            'quantized model',
            model.architecture || 'neural network',
            model.family || 'machine learning',
            ...(model.quantizations || []),
            ...(model.tags || [])
        ].filter(Boolean);

        return {
            title,
            description,
            keywords,
            url: modelUrl,
            type: 'article',
            model
        };
    }

    /**
     * Generate meta tags for search results page
     */
    generateSearchPageMeta(query, resultCount) {
        const title = query ? 
            `Search Results for "${query}" - ${resultCount} GGUF Models Found` :
            'Search GGUF Models - AI Model Discovery';
        
        const description = query ?
            `Found ${resultCount} GGUF AI models matching "${query}". Browse and download quantized models from Hugging Face.` :
            'Search through thousands of GGUF quantized AI models. Find the perfect model for your project with advanced filtering.';

        const keywords = [
            'GGUF model search',
            'AI model discovery',
            'quantized models',
            'machine learning models',
            query || 'model search'
        ].filter(Boolean);

        return {
            title,
            description,
            keywords,
            url: query ? `/search?q=${encodeURIComponent(query)}` : '/search',
            type: 'website'
        };
    }

    /**
     * Generate meta tags for family page
     */
    generateFamilyPageMeta(family, modelCount) {
        const title = `${family} Models - ${modelCount} GGUF Models Available`;
        const description = `Browse ${modelCount} GGUF quantized AI models from ${family}. Download high-quality quantized models optimized for inference.`;
        
        const keywords = [
            `${family} models`,
            'GGUF models',
            'AI models',
            'quantized models',
            family,
            'machine learning'
        ];

        return {
            title,
            description,
            keywords,
            url: `/family/${family.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            type: 'website'
        };
    }

    /**
     * Update breadcrumb navigation with structured data
     */
    updateBreadcrumbs(breadcrumbs) {
        // Update HTML breadcrumbs
        const breadcrumbNav = document.querySelector('[aria-label="Breadcrumb"] ol');
        if (breadcrumbNav) {
            breadcrumbNav.innerHTML = breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return `
                    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        ${isLast ? 
                            `<span class="text-gray-900 font-medium" itemprop="name">${crumb.name}</span>` :
                            `<a href="${crumb.url}" class="text-gray-500 hover:text-gray-700" itemprop="item">
                                <span itemprop="name">${crumb.name}</span>
                            </a>`
                        }
                        <meta itemprop="position" content="${index + 1}" />
                        ${!isLast ? `
                            <svg class="h-4 w-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        ` : ''}
                    </li>
                `;
            }).join('');
        }

        // Update structured data
        this.updateStructuredData('breadcrumb-data', this.generateBreadcrumbStructuredData(breadcrumbs));
    }
}

// Export singleton instance
export const seoManager = new SEOManager();