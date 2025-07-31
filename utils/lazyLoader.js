/**
 * Lazy loading utilities for code splitting and performance optimization
 */

/**
 * Lazy load a component with loading state
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Loading options
 * @returns {Promise} Component promise
 */
export async function lazyLoadComponent(importFn, options = {}) {
  const {
    loadingMessage = 'Loading...',
    errorMessage = 'Failed to load component',
    timeout = 10000
  } = options;

  try {
    // Show loading state if container provided
    if (options.container) {
      showLoadingState(options.container, loadingMessage);
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Component load timeout')), timeout);
    });

    // Race between import and timeout
    const module = await Promise.race([importFn(), timeoutPromise]);
    
    // Clear loading state
    if (options.container) {
      clearLoadingState(options.container);
    }

    return module;
    
  } catch (error) {
    console.error('Failed to lazy load component:', error);
    
    if (options.container) {
      showErrorState(options.container, errorMessage);
    }
    
    throw error;
  }
}

/**
 * Show loading state in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 */
function showLoadingState(container, message) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
      <span class="text-gray-600">${message}</span>
    </div>
  `;
}

/**
 * Show error state in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 */
function showErrorState(container, message) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-8 text-red-600">
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;
}

/**
 * Clear loading/error state from container
 * @param {HTMLElement} container - Container element
 */
function clearLoadingState(container) {
  // This will be cleared when the actual component renders
}

/**
 * Preload a component for better UX
 * @param {Function} importFn - Dynamic import function
 * @returns {Promise} Preload promise
 */
export function preloadComponent(importFn) {
  return importFn().catch(error => {
    console.warn('Component preload failed:', error);
  });
}

/**
 * Create a lazy-loaded component factory
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Factory options
 * @returns {Function} Component factory
 */
export function createLazyComponent(importFn, options = {}) {
  let componentPromise = null;
  
  return async function LazyComponent(container, props = {}) {
    // Reuse existing promise if available
    if (!componentPromise) {
      componentPromise = lazyLoadComponent(importFn, {
        ...options,
        container
      });
    }
    
    try {
      const module = await componentPromise;
      const Component = module.default || module;
      
      // Instantiate and render component
      const instance = new Component(props);
      const element = instance.render();
      
      // Replace loading state with actual component
      container.innerHTML = '';
      container.appendChild(element);
      
      return instance;
      
    } catch (error) {
      console.error('Lazy component instantiation failed:', error);
      throw error;
    }
  };
}

/**
 * Intersection Observer based lazy loading for components
 * @param {HTMLElement} trigger - Element that triggers loading
 * @param {Function} loadFn - Function to call when triggered
 * @param {Object} options - Observer options
 */
export function lazyLoadOnIntersection(trigger, loadFn, options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    once = true
  } = options;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadFn();
        
        if (once) {
          observer.unobserve(trigger);
        }
      }
    });
  }, {
    threshold,
    rootMargin
  });

  observer.observe(trigger);
  
  return observer;
}

/**
 * Lazy load resources (images, scripts, etc.)
 * @param {string} src - Resource URL
 * @param {string} type - Resource type ('image', 'script', 'style')
 * @returns {Promise} Load promise
 */
export function lazyLoadResource(src, type = 'image') {
  return new Promise((resolve, reject) => {
    let element;
    
    switch (type) {
      case 'image':
        element = new Image();
        element.onload = resolve;
        element.onerror = reject;
        element.src = src;
        break;
        
      case 'script':
        element = document.createElement('script');
        element.onload = resolve;
        element.onerror = reject;
        element.src = src;
        document.head.appendChild(element);
        break;
        
      case 'style':
        element = document.createElement('link');
        element.rel = 'stylesheet';
        element.onload = resolve;
        element.onerror = reject;
        element.href = src;
        document.head.appendChild(element);
        break;
        
      default:
        reject(new Error(`Unsupported resource type: ${type}`));
    }
  });
}

/**
 * Batch lazy loading with priority
 * @param {Array} resources - Array of resource objects
 * @param {Object} options - Batch options
 * @returns {Promise} Batch load promise
 */
export async function batchLazyLoad(resources, options = {}) {
  const {
    concurrency = 3,
    priority = 'normal' // 'high', 'normal', 'low'
  } = options;

  // Sort by priority if specified
  const sortedResources = resources.sort((a, b) => {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
  });

  // Load in batches
  const results = [];
  for (let i = 0; i < sortedResources.length; i += concurrency) {
    const batch = sortedResources.slice(i, i + concurrency);
    const batchPromises = batch.map(resource => 
      lazyLoadResource(resource.src, resource.type)
        .catch(error => ({ error, resource }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}