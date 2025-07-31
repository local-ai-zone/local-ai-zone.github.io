/**
 * Search and Filtering Functionality Tests
 * Requirements: 1.1, 1.2, 6.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchEngine } from '../services/SearchEngine.js';

describe('Search Engine', () => {
  const mockModels = [
    {
      modelName: 'DialoGPT Medium',
      quantFormat: 'Q4_K_M',
      fileSize: 4200000000,
      fileSizeFormatted: '3.9 GB',
      modelType: 'DialoGPT',
      license: 'MIT',
      downloadCount: 1000,
      huggingFaceLink: 'https://huggingface.co/microsoft/DialoGPT-medium',
      directDownloadLink: 'https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/model.Q4_K_M.gguf',
      id: 'DialoGPT Medium:model.Q4_K_M.gguf',
      searchText: 'dialogpt medium dialogpt q4_k_m model.q4_k_m.gguf'
    },
    {
      modelName: 'Llama 2 7B Chat',
      quantFormat: 'F16',
      fileSize: 13000000000,
      fileSizeFormatted: '12.1 GB',
      modelType: 'LLaMA',
      license: 'Custom',
      downloadCount: 5000,
      huggingFaceLink: 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf',
      directDownloadLink: 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/resolve/main/model.F16.gguf',
      id: 'Llama 2 7B Chat:model.F16.gguf',
      searchText: 'llama 2 7b chat llama f16 model.f16.gguf'
    },
    {
      modelName: 'Mistral 7B v0.1',
      quantFormat: 'Q4_K_M',
      fileSize: 4100000000,
      fileSizeFormatted: '3.8 GB',
      modelType: 'Mistral',
      license: 'Apache 2.0',
      downloadCount: 3000,
      huggingFaceLink: 'https://huggingface.co/mistralai/Mistral-7B-v0.1',
      directDownloadLink: 'https://huggingface.co/mistralai/Mistral-7B-v0.1/resolve/main/model.Q4_K_M.gguf',
      id: 'Mistral 7B v0.1:model.Q4_K_M.gguf',
      searchText: 'mistral 7b v0.1 mistral q4_k_m model.q4_k_m.gguf'
    }
  ];

  beforeEach(() => {
    searchEngine.indexModels(mockModels);
  });

  describe('Model Indexing', () => {
    it('should index models correctly', () => {
      expect(searchEngine.models).toHaveLength(3);
      expect(searchEngine.searchIndex).toBeDefined();
    });

    it('should handle empty model array', () => {
      searchEngine.indexModels([]);
      expect(searchEngine.models).toHaveLength(0);
    });

    it('should handle invalid model data', () => {
      const invalidModels = [
        { modelId: null },
        { downloads: 'invalid' },
        null,
        undefined
      ];
      
      expect(() => {
        searchEngine.indexModels(invalidModels);
      }).not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    it('should return all models for empty query', () => {
      const results = searchEngine.search('');
      expect(results).toHaveLength(3);
    });

    it('should search by model name', () => {
      const results = searchEngine.search('llama');
      expect(results).toHaveLength(1);
      expect(results[0].model.modelName).toContain('Llama');
    });

    it('should search by organization', () => {
      const results = searchEngine.search('microsoft');
      expect(results).toHaveLength(1);
      expect(results[0].model.huggingFaceLink).toContain('microsoft');
    });

    it('should search case-insensitively', () => {
      const results1 = searchEngine.search('LLAMA');
      const results2 = searchEngine.search('llama');
      expect(results1).toHaveLength(results2.length);
    });

    it('should handle partial matches', () => {
      const results = searchEngine.search('dial');
      expect(results).toHaveLength(1);
      expect(results[0].model.modelName).toContain('DialoGPT');
    });

    it('should return results with scores', () => {
      const results = searchEngine.search('llama');
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should sort results by relevance', () => {
      const results = searchEngine.search('model');
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should handle special characters in search', () => {
      const results = searchEngine.search('7b-chat');
      expect(results).toHaveLength(1);
    });

    it('should limit results when specified', () => {
      const results = searchEngine.search('', 2);
      expect(results).toHaveLength(2);
    });
  });

  describe('Search Performance', () => {
    it('should complete search within reasonable time', () => {
      const startTime = performance.now();
      searchEngine.search('test query');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        modelName: `Test Model ${i}`,
        quantFormat: 'Q4_K_M',
        fileSize: Math.floor(Math.random() * 10000000000),
        fileSizeFormatted: '5.0 GB',
        modelType: 'Test',
        license: 'MIT',
        downloadCount: Math.floor(Math.random() * 10000),
        huggingFaceLink: `https://huggingface.co/test/model-${i}`,
        directDownloadLink: `https://huggingface.co/test/model-${i}/resolve/main/model-${i}.gguf`,
        id: `Test Model ${i}:model-${i}.gguf`,
        searchText: `test model ${i} test q4_k_m model-${i}.gguf`
      }));

      const startTime = performance.now();
      searchEngine.indexModels(largeDataset);
      const indexTime = performance.now() - startTime;

      const searchStartTime = performance.now();
      searchEngine.search('model');
      const searchTime = performance.now() - searchStartTime;

      expect(indexTime).toBeLessThan(1000); // Less than 1 second
      expect(searchTime).toBeLessThan(200); // Less than 200ms
    });
  });

  describe('Error Handling', () => {
    it('should handle null search query', () => {
      expect(() => {
        searchEngine.search(null);
      }).not.toThrow();
    });

    it('should handle undefined search query', () => {
      expect(() => {
        searchEngine.search(undefined);
      }).not.toThrow();
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      expect(() => {
        searchEngine.search(longQuery);
      }).not.toThrow();
    });
  });
});

describe('Filtering Functionality', () => {
  // Mock ModelDiscoveryApp for testing filters
  class MockModelDiscoveryApp {
    constructor() {
      this.allModels = [
        {
          modelName: 'DialoGPT Medium',
          quantFormat: 'Q4_K_M',
          fileSize: 4200000000,
          fileSizeFormatted: '3.9 GB',
          modelType: 'DialoGPT',
          downloadCount: 1000,
          huggingFaceLink: 'https://huggingface.co/microsoft/DialoGPT-medium',
          directDownloadLink: 'https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/model.Q4_K_M.gguf'
        },
        {
          modelName: 'Llama 2 7B Chat',
          quantFormat: 'F16',
          fileSize: 13000000000,
          fileSizeFormatted: '12.1 GB',
          modelType: 'LLaMA',
          downloadCount: 5000,
          huggingFaceLink: 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf',
          directDownloadLink: 'https://huggingface.co/meta-llama/Llama-2-7b-chat-hf/resolve/main/model.F16.gguf'
        },
        {
          modelName: 'Mistral 7B v0.1',
          quantFormat: 'Q4_K_M',
          fileSize: 4100000000,
          fileSizeFormatted: '3.8 GB',
          modelType: 'Mistral',
          downloadCount: 3000,
          huggingFaceLink: 'https://huggingface.co/mistralai/Mistral-7B-v0.1',
          directDownloadLink: 'https://huggingface.co/mistralai/Mistral-7B-v0.1/resolve/main/model.Q4_K_M.gguf'
        }
      ];
      this.activeFilters = {
        quantization: '',
        architecture: '',
        sizeRange: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    }



    applyAdditionalFilters(models) {
      return models.filter(model => {
        // Quantization filter using workflow format
        if (this.activeFilters.quantization) {
          if (model.quantFormat !== this.activeFilters.quantization) {
            return false;
          }
        }

        // Architecture filter using workflow format  
        if (this.activeFilters.architecture) {
          if (model.modelType !== this.activeFilters.architecture) {
            return false;
          }
        }

        // Size range filter using workflow format
        if (this.activeFilters.sizeRange) {
          const sizeGB = model.fileSize / (1024 * 1024 * 1024);
          let matchesSize = false;
          
          switch (this.activeFilters.sizeRange) {
            case 'small':
              matchesSize = sizeGB <= 4;
              break;
            case 'medium':
              matchesSize = sizeGB > 4 && sizeGB <= 8;
              break;
            case 'large':
              matchesSize = sizeGB > 8;
              break;
            default:
              matchesSize = true;
          }
          
          if (!matchesSize) return false;
        }

        return true;
      });
    }
  }

  let app;

  beforeEach(() => {
    app = new MockModelDiscoveryApp();
  });

  describe('Quantization Filtering', () => {
    it('should filter by Q4_K_M quantization', () => {
      app.activeFilters.quantization = 'Q4_K_M';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(2); // DialoGPT and Mistral have Q4_K_M
    });

    it('should filter by F16 quantization', () => {
      app.activeFilters.quantization = 'F16';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1); // Only Llama has F16
    });

    it('should filter by F16 quantization', () => {
      app.activeFilters.quantization = 'F16';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1); // Only Llama has F16
    });

    it('should return empty for non-existent quantization', () => {
      app.activeFilters.quantization = 'Q1_0';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Architecture Filtering', () => {
    it('should filter by LLaMA architecture', () => {
      app.activeFilters.architecture = 'LLaMA';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].modelName).toContain('Llama');
    });

    it('should filter by Mistral architecture', () => {
      app.activeFilters.architecture = 'Mistral';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].modelName).toContain('Mistral');
    });

    it('should filter by DialoGPT architecture', () => {
      app.activeFilters.architecture = 'DialoGPT';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].modelName).toContain('DialoGPT');
    });
  });

  describe('Size Range Filtering', () => {
    it('should filter small models (≤4GB)', () => {
      app.activeFilters.sizeRange = 'small';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(2); // DialoGPT and Mistral are ≤4GB
    });

    it('should filter medium models (4-8GB)', () => {
      app.activeFilters.sizeRange = 'medium';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(0); // No models in 4-8GB range
    });

    it('should filter large models (>8GB)', () => {
      app.activeFilters.sizeRange = 'large';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1); // Llama is >8GB
    });
  });

  describe('Combined Filtering', () => {
    it('should apply multiple filters correctly', () => {
      app.activeFilters.architecture = 'LLaMA';
      app.activeFilters.quantization = 'F16';
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].modelName).toContain('Llama');
    });

    it('should return empty when filters conflict', () => {
      app.activeFilters.architecture = 'LLaMA';
      app.activeFilters.quantization = 'Q4_K_M'; // Llama doesn't have Q4_K_M in our test data
      const filtered = app.applyAdditionalFilters(app.allModels);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Filter Performance', () => {
    it('should filter large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        modelName: `Test Model ${i}`,
        quantFormat: 'Q4_K_M',
        fileSize: Math.floor(Math.random() * 10000000000),
        fileSizeFormatted: '5.0 GB',
        modelType: 'Test',
        downloadCount: Math.floor(Math.random() * 10000),
        huggingFaceLink: `https://huggingface.co/test/model-${i}`,
        directDownloadLink: `https://huggingface.co/test/model-${i}/resolve/main/model-${i}.Q4_K_M.gguf`
      }));

      app.allModels = largeDataset;
      app.activeFilters.quantization = 'Q4_K_M';

      const startTime = performance.now();
      const filtered = app.applyAdditionalFilters(app.allModels);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(filtered).toHaveLength(1000);
    });
  });
});