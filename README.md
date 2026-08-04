# GGUF Model Discovery

A professional web application for discovering and browsing GGUF (GPT-Generated Unified Format) machine learning models. Browse thousands of quantized AI models with detailed metadata, engagement metrics, and direct download links.

Live site: [https://local-ai-zone.github.io](https://local-ai-zone.github.io)

## 🚀 Features

### Core Functionality
- **Model Discovery**: Browse 16,000+ GGUF format AI models with detailed metadata
- **Advanced Search**: Real-time search across model names, quant formats, types, and licenses
- **Smart Filtering**: Filter by quantization type, model capability, and license
- **Model Capabilities**: Automatic classification (Text, Vision, Code, Audio)
- **Engagement Metrics**: Like counts, download statistics, and popularity indicators
- **Pre-rendered Model Pages**: 1,000+ static pages at `/models/{slug}.html` for SEO (regenerated nightly for the top ~1,300 models by likes)
- **Responsive Design**: Mobile-first interface with dark mode support

### Technical Features
- **Automated Data Pipeline**: Daily GitHub Actions workflow fetches from Hugging Face
- **SEO Automation**: Daily sitemap, robots.txt, and metadata generation
- **Spam Filtering**: Deduplication and quality filtering of model entries
- **Hardware Calculator**: Estimates RAM/CPU/GPU requirements from quantization
- **Slug Unification**: Single canonical slug function shared by page generation and sitemap

## 🏗️ Architecture

### Frontend Structure
```
├── index.html              # Main application entry point
├── css/
│   ├── premium-styles.css  # Main premium styling
│   ├── theme.css           # Dark/light theming
│   └── contact-form.css    # Contact form styles
├── js/
│   ├── premium-app.js      # Main application controller
│   ├── theme-switcher.js   # Theme toggling
│   ├── components/         # Reusable UI components
│   │   └── contact-form.js
│   └── utils/              # Helper functions
│       ├── formatters.js
│       ├── helpers.js
│       └── notifications.js
├── blog/                   # Blog posts
├── models/                 # Pre-rendered model pages (generated)
└── scripts/                # Build, fetch, and automation scripts
```

### Automation Scripts (`scripts/`)
| Script | Purpose |
| --- | --- |
| `daily_gguf_fetcher.py` | **Production fetcher** — fetches, filters, merges, outputs `gguf_models.json` |
| `simplified_gguf_fetcher.py` | Legacy two-phase fetcher (download → process) |
| `generate-minimal-pages.js` | Generates pre-rendered pages in `models/` |
| `generate-seo.js` | Generates `sitemap.xml`, `robots.txt`, `seo-metadata.json` |
| `slug-utils.js` | Shared `createSlug()` used by both generators |
| `generate-banner.js` / `create-fallback-banner.js` | Social banner generation |
| `start-local-server.js` | Local static server |

### Data Flow
1. **Fetching**: `daily_gguf_fetcher.py` fetches GGUF models from the Hugging Face API
2. **Processing**: Models are filtered, deduplicated, and enriched with hardware requirements
3. **Merging**: Incremental mode merges with existing `gguf_models.json` data
4. **Storage**: `gguf_models.json` at the repository root
5. **Rendering**: `premium-app.js` renders the frontend from the JSON
6. **Pre-rendering**: `generate-minimal-pages.js` creates static pages for top models
7. **SEO**: `generate-seo.js` builds the sitemap from the same slugs

## 🔄 GitHub Actions Workflows

| Workflow | Schedule | Purpose |
| --- | --- | --- |
| **Daily GGUF Model Data Update** | 23:59 UTC | Runs the fetcher, commits `gguf_models.json` (model-count floor guard prevents catalog-collapse regressions) |
| **Pre-render Model Pages** | 02:00 UTC | Regenerates static pages in `models/` |
| **SEO Optimization** | 03:00 UTC | Regenerates `sitemap.xml` and metadata |

**Note**: The Node-based workflows (`Pre-render`, `SEO`) run scripts that import only Node built-ins and local modules — they no longer install any npm packages (no `npm ci`, no Puppeteer). Only the Python dependency (`huggingface_hub`, `tqdm`) is installed in the daily update workflow.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git

### Quick Start
```bash
# Clone the repository
git clone https://github.com/local-ai-zone/local-ai-zone.github.io.git
cd local-ai-zone.github.io

# Install Python dependencies
pip install -r scripts/requirements.txt

# Start local development server
npm run start-local-server
# or: python -m http.server 8000
```

## 📊 Data Pipeline

### Running the fetcher manually
```bash
# Incremental merge (safe — preserves existing data):
python scripts/daily_gguf_fetcher.py --incremental --min-likes 1 --max-models 2000

# With Hugging Face token (recommended for rate limits):
python scripts/daily_gguf_fetcher.py --incremental --min-likes 1 --max-models 2000 --token $HF_TOKEN

# Full replace mode (no merge):
python scripts/daily_gguf_fetcher.py --min-likes 1 --max-models 2000
```

### Fetcher options
| Flag | Default | Description |
| --- | --- | --- |
| `--incremental` | off | Merge with existing `gguf_models.json` instead of replacing |
| `--min-likes` | 1 | Minimum likes threshold |
| `--max-models` | 10000 | Maximum models to fetch |
| `--token` | — | Hugging Face API token |
| `--output` | `gguf_models.json` | Output file path |

### Regenerating pre-rendered pages and sitemap
```bash
# Generate static model pages:
node scripts/generate-minimal-pages.js

# Regenerate sitemap.xml, robots.txt, seo-metadata.json:
node scripts/generate-seo.js
```

### Model Data Structure
```json
{
  "modelName": "string",
  "modelType": "string",
  "modelCapability": "text|vision|code|audio",
  "quantFormat": "string",
  "fileSize": "number",
  "fileSizeFormatted": "string",
  "downloadCount": "number",
  "likeCount": "number",
  "license": "string",
  "huggingFaceLink": "string",
  "directDownloadLink": "string",
  "modelId": "string",
  "filename": "string",
  "minRamGB": "number",
  "minCpuCores": "number",
  "gpuRequired": "boolean",
  "osSupported": ["string"],
  "uploadDate": "string"
}
```

### Current Model Distribution (16,771 models)
- **Text**: 81.7% (13,705 models)
- **Vision**: 9.8% (1,644 models)
- **Code**: 7.5% (1,257 models)
- **Audio**: 1.0% (165 models)

## 🧠 Model Capability Detection

The pipeline automatically classifies models by analyzing model IDs and Hugging Face tags:
- **Vision**: `vision`, `vl`, `visual`, `image`, `multimodal`, `llava`
- **Code**: `code`, `coder`, `coding`, `codellama`, `starcoder`
- **Audio**: `audio`, `speech`, `whisper`, `tts`
- **Text**: Default classification

## 🔧 Configuration

### Environment Variables
```bash
# Hugging Face API token for authenticated requests (recommended)
HF_TOKEN=your_token_here
```

### npm Scripts
```bash
npm run update-banner          # Generate + validate social banners
npm run build:css              # Minify CSS
npm run start-local-server     # Serve the site locally
npm test                       # Run the full regression suite (Node + Python)
```

## 🧪 Testing

Regression tests guard the two production-bug classes found in 2026-08:
slug drift between the page generator and the sitemap, and the incremental
merge silently collapsing the model catalog.

```bash
npm test                  # Full suite: Node slug-parity + Python fetcher tests
npm run test:slug         # Node only — slug parity, generator parity, zero-orphan checks
npm run test:fetcher      # Python only — merge key, size estimator, clamp/backfill
```

- **`tests/slug-parity.test.js`** — `createSlug` edge cases, verifies both
  generators use the shared `slug-utils` module, and validates against the real
  `gguf_models.json` + `sitemap.xml` that every pre-rendered page is linked and
  every sitemap URL exists (zero orphans both directions).
- **`tests/test_fetcher.py`** — unit tests for `_merge_key` (legacy entries never
  collapse), `_estimate_file_size` (timestamps not misread as billions of
  params), and `_save_output` (bogus sizes clamped, `modelId`/`filename`
  backfilled).
- **`tests/run_all.py`** — Python-side runner used by `npm test`.

Requires Python 3.11+ with `scripts/requirements.txt` installed. The Node tests
use Node's built-in `node:test` runner — no extra npm packages needed.

## 🚀 Deployment

The site is deployed automatically on GitHub Pages:
1. **Daily update** workflow fetches new model data and commits `gguf_models.json`
2. **Pre-render** workflow regenerates static model pages
3. **SEO** workflow regenerates the sitemap
4. Each workflow triggers a Pages rebuild when changes are committed

Manual deployment: push to `main` — GitHub Actions handles the rest.

## 🔒 Security & Privacy

- **No user data collection**: The site is fully static
- **External links**: All model files are hosted on Hugging Face — this site links, never hosts
- **Open source**: Fully auditable code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Test thoroughly — run `npm test` before pushing
4. Push and open a Pull Request

## 📝 License

See the [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- **Hugging Face**: For providing the model data and API
- **GGUF Community**: For inspiration and support

---

**Disclaimer**: This project is not affiliated with Hugging Face. All links point to publicly available models hosted by their respective creators. We do not store or redistribute any model files directly.
