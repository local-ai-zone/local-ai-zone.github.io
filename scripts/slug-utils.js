#!/usr/bin/env node

/**
 * Shared slug utilities — SINGLE SOURCE OF TRUTH for model slug generation.
 *
 * Both generators MUST use createSlug() from this module:
 *   - scripts/generate-minimal-pages.js  (writes pre-rendered models/*.html)
 *   - scripts/generate-seo.js            (looks up models/*.html for sitemap.xml)
 *
 * Keeping one function here guarantees a pre-rendered page is always found by
 * the sitemap generator under the same URL.
 *
 * Canonical rule (createSlug):
 *   - lowercase
 *   - every run of non-alphanumeric characters (dots, slashes, underscores,
 *     spaces, parentheses, etc.) becomes a single hyphen
 *   - trim leading/trailing hyphens
 *
 * This preserves meaningful separators, e.g.:
 *   "Qwen3.5"          -> "qwen3-5"   (NOT the ambiguous "qwen35")
 *   "Microsoft.phi 4"  -> "microsoft-phi-4"
 *   "Wan2.2"           -> "wan2-2"
 */

/**
 * Convert a model name into a URL-friendly slug.
 * @param {string} name - model name (e.g. "Qwen3.5 4b")
 * @returns {string} slug (e.g. "qwen3-5-4b") — never null/undefined
 */
function createSlug(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

module.exports = { createSlug };
