/**
 * Keyboard Navigation Utilities
 * Provides comprehensive keyboard navigation support for the GGUF Model Index
 */

/**
 * KeyboardNavigationManager handles keyboard navigation across the application
 */
export class KeyboardNavigationManager {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.trapFocus = false;
    this.trapContainer = null;
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleFocusOut = this.handleFocusOut.bind(this);
    
    // Initialize
    this.init();
  }

  /**
   * Initialize keyboard navigation
   */
  init() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);
    
    // Set up default shortcuts
    this.registerShortcut('f', () => this.focusSearch(), 'Focus search input');
    this.registerShortcut('Escape', () => this.handleEscape(), 'Close panels and clear focus');
    this.registerShortcut('/', () => this.focusSearch(), 'Focus search input');
    this.registerShortcut('?', () => this.showKeyboardHelp(), 'Show keyboard shortcuts help');
  }

  /**
   * Register a keyboard shortcut
   * @param {string} key - Key combination (e.g., 'f', 'ctrl+f', 'shift+?')
   * @param {Function} handler - Function to call when shortcut is pressed
   * @param {string} description - Description for help display
   */
  registerShortcut(key, handler, description = '') {
    this.shortcuts.set(key.toLowerCase(), { handler, description });
  }

  /**
   * Unregister a keyboard shortcut
   * @param {string} key - Key combination to remove
   */
  unregisterShortcut(key) {
    this.shortcuts.delete(key.toLowerCase());
  }

  /**
   * Handle global keydown events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return;

    const key = this.getKeyString(event);
    const shortcut = this.shortcuts.get(key);

    // Handle registered shortcuts
    if (shortcut && !this.isInputFocused(event.target)) {
      event.preventDefault();
      shortcut.handler(event);
      return;
    }

    // Handle navigation keys
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        if (this.shouldHandleArrowKeys(event.target)) {
          this.handleArrowNavigation(event);
        }
        break;
      case 'Enter':
      case ' ':
        this.handleActivation(event);
        break;
      case 'Home':
      case 'End':
        if (this.shouldHandleHomeEnd(event.target)) {
          this.handleHomeEnd(event);
        }
        break;
    }
  }

  /**
   * Handle focus in events
   * @param {FocusEvent} event - Focus event
   */
  handleFocusIn(event) {
    this.updateFocusIndex(event.target);
    this.announceToScreenReader(event.target);
  }

  /**
   * Handle focus out events
   * @param {FocusEvent} event - Focus event
   */
  handleFocusOut(event) {
    // Clean up any focus-related state if needed
  }

  /**
   * Get key string from keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Key string representation
   */
  getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * Check if target is an input element
   * @param {Element} target - Target element
   * @returns {boolean} True if target is input
   */
  isInputFocused(target) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(target.tagName.toLowerCase()) ||
           target.contentEditable === 'true';
  }

  /**
   * Handle tab navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTabNavigation(event) {
    if (this.trapFocus && this.trapContainer) {
      this.handleFocusTrap(event);
    }
  }

  /**
   * Handle focus trap within a container
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleFocusTrap(event) {
    const focusableElements = this.getFocusableElements(this.trapContainer);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab - moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab - moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Handle arrow key navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleArrowNavigation(event) {
    const container = this.findNavigationContainer(event.target);
    if (!container) return;

    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(event.target);
    
    if (currentIndex === -1) return;

    let nextIndex;
    
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      focusableElements[nextIndex].focus();
    }
  }

  /**
   * Handle activation (Enter/Space) on focused elements
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleActivation(event) {
    const target = event.target;
    
    // Don't handle activation for actual buttons and links
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
      return;
    }

    // Handle activation for elements with role="button"
    if (target.getAttribute('role') === 'button' || 
        target.classList.contains('keyboard-activatable')) {
      event.preventDefault();
      target.click();
    }
  }

  /**
   * Handle Home/End keys
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleHomeEnd(event) {
    const container = this.findNavigationContainer(event.target);
    if (!container) return;

    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    event.preventDefault();
    
    if (event.key === 'Home') {
      focusableElements[0].focus();
    } else if (event.key === 'End') {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  /**
   * Check if arrow keys should be handled for this element
   * @param {Element} target - Target element
   * @returns {boolean} True if arrow keys should be handled
   */
  shouldHandleArrowKeys(target) {
    // Don't handle arrow keys in text inputs
    if (this.isInputFocused(target)) return false;
    
    // Handle arrow keys in navigation containers
    return this.findNavigationContainer(target) !== null;
  }

  /**
   * Check if Home/End keys should be handled for this element
   * @param {Element} target - Target element
   * @returns {boolean} True if Home/End should be handled
   */
  shouldHandleHomeEnd(target) {
    return this.shouldHandleArrowKeys(target);
  }

  /**
   * Find the navigation container for an element
   * @param {Element} element - Element to find container for
   * @returns {Element|null} Navigation container or null
   */
  findNavigationContainer(element) {
    return element.closest('[data-keyboard-navigation]') ||
           element.closest('[role="grid"]') ||
           element.closest('[role="listbox"]') ||
           element.closest('[role="menu"]');
  }

  /**
   * Get all focusable elements within a container
   * @param {Element} container - Container element
   * @returns {Element[]} Array of focusable elements
   */
  getFocusableElements(container) {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '.keyboard-focusable:not([disabled])'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector))
      .filter(el => this.isElementVisible(el));
  }

  /**
   * Check if element is visible and focusable
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is visible
   */
  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  }

  /**
   * Update current focus index
   * @param {Element} element - Currently focused element
   */
  updateFocusIndex(element) {
    const index = this.focusableElements.indexOf(element);
    if (index !== -1) {
      this.currentFocusIndex = index;
    }
  }

  /**
   * Announce element to screen reader
   * @param {Element} element - Element to announce
   */
  announceToScreenReader(element) {
    const announcement = this.getElementAnnouncement(element);
    if (announcement) {
      this.announce(announcement);
    }
  }

  /**
   * Get screen reader announcement for element
   * @param {Element} element - Element to get announcement for
   * @returns {string} Announcement text
   */
  getElementAnnouncement(element) {
    // Check for explicit aria-label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }

    // Check for aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        return labelElement.textContent.trim();
      }
    }

    // Get context-specific announcements
    if (element.classList.contains('model-card')) {
      return this.getModelCardAnnouncement(element);
    }

    if (element.classList.contains('filter-option')) {
      return this.getFilterOptionAnnouncement(element);
    }

    return '';
  }

  /**
   * Get announcement for model card
   * @param {Element} element - Model card element
   * @returns {string} Announcement text
   */
  getModelCardAnnouncement(element) {
    const title = element.querySelector('h3')?.textContent || '';
    const size = element.querySelector('[aria-label*="File size"]')?.textContent || '';
    const quantization = element.querySelector('[aria-label*="Quantization"]')?.textContent || '';
    
    return `Model: ${title}, Size: ${size}, Quantization: ${quantization}`;
  }

  /**
   * Get announcement for filter option
   * @param {Element} element - Filter option element
   * @returns {string} Announcement text
   */
  getFilterOptionAnnouncement(element) {
    const label = element.textContent.trim();
    const checked = element.querySelector('input')?.checked ? 'checked' : 'unchecked';
    
    return `${label}, ${checked}`;
  }

  /**
   * Announce text to screen readers
   * @param {string} text - Text to announce
   */
  announce(text) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Focus the search input
   */
  focusSearch() {
    const searchInput = document.querySelector('#search-input');
    if (searchInput) {
      searchInput.focus();
      this.announce('Search input focused');
    }
  }

  /**
   * Handle Escape key
   */
  handleEscape() {
    // Close any open panels
    const filterPanel = document.querySelector('.filter-panel');
    if (filterPanel && filterPanel.classList.contains('translate-x-0')) {
      // Trigger close via custom event
      document.dispatchEvent(new CustomEvent('closeFilterPanel'));
      this.announce('Filter panel closed');
      return;
    }

    // Clear focus from current element
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
      this.announce('Focus cleared');
    }
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardHelp() {
    const shortcuts = Array.from(this.shortcuts.entries())
      .map(([key, { description }]) => `${key}: ${description}`)
      .join('\n');
    
    this.announce(`Keyboard shortcuts: ${shortcuts}`);
    
    // Could also show a modal or tooltip with shortcuts
    console.log('Keyboard Shortcuts:', shortcuts);
  }

  /**
   * Enable focus trap within a container
   * @param {Element} container - Container to trap focus within
   */
  enableFocusTrap(container) {
    this.trapFocus = true;
    this.trapContainer = container;
    
    // Focus first focusable element
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Disable focus trap
   */
  disableFocusTrap() {
    this.trapFocus = false;
    this.trapContainer = null;
  }

  /**
   * Enable keyboard navigation
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable keyboard navigation
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Destroy the keyboard navigation manager
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    
    this.shortcuts.clear();
    this.focusableElements = [];
    this.trapContainer = null;
  }
}

/**
 * Utility functions for keyboard navigation
 */

/**
 * Make an element keyboard focusable
 * @param {Element} element - Element to make focusable
 * @param {Object} options - Options for focusable behavior
 */
export function makeFocusable(element, options = {}) {
  const {
    tabIndex = 0,
    role = null,
    ariaLabel = null,
    keyboardActivatable = false
  } = options;

  element.setAttribute('tabindex', tabIndex);
  
  if (role) {
    element.setAttribute('role', role);
  }
  
  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }
  
  if (keyboardActivatable) {
    element.classList.add('keyboard-activatable');
  }

  // Add focus styles if not already present
  if (!element.classList.contains('focus:outline-none')) {
    element.classList.add('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2');
  }
}

/**
 * Create a roving tabindex group
 * @param {Element} container - Container element
 * @param {string} itemSelector - Selector for items within container
 */
export function createRovingTabindex(container, itemSelector) {
  const items = container.querySelectorAll(itemSelector);
  
  if (items.length === 0) return;

  // Set up initial tabindex values
  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');
  });

  // Add keyboard navigation
  container.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    
    const currentIndex = Array.from(items).indexOf(event.target);
    if (currentIndex === -1) return;

    let nextIndex;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex !== undefined) {
      // Update tabindex
      items[currentIndex].setAttribute('tabindex', '-1');
      items[nextIndex].setAttribute('tabindex', '0');
      items[nextIndex].focus();
    }
  });
}

/**
 * Add skip link for accessibility
 * @param {string} targetId - ID of target element to skip to
 * @param {string} text - Text for skip link
 */
export function addSkipLink(targetId, text = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = `
    sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
    bg-blue-600 text-white px-4 py-2 rounded-md z-50
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  `.replace(/\s+/g, ' ').trim();
  
  document.body.insertBefore(skipLink, document.body.firstChild);
}

// Global keyboard navigation manager instance
export const keyboardNavigation = new KeyboardNavigationManager();