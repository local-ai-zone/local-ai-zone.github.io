# Blog Article CSS Class Naming Conventions

## Overview

This document defines the CSS class naming conventions used for blog articles on the Local AI Zone website. Following these conventions ensures consistency, maintainability, and clarity across all blog posts.

## Naming Philosophy

### BEM-Inspired Methodology

We use a BEM-inspired (Block Element Modifier) approach:

- **Block**: Standalone component (e.g., `.article-card`)
- **Element**: Part of a block (e.g., `.article-card-title`)
- **Modifier**: Variation of a block (e.g., `.article-card--featured`)

### Naming Rules

1. **Use kebab-case**: All lowercase with hyphens
   - ✅ `.article-header`
   - ❌ `.articleHeader`, `.ArticleHeader`

2. **Be descriptive**: Names should clearly indicate purpose
   - ✅ `.back-to-blog-btn`
   - ❌ `.btn1`, `.link`

3. **Use semantic names**: Describe what it is, not how it looks
   - ✅ `.article-meta`
   - ❌ `.gray-text`, `.small-font`

4. **Avoid abbreviations**: Use full words for clarity
   - ✅ `.breadcrumb-navigation`
   - ❌ `.bc-nav`, `.brdcrmb`

5. **Prefix related classes**: Group related components
   - ✅ `.article-header`, `.article-content`, `.article-footer`
   - ❌ `.header`, `.content`, `.footer`

## Class Hierarchy

### Page-Level Classes

Classes applied to the `<body>` or top-level containers:

```css
.blog-article-page        /* Applied to <body> tag */
.blog-article-main        /* Main content wrapper */
```

**Usage:**
```html
<body class="blog-article-page">
    <main class="blog-article-main">
        <!-- Content -->
    </main>
</body>
```

### Layout Classes

Classes for major layout sections:

```css
.container                /* Content container with max-width */
.premium-header           /* Site header */
.premium-footer           /* Site footer */
.main-nav                 /* Main navigation */
.gguf-banner              /* GGUF loader banner */
```

**Usage:**
```html
<div class="container">
    <!-- Centered content with max-width -->
</div>
```

### Navigation Classes

Classes for navigation components:

```css
/* Main Navigation */
.main-nav                 /* Navigation container */
.main-nav a               /* Navigation links */
.main-nav .active         /* Active navigation item */

/* Breadcrumb Navigation */
.breadcrumb-nav           /* Breadcrumb container */
.breadcrumb-list          /* Breadcrumb list (ol) */
.breadcrumb-list li       /* Breadcrumb items */
.breadcrumb-list a        /* Breadcrumb links */
```

**Usage:**
```html
<nav class="breadcrumb-nav" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li aria-current="page">Article Title</li>
    </ol>
</nav>
```

### Article Structure Classes

Classes for the main article structure:

```css
/* Article Container */
.blog-article             /* Main article wrapper */

/* Article Header */
.article-header           /* Article header section */
.article-meta             /* Metadata container */
.article-category         /* Category badge */
.article-title            /* Article h1 title */
.article-actions          /* Action buttons container */

/* Article Content */
.article-content          /* Main content wrapper */

/* Article Footer */
.article-footer           /* Article footer (if needed) */
```

**Usage:**
```html
<article class="blog-article">
    <header class="article-header">
        <div class="article-meta">
            <span class="article-category">Guides</span>
            <time datetime="2025-01-08">January 8, 2025</time>
        </div>
        <h1 class="article-title">Article Title</h1>
        <div class="article-actions">
            <a href="../blog.html" class="back-to-blog-btn">← Back to Blog</a>
        </div>
    </header>
    <div class="article-content">
        <!-- Content -->
    </div>
</article>
```

### Button Classes

Classes for buttons and links:

```css
.back-to-blog-btn         /* Back to blog button */
.read-more-link           /* Read more link in cards */
.btn-primary              /* Primary button style */
.btn-secondary            /* Secondary button style */
```

**Usage:**
```html
<a href="../blog.html" class="back-to-blog-btn">
    ← Back to Blog
</a>
```

### Related Articles Classes

Classes for the related articles section:

```css
/* Section Container */
.related-articles-section /* Related articles container */
.section-title            /* Section heading */

/* Articles Grid */
.articles-grid            /* Grid layout for cards */

/* Article Card */
.article-card             /* Individual article card */
.article-card-content     /* Card content wrapper */
.article-card-title       /* Card title (h3) */
.article-card-excerpt     /* Card description */
.article-card-footer      /* Card footer */
.article-card-meta        /* Card metadata */
```

**Usage:**
```html
<section class="related-articles-section">
    <h2 class="section-title">Related Articles</h2>
    <div class="articles-grid">
        <a href="article.html" class="article-card">
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

### Utility Classes

General-purpose utility classes:

```css
.skip-link                /* Accessibility skip link */
.visually-hidden          /* Hide visually but keep for screen readers */
.text-center              /* Center text */
.text-muted               /* Muted text color */
```

**Usage:**
```html
<a href="#article-content" class="skip-link">Skip to article</a>
```

## Content Typography Classes

Classes for styling content within `.article-content`:

```css
/* Headings */
.article-content h2       /* Main section headings */
.article-content h3       /* Subsection headings */
.article-content h4       /* Sub-subsection headings */

/* Text Elements */
.article-content p        /* Paragraphs */
.article-content a        /* Links */
.article-content strong   /* Bold text */
.article-content em       /* Italic text */

/* Lists */
.article-content ul       /* Unordered lists */
.article-content ol       /* Ordered lists */
.article-content li       /* List items */

/* Code */
.article-content code     /* Inline code */
.article-content pre      /* Code blocks */

/* Other Elements */
.article-content blockquote  /* Blockquotes */
.article-content table       /* Tables */
.article-content img         /* Images */
```

**Note:** These are element selectors within `.article-content`, not classes. They automatically style content without requiring additional classes.

## State Classes

Classes for different states:

```css
.active                   /* Active navigation item */
.disabled                 /* Disabled state */
.loading                  /* Loading state */
.error                    /* Error state */
.success                  /* Success state */
```

**Usage:**
```html
<a href="../blog.html" class="active">Blog</a>
```

## Modifier Classes

Variations of base components:

```css
/* Size Modifiers */
.article-card--large      /* Large article card */
.article-card--small      /* Small article card */

/* Style Modifiers */
.article-card--featured   /* Featured article card */
.article-card--highlight  /* Highlighted article card */

/* Layout Modifiers */
.articles-grid--2-col     /* 2-column grid */
.articles-grid--3-col     /* 3-column grid */
```

**Usage:**
```html
<div class="articles-grid articles-grid--3-col">
    <!-- 3-column layout -->
</div>
```

## Responsive Classes

Classes for responsive behavior:

```css
/* Mobile-specific */
.mobile-only              /* Show only on mobile */
.mobile-hidden            /* Hide on mobile */

/* Tablet-specific */
.tablet-only              /* Show only on tablet */
.tablet-hidden            /* Hide on tablet */

/* Desktop-specific */
.desktop-only             /* Show only on desktop */
.desktop-hidden           /* Hide on desktop */
```

**Usage:**
```html
<div class="mobile-hidden">
    <!-- Hidden on mobile devices -->
</div>
```

## Print Classes

Classes for print-specific styling:

```css
.print-only               /* Show only in print */
.print-hidden             /* Hide in print */
```

**Usage:**
```html
<div class="print-hidden">
    <!-- Hidden when printing -->
</div>
```

## Complete Class Reference

### Alphabetical List

```css
/* A */
.active
.article-actions
.article-card
.article-card-content
.article-card-excerpt
.article-card-footer
.article-card-meta
.article-card-title
.article-category
.article-content
.article-footer
.article-header
.article-meta
.article-title
.articles-grid

/* B */
.back-to-blog-btn
.blog-article
.blog-article-main
.blog-article-page
.breadcrumb-list
.breadcrumb-nav
.btn-primary
.btn-secondary

/* C */
.container

/* D */
.desktop-hidden
.desktop-only
.disabled

/* E */
.error

/* G */
.gguf-banner

/* L */
.loading

/* M */
.main-nav
.mobile-hidden
.mobile-only

/* P */
.premium-footer
.premium-header
.print-hidden
.print-only

/* R */
.read-more-link
.related-articles-section

/* S */
.section-title
.skip-link
.success

/* T */
.tablet-hidden
.tablet-only
.text-center
.text-muted

/* V */
.visually-hidden
```

## CSS Variables

Design system variables used in blog articles:

### Colors

```css
/* Primary Colors */
--primary-50              /* Lightest primary */
--primary-100
--primary-200
--primary-300
--primary-400
--primary-500             /* Base primary */
--primary-600
--primary-700
--primary-800
--primary-900             /* Darkest primary */

/* Neutral Colors */
--neutral-50              /* Lightest neutral (backgrounds) */
--neutral-100
--neutral-200
--neutral-300
--neutral-400
--neutral-500
--neutral-600             /* Body text */
--neutral-700
--neutral-800
--neutral-900             /* Darkest neutral (headings) */

/* Semantic Colors */
--success-500             /* Success state */
--error-500               /* Error state */
--warning-500             /* Warning state */
--info-500                /* Info state */
```

### Typography

```css
/* Font Families */
--font-sans               /* Sans-serif (Inter) */
--font-serif              /* Serif (optional) */
--font-mono               /* Monospace (code) */

/* Font Sizes */
--text-xs                 /* 0.75rem */
--text-sm                 /* 0.875rem */
--text-base               /* 1rem */
--text-lg                 /* 1.125rem */
--text-xl                 /* 1.25rem */
--text-2xl                /* 1.5rem */
--text-3xl                /* 1.875rem */
--text-4xl                /* 2.25rem */
--text-5xl                /* 3rem */

/* Font Weights */
--font-normal             /* 400 */
--font-medium             /* 500 */
--font-semibold           /* 600 */
--font-bold               /* 700 */

/* Line Heights */
--leading-tight           /* 1.25 */
--leading-normal          /* 1.5 */
--leading-relaxed         /* 1.75 */
--leading-loose           /* 2 */
```

### Spacing

```css
/* Spacing Scale */
--space-1                 /* 0.25rem (4px) */
--space-2                 /* 0.5rem (8px) */
--space-3                 /* 0.75rem (12px) */
--space-4                 /* 1rem (16px) */
--space-5                 /* 1.25rem (20px) */
--space-6                 /* 1.5rem (24px) */
--space-8                 /* 2rem (32px) */
--space-10                /* 2.5rem (40px) */
--space-12                /* 3rem (48px) */
--space-16                /* 4rem (64px) */
--space-20                /* 5rem (80px) */
--space-24                /* 6rem (96px) */
```

### Border Radius

```css
--radius-sm               /* 0.25rem (4px) */
--radius-md               /* 0.375rem (6px) */
--radius-lg               /* 0.5rem (8px) */
--radius-xl               /* 0.75rem (12px) */
--radius-2xl              /* 1rem (16px) */
--radius-full             /* 9999px (fully rounded) */
```

### Shadows

```css
--shadow-sm               /* Small shadow */
--shadow-md               /* Medium shadow */
--shadow-lg               /* Large shadow */
--shadow-xl               /* Extra large shadow */
```

## Usage Examples

### Example 1: Article Header

```html
<header class="article-header">
    <div class="article-meta">
        <span class="article-category">Guides</span>
        <time datetime="2025-01-08">January 8, 2025</time>
    </div>
    <h1 class="article-title">Complete Guide to GGUF Models</h1>
    <div class="article-actions">
        <a href="../blog.html" class="back-to-blog-btn">
            ← Back to Blog
        </a>
    </div>
</header>
```

```css
.article-header {
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-6);
    border-bottom: 2px solid var(--neutral-200);
}

.article-meta {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
    font-size: var(--text-sm);
    color: var(--neutral-600);
}

.article-category {
    padding: var(--space-1) var(--space-3);
    background: var(--primary-100);
    color: var(--primary-700);
    border-radius: var(--radius-full);
    font-weight: var(--font-medium);
}

.article-title {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    color: var(--neutral-900);
    line-height: var(--leading-tight);
}

.back-to-blog-btn {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    background: var(--primary-600);
    color: white;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.2s;
}

.back-to-blog-btn:hover {
    background: var(--primary-700);
}
```

### Example 2: Related Articles

```html
<section class="related-articles-section">
    <h2 class="section-title">Related Articles</h2>
    <div class="articles-grid">
        <a href="article-1.html" class="article-card">
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

```css
.related-articles-section {
    margin-top: var(--space-16);
    padding-top: var(--space-12);
    border-top: 2px solid var(--neutral-200);
}

.section-title {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--neutral-900);
    margin-bottom: var(--space-8);
}

.articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-6);
}

.article-card {
    display: block;
    padding: var(--space-6);
    background: white;
    border: 1px solid var(--neutral-200);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: all 0.2s;
}

.article-card:hover {
    border-color: var(--primary-500);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.article-card-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--neutral-900);
    margin-bottom: var(--space-3);
}

.article-card-excerpt {
    font-size: var(--text-base);
    color: var(--neutral-600);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-4);
}

.read-more-link {
    color: var(--primary-600);
    font-weight: var(--font-medium);
}
```

## Best Practices

### Do's

✅ Use semantic class names
✅ Follow the established naming pattern
✅ Use CSS variables for values
✅ Keep specificity low
✅ Group related classes
✅ Document custom classes

### Don'ts

❌ Don't use inline styles
❌ Don't use IDs for styling
❌ Don't use overly specific selectors
❌ Don't use magic numbers (use variables)
❌ Don't create one-off classes
❌ Don't use presentational names

## Adding New Classes

When adding new classes:

1. **Check if existing class can be reused**
2. **Follow naming conventions**
3. **Use appropriate prefix**
4. **Document the new class**
5. **Add to this reference**

### Example Process

```css
/* 1. Identify the component */
/* Component: Author bio section */

/* 2. Choose appropriate prefix */
/* Prefix: article- (part of article) */

/* 3. Create descriptive name */
.article-author-bio

/* 4. Add related classes */
.article-author-bio
.article-author-name
.article-author-avatar
.article-author-description

/* 5. Document usage */
/**
 * Author Bio Component
 * 
 * Usage:
 * <div class="article-author-bio">
 *   <img src="avatar.jpg" class="article-author-avatar" alt="Author">
 *   <h3 class="article-author-name">Author Name</h3>
 *   <p class="article-author-description">Bio text...</p>
 * </div>
 */
```

## Resources

- [Blog Post Template Structure](BLOG_POST_TEMPLATE.md)
- [Adding New Blog Posts](BLOG_POST_GUIDE.md)
- [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
- [CSS Optimization Guide](CSS_OPTIMIZATION.md)

## Maintenance

This document should be updated when:
- New classes are added
- Naming conventions change
- CSS variables are added or modified
- Component structure changes

Last Updated: January 2025
