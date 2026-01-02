# Social Media Banner Automation

This document describes the automated banner update system for Local AI Zone.

## Overview

The social media banner is automatically updated daily to ensure it always displays current statistics and the latest date. This automation ensures that when users share the website on social media, they see up-to-date information.

## Automated Workflow

### Schedule
- **Daily**: 6:00 AM UTC (after the daily model data update)
- **Manual**: Can be triggered manually from GitHub Actions
- **Automatic**: Triggers when banner-related files are modified

### Process
1. **Environment Setup**: Installs Node.js and Puppeteer dependencies
2. **Banner Generation**: Creates new banner with current model count and date
3. **Fallback Creation**: Generates a fallback banner for error scenarios
4. **Validation**: Runs comprehensive tests to ensure everything works
5. **Change Detection**: Only commits if the banner has actually changed
6. **Commit & Push**: Updates the repository with new banner files

### Files Updated
- `og-image.png` - Main social media banner (1200x630px)
- `og-image-fallback.png` - Identical copy of main banner (same image, different name)

## Manual Operations

### Local Development
```bash
# Complete banner update (recommended)
npm run update-banner-local

# Individual steps
npm run generate-banner
npm run create-fallback-banner
npm run validate-banner-setup

# Run tests
npm run test-banner
```

### GitHub Actions
```bash
# Trigger via GitHub CLI
gh workflow run update-social-banner.yml

# View workflow status
gh run list --workflow=update-social-banner.yml

# View logs
gh run view --log
```

## Monitoring

### Workflow Status
- Check the Actions tab in GitHub for workflow runs
- Each run provides detailed logs and statistics
- Failed runs will show error details and troubleshooting info

### Banner Validation
The workflow automatically validates:
- ✅ Banner file generation
- ✅ Correct dimensions (1200x630px)
- ✅ File size optimization
- ✅ Meta tag configuration
- ✅ Template structure

### Statistics Tracking
Each update logs:
- Current model count (e.g., "5K+")
- Total models in database
- Last updated date
- File sizes and changes

## Troubleshooting

### Common Issues

#### Puppeteer Installation Fails
```bash
# The workflow installs system dependencies automatically
# For local development, you may need:
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 # ... (full list in workflow)
```

#### Banner Generation Fails
```bash
# Check if the models data file exists
ls -la gguf_models.json

# Test banner generation locally
npm run test-banner

# Check browser dependencies
node -e "console.log(require('puppeteer').executablePath())"
```

#### No Changes Detected
This is normal if:
- Model count hasn't changed significantly (e.g., still "5K+")
- Date format is the same as previous day
- No visual changes in the banner template

### Debugging

#### Enable Debug Mode
```bash
# Set environment variable for detailed logging
DEBUG=true npm run generate-banner
```

#### Check Generated Files
```bash
# Verify banner files exist and have reasonable sizes
ls -lh og-image*.png

# Check banner content (requires image viewer)
open og-image.png  # macOS
start og-image.png # Windows
xdg-open og-image.png # Linux
```

#### Validate Setup
```bash
# Run comprehensive validation
npm run validate-banner-setup

# Check specific components
node -e "console.log(require('./scripts/generate-banner.js'))"
```

## Configuration

### Workflow Schedule
Edit `.github/workflows/update-social-banner.yml`:
```yaml
schedule:
  # Change time (currently 6:00 AM UTC)
  - cron: '0 6 * * *'
```

### Banner Content
Edit `social-banner.html` and `css/social-banner.css` to modify:
- Colors and styling
- Text content
- Layout and positioning
- Branding elements

### Statistics Format
Edit `scripts/generate-banner.js` to modify:
- Number formatting (e.g., "5K+" vs "5,668")
- Date format
- Additional statistics

## Integration

### With Existing Workflows
```yaml
# Add to your daily-update.yml
- name: Update Banner After Data Update
  run: |
    # Update model data first
    python scripts/update_models.py
    
    # Then update banner
    node scripts/generate-banner.js
    git add og-image.png og-image-fallback.png
    git commit -m "Update banner with latest data" || exit 0
```

### With Deployment
```yaml
# Ensure banner is updated before deployment
- name: Update Banner Before Deploy
  run: npm run update-banner-local
  
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./
```

## Performance

### Optimization
- Banner generation takes ~10-15 seconds
- File sizes are optimized (typically 50-100KB)
- Workflow runs only when changes are detected
- Artifacts are stored for 30 days for debugging

### Resource Usage
- Memory: ~500MB during Puppeteer execution
- CPU: Moderate during image generation
- Storage: Minimal (banner files are small)
- Network: Downloads dependencies once per run

## Security

### Permissions
- Workflow uses `GITHUB_TOKEN` with minimal permissions
- No external API calls or data transmission
- All processing happens within GitHub's secure environment

### Data Privacy
- No sensitive data is included in banners
- Only public statistics are displayed
- No user data or private information is processed

## Support

### Getting Help
1. Check workflow logs in GitHub Actions
2. Run local validation: `npm run validate-banner-setup`
3. Test locally: `npm run update-banner-local`
4. Review documentation: `docs/BANNER_GENERATION.md`

### Reporting Issues
Include in your report:
- Workflow run URL
- Error messages from logs
- Local environment details
- Steps to reproduce

### Contributing
When modifying the banner system:
1. Test locally first: `npm run test-banner`
2. Update documentation if needed
3. Test the workflow on a fork
4. Ensure backward compatibility