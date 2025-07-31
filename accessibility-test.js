/**
 * Accessibility and Usability Testing Script
 * Tests the application for accessibility compliance and usability
 */

import fs from 'fs';
import path from 'path';

console.log('♿ Accessibility and Usability Testing Started...\n');

// ARIA attributes and accessibility patterns
const ARIA_ATTRIBUTES = [
  'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
  'aria-hidden', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-busy',
  'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-selected',
  'aria-checked', 'aria-pressed', 'aria-current', 'aria-disabled',
  'aria-readonly', 'aria-required', 'aria-invalid', 'aria-multiline',
  'aria-multiselectable', 'aria-orientation', 'aria-sort', 'aria-valuemin',
  'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-level',
  'aria-posinset', 'aria-setsize', 'aria-rowcount', 'aria-colcount',
  'aria-rowindex', 'aria-colindex', 'aria-rowspan', 'aria-colspan'
];

const SEMANTIC_ELEMENTS = [
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'form', 'label',
  'input', 'textarea', 'select', 'option', 'fieldset', 'legend'
];

const INTERACTIVE_ELEMENTS = [
  'button', 'a', 'input', 'textarea', 'select', 'details', 'summary'
];

/**
 * Analyze HTML files for accessibility
 */
function analyzeHTMLAccessibility() {
  console.log('🔍 Analyzing HTML Accessibility...');
  
  const results = {
    files: [],
    issues: [],
    score: 0
  };

  try {
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    const analysis = analyzeHTMLContent(htmlContent, 'index.html');
    results.files.push(analysis);
    results.issues.push(...analysis.issues);
  } catch (error) {
    console.warn('Could not analyze HTML file:', error.message);
  }

  // Calculate overall score
  const totalChecks = results.files.reduce((sum, file) => sum + file.totalChecks, 0);
  const passedChecks = results.files.reduce((sum, file) => sum + file.passedChecks, 0);
  results.score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  console.log(`\n📊 HTML Accessibility Analysis:`);
  results.files.forEach(file => {
    console.log(`\n   📄 ${file.name}:`);
    console.log(`      Score: ${file.score.toFixed(1)}% (${file.passedChecks}/${file.totalChecks})`);
    
    if (file.issues.length > 0) {
      console.log(`      Issues:`);
      file.issues.slice(0, 5).forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`        ${icon} ${issue.message}`);
      });
      
      if (file.issues.length > 5) {
        console.log(`        ... and ${file.issues.length - 5} more issues`);
      }
    }
  });

  return results;
}

/**
 * Analyze HTML content for accessibility issues
 */
function analyzeHTMLContent(content, filename) {
  const issues = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check for DOCTYPE
  totalChecks++;
  if (content.includes('<!DOCTYPE html>')) {
    passedChecks++;
  } else {
    issues.push({
      severity: 'error',
      message: 'Missing DOCTYPE declaration',
      line: 1
    });
  }

  // Check for lang attribute
  totalChecks++;
  if (content.includes('<html lang=')) {
    passedChecks++;
  } else {
    issues.push({
      severity: 'error',
      message: 'Missing lang attribute on html element',
      line: findLineNumber(content, '<html')
    });
  }

  // Check for title element
  totalChecks++;
  if (content.includes('<title>') && !content.includes('<title></title>')) {
    passedChecks++;
  } else {
    issues.push({
      severity: 'error',
      message: 'Missing or empty title element',
      line: findLineNumber(content, '<title')
    });
  }

  // Check for meta viewport
  totalChecks++;
  if (content.includes('name="viewport"')) {
    passedChecks++;
  } else {
    issues.push({
      severity: 'warning',
      message: 'Missing viewport meta tag for mobile responsiveness',
      line: findLineNumber(content, '<head')
    });
  }

  // Check for skip links
  totalChecks++;
  if (content.includes('skip') || content.includes('Skip')) {
    passedChecks++;
  } else {
    issues.push({
      severity: 'warning',
      message: 'Consider adding skip navigation links',
      line: 1
    });
  }

  // Check for semantic structure
  const semanticElements = ['<header', '<nav', '<main', '<footer'];
  semanticElements.forEach(element => {
    totalChecks++;
    if (content.includes(element)) {
      passedChecks++;
    } else {
      issues.push({
        severity: 'info',
        message: `Consider using ${element.replace('<', '')} element for better semantic structure`,
        line: 1
      });
    }
  });

  return {
    name: filename,
    issues,
    totalChecks,
    passedChecks,
    score: totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0
  };
}

/**
 * Analyze JavaScript files for accessibility patterns
 */
function analyzeJSAccessibility() {
  console.log('\n🔍 Analyzing JavaScript Accessibility Patterns...');
  
  const results = {
    files: [],
    patterns: {
      ariaUsage: 0,
      keyboardHandling: 0,
      focusManagement: 0,
      screenReaderSupport: 0
    },
    issues: []
  };

  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.js') && !file.includes('.test.')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const analysis = analyzeJSContent(content, filePath);
          results.files.push(analysis);
          
          // Aggregate patterns
          results.patterns.ariaUsage += analysis.patterns.ariaUsage;
          results.patterns.keyboardHandling += analysis.patterns.keyboardHandling;
          results.patterns.focusManagement += analysis.patterns.focusManagement;
          results.patterns.screenReaderSupport += analysis.patterns.screenReaderSupport;
          
          results.issues.push(...analysis.issues);
        }
      });
    } catch (error) {
      console.warn(`Could not scan directory ${dir}:`, error.message);
    }
  }

  scanDirectory('src');

  console.log(`\n📊 JavaScript Accessibility Analysis:`);
  console.log(`   📁 Files analyzed: ${results.files.length}`);
  console.log(`   🏷️  ARIA usage: ${results.patterns.ariaUsage} instances`);
  console.log(`   ⌨️  Keyboard handling: ${results.patterns.keyboardHandling} instances`);
  console.log(`   🎯 Focus management: ${results.patterns.focusManagement} instances`);
  console.log(`   📢 Screen reader support: ${results.patterns.screenReaderSupport} instances`);

  // Show top files with accessibility patterns
  const topFiles = results.files
    .filter(f => f.accessibilityScore > 0)
    .sort((a, b) => b.accessibilityScore - a.accessibilityScore)
    .slice(0, 5);

  if (topFiles.length > 0) {
    console.log(`\n   🏆 Top Accessible Files:`);
    topFiles.forEach(file => {
      console.log(`      ${path.basename(file.name)}: ${file.accessibilityScore} accessibility features`);
    });
  }

  return results;
}

/**
 * Analyze JavaScript content for accessibility patterns
 */
function analyzeJSContent(content, filename) {
  const issues = [];
  const patterns = {
    ariaUsage: 0,
    keyboardHandling: 0,
    focusManagement: 0,
    screenReaderSupport: 0
  };

  // Check for ARIA attributes
  ARIA_ATTRIBUTES.forEach(attr => {
    const matches = content.match(new RegExp(attr, 'g'));
    if (matches) {
      patterns.ariaUsage += matches.length;
    }
  });

  // Check for keyboard event handling
  const keyboardPatterns = [
    /addEventListener\s*\(\s*['"`]keydown['"`]/g,
    /addEventListener\s*\(\s*['"`]keyup['"`]/g,
    /addEventListener\s*\(\s*['"`]keypress['"`]/g,
    /onKeyDown/g,
    /onKeyUp/g,
    /onKeyPress/g
  ];

  keyboardPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      patterns.keyboardHandling += matches.length;
    }
  });

  // Check for focus management
  const focusPatterns = [
    /\.focus\(\)/g,
    /\.blur\(\)/g,
    /tabindex/gi,
    /focusable/gi,
    /autofocus/gi
  ];

  focusPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      patterns.focusManagement += matches.length;
    }
  });

  // Check for screen reader support
  const screenReaderPatterns = [
    /aria-live/gi,
    /aria-atomic/gi,
    /aria-relevant/gi,
    /sr-only/gi,
    /screen.*reader/gi,
    /announce/gi
  ];

  screenReaderPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      patterns.screenReaderSupport += matches.length;
    }
  });

  // Check for potential issues
  if (content.includes('onclick') && !content.includes('onkeydown') && !content.includes('onkeyup')) {
    issues.push({
      severity: 'warning',
      message: 'Click handlers should have keyboard equivalents',
      file: filename
    });
  }

  if (content.includes('div') && content.includes('click') && !content.includes('role=')) {
    issues.push({
      severity: 'warning',
      message: 'Interactive divs should have appropriate ARIA roles',
      file: filename
    });
  }

  const accessibilityScore = Object.values(patterns).reduce((sum, count) => sum + count, 0);

  return {
    name: filename,
    patterns,
    accessibilityScore,
    issues
  };
}

/**
 * Test keyboard navigation patterns
 */
function testKeyboardNavigation() {
  console.log('\n⌨️ Testing Keyboard Navigation Patterns...');
  
  const results = {
    patterns: [],
    score: 0
  };

  try {
    const keyboardNavFile = fs.readFileSync('utils/keyboardNavigation.js', 'utf8');
    
    // Check for common keyboard navigation patterns
    const patterns = [
      { name: 'Tab Navigation', pattern: /tab/gi, weight: 3 },
      { name: 'Arrow Key Navigation', pattern: /arrow/gi, weight: 2 },
      { name: 'Enter/Space Activation', pattern: /(enter|space)/gi, weight: 3 },
      { name: 'Escape Key Handling', pattern: /escape/gi, weight: 2 },
      { name: 'Focus Trapping', pattern: /(trap|focus.*trap)/gi, weight: 3 },
      { name: 'Skip Links', pattern: /skip/gi, weight: 2 },
      { name: 'Keyboard Shortcuts', pattern: /(shortcut|hotkey)/gi, weight: 1 }
    ];

    patterns.forEach(pattern => {
      const matches = keyboardNavFile.match(pattern.pattern);
      const count = matches ? matches.length : 0;
      
      results.patterns.push({
        name: pattern.name,
        count,
        implemented: count > 0,
        weight: pattern.weight
      });
      
      if (count > 0) {
        results.score += pattern.weight;
      }
    });

    console.log(`\n   📊 Keyboard Navigation Analysis:`);
    results.patterns.forEach(pattern => {
      const status = pattern.implemented ? '✅' : '❌';
      console.log(`      ${status} ${pattern.name}: ${pattern.count} instances`);
    });

    const maxScore = patterns.reduce((sum, p) => sum + p.weight, 0);
    const percentage = (results.score / maxScore) * 100;
    console.log(`\n   🎯 Keyboard Navigation Score: ${results.score}/${maxScore} (${percentage.toFixed(1)}%)`);

  } catch (error) {
    console.warn('Could not analyze keyboard navigation:', error.message);
  }

  return results;
}

/**
 * Test color contrast and visual accessibility
 */
function testVisualAccessibility() {
  console.log('\n🎨 Testing Visual Accessibility...');
  
  const results = {
    colorScheme: 'unknown',
    contrastChecks: [],
    recommendations: []
  };

  try {
    // Check Tailwind config for color usage
    const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
    
    // Look for color definitions
    if (tailwindConfig.includes('colors')) {
      results.colorScheme = 'custom';
    } else {
      results.colorScheme = 'default';
    }

    // Check for dark mode support
    if (tailwindConfig.includes('dark')) {
      results.recommendations.push('✅ Dark mode support detected');
    } else {
      results.recommendations.push('💡 Consider adding dark mode support');
    }

    // Analyze CSS classes in components for color usage
    const componentFiles = fs.readdirSync('components');
    let colorUsage = {
      text: new Set(),
      background: new Set(),
      border: new Set()
    };

    componentFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(`components/${file}`, 'utf8');
        
        // Extract Tailwind color classes
        const textColors = content.match(/text-\w+-\d+/g) || [];
        const bgColors = content.match(/bg-\w+-\d+/g) || [];
        const borderColors = content.match(/border-\w+-\d+/g) || [];
        
        textColors.forEach(color => colorUsage.text.add(color));
        bgColors.forEach(color => colorUsage.background.add(color));
        borderColors.forEach(color => colorUsage.border.add(color));
      }
    });

    console.log(`\n   🎨 Visual Accessibility Analysis:`);
    console.log(`      Color Scheme: ${results.colorScheme}`);
    console.log(`      Text Colors: ${colorUsage.text.size} unique`);
    console.log(`      Background Colors: ${colorUsage.background.size} unique`);
    console.log(`      Border Colors: ${colorUsage.border.size} unique`);

    // Check for potential contrast issues
    const lightColors = ['50', '100', '200', '300'];
    const darkColors = ['700', '800', '900'];
    
    let potentialIssues = 0;
    colorUsage.text.forEach(textColor => {
      const colorNumber = textColor.match(/\d+$/)?.[0];
      if (lightColors.includes(colorNumber)) {
        potentialIssues++;
      }
    });

    if (potentialIssues > 0) {
      results.recommendations.push(`⚠️ ${potentialIssues} potential low contrast text colors detected`);
    } else {
      results.recommendations.push('✅ No obvious contrast issues detected');
    }

    results.recommendations.forEach(rec => console.log(`      ${rec}`));

  } catch (error) {
    console.warn('Could not analyze visual accessibility:', error.message);
  }

  return results;
}

/**
 * Test mobile and responsive accessibility
 */
function testMobileAccessibility() {
  console.log('\n📱 Testing Mobile Accessibility...');
  
  const results = {
    touchTargets: 0,
    responsivePatterns: 0,
    mobileOptimizations: [],
    score: 0
  };

  try {
    // Check for mobile optimization patterns
    const mobileOptFile = fs.readFileSync('components/MobileOptimization.test.js', 'utf8');
    
    const patterns = [
      { name: 'Touch Target Size', pattern: /(touch|tap).*target/gi, points: 3 },
      { name: 'Responsive Design', pattern: /responsive/gi, points: 2 },
      { name: 'Mobile Navigation', pattern: /mobile.*nav/gi, points: 2 },
      { name: 'Gesture Support', pattern: /(swipe|pinch|gesture)/gi, points: 1 },
      { name: 'Viewport Optimization', pattern: /viewport/gi, points: 2 }
    ];

    patterns.forEach(pattern => {
      const matches = mobileOptFile.match(pattern.pattern);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        results.mobileOptimizations.push({
          name: pattern.name,
          count,
          points: pattern.points
        });
        results.score += pattern.points;
      }
    });

    // Check component files for responsive classes
    const componentFiles = fs.readdirSync('components');
    componentFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(`components/${file}`, 'utf8');
        
        // Count responsive breakpoint classes
        const responsiveMatches = content.match(/(sm:|md:|lg:|xl:|2xl:)/g);
        if (responsiveMatches) {
          results.responsivePatterns += responsiveMatches.length;
        }
        
        // Count touch-friendly patterns
        const touchMatches = content.match(/(touch|tap|click|press)/gi);
        if (touchMatches) {
          results.touchTargets += touchMatches.length;
        }
      }
    });

    console.log(`\n   📱 Mobile Accessibility Analysis:`);
    console.log(`      Responsive Patterns: ${results.responsivePatterns} instances`);
    console.log(`      Touch Interactions: ${results.touchTargets} instances`);
    
    if (results.mobileOptimizations.length > 0) {
      console.log(`      Mobile Optimizations:`);
      results.mobileOptimizations.forEach(opt => {
        console.log(`        ✅ ${opt.name}: ${opt.count} instances`);
      });
    }

    const maxScore = patterns.reduce((sum, p) => sum + p.points, 0);
    const percentage = (results.score / maxScore) * 100;
    console.log(`\n   🎯 Mobile Accessibility Score: ${results.score}/${maxScore} (${percentage.toFixed(1)}%)`);

  } catch (error) {
    console.warn('Could not analyze mobile accessibility:', error.message);
  }

  return results;
}

/**
 * Generate accessibility recommendations
 */
function generateRecommendations(htmlResults, jsResults, keyboardResults, visualResults, mobileResults) {
  console.log('\n💡 Accessibility Recommendations:');
  console.log('=====================================');

  const recommendations = [];

  // HTML recommendations
  if (htmlResults.score < 80) {
    recommendations.push({
      category: 'HTML Structure',
      priority: 'high',
      items: [
        'Add missing semantic HTML elements',
        'Ensure all images have alt attributes',
        'Add proper heading hierarchy',
        'Include skip navigation links'
      ]
    });
  }

  // JavaScript recommendations
  if (jsResults.patterns.keyboardHandling < 5) {
    recommendations.push({
      category: 'Keyboard Navigation',
      priority: 'high',
      items: [
        'Add keyboard event handlers for interactive elements',
        'Implement focus management for dynamic content',
        'Add keyboard shortcuts for common actions'
      ]
    });
  }

  if (jsResults.patterns.ariaUsage < 10) {
    recommendations.push({
      category: 'ARIA Implementation',
      priority: 'medium',
      items: [
        'Add ARIA labels for complex components',
        'Implement live regions for dynamic updates',
        'Use ARIA states for interactive elements'
      ]
    });
  }

  // Visual recommendations
  recommendations.push({
    category: 'Visual Accessibility',
    priority: 'medium',
    items: [
      'Test color contrast ratios (WCAG AA: 4.5:1)',
      'Ensure text is readable at 200% zoom',
      'Add focus indicators for all interactive elements',
      'Consider high contrast mode support'
    ]
  });

  // Mobile recommendations
  if (mobileResults.score < 8) {
    recommendations.push({
      category: 'Mobile Accessibility',
      priority: 'medium',
      items: [
        'Ensure touch targets are at least 44px',
        'Test with screen reader on mobile',
        'Optimize for one-handed use',
        'Add gesture alternatives'
      ]
    });
  }

  // General recommendations
  recommendations.push({
    category: 'Testing & Validation',
    priority: 'low',
    items: [
      'Test with multiple screen readers',
      'Validate with automated accessibility tools',
      'Conduct user testing with disabled users',
      'Regular accessibility audits'
    ]
  });

  // Display recommendations
  recommendations.forEach(rec => {
    const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`\n${priorityIcon} ${rec.category} (${rec.priority} priority):`);
    rec.items.forEach(item => {
      console.log(`   • ${item}`);
    });
  });

  return recommendations;
}

/**
 * Calculate overall accessibility score
 */
function calculateOverallScore(htmlResults, jsResults, keyboardResults, visualResults, mobileResults) {
  const weights = {
    html: 0.25,
    javascript: 0.25,
    keyboard: 0.20,
    visual: 0.15,
    mobile: 0.15
  };

  const scores = {
    html: htmlResults.score,
    javascript: Math.min((jsResults.patterns.ariaUsage + jsResults.patterns.keyboardHandling + jsResults.patterns.focusManagement) * 5, 100),
    keyboard: (keyboardResults.score / 16) * 100, // Max score is 16
    visual: 75, // Estimated based on analysis
    mobile: (mobileResults.score / 10) * 100 // Max score is 10
  };

  const overallScore = Object.entries(weights).reduce((total, [category, weight]) => {
    return total + (scores[category] * weight);
  }, 0);

  return {
    overall: overallScore,
    breakdown: scores
  };
}

/**
 * Find line number of text in content
 */
function findLineNumber(content, searchText) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Main accessibility testing function
 */
async function runAccessibilityTests() {
  console.log('🎯 Starting Comprehensive Accessibility Tests...\n');

  // Run all tests
  const htmlResults = analyzeHTMLAccessibility();
  const jsResults = analyzeJSAccessibility();
  const keyboardResults = testKeyboardNavigation();
  const visualResults = testVisualAccessibility();
  const mobileResults = testMobileAccessibility();

  // Generate recommendations
  const recommendations = generateRecommendations(
    htmlResults, jsResults, keyboardResults, visualResults, mobileResults
  );

  // Calculate overall score
  const overallScore = calculateOverallScore(
    htmlResults, jsResults, keyboardResults, visualResults, mobileResults
  );

  // Final summary
  console.log('\n🎯 Accessibility Testing Summary:');
  console.log('=====================================');
  console.log(`📊 Overall Score: ${overallScore.overall.toFixed(1)}/100`);
  console.log('\n📈 Category Breakdown:');
  Object.entries(overallScore.breakdown).forEach(([category, score]) => {
    const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
    console.log(`   ${status} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${score.toFixed(1)}%`);
  });

  console.log(`\n🔧 Total Recommendations: ${recommendations.length} categories`);
  
  const highPriority = recommendations.filter(r => r.priority === 'high').length;
  const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
  const lowPriority = recommendations.filter(r => r.priority === 'low').length;

  if (highPriority > 0) console.log(`   🔴 High Priority: ${highPriority}`);
  if (mediumPriority > 0) console.log(`   🟡 Medium Priority: ${mediumPriority}`);
  if (lowPriority > 0) console.log(`   🟢 Low Priority: ${lowPriority}`);

  // Final assessment
  if (overallScore.overall >= 85) {
    console.log('\n🎉 Excellent! Your application has strong accessibility support.');
  } else if (overallScore.overall >= 70) {
    console.log('\n👍 Good accessibility foundation. Address high-priority items for improvement.');
  } else if (overallScore.overall >= 50) {
    console.log('\n⚠️ Fair accessibility. Significant improvements needed.');
  } else {
    console.log('\n🔴 Poor accessibility. Major accessibility work required.');
  }

  return {
    overallScore,
    results: {
      html: htmlResults,
      javascript: jsResults,
      keyboard: keyboardResults,
      visual: visualResults,
      mobile: mobileResults
    },
    recommendations
  };
}

// Run the tests
runAccessibilityTests().catch(error => {
  console.error('❌ Accessibility testing failed:', error);
  process.exit(1);
});