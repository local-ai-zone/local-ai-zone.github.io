#!/usr/bin/env node
/**
 * Shared shard-URL helpers for pre-rendered model pages.
 *
 * The catalog stores only part 1's filename (e.g.
 * ``BF16/model-00001-of-00041.gguf``) plus ``shardParts`` (41). Sibling
 * parts follow the ``-NNNNN-of-NNNNN`` convention with the same zero-
 * padding, so the full set is ``model-00001-of-00041.gguf`` …
 * ``model-00041-of-00041.gguf``, each resolved under the same repo.
 *
 * These mirror the logic in js/premium-app.js (getShardPartURLs /
 * shardDirOf / getDownloadTargets) so static pages and the interactive app
 * always agree on which URLs are real. Tests/shard-parts.test.js evals the
 * app source and asserts parity against this module.
 */

/**
 * Derive every individual shard resolve URL for a sharded file.
 * @param {Object} file - model entry (needs filename, modelId, shardParts)
 * @returns {string[]} one resolve URL per part, or [] when not sharded
 */
function deriveShardPartURLs(file) {
    const filename = String((file && file.filename) || '').replace(/\\/g, '/');
    // Lookahead keeps ".gguf" out of match[0] so it survives in suffix.
    const match = /-(\d+)-of-(\d+)(?=\.gguf$)/i.exec(filename);
    if (!match) return [];
    // The filename's own "of-N" total is authoritative; shardParts is the
    // fallback when the filename was normalized differently.
    const total = parseInt(match[2], 10) || parseInt((file && file.shardParts) || 0, 10);
    if (!(total > 1)) return [];
    const modelId = (file && file.modelId) || '';
    if (!modelId) return [];

    const partNumWidth = match[1].length;
    const totalWidth = match[2].length;
    const prefix = filename.slice(0, match.index);
    const suffix = filename.slice(match.index + match[0].length); // ".gguf"
    const urls = [];
    for (let i = 1; i <= total; i++) {
        const part = String(i).padStart(partNumWidth, '0');
        const totalStr = String(total).padStart(totalWidth, '0');
        const partFilename = `${prefix}-${part}-of-${totalStr}${suffix}`;
        urls.push(`https://huggingface.co/${modelId}/resolve/main/${partFilename}`);
    }
    return urls;
}

/**
 * Resolve the repository path for a sharded file (its directory).
 * @param {Object} file - model entry
 * @returns {string} e.g. "BF16" or "" for root-level files
 */
function shardDirectoryOf(file) {
    const filename = String((file && file.filename) || '').replace(/\\/g, '/');
    return filename.includes('/') ? filename.split('/').slice(0, -1).join('/') : '';
}

/**
 * Repo tree URL for a sharded file's directory (what the download button
 * should point at for multi-part files — one part alone is useless).
 *
 * Gated on the shardParts FIELD (like the app's getDownloadTargets), not
 * the derivation, so a sharded-but-unparseable filename still gets the
 * tree link rather than a misleading single-part download.
 *
 * @param {Object} file - model entry
 * @returns {string} tree URL, or '' when not sharded
 */
function shardTreeUrl(file) {
    const parts = parseInt((file && file.shardParts) || 0, 10);
    const modelId = (file && file.modelId) || '';
    if (!(parts > 0) || !modelId) return '';
    const dir = shardDirectoryOf(file);
    const encodedDir = dir.split('/').map(encodeURIComponent).join('/');
    return `https://huggingface.co/${modelId}/tree/main${encodedDir ? '/' + encodedDir : ''}`;
}

/**
 * Escape text for safe interpolation into HTML content.
 * @param {string} value - raw text
 * @returns {string} HTML-escaped text
 */
function htmlEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

module.exports = { deriveShardPartURLs, shardDirectoryOf, shardTreeUrl, htmlEscape };
