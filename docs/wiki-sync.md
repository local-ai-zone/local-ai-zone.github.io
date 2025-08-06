# Wiki Synchronization

This project automatically synchronizes documentation files to the GitHub Wiki using GitHub Actions.

## How It Works

The wiki sync workflow (`sync-docs-to-wiki.yml`) automatically:

1. **Monitors Changes**: Triggers when documentation files are modified
2. **Processes Content**: Transforms relative links and adds metadata
3. **Updates Wiki**: Syncs content to corresponding wiki pages

## File Mappings

The following files are automatically synced to wiki pages:

| Source File | Wiki Page |
|-------------|-----------|
| `README.md` | `Home` |
| `docs/API.md` | `API-Documentation` |
| `docs/DEPLOYMENT.md` | `Deployment-Guide` |
| `docs/CONTRIBUTING.md` | `Contributing-Guide` |
| `docs/ARCHITECTURE.md` | `Architecture-Documentation` |

## Setup Requirements

### 1. Initialize the Wiki

Before the automatic sync can work, you need to manually initialize the GitHub Wiki:

1. Visit your repository's wiki: `https://github.com/owner/repo/wiki`
2. Click **"Create the first page"**
3. Add any content (it will be overwritten by the sync)
4. Save the page

### 2. Verify Permissions

The workflow requires `contents: write` permission to access the wiki repository. This is automatically configured in the workflow file.

## Manual Sync

You can manually trigger the wiki sync:

1. Go to **Actions** → **Sync Documentation to Wiki**
2. Click **"Run workflow"**
3. Optionally enable **"Force sync all documentation files"** to sync all files regardless of changes

## Content Processing

The sync process automatically:

- **Adds Headers**: Each wiki page includes source file information and last updated timestamp
- **Transforms Links**: Converts relative documentation links to wiki page links
- **Fixes Images**: Updates image URLs to use raw GitHub URLs
- **Preserves Formatting**: Maintains all markdown formatting and structure

## Rate Limiting

To prevent excessive API usage, the workflow includes:

- **1-hour cooldown** between automatic runs
- **Retry logic** for transient failures
- **Detailed logging** for troubleshooting

## Troubleshooting

### Wiki Not Initialized

**Error**: `Wiki repository not accessible`

**Solution**: 
1. Visit your repository's wiki
2. Create the first page manually
3. Re-run the workflow

### Permission Denied

**Error**: `403 Forbidden` or similar permission errors

**Solution**:
1. Ensure the repository has wiki enabled
2. Check that the workflow has `contents: write` permission
3. Verify the `GITHUB_TOKEN` has appropriate access

### Rate Limit Exceeded

**Error**: Rate limit messages in workflow logs

**Solution**:
- Wait for the cooldown period (1 hour)
- The workflow will automatically retry
- Use manual trigger sparingly

## Testing Locally

You can test the wiki sync functionality locally:

```bash
# Set environment variables
export GITHUB_TOKEN=your_github_token
export REPOSITORY=owner/repo
export CHANGED_FILES="README.md docs/API.md"

# Run the test script
node scripts/test-wiki-sync.js
```

## Monitoring

Check the workflow status:

1. Go to **Actions** tab in your repository
2. Look for **"Sync Documentation to Wiki"** workflows
3. Review logs and summaries for any issues

The workflow provides detailed summaries including:
- Files processed
- Success/failure status
- Links to updated wiki pages
- Troubleshooting guidance