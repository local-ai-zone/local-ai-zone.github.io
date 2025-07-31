# 📖 GGUF Model Index - User Guide

A comprehensive guide to using the GGUF Model Index application effectively.

## 🎯 Overview

The GGUF Model Index is a web application that helps you browse, search, and download GGUF (GPT-Generated Unified Format) models. It provides an intuitive interface with powerful filtering and search capabilities.

## 🏠 Main Interface

### Header Section
- **Title**: "🧠 GGUF Model Index"
- **Model Count**: Shows total number of models (e.g., "1,234 models")
- **Loading Indicator**: Appears when data is being loaded

### Search Bar
- **Location**: Below the header
- **Function**: Real-time search across model names, architectures, and families
- **Placeholder**: "Search models..."
- **Shortcut**: Press `Ctrl+K` to focus

### Filter Button
- **Location**: Top-right of the main content area
- **Icon**: Funnel symbol
- **Badge**: Shows number of active filters
- **Shortcut**: Press `Alt+F` to toggle

### Model Grid
- **Layout**: Responsive grid that adapts to screen size
- **Virtual Scrolling**: Efficiently handles thousands of models
- **Loading**: Shows skeleton cards while loading

## 🔍 Searching for Models

### Basic Search
1. **Click the search bar** or press `Ctrl+K`
2. **Type your query** (e.g., "llama", "mistral", "7b")
3. **Results update instantly** as you type
4. **Clear search** by deleting text or pressing Escape

### Search Tips
- **Model names**: Search for "llama", "mistral", "qwen"
- **Architectures**: Find models by architecture type
- **Quantization**: Search for "q4", "q8", "f16"
- **Size**: Search for "7b", "13b", "70b"
- **Partial matches**: "llam" will find "llama" models

### Search Examples
```
llama 7b          → Find 7B LLaMA models
mistral q4        → Find Mistral models with Q4 quantization
microsoft phi     → Find Phi models from Microsoft
code              → Find code-related models
```

## 🎛️ Using Filters

### Opening Filters
1. **Click the filter button** (funnel icon)
2. **Or press `Alt+F`**
3. **Filter panel slides in** from the right

### Filter Categories

#### 🔢 Quantization
- **Purpose**: Filter by model quantization type
- **Options**: Q4_K_M, Q8_0, Q6_K, Q5_K_M, Q4_0, F16, etc.
- **Multiple selection**: Choose multiple quantization types
- **Impact**: Affects model size and quality

#### 📏 Size Range
- **Purpose**: Filter by file size
- **Options**: 
  - < 1GB (Small models)
  - 1-4GB (Medium models)
  - 4-8GB (Large models)
  - 8-16GB (Very large models)
  - > 16GB (Huge models)
- **Use case**: Choose based on your storage and memory

#### 🏗️ Architecture
- **Purpose**: Filter by model architecture
- **Options**: LLaMA, Mistral, Qwen, Phi, Gemma, CodeLlama, etc.
- **Description**: The underlying model architecture/family

#### 👥 Family
- **Purpose**: Filter by organization/creator
- **Options**: microsoft, meta-llama, mistralai, google, etc.
- **Use case**: Find models from specific organizations

### Filter Operations

#### Applying Filters
1. **Select desired options** in each category
2. **Filters apply automatically** as you select
3. **Results update immediately**
4. **Filter count** shows in the filter button badge

#### Clearing Filters
- **Individual**: Click the X next to each selected filter
- **Category**: Use "Clear" button in each section
- **All filters**: Click "Clear All Filters" at the bottom

#### Filter Combinations
- **AND logic**: All selected filters must match
- **Multiple values**: OR logic within each category
- **Example**: "Mistral OR LLaMA" AND "Q4_K_M OR Q8_0" AND "1-4GB"

## 📱 Model Cards

Each model is displayed as a card containing:

### Card Header
- **Model Name**: Clean, readable name (e.g., "LLaMA 2 7B Chat Q4")
- **Tags**: Visual indicators for popular models and size categories

### Card Body
- **File Size**: Human-readable size (e.g., "3.8 GB")
- **Quantization**: Model quantization type
- **Architecture**: Model architecture
- **Family**: Organization/creator

### Card Footer
- **Download Count**: Popularity indicator
- **Last Modified**: When the model was last updated

### Card Actions
- **Click anywhere** on the card to view details
- **Download links** appear in expanded view
- **Keyboard navigation** with Tab and Enter

## ⌨️ Keyboard Navigation

### Global Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+K` | Focus search bar |
| `Alt+F` | Toggle filter panel |
| `Tab` | Navigate between elements |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Activate buttons/links |
| `Space` | Activate buttons |
| `Escape` | Close panels/modals |

### Navigation Shortcuts
| Key | Action |
|-----|--------|
| `G then H` | Jump to header |
| `G then M` | Jump to model grid |
| `G then F` | Jump to filters |

### Grid Navigation
| Key | Action |
|-----|--------|
| `Arrow Keys` | Navigate between model cards |
| `Home` | Go to first model |
| `End` | Go to last model |
| `Page Up/Down` | Scroll by page |

### Filter Panel Navigation
| Key | Action |
|-----|--------|
| `Tab` | Navigate between filter options |
| `Space` | Toggle filter selection |
| `Enter` | Apply/confirm selection |
| `Escape` | Close filter panel |

## 📱 Mobile Usage

### Touch Gestures
- **Tap**: Select items and navigate
- **Scroll**: Browse through models
- **Pinch to zoom**: Adjust text size
- **Swipe**: Navigate between sections (if implemented)

### Mobile-Specific Features
- **Responsive grid**: Adapts to screen size
- **Touch-friendly buttons**: Minimum 44px touch targets
- **Optimized scrolling**: Smooth performance on mobile
- **Accessible navigation**: Works with mobile screen readers

### Mobile Tips
- **Use landscape mode** for better grid view
- **Filter panel** slides over content on mobile
- **Search is prominent** at the top for easy access
- **Cards stack vertically** on narrow screens

## 🔧 Advanced Features

### URL Sharing
- **Shareable links**: URLs include current filters and search
- **Bookmark support**: Save specific filter combinations
- **Back button**: Works with browser navigation
- **Deep linking**: Direct links to specific views

### Performance Features
- **Virtual scrolling**: Handles thousands of models smoothly
- **Lazy loading**: Components load as needed
- **Debounced search**: Optimized search performance
- **Caching**: Remembers data between sessions

### Accessibility Features
- **Screen reader support**: Full ARIA implementation
- **High contrast**: Respects system preferences
- **Keyboard navigation**: Complete keyboard accessibility
- **Focus indicators**: Clear focus visibility
- **Skip links**: Quick navigation for screen readers

## 🎨 Customization

### Browser Settings
- **Zoom level**: Use browser zoom for larger text
- **Dark mode**: Respects system dark mode preference
- **Reduced motion**: Honors accessibility preferences
- **Font size**: Respects browser font size settings

### Local Storage
The application remembers:
- **Filter preferences**: Your commonly used filters
- **Search history**: Recent searches (if implemented)
- **View preferences**: Grid density and layout options

## 🔍 Troubleshooting

### Common Issues

#### Search Not Working
- **Clear search**: Delete text and try again
- **Check spelling**: Verify search terms
- **Try partial matches**: Use shorter search terms
- **Refresh page**: Reload if search seems stuck

#### Filters Not Applying
- **Check selections**: Ensure filters are actually selected
- **Clear and reapply**: Clear all filters and try again
- **Refresh data**: Reload the page
- **Check combinations**: Some filter combinations may have no results

#### Performance Issues
- **Close other tabs**: Free up browser memory
- **Disable extensions**: Some extensions can slow performance
- **Try incognito mode**: Test without extensions
- **Update browser**: Ensure you're using a recent version

#### Mobile Issues
- **Rotate device**: Try landscape orientation
- **Zoom out**: Ensure you're not zoomed in too far
- **Clear cache**: Clear browser cache and reload
- **Try different browser**: Test with another mobile browser

### Getting Help
1. **Check browser console**: Press F12 and look for errors
2. **Try different browser**: Test in Chrome, Firefox, or Safari
3. **Clear cache**: Hard refresh with Ctrl+Shift+R
4. **Report issues**: Include browser version and error details

## 💡 Tips and Tricks

### Efficient Browsing
- **Use filters first**: Narrow down before searching
- **Combine search and filters**: Use both for precise results
- **Bookmark useful filters**: Save URLs with your preferred filters
- **Learn keyboard shortcuts**: Faster navigation with keys

### Finding the Right Model
- **Start with architecture**: Choose LLaMA, Mistral, etc.
- **Consider size**: Balance quality vs. resource requirements
- **Check quantization**: Q4 for efficiency, Q8 for quality
- **Look at popularity**: Download counts indicate quality

### Performance Tips
- **Use specific searches**: Avoid very broad search terms
- **Clear unused filters**: Remove filters you're not using
- **Scroll gradually**: Let virtual scrolling work efficiently
- **Close filter panel**: When not needed to save screen space

---

**Happy model browsing! 🧠✨**