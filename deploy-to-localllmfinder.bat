@echo off
REM LocalLLMFinder GitHub Pages Deployment Script (Windows)
REM ========================================================
REM Deploy GGUF Model Index to https://github.com/LocalLLMFinder/LocalLLMfinder.github.io

echo.
echo 🚀 Deploying to LocalLLMFinder GitHub Pages
echo =============================================
echo.

REM Repository details
set "REPO_URL=https://github.com/LocalLLMFinder/LocalLLMfinder.github.io.git"
set "GITHUB_PAGES_URL=https://localllmfinder.github.io"

echo ℹ️  Target Repository: %REPO_URL%
echo ℹ️  Live Site URL: %GITHUB_PAGES_URL%
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

REM Initialize git repository if needed
if not exist ".git" (
    echo ℹ️  Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository found
)

REM Check if remote origin exists and update it
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set "CURRENT_URL=%%i"
    if not "!CURRENT_URL!"=="%REPO_URL%" (
        echo ℹ️  Updating remote origin to LocalLLMFinder repository...
        git remote set-url origin "%REPO_URL%"
        echo ✅ Remote origin updated
    ) else (
        echo ✅ Remote origin already set to LocalLLMFinder repository
    )
) else (
    echo ℹ️  Adding LocalLLMFinder repository as remote origin...
    git remote add origin "%REPO_URL%"
    echo ✅ Remote origin added
)

REM Prepare files for deployment
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
        set "COMMIT_MSG=Deploy GGUF Model Index to LocalLLMFinder GitHub Pages"
    )
    
    git commit -m "%COMMIT_MSG%"
    echo ✅ Changes committed: %COMMIT_MSG%
)

REM Force push to main branch
echo ℹ️  Force pushing to LocalLLMFinder repository...
echo ⚠️  This will overwrite any existing content in the repository
echo.

set /p "CONFIRM_PUSH=Are you sure you want to force push? (y/N): "
if /i not "%CONFIRM_PUSH%"=="y" (
    echo ℹ️  Deployment cancelled by user
    pause
    exit /b 0
)

REM Force push to main branch
git push --force origin main

echo ✅ Successfully deployed to LocalLLMFinder repository!

REM Final instructions
echo.
echo ✅ Deployment Complete!
echo.
echo ℹ️  Your GGUF Model Index is now deployed to:
echo    Repository: %REPO_URL%
echo    Live Site: %GITHUB_PAGES_URL%
echo.
echo ℹ️  GitHub Pages Setup:
echo 1. Go to: https://github.com/LocalLLMFinder/LocalLLMfinder.github.io/settings/pages
echo 2. Under 'Source', select 'GitHub Actions' (if not already set)
echo 3. Wait 1-2 minutes for deployment to complete
echo 4. Visit: %GITHUB_PAGES_URL%
echo.
echo ℹ️  The site will be live at: %GITHUB_PAGES_URL%
echo.

REM Optional: Open repository in browser
set /p "OPEN_BROWSER=Open repository in browser? (y/n): "
if /i "%OPEN_BROWSER%"=="y" (
    start "" "%REPO_URL%"
)

echo.
echo ✅ LocalLLMFinder deployment completed successfully!
echo ℹ️  Your GGUF Model Index is now live for the world to use! 🌍
pause