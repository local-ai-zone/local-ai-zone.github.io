#!/usr/bin/env node

/**
 * Test script for wiki synchronization
 * This script helps test the wiki sync functionality locally
 */

const WikiSyncer = require('./sync-docs-to-wiki.js');

// Mock environment variables for testing
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your-token-here';
process.env.REPOSITORY = process.env.REPOSITORY || 'your-owner/your-repo';
process.env.CHANGED_FILES = process.env.CHANGED_FILES || 'README.md docs/API.md';

async function testWikiSync() {
  console.log('🧪 Testing Wiki Sync Functionality');
  console.log('=====================================');
  
  // Check environment
  if (!process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN === 'your-token-here') {
    console.log('❌ Please set GITHUB_TOKEN environment variable');
    console.log('   export GITHUB_TOKEN=your_github_token');
    process.exit(1);
  }
  
  if (!process.env.REPOSITORY || process.env.REPOSITORY === 'your-owner/your-repo') {
    console.log('❌ Please set REPOSITORY environment variable');
    console.log('   export REPOSITORY=owner/repo');
    process.exit(1);
  }
  
  console.log(`📊 Configuration:`);
  console.log(`   Repository: ${process.env.REPOSITORY}`);
  console.log(`   Changed files: ${process.env.CHANGED_FILES}`);
  console.log(`   Token: ${process.env.GITHUB_TOKEN.substring(0, 8)}...`);
  
  try {
    const syncer = new WikiSyncer();
    await syncer.sync();
    console.log('\n✅ Wiki sync test completed successfully!');
  } catch (error) {
    console.error('\n❌ Wiki sync test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testWikiSync();
}