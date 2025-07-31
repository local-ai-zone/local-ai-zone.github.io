# 🔍 Website Testing Guide

## How to Verify Your Website is Working with gguf_models.json

### Step 1: Start the Local Server
```bash
python -m http.server 8000
```
The server should show: `Serving HTTP on :: port 8000 (http://[::]:8000/) ...`

### Step 2: Open the Website
Open your browser and go to: **http://localhost:8000**

### Step 3: Verify Data Source (Browser Developer Tools)

1. **Open Developer Tools** (F12 or right-click → Inspect)
2. **Go to Network Tab**
3. **Refresh the page** (F5)
4. **Look for gguf_models.json** in the network requests
   - You should see a request to `gguf_models.json`
   - Status should be `200 OK`
   - Size should show the file size
   - Click on it to see the JSON data

### Step 4: Test Website Functionality

#### ✅ Models Display
- [ ] Models load and display in cards
- [ ] Model information shows correctly (name, type, size, etc.)
- [ ] No JavaScript errors in console

#### ✅ Search Functionality
- [ ] Type in the search box (e.g., "model", "f16", "bert")
- [ ] Results filter in real-time
- [ ] Search results are relevant

#### ✅ Filtering & Sorting
- [ ] Use filter dropdowns (if available)
- [ ] Try sorting options
- [ ] Pagination works (if you have many models)

#### ✅ No Hugging Face Dependencies
- [ ] No "View on Hugging Face" buttons (they should be commented out)
- [ ] No JavaScript errors related to URL parsing
- [ ] Search works without trying to extract from HF URLs

### Step 5: Browser Console Verification

Open the **Console tab** in Developer Tools and look for:

#### ✅ Expected Messages:
```
✅ Loaded models from workflow data
✅ Search index built successfully
✅ No errors or warnings
```

#### ❌ Should NOT see:
```
❌ Cannot read properties of undefined (reading 'split')
❌ Failed to extract organization
❌ Hugging Face URL parsing errors
```

### Step 6: Quick Browser Test

You can also run this in the browser console to verify data source:

```javascript
// Test 1: Check if gguf_models.json loads
fetch('./gguf_models.json')
  .then(r => r.json())
  .then(data => console.log(`✅ gguf_models.json loaded: ${data.length} models`))
  .catch(e => console.error('❌ Failed to load gguf_models.json:', e));

// Test 2: Check DataService (if available)
import('./services/DataService.js').then(module => {
  const dataService = new module.DataService();
  return dataService.loadModels();
}).then(models => {
  console.log(`✅ DataService loaded: ${models.length} models`);
}).catch(e => console.error('❌ DataService failed:', e));
```

### Step 7: Validation Test Page

Open: **http://localhost:8000/test_website_validation.html**

This page will run comprehensive tests and show you:
- ✅ Data source verification
- ✅ SearchEngine functionality
- ✅ Performance metrics
- ✅ Data structure validation
- ✅ Hugging Face dependency removal confirmation

### Expected Results

If everything is working correctly, you should see:

1. **Website loads successfully** at http://localhost:8000
2. **Models display** from gguf_models.json data
3. **Search works** without Hugging Face URL processing
4. **No JavaScript errors** in browser console
5. **Network tab shows** gguf_models.json being loaded
6. **Validation test page** shows all tests passing

### Troubleshooting

#### Problem: Website doesn't load
- ✅ Check if server is running on port 8000
- ✅ Try http://127.0.0.1:8000 instead
- ✅ Check for firewall blocking

#### Problem: No models display
- ✅ Check browser console for errors
- ✅ Verify gguf_models.json exists and is valid JSON
- ✅ Check Network tab for failed requests

#### Problem: Search doesn't work
- ✅ Check console for SearchEngine errors
- ✅ Verify no Hugging Face URL parsing errors
- ✅ Test with simple queries like "model"

#### Problem: JavaScript errors
- ✅ Check if all files are accessible
- ✅ Verify no syntax errors in modified files
- ✅ Check import/export statements

### Success Indicators

🎉 **Your website is working correctly if:**

- ✅ Models load from gguf_models.json (verified in Network tab)
- ✅ Search functionality works without errors
- ✅ No Hugging Face URL processing errors
- ✅ Performance is good (fast loading and searching)
- ✅ All validation tests pass
- ✅ Browser console shows no errors

### Data Flow Verification

```
gguf_models.json → DataService.loadModels() → SearchEngine.indexModels() → Website Display
```

You can verify each step:
1. **gguf_models.json**: Check in Network tab
2. **DataService**: Check console logs
3. **SearchEngine**: Test search functionality
4. **Website Display**: See models on page