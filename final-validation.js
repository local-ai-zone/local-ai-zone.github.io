#!/usr/bin/env node

/**
 * Final GitHub Pages Deployment Validation
 * ========================================
 * Comprehensive validation that simulates the complete deployment process
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'pipe',
            shell: true,
            ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function validateBuildProcess() {
    log('\n🏗️  Testing build process...', 'blue');
    
    try {
        // Clean previous build
        if (fs.existsSync('dist')) {
            fs.rmSync('dist', { recursive: true, force: true });
            log('🧹 Cleaned previous build', 'yellow');
        }
        
        // Run build
        log('📦 Running build...', 'blue');
        const buildResult = await runCommand('npm', ['run', 'build']);
        
        if (buildResult.stdout.includes('built in') || fs.existsSync('dist/index.html')) {
            log('✅ Build completed successfully', 'green');
        } else {
            log('❌ Build may have failed', 'red');
            return false;
        }
        
        // Verify build output
        const requiredFiles = [
            'dist/index.html',
            'dist/assets'
        ];
        
        let allFilesExist = true;
        requiredFiles.forEach(file => {
            if (fs.existsSync(file)) {
                log(`✅ ${file} exists`, 'green');
            } else {
                log(`❌ ${file} missing`, 'red');
                allFilesExist = false;
            }
        });
        
        return allFilesExist;
        
    } catch (error) {
        log(`❌ Build failed: ${error.message}`, 'red');
        return false;
    }
}

function validateStaticFiles() {
    log('\n📁 Validating static files...', 'blue');
    
    const staticFiles = [
        { path: '.nojekyll', required: true, description: 'Disables Jekyll processing' },
        { path: '404.html', required: true, description: 'Custom 404 page' },
        { path: 'robots.txt', required: false, description: 'Search engine directives' },
        { path: 'sitemap.xml', required: false, description: 'SEO sitemap' },
        { path: 'CNAME', required: false, description: 'Custom domain configuration' }
    ];
    
    let issues = 0;
    
    staticFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            log(`✅ ${file.path} - ${file.description}`, 'green');
        } else {
            if (file.required) {
                log(`❌ ${file.path} missing - ${file.description}`, 'red');
                issues++;
            } else {
                log(`ℹ️  ${file.path} not found - ${file.description}`, 'blue');
            }
        }
    });
    
    return issues === 0;
}

function validateWorkflows() {
    log('\n🔄 Validating GitHub Actions workflows...', 'blue');
    
    const workflows = [
        {
            path: '.github/workflows/deploy-pages.yml',
            description: 'Main deployment workflow',
            required: true
        },
        {
            path: '.github/workflows/update-gguf-models.yml',
            description: 'Data update workflow',
            required: true
        },
        {
            path: '.github/workflows/deployment-notifications.yml',
            description: 'Deployment notifications',
            required: false
        }
    ];
    
    let issues = 0;
    
    workflows.forEach(workflow => {
        if (fs.existsSync(workflow.path)) {
            log(`✅ ${workflow.path} - ${workflow.description}`, 'green');
            
            // Basic YAML validation
            const content = fs.readFileSync(workflow.path, 'utf8');
            if (content.includes('name:') && content.includes('on:') && content.includes('jobs:')) {
                log(`  ✅ Valid workflow structure`, 'green');
            } else {
                log(`  ⚠️  Workflow structure may be invalid`, 'yellow');
            }
        } else {
            if (workflow.required) {
                log(`❌ ${workflow.path} missing - ${workflow.description}`, 'red');
                issues++;
            } else {
                log(`ℹ️  ${workflow.path} not found - ${workflow.description}`, 'blue');
            }
        }
    });
    
    return issues === 0;
}

function validateSecurity() {
    log('\n🔒 Validating security configuration...', 'blue');
    
    // Check for sensitive information
    const sensitivePatterns = [
        { pattern: /password\s*[:=]\s*['"]\w+['"]/, description: 'Hardcoded passwords' },
        { pattern: /secret\s*[:=]\s*['"]\w+['"]/, description: 'Hardcoded secrets' },
        { pattern: /api[_-]?key\s*[:=]\s*['"]\w+['"]/, description: 'API keys' },
        { pattern: /token\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/, description: 'Access tokens' }
    ];
    
    const filesToCheck = ['index.html', 'main.js', 'package.json'];
    let securityIssues = 0;
    
    filesToCheck.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            
            sensitivePatterns.forEach(({ pattern, description }) => {
                if (pattern.test(content)) {
                    log(`⚠️  Found ${description} in ${file}`, 'yellow');
                    securityIssues++;
                }
            });
        }
    });
    
    if (securityIssues === 0) {
        log('✅ No sensitive information found in source files', 'green');
    }
    
    // Check HTTPS usage
    const httpPattern = /http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org)/g;
    let httpIssues = 0;
    
    filesToCheck.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const matches = content.match(httpPattern);
            
            if (matches) {
                log(`⚠️  Found HTTP URLs in ${file}: ${matches.length} instances`, 'yellow');
                httpIssues++;
            }
        }
    });
    
    if (httpIssues === 0) {
        log('✅ All external URLs use HTTPS', 'green');
    }
    
    return securityIssues === 0 && httpIssues === 0;
}

function validatePerformance() {
    log('\n⚡ Validating performance optimization...', 'blue');
    
    if (!fs.existsSync('dist')) {
        log('⚠️  No build output found - run build first', 'yellow');
        return false;
    }
    
    // Check bundle sizes
    const assetsDir = 'dist/assets';
    if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const cssFiles = files.filter(f => f.endsWith('.css'));
        
        log(`📊 Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files`, 'blue');
        
        // Check individual file sizes
        let totalSize = 0;
        let largeFiles = 0;
        
        [...jsFiles, ...cssFiles].forEach(file => {
            const filePath = path.join(assetsDir, file);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            totalSize += stats.size;
            
            if (sizeKB > 500) { // 500KB threshold
                log(`⚠️  Large file: ${file} (${sizeKB}KB)`, 'yellow');
                largeFiles++;
            } else {
                log(`✅ ${file} (${sizeKB}KB)`, 'green');
            }
        });
        
        const totalSizeKB = Math.round(totalSize / 1024);
        log(`📦 Total assets size: ${totalSizeKB}KB`, 'blue');
        
        if (totalSizeKB > 2048) { // 2MB threshold
            log('⚠️  Total bundle size is large (>2MB)', 'yellow');
        } else {
            log('✅ Bundle size is reasonable', 'green');
        }
        
        return largeFiles === 0;
    } else {
        log('⚠️  No assets directory found', 'yellow');
        return false;
    }
}

function validateSEO() {
    log('\n🔍 Validating SEO optimization...', 'blue');
    
    // Check HTML files for SEO elements
    const htmlFiles = ['index.html', '404.html'];
    let seoIssues = 0;
    
    htmlFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for essential SEO elements
            const seoElements = [
                { pattern: /<title>/, description: 'Title tag' },
                { pattern: /<meta\s+name="description"/, description: 'Meta description' },
                { pattern: /<meta\s+name="viewport"/, description: 'Viewport meta tag' },
                { pattern: /<meta\s+property="og:title"/, description: 'Open Graph title' },
                { pattern: /<meta\s+property="og:description"/, description: 'Open Graph description' }
            ];
            
            log(`\n📄 Checking ${file}:`, 'blue');
            
            seoElements.forEach(({ pattern, description }) => {
                if (pattern.test(content)) {
                    log(`  ✅ ${description}`, 'green');
                } else {
                    log(`  ⚠️  Missing ${description}`, 'yellow');
                    seoIssues++;
                }
            });
        }
    });
    
    // Check for sitemap and robots.txt
    if (fs.existsSync('sitemap.xml')) {
        log('✅ Sitemap.xml exists', 'green');
    } else {
        log('⚠️  Sitemap.xml missing', 'yellow');
        seoIssues++;
    }
    
    if (fs.existsSync('robots.txt')) {
        log('✅ Robots.txt exists', 'green');
    } else {
        log('⚠️  Robots.txt missing', 'yellow');
        seoIssues++;
    }
    
    return seoIssues === 0;
}

async function main() {
    log('🚀 Final GitHub Pages Deployment Validation', 'cyan');
    log('===========================================', 'cyan');
    
    const results = {
        staticFiles: false,
        workflows: false,
        build: false,
        security: false,
        performance: false,
        seo: false
    };
    
    // Run all validations
    results.staticFiles = validateStaticFiles();
    results.workflows = validateWorkflows();
    results.build = await validateBuildProcess();
    results.security = validateSecurity();
    results.performance = validatePerformance();
    results.seo = validateSEO();
    
    // Summary
    log('\n📋 Validation Results', 'cyan');
    log('====================', 'cyan');
    
    const checks = [
        { name: 'Static Files', result: results.staticFiles },
        { name: 'GitHub Workflows', result: results.workflows },
        { name: 'Build Process', result: results.build },
        { name: 'Security', result: results.security },
        { name: 'Performance', result: results.performance },
        { name: 'SEO', result: results.seo }
    ];
    
    let passedChecks = 0;
    
    checks.forEach(check => {
        if (check.result) {
            log(`✅ ${check.name}`, 'green');
            passedChecks++;
        } else {
            log(`❌ ${check.name}`, 'red');
        }
    });
    
    const score = Math.round((passedChecks / checks.length) * 100);
    
    log(`\n📊 Overall Score: ${score}%`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
    
    if (score === 100) {
        log('\n🎉 Perfect! Your site is fully ready for GitHub Pages deployment.', 'green');
    } else if (score >= 80) {
        log('\n👍 Good! Your site is ready for deployment with minor improvements needed.', 'yellow');
    } else {
        log('\n⚠️  Your site needs improvements before deployment.', 'red');
    }
    
    log('\n📚 Deployment Checklist:', 'blue');
    log('1. ✅ All files validated', passedChecks === checks.length ? 'green' : 'yellow');
    log('2. 📤 Commit and push to GitHub', 'reset');
    log('3. ⚙️  Enable GitHub Pages in repository settings', 'reset');
    log('4. 🔄 Monitor GitHub Actions for deployment', 'reset');
    log('5. 🌐 Test the live site', 'reset');
    
    log('\n✨ Validation complete!', 'cyan');
    
    return score >= 80 ? 0 : 1;
}

// Run the validation
main().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    log(`❌ Validation failed: ${error.message}`, 'red');
    process.exit(1);
});