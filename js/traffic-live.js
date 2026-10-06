/* Live site traffic counters for traffic.html.
 *
 * Counts come from GoatCounter's public counter endpoint:
 *     https://<CODE>.goatcounter.com/counter/TOTAL.json  ->  { "count": "1,234" }
 *
 * The site code is configured in ONE place — js/goatcounter.js — which every page
 * loads and which also records the pageviews. This file only reads that config,
 * so there is nothing to set here.
 *
 * Note: GoatCounter caches counter responses for up to four hours, so these
 * numbers are near-live rather than real-time. The counters also require
 * "Allow adding visitor counts on your website" to be enabled in GoatCounter's
 * site settings; without it the endpoint 404s and the counters show "—".
 */
(function () {
    'use strict';

    function getConfig() {
        var config = window.LocalAIZoneGoatCounter;
        return config && config.enabled && config.base ? config : null;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function getJson(url) {
        return fetch(url, { headers: { Accept: 'application/json' } }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        });
    }

    function showSetupMessage() {
        document.querySelectorAll('[data-gc-live]').forEach(function (el) {
            el.hidden = true;
        });
        var setup = document.getElementById('gc-setup');
        if (setup) setup.hidden = false;
        setText('gc-status', 'Live counter not configured');
        setText('gc-updated', '—');
    }

    function failReason(result) {
        var message = result && result.reason ? String(result.reason.message || '') : '';
        var status = /HTTP (\d+)/.exec(message);
        return status ? Number(status[1]) : 0;
    }

    /*
     * Observed behaviour of the real counter service (checked against it directly):
     *   - valid code, known path  -> 200 with Access-Control-Allow-Origin: *
     *   - valid code, unknown path-> 404 WITH the CORS header, so the status is readable
     *   - unknown site code       -> 400 WITHOUT the CORS header, so the browser cannot
     *     read the status and the fetch fails as an opaque network error.
     * That last case is also what a wrong code or disabled visitor counts looks like,
     * which is why the unreadable case gets the setup-oriented message.
     */
    function statusMessage(totalOk, totalReason, pageOk, pageReason) {
        if (totalOk) {
            if (pageOk) return 'Live counts via GoatCounter (updated every few hours)';
            if (pageReason === 404) return 'GoatCounter is connected; this page has no recorded visits yet.';
            return 'Live counts via GoatCounter (showing the site total) - the per-page count is unavailable.';
        }

        if (totalReason === 404) {
            return 'GoatCounter is connected but has no site totals yet.';
        }

        return 'Could not read counters for this GoatCounter site code — check the code in ' +
            'js/goatcounter.js, and that "Allow adding visitor counts on your website" is ' +
            'enabled in the site settings.';
    }

    function update(config) {
        var pagePath = window.location.pathname || '/';
        var totalUrl = config.counterUrl('TOTAL');
        // GoatCounter expects the exact encoded path as it appears in its UI.
        var pageUrl = config.counterUrl(encodeURIComponent(pagePath));

        Promise.allSettled([getJson(totalUrl), getJson(pageUrl)]).then(function (results) {
            var totalResult = results[0];
            var pageResult = results[1];
            var total = totalResult.status === 'fulfilled' ? totalResult.value.count : null;
            var page = pageResult.status === 'fulfilled' ? pageResult.value.count : null;

            if (total !== null) setText('gc-total', total);
            if (page !== null) setText('gc-page', page);

            setText('gc-status', statusMessage(
                total !== null, failReason(totalResult),
                page !== null, failReason(pageResult)
            ));
            setText('gc-updated', new Date().toLocaleString());
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var config = getConfig();
        if (!config) {
            showSetupMessage();
            return;
        }
        update(config);
    });
})();
