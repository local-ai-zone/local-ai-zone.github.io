# Deployment Guide

This guide covers the complete deployment process for the GGUF Model Discovery Website, from initial setup to production monitoring.

## 🚀 Quick Deployment

### Prerequisites

1. **GitHub Repository**: Fork or create a new repository
2. **GitHub Pages**: Enable in repository settings
3. **Secrets Configuration**: Set up required secrets

### One-Click Deployment

1. **Fork the repository** to your GitHub account
2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: GitHub Actions
3. **Configure secrets** (optional but recommended):
   - `HUGGING_FACE_TOKEN`: For higher API rate limits
   - `SLACK_WEBHOOK_URL`: For deployment notifications
4. **Push to main branch** - deployment starts automatically

## 📋 Detailed Setup

### 1. Repository Configuration

#### Fork or Clone
```bash
# Option 1: Fork on GitHub (recommended)
# Click "Fork" button on the repository page

# Option 2: Clone and create new repository
git clone https://github.com/original-repo/gguf-model-discovery.git
cd gguf-model-discovery
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
```

#### Repository Settings
1. **General Settings**:
   - Repository name: `gguf-model-discovery` (or your preferred name)
   - Description: "Fast, SEO-optimized GGUF model discovery website"
   - Public repository (required for free GitHub Pages)

2. **Branch Protection** (recommended):
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Require status checks to pass
   - Require branches to be up to date

### 2. GitHub Pages Configuration

#### Enable GitHub Pages
1. Go to repository Settings → Pages
2. **Source**: Deploy from a branch → GitHub Actions
3. **Custom domain** (optional):
   - Add your domain (e.g., `models.yourdomain.com`)
   - Create CNAME file in repository root
4. **Enforce HTTPS**: Enable (recommended)

#### DNS Configuration (Custom Domain)
```dns
# For subdomain (models.yourdomain.com)
CNAME models YOUR-USERNAME.github.io

# For apex domain (yourdomain.com)
A @ 185.199.108.153
A @ 185.199.109.153
A @ 185.199.110.153
A @ 185.199.111.153
```

### 3. Secrets and Environment Variables

#### Required Secrets
Go to Settings → Secrets and variables → Actions:

```bash
# Optional but recommended
HUGGING_FACE_TOKEN=hf_your_token_here

# For deployment notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=alerts@yourdomain.com
```

#### Environment Configuration
Create `.env` file for local development:
```env
HUGGING_FACE_TOKEN=hf_your_token_here
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
ENABLE_PERFORMANCE_MONITORING=true
```

### 4. Workflow Configuration

#### Main Workflows
The repository includes three main workflows:

1. **`update-gguf-models.yml`**: Daily data updates at 23:59 UTC
2. **`deploy-pages.yml`**: Builds and deploys the site
3. **`deployment-notifications.yml`**: Monitors deployments and sends alerts

#### Customize Update Schedule
Edit `.github/workflows/update-gguf-models.yml`:
```yaml
on:
  schedule:
    - cron: '59 23 * * *'  # Change time as needed (UTC)
  workflow_dispatch:       # Manual trigger
```

#### Workflow Permissions
Ensure workflows have proper permissions:
```yaml
permissions:
  contents: write
  pages: write
  id-token: write
  issues: write
```

## 🔧 Build and Deployment Process

### Local Development

#### Setup
```bash
# Install dependencies
npm install
pip install -r scripts/requirements.txt

# Fetch initial data
python scripts/update_models.py

# Start development server
npm run dev
```

#### Testing
```bash
# Run all tests
npm test

# Test data pipeline
python scripts/test_pipeline.py

# Test GitHub Pages compatibility
node validate-github-pages.js
```

#### Build for Production
```bash
# Create production build
npm run build

# Test build locally
npm run preview
```

### Automated Deployment

#### Deployment Trigger
Deployment happens automatically when:
- Code is pushed to `main` branch
- Data update workflow completes
- Manual workflow dispatch

#### Deployment Steps
1. **Code checkout** and dependency installation
2. **Data validation** and processing
3. **Build optimization** with Vite
4. **Asset compression** and minification
5. **GitHub Pages deployment**
6. **Health checks** and monitoring

#### Monitoring Deployment
```bash
# Check deployment status
curl -s https://api.github.com/repos/YOUR-USERNAME/YOUR-REPO/deployments

# Monitor site health
./scripts/monitor-deployment.sh health
```

## 📊 Monitoring and Maintenance

### Health Monitoring

#### Automated Monitoring
The system includes automated monitoring for:
- Site accessibility and response time
- Data freshness (updated within 25 hours)
- SSL certificate validity
- GitHub Actions workflow status
- Performance metrics

#### Manual Health Check
```bash
# Run comprehensive health check
./scripts/monitor-deployment.sh

# Check specific components
./scripts/monitor-deployment.sh accessibility
./scripts/monitor-deployment.sh data
./scripts/monitor-deployment.sh performance
```

#### Health Check API
Access health status programmatically:
```bash
curl https://your-site.com/health
```

### Performance Monitoring

#### Lighthouse Audits
Automated Lighthouse audits run after each deployment:
- Performance score
- Accessibility compliance
- SEO optimization
- Best practices

#### Bundle Size Monitoring
Track JavaScript and CSS bundle sizes:
```bash
npm run build
npm run analyze
```

#### Performance Budgets
Set performance budgets in `vite.config.js`:
```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'lodash'],
        },
      },
    },
  },
}
```

### Error Tracking

#### Automated Error Detection
- JavaScript errors in browser console
- Network request failures
- Search functionality issues
- Data loading problems

#### Error Notifications
Configure error notifications:
```yaml
# In deployment-notifications.yml
- name: Send error alert
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 🔒 Security and Compliance

### Security Headers

#### Content Security Policy
Configure CSP in `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://huggingface.co;">
```

#### Security Audits
```bash
# Run security audit
npm audit

# Check for vulnerabilities
npm audit fix
```

### Data Privacy

#### No Personal Data Collection
The site doesn't collect personal information:
- No cookies (except essential ones)
- No user tracking
- No form submissions
- No user accounts

#### GDPR Compliance
- Privacy policy included
- No data processing consent required
- Right to information respected

### SSL/TLS Configuration

#### Certificate Management
GitHub Pages automatically provides SSL certificates:
- Automatic renewal
- Modern TLS protocols
- HSTS headers

#### Custom Domain SSL
For custom domains:
1. Add domain to repository settings
2. Wait for certificate provisioning
3. Enable "Enforce HTTPS"

## 🚨 Troubleshooting Deployment

### Common Issues

#### Build Failures
```bash
# Check build logs in GitHub Actions
# Common fixes:
npm install terser --save-dev  # Missing terser
npm ci                         # Clean install
rm -rf node_modules package-lock.json && npm install
```

#### Data Pipeline Failures
```bash
# Check Python dependencies
pip install -r scripts/requirements.txt

# Test data fetching
python scripts/test_pipeline.py

# Check API rate limits
curl -H "Authorization: Bearer $HUGGING_FACE_TOKEN" \
     https://huggingface.co/api/models?limit=1
```

#### GitHub Pages Issues
```bash
# Verify Pages settings
# Check custom domain configuration
# Ensure .nojekyll file exists
# Verify workflow permissions
```

### Recovery Procedures

#### Rollback Deployment
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard COMMIT_SHA
git push --force origin main
```

#### Emergency Maintenance
```bash
# Create maintenance page
echo "Site under maintenance" > maintenance.html
git add maintenance.html
git commit -m "Enable maintenance mode"
git push origin main
```

#### Data Recovery
```bash
# Restore from backup
git checkout HEAD~1 -- gguf_models.json
git commit -m "Restore data from backup"
git push origin main
```

## 📈 Scaling and Optimization

### Performance Optimization

#### CDN Configuration
GitHub Pages includes global CDN:
- Automatic edge caching
- Gzip compression
- HTTP/2 support

#### Asset Optimization
```javascript
// vite.config.js
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
}
```

#### Lazy Loading
Enable lazy loading for better performance:
```javascript
// In ModelCard.js
const observer = new IntersectionObserver(callback, {
  rootMargin: '50px',
  threshold: 0.1
});
```

### Scaling Considerations

#### Rate Limiting
Monitor Hugging Face API usage:
- Free tier: 1000 requests/hour
- With token: Higher limits
- Implement exponential backoff

#### Data Volume
Current system handles:
- ~10,000 models efficiently
- JSON files under 10MB
- Search index under 5MB

#### Traffic Scaling
GitHub Pages limits:
- 100GB bandwidth/month
- 1GB repository size
- 10 builds/hour

## 🔄 Maintenance Schedule

### Daily Tasks (Automated)
- Data refresh from Hugging Face
- Health checks and monitoring
- Performance audits
- Security scans

### Weekly Tasks (Manual)
- Review error logs
- Check performance metrics
- Update dependencies
- Monitor disk usage

### Monthly Tasks (Manual)
- Security audit
- Performance optimization review
- Documentation updates
- Backup verification

### Quarterly Tasks (Manual)
- Dependency major updates
- Architecture review
- User feedback analysis
- Capacity planning

## 📞 Support and Maintenance

### Getting Help
1. **Documentation**: Check README and guides
2. **Issues**: Search existing GitHub issues
3. **Discussions**: Use GitHub Discussions
4. **Logs**: Check GitHub Actions logs

### Maintenance Contacts
- **Technical Issues**: Create GitHub issue
- **Security Issues**: Email security@yourdomain.com
- **General Questions**: Use GitHub Discussions

### SLA and Uptime
- **Target Uptime**: 99.9%
- **Data Freshness**: Updated within 25 hours
- **Response Time**: < 3 seconds globally
- **Recovery Time**: < 1 hour for critical issues

---

**Deployment Status**: Ready for production use with comprehensive monitoring and maintenance procedures in place.