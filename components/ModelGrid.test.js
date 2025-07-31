/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelGrid } from './ModelGrid.js';

// Mock ModelCard class
class MockModelCard {
  constructor(model) {
    this.model = model;
    this.element = document.createElement('div');
    this.element.className = 'mock-model-card';
    this.element.textContent = model.name;
  }

  render() {
    return this.element;
  }

  updateModel(newModel) {
    this.model = newModel;
    this.element.textContent = newModel.name;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

describe('ModelGrid', () => {
  let modelGrid;
  let mockModels;

  beforeEach(() => {
    modelGrid = new ModelGrid();
    mockModels = [
      {
        id: '1',
        name: 'Test Model 1',
        modelId: 'test/model-1',
        sizeFormatted: '4.2 GB',
        quantization: 'Q4_K_M',
        architecture: 'Mistral',
        downloads: 1000,
        url: 'https://example.com/model1'
      },
      {
        id: '2',
        name: 'Test Model 2',
        modelId: 'test/model-2',
        sizeFormatted: '2.1 GB',
        quantization: 'Q8_0',
        architecture: 'LLaMA',
        downloads: 500,
        url: 'https://example.com/model2'
      }
    ];
  });

  describe('render', () => {
    it('should create grid element with correct structure', () => {
      const element = modelGrid.render();

      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.tagName).toBe('MAIN');
      expect(element.classList.contains('mobile-padding')).toBe(true);

      // Check for required child elements
      const container = element.querySelector('#models-container');
      const emptyState = element.querySelector('#empty-state');
      const loadingState = element.querySelector('#loading-state');

      expect(container).toBeTruthy();
      expect(emptyState).toBeTruthy();
      expect(loadingState).toBeTruthy();

      // Check initial states
      expect(emptyState.classList.contains('hidden')).toBe(true);
      expect(loadingState.classList.contains('hidden')).toBe(false);
    });

    it('should have responsive grid classes', () => {
      const element = modelGrid.render();
      const container = element.querySelector('#models-container');

      expect(container.classList.contains('grid-responsive')).toBe(true);
    });
  });

  describe('updateModels', () => {
    beforeEach(() => {
      modelGrid.render();
      document.body.appendChild(modelGrid.element);
    });

    afterEach(() => {
      if (modelGrid.element && modelGrid.element.parentNode) {
        modelGrid.element.parentNode.removeChild(modelGrid.element);
      }
    });

    it('should display models when provided', () => {
      modelGrid.updateModels(mockModels, MockModelCard);

      const container = modelGrid.element.querySelector('#models-container');
      const emptyState = modelGrid.element.querySelector('#empty-state');
      const loadingState = modelGrid.element.querySelector('#loading-state');

      expect(container.classList.contains('hidden')).toBe(false);
      expect(emptyState.classList.contains('hidden')).toBe(true);
      expect(loadingState.classList.contains('hidden')).toBe(true);

      expect(container.children.length).toBe(2);
      expect(modelGrid.getModelCount()).toBe(2);
    });

    it('should show empty state when no models provided', () => {
      modelGrid.updateModels([], MockModelCard);

      const container = modelGrid.element.querySelector('#models-container');
      const emptyState = modelGrid.element.querySelector('#empty-state');
      const loadingState = modelGrid.element.querySelector('#loading-state');

      expect(container.classList.contains('hidden')).toBe(true);
      expect(emptyState.classList.contains('hidden')).toBe(false);
      expect(loadingState.classList.contains('hidden')).toBe(true);

      expect(modelGrid.getModelCount()).toBe(0);
    });

    it('should store model card references', () => {
      modelGrid.updateModels(mockModels, MockModelCard);

      expect(modelGrid.modelCards.size).toBe(2);
      expect(modelGrid.getModelCard('1')).toBeTruthy();
      expect(modelGrid.getModelCard('2')).toBeTruthy();
      expect(modelGrid.getModelCard('nonexistent')).toBeNull();
    });

    it('should add staggered animation delays', () => {
      modelGrid.updateModels(mockModels, MockModelCard);

      const cards = modelGrid.element.querySelectorAll('.mock-model-card');
      expect(cards[0].style.animationDelay).toBe('0ms');
      expect(cards[1].style.animationDelay).toBe('50ms');
    });
  });

  describe('showLoading', () => {
    beforeEach(() => {
      modelGrid.render();
    });

    it('should show loading state and hide others', () => {
      modelGrid.showLoading();

      const container = modelGrid.element.querySelector('#models-container');
      const emptyState = modelGrid.element.querySelector('#empty-state');
      const loadingState = modelGrid.element.querySelector('#loading-state');

      expect(container.classList.contains('hidden')).toBe(true);
      expect(emptyState.classList.contains('hidden')).toBe(true);
      expect(loadingState.classList.contains('hidden')).toBe(false);
    });
  });

  describe('clearCards', () => {
    beforeEach(() => {
      modelGrid.render();
      document.body.appendChild(modelGrid.element);
      modelGrid.updateModels(mockModels, MockModelCard);
    });

    afterEach(() => {
      if (modelGrid.element && modelGrid.element.parentNode) {
        modelGrid.element.parentNode.removeChild(modelGrid.element);
      }
    });

    it('should clear all model cards and references', () => {
      expect(modelGrid.modelCards.size).toBe(2);

      modelGrid.clearCards();

      expect(modelGrid.modelCards.size).toBe(0);
      const container = modelGrid.element.querySelector('#models-container');
      expect(container.children.length).toBe(0);
    });
  });

  describe('updateModelCard', () => {
    beforeEach(() => {
      modelGrid.render();
      document.body.appendChild(modelGrid.element);
      modelGrid.updateModels(mockModels, MockModelCard);
    });

    afterEach(() => {
      if (modelGrid.element && modelGrid.element.parentNode) {
        modelGrid.element.parentNode.removeChild(modelGrid.element);
      }
    });

    it('should update specific model card', () => {
      const updatedModel = { ...mockModels[0], name: 'Updated Model Name' };
      
      modelGrid.updateModelCard('1', updatedModel);

      const card = modelGrid.getModelCard('1');
      expect(card.model.name).toBe('Updated Model Name');
    });

    it('should handle non-existent model ID gracefully', () => {
      expect(() => {
        modelGrid.updateModelCard('nonexistent', { name: 'Test' });
      }).not.toThrow();
    });
  });

  describe('setMobileMode', () => {
    beforeEach(() => {
      modelGrid.render();
    });

    it('should add mobile classes when mobile mode enabled', () => {
      modelGrid.setMobileMode(true);

      const container = modelGrid.element.querySelector('#models-container');
      expect(container.classList.contains('mobile-grid')).toBe(true);
      expect(modelGrid.element.classList.contains('mobile-layout')).toBe(true);
    });

    it('should remove mobile classes when mobile mode disabled', () => {
      modelGrid.setMobileMode(true);
      modelGrid.setMobileMode(false);

      const container = modelGrid.element.querySelector('#models-container');
      expect(container.classList.contains('mobile-grid')).toBe(false);
      expect(modelGrid.element.classList.contains('mobile-layout')).toBe(false);
    });
  });

  describe('scrollToModel', () => {
    beforeEach(() => {
      modelGrid.render();
      document.body.appendChild(modelGrid.element);
      modelGrid.updateModels(mockModels, MockModelCard);
    });

    afterEach(() => {
      if (modelGrid.element && modelGrid.element.parentNode) {
        modelGrid.element.parentNode.removeChild(modelGrid.element);
      }
    });

    it('should scroll to model card', () => {
      const card = modelGrid.getModelCard('1');
      
      // Mock scrollIntoView since it doesn't exist in JSDOM
      card.element.scrollIntoView = vi.fn();
      const scrollSpy = vi.spyOn(card.element, 'scrollIntoView');

      modelGrid.scrollToModel('1');

      expect(scrollSpy).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center'
      });
    });

    it('should handle non-existent model ID gracefully', () => {
      expect(() => {
        modelGrid.scrollToModel('nonexistent');
      }).not.toThrow();
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      modelGrid.render();
      modelGrid.updateModels(mockModels, MockModelCard);
    });

    it('should return current models', () => {
      const models = modelGrid.getModels();
      expect(models).toEqual(mockModels);
      expect(models).not.toBe(mockModels); // Should be a copy
    });

    it('should return model count', () => {
      expect(modelGrid.getModelCount()).toBe(2);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      modelGrid.render();
      document.body.appendChild(modelGrid.element);
      modelGrid.updateModels(mockModels, MockModelCard);
    });

    it('should clean up all resources', () => {
      const element = modelGrid.element;
      
      modelGrid.destroy();

      expect(modelGrid.element).toBeNull();
      expect(modelGrid.models).toEqual([]);
      expect(modelGrid.modelCards.size).toBe(0);
      expect(element.parentNode).toBeNull();
    });
  });
});