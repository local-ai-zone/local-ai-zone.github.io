/**
 * Error Recovery Service
 * Handles error recovery strategies and fallback mechanisms
 */

export const ErrorTypes = {
  NETWORK: 'network',
  PARSING: 'parsing',
  RENDERING: 'rendering',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

export const RecoveryStrategies = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  CACHE: 'cache',
  IGNORE: 'ignore'
};

class ErrorRecoveryService {
  constructor() {
    this.recoveryStrategies = new Map();
    this.errorHistory = [];
    this.maxRetries = 3;
    
    this.setupDefaultStrategies();
  }

  setupDefaultStrategies() {
    this.recoveryStrategies.set(ErrorTypes.NETWORK, {
      strategy: RecoveryStrategies.RETRY,
      maxRetries: 3,
      backoffMs: 1000
    });
    
    this.recoveryStrategies.set(ErrorTypes.PARSING, {
      strategy: RecoveryStrategies.FALLBACK,
      fallbackData: []
    });
    
    this.recoveryStrategies.set(ErrorTypes.RENDERING, {
      strategy: RecoveryStrategies.IGNORE,
      logError: true
    });

    // Add strategy for workflow validation errors
    this.recoveryStrategies.set('VALIDATION', {
      strategy: RecoveryStrategies.FALLBACK,
      fallbackData: [],
      logError: true
    });
  }

  async handleError(error, context = {}) {
    const errorType = this.classifyError(error);
    const strategy = this.recoveryStrategies.get(errorType);
    
    this.logError(error, errorType, context);
    
    if (!strategy) {
      throw error;
    }
    
    switch (strategy.strategy) {
      case RecoveryStrategies.RETRY:
        return this.retryOperation(error, strategy, context);
      case RecoveryStrategies.FALLBACK:
        return this.useFallback(strategy, context);
      case RecoveryStrategies.CACHE:
        return this.useCachedData(context);
      case RecoveryStrategies.IGNORE:
        return null;
      default:
        throw error;
    }
  }

  classifyError(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorTypes.NETWORK;
    }
    if (error.name === 'SyntaxError') {
      return ErrorTypes.PARSING;
    }
    if (error.message.includes('timeout')) {
      return ErrorTypes.TIMEOUT;
    }
    // Handle workflow validation errors
    if (error.message.includes('workflow') || 
        error.message.includes('modelName') || 
        error.message.includes('quantFormat') ||
        error.message.includes('fileSize') ||
        error.message.includes('modelType') ||
        error.message.includes('downloadCount')) {
      return 'VALIDATION';
    }
    return ErrorTypes.UNKNOWN;
  }

  async retryOperation(error, strategy, context) {
    const retries = context.retries || 0;
    
    if (retries >= strategy.maxRetries) {
      throw error;
    }
    
    await this.delay(strategy.backoffMs * Math.pow(2, retries));
    
    if (context.operation) {
      return context.operation({ ...context, retries: retries + 1 });
    }
    
    throw error;
  }

  useFallback(strategy, context) {
    return strategy.fallbackData || null;
  }

  useCachedData(context) {
    // In a real implementation, this would check localStorage or cache
    return null;
  }

  logError(error, errorType, context) {
    const errorRecord = {
      error: error.message,
      type: errorType,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    this.errorHistory.push(errorRecord);
    console.error('Error Recovery Service:', errorRecord);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorHistory() {
    return [...this.errorHistory];
  }

  clearErrorHistory() {
    this.errorHistory = [];
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
export default ErrorRecoveryService;