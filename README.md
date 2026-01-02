# GGUF Model Discovery

A professional, premium web application for discovering and browsing GGUF (GPT-Generated Unified Format) machine learning models. This platform provides an elegant interface to explore thousands of quantized AI models with detailed information, engagement metrics, and direct download links.

## 📋 Recent Updates

### v2.0 - Model Capability Detection System
- **Intelligent Capability Detection**: Automatic classification of models into 5 categories (Text, Vision, Code, Embedding, Audio)
- **Enhanced Filtering**: Replaced model type filter with capability-based filtering for better model discovery
- **Improved Data Pipeline**: Two-phase processing system with capability detection and spam filtering
- **Better Model Cards**: Display model capabilities with color-coded badges for quick identification
- **Static Page Generation**: Pre-rendered model pages with capability information for improved SEO
- **Optimized Storage**: Removed backup files to reduce storage overhead

## 🚀 Features

### Core Functionality
- **Model Discovery**: Browse 4,000+ GGUF format AI models with detailed metadata
- **Advanced Search**: Real-time search with fuzzy matching across model names and descriptions
- **Smart Filtering**: Filter by quantization type, model capability, and license
- **Model Capabilities**: Automatic detection of model types (Text, Vision, Code, Embedding, Audio)
- **Engagement Metrics**: Like counts, download statistics, and popularity indicators
- **Responsive Design**: Premium mobile-first responsive interface
- **Performance Optimized**: Fast loading with efficient data handling and lazy loading

### Premium UI/UX
- **Professional Design**: Business-class styling with premium aesthetics
- **Interactive Elements**: Smooth animations and hover effects
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Dark Mode**: Automatic dark mode support based on user preferences
- **Mobile Optimized**: Collapsible header and mobile-friendly interactions

### Technical Features
- **SEO Optimized**: Structured data, meta tags, and prerendering support
- **Automated Data Pipeline**: Daily GitHub Actions workflow for model data updates
- **Capability Detection**: Intelligent model type classification (Vision, Embedding, Code, Audio, Text)
- **Spam Filtering**: Integrated filtering system to remove low-quality and duplicate models
- **Modular Architecture**: Component-based JavaScript architecture with service layer
- **Performance Monitoring**: Built-in analytics and performance tracking

## 🏗️ Architecture

### Frontend Structure
```
├── index.html              # Main application entry point
├── css/
│   ├── premium-styles.css  # Main premium styling
│   └── *.css              # Component-specific styles
├── js/
│   ├── premium-app.js     # Main application controller
│   ├── components/        # Reusable UI components
│   ├── services/          # Data and business logic services
│   ├── state/            # Application state management
│   └── utils/            # Utility functions and helpers
└── scripts/              # Build and automation scripts
```

### Data Flow
1. **Data Fetching**: Python scripts fetch model data from Hugging Face
2. **Processing**: Data is processed and enriched with engagement metrics
3. **Storage**: JSON files store processed model information
4. **Rendering**: JavaScript dynamically renders the UI
5. **Interaction**: User interactions update filters and views

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- Git

### Quick Start
```bash
# Clone the repository
git clone https://github.com/local-ai-zone/local-ai-zone.github.io.git
cd gguf-model-discovery

# Install Python dependencies
pip install -r scripts/requirements.txt

# Start local development server
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Development Setup
```bash
# Install development dependencies
npm install

# Run data fetching script
python scripts/simplified_gguf_fetcher.py

# Start development server with live reload
npm run dev
```

## 📊 Data Management

### Model Data Structure
```json
{
  "modelName": "string",
  "modelType": "string",
  "modelCapability": "text|vision|code|embedding|audio",
  "quantFormat": "string",
  "fileSize": "number",
  "fileSizeFormatted": "string",
  "downloadCount": "number",
  "likeCount": "number",
  "license": "string",
  "huggingFaceLink": "string",
  "directDownloadLink": "string",
  "minRamGB": "number",
  "minCpuCores": "number",
  "gpuRequired": "boolean",
  "osSupported": ["string"],
  "uploadDate": "string"
}
```

### Model Capability Types
- **Text**: General-purpose language models and chat models (70.4%)
- **Vision**: Multimodal models with image understanding capabilities (21.2%)
- **Code**: Specialized models for code generation and programming tasks (7.1%)
- **Audio**: Speech recognition, text-to-speech, and audio processing models (0.8%)
- **Embedding**: Models for generating text embeddings and semantic search (0.5%)

### Data Sources
- **Primary**: Hugging Face Hub API with authenticated requests
- **Processing**: Two-phase pipeline (download → process)
- **Enrichment**: Capability detection, spam filtering, and hardware requirements calculation
- **Updates**: Automated daily refresh via GitHub Actions with retry logic

## 🎨 Styling & Theming

### Design System
- **Color Palette**: Professional blue and neutral tones
- **Typography**: Inter font family for modern readability
- **Spacing**: Consistent 8px grid system
- **Components**: Reusable design tokens and components

### CSS Architecture
- **CSS Variables**: Centralized theming system
- **BEM Methodology**: Block-Element-Modifier naming convention
- **Responsive Design**: Mobile-first approach with breakpoints
- **Performance**: Optimized CSS with minimal unused styles

## 🧠 Model Capability Detection

### How It Works
The application automatically detects model capabilities by analyzing:
- Model names and identifiers
- Hugging Face tags and metadata
- Known model architecture patterns

### Detection Patterns
- **Vision**: Detects models with "vision", "vl", "image", "llava", "cogvlm", "qwen-vl", "internvl", etc.
- **Embedding**: Identifies "embed", "bge-", "e5-", "gte-", "sentence-", "all-minilm", etc.
- **Code**: Recognizes "code", "coder", "codellama", "starcoder", "deepseek-coder", etc.
- **Audio**: Detects "whisper", "audio", "speech", "tts", "voice", "wav2vec", etc.
- **Text**: Default classification for general-purpose language models

### Current Distribution
- Text: 70.4% (3,088 models)
- Vision: 21.2% (930 models)
- Code: 7.1% (311 models)
- Audio: 0.8% (37 models)
- Embedding: 0.5% (21 models)

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Hugging Face API token for authenticated requests
HF_TOKEN=your_token_here

# Optional: Analytics
ANALYTICS_ID=your_analytics_id
```

### Data Pipeline Configuration
The data fetcher supports several command-line options:

```bash
# Download phase only
python scripts/simplified_gguf_fetcher.py download --verbose --token $HF_TOKEN

# Process phase only
python scripts/simplified_gguf_fetcher.py process --verbose

# Disable spam filtering
python scripts/simplified_gguf_fetcher.py process --disable-spam-filter

# Full pipeline (download + process)
python scripts/simplified_gguf_fetcher.py --verbose --token $HF_TOKEN
```

### Build Configuration
- **Prerendering**: Static page generation for SEO
- **Minification**: CSS and JS optimization
- **Compression**: Gzip compression for assets

## 🚀 Deployment

### GitHub Pages (Recommended)
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Data Pipeline
The application uses a two-phase automated data pipeline:

**Phase 1 - Download**: 
- Fetches recent models (last 90 days) and top liked models from Hugging Face
- Deduplicates and saves raw data
- Includes retry logic with exponential backoff

**Phase 2 - Process**:
- Applies capability detection to classify models
- Filters spam and low-quality models
- Calculates hardware requirements
- Generates final output with 4,000+ curated models

### Manual Deployment
1. Build the project: `npm run build`
2. Upload `dist/` folder to your web server
3. Configure server for SPA routing (if needed)

## 🧪 Testing

### Test Structure
```
test-*.html           # Integration tests
verify-*.js          # Unit tests
*-test.html          # Component tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:engagement
npm run test:filters
npm run test:mobile
```

## 📈 Performance

### Optimization Features
- **Lazy Loading**: Images and components loaded on demand
- **Virtual Scrolling**: Efficient rendering of large model lists
- **Caching**: Intelligent caching of API responses
- **Compression**: Optimized asset delivery

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔒 Security & Privacy

### Security Measures
- **Content Security Policy**: Strict CSP headers
- **HTTPS Only**: Secure connections required
- **Input Sanitization**: XSS prevention
- **Rate Limiting**: API abuse prevention

### Privacy
- **No Personal Data**: No user data collection
- **External Links**: Clear disclaimer about third-party content
- **Transparency**: Open source and auditable code

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- **JavaScript**: ES6+ with modern syntax
- **CSS**: BEM methodology with CSS variables
- **HTML**: Semantic markup with accessibility
- **Testing**: Comprehensive test coverage

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face**: For providing the model data and API
- **GGUF Community**: For inspiration and support
- **Contributors**: For feedback and contributions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)  
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)  
- **Email**: support@gguf-discovery.com  

---

**Disclaimer**: This project is not affiliated with Hugging Face. All links point to publicly available models hosted by their respective creators. We do not store or redistribute any model files directly.
