// js/theme-switcher.js

(function() {
    const themeSwitcher = {
        // STATE
        currentTheme: localStorage.getItem('theme') || 'auto',
        htmlElement: document.documentElement,

        /**
         * Initializes the theme switcher
         */
        init() {
            this.applyTheme();
            
            // The button might not be in the DOM yet, so we'll look for it later
            // Check if button is available now, if not wait for DOM to be fully loaded
            this.addEventListeners();
            console.log('Theme switcher initialized.');
        },

        /**
         * Gets the theme toggle button element (can be called multiple times)
         * @returns {HTMLElement|null} The theme toggle button or null if not found
         */
        getThemeToggleButton() {
            return document.getElementById('theme-toggle-button');
        },

        /**
         * Applies the theme based on saved preference or system setting
         */
        applyTheme() {
            if (this.currentTheme === 'auto') {
                // If set to auto, check system preference
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                    this.setTheme('dark');
                } else {
                    this.setTheme('light');
                }
            } else {
                // Apply the saved theme
                this.setTheme(this.currentTheme);
            }
        },

        /**
         * Sets the data-theme attribute on the HTML element
         * @param {string} theme - The theme to set ('light' or 'dark')
         */
        setTheme(theme) {
            this.htmlElement.setAttribute('data-theme', theme);
            this.currentTheme = theme;
            
            // Update button appearance based on new theme
            this.updateButtonAppearance();
        },

        /**
         * Updates button icon visibility based on current theme
         */
        updateButtonAppearance() {
            // This function will update the button icon visibility when theme changes
            // Icons are handled by CSS, but we can ensure the button is visible
            const button = this.getThemeToggleButton();
            if (button) {
                button.style.display = 'flex'; // Ensure button is visible
            }
        },

        /**
         * Toggles the theme between light and dark
         */
        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
            // Save the user's preference to localStorage
            localStorage.setItem('theme', newTheme);
            console.log(`Theme changed to ${newTheme} and saved to localStorage.`);
        },

        /**
         * Adds event listeners for the toggle button and system theme changes
         */
        addEventListeners() {
            // For the theme toggle button, we need to wait until it's available
            const addToggleButtonListener = () => {
                const button = this.getThemeToggleButton();
                if (button) {
                    // Button exists, add the event listener
                    button.addEventListener('click', () => this.toggleTheme());
                    // Update button appearance after theme is applied
                    this.updateButtonAppearance();
                } else {
                    // Button doesn't exist yet, try again in a bit
                    setTimeout(addToggleButtonListener, 100);
                }
            };
            
            // Start trying to add the event listener
            addToggleButtonListener();

            // Listener for changes in the OS theme preference
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                // Only apply if the user hasn't set a manual preference
                if (localStorage.getItem('theme') === null) {
                    const newColorScheme = event.matches ? 'dark' : 'light';
                    this.setTheme(newColorScheme);
                    console.log(`System theme changed to ${newColorScheme}.`);
                }
            });
        }
    };

    // Initialize the theme switcher once the DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        themeSwitcher.init();
    });

})();
