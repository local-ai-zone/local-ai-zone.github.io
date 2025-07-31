/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilterPanel } from './FilterPanel.js';
import { FilterButton } from './FilterButton.js';
import { ModelCard } from './ModelCard.js';

describe('Mobile Optimization Tests', () => {
  let originalInnerWidth;
  let originalUserAgent;

  beforeEach(() => {
    // Store original values
    originalInnerWidth = window.innerWidth;
    originalUserAgent = navigator.userAgent;
    
    // Mock DOM methods
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUserAgent,
    });
  });

  describe('FilterPanel Mobile Behavior', () => {
    let filterPanel;

    beforeEach(() => {
      filterPanel = new FilterPanel();
    });

    afterEach(() => {
      if (filterPanel) {
        filterPanel.destroy();
      }
    });

    it('should have mobile-friendly touch targets', () => {
      filterPanel.setAvailableOptions({
        quantization: ['Q4_K_M', 'Q8_0'],
        architecture: ['Mistral', 'LLaMA'],
        family: ['Test']
      });

      const element = filterPanel.render();
      document.body.appendChild(element);

      // Check that labels have touch-target class
      const labels = element.querySelectorAll('label');
      labels.forEach(label => {
        expect(label.classList.contains('touch-target')).toBe(true);
      });

      // Check that buttons have touch-target class
      const buttons = element.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.classList.contains('touch-target')).toBe(true);
      });

      document.body.removeChild(element);
    });

    it('should handle mobile screen width properly', () => {
      // Mock mobile screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      });

      const element = filterPanel.render();
      
      // Check mobile-specific classes
      expect(element.className).toContain('max-sm:fixed');
      expect(element.className).toContain('max-sm:inset-x-4');
    });

    it('should have close button on mobile', () => {
      const element = filterPanel.render();
      document.body.appendChild(element);

      const closeButton = element.querySelector('#close-panel-btn');
      expect(closeButton).toBeTruthy();
      expect(closeButton.classList.contains('sm:hidden')).toBe(true);
      expect(closeButton.classList.contains('touch-target')).toBe(true);

      document.body.removeChild(element);
    });

    it('should handle touch gestures', () => {
      const element = filterPanel.render();
      document.body.appendChild(element);
      filterPanel.open();

      // Mock mobile screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Simulate touch start
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      element.dispatchEvent(touchStart);

      // Simulate touch move (swipe right)
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      element.dispatchEvent(touchMove);

      // Simulate touch end
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 }]
      });
      element.dispatchEvent(touchEnd);

      // Panel should close after swipe
      expect(filterPanel.getIsOpen()).toBe(false);

      document.body.removeChild(element);
    });
  });

  describe('FilterButton Mobile Behavior', () => {
    let filterButton;

    beforeEach(() => {
      filterButton = new FilterButton();
    });

    afterEach(() => {
      if (filterButton) {
        filterButton.destroy();
      }
    });

    it('should detect mobile devices correctly', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      });

      const element = filterButton.render();
      expect(filterButton.isMobile).toBe(true);
    });

    it('should detect mobile based on screen width', () => {
      // Mock mobile screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      const element = filterButton.render();
      expect(filterButton.isMobile).toBe(true);
    });

    it('should have proper touch target size', () => {
      const element = filterButton.render();
      
      expect(element.classList.contains('w-14')).toBe(true);
      expect(element.classList.contains('h-14')).toBe(true);
      expect(element.classList.contains('touch-target')).toBe(true);
      expect(element.classList.contains('touch-manipulation')).toBe(true);
    });

    it('should handle touch events on mobile', () => {
      // Mock mobile
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      });

      const element = filterButton.render();
      document.body.appendChild(element);

      // Simulate touch start
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      element.dispatchEvent(touchStart);

      expect(filterButton.mouseX).toBe(100);
      expect(filterButton.mouseY).toBe(100);

      // Simulate touch move
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 150, clientY: 150 }]
      });
      element.dispatchEvent(touchMove);

      expect(filterButton.targetX).toBeGreaterThan(100);
      expect(filterButton.targetY).toBeGreaterThan(100);

      document.body.removeChild(element);
    });
  });

  describe('ModelCard Mobile Behavior', () => {
    let modelCard;
    let mockModel;

    beforeEach(() => {
      mockModel = {
        id: '1',
        name: 'Test Model with Very Long Name That Should Truncate',
        modelId: 'test/very-long-model-id-that-should-also-truncate',
        sizeFormatted: '4.2 GB',
        quantization: 'Q4_K_M',
        architecture: 'Mistral',
        downloads: 1000,
        url: 'https://example.com/model',
        tags: ['Popular', '7B'],
        lastModified: '2024-01-01T00:00:00Z'
      };
      modelCard = new ModelCard(mockModel);
    });

    afterEach(() => {
      if (modelCard) {
        modelCard.destroy();
      }
    });

    it('should have responsive text sizing', () => {
      const element = modelCard.render();
      
      // Check for responsive classes
      const title = element.querySelector('h3');
      expect(title.classList.contains('text-base')).toBe(true);
      expect(title.classList.contains('sm:text-lg')).toBe(true);
      expect(title.classList.contains('line-clamp-2')).toBe(true);
    });

    it('should have touch-friendly download button', () => {
      const element = modelCard.render();
      
      const downloadButton = element.querySelector('a');
      expect(downloadButton.classList.contains('touch-target')).toBe(true);
      expect(downloadButton.classList.contains('py-3')).toBe(true);
      expect(downloadButton.classList.contains('sm:py-2')).toBe(true);
    });

    it('should have responsive grid layout for details', () => {
      const element = modelCard.render();
      
      const detailsGrid = element.querySelector('.grid-cols-2');
      expect(detailsGrid).toBeTruthy();
      expect(detailsGrid.classList.contains('sm:flex')).toBe(true);
    });

    it('should have proper spacing for mobile', () => {
      const element = modelCard.render();
      
      expect(element.classList.contains('p-4')).toBe(true);
      expect(element.classList.contains('sm:p-6')).toBe(true);
      expect(element.classList.contains('touch-manipulation')).toBe(true);
    });

    it('should truncate long text properly', () => {
      const element = modelCard.render();
      
      const modelIdElement = element.querySelector('p');
      expect(modelIdElement.classList.contains('truncate')).toBe(true);
      
      const detailSpans = element.querySelectorAll('.truncate');
      expect(detailSpans.length).toBeGreaterThan(0);
    });
  });

  describe('Touch Target Requirements', () => {
    it('should meet 44px minimum touch target size', () => {
      // Test FilterButton
      const filterButton = new FilterButton();
      const buttonElement = filterButton.render();
      
      // 56px (w-14 h-14) is greater than 44px minimum
      expect(buttonElement.classList.contains('w-14')).toBe(true);
      expect(buttonElement.classList.contains('h-14')).toBe(true);
      
      filterButton.destroy();

      // Test FilterPanel buttons
      const filterPanel = new FilterPanel();
      const panelElement = filterPanel.render();
      document.body.appendChild(panelElement);
      
      const buttons = panelElement.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.classList.contains('touch-target')).toBe(true);
      });
      
      document.body.removeChild(panelElement);
      filterPanel.destroy();

      // Test ModelCard download button
      const mockModel = {
        id: '1',
        name: 'Test',
        modelId: 'test/model',
        sizeFormatted: '1 GB',
        quantization: 'Q4_K_M',
        architecture: 'Test',
        downloads: 100,
        url: 'https://example.com'
      };
      const modelCard = new ModelCard(mockModel);
      const cardElement = modelCard.render();
      
      const downloadButton = cardElement.querySelector('a');
      expect(downloadButton.classList.contains('touch-target')).toBe(true);
      
      modelCard.destroy();
    });
  });
});