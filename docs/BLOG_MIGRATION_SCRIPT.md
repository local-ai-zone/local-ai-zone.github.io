# Blog Post Migration Script Documentation

## Overview

The blog post migration script (`scripts/migrate-blog-posts.js`) is a Node.js tool that automates the process of updating existing blog posts to use the new template structure. It preserves SEO metadata, wraps content in the premium design system, and generates related articles.

## Location

```
scripts/migrate-blog-posts.js
```

## Purpose

The migration script:
- Wraps existing blog content in the new template structure
- Preserves all SEO meta tags and structured data
- Adds shared header, navigation, and footer components
- Generates breadcrumb navigation
- Creates related articles sections
- Updates file paths for CSS and assets
- Maintains content integrity

## Prerequisites

### Required Files

1. **Template Files**:
   - `templates/blog-post-template.html`
   - `templates/blog-header.html`
   - `templates/blog-footer.html`
   - `templates/blog-banner.html`

2. **Data Files**:
   - `data/blog-articles.json` (article metadata)

3. **Node.js Dependencies**:
   ```bash
   npm install cheerio
   ```

### Directory Structure

```
project/
├── scripts/
│   └── migrate-blog-posts.js
├── templates/
│   ├── blog-post-template.html
│   ├── blog-header.html
│   ├── blog-footer.html
│   └── blog-banner.html
├── data/
│   └── blog-articles.json
├── guides/
│   └── *.html
├── brands/
│   └── *.html
└── cpu/
    └── *.html
```

## Usage

### Basic Usage

Migrate all blog posts in all directories:

```bash
node scripts/migrate-blog-posts.js
```

### Migrate Specific Directory

```bash
node scripts/migrate-blog-posts.js --dir guides
node scripts/migrate-blog-posts.js --dir brands
node scripts/migrate-blog-posts.js --dir cpu
```

### Migrate Single File

```bash
node scripts/migrate-blog-posts.js --file guides/article-name.html
```

### Dry Run (Preview Changes)

```bash
node scripts/migrate-blog-posts.js --dry-run
```

This will show what changes would be made without actually modifying files.

### Backup Before Migration

```bash
node scripts/migrate-blog-posts.js --backup
```

This creates a backup of each file before modifying it (adds `.backup` extension).

### Verbose Output

```bash
node scripts/migrate-blog-posts.js --verbose
```

Shows detailed information about each step of the migration process.

## Command-Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dir <directory>` | Migrate specific directory | `--dir guides` |
| `--file <path>` | Migrate single file | `--file guides/article.html` |
| `--dry-run` | Preview changes without modifying files | `--dry-run` |
| `--backup` | Create backup before modifying | `--backup` |
| `--verbose` | Show detailed output | `--verbose` |
| `--skip-related` | Skip related articles generation | `--skip-related` |
| `--force` | Overwrite already migrated files | `--force` |

## How It Works

### Step 1: Read Existing File

The script reads the existing HTML file and parses it using Cheerio (jQuery-like HTML parser).

```javascript
const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html);
```

### Step 2: Extract Metadata

Extracts SEO metadata from the existing file:

- Title tag
- Meta description
- Meta keywords
- Open Graph tags
- Twitter Card tags
- Canonical URL
- JSON-LD structured data

```javascript
const title = $('title').text();
const description = $('meta[name="description"]').attr('content');
const keywords = $('meta[name="keywords"]').attr('content');
```

### Step 3: Extract Content

Extracts the main article content:

```javascript
const content = $('main').html() || $('article').html() || $('body').html();
```

The script intelligently identifies the main content area.

### Step 4: Determine Category

Determines the article category based on file path:

```javascript
function getCategoryFromPath(filePath) {
    if (filePath.includes('guides/')) return 'Guides';
    if (filePath.includes('brands/')) return 'Brands';
    if (filePath.includes('cpu/')) return 'CPU';
    return 'Blog';
}
```

### Step 5: Build New HTML

Constructs new HTML using the template:

1. Loads template components
2. Inserts preserved metadata
3. Wraps content in article structure
4. Adds breadcrumbs
5. Generates related articles
6. Updates file paths

### Step 6: Write Updated File

Writes the new HTML back to the original file (or creates new file if using `--dry-run`).

## Template Components

### Header Component

Loaded from `templates/blog-header.html`:

```html
<nav class="main-nav">...</nav>
<div id="gguf-banner" class="gguf-banner">...</div>
<header class="premium-header">...</header>
```

### Footer Component

Loaded from `templates/blog-footer.html`:

```html
<footer class="premium-footer">
    <div class="footer-content">
        <p>&copy; 2025 Local AI Zone. All rights reserved.</p>
    </div>
</footer>
```

### Article Structure

```html
<main class="blog-article-main">
    <div class="container">
        <nav class="breadcrumb-nav">...</nav>
        <article class="blog-article">
            <header class="article-header">...</header>
            <div class="article-content">
                <!-- Preserved content -->
            </div>
        </article>
        <section class="related-articles-section">...</section>
    </div>
</main>
```

## Related Articles Generation

### Algorithm

The script generates related articles based on:

1. **Same Category**: Articles in the same directory
2. **Shared Tags**: Articles with matching tags
3. **Manual Curation**: Predefined in `blog-articles.json`

### Priority Order

1. Manually specified related articles (from JSON)
2. Articles with most shared tags
3. Recent articles from same category
4. Fallback to random articles from same category

### Example

```javascript
function findRelatedArticles(currentArticle, allArticles) {
    // Filter by category
    let related = allArticles.filter(a => 
        a.category === currentArticle.category &&
        a.url !== currentArticle.url
    );
    
    // Sort by shared tags
    related.sort((a, b) => {
        const aShared = countSharedTags(a.tags, currentArticle.tags);
        const bShared = countSharedTags(b.tags, currentArticle.tags);
        return bShared - aShared;
    });
    
    // Return top 3-6
    return related.slice(0, 6);
}
```

## File Path Updates

The script automatically updates relative paths:

### Before Migration
```html
<link rel="stylesheet" href="css/styles.css">
<img src="images/photo.png">
<a href="index.html">Home</a>
```

### After Migration
```html
<link rel="stylesheet" href="../css/premium-styles.css">
<img src="../images/photo.png">
<a href="../index.html">Home</a>
```

## Error Handling

### Common Errors

1. **File Not Found**
   ```
   Error: File not found: guides/article.html
   ```
   Solution: Check file path and ensure file exists

2. **Invalid HTML**
   ```
   Error: Unable to parse HTML in guides/article.html
   ```
   Solution: Validate HTML syntax in original file

3. **Missing Template**
   ```
   Error: Template file not found: templates/blog-header.html
   ```
   Solution: Ensure all template files exist

4. **Missing Metadata**
   ```
   Warning: No title found in guides/article.html
   ```
   Solution: Add title tag to original file

### Error Recovery

The script includes error recovery:

- Continues processing other files if one fails
- Logs errors but doesn't stop execution
- Creates backup before modifying (with `--backup` flag)
- Validates output before writing

## Validation

### Post-Migration Checks

The script performs validation after migration:

1. **HTML Structure**: Validates HTML syntax
2. **Required Elements**: Checks for h1, title, meta tags
3. **File Paths**: Verifies all paths are updated
4. **Related Articles**: Ensures related articles exist

### Validation Output

```
✓ Migrated: guides/article-1.html
  - Title: ✓
  - Meta Description: ✓
  - Breadcrumbs: ✓
  - Related Articles: 4 found
  
✗ Failed: guides/article-2.html
  - Error: Missing title tag
```

## Performance

### Batch Processing

The script processes files in batches for better performance:

```javascript
const BATCH_SIZE = 10;
for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(file => migrateFile(file)));
}
```

### Caching

Template components are cached to avoid repeated file reads:

```javascript
let headerCache = null;
function getHeader() {
    if (!headerCache) {
        headerCache = fs.readFileSync('templates/blog-header.html', 'utf8');
    }
    return headerCache;
}
```

## Troubleshooting

### Issue: Related Articles Not Generated

**Cause**: Missing or invalid `blog-articles.json`

**Solution**:
1. Verify `data/blog-articles.json` exists
2. Check JSON syntax is valid
3. Ensure article metadata is complete

### Issue: CSS Not Loading

**Cause**: Incorrect file paths

**Solution**:
1. Verify CSS files exist in `css/` directory
2. Check relative paths use `../` prefix
3. Test in browser and check console for 404 errors

### Issue: Content Not Preserved

**Cause**: Script unable to identify main content

**Solution**:
1. Ensure original file has `<main>` or `<article>` tag
2. Use `--verbose` flag to see what content was extracted
3. Manually specify content selector in script

### Issue: Duplicate Migration

**Cause**: Running script multiple times on same file

**Solution**:
1. Use `--force` flag to overwrite
2. Restore from backup if available
3. Check for migration marker in HTML

## Best Practices

### Before Migration

1. **Backup Files**: Always create backups before migration
   ```bash
   cp -r guides guides-backup
   ```

2. **Test on Single File**: Test migration on one file first
   ```bash
   node scripts/migrate-blog-posts.js --file guides/test-article.html
   ```

3. **Validate Original Files**: Ensure original HTML is valid

### During Migration

1. **Use Dry Run**: Preview changes before applying
   ```bash
   node scripts/migrate-blog-posts.js --dry-run
   ```

2. **Monitor Output**: Watch for errors and warnings

3. **Process in Batches**: Migrate one directory at a time

### After Migration

1. **Visual Inspection**: Check several migrated files in browser

2. **Run Validation Scripts**:
   ```bash
   node scripts/validate-seo-preservation.js
   node scripts/verify-accessibility.js
   ```

3. **Test Links**: Verify all internal and external links work

4. **Update Sitemap**: Regenerate sitemap after migration

## Advanced Usage

### Custom Template

Use a custom template:

```bash
node scripts/migrate-blog-posts.js --template custom-template.html
```

### Custom Related Articles Logic

Modify the `findRelatedArticles` function in the script:

```javascript
function findRelatedArticles(article, allArticles) {
    // Your custom logic here
    return relatedArticles;
}
```

### Exclude Files

Skip certain files during migration:

```bash
node scripts/migrate-blog-posts.js --exclude "test-*.html,draft-*.html"
```

### Custom Output Directory

Output migrated files to different directory:

```bash
node scripts/migrate-blog-posts.js --output migrated/
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Migrate Blog Posts

on:
  push:
    paths:
      - 'guides/**/*.html'
      - 'brands/**/*.html'
      - 'cpu/**/*.html'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node scripts/migrate-blog-posts.js --backup
      - run: git add .
      - run: git commit -m "Auto-migrate blog posts"
      - run: git push
```

## Maintenance

### Updating the Script

When updating the migration script:

1. Test on sample files first
2. Update documentation
3. Increment version number
4. Create changelog entry

### Version History

- **v1.0.0**: Initial release
- **v1.1.0**: Added related articles generation
- **v1.2.0**: Added backup and dry-run options
- **v1.3.0**: Improved error handling and validation

## Resources

- [Blog Post Template Structure](BLOG_POST_TEMPLATE.md)
- [Adding New Blog Posts](BLOG_POST_GUIDE.md)
- [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
- [CSS Class Naming](BLOG_CSS_NAMING.md)

## Support

For issues or questions:

1. Check this documentation
2. Review [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
3. Check script output for error messages
4. Review existing migrated files for examples
