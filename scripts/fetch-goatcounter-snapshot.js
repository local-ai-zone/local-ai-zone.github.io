#!/usr/bin/env node
/**
 * Copy the public GoatCounter visitor counts into a file the site serves itself.
 *
 * Why this exists
 *   The header views badge (js/goatcounter.js) and the live cards on traffic.html
 *   (js/traffic-live.js) read their numbers from
 *   https://<code>.goatcounter.com/counter/... . That request is third-party, so a
 *   content blocker, a DNS filter, or an offline reader kills it and the page shows
 *   no count at all. This script writes the same numbers to
 *   data/goatcounter-snapshot.json, which is served from the site's own origin and
 *   is used only when the live counters cannot be read.
 *
 * Sources (public, no credentials)
 *   GET https://<code>.goatcounter.com/counter/TOTAL.json
 *   GET https://<code>.goatcounter.com/counter/TOTAL.json?start=<day>&end=<day>
 *   GET https://<code>.goatcounter.com/counter/<url-encoded path>.json   (per page)
 *
 * Configuration
 *   The site code is read from js/goatcounter.js (GOATCOUNTER_CODE), so it stays
 *   configured in exactly one place.
 *
 * CLI flags
 *   --out <path>      Output path (default data/goatcounter-snapshot.json)
 *   --paths <a,b,c>   Page paths to snapshot too (default: the hub pages that exist)
 *   --code <code>     Override the parsed site code (for testing)
 *   --allow-partial   Exit 0 when a per-page count could not be read
 *
 * Design notes
 *   - GoatCounter caches counter responses for up to four hours and answers 404 for
 *     a path whose cache entry has gone cold, so `generatedAt` is the honest "as of"
 *     stamp rather than a live figure.
 *   - The site total is mandatory: without it the file is not written at all, so a
 *     failed fetch leaves the previous snapshot in place. It is written atomically
 *     so a reader never sees a half-written file.
 *   - A per-page count that cannot be read keeps the previous snapshot's value (the
 *     same rule scripts/fetch-traffic-data.js uses for its sections), because a
 *     flapping 404 would otherwise strip a count the page could still show.
 *   - Counts stay strings exactly as GoatCounter formats them ("1,234"), because
 *     the page inserts them as text.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT, 'js', 'goatcounter.js');
const DEFAULT_OUT = path.join(ROOT, 'data', 'goatcounter-snapshot.json');
// The hub pages a visitor is most likely to land on, so the fallback can name a
// per-page count on them too. Missing files are skipped, and the list also picks up any
// top-level section page the site grows later.
const HUB_PATHS = ['/', '/blog.html', '/models.html', '/guides.html', '/brands.html', '/cpu.html', '/about.html', '/traffic.html'];
const SNAPSHOT_VERSION = 1;

const pad = (n) => (n < 10 ? '0' + n : String(n));
const localDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** Local time with its offset spelled out, so the page never has to guess a zone. */
function isoLocal(d) {
    const offset = -d.getTimezoneOffset();
    const abs = Math.abs(offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
        (offset < 0 ? '-' : '+') + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
}

/* '/' always exists; the rest only when the file is really there, so a renamed
 * section page cannot put a phantom key in the snapshot. */
function defaultPaths() {
    const paths = HUB_PATHS.filter((p) => p === '/' || fs.existsSync(path.join(ROOT, p.slice(1))));
    // Section landing pages live at <section>/index.html on disk but are visited as
    // /<section>/ — keep the visitor-facing form.
    for (const dir of ['models', 'guides', 'brands', 'cpu']) {
        if (fs.existsSync(path.join(ROOT, dir, 'index.html'))) paths.push('/' + dir + '/');
    }
    return paths;
}

/* Accepts both `--out <path>` and `--out=<path>`, matching the other scripts in
 * scripts/ (which are called as --kind=hero, --only=<substr>, …). */
function parseArgs(argv) {
    const args = { out: DEFAULT_OUT, paths: null, code: null, allowPartial: false };
    for (let i = 0; i < argv.length; i++) {
        let flag = argv[i];
        let value = null;
        const eq = flag.indexOf('=');
        if (eq > -1) {
            value = flag.slice(eq + 1);
            flag = flag.slice(0, eq);
        }
        const next = () => (value !== null ? value : argv[++i]);
        if (flag === '--out') args.out = path.resolve(next());
        else if (flag === '--paths') args.paths = String(next()).split(',').map((s) => s.trim()).filter(Boolean);
        else if (flag === '--code') args.code = next();
        else if (flag === '--allow-partial') args.allowPartial = true;
        else if (flag === '--help' || flag === '-h') {
            console.log('usage: node scripts/fetch-goatcounter-snapshot.js [--out <path>] [--paths <a,b>] [--code <code>] [--allow-partial]');
            process.exit(0);
        } else {
            console.error('Unknown flag: ' + flag);
            process.exit(2);
        }
    }
    return args;
}

/** The code lives in js/goatcounter.js so there is only one place to change it. */
function siteCode() {
    const source = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = /GOATCOUNTER_CODE\s*=\s*'([^']*)'/.exec(source);
    if (!match) throw new Error('GOATCOUNTER_CODE not found in ' + path.relative(ROOT, CONFIG_FILE));
    return match[1];
}

/**
 * Read one counter. Returns the count as GoatCounter formats it, or null when the
 * service simply has no data for that path (404). Anything else throws.
 */
async function readCounter(base, counterPath, query) {
    const url = base + '/counter/' + counterPath + '.json' + (query || '');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
    const data = await response.json();
    return typeof data.count === 'string' ? data.count : null;
}

/* The previous snapshot, so a count that cannot be read right now keeps its last
 * known value instead of vanishing. A missing or unreadable file is simply no history. */
function previousSnapshot(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        return null;
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.paths) args.paths = defaultPaths();
    const code = args.code || siteCode();
    if (!code) throw new Error('site code is empty — tracking is disabled in js/goatcounter.js');
    const base = 'https://' + code + '.goatcounter.com';

    const now = new Date();
    const today = localDay(now);

    const total = await readCounter(base, 'TOTAL');
    if (!total) throw new Error('no site total from ' + base + ' — refusing to overwrite the snapshot');

    const snapshot = {
        version: SNAPSHOT_VERSION,
        code: code,
        source: base,
        generatedAt: isoLocal(now),
        total: total,
        todayDate: today,
    };

    // Today's views are optional: GoatCounter has nothing to report before the day's
    // first visit, and a missing figure must not hide the site total.
    try {
        snapshot.today = await readCounter(base, 'TOTAL', '?start=' + today + '&end=' + today);
        if (snapshot.today === null) delete snapshot.today;
    } catch (error) {
        if (!args.allowPartial) throw error;
        console.warn('! today\'s count unavailable: ' + error.message);
        delete snapshot.today;
    }

    const previous = previousSnapshot(args.out) || {};
    const previousPaths = previous.paths || {};
    const paths = {};
    for (const pagePath of args.paths) {
        let count = null;
        try {
            count = await readCounter(base, encodeURIComponent(pagePath));
        } catch (error) {
            if (!args.allowPartial) throw error;
            console.warn('! count for ' + pagePath + ' unavailable: ' + error.message);
        }
        if (count) {
            paths[pagePath] = count;
        } else if (previousPaths[pagePath]) {
            // 404 for a cold cache entry is normal; keep the last known value.
            paths[pagePath] = previousPaths[pagePath];
            console.warn('~ ' + pagePath + ' unreadable right now, keeping ' + previousPaths[pagePath]);
        }
    }
    if (Object.keys(paths).length) snapshot.paths = paths;

    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    const tmp = args.out + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2) + '\n');
    fs.renameSync(tmp, args.out);

    console.log('snapshot written to ' + path.relative(ROOT, args.out));
    console.log('  total ' + snapshot.total + ' · today ' + (snapshot.today || 'n/a') +
        ' (' + today + ') · generated ' + snapshot.generatedAt);
    for (const [p, c] of Object.entries(paths)) console.log('  ' + p + ' → ' + c);
}

main().catch((error) => {
    console.error('FAILED: ' + error.message);
    process.exit(1);
});
