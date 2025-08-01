#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Configuration
const FILE_MAPPINGS = {
  'README.md': 'Home',
  'docs/API.md': 'API-Documentation',
  'docs/DEPLOYMENT.md': 'Deployment-Guide',
  'docs/CONTRIBUTING.md': 'Contributing-Guide',
  'docs/ARCHITECTURE.md': 'Architecture-Documentation'
};

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000 // 1 second
};

class WikiSyncer {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    
    const [owner, repo] = process.env.REPOSITORY.split('/');
    this.owner = owner;
    this.repo = repo;
    
    this.changedFiles = process.env.CHANGED_FILES ? 
      process.env.CHANGED_FILES.split(' ') : [];
      
    this.results = {
      updated: [],
      created: [],
      errors: []
    };
  }

  async sync() {
    console.log('🚀 Starting wiki synchronization...');
    console.log(`Repository: ${this.owner}/${this.repo}`);
    console.log(`Changed files: ${this.changedFiles.join(', ')}`);
    
    for (const filePath of this.changedFiles) {
      if (FILE_MAPPINGS[filePath]) {
        await this.processFile(filePath);
      } else {
        console.log(`⏭️  Skipping ${filePath} (not in mapping)`);
      }
    }
    
    this.printSummary();
  }

  async processFile(filePath) {
    try {
      console.log(`\n📄 Processing ${filePath}...`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File ${filePath} not found, skipping`);
        return;
      }
      
      const wikiPageName = FILE_MAPPINGS[filePath];
      const content = fs.readFileSync(filePath, 'utf8');
      const processedContent = this.processContent(content, filePath);
      
      await this.updateWikiPage(wikiPageName, processedContent, filePath);
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      this.results.errors.push({ file: filePath, error: error.message });
    }
  }

  processContent(content, filePath) {
    let processed = content;
    
    // Add header with source information
    const timestamp = new Date().toISOString().split('T')[0];
    const header = `> **📝 Auto-generated from [\`${filePath}\`](https://github.com/${this.owner}/${this.repo}/blob/main/${filePath})** | Last updated: ${timestamp}\n\n`;
    
    processed = header + processed;
    
    // Transform relative links to other documentation files
    processed = processed.replace(
      /\[([^\]]+)\]\(docs\/([^)]+\.md)\)/g,
      (match, text, docFile) => {
        const targetPage = FILE_MAPPINGS[`docs/${docFile}`];
        if (targetPage) {
          return `[${text}](${targetPage})`;
        }
        return `[${text}](https://github.com/${this.owner}/${this.repo}/blob/main/docs/${docFile})`;
      }
    );
    
    // Transform relative links to README
    processed = processed.replace(
      /\[([^\]]+)\]\(README\.md\)/g,
      `[$1](Home)`
    );
    
    // Transform relative links to code files
    processed = processed.replace(
      /\[([^\]]+)\]\((?!https?:\/\/)(?!#)([^)]+)\)/g,
      `[$1](https://github.com/${this.owner}/${this.repo}/blob/main/$2)`
    );
    
    // Fix image links to use raw GitHub URLs
    processed = processed.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      `![$1](https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/$2)`
    );
    
    return processed;
  }

  async updateWikiPage(pageName, content, sourceFile) {
    const retryOperation = async (operation, attempt = 1) => {
      try {
        return await operation();
      } catch (error) {
        if (attempt < RETRY_CONFIG.maxRetries && this.isRetryableError(error)) {
          const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry ${attempt}/${RETRY_CONFIG.maxRetries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return retryOperation(operation, attempt + 1);
        }
        throw error;
      }
    };

    try {
      // Check if page exists
      let existingPage = null;
      try {
        const response = await retryOperation(() => 
          this.octokit.rest.gists.get({
            gist_id: `${this.owner}.github.io.wiki.git`
          })
        );
        // This is a workaround - GitHub doesn't provide direct wiki API
        // We'll use the simpler approach of always creating/updating
      } catch (error) {
        // Page doesn't exist or API limitation
      }

      // Use GitHub's wiki git repository approach
      await retryOperation(() => this.updateViaGitAPI(pageName, content));
      
      console.log(`✅ Successfully updated wiki page: ${pageName}`);
      this.results.updated.push({ page: pageName, file: sourceFile });
      
    } catch (error) {
      console.error(`❌ Failed to update ${pageName}:`, error.message);
      this.results.errors.push({ 
        file: sourceFile, 
        page: pageName, 
        error: error.message 
      });
    }
  }

  async updateViaGitAPI(pageName, content) {
    // GitHub Wiki pages are stored in a separate git repository
    // We'll create a commit to the wiki repository
    const wikiRepo = `${this.repo}.wiki`;
    const fileName = `${pageName}.md`;
    
    try {
      // Get current file SHA if it exists
      let currentSha = null;
      try {
        const { data: currentFile } = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: wikiRepo,
          path: fileName
        });
        currentSha = currentFile.sha;
      } catch (error) {
        // File doesn't exist, that's okay
      }

      // Create or update the file
      const commitMessage = currentSha ? 
        `Update ${pageName} from documentation sync` : 
        `Create ${pageName} from documentation sync`;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: wikiRepo,
        path: fileName,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        sha: currentSha
      });

    } catch (error) {
      // If wiki repo doesn't exist or isn't accessible, try alternative approach
      if (error.status === 404) {
        console.log(`⚠️  Wiki repository not found. Please ensure the wiki is initialized.`);
        console.log(`   Visit: https://github.com/${this.owner}/${this.repo}/wiki`);
        throw new Error(`Wiki repository ${wikiRepo} not accessible. Please initialize the wiki first.`);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    // Retry on network errors, rate limits, and server errors
    return error.status >= 500 || 
           error.status === 403 || // Rate limit
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNRESET';
  }

  printSummary() {
    console.log('\n📊 Wiki Sync Summary:');
    console.log('='.repeat(50));
    
    if (this.results.updated.length > 0) {
      console.log('\n✅ Updated Pages:');
      this.results.updated.forEach(({ page, file }) => {
        console.log(`   • ${page} (from ${file})`);
      });
    }
    
    if (this.results.created.length > 0) {
      console.log('\n🆕 Created Pages:');
      this.results.created.forEach(({ page, file }) => {
        console.log(`   • ${page} (from ${file})`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(({ file, page, error }) => {
        console.log(`   • ${file}${page ? ` → ${page}` : ''}: ${error}`);
      });
      process.exit(1);
    }
    
    console.log(`\n🎉 Successfully processed ${this.results.updated.length + this.results.created.length} pages`);
    console.log(`📖 View wiki: https://github.com/${this.owner}/${this.repo}/wiki`);
  }
}

// Main execution
async function main() {
  try {
    const syncer = new WikiSyncer();
    await syncer.sync();
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WikiSyncer;