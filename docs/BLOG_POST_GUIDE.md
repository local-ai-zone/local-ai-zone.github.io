# Guide for Adding New Blog Posts

## Overview

This guide walks you through the process of creating and publishing new blog posts on the Local AI Zone website. Follow these steps to ensure your blog post is properly formatted, SEO-optimized, and consistent with the site's design.

## Quick Start

1. Choose your blog post category (Guides, Brands, or CPU)
2. Create HTML file using the template
3. Add article metadata to `data/blog-articles.json`
4. Write your content
5. Generate related articles
6. Test and validate
7. Deploy

## Step-by-Step Guide

### Step 1: Choose Category

Blog posts are organized into three main categories:

- **Guides** (`guides/`): How-to articles, tutorials, best practices
- **Brands** (`brands/`): AI model brand overviews and comparisons
- **CPU** (`cpu/`): Hardware-specific recommendations and guides

Choose the category that best fits your content.

### Step 2: Create HTML File

#### File Naming Convention

Use kebab-case (lowercase with hyphens):
```
good-example-article-title-2025.html
```

**Best Practices:**
- Keep it concise but descriptive
- Include year for time-sensitive content
- Use keywords for SEO
- Avoid special characters

#### Copy Template

```bash
# Copy the template to your category directory
cp templates/blog-post-template.html guides/your-article-title.html
```

Or manually create a new file and copy the template structure from `templates/blog-post-template.html`.

### Step 3: Update Head Section

#### Title Tag
```html
<title>Your Article Title | Local AI Zone</title>
```
- Keep under 60 characters
- Include primary keyword
- Add site name for branding

#### Meta Description
```html
<meta name="description" content="A compelling 150-160 character summary of your article that includes primary keywords and encourages clicks.">
```
- 150-160 characters optimal
- Include primary keyword
- Make it compelling
- Avoid duplicate descriptions

#### Keywords
```html
<meta name="keywords" content="primary keyword, secondary keyword, related term, ai models, gguf">
```
- 5-10 relevant keywords
- Include variations
- Don't keyword stuff

#### Open Graph Tags
```html
<meta property="og:title" content="Your Article Title">
<meta property="og:description" content="Article description for social sharing">
<meta property="og:type" content="article">
<meta property="og:url" content="https://localaizone.com/guides/your-article-title.html">
<meta property="og:image" content="https://localaizone.com/images/og-image.png">
```

#### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your Article Title">
<meta name="twitter:description" content="Article description">
<meta name="twitter:image" content="https://localaizone.com/images/og-image.png">
```

#### Canonical URL
```html
<link rel="canonical" href="https://localaizone.com/guides/your-article-title.html">
```

#### Structured Data (JSON-LD)
```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Your Article Title",
    "description": "Article description",
    "author": {
        "@type": "Organization",
        "name": "GGUF Loader Team"
    },
    "datePublished": "2025-01-08T00:00:00Z",
    "dateModified": "2025-01-08T00:00:00Z",
    "publisher": {
        "@type": "Organization",
        "name": "Local AI Zone",
        "logo": {
            "@type": "ImageObject",
            "url": "https://localaizone.com/logo.svg"
        }
    }
}
</script>
```

### Step 4: Update Breadcrumbs

```html
<nav class="breadcrumb-nav" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li aria-current="page">Your Article Title</li>
    </ol>
</nav>
```

### Step 5: Update Article Header

```html
<header class="article-header">
    <div class="article-meta">
        <span class="article-category">Guides</span>
        <time datetime="2025-01-08">January 8, 2025</time>
    </div>
    <h1 class="article-title">Your Article Title</h1>
    <div class="article-actions">
        <a href="../blog.html" class="back-to-blog-btn">
            ← Back to Blog
        </a>
    </div>
</header>
```

**Category Options:**
- Guides
- Brands
- CPU

**Date Format:**
- `datetime` attribute: ISO 8601 format (YYYY-MM-DD)
- Display text: "Month Day, Year" (e.g., "January 8, 2025")

### Step 6: Write Article Content

#### Content Structure

```html
<div class="article-content">
    <h2>Introduction</h2>
    <p>Opening paragraph that hooks the reader...</p>
    
    <h2>Main Section</h2>
    <p>Content paragraph...</p>
    
    <h3>Subsection</h3>
    <p>More detailed content...</p>
    
    <h2>Conclusion</h2>
    <p>Wrap up and call to action...</p>
</div>
```

#### Heading Hierarchy

- **H1**: Article title (only one per page)
- **H2**: Main sections
- **H3**: Subsections
- **H4**: Sub-subsections (use sparingly)

Never skip heading levels (e.g., don't go from h2 to h4).

#### Paragraphs

```html
<p>Keep paragraphs concise and focused on one idea. Use short sentences for better readability.</p>
```

#### Lists

**Unordered Lists:**
```html
<ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
</ul>
```

**Ordered Lists:**
```html
<ol>
    <li>Step one</li>
    <li>Step two</li>
    <li>Step three</li>
</ol>
```

#### Code Blocks

**Inline Code:**
```html
<p>Use the <code>--model</code> flag to specify the model.</p>
```

**Code Blocks:**
```html
<pre><code>npm install gguf-loader
node index.js --model llama-7b.gguf</code></pre>
```

#### Blockquotes

```html
<blockquote>
    <p>Important quote or callout text goes here.</p>
</blockquote>
```

#### Links

```html
<a href="https://example.com">Link text</a>
```

**Best Practices:**
- Use descriptive link text (not "click here")
- Open external links in new tab: `target="_blank" rel="noopener noreferrer"`
- Use relative paths for internal links

#### Images

```html
<img src="../images/filename.png" alt="Descriptive alt text" loading="lazy">
```

**Best Practices:**
- Always include descriptive alt text
- Use `loading="lazy"` for images below the fold
- Optimize images (WebP format, compressed)
- Use relative paths: `../images/`

#### Tables

```html
<table>
    <thead>
        <tr>
            <th>Header 1</th>
            <th>Header 2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Data 1</td>
            <td>Data 2</td>
        </tr>
    </tbody>
</table>
```

### Step 7: Add Article Metadata

Edit `data/blog-articles.json` and add your article:

```json
{
    "title": "Your Article Title",
    "url": "guides/your-article-title.html",
    "category": "Guides",
    "excerpt": "A brief 1-2 sentence summary of the article that will appear in article cards.",
    "publishDate": "2025-01-08",
    "lastUpdated": "2025-01-08",
    "author": "GGUF Loader Team",
    "tags": ["ai models", "gguf", "tutorial"],
    "relatedArticles": [
        "guides/related-article-1.html",
        "guides/related-article-2.html",
        "guides/related-article-3.html"
    ]
}
```

**Field Descriptions:**
- `title`: Article title (matches h1)
- `url`: Relative path to HTML file
- `category`: "Guides", "Brands", or "CPU"
- `excerpt`: 1-2 sentences for article cards
- `publishDate`: YYYY-MM-DD format
- `lastUpdated`: YYYY-MM-DD format (update when content changes)
- `author`: Author name or organization
- `tags`: Array of relevant keywords
- `relatedArticles`: Array of related article URLs (3-6 recommended)

### Step 8: Generate Related Articles

#### Option 1: Use Migration Script

```bash
node scripts/migrate-blog-posts.js --file guides/your-article-title.html
```

This will automatically generate related articles based on category and tags.

#### Option 2: Manual Generation

Use the related articles generator:

```bash
node scripts/related-articles-generator.js guides/your-article-title.html
```

#### Option 3: Manual HTML

Add related articles manually to your HTML:

```html
<section class="related-articles-section">
    <h2 class="section-title">Related Articles</h2>
    <div class="articles-grid">
        <a href="related-article-1.html" class="article-card">
            <div class="article-card-content">
                <h3 class="article-card-title">Related Article Title</h3>
                <p class="article-card-excerpt">Brief description...</p>
                <div class="article-card-footer">
                    <span class="read-more-link">Read More →</span>
                </div>
            </div>
        </a>
        <!-- Repeat for 3-6 articles -->
    </div>
</section>
```

### Step 9: Test Your Article

#### Visual Testing

1. Open the HTML file in a browser
2. Check that all elements display correctly
3. Test responsive design (resize browser)
4. Test on mobile device or emulator

#### Validation

```bash
# Validate SEO
node scripts/validate-seo-preservation.js guides/your-article-title.html

# Validate accessibility
node scripts/verify-accessibility.js guides/your-article-title.html

# Validate mobile responsiveness
node scripts/verify-mobile-responsive.js guides/your-article-title.html
```

#### Manual Checks

- [ ] Title tag is unique and descriptive
- [ ] Meta description is 150-160 characters
- [ ] All images have alt text
- [ ] Links work correctly
- [ ] Breadcrumbs show correct path
- [ ] Related articles display
- [ ] Print preview looks good
- [ ] No console errors
- [ ] Heading hierarchy is correct (h1 > h2 > h3)

### Step 10: SEO Optimization

#### Google Rich Results Test

1. Go to https://search.google.com/test/rich-results
2. Enter your article URL or paste HTML
3. Fix any errors or warnings

#### Lighthouse Audit

```bash
# Run performance test
node scripts/performance-test.js guides/your-article-title.html
```

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 95

### Step 11: Update Sitemap

After adding your article, update the sitemap:

```bash
# Validate sitemap includes new article
node scripts/validate-sitemap.js

# Deploy updated sitemap
node scripts/deploy-sitemap.js
```

### Step 12: Deploy

1. Commit your changes:
```bash
git add guides/your-article-title.html data/blog-articles.json
git commit -m "Add new blog post: Your Article Title"
```

2. Push to repository:
```bash
git push origin main
```

3. Verify deployment:
- Check article loads correctly
- Test all links
- Verify in Google Search Console

## Content Writing Tips

### Writing Style

- **Clear and Concise**: Use simple language
- **Active Voice**: "Use this command" not "This command should be used"
- **Short Paragraphs**: 2-4 sentences per paragraph
- **Scannable**: Use headings, lists, and bold text
- **Actionable**: Provide clear steps and examples

### SEO Writing

- **Primary Keyword**: Use in title, h1, first paragraph, and naturally throughout
- **Secondary Keywords**: Include variations and related terms
- **Internal Links**: Link to other relevant articles
- **External Links**: Link to authoritative sources
- **Length**: Aim for 1000+ words for comprehensive guides

### Accessibility

- **Descriptive Links**: "Read the installation guide" not "Click here"
- **Alt Text**: Describe what's in the image, not just "image"
- **Heading Hierarchy**: Don't skip levels
- **Color Contrast**: Ensure text is readable
- **Simple Language**: Avoid jargon when possible

## Common Mistakes to Avoid

1. **Multiple H1 Tags**: Only one h1 per page
2. **Skipping Heading Levels**: Don't go from h2 to h4
3. **Missing Alt Text**: All images need descriptive alt text
4. **Duplicate Meta Descriptions**: Each page needs unique description
5. **Broken Links**: Test all internal and external links
6. **Missing Canonical URL**: Always include canonical tag
7. **Poor Mobile Experience**: Test on mobile devices
8. **Slow Loading**: Optimize images and CSS
9. **Missing Structured Data**: Include JSON-LD
10. **Incorrect File Paths**: Use `../` for subdirectories

## Checklist

Before publishing, verify:

- [ ] HTML file created in correct directory
- [ ] Title tag is unique and under 60 characters
- [ ] Meta description is 150-160 characters
- [ ] All meta tags are present (OG, Twitter, canonical)
- [ ] Structured data (JSON-LD) is included
- [ ] Breadcrumbs show correct path
- [ ] Article header has category and date
- [ ] Content uses proper heading hierarchy
- [ ] All images have alt text
- [ ] All links work correctly
- [ ] Related articles are displayed
- [ ] Article metadata added to blog-articles.json
- [ ] Responsive design tested
- [ ] Accessibility validated
- [ ] SEO validated
- [ ] Print preview checked
- [ ] Sitemap updated
- [ ] Changes committed and pushed

## Resources

- [Blog Post Template Structure](BLOG_POST_TEMPLATE.md)
- [CSS Class Naming Conventions](BLOG_CSS_NAMING.md)
- [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
- [Migration Script Documentation](../scripts/README-migrate-blog-posts.md)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
2. Review existing blog posts for examples
3. Run validation scripts to identify issues
4. Check browser console for errors

## Next Steps

After publishing your article:

1. Monitor Google Search Console for indexing
2. Check analytics for traffic and engagement
3. Update content based on user feedback
4. Refresh content periodically to keep it current
5. Add internal links from other relevant articles
