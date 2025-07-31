/**
 * FilterButton component for floating filter button that follows mouse
 * Provides smooth mouse tracking and touch-friendly behavior
 */
export class FilterButton {
  constructor(onToggle) {
    this.element = null;
    this.onToggle = onToggle || (() => {});
    this.isOpen = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.animationId = null;
    this.isMouseTracking = false;
    this.isMobile = false;
    
    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  /**
   * Create and return the filter button DOM element
   * @returns {HTMLElement} The button element
   */
  render() {
    this.element = document.createElement('button');
    this.element.className = `
      fixed z-40 w-14 h-14 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full 
      shadow-lg hover:shadow-xl transition-all duration-200 
      flex items-center justify-center
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      transform hover:scale-105 active:scale-95
      touch-target touch-manipulation
    `.replace(/\s+/g, ' ').trim();
    
    // Add accessibility attributes
    this.element.setAttribute('aria-label', 'Toggle filter panel');
    this.element.setAttribute('aria-expanded', 'false');
    this.element.setAttribute('aria-controls', 'filter-panel');
    this.element.setAttribute('role', 'button');
    
    // Set initial position
    this.targetX = 50;
    this.targetY = 50;
    this.currentX = 50;
    this.currentY = 50;
    this.element.style.left = '50px';
    this.element.style.top = '50px';
    this.element.style.pointerEvents = 'auto';
    
    this.element.innerHTML = `
      <svg class="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
      </svg>
    `;

    // Add event listeners
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Detect mobile device
    this.isMobile = this.detectMobile();
    
    if (!this.isMobile) {
      // Desktop: mouse tracking
      document.addEventListener('mousemove', this.handleMouseMove);
    } else {
      // Mobile: touch handling
      this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    }
    
    window.addEventListener('resize', this.handleResize);
    
    // Start animation loop
    this.startAnimation();
    
    return this.element;
  }

  /**
   * Detect if device is mobile
   * @returns {boolean} True if mobile device
   * @private
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  /**
   * Handle mouse movement for desktop
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  handleMouseMove(event) {
    if (this.isMobile) return;
    
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    
    // Add offset so button doesn't cover cursor
    const offset = 60;
    this.targetX = Math.max(20, Math.min(window.innerWidth - 76, this.mouseX + offset));
    this.targetY = Math.max(20, Math.min(window.innerHeight - 76, this.mouseY + offset));
    
    this.isMouseTracking = true;
  }

  /**
   * Handle touch start for mobile
   * @param {TouchEvent} event - Touch event
   * @private
   */
  handleTouchStart(event) {
    if (!this.isMobile) return;
    
    const touch = event.touches[0];
    this.mouseX = touch.clientX;
    this.mouseY = touch.clientY;
  }

  /**
   * Handle touch move for mobile
   * @param {TouchEvent} event - Touch event
   * @private
   */
  handleTouchMove(event) {
    if (!this.isMobile) return;
    
    const touch = event.touches[0];
    this.targetX = Math.max(20, Math.min(window.innerWidth - 76, touch.clientX - 28));
    this.targetY = Math.max(20, Math.min(window.innerHeight - 76, touch.clientY - 28));
  }

  /**
   * Handle button click
   * @param {Event} event - Click event
   * @private
   */
  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.toggle();
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggle();
        break;
      case 'Escape':
        if (this.isOpen) {
          event.preventDefault();
          this.toggle();
        }
        break;
    }
  }

  /**
   * Handle window resize
   * @private
   */
  handleResize() {
    // Update mobile detection
    const wasMobile = this.isMobile;
    this.isMobile = this.detectMobile();
    
    // If mobile state changed, update event listeners
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        document.removeEventListener('mousemove', this.handleMouseMove);
        this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
      } else {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        document.addEventListener('mousemove', this.handleMouseMove);
      }
    }
    
    // Ensure button stays within bounds
    this.targetX = Math.max(20, Math.min(window.innerWidth - 76, this.currentX));
    this.targetY = Math.max(20, Math.min(window.innerHeight - 76, this.currentY));
  }

  /**
   * Start animation loop
   * @private
   */
  startAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.animate();
  }

  /**
   * Animation loop for smooth movement
   * @private
   */
  animate() {
    if (!this.element) return;
    
    // Smooth interpolation
    const lerp = 0.1;
    this.currentX += (this.targetX - this.currentX) * lerp;
    this.currentY += (this.targetY - this.currentY) * lerp;
    
    // Update position
    this.element.style.left = `${this.currentX}px`;
    this.element.style.top = `${this.currentY}px`;
    
    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Toggle the filter panel state
   */
  toggle() {
    this.isOpen = !this.isOpen;
    this.updateButtonState();
    this.onToggle(this.isOpen);
  }

  /**
   * Set the filter panel state
   * @param {boolean} isOpen - Whether the panel is open
   */
  setOpen(isOpen) {
    if (this.isOpen !== isOpen) {
      this.isOpen = isOpen;
      this.updateButtonState();
    }
  }

  /**
   * Update button visual state
   * @private
   */
  updateButtonState() {
    if (!this.element) return;
    
    // Update aria-expanded attribute
    this.element.setAttribute('aria-expanded', this.isOpen.toString());
    
    const svg = this.element.querySelector('svg');
    if (svg) {
      if (this.isOpen) {
        svg.style.transform = 'rotate(180deg)';
        this.element.classList.add('bg-blue-700');
        this.element.classList.remove('bg-blue-600');
      } else {
        svg.style.transform = 'rotate(0deg)';
        this.element.classList.add('bg-blue-600');
        this.element.classList.remove('bg-blue-700');
      }
    }
  }

  /**
   * Get current open state
   * @returns {boolean} Whether the panel is open
   */
  getIsOpen() {
    return this.isOpen;
  }

  /**
   * Set position manually (useful for initial positioning)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition(x, y) {
    this.targetX = Math.max(20, Math.min(window.innerWidth - 76, x));
    this.targetY = Math.max(20, Math.min(window.innerHeight - 76, y));
    this.currentX = this.targetX;
    this.currentY = this.targetY;
    
    if (this.element) {
      this.element.style.left = `${this.currentX}px`;
      this.element.style.top = `${this.currentY}px`;
    }
  }

  /**
   * Destroy the component and clean up event listeners
   */
  destroy() {
    // Cancel animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove event listeners
    if (this.element) {
      this.element.removeEventListener('click', this.handleClick);
      this.element.removeEventListener('keydown', this.handleKeyDown);
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.element = null;
    this.onToggle = null;
  }
}