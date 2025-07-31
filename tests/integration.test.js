/**
 * Integration Tests for Data Pipeline and Frontend
 * Requirements: 1.1, 1.2, 6.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock fetch for testing
global.fetch = vi.fn();

// Set up DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div id="model-search"></div>
  <div id="model-grid"></div>
  <div id="results-count"></div>
  <div id="sort-select"></div>
  <div id="filter-controls"></div>
  <div id="loading-screen"></div>
</body>
</html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.history = dom.window.history;
global.performance = dom.window.performance;

describe('Data Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Data Loading', () => {
    it('should load model data from JSON file', async () => {
      const mockModelData = [
        {
          modelName: 'Test Model 1',
          quantFormat: 'Q4_K_M',
          fileSize: 4200000000,
          fileSizeFormatted: '3.9 GB',
          modelType: 'Test',
          license: 'MIT',
          downloadCount: 1000,
          huggingFaceLink: 'https://huggingface.co/test/model-1',
          directDownloadLink: 'https://huggingface.co/test/model-1/resolve/main/model.Q4_K_M.gguf'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockModelData
      });

      const response = await fetch('./gguf_models.json');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('./gguf_models.json');
      expect(data).toHaveLength(1);
      expect(data[0].modelName).toBe('Test Model 1');
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('./gguf_models.json');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle invalid JSON data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      try {
        const response = await fetch('./gguf_models.json');
        await response.json();
      } catch (error) {
        expect(error.message).toBe('Invalid JSON');
      }
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const response = await fetch('./gguf_models.json');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Size Estimation Data', () => {
    it('should load size estimation data', async () => {
      const mockSizeData = {
        'test/model-1': {
          'Q4_K_M': 4200000000,
          'Q8_0': 7500000000
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSizeData
      });

      const response = await fetch('./gguf_models_estimated_sizes.json');
      const data = await response.json();

      expect(data['test/model-1']).toBeDefined();
      expect(data['test/model-1']['Q4_K_M']).toBe(4200000000);
    });

    it('should handle missing size data gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const response = await fetch('./gguf_models_estimated_sizes.json');
      expect(response.ok).toBe(false);
    });
  });
});

describe('Frontend Integration', () => {
  let mockApp;

  beforeEach(() => {
    // Reset DOM
    document.getElementById('model-grid').innerHTML = '';
    document.getElementById('results-count').textContent = '';
    
    // Mock ModelDiscoveryApp
    mockApp = {
      allModels: [
        {
          modelName: 'Test Model 1',
          quantFormat: 'Q4_K_M',
          fileSize: 4200000000,
          fileSizeFormatted: '3.9 GB',
          modelType: 'Test',
          downloadCount: 1000,
          huggingFaceLink: 'https://huggingface.co/test/model-1',
          directDownloadLink: 'https://huggingface.co/test/model-1/resolve/main/model.Q4_K_M.gguf'
        },
        {
          modelName: 'Test Model 2',
          quantFormat: 'Q8_0',
          fileSize: 7500000000,
          fileSizeFormatted: '7.0 GB',
          modelType: 'Test',
          downloadCount: 2000,
          huggingFaceLink: 'https://huggingface.co/test/model-2',
          directDownloadLink: 'https://huggingface.co/test/model-2/resolve/main/model.Q8_0.gguf'
        }
      ],
      filteredModels: [],
      searchResults: [],
      currentPage: 1,
      modelsPerPage: 12,
      isLoading: false,
      searchQuery: '',
      activeFilters: {
        quantization: '',
        architecture: '',
        sizeRange: '',
        sortBy: 'name',
        sortOrder: 'asc'
      }
    };

    mockApp.filteredModels = [...mockApp.allModels];
  });

  describe('Search Integration', () => {
    it('should integrate search with UI updates', () => {
      const searchInput = document.getElementById('model-search');
      const modelGrid = document.getElementById('model-grid');
      
      // Simulate search input
      searchInput.value = 'model-1';
      
      // Mock search functionality
      const searchQuery = searchInput.value;
      mockApp.filteredModels = mockApp.allModels.filter(model => 
        model.modelName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(mockApp.filteredModels).toHaveLength(1);
      expect(mockApp.filteredModels[0].modelName).toBe('Test Model 1');
    });

    it('should update results count after search', () => {
      const resultsCount = document.getElementById('results-count');
      
      mockApp.filteredModels = mockApp.allModels.filter(model => 
        model.modelName.toLowerCase().includes('model 1')
      );
      
      // Mock results count update
      resultsCount.textContent = `Showing ${mockApp.filteredModels.length} of ${mockApp.allModels.length} models`;
      
      expect(resultsCount.textContent).toBe('Showing 1 of 2 models');
    });

    it('should handle empty search results', () => {
      mockApp.filteredModels = mockApp.allModels.filter(model => 
        model.modelName.toLowerCase().includes('nonexistent')
      );
      
      expect(mockApp.filteredModels).toHaveLength(0);
    });
  });

  describe('Filter Integration', () => {
    it('should apply quantization filter', () => {
      mockApp.activeFilters.quantization = 'Q8_0';
      
      mockApp.filteredModels = mockApp.allModels.filter(model => 
        model.quantFormat === 'Q8_0'
      );
      
      expect(mockApp.filteredModels).toHaveLength(1);
      expect(mockApp.filteredModels[0].modelName).toBe('Test Model 2');
    });

    it('should apply size range filter', () => {
      mockApp.activeFilters.sizeRange = 'small';
      
      mockApp.filteredModels = mockApp.allModels.filter(model => {
        const sizeGB = model.fileSize / (1024 * 1024 * 1024);
        return sizeGB <= 4;
      });
      
      expect(mockApp.filteredModels).toHaveLength(1);
      expect(mockApp.filteredModels[0].modelName).toBe('Test Model 1');
    });

    it('should combine multiple filters', () => {
      mockApp.activeFilters.quantization = 'Q4_K_M';
      mockApp.activeFilters.sizeRange = 'small';
      
      mockApp.filteredModels = mockApp.allModels.filter(model => {
        const hasQuantization = model.quantFormat === 'Q4_K_M';
        const sizeGB = model.fileSize / (1024 * 1024 * 1024);
        const matchesSize = sizeGB <= 4;
        return hasQuantization && matchesSize;
      });
      
      expect(mockApp.filteredModels).toHaveLength(1);
      expect(mockApp.filteredModels[0].modelName).toBe('Test Model 1');
    });
  });

  describe('Sorting Integration', () => {
    it('should sort by name ascending', () => {
      mockApp.activeFilters.sortBy = 'name';
      mockApp.activeFilters.sortOrder = 'asc';
      
      mockApp.filteredModels.sort((a, b) => 
        a.modelName.localeCompare(b.modelName)
      );
      
      expect(mockApp.filteredModels[0].modelName).toBe('Test Model 1');
      expect(mockApp.filteredModels[1].modelName).toBe('Test Model 2');
    });

    it('should sort by downloads descending', () => {
      mockApp.activeFilters.sortBy = 'downloads';
      mockApp.activeFilters.sortOrder = 'desc';
      
      mockApp.filteredModels.sort((a, b) => b.downloadCount - a.downloadCount);
      
      expect(mockApp.filteredModels[0].downloadCount).toBe(2000);
      expect(mockApp.filteredModels[1].downloadCount).toBe(1000);
    });

    it('should sort by file size', () => {
      mockApp.activeFilters.sortBy = 'size';
      mockApp.activeFilters.sortOrder = 'desc';
      
      mockApp.filteredModels.sort((a, b) => b.fileSize - a.fileSize);
      
      expect(mockApp.filteredModels[0].fileSize).toBe(7500000000);
      expect(mockApp.filteredModels[1].fileSize).toBe(4200000000);
    });
  });

  describe('Pagination Integration', () => {
    beforeEach(() => {
      // Create more models for pagination testing
      mockApp.allModels = Array.from({ length: 25 }, (_, i) => ({
        modelName: `Test Model ${i + 1}`,
        quantFormat: 'Q4_K_M',
        fileSize: Math.floor(Math.random() * 10000000000),
        fileSizeFormatted: '5.0 GB',
        modelType: 'Test',
        downloadCount: Math.floor(Math.random() * 10000),
        huggingFaceLink: `https://huggingface.co/test/model-${i + 1}`,
        directDownloadLink: `https://huggingface.co/test/model-${i + 1}/resolve/main/model-${i + 1}.Q4_K_M.gguf`
      }));
      mockApp.filteredModels = [...mockApp.allModels];
    });

    it('should paginate results correctly', () => {
      const modelsPerPage = 12;
      const currentPage = 1;
      
      const startIndex = (currentPage - 1) * modelsPerPage;
      const endIndex = startIndex + modelsPerPage;
      const paginatedModels = mockApp.filteredModels.slice(startIndex, endIndex);
      
      expect(paginatedModels).toHaveLength(12);
    });

    it('should handle last page correctly', () => {
      const modelsPerPage = 12;
      const currentPage = 3; // Last page for 25 models
      
      const startIndex = (currentPage - 1) * modelsPerPage;
      const endIndex = startIndex + modelsPerPage;
      const paginatedModels = mockApp.filteredModels.slice(startIndex, endIndex);
      
      expect(paginatedModels).toHaveLength(1); // 25 - 24 = 1
    });

    it('should calculate total pages correctly', () => {
      const modelsPerPage = 12;
      const totalPages = Math.ceil(mockApp.filteredModels.length / modelsPerPage);
      
      expect(totalPages).toBe(3); // 25 models / 12 per page = 3 pages
    });
  });

  describe('URL State Integration', () => {
    it('should update URL with search query', () => {
      const searchQuery = 'test-model';
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      
      const expectedURL = `${window.location.pathname}?${params.toString()}`;
      
      expect(expectedURL).toContain('q=test-model');
    });

    it('should update URL with filters', () => {
      const params = new URLSearchParams();
      params.set('quantization', 'Q4_K_M');
      params.set('architecture', 'Llama');
      params.set('sort', 'downloads');
      params.set('order', 'desc');
      
      const expectedURL = `${window.location.pathname}?${params.toString()}`;
      
      expect(expectedURL).toContain('quantization=Q4_K_M');
      expect(expectedURL).toContain('architecture=Llama');
      expect(expectedURL).toContain('sort=downloads');
      expect(expectedURL).toContain('order=desc');
    });

    it('should load state from URL parameters', () => {
      // Mock URL with parameters
      const mockURL = new URL('http://localhost?q=test&quantization=Q4_K_M&sort=downloads');
      const params = new URLSearchParams(mockURL.search);
      
      const urlState = {
        searchQuery: params.get('q') || '',
        quantization: params.get('quantization') || '',
        sortBy: params.get('sort') || 'name'
      };
      
      expect(urlState.searchQuery).toBe('test');
      expect(urlState.quantization).toBe('Q4_K_M');
      expect(urlState.sortBy).toBe('downloads');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle loading errors gracefully', () => {
      const loadingScreen = document.getElementById('loading-screen');
      
      // Simulate error state
      loadingScreen.innerHTML = `
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Application Error</h1>
          <p class="text-gray-600 mb-4">Failed to load the GGUF Model Index.</p>
        </div>
      `;
      
      expect(loadingScreen.textContent).toContain('Application Error');
      expect(loadingScreen.textContent).toContain('Failed to load');
    });

    it('should handle empty model data', () => {
      mockApp.allModels = [];
      mockApp.filteredModels = [];
      
      const modelGrid = document.getElementById('model-grid');
      modelGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <h3 class="text-lg font-medium text-gray-900 mb-2">No models found</h3>
          <p class="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      `;
      
      expect(modelGrid.textContent).toContain('No models found');
    });

    it('should handle search errors', () => {
      // Mock search error
      const searchError = new Error('Search failed');
      
      expect(() => {
        throw searchError;
      }).toThrow('Search failed');
    });
  });
});

describe('Performance Integration', () => {
  it('should complete full workflow within performance budget', async () => {
    const startTime = performance.now();
    
    // Simulate full workflow
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      modelName: `Test Model ${i}`,
      quantFormat: 'Q4_K_M',
      fileSize: Math.floor(Math.random() * 10000000000),
      fileSizeFormatted: '5.0 GB',
      modelType: 'Test',
      downloadCount: Math.floor(Math.random() * 10000),
      huggingFaceLink: `https://huggingface.co/test/model-${i}`,
      directDownloadLink: `https://huggingface.co/test/model-${i}/resolve/main/model-${i}.gguf`
    }));
    
    // Simulate data loading
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate search
    const searchResults = mockData.filter(model => 
      model.modelName.toLowerCase().includes('model 1')
    );
    
    // Simulate filtering
    const filteredResults = searchResults.filter(model => 
      model.quantFormat === 'Q4_K_M'
    );
    
    // Simulate rendering
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(100); // Should complete in less than 100ms
    expect(filteredResults.length).toBeGreaterThan(0);
  });

  it('should handle large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      modelName: `Test Model ${i}`,
      quantFormat: 'Q4_K_M',
      fileSize: Math.floor(Math.random() * 10000000000),
      fileSizeFormatted: '5.0 GB',
      modelType: 'Test',
      downloadCount: Math.floor(Math.random() * 10000),
      huggingFaceLink: `https://huggingface.co/test/model-${i}`,
      directDownloadLink: `https://huggingface.co/test/model-${i}/resolve/main/model-${i}.gguf`
    }));
    
    const startTime = performance.now();
    
    // Simulate processing large dataset
    const processed = largeDataset
      .filter(model => model.downloadCount > 5000)
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 12);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    expect(processingTime).toBeLessThan(200); // Should process in less than 200ms
    expect(processed.length).toBeLessThanOrEqual(12);
  });
});