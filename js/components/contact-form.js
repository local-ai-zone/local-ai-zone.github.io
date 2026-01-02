/**
 * ============================================================================
 * CONTACT FORM COMPONENT
 * ============================================================================
 * 
 * A fully accessible, responsive slide-out contact form with validation and 
 * email service integration. No backend required!
 * 
 * ============================================================================
 * QUICK START SETUP
 * ============================================================================
 * 
 * 1. Include CSS in your HTML <head>:
 *    <link rel="stylesheet" href="css/contact-form.css">
 * 
 * 2. Add the contact form HTML structure to your page (see HTML STRUCTURE below)
 * 
 * 3. Include this script before closing </body>:
 *    <script src="js/components/contact-form.js"></script>
 * 
 * 4. Configure your email service (see EMAIL SERVICE SETUP below)
 * 
 * 5. Initialize the component:
 *    <script>
 *        document.addEventListener('DOMContentLoaded', () => {
 *            new ContactForm();
 *        });
 *    </script>
 * 
 * ============================================================================
 * EMAIL SERVICE SETUP
 * ============================================================================
 * 
 * Choose ONE of the following email service providers and follow the setup 
 * instructions. Then update the emailServiceConfig object below.
 * 
 * ----------------------------------------------------------------------------
 * OPTION 1: Web3Forms (RECOMMENDED)
 * ----------------------------------------------------------------------------
 * ✓ Unlimited free submissions
 * ✓ No account required
 * ✓ Instant setup (< 1 minute)
 * ✓ Privacy-focused
 * ✓ No SDK required
 * 
 * Setup Steps:
 * 1. Visit: https://web3forms.com
 * 2. Enter your email address to receive your free access key
 * 3. Check your email for the access key
 * 4. Update emailServiceConfig below:
 *    - Set provider: 'web3forms'
 *    - Set web3formsAccessKey: 'YOUR_ACCESS_KEY_FROM_EMAIL'
 *    - Set web3formsRecipient: 'your-email@example.com'
 * 
 * Example Configuration:
 * const emailServiceConfig = {
 *     provider: 'web3forms',
 *     web3formsAccessKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *     web3formsRecipient: 'contact@yoursite.com',
 *     timeoutMs: 10000
 * };
 * 
 * ----------------------------------------------------------------------------
 * OPTION 2: EmailJS
 * ----------------------------------------------------------------------------
 * ✓ 200 emails/month free
 * ✓ Email template customization
 * ✓ Multiple email service support (Gmail, Outlook, etc.)
 * ✓ Dashboard with analytics
 * 
 * Setup Steps:
 * 1. Visit: https://www.emailjs.com
 * 2. Create a free account
 * 3. Add an email service:
 *    - Go to "Email Services" in dashboard
 *    - Click "Add New Service"
 *    - Choose your email provider (Gmail, Outlook, etc.)
 *    - Follow the connection instructions
 *    - Note your Service ID
 * 4. Create an email template:
 *    - Go to "Email Templates" in dashboard
 *    - Click "Create New Template"
 *    - Use these template variables:
 *      {{from_name}} - Sender's name
 *      {{from_email}} - Sender's email
 *      {{subject}} - Email subject
 *      {{message}} - Message content
 *      {{to_email}} - Your email (recipient)
 *      {{source_url}} - Page URL where form was submitted
 *      {{timestamp}} - Submission timestamp
 *    - Note your Template ID
 * 5. Get your Public Key:
 *    - Go to "Account" → "General"
 *    - Copy your Public Key
 * 6. Add EmailJS SDK to your HTML <head>:
 *    <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
 * 7. Update emailServiceConfig below:
 *    - Set provider: 'emailjs'
 *    - Set emailjsServiceId: 'YOUR_SERVICE_ID'
 *    - Set emailjsTemplateId: 'YOUR_TEMPLATE_ID'
 *    - Set emailjsPublicKey: 'YOUR_PUBLIC_KEY'
 * 
 * Example Configuration:
 * const emailServiceConfig = {
 *     provider: 'emailjs',
 *     emailjsServiceId: 'service_abc1234',
 *     emailjsTemplateId: 'template_xyz5678',
 *     emailjsPublicKey: 'user_AbCdEfGhIjKlMnOp',
 *     timeoutMs: 10000
 * };
 * 
 * Example Email Template (EmailJS):
 * Subject: New Contact Form Submission - {{subject}}
 * 
 * You have received a new message from your website contact form.
 * 
 * From: {{from_name}} ({{from_email}})
 * Subject: {{subject}}
 * 
 * Message:
 * {{message}}
 * 
 * ---
 * Submitted from: {{source_url}}
 * Timestamp: {{timestamp}}
 * 
 * ----------------------------------------------------------------------------
 * OPTION 3: Formspree
 * ----------------------------------------------------------------------------
 * ✓ 50 submissions/month free
 * ✓ Spam protection included
 * ✓ Simple setup
 * ✓ Dashboard with submission history
 * 
 * Setup Steps:
 * 1. Visit: https://formspree.io
 * 2. Create a free account
 * 3. Create a new form:
 *    - Click "New Form"
 *    - Enter a form name
 *    - Note your Form ID (appears in the endpoint URL)
 *    - Example: https://formspree.io/f/YOUR_FORM_ID
 * 4. Update emailServiceConfig below:
 *    - Set provider: 'formspree'
 *    - Set formspreeFormId: 'YOUR_FORM_ID'
 * 
 * Example Configuration:
 * const emailServiceConfig = {
 *     provider: 'formspree',
 *     formspreeFormId: 'mzbqwxyz',
 *     timeoutMs: 10000
 * };
 * 
 * ============================================================================
 * CUSTOMIZATION OPTIONS
 * ============================================================================
 * 
 * ----------------------------------------------------------------------------
 * Colors
 * ----------------------------------------------------------------------------
 * The contact form uses CSS variables from your existing design system.
 * To customize colors, update these variables in your CSS:
 * 
 * --primary-600        Tab button background
 * --primary-700        Tab button hover state
 * --neutral-50         Form panel background
 * --neutral-900        Text color
 * --error-500          Error message color
 * --success-500        Success message color
 * --shadow-2xl         Form panel shadow
 * 
 * Example (add to your CSS):
 * :root {
 *     --primary-600: #3b82f6;
 *     --primary-700: #2563eb;
 *     --error-500: #ef4444;
 *     --success-500: #10b981;
 * }
 * 
 * ----------------------------------------------------------------------------
 * Positioning
 * ----------------------------------------------------------------------------
 * By default, the tab button appears on the right side of the screen.
 * To move it to the left side, update css/contact-form.css:
 * 
 * Change:
 * .contact-tab-button {
 *     right: 0;
 *     border-radius: 8px 0 0 8px;
 * }
 * 
 * To:
 * .contact-tab-button {
 *     left: 0;
 *     border-radius: 0 8px 8px 0;
 * }
 * 
 * And change:
 * .contact-form-panel {
 *     right: 0;
 *     transform: translateX(100%);
 * }
 * 
 * To:
 * .contact-form-panel {
 *     left: 0;
 *     transform: translateX(-100%);
 * }
 * 
 * ----------------------------------------------------------------------------
 * Text Content
 * ----------------------------------------------------------------------------
 * To customize text content, update the HTML structure:
 * 
 * - Tab button text: Change "Contact" in the button span
 * - Form title: Change "Contact Us" in the h2 element
 * - Field labels: Change label text for each form field
 * - Button text: Change "Send Message" in the submit button
 * - Success message: Update in showStatus() method (line ~650)
 * - Error messages: Update in validationRules object (line ~120)
 * 
 * ----------------------------------------------------------------------------
 * Validation Rules
 * ----------------------------------------------------------------------------
 * To customize validation rules, update the validationRules object below:
 * 
 * Available validation options:
 * - required: true/false
 * - minLength: number
 * - maxLength: number
 * - pattern: RegExp
 * - messages: { required, minLength, maxLength, pattern }
 * 
 * Example - Make subject field optional:
 * subject: {
 *     required: false,  // Changed from true
 *     minLength: 3,
 *     maxLength: 200,
 *     messages: {
 *         minLength: 'Subject must be at least 3 characters',
 *         maxLength: 'Subject cannot exceed 200 characters'
 *     }
 * }
 * 
 * ----------------------------------------------------------------------------
 * Timeout Duration
 * ----------------------------------------------------------------------------
 * To change the request timeout (default: 10 seconds):
 * Update timeoutMs in emailServiceConfig below
 * 
 * Example:
 * timeoutMs: 15000  // 15 seconds
 * 
 * ----------------------------------------------------------------------------
 * Rate Limiting
 * ----------------------------------------------------------------------------
 * To change the rate limit between submissions (default: 30 seconds):
 * Update the check in handleSubmit() method (line ~550)
 * 
 * Change:
 * if (now - this.state.lastSubmitTime < 30000) {
 * 
 * To (for 60 seconds):
 * if (now - this.state.lastSubmitTime < 60000) {
 * 
 * ----------------------------------------------------------------------------
 * Auto-close Delay
 * ----------------------------------------------------------------------------
 * To change how long the success message shows before auto-closing (default: 3 seconds):
 * Update the timeout in handleSubmit() method (line ~620)
 * 
 * Change:
 * setTimeout(() => {
 *     this.closeForm();
 *     this.clearStatus();
 * }, 3000);
 * 
 * To (for 5 seconds):
 * }, 5000);
 * 
 * ============================================================================
 * HTML STRUCTURE REQUIRED
 * ============================================================================
 * 
 * Add this HTML structure to your page (before closing </body>):
 * 
 * <!-- Contact Form Tab Button -->
 * <button id="contact-tab-button" 
 *         class="contact-tab-button" 
 *         aria-label="Open contact form"
 *         aria-expanded="false"
 *         aria-controls="contact-form-panel">
 *     <svg class="contact-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 *         <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
 *         <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
 *     </svg>
 *     <span class="contact-text">Contact</span>
 * </button>
 * 
 * <!-- Contact Form Panel -->
 * <div id="contact-form-panel" 
 *      class="contact-form-panel" 
 *      role="dialog" 
 *      aria-labelledby="contact-form-title"
 *      aria-hidden="true">
 *     <div class="contact-form-header">
 *         <h2 id="contact-form-title">Contact Us</h2>
 *         <button class="contact-form-close" 
 *                 aria-label="Close contact form"
 *                 type="button">
 *             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
 *                 <line x1="18" y1="6" x2="6" y2="18"></line>
 *                 <line x1="6" y1="6" x2="18" y2="18"></line>
 *             </svg>
 *         </button>
 *     </div>
 *     
 *     <form id="contact-form" class="contact-form" novalidate>
 *         <div class="form-group">
 *             <label for="contact-name" class="form-label">
 *                 Name <span class="required-indicator">*</span>
 *             </label>
 *             <input type="text" 
 *                    id="contact-name" 
 *                    name="name"
 *                    class="form-input"
 *                    required
 *                    aria-required="true"
 *                    aria-describedby="contact-name-error">
 *             <div id="contact-name-error" 
 *                  class="form-error" 
 *                  role="alert"
 *                  aria-live="polite"></div>
 *         </div>
 *         
 *         <div class="form-group">
 *             <label for="contact-email" class="form-label">
 *                 Email <span class="required-indicator">*</span>
 *             </label>
 *             <input type="email" 
 *                    id="contact-email" 
 *                    name="email"
 *                    class="form-input"
 *                    required
 *                    aria-required="true"
 *                    aria-describedby="contact-email-error">
 *             <div id="contact-email-error" 
 *                  class="form-error" 
 *                  role="alert"
 *                  aria-live="polite"></div>
 *         </div>
 *         
 *         <div class="form-group">
 *             <label for="contact-subject" class="form-label">
 *                 Subject <span class="required-indicator">*</span>
 *             </label>
 *             <input type="text" 
 *                    id="contact-subject" 
 *                    name="subject"
 *                    class="form-input"
 *                    required
 *                    aria-required="true"
 *                    aria-describedby="contact-subject-error">
 *             <div id="contact-subject-error" 
 *                  class="form-error" 
 *                  role="alert"
 *                  aria-live="polite"></div>
 *         </div>
 *         
 *         <div class="form-group">
 *             <label for="contact-message" class="form-label">
 *                 Message <span class="required-indicator">*</span>
 *             </label>
 *             <textarea id="contact-message" 
 *                       name="message"
 *                       class="form-input"
 *                       rows="6"
 *                       required
 *                       aria-required="true"
 *                       aria-describedby="contact-message-error"></textarea>
 *             <div id="contact-message-error" 
 *                  class="form-error" 
 *                  role="alert"
 *                  aria-live="polite"></div>
 *         </div>
 *         
 *         <button type="submit" class="form-submit">Send Message</button>
 *     </form>
 *     
 *     <div class="contact-form-status" role="status" aria-live="polite"></div>
 * </div>
 * 
 * ============================================================================
 * FEATURES
 * ============================================================================
 * 
 * ✓ Fully accessible (WCAG 2.1 AA compliant)
 * ✓ Keyboard navigation support
 * ✓ Screen reader compatible
 * ✓ Focus trap when form is open
 * ✓ Real-time validation
 * ✓ Responsive design (mobile, tablet, desktop)
 * ✓ Touch-friendly
 * ✓ Smooth animations
 * ✓ Error handling with retry
 * ✓ Rate limiting
 * ✓ XSS protection
 * ✓ No backend required
 * 
 * ============================================================================
 * BROWSER SUPPORT
 * ============================================================================
 * 
 * ✓ Chrome (latest)
 * ✓ Firefox (latest)
 * ✓ Safari (latest)
 * ✓ Edge (latest)
 * ✓ Mobile Safari (iOS 12+)
 * ✓ Chrome Mobile (Android 8+)
 * 
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 * 
 * Form not appearing?
 * - Check that HTML structure is present in your page
 * - Check that CSS file is linked correctly
 * - Check browser console for errors
 * 
 * Form not sending emails?
 * - Check that emailServiceConfig is properly configured
 * - Check that you've replaced placeholder values (YOUR_ACCESS_KEY, etc.)
 * - For EmailJS: Ensure SDK script is included in HTML
 * - Check browser console for error messages
 * - Test your email service credentials in their dashboard
 * 
 * Validation not working?
 * - Check that form fields have correct IDs (contact-name, contact-email, etc.)
 * - Check that error divs have correct IDs (contact-name-error, etc.)
 * 
 * Styling issues?
 * - Check that CSS file is linked correctly
 * - Check that CSS variables are defined in your stylesheet
 * - Check for CSS conflicts with existing styles
 * 
 * ============================================================================
 */

/**
 * Email Service Configuration
 * Configure your preferred email service provider here
 */
const emailServiceConfig = {
    // Choose provider: 'web3forms', 'emailjs', or 'formspree'
    provider: 'emailjs',
    
    // Web3Forms Configuration (Alternative)
    web3formsAccessKey: 'YOUR_WEB3FORMS_ACCESS_KEY', // Get from https://web3forms.com
    web3formsRecipient: 'your-email@example.com', // Your email address
    
    // EmailJS Configuration (ACTIVE)
    emailjsServiceId: 'service_xvl4mxh',
    emailjsTemplateId: 'template_6dj08m9',
    emailjsPublicKey: 'l8wiFI5q-0z4KO9NF',
    
    // Formspree Configuration (Alternative)
    formspreeFormId: 'YOUR_FORMSPREE_FORM_ID', // From https://formspree.io/f/YOUR_FORM_ID
    
    // General settings
    recipientEmail: 'info@local-ai-zone.com', // Your public-facing contact email
    timeoutMs: 10000 // 10 second timeout for requests
};

class ContactForm {
    constructor() {
        // Cache DOM element references
        this.tabButton = document.getElementById('contact-tab-button');
        this.panel = document.getElementById('contact-form-panel');
        this.form = document.getElementById('contact-form');
        this.closeButton = this.panel?.querySelector('.contact-form-close');
        this.statusContainer = this.panel?.querySelector('.contact-form-status');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        
        // Cache form field references
        this.fields = {
            name: this.form?.querySelector('#contact-name'),
            email: this.form?.querySelector('#contact-email'),
            subject: this.form?.querySelector('#contact-subject'),
            message: this.form?.querySelector('#contact-message')
        };
        
        // Initialize state
        this.state = {
            isOpen: false,
            isSubmitting: false,
            lastSubmitTime: 0
        };
        
        // Validation rules
        this.validationRules = {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s'\-]+$/,
                messages: {
                    required: 'Name is required',
                    minLength: 'Name must be at least 2 characters',
                    maxLength: 'Name cannot exceed 100 characters',
                    pattern: 'Name can only contain letters, spaces, hyphens, and apostrophes'
                }
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                messages: {
                    required: 'Email is required',
                    pattern: 'Please enter a valid email address'
                }
            },
            subject: {
                required: true,
                minLength: 3,
                maxLength: 200,
                messages: {
                    required: 'Subject is required',
                    minLength: 'Subject must be at least 3 characters',
                    maxLength: 'Subject cannot exceed 200 characters'
                }
            },
            message: {
                required: true,
                minLength: 10,
                maxLength: 2000,
                messages: {
                    required: 'Message is required',
                    minLength: 'Message must be at least 10 characters',
                    maxLength: 'Message cannot exceed 2000 characters'
                }
            }
        };
        
        // Store focusable elements for focus trap
        this.focusableElements = null;
        this.previouslyFocusedElement = null;
        
        // Store email service configuration
        this.emailConfig = emailServiceConfig;
        
        // Verify required elements exist
        if (!this.tabButton || !this.panel || !this.form) {
            console.error('ContactForm: Required DOM elements not found');
            return;
        }
        
        // Verify email service configuration
        this.verifyEmailConfig();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Verify email service configuration
     */
    verifyEmailConfig() {
        const { provider } = this.emailConfig;
        
        if (provider === 'web3forms' && this.emailConfig.web3formsAccessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
            console.warn('ContactForm: Web3Forms access key not configured. Please update emailServiceConfig.');
        } else if (provider === 'emailjs') {
            if (this.emailConfig.emailjsPublicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
                console.warn('ContactForm: EmailJS credentials not configured. Please update emailServiceConfig.');
            } else {
                // Initialize EmailJS with public key
                if (typeof emailjs !== 'undefined') {
                    emailjs.init(this.emailConfig.emailjsPublicKey);
                    console.log('✅ EmailJS initialized successfully');
                } else {
                    console.error('❌ EmailJS SDK not loaded. Please include the EmailJS script in your HTML.');
                }
            }
        } else if (provider === 'formspree' && this.emailConfig.formspreeFormId === 'YOUR_FORMSPREE_FORM_ID') {
            console.warn('ContactForm: Formspree form ID not configured. Please update emailServiceConfig.');
        }
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Tab button click
        this.tabButton.addEventListener('click', () => this.toggleForm());
        
        // Tab button keyboard support (Enter and Space)
        this.tabButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleForm();
            }
        });
        
        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.closeForm());
            
            // Close button keyboard support (Enter and Space)
            this.closeButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.closeForm();
                }
            });
        }
        
        // Click outside to close
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.closeForm();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                e.preventDefault();
                this.closeForm();
            }
        });
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation on input and blur
        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            if (field) {
                field.addEventListener('input', () => this.validateField(fieldName));
                field.addEventListener('blur', () => this.validateField(fieldName));
            }
        });
    }
    
    /**
     * Toggle form open/closed
     */
    toggleForm() {
        if (this.state.isOpen) {
            this.closeForm();
        } else {
            this.openForm();
        }
    }
    
    /**
     * Open the contact form
     */
    openForm() {
        this.state.isOpen = true;
        
        // Update ARIA attributes
        this.tabButton.setAttribute('aria-expanded', 'true');
        this.panel.setAttribute('aria-hidden', 'false');
        
        // Show panel
        this.panel.classList.add('contact-form-panel--open');
        
        // Store currently focused element
        this.previouslyFocusedElement = document.activeElement;
        
        // Set up focus trap
        this.setupFocusTrap();
        
        // Focus first form field
        setTimeout(() => {
            if (this.fields.name) {
                this.fields.name.focus();
            }
        }, 300); // Wait for animation
    }
    
    /**
     * Close the contact form
     */
    closeForm() {
        this.state.isOpen = false;
        
        // Update ARIA attributes
        this.tabButton.setAttribute('aria-expanded', 'false');
        this.panel.setAttribute('aria-hidden', 'true');
        
        // Hide panel
        this.panel.classList.remove('contact-form-panel--open');
        
        // Remove focus trap listener
        if (this.focusTrapHandler) {
            this.panel.removeEventListener('keydown', this.focusTrapHandler);
        }
        
        // Restore focus to previously focused element or tab button
        setTimeout(() => {
            if (this.previouslyFocusedElement && document.body.contains(this.previouslyFocusedElement)) {
                this.previouslyFocusedElement.focus();
            } else {
                // Fallback to tab button if previous element no longer exists
                this.tabButton.focus();
            }
        }, 100); // Small delay to ensure panel is hidden
    }
    
    /**
     * Set up focus trap within the form panel
     */
    setupFocusTrap() {
        // Get all focusable elements within the panel
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        this.focusableElements = Array.from(
            this.panel.querySelectorAll(focusableSelectors)
        ).filter(el => {
            // Filter out hidden elements
            return el.offsetParent !== null && 
                   getComputedStyle(el).visibility !== 'hidden' &&
                   getComputedStyle(el).display !== 'none';
        });
        
        // Remove existing listener if any
        if (this.focusTrapHandler) {
            this.panel.removeEventListener('keydown', this.focusTrapHandler);
        }
        
        // Create and store the handler
        this.focusTrapHandler = (e) => this.handleFocusTrap(e);
        
        // Add keydown listener for Tab key
        this.panel.addEventListener('keydown', this.focusTrapHandler);
    }
    
    /**
     * Handle focus trap navigation
     */
    handleFocusTrap(e) {
        if (e.key !== 'Tab' || !this.state.isOpen) return;
        
        // Refresh focusable elements to account for dynamic changes
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        const currentFocusableElements = Array.from(
            this.panel.querySelectorAll(focusableSelectors)
        ).filter(el => {
            return el.offsetParent !== null && 
                   getComputedStyle(el).visibility !== 'hidden' &&
                   getComputedStyle(el).display !== 'none';
        });
        
        if (currentFocusableElements.length === 0) return;
        
        const firstElement = currentFocusableElements[0];
        const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
        
        if (e.shiftKey) {
            // Shift + Tab - moving backwards
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab - moving forwards
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * Validate a single field
     */
    validateField(fieldName) {
        const field = this.fields[fieldName];
        const rules = this.validationRules[fieldName];
        const value = field.value.trim();
        const errorElement = document.getElementById(`${field.id}-error`);
        
        let errorMessage = '';
        
        // Required validation
        if (rules.required && !value) {
            errorMessage = rules.messages.required;
        }
        // Min length validation
        else if (rules.minLength && value.length < rules.minLength) {
            errorMessage = rules.messages.minLength;
        }
        // Max length validation
        else if (rules.maxLength && value.length > rules.maxLength) {
            errorMessage = rules.messages.maxLength;
        }
        // Pattern validation
        else if (rules.pattern && value && !rules.pattern.test(value)) {
            errorMessage = rules.messages.pattern;
        }
        
        // Display or clear error
        if (errorMessage) {
            field.classList.add('form-input--error');
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${field.id}-error`);
            if (errorElement) {
                // Clear first to ensure screen readers announce the new error
                errorElement.textContent = '';
                errorElement.style.display = 'none';
                
                // Set error message with slight delay for screen reader announcement
                setTimeout(() => {
                    errorElement.textContent = errorMessage;
                    errorElement.style.display = 'block';
                }, 50);
            }
            return false;
        } else {
            field.classList.remove('form-input--error');
            field.setAttribute('aria-invalid', 'false');
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
            return true;
        }
    }
    
    /**
     * Validate entire form
     */
    validateForm() {
        let isValid = true;
        
        Object.keys(this.fields).forEach(fieldName => {
            const fieldValid = this.validateField(fieldName);
            if (!fieldValid) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Check rate limiting (30 seconds between submissions)
        const now = Date.now();
        if (now - this.state.lastSubmitTime < 30000) {
            this.showStatus('error', 'Please wait before submitting again.');
            return;
        }
        
        // Prevent duplicate submissions
        if (this.state.isSubmitting) {
            return;
        }
        
        // Set submitting state
        this.state.isSubmitting = true;
        this.state.lastSubmitTime = now;
        
        // Disable submit button and show loading state
        this.submitButton.disabled = true;
        const originalButtonText = this.submitButton.textContent;
        this.submitButton.innerHTML = `
            <svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="30" stroke-dashoffset="0">
                    <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
                </circle>
            </svg>
            <span style="margin-left: 8px;">Sending...</span>
        `;
        
        // Collect and sanitize form data
        const formData = this.collectFormData();
        
        // Send email via configured service
        try {
            await this.sendEmail(formData);
            
            // Success - show success message
            this.showStatus('success', 'Message sent successfully! We\'ll get back to you soon.');
            
            // Clear form fields
            this.form.reset();
            
            // Clear any validation errors
            Object.keys(this.fields).forEach(fieldName => {
                const field = this.fields[fieldName];
                field.classList.remove('form-input--error');
                field.setAttribute('aria-invalid', 'false');
                const errorElement = document.getElementById(`${field.id}-error`);
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.style.display = 'none';
                }
            });
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                this.closeForm();
                this.clearStatus();
            }, 3000);
            
        } catch (error) {
            // Error - show error message with fallback email option and retry button
            const recipientEmail = this.emailConfig.recipientEmail || 'contact@example.com';
            const errorMessage = error.message || 'An unexpected error occurred';
            
            let displayMessage = '';
            let showRetry = true;
            
            if (errorMessage.includes('timed out')) {
                displayMessage = 'Request timed out. Please check your connection and try again.';
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
                displayMessage = 'Unable to send message. Please check your internet connection and try again.';
            } else if (errorMessage.includes('not configured') || errorMessage.includes('not loaded')) {
                displayMessage = `Email service not properly configured. Please email us directly at <a href="mailto:${recipientEmail}" class="status-link">${recipientEmail}</a>`;
                showRetry = false; // Don't show retry for configuration errors
            } else {
                displayMessage = `Failed to send message. Please try again or email us directly at <a href="mailto:${recipientEmail}" class="status-link">${recipientEmail}</a>`;
            }
            
            this.showStatus('error', displayMessage, { showRetry });
            console.error('Form submission error:', error);
            
            // Keep form data intact so user can retry
            
        } finally {
            // Reset button state
            this.state.isSubmitting = false;
            this.submitButton.disabled = false;
            this.submitButton.textContent = originalButtonText;
        }
    }
    
    /**
     * Collect and sanitize form data
     */
    collectFormData() {
        const data = {
            name: this.sanitizeInput(this.fields.name.value),
            email: this.sanitizeInput(this.fields.email.value),
            subject: this.sanitizeInput(this.fields.subject.value),
            message: this.sanitizeInput(this.fields.message.value),
            timestamp: Date.now(),
            source: window.location.href
        };
        
        return data;
    }
    
    /**
     * Sanitize input to prevent XSS
     */
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML.trim();
    }
    
    /**
     * Send email via configured service
     */
    async sendEmail(formData) {
        const { provider } = this.emailConfig;
        
        switch (provider) {
            case 'web3forms':
                return await this.sendViaWeb3Forms(formData);
            case 'emailjs':
                return await this.sendViaEmailJS(formData);
            case 'formspree':
                return await this.sendViaFormspree(formData);
            default:
                throw new Error(`Unknown email provider: ${provider}`);
        }
    }
    
    /**
     * Send email via Web3Forms
     */
    async sendViaWeb3Forms(formData) {
        const payload = {
            access_key: this.emailConfig.web3formsAccessKey,
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            from_name: formData.name,
            replyto: formData.email,
            to: this.emailConfig.web3formsRecipient,
            // Additional metadata
            source_url: formData.source,
            timestamp: new Date(formData.timestamp).toISOString()
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.emailConfig.timeoutMs);
        
        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to send email');
            }
            
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        }
    }
    
    /**
     * Send email via EmailJS
     */
    async sendViaEmailJS(formData) {
        // Check if EmailJS is loaded
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS SDK not loaded. Please include the EmailJS script in your HTML.');
        }
        
        const templateParams = {
            from_name: formData.name,
            from_email: formData.email,
            subject: formData.subject,
            message: formData.message,
            source_url: formData.source,
            timestamp: new Date(formData.timestamp).toLocaleString()
        };
        
        console.log('📧 EmailJS Configuration:', {
            serviceId: this.emailConfig.emailjsServiceId,
            templateId: this.emailConfig.emailjsTemplateId,
            publicKey: this.emailConfig.emailjsPublicKey
        });
        console.log('📨 Sending email with params:', templateParams);
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timed out. Please try again.'));
            }, this.emailConfig.timeoutMs);
            
            // EmailJS v3 API - use send() after init()
            emailjs.send(
                this.emailConfig.emailjsServiceId,
                this.emailConfig.emailjsTemplateId,
                templateParams
            )
            .then((response) => {
                clearTimeout(timeoutId);
                console.log('✅ Email sent successfully:', response);
                resolve(response);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                console.error('❌ EmailJS error details:', {
                    status: error.status,
                    text: error.text,
                    message: error.message,
                    fullError: error
                });
                
                // Provide more helpful error message
                let errorMessage = 'Failed to send email. ';
                if (error.status === 400) {
                    errorMessage += 'Template configuration error. Please check that your EmailJS template variables match: from_name, from_email, subject, message, source_url, timestamp';
                } else if (error.status === 401 || error.status === 403) {
                    errorMessage += 'Authentication error. Please verify your Service ID, Template ID, and Public Key.';
                } else if (error.text) {
                    errorMessage += error.text;
                } else {
                    errorMessage += error.message || 'Unknown error occurred.';
                }
                
                reject(new Error(errorMessage));
            });
        });
    }
    
    /**
     * Send email via Formspree
     */
    async sendViaFormspree(formData) {
        const payload = {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            _replyto: formData.email,
            _subject: formData.subject,
            source_url: formData.source,
            timestamp: new Date(formData.timestamp).toISOString()
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.emailConfig.timeoutMs);
        
        try {
            const response = await fetch(`https://formspree.io/f/${this.emailConfig.formspreeFormId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        }
    }
    
    /**
     * Show status message
     */
    showStatus(type, message, options = {}) {
        if (!this.statusContainer) return;
        
        const iconSvg = type === 'success' 
            ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"/></svg>';
        
        // Update ARIA attributes for proper announcement
        this.statusContainer.setAttribute('role', type === 'error' ? 'alert' : 'status');
        this.statusContainer.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        this.statusContainer.setAttribute('aria-atomic', 'true');
        
        this.statusContainer.className = `contact-form-status contact-form-status--${type}`;
        
        // Clear first to ensure screen readers announce the new message
        this.statusContainer.innerHTML = '';
        
        // Build status content
        let statusContent = `
            <div class="status-icon">${iconSvg}</div>
            <div class="status-content">
                <div class="status-message">${message}</div>
        `;
        
        // Add retry button for errors if enabled
        if (type === 'error' && options.showRetry) {
            statusContent += `
                <button type="button" class="status-retry-button" aria-label="Retry sending message">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 3V1L5 4l3 3V5c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4H2c0 3.31 2.69 6 6 6s6-2.69 6-6-2.69-6-6-6z"/>
                    </svg>
                    <span>Retry</span>
                </button>
            `;
        }
        
        statusContent += `
            </div>
            <button type="button" class="status-dismiss" aria-label="Dismiss message">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </button>
        `;
        
        // Use setTimeout to ensure screen readers detect the change
        setTimeout(() => {
            this.statusContainer.innerHTML = statusContent;
            this.statusContainer.style.display = 'flex';
            
            // Add event listeners for retry and dismiss buttons
            const retryButton = this.statusContainer.querySelector('.status-retry-button');
            const dismissButton = this.statusContainer.querySelector('.status-dismiss');
            
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.clearStatus();
                    this.handleSubmit(new Event('submit'));
                });
            }
            
            if (dismissButton) {
                dismissButton.addEventListener('click', () => {
                    this.clearStatus();
                });
            }
        }, 100);
    }
    
    /**
     * Clear status message
     */
    clearStatus() {
        if (this.statusContainer) {
            this.statusContainer.style.display = 'none';
            this.statusContainer.innerHTML = '';
            // Reset ARIA attributes
            this.statusContainer.setAttribute('role', 'status');
            this.statusContainer.setAttribute('aria-live', 'polite');
        }
    }
}

// Initialize contact form when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContactForm();
    });
} else {
    new ContactForm();
}
