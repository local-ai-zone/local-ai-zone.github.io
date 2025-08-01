/**
 * Engagement metrics utilities for GGUF Model Discovery
 * Handles engagement-related formatting, icons, and display logic
 */

class EngagementUtils {
    /**
     * Icon mappings for engagement metrics
     * Using Unicode symbols for broad compatibility
     */
    static icons = {
        heart: '❤️',
        heartOutline: '🤍',
        heartSolid: '❤️',
        star: '⭐',
        starOutline: '☆',
        starSolid: '★',
        thumbsUp: '👍',
        fire: '🔥'
    };

    /**
     * Get heart icon based on engagement level
     * @param {number} likeCount - Number of likes
     * @returns {string} Heart icon (solid for higher engagement, outline for lower)
     */
    static getHeartIcon(likeCount = 0) {
        // Use solid heart for models with 10+ likes, outline for others
        return likeCount >= 10 ? this.icons.heartSolid : this.icons.heartOutline;
    }

    /**
     * Get engagement level classification
     * @param {number} likeCount - Number of likes
     * @returns {string} Engagement level ('low', 'medium', 'high', 'viral')
     */
    static getEngagementLevel(likeCount = 0) {
        if (likeCount >= 1000) return 'viral';
        if (likeCount >= 100) return 'high';
        if (likeCount >= 10) return 'medium';
        return 'low';
    }

    /**
     * Get CSS class for engagement level styling
     * @param {number} likeCount - Number of likes
     * @returns {string} CSS class name
     */
    static getEngagementClass(likeCount = 0) {
        const level = this.getEngagementLevel(likeCount);
        return `engagement-${level}`;
    }

    /**
     * Format engagement metric with icon
     * @param {number} likeCount - Number of likes
     * @param {boolean} showIcon - Whether to include the heart icon
     * @returns {string} Formatted engagement display
     */
    static formatEngagementDisplay(likeCount = 0, showIcon = true) {
        const formattedCount = window.Formatters ? 
            window.Formatters.formatEngagementNumber(likeCount) : 
            likeCount.toString();
        
        if (!showIcon) return formattedCount;
        
        const icon = this.getHeartIcon(likeCount);
        return `${icon} ${formattedCount}`;
    }

    /**
     * Get engagement metric tooltip text
     * @param {number} likeCount - Number of likes
     * @returns {string} Tooltip text
     */
    static getEngagementTooltip(likeCount = 0) {
        if (likeCount === 0) return 'No likes yet';
        if (likeCount === 1) return '1 like';
        return `${likeCount.toLocaleString()} likes`;
    }

    /**
     * Check if engagement metrics should be highlighted
     * @param {number} likeCount - Number of likes
     * @returns {boolean} Whether to highlight the metric
     */
    static shouldHighlightEngagement(likeCount = 0) {
        return likeCount >= 100; // Highlight models with 100+ likes
    }

    /**
     * Get engagement badge text for high-engagement models
     * @param {number} likeCount - Number of likes
     * @returns {string|null} Badge text or null if no badge needed
     */
    static getEngagementBadge(likeCount = 0) {
        if (likeCount >= 1000) return 'Popular';
        if (likeCount >= 500) return 'Trending';
        if (likeCount >= 100) return 'Liked';
        return null;
    }
}

// Export for use in other modules
window.EngagementUtils = EngagementUtils;