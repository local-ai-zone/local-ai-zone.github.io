# GGUF Model Discovery Website

A fast, SEO-optimized static website for discovering and accessing GGUF models from Hugging Face. The system automatically fetches fresh model data every 24 hours and serves it from static JSON files for optimal performance and search engine visibility.

## 🚀 Features

- **Fast Model Discovery**: Search and filter thousands of GGUF models instantly
- **Automated Updates**: Daily data refresh from Hugging Face at 23:59 UTC
- **SEO Optimized**: Individual model pages with structured data and meta tags
- **GitHub Pages Ready**: Optimized for static hosting with CDN delivery
- **Mobile Responsive**: Works perfectly on all devices
- **Accessibility Compliant**: WCAG 2.1 AA standards with keyboard navigation
- **Performance Optimized**: Virtual scrolling, lazy loading, and caching

## 📋 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for data pipeline)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gguf-model-discovery.git
   cd gguf-model-discovery
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r scripts/requirements.txt
   ```

3. **Run initial data fetch**
   ```bash
   python scripts/update_models.py
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  GitHub Actions │────│  Hugging Face    │────│  Static JSON    │
│  (Data Fetcher) │    │  API             │    │  Files          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  GitHub Pages   │────│  Frontend App    │────│  Search Engine  │
│  (Static Host)  │    │  (Vanilla JS)    │    │  Optimization   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
- **Daily Updates**: GitHub Actions runs at 23:59 UTC to fetch fresh data
- **Static Generation**: Processes and optimizes data into JSON files
- **Fast Delivery**: GitHub Pages CDN serves static files globally
- **Real-time Search**: Client-side search engine for instant results

## 📁 Project Structure

```
├── components/           # UI components
│   ├── ModelCard.js     # Individual model cards
│   ├── ModelGrid.js     # Grid layout with virtual scrolling
│   ├── FilterPanel.js   # Search and filter interface
│   └── Header.js        # Site header and navigation
├── services/            # Business logic
│   ├── DataService.js   # Data loading and caching
│   ├── SearchEngine.js  # Search and filtering
│   └── FilterService.js # Filter management
├── utils/               # Utility functions
│   ├── performance.js   # Performance monitoring
│   ├── errorHandler.js  # Error handling
│   └── seoManager.js    # SEO optimization
├── scripts/             # Data pipeline
│   ├── update_models.py # Main data fetcher
│   └── test_pipeline.py # Pipeline testing
├── .github/workflows/   # GitHub Actions
│   ├── update-gguf-models.yml
│   └── deploy-pages.yml
├── data/               # Generated data files
├── dist/               # Build output
└── tests/              # Test suites
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file for local development:

```env
# Hugging Face API (optional - for higher rate limits)
HUGGING_FACE_TOKEN=your_token_here

# Analytics (optional)
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
```

### GitHub Repository Settings

1. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Custom domain (optional): your-domain.com

2. **Set Repository Secrets**
   ```
   HUGGING_FACE_TOKEN=your_token_here
   ```

3. **Configure Branch Protection**
   - Require status checks for main branch
   - Enable automatic security updates

## 🚀 Deployment

### Automatic Deployment

The site automatically deploys when you push to the main branch:

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Update site content"
   git push origin main
   ```

2. **Monitor deployment**
   - Check GitHub Actions tab for build status
   - Site updates within 2-3 minutes

### Manual Deployment

For immediate deployment:

```bash
# Build the site
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## 📊 Data Pipeline

### Automated Updates

The data pipeline runs daily at 23:59 UTC:

1. **Fetches** latest GGUF models from Hugging Face
2. **Processes** model metadata and file information
3. **Generates** optimized JSON files and search indices
4. **Updates** sitemap and SEO files
5. **Commits** changes and triggers deployment

### Manual Data Update

To update data immediately:

```bash
python scripts/update_models.py
```

### Pipeline Monitoring

Monitor pipeline health:

```bash
python scripts/test_pipeline.py
```

## 🔍 Search and Filtering

### Search Features

- **Real-time search** as you type
- **Fuzzy matching** for typos and partial matches
- **Multi-field search** across model names, organizations, and descriptions
- **Search highlighting** in results
- **Bookmarkable URLs** for search results

### Filter Options

- **Architecture**: Llama, Mistral, Phi, Gemma, etc.
- **Quantization**: Q4_K_M, Q8_0, F16, etc.
- **Model Size**: Small (≤2 files), Medium (3-4), Large (>4)
- **Organization**: Filter by model publisher
- **Download Count**: Sort by popularity

## 🎨 Customization

### Styling

The site uses Tailwind CSS for styling. Customize in:

- `styles/main.css` - Main stylesheet
- `tailwind.config.js` - Tailwind configuration
- `components/*.js` - Component-specific styles

### Search Algorithm

Modify search behavior in `services/SearchEngine.js`:

```javascript
// Adjust search weights
const searchWeights = {
  modelName: 3.0,
  organization: 2.0,
  description: 1.0,
  tags: 1.5
};
```

### Performance Settings

Configure performance features in `utils/performance.js`:

```javascript
// Virtual scrolling threshold
const VIRTUAL_SCROLL_THRESHOLD = 100;

// Lazy loading settings
const LAZY_LOAD_MARGIN = '50px';
```

## 📈 Analytics and Monitoring

### Performance Monitoring

Built-in performance monitoring tracks:

- Page load times
- Search performance
- Memory usage
- User interactions

Access metrics via browser console:
```javascript
window.performanceMonitor.getStats()
```

### Error Tracking

Automatic error tracking captures:

- JavaScript errors
- Network failures
- Search issues
- Performance problems

### SEO Monitoring

Track SEO performance:

- Google Search Console integration
- Structured data validation
- Meta tag optimization
- Sitemap submission

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Full workflow testing
- **E2E Tests**: User journey testing
- **Performance Tests**: Load and speed testing

### Test Coverage

```bash
npm run test:coverage
```

## 🔒 Security

### Security Features

- **Content Security Policy** (CSP) headers
- **Input sanitization** for search queries
- **XSS prevention** in model data display
- **HTTPS enforcement** for all external resources
- **No sensitive data** in client-side code

### Security Monitoring

Regular security checks:

```bash
npm audit
python -m pip check
```

## 🐛 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Data Pipeline Issues**
```bash
# Test pipeline health
python scripts/test_pipeline.py

# Check GitHub Actions logs
# Go to Actions tab in GitHub repository
```

**Search Not Working**
```bash
# Verify data files exist
ls -la gguf_models*.json

# Check browser console for errors
# Open DevTools → Console
```

**Performance Issues**
```bash
# Run performance audit
npm run test:performance

# Check memory usage
# Open DevTools → Performance tab
```

### Getting Help

1. **Check the logs**: Browser console and GitHub Actions
2. **Review documentation**: All features are documented
3. **Search issues**: Check existing GitHub issues
4. **Create issue**: Provide detailed error information

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- **JavaScript**: ES6+ with JSDoc comments
- **Python**: PEP 8 with type hints
- **CSS**: Tailwind utility classes
- **Testing**: Comprehensive test coverage

### Pull Request Process

1. Update documentation for new features
2. Add tests for bug fixes
3. Ensure CI passes
4. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** for providing the model data API
- **GitHub Pages** for free static hosting
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the fast build system

## 📞 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/gguf-model-discovery/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gguf-model-discovery/discussions)

---

**Made with ❤️ for the AI community**