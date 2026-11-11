#!/usr/bin/env node
/**
 * Fetch search traffic data from Google Search Console and Bing Webmaster Tools
 * and write a single JSON snapshot that traffic.html reads at runtime.
 *
 * Sources
 *   Google — Search Console Search Analytics API (service-account auth)
 *     POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 *   Bing — Webmaster API (API key auth)
 *     GET  https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats
 *     GET  https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats
 *
 * Configuration (environment variables):
 *   GSC_SERVICE_ACCOUNT_JSON   Service-account key JSON, as a raw string (GitHub secret)
 *   GSC_SERVICE_ACCOUNT_FILE   ...or a path to the key file (local development)
 *   GSC_SITE_URL               Property, e.g. https://local-ai-zone.github.io/
 *   GSC_SEARCH_TYPES           Comma-separated `type` values, default "web"
 *   BING_API_KEY               Bing Webmaster API key (GitHub secret)
 *   BING_SITE_URL              Verified site, e.g. https://local-ai-zone.github.io/
 *   TRAFFIC_DAYS               Days of history to keep (default 90)
 *   TRAFFIC_OUTPUT             Output path (default data/traffic-snapshot.json)
 *
 * CLI flags:
 *   --out <path>        Override the output path
 *   --days <n>          Override the history window
 *   --fixtures <dir>    Offline mode: read API payloads from local files instead of
 *                       the network, so the pipeline can be tested without credentials
 *   --allow-partial     Exit 0 even when a provider failed (the workflow uses this so a
 *                       Google outage cannot block a Bing-only refresh)
 *
 * Design notes:
 *   - Never writes credentials into the snapshot.
 *   - On a provider failure the previous snapshot's section is preserved rather than
 *     replaced with empty data, and the failure is recorded under `errors`.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GOOGLE_API = 'https://searchconsole.googleapis.com/webmasters/v3';
const BING_API = 'https://ssl.bing.com/webmaster/api.svc/json';
const TOP_QUERY_LIMIT = 10;

/* ── helpers ───────────────────────────────────────────────────────────── */

const todayISO = () => new Date().toISOString().slice(0, 10);

function shiftDays(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function round(value, places) {
    const f = Math.pow(10, places);
    return Math.round(value * f) / f;
}

function base64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Bing returns dates as "/Date(1399014000000-0700)/" — pull out the epoch millis.
 * The leading backslash is optional because the raw response body carries a
 * JSON-escaped "\/Date(...)\/" while JSON.parse yields "/Date(...)/"; accept both.
 */
function parseBingDate(value) {
    const match = /\\?\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(String(value || ''));
    if (!match) return null;
    return new Date(Number(match[1])).toISOString().slice(0, 10);
}

/* ── Google Search Console ─────────────────────────────────────────────── */

function createGoogleJwt(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: GOOGLE_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
    }));
    const signature = crypto
        .createSign('RSA-SHA256')
        .update(`${header}.${claims}`)
        .sign(serviceAccount.private_key, 'base64');
    return `${header}.${claims}.${base64url(Buffer.from(signature, 'base64'))}`;
}

async function getGoogleAccessToken(serviceAccount) {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: createGoogleJwt(serviceAccount),
        }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) {
        throw new Error(`Google token request failed (${response.status}): ${body.error_description || body.error || 'no access_token'}`);
    }
    return body.access_token;
}

function normaliseGoogleRows(rows) {
    return (rows || [])
        .map((row) => ({
            date: Array.isArray(row.keys) ? row.keys[0] : null,
            clicks: Number(row.clicks) || 0,
            impressions: Number(row.impressions) || 0,
            ctr: Number(row.ctr) || 0,
            position: Number(row.position) || 0,
        }))
        .filter((row) => row.date);
}

/** Query the Search Analytics endpoint for a given dimension set. */
async function googleQuery(accessToken, siteUrl, payload) {
    const response = await fetch(
        `${GOOGLE_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body.error && body.error.message) || JSON.stringify(body);
        throw new Error(`Search Console query failed (${response.status}): ${message}`);
    }
    return body;
}

async function fetchGoogle({ serviceAccount, siteUrl, startDate, endDate, searchTypes }) {
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const engines = {};

    for (const type of searchTypes) {
        const base = { startDate, endDate, type, dataState: 'final', rowLimit: 25000 };

        const daily = await googleQuery(accessToken, siteUrl, { ...base, dimensions: ['date'] });
        const totals = await googleQuery(accessToken, siteUrl, base);
        const queries = await googleQuery(accessToken, siteUrl, { ...base, dimensions: ['query'] });

        const dailyRows = normaliseGoogleRows(daily.rows);
        const aggregate = (totals.rows || [])[0] || {};
        const clicks = Number(aggregate.clicks) || dailyRows.reduce((n, r) => n + r.clicks, 0);
        const impressions = Number(aggregate.impressions) || dailyRows.reduce((n, r) => n + r.impressions, 0);

        engines[type] = {
            siteUrl,
            clicks,
            impressions,
            ctr: impressions ? round(clicks / impressions, 4) : 0,
            position: Number(aggregate.position) || 0,
            daily: dailyRows,
            topQueries: (queries.rows || [])
                .map((row) => ({
                    query: row.keys[0],
                    clicks: Number(row.clicks) || 0,
                    impressions: Number(row.impressions) || 0,
                    position: round(Number(row.position) || 0, 1),
                }))
                .filter((row) => row.query)
                .slice(0, TOP_QUERY_LIMIT),
        };
    }

    return engines;
}

/* ── Bing Webmaster Tools ──────────────────────────────────────────────── */

async function bingGet(method, params) {
    const url = `${BING_API}/${method}?${new URLSearchParams(params)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Bing ${method} failed (${response.status}): ${body.Message || body.message || url}`);
    }
    // Bing reports application-level errors inside a 200 response.
    if (body.ErrorCode != null && body.ErrorCode !== 0) {
        throw new Error(`Bing ${method} error ${body.ErrorCode}: ${body.Message || 'unknown'}`);
    }
    return body.d || [];
}

async function fetchBing({ apiKey, siteUrl, startDate, endDate }) {
    const getRows = (method) => bingGet(method, { siteUrl, apikey: apiKey });
    return aggregateBing(getRows, { startDate, endDate, siteUrl });
}

/* ── snapshot assembly ─────────────────────────────────────────────────── */

/** Search Console results are keyed by search type; expose "web" as the headline. */
function pickEngine(engines, primary) {
    if (!engines) return null;
    return engines[primary] || engines[Object.keys(engines)[0]] || null;
}

function buildSnapshot({ google, bing, previous, errors, range, now, primaryType }) {
    const pick = (fresh, section) => {
        if (fresh) return fresh;
        // Keep the last good section so one provider's outage cannot blank the page.
        return (previous && previous[section]) || null;
    };

    return {
        generatedAt: now || new Date().toISOString(),
        range,
        google: google ? pickEngine(google, primaryType) : pick(null, 'google'),
        bing: pick(bing, 'bing'),
        googleByType: google || (previous && previous.googleByType) || null,
        errors: errors && errors.length ? errors : undefined,
    };
}

/* ── fixtures (offline testing) ────────────────────────────────────────── */

function readFixture(dir, name, fallback) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fixturesToGoogle(dir, range) {
    const engines = {};
    const types = ['web'];
    for (const type of types) {
        const totals = readFixture(dir, `gsc-${type}-totals.json`, { rows: [] });
        const daily = readFixture(dir, `gsc-${type}-daily.json`, { rows: [] });
        const queries = readFixture(dir, `gsc-${type}-queries.json`, { rows: [] });
        const dailyRows = normaliseGoogleRows(daily.rows);
        const aggregate = (totals.rows || [])[0] || {};
        const clicks = Number(aggregate.clicks) || dailyRows.reduce((n, r) => n + r.clicks, 0);
        const impressions = Number(aggregate.impressions) || dailyRows.reduce((n, r) => n + r.impressions, 0);
        engines[type] = {
            siteUrl: range.siteUrl,
            clicks,
            impressions,
            ctr: impressions ? round(clicks / impressions, 4) : 0,
            position: Number(aggregate.position) || 0,
            daily: dailyRows,
            topQueries: (queries.rows || []).map((row) => ({
                query: row.keys[0],
                clicks: Number(row.clicks) || 0,
                impressions: Number(row.impressions) || 0,
                position: round(Number(row.position) || 0, 1),
            })).slice(0, TOP_QUERY_LIMIT),
        };
    }
    return engines;
}

async function fixturesToBing(dir, range) {
    const trafficRows = readFixture(dir, 'bing-traffic.json', { d: [] }).d || [];
    const queryRows = readFixture(dir, 'bing-queries.json', { d: [] }).d || [];
    const fixtureRows = {
        GetRankAndTrafficStats: trafficRows,
        GetQueryStats: queryRows,
    };
    return aggregateBing((method) => fixtureRows[method] || [], range);
}

/** Shared Bing aggregation so fixtures and live calls take the same code path. */
async function aggregateBing(getRows, { startDate, endDate, siteUrl }) {
    const [trafficRows, queryRows] = await Promise.all([
        getRows('GetRankAndTrafficStats'),
        getRows('GetQueryStats'),
    ]);
    const inRange = (date) => date && date >= startDate && date <= endDate;

    const daily = trafficRows
        .map((row) => ({
            date: parseBingDate(row.Date),
            clicks: Number(row.Clicks) || 0,
            impressions: Number(row.Impressions) || 0,
        }))
        .filter((row) => inRange(row.date))
        .sort((a, b) => a.date.localeCompare(b.date));

    const byQuery = new Map();
    for (const row of queryRows) {
        const date = parseBingDate(row.Date);
        if (!inRange(date) || !row.Query) continue;
        const entry = byQuery.get(row.Query) || { query: row.Query, clicks: 0, impressions: 0, positions: [] };
        entry.clicks += Number(row.Clicks) || 0;
        entry.impressions += Number(row.Impressions) || 0;
        if (row.AvgImpressionPosition) entry.positions.push(Number(row.AvgImpressionPosition));
        byQuery.set(row.Query, entry);
    }

    const topQueries = [...byQuery.values()]
        .map((entry) => ({
            query: entry.query,
            clicks: entry.clicks,
            impressions: entry.impressions,
            position: entry.positions.length
                ? round(entry.positions.reduce((a, b) => a + b, 0) / entry.positions.length, 1)
                : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, TOP_QUERY_LIMIT);

    const clicks = daily.reduce((n, r) => n + r.clicks, 0);
    const impressions = daily.reduce((n, r) => n + r.impressions, 0);

    return {
        siteUrl,
        clicks,
        impressions,
        ctr: impressions ? round(clicks / impressions, 4) : 0,
        position: null,
        daily,
        topQueries,
    };
}

/* ── CLI ───────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
    const args = { flags: {} };
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === '--out') args.flags.out = argv[++i];
        else if (token === '--days') args.flags.days = Number(argv[++i]);
        else if (token === '--fixtures') args.flags.fixtures = argv[++i];
        else if (token === '--allow-partial') args.flags.allowPartial = true;
    }
    return args;
}

function loadServiceAccount() {
    if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
    }
    if (process.env.GSC_SERVICE_ACCOUNT_FILE) {
        return JSON.parse(fs.readFileSync(process.env.GSC_SERVICE_ACCOUNT_FILE, 'utf8'));
    }
    return null;
}

async function main() {
    const { flags } = parseArgs(process.argv.slice(2));

    const siteUrl = process.env.BING_SITE_URL || process.env.GSC_SITE_URL
        || 'https://local-ai-zone.github.io/';
    const days = flags.days || Number(process.env.TRAFFIC_DAYS) || 90;
    const outPath = flags.out || process.env.TRAFFIC_OUTPUT || path.join('data', 'traffic-snapshot.json');
    const fixtures = flags.fixtures;

    // Search Console data lags a couple of days; stopping early avoids a partial
    // final day dragging the numbers down.
    const endDate = shiftDays(todayISO(), -2);
    const startDate = shiftDays(endDate, -(days - 1));
    const range = { startDate, endDate, days, siteUrl };

    const previous = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : null;
    const errors = [];
    let google = null;
    let bing = null;

    const searchTypes = (process.env.GSC_SEARCH_TYPES || 'web')
        .split(',').map((s) => s.trim()).filter(Boolean);

    if (fixtures) {
        google = fixturesToGoogle(fixtures, range);
        bing = await fixturesToBing(fixtures, range);
    } else {
        const serviceAccount = loadServiceAccount();
        if (serviceAccount) {
            try {
                google = await fetchGoogle({
                    serviceAccount,
                    siteUrl: process.env.GSC_SITE_URL || siteUrl,
                    startDate,
                    endDate,
                    searchTypes,
                });
                console.log(`✅ Google: ${Object.keys(google).join(', ')}`);
            } catch (error) {
                errors.push('google: ' + error.message);
                console.error('⚠️  Google fetch failed: ' + error.message);
            }
        } else {
            errors.push('google: no service account configured (GSC_SERVICE_ACCOUNT_JSON/FILE)');
            console.warn('⚠️  Skipping Google — no service account configured.');
        }

        if (process.env.BING_API_KEY) {
            try {
                bing = await fetchBing({
                    apiKey: process.env.BING_API_KEY,
                    siteUrl: process.env.BING_SITE_URL || siteUrl,
                    startDate,
                    endDate,
                });
                console.log('✅ Bing: traffic + queries');
            } catch (error) {
                errors.push('bing: ' + error.message);
                console.error('⚠️  Bing fetch failed: ' + error.message);
            }
        } else {
            errors.push('bing: no BING_API_KEY configured');
            console.warn('⚠️  Skipping Bing — no BING_API_KEY configured.');
        }
    }

    const snapshot = buildSnapshot({
        google, bing, previous, errors, range, primaryType: searchTypes[0] || 'web',
    });

    if (!snapshot.google && !snapshot.bing) {
        // Nothing can be published. Name the providers that were actually *configured*
        // and why each failed, so the workflow log says what to fix rather than only
        // that something broke.
        const configured = [];
        if (process.env.GSC_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_FILE) {
            configured.push('Google Search Console');
        }
        if (process.env.BING_API_KEY) configured.push('Bing Webmaster Tools');

        if (!configured.length) {
            console.error('❌ No traffic provider is configured, so there is nothing to publish. '
                + 'Add the GSC_SERVICE_ACCOUNT_JSON and/or BING_API_KEY repository secret '
                + '(see the header of .github/workflows/update-traffic.yml), then re-run the workflow.');
        } else {
            console.error(`❌ ${configured.join(' + ')} returned no data and no previous snapshot exists to keep: ${errors.join('; ')}`);
        }
        process.exit(1);
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`📄 Wrote ${outPath} (${range.startDate} → ${range.endDate})`);

    if (errors.length && !flags.allowPartial) {
        console.error(`❌ ${errors.length} provider error(s): ${errors.join('; ')}`);
        process.exit(1);
    }
}

module.exports = {
    createGoogleJwt,
    getGoogleAccessToken,
    fetchGoogle,
    normaliseGoogleRows,
    bingGet,
    fetchBing,
    parseBingDate,
    aggregateBing,
    buildSnapshot,
    fixturesToGoogle,
    pickEngine,
};

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Fatal: ' + error.message);
        process.exit(1);
    });
}
