# Simplified GGUF Fetcher - Optimized Version

## Overview

This fetcher script is optimized to fetch **recently added GGUF models** from Hugging Face with **ONE API call**, then filter locally to generate `gguf_models.json`.

## Key Optimization

### Before
- Made API calls for every model to get file information
- Slow and rate-limited

### After
- **Single API call** with `full=True` parameter
- Gets ALL data (metadata, files, license) in one request
- Focuses on **recently added models** (sorted by `createdAt`)
- Local filtering from cached raw data

## Two-Phase Architecture

### Phase 1: Download (ONE API Call)
```bash
python simplified_gguf_fetcher.py download
```

**What it does:**
- Fetches recently added models (last 90 days by default)
- Sorted by creation date (newest first)
- Uses `full=True` to get all data in one API request
- Saves raw data to `data/raw_models_data.json`
- **No per-model API calls**

**Output:** `data/raw_models_data.json`

### Phase 2: Process (Local Filtering)
```bash
python simplified_gguf_fetcher.py process
```

**What it does:**
- Loads raw data from local file (no API calls)
- Filters models with 10+ likes
- Extracts GGUF files and metadata
- Applies spam filtering
- Calculates hardware requirements
- Deduplicates across repos
- Generates final output

**Output:** `gguf_models.json`

## Usage Examples

### Full Workflow (Download + Process)
```bash
# Fetch recently added models and generate gguf_models.json
python simplified_gguf_fetcher.py
```

### Separate Phases
```bash
# Download only (fetch recent models)
python simplified_gguf_fetcher.py download

# Process only (filter to gguf_models.json)
python simplified_gguf_fetcher.py process
```

### Incremental Mode (Last 7 Days)
```bash
# Fetch only models from last 7 days and merge with existing
python simplified_gguf_fetcher.py --incremental
```

### Dry Run (Preview)
```bash
# See what would happen without writing files
python simplified_gguf_fetcher.py --dry-run
```

### Custom Settings
```bash
# Custom likes threshold
python simplified_gguf_fetcher.py --min-likes 20

# Disable spam filtering
python simplified_gguf_fetcher.py --disable-spam-filter

# Verbose logging
python simplified_gguf_fetcher.py --verbose
```

## Configuration

### Default Settings
- **Recent days limit:** 30 days (full mode) - *optimized for <20MB*
- **Incremental days:** 7 days (incremental mode)
- **Model limit:** 500 models max (full mode), 200 (incremental)
- **Min likes threshold:** 10
- **Max raw data size:** 18MB (stops before GitHub 20MB limit)
- **Sort order:** createdAt (newest first)

### Custom Configuration
Create a `config.json` file:
```json
{
  "recent_days_limit": 30,
  "api_limit": 500,
  "max_raw_data_size_mb": 18,
  "min_likes_threshold": 15,
  "max_workers": 10,
  "output_dir": ".",
  "data_dir": "data"
}
```

Run with config:
```bash
python simplified_gguf_fetcher.py --config-file config.json
```

**Note:** Keep `recent_days_limit` and `api_limit` low to stay under GitHub's 20MB file size limit for `raw_models_data.json`.

## Output Files

### `data/raw_models_data.json`
Raw model data from Hugging Face API including:
- Model ID, downloads, likes, tags
- File list (siblings) with sizes
- Card data (license, description)
- Creation and modification dates

### `gguf_models.json`
Filtered and processed models with:
- Model name, quantization format
- File size (bytes and formatted)
- Model type and capability
- License information
- Download/like counts
- Hardware requirements
- Direct download links

### `data/metadata.json`
Execution metadata:
- Last run timestamp
- Mode (full/incremental)
- Statistics (models fetched/processed, API calls)
- Configuration used

## Why This Optimization Matters

### Performance Gains
- **Before:** 1000 models = 1000+ API calls (slow, rate-limited)
- **After:** 500 models = 1 API call (fast, efficient)

### Recently Added Focus
- Uses `sort="createdAt"` to get newest models first
- Stops when reaching date cutoff or size limit
- Perfect for keeping your model database up-to-date

### GitHub Size Limit
- **Stops before 18MB** to stay under GitHub's 20MB limit
- Focuses on **last 30 days** by default (adjustable)
- Incremental mode for daily updates (last 7 days)
- Raw data file safe for Git commits

### Local Filtering
- Process phase runs entirely from local data
- No API calls = fast iteration
- Can reprocess with different filters without re-downloading

## Requirements

```bash
pip install huggingface_hub tqdm
```

## Troubleshooting

### No raw data found
```bash
# Run download phase first
python simplified_gguf_fetcher.py download
```

### API rate limiting
- Script includes automatic rate limiting (5 calls/sec)
- Retry logic with exponential backoff
- Use `--incremental` for smaller updates

### Memory issues with large datasets
- Script includes memory warnings
- **File size limit:** Stops at ~18MB to stay under GitHub's 20MB limit
- Use `--incremental` mode for smaller batches
- Adjust `recent_days_limit` in config (lower = smaller file)
- Consider using `.gitignore` for `data/raw_models_data.json` if still too large

## API Call Summary

| Phase | API Calls | Description |
|-------|-----------|-------------|
| Download | 1 | Single paginated request with `full=True` |
| Process | 0 | All filtering done locally |
| **Total** | **1** | **Maximum efficiency** |

## Related Files

- `simplified_gguf_fetcher.py` - Main script
- `spam_filter/` - Spam filtering components
- `gguf_models.json` - Final output
- `data/raw_models_data.json` - Cached raw data
- `data/metadata.json` - Run statistics
