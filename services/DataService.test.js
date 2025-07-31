/**
 * Tests for DataService workflow format validation
 */

import { DataService } from './DataService.js';
import { AppError, ErrorTypes } from '../utils/errorHandler.js';

describe('DataService Workflow Format Validation', () => {
  let dataService;

  beforeEach(() => {
    dataService = new DataService();
    // Clear cache before each test
    dataService.clearCache();
  });

  describe('validateWorkflowModel', () => {
    test('should pass validation for valid workflow model', () => {
      const validModel = {
        modelName: 'Test Model',
        quantFormat: 'Q4_K_M',
        fileSize: 1024000000,
        modelType: 'LLaMA',
        downloadCount: 1000,
        fileSizeFormatted: '1.0 GB',
        huggingFaceLink: 'https://huggingface.co/test/model',
        directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
      };

      expect(() => {
        dataService.validateWorkflowModel(validModel, 0);
      }).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const invalidModel = {
        modelName: 'Test Model',
        // Missing quantFormat, fileSize, modelType, downloadCount
      };

      expect(() => {
        dataService.validateWorkflowModel(invalidModel, 0);
      }).toThrow(AppError);

      try {
        dataService.validateWorkflowModel(invalidModel, 0);
      } catch (error) {
        expect(error.type).toBe(ErrorTypes.VALIDATION);
        expect(error.message).toContain('Missing required fields');
        expect(error.context.missingFields).toEqual(['quantFormat', 'fileSize', 'modelType', 'downloadCount']);
      }
    });

    test('should throw error for invalid field types', () => {
      const invalidModel = {
        modelName: 123, // Should be string
        quantFormat: 'Q4_K_M',
        fileSize: 'large', // Should be number
        modelType: 'LLaMA',
        downloadCount: -100 // Should be non-negative
      };

      expect(() => {
        dataService.validateWorkflowModel(invalidModel, 0);
      }).toThrow(AppError);

      try {
        dataService.validateWorkflowModel(invalidModel, 0);
      } catch (error) {
        expect(error.type).toBe(ErrorTypes.VALIDATION);
        expect(error.message).toContain('Invalid field types');
        expect(error.context.invalidFields).toHaveLength(3);
      }
    });
  });

  describe('isWorkflowFormat', () => {
    test('should return true for valid workflow format', () => {
      const validModel = {
        modelName: 'Test Model',
        quantFormat: 'Q4_K_M',
        fileSize: 1024000000,
        modelType: 'LLaMA',
        downloadCount: 1000
      };

      expect(dataService.isWorkflowFormat(validModel)).toBe(true);
    });

    test('should return false for missing required fields', () => {
      const invalidModel = {
        modelName: 'Test Model',
        quantFormat: 'Q4_K_M'
        // Missing fileSize, modelType, downloadCount
      };

      expect(dataService.isWorkflowFormat(invalidModel)).toBe(false);
    });
  });

  describe('generateId', () => {
    test('should generate ID for valid model', () => {
      const model = {
        modelName: 'Test Model',
        directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
      };

      const id = dataService.generateId(model);
      expect(id).toBe('Test Model:model.gguf');
    });

    test('should generate fallback ID for model without modelName', () => {
      const model = {
        directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
      };

      const id = dataService.generateId(model);
      expect(id).toMatch(/unknown-model:\d+/);
    });
  });

  describe('generateSearchText', () => {
    test('should generate search text for valid model', () => {
      const model = {
        modelName: 'Test Model',
        modelType: 'LLaMA',
        quantFormat: 'Q4_K_M',
        directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
      };

      const searchText = dataService.generateSearchText(model);
      expect(searchText).toBe('test model llama q4_k_m model.gguf');
    });

    test('should generate fallback search text for model with missing fields', () => {
      const model = {
        modelName: 'Test Model'
        // Missing other fields
      };

      const searchText = dataService.generateSearchText(model);
      expect(searchText).toBe('test model unknown-file.gguf');
    });
  });

  describe('generateTags', () => {
    test('should generate tags for valid model', () => {
      const model = {
        downloadCount: 5000,
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB
      };

      const tags = dataService.generateTags(model);
      expect(tags).toContain('🔥 Popular');
      expect(tags).toContain('🧠 1-3B');
    });

    test('should handle invalid downloadCount and fileSize', () => {
      const model = {
        downloadCount: 'many', // Invalid type
        fileSize: -100 // Invalid value
      };

      const tags = dataService.generateTags(model);
      expect(tags).toContain('🧠 Unknown Size');
    });
  });

  describe('extractFilename', () => {
    test('should extract filename from valid URL', () => {
      const url = 'https://huggingface.co/test/model/resolve/main/model.gguf';
      const filename = dataService.extractFilename(url);
      expect(filename).toBe('model.gguf');
    });

    test('should return fallback for invalid URL', () => {
      const filename = dataService.extractFilename(null);
      expect(filename).toBe('unknown-file.gguf');
    });
  });

  describe('Migration Support', () => {
    describe('detectDataFormat', () => {
      test('should detect valid workflow format', () => {
        const models = [{
          modelName: 'Test Model',
          quantFormat: 'Q4_K_M',
          fileSize: 1024000000,
          modelType: 'LLaMA',
          downloadCount: 1000,
          fileSizeFormatted: '1.0 GB',
          huggingFaceLink: 'https://huggingface.co/test/model',
          directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.gguf'
        }];

        const result = dataService.detectDataFormat(models);
        expect(result.format).toBe('workflow');
        expect(result.isValid).toBe(true);
        expect(result.needsMigration).toBe(false);
      });

      test('should detect incomplete workflow format', () => {
        const models = [{
          modelName: 'Test Model',
          quantFormat: 'Q4_K_M'
          // Missing fileSize, modelType, downloadCount
        }];

        const result = dataService.detectDataFormat(models);
        expect(result.format).toBe('incomplete-workflow');
        expect(result.isValid).toBe(false);
        expect(result.needsMigration).toBe(true);
        expect(result.missingRequired).toEqual(['fileSize', 'modelType', 'downloadCount']);
      });

      test('should handle empty dataset', () => {
        const result = dataService.detectDataFormat([]);
        expect(result.format).toBe('empty');
        expect(result.isValid).toBe(false);
        expect(result.needsMigration).toBe(false);
      });
    });

    describe('applyModelMigration', () => {
      test('should migrate model with missing optional fields', () => {
        const model = {
          modelName: 'Test Model',
          quantFormat: 'Q4_K_M',
          fileSize: 2147483648, // 2GB
          modelType: 'LLaMA',
          downloadCount: 1000
          // Missing optional fields
        };

        const migrated = dataService.applyModelMigration(model, 0);
        expect(migrated.fileSizeFormatted).toBe('2.00 GB');
        expect(migrated.license).toBe('Not specified');
        expect(migrated.huggingFaceLink).toBe('#');
        expect(migrated.directDownloadLink).toBe('#');
      });

      test('should apply fallbacks for missing required fields', () => {
        const model = {
          modelName: 'Test Model'
          // Missing most required fields
        };

        const migrated = dataService.applyModelMigration(model, 0);
        expect(migrated.quantFormat).toBe('Unknown');
        expect(migrated.fileSize).toBe(1024 * 1024 * 1024); // 1GB fallback
        expect(migrated.modelType).toBe('Unknown');
        expect(migrated.downloadCount).toBe(0);
      });
    });

    describe('Field Migration Helpers', () => {
      test('ensureModelName should extract from modelId', () => {
        const model = { modelId: 'microsoft/DialoGPT-medium' };
        const result = dataService.ensureModelName(model, 0);
        expect(result).toBe('DialoGPT-medium');
      });

      test('ensureQuantFormat should extract from filename', () => {
        const model = { 
          directDownloadLink: 'https://huggingface.co/test/model/resolve/main/model.Q4_K_M.gguf' 
        };
        const result = dataService.ensureQuantFormat(model, 0);
        expect(result).toBe('Q4_K_M');
      });

      test('ensureModelType should infer from model name', () => {
        const model = { modelName: 'Llama-2-7b-chat' };
        const result = dataService.ensureModelType(model, 0);
        expect(result).toBe('LLaMA');
      });

      test('ensureFileSize should parse from formatted size', () => {
        const model = { fileSizeFormatted: '2.5 GB' };
        const result = dataService.ensureFileSize(model, 0);
        expect(result).toBe(2.5 * 1024 * 1024 * 1024);
      });

      test('ensureDownloadCount should use alternative field names', () => {
        const model = { downloads: 5000 };
        const result = dataService.ensureDownloadCount(model, 0);
        expect(result).toBe(5000);
      });

      test('ensureHuggingFaceLink should construct from modelId', () => {
        const model = { modelId: 'microsoft/DialoGPT-medium' };
        const result = dataService.ensureHuggingFaceLink(model, 0);
        expect(result).toBe('https://huggingface.co/microsoft/DialoGPT-medium');
      });
    });

    describe('applyFallbackValues', () => {
      test('should apply comprehensive fallbacks for malformed model', () => {
        const model = {
          invalidField: 'some value'
          // No valid fields
        };

        const result = dataService.applyFallbackValues(model, 5);
        expect(result.modelName).toBe('Unknown Model 6');
        expect(result.quantFormat).toBe('Unknown');
        expect(result.fileSize).toBe(1024 * 1024 * 1024);
        expect(result.fileSizeFormatted).toBe('~1.0 GB');
        expect(result.modelType).toBe('Unknown');
        expect(result.downloadCount).toBe(0);
        expect(result.license).toBe('Not specified');
        expect(result.huggingFaceLink).toBe('#');
        expect(result.directDownloadLink).toBe('#');
      });
    });
  });
});