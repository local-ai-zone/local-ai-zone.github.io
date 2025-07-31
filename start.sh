#!/bin/bash

# GGUF Model Index - Unix/Linux/macOS Quick Start Script
# =====================================================
# This script starts a local web server for the GGUF Model Index application.

set -e  # Exit on any error

echo ""
echo "🧠 GGUF Model Index - Quick Start"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found"
    echo "   Make sure you're running this from the project root directory"
    echo ""
    exit 1
fi

if [ ! -f "main.js" ]; then
    echo "❌ Error: main.js not found"
    echo "   Make sure you're running this from the project root directory"
    echo ""
    exit 1
fi

echo "✅ Project files found"
echo ""

# Set default port
PORT=${1:-8000}

echo "🔄 Starting server on port $PORT..."
echo ""

# Function to check if a port is available
check_port() {
    local port=$1
    if command -v nc >/dev/null 2>&1; then
        ! nc -z localhost $port >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        ! netstat -ln | grep ":$port " >/dev/null 2>&1
    else
        # Fallback: assume port is available
        true
    fi
}

# Function to find an available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    while [ $port -lt $((start_port + 100)) ]; do
        if check_port $port; then
            echo $port
            return
        fi
        port=$((port + 1))
    done
    echo ""
}

# Check if requested port is available
if ! check_port $PORT; then
    echo "⚠️  Port $PORT is busy, finding alternative..."
    NEW_PORT=$(find_available_port $PORT)
    if [ -z "$NEW_PORT" ]; then
        echo "❌ No available ports found"
        exit 1
    fi
    PORT=$NEW_PORT
    echo "   Using port $PORT instead"
    echo ""
fi

# Function to try starting a server
try_server() {
    local name=$1
    local command=$2
    
    echo "🔄 Trying $name server..."
    
    if command -v ${command%% *} >/dev/null 2>&1; then
        echo "   Command: $command"
        if eval "$command" >/dev/null 2>&1 &; then
            local pid=$!
            sleep 2
            if kill -0 $pid 2>/dev/null; then
                echo "✅ $name server started successfully!"
                echo "   PID: $pid"
                return 0
            else
                echo "❌ $name server failed to start"
                return 1
            fi
        else
            echo "❌ $name server command failed"
            return 1
        fi
    else
        echo "❌ $name not found"
        return 1
    fi
}

# Function to open browser
open_browser() {
    local url=$1
    echo ""
    echo "🌐 Opening $url in your browser..."
    
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        open "$url" >/dev/null 2>&1 &
    elif command -v start >/dev/null 2>&1; then
        start "$url" >/dev/null 2>&1 &
    else
        echo "   Please manually open: $url"
    fi
}

# Try different server methods
SERVER_STARTED=false
SERVER_PID=""
URL="http://localhost:$PORT"

# Try Python 3
if ! $SERVER_STARTED && try_server "Python 3" "python3 -m http.server $PORT"; then
    SERVER_STARTED=true
    SERVER_CMD="python3 -m http.server $PORT"
fi

# Try Python
if ! $SERVER_STARTED && try_server "Python" "python -m http.server $PORT"; then
    SERVER_STARTED=true
    SERVER_CMD="python -m http.server $PORT"
fi

# Try Node.js
if ! $SERVER_STARTED && try_server "Node.js" "npx serve . -p $PORT"; then
    SERVER_STARTED=true
    SERVER_CMD="npx serve . -p $PORT"
fi

# Try PHP
if ! $SERVER_STARTED && try_server "PHP" "php -S localhost:$PORT"; then
    SERVER_STARTED=true
    SERVER_CMD="php -S localhost:$PORT"
fi

if ! $SERVER_STARTED; then
    echo ""
    echo "❌ Failed to start any server automatically."
    echo ""
    echo "💡 Please try manually:"
    echo "   python3 -m http.server $PORT"
    echo "   python -m http.server $PORT"
    echo "   npx serve . -p $PORT"
    echo "   php -S localhost:$PORT"
    echo ""
    echo "📋 Requirements:"
    echo "   - Python 3.x (recommended)"
    echo "   - Node.js with npm (alternative)"
    echo "   - PHP (alternative)"
    echo ""
    exit 1
fi

# Open browser
open_browser "$URL"

echo ""
echo "=================================================="
echo "🎉 GGUF Model Index is now running!"
echo "   URL: $URL"
echo "   Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping server..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    # Kill any remaining processes
    pkill -f "http.server $PORT" 2>/dev/null || true
    pkill -f "serve.*$PORT" 2>/dev/null || true
    pkill -f "php.*localhost:$PORT" 2>/dev/null || true
    echo "✅ Server stopped successfully!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the actual server (this will block)
echo "🚀 Starting server..."
eval "$SERVER_CMD" || cleanup