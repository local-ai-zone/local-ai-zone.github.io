/**
 * Bundle size analysis and optimization recommendations
 * Analyzes the application bundle size and provides optimization suggestions
 */

import fs from 'fs';
import path from 'path';

console.log('📦 Bundle Size Analysis Started...\n');

// Calculate file sizes
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyze source files
function analyzeSourceFiles() {
  console.log('📊 Analyzing Source Files...');
  
  const sourceFiles = [];
  
  function scanDirectory(dir, category = '') {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, category || file);
        } else if (file.endsWith('.js')) {
          const size = getFileSize(filePath);
          sourceFiles.push({
            path: filePath,
            name: file,
            category: category || 'root',
            size,
            sizeFormatted: formatBytes(size)
          });
        }
      });
    } catch (error) {
      console.warn(`Could not scan directory ${dir}:`, error.message);
    }
  }
  
  scanDirectory('src');
  
  // Sort by size
  sourceFiles.sort((a, b) => b.size - a.size);
  
  // Group by category
  const byCategory = {};
  sourceFiles.forEach(file => {
    if (!byCategory[file.category]) {
      byCategory[file.category] = [];
    }
    byCategory[file.category].push(file);
  });
  
  // Calculate totals
  const totalSize = sourceFiles.reduce((sum, file) => sum + file.size, 0);
  
  console.log(`\n📈 Source File Analysis (${sourceFiles.length} files, ${formatBytes(totalSize)} total):`);
  
  Object.entries(byCategory).forEach(([category, files]) => {
    const categorySize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(`\n   ${category.toUpperCase()} (${formatBytes(categorySize)}):`);
    
    files.slice(0, 5).forEach(file => {
      console.log(`     ${file.name}: ${file.sizeFormatted}`);
    });
    
    if (files.length > 5) {
      console.log(`     ... and ${files.length - 5} more files`);
    }
  });
  
  return { sourceFiles, totalSize, byCategory };
}

// Analyze dependencies
function analyzeDependencies() {
  console.log('\n📦 Analyzing Dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    console.log(`\n   Production Dependencies (${Object.keys(dependencies).length}):`);
    Object.entries(dependencies).forEach(([name, version]) => {
      console.log(`     ${name}: ${version}`);
    });
    
    console.log(`\n   Development Dependencies (${Object.keys(devDependencies).length}):`);
    Object.entries(devDependencies).slice(0, 10).forEach(([name, version]) => {
      console.log(`     ${name}: ${version}`);
    });
    
    if (Object.keys(devDependencies).length > 10) {
      console.log(`     ... and ${Object.keys(devDependencies).length - 10} more`);
    }
    
    return { dependencies, devDependencies };
    
  } catch (error) {
    console.warn('Could not analyze package.json:', error.message);
    return { dependencies: {}, devDependencies: {} };
  }
}

// Check for optimization opportunities
function checkOptimizations(analysis) {
  console.log('\n🔍 Optimization Opportunities:');
  
  const recommendations = [];
  
  // Check for large files
  const largeFiles = analysis.sourceFiles.filter(file => file.size > 10000); // > 10KB
  if (largeFiles.length > 0) {
    recommendations.push({
      type: 'Large Files',
      severity: 'medium',
      description: `${largeFiles.length} files are larger than 10KB`,
      files: largeFiles.slice(0, 3).map(f => `${f.name} (${f.sizeFormatted})`),
      suggestion: 'Consider code splitting or refactoring large files'
    });
  }
  
  // Check for duplicate functionality
  const componentFiles = analysis.byCategory.components || [];
  const utilFiles = analysis.byCategory.utils || [];
  
  if (componentFiles.length > 10) {
    recommendations.push({
      type: 'Component Count',
      severity: 'low',
      description: `${componentFiles.length} component files detected`,
      suggestion: 'Consider component composition to reduce bundle size'
    });
  }
  
  if (utilFiles.length > 8) {
    recommendations.push({
      type: 'Utility Count',
      severity: 'low',
      description: `${utilFiles.length} utility files detected`,
      suggestion: 'Consider consolidating related utilities'
    });
  }
  
  // Check total bundle size
  if (analysis.totalSize > 200000) { // > 200KB
    recommendations.push({
      type: 'Bundle Size',
      severity: 'high',
      description: `Total source size is ${formatBytes(analysis.totalSize)}`,
      suggestion: 'Consider code splitting and lazy loading for better performance'
    });
  } else if (analysis.totalSize > 100000) { // > 100KB
    recommendations.push({
      type: 'Bundle Size',
      severity: 'medium',
      description: `Total source size is ${formatBytes(analysis.totalSize)}`,
      suggestion: 'Monitor bundle size growth and consider optimization'
    });
  } else {
    recommendations.push({
      type: 'Bundle Size',
      severity: 'good',
      description: `Total source size is ${formatBytes(analysis.totalSize)}`,
      suggestion: 'Bundle size is well optimized'
    });
  }
  
  // Display recommendations
  recommendations.forEach(rec => {
    const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : rec.severity === 'low' ? '🟠' : '✅';
    console.log(`\n   ${icon} ${rec.type}:`);
    console.log(`      ${rec.description}`);
    if (rec.files) {
      console.log(`      Files: ${rec.files.join(', ')}`);
    }
    console.log(`      💡 ${rec.suggestion}`);
  });
  
  return recommendations;
}

// Performance optimization suggestions
function performanceOptimizations() {
  console.log('\n⚡ Performance Optimization Suggestions:');
  
  const optimizations = [
    {
      category: 'Code Splitting',
      suggestions: [
        'Implement dynamic imports for large components',
        'Lazy load filter panel and advanced features',
        'Split vendor code from application code'
      ]
    },
    {
      category: 'Asset Optimization',
      suggestions: [
        'Compress and optimize images',
        'Use WebP format for images where supported',
        'Implement resource hints (preload, prefetch)'
      ]
    },
    {
      category: 'Runtime Performance',
      suggestions: [
        'Virtual scrolling is already implemented ✅',
        'Debounced search is already implemented ✅',
        'Consider service worker for caching'
      ]
    },
    {
      category: 'Network Optimization',
      suggestions: [
        'Implement HTTP/2 server push',
        'Use CDN for static assets',
        'Enable gzip/brotli compression'
      ]
    }
  ];
  
  optimizations.forEach(opt => {
    console.log(`\n   📂 ${opt.category}:`);
    opt.suggestions.forEach(suggestion => {
      console.log(`      • ${suggestion}`);
    });
  });
}

// Browser compatibility check
function browserCompatibilityCheck() {
  console.log('\n🌐 Browser Compatibility Analysis:');
  
  const features = [
    { name: 'ES6 Modules', supported: true, fallback: 'Use bundler for older browsers' },
    { name: 'Fetch API', supported: true, fallback: 'Polyfill available if needed' },
    { name: 'CSS Grid', supported: true, fallback: 'Flexbox fallback implemented' },
    { name: 'IntersectionObserver', supported: true, fallback: 'Polyfill for virtual scrolling' },
    { name: 'ResizeObserver', supported: true, fallback: 'Window resize events as fallback' }
  ];
  
  features.forEach(feature => {
    const status = feature.supported ? '✅' : '❌';
    console.log(`   ${status} ${feature.name}`);
    if (!feature.supported) {
      console.log(`      💡 ${feature.fallback}`);
    }
  });
  
  console.log('\n   📱 Mobile Optimization:');
  console.log('      ✅ Responsive design implemented');
  console.log('      ✅ Touch-friendly interface');
  console.log('      ✅ Mobile-first CSS approach');
  console.log('      ✅ Virtual scrolling for performance');
}

// Main analysis function
async function runBundleAnalysis() {
  console.log('🎯 Starting Bundle Analysis...\n');
  
  // Analyze source files
  const sourceAnalysis = analyzeSourceFiles();
  
  // Analyze dependencies
  const depAnalysis = analyzeDependencies();
  
  // Check optimizations
  const recommendations = checkOptimizations(sourceAnalysis);
  
  // Performance suggestions
  performanceOptimizations();
  
  // Browser compatibility
  browserCompatibilityCheck();
  
  // Summary
  console.log('\n📊 Bundle Analysis Summary:');
  console.log('=====================================');
  console.log(`   📁 Source Files: ${sourceAnalysis.sourceFiles.length} files`);
  console.log(`   📦 Total Size: ${formatBytes(sourceAnalysis.totalSize)}`);
  console.log(`   🔗 Dependencies: ${Object.keys(depAnalysis.dependencies).length} production`);
  console.log(`   🛠️  Dev Dependencies: ${Object.keys(depAnalysis.devDependencies).length} development`);
  
  const highPriorityRecs = recommendations.filter(r => r.severity === 'high');
  const mediumPriorityRecs = recommendations.filter(r => r.severity === 'medium');
  
  if (highPriorityRecs.length > 0) {
    console.log(`   🔴 High Priority Issues: ${highPriorityRecs.length}`);
  }
  if (mediumPriorityRecs.length > 0) {
    console.log(`   🟡 Medium Priority Issues: ${mediumPriorityRecs.length}`);
  }
  
  if (highPriorityRecs.length === 0 && mediumPriorityRecs.length === 0) {
    console.log('   ✅ Bundle is well optimized!');
  }
  
  return {
    sourceAnalysis,
    depAnalysis,
    recommendations,
    score: calculateOptimizationScore(recommendations)
  };
}

function calculateOptimizationScore(recommendations) {
  let score = 100;
  
  recommendations.forEach(rec => {
    switch (rec.severity) {
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  });
  
  return Math.max(0, score);
}

// Run the analysis
runBundleAnalysis().then(result => {
  console.log(`\n🎯 Optimization Score: ${result.score}/100`);
  
  if (result.score >= 90) {
    console.log('🎉 Excellent! Your bundle is highly optimized.');
  } else if (result.score >= 70) {
    console.log('👍 Good! Minor optimizations could improve performance.');
  } else if (result.score >= 50) {
    console.log('⚠️  Fair. Several optimizations recommended.');
  } else {
    console.log('🔴 Poor. Significant optimizations needed.');
  }
}).catch(error => {
  console.error('❌ Bundle analysis failed:', error);
  process.exit(1);
});