# Blog Post Troubleshooting Guide

## Overview

This guide helps you diagnose and fix common issues with blog posts on the Local AI Zone website. Issues are organized by category with symptoms, causes, and solutions.

## Quick Diagnostics

### Run Validation Scripts

```bash
# Check SEO
node scripts/validate-seo-preservation.js guides/your-article.html

# Check accessibility
node scripts/verify-accessibility.js guides/your-article.html

# Check mobile responsiveness
node scripts/verify-mobile-responsive.js guides/your-article.html

# Check performance
node scripts/performance-test.js guides/your-article.html
```

### Browser Console

Open browser DevTools (F12) and check:
- Console tab for JavaScript errors
- Network tab for failed resource loads
- Lighthouse tab for performance audit

## Layout and Styling Issues

### Issue: Header Not Displaying

**Symptoms:**
- No header visible at top of page
- Navigation menu missing
- Logo not showing

**Possible Causes:**
1. Missing header component
2. CSS not loading
3. Incorrect file paths

**Solutions:**

1. **Check header HTML exists:**
   ```html
   <header class="premium-header">
       <!-- Header content -->
   </header>
   ```

2. **Verify CSS is loaded:**
   ```html
   <link rel="stylesheet" href="../css/premium-styles.css">
   ```

3. **Check file paths:**
   - From subdirectories (guides/, brands/, cpu/), use `../` prefix
   - Example: `../css/premium-styles.css` not `css/premium-styles.css`

4. **Check browser console:**
   - Look for 404 errors on CSS files
   - Fix paths accordingly

### Issue: Footer Not Displaying

**Symptoms:**
- No footer at bottom of page
- Copyright text missing

**Solutions:**

1. **Verify footer HTML:**
   ```html
   <footer class="premium-footer">
       <div class="footer-content">
           <p>&copy; 2025 Local AI Zone. All rights reserved.</p>
       </div>
   </footer>
   ```

2. **Check CSS:**
   ```css
   .premium-footer {
       display: block; /* Not display: none */
   }
   ```

3. **Ensure footer is inside `<body>` tag**

### Issue: Content Not Centered

**Symptoms:**
- Content spans full width of screen
- Text lines are too long to read comfortably

**Solutions:**

1. **Add container class:**
   ```html
   <main class="blog-article-main">
       <div class="container">
           <!-- Content here -->
       </div>
   </main>
   ```

2. **Check CSS:**
   ```css
   .container {
       max-width: 1200px;
       margin: 0 auto;
       padding: 0 var(--space-4);
   }
   ```

### Issue: Breadcrumbs Not Showing

**Symptoms:**
- No breadcrumb navigation visible
- Can't see "Home > Blog > Article" path

**Solutions:**

1. **Verify breadcrumb HTML:**
   ```html
   <nav class="breadcrumb-nav" aria-label="Breadcrumb">
       <ol class="breadcrumb-list">
           <li><a href="../index.html">Home</a></li>
           <li><a href="../blog.html">Blog</a></li>
           <li aria-current="page">Article Title</li>
       </ol>
   </nav>
   ```

2. **Check CSS:**
   ```css
   .breadcrumb-nav {
       display: block; /* Not display: none */
   }
   ```

3. **Verify it's inside `.container`**

### Issue: Related Articles Not Displaying

**Symptoms:**
- No related articles section at bottom
- Empty space where related articles should be

**Solutions:**

1. **Check HTML structure:**
   ```html
   <section class="related-articles-section">
       <h2 class="section-title">Related Articles</h2>
       <div class="articles-grid">
           <!-- Article cards -->
       </div>
   </section>
   ```

2. **Verify article cards exist:**
   ```html
   <a href="article-url.html" class="article-card">
       <div class="article-card-content">
           <h3 class="article-card-title">Title</h3>
           <p class="article-card-excerpt">Excerpt</p>
       </div>
   </a>
   ```

3. **Generate related articles:**
   ```bash
   node scripts/related-articles-generator.js guides/your-article.html
   ```

4. **Check article metadata:**
   - Verify article exists in `data/blog-articles.json`
   - Ensure `relatedArticles` array has valid URLs

### Issue: Styling Looks Different from Main Site

**Symptoms:**
- Colors don't match
- Fonts look different
- Spacing is inconsistent

**Solutions:**

1. **Verify CSS files are loaded in correct order:**
   ```html
   <link rel="stylesheet" href="../css/premium-styles.css">
   <link rel="stylesheet" href="../css/blog-article.css">
   ```

2. **Check for conflicting styles:**
   - Remove any inline styles
   - Remove old stylesheet references

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Verify CSS variables:**
   ```css
   /* Should use design system variables */
   color: var(--neutral-900);
   font-family: var(--font-sans);
   ```

## Responsive Design Issues

### Issue: Mobile Layout Broken

**Symptoms:**
- Content overflows on mobile
- Text too small to read
- Buttons too small to tap

**Solutions:**

1. **Verify viewport meta tag:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Test responsive breakpoints:**
   ```bash
   node scripts/verify-mobile-responsive.js guides/your-article.html
   ```

3. **Check media queries:**
   ```css
   @media (max-width: 768px) {
       .article-title {
           font-size: 2rem; /* Smaller on mobile */
       }
   }
   ```

4. **Test on actual devices:**
   - Use browser DevTools device emulation
   - Test on real mobile devices

### Issue: Images Overflow on Mobile

**Symptoms:**
- Images extend beyond screen width
- Horizontal scrolling required

**Solutions:**

1. **Add responsive image CSS:**
   ```css
   .article-content img {
       max-width: 100%;
       height: auto;
   }
   ```

2. **Use responsive images:**
   ```html
   <img src="image.png" alt="Description" style="max-width: 100%; height: auto;">
   ```

### Issue: Navigation Menu Not Collapsing

**Symptoms:**
- Navigation menu doesn't collapse on mobile
- Menu items overlap

**Solutions:**

1. **Check navigation CSS:**
   ```css
   @media (max-width: 768px) {
       .main-nav {
           flex-direction: column;
       }
   }
   ```

2. **Verify JavaScript (if using hamburger menu):**
   ```javascript
   // Check for mobile menu toggle functionality
   ```

## SEO Issues

### Issue: Page Not Appearing in Search Results

**Symptoms:**
- Article not indexed by Google
- Not showing up in search

**Solutions:**

1. **Verify meta tags:**
   ```html
   <title>Article Title | Local AI Zone</title>
   <meta name="description" content="150-160 character description">
   <meta name="keywords" content="relevant, keywords">
   ```

2. **Check robots.txt:**
   ```
   # Ensure blog posts are not blocked
   User-agent: *
   Allow: /guides/
   Allow: /brands/
   Allow: /cpu/
   ```

3. **Verify in sitemap:**
   ```bash
   node scripts/validate-sitemap.js
   ```

4. **Submit to Google Search Console:**
   - Request indexing manually
   - Check for crawl errors

5. **Check canonical URL:**
   ```html
   <link rel="canonical" href="https://localaizone.com/guides/article.html">
   ```

### Issue: Wrong Title/Description in Search Results

**Symptoms:**
- Google shows different title than expected
- Description doesn't match meta tag

**Solutions:**

1. **Update meta tags:**
   ```html
   <title>Correct Title | Local AI Zone</title>
   <meta name="description" content="Correct description">
   ```

2. **Verify Open Graph tags:**
   ```html
   <meta property="og:title" content="Correct Title">
   <meta property="og:description" content="Correct description">
   ```

3. **Request re-indexing:**
   - Google Search Console > URL Inspection
   - Request indexing

4. **Wait for Google to update:**
   - Can take 1-2 weeks for changes to appear

### Issue: Duplicate Content Warnings

**Symptoms:**
- Google Search Console shows duplicate content
- Multiple URLs for same content

**Solutions:**

1. **Add canonical URL:**
   ```html
   <link rel="canonical" href="https://localaizone.com/guides/article.html">
   ```

2. **Use consistent URLs:**
   - Don't use both www and non-www
   - Use HTTPS consistently

3. **Check for URL parameters:**
   - Avoid ?page=1, ?source=twitter, etc.
   - Use canonical to specify preferred URL

### Issue: Structured Data Errors

**Symptoms:**
- Google Rich Results Test shows errors
- Article not eligible for rich snippets

**Solutions:**

1. **Validate JSON-LD:**
   ```html
   <script type="application/ld+json">
   {
       "@context": "https://schema.org",
       "@type": "Article",
       "headline": "Article Title",
       "datePublished": "2025-01-08T00:00:00Z",
       "author": {
           "@type": "Organization",
           "name": "GGUF Loader Team"
       }
   }
   </script>
   ```

2. **Test with Google Rich Results Test:**
   - https://search.google.com/test/rich-results
   - Fix any errors or warnings

3. **Ensure required fields:**
   - headline
   - datePublished
   - author
   - publisher (with logo)

## Accessibility Issues

### Issue: Keyboard Navigation Not Working

**Symptoms:**
- Can't tab through links
- Skip link doesn't work
- Focus not visible

**Solutions:**

1. **Add skip link:**
   ```html
   <a href="#article-content" class="skip-link">Skip to article</a>
   ```

2. **Ensure focusable elements:**
   ```css
   a:focus, button:focus {
       outline: 2px solid var(--primary-600);
       outline-offset: 2px;
   }
   ```

3. **Test keyboard navigation:**
   - Tab through all interactive elements
   - Ensure logical tab order

4. **Run accessibility validation:**
   ```bash
   node scripts/verify-accessibility.js guides/your-article.html
   ```

### Issue: Screen Reader Problems

**Symptoms:**
- Screen reader announces incorrectly
- Missing labels or descriptions

**Solutions:**

1. **Add ARIA labels:**
   ```html
   <nav aria-label="Breadcrumb">
   <nav aria-label="Main navigation">
   ```

2. **Use semantic HTML:**
   ```html
   <article>
   <header>
   <main>
   <footer>
   ```

3. **Add alt text to images:**
   ```html
   <img src="image.png" alt="Descriptive text">
   ```

4. **Fix heading hierarchy:**
   - One h1 per page
   - Don't skip levels (h2 to h4)

### Issue: Color Contrast Too Low

**Symptoms:**
- Text hard to read
- Fails WCAG contrast requirements

**Solutions:**

1. **Use design system colors:**
   ```css
   color: var(--neutral-900); /* Dark text */
   background: var(--neutral-50); /* Light background */
   ```

2. **Test contrast:**
   - Use browser DevTools
   - Check WCAG AA compliance (4.5:1 ratio)

3. **Avoid color-only indicators:**
   - Use icons or text in addition to color

## Performance Issues

### Issue: Slow Page Load

**Symptoms:**
- Page takes > 3 seconds to load
- Low Lighthouse score

**Solutions:**

1. **Optimize images:**
   ```bash
   # Convert to WebP
   # Compress images
   # Use appropriate sizes
   ```

2. **Preload critical CSS:**
   ```html
   <link rel="preload" href="../css/premium-styles.css" as="style">
   ```

3. **Minimize CSS:**
   ```bash
   # Use minified versions in production
   ```

4. **Lazy load images:**
   ```html
   <img src="image.png" loading="lazy" alt="Description">
   ```

5. **Run performance test:**
   ```bash
   node scripts/performance-test.js guides/your-article.html
   ```

### Issue: Layout Shift (CLS)

**Symptoms:**
- Content jumps while loading
- Poor Cumulative Layout Shift score

**Solutions:**

1. **Set image dimensions:**
   ```html
   <img src="image.png" width="800" height="600" alt="Description">
   ```

2. **Reserve space for dynamic content:**
   ```css
   .gguf-banner {
       min-height: 100px; /* Reserve space */
   }
   ```

3. **Use font-display:**
   ```css
   @font-face {
       font-family: 'Inter';
       font-display: swap;
   }
   ```

### Issue: Large CSS Files

**Symptoms:**
- CSS files > 100KB
- Slow initial render

**Solutions:**

1. **Remove unused CSS:**
   ```bash
   # Use PurgeCSS or similar tool
   ```

2. **Split CSS:**
   - Critical CSS inline
   - Non-critical CSS deferred

3. **Use CSS containment:**
   ```css
   .article-content {
       contain: layout style;
   }
   ```

## Content Issues

### Issue: Code Blocks Not Styled

**Symptoms:**
- Code appears as plain text
- No syntax highlighting
- No background color

**Solutions:**

1. **Use proper HTML:**
   ```html
   <pre><code>Your code here</code></pre>
   ```

2. **Check CSS:**
   ```css
   .article-content pre {
       background: var(--neutral-900);
       color: var(--neutral-100);
       padding: var(--space-6);
       border-radius: var(--radius-lg);
   }
   ```

3. **For inline code:**
   ```html
   <code>inline code</code>
   ```

### Issue: Links Not Working

**Symptoms:**
- Clicking links does nothing
- 404 errors on links

**Solutions:**

1. **Check relative paths:**
   ```html
   <!-- From guides/ directory -->
   <a href="../index.html">Home</a>
   <a href="../blog.html">Blog</a>
   <a href="other-article.html">Other Article</a>
   ```

2. **Verify files exist:**
   - Check that linked files are present
   - Verify file names match exactly (case-sensitive)

3. **Test all links:**
   ```bash
   # Use link checker tool
   ```

### Issue: Images Not Loading

**Symptoms:**
- Broken image icons
- 404 errors in console

**Solutions:**

1. **Check image paths:**
   ```html
   <!-- From guides/ directory -->
   <img src="../images/photo.png" alt="Description">
   ```

2. **Verify images exist:**
   - Check images directory
   - Verify file names match

3. **Check file extensions:**
   - Use lowercase (.png not .PNG)
   - Verify correct extension

4. **Optimize images:**
   - Ensure images aren't too large
   - Use appropriate formats (WebP, PNG, JPG)

## Print Issues

### Issue: Print Layout Broken

**Symptoms:**
- Header/footer appear in print
- Content cut off
- Poor page breaks

**Solutions:**

1. **Check print media query:**
   ```css
   @media print {
       .main-nav,
       .premium-header,
       .premium-footer,
       .related-articles-section {
           display: none;
       }
   }
   ```

2. **Prevent page breaks:**
   ```css
   @media print {
       pre, code {
           page-break-inside: avoid;
       }
   }
   ```

3. **Test print preview:**
   - File > Print Preview in browser
   - Check all pages

4. **Run print test:**
   ```bash
   node scripts/test-print-functionality.js guides/your-article.html
   ```

## Migration Issues

### Issue: Migration Script Fails

**Symptoms:**
- Script throws errors
- Files not updated

**Solutions:**

1. **Check prerequisites:**
   ```bash
   npm install cheerio
   ```

2. **Verify template files exist:**
   ```
   templates/blog-post-template.html
   templates/blog-header.html
   templates/blog-footer.html
   ```

3. **Check file permissions:**
   ```bash
   # Ensure files are writable
   chmod 644 guides/*.html
   ```

4. **Use verbose mode:**
   ```bash
   node scripts/migrate-blog-posts.js --verbose
   ```

5. **Try dry run first:**
   ```bash
   node scripts/migrate-blog-posts.js --dry-run
   ```

### Issue: Content Lost After Migration

**Symptoms:**
- Article content missing
- Only template visible

**Solutions:**

1. **Restore from backup:**
   ```bash
   cp guides-backup/article.html guides/article.html
   ```

2. **Check original file:**
   - Ensure content was in `<main>` or `<article>` tag
   - Verify HTML was valid

3. **Re-run migration:**
   ```bash
   node scripts/migrate-blog-posts.js --file guides/article.html
   ```

### Issue: Related Articles Not Generated

**Symptoms:**
- Related articles section empty
- No article cards

**Solutions:**

1. **Check blog-articles.json:**
   ```bash
   # Verify file exists and is valid JSON
   cat data/blog-articles.json
   ```

2. **Add article metadata:**
   ```json
   {
       "title": "Article Title",
       "url": "guides/article.html",
       "category": "Guides",
       "tags": ["tag1", "tag2"]
   }
   ```

3. **Regenerate related articles:**
   ```bash
   node scripts/related-articles-generator.js guides/article.html
   ```

## Browser-Specific Issues

### Issue: Works in Chrome, Broken in Safari

**Solutions:**

1. **Check CSS compatibility:**
   - Avoid cutting-edge CSS features
   - Use vendor prefixes if needed

2. **Test in Safari:**
   - Use Safari DevTools
   - Check console for errors

3. **Use fallbacks:**
   ```css
   display: flex; /* Fallback */
   display: grid; /* Modern */
   ```

### Issue: Works in Desktop, Broken in Mobile

**Solutions:**

1. **Test on real devices:**
   - iOS Safari
   - Chrome Mobile

2. **Check touch targets:**
   - Minimum 44x44px for buttons

3. **Test viewport:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

## Getting Help

If you can't resolve an issue:

1. **Check documentation:**
   - [Blog Post Template](BLOG_POST_TEMPLATE.md)
   - [Adding New Posts](BLOG_POST_GUIDE.md)
   - [Migration Script](BLOG_MIGRATION_SCRIPT.md)

2. **Run validation scripts:**
   ```bash
   node scripts/validate-seo-preservation.js
   node scripts/verify-accessibility.js
   node scripts/verify-mobile-responsive.js
   ```

3. **Check browser console:**
   - Look for error messages
   - Check Network tab for failed requests

4. **Compare with working examples:**
   - Look at existing blog posts
   - Copy structure from working files

5. **Create minimal test case:**
   - Isolate the problem
   - Test with minimal HTML

## Prevention

### Best Practices

1. **Always backup before changes:**
   ```bash
   cp -r guides guides-backup
   ```

2. **Test locally before deploying:**
   - Open files in browser
   - Run validation scripts

3. **Use version control:**
   ```bash
   git commit -m "Add new blog post"
   ```

4. **Follow templates:**
   - Use provided templates
   - Don't deviate from structure

5. **Validate regularly:**
   - Run scripts after changes
   - Check in multiple browsers

## Quick Reference

### Common Commands

```bash
# Validate SEO
node scripts/validate-seo-preservation.js guides/article.html

# Check accessibility
node scripts/verify-accessibility.js guides/article.html

# Test mobile
node scripts/verify-mobile-responsive.js guides/article.html

# Test performance
node scripts/performance-test.js guides/article.html

# Migrate blog post
node scripts/migrate-blog-posts.js --file guides/article.html

# Generate related articles
node scripts/related-articles-generator.js guides/article.html

# Validate sitemap
node scripts/validate-sitemap.js
```

### File Paths Cheat Sheet

From subdirectories (guides/, brands/, cpu/):
- CSS: `../css/filename.css`
- Images: `../images/filename.png`
- Home: `../index.html`
- Blog: `../blog.html`
- Logo: `../logo.svg`

From root directory:
- CSS: `css/filename.css`
- Images: `images/filename.png`
- Subdirectory: `guides/article.html`
