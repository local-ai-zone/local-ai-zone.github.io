import { withErrorHandling, ErrorTypes, AppError } from '../utils/errorHandler.js';
import { withLoadingState, loadingStateManager } from '../utils/loadingStateManager.js';

/**
 * DataService handles fetching GGUF model data from workflow output
 * Consumes workflow format directly with minimal enhancement
 */
export class DataService {
  constructor() {
    this.modelsCache = null;
    this.loadingManager = loadingStateManager;
  }

  /**
   * Load models directly from workflow output
   * @returns {Promise<WorkflowModel[]>} Array of workflow model objects with minimal enhancements
   */
  async loadModels() {
    return withLoadingState('load-models', async (updateProgress) => {
      return withErrorHandling(async () => {
        updateProgress(10, 'Fetching workflow data...');
        
        const models = await this.fetchModelsData();

        // Handle dynamic model counts (2000-6000+ models)
        const modelCount = models.length;
        console.log(`📊 Processing ${modelCount.toLocaleString()} models from workflow`);
        
        updateProgress(30, `Processing ${modelCount.toLocaleString()} models...`);
        
        // Process models in batches for better performance with large datasets
        const batchSize = 1000;
        const enhancedModels = [];
        
        for (let i = 0; i < models.length; i += batchSize) {
          const batch = models.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(models.length / batchSize);
          
          updateProgress(
            30 + (batchNumber / totalBatches) * 60, 
            `Processing batch ${batchNumber}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, models.length)} of ${modelCount.toLocaleString()})`
          );
          
          // Add minimal computed fields for website functionality
          const enhancedBatch = batch.map(model => ({
            ...model,
            id: this.generateId(model),
            searchText: this.generateSearchText(model),
            tags: this.generateTags(model)
          }));
          
          enhancedModels.push(...enhancedBatch);
          
          // Allow UI to update between batches for large datasets
          if (models.length > 5000 && batchNumber % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        updateProgress(95, 'Finalizing model data...');
        
        // Log final statistics
        console.log(`✅ Successfully processed ${enhancedModels.length.toLocaleString()} models`);
        
        updateProgress(100, `Loaded ${enhancedModels.length.toLocaleString()} models successfully`);
        
        return enhancedModels;
      }, {
        retryable: true,
        context: { operation: 'loadModels', expectedModelRange: '2000-6000+' }
      });
    }, {
      loadingMessage: 'Loading workflow model data...',
      successMessage: `Loaded models successfully`
    });
  }

  /**
   * Fetch workflow model data from gguf_models.json with migration support
   * @returns {Promise<Object[]>} Workflow model data
   */
  async fetchModelsData() {
    if (this.modelsCache) {
      return this.modelsCache;
    }

    return withErrorHandling(async () => {
      const response = await fetch('./gguf_models.json');
      
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch workflow model data: ${response.status} ${response.statusText}`,
          ErrorTypes.NETWORK,
          response.status >= 500 ? 'HIGH' : 'MEDIUM',
          { url: './gguf_models.json', status: response.status }
        );
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new AppError(
          'Invalid workflow data format: expected array of model objects',
          ErrorTypes.DATA_PARSING,
          'HIGH',
          { 
            dataType: typeof data, 
            url: './gguf_models.json',
            expectedFormat: 'Array of workflow model objects'
          }
        );
      }

      // Handle empty or minimal datasets gracefully
      if (data.length === 0) {
        console.warn('⚠️ Workflow data is empty - no models found');
        this.modelsCache = [];
        return [];
      }

      // Handle minimal datasets (less than expected range)
      if (data.length < 100) {
        console.warn(`⚠️ Minimal dataset detected: only ${data.length} models found (expected 2000-6000+)`);
      } else if (data.length > 10000) {
        console.info(`📊 Large dataset detected: ${data.length.toLocaleString()} models found`);
      } else {
        console.info(`📊 Dataset loaded: ${data.length.toLocaleString()} models found`);
      }

      // Detect data format and apply migration if needed
      const formatDetection = this.detectDataFormat(data);
      console.log('📋 Data format detection:', formatDetection);

      if (formatDetection.needsMigration) {
        console.warn('🔄 Data migration needed:', formatDetection.issues);
        const migratedData = this.applyMigrationHelpers(data, formatDetection);
        this.modelsCache = migratedData;
        return migratedData;
      }

      // Validate all models in the dataset with migration support
      const validationErrors = [];
      const migratedModels = [];

      data.forEach((model, index) => {
        try {
          const migratedModel = this.applyModelMigration(model, index);
          this.validateWorkflowModel(migratedModel, index);
          migratedModels.push(migratedModel);
        } catch (error) {
          validationErrors.push({
            index,
            error: error.message,
            model: model
          });
        }
      });

      // If there are validation errors, decide whether to fail or warn
      if (validationErrors.length > 0) {
        const errorRate = validationErrors.length / data.length;
        
        if (errorRate > 0.1) { // More than 10% of models are invalid
          throw new AppError(
            `Too many invalid models in workflow data: ${validationErrors.length} out of ${data.length} models failed validation`,
            ErrorTypes.VALIDATION,
            'HIGH',
            { 
              validationErrors: validationErrors.slice(0, 5), // Show first 5 errors
              totalErrors: validationErrors.length,
              totalModels: data.length,
              errorRate: Math.round(errorRate * 100)
            }
          );
        } else {
          // Log warnings for individual invalid models but continue
          console.warn(`Found ${validationErrors.length} invalid models in workflow data:`, validationErrors);
        }
      }

      this.modelsCache = migratedModels.length > 0 ? migratedModels : data;
      return this.modelsCache;
    }, {
      retryable: true,
      context: { operation: 'fetchModelsData' }
    });
  }

  /**
   * Check if data is in workflow format
   * @param {Object} model - Sample model object
   * @returns {boolean} True if workflow format
   */
  isWorkflowFormat(model) {
    const requiredFields = ['modelName', 'quantFormat', 'fileSize', 'modelType', 'downloadCount'];
    return requiredFields.every(field => field in model);
  }

  /**
   * Detect data format and provide migration support
   * @param {Array} models - Array of model objects
   * @returns {Object} Format detection result
   */
  detectDataFormat(models) {
    if (!Array.isArray(models) || models.length === 0) {
      return {
        format: 'empty',
        isValid: false,
        needsMigration: false,
        issues: ['Dataset is empty']
      };
    }

    const sampleModel = models[0];
    const requiredFields = ['modelName', 'quantFormat', 'fileSize', 'modelType', 'downloadCount'];
    const optionalFields = ['fileSizeFormatted', 'huggingFaceLink', 'directDownloadLink', 'license'];
    
    const presentFields = Object.keys(sampleModel);
    const missingRequired = requiredFields.filter(field => !(field in sampleModel));
    const missingOptional = optionalFields.filter(field => !(field in sampleModel));
    
    const issues = [];
    let needsMigration = false;

    // Check for missing required fields
    if (missingRequired.length > 0) {
      issues.push(`Missing required fields: ${missingRequired.join(', ')}`);
      needsMigration = true;
    }

    // Check for missing optional fields that might need fallbacks
    if (missingOptional.length > 0) {
      issues.push(`Missing optional fields: ${missingOptional.join(', ')}`);
      // Only mark as needing migration if critical optional fields are missing
      const criticalOptionalFields = ['fileSizeFormatted', 'directDownloadLink'];
      const missingCritical = missingOptional.filter(field => criticalOptionalFields.includes(field));
      if (missingCritical.length > 0) {
        needsMigration = true;
      }
    }

    // Check field types and values
    const typeIssues = this.validateFieldTypes(sampleModel);
    if (typeIssues.length > 0) {
      issues.push(...typeIssues);
      needsMigration = true;
    }

    return {
      format: missingRequired.length === 0 ? 'workflow' : 'incomplete-workflow',
      isValid: missingRequired.length === 0,
      needsMigration,
      issues,
      missingRequired,
      missingOptional,
      presentFields,
      sampleModel
    };
  }

  /**
   * Validate field types for a model
   * @param {Object} model - Model object to validate
   * @returns {Array} Array of type validation issues
   */
  validateFieldTypes(model) {
    const issues = [];

    if (model.modelName !== undefined && typeof model.modelName !== 'string') {
      issues.push(`modelName should be string, got ${typeof model.modelName}`);
    }
    
    if (model.quantFormat !== undefined && typeof model.quantFormat !== 'string') {
      issues.push(`quantFormat should be string, got ${typeof model.quantFormat}`);
    }
    
    if (model.fileSize !== undefined && (typeof model.fileSize !== 'number' || model.fileSize < 0)) {
      issues.push(`fileSize should be positive number, got ${typeof model.fileSize}`);
    }
    
    if (model.modelType !== undefined && typeof model.modelType !== 'string') {
      issues.push(`modelType should be string, got ${typeof model.modelType}`);
    }
    
    if (model.downloadCount !== undefined && (typeof model.downloadCount !== 'number' || model.downloadCount < 0)) {
      issues.push(`downloadCount should be non-negative number, got ${typeof model.downloadCount}`);
    }

    return issues;
  }

  /**
   * Validate workflow format fields for a single model
   * @param {Object} model - Model object to validate
   * @param {number} index - Model index for error context
   * @throws {AppError} If validation fails
   */
  validateWorkflowModel(model, index) {
    const requiredFields = ['modelName', 'quantFormat', 'fileSize', 'modelType', 'downloadCount'];
    const missingFields = [];
    const invalidFields = [];

    // Check for missing required fields
    requiredFields.forEach(field => {
      if (!(field in model) || model[field] === null || model[field] === undefined) {
        missingFields.push(field);
      }
    });

    // Check field types and values
    if (model.modelName !== undefined && typeof model.modelName !== 'string') {
      invalidFields.push(`modelName must be a string, got ${typeof model.modelName}`);
    }
    
    if (model.quantFormat !== undefined && typeof model.quantFormat !== 'string') {
      invalidFields.push(`quantFormat must be a string, got ${typeof model.quantFormat}`);
    }
    
    if (model.fileSize !== undefined && (typeof model.fileSize !== 'number' || model.fileSize < 0)) {
      invalidFields.push(`fileSize must be a positive number, got ${typeof model.fileSize} with value ${model.fileSize}`);
    }
    
    if (model.modelType !== undefined && typeof model.modelType !== 'string') {
      invalidFields.push(`modelType must be a string, got ${typeof model.modelType}`);
    }
    
    if (model.downloadCount !== undefined && (typeof model.downloadCount !== 'number' || model.downloadCount < 0)) {
      invalidFields.push(`downloadCount must be a non-negative number, got ${typeof model.downloadCount} with value ${model.downloadCount}`);
    }

    // Validate optional fields if present
    if (model.fileSizeFormatted !== undefined && typeof model.fileSizeFormatted !== 'string') {
      invalidFields.push(`fileSizeFormatted must be a string, got ${typeof model.fileSizeFormatted}`);
    }
    
    if (model.huggingFaceLink !== undefined && typeof model.huggingFaceLink !== 'string') {
      invalidFields.push(`huggingFaceLink must be a string, got ${typeof model.huggingFaceLink}`);
    }
    
    if (model.directDownloadLink !== undefined && typeof model.directDownloadLink !== 'string') {
      invalidFields.push(`directDownloadLink must be a string, got ${typeof model.directDownloadLink}`);
    }

    // Throw error if validation fails
    if (missingFields.length > 0 || invalidFields.length > 0) {
      const errorDetails = [];
      
      if (missingFields.length > 0) {
        errorDetails.push(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      if (invalidFields.length > 0) {
        errorDetails.push(`Invalid field types: ${invalidFields.join('; ')}`);
      }

      throw new AppError(
        `Workflow data validation failed for model at index ${index}: ${errorDetails.join('. ')}`,
        ErrorTypes.VALIDATION,
        'HIGH',
        { 
          modelIndex: index,
          missingFields,
          invalidFields,
          modelData: model
        }
      );
    }
  }

  /**
   * Generate unique identifier for each model entry
   * @param {Object} model - Workflow model object
   * @returns {string} Unique identifier
   */
  generateId(model) {
    try {
      // Validate required fields for ID generation
      if (!model.modelName) {
        throw new AppError(
          'Cannot generate ID: modelName is required',
          ErrorTypes.VALIDATION,
          'MEDIUM',
          { model }
        );
      }

      const filename = this.extractFilename(model.directDownloadLink);
      return `${model.modelName}:${filename}`;
    } catch (error) {
      console.warn('Error generating ID for model:', error.message, model);
      // Fallback ID generation
      const fallbackName = model.modelName || 'unknown-model';
      const timestamp = Date.now();
      return `${fallbackName}:${timestamp}`;
    }
  }

  /**
   * Generate searchable text from workflow fields
   * @param {Object} model - Workflow model object
   * @returns {string} Combined searchable text
   */
  generateSearchText(model) {
    try {
      // Validate required fields for search text generation
      const requiredForSearch = ['modelName', 'modelType', 'quantFormat'];
      const missingFields = requiredForSearch.filter(field => !model[field]);
      
      if (missingFields.length > 0) {
        console.warn(`Missing fields for search text generation: ${missingFields.join(', ')}`, model);
      }

      const searchParts = [
        model.modelName || '',
        model.modelType || '',
        model.quantFormat || '',
        this.extractFilename(model.directDownloadLink)
      ];
      
      const searchText = searchParts.filter(Boolean).join(' ').toLowerCase();
      
      if (!searchText.trim()) {
        throw new AppError(
          'Generated search text is empty',
          ErrorTypes.VALIDATION,
          'LOW',
          { model, searchParts }
        );
      }
      
      return searchText;
      
    } catch (error) {
      console.warn('Error generating search text for model:', error.message, model);
      // Fallback search text generation
      const fallbackText = `${model.modelName || 'unknown'} ${model.modelType || 'unknown'}`.toLowerCase();
      return fallbackText;
    }
  }

  /**
   * Generate display tags from workflow fields
   * @param {Object} model - Workflow model object
   * @returns {string[]} Array of display tags
   */
  generateTags(model) {
    try {
      const tags = [];

      // Validate required fields for tag generation
      if (typeof model.downloadCount !== 'number') {
        console.warn('Invalid downloadCount for tag generation:', model.downloadCount, model);
      } else if (model.downloadCount > 1000) {
        tags.push('🔥 Popular');
      }

      // Size-based tags from fileSize
      if (typeof model.fileSize !== 'number' || model.fileSize <= 0) {
        console.warn('Invalid fileSize for tag generation:', model.fileSize, model);
        tags.push('🧠 Unknown Size');
      } else {
        const sizeGB = model.fileSize / (1024 * 1024 * 1024);
        if (sizeGB < 1) {
          tags.push('🧠 <1B');
        } else if (sizeGB < 4) {
          tags.push('🧠 1-3B');
        } else if (sizeGB < 8) {
          tags.push('🧠 7B');
        } else if (sizeGB < 16) {
          tags.push('🧠 13B');
        } else if (sizeGB < 35) {
          tags.push('🧠 30B');
        } else {
          tags.push('🧠 70B+');
        }
      }

      return tags;
      
    } catch (error) {
      console.warn('Error generating tags for model:', error.message, model);
      return ['🧠 Unknown'];
    }
  }

  /**
   * Extract filename from directDownloadLink
   * @param {string} directDownloadLink - Direct download URL
   * @returns {string} Extracted filename
   */
  extractFilename(directDownloadLink) {
    try {
      if (!directDownloadLink || typeof directDownloadLink !== 'string') {
        throw new AppError(
          'Invalid directDownloadLink: must be a non-empty string',
          ErrorTypes.VALIDATION,
          'LOW',
          { directDownloadLink }
        );
      }

      const filename = directDownloadLink.split('/').pop() || '';
      
      if (!filename) {
        throw new AppError(
          'Could not extract filename from directDownloadLink',
          ErrorTypes.VALIDATION,
          'LOW',
          { directDownloadLink }
        );
      }

      return filename;
    } catch (error) {
      console.warn('Error extracting filename from directDownloadLink:', error.message, directDownloadLink);
      return 'unknown-file.gguf';
    }
  }

  /**
   * Get current model count and statistics
   * @returns {Object} Model statistics
   */
  getModelStats() {
    const models = this.modelsCache || [];
    const stats = {
      totalModels: models.length,
      formattedCount: models.length.toLocaleString(),
      isEmpty: models.length === 0,
      isMinimal: models.length > 0 && models.length < 100,
      isLarge: models.length > 10000,
      isInExpectedRange: models.length >= 2000 && models.length <= 6000,
      lastUpdated: new Date().toISOString(),
      dataSource: 'workflow'
    };

    // Add breakdown by model types if data is available
    if (models.length > 0) {
      const modelTypes = {};
      const quantFormats = {};
      let totalFileSize = 0;
      let totalDownloads = 0;

      models.forEach(model => {
        // Count model types
        const modelType = model.modelType || 'Unknown';
        modelTypes[modelType] = (modelTypes[modelType] || 0) + 1;

        // Count quantization formats
        const quantFormat = model.quantFormat || 'Unknown';
        quantFormats[quantFormat] = (quantFormats[quantFormat] || 0) + 1;

        // Sum file sizes and downloads
        if (typeof model.fileSize === 'number') {
          totalFileSize += model.fileSize;
        }
        if (typeof model.downloadCount === 'number') {
          totalDownloads += model.downloadCount;
        }
      });

      stats.breakdown = {
        modelTypes: Object.keys(modelTypes).length,
        quantFormats: Object.keys(quantFormats).length,
        totalFileSize,
        totalFileSizeGB: Math.round(totalFileSize / (1024 * 1024 * 1024)),
        totalDownloads,
        averageDownloads: Math.round(totalDownloads / models.length),
        topModelTypes: Object.entries(modelTypes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => ({ type, count })),
        topQuantFormats: Object.entries(quantFormats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([format, count]) => ({ format, count }))
      };
    }

    return stats;
  }

  /**
   * Check if workflow data is available and valid
   * @returns {Object} Data availability status
   */
  getDataStatus() {
    const stats = this.getModelStats();
    
    return {
      isAvailable: stats.totalModels > 0,
      isEmpty: stats.isEmpty,
      isMinimal: stats.isMinimal,
      isHealthy: stats.totalModels >= 1000, // Consider healthy if at least 1000 models
      status: stats.isEmpty ? 'empty' : 
              stats.isMinimal ? 'minimal' : 
              stats.isInExpectedRange ? 'normal' : 
              stats.isLarge ? 'large' : 'unknown',
      message: this.getStatusMessage(stats),
      stats
    };
  }

  /**
   * Get status message based on model statistics
   * @param {Object} stats - Model statistics
   * @returns {string} Status message
   */
  getStatusMessage(stats) {
    if (stats.isEmpty) {
      return 'No models are currently available. The workflow data may be updating.';
    } else if (stats.isMinimal) {
      return `Limited dataset: ${stats.formattedCount} models available. Full dataset may still be loading.`;
    } else if (stats.isLarge) {
      return `Large dataset: ${stats.formattedCount} models available. Performance optimizations are active.`;
    } else if (stats.isInExpectedRange) {
      return `${stats.formattedCount} models available from workflow data.`;
    } else {
      return `${stats.formattedCount} models available.`;
    }
  }

  /**
   * Refresh model data from workflow (force reload)
   * @returns {Promise<WorkflowModel[]>} Refreshed model data
   */
  async refreshModels() {
    console.log('🔄 Refreshing model data from workflow...');
    this.clearCache();
    return await this.loadModels();
  }

  /**
   * Clear cached data (useful for testing or forced refresh)
   */
  clearCache() {
    this.modelsCache = null;
  }

  /**
   * Apply migration helpers to handle transition period
   * @param {Array} data - Raw model data
   * @param {Object} formatDetection - Format detection result
   * @returns {Array} Migrated model data
   */
  applyMigrationHelpers(data, formatDetection) {
    console.log('🔄 Applying migration helpers...');
    
    const migratedData = data.map((model, index) => {
      try {
        return this.applyModelMigration(model, index);
      } catch (error) {
        console.warn(`Migration failed for model at index ${index}:`, error.message);
        // Return original model with fallback values
        return this.applyFallbackValues(model, index);
      }
    });

    console.log(`✅ Migration completed: ${migratedData.length} models processed`);
    return migratedData;
  }

  /**
   * Apply migration to a single model
   * @param {Object} model - Original model object
   * @param {number} index - Model index for error context
   * @returns {Object} Migrated model object
   */
  applyModelMigration(model, index) {
    const migratedModel = { ...model };

    // Apply fallback logic for missing workflow fields
    migratedModel.modelName = this.ensureModelName(model, index);
    migratedModel.quantFormat = this.ensureQuantFormat(model, index);
    migratedModel.fileSize = this.ensureFileSize(model, index);
    migratedModel.modelType = this.ensureModelType(model, index);
    migratedModel.downloadCount = this.ensureDownloadCount(model, index);
    
    // Apply fallback for optional fields
    migratedModel.fileSizeFormatted = this.ensureFileSizeFormatted(migratedModel);
    migratedModel.huggingFaceLink = this.ensureHuggingFaceLink(model, index);
    migratedModel.directDownloadLink = this.ensureDirectDownloadLink(model, index);
    migratedModel.license = this.ensureLicense(model);

    return migratedModel;
  }

  /**
   * Apply fallback values for severely malformed models
   * @param {Object} model - Original model object
   * @param {number} index - Model index for error context
   * @returns {Object} Model with fallback values
   */
  applyFallbackValues(model, index) {
    console.warn(`Applying fallback values for model at index ${index}`);
    
    return {
      ...model,
      modelName: model.modelName || `Unknown Model ${index + 1}`,
      quantFormat: model.quantFormat || 'Unknown',
      fileSize: typeof model.fileSize === 'number' && model.fileSize > 0 ? model.fileSize : 1024 * 1024 * 1024, // 1GB fallback
      fileSizeFormatted: model.fileSizeFormatted || '~1.0 GB',
      modelType: model.modelType || 'Unknown',
      downloadCount: typeof model.downloadCount === 'number' && model.downloadCount >= 0 ? model.downloadCount : 0,
      license: model.license || 'Not specified',
      huggingFaceLink: model.huggingFaceLink || '#',
      directDownloadLink: model.directDownloadLink || '#'
    };
  }

  /**
   * Ensure modelName field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {string} Model name
   */
  ensureModelName(model, index) {
    if (model.modelName && typeof model.modelName === 'string') {
      return model.modelName;
    }
    
    // Try to extract from other fields
    if (model.modelId && typeof model.modelId === 'string') {
      return model.modelId.split('/').pop() || model.modelId;
    }
    
    if (model.directDownloadLink && typeof model.directDownloadLink === 'string') {
      const filename = this.extractFilename(model.directDownloadLink);
      const nameFromFile = filename.replace(/\.(gguf|bin)$/i, '').replace(/[-_]/g, ' ');
      if (nameFromFile && nameFromFile !== 'unknown-file') {
        return nameFromFile;
      }
    }
    
    return `Unknown Model ${index + 1}`;
  }

  /**
   * Ensure quantFormat field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {string} Quantization format
   */
  ensureQuantFormat(model, index) {
    if (model.quantFormat && typeof model.quantFormat === 'string') {
      return model.quantFormat;
    }
    
    // Try to extract from filename
    if (model.directDownloadLink && typeof model.directDownloadLink === 'string') {
      const filename = this.extractFilename(model.directDownloadLink);
      const quantMatch = filename.match(/\.(Q\d+_[KM]_[MS]|F16|F32|Q\d+_\d+|Q\d+)\./i);
      if (quantMatch) {
        return quantMatch[1].toUpperCase();
      }
    }
    
    // Try to extract from other filename fields
    if (model.filename && typeof model.filename === 'string') {
      const quantMatch = model.filename.match(/\.(Q\d+_[KM]_[MS]|F16|F32|Q\d+_\d+|Q\d+)\./i);
      if (quantMatch) {
        return quantMatch[1].toUpperCase();
      }
    }
    
    return 'Unknown';
  }

  /**
   * Ensure fileSize field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {number} File size in bytes
   */
  ensureFileSize(model, index) {
    if (typeof model.fileSize === 'number' && model.fileSize > 0) {
      return model.fileSize;
    }
    
    // Try alternative field names
    if (typeof model.estimated_size_bytes === 'number' && model.estimated_size_bytes > 0) {
      return model.estimated_size_bytes;
    }
    
    if (typeof model.size === 'number' && model.size > 0) {
      return model.size;
    }
    
    // Parse from formatted size if available
    if (model.fileSizeFormatted && typeof model.fileSizeFormatted === 'string') {
      const sizeMatch = model.fileSizeFormatted.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        const multipliers = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        return Math.round(value * multipliers[unit]);
      }
    }
    
    // Fallback based on model type or quantization
    const quantFormat = model.quantFormat || this.ensureQuantFormat(model, index);
    if (quantFormat.includes('Q4')) {
      return 2 * 1024 * 1024 * 1024; // 2GB for Q4
    } else if (quantFormat.includes('Q8') || quantFormat.includes('F16')) {
      return 4 * 1024 * 1024 * 1024; // 4GB for Q8/F16
    }
    
    return 1024 * 1024 * 1024; // 1GB default fallback
  }

  /**
   * Ensure modelType field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {string} Model type/architecture
   */
  ensureModelType(model, index) {
    if (model.modelType && typeof model.modelType === 'string') {
      return model.modelType;
    }
    
    // Try alternative field names
    if (model.architecture && typeof model.architecture === 'string') {
      return model.architecture;
    }
    
    if (model.model_type && typeof model.model_type === 'string') {
      return model.model_type;
    }
    
    // Try to infer from model name or ID
    const modelName = model.modelName || model.modelId || '';
    const nameLower = modelName.toLowerCase();
    
    if (nameLower.includes('llama')) return 'LLaMA';
    if (nameLower.includes('mistral')) return 'Mistral';
    if (nameLower.includes('phi')) return 'Phi';
    if (nameLower.includes('gemma')) return 'Gemma';
    if (nameLower.includes('qwen')) return 'Qwen';
    if (nameLower.includes('codellama')) return 'CodeLlama';
    if (nameLower.includes('vicuna')) return 'Vicuna';
    if (nameLower.includes('alpaca')) return 'Alpaca';
    
    return 'Unknown';
  }

  /**
   * Ensure downloadCount field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {number} Download count
   */
  ensureDownloadCount(model, index) {
    if (typeof model.downloadCount === 'number' && model.downloadCount >= 0) {
      return model.downloadCount;
    }
    
    // Try alternative field names
    if (typeof model.downloads === 'number' && model.downloads >= 0) {
      return model.downloads;
    }
    
    if (typeof model.download_count === 'number' && model.download_count >= 0) {
      return model.download_count;
    }
    
    return 0; // Default to 0 downloads
  }

  /**
   * Ensure fileSizeFormatted field with fallback
   * @param {Object} model - Model object (already migrated)
   * @returns {string} Formatted file size
   */
  ensureFileSizeFormatted(model) {
    if (model.fileSizeFormatted && typeof model.fileSizeFormatted === 'string') {
      return model.fileSizeFormatted;
    }
    
    // Generate from fileSize
    const bytes = model.fileSize;
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * Ensure huggingFaceLink field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {string} Hugging Face link
   */
  ensureHuggingFaceLink(model, index) {
    if (model.huggingFaceLink && typeof model.huggingFaceLink === 'string') {
      return model.huggingFaceLink;
    }
    
    // Try to construct from modelId
    if (model.modelId && typeof model.modelId === 'string') {
      return `https://huggingface.co/${model.modelId}`;
    }
    
    // Try to extract from directDownloadLink
    if (model.directDownloadLink && typeof model.directDownloadLink === 'string') {
      const match = model.directDownloadLink.match(/https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)/);
      if (match) {
        return `https://huggingface.co/${match[1]}`;
      }
    }
    
    return '#'; // Fallback to placeholder
  }

  /**
   * Ensure directDownloadLink field with fallback
   * @param {Object} model - Model object
   * @param {number} index - Model index
   * @returns {string} Direct download link
   */
  ensureDirectDownloadLink(model, index) {
    if (model.directDownloadLink && typeof model.directDownloadLink === 'string') {
      return model.directDownloadLink;
    }
    
    // Try alternative field names
    if (model.url && typeof model.url === 'string') {
      return model.url;
    }
    
    if (model.download_url && typeof model.download_url === 'string') {
      return model.download_url;
    }
    
    // Try to construct from other fields
    if (model.modelId && model.filename) {
      return `https://huggingface.co/${model.modelId}/resolve/main/${model.filename}`;
    }
    
    return '#'; // Fallback to placeholder
  }

  /**
   * Ensure license field with fallback
   * @param {Object} model - Model object
   * @returns {string} License information
   */
  ensureLicense(model) {
    if (model.license && typeof model.license === 'string') {
      return model.license;
    }
    
    return 'Not specified';
  }
}