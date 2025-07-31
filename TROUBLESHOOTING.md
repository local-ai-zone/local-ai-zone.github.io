# Troubleshooting Guide

This guide helps you diagnose and fix common issues with the GGUF Model Discovery Website.

## 🚨 Common Issues

### 1. Build Failures

#### Issue: "terser not found" Error
```
error during build:
[vite:terser] terser not found. Since Vite v3, terser has become an optional dependency.
```

**Solution:**
```bash
npm install terser --save-dev
npm run build
```

#### Issue: "Module not found" Errors
```
Error: Cannot resolve module './services/SomeService.js'
```

**Solution:**
```bash
# Check if file exists
ls -la services/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Build Hangs or Takes Too Long
**Solution:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

### 2. Data Pipeline Issues

#### Issue: GitHub Actions Workflow Fails
**Symptoms:**
- Daily data updates not working
- Workflow shows red X in Actions tab

**Diagnosis:**
1. Go to GitHub repository → Actions tab
2. Click on failed workflow run
3. Check logs for error messages

**Common Solutions:**

**Rate Limit Exceeded:**
```yaml
# Add HUGGING_FACE_TOKEN to repository secrets
# Go to Settings → Secrets and variables → Actions
# Add new secret: HUGGING_FACE_TOKEN
```

**Python Dependencies Missing:**
```bash
# Update requirements.txt
pip freeze > scripts/requirements.txt
```

**Permission Issues:**
```yaml
# Ensure workflow has proper permissions in .github/workflows/update-gguf-models.yml
permissions:
  contents: write
  pages: write
  id-token: write
```

#### Issue: Data Files Not Updating
**Symptoms:**
- Old model data showing on site
- JSON files have old timestamps

**Solution:**
```bash
# Manual data update
python scripts/update_models.py

# Check if files were created
ls -la gguf_models*.json

# Commit and push changes
git add gguf_models*.json
git commit -m "Update model data"
git push
```

### 3. Search and Filtering Issues

#### Issue: Search Returns No Results
**Symptoms:**
- Search box works but shows no results
- Console shows JavaScript errors

**Diagnosis:**
```javascript
// Open browser console (F12)
// Check for errors
console.log(window.searchEngine);
```

**Solutions:**

**Data Not Loaded:**
```javascript
// Check if data is loaded
console.log(window.modelData);

// If undefined, check network tab for failed requests
```

**Search Index Corrupted:**
```bash
# Regenerate search index
python scripts/update_models.py
```

#### Issue: Filters Not Working
**Symptoms:**
- Filter buttons don't respond
- URL doesn't update with filters

**Solution:**
```javascript
// Check filter state in console
console.log(window.filterManager.getActiveFilters());

// Reset filters
window.filterManager.clearAllFilters();
```

### 4. Performance Issues

#### Issue: Site Loads Slowly
**Symptoms:**
- Long initial load times
- Laggy scrolling and interactions

**Diagnosis:**
```bash
# Run performance test
npm run test:performance

# Check bundle size
npm run build
ls -lh dist/assets/
```

**Solutions:**

**Large Bundle Size:**
```javascript
// Check for unused imports in main.js
// Remove unnecessary dependencies
```

**Too Many Models Loading:**
```javascript
// Increase virtual scrolling threshold in components/ModelGrid.js
const VIRTUAL_SCROLL_THRESHOLD = 50; // Reduce from 100
```

**Memory Leaks:**
```javascript
// Check memory usage in DevTools
// Look for components not being destroyed properly
```

#### Issue: Search is Slow
**Symptoms:**
- Delay between typing and results
- Browser becomes unresponsive during search

**Solution:**
```javascript
// Increase debounce delay in utils/debounce.js
export const debounceSearch = debounce(searchFunction, 500); // Increase from 300
```

### 5. GitHub Pages Deployment Issues

#### Issue: Site Not Updating After Push
**Symptoms:**
- Changes pushed to GitHub but site shows old content
- GitHub Actions shows successful deployment

**Solutions:**

**Cache Issues:**
```bash
# Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
# Or open in incognito/private mode
```

**GitHub Pages Settings:**
1. Go to repository Settings → Pages
2. Ensure source is set to "GitHub Actions"
3. Check custom domain settings if applicable

**Deployment Workflow Issues:**
```yaml
# Check .github/workflows/deploy-pages.yml
# Ensure it has proper permissions and triggers
```

#### Issue: 404 Errors on Model Pages
**Symptoms:**
- Main page works but individual model pages show 404
- Direct links to models fail

**Solution:**
```html
<!-- Ensure 404.html handles client-side routing -->
<!-- Check that .nojekyll file exists in root -->
```

### 6. SEO and Indexing Issues

#### Issue: Site Not Appearing in Search Results
**Symptoms:**
- Google doesn't index the site
- Search Console shows crawl errors

**Solutions:**

**Submit Sitemap:**
1. Go to Google Search Console
2. Add sitemap.xml URL
3. Check for crawl errors

**Verify robots.txt:**
```
# Check robots.txt allows crawling
User-agent: *
Allow: /
Sitemap: https://your-domain.com/sitemap.xml
```

**Check Meta Tags:**
```html
<!-- Ensure all pages have proper meta tags -->
<meta name="description" content="...">
<meta property="og:title" content="...">
```

### 7. Mobile and Accessibility Issues

#### Issue: Site Not Mobile-Friendly
**Symptoms:**
- Layout breaks on mobile devices
- Touch interactions don't work

**Solution:**
```css
/* Check viewport meta tag in index.html */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* Test responsive design */
/* Open DevTools → Toggle device toolbar */
```

#### Issue: Accessibility Violations
**Symptoms:**
- Screen readers can't navigate properly
- Keyboard navigation doesn't work

**Solution:**
```javascript
// Run accessibility audit
npm run test:accessibility

// Check ARIA labels and roles
// Ensure proper focus management
```

## 🔧 Diagnostic Tools

### 1. Browser Developer Tools

**Console Commands:**
```javascript
// Check application state
console.log(window.app);
console.log(window.modelData);
console.log(window.searchEngine);

// Performance monitoring
console.log(window.performanceMonitor.getStats());

// Memory usage
console.log(performance.memory);
```

**Network Tab:**
- Check for failed requests
- Monitor data file loading
- Verify CDN performance

**Performance Tab:**
- Record page load performance
- Identify bottlenecks
- Check memory usage over time

### 2. Command Line Tools

**Test Suite:**
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Performance testing
npm run test:performance
```

**Build Analysis:**
```bash
# Analyze bundle size
npm run build
npm run analyze

# Check for security vulnerabilities
npm audit
```

**Data Pipeline Testing:**
```bash
# Test Python pipeline
python scripts/test_pipeline.py

# Validate data files
python scripts/validate_data.py
```

### 3. GitHub Actions Debugging

**Workflow Logs:**
1. Go to repository → Actions tab
2. Click on failed workflow
3. Expand log sections to see detailed errors

**Local Testing:**
```bash
# Test workflow locally with act
npm install -g @nektos/act
act -j update-data
```

## 📊 Monitoring and Alerts

### 1. Set Up Monitoring

**GitHub Actions Notifications:**
```yaml
# Add to workflow file
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Data pipeline failed',
        body: 'The daily data update failed. Please check the logs.'
      })
```

**Performance Monitoring:**
```javascript
// Add to main.js
window.addEventListener('load', () => {
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  if (loadTime > 5000) {
    console.warn('Slow page load detected:', loadTime + 'ms');
  }
});
```

### 2. Health Checks

**Automated Health Check:**
```bash
#!/bin/bash
# scripts/health-check.sh

# Check if site is accessible
curl -f https://your-domain.com > /dev/null
if [ $? -ne 0 ]; then
  echo "Site is down!"
  exit 1
fi

# Check if data is recent
python scripts/check_data_freshness.py
```

**Data Freshness Check:**
```python
# scripts/check_data_freshness.py
import json
from datetime import datetime, timedelta

with open('gguf_models.json', 'r') as f:
    data = json.load(f)

last_update = datetime.fromisoformat(data['metadata']['lastUpdated'].replace('Z', '+00:00'))
if datetime.now() - last_update > timedelta(days=2):
    print("Data is stale!")
    exit(1)
```

## 🆘 Getting Help

### 1. Self-Diagnosis Checklist

Before seeking help, check:

- [ ] Browser console for JavaScript errors
- [ ] Network tab for failed requests
- [ ] GitHub Actions logs for pipeline errors
- [ ] Data files exist and are recent
- [ ] All dependencies are installed
- [ ] Environment variables are set correctly

### 2. Information to Provide

When reporting issues, include:

1. **Error messages** (exact text)
2. **Browser and version**
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Console logs** (if applicable)
6. **GitHub Actions logs** (if pipeline related)

### 3. Support Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and help
- **Documentation**: Check all README files
- **Code Comments**: Many functions have detailed JSDoc

### 4. Emergency Procedures

**Site is completely down:**
1. Check GitHub Pages status
2. Verify DNS settings (if using custom domain)
3. Roll back to last working commit
4. Contact GitHub Support if needed

**Data pipeline broken:**
1. Disable automatic updates temporarily
2. Run manual data update
3. Fix pipeline issues
4. Re-enable automatic updates

**Security incident:**
1. Immediately revoke any compromised tokens
2. Check for unauthorized changes
3. Update all secrets and passwords
4. Review access logs

---

**Remember**: Most issues can be resolved by checking logs, clearing caches, and following the diagnostic steps above. When in doubt, start with the basics and work your way up to more complex solutions.