@echo off
REM GGUF Model Index - Windows Quick Start Script
REM =============================================
REM This batch file starts a local web server for the GGUF Model Index application.

echo.
echo 🧠 GGUF Model Index - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "index.html" (
    echo ❌ Error: src\index.html not found
    echo    Make sure you're running this from the project root directory
    echo.
    pause
    exit /b 1
)

if not exist "main.js" (
    echo ❌ Error: src\main.js not found
    echo    Make sure you're running this from the project root directory
    echo.
    pause
    exit /b 1
)

echo ✅ Project files found
echo.

REM Set default port
set PORT=8000
if not "%1"=="" set PORT=%1

echo 🔄 Starting server on port %PORT%...
echo.

REM Try Python first
echo 🐍 Trying Python HTTP server...
python -m http.server %PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python server started successfully!
    goto :open_browser
)

REM Try Python3 if python failed
echo 🐍 Trying Python3 HTTP server...
python3 -m http.server %PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python3 server started successfully!
    goto :open_browser
)

REM Try Node.js
echo 📦 Trying Node.js server...
npx serve . -p %PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js server started successfully!
    goto :open_browser
)

REM Try PHP
echo 🐘 Trying PHP server...
php -S localhost:%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PHP server started successfully!
    goto :open_browser
)

REM If all methods failed
echo.
echo ❌ Failed to start any server automatically.
echo.
echo 💡 Please try manually:
echo    python -m http.server %PORT%
echo    npx serve . -p %PORT%
echo    php -S localhost:%PORT%
echo.
echo 📋 Requirements:
echo    - Python 3.x (recommended)
echo    - Node.js with npm (alternative)
echo    - PHP (alternative)
echo.
pause
exit /b 1

:open_browser
echo.
echo 🌐 Opening http://localhost:%PORT% in your browser...
start http://localhost:%PORT%
echo.
echo ========================================
echo 🎉 GGUF Model Index is now running!
echo    URL: http://localhost:%PORT%
echo    Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the actual server (this will block)
python -m http.server %PORT% 2>nul || python3 -m http.server %PORT% 2>nul || npx serve . -p %PORT% 2>nul || php -S localhost:%PORT% 2>nul

echo.
echo 🛑 Server stopped.
pause