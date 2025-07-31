import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilterButton } from './FilterButton.js';

describe('FilterButton Component', () => {
  let filterButton;
  let container;
  let mockOnToggle;

  beforeEach(() => {
    mockOnToggle = vi.fn();
    filterButton = new FilterButton(mockOnToggle);
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    filterButton.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  describe('render', () => {
    it('should create button element with correct structure', () => {
      const element = filterButton.render();
      
      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toContain('fixed');
      expect(element.className).toContain('z-40');
      expect(element.className).toContain('rounded-full');
    });

    it('should have filter icon', () => {
      const element = filterButton.render();
      const svg = element.querySelector('svg');
      
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should set initial position', () => {
      const element = filterButton.render();
      
      expect(element.style.left).toBe('50px');
      expect(element.style.top).toBe('50px');
    });

    it('should start animation loop', () => {
      filterButton.render();
      
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('mobile detection', () => {
    it('should detect mobile based on user agent', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const isMobile = filterButton.detectMobile();
      expect(isMobile).toBe(true);
    });

    it('should detect mobile based on window width', () => {
      // Mock narrow window
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });
      
      const isMobile = filterButton.detectMobile();
      expect(isMobile).toBe(true);
    });
  });

  describe('mouse tracking', () => {
    it('should update target position on mouse move', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      // Mock desktop environment
      filterButton.isMobile = false;
      
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 200
      });
      
      filterButton.handleMouseMove(mouseEvent);
      
      expect(filterButton.targetX).toBeGreaterThan(100); // Should have offset
      expect(filterButton.targetY).toBeGreaterThan(200); // Should have offset
    });

    it('should keep button within screen bounds', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      // Mock window size
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      
      filterButton.isMobile = false;
      
      // Test near right edge
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 790,
        clientY: 100
      });
      
      filterButton.handleMouseMove(mouseEvent);
      
      expect(filterButton.targetX).toBeLessThanOrEqual(800 - 76); // Should stay within bounds
    });
  });

  describe('touch handling', () => {
    it('should handle touch start', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      filterButton.isMobile = true;
      
      const touchEvent = {
        touches: [{ clientX: 150, clientY: 250 }]
      };
      
      filterButton.handleTouchStart(touchEvent);
      
      expect(filterButton.mouseX).toBe(150);
      expect(filterButton.mouseY).toBe(250);
    });

    it('should handle touch move', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      filterButton.isMobile = true;
      
      const touchEvent = {
        touches: [{ clientX: 150, clientY: 250 }]
      };
      
      filterButton.handleTouchMove(touchEvent);
      
      expect(filterButton.targetX).toBe(150 - 28); // Should center on touch
      expect(filterButton.targetY).toBe(250 - 28);
    });
  });

  describe('toggle functionality', () => {
    it('should toggle state when clicked', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      expect(filterButton.getIsOpen()).toBe(false);
      
      filterButton.toggle();
      
      expect(filterButton.getIsOpen()).toBe(true);
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });

    it('should update button visual state when toggled', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      filterButton.toggle();
      
      const svg = element.querySelector('svg');
      expect(svg.style.transform).toBe('rotate(180deg)');
      expect(element.className).toContain('bg-blue-700');
    });

    it('should handle click events', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      const clickEvent = new MouseEvent('click', { bubbles: true });
      element.dispatchEvent(clickEvent);
      
      expect(filterButton.getIsOpen()).toBe(true);
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('setOpen', () => {
    it('should set open state', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      filterButton.setOpen(true);
      
      expect(filterButton.getIsOpen()).toBe(true);
      
      const svg = element.querySelector('svg');
      expect(svg.style.transform).toBe('rotate(180deg)');
    });

    it('should not trigger callback when setting same state', () => {
      filterButton.render();
      
      filterButton.setOpen(false); // Already false
      
      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('setPosition', () => {
    it('should set button position', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      filterButton.setPosition(100, 200);
      
      expect(filterButton.currentX).toBe(100);
      expect(filterButton.currentY).toBe(200);
      expect(element.style.left).toBe('100px');
      expect(element.style.top).toBe('200px');
    });

    it('should constrain position to screen bounds', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      // Mock window size
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      
      filterButton.setPosition(900, 700); // Beyond bounds
      
      expect(filterButton.currentX).toBe(800 - 76); // Should be constrained
      expect(filterButton.currentY).toBe(600 - 76);
    });
  });

  describe('resize handling', () => {
    it('should handle window resize', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      // Set initial position
      filterButton.setPosition(100, 100);
      
      // Mock smaller window
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
      
      filterButton.handleResize();
      
      // Position should be adjusted to fit new window size
      expect(filterButton.targetX).toBeLessThanOrEqual(400 - 76);
      expect(filterButton.targetY).toBeLessThanOrEqual(300 - 76);
    });
  });

  describe('destroy', () => {
    it('should clean up event listeners and DOM', () => {
      const element = filterButton.render();
      container.appendChild(element);
      
      expect(container.contains(element)).toBe(true);
      
      filterButton.destroy();
      
      expect(container.contains(element)).toBe(false);
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should clean up references', () => {
      filterButton.render();
      filterButton.destroy();
      
      expect(filterButton.element).toBe(null);
      expect(filterButton.onToggle).toBe(null);
    });
  });
});