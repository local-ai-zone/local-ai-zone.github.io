/**
 * Site-wide GoatCounter tracking for Local AI Zone.
 *
 * GoatCounter is a privacy-friendly, cookie-free analytics service. This file
 * is the ONE place the site code is configured: every page loads it, and
 * js/traffic-live.js reads the same config to show the counters on traffic.html.
 *
 * It also injects the small views badge into the header of every page — by
 * default "● 486,071 Total Views", i.e. the all-time site total only
 * (HEADER_VIEWS_MODE picks whether today's count appears beside it). The
 * badge only appears once at least one counter endpoint answers, so pages stay
 * clean if the code is wrong or visitor counts are not shared yet.
 *
 * Setup (one time):
 *   1. GOATCOUNTER_CODE below must be the part before ".goatcounter.com"
 *      (already set to 'hussainnazary' for https://hussainnazary.goatcounter.com).
 *   2. In the GoatCounter site settings, enable
 *      "Allow adding visitor counts on your website" (it is off by default, to
 *      stop the counts leaking by accident). Until then the counter endpoint
 *      answers 403 and neither the header badge nor the traffic page counters
 *      show a number.
 *
 * Until GOATCOUNTER_CODE is set this file does nothing at all: no third-party
 * request is made and no cookies or storage are touched.
 *
 * Note: GitHub Pages is static hosting, so this client-side script is the only
 * way to record visits — there is no server to log requests.
 */
(function () {
    'use strict';

    /* ▼ Configure once, here. Leave empty to disable tracking entirely. */
    var GOATCOUNTER_CODE = 'hussainnazary';

    /* What the header badge counts:
     *   'total' -> all-time pageviews for the whole site  -> "Total Views" (current)
     *   'today' -> pageviews since midnight               -> "Today's Views"
     *   'both'  -> today's views AND the all-time site total
     * Whatever fails to load is left out of the badge rather than shown as 0. */
    var HEADER_VIEWS_MODE = 'total';

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    /*
     * Where the same-origin copy of the counts lives (written by
     * scripts/fetch-goatcounter-snapshot.js). Resolved against this script's own URL
     * rather than the page's, because pages live at every depth (models/, blog/,
     * guides/, brands/, cpu/, …) and the site is also opened from sub-folders, where a
     * root-relative path points at nothing. Every page includes this file as
     * `js/goatcounter.js` next to a sibling `data/` directory, so this lands on the
     * same file the live site serves while still working off the root.
     */
    function resolveSnapshotUrl() {
        var self = document.currentScript;
        if (self && self.src) {
            try {
                return new URL('../data/goatcounter-snapshot.json', self.src).href;
            } catch (error) {
                // Unparseable src (a data: or blob: include) — use the site-root path.
            }
        }
        return '/data/goatcounter-snapshot.json';
    }

    var config = {
        code: GOATCOUNTER_CODE,
        enabled: GOATCOUNTER_CODE.length > 0,
        base: GOATCOUNTER_CODE ? 'https://' + GOATCOUNTER_CODE + '.goatcounter.com' : '',
        // API endpoint returning {"count": "1,234"} for a path ("TOTAL" for the
        // whole site). Cached by GoatCounter for up to four hours.
        counterUrl: function (path) {
            return this.base + '/counter/' + path + '.json';
        },
        // Same-origin fallback, refreshed by scripts/fetch-goatcounter-snapshot.js. The
        // counter host above is third-party, so a content blocker or a DNS filter deletes
        // the badge entirely; this copy keeps a number on the page.
        snapshotUrl: resolveSnapshotUrl(),
        // What the header badge shows: one entry per counter, each fetched on its
        // own so one failure cannot blank the badge. GoatCounter scopes a counter
        // to a date range with ?start=YYYY-MM-DD&end=YYYY-MM-DD.
        viewsSpecs: function () {
            var specs = [];
            if (HEADER_VIEWS_MODE !== 'today') {
                specs.push({ url: this.counterUrl('TOTAL'), label: 'Total Views' });
            }
            if (HEADER_VIEWS_MODE !== 'total') {
                var now = new Date();
                var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
                specs.push({
                    url: this.counterUrl('TOTAL') + '?start=' + today + '&end=' + today,
                    label: "Today's Views",
                });
            }
            return specs;
        },
    };

    // Shared with js/traffic-live.js so the code lives in exactly one place.
    window.LocalAIZoneGoatCounter = config;

    if (!config.enabled) return;

    // Guard against a double include: the page may already carry the official
    // snippet, or this file may already have injected count.js. The badge below
    // still mounts either way — it is guarded by its own element id.
    var alreadyCounting = !!window.goatcounter && !!window.goatcounter.count ||
        !!document.querySelector('script[data-goatcounter]');

    if (!alreadyCounting) {
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://gc.zgo.at/count.js';
        script.setAttribute('data-goatcounter', config.base + '/count');
        document.head.appendChild(script);
    }

    /* ------------------------------------------------------------------ *
     * Header views badge: "👁 486,071 Total Views"                        *
     *                                                                     *
     * Everything is injected from here so the badge works on all ~5,100   *
     * pages without touching their markup — including the model pages,    *
     * which ship no shared stylesheet of their own.                       *
     * ------------------------------------------------------------------ */

    var BADGE_ID = 'gc-views-badge';
    var STYLE_ID = 'gc-views-style';
    var requested = false;

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#' + BADGE_ID + '{',
            'display:inline-flex;align-items:center;gap:.45em;vertical-align:middle;',
            'margin:0 0 0 14px;padding:6px 12px;border:1px solid currentColor;',
            'border-radius:999px;font-size:.72em;font-weight:600;letter-spacing:.02em;',
            'line-height:1;white-space:nowrap;opacity:.92;',
            'background:rgba(127,127,127,.16);cursor:default;',
            '}',
            '#' + BADGE_ID + ' .gc-views-count{font-variant-numeric:tabular-nums;}',
            '#' + BADGE_ID + ' .gc-views-sep{opacity:.5;}',
            '#' + BADGE_ID + ' .gc-views-dot{',
            'width:.5em;height:.5em;border-radius:50%;background:#4CAF50;',
            'box-shadow:0 0 0 3px rgba(76,175,80,.28);flex:none;',
            '}',
            // Grey marks the same-origin snapshot: the counts are real, but they are the
            // last published copy rather than the near-live figure.
            '#' + BADGE_ID + ' .gc-views-dot-cached{',
            'background:#9e9e9e;box-shadow:0 0 0 3px rgba(158,158,158,.28);',
            '}',
            '#' + BADGE_ID + '.gc-views-float{position:fixed;top:10px;right:10px;margin:0;z-index:9999;}',
            '@media (max-width:768px){',
            '#' + BADGE_ID + '{margin-left:8px;padding:5px 9px;font-size:.68em;}',
            '}',
        ].join('');
        document.head.appendChild(style);
    }

    // The header markup differs per section (main-nav / nav / blog-nav /
    // breadcrumb-nav / premium-header / bare model card), so try them in order
    // and fall back to a floating pill for anything unusual.
    var NAV_CONTAINERS = [
        'nav.main-nav',
        'nav.nav',
        'nav.blog-nav',
        'nav.nav-bar',
        'nav.breadcrumb-nav',
    ];
    var BLOCK_CONTAINERS = [
        'header.premium-header',
        'header.topbar',
        'header.article-header',
        '.header',
        '.container',
    ];

    function findContainer() {
        var i;
        for (i = 0; i < NAV_CONTAINERS.length; i++) {
            var nav = document.querySelector(NAV_CONTAINERS[i]);
            // Inside a nav the badge reads as one more item in the row...
            if (nav) return { el: nav, atEnd: true };
        }
        for (i = 0; i < BLOCK_CONTAINERS.length; i++) {
            var block = document.querySelector(BLOCK_CONTAINERS[i]);
            // ...but a header/card block gets it as its first line instead of
            // after the content (the model pages' card is 600px tall).
            if (block) return { el: block, atEnd: false };
        }
        return null;
    }

    // Pick text/background colours that stay readable on any header: some nav bars are
    // dark by default (#1a1a1a) while the badge inherits the page's text colour,
    // which is dark in light theme — so measure the surface behind it instead.
    function effectiveBackground(el) {
        while (el && el !== document.documentElement) {
            var match = /rgba?\(([^)]+)\)/.exec(getComputedStyle(el).backgroundColor);
            if (match) {
                var parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
                if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.95)) {
                    return { r: parts[0], g: parts[1], b: parts[2] };
                }
            }
            el = el.parentElement;
        }
        return { r: 255, g: 255, b: 255 };
    }

    function isDark(color) {
        return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b < 140;
    }

    function formatStamp(value) {
        var date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }

    /* `snapshot` is the data/goatcounter-snapshot.json payload when the live counters
     * could not be read, and undefined when they could. */
    function mountBadge(parts, snapshot) {
        if (document.getElementById(BADGE_ID)) return;
        ensureStyles();

        var badge = document.createElement('span');
        badge.id = BADGE_ID;
        badge.title = snapshot
            ? 'Pageviews recorded by GoatCounter — the live counters could not be reached, ' +
              'so this is the last published snapshot' +
              (snapshot.generatedAt ? ' from ' + formatStamp(snapshot.generatedAt) : '') + '.'
            : 'Pageviews recorded by GoatCounter — near-live, refreshed every few hours';

        var dot = document.createElement('span');
        dot.className = snapshot ? 'gc-views-dot gc-views-dot-cached' : 'gc-views-dot';
        dot.setAttribute('aria-hidden', 'true');
        badge.appendChild(dot);

        parts.forEach(function (part, index) {
            if (index > 0) {
                var sep = document.createElement('span');
                sep.className = 'gc-views-sep';
                sep.setAttribute('aria-hidden', 'true');
                sep.textContent = '·';
                badge.appendChild(sep);
            }

            var value = document.createElement('span');
            value.className = 'gc-views-count';
            value.textContent = part.count;

            var label = document.createElement('span');
            label.className = 'gc-views-label';
            label.textContent = ' ' + part.label;

            badge.appendChild(value);
            badge.appendChild(label);
        });

        var container = findContainer();
        if (container) {
            if (container.atEnd) {
                // Give the line a wrap point so narrow screens move the badge to
                // its own row instead of pushing the nav sideways: a plain text
                // node covers static navs, and flex navs (whitespace is ignored
                // there) need flex-wrap turned on.
                container.el.appendChild(document.createTextNode('\n'));
                if (/(inline-)?flex/.test(getComputedStyle(container.el).display)) {
                    container.el.style.flexWrap = 'wrap';
                }
                container.el.appendChild(badge);
            } else {
                container.el.insertBefore(badge, container.el.firstChild);
            }
        } else {
            badge.className = 'gc-views-float';
            document.body.appendChild(badge);
        }

        // Colour against the surface the badge actually landed on, and keep it in
        // sync when the site switches theme via <html data-theme>.
        function styleBadge() {
            var onDark = isDark(effectiveBackground(badge.parentElement || document.body));
            badge.style.color = onDark ? '#e9e9e9' : '#1f2328';
            badge.style.background = onDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.07)';
        }

        styleBadge();
        if (window.MutationObserver) {
            new MutationObserver(styleBadge).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme'],
            });
        }
    }

    function getJson(url) {
        return fetch(url, { headers: { Accept: 'application/json' } }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        });
    }

    function loadViews() {
        if (requested) return;
        requested = true;

        var specs = config.viewsSpecs();
        Promise.allSettled(specs.map(function (spec) {
            return getJson(spec.url);
        })).then(function (results) {
            var shown = [];
            results.forEach(function (result, i) {
                var data = result.status === 'fulfilled' ? result.value : null;
                if (data && typeof data.count === 'string' && data.count.length) {
                    shown.push({ count: data.count, label: specs[i].label });
                }
            });
            if (shown.length) {
                mountBadge(shown);
                return;
            }
            loadSnapshot();
        });
    }

    /*
     * Every live counter failed — a content blocker, a DNS filter, or an offline reader.
     * Fall back to the copy the repository publishes from its own origin so the counts
     * survive instead of the badge silently disappearing.
     */
    function loadSnapshot() {
        if (!config.snapshotUrl) return;
        getJson(config.snapshotUrl).then(function (data) {
            if (!data) return;
            // Same mode filter as viewsSpecs(), so the fallback never shows a count
            // the live badge has been configured to hide.
            var parts = [];
            if (HEADER_VIEWS_MODE !== 'today' && typeof data.total === 'string' && data.total.length) {
                parts.push({ count: data.total, label: 'Total Views' });
            }
            if (HEADER_VIEWS_MODE !== 'total' && typeof data.today === 'string' && data.today.length) {
                parts.push({ count: data.today, label: "Today's Views" });
            }
            if (parts.length) mountBadge(parts, data);
        }).catch(function () {
            // No snapshot to fall back on either: the badge simply stays absent.
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadViews);
    } else {
        loadViews();
    }
})();
