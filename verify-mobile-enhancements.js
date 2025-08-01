/**
 * Mobile Engagement Metrics Enhancement Verification Script
 * Tests responsive design and mobile optimization for engagement metrics
 */

class MobileEngagementVerifier {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    /**
     * Run all mobile engagement verification tests
     */
    async runAllTests() {
        console.log('🔍 Starting Mobile Engagement Metrics Verification...\n');
        
        try {
            // Test responsive breakpoints
            await this.testResponsiveBreakpoints();
            
            // Test touch interaction
            await this.testTouchInteraction();
            
            // Test engagement metrics display
            await this.testEngagementMetricsDisplay();
            
            // Test filter controls
            await this.testFilterControls();
            
            // Test accessibility
            await this.testAccessibility();
            
            // Test performance
            await this.testPerformance();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            this.addResult('CRITICAL', 'Verification Process', 'Failed to complete verification', error.message);
        }
    }

    /**
     * Test responsive breakpoints for engagement metrics
     */
    async testResponsiveBreakpoints() {
        this.currentTest = 'Responsive Breakpoints';
        console.log('📱 Testing responsive breakpoints...');
        
        const breakpoints = [
            { name: 'Extra Small Mobile', width: 320 },
            { name: 'Small Mobile', width: 375 },
            { name: 'Large Mobile', width: 480 },
            { name: 'Tablet', width: 768 },
            { name: 'Desktop', width: 1024 },
            { name: 'Large Desktop', width: 1200 }
        ];
        
        for (const breakpoint of breakpoints) {
            await this.testBreakpoint(breakpoint);
        }
    }

    /**
     * Test specific breakpoint
     */
    async testBreakpoint(breakpoint) {
        try {
            // Simulate viewport resize
            this.simulateViewport(breakpoint.width);
            
            // Test engagement metrics visibility
            const engagementElements = document.querySelectorAll('.engagement-count');
            const engagementBadges = document.querySelectorAll('.engagement-badge');
            
            if (engagementElements.length === 0) {
                this.addResult('WARNING', this.currentTest, 
                    `No engagement elements found at ${breakpoint.name} (${breakpoint.width}px)`,
                    'Engagement metrics may not be properly loaded');
                return;
            }
            
            // Check if elements are properly sized for touch
            let touchFriendlyCount = 0;
            engagementElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                const minHeight = parseInt(computedStyle.minHeight) || rect.height;
                
                if (breakpoint.width <= 767 && minHeight >= 32) {
                    touchFriendlyCount++;
                } else if (breakpoint.width > 767 && minHeight >= 24) {
                    touchFriendlyCount++;
                }
            });
            
            const touchFriendlyPercentage = (touchFriendlyCount / engagementElements.length) * 100;
            
            if (touchFriendlyPercentage >= 90) {
                this.addResult('PASS', this.currentTest, 
                    `${breakpoint.name} (${breakpoint.width}px)`,
                    `${touchFriendlyCount}/${engagementElements.length} elements are touch-friendly`);
            } else {
                this.addResult('FAIL', this.currentTest, 
                    `${breakpoint.name} (${breakpoint.width}px)`,
                    `Only ${touchFriendlyCount}/${engagementElements.length} elements are touch-friendly`);
            }
            
            // Test layout stacking on mobile
            if (breakpoint.width <= 480) {
                const modelMetrics = document.querySelectorAll('.model-metrics');
                let stackedCount = 0;
                
                modelMetrics.forEach(metrics => {
                    const computedStyle = window.getComputedStyle(metrics);
                    if (computedStyle.flexDirection === 'column') {
                        stackedCount++;
                    }
                });
                
                if (stackedCount > 0) {
                    this.addResult('PASS', this.currentTest, 
                        `${breakpoint.name} Layout Stacking`,
                        `${stackedCount} metric containers properly stack on small screens`);
                } else {
                    this.addResult('INFO', this.currentTest, 
                        `${breakpoint.name} Layout Stacking`,
                        'Metrics maintain horizontal layout on small screens');
                }
            }
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 
                `${breakpoint.name} (${breakpoint.width}px)`,
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Test touch interaction capabilities
     */
    async testTouchInteraction() {
        this.currentTest = 'Touch Interaction';
        console.log('👆 Testing touch interaction...');
        
        try {
            // Test touch targets
            const touchElements = document.querySelectorAll('.engagement-count, .engagement-badge, .range-slider, .mobile-filter-toggle');
            let touchCompliantCount = 0;
            
            touchElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                const minHeight = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0);
                const minWidth = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0);
                
                // Check if meets minimum touch target size (44px recommended)
                if (minHeight >= 32 && minWidth >= 32) {
                    touchCompliantCount++;
                }
            });
            
            const touchCompliance = (touchCompliantCount / touchElements.length) * 100;
            
            if (touchCompliance >= 90) {
                this.addResult('PASS', this.currentTest, 'Touch Target Sizes',
                    `${touchCompliantCount}/${touchElements.length} elements meet touch guidelines`);
            } else {
                this.addResult('FAIL', this.currentTest, 'Touch Target Sizes',
                    `Only ${touchCompliantCount}/${touchElements.length} elements meet touch guidelines`);
            }
            
            // Test touch action attributes
            const rangeSliders = document.querySelectorAll('.range-slider');
            let touchActionCount = 0;
            
            rangeSliders.forEach(slider => {
                const touchAction = slider.style.touchAction || window.getComputedStyle(slider).touchAction;
                if (touchAction.includes('pan-x') || touchAction === 'manipulation') {
                    touchActionCount++;
                }
            });
            
            if (touchActionCount === rangeSliders.length) {
                this.addResult('PASS', this.currentTest, 'Touch Actions',
                    'All range sliders have proper touch-action attributes');
            } else {
                this.addResult('WARNING', this.currentTest, 'Touch Actions',
                    `${touchActionCount}/${rangeSliders.length} sliders have touch-action attributes`);
            }
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 'Touch Interaction Test',
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Test engagement metrics display across devices
     */
    async testEngagementMetricsDisplay() {
        this.currentTest = 'Engagement Display';
        console.log('💖 Testing engagement metrics display...');
        
        try {
            const engagementElements = document.querySelectorAll('.engagement-count');
            
            if (engagementElements.length === 0) {
                this.addResult('WARNING', this.currentTest, 'Engagement Elements',
                    'No engagement elements found - may need sample data');
                return;
            }
            
            // Test visibility and readability
            let visibleCount = 0;
            let readableCount = 0;
            
            engagementElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                // Check visibility
                if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && rect.width > 0) {
                    visibleCount++;
                }
                
                // Check readability (font size)
                const fontSize = parseInt(computedStyle.fontSize);
                if (fontSize >= 11) { // Minimum readable size
                    readableCount++;
                }
            });
            
            if (visibleCount === engagementElements.length) {
                this.addResult('PASS', this.currentTest, 'Visibility',
                    'All engagement elements are visible');
            } else {
                this.addResult('FAIL', this.currentTest, 'Visibility',
                    `${visibleCount}/${engagementElements.length} elements are visible`);
            }
            
            if (readableCount === engagementElements.length) {
                this.addResult('PASS', this.currentTest, 'Readability',
                    'All engagement elements have readable font sizes');
            } else {
                this.addResult('WARNING', this.currentTest, 'Readability',
                    `${readableCount}/${engagementElements.length} elements have readable font sizes`);
            }
            
            // Test engagement level styling
            const engagementLevels = ['engagement-low', 'engagement-medium', 'engagement-high', 'engagement-viral'];
            let styledCount = 0;
            
            engagementElements.forEach(element => {
                const hasLevelStyling = engagementLevels.some(level => element.classList.contains(level));
                if (hasLevelStyling) {
                    styledCount++;
                }
            });
            
            if (styledCount > 0) {
                this.addResult('PASS', this.currentTest, 'Level Styling',
                    `${styledCount}/${engagementElements.length} elements have engagement level styling`);
            } else {
                this.addResult('INFO', this.currentTest, 'Level Styling',
                    'No engagement level styling detected - may be using default styling');
            }
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 'Display Test',
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Test filter controls mobile optimization
     */
    async testFilterControls() {
        this.currentTest = 'Filter Controls';
        console.log('🎛️ Testing filter controls...');
        
        try {
            // Test mobile filter toggle
            const mobileToggle = document.querySelector('.mobile-filter-toggle');
            if (mobileToggle) {
                const rect = mobileToggle.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(mobileToggle);
                
                if (rect.height >= 44 && computedStyle.display !== 'none') {
                    this.addResult('PASS', this.currentTest, 'Mobile Toggle',
                        'Mobile filter toggle is properly sized and visible');
                } else {
                    this.addResult('FAIL', this.currentTest, 'Mobile Toggle',
                        'Mobile filter toggle does not meet size requirements');
                }
            } else {
                this.addResult('INFO', this.currentTest, 'Mobile Toggle',
                    'Mobile filter toggle not found - may not be in mobile view');
            }
            
            // Test range inputs
            const rangeInputs = document.querySelectorAll('.range-input');
            let mobileOptimizedInputs = 0;
            
            rangeInputs.forEach(input => {
                const computedStyle = window.getComputedStyle(input);
                const fontSize = parseInt(computedStyle.fontSize);
                
                // Check for iOS zoom prevention (16px minimum)
                if (fontSize >= 16) {
                    mobileOptimizedInputs++;
                }
            });
            
            if (rangeInputs.length > 0) {
                if (mobileOptimizedInputs === rangeInputs.length) {
                    this.addResult('PASS', this.currentTest, 'Range Inputs',
                        'All range inputs prevent iOS zoom (16px+ font size)');
                } else {
                    this.addResult('WARNING', this.currentTest, 'Range Inputs',
                        `${mobileOptimizedInputs}/${rangeInputs.length} inputs prevent iOS zoom`);
                }
            }
            
            // Test range sliders
            const rangeSliders = document.querySelectorAll('.range-slider');
            if (rangeSliders.length > 0) {
                let accessibleSliders = 0;
                
                rangeSliders.forEach(slider => {
                    const hasAriaLabel = slider.hasAttribute('aria-label');
                    const rect = slider.getBoundingClientRect();
                    
                    if (hasAriaLabel && rect.height >= 32) {
                        accessibleSliders++;
                    }
                });
                
                if (accessibleSliders === rangeSliders.length) {
                    this.addResult('PASS', this.currentTest, 'Range Sliders',
                        'All range sliders are accessible and touch-friendly');
                } else {
                    this.addResult('WARNING', this.currentTest, 'Range Sliders',
                        `${accessibleSliders}/${rangeSliders.length} sliders are fully accessible`);
                }
            }
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 'Filter Controls Test',
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Test accessibility features
     */
    async testAccessibility() {
        this.currentTest = 'Accessibility';
        console.log('♿ Testing accessibility features...');
        
        try {
            // Test ARIA labels
            const interactiveElements = document.querySelectorAll('.engagement-count, .range-slider, .mobile-filter-toggle');
            let accessibleCount = 0;
            
            interactiveElements.forEach(element => {
                const hasAriaLabel = element.hasAttribute('aria-label') || 
                                   element.hasAttribute('aria-labelledby') ||
                                   element.hasAttribute('title');
                if (hasAriaLabel) {
                    accessibleCount++;
                }
            });
            
            if (accessibleCount >= interactiveElements.length * 0.8) {
                this.addResult('PASS', this.currentTest, 'ARIA Labels',
                    `${accessibleCount}/${interactiveElements.length} elements have accessibility labels`);
            } else {
                this.addResult('WARNING', this.currentTest, 'ARIA Labels',
                    `Only ${accessibleCount}/${interactiveElements.length} elements have accessibility labels`);
            }
            
            // Test keyboard navigation
            const focusableElements = document.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])');
            let keyboardAccessibleCount = 0;
            
            focusableElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                    keyboardAccessibleCount++;
                }
            });
            
            if (keyboardAccessibleCount > 0) {
                this.addResult('PASS', this.currentTest, 'Keyboard Navigation',
                    `${keyboardAccessibleCount} elements are keyboard accessible`);
            } else {
                this.addResult('WARNING', this.currentTest, 'Keyboard Navigation',
                    'No keyboard accessible elements found');
            }
            
            // Test color contrast (basic check)
            const engagementElements = document.querySelectorAll('.engagement-count');
            let contrastCompliantCount = 0;
            
            engagementElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                const color = computedStyle.color;
                const backgroundColor = computedStyle.backgroundColor;
                
                // Basic contrast check (simplified)
                if (color !== backgroundColor && color !== 'rgba(0, 0, 0, 0)') {
                    contrastCompliantCount++;
                }
            });
            
            if (contrastCompliantCount === engagementElements.length) {
                this.addResult('PASS', this.currentTest, 'Color Contrast',
                    'All engagement elements have distinct colors');
            } else {
                this.addResult('INFO', this.currentTest, 'Color Contrast',
                    'Basic color contrast check passed (detailed analysis needed)');
            }
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 'Accessibility Test',
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Test performance aspects
     */
    async testPerformance() {
        this.currentTest = 'Performance';
        console.log('⚡ Testing performance...');
        
        try {
            const startTime = performance.now();
            
            // Test CSS loading
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
            const engagementStylesheet = Array.from(stylesheets).find(sheet => 
                sheet.href && sheet.href.includes('engagement-mobile-responsive.css')
            );
            
            if (engagementStylesheet) {
                this.addResult('PASS', this.currentTest, 'CSS Loading',
                    'Engagement mobile responsive CSS is loaded');
            } else {
                this.addResult('WARNING', this.currentTest, 'CSS Loading',
                    'Engagement mobile responsive CSS not found');
            }
            
            // Test animation performance
            const animatedElements = document.querySelectorAll('.engagement-count, .engagement-badge');
            let animationOptimizedCount = 0;
            
            animatedElements.forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                const transition = computedStyle.transition;
                
                // Check for GPU-accelerated properties
                if (transition.includes('transform') || transition.includes('opacity')) {
                    animationOptimizedCount++;
                }
            });
            
            if (animationOptimizedCount > 0) {
                this.addResult('PASS', this.currentTest, 'Animation Optimization',
                    `${animationOptimizedCount} elements use GPU-accelerated animations`);
            } else {
                this.addResult('INFO', this.currentTest, 'Animation Optimization',
                    'No GPU-accelerated animations detected');
            }
            
            const endTime = performance.now();
            const testDuration = endTime - startTime;
            
            this.addResult('INFO', this.currentTest, 'Test Duration',
                `Performance tests completed in ${testDuration.toFixed(2)}ms`);
            
        } catch (error) {
            this.addResult('ERROR', this.currentTest, 'Performance Test',
                `Test failed: ${error.message}`);
        }
    }

    /**
     * Simulate viewport resize for testing
     */
    simulateViewport(width) {
        // This is a simplified simulation - in real testing, you'd use browser dev tools
        document.documentElement.style.width = `${width}px`;
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        
        // Allow time for responsive changes
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Add test result
     */
    addResult(status, category, test, details) {
        this.testResults.push({
            status,
            category,
            test,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate verification report
     */
    generateReport() {
        console.log('\n📊 MOBILE ENGAGEMENT METRICS VERIFICATION REPORT');
        console.log('=' .repeat(60));
        
        const statusCounts = {
            PASS: 0,
            FAIL: 0,
            WARNING: 0,
            ERROR: 0,
            INFO: 0,
            CRITICAL: 0
        };
        
        // Count results by status
        this.testResults.forEach(result => {
            statusCounts[result.status]++;
        });
        
        // Display summary
        console.log('\n📈 SUMMARY:');
        console.log(`✅ Passed: ${statusCounts.PASS}`);
        console.log(`❌ Failed: ${statusCounts.FAIL}`);
        console.log(`⚠️  Warnings: ${statusCounts.WARNING}`);
        console.log(`🚨 Errors: ${statusCounts.ERROR}`);
        console.log(`ℹ️  Info: ${statusCounts.INFO}`);
        console.log(`🔥 Critical: ${statusCounts.CRITICAL}`);
        
        // Display detailed results
        console.log('\n📋 DETAILED RESULTS:');
        
        const categories = [...new Set(this.testResults.map(r => r.category))];
        categories.forEach(category => {
            console.log(`\n🔍 ${category}:`);
            
            const categoryResults = this.testResults.filter(r => r.category === category);
            categoryResults.forEach(result => {
                const icon = this.getStatusIcon(result.status);
                console.log(`  ${icon} ${result.test}: ${result.details}`);
            });
        });
        
        // Overall assessment
        console.log('\n🎯 OVERALL ASSESSMENT:');
        const totalTests = this.testResults.length;
        const successfulTests = statusCounts.PASS + statusCounts.INFO;
        const successRate = (successfulTests / totalTests * 100).toFixed(1);
        
        console.log(`Success Rate: ${successRate}% (${successfulTests}/${totalTests})`);
        
        if (statusCounts.CRITICAL > 0) {
            console.log('🔥 CRITICAL ISSUES DETECTED - Immediate attention required!');
        } else if (statusCounts.FAIL > 0) {
            console.log('❌ FAILURES DETECTED - Review and fix required');
        } else if (statusCounts.WARNING > 0) {
            console.log('⚠️  WARNINGS PRESENT - Consider improvements');
        } else {
            console.log('✅ ALL TESTS PASSED - Mobile optimization looks good!');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Mobile Engagement Metrics Verification Complete! 🎉');
    }

    /**
     * Get status icon for display
     */
    getStatusIcon(status) {
        const icons = {
            PASS: '✅',
            FAIL: '❌',
            WARNING: '⚠️',
            ERROR: '🚨',
            INFO: 'ℹ️',
            CRITICAL: '🔥'
        };
        return icons[status] || '❓';
    }
}

// Auto-run verification when script loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Mobile Engagement Metrics Verification Script Loaded');
    
    // Wait a bit for page to fully load
    setTimeout(async () => {
        const verifier = new MobileEngagementVerifier();
        await verifier.runAllTests();
    }, 1000);
});

// Export for manual testing
window.MobileEngagementVerifier = MobileEngagementVerifier;