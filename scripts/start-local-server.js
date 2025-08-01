#!/usr/bin/env node

/**
 * Simple local server for testing pre-rendering
 * Serves the current directory on localhost:8000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'text/plain';
}

const server = http.createServer((req, res) => {
    try {
        const parsedUrl = url.parse(req.url);
        let pathname = parsedUrl.pathname;
        
        // Default to index.html for root requests
        if (pathname === '/') {
            pathname = '/index.html';
        }
        
        // Remove leading slash and resolve file path
        const filePath = path.join(process.cwd(), pathname.substring(1));
        
        // Check if file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <body>
                            <h1>404 - File Not Found</h1>
                            <p>The requested file <code>${pathname}</code> was not found.</p>
                            <p><a href="/">Go to homepage</a></p>
                        </body>
                    </html>
                `);
                return;
            }
            
            // Read and serve the file
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                    return;
                }
                
                const mimeType = getMimeType(filePath);
                res.writeHead(200, { 
                    'Content-Type': mimeType,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                });
                res.end(data);
            });
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log('🌐 Local server started successfully!');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${process.cwd()}`);
    console.log('');
    console.log('📝 Available pages:');
    console.log(`  • Main site: http://localhost:${PORT}/`);
    console.log(`  • Premium: http://localhost:${PORT}/premium-index.html`);
    console.log('');
    console.log('🧪 To test pre-rendering:');
    console.log('  node scripts/test-prerender-local.js');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.log('Try stopping other servers or use a different port.');
    } else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});