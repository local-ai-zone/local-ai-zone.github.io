/**
 * Notification system for GGUF Model Discovery
 * Provides toast notifications for user feedback
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.nextId = 1;
        this.init();
    }

    /**
     * Initialize the notification system
     */
    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(this.container);
    }

    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     * @returns {number} Notification ID
     */
    show(message, type = 'info', duration = 4000) {
        const id = this.nextId++;
        const notification = this.createNotification(id, message, type);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }

        return id;
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     * @returns {number} Notification ID
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     * @returns {number} Notification ID
     */
    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {number} duration - Duration in milliseconds
     * @returns {number} Notification ID
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {number} duration - Duration in milliseconds
     * @returns {number} Notification ID
     */
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Create notification element
     * @param {number} id - Notification ID
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @returns {HTMLElement} Notification element
     */
    createNotification(id, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;

        const icon = this.getIcon(type);
        const color = this.getColor(type);

        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg class="w-5 h-5 ${color}" fill="currentColor" viewBox="0 0 20 20">
                        ${icon}
                    </svg>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button class="notification-close bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-id="${id}">
                        <span class="sr-only">Close</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Add event listener for close button
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.dismiss(id);
        });

        return notification;
    }

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} SVG path
     */
    getIcon(type) {
        const icons = {
            success: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>',
            error: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>',
            warning: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>',
            info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get color class for notification type
     * @param {string} type - Notification type
     * @returns {string} Color class
     */
    getColor(type) {
        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            info: 'text-blue-400'
        };
        return colors[type] || colors.info;
    }

    /**
     * Dismiss a notification
     * @param {number} id - Notification ID
     */
    dismiss(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Animate out
        notification.classList.add('notification-hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        this.notifications.forEach((notification, id) => {
            this.dismiss(id);
        });
    }

    /**
     * Destroy the notification system
     */
    destroy() {
        this.dismissAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.notifications.clear();
    }
}

// Create global notification instance
window.notifications = new NotificationSystem();

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        max-width: 24rem;
        background: white;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .notification-show {
        transform: translateX(0);
        opacity: 1;
    }

    .notification-hide {
        transform: translateX(100%);
        opacity: 0;
    }

    .notification-success {
        border-left: 4px solid #10b981;
    }

    .notification-error {
        border-left: 4px solid #ef4444;
    }

    .notification-warning {
        border-left: 4px solid #f59e0b;
    }

    .notification-info {
        border-left: 4px solid #3b82f6;
    }

    .notification-close:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }

    @media (max-width: 640px) {
        .notification {
            max-width: calc(100vw - 2rem);
            margin: 0 1rem;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Export for use in other modules
window.NotificationSystem = NotificationSystem;