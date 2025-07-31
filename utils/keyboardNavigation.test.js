import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardNavigationManager, makeFocusable, createRovingTabindex, addSkipLink } from './keyboardNavigation.js';

// Mock DOM methods
const mockFocus = vi.fn();
const mockClick = vi.fn();
const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn();
const mockGetElementById = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

// Mock DOM elements
const createMockElement = (tagName = 'div', options = {}) => ({
  tagName: tagName.toUpperCase(),
  classList: {
    contains: vi.fn(() => false),
    add: vi.fn(),
    remove: vi.fn()
  },
  getAttribute: vi.fn((attr) => options[attr] || null),
  setAttribute: vi.fn(),
  focus: mockFocus,
  click: mockClick,
  closest: vi.fn(() => null),
  querySelector: mockQuerySelector,
  querySelectorAll: mockQuerySelectorAll,
  textContent: options.textContent || '',
  offsetParent: {},
  ...options
});

describe('KeyboardNavigationManager', () => {
  let manager;
  let mockDocument;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock document
    mockDocument = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      createElement: mockCreateElement,
      querySelector: mockQuerySelector,
      getElementById: mockGetElementById,
      activeElement: createMockElement('body'),
      body: createMockElement('body', {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
        insertBefore: vi.fn()
      })
    };

    // Mock window
    global.window = {
      getComputedStyle: vi.fn(() => ({
        display: 'block',
        visibility: 'visible'
      }))
    };

    // Mock global document
    global.document = mockDocument;

    manager = new KeyboardNavigationManager();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('initialization', () => {
    it('should initialize with default properties', () => {
      expect(manager.focusableElements).toEqual([]);
      expect(manager.currentFocusIndex).toBe(-1);
      expect(manager.isEnabled).toBe(true);
      expect(manager.trapFocus).toBe(false);
    });

    it('should register event listeners on init', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('focusin', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('focusout', expect.any(Function));
    });

    it('should register default shortcuts', () => {
      expect(manager.shortcuts.has('f')).toBe(true);
      expect(manager.shortcuts.has('escape')).toBe(true);
      expect(manager.shortcuts.has('/')).toBe(true);
      expect(manager.shortcuts.has('?')).toBe(true);
    });
  });

  describe('shortcut management', () => {
    it('should register new shortcuts', () => {
      const handler = vi.fn();
      manager.registerShortcut('ctrl+s', handler, 'Save');
      
      expect(manager.shortcuts.has('ctrl+s')).toBe(true);
      expect(manager.shortcuts.get('ctrl+s').handler).toBe(handler);
      expect(manager.shortcuts.get('ctrl+s').description).toBe('Save');
    });

    it('should unregister shortcuts', () => {
      manager.registerShortcut('test', vi.fn());
      expect(manager.shortcuts.has('test')).toBe(true);
      
      manager.unregisterShortcut('test');
      expect(manager.shortcuts.has('test')).toBe(false);
    });
  });

  describe('key string generation', () => {
    it('should generate correct key strings', () => {
      const event1 = { key: 'f', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
      expect(manager.getKeyString(event1)).toBe('f');

      const event2 = { key: 'S', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false };
      expect(manager.getKeyString(event2)).toBe('ctrl+s');

      const event3 = { key: 'F', ctrlKey: true, altKey: true, shiftKey: true, metaKey: false };
      expect(manager.getKeyString(event3)).toBe('ctrl+alt+shift+f');
    });
  });

  describe('input detection', () => {
    it('should detect input elements', () => {
      const input = createMockElement('input');
      const textarea = createMockElement('textarea');
      const select = createMockElement('select');
      const div = createMockElement('div');
      const editableDiv = createMockElement('div', { contentEditable: 'true' });

      expect(manager.isInputFocused(input)).toBe(true);
      expect(manager.isInputFocused(textarea)).toBe(true);
      expect(manager.isInputFocused(select)).toBe(true);
      expect(manager.isInputFocused(div)).toBe(false);
      expect(manager.isInputFocused(editableDiv)).toBe(true);
    });
  });

  describe('focusable elements', () => {
    it('should find focusable elements in container', () => {
      const button = createMockElement('button');
      const input = createMockElement('input');
      const link = createMockElement('a', { href: '#' });
      const disabledButton = createMockElement('button', { disabled: true });

      const container = createMockElement('div');
      mockQuerySelectorAll.mockReturnValue([button, input, link, disabledButton]);

      const focusable = manager.getFocusableElements(container);
      
      expect(mockQuerySelectorAll).toHaveBeenCalledWith(expect.stringContaining('button:not([disabled])'));
      expect(focusable).toHaveLength(4); // Mock doesn't filter disabled elements
    });

    it('should check element visibility', () => {
      const element = createMockElement('div');
      
      // Mock visible element
      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });
      element.offsetParent = {};
      
      expect(manager.isElementVisible(element)).toBe(true);

      // Mock hidden element
      global.window.getComputedStyle.mockReturnValue({
        display: 'none',
        visibility: 'visible'
      });
      
      expect(manager.isElementVisible(element)).toBe(false);
    });
  });

  describe('focus management', () => {
    it('should enable and disable focus trap', () => {
      const container = createMockElement('div');
      const button = createMockElement('button');
      mockQuerySelectorAll.mockReturnValue([button]);

      manager.enableFocusTrap(container);
      
      expect(manager.trapFocus).toBe(true);
      expect(manager.trapContainer).toBe(container);
      expect(mockFocus).toHaveBeenCalled();

      manager.disableFocusTrap();
      
      expect(manager.trapFocus).toBe(false);
      expect(manager.trapContainer).toBe(null);
    });
  });

  describe('announcements', () => {
    it('should create announcement element', () => {
      const mockElement = createMockElement('div');
      mockCreateElement.mockReturnValue(mockElement);

      manager.announce('Test announcement');

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
    });

    it('should get model card announcement', () => {
      const titleElement = createMockElement('h3', { textContent: 'Test Model' });
      const sizeElement = createMockElement('span', { textContent: '4.2 GB' });
      const quantElement = createMockElement('span', { textContent: 'Q4_K_M' });

      const modelCard = createMockElement('div');
      modelCard.querySelector = vi.fn((selector) => {
        if (selector === 'h3') return titleElement;
        if (selector.includes('File size')) return sizeElement;
        if (selector.includes('Quantization')) return quantElement;
        return null;
      });

      const announcement = manager.getModelCardAnnouncement(modelCard);
      expect(announcement).toBe('Model: Test Model, Size: 4.2 GB, Quantization: Q4_K_M');
    });
  });

  describe('enable/disable', () => {
    it('should enable and disable navigation', () => {
      manager.disable();
      expect(manager.isEnabled).toBe(false);

      manager.enable();
      expect(manager.isEnabled).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      manager.destroy();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('focusin', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('focusout', expect.any(Function));
      expect(manager.shortcuts.size).toBe(0);
    });
  });
});

describe('makeFocusable', () => {
  let element;

  beforeEach(() => {
    element = createMockElement('div');
  });

  it('should make element focusable with default options', () => {
    makeFocusable(element);

    expect(element.setAttribute).toHaveBeenCalledWith('tabindex', 0);
    expect(element.classList.add).toHaveBeenCalledWith(
      'focus:outline-none', 
      'focus:ring-2', 
      'focus:ring-blue-500', 
      'focus:ring-offset-2'
    );
  });

  it('should apply custom options', () => {
    makeFocusable(element, {
      tabIndex: -1,
      role: 'button',
      ariaLabel: 'Test button',
      keyboardActivatable: true
    });

    expect(element.setAttribute).toHaveBeenCalledWith('tabindex', -1);
    expect(element.setAttribute).toHaveBeenCalledWith('role', 'button');
    expect(element.setAttribute).toHaveBeenCalledWith('aria-label', 'Test button');
    expect(element.classList.add).toHaveBeenCalledWith('keyboard-activatable');
  });
});

describe('createRovingTabindex', () => {
  let container;
  let items;

  beforeEach(() => {
    items = [
      createMockElement('button'),
      createMockElement('button'),
      createMockElement('button')
    ];
    
    container = createMockElement('div');
    container.querySelectorAll = vi.fn(() => items);
    container.addEventListener = vi.fn();
  });

  it('should set up roving tabindex', () => {
    createRovingTabindex(container, 'button');

    expect(items[0].setAttribute).toHaveBeenCalledWith('tabindex', '0');
    expect(items[1].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(items[2].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(container.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle empty item list', () => {
    container.querySelectorAll = vi.fn(() => []);
    
    createRovingTabindex(container, 'button');
    
    expect(container.addEventListener).not.toHaveBeenCalled();
  });
});

describe('addSkipLink', () => {
  beforeEach(() => {
    global.document = {
      createElement: mockCreateElement,
      body: {
        insertBefore: vi.fn(),
        firstChild: createMockElement('div')
      }
    };
  });

  it('should create skip link', () => {
    const mockLink = createMockElement('a');
    mockCreateElement.mockReturnValue(mockLink);

    addSkipLink('main-content', 'Skip to content');

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('#main-content');
    expect(mockLink.textContent).toBe('Skip to content');
    expect(global.document.body.insertBefore).toHaveBeenCalledWith(mockLink, global.document.body.firstChild);
  });

  it('should use default text', () => {
    const mockLink = createMockElement('a');
    mockCreateElement.mockReturnValue(mockLink);

    addSkipLink('main-content');

    expect(mockLink.textContent).toBe('Skip to main content');
  });
});