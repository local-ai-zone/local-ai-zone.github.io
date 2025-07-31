/**
 * Third Party Integration Manager
 * Manages external service integrations and fallbacks
 */

class ThirdPartyIntegrationManager {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.fallbacks = new Map();
    
    this.setupDefaultServices();
  }

  setupDefaultServices() {
    this.registerService('huggingface', {
      baseUrl: 'https://huggingface.co',
      timeout: 10000,
      retries: 3
    });
    
    this.registerService('analytics', {
      baseUrl: 'https://analytics.example.com',
      timeout: 5000,
      retries: 1,
      optional: true
    });
  }

  registerService(name, config) {
    this.services.set(name, {
      ...config,
      status: 'unknown',
      lastCheck: null
    });
  }

  async checkServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    try {
      const response = await fetch(service.baseUrl, {
        method: 'HEAD',
        timeout: service.timeout
      });
      
      const isHealthy = response.ok;
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.lastCheck = new Date().toISOString();
      
      return isHealthy;
    } catch (error) {
      service.status = 'error';
      service.lastCheck = new Date().toISOString();
      service.lastError = error.message;
      
      return false;
    }
  }

  async makeRequest(serviceName, path, options = {}) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const url = `${service.baseUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        timeout: service.timeout,
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (service.optional) {
        console.warn(`Optional service ${serviceName} failed:`, error.message);
        return null;
      }
      
      const fallback = this.fallbacks.get(serviceName);
      if (fallback) {
        return fallback(path, options);
      }
      
      throw error;
    }
  }

  registerFallback(serviceName, fallbackFn) {
    this.fallbacks.set(serviceName, fallbackFn);
  }

  getServiceStatus(serviceName) {
    const service = this.services.get(serviceName);
    return service ? {
      name: serviceName,
      status: service.status,
      lastCheck: service.lastCheck,
      lastError: service.lastError
    } : null;
  }

  getAllServiceStatuses() {
    const statuses = [];
    for (const [name] of this.services) {
      statuses.push(this.getServiceStatus(name));
    }
    return statuses;
  }
}

export default ThirdPartyIntegrationManager;