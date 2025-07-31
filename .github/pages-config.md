# GitHub Pages Configuration Guide

This document provides instructions for configuring GitHub Pages for the GGUF Model Discovery website.

## Repository Settings

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. The deployment will start automatically

### 2. Custom Domain Configuration (Optional)

If you want to use a custom domain:

1. Create a `CNAME` file in the repository root with your domain name
2. In repository Settings > Pages, enter your custom domain
3. Enable "Enforce HTTPS" (recommended)
4. Configure your DNS provider to point to GitHub Pages:
   - For apex domain (example.com): Create A records pointing to:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - For subdomain (www.example.com): Create CNAME record pointing to `username.github.io`

### 3. Security Configuration

The deployment workflow automatically adds security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy with appropriate directives

### 4. HTTPS Configuration

GitHub Pages automatically provides HTTPS for:
- `username.github.io/repository` URLs
- Custom domains (after DNS verification)

## Environment Variables

No environment variables are required for GitHub Pages deployment. All configuration is handled through:
- Repository settings
- Workflow files
- Static configuration files

## Monitoring

The deployment status can be monitored through:
- GitHub Actions tab in your repository
- Pages section in repository settings
- Deployment environments section

## Troubleshooting

### Common Issues

1. **404 errors**: Ensure all file paths are correct and case-sensitive
2. **HTTPS not working**: Wait for DNS propagation (up to 24 hours)
3. **Build failures**: Check GitHub Actions logs for detailed error messages
4. **Custom domain issues**: Verify DNS configuration and CNAME file

### Build Logs

Check the GitHub Actions tab for detailed build and deployment logs. Each step is logged separately for easy debugging.