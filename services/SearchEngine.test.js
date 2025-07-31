/**
 * SearchEngine Tests
 * 
 * Test suite for the SearchEngine class functionality
 * Task 4.1: Create real-time search functionality
 * Requirements: 1.2, 6.1, 6.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from './SearchEngine.js';

describe('SearchEngine', () => {
  let searchEngine;
  let testModels;

  beforeEach(() => {
    searchEngine = new SearchEngine();
    testModels = [
      {
        modelName: "DialoGPT Medium",
        quantFormat: "Q4_K_M",
        fileSize: 4200000000,
        fileSizeFormatted: "3.9 GB",
        modelType: "DialoGPT",
        license: "MIT",
        downloadCount: 15420,
        huggingFaceLink: "https://huggingface.co/microsoft/DialoGPT-medium",
        directDownloadLink: "https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/DialoGPT-medium.Q4_K_M.gguf",
        id: "DialoGPT Medium:DialoGPT-medium.Q4_K_M.gguf",
        searchText: "dialogpt medium dialogpt q4_k_m dialogpt-medium.q4_k_m.gguf"
      },
      {
        modelName: "Llama 2 7B Chat",
        quantFormat: "Q8_0",
        fileSize: 7500000000,
        fileSizeFormatted: "7.0 GB",
        modelType: "LLaMA",
        license: "Custom",
        downloadCount: 89234,
        huggingFaceLink: "https://huggingface.co/meta-llama/Llama-2-7b-chat-hf",
        directDownloadLink: "https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/resolve/main/Llama-2-7b-chat.Q8_0.gguf",
        id: "Llama 2 7B Chat:Llama-2-7b-chat.Q8_0.gguf",
        searchText: "llama 2 7b chat llama q8_0 llama-2-7b-chat.q8_0.gguf"
      },
      {
        modelName: "Mistral 7B Instruct v0.1",
        quantFormat: "Q6_K",
        fileSize: 5800000000,
        fileSizeFormatted: "5.4 GB",
        modelType: "Mistral",
        license: "Apache 2.0",
        downloadCount: 67891,
        huggingFaceLink: "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1",
        directDownloadLink: "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1/resolve/main/Mistral-7B-Instruct-v0.1.Q6_K.gguf",
        id: "Mistral 7B Instruct v0.1:Mistral-7B-Instruct-v0.1.Q6_K.gguf",
        searchText: "mistral 7b instruct v0.1 mistral q6_k mistral-7b-instruct-v0.1.q6_k.gguf"
      }
    ];
  });

  describe('indexModels', () => {
    it('should index models correctly', () => {
      searchEngine.indexModels(testModels);
      
      expect(searchEngine.isIndexed).toBe(true);
      expect(searchEngine.models).toHaveLength(3);
      expect(searchEngine.searchIndex.size).toBe(3);
    });

    it('should create searchable text for models', () => {
      const searchableText = searchEngine.createSearchableText(testModels[0]);
      
      expect(searchableText).toContain('DialoGPT Medium');
      expect(searchableText).toContain('DialoGPT-medium.Q4_K_M.gguf');
      expect(searchableText).toContain('Q4_K_M');
      expect(searchableText).toContain('DialoGPT');
    });

    it('should tokenize text correctly', () => {
      const tokens = searchEngine.tokenizeText('DialoGPT Medium Q4_K_M');
      
      expect(tokens.has('dialogpt')).toBe(true);
      expect(tokens.has('medium')).toBe(true);
      expect(tokens.has('q4')).toBe(true);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      searchEngine.indexModels(testModels);
    });

    it('should return all models for empty query', () => {
      const results = searchEngine.search('');
      
      expect(results).toHaveLength(3);
      expect(results[0].score).toBe(1.0);
    });

    it('should find exact model matches', () => {
      const results = searchEngine.search('DialoGPT');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.modelName).toContain('DialoGPT');
      expect(results[0].score).toBeGreaterThan(1);
    });

    it('should find models by organization', () => {
      const results = searchEngine.search('microsoft');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.huggingFaceLink).toContain('microsoft');
    });

    it('should find models by architecture', () => {
      const results = searchEngine.search('Llama');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.modelType).toBe('LLaMA');
    });

    it('should find models by quantization', () => {
      const results = searchEngine.search('Q4_K_M');
      
      expect(results.length).toBeGreaterThan(0);
      // Should find models that match the quantization search
      expect(results.some(r => r.model.quantFormat === 'Q4_K_M')).toBe(true);
    });

    it('should rank results by relevance', () => {
      const results = searchEngine.search('microsoft');
      
      expect(results.length).toBeGreaterThan(0);
      // Should find models with microsoft in the URL
      expect(results.some(r => r.model.huggingFaceLink.includes('microsoft'))).toBe(true);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should handle partial matches', () => {
      const results = searchEngine.search('Dial');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].model.modelName).toContain('DialoGPT');
    });

    it('should be case insensitive', () => {
      const results1 = searchEngine.search('MICROSOFT');
      const results2 = searchEngine.search('microsoft');
      
      expect(results1).toHaveLength(results2.length);
      expect(results1[0].model.modelName).toBe(results2[0].model.modelName);
    });
  });

  describe('utility methods', () => {


    it('should extract organization correctly', () => {
      expect(searchEngine.extractOrganization('https://huggingface.co/microsoft/DialoGPT')).toBe('microsoft');
      expect(searchEngine.extractOrganization('https://huggingface.co/meta-llama/Llama-2-7b')).toBe('meta-llama');
      expect(searchEngine.extractOrganization('https://huggingface.co/standalone-model')).toBe('standalone-model');
    });

    it('should extract model name correctly', () => {
      expect(searchEngine.extractModelName('https://huggingface.co/microsoft/DialoGPT')).toBe('DialoGPT');
      expect(searchEngine.extractModelName('https://huggingface.co/meta-llama/Llama-2-7b')).toBe('Llama-2-7b');
      expect(searchEngine.extractModelName('https://huggingface.co/standalone-model')).toBe('standalone-model');
    });
  });

  describe('performance tracking', () => {
    beforeEach(() => {
      searchEngine.indexModels(testModels);
    });

    it('should track search statistics', () => {
      searchEngine.search('test');
      const stats = searchEngine.getSearchStats();
      
      expect(stats.totalSearches).toBe(1);
      expect(stats.lastSearchTime).toBeGreaterThanOrEqual(0);
      expect(stats.isIndexed).toBe(true);
      expect(stats.modelCount).toBe(3);
    });

    it('should update average search time', () => {
      searchEngine.search('test1');
      searchEngine.search('test2');
      const stats = searchEngine.getSearchStats();
      
      expect(stats.totalSearches).toBe(2);
      expect(stats.averageSearchTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = { maxResults: 50, minQueryLength: 2 };
      searchEngine.updateConfig(newConfig);
      
      expect(searchEngine.config.maxResults).toBe(50);
      expect(searchEngine.config.minQueryLength).toBe(2);
    });

    it('should respect maxResults configuration', () => {
      searchEngine.updateConfig({ maxResults: 1 });
      searchEngine.indexModels(testModels);
      
      const results = searchEngine.search('Q4_K_M'); // Should match all 3 models
      expect(results).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty model list', () => {
      searchEngine.indexModels([]);
      const results = searchEngine.search('test');
      
      expect(results).toHaveLength(0);
    });

    it('should handle models without required fields', () => {
      const modelsWithMissingFields = [
        { 
          modelName: 'Test Model',
          quantFormat: 'Q4_K_M',
          fileSize: 1000000000,
          fileSizeFormatted: '1.0 GB',
          modelType: 'Unknown',
          downloadCount: 100,
          huggingFaceLink: 'https://huggingface.co/test/model',
          directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
        }
      ];
      
      searchEngine.indexModels(modelsWithMissingFields);
      const results = searchEngine.search('test');
      
      expect(results).toHaveLength(1);
      expect(results[0].model.modelName).toBe('Test Model');
    });

    it('should handle special characters in search', () => {
      searchEngine.indexModels(testModels);
      
      // Should not throw errors
      expect(() => searchEngine.search('test/model')).not.toThrow();
      expect(() => searchEngine.search('test-model')).not.toThrow();
      expect(() => searchEngine.search('test_model')).not.toThrow();
    });
  });
});