# Social Media Banner Generation

This document describes the social media banner generation system for Local AI Zone, which creates Open Graph images for social media sharing.

## Overview

The banner generation system automatically creates a 1200x630px PNG image that displays when users share the Local AI Zone website on social media platforms like Twitter, Facebook, LinkedIn, Discord, and Slack.

## Architecture

### Components

1. **Banner Template** (`social-banner.html`) - HTML template with dynamic content placeholders
2. **Banner Styles** (`css/social-banner.css`) - CSS styling matching the website's design
3. **Generation Script** (`scripts/generate-banner.js`) - Puppeteer-based image generation
4. **Test Suite** (`scripts/test-banner-generation.js`) - Automated testing utilities

### File Structure

```
/
├── social-banner.html              # Banner HTML template
├── css/social-banner.css          # Banner-specific styles  
├── og-image.png                   # Generated banner (1200x630px)
├── scripts/
│   ├── generate-banner.js         # Main generation script
│   └── test-banner-generation.js  # Testing utilities
└── docs/BANNER_GENERATION.md     # This documentation
```

## Usage

### Generate Banner

```bash
# Generate banner with current statistics
node scripts/generate-banner.js
```

### Run Tests

```bash
# Run all banner generation tests
node scripts/test-banner-generation.js
```

## Banner Content

The generated banner includes:

- **Local AI Zone branding** with lightning bolt logo
- **Main headline**: "Local AI Zone"  
- **Subtitle**: "Direct Access to GGUF Models for Local LLMs"
- **Dynamic statistics**: Current model count (e.g., "40K+")
- **Key features**: "Daily Updates", "Last Updated" (current date)
- **Compatibility badges**: llama.cpp, LM Studio, Ollama, GGUF Loader
- **Attribution**: "Powered by GGUF Loader"
- **Last updated timestamp**

## Customization

### Updating Content

To modify banner content, edit `social-banner.html`:

```html
<!-- Update main title -->
<h1 class="main-title">Your New Title</h1>

<!-- Update subtitle -->
<p class="subtitle">Your new subtitle</p>

<!-- Add/modify statistics -->
<div class="stat-card">
    <div class="stat-number">New Stat</div>
    <div class="stat-label">Label</div>
</div>
```

### Updating Styles

To modify banner appearance, edit `css/social-banner.css`:

```css
/* Update colors */
:root {
    --primary-color: #your-color;
    --gradient-start: #your-gradient-start;
    --gradient-end: #your-gradient-end;
}

/* Update typography */
.main-title {
    font-size: 48px;
    font-weight: 800;
}
```

### Dynamic Content

The generation script automatically injects:

- **Model count** from `gguf_models.json`
- **Last updated timestamp** (current date in footer)
- **Last updated date** (current date in stat card)

To modify dynamic content injection, edit `scripts/generate-banner.js`:

```javascript
// Update model count formatting
if (stats.totalModels >= 1000) {
    stats.modelCountFormatted = `${Math.floor(stats.totalModels / 1000)}K+`;
}

// Update timestamp format
stats.lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
});
```

## Error Handling

### Fallback Mechanisms

1. **Statistics Fallback**: If `gguf_models.json` is missing or corrupted, uses default values:
   - Model count: "40K+"
   - Last updated: Current date

2. **Dual File Names**: The system creates both `og-image.png` and `og-image-fallback.png` as identical copies (one image with two names)

3. **Graceful Degradation**: Social media platforms will show basic link previews if the banner image fails to load

### Common Issues

#### Browser Launch Fails

```bash
Error: Failed to launch the browser process
```

**Solution**: Install required dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2

# Or use Docker for consistent environment
```

#### Font Loading Issues

```bash
Warning: Fonts not loaded properly
```

**Solution**: Ensure Google Fonts are accessible or use local font fallbacks:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

#### Large File Size

```bash
Warning: Banner file is quite large (>2MB)
```

**Solution**: Optimize image generation:
```javascript
// Reduce device scale factor
await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 1 // Reduce from 2
});
```

## Testing

### Test Categories

1. **Mock Data Test**: Verifies banner generation with test data
2. **Missing Data Test**: Tests fallback behavior when data is unavailable  
3. **Banner Validation Test**: Validates generated image properties
4. **Meta Tags Test**: Verifies Open Graph and Twitter Card meta tags

### Running Tests

```bash
# Run all tests
node scripts/test-banner-generation.js

# Expected output:
# 🎉 All tests passed!
# ✅ Passed: 4
# ❌ Failed: 0  
# 📈 Success Rate: 100%
```

## Social Media Platform Support

### Supported Platforms

- **Twitter/X**: Uses Twitter Card meta tags
- **Facebook**: Uses Open Graph meta tags
- **LinkedIn**: Uses Open Graph meta tags  
- **Discord**: Uses Open Graph meta tags
- **Slack**: Uses Open Graph meta tags
- **WhatsApp**: Uses Open Graph meta tags

### Platform-Specific Requirements

#### Twitter/X
- Requires `twitter:card` set to `summary_large_image`
- Image must be < 5MB
- Minimum 300x157px, maximum 4096x4096px

#### Facebook  
- Requires `og:image` with full URL
- Recommended 1200x630px (1.91:1 ratio)
- Image must be < 8MB

#### LinkedIn
- Uses Open Graph tags
- Recommended 1200x627px
- Image must be < 5MB

## Automation

### Automated Daily Updates

The banner is automatically updated every day at 6:00 AM UTC using GitHub Actions. The workflow:

1. **Triggers**: 
   - Daily schedule (6:00 AM UTC)
   - Manual dispatch
   - When banner-related files are updated

2. **Process**:
   - Installs dependencies and system packages for Puppeteer
   - Generates new banner with current statistics
   - Creates fallback banner
   - Validates the setup
   - Commits changes if banner has updated
   - Provides detailed logging and artifacts

3. **Workflow File**: `.github/workflows/update-social-banner.yml`

### Manual Updates

#### Local Development
```bash
# Update banner locally
npm run update-banner-local

# Or run individual steps
npm run generate-banner
npm run create-fallback-banner
npm run validate-banner-setup
```

#### GitHub Actions
You can manually trigger the workflow from the GitHub Actions tab or via API:

```bash
# Using GitHub CLI
gh workflow run update-social-banner.yml

# Using curl
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/update-social-banner.yml/dispatches \
  -d '{"ref":"main"}'
```

### Integration with Other Workflows

The banner update can be integrated with your existing workflows:

```yaml
# In your daily-update.yml or similar workflow
- name: Update Social Media Banner
  run: |
    node scripts/generate-banner.js
    node scripts/create-fallback-banner.js
    git add og-image*.png
    git commit -m "Update social media banner" || exit 0
```

## Performance Optimization

### Image Optimization

1. **Compression**: Use PNG compression for smaller file sizes
2. **Caching**: Set appropriate cache headers for the banner image
3. **CDN**: Consider using a CDN for faster global delivery

### Generation Speed

1. **Headless Mode**: Always use headless browser mode in production
2. **Resource Limits**: Set memory and CPU limits for Puppeteer
3. **Parallel Generation**: Avoid running multiple banner generations simultaneously

## Troubleshooting

### Debug Mode

Enable debug logging:

```javascript
// In generate-banner.js
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
    console.log('Debug: Browser launched with args:', args);
    console.log('Debug: Page content set, waiting for render...');
}
```

### Manual Testing

Test banner appearance:

```bash
# Generate banner
node scripts/generate-banner.js

# Open banner in browser
open social-banner.html  # macOS
start social-banner.html # Windows
xdg-open social-banner.html # Linux
```

### Social Media Debugging Tools

- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## Maintenance

### Regular Tasks

1. **Update Statistics**: Banner automatically uses current model count
2. **Test Generation**: Run tests monthly to ensure system works
3. **Monitor File Size**: Check that generated banners aren't too large
4. **Validate Meta Tags**: Ensure social media platforms can read the banner

### Version Updates

When updating the banner system:

1. Test with current data
2. Verify backward compatibility  
3. Update documentation
4. Run full test suite
5. Deploy during low-traffic periods

## Security Considerations

### Input Validation

- Sanitize data from `gguf_models.json` before injection
- Validate file paths to prevent directory traversal
- Limit banner generation frequency to prevent abuse

### Dependencies

- Keep Puppeteer updated for security patches
- Monitor for vulnerabilities in Node.js dependencies
- Use specific version pinning in production

## Support

For issues with banner generation:

1. Check the troubleshooting section above
2. Run the test suite to identify specific problems
3. Review browser console logs for JavaScript errors
4. Verify that all required files and dependencies are present

## Contributing

When contributing to the banner system:

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation for any changes
4. Test across different environments
5. Consider performance impact of changes