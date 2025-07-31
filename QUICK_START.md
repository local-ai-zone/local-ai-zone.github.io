# 🚀 Quick Start Guide

Get the GGUF Model Index running in under 2 minutes!

## 📋 What You Need
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Basic command line knowledge (optional)

## 🎯 Fastest Method (30 seconds)

### Option 1: Python (Most Common)
```bash
# Navigate to the project folder
cd gguf-model-index

# Start server (Python 3)
python -m http.server 8000

# Open in browser
# Go to: http://localhost:8000
```

### Option 2: Node.js
```bash
# Navigate to the project folder
cd gguf-model-index

# Start server
npx serve .

# Open the URL shown in terminal
```

### Option 3: PHP
```bash
# Navigate to the project folder
cd gguf-model-index

# Start server
php -S localhost:8000

# Open in browser
# Go to: http://localhost:8000
```

## 🎉 That's It!

You should now see the GGUF Model Index running in your browser with:
- A searchable grid of GGUF models
- Filter options for quantization, size, architecture
- Responsive design that works on mobile and desktop

## 🔧 First Steps

1. **Browse Models**: Scroll through the model grid
2. **Search**: Type in the search box to find specific models
3. **Filter**: Click the filter button (funnel icon) to narrow results
4. **Download**: Click any model card to see download options

## ❓ Having Issues?

### Can't Start Server?
- **Python not installed?** Download from [python.org](https://python.org)
- **Node.js not installed?** Download from [nodejs.org](https://nodejs.org)
- **Try a different port**: Add a different number (e.g., `python -m http.server 3000`)

### Application Won't Load?
- Check if you're using `http://localhost:8000` (not `file://`)
- Try a different browser
- Check browser console for errors (F12 → Console)

### Need More Help?
- Read the full [README.md](README.md) for detailed instructions
- Check the troubleshooting section
- Ensure your browser is up to date

## 🎨 What You'll See

The application includes:
- **Header** with title and model count
- **Search bar** for finding models
- **Filter button** for advanced filtering
- **Model grid** with virtual scrolling
- **Model cards** showing details and download links

## 🚀 Next Steps

Once you have it running:
- Explore the filtering options
- Try keyboard navigation (Tab, Enter, Escape)
- Test the search functionality
- Check out the responsive mobile design

**Enjoy browsing GGUF models! 🧠**