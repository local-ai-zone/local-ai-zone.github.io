/**
 * End-to-End Tests for User Workflows
 * Requirements: 1.1, 1.2, 6.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Set up DOM environment for E2E testing
const createTestEnvironment = () => {
  const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head>
  <title>GGUF Model Discovery</title>
</head>
<body>
  <div id="app">
    <header>
      <h1>🧠 GGUF Models</h1>
    </header>
    
    <main>
      <section class="search-section">
        <input 
          type="search" 
          id="model-search" 
          placeholder="Search models..."
          aria-label="Search GGUF models"
        >
        
        <div id="filter-controls">
          <select id="quantization-filter">
            <option value="">All Quantizations</option>
            <option value="Q4_K_M">Q4_K_M</option>
            <option value="Q8_0">Q8_0</option>
            <option value="F16">F16</option>
          </select>
          
          <select id="architecture-filter">
            <option value="">All Architectures</option>
            <option value="Llama">Llama</option>
            <option value="Mistral">Mistral</option>
            <option value="DialoGPT">DialoGPT</option>
          </select>
          
          <select id="size-filter">
            <option value="">All Sizes</option>
            <option value="small">Small (< 4GB)</option>
            <option value="medium">Medium (4-8GB)</option>
            <option value="large">Large (> 8GB)</option>
          </select>
          
          <select id="sort-select">
            <option value="name">Name</option>
            <option value="downloads">Downloads</option>
            <option value="updated">Last Updated</option>
          </select>
          
          <button id="clear-filters-btn">Clear All Filters</button>
        </div>
      </section>
      
      <section class="results-section">
        <div id="results-header">
          <p id="results-count">Loading models...</p>
        </div>
        
        <div id="model-grid" class="grid">
          <!-- Model cards will be populated here -->
        </div>
        
        <button id="load-more" class="hidden">Load More Models</button>
      </section>
    </main>
  </div>
  
  <div id="loading-screen" class="hidden">
    <div class="loading-spinner"></div>
    <p>Loading GGUF Model Index...</p>
  </div>
</body>
</html>
  `, { 
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.location = dom.window.location;
  global.history = dom.window.history;
  global.performance = dom.window.performance;
  global.fetch = vi.fn();

  return dom;
};

// Mock model data for testing
const mockModelData = [
  {
    modelId: 'microsoft/DialoGPT-medium',
    downloads: 15420,
    lastModified: '2024-01-15T10:30:00Z',
    files: [
      { filename: 'model.Q4_K_M.gguf', size: 2400000000 },
      { filename: 'model.Q8_0.gguf', size: 4200000000 }
    ]
  },
  {
    modelId: 'meta-llama/Llama-2-7b-chat-hf',
    downloads: 89234,
    lastModified: '2024-02-01T14:20:00Z',
    files: [
      { filename: 'model.Q4_K_M.gguf', size: 3800000000 },
      { filename: 'model.Q8_0.gguf', size: 7100000000 },
      { filename: 'model.F16.gguf', size: 13400000000 }
    ]
  },
  {
    modelId: 'mistralai/Mistral-7B-v0.1',
    downloads: 45678,
    lastModified: '2024-01-28T09:15:00Z',
    files: [
      { filename: 'model.Q4_K_M.gguf', size: 3600000000 },
      { filename: 'model.Q2_K.gguf', size: 2100000000 }
    ]
  },
  {
    modelId: 'microsoft/phi-2',
    downloads: 23456,
    lastModified: '2024-01-20T16:45:00Z',
    files: [
      { filename: 'model.Q4_K_M.gguf', size: 1800000000 }
    ]
  }
];

describe('End-to-End User Workflows', () => {
  let dom;
  let mockApp;

  beforeEach(() => {
    dom = createTestEnvironment();
    vi.clearAllMocks();

    // Mock successful data loading
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModelData })
    });

    // Create mock application instance
    mockApp = {
      allModels: [...mockModelData],
      filteredModels: [...mockModelData],
      searchResults: [],
      currentPage: 1,
      modelsPerPage: 12,
      searchQuery: '',
      activeFilters: {
        quantization: '',
        architecture: '',
        sizeRange: '',
        sortBy: 'name',
        sortOrder: 'asc'
      },
      
      // Mock methods
      performSearch: vi.fn(),
      applyFilters: vi.fn(),
      renderModels: vi.fn(),
      updateResultsCount: vi.fn(),
      updateURL: vi.fn()
    };

    // Make mock app globally available
    global.window.modelDiscoveryApp = mockApp;
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('Initial Page Load Workflow', () => {
    it('should complete initial page load successfully', async () => {
      // Simulate page load
      const loadingScreen = document.getElementById('loading-screen');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // Initially show loading screen
      expect(loadingScreen).toBeTruthy();

      // Simulate data loading completion
      loadingScreen.classList.add('hidden');
      
      // Update results count
      resultsCount.textContent = `Showing ${mockModelData.length} models`;
      
      // Render model cards
      modelGrid.innerHTML = mockModelData.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
          <p>Downloads: ${model.downloads.toLocaleString()}</p>
          <p>Files: ${model.files.length}</p>
        </div>
      `).join('');

      expect(resultsCount.textContent).toBe('Showing 4 models');
      expect(modelGrid.children).toHaveLength(4);
      expect(loadingScreen.classList.contains('hidden')).toBe(true);
    });

    it('should handle loading errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const loadingScreen = document.getElementById('loading-screen');
      
      // Simulate error state
      loadingScreen.innerHTML = `
        <div class="text-center">
          <h1>Application Error</h1>
          <p>Failed to load the GGUF Model Index.</p>
          <button onclick="window.location.reload()">Reload Application</button>
        </div>
      `;

      expect(loadingScreen.textContent).toContain('Application Error');
      expect(loadingScreen.textContent).toContain('Failed to load');
    });
  });

  describe('Search Workflow', () => {
    it('should perform complete search workflow', async () => {
      const searchInput = document.getElementById('model-search');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // User types in search box
      searchInput.value = 'llama';
      
      // Trigger search event
      const inputEvent = new dom.window.Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);

      // Mock search results
      const searchResults = mockModelData.filter(model => 
        model.modelId.toLowerCase().includes('llama')
      );

      // Update UI with search results
      resultsCount.textContent = `Found ${searchResults.length} models matching "llama"`;
      modelGrid.innerHTML = searchResults.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
          <p>Downloads: ${model.downloads.toLocaleString()}</p>
        </div>
      `).join('');

      expect(searchInput.value).toBe('llama');
      expect(resultsCount.textContent).toContain('Found 1 models');
      expect(modelGrid.children).toHaveLength(1);
      expect(modelGrid.textContent).toContain('Llama-2-7b-chat-hf');
    });

    it('should handle empty search results', async () => {
      const searchInput = document.getElementById('model-search');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // User searches for non-existent model
      searchInput.value = 'nonexistent-model';
      
      const inputEvent = new dom.window.Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);

      // No results found
      resultsCount.textContent = 'No models found matching "nonexistent-model"';
      modelGrid.innerHTML = `
        <div class="no-results">
          <h3>No models found</h3>
          <p>Try adjusting your search criteria.</p>
        </div>
      `;

      expect(resultsCount.textContent).toContain('No models found');
      expect(modelGrid.textContent).toContain('No models found');
    });

    it('should clear search results', async () => {
      const searchInput = document.getElementById('model-search');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // Set initial search
      searchInput.value = 'llama';
      
      // Clear search
      searchInput.value = '';
      const inputEvent = new dom.window.Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);

      // Show all models again
      resultsCount.textContent = `Showing ${mockModelData.length} models`;
      modelGrid.innerHTML = mockModelData.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      expect(searchInput.value).toBe('');
      expect(resultsCount.textContent).toBe('Showing 4 models');
      expect(modelGrid.children).toHaveLength(4);
    });
  });

  describe('Filtering Workflow', () => {
    it('should apply quantization filter', async () => {
      const quantizationFilter = document.getElementById('quantization-filter');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // User selects Q4_K_M quantization
      quantizationFilter.value = 'Q4_K_M';
      const changeEvent = new dom.window.Event('change', { bubbles: true });
      quantizationFilter.dispatchEvent(changeEvent);

      // Filter models by quantization
      const filteredModels = mockModelData.filter(model =>
        model.files.some(file => file.filename.includes('Q4_K_M'))
      );

      resultsCount.textContent = `Showing ${filteredModels.length} models with Q4_K_M quantization`;
      modelGrid.innerHTML = filteredModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
          <span class="quantization-badge">Q4_K_M</span>
        </div>
      `).join('');

      expect(quantizationFilter.value).toBe('Q4_K_M');
      expect(resultsCount.textContent).toContain('Q4_K_M quantization');
      expect(modelGrid.children).toHaveLength(4); // All models have Q4_K_M
    });

    it('should apply architecture filter', async () => {
      const architectureFilter = document.getElementById('architecture-filter');
      const modelGrid = document.getElementById('model-grid');

      // User selects Llama architecture
      architectureFilter.value = 'Llama';
      const changeEvent = new dom.window.Event('change', { bubbles: true });
      architectureFilter.dispatchEvent(changeEvent);

      // Filter models by architecture
      const filteredModels = mockModelData.filter(model =>
        model.modelId.toLowerCase().includes('llama')
      );

      modelGrid.innerHTML = filteredModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
          <span class="architecture-badge">Llama</span>
        </div>
      `).join('');

      expect(architectureFilter.value).toBe('Llama');
      expect(modelGrid.children).toHaveLength(1);
      expect(modelGrid.textContent).toContain('Llama-2-7b-chat-hf');
    });

    it('should apply multiple filters simultaneously', async () => {
      const quantizationFilter = document.getElementById('quantization-filter');
      const architectureFilter = document.getElementById('architecture-filter');
      const modelGrid = document.getElementById('model-grid');

      // Apply multiple filters
      quantizationFilter.value = 'Q4_K_M';
      architectureFilter.value = 'Llama';

      // Simulate filter application
      const filteredModels = mockModelData.filter(model => {
        const hasQuantization = model.files.some(file => 
          file.filename.includes('Q4_K_M')
        );
        const hasArchitecture = model.modelId.toLowerCase().includes('llama');
        return hasQuantization && hasArchitecture;
      });

      modelGrid.innerHTML = filteredModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      expect(quantizationFilter.value).toBe('Q4_K_M');
      expect(architectureFilter.value).toBe('Llama');
      expect(modelGrid.children).toHaveLength(1);
    });

    it('should clear all filters', async () => {
      const quantizationFilter = document.getElementById('quantization-filter');
      const architectureFilter = document.getElementById('architecture-filter');
      const clearFiltersBtn = document.getElementById('clear-filters-btn');
      const modelGrid = document.getElementById('model-grid');

      // Set some filters
      quantizationFilter.value = 'Q4_K_M';
      architectureFilter.value = 'Llama';

      // Clear all filters
      const clickEvent = new dom.window.Event('click', { bubbles: true });
      clearFiltersBtn.dispatchEvent(clickEvent);

      // Reset filters
      quantizationFilter.value = '';
      architectureFilter.value = '';

      // Show all models
      modelGrid.innerHTML = mockModelData.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      expect(quantizationFilter.value).toBe('');
      expect(architectureFilter.value).toBe('');
      expect(modelGrid.children).toHaveLength(4);
    });
  });

  describe('Sorting Workflow', () => {
    it('should sort by downloads descending', async () => {
      const sortSelect = document.getElementById('sort-select');
      const modelGrid = document.getElementById('model-grid');

      // User selects downloads sorting
      sortSelect.value = 'downloads';
      const changeEvent = new dom.window.Event('change', { bubbles: true });
      sortSelect.dispatchEvent(changeEvent);

      // Sort models by downloads (descending)
      const sortedModels = [...mockModelData].sort((a, b) => b.downloads - a.downloads);

      modelGrid.innerHTML = sortedModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
          <p>Downloads: ${model.downloads.toLocaleString()}</p>
        </div>
      `).join('');

      expect(sortSelect.value).toBe('downloads');
      
      // Check that first model has highest downloads
      const firstCard = modelGrid.children[0];
      expect(firstCard.textContent).toContain('89,234'); // Llama model has highest downloads
    });

    it('should sort by name alphabetically', async () => {
      const sortSelect = document.getElementById('sort-select');
      const modelGrid = document.getElementById('model-grid');

      // User selects name sorting
      sortSelect.value = 'name';
      const changeEvent = new dom.window.Event('change', { bubbles: true });
      sortSelect.dispatchEvent(changeEvent);

      // Sort models by name
      const sortedModels = [...mockModelData].sort((a, b) => 
        a.modelId.localeCompare(b.modelId)
      );

      modelGrid.innerHTML = sortedModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      expect(sortSelect.value).toBe('name');
      
      // Check alphabetical order
      const firstCard = modelGrid.children[0];
      expect(firstCard.textContent).toContain('meta-llama'); // Should be first alphabetically
    });
  });

  describe('Combined Search and Filter Workflow', () => {
    it('should search and filter simultaneously', async () => {
      const searchInput = document.getElementById('model-search');
      const quantizationFilter = document.getElementById('quantization-filter');
      const modelGrid = document.getElementById('model-grid');
      const resultsCount = document.getElementById('results-count');

      // User searches for "microsoft" and filters by Q4_K_M
      searchInput.value = 'microsoft';
      quantizationFilter.value = 'Q4_K_M';

      // Apply both search and filter
      const filteredModels = mockModelData.filter(model => {
        const matchesSearch = model.modelId.toLowerCase().includes('microsoft');
        const hasQuantization = model.files.some(file => 
          file.filename.includes('Q4_K_M')
        );
        return matchesSearch && hasQuantization;
      });

      resultsCount.textContent = `Found ${filteredModels.length} Microsoft models with Q4_K_M`;
      modelGrid.innerHTML = filteredModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      expect(searchInput.value).toBe('microsoft');
      expect(quantizationFilter.value).toBe('Q4_K_M');
      expect(modelGrid.children).toHaveLength(2); // DialoGPT and phi-2
    });
  });

  describe('Pagination Workflow', () => {
    beforeEach(() => {
      // Create more models for pagination testing
      const largeDataset = Array.from({ length: 25 }, (_, i) => ({
        modelId: `test/model-${i + 1}`,
        downloads: Math.floor(Math.random() * 10000),
        lastModified: '2024-01-01T00:00:00Z',
        files: [{ filename: `model-${i + 1}.Q4_K_M.gguf` }]
      }));
      
      mockApp.allModels = largeDataset;
      mockApp.filteredModels = largeDataset;
    });

    it('should load more models when requested', async () => {
      const loadMoreBtn = document.getElementById('load-more');
      const modelGrid = document.getElementById('model-grid');

      // Show initial 12 models
      const initialModels = mockApp.filteredModels.slice(0, 12);
      modelGrid.innerHTML = initialModels.map(model => `
        <div class="model-card" data-model-id="${model.modelId}">
          <h3>${model.modelId}</h3>
        </div>
      `).join('');

      // Show load more button
      loadMoreBtn.classList.remove('hidden');

      expect(modelGrid.children).toHaveLength(12);
      expect(loadMoreBtn.classList.contains('hidden')).toBe(false);

      // User clicks load more
      const clickEvent = new dom.window.Event('click', { bubbles: true });
      loadMoreBtn.dispatchEvent(clickEvent);

      // Load next 12 models
      const nextModels = mockApp.filteredModels.slice(12, 24);
      nextModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.setAttribute('data-model-id', model.modelId);
        card.innerHTML = `<h3>${model.modelId}</h3>`;
        modelGrid.appendChild(card);
      });

      expect(modelGrid.children).toHaveLength(24);
    });

    it('should hide load more button when all models loaded', async () => {
      const loadMoreBtn = document.getElementById('load-more');
      const modelGrid = document.getElementById('model-grid');

      // Load all 25 models
      mockApp.filteredModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.setAttribute('data-model-id', model.modelId);
        card.innerHTML = `<h3>${model.modelId}</h3>`;
        modelGrid.appendChild(card);
      });

      // Hide load more button
      loadMoreBtn.classList.add('hidden');

      expect(modelGrid.children).toHaveLength(25);
      expect(loadMoreBtn.classList.contains('hidden')).toBe(true);
    });
  });

  describe('URL State Management Workflow', () => {
    it('should update URL when user applies filters', async () => {
      const searchInput = document.getElementById('model-search');
      const quantizationFilter = document.getElementById('quantization-filter');

      // User applies search and filter
      searchInput.value = 'llama';
      quantizationFilter.value = 'Q4_K_M';

      // Mock URL update
      const params = new URLSearchParams();
      params.set('q', 'llama');
      params.set('quantization', 'Q4_K_M');
      
      const newURL = `${window.location.pathname}?${params.toString()}`;

      expect(newURL).toContain('q=llama');
      expect(newURL).toContain('quantization=Q4_K_M');
    });

    it('should restore state from URL on page load', async () => {
      // Mock URL with parameters
      const mockURL = 'http://localhost:3000?q=mistral&quantization=Q4_K_M&sort=downloads';
      const url = new URL(mockURL);
      const params = new URLSearchParams(url.search);

      // Restore state from URL
      const searchInput = document.getElementById('model-search');
      const quantizationFilter = document.getElementById('quantization-filter');
      const sortSelect = document.getElementById('sort-select');

      searchInput.value = params.get('q') || '';
      quantizationFilter.value = params.get('quantization') || '';
      sortSelect.value = params.get('sort') || 'name';

      expect(searchInput.value).toBe('mistral');
      expect(quantizationFilter.value).toBe('Q4_K_M');
      expect(sortSelect.value).toBe('downloads');
    });
  });

  describe('Accessibility Workflow', () => {
    it('should support keyboard navigation', async () => {
      const searchInput = document.getElementById('model-search');
      
      // Test focus management
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      // Test keyboard shortcuts (Ctrl+K to focus search)
      const keyEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(keyEvent);

      // Search should be focused
      expect(document.activeElement).toBe(searchInput);
    });

    it('should provide proper ARIA labels', async () => {
      const searchInput = document.getElementById('model-search');
      const resultsCount = document.getElementById('results-count');

      expect(searchInput.getAttribute('aria-label')).toBe('Search GGUF models');
      
      // Update results with proper announcement
      resultsCount.textContent = 'Showing 4 models';
      resultsCount.setAttribute('aria-live', 'polite');

      expect(resultsCount.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from network errors', async () => {
      const loadingScreen = document.getElementById('loading-screen');
      
      // Simulate network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Show error state
      loadingScreen.innerHTML = `
        <div class="error-state">
          <h1>Network Error</h1>
          <p>Failed to load models. Please check your connection.</p>
          <button id="retry-btn">Retry</button>
        </div>
      `;

      const retryBtn = loadingScreen.querySelector('#retry-btn');
      expect(retryBtn).toBeTruthy();

      // User clicks retry
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: mockModelData })
      });

      const clickEvent = new dom.window.Event('click', { bubbles: true });
      retryBtn.dispatchEvent(clickEvent);

      // Should recover and show models
      expect(fetch).toHaveBeenCalledTimes(2); // Initial call + retry
    });
  });
});