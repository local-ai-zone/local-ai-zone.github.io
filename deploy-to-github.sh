#!/bin/bash

# GGUF Model Index - GitHub Pages Deployment Script
# =================================================
# This script helps you deploy your GGUF Model Index to GitHub Pages

set -e  # Exit on any error

echo ""
echo "🚀 GGUF Model Index - GitHub Pages Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_status "Git is installed"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_status "Git repository initialized"
else
    print_status "Git repository found"
fi

# Check if required files exist
required_files=("index.html" "main.js" "gguf_models.json" "gguf_models_estimated_sizes.json")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    print_error "Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    echo ""
    print_info "Please ensure all required files are present before deploying."
    exit 1
fi

print_status "All required files found"

# Get repository information
echo ""
print_info "Repository Setup"
echo "=================="

# Check if remote origin exists
if git remote get-url origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    print_status "Remote origin found: $REPO_URL"
else
    echo ""
    print_warning "No remote origin found. You need to set up your GitHub repository."
    echo ""
    echo "Please follow these steps:"
    echo "1. Create a new repository on GitHub"
    echo "2. Copy the repository URL (e.g., https://github.com/username/repo-name.git)"
    echo ""
    read -p "Enter your GitHub repository URL: " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        print_error "Repository URL is required"
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    print_status "Remote origin added: $REPO_URL"
fi

# Extract username and repo name from URL
if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
    GITHUB_PAGES_URL="https://${USERNAME}.github.io/${REPO_NAME}"
    
    print_info "GitHub Pages URL will be: $GITHUB_PAGES_URL"
else
    print_warning "Could not parse GitHub repository URL"
fi

# Check git status
echo ""
print_info "Preparing files for deployment..."

# Add all files
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_info "No changes to commit"
else
    # Get commit message
    echo ""
    read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Deploy GGUF Model Index to GitHub Pages"
    fi
    
    git commit -m "$COMMIT_MSG"
    print_status "Changes committed: $COMMIT_MSG"
fi

# Push to GitHub
echo ""
print_info "Pushing to GitHub..."

# Check if main branch exists on remote
if git ls-remote --heads origin main | grep -q main; then
    git push origin main
else
    git push -u origin main
fi

print_status "Code pushed to GitHub successfully!"

# Instructions for enabling GitHub Pages
echo ""
print_info "GitHub Pages Setup Instructions"
echo "==============================="
echo ""
echo "To enable GitHub Pages for your repository:"
echo ""
echo "1. Go to your repository on GitHub:"
echo "   $REPO_URL"
echo ""
echo "2. Click on the 'Settings' tab"
echo ""
echo "3. Scroll down to 'Pages' in the left sidebar"
echo ""
echo "4. Under 'Source', select 'GitHub Actions'"
echo ""
echo "5. The deployment will start automatically"
echo ""
echo "6. Your site will be available at:"
if [ ! -z "$GITHUB_PAGES_URL" ]; then
    echo "   $GITHUB_PAGES_URL"
else
    echo "   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
fi
echo ""

# Check if GitHub CLI is available for automatic setup
if command -v gh &> /dev/null; then
    echo ""
    read -p "Do you want to automatically enable GitHub Pages? (y/n): " ENABLE_PAGES
    
    if [[ $ENABLE_PAGES =~ ^[Yy]$ ]]; then
        print_info "Enabling GitHub Pages..."
        
        if gh api repos/:owner/:repo/pages -X POST -f source=gh-pages 2>/dev/null; then
            print_status "GitHub Pages enabled successfully!"
        else
            print_warning "Could not automatically enable GitHub Pages. Please enable it manually."
        fi
    fi
else
    print_info "Install GitHub CLI (gh) for automatic GitHub Pages setup"
fi

# Final instructions
echo ""
print_status "Deployment Complete!"
echo ""
print_info "Next Steps:"
echo "==========="
echo ""
echo "1. Enable GitHub Pages in your repository settings (if not done automatically)"
echo "2. Wait 1-2 minutes for the site to build"
echo "3. Visit your site and test all functionality"
echo "4. Update your model data files as needed"
echo ""
print_info "Your GGUF Model Index is now ready for the world! 🌍"
echo ""

# Optional: Open repository in browser
if command -v open &> /dev/null; then
    read -p "Open repository in browser? (y/n): " OPEN_BROWSER
    if [[ $OPEN_BROWSER =~ ^[Yy]$ ]]; then
        open "$REPO_URL"
    fi
elif command -v xdg-open &> /dev/null; then
    read -p "Open repository in browser? (y/n): " OPEN_BROWSER
    if [[ $OPEN_BROWSER =~ ^[Yy]$ ]]; then
        xdg-open "$REPO_URL"
    fi
fi

echo ""
print_status "Deployment script completed successfully!"