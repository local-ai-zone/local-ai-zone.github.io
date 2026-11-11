/* Renders data/traffic-snapshot.json (produced daily by
 * .github/workflows/update-traffic.yml) into the search-performance section of
 * traffic.html. No dependencies — builds plain SVG.
 *
 * Every value that comes from the snapshot is treated as untrusted text: search
 * queries are attacker-influenced input, so anything interpolated into HTML goes
 * through esc() first.
 */
(function () {
    'use strict';

    var SNAPSHOT_URL = 'data/traffic-snapshot.json';

    // Brand-ish colours that stay legible in both the light and dark themes.
    var ENGINE_META = {
        google: { label: 'Google Search', color: '#4285F4' },
        bing: { label: 'Bing', color: '#00A4EF' }
    };

    var numberFormat = new Intl.NumberFormat('en-US');

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function num(value) {
        return typeof value === 'number' && isFinite(value) ? numberFormat.format(value) : '—';
    }

    function pct(value) {
        return typeof value === 'number' && isFinite(value) ? (value * 100).toFixed(2) + '%' : '—';
    }

    function shortDate(iso) {
        if (!iso) return '';
        var parts = String(iso).split('-');
        if (parts.length !== 3) return String(iso);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[Number(parts[1]) - 1] + ' ' + Number(parts[2]);
    }

    function formatTimestamp(iso) {
        if (!iso) return '—';
        var d = new Date(iso);
        return isNaN(d.getTime()) ? String(iso) : d.toUTCString();
    }

    /* ── chart ─────────────────────────────────────────────────────────── */

    function areaChart(daily, color, label) {
        if (!daily || !daily.length) {
            return '<p class="chart-empty">No daily data available for this window.</p>';
        }

        var W = 720, H = 180;
        var pad = { top: 14, right: 14, bottom: 24, left: 40 };
        var innerW = W - pad.left - pad.right;
        var innerH = H - pad.top - pad.bottom;

        var max = Math.max(1, daily.reduce(function (m, d) { return Math.max(m, d.clicks); }, 0));
        var baseY = pad.top + innerH;

        function x(i) {
            return daily.length === 1 ? pad.left + innerW / 2 : pad.left + (i / (daily.length - 1)) * innerW;
        }
        function y(v) {
            return pad.top + innerH - (v / max) * innerH;
        }

        var points = daily.map(function (d, i) {
            return x(i).toFixed(1) + ',' + y(d.clicks).toFixed(1);
        });
        var line = 'M' + points.join(' L');
        var area = line + ' L' + x(daily.length - 1).toFixed(1) + ',' + baseY +
            ' L' + x(0).toFixed(1) + ',' + baseY + ' Z';

        var gridlines = [0, 0.5, 1].map(function (frac) {
            var gy = (pad.top + innerH - frac * innerH).toFixed(1);
            return '<line x1="' + pad.left + '" y1="' + gy + '" x2="' + (pad.left + innerW) +
                '" y2="' + gy + '" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>';
        }).join('');

        var total = daily.reduce(function (n, d) { return n + d.clicks; }, 0);

        return '' +
            '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="none"' +
            ' aria-label="' + esc(label) + ' daily clicks, ' + esc(shortDate(daily[0].date)) + ' to ' +
            esc(shortDate(daily[daily.length - 1].date)) + ', ' + esc(num(total)) + ' clicks total">' +
            gridlines +
            '<path d="' + area + '" fill="' + color + '" fill-opacity="0.16"/>' +
            '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2"' +
            ' stroke-linejoin="round" stroke-linecap="round"/>' +
            '<text x="' + (pad.left - 6) + '" y="' + (pad.top + 4) + '" text-anchor="end"' +
            ' font-size="11" fill="currentColor" fill-opacity="0.65">' + esc(num(max)) + '</text>' +
            '<text x="' + (pad.left - 6) + '" y="' + (baseY + 4) + '" text-anchor="end"' +
            ' font-size="11" fill="currentColor" fill-opacity="0.65">0</text>' +
            '<text x="' + pad.left + '" y="' + (H - 6) + '" font-size="11" fill="currentColor"' +
            ' fill-opacity="0.65">' + esc(shortDate(daily[0].date)) + '</text>' +
            '<text x="' + (pad.left + innerW) + '" y="' + (H - 6) + '" text-anchor="end"' +
            ' font-size="11" fill="currentColor" fill-opacity="0.65">' +
            esc(shortDate(daily[daily.length - 1].date)) + '</text>' +
            '</svg>';
    }

    /* ── blocks ────────────────────────────────────────────────────────── */

    function statCard(label, value, sub) {
        return '<div class="stat-card">' +
            '<div class="stat-value">' + esc(value) + '</div>' +
            '<div class="stat-label">' + esc(label) + '</div>' +
            (sub ? '<div class="stat-sub">' + esc(sub) + '</div>' : '') +
            '</div>';
    }

    function queryTable(queries) {
        if (!queries || !queries.length) {
            return '<p class="chart-empty">No query data available.</p>';
        }
        var rows = queries.map(function (q) {
            return '<tr><td>' + esc(q.query) + '</td>' +
                '<td class="num">' + esc(num(q.clicks)) + '</td>' +
                '<td class="num">' + esc(num(q.impressions)) + '</td>' +
                '<td class="num">' + (q.position ? esc(q.position.toFixed(1)) : '—') + '</td></tr>';
        }).join('');

        return '<table class="query-table">' +
            '<thead><tr><th scope="col">Top query</th><th scope="col" class="num">Clicks</th>' +
            '<th scope="col" class="num">Impressions</th><th scope="col" class="num">Avg position</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table>';
    }

    function engineBlock(key, data) {
        var meta = ENGINE_META[key] || { label: key, color: '#6B7280' };
        return '<div class="engine-block">' +
            '<h3>' + esc(meta.label) + '</h3>' +
            '<p class="engine-meta">' + esc(num(data.clicks)) + ' clicks · ' +
            esc(num(data.impressions)) + ' impressions · ' + esc(pct(data.ctr)) + ' CTR' +
            (data.position ? ' · avg position ' + esc(Number(data.position).toFixed(1)) : '') + '</p>' +
            '<div class="chart-wrap">' + areaChart(data.daily, meta.color, meta.label) + '</div>' +
            queryTable(data.topQueries) +
            '</div>';
    }

    /* ── render ────────────────────────────────────────────────────────── */

    function render(snapshot) {
        var meta = document.getElementById('snapshot-meta');
        var grid = document.getElementById('stat-grid');
        var blocks = document.getElementById('engine-blocks');
        var notice = document.getElementById('snapshot-error');
        var range = snapshot.range || {};

        if (meta) {
            meta.textContent = 'Window: last ' + (range.days || '—') + ' days (' +
                (range.startDate || '?') + ' → ' + (range.endDate || '?') + ') · ' +
                'snapshot generated ' + formatTimestamp(snapshot.generatedAt) +
                ' by a scheduled GitHub Action';
        }

        if (notice && snapshot.errors && snapshot.errors.length) {
            notice.hidden = false;
            notice.textContent = 'Some sources could not be refreshed; the last successful data is shown. ' +
                snapshot.errors.join(' · ');
        }

        var engines = ['google', 'bing'].filter(function (key) { return snapshot[key]; });
        if (!engines.length) {
            if (grid) grid.hidden = true;
            if (blocks) blocks.hidden = true;
            if (notice) {
                notice.hidden = false;
                notice.textContent = 'No traffic data in the snapshot yet. The scheduled workflow has not published one.';
            }
            return;
        }

        if (grid) {
            grid.hidden = false;
            grid.innerHTML = engines.map(function (key) {
                var data = snapshot[key];
                var meta2 = ENGINE_META[key] || { label: key };
                return statCard(meta2.label + ' clicks', num(data.clicks),
                    num(data.impressions) + ' impressions');
            }).join('');
        }

        if (blocks) {
            blocks.hidden = false;
            blocks.innerHTML = engines.map(function (key) { return engineBlock(key, snapshot[key]); }).join('');
        }
    }

    function showFailure(message) {
        var meta = document.getElementById('snapshot-meta');
        var notice = document.getElementById('snapshot-error');
        var grid = document.getElementById('stat-grid');
        var blocks = document.getElementById('engine-blocks');
        if (meta) meta.textContent = '';
        if (grid) grid.hidden = true;
        if (blocks) blocks.hidden = true;
        if (notice) {
            notice.hidden = false;
            notice.textContent = message;
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        fetch(SNAPSHOT_URL, { cache: 'no-cache' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(render)
            .catch(function () {
                showFailure('No traffic snapshot is published yet. Once the scheduled ' +
                    '"Update Search Traffic Data" workflow runs, this section fills in automatically.');
            });
    });
})();
