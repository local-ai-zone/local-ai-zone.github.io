# Deployment Guide

## Overview

This guide covers various deployment options for the GGUF Model Discovery platform, from simple static hosting to advanced CI/CD setups.

## Quick Deployment Options

### 1. GitHub Pages (Recommended)

GitHub Pages provides free hosting with automatic SSL and CDN.

#### Setup Steps

1. **Enable GitHub Pages**
   ```bash
   # In your repository settings
   Settings → Pages → Source: Deploy from a branch
   Branch: main / (root)
   ```

2. **Configure Custom Domain (Optional)**
   ```bash
   # Add CNAME file
   echo "your-domain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

3. **Automatic Deployment**
   - Every push to `main` branch automatically deploys
   - Check deployment status in Actions tab
   - Site available at `https://username.github.io/repository-name`

#### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install dependencies
      run: |
        pip install -r scripts/requirements.txt
        npm install
        
    - name: Fetch latest model data
      run: python scripts/simplified_gguf_fetcher.py
      
    - name: Build site
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 2. Netlify

Netlify offers excellent performance and developer experience.

#### Setup Steps

1. **Connect Repository**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build Configuration**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "dist"
     
   [build.environment]
     NODE_VERSION = "18"
     PYTHON_VERSION = "3.9"
     
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Environment Variables**
   ```bash
   # In Netlify dashboard: Site settings → Environment variables
   HUGGINGFACE_TOKEN=your_token_here
   NODE_ENV=production
   ```

### 3. Vercel

Vercel provides excellent performance with edge functions.

#### Setup Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configuration**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

## Advanced Deployment

### Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Handle SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Security
        location ~ /\. {
            deny all;
        }
    }
}
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  gguf-discovery:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  # Optional: Add data fetcher service
  data-fetcher:
    build:
      context: .
      dockerfile: Dockerfile.fetcher
    volumes:
      - ./data:/app/data
    environment:
      - HUGGINGFACE_TOKEN=${HUGGINGFACE_TOKEN}
    restart: "no"
```

### Kubernetes Deployment

#### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gguf-discovery
  labels:
    app: gguf-discovery
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gguf-discovery
  template:
    metadata:
      labels:
        app: gguf-discovery
    spec:
      containers:
      - name: gguf-discovery
        image: your-registry/gguf-discovery:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: gguf-discovery-service
spec:
  selector:
    app: gguf-discovery
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

#### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gguf-discovery-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/redirect-to-https: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: gguf-discovery-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gguf-discovery-service
            port:
              number: 80
```

## CDN Configuration

### Cloudflare Setup

1. **Add Site to Cloudflare**
   - Add your domain to Cloudflare
   - Update nameservers at your registrar

2. **Optimization Settings**
   ```javascript
   // Cloudflare Page Rules
   // Rule 1: Cache everything
   URL: your-domain.com/*
   Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 1 day
   
   // Rule 2: Cache static assets longer
   URL: your-domain.com/*.{js,css,png,jpg,gif,ico,svg}
   Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 year
     - Browser Cache TTL: 1 year
   ```

3. **Security Settings**
   ```javascript
   // Security settings
   - SSL/TLS: Full (strict)
   - Always Use HTTPS: On
   - HSTS: Enabled
   - Minimum TLS Version: 1.2
   ```

### AWS CloudFront

```yaml
# cloudformation/cloudfront.yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
        - DomainName: your-s3-bucket.s3.amazonaws.com
          Id: S3Origin
          S3OriginConfig:
            OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${OriginAccessIdentity}'
        Enabled: true
        DefaultRootObject: index.html
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # Managed-CachingOptimized
          OriginRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf # Managed-CORS-S3Origin
        PriceClass: PriceClass_100
        ViewerCertificate:
          AcmCertificateArn: !Ref SSLCertificate
          SslSupportMethod: sni-only
```

## Environment-Specific Configurations

### Development

```javascript
// config/development.js
export default {
  apiUrl: 'http://localhost:3000',
  debug: true,
  analytics: false,
  caching: false,
  minification: false
};
```

### Staging

```javascript
// config/staging.js
export default {
  apiUrl: 'https://staging-api.gguf-discovery.com',
  debug: true,
  analytics: true,
  caching: true,
  minification: true
};
```

### Production

```javascript
// config/production.js
export default {
  apiUrl: 'https://api.gguf-discovery.com',
  debug: false,
  analytics: true,
  caching: true,
  minification: true,
  errorReporting: true
};
```

## Performance Optimization

### Build Optimization

```javascript
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './js/premium-app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true
  },
  optimization: {
    minimizer: [new TerserPlugin()],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      minify: true
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    })
  ]
};
```

### Asset Optimization

```bash
# Image optimization
npm install -g imagemin-cli
imagemin images/* --out-dir=dist/images --plugin=imagemin-mozjpeg --plugin=imagemin-pngquant

# CSS optimization
npm install -g cssnano-cli
cssnano css/premium-styles.css dist/css/styles.min.css

# JavaScript minification
npm install -g terser
terser js/premium-app.js -o dist/js/app.min.js --compress --mangle
```

## Monitoring and Analytics

### Error Tracking

```javascript
// Sentry integration
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter out development errors
    if (event.environment === 'development') {
      return null;
    }
    return event;
  }
});
```

### Performance Monitoring

```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: 'GGUF Model Discovery',
  page_location: window.location.href,
  custom_map: {
    'custom_parameter_1': 'model_type',
    'custom_parameter_2': 'search_query'
  }
});

// Core Web Vitals
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Security Considerations

### HTTPS Configuration

```nginx
# Force HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.github.com https://huggingface.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Check Node.js version
   node --version  # Should be 16+
   ```

2. **CORS Issues**
   ```javascript
   // Add CORS headers in server configuration
   add_header Access-Control-Allow-Origin "*";
   add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
   add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
   ```

3. **Performance Issues**
   ```bash
   # Analyze bundle size
   npm install -g webpack-bundle-analyzer
   webpack-bundle-analyzer dist/static/js/*.js
   
   # Check lighthouse scores
   npm install -g lighthouse
   lighthouse https://your-domain.com --output html --output-path ./lighthouse-report.html
   ```

### Health Checks

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});
```

This deployment guide covers all major deployment scenarios and provides production-ready configurations for hosting the GGUF Model Discovery platform.