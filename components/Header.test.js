import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Header } from './Header.js';

describe('Header Component', () => {
  let header;
  let container;

  beforeEach(() => {
    header = new Header();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    header.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('render', () => {
    it('should create header element with correct structure', () => {
      const element = header.render();
      
      expect(element.tagName).toBe('HEADER');
      expect(element.className).toContain('sticky');
      expect(element.className).toContain('top-0');
      expect(element.className).toContain('z-50');
    });

    it('should display correct title', () => {
      const element = header.render();
      const title = element.querySelector('h1');
      
      expect(title.textContent.trim()).toBe('🧠 GGUF Model Index');
    });

    it('should display correct subtitle', () => {
      const element = header.render();
      const subtitle = element.querySelector('p');
      
      expect(subtitle.textContent.trim()).toBe('Powered and improved by GGUF Loader Team');
    });

    it('should have GGUF Loader button with correct link', () => {
      const element = header.render();
      const button = element.querySelector('a[href="https://ggufloader.github.io"]');
      
      expect(button).toBeTruthy();
      expect(button.textContent.trim()).toContain('GGUF Loader');
      expect(button.getAttribute('target')).toBe('_blank');
      expect(button.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should have model count display', () => {
      const element = header.render();
      const modelCount = element.querySelector('#model-count');
      
      expect(modelCount).toBeTruthy();
      expect(modelCount.textContent).toBe('0');
    });
  });

  describe('updateModelCount', () => {
    it('should update model count display', () => {
      const element = header.render();
      container.appendChild(element);
      
      header.updateModelCount(42);
      
      const modelCount = element.querySelector('#model-count');
      expect(modelCount.textContent).toBe('42');
      expect(header.getModelCount()).toBe(42);
    });

    it('should format large numbers with locale formatting', () => {
      const element = header.render();
      container.appendChild(element);
      
      header.updateModelCount(1234);
      
      const modelCount = element.querySelector('#model-count');
      expect(modelCount.textContent).toBe('1,234');
    });

    it('should handle zero count', () => {
      const element = header.render();
      container.appendChild(element);
      
      header.updateModelCount(0);
      
      const modelCount = element.querySelector('#model-count');
      expect(modelCount.textContent).toBe('0');
      expect(header.getModelCount()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should remove element from DOM', () => {
      const element = header.render();
      container.appendChild(element);
      
      expect(container.contains(element)).toBe(true);
      
      header.destroy();
      
      expect(container.contains(element)).toBe(false);
    });

    it('should clean up references', () => {
      header.render();
      header.destroy();
      
      expect(header.element).toBe(null);
      expect(header.modelCountElement).toBe(null);
    });
  });
});