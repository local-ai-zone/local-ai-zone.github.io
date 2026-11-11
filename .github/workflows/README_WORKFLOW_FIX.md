# GitHub Action Workflow Fix

## Problem
The daily update workflow was failing with this error:
```
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
```

## Root Cause
The workflow was trying to pull from remote AFTER the script had already modified `gguf_models.json` and `data/raw_models_data.json`, causing Git to complain about unstaged changes that would be overwritten.

## Solution Implemented

### 1. Pull BEFORE Running Script
```yaml
- name: Pull latest changes before processing
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git pull --rebase origin main || git pull origin main
```

This ensures the repository is up-to-date before generating any files.

### 2. Improved Push Logic with Retry
```yaml
- name: Commit and push changes
  run: |
    # Add files first
    git add gguf_models.json data/raw_models_data.json
    
    # Commit
    git commit -m "$COMMIT_MSG" || {
      echo "Nothing to commit"
      exit 0
    }
    
    # Push with automatic retry if remote has new changes
    git push origin main || {
      echo "Push failed, pulling latest changes and retrying..."
      git pull --rebase origin main
      git push origin main
    }
```

If the push fails (e.g., someone else pushed in the meantime), it automatically:
1. Pulls the latest changes with rebase
2. Retries the push

## Benefits

✅ **No more conflicts** - Pull happens before file modifications  
✅ **Automatic retry** - Handles race conditions if multiple workflows run  
✅ **Clean commits** - Rebase keeps history linear  
✅ **Fail-safe** - Gracefully exits if nothing to commit  

## Workflow Execution Order

```
1. Checkout repository (fetch-depth: 0)
2. Pull latest changes ← NEW: Prevents conflicts
3. Set up Python
4. Install dependencies
5. Run GGUF fetcher (download + process)
6. Verify data integrity
7. Check for changes
8. Commit changes ← IMPROVED: Smart push retry
9. Push to main
```

## Testing

To test the workflow manually:
```bash
# In GitHub UI, go to:
# Actions → Daily GGUF Model Data Update → Run workflow
```

Or trigger via schedule (runs daily at 23:59 UTC).

## Related Files
- `.github/workflows/daily-update.yml` - Main workflow file
- `scripts/simplified_gguf_fetcher.py` - Data fetcher script
- `gguf_models.json` - Output file (processed models)
- `data/raw_models_data.json` - Raw data cache
