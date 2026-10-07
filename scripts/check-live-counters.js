#!/usr/bin/env node
/**
 * Smoke check: are the site's pageview counters actually working?
 *
 * Why this exists
 *   The views badge (js/goatcounter.js) and the live cards on traffic.html
 *   (js/traffic-live.js) fail silently by design: if a counter cannot be read the
 *   badge simply does not mount, and since the same-origin fallback landed it can
 *   instead mount from a stale snapshot. Either way the site looks completely
 *   healthy, so a broken counter can go unnoticed for months. This script is the
 *   thing that notices.
 *
 * What it checks, cheapest first
 *   1. Snapshot   data/goatcounter-snapshot.json exists, parses and is not stale —
 *                 the fallback copy has exactly one failure mode (nobody refreshed
 *                 it) and nothing else on the site reveals it.
 *   2. Site code  js/goatcounter.js still carries a GOATCOUNTER_CODE.
 *   3. Counter API  the public counter endpoint answers for the site total, and
 *                 does so with the CORS header a browser needs to read it. A
 *                 missing header or a 400/403 is the classic "visitor counts got
 *                 switched off in the GoatCounter settings" silent failure.
 *   4. count.js   gc.zgo.at/count.js answers, because that is what records visits.
 *   5. Browser    loads real pages on the deployed site in headless Chrome and
 *                 asserts the badge really mounts with a number, in two passes:
 *                   live     the badge came from the live counters (green dot);
 *                   blocked  with the counter host unreachable, the badge still
 *                            paints a number from the snapshot (this is the
 *                            regression guard for the fallback).
 *
 * CLI flags (both `--flag value` and `--flag=value`)
 *   --base <url>              Site to test (default https://local-ai-zone.github.io)
 *   --pages <a,b>             Page paths to load in the browser (default /,/traffic.html)
 *   --snapshot <path>         Snapshot file to validate
 *   --max-snapshot-hours <n>  Snapshot older than this fails (default 26)
 *   --timeout <ms>            Per-request / per-page timeout (default 20000)
 *   --attempts <n>            Reloads before declaring the live badge broken (default 2)
 *   --no-browser              Skip step 5 (works without Chromium installed)
 *   --no-fallback             Skip the blocked-host pass inside step 5
 *   --help
 *
 * Exit codes
 *   0  the counters work (warnings — a count of 0, a page with no visits recorded yet —
 *      are reported without failing the run)
 *   1  a counter is genuinely broken for visitors; this is the case worth an issue
 *   2  the check could not run at all (no Chromium, site unreachable) — a red run that
 *      must not be reported as a counter outage
 *
 * The site code lives in js/goatcounter.js and nowhere else, so this script reads it
 * from there rather than taking a copy that could drift.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(ROOT, 'js', 'goatcounter.js');
const DEFAULT_SNAPSHOT = path.join(ROOT, 'data', 'goatcounter-snapshot.json');
const DEFAULT_BASE = 'https://local-ai-zone.github.io';
const DEFAULT_PAGES = ['/', '/traffic.html'];
const COUNT_SCRIPT_URL = 'https://gc.zgo.at/count.js';
const SNAPSHOT_WARN_HOURS = 9; // the refresh workflow runs every 6 hours
const SNAPSHOT_FAIL_HOURS = 26; // a whole day without a refresh means it is broken
const BLOCKED_HOSTS = ['goatcounter.com', 'gc.zgo.at'];

const results = [];

/*
 * Three outcomes, because conflating them produces false alarms:
 *   fail    a counter really is broken for visitors  -> exit 1, worth an issue
 *   blocked the check could not run at all (no browser, site unreachable)
 *                                                   -> exit 2, a red run but NOT a
 *                                                      claim that counters are down
 *   warn    worth knowing, not broken (a count of 0, a page with no visits yet)
 */
function report(level, check, message) {
    results.push({ level, check, message });
    const label = level === 'pass' ? 'PASS' : level === 'warn' ? 'WARN' : level === 'blocked' ? 'BLOCKED' : 'FAIL';
    console.log(label + '  ' + check + ' — ' + message);
    if (process.env.GITHUB_ACTIONS) {
        if (level === 'fail') console.log('::error title=' + check + '::' + message);
        else if (level === 'blocked') console.log('::warning title=' + check + '::' + message);
    }
}

const pass = (check, message) => report('pass', check, message);
const warn = (check, message) => report('warn', check, message);
const fail = (check, message) => report('fail', check, message);
const blocked = (check, message) => report('blocked', check, message);

/* ── helpers ───────────────────────────────────────────────────────────── */

function parseArgs(argv) {
    const args = {
        base: DEFAULT_BASE,
        pages: DEFAULT_PAGES.slice(),
        snapshot: DEFAULT_SNAPSHOT,
        maxSnapshotHours: SNAPSHOT_FAIL_HOURS,
        timeout: 20000,
        attempts: 2,
        browser: true,
        fallback: true,
    };
    for (let i = 0; i < argv.length; i++) {
        let flag = argv[i];
        let value = null;
        const eq = flag.indexOf('=');
        if (eq > -1) {
            value = flag.slice(eq + 1);
            flag = flag.slice(0, eq);
        }
        const next = () => {
            if (value !== null) return value;
            if (i + 1 >= argv.length) throw new Error('missing value for ' + flag);
            return argv[++i];
        };
        if (flag === '--base') args.base = next().replace(/\/+$/, '');
        // Page paths are URLs, but a shell on Windows happily rewrites a leading slash
        // into a drive path; normalising here keeps `--pages traffic.html` working.
        else if (flag === '--pages') args.pages = next().split(',').map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith('/') ? s : '/' + s));
        else if (flag === '--snapshot') args.snapshot = path.resolve(next());
        else if (flag === '--max-snapshot-hours') args.maxSnapshotHours = Number(next());
        else if (flag === '--timeout') args.timeout = Number(next());
        else if (flag === '--attempts') args.attempts = Math.max(1, Number(next()));
        else if (flag === '--no-browser') args.browser = false;
        else if (flag === '--no-fallback') args.fallback = false;
        else if (flag === '--help' || flag === '-h') {
            console.log('usage: node scripts/check-live-counters.js [--base <url>] [--pages <a,b>] [--snapshot <path>] [--max-snapshot-hours <n>] [--timeout <ms>] [--attempts <n>] [--no-browser] [--no-fallback]');
            process.exit(0);
        } else {
            throw new Error('unknown flag: ' + flag);
        }
    }
    return args;
}

async function fetchWithTimeout(url, timeout) {
    return fetch(url, {
        headers: { Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
    });
}

/* ── 1. the fallback snapshot ──────────────────────────────────────────── */

function checkSnapshot(args) {
    const check = 'snapshot';
    let raw;
    try {
        raw = fs.readFileSync(args.snapshot, 'utf8');
    } catch (error) {
        fail(check, path.relative(ROOT, args.snapshot) + ' is missing or unreadable (' + error.message + ')');
        return;
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (error) {
        fail(check, path.relative(ROOT, args.snapshot) + ' is not valid JSON (' + error.message + ')');
        return;
    }

    if (typeof data.total !== 'string' || !data.total) {
        fail(check, 'snapshot has no site total — the badge has nothing to fall back on');
        return;
    }

    const generated = new Date(data.generatedAt);
    if (isNaN(generated.getTime())) {
        fail(check, 'snapshot generatedAt is not a date (' + JSON.stringify(data.generatedAt) + ')');
        return;
    }

    const ageHours = (Date.now() - generated.getTime()) / 3600000;
    const age = ageHours.toFixed(1) + 'h';
    if (ageHours > args.maxSnapshotHours) {
        fail(check, 'snapshot is ' + age + ' old (limit ' + args.maxSnapshotHours +
            'h) — update-goatcounter.yml has stopped refreshing it');
    } else if (ageHours > SNAPSHOT_WARN_HOURS) {
        warn(check, 'snapshot is ' + age + ' old (refreshed every 6h) — total ' + data.total);
    } else {
        pass(check, 'total ' + data.total + ', refreshed ' + age + ' ago');
    }
}

/* ── 2. the site code ──────────────────────────────────────────────────── */

function siteCode() {
    const source = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = /GOATCOUNTER_CODE\s*=\s*'([^']*)'/.exec(source);
    if (!match) throw new Error('GOATCOUNTER_CODE not found in ' + path.relative(ROOT, CONFIG_FILE));
    return match[1];
}

/* ── 3. the counter API ────────────────────────────────────────────────── */

function counterDiagnosis(status, cors) {
    if (!cors && status !== 200) {
        return 'the browser cannot read the status either (no Access-Control-Allow-Origin), which is what a ' +
            'wrong site code or disabled visitor counts looks like';
    }
    if (status === 400 || status === 403) {
        return 'GoatCounter rejected the request — most likely "Allow adding visitor counts on your website" ' +
            'is switched off in the site settings, or GOATCOUNTER_CODE is wrong';
    }
    if (status === 404) return 'no counts recorded for that path yet';
    return 'unexpected HTTP ' + status;
}

async function checkCounterApi(args, code) {
    const base = 'https://' + code + '.goatcounter.com';
    const check = 'counter API';

    // The site total is the one number every page shows, so it must answer.
    let response;
    try {
        response = await fetchWithTimeout(base + '/counter/TOTAL.json', args.timeout);
    } catch (error) {
        fail(check, base + ' is unreachable from here (' + error.message + ')');
        return;
    }

    const cors = !!response.headers.get('access-control-allow-origin');
    if (response.status !== 200) {
        fail(check, 'TOTAL read as HTTP ' + response.status + ' — ' + counterDiagnosis(response.status, cors));
        return;
    }
    if (!cors) {
        fail(check, 'TOTAL answered 200 but without Access-Control-Allow-Origin, so no browser can read it — ' +
            'the badge will silently show nothing on every page');
        return;
    }

    let total = null;
    try {
        const data = await response.json();
        total = typeof data.count === 'string' ? data.count : null;
    } catch (error) {
        fail(check, 'TOTAL returned unreadable JSON (' + error.message + ')');
        return;
    }
    if (!total) {
        fail(check, 'TOTAL answered but carries no count field');
        return;
    }
    pass(check, 'site total readable in a browser: ' + total);

    // Today's count can legitimately be missing on a quiet day, so it only warns.
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    try {
        const todayResponse = await fetchWithTimeout(
            base + '/counter/TOTAL.json?start=' + today + '&end=' + today, args.timeout);
        if (todayResponse.status === 200) {
            const data = await todayResponse.json();
            pass('today counter', 'reads ' + data.count + ' for ' + today);
        } else {
            warn('today counter', 'HTTP ' + todayResponse.status + ' for ' + today + ' — ' +
                counterDiagnosis(todayResponse.status, !!todayResponse.headers.get('access-control-allow-origin')));
        }
    } catch (error) {
        warn('today counter', 'could not read today\'s count (' + error.message + ')');
    }

    // Each checked page gets its own read, so the traffic page's per-page card is covered.
    for (const pagePath of args.pages) {
        try {
            const pageResponse = await fetchWithTimeout(
                base + '/counter/' + encodeURIComponent(pagePath) + '.json', args.timeout);
            if (pageResponse.status === 200) {
                const data = await pageResponse.json();
                pass('page counter ' + pagePath, 'reads ' + data.count);
            } else {
                warn('page counter ' + pagePath, 'HTTP ' + pageResponse.status + ' — ' +
                    counterDiagnosis(pageResponse.status, !!pageResponse.headers.get('access-control-allow-origin')));
            }
        } catch (error) {
            warn('page counter ' + pagePath, 'could not read (' + error.message + ')');
        }
    }
}

/* ── 4. the script that records visits ─────────────────────────────────── */

async function checkCountScript(args) {
    try {
        const response = await fetchWithTimeout(COUNT_SCRIPT_URL, args.timeout);
        if (response.status === 200) pass('count.js', COUNT_SCRIPT_URL + ' is served');
        else fail('count.js', COUNT_SCRIPT_URL + ' answered HTTP ' + response.status + ' — visits are not being recorded');
    } catch (error) {
        fail('count.js', COUNT_SCRIPT_URL + ' is unreachable (' + error.message + ') — visits are not being recorded');
    }
}

/* ── 5. the badge, in a real browser ───────────────────────────────────── */

function isBlockedHost(url) {
    return BLOCKED_HOSTS.some((host) => url.indexOf(host) > -1);
}

/*
 * Always returns a report, never null: when the badge is missing the caller still needs
 * to know *why* (script absent, tracking disabled, or counters simply unreadable), because
 * those are different failures with different fixes.
 */
async function readBadge(page, timeout) {
    try {
        await page.waitForSelector('#gc-views-badge', { timeout });
    } catch (error) {
        // Timed out: the badge never mounted, which is itself the finding.
    }
    return page.evaluate(() => {
        const badge = document.getElementById('gc-views-badge');
        const dot = badge && badge.querySelector('.gc-views-dot');
        const config = window.LocalAIZoneGoatCounter;
        return {
            mounted: !!badge,
            text: badge ? badge.textContent.trim() : null,
            cached: !!(dot && /gc-views-dot-cached/.test(dot.className)),
            visible: badge ? badge.getBoundingClientRect().width > 0 : false,
            hasConfig: !!config,
            enabled: !!(config && config.enabled),
            snapshotUrl: config ? config.snapshotUrl : null,
            scriptTag: !!document.querySelector('script[src*="goatcounter.js"]'),
        };
    });
}

/* Why a page shows no count at all — the difference between "the script never ran" and
 * "it ran and every counter failed" is the difference between a deployment problem and
 * a service problem, so the message has to say which. */
function missingBadgeDiagnosis(report, url) {
    if (!report.hasConfig) {
        return 'the badge never mounted and js/goatcounter.js never ran on ' + url +
            ' — the page still includes it? (' + report.scriptTag + ') A blocked or renamed script does this';
    }
    if (!report.enabled) {
        return 'the badge never mounted because tracking is switched off: GOATCOUNTER_CODE is empty';
    }
    return 'the badge never mounted even though js/goatcounter.js ran — no counter answered and the snapshot ' +
        'could not be read (snapshotUrl ' + (report.snapshotUrl || 'unset') + '), so a visitor sees no count at all';
}

async function checkBrowser(args) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (error) {
        blocked('browser', 'puppeteer is not installed (' + error.message + ') — install it or use --no-browser. ' +
            'This says nothing about the site: the HTTP checks above still stand');
        return;
    }

    const launchArgs = process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : [];
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: launchArgs });
    } catch (error) {
        blocked('browser', 'could not start headless Chrome (' + error.message + ')');
        return;
    }

    try {
        for (const pagePath of args.pages) {
            const url = args.base + pagePath;
            const page = await browser.newPage();
            // The blocked pass must really hit the network, or a cached counter
            // response would make a blocked read look like a live one.
            await page.setCacheEnabled(false);

            let snapshotStatus = null;
            page.on('response', (response) => {
                if (response.url().indexOf('goatcounter-snapshot.json') > -1) snapshotStatus = response.status();
            });

            // ── pass 1: the live counters, as a normal visitor gets them ──
            let live = null;
            let loadError = null;
            for (let attempt = 1; attempt <= args.attempts; attempt++) {
                try {
                    snapshotStatus = null;
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.timeout });
                    live = await readBadge(page, args.timeout);
                    loadError = null;
                } catch (error) {
                    live = null;
                    loadError = error;
                    continue;
                }
                if (live.mounted) break;
            }

            if (!live) {
                // The page itself never loaded, so nothing can be judged about its counters —
                // including the fallback pass, which would only be measuring the same failure.
                blocked('live badge ' + pagePath, 'could not load ' + url + ' (' + loadError.message + ')');
                await page.close();
                continue;
            }
            if (!live.mounted) {
                fail('live badge ' + pagePath, missingBadgeDiagnosis(live, url));
            } else if (!live.scriptTag) {
                fail('live badge ' + pagePath, 'the page no longer includes js/goatcounter.js');
            } else if (!live.enabled) {
                fail('live badge ' + pagePath, 'js/goatcounter.js is loaded but tracking is disabled (GOATCOUNTER_CODE is empty)');
            } else if (!/\d/.test(live.text || '')) {
                fail('live badge ' + pagePath, 'the badge mounted without a number: ' + JSON.stringify(live.text));
            } else if (live.cached) {
                fail('live badge ' + pagePath, 'the badge shows ' + JSON.stringify(live.text) + ' from the published snapshot, ' +
                    'not the live counters — the live reads are failing for real visitors and nothing else would show it');
            } else if (!live.visible) {
                fail('live badge ' + pagePath, 'the badge mounted but has no visible size');
            } else {
                pass('live badge ' + pagePath, 'live counters rendered ' + JSON.stringify(live.text));
            }

            // ── pass 2: same page with the counter host unreachable ──
            if (!args.fallback) {
                await page.close();
                continue;
            }

            try {
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    if (isBlockedHost(request.url())) request.abort('failed');
                    else request.continue();
                });
                snapshotStatus = null;
                await page.reload({ waitUntil: 'domcontentloaded', timeout: args.timeout });
                const blocked = await readBadge(page, args.timeout);

                if (!blocked.mounted) {
                    fail('fallback badge ' + pagePath, 'with the counter host unreachable the badge disappeared on ' + url +
                        ' (' + missingBadgeDiagnosis(blocked, url) + ') — nothing else on the page would show this');
                } else if (!/\d/.test(blocked.text || '')) {
                    fail('fallback badge ' + pagePath, 'fell back without a number: ' + JSON.stringify(blocked.text));
                } else if (snapshotStatus !== 200) {
                    fail('fallback badge ' + pagePath, 'showed ' + JSON.stringify(blocked.text) + ' but the snapshot read as ' +
                        (snapshotStatus === null ? 'never requested' : 'HTTP ' + snapshotStatus) +
                        ' from ' + blocked.snapshotUrl);
                } else if (!blocked.cached) {
                    warn('fallback badge ' + pagePath, 'showed ' + JSON.stringify(blocked.text) +
                        ' from the browser cache rather than the snapshot');
                } else {
                    pass('fallback badge ' + pagePath, 'snapshot kept a number on the page: ' + JSON.stringify(blocked.text));
                }
            } catch (error) {
                fail('fallback badge ' + pagePath, 'could not run the blocked pass (' + error.message + ')');
            }

            await page.close();
        }
    } finally {
        await browser.close();
    }
}

/* ── run ───────────────────────────────────────────────────────────────── */

async function main() {
    const args = parseArgs(process.argv.slice(2));

    let code;
    try {
        code = siteCode();
    } catch (error) {
        fail('site code', error.message);
        code = null;
    }
    if (code !== null) {
        if (code) pass('site code', 'GOATCOUNTER_CODE is "' + code + '"');
        else fail('site code', 'GOATCOUNTER_CODE is empty — tracking is switched off in ' + path.relative(ROOT, CONFIG_FILE));
    }

    checkSnapshot(args);
    if (code) await checkCounterApi(args, code);
    await checkCountScript(args);
    if (args.browser) await checkBrowser(args);

    const failed = results.filter((r) => r.level === 'fail');
    const warned = results.filter((r) => r.level === 'warn');
    const blockedChecks = results.filter((r) => r.level === 'blocked');

    console.log('');
    console.log((failed.length ? 'FAILED' : blockedChecks.length ? 'BLOCKED' : 'OK') + ' — ' +
        results.filter((r) => r.level === 'pass').length + ' passed, ' + warned.length + ' warned, ' +
        failed.length + ' failed, ' + blockedChecks.length + ' could not run (' + args.base + ')');
    if (blockedChecks.length && !failed.length) {
        console.log('The check could not run, so this says nothing about the counters: ' +
            blockedChecks.map((r) => r.check).join(', '));
    }

    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) {
        const lines = ['## Live counter smoke check', '', '| result | check | detail |', '| --- | --- | --- |'];
        for (const r of results) {
            const icon = r.level === 'pass' ? '✅' : r.level === 'warn' ? '⚠️' : r.level === 'blocked' ? '🚧' : '❌';
            lines.push('| ' + icon + ' | `' + r.check + '` | ' + r.message.replace(/\|/g, '\\|') + ' |');
        }
        const verdict = failed.length ? '**Counters are broken for visitors.**'
            : blockedChecks.length ? '**The check could not run — this is not a counter outage.**'
            : '**Counters are working.**';
        lines.push('', verdict, '');
        fs.appendFileSync(summary, lines.join('\n') + '\n');
    }

    // 1 = counters broken (worth an issue), 2 = the check could not run (not an outage).
    process.exitCode = failed.length ? 1 : blockedChecks.length ? 2 : 0;
}

main().catch((error) => {
    console.error('BLOCKED  harness — ' + (error && error.stack ? error.stack : error));
    process.exitCode = 2;
});
