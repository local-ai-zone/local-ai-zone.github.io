# Performance Testing Guide

## Quick Start

Run performance tests on blog posts:

```bash
npm run performance-test
```

Or directly:

```bash
node scripts/performance-test.js
```

## What Gets Tested

The performance test suite evaluates blog posts across multiple dimensions:

### 1. Page Load Time
- **Target**: < 2 seconds
- **Measures**: Time from navigation start to page load complete
- **Tests**: Normal network conditions

### 2. Slow 3G Performance
- **Target**: < 10 seconds
- **Measures**: Load time under constrained network conditions
- **Simulates**: 500kb/s throughput, 400ms latency

### 3. Core Web Vitals

#### First Contentful Paint (FCP)
- **Target**: < 1800ms
- **Measures**: Time until first content is rendered
- **Importance**: User perception of loading speed

#### Cumulative Layout Shift (CLS)
- **Target**: < 0.1
- **Measures**: Visual stability during page load
- **Importance**: Prevents unexpected layout changes

#### Total Blocking Time (TBT)
- **Target**: < 300ms
- **Measures**: Time when main thread is blocked
- **Importance**: Page responsiveness

### 4. Performance Score
- **Target**: > 90/100
- **Measures**: Overall performance based on multiple metrics
- **Includes**: Load times, resource usage, rendering performance

## Sample Pages Tested

The script tests representative pages from each category:

1. **Guides**: `guides/ai-coding-prompts-master-techniques-2025.html`
2. **Brands**: `brands/llama-ai-open-source-complete-guide-2025.html`
3. **CPU**: `cpu/top-5-apple-m3-gguf-models-8gb-16gb-32gb-premium-ultrabook-guide.html`

## Output

### Console Output
Real-time test results with:
- Individual test status (✅ PASS / ❌ FAIL)
- Metric values and thresholds
- Summary statistics

### JSON Report
Detailed results saved to: `performance-test-report.json`

Contains:
- Timestamp
- Summary statistics
- Individual test results
- All measured metrics

## Understanding Results

### Excellent Performance
- Load time: < 500ms
- FCP: < 1000ms
- CLS: 0
- Performance score: 95-100

### Good Performance
- Load time: 500ms - 1500ms
- FCP: 1000ms - 1800ms
- CLS: < 0.1
- Performance score: 90-95

### Needs Improvement
- Load time: > 1500ms
- FCP: > 1800ms
- CLS: > 0.1
- Performance score: < 90

## Customizing Tests

### Add More Pages

Edit `scripts/performance-test.js`:

```javascript
const SAMPLE_POSTS = [
    'guides/your-guide.html',
    'brands/your-brand.html',
    'cpu/your-cpu.html'
];
```

### Adjust Thresholds

Modify the `THRESHOLDS` object:

```javascript
const THRESHOLDS = {
    pageLoadTime: 2000,      // 2 seconds
    lighthouseScore: 90,     // 90/100
    fcp: 1800,              // 1.8 seconds
    cls: 0.1,               // 0.1 max shift
    tbt: 300                // 300ms
};
```

### Change Network Conditions

Modify the `SLOW_3G` configuration:

```javascript
const SLOW_3G = {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,  // 500kb/s
    uploadThroughput: (500 * 1024) / 8,
    latency: 400  // 400ms RTT
};
```

## Troubleshooting

### Tests Fail on First Run
- Ensure all blog posts exist at specified paths
- Check that CSS files are properly linked
- Verify no JavaScript errors in console

### Inconsistent Results
- Close other applications to free system resources
- Run tests multiple times and average results
- Check for background processes affecting performance

### Network Throttling Issues
- Ensure Puppeteer has proper permissions
- Try running with elevated privileges if needed
- Check firewall settings

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run Performance Tests
  run: npm run performance-test
  
- name: Upload Performance Report
  uses: actions/upload-artifact@v2
  with:
    name: performance-report
    path: performance-test-report.json
```

## Performance Optimization Tips

### If Load Times Are Slow
1. Minify CSS and JavaScript
2. Optimize images (compress, use WebP)
3. Enable compression (gzip/brotli)
4. Use CDN for static assets
5. Implement lazy loading

### If FCP Is Slow
1. Inline critical CSS
2. Defer non-critical JavaScript
3. Optimize font loading
4. Reduce render-blocking resources
5. Use resource hints (preload, prefetch)

### If CLS Is High
1. Set explicit dimensions for images
2. Reserve space for dynamic content
3. Avoid inserting content above existing content
4. Use CSS containment
5. Preload fonts to prevent FOIT/FOUT

### If TBT Is High
1. Break up long JavaScript tasks
2. Use web workers for heavy computation
3. Defer non-critical JavaScript
4. Optimize third-party scripts
5. Reduce JavaScript execution time

## Related Documentation

- [CSS Optimization Guide](docs/CSS_OPTIMIZATION.md)
- [Accessibility Testing Guide](ACCESSIBILITY_TESTING_GUIDE.md)
- [Cross-Browser Testing Guide](CROSS_BROWSER_TESTING_GUIDE.md)
- [Mobile Responsive Testing](mobile-responsive-verification.md)

## Requirements Coverage

This testing suite verifies:

- ✅ Requirement 11.1: Page load time < 2 seconds
- ✅ Requirement 11.2: CSS caching and optimization
- ✅ Requirement 11.3: Critical CSS loading
- ✅ Requirement 11.4: Performance on constrained networks

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the generated JSON report for details
3. Examine console output for specific failures
4. Verify all dependencies are installed (`npm install`)

---

**Last Updated**: October 14, 2025  
**Script Version**: 1.0.0  
**Maintained By**: GGUF Loader Team
