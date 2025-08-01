# Design Document

## Overview

Modify the `_fetch_top_models` method to fetch the top 50 most liked GGUF models instead of the top 20 most downloaded models.

## Architecture

Simple change to the existing `_fetch_top_models` method in the SimplifiedGGUFetcher class. No other components are affected.

## Components and Interfaces

### Changes to `_fetch_top_models` Method

**Current API Call:**
```python
models = list(self.api.list_models(
    filter="gguf",
    sort="downloads",
    direction=-1,
    limit=20
))
```

**New API Call:**
```python
models = list(self.api.list_models(
    filter="gguf",
    sort="likes",        # Changed from "downloads"
    direction=-1,
    limit=50            # Changed from 20
))
```

**Logging Changes:**
- Update method docstring: "Fetch top 50 most liked GGUF models"
- Update log message: "Fetching top 50 most liked GGUF models of all time..."
- Update statistics logging: "Highest like count" instead of "Highest download count"

## Data Models

No changes - method returns the same List[Dict] structure.

## Error Handling

Existing error handling is preserved - same try/catch pattern and fallback behavior.

## Testing Strategy

Update existing tests to verify:
1. API called with `sort="likes"` and `limit=50`
2. Log messages updated correctly
3. Method still handles errors properly