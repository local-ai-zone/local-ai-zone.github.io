/**
 * Data formatting utilities for GGUF Model Discovery
 * Handles formatting of file sizes, numbers, dates, and other data
 */

class Formatters {
    /**
     * Format file size from bytes to human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size (e.g., "64.2 MB", "1.5 GB")
     */
    static formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    /**
     * Format download count to human readable format
     * @param {number} count - Download count
     * @returns {string} Formatted count (e.g., "2.5M", "150K", "1.2B")
     */
    static formatDownloadCount(count) {
        if (!count || count === 0) return '0';
        
        if (count >= 1000000000) {
            return (count / 1000000000).toFixed(1) + 'B';
        }
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        
        return count.toString();
    }

    /**
     * Format engagement number (like counts) to human readable format
     * @param {number} count - Engagement count (likes, stars, etc.)
     * @returns {string} Formatted count (e.g., "1.2K", "45", "2.5M")
     */
    static formatEngagementNumber(count) {
        if (!count || count === 0) return '0';
        
        // For engagement metrics, we want to show exact numbers for smaller values
        // and abbreviated format for larger values
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1).replace('.0', '') + 'K';
        }
        
        return count.toString();
    }

    /**
     * Format model name for display
     * @param {string} modelName - Raw model name
     * @returns {string} Formatted model name
     */
    static formatModelName(modelName) {
        if (!modelName) return 'Unknown Model';
        
        // Truncate very long names
        if (modelName.length > 50) {
            return modelName.substring(0, 47) + '...';
        }
        
        return modelName;
    }

    /**
     * Format quantization format for display
     * @param {string} quantFormat - Quantization format
     * @returns {string} Formatted quantization
     */
    static formatQuantization(quantFormat) {
        if (!quantFormat || quantFormat === 'Unknown') {
            return 'N/A';
        }
        return quantFormat.toUpperCase();
    }

    /**
     * Format license for display
     * @param {string} license - License string
     * @returns {string} Formatted license
     */
    static formatLicense(license) {
        if (!license || license === 'Not specified') {
            return 'N/A';
        }
        
        // Truncate very long licenses
        if (license.length > 20) {
            return license.substring(0, 17) + '...';
        }
        
        return license;
    }

    /**
     * Format model type for display
     * @param {string} modelType - Model type
     * @returns {string} Formatted model type
     */
    static formatModelType(modelType) {
        if (!modelType || modelType === 'Unknown') {
            return 'N/A';
        }
        return modelType;
    }

    /**
     * Format timestamp to human readable date
     * @param {string|Date} timestamp - Timestamp
     * @returns {string} Formatted date
     */
    static formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Get data freshness indicator
     * @param {string|Date} timestamp - Last update timestamp
     * @returns {object} Freshness info with status and color
     */
    static getDataFreshness(timestamp) {
        if (!timestamp) {
            return { status: 'unknown', color: 'gray', text: 'Unknown' };
        }

        try {
            const lastUpdate = new Date(timestamp);
            const now = new Date();
            const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

            if (hoursDiff < 24) {
                return { status: 'fresh', color: 'green', text: 'Fresh' };
            } else if (hoursDiff < 72) {
                return { status: 'recent', color: 'yellow', text: 'Recent' };
            } else {
                return { status: 'stale', color: 'red', text: 'Stale' };
            }
        } catch (error) {
            return { status: 'error', color: 'gray', text: 'Error' };
        }
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    static truncateText(text, maxLength = 50) {
        if (!text) return '';
        
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength - 3) + '...';
    }
}

// Export for use in other modules
window.Formatters = Formatters;