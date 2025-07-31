/**
 * Tests for VirtualScrollGrid component
 * Verifies virtual scrolling functionality and performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VirtualScrollGrid } from './VirtualScrollGrid.js';

// Mock ModelCard class
class MockModelCard {
  constructor(model) {
    this.model = model;
    this.element = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'model-card';
    this.element.textContent = this.model.name;
    this.element.dataset.modelId = this.model.id;
    return this.element;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Mock models data
const createMockModels = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `model-${i}`,
    name: `Model ${i}`,
    modelId: `test/model-${i}`,
    filename: `model-${i}.gguf`,
    url: `https://example.com/model-${i}.gguf`,
    sizeBytes: 1000000000 + i * 100000000,
    sizeFormatted: `${(1 + i * 0.1).toFixed(1)} GB`,
    quantization: 'Q4_K_M',
    architecture: 'Mistral',
    family: 'Test',
    downloads: 100 + i,
    lastModified: '2024-01-01',
    tags: ['test'],
    searchText: `model ${i} test mistral q4_k_m`
  }));
};

describe('VirtualScrollGrid', () => {
  let virtualGrid;
  let container;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '<div id="test-container"></div>';
    container = document.getElementById('test-container');
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    });

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    virtualGrid = new VirtualScrollGrid({
      itemHeight: 280,
      threshold: 100 // Lower threshold for testing
    });
  });

  afterEach(() => {
    if (virtualGrid) {
      virtualGrid.destroy();
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create virtual scroll grid with default options', () => {
      expect(virtualGrid).toBeDefined();
      expect(virtualGrid.itemHeight).toBe(280);
      expect(virtualGrid.threshold).toBe(100);
      expect(virtualGrid.models).toEqual([]);
      expect(virtualGrid.filteredModels).toEqual([]);
    });

    it('should render initial DOM structure', () => {
      const element = virtualGrid.render();
      container.appendChild(element);

      expect(element.querySelector('#virtual-container')).toBeTruthy();
      expect(element.querySelector('#virtual-spacer')).toBeTruthy();
      expect(element.querySelector('#visible-container')).toBeTruthy();
      expect(element.querySelector('#empty-state')).toBeTruthy();
      expect(element.querySelector('#loading-state')).toBeTruthy();
    });
  });

  describe('Model Updates', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
    });

    it('should show empty state when no models provided', () => {
      virtualGrid.updateModels([], MockModelCard);

      const emptyState = virtualGrid.element.querySelector('#empty-state');
      const container = virtualGrid.element.querySelector('#virtual-container');
      
      expect(emptyState.classList.contains('hidden')).toBe(false);
      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('should render all models when count is below threshold', () => {
      const models = createMockModels(50);
      virtualGrid.updateModels(models, MockModelCard);

      const visibleContainer = virtualGrid.element.querySelector('#visible-container');
      const modelCards = visibleContainer.querySelectorAll('.model-card');
      
      expect(modelCards.length).toBe(50);
      expect(virtualGrid.getModelCount()).toBe(50);
    });

    it('should enable virtual scrolling when count exceeds threshold', () => {
      const models = createMockModels(150);
      virtualGrid.updateModels(models, MockModelCard);

      const perfIndicator = virtualGrid.element.querySelector('#perf-indicator');
      expect(perfIndicator.classList.contains('hidden')).toBe(false);
      
      // Should render only visible items, not all 150
      const visibleContainer = virtualGrid.element.querySelector('#visible-container');
      const modelCards = visibleContainer.querySelectorAll('.model-card');
      expect(modelCards.length).toBeLessThan(150);
    });

    it('should update spacer height for virtual scrolling', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      const spacer = virtualGrid.element.querySelector('#virtual-spacer');
      const expectedHeight = 200 * 280; // models * itemHeight
      expect(spacer.style.height).toBe(`${expectedHeight}px`);
    });
  });

  describe('Virtual Scrolling', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
      
      // Mock element dimensions
      Object.defineProperty(virtualGrid.element, 'clientHeight', {
        value: 800
      });
    });

    it('should calculate visible range correctly', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);
      
      virtualGrid.scrollTop = 1000; // Scroll down
      virtualGrid.calculateVisibleRange();

      expect(virtualGrid.startIndex).toBeGreaterThanOrEqual(0);
      expect(virtualGrid.endIndex).toBeGreaterThan(virtualGrid.startIndex);
      expect(virtualGrid.endIndex).toBeLessThan(200);
    });

    it('should handle scroll events', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      // Mock scroll event
      virtualGrid.element.scrollTop = 500;
      virtualGrid.handleScroll();

      expect(virtualGrid.scrollTop).toBe(500);
      expect(virtualGrid.isScrolling).toBe(true);
    });

    it('should render only visible items during virtual scrolling', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      const visibleContainer = virtualGrid.element.querySelector('#visible-container');
      const initialCardCount = visibleContainer.querySelectorAll('.model-card').length;

      // Scroll and render
      virtualGrid.scrollTop = 1000;
      virtualGrid.calculateVisibleRange();
      virtualGrid.renderVisibleItems();

      const newCardCount = visibleContainer.querySelectorAll('.model-card').length;
      
      // Should render similar number of cards (visible range)
      expect(newCardCount).toBeLessThanOrEqual(initialCardCount + 10);
      expect(newCardCount).toBeGreaterThan(0);
    });
  });

  describe('Filter Application', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
    });

    it('should apply filters and update display', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      const filteredModels = models.slice(0, 50);
      virtualGrid.applyFilters(filteredModels);

      expect(virtualGrid.getModelCount()).toBe(50);
    });

    it('should disable virtual scrolling when filtered count is below threshold', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      // Filter to below threshold
      const filteredModels = models.slice(0, 50);
      virtualGrid.applyFilters(filteredModels);

      const perfIndicator = virtualGrid.element.querySelector('#perf-indicator');
      expect(perfIndicator.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Performance Features', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
    });

    it('should set up intersection observer for lazy loading', () => {
      expect(global.IntersectionObserver).toHaveBeenCalled();
      expect(virtualGrid.intersectionObserver).toBeDefined();
    });

    it('should set up resize observer', () => {
      expect(global.ResizeObserver).toHaveBeenCalled();
      expect(virtualGrid.resizeObserver).toBeDefined();
    });

    it('should handle resize events', () => {
      const models = createMockModels(50);
      virtualGrid.updateModels(models, MockModelCard);

      const originalHeight = virtualGrid.containerHeight;
      virtualGrid.containerHeight = 1000;
      virtualGrid.handleResize();

      // Should recalculate layout
      expect(virtualGrid.containerHeight).toBe(1000);
    });

    it('should throttle scroll events', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      // Multiple rapid scroll events
      virtualGrid.handleScroll();
      virtualGrid.handleScroll();
      virtualGrid.handleScroll();

      expect(virtualGrid.isScrolling).toBe(true);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
    });

    it('should scroll to specific model', () => {
      const models = createMockModels(200);
      virtualGrid.updateModels(models, MockModelCard);

      // Mock scrollTo
      virtualGrid.element.scrollTo = vi.fn();

      virtualGrid.scrollToModel('model-50');

      expect(virtualGrid.element.scrollTo).toHaveBeenCalledWith({
        top: 50 * 280, // index * itemHeight
        behavior: 'smooth'
      });
    });

    it('should handle scroll to non-existent model', () => {
      const models = createMockModels(50);
      virtualGrid.updateModels(models, MockModelCard);

      virtualGrid.element.scrollTo = vi.fn();
      virtualGrid.scrollToModel('non-existent');

      expect(virtualGrid.element.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const element = virtualGrid.render();
      container.appendChild(element);

      const models = createMockModels(50);
      virtualGrid.updateModels(models, MockModelCard);

      // Verify setup
      expect(virtualGrid.element).toBeTruthy();
      expect(virtualGrid.modelCards.size).toBe(50);

      // Destroy
      virtualGrid.destroy();

      // Verify cleanup
      expect(virtualGrid.element).toBeNull();
      expect(virtualGrid.modelCards.size).toBe(0);
      expect(virtualGrid.models).toEqual([]);
    });

    it('should disconnect observers on destroy', () => {
      const element = virtualGrid.render();
      container.appendChild(element);

      const disconnectSpy = vi.spyOn(virtualGrid.resizeObserver, 'disconnect');
      const intersectionDisconnectSpy = vi.spyOn(virtualGrid.intersectionObserver, 'disconnect');

      virtualGrid.destroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(intersectionDisconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      const element = virtualGrid.render();
      container.appendChild(element);
    });

    it('should show loading state', () => {
      virtualGrid.showLoading();

      const loadingState = virtualGrid.element.querySelector('#loading-state');
      const container = virtualGrid.element.querySelector('#virtual-container');
      const emptyState = virtualGrid.element.querySelector('#empty-state');

      expect(loadingState.classList.contains('hidden')).toBe(false);
      expect(container.classList.contains('hidden')).toBe(true);
      expect(emptyState.classList.contains('hidden')).toBe(true);
    });

    it('should hide loading state when models are updated', () => {
      virtualGrid.showLoading();
      
      const models = createMockModels(10);
      virtualGrid.updateModels(models, MockModelCard);

      const loadingState = virtualGrid.element.querySelector('#loading-state');
      expect(loadingState.classList.contains('hidden')).toBe(true);
    });
  });
});