/**
 * FuzzyMatcher utility for fuzzy string matching
 * Provides approximate string matching for search suggestions
 */

class FuzzyMatcher {
    constructor(options = {}) {
        this.options = {
            threshold: 0.6, // Minimum similarity score (0-1)
            maxDistance: 3, // Maximum edit distance
            caseSensitive: false,
            ...options
        };
    }
    
    /**
     * Find fuzzy matches for a query in a list of strings
     * @param {string} query - Search query
     * @param {Array} candidates - Array of strings to search in
     * @param {Object} options - Override default options
     * @returns {Array} Array of matches with scores
     */
    findMatches(query, candidates, options = {}) {
        const opts = { ...this.options, ...options };
        const normalizedQuery = opts.caseSensitive ? query : query.toLowerCase();
        
        const matches = candidates.map(candidate => {
            const normalizedCandidate = opts.caseSensitive ? candidate : candidate.toLowerCase();
            const score = this.calculateSimilarity(normalizedQuery, normalizedCandidate);
            
            return {
                text: candidate,
                score,
                distance: this.levenshteinDistance(normalizedQuery, normalizedCandidate)
            };
        })
        .filter(match => match.score >= opts.threshold && match.distance <= opts.maxDistance)
        .sort((a, b) => b.score - a.score);
        
        return matches;
    }
    
    /**
     * Calculate similarity score between two strings (0-1)
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        // Use multiple similarity metrics and combine them
        const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
        const levenshtein = this.levenshteinSimilarity(str1, str2);
        const substring = this.substringScore(str1, str2);
        
        // Weighted combination
        return (jaroWinkler * 0.4) + (levenshtein * 0.3) + (substring * 0.3);
    }
    
    /**
     * Jaro-Winkler similarity
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Jaro-Winkler similarity score
     */
    jaroWinklerSimilarity(str1, str2) {
        const jaro = this.jaroSimilarity(str1, str2);
        
        if (jaro < 0.7) return jaro;
        
        // Calculate common prefix length (up to 4 characters)
        let prefix = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
            if (str1[i] === str2[i]) {
                prefix++;
            } else {
                break;
            }
        }
        
        return jaro + (0.1 * prefix * (1 - jaro));
    }
    
    /**
     * Jaro similarity
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Jaro similarity score
     */
    jaroSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 || len2 === 0) return 0.0;
        
        const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
        if (matchWindow < 0) return 0.0;
        
        const str1Matches = new Array(len1).fill(false);
        const str2Matches = new Array(len2).fill(false);
        
        let matches = 0;
        let transpositions = 0;
        
        // Find matches
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchWindow);
            const end = Math.min(i + matchWindow + 1, len2);
            
            for (let j = start; j < end; j++) {
                if (str2Matches[j] || str1[i] !== str2[j]) continue;
                
                str1Matches[i] = true;
                str2Matches[j] = true;
                matches++;
                break;
            }
        }
        
        if (matches === 0) return 0.0;
        
        // Find transpositions
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!str1Matches[i]) continue;
            
            while (!str2Matches[k]) k++;
            
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }
        
        return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;
    }
    
    /**
     * Levenshtein-based similarity
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score based on edit distance
     */
    levenshteinSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        if (maxLength === 0) return 1.0;
        
        return 1.0 - (distance / maxLength);
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(str1, str2) {
        if (str1.length === 0) return str2.length;
        if (str2.length === 0) return str1.length;
        
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Substring-based scoring
     * @param {string} query - Search query
     * @param {string} candidate - Candidate string
     * @returns {number} Substring score
     */
    substringScore(query, candidate) {
        if (candidate.includes(query)) {
            // Bonus for exact substring match
            const position = candidate.indexOf(query);
            const positionScore = 1.0 - (position / candidate.length);
            return 0.8 + (0.2 * positionScore);
        }
        
        // Check for partial matches
        let matchingChars = 0;
        let consecutiveMatches = 0;
        let maxConsecutive = 0;
        
        for (let i = 0; i < query.length; i++) {
            const char = query[i];
            const index = candidate.indexOf(char, matchingChars);
            
            if (index !== -1) {
                matchingChars++;
                
                if (index === matchingChars - 1) {
                    consecutiveMatches++;
                    maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
                } else {
                    consecutiveMatches = 1;
                }
            } else {
                consecutiveMatches = 0;
            }
        }
        
        const charScore = matchingChars / query.length;
        const consecutiveBonus = maxConsecutive / query.length * 0.5;
        
        return Math.min(1.0, charScore + consecutiveBonus);
    }
    
    /**
     * Find the best match for a query
     * @param {string} query - Search query
     * @param {Array} candidates - Array of candidate strings
     * @param {Object} options - Override default options
     * @returns {Object|null} Best match or null if no good match found
     */
    findBestMatch(query, candidates, options = {}) {
        const matches = this.findMatches(query, candidates, options);
        return matches.length > 0 ? matches[0] : null;
    }
    
    /**
     * Check if two strings are similar enough
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @param {number} threshold - Similarity threshold (0-1)
     * @returns {boolean} True if strings are similar
     */
    isSimilar(str1, str2, threshold = null) {
        const score = this.calculateSimilarity(str1, str2);
        return score >= (threshold || this.options.threshold);
    }
    
    /**
     * Group similar strings together
     * @param {Array} strings - Array of strings to group
     * @param {Object} options - Override default options
     * @returns {Array} Array of groups, each containing similar strings
     */
    groupSimilar(strings, options = {}) {
        const opts = { ...this.options, ...options };
        const groups = [];
        const processed = new Set();
        
        for (const str of strings) {
            if (processed.has(str)) continue;
            
            const group = [str];
            processed.add(str);
            
            for (const other of strings) {
                if (processed.has(other)) continue;
                
                if (this.isSimilar(str, other, opts.threshold)) {
                    group.push(other);
                    processed.add(other);
                }
            }
            
            groups.push(group);
        }
        
        return groups;
    }
    
    /**
     * Create a fuzzy search function for a specific dataset
     * @param {Array} dataset - Array of strings to search in
     * @param {Object} options - Search options
     * @returns {Function} Search function
     */
    createSearchFunction(dataset, options = {}) {
        return (query, limit = 10) => {
            const matches = this.findMatches(query, dataset, options);
            return matches.slice(0, limit);
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuzzyMatcher;
} else {
    window.FuzzyMatcher = FuzzyMatcher;
}