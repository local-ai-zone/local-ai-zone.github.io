# Production Deployment Guide

This guide provides detailed instructions for deploying the integrated blog posts to production.

## Overview

The blog integration project has transformed standalone blog posts into integrated components of the main application. This guide ensures a smooth, safe deployment to production.

## Prerequisites

Before deploying, ensure you have:

- ✅ Completed all implementation tasks (1-23)
- ✅ Run all validation scripts successfully
- ✅ Tested on staging environment (if available)
- ✅ Backup of current production files
- ✅ Access to production server
- ✅ Access to Google Search Console
- ✅ Access to analytics dashboard

## Deployment Methods

### Method 1: Manual Deployment (FTP/SFTP)

#### Step 1: Prepare Files

1. **Create deployment package:**
   ```bash
   # Create a deployment directory
   mkdir deployment-package
   
   # Copy blog post directories
   cp -r guides deployment-package/
   cp -r brands deployment-package/
   cp -r cpu deployment-package/
   
   # Copy CSS files
   mkdir deployment-package/css
   cp css/blog-article.css deployment-package/css/
   cp css/blog-article.min.css deployment-package/css/
   
   # Copy data files
   mkdir deployment-package/data
   cp data/blog-articles.json deployment-package/data/
   
   # Copy sitemap
   cp sitemap.xml deployment-package/
   ```

2. **Verify package contents:**
   ```bash
   # List all files
   find deployment-package -type f
   
   # Count HTML files
   find deployment-package -name "*.html" | wc -l
   ```

#### Step 2: Backup Production

1. **Connect to production server via FTP/SFTP**

2. **Download current files:**
   - Download entire `guides/` directory
   - Download entire `brands/` directory
   - Download entire `cpu/` directory
   - Download `css/` directory
   - Download `sitemap.xml`

3. **Create timestamped backup:**
   ```bash
   # On your local machine
   mkdir backups/production-backup-$(date +%Y%m%d-%H%M%S)
   # Move downloaded files to backup directory
   ```

#### Step 3: Upload Files

1. **Upload blog post directories:**
   - Upload `guides/` directory (overwrite existing)
   - Upload `brands/` directory (overwrite existing)
   - Upload `cpu/` directory (overwrite existing)

2. **Upload CSS files:**
   - Upload `css/blog-article.css`
   - Upload `css/blog-article.min.css`

3. **Upload data files:**
   - Upload `data/blog-articles.json`

4. **Upload sitemap:**
   - Upload `sitemap.xml`

#### Step 4: Verify Upload

1. **Check file permissions:**
   - HTML files: 644 (rw-r--r--)
   - CSS files: 644 (rw-r--r--)
   - Directories: 755 (rwxr-xr-x)

2. **Verify file sizes:**
   - Compare local and remote file sizes
   - Ensure no truncated files

### Method 2: Git Deployment

#### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git status

# Create deployment branch
git checkout -b production-deployment

# Tag the release
git tag -a v1.0.0 -m "Blog integration production release"
```

#### Step 2: Deploy via Git

```bash
# SSH into production server
ssh user@your-server.com

# Navigate to web root
cd /var/www/html

# Pull latest changes
git fetch origin
git checkout production-deployment
git pull origin production-deployment

# Or use specific tag
git checkout v1.0.0
```

#### Step 3: Post-Deploy Tasks

```bash
# Set correct permissions
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Clear any caches
# (depends on your server setup)
```

### Method 3: CI/CD Pipeline

If using automated deployment (GitHub Actions, GitLab CI, etc.):

1. **Merge to production branch**
2. **Pipeline automatically:**
   - Runs tests
   - Builds assets
   - Deploys to production
   - Clears caches

## Server Configuration

### Apache Configuration

Add to `.htaccess` or virtual host configuration:

```apache
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    
    # CSS files - 1 year
    ExpiresByType text/css "access plus 1 year"
    
    # HTML files - 1 hour
    ExpiresByType text/html "access plus 1 hour"
    
    # Images - 1 month
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

### Nginx Configuration

Add to server block:

```nginx
# Compression
gzip on;
gzip_types text/css text/javascript application/javascript text/html;
gzip_min_length 1000;

# Browser caching
location ~* \.css$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

# Security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Post-Deployment Verification

### Automated Verification

Run the monitoring script immediately after deployment:

```bash
# Set production domain
export PRODUCTION_DOMAIN=https://your-domain.com

# Run production monitoring
node scripts/monitor-production.js

# Check analytics
node scripts/check-analytics.js

# Validate deployment
node scripts/deploy-validation.js
```

### Manual Verification

#### 1. Homepage Test
- Visit: `https://your-domain.com`
- Verify: Page loads correctly
- Check: Navigation menu works

#### 2. Blog Listing Test
- Visit: `https://your-domain.com/blog.html`
- Verify: Blog listing displays
- Check: Article cards render correctly

#### 3. Blog Post Tests

Test at least one post from each category:

**Guides:**
- Visit: `https://your-domain.com/guides/[article-name].html`
- Verify: Header displays correctly
- Check: Breadcrumbs work
- Test: "Back to Blog" button
- Verify: Related articles display
- Check: Footer displays correctly

**Brands:**
- Visit: `https://your-domain.com/brands/[article-name].html`
- Perform same checks as above

**CPU:**
- Visit: `https://your-domain.com/cpu/[article-name].html`
- Perform same checks as above

#### 4. Mobile Test
- Open blog post on mobile device
- Verify: Responsive design works
- Check: Navigation menu collapses
- Test: Touch targets are adequate

#### 5. Print Test
- Open blog post
- Print preview (Ctrl+P / Cmd+P)
- Verify: Header/footer hidden
- Check: Content prints cleanly

### Browser Testing

Test in multiple browsers:

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Search Engine Optimization

### Submit Sitemap to Google

1. **Go to Google Search Console:**
   - https://search.google.com/search-console

2. **Submit sitemap:**
   - Navigate to Sitemaps section
   - Enter: `https://your-domain.com/sitemap.xml`
   - Click Submit

3. **Verify submission:**
   - Wait 5-10 minutes
   - Refresh page
   - Check status: "Success"

### Submit Sitemap to Bing

1. **Go to Bing Webmaster Tools:**
   - https://www.bing.com/webmasters

2. **Submit sitemap:**
   - Navigate to Sitemaps section
   - Enter sitemap URL
   - Click Submit

### Verify Rich Results

1. **Use Google Rich Results Test:**
   - https://search.google.com/test/rich-results

2. **Test sample blog posts:**
   - Enter blog post URL
   - Verify structured data valid
   - Check for errors/warnings

## Analytics Configuration

### Verify Google Analytics

1. **Check Real-Time Reports:**
   - Open Google Analytics
   - Go to Real-Time → Overview
   - Visit blog posts
   - Verify page views appear

2. **Set Up Goals (Optional):**
   - Goal: Blog post read (time on page > 30s)
   - Goal: Related article click
   - Goal: Back to blog click

### Verify Google Tag Manager

1. **Use GTM Preview Mode:**
   - Open GTM
   - Click Preview
   - Visit blog posts
   - Verify tags fire correctly

2. **Check Data Layer:**
   - Open browser console
   - Type: `dataLayer`
   - Verify page data present

## Monitoring Setup

### Set Up Uptime Monitoring

Use a service like:
- UptimeRobot
- Pingdom
- StatusCake

**Monitor these URLs:**
- Homepage
- Blog listing
- 3-5 sample blog posts

**Alert on:**
- 404 errors
- 500 errors
- Response time > 5 seconds

### Set Up Error Monitoring

Configure error tracking:
- Sentry
- Rollbar
- Bugsnag

**Track:**
- JavaScript errors
- Failed resource loads
- API errors

### Set Up Performance Monitoring

Use tools like:
- Google PageSpeed Insights
- WebPageTest
- Lighthouse CI

**Monitor:**
- Page load time
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift

## Rollback Procedure

If critical issues are detected:

### Quick Rollback (FTP/SFTP)

1. **Stop deployment immediately**

2. **Restore from backup:**
   ```bash
   # Upload backup files
   # Overwrite current files
   ```

3. **Clear caches:**
   - CDN cache
   - Browser cache
   - Server cache

4. **Verify rollback:**
   - Test critical pages
   - Check error logs
   - Monitor analytics

### Git Rollback

```bash
# SSH into server
ssh user@your-server.com

# Navigate to web root
cd /var/www/html

# Revert to previous version
git checkout [previous-tag]

# Or revert specific commit
git revert [commit-hash]

# Clear caches
```

## Troubleshooting

### Issue: 404 Errors on Blog Posts

**Diagnosis:**
```bash
# Check if files exist
ls -la guides/
ls -la brands/
ls -la cpu/

# Check file permissions
ls -l guides/*.html
```

**Solutions:**
- Verify files uploaded correctly
- Check file permissions (should be 644)
- Verify server configuration
- Check for case-sensitivity issues

### Issue: CSS Not Loading

**Diagnosis:**
```bash
# Check if CSS files exist
ls -la css/blog-article.css
ls -la css/blog-article.min.css

# Check file permissions
ls -l css/*.css
```

**Solutions:**
- Verify CSS files uploaded
- Check file paths in HTML
- Clear browser cache
- Verify MIME types configured

### Issue: Broken Links

**Diagnosis:**
```bash
# Run link checker
node scripts/deploy-validation.js
```

**Solutions:**
- Fix broken links in HTML
- Update relative paths
- Verify linked files exist

### Issue: Analytics Not Working

**Diagnosis:**
- Open browser console
- Check for JavaScript errors
- Verify analytics code present

**Solutions:**
- Verify analytics code in HTML
- Check tracking ID correct
- Test in incognito mode
- Verify no ad blockers

## Performance Optimization

### Enable CDN

If using a CDN (Cloudflare, CloudFront, etc.):

1. **Configure CDN:**
   - Add domain to CDN
   - Configure cache rules
   - Set up SSL certificate

2. **Update DNS:**
   - Point domain to CDN
   - Wait for DNS propagation

3. **Test CDN:**
   - Verify assets served from CDN
   - Check cache headers
   - Test from multiple locations

### Optimize Images

```bash
# Optimize images (if any)
# Use tools like:
# - ImageOptim
# - TinyPNG
# - Squoosh
```

### Minify Assets

```bash
# CSS already minified (blog-article.min.css)
# Verify minified version is used in production
```

## Security Checklist

- ✅ HTTPS enabled
- ✅ Security headers configured
- ✅ File permissions correct (644 for files, 755 for directories)
- ✅ No sensitive data in HTML
- ✅ No debug code in production
- ✅ CSP headers configured (if applicable)

## Success Metrics

Track these metrics post-deployment:

### Technical Metrics
- Page load time < 2 seconds
- Lighthouse score > 90
- Zero 404 errors
- Zero JavaScript errors

### User Metrics
- Bounce rate < 60%
- Average time on page > 2 minutes
- Pages per session > 2
- Related article click rate > 10%

### SEO Metrics
- All pages indexed
- No crawl errors
- Rich results valid
- Mobile usability: No issues

## Post-Deployment Timeline

### Day 1
- Monitor every hour
- Check error logs
- Verify analytics
- Test critical paths

### Week 1
- Daily monitoring
- Review analytics trends
- Check Search Console
- Monitor performance

### Month 1
- Weekly monitoring
- SEO performance review
- User feedback analysis
- Performance optimization

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review analytics
- Check for broken links
- Monitor performance
- Review error logs

**Monthly:**
- Full SEO audit
- Performance optimization
- Accessibility audit
- Security review

**Quarterly:**
- Content updates
- Design improvements
- Feature enhancements
- Technology updates

## Conclusion

Following this deployment guide ensures a smooth, safe deployment of the blog integration to production. Remember to:

1. ✅ Validate before deploying
2. ✅ Backup before deploying
3. ✅ Test after deploying
4. ✅ Monitor continuously
5. ✅ Be ready to rollback if needed

For questions or issues, refer to:
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Troubleshooting Guide](BLOG_TROUBLESHOOTING.md)
- [Blog Integration README](BLOG_INTEGRATION_README.md)

---

**Last Updated:** 2025-01-14
**Version:** 1.0
