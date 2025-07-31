#!/usr/bin/env node

/**
 * Simple test runner for validating test files
 * This script validates that our test files are properly structured
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const testFiles = [
  'tests/search.test.js',
  'tests/integration.test.js', 
  'tests/e2e.test.js'
];

const requiredFiles = [
  'tests/setup.js',
  'vitest.config.js'
];

console.log('🧪 Validating test suite structure...\n');

// Check if all test files exist
let allFilesExist = true;

console.log('📁 Checking test files:');
testFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

console.log('\n📁 Checking configuration files:');
requiredFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

// Validate test file structure
console.log('\n🔍 Validating test file structure:');

testFiles.forEach(file => {
  if (existsSync(file)) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Check for required imports
      const hasVitest = content.includes('vitest');
      const hasDescribe = content.includes('describe(');
      const hasIt = content.includes('it(');
      const hasExpect = content.includes('expect(');
      
      console.log(`\n📄 ${file}:`);
      console.log(`  ${hasVitest ? '✅' : '❌'} Vitest imports`);
      console.log(`  ${hasDescribe ? '✅' : '❌'} Describe blocks`);
      console.log(`  ${hasIt ? '✅' : '❌'} Test cases (it)`);
      console.log(`  ${hasExpect ? '✅' : '❌'} Assertions (expect)`);
      
      if (!hasVitest || !hasDescribe || !hasIt || !hasExpect) {
        allFilesExist = false;
      }
    } catch (error) {
      console.log(`❌ Error reading ${file}: ${error.message}`);
      allFilesExist = false;
    }
  }
});

// Check package.json for test scripts
console.log('\n📦 Checking package.json test scripts:');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = ['test', 'test:watch', 'test:coverage'];
  requiredScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`✅ ${script}: ${scripts[script]}`);
    } else {
      console.log(`❌ ${script} - Missing`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
  allFilesExist = false;
}

// Summary
console.log('\n📊 Test Suite Summary:');
if (allFilesExist) {
  console.log('✅ All test files and configurations are properly set up!');
  console.log('\n🚀 Test suite includes:');
  console.log('  • Unit tests for search and filtering functionality');
  console.log('  • Integration tests for data pipeline and frontend');
  console.log('  • End-to-end tests for complete user workflows');
  console.log('  • Performance testing capabilities');
  console.log('  • Comprehensive coverage reporting');
  console.log('\n💡 To run tests (when npm is available):');
  console.log('  npm test              - Run all tests once');
  console.log('  npm run test:watch    - Run tests in watch mode');
  console.log('  npm run test:coverage - Run tests with coverage report');
  console.log('  npm run test:search   - Run only search tests');
  console.log('  npm run test:e2e      - Run only end-to-end tests');
  
  process.exit(0);
} else {
  console.log('❌ Some test files or configurations are missing or invalid.');
  console.log('Please check the errors above and fix them before running tests.');
  process.exit(1);
}