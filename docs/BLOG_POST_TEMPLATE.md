# Blog Post Template Structure

## Overview

This document describes the structure and components of the blog post template used throughout the Local AI Zone website. All blog posts follow this standardized template to ensure consistency, accessibility, and SEO optimization.

## Template Location

- **Main Template**: `templates/blog-post-template.html`
- **Header Component**: `templates/blog-header.html`
- **Footer Component**: `templates/blog-footer.html`
- **Banner Component**: `templates/blog-banner.html`

## Complete Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Meta Tags -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Article Title] | Local AI Zone</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="[Article description]">
    <meta name="keywords" content="[keywords, comma, separated]">
    <meta name="author" content="GGUF Loader Team">
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="[Article Title]">
    <meta property="og:description" content="[Article description]">
    <meta property="og:type" content="article">
    <meta property="og:url" content="[Full URL]">
    <meta property="og:image" content="[Image URL]">
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="[Article Title]">
    <meta name="twitter:description" content="[Article description]">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="[Full URL]">
    
    <!-- Stylesheets -->
    <link rel="preload" href="../css/premium-styles.css" as="style">
    <link rel="stylesheet" href="../css/premium-styles.css">
    <link rel="stylesheet" href="../css/blog-article.css">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="../logo.svg">
    
    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "[Article Title]",
        "description": "[Article description]",
        "author": {
            "@type": "Organization",
            "name": "GGUF Loader Team"
        },
        "datePublished": "[ISO 8601 date]",
        "dateModified": "[ISO 8601 date]"
    }
    </script>
</head>
<body class="blog-article-page">
    <!-- Skip Link for Accessibility -->
    <a href="#article-content" class="skip-link">Skip to article</a>
    
    <!-- Main Navigation -->
    <nav class="main-nav">
        <!-- Navigation content -->
    </nav>
    
    <!-- GGUF Banner -->
    <div id="gguf-banner" class="gguf-banner">
        <!-- Banner content -->
    </div>
    
    <!-- Premium Header -->
    <header class="premium-header">
        <!-- Header content -->
    </header>
    
    <!-- Main Content -->
    <main class="blog-article-main">
        <div class="container">
            <!-- Breadcrumb Navigation -->
            <nav class="breadcrumb-nav" aria-label="Breadcrumb">
                <ol class="breadcrumb-list">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="../blog.html">Blog</a></li>
                    <li aria-current="page">[Article Title]</li>
                </ol>
            </nav>
            
            <!-- Article Container -->
            <article id="article-content" class="blog-article">
                <!-- Article Header -->
                <header class="article-header">
                    <div class="article-meta">
                        <span class="article-category">[Category]</span>
                        <time datetime="[ISO date]">[Formatted Date]</time>
                    </div>
                    <h1 class="article-title">[Article Title]</h1>
                    <div class="article-actions">
                        <a href="../blog.html" class="back-to-blog-btn">
                            ← Back to Blog
                        </a>
                    </div>
                </header>
                
                <!-- Article Content -->
                <div class="article-content">
                    <!-- Your article content goes here -->
                </div>
            </article>
            
            <!-- Related Articles Section -->
            <section class="related-articles-section">
                <h2 class="section-title">Related Articles</h2>
                <div class="articles-grid">
                    <!-- Related article cards -->
                </div>
            </section>
        </div>
    </main>
    
    <!-- Premium Footer -->
    <footer class="premium-footer">
        <!-- Footer content -->
    </footer>
    
    <!-- Scripts (if needed) -->
    <script src="../js/main.js"></script>
</body>
</html>
```

## Component Breakdown

### 1. Head Section

#### Required Meta Tags
- `charset`: UTF-8 encoding
- `viewport`: Responsive viewport settings
- `title`: Article title + site name
- `description`: 150-160 character summary
- `keywords`: Relevant keywords (comma-separated)
- `author`: Content author/organization

#### SEO Tags
- **Open Graph**: For social media sharing (Facebook, LinkedIn)
- **Twitter Card**: For Twitter sharing
- **Canonical URL**: Prevents duplicate content issues
- **JSON-LD**: Structured data for search engines

#### Stylesheets
- `premium-styles.css`: Main design system (preloaded)
- `blog-article.css`: Blog-specific styles
- Relative paths use `../` prefix for subdirectories

### 2. Body Structure

#### Skip Link
```html
<a href="#article-content" class="skip-link">Skip to article</a>
```
- Accessibility feature for keyboard navigation
- Hidden until focused
- Jumps directly to article content

#### Main Navigation
```html
<nav class="main-nav">
    <a href="../index.html">Home</a>
    <a href="../about.html">About</a>
    <a href="../services.html">Services / Hire Me</a>
    <a href="../blog.html" class="active">Blog</a>
</nav>
```
- Consistent across all pages
- "Blog" link has `active` class
- Responsive (collapses on mobile)

#### GGUF Banner
```html
<div id="gguf-banner" class="gguf-banner">
    <!-- Dynamic banner content -->
</div>
```
- Displays GGUF model information
- Loaded dynamically via JavaScript
- Can be hidden/shown based on user preference

#### Premium Header
```html
<header class="premium-header">
    <div class="header-content">
        <h1 class="site-title">Local AI Zone</h1>
        <p class="site-tagline">Your Guide to Local AI Models</p>
    </div>
</header>
```
- Consistent branding across all pages
- Uses design system colors and typography

### 3. Article Structure

#### Breadcrumb Navigation
```html
<nav class="breadcrumb-nav" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li aria-current="page">Article Title</li>
    </ol>
</nav>
```
- Shows page hierarchy
- Last item has `aria-current="page"`
- Improves navigation and SEO

#### Article Header
```html
<header class="article-header">
    <div class="article-meta">
        <span class="article-category">Category</span>
        <time datetime="2025-01-08">January 8, 2025</time>
    </div>
    <h1 class="article-title">Article Title</h1>
    <div class="article-actions">
        <a href="../blog.html" class="back-to-blog-btn">
            ← Back to Blog
        </a>
    </div>
</header>
```
- Category badge for visual organization
- Publication date with semantic `<time>` element
- Back to blog navigation
- Single `<h1>` per page (SEO best practice)

#### Article Content
```html
<div class="article-content">
    <h2>Section Heading</h2>
    <p>Paragraph text...</p>
    
    <h3>Subsection</h3>
    <ul>
        <li>List item</li>
    </ul>
    
    <pre><code>Code block</code></pre>
</div>
```
- Semantic HTML structure
- Proper heading hierarchy (h2, h3, h4)
- Styled lists, code blocks, blockquotes
- Max-width for optimal readability

#### Related Articles
```html
<section class="related-articles-section">
    <h2 class="section-title">Related Articles</h2>
    <div class="articles-grid">
        <a href="article-url.html" class="article-card">
            <div class="article-card-content">
                <h3 class="article-card-title">Article Title</h3>
                <p class="article-card-excerpt">Brief description...</p>
                <div class="article-card-footer">
                    <span class="read-more-link">Read More →</span>
                </div>
            </div>
        </a>
    </div>
</section>
```
- 3-6 related articles
- Same card styling as home page
- Responsive grid layout

### 4. Footer
```html
<footer class="premium-footer">
    <div class="footer-content">
        <p>&copy; 2025 Local AI Zone. All rights reserved.</p>
    </div>
</footer>
```
- Consistent across all pages
- Dark theme styling
- Copyright and links

## CSS Classes Reference

### Page-Level Classes
- `.blog-article-page`: Applied to `<body>` tag
- `.blog-article-main`: Main content wrapper

### Navigation Classes
- `.main-nav`: Top navigation bar
- `.breadcrumb-nav`: Breadcrumb navigation
- `.breadcrumb-list`: Breadcrumb list container

### Article Classes
- `.blog-article`: Article container
- `.article-header`: Article header section
- `.article-meta`: Metadata container
- `.article-category`: Category badge
- `.article-title`: Article h1 title
- `.article-actions`: Action buttons container
- `.back-to-blog-btn`: Back to blog button
- `.article-content`: Main content wrapper

### Related Articles Classes
- `.related-articles-section`: Related articles container
- `.articles-grid`: Grid layout for article cards
- `.article-card`: Individual article card
- `.article-card-content`: Card content wrapper
- `.article-card-title`: Card title
- `.article-card-excerpt`: Card description
- `.article-card-footer`: Card footer
- `.read-more-link`: Read more link

### Utility Classes
- `.skip-link`: Accessibility skip link
- `.container`: Content container with max-width
- `.section-title`: Section heading

## Responsive Breakpoints

```css
/* Mobile: < 768px */
@media (max-width: 768px) {
    /* Stacked layout, larger touch targets */
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
    /* 2-column grid for related articles */
}

/* Desktop: > 1024px */
@media (min-width: 1024px) {
    /* 3-column grid for related articles */
}
```

## Print Styles

Print-specific styles hide non-essential elements:

```css
@media print {
    .main-nav,
    .gguf-banner,
    .premium-header,
    .breadcrumb-nav,
    .article-actions,
    .related-articles-section,
    .premium-footer {
        display: none;
    }
}
```

## Accessibility Features

1. **Skip Link**: Allows keyboard users to jump to content
2. **Semantic HTML**: Proper use of `<article>`, `<nav>`, `<header>`, `<footer>`
3. **ARIA Labels**: `aria-label`, `aria-current` for navigation
4. **Heading Hierarchy**: Single h1, then h2, h3 in order
5. **Focus Indicators**: Visible focus states on all interactive elements
6. **Alt Text**: All images have descriptive alt attributes

## SEO Best Practices

1. **Single H1**: One h1 per page (article title)
2. **Meta Description**: 150-160 characters
3. **Canonical URL**: Prevents duplicate content
4. **Structured Data**: JSON-LD for rich snippets
5. **Open Graph**: Social media previews
6. **Semantic HTML**: Helps search engines understand content
7. **Mobile-Friendly**: Responsive design
8. **Fast Loading**: Optimized CSS and images

## File Paths

When creating blog posts in subdirectories (guides/, brands/, cpu/):

- CSS: `../css/premium-styles.css`
- Images: `../images/filename.png`
- Logo: `../logo.svg`
- Home: `../index.html`
- Blog: `../blog.html`

## Next Steps

- See [Adding New Blog Posts](BLOG_POST_GUIDE.md) for creating new articles
- See [CSS Class Naming](BLOG_CSS_NAMING.md) for styling conventions
- See [Troubleshooting](BLOG_TROUBLESHOOTING.md) for common issues
