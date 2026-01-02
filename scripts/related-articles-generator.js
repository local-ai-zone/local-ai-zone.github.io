/**
 * Related Articles Generator
 * 
 * This module provides functionality to generate related articles for blog posts
 * based on category, tags, and other metadata.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load article metadata from JSON file
 * @returns {Array} Array of article objects
 */
function loadArticleMetadata() {
    const metadataPath = path.join(__dirname, '..', 'data', 'blog-articles.json');
    
    if (!fs.existsSync(metadataPath)) {
        console.error('Article metadata file not found:', metadataPath);
        return [];
    }
    
    try {
        const data = fs.readFileSync(metadataPath, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.articles || [];
    } catch (error) {
        console.error('Error loading article metadata:', error);
        return [];
    }
}

/**
 * Calculate similarity score between two articles
 * @param {Object} article1 - First article
 * @param {Object} article2 - Second article
 * @returns {number} Similarity score (higher is more similar)
 */
function calculateSimilarity(article1, article2) {
    let score = 0;
    
    // Same category gets highest weight
    if (article1.category === article2.category) {
        score += 10;
    }
    
    // Shared tags
    const tags1 = new Set(article1.tags || []);
    const tags2 = new Set(article2.tags || []);
    const sharedTags = [...tags1].filter(tag => tags2.has(tag));
    score += sharedTags.length * 3;
    
    return score;
}

/**
 * Find related articles for a given article
 * @param {string} currentArticleUrl - URL of the current article
 * @param {number} maxResults - Maximum number of related articles to return (default: 6)
 * @returns {Array} Array of related article objects
 */
function findRelatedArticles(currentArticleUrl, maxResults = 6) {
    const articles = loadArticleMetadata();
    
    // Find the current article
    const currentArticle = articles.find(a => a.url === currentArticleUrl);
    
    if (!currentArticle) {
        console.warn('Current article not found in metadata:', currentArticleUrl);
        return [];
    }
    
    // Calculate similarity scores for all other articles
    const scoredArticles = articles
        .filter(a => a.url !== currentArticleUrl) // Exclude current article
        .map(article => ({
            ...article,
            similarityScore: calculateSimilarity(currentArticle, article)
        }))
        .sort((a, b) => b.similarityScore - a.similarityScore) // Sort by score descending
        .slice(0, maxResults); // Take top N results
    
    return scoredArticles;
}

/**
 * Generate HTML for related articles section
 * @param {string} currentArticleUrl - URL of the current article
 * @param {number} maxResults - Maximum number of related articles to display
 * @returns {string} HTML string for related articles
 */
function generateRelatedArticlesHTML(currentArticleUrl, maxResults = 6) {
    const relatedArticles = findRelatedArticles(currentArticleUrl, maxResults);
    
    if (relatedArticles.length === 0) {
        return `
            <div style="text-align: center; padding: var(--space-8);">
                <p style="color: var(--neutral-600); margin-bottom: var(--space-4);">No related articles found.</p>
                <a href="../blog.html" class="view-all-articles-link">View All Articles</a>
            </div>
        `;
    }
    
    const articleCards = relatedArticles.map(article => {
        // Determine the correct relative path based on article URL
        const articlePath = article.url.startsWith('guides/') || 
                           article.url.startsWith('brands/') || 
                           article.url.startsWith('cpu/') 
            ? article.url 
            : `../${article.url}`;
        
        return `
                    <a href="${articlePath}" class="article-card">
                        <div class="article-card-content">
                            <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                            <p class="article-card-excerpt">${escapeHtml(article.excerpt)}</p>
                            <div class="article-card-footer">
                                <span class="read-more-link">Read More →</span>
                            </div>
                        </div>
                    </a>`;
    }).join('\n');
    
    return articleCards;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Get article metadata by URL
 * @param {string} articleUrl - URL of the article
 * @returns {Object|null} Article metadata or null if not found
 */
function getArticleMetadata(articleUrl) {
    const articles = loadArticleMetadata();
    return articles.find(a => a.url === articleUrl) || null;
}

/**
 * Get all articles by category
 * @param {string} category - Category name (Guides, Brands, CPU)
 * @returns {Array} Array of articles in the category
 */
function getArticlesByCategory(category) {
    const articles = loadArticleMetadata();
    return articles.filter(a => a.category === category);
}

/**
 * Get all articles with a specific tag
 * @param {string} tag - Tag name
 * @returns {Array} Array of articles with the tag
 */
function getArticlesByTag(tag) {
    const articles = loadArticleMetadata();
    return articles.filter(a => a.tags && a.tags.includes(tag));
}

// Export functions
module.exports = {
    loadArticleMetadata,
    findRelatedArticles,
    generateRelatedArticlesHTML,
    getArticleMetadata,
    getArticlesByCategory,
    getArticlesByTag,
    calculateSimilarity
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node related-articles-generator.js <article-url>');
        console.log('Example: node related-articles-generator.js guides/what-is-ai-quantization-q4-k-m-q8-gguf-guide-2025.html');
        process.exit(1);
    }
    
    const articleUrl = args[0];
    const relatedArticles = findRelatedArticles(articleUrl);
    
    console.log(`\nRelated articles for: ${articleUrl}\n`);
    console.log('='.repeat(80));
    
    if (relatedArticles.length === 0) {
        console.log('No related articles found.');
    } else {
        relatedArticles.forEach((article, index) => {
            console.log(`\n${index + 1}. ${article.title}`);
            console.log(`   Category: ${article.category}`);
            console.log(`   URL: ${article.url}`);
            console.log(`   Similarity Score: ${article.similarityScore}`);
            console.log(`   Tags: ${article.tags.join(', ')}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nHTML Output:\n');
    console.log(generateRelatedArticlesHTML(articleUrl));
}
