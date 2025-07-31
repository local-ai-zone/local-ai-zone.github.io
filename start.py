#!/usr/bin/env python3
"""
GGUF Model Index - Quick Start Script
=====================================

This script automatically starts a local web server for the GGUF Model Index application.
It will try different methods to start a server and open the application in your browser.

Usage:
    python start.py [port]

Examples:
    python start.py        # Start on default port 8000
    python start.py 3000   # Start on port 3000
"""

import sys
import os
import subprocess
import webbrowser
import time
import socket
from pathlib import Path

def check_port_available(port):
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def find_available_port(start_port=8000):
    """Find an available port starting from start_port."""
    port = start_port
    while port < start_port + 100:  # Try 100 ports
        if check_port_available(port):
            return port
        port += 1
    return None

def start_python_server(port):
    """Start Python HTTP server."""
    try:
        # Try Python 3 first
        cmd = [sys.executable, '-m', 'http.server', str(port)]
        print(f"🐍 Starting Python HTTP server on port {port}...")
        print(f"   Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            return process, f"http://localhost:{port}"
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Python server failed to start:")
            print(f"   stdout: {stdout}")
            print(f"   stderr: {stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Failed to start Python server: {e}")
        return None, None

def start_node_server(port):
    """Start Node.js server using npx serve."""
    try:
        cmd = ['npx', 'serve', '.', '-p', str(port)]
        print(f"📦 Starting Node.js server on port {port}...")
        print(f"   Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            return process, f"http://localhost:{port}"
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Node.js server failed to start:")
            print(f"   stdout: {stdout}")
            print(f"   stderr: {stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Failed to start Node.js server: {e}")
        return None, None

def start_php_server(port):
    """Start PHP built-in server."""
    try:
        cmd = ['php', '-S', f'localhost:{port}']
        print(f"🐘 Starting PHP server on port {port}...")
        print(f"   Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            return process, f"http://localhost:{port}"
        else:
            stdout, stderr = process.communicate()
            print(f"❌ PHP server failed to start:")
            print(f"   stdout: {stdout}")
            print(f"   stderr: {stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Failed to start PHP server: {e}")
        return None, None

def open_browser(url):
    """Open the application in the default browser."""
    try:
        print(f"🌐 Opening {url} in your browser...")
        webbrowser.open(url)
        return True
    except Exception as e:
        print(f"❌ Failed to open browser: {e}")
        print(f"   Please manually open: {url}")
        return False

def check_files():
    """Check if required files exist."""
    required_files = ['index.html', 'main.js']
    missing_files = []
    
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\n💡 Make sure you're running this script from the project root directory.")
        return False
    
    return True

def main():
    """Main function to start the server."""
    print("🧠 GGUF Model Index - Quick Start")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not check_files():
        sys.exit(1)
    
    # Get port from command line argument
    default_port = 8000
    if len(sys.argv) > 1:
        try:
            default_port = int(sys.argv[1])
        except ValueError:
            print(f"❌ Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    
    # Find available port
    port = find_available_port(default_port)
    if port is None:
        print(f"❌ No available ports found starting from {default_port}")
        sys.exit(1)
    
    if port != default_port:
        print(f"⚠️  Port {default_port} is busy, using port {port} instead")
    
    # Try different server methods
    server_methods = [
        ("Python", start_python_server),
        ("Node.js", start_node_server),
        ("PHP", start_php_server)
    ]
    
    process = None
    url = None
    
    for method_name, method_func in server_methods:
        print(f"\n🔄 Trying {method_name} server...")
        process, url = method_func(port)
        if process and url:
            print(f"✅ {method_name} server started successfully!")
            break
        else:
            print(f"❌ {method_name} server failed to start")
    
    if not process or not url:
        print("\n❌ Failed to start any server. Please try manually:")
        print(f"   python -m http.server {port}")
        print(f"   npx serve . -p {port}")
        print(f"   php -S localhost:{port}")
        sys.exit(1)
    
    # Open browser
    print(f"\n🎉 Server is running at: {url}")
    open_browser(url)
    
    print("\n" + "=" * 50)
    print("🎯 GGUF Model Index is now running!")
    print(f"   URL: {url}")
    print("   Press Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        # Keep the script running
        process.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping server...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print("✅ Server stopped successfully!")

if __name__ == "__main__":
    main()