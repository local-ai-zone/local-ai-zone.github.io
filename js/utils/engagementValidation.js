/**
 * Engagement metrics validation utilities for GGUF Model Discovery
 * Handles validation, error handling, and fallback logic for engagement data
 */

class EngagementValidation {
    /**
     * Validation configuration
     */
    static config = {
        maxReasonableValue: 10_000_000, // 10 million likes seems unreasonable
        minValue: 0,
        defaultValue: 0,
        enableLogging: true
    };

    /**
     * Validate engagement metric value with comprehensive error handling
     * @param {any} value - Value to validate
     * @param {string} context - Context for error logging (e.g., model name)
     * @param {string} metricName - Name of the metric being validated
     * @returns {Object} Validation result with value and status
     */
    static validateEngagementMetric(value, context = 'unknown', metricName = 'engagement') {
        const result = {
            value: this.config.defaultValue,
            isValid: false,
            wasModified: false,
            error: null,
            warning: null
        };

        try {
            // Handle null/undefined
            if (value == null) {
                result.warning = `${context}: ${metricName} is null/undefined, using default value 0`;
                this._log('warn', result.warning);
                return result;
            }

            // Handle string values
            if (typeof value === 'string') {
                const trimmed = value.trim();
                
                // Handle empty or special strings
                if (trimmed === '' || ['null', 'undefined', 'n/a', 'na', 'none'].includes(trimmed.toLowerCase())) {
                    result.warning = `${context}: ${metricName} is empty/null string, using default value 0`;
                    this._log('warn', result.warning);
                    return result;
                }
                
                // Try to parse as number
                const parsed = parseFloat(trimmed);
                if (isNaN(parsed)) {
                    result.error = `${context}: Cannot parse ${metricName} string "${value}" as number`;
                    this._log('error', result.error);
                    return result;
                }
                
                value = parsed;
                result.wasModified = true;
            }

            // Handle boolean values (convert to 0/1)
            if (typeof value === 'boolean') {
                value = value ? 1 : 0;
                result.wasModified = true;
                result.warning = `${context}: ${metricName} boolean converted to ${value}`;
                this._log('warn', result.warning);
            }

            // Convert to number if not already
            const num = Number(value);
            
            // Check if it's a valid number
            if (isNaN(num)) {
                result.error = `${context}: ${metricName} value "${value}" is not a valid number`;
                this._log('error', result.error);
                return result;
            }

            // Check for infinity
            if (!isFinite(num)) {
                result.error = `${context}: ${metricName} value is infinite: ${value}`;
                this._log('error', result.error);
                return result;
            }

            // Ensure non-negative
            if (num < this.config.minValue) {
                result.warning = `${context}: Negative ${metricName} (${num}), using ${this.config.minValue}`;
                this._log('warn', result.warning);
                result.value = this.config.minValue;
                result.wasModified = true;
                result.isValid = true;
                return result;
            }

            // Convert to integer
            const intValue = Math.floor(num);
            if (intValue !== num) {
                result.wasModified = true;
                result.warning = `${context}: ${metricName} converted from ${num} to ${intValue}`;
                this._log('debug', result.warning);
            }

            // Check for suspiciously high values
            if (intValue > this.config.maxReasonableValue) {
                result.warning = `${context}: Suspiciously high ${metricName} (${intValue}), capping at ${this.config.maxReasonableValue}`;
                this._log('warn', result.warning);
                result.value = this.config.maxReasonableValue;
                result.wasModified = true;
                result.isValid = true;
                return result;
            }

            // Value is valid
            result.value = intValue;
            result.isValid = true;
            
            return result;

        } catch (error) {
            result.error = `${context}: Unexpected error validating ${metricName}: ${error.message}`;
            this._log('error', result.error);
            return result;
        }
    }

    /**
     * Validate multiple engagement metrics for a model
     * @param {Object} model - Model object with engagement metrics
     * @returns {Object} Validation results for all metrics
     */
    static validateModelEngagementMetrics(model) {
        const modelName = model.modelName || model.id || 'unknown';
        const results = {
            likeCount: null,
            hasErrors: false,
            hasWarnings: false,
            modifiedFields: []
        };

        // Validate like count
        if (model.hasOwnProperty('likeCount')) {
            results.likeCount = this.validateEngagementMetric(model.likeCount, modelName, 'likeCount');
            
            if (results.likeCount.error) {
                results.hasErrors = true;
            }
            if (results.likeCount.warning) {
                results.hasWarnings = true;
            }
            if (results.likeCount.wasModified) {
                results.modifiedFields.push('likeCount');
            }
        }

        return results;
    }

    /**
     * Apply validation results to a model object
     * @param {Object} model - Model object to update
     * @param {Object} validationResults - Results from validateModelEngagementMetrics
     * @returns {Object} Updated model object
     */
    static applyValidationResults(model, validationResults) {
        const updatedModel = { ...model };

        if (validationResults.likeCount) {
            updatedModel.likeCount = validationResults.likeCount.value;
        }

        return updatedModel;
    }

    /**
     * Check if engagement data is available and valid for display
     * @param {Object} model - Model object
     * @returns {boolean} True if engagement data should be displayed
     */
    static shouldDisplayEngagement(model) {
        if (!model || typeof model !== 'object') {
            return false;
        }

        const likeCount = model.likeCount;
        
        // Don't display if value is null/undefined
        if (likeCount == null) {
            return false;
        }

        // Don't display if value is 0 (no engagement)
        if (likeCount === 0) {
            return false;
        }

        // Validate the value
        const validation = this.validateEngagementMetric(likeCount, 'display-check', 'likeCount');
        return validation.isValid && validation.value > 0;
    }

    /**
     * Get fallback display text when engagement data is unavailable
     * @param {Object} model - Model object
     * @param {string} metricType - Type of metric ('likes', 'stars', etc.)
     * @returns {string} Fallback display text
     */
    static getFallbackDisplayText(model, metricType = 'likes') {
        // Check if the model has the field but it's invalid
        if (model && model.hasOwnProperty('likeCount')) {
            const validation = this.validateEngagementMetric(model.likeCount, 'fallback-check', 'likeCount');
            if (!validation.isValid) {
                return 'N/A';
            }
            if (validation.value === 0) {
                return '0';
            }
        }

        return 'N/A';
    }

    /**
     * Get engagement display configuration based on validation
     * @param {Object} model - Model object
     * @returns {Object} Display configuration
     */
    static getEngagementDisplayConfig(model) {
        const config = {
            shouldDisplay: false,
            displayValue: 'N/A',
            displayClass: 'engagement-unavailable',
            tooltip: 'Engagement data unavailable',
            showIcon: false
        };

        if (!model || typeof model !== 'object') {
            return config;
        }

        const validation = this.validateEngagementMetric(model.likeCount, model.modelName || 'unknown', 'likeCount');
        
        if (validation.isValid && validation.value > 0) {
            config.shouldDisplay = true;
            config.displayValue = window.Formatters ? 
                window.Formatters.formatEngagementNumber(validation.value) : 
                validation.value.toString();
            config.displayClass = window.EngagementUtils ? 
                window.EngagementUtils.getEngagementClass(validation.value) : 
                'engagement-valid';
            config.tooltip = window.EngagementUtils ? 
                window.EngagementUtils.getEngagementTooltip(validation.value) : 
                `${validation.value} likes`;
            config.showIcon = true;
        } else if (validation.isValid && validation.value === 0) {
            config.displayValue = '0';
            config.tooltip = 'No likes yet';
            config.displayClass = 'engagement-zero';
        } else {
            config.tooltip = validation.error || validation.warning || 'Invalid engagement data';
            config.displayClass = 'engagement-error';
        }

        return config;
    }

    /**
     * Batch validate engagement metrics for multiple models
     * @param {Array} models - Array of model objects
     * @returns {Object} Batch validation results
     */
    static batchValidateEngagementMetrics(models) {
        if (!Array.isArray(models)) {
            return {
                totalModels: 0,
                validModels: 0,
                modelsWithErrors: 0,
                modelsWithWarnings: 0,
                modelsModified: 0,
                validatedModels: []
            };
        }

        const results = {
            totalModels: models.length,
            validModels: 0,
            modelsWithErrors: 0,
            modelsWithWarnings: 0,
            modelsModified: 0,
            validatedModels: []
        };

        models.forEach((model, index) => {
            try {
                const validation = this.validateModelEngagementMetrics(model);
                const updatedModel = this.applyValidationResults(model, validation);
                
                results.validatedModels.push(updatedModel);
                
                if (validation.likeCount && validation.likeCount.isValid) {
                    results.validModels++;
                }
                if (validation.hasErrors) {
                    results.modelsWithErrors++;
                }
                if (validation.hasWarnings) {
                    results.modelsWithWarnings++;
                }
                if (validation.modifiedFields.length > 0) {
                    results.modelsModified++;
                }
                
            } catch (error) {
                this._log('error', `Error validating model at index ${index}: ${error.message}`);
                results.modelsWithErrors++;
                results.validatedModels.push(model); // Keep original model if validation fails
            }
        });

        // Log batch results
        if (results.modelsWithErrors > 0 || results.modelsWithWarnings > 0) {
            this._log('info', `Batch validation completed: ${results.validModels}/${results.totalModels} valid, ${results.modelsWithErrors} errors, ${results.modelsWithWarnings} warnings, ${results.modelsModified} modified`);
        }

        return results;
    }

    /**
     * Configure validation settings
     * @param {Object} newConfig - New configuration options
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this._log('info', 'EngagementValidation configuration updated:', this.config);
    }

    /**
     * Get current validation statistics
     * @returns {Object} Current configuration and statistics
     */
    static getValidationStats() {
        return {
            config: { ...this.config },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Internal logging method
     * @private
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    static _log(level, message, data = null) {
        if (!this.config.enableLogging) {
            return;
        }

        const logMessage = `[EngagementValidation] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'info':
                console.info(logMessage, data);
                break;
            case 'debug':
                console.debug(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
}

// Export for use in other modules
window.EngagementValidation = EngagementValidation;