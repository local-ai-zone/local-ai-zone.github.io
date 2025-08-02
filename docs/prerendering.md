# Model Pre-rendering Documentation

## Overview

The model pre-rendering system creates static HTML files for individual model pages, giving each model its own unique, shareable URL. This improves SEO, social media sharing, and provides faster loading times for popular models.

## How It Works

### 1. Data Processing
- Loads model data from `gguf_models.json`
- Creates unique models map (avoiding duplicates)
- Sorts models by likes in descending order
- Selects top 500 models for pre-rendering

### 2. Pre-rendering Process
- Uses Puppeteer with 5 concurrent browser tabs
- Navigates to each model URL: `https://local-ai-zone.github.io/?model={model-slug}`
- Waits for full page load (`networkidle2`)
- Saves rendered HTML to `prerendered/{model-slug}.html`
- Includes error handling and retry logic

### 3. URL Structure
Each model gets its own URL:
```
https://local-ai-zone.github.io/prerendered/qwen2-5-7b-arpo-i1-gguf.html
https://local-ai-zone.github.io/prerendered/llama-3-2-3b-instruct-gguf.html
```

## Performance Estimates

- **Target**: 100 models
- **Concurrency**: 5 browser tabs
- **Page Load Time**: ~2-4 seconds per page
- **Total Runtime**: 3-5 minutes
- **Output Size**: ~50-100 KB per HTML file

## Automation

### GitHub Actions Workflow
- **Schedule**: Daily at 4 AM UTC (after data/SEO updates)
- **Triggers**: Manual dispatch, after SEO optimization
- **Timeout**: 45 minutes (within GitHub limits)
- **Resource Usage**: ~2-3 GB memory, moderate CPU

### Workflow Steps
1. Checkout repository
2. Install Node.js and dependencies
3. Run pre-rendering script
4. Commit generated HTML files
5. Update sitemap with new URLs
6. Trigger GitHub Pages deployment

## Files Generated

```
prerendered/
├── qwen2-5-7b-arpo-i1-gguf.html
├── llama-3-2-3b-instruct-gguf.html
├── deepseek-r1-0528-qwen3-8b-gguf.html
└── ... (up to 100 files)
```

## Testing

Run local test with 5 sample models:
```bash
node scripts/test-prerender.js
```

## Benefits

1. **SEO**: Each model has its own indexable URL
2. **Performance**: Pre-rendered pages load instantly
3. **Sharing**: Direct links to specific models
4. **Caching**: Static files can be cached by CDNs
5. **Accessibility**: Works without JavaScript
6. **Simplicity**: Fixed folder structure for easy access

## Monitoring

The workflow provides:
- Progress tracking during execution
- Success/failure notifications
- File count and size statistics
- Error reporting with GitHub issues
- Sitemap automatic updates