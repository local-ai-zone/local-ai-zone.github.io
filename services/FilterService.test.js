import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from './FilterService.js';

describe('FilterService', () => {
  let filterService;
  let mockModels;

  beforeEach(() => {
    filterService = new FilterService();
    
    // Create mock models for testing - using workflow format
    mockModels = [
      {
        modelName: 'Mistral 7B Instruct v0.2',
        quantFormat: 'Q4_K_M',
        fileSize: 4 * 1024 * 1024 * 1024, // 4GB
        fileSizeFormatted: '4.0 GB',
        modelType: 'Mistral',
        license: 'Apache 2.0',
        downloadCount: 1500,
        huggingFaceLink: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2',
        directDownloadLink: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
        // Computed fields added by DataService
        id: 'Mistral 7B Instruct v0.2:mistral-7b-instruct-v0.2.Q4_K_M.gguf',
        searchText: 'mistral 7b instruct v0.2 mistral q4_k_m mistral-7b-instruct-v0.2.q4_k_m.gguf',
        tags: ['🔥 Popular', '🧠 7B']
      },
      {
        modelName: 'Llama 2 13B Chat',
        quantFormat: 'Q8_0',
        fileSize: 14 * 1024 * 1024 * 1024, // 14GB
        fileSizeFormatted: '14.0 GB',
        modelType: 'LLaMA',
        license: 'Custom',
        downloadCount: 800,
        huggingFaceLink: 'https://huggingface.co/meta-llama/Llama-2-13b-chat-hf',
        directDownloadLink: 'https://huggingface.co/meta-llama/Llama-2-13b-chat-hf/resolve/main/llama-2-13b-chat.Q8_0.gguf',
        // Computed fields added by DataService
        id: 'Llama 2 13B Chat:llama-2-13b-chat.Q8_0.gguf',
        searchText: 'llama 2 13b chat llama q8_0 llama-2-13b-chat.q8_0.gguf',
        tags: ['🧠 13B']
      },
      {
        modelName: 'Qwen 1.5 1.8B Chat',
        quantFormat: 'Q4_0',
        fileSize: 1.2 * 1024 * 1024 * 1024, // 1.2GB
        fileSizeFormatted: '1.2 GB',
        modelType: 'Qwen',
        license: 'Apache 2.0',
        downloadCount: 500,
        huggingFaceLink: 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat',
        directDownloadLink: 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat/resolve/main/qwen1.5-1.8b-chat.Q4_0.gguf',
        // Computed fields added by DataService
        id: 'Qwen 1.5 1.8B Chat:qwen1.5-1.8b-chat.Q4_0.gguf',
        searchText: 'qwen 1.5 1.8b chat qwen q4_0 qwen1.5-1.8b-chat.q4_0.gguf',
        tags: ['🧠 1-3B']
      }
    ];
  });

  describe('applyFilters', () => {
    it('should return all models when no filters are applied', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockModels);
    });

    it('should filter by quantization type', () => {
      const filterState = {
        quantizations: ['Q4_K_M'],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(1);
      expect(result[0].quantFormat).toBe('Q4_K_M');
    });

    it('should filter by architecture', () => {
      const filterState = {
        quantizations: [],
        architectures: ['Mistral'],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Mistral');
    });

    it('should filter by model type', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: ['Qwen'],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Qwen');
    });

    it('should filter by size range', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: ['1-4GB'],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(2); // Both Mistral (4GB) and Qwen (1.2GB) should match 1-4GB range
      expect(result.some(model => model.fileSize === 4 * 1024 * 1024 * 1024)).toBe(true);
    });

    it('should filter by search query', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: 'mistral'
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Mistral');
    });

    it('should apply multiple filters simultaneously', () => {
      const filterState = {
        quantizations: ['Q4_K_M', 'Q4_0'],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(mockModels, filterState);
      expect(result).toHaveLength(2);
      expect(result.every(model => ['Q4_K_M', 'Q4_0'].includes(model.quantFormat))).toBe(true);
    });

    it('should handle empty models array', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters([], filterState);
      expect(result).toHaveLength(0);
    });

    it('should handle invalid models array', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      };

      const result = filterService.applyFilters(null, filterState);
      expect(result).toHaveLength(0);
    });
  });

  describe('matchesSizeRange', () => {
    it('should correctly match <1GB range', () => {
      const fileSize = 0.5 * 1024 * 1024 * 1024; // 0.5GB
      expect(filterService.matchesSizeRange(fileSize, ['<1GB'])).toBe(true);
      expect(filterService.matchesSizeRange(fileSize, ['1-4GB'])).toBe(false);
    });

    it('should correctly match 1-4GB range', () => {
      const fileSize = 2 * 1024 * 1024 * 1024; // 2GB
      expect(filterService.matchesSizeRange(fileSize, ['1-4GB'])).toBe(true);
      expect(filterService.matchesSizeRange(fileSize, ['<1GB'])).toBe(false);
    });

    it('should correctly match 4-8GB range', () => {
      const fileSize = 6 * 1024 * 1024 * 1024; // 6GB
      expect(filterService.matchesSizeRange(fileSize, ['4-8GB'])).toBe(true);
      expect(filterService.matchesSizeRange(fileSize, ['1-4GB'])).toBe(false);
    });

    it('should correctly match 8-16GB range', () => {
      const fileSize = 12 * 1024 * 1024 * 1024; // 12GB
      expect(filterService.matchesSizeRange(fileSize, ['8-16GB'])).toBe(true);
      expect(filterService.matchesSizeRange(fileSize, ['4-8GB'])).toBe(false);
    });

    it('should correctly match >32GB range', () => {
      const fileSize = 40 * 1024 * 1024 * 1024; // 40GB
      expect(filterService.matchesSizeRange(fileSize, ['>32GB'])).toBe(true);
      expect(filterService.matchesSizeRange(fileSize, ['16-32GB'])).toBe(false);
    });

    it('should match multiple ranges', () => {
      const fileSize = 2 * 1024 * 1024 * 1024; // 2GB
      expect(filterService.matchesSizeRange(fileSize, ['<1GB', '1-4GB'])).toBe(true);
    });
  });

  describe('getAvailableOptions', () => {
    it('should extract unique quantization types', () => {
      const options = filterService.getAvailableOptions(mockModels);
      expect(options.quantizations).toEqual(['Q4_0', 'Q4_K_M', 'Q8_0']);
    });

    it('should extract unique architectures', () => {
      const options = filterService.getAvailableOptions(mockModels);
      expect(options.architectures).toEqual(['LLaMA', 'Mistral', 'Qwen']);
    });

    it('should extract unique model types', () => {
      const options = filterService.getAvailableOptions(mockModels);
      expect(options.modelTypes).toEqual(['LLaMA', 'Mistral', 'Qwen']);
    });

    it('should calculate size range counts', () => {
      const options = filterService.getAvailableOptions(mockModels);
      expect(options.sizeRanges).toHaveLength(2);
      
      const sizeRangeMap = options.sizeRanges.reduce((acc, item) => {
        acc[item.range] = item.count;
        return acc;
      }, {});
      
      expect(sizeRangeMap['1-4GB']).toBe(2); // Mistral (4GB) and Qwen (1.2GB)
      expect(sizeRangeMap['8-16GB']).toBe(1); // LLaMA (14GB)
    });

    it('should handle empty models array', () => {
      const options = filterService.getAvailableOptions([]);
      expect(options.quantizations).toHaveLength(0);
      expect(options.architectures).toHaveLength(0);
      expect(options.modelTypes).toHaveLength(0);
      expect(options.sizeRanges).toHaveLength(0);
    });

    it('should handle invalid models array', () => {
      const options = filterService.getAvailableOptions(null);
      expect(options.quantizations).toHaveLength(0);
      expect(options.architectures).toHaveLength(0);
      expect(options.modelTypes).toHaveLength(0);
      expect(options.sizeRanges).toHaveLength(0);
    });

    it('should filter out Unknown values', () => {
      const modelsWithUnknown = [
        ...mockModels,
        {
          modelName: 'Unknown Model',
          quantFormat: 'Unknown',
          modelType: 'Unknown',
          fileSize: 1024 * 1024 * 1024,
          fileSizeFormatted: '1.0 GB',
          downloadCount: 100,
          huggingFaceLink: 'https://example.com',
          directDownloadLink: 'https://example.com/model.gguf',
          id: 'Unknown Model:model.gguf',
          searchText: 'unknown model unknown model.gguf'
        }
      ];

      const options = filterService.getAvailableOptions(modelsWithUnknown);
      expect(options.quantizations).not.toContain('Unknown');
      expect(options.architectures).not.toContain('Unknown');
      expect(options.modelTypes).not.toContain('Unknown');
    });
  });

  describe('performTextSearch', () => {
    it('should return all models when search query is empty', () => {
      const result = filterService.performTextSearch(mockModels, '');
      expect(result).toHaveLength(3);
    });

    it('should return all models when search query is null', () => {
      const result = filterService.performTextSearch(mockModels, null);
      expect(result).toHaveLength(3);
    });

    it('should search by single term', () => {
      const result = filterService.performTextSearch(mockModels, 'mistral');
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Mistral');
    });

    it('should search by multiple terms', () => {
      const result = filterService.performTextSearch(mockModels, 'mistral q4_k_m');
      expect(result).toHaveLength(1);
      expect(result[0].quantFormat).toBe('Q4_K_M');
    });

    it('should be case insensitive', () => {
      const result = filterService.performTextSearch(mockModels, 'MISTRAL');
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Mistral');
    });

    it('should handle partial matches', () => {
      const result = filterService.performTextSearch(mockModels, 'mistr');
      expect(result).toHaveLength(1);
      expect(result[0].modelType).toBe('Mistral');
    });
  });

  describe('getSuggestedSearchTerms', () => {
    it('should return suggestions based on partial query', () => {
      const suggestions = filterService.getSuggestedSearchTerms(mockModels, 'mi');
      expect(suggestions).toContain('Mistral');
      expect(suggestions.some(s => s.toLowerCase().includes('mistral'))).toBe(true);
    });

    it('should return empty array for empty models', () => {
      const suggestions = filterService.getSuggestedSearchTerms([], 'test');
      expect(suggestions).toHaveLength(0);
    });

    it('should limit suggestions to 10 items', () => {
      const suggestions = filterService.getSuggestedSearchTerms(mockModels, '');
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('validateFilterState', () => {
    it('should validate correct filter state', () => {
      const filterState = {
        quantizations: ['Q4_K_M'],
        architectures: ['Mistral'],
        modelTypes: ['Mistral'],
        sizeRanges: ['1-4GB'],
        searchQuery: 'test'
      };

      expect(filterService.validateFilterState(filterState)).toBe(true);
    });

    it('should reject null filter state', () => {
      expect(filterService.validateFilterState(null)).toBe(false);
    });

    it('should reject non-object filter state', () => {
      expect(filterService.validateFilterState('invalid')).toBe(false);
    });

    it('should reject filter state with non-array fields', () => {
      const filterState = {
        quantizations: 'not-an-array',
        architectures: [],
        modelTypes: [],
        sizeRanges: [],
        searchQuery: 'test'
      };

      expect(filterService.validateFilterState(filterState)).toBe(false);
    });

    it('should reject filter state with non-string searchQuery', () => {
      const filterState = {
        quantizations: [],
        architectures: [],
        modelTypes: [],
        sizeRanges: [],
        searchQuery: 123
      };

      expect(filterService.validateFilterState(filterState)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cached options', () => {
      // First call to cache options
      filterService.getAvailableOptions(mockModels);
      expect(filterService.availableOptions).not.toBeNull();

      // Clear cache
      filterService.clearCache();
      expect(filterService.availableOptions).toBeNull();
    });
  });
});