# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy the GGUF Model Index to GitHub Pages for free hosting.

## 📋 Prerequisites

- GitHub account
- Git installed on your computer
- Basic knowledge of Git commands

## 🎯 Quick Setup (5 minutes)

### Step 1: Create GitHub Repository

1. **Go to GitHub** and create a new repository
2. **Name it** something like `gguf-model-index` or `my-gguf-index`
3. **Make it public** (required for free GitHub Pages)
4. **Don't initialize** with README (we have our own files)

### Step 2: Upload Your Code

```bash
# Navigate to your project folder
cd gguf-model-index

# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: GGUF Model Index application"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. **Go to your repository** on GitHub
2. **Click Settings** tab
3. **Scroll to Pages** section (left sidebar)
4. **Source**: Select "Deploy from a branch"
5. **Branch**: Select "main"
6. **Folder**: Select "/ (root)"
7. **Click Save**

### Step 4: Wait and Access

- GitHub will build your site (takes 1-2 minutes)
- Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
- You'll see a green checkmark when it's ready

## 🔧 Configuration Files

I've created the necessary configuration files for you:

### `.github/workflows/deploy.yml` - Automated Deployment
### `index.html` - Root redirect file
### `404.html` - Custom error page
### `.nojekyll` - Disable Jekyll processing

## 🌐 Custom Domain (Optional)

If you want to use your own domain:

1. **Add CNAME file** to repository root:
```
yourdomain.com
```

2. **Configure DNS** at your domain provider:
```
Type: CNAME
Name: www (or @)
Value: YOUR_USERNAME.github.io
```

3. **Update GitHub Pages settings** with your custom domain

## 🔄 Automatic Updates

Every time you push changes to the main branch, GitHub Pages will automatically update your site.

```bash
# Make changes to your code
# Then push updates:
git add .
git commit -m "Update: description of changes"
git push
```

## 🐛 Troubleshooting

### Site Not Loading
- Check if GitHub Pages is enabled in repository settings
- Ensure repository is public
- Wait 5-10 minutes for initial deployment

### 404 Errors
- Verify `index.html` exists
- Check file paths are correct
- Ensure all files are committed and pushed

### JavaScript Not Working
- Check browser console for errors
- Verify all file paths use relative URLs
- Ensure CORS isn't blocking requests

## 📱 Testing Your Deployment

After deployment, test these features:
- [ ] Site loads at your GitHub Pages URL
- [ ] Models display correctly
- [ ] Search functionality works
- [ ] Filters work properly
- [ ] Mobile responsive design
- [ ] Keyboard navigation
- [ ] Error handling

## 🎉 You're Live!

Your GGUF Model Index is now live on the internet! Share your URL with others:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
```

## 📊 Analytics (Optional)

Add Google Analytics to track visitors:

1. **Get Google Analytics tracking ID**
2. **Add to `index.html`** before closing `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## 🔒 Security Considerations

- Repository is public (code is visible to everyone)
- No server-side processing (static files only)
- All data comes from JSON files in the repository
- No user data is collected or stored

---

**Need help?** Check the troubleshooting section or create an issue in your repository!