#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Local banner update script
 * Mimics the GitHub workflow for local development
 */
class LocalBannerUpdater {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
    }

    /**
     * Execute command and log output
     */
    exec(command, description) {
        console.log(`🔄 ${description}...`);
        try {
            const output = execSync(command, { 
                cwd: this.rootDir, 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            if (output.trim()) {
                console.log(output.trim());
            }
            return true;
        } catch (error) {
            console.error(`❌ ${description} failed:`, error.message);
            return false;
        }
    }

    /**
     * Get current statistics
     */
    getStatistics() {
        try {
            const modelsPath = path.join(this.rootDir, 'gguf_models.json');
            const data = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
            const count = data.length;
            const formatted = count >= 1000 ? Math.floor(count / 1000) + 'K+' : count + '+';
            const currentDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            return {
                modelCount: formatted,
                totalModels: count,
                currentDate: currentDate
            };
        } catch (error) {
            console.warn('⚠️  Could not read model statistics, using defaults');
            return {
                modelCount: '40K+',
                totalModels: 40000,
                currentDate: new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            };
        }
    }

    /**
     * Check if banner files exist and get their info
     */
    checkBannerFiles() {
        const files = ['og-image.png', 'og-image-fallback.png'];
        const results = {};
        
        for (const file of files) {
            const filePath = path.join(this.rootDir, file);
            try {
                const stats = fs.statSync(filePath);
                results[file] = {
                    exists: true,
                    size: Math.round(stats.size / 1024) + ' KB',
                    modified: stats.mtime.toLocaleString()
                };
            } catch (error) {
                results[file] = {
                    exists: false,
                    size: 'N/A',
                    modified: 'N/A'
                };
            }
        }
        
        return results;
    }

    /**
     * Run the complete banner update process
     */
    async updateBanner() {
        console.log('🎨 Starting local banner update...\n');
        
        // Get current statistics
        const stats = this.getStatistics();
        console.log('📊 Current Statistics:');
        console.log(`   Models: ${stats.modelCount} (${stats.totalModels} total)`);
        console.log(`   Date: ${stats.currentDate}\n`);
        
        // Check existing banner files
        const beforeFiles = this.checkBannerFiles();
        console.log('📁 Current Banner Files:');
        for (const [file, info] of Object.entries(beforeFiles)) {
            const status = info.exists ? `✅ ${info.size}` : '❌ Missing';
            console.log(`   ${file}: ${status}`);
        }
        console.log('');
        
        // Generate new banner
        if (!this.exec('node scripts/generate-banner.js', 'Generating main banner')) {
            return false;
        }
        
        // Create fallback banner
        if (!this.exec('node scripts/create-fallback-banner.js', 'Creating fallback banner')) {
            return false;
        }
        
        // Validate setup
        if (!this.exec('node scripts/validate-banner-setup.js', 'Validating banner setup')) {
            return false;
        }
        
        // Check updated banner files
        const afterFiles = this.checkBannerFiles();
        console.log('\n📁 Updated Banner Files:');
        for (const [file, info] of Object.entries(afterFiles)) {
            const status = info.exists ? `✅ ${info.size}` : '❌ Missing';
            const changed = beforeFiles[file].modified !== info.modified ? ' (Updated)' : ' (Unchanged)';
            console.log(`   ${file}: ${status}${changed}`);
        }
        
        console.log('\n🎉 Banner update completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   • Review the generated og-image.png file');
        console.log('   • Test the banner in social media preview tools');
        console.log('   • Commit the changes if satisfied');
        
        return true;
    }
}

/**
 * CLI interface
 */
async function main() {
    const updater = new LocalBannerUpdater();
    
    try {
        const success = await updater.updateBanner();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Export for testing
module.exports = LocalBannerUpdater;

// Run if called directly
if (require.main === module) {
    main();
}