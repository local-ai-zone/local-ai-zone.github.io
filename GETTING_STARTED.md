# 🚀 Getting Started with GGUF Model Index

Welcome! This guide will help you get the GGUF Model Index running on your system in just a few minutes.

## 🎯 What is GGUF Model Index?

GGUF Model Index is a modern web application that helps you browse, search, and download GGUF (GPT-Generated Unified Format) models. It features:

- 🔍 **Smart search and filtering**
- ⚡ **High performance with virtual scrolling**
- ♿ **Full accessibility support**
- 📱 **Mobile-responsive design**
- 🛡️ **Robust error handling**

## 🚀 Quick Start (Choose Your Method)

### Method 1: Automatic Start Scripts (Easiest)

We've created scripts that automatically detect and start the best available server:

#### Windows Users:
```cmd
# Double-click start.bat or run in Command Prompt:
start.bat

# Or with custom port:
start.bat 3000
```

#### Mac/Linux Users:
```bash
# Make executable and run:
chmod +x start.sh
./start.sh

# Or with custom port:
./start.sh 3000
```

#### Python Users (All Platforms):
```bash
python start.py

# Or with custom port:
python start.py 3000
```

### Method 2: Manual Server Start

Choose one of these methods based on what you have installed:

#### Python (Recommended - Most Common)
```bash
# Navigate to project folder
cd gguf-model-index

# Start server
python -m http.server 8000
# OR
python3 -m http.server 8000

# Open browser to: http://localhost:8000
```

#### Node.js
```bash
# Navigate to project folder
cd gguf-model-index

# Start server
npx serve .
# OR
npx http-server

# Open the URL shown in terminal
```

#### PHP
```bash
# Navigate to project folder
cd gguf-model-index

# Start server
php -S localhost:8000

# Open browser to: http://localhost:8000
```

## 🎉 You're Done!

Once the server starts, you should see:
- A grid of GGUF models
- A search bar at the top
- A filter button for advanced filtering
- Responsive design that works on mobile

## 📖 Next Steps

### Learn to Use the Application
- **Search**: Type in the search bar to find models
- **Filter**: Click the filter button to narrow results
- **Browse**: Scroll through the model grid
- **Download**: Click model cards for download links

### Read the Documentation
- **[User Guide](USER_GUIDE.md)**: How to use all features
- **[Quick Start](QUICK_START.md)**: 30-second setup guide
- **[README](README.md)**: Complete documentation

### For Developers
- **[Developer Guide](DEVELOPER_GUIDE.md)**: Technical documentation
- **Run tests**: `npm test`
- **Performance testing**: `node performance-test.js`

## 🔧 System Requirements

### Minimum Requirements
- **Browser**: Chrome 80+, Firefox 78+, Safari 13+, Edge 80+
- **Server**: Python 3.x OR Node.js OR PHP

### Recommended
- **Browser**: Latest Chrome, Firefox, Safari, or Edge
- **Server**: Python 3.8+ (fastest startup)
- **RAM**: 4GB+ for large datasets
- **Storage**: 100MB for application files

## 🆘 Troubleshooting

### Server Won't Start
```bash
# Check if Python is installed
python --version
python3 --version

# Check if Node.js is installed
node --version
npm --version

# Check if PHP is installed
php --version
```

### Application Won't Load
1. **Check the URL**: Make sure you're using `http://localhost:8000` (not `file://`)
2. **Try different port**: Use `python -m http.server 3000` and go to `http://localhost:3000`
3. **Check browser console**: Press F12 and look for errors
4. **Try different browser**: Test in Chrome, Firefox, or Safari

### Performance Issues
1. **Close other tabs**: Free up browser memory
2. **Try incognito mode**: Test without extensions
3. **Update browser**: Ensure you're using a recent version
4. **Check system resources**: Ensure adequate RAM available

### Common Error Messages

#### "CORS Error" or "Cross-Origin Request"
- **Problem**: Opening HTML file directly in browser
- **Solution**: Use a local server (any method above)

#### "Module not found" or "Import Error"
- **Problem**: Browser doesn't support ES6 modules
- **Solution**: Update browser or use a different one

#### "Port already in use"
- **Problem**: Another application is using the port
- **Solution**: Try a different port number (e.g., 3000, 5000, 8080)

## 🎯 Quick Validation

Once running, verify these features work:
- [ ] Models load and display in grid
- [ ] Search bar filters results as you type
- [ ] Filter button opens filter panel
- [ ] Clicking model cards shows details
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Mobile view works (resize browser window)

## 📞 Getting Help

If you're still having issues:

1. **Check browser console**: Press F12 → Console tab
2. **Try different browser**: Chrome usually works best
3. **Check file permissions**: Ensure files are readable
4. **Verify file structure**: Make sure `src/index.html` exists
5. **Update software**: Ensure Python/Node.js/PHP is recent

### File Structure Check
Your folder should look like this:
```
gguf-model-index/
├── src/
│   ├── index.html          ← Main HTML file
│   ├── main.js             ← Application entry point
│   ├── components/         ← UI components
│   ├── services/           ← Business logic
│   └── utils/              ← Utility functions
├── start.py                ← Python start script
├── start.bat               ← Windows start script
├── start.sh                ← Unix/Linux/Mac start script
├── README.md               ← Full documentation
└── package.json            ← Dependencies (optional)
```

## 🎊 Success!

If you see the GGUF Model Index with a grid of models, congratulations! You're ready to start browsing and downloading GGUF models.

**Happy model browsing! 🧠✨**

---

**Need more help?** Check out our comprehensive [README.md](README.md) or [User Guide](USER_GUIDE.md).