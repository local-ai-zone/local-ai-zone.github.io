#!/bin/bash

# LocalLLMFinder GitHub Pages Deployment Script
# ==============================================
# Deploy GGUF Model Index to https://github.com/LocalLLMFinder/LocalLLMfinder.github.io

set -e  # Exit on any error

echo ""
echo "🚀 Deploying to LocalLLMFinder GitHub Pages"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Repository details
REPO_URL="https://github.com/LocalLLMFinder/LocalLLMfinder.github.io.git"
GITHUB_PAGES_URL="https://localllmfinder.github.io"

print_info "Target Repository: $REPO_URL"
print_info "Live Site URL: $GITHUB_PAGES_URL"

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_status "Git is installed"

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

# Initialize git repository if needed
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_status "Git repository initialized"
else
    print_status "Git repository found"
fi

# Check if remote origin exists and update it
if git remote get-url origin &> /dev/null; then
    CURRENT_URL=$(git remote get-url origin)
    if [ "$CURRENT_URL" != "$REPO_URL" ]; then
        print_info "Updating remote origin to LocalLLMFinder repository..."
        git remote set-url origin "$REPO_URL"
        print_status "Remote origin updated"
    else
        print_status "Remote origin already set to LocalLLMFinder repository"
    fi
else
    print_info "Adding LocalLLMFinder repository as remote origin..."
    git remote add origin "$REPO_URL"
    print_status "Remote origin added"
fi

# Prepare files for deployment
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
        COMMIT_MSG="Deploy GGUF Model Index to LocalLLMFinder GitHub Pages"
    fi
    
    git commit -m "$COMMIT_MSG"
    print_status "Changes committed: $COMMIT_MSG"
fi

# Force push to main branch
print_info "Force pushing to LocalLLMFinder repository..."
print_warning "This will overwrite any existing content in the repository"

echo ""
read -p "Are you sure you want to force push? (y/N): " CONFIRM_PUSH

if [[ ! $CONFIRM_PUSH =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled by user"
    exit 0
fi

# Force push to main branch
git push --force origin main

print_status "Successfully deployed to LocalLLMFinder repository!"

# Final instructions
echo ""
print_status "Deployment Complete!"
echo ""
print_info "Your GGUF Model Index is now deployed to:"
echo "   Repository: $REPO_URL"
echo "   Live Site: $GITHUB_PAGES_URL"
echo ""
print_info "GitHub Pages Setup:"
echo "1. Go to: https://github.com/LocalLLMFinder/LocalLLMfinder.github.io/settings/pages"
echo "2. Under 'Source', select 'GitHub Actions' (if not already set)"
echo "3. Wait 1-2 minutes for deployment to complete"
echo "4. Visit: $GITHUB_PAGES_URL"
echo ""
print_info "The site will be live at: $GITHUB_PAGES_URL"
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
print_status "LocalLLMFinder deployment completed successfully!"
print_info "Your GGUF Model Index is now live for the world to use! 🌍"