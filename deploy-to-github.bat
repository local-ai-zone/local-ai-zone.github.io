@echo off
REM GGUF Model Index - GitHub Pages Deployment Script (Windows)
REM ===========================================================
REM This script helps you deploy your GGUF Model Index to GitHub Pages

echo.
echo 🚀 GGUF Model Index - GitHub Pages Deployment
echo ==============================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first.
    echo    Download from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo ✅ Git is installed

REM Check if we're in a git repository
if not exist ".git" (
    echo ℹ️  Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository found
)

REM Check if required files exist
set "missing_files="
if not exist "src\index.html" set "missing_files=%missing_files% src\index.html"
if not exist "src\main.js" set "missing_files=%missing_files% src\main.js"
if not exist "gguf_models.json" set "missing_files=%missing_files% gguf_models.json"
if not exist "gguf_models_estimated_sizes.json" set "missing_files=%missing_files% gguf_models_estimated_sizes.json"

if not "%missing_files%"=="" (
    echo ❌ Missing required files:
    for %%f in (%missing_files%) do echo    - %%f
    echo.
    echo ℹ️  Please ensure all required files are present before deploying.
    pause
    exit /b 1
)

echo ✅ All required files found

REM Repository Setup
echo.
echo ℹ️  Repository Setup
echo ==================

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set "REPO_URL=%%i"
    echo ✅ Remote origin found: !REPO_URL!
) else (
    echo.
    echo ⚠️  No remote origin found. You need to set up your GitHub repository.
    echo.
    echo Please follow these steps:
    echo 1. Create a new repository on GitHub
    echo 2. Copy the repository URL (e.g., https://github.com/username/repo-name.git)
    echo.
    set /p "REPO_URL=Enter your GitHub repository URL: "
    
    if "!REPO_URL!"=="" (
        echo ❌ Repository URL is required
        pause
        exit /b 1
    )
    
    git remote add origin "!REPO_URL!"
    echo ✅ Remote origin added: !REPO_URL!
)

REM Extract GitHub Pages URL
for /f "tokens=4,5 delims=/" %%a in ("!REPO_URL!") do (
    set "USERNAME=%%a"
    set "REPO_NAME=%%b"
)
set "REPO_NAME=%REPO_NAME:.git=%"
set "GITHUB_PAGES_URL=https://%USERNAME%.github.io/%REPO_NAME%"

echo ℹ️  GitHub Pages URL will be: %GITHUB_PAGES_URL%

REM Prepare files for deployment
echo.
echo ℹ️  Preparing files for deployment...

REM Add all files
git add .

REM Check if there are changes to commit
git diff --staged --quiet >nul 2>&1
if %errorlevel% equ 0 (
    echo ℹ️  No changes to commit
) else (
    REM Get commit message
    echo.
    set /p "COMMIT_MSG=Enter commit message (or press Enter for default): "
    
    if "%COMMIT_MSG%"=="" (
        set "COMMIT_MSG=Deploy GGUF Model Index to GitHub Pages"
    )
    
    git commit -m "%COMMIT_MSG%"
    echo ✅ Changes committed: %COMMIT_MSG%
)

REM Push to GitHub
echo.
echo ℹ️  Pushing to GitHub...

REM Check if main branch exists on remote
git ls-remote --heads origin main | find "main" >nul 2>&1
if %errorlevel% equ 0 (
    git push origin main
) else (
    git push -u origin main
)

echo ✅ Code pushed to GitHub successfully!

REM Instructions for enabling GitHub Pages
echo.
echo ℹ️  GitHub Pages Setup Instructions
echo ===============================
echo.
echo To enable GitHub Pages for your repository:
echo.
echo 1. Go to your repository on GitHub:
echo    %REPO_URL%
echo.
echo 2. Click on the 'Settings' tab
echo.
echo 3. Scroll down to 'Pages' in the left sidebar
echo.
echo 4. Under 'Source', select 'GitHub Actions'
echo.
echo 5. The deployment will start automatically
echo.
echo 6. Your site will be available at:
echo    %GITHUB_PAGES_URL%
echo.

REM Final instructions
echo.
echo ✅ Deployment Complete!
echo.
echo ℹ️  Next Steps:
echo ===========
echo.
echo 1. Enable GitHub Pages in your repository settings
echo 2. Wait 1-2 minutes for the site to build
echo 3. Visit your site and test all functionality
echo 4. Update your model data files as needed
echo.
echo ℹ️  Your GGUF Model Index is now ready for the world! 🌍
echo.

REM Optional: Open repository in browser
set /p "OPEN_BROWSER=Open repository in browser? (y/n): "
if /i "%OPEN_BROWSER%"=="y" (
    start "" "%REPO_URL%"
)

echo.
echo ✅ Deployment script completed successfully!
pause