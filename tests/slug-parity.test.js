#!/usr/bin/env node
/**
 * Slug parity regression tests.
 *
 * Guards the slug unification fix: generate-minimal-pages.js (writes
 * models/*.html) and generate-seo.js (builds sitemap.xml) MUST produce
 * identical slugs, otherwise pre-rendered pages become invisible to the
 * sitemap (the 404-top-1000 bug fixed on 2026-08-04).
 *
 * Run:  node --test tests/slug-parity.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const { createSlug } = require(path.join(ROOT, 'scripts', 'slug-utils.js'));
const MinimalPageGenerator = require(path.join(ROOT, 'scripts', 'generate-minimal-pages.js'));

/**
 * Build a generator pointed at a throwaway directory.
 * @returns {{gen: MinimalPageGenerator, dir: string}}
 */
function makeTempGenerator() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gguf-cleanup-'));
    const gen = new MinimalPageGenerator();
    gen.outputDir = dir;
    return { gen, dir };
}

/**
 * Drop dummy page files into the generator's output dir.
 * @param {string} dir - output dir
 * @param {string[]} names - file names to create
 */
function seedPages(dir, names) {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of names) {
        fs.writeFileSync(path.join(dir, name), '<html>stub</html>', 'utf8');
    }
}

// ── 0. Stale-page cleanup (generate-minimal-pages.js) ────────────────────
test('cleanupStalePages: removes pages outside the selection', async () => {
    const { gen, dir } = makeTempGenerator();
    seedPages(dir, ['qwen-3-5.html', 'stale-model.html', 'other-old.html']);
    gen.generatedSlugs = new Set(['qwen-3-5']);

    await gen.cleanupStalePages();

    assert.ok(fs.existsSync(path.join(dir, 'qwen-3-5.html')), 'selected page kept');
    assert.ok(!fs.existsSync(path.join(dir, 'stale-model.html')), 'stale page removed');
    assert.ok(!fs.existsSync(path.join(dir, 'other-old.html')), 'stale page removed');
    assert.strictEqual(gen.stats.removedStale, 2);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('cleanupStalePages: never touches non-slug files', async () => {
    const { gen, dir } = makeTempGenerator();
    seedPages(dir, ['README.md', 'assets', 'page-1.html', '.hidden', 'UPPER.HTML']);
    gen.generatedSlugs = new Set();

    await gen.cleanupStalePages();

    // Only slug-shaped .html files are candidates; nothing qualifies here
    assert.ok(fs.existsSync(path.join(dir, 'README.md')), 'README kept');
    assert.ok(fs.existsSync(path.join(dir, 'assets')), 'asset kept');
    assert.ok(fs.existsSync(path.join(dir, '.hidden')), 'hidden file kept');
    assert.ok(fs.existsSync(path.join(dir, 'UPPER.HTML')), 'non-slug html kept');
    assert.strictEqual(gen.stats.removedStale, 0);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('cleanupStalePages: empty selection never wipes the directory', async () => {
    const { gen, dir } = makeTempGenerator();
    seedPages(dir, ['qwen-3-5.html', 'llama-8b.html']);
    gen.generatedSlugs = new Set(); // empty catalog guard

    await gen.cleanupStalePages();

    assert.ok(fs.existsSync(path.join(dir, 'qwen-3-5.html')), 'page survives empty selection');
    assert.ok(fs.existsSync(path.join(dir, 'llama-8b.html')), 'page survives empty selection');
    assert.strictEqual(gen.stats.removedStale, 0);
    fs.rmSync(dir, { recursive: true, force: true });
});

// ── 1. createSlug unit behaviour ─────────────────────────────────────────
test('createSlug: canonical rule', () => {
    // Dots become hyphens (NOT merged digits)
    assert.strictEqual(createSlug('Qwen3.5'), 'qwen3-5');
    assert.strictEqual(createSlug('Microsoft.phi 4'), 'microsoft-phi-4');
    assert.strictEqual(createSlug('Wan2.2'), 'wan2-2');
    assert.strictEqual(createSlug('Flux.2 Dev'), 'flux-2-dev');

    // Spaces / underscores / multiple separators collapse to one hyphen
    assert.strictEqual(createSlug('Llama  3.1  8B'), 'llama-3-1-8b');
    assert.strictEqual(createSlug('zephyr_7b_beta'), 'zephyr-7b-beta');
    assert.strictEqual(createSlug('a--b__c'), 'a-b-c');

    // Uppercase -> lowercase
    assert.strictEqual(createSlug('MISTRAL-7B-Instruct'), 'mistral-7b-instruct');

    // Special characters are stripped
    assert.strictEqual(createSlug('(Cydonia) 24B v4.3!'), 'cydonia-24b-v4-3');

    // Leading/trailing separators trimmed
    assert.strictEqual(createSlug(' -Phi-4- '), 'phi-4');

    // Edge: empty / null never throw
    assert.strictEqual(createSlug(''), '');
    assert.strictEqual(createSlug(null), '');
    assert.strictEqual(createSlug(undefined), '');
    assert.strictEqual(createSlug('!!!'), '');
});

test('createSlug: distinct names never collide on dotted versions', () => {
    // The whole point of the unification: "Qwen3.5" and "Qwen35" are different
    const slugs = new Set([
        createSlug('Qwen3.5'),
        createSlug('Qwen35'),
        createSlug('Qwen 3.5'),
    ]);
    assert.ok(slugs.size >= 2, 'dotted vs non-dotted names should differ');
});

// ── 2. Both generators share the canonical slug function ────────────────
test('both generators import slug-utils and use createSlug', () => {
    for (const file of ['generate-minimal-pages.js', 'generate-seo.js']) {
        const src = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
        assert.ok(
            src.includes("require('./slug-utils')"),
            `${file} must require ./slug-utils`
        );
        assert.ok(
            src.includes('createSlug('),
            `${file} must call createSlug()`
        );
        // A private regex-based slugifier would reintroduce the divergence —
        // the shared module is the ONLY place allowed to slugify.
        assert.ok(
            !src.includes('function createSlug') && !src.includes('createSlug ='),
            `${file} must not define its own createSlug`
        );
    }
});

test('slug-utils is the only slug implementation in scripts/', () => {
    const scriptsDir = path.join(ROOT, 'scripts');
    const offenders = [];
    for (const file of fs.readdirSync(scriptsDir)) {
        if (!file.endsWith('.js')) continue;
        const src = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
        // Old buggy rule stripped dots entirely: [^a-z0-9\s-]
        if (/replace\(\[\^a-z0-9\\s-\]/.test(src)) {
            offenders.push(file);
        }
    }
    assert.deepStrictEqual(offenders, [],
        'no script may contain the old dot-stripping slug rule');
});

// ── 3. End-to-end parity against real data ──────────────────────────────
test('on-disk pages match sitemap (zero orphans both directions)', () => {
    const models = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'gguf_models.json'), 'utf8')
    );
    const slugSet = new Set(models.map((m) => createSlug(m.modelName)));

    const modelsDir = path.join(ROOT, 'models');
    const onDisk = fs.existsSync(modelsDir)
        ? fs.readdirSync(modelsDir).filter((f) => f.endsWith('.html'))
        : [];

    // Every pre-rendered page slug must come from a real model.
    const orphans = onDisk.filter((f) => {
        const slug = f.replace(/\.html$/, '');
        return !slugSet.has(slug);
    });
    assert.deepStrictEqual(orphans, [],
        `orphan pages with no matching model: ${orphans.join(', ')}`);

    // Every sitemap model URL must exist on disk.
    const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const locs = [...sitemap.matchAll(/<loc>https:\/\/local-ai-zone\.github\.io\/models\/([^<]+)\.html<\/loc>/g)]
        .map((m) => m[1] + '.html');
    const missing = locs.filter((f) => !onDisk.includes(f));
    assert.deepStrictEqual(missing, [],
        `sitemap URLs missing on disk: ${missing.join(', ')}`);

    // And the sitemap must cover every pre-rendered page.
    const unlinked = onDisk.filter((f) => !locs.includes(f));
    assert.deepStrictEqual(unlinked, [],
        `pages not in sitemap: ${unlinked.join(', ')}`);
});
