# Security Configuration for GitHub Pages

This document outlines the security measures implemented for the GGUF Model Discovery website.

## Security Headers

The following security headers are automatically added during the build process:

### X-Frame-Options
```
X-Frame-Options: DENY
```
Prevents the site from being embedded in frames, protecting against clickjacking attacks.

### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
Prevents browsers from MIME-sniffing responses, reducing XSS risks.

### X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
Enables browser XSS filtering and blocks pages when attacks are detected.

### Referrer Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
Controls referrer information sent with requests for privacy protection.

### Content Security Policy
```
Content-Security-Policy: default-src 'self'; 
                        script-src 'self' 'unsafe-inline'; 
                        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
                        font-src 'self' https://fonts.gstatic.com; 
                        img-src 'self' data: https:; 
                        connect-src 'self' https://api.github.com
```

This CSP policy:
- Restricts resource loading to same-origin by default
- Allows inline scripts and styles (required for the application)
- Permits Google Fonts for typography
- Allows images from any HTTPS source and data URLs
- Restricts network requests to same-origin and GitHub API

## HTTPS Configuration

### Automatic HTTPS
- GitHub Pages automatically provides HTTPS for all `*.github.io` domains
- Custom domains receive automatic HTTPS after DNS verification
- HTTP requests are automatically redirected to HTTPS

### Certificate Management
- GitHub Pages handles SSL certificate provisioning and renewal
- Uses Let's Encrypt certificates for custom domains
- Supports modern TLS versions (1.2+)

## Data Security

### Static Data Only
- No server-side processing reduces attack surface
- All data is pre-generated and served statically
- No user data collection or storage

### API Security
- Frontend only loads pre-generated JSON files
- No direct API calls to external services from client
- Data fetching happens server-side in GitHub Actions

## Access Control

### Repository Permissions
- GitHub Actions workflows use minimal required permissions
- `contents: write` for committing data updates
- `pages: write` for deployment
- `id-token: write` for OIDC authentication

### Secrets Management
- Hugging Face API token stored as GitHub secret
- No secrets exposed in client-side code
- Automatic token rotation recommended

## Monitoring and Alerting

### Build Security
- Dependency scanning via GitHub Dependabot
- Automated security updates for dependencies
- Build process isolation in GitHub Actions

### Runtime Security
- Static site reduces runtime vulnerabilities
- No server-side code execution
- Client-side code is minified and optimized

## Compliance Considerations

### Privacy
- No user tracking or analytics by default
- No cookies or local storage of personal data
- Minimal data collection (only usage statistics if enabled)

### Accessibility
- Security headers don't interfere with accessibility features
- CSP allows necessary resources for screen readers
- HTTPS ensures secure access for all users

## Security Best Practices

### Regular Updates
- Dependencies updated automatically via Dependabot
- Security patches applied promptly
- Regular security audits of the codebase

### Incident Response
- GitHub Security Advisories for vulnerability disclosure
- Automated alerts for security issues
- Clear escalation path for security incidents

## Testing Security

### Automated Testing
- Security headers validated in CI/CD pipeline
- CSP violations monitored and reported
- HTTPS configuration tested automatically

### Manual Testing
- Regular security scans using tools like:
  - Mozilla Observatory
  - Security Headers checker
  - SSL Labs SSL Test

## Additional Recommendations

### For Production Use
1. Enable GitHub Advanced Security features
2. Set up security monitoring and alerting
3. Regular security audits and penetration testing
4. Implement proper incident response procedures
5. Consider additional security tools and services