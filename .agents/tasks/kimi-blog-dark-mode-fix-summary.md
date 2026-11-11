# Kimi Blog Post Dark Mode Fix Summary

## Issue Reported
The Kimi blog post (kimi-k3-1-pro-scientific-deep-dive.html) had major dark mode design problems:
1. Tables in dark mode had white backgrounds with white text (unreadable)
2. End of post looked like raw unstyled text

## Root Cause
The CSS files had incomplete or incorrect dark mode color variable assignments:
- Some table elements didn't have proper `!important` flags to override cascade issues
- Dark mode color variables weren't consistently applied to all table types
- Text colors weren't explicitly set for all content elements in dark mode

## Files Modified

### 1. `/css/blog-article.css`
**Changes:**
- Updated dark mode table styling with explicit color declarations and `!important` flags
- Changed table header background from `#2d1b69` to `#1e40af` (blue instead of purple)
- Changed even row background from `#252535` to `#1a2336` (consistent blue-tinted dark)
- Changed odd row background from `#1e1e2e` to `#111827` (darker base)
- Enhanced hover state with better color contrast and explicit text color
- All changes now use `!important` to ensure they override other styles

**Before:**
```css
html[data-theme='dark'] .article-content table th {
    background: #2d1b69;
    color: #e2e8f0;
}
html[data-theme='dark'] .article-content table tr:nth-child(even) td {
    background: #252535;
}
```

**After:**
```css
html[data-theme='dark'] .article-content table th {
    background: #1e40af !important;
    color: #e2e8f0 !important;
}
html[data-theme='dark'] .article-content table tr:nth-child(even) td {
    background: #1a2336 !important;
    color: #e5e9f2 !important;
}
```

### 2. `/css/blog-post.css`
**Changes:**
- Added `!important` flags to all dark mode table styling rules
- Changed table header background to use `var(--bp-blue-800)` for consistency
- Added comprehensive dark mode styling for:
  - Inline styled paragraphs (background and border colors)
  - Doc-info boxes and spec boxes
  - All text elements (p, li, h2, h3, h4)
  - Links and link hover states
  - Compare tables
  - Memory tables
  - Benchmark tables

**New Rules Added:**
```css
/* Dark mode for inline styled elements */
html[data-theme='dark'] .blog-article-page .article-content p[style*="background"] {
  background-color: rgba(37, 99, 235, 0.12) !important;
  color: var(--bp-ink) !important;
}

/* Dark mode for doc-info and spec boxes */
html[data-theme='dark'] .blog-article-page .doc-info-box,
html[data-theme='dark'] .blog-article-page .spec-box {
  background: var(--bp-surface) !important;
  border-color: var(--bp-line) !important;
  color: var(--bp-ink) !important;
}

/* Comprehensive text color fixes */
html[data-theme='dark'] .blog-article-page .article-content p,
html[data-theme='dark'] .blog-article-page .article-content li,
html[data-theme='dark'] .blog-article-page .article-content h2,
html[data-theme='dark'] .blog-article-page .article-content h3,
html[data-theme='dark'] .blog-article-page .article-content h4 {
  color: var(--bp-ink) !important;
}
```

## Color Scheme Improvements

### Dark Mode Table Colors
- **Header Background:** `#1e40af` (blue-800) or `var(--bp-blue-800)` - provides good contrast
- **Header Text:** `#e2e8f0` (light gray) - highly readable
- **Even Row Background:** `#1a2336` or `var(--bp-surface-alt)` - subtle differentiation
- **Odd Row Background:** `#111827` or `var(--bp-surface)` - base dark
- **Text Color:** `#e5e9f2` or `var(--bp-ink)` - consistent readable text
- **Border Color:** `var(--bp-line)` - subtle borders
- **Hover Background:** `rgba(37, 99, 235, 0.16)` - blue tint on hover

### Variables Used
From `blog-post.css` dark mode section:
- `--bp-ink: #e5e9f2` (main text)
- `--bp-surface: #111827` (base background)
- `--bp-surface-alt: #1a2336` (alternate background)
- `--bp-line: #2b374e` (borders)
- `--bp-accent: #60a5fa` (links)
- `--bp-blue-800: #1e40af` (headers)

## Testing Recommendations
1. Open `blog/kimi-k3-1-pro-scientific-deep-dive.html` in a browser
2. Toggle dark mode
3. Verify:
   - All tables have readable text (no white on white)
   - Table headers have blue background with white text
   - Table rows alternate between two shades of dark
   - Hover states show blue highlight
   - End of document (references section) has proper styling
   - Doc-info boxes at top have proper backgrounds and text colors
   - All links are visible and clickable

## Impact
- **Scope:** All blog posts using `blog-post.css` and `blog-article.css`
- **Breaking Changes:** None - only affects dark mode appearance
- **Browser Compatibility:** Modern browsers with CSS custom properties support

## Future Improvements
- Consider creating a unified table component class to avoid duplication
- Add CSS linting to catch missing dark mode styles
- Create a dark mode style guide for consistent color usage across all tables
