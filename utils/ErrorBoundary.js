/**
 * Error Boundary Utility
 * Provides error boundary functionality for JavaScript applications
 */

class ErrorBoundary {
  constructor(options = {}) {
    this.options = {
      fallbackUI: options.fallbackUI || this.defaultFallbackUI,
      onError: options.onError || this.defaultErrorHandler,
      logErrors: options.logErrors !== false
    };
    
    this.errors = [];
    this.setupGlobalErrorHandling();
  }

  setupGlobalErrorHandling() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(event.error, { type: 'javascript' });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, { type: 'promise' });
      });
    }
  }

  handleError(error, context = {}) {
    const errorInfo = {
      error,
      context,
      timestamp: new Date().toISOString(),
      stack: error?.stack
    };
    
    this.errors.push(errorInfo);
    
    if (this.options.logErrors) {
      console.error('Error Boundary caught error:', errorInfo);
    }
    
    this.options.onError(error, context);
    
    return this.options.fallbackUI(error, context);
  }

  defaultErrorHandler(error, context) {
    // Default error handling - could send to analytics service
    console.error('Unhandled error:', error, context);
  }

  defaultFallbackUI(error, context) {
    const fallbackElement = document.createElement('div');
    fallbackElement.className = 'error-boundary-fallback';
    fallbackElement.innerHTML = `
      <div class="error-message">
        <h3>Something went wrong</h3>
        <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
        <details>
          <summary>Error details</summary>
          <pre>${error?.message || 'Unknown error'}</pre>
        </details>
      </div>
    `;
    return fallbackElement;
  }

  wrap(fn, context = {}) {
    return (...args) => {
      try {
        const result = fn.apply(this, args);
        
        // Handle promises
        if (result && typeof result.catch === 'function') {
          return result.catch(error => {
            this.handleError(error, { ...context, type: 'async' });
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error, { ...context, type: 'sync' });
        throw error;
      }
    };
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

// Global error boundary instance
export const globalErrorBoundary = new ErrorBoundary();

// Higher-order function to wrap components with error boundary
export function withErrorBoundary(component, options = {}) {
  const errorBoundary = new ErrorBoundary(options);
  
  return function wrappedComponent(...args) {
    try {
      return component.apply(this, args);
    } catch (error) {
      return errorBoundary.handleError(error, { component: component.name });
    }
  };
}

export default ErrorBoundary;