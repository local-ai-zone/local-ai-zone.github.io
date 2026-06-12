# Quick Start Guide - GGUF Fetcher

## TL;DR

```bash
# Fetch recently added models and generate gguf_models.json (ONE API call)
# Default: last 30 days, ~500 models, <18MB raw data (GitHub safe)
python simplified_gguf_fetcher.py
```

That's it! The script will:
1. **Download:** Fetch recently added GGUF models (last 30 days) with ONE API call
2. **Process:** Filter locally to generate `gguf_models.json`

**GitHub Size Limit:** Raw data automatically kept under 20MB for Git commits.

## What Makes This Fast?

### Single API Call Strategy
```python
# ONE API call with full=True gets everything:
models = api.list_models(
    filter="gguf",
    sort="createdAt",      # Newest models first
    direction=-1,          # Descending order
    full=True,             # Include ALL data (files, license, etc.)
)
```

**Result:** No per-model API calls needed! Everything comes from the listing endpoint.

## Common Use Cases

### Daily Update (Incremental Mode)
```bash
# Fetch only last 7 days and merge with existing
python simplified_gguf_fetcher.py --incremental
```

**Perfect for:**
- Daily cron jobs
- Keeping your model database fresh
- Minimal API usage

### Full Refresh
```bash
# Fetch last 30 days of models (~500 models, <18MB)
python simplified_gguf_fetcher.py
```

**Perfect for:**
- Initial setup
- Weekly refresh
- Rebuilding from scratch
- **Stays under GitHub's 20MB limit**

### Preview Changes
```bash
# See what would be fetched without writing files
python simplified_gguf_fetcher.py --dry-run
```

### Custom Filters
```bash
# Only models with 20+ likes
python simplified_gguf_fetcher.py --min-likes 20

# Disable spam filtering
python simplified_gguf_fetcher.py --disable-spam-filter
```

## Workflow Separation

### Download Phase Only
```bash
# Just fetch and cache raw data
python simplified_gguf_fetcher.py download
```

**Use when:**
- You want to cache data for later processing
- Testing API connectivity
- Separating data collection from processing

### Process Phase Only
```bash
# Just filter cached data to gguf_models.json
python simplified_gguf_fetcher.py process
```

**Use when:**
- Raw data already downloaded
- Tweaking filters or processing logic
- No API calls needed!

## Output Files

```
scripts/
├── simplified_gguf_fetcher.py    # Main script
├── gguf_models.json               # Final output (filtered models)
└── data/
    ├── raw_models_data.json       # Cached raw data from API
    └── metadata.json              # Run statistics
```

## How It's Optimized

### Traditional Approach ❌
```
1. Fetch model list → 1 API call
2. For each model:
   - Fetch file list → 1 API call
   - Fetch metadata → 1 API call
Total: 1 + (N × 2) API calls = SLOW
Result: Large files (>50MB) that break GitHub
```

### Our Approach ✅
```
1. Fetch model list with full=True → 1 API call
   (includes files, metadata, everything)
   - Limited to last 30 days (~500 models)
   - Stops at 18MB to stay under GitHub 20MB limit
2. Filter locally from cached data → 0 API calls
Total: 1 API call = FAST
Result: <18MB raw data (GitHub safe) + filtered gguf_models.json
```

## Automation Example

### Daily Cron Job
```bash
#!/bin/bash
# Add to crontab: 0 2 * * * /path/to/daily_update.sh

cd /path/to/scripts
python simplified_gguf_fetcher.py --incremental
echo "Updated $(date)" >> update.log
```

### Weekly Full Refresh
```bash
#!/bin/bash
# Add to crontab: 0 3 * * 0 /path/to/weekly_update.sh

cd /path/to/scripts
python simplified_gguf_fetcher.py
echo "Full refresh $(date)" >> refresh.log
```

## Troubleshooting

### "No raw data found"
```bash
# Run download first
python simplified_gguf_fetcher.py download
```

### Rate limiting errors
```bash
# Use incremental mode for smaller batches
python simplified_gguf_fetcher.py --incremental
```

### Empty gguf_models.json
```bash
# Check logs and try lowering likes threshold
python simplified_gguf_fetcher.py --min-likes 5 --verbose
```

### Raw data file too large (>20MB)
```bash
# Use incremental mode for smaller updates
python simplified_gguf_fetcher.py --incremental

# Or reduce the time window (edit config)
# Set recent_days_limit to 14 or 21 days
```

## Performance Stats

| Scenario | Models | API Calls | Time | Raw Data Size |
|----------|--------|-----------|------|---------------|
| Full mode (30 days) | ~500 | 1 | ~15s | ~15-18MB |
| Incremental (7 days) | ~100 | 1 | ~5s | ~3-5MB |
| Process only | Any | 0 | ~2s | N/A |

**Note:** Raw data file kept under 20MB for GitHub compatibility.

## Need Help?

Run with verbose logging:
```bash
python simplified_gguf_fetcher.py --verbose
```

Or dry run to preview:
```bash
python simplified_gguf_fetcher.py --dry-run --verbose
```

## Key Benefits

✅ **Single API call** - No rate limiting issues  
✅ **Recently added focus** - Get newest models first  
✅ **Local filtering** - Fast reprocessing  
✅ **Incremental updates** - Efficient daily updates  
✅ **Spam filtering** - Quality control built-in  
✅ **Hardware calculation** - RAM/CPU requirements included  
✅ **Deduplication** - No duplicate models across repos  

---

**Questions?** Check `README_FETCHER.md` for detailed documentation.
