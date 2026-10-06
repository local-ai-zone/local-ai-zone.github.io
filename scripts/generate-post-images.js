#!/usr/bin/env node
/**
 * Post Image Generator — Local AI Zone
 *
 * Renders hero/social cards and in-article data figures for blog posts to PNG.
 * Same approach as scripts/generate-banner.js: build a self-contained HTML page,
 * screenshot it at an exact width.
 *
 *   node scripts/generate-post-images.js                 # render every image
 *   node scripts/generate-post-images.js --only=bonsai   # render a subset
 *   node scripts/generate-post-images.js --review        # + write _image-review.html
 *
 * Two output classes:
 *   hero   -> 1200x630, deviceScaleFactor 1  (the exact og:image spec)
 *   figure -> 1200 wide, height fits content, deviceScaleFactor 2 (retina in-page)
 *
 * Every number rendered here is taken from the post the image belongs to.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'blog');
const REVIEW_PATH = path.join(ROOT, '_image-review.html');

// Heroes are 1200x630 (the og:image spec). Figures are designed at the width they
// actually render at inside a post (~720-800px reading column), so their labels keep
// their intended size on the page, and rendered at 3x for retina screens.
const CARD_W = { hero: 1200, figure: 720 };
const CARD_SCALE = { hero: 1, figure: 3 };
const HERO_H = 630;
const FIGURE_MIN_H = 460;

/* ------------------------------------------------------------------ *
 * Design tokens — copied from the research papers' inline :root block
 * ------------------------------------------------------------------ */
const CSS = `
:root{
  --w:1200px;
  --bg:#f6f7f9; --paper:#ffffff; --ink:#1a2233; --ink-soft:#46506a; --ink-faint:#7c86a0;
  --line:#e3e7ee; --accent:#4f46e5; --accent-soft:#eef2ff; --accent-2:#0d9488;
  --ok-bg:#f0fdf4; --ok-line:#86efac; --ok-ink:#166534;
  --warn-bg:#fff7ed; --warn-line:#fdba74; --warn-ink:#9a3412;
  --danger-bg:#fef2f2; --danger-line:#fca5a5; --danger-ink:#991b1b;
  --mono:'SFMono-Regular',ui-monospace,'Cascadia Mono',Menlo,Consolas,monospace;
  --sans:'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{width:var(--w)}
body{font-family:var(--sans);color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.card{width:var(--w);padding:62px 74px;background:var(--paper)}
body.figure .card{min-height:${FIGURE_MIN_H}px}

/* ---------- hero ---------- */
body.hero .card{
  height:${HERO_H}px;display:flex;flex-direction:column;justify-content:space-between;
  background:
    radial-gradient(1100px 420px at 88% -12%, var(--accent-soft) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(760px 380px at -6% 108%, rgba(13,148,136,.10) 0%, rgba(255,255,255,0) 60%),
    var(--paper);
  border-top:12px solid var(--accent);
}
.brandbar{display:flex;align-items:center;gap:14px}
.brandmark{width:40px;height:40px;border-radius:11px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;letter-spacing:-.03em}
.brandname{font-size:15px;font-weight:700;letter-spacing:.01em}
.brandsub{font-size:13px;color:var(--ink-faint);margin-top:2px}
.kicker{display:inline-block;font-size:12.5px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:var(--accent);background:var(--accent-soft);border:1px solid #dbe1ff;border-radius:99px;padding:7px 15px}
.h-title{font-size:60px;line-height:1.05;font-weight:800;letter-spacing:-.028em;margin:20px 0 0}
.h-title.sm{font-size:52px}
.h-sub{font-size:19px;line-height:1.5;color:var(--ink-soft);margin-top:18px;max-width:940px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px}
.stat{background:rgba(246,247,249,.86);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.stat .v{font-size:31px;font-weight:800;letter-spacing:-.022em;line-height:1.1}
.stat .k{font-size:12.5px;color:var(--ink-soft);line-height:1.38;margin-top:7px}
.footnote{font-size:13.5px;color:var(--ink-faint);line-height:1.45}
body.hero .footnote{display:flex;justify-content:space-between;align-items:center;gap:20px}

/* ---------- figure chrome ---------- */
.f-head{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:26px}
.f-kicker{font-size:12px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:var(--accent-2)}
.f-title{font-size:35px;font-weight:800;letter-spacing:-.022em;line-height:1.14;margin-top:10px}
.f-sub{font-size:15.5px;color:var(--ink-soft);line-height:1.5;margin-top:11px;max-width:1000px}
.f-note{font-size:13px;color:var(--ink-faint);line-height:1.5;margin-top:26px;padding-top:16px;border-top:1px solid var(--line);max-width:1040px}

/* ---------- bars ---------- */
.bar-row{display:grid;grid-template-columns:320px 1fr 132px;align-items:center;gap:16px;margin:11px 0}
.bar-label{font-size:14.5px;font-weight:600;line-height:1.3}
.bar-label .tiny{display:block;font-size:11.5px;font-weight:500;color:var(--ink-faint);margin-top:2px}
.track{background:#eef1f6;border-radius:99px;height:22px;overflow:hidden}
.fill{height:22px;border-radius:99px;background:var(--accent);min-width:4px}
.fill.open{background:var(--accent-2)}
.fill.warn{background:#fb923c}
.fill.danger{background:#ef4444}
.fill.dim{background:#c7cddb}
.bar-val{font-size:15px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.bar-val .tag{display:block;font-size:11px;font-weight:600;color:var(--ink-faint);margin-top:2px}
.bar-row.hl .bar-label{color:var(--accent)}

/* ---------- list (lab releases / price tiers) ---------- */
.list{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.list-row{display:grid;grid-template-columns:150px 1fr 200px;gap:16px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line);font-size:14.5px}
.list-row:last-child{border-bottom:none}
.list-row:nth-child(odd){background:#fbfcfe}
.list-date{font-size:12.5px;font-weight:700;color:var(--ink-faint);letter-spacing:.02em}
.list-name{font-weight:650}
.list-name .sub{font-weight:500;color:var(--ink-faint);font-size:12.5px;margin-left:6px}
.list-price{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.callout{margin-top:22px;border:1px solid #c7d2fe;background:var(--accent-soft);border-radius:14px;padding:18px 22px;display:flex;gap:18px;align-items:center}
.callout .big{font-size:34px;font-weight:800;letter-spacing:-.022em;color:var(--accent);white-space:nowrap}
.callout .txt{font-size:14.5px;color:var(--ink-soft);line-height:1.45}

/* ---------- compare (before -> after) ---------- */
.cmp-row{display:grid;grid-template-columns:380px 1fr 150px;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.cmp-row:last-child{border-bottom:none}
.cmp-label{font-size:15px;font-weight:650;line-height:1.3}
.cmp-label .sub{display:block;font-size:12px;font-weight:500;color:var(--ink-faint);margin-top:3px}
.cmp-move{display:flex;align-items:center;gap:12px;font-variant-numeric:tabular-nums}
.pill{font-size:13.5px;font-weight:700;border-radius:9px;padding:7px 12px;border:1px solid var(--line);background:#fbfcfe;white-space:nowrap}
.pill.before{color:var(--ink-faint);text-decoration:line-through}
.pill.after{color:var(--ink);border-color:#c7d2fe;background:var(--accent-soft)}
.arrow{color:var(--ink-faint);font-size:16px}
.delta{font-size:15px;font-weight:800;text-align:right}
.delta.down{color:var(--ok-ink)}
.delta.up{color:var(--danger-ink)}
.delta .sub{display:block;font-size:11.5px;font-weight:600;color:var(--ink-faint);margin-top:2px}

/* ---------- steps / flow ---------- */
.flow{display:flex;flex-direction:column;gap:0}
.node{border:1px solid var(--line);border-radius:14px;padding:16px 20px;background:#fbfcfe}
.node .h{font-size:16px;font-weight:700;line-height:1.3}
.node .d{font-size:13.5px;color:var(--ink-soft);line-height:1.45;margin-top:6px}
.node.accent{border-color:#c7d2fe;background:var(--accent-soft)}
.node.ok{border-color:var(--ok-line);background:var(--ok-bg)}
.node.warn{border-color:var(--warn-line);background:var(--warn-bg)}
.node-num{display:inline-flex;width:26px;height:26px;border-radius:8px;background:var(--accent);color:#fff;font-size:13px;font-weight:800;align-items:center;justify-content:center;margin-right:10px;vertical-align:2px}
.arrow-down{color:#b9c1d4;font-size:15px;text-align:center;padding:5px 0;line-height:1}

/* ---------- grid cards ---------- */
.grid{display:grid;gap:18px}
.grid.c2{grid-template-columns:1fr 1fr}
.grid.c3{grid-template-columns:repeat(3,1fr)}
.grid.c1{grid-template-columns:1fr}
.grid.c4{grid-template-columns:repeat(4,1fr)}
.gcell{border:1px solid var(--line);border-radius:14px;padding:20px 22px;background:#fbfcfe}
.gcell .h{font-size:16.5px;font-weight:750;line-height:1.25}
.gcell .d{font-size:13.5px;color:var(--ink-soft);line-height:1.48;margin-top:8px}
.gcell.accent{border-color:#c7d2fe;background:var(--accent-soft)}
.gcell .tagline{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent-2);margin-bottom:9px}
.metric{font-size:40px;font-weight:800;letter-spacing:-.025em;line-height:1}
.metric.ok{color:var(--ok-ink)}
.metric.accent{color:var(--accent)}

/* ---------- code card ---------- */
.code{background:#0d1117;border-radius:14px;padding:26px 30px;font-family:var(--mono);font-size:17px;line-height:1.85;color:#d7dde7;overflow:hidden}
.code .cmt{color:#7d8799}
.code .key{color:#ff7b72}
.code .fn{color:#79c0ff}
.code .str{color:#a5d6a7}
.code-line{display:flex;justify-content:space-between;gap:24px}
.code-note{color:#8b98ad;font-size:13.5px;padding-left:14px;border-left:2px solid #2b3446;white-space:nowrap}
.code-head{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.dot{width:11px;height:11px;border-radius:99px;background:#30363d}
.code-title{color:#8b98ad;font-size:13px;margin-left:8px;font-family:var(--sans);font-weight:600}

/* ---------- level chips (ternary) ---------- */
.chips{display:flex;gap:12px;margin-top:14px}
.chipw{font-family:var(--mono);font-size:19px;font-weight:700;color:var(--accent);background:#fff;border:1px solid #c7d2fe;border-radius:10px;padding:9px 18px}

/* ---------- compact figure mode: designed at the width it renders at in a post ---------- */
body.figure{--w:720px}
body.figure .card{padding:34px 38px;min-height:460px}
body.figure .f-head{padding-bottom:14px;margin-bottom:18px}
body.figure .f-kicker{font-size:10px;letter-spacing:.09em}
body.figure .f-title{font-size:23px;margin-top:7px;line-height:1.16}
body.figure .f-sub{font-size:12.5px;margin-top:8px;line-height:1.45}
body.figure .f-note{font-size:11px;margin-top:18px;padding-top:12px;line-height:1.45}
body.figure .bar-row{grid-template-columns:196px 1fr 78px;gap:9px;margin:8px 0}
body.figure .bar-label{font-size:12px}
body.figure .bar-label .tiny{font-size:9.5px}
body.figure .track,body.figure .fill{height:15px}
body.figure .bar-val{font-size:12px}
body.figure .bar-val .tag{font-size:9px}
body.figure .list-row{grid-template-columns:78px 1fr 132px;gap:9px;padding:8px 13px;font-size:11.5px}
body.figure .list-date{font-size:9.5px}
body.figure .list-name .sub{font-size:9.5px}
body.figure .callout{padding:12px 15px;gap:12px;margin-top:14px}
body.figure .callout .big{font-size:24px}
body.figure .callout .txt{font-size:11.5px;line-height:1.42}
body.figure .cmp-row{grid-template-columns:196px 1fr 92px;gap:9px;padding:9px 0}
body.figure .cmp-label{font-size:11.5px}
body.figure .cmp-label .sub{font-size:9.5px}
body.figure .pill{font-size:10.5px;padding:4px 8px;border-radius:7px}
body.figure .arrow{font-size:12px}
body.figure .delta{font-size:11.5px}
body.figure .delta .sub{font-size:9px}
body.figure .grid{gap:11px}
body.figure .grid.c2{grid-template-columns:1fr 1fr}
body.figure .grid.c3{grid-template-columns:1fr}
body.figure .grid.c4{grid-template-columns:1fr 1fr}
body.figure .gcell{padding:13px 15px}
body.figure .gcell .h{font-size:12.5px}
body.figure .gcell .d{font-size:11px;margin-top:6px;line-height:1.42}
body.figure .gcell .tagline{font-size:9px;margin-bottom:6px}
body.figure .metric{font-size:26px}
body.figure .node{padding:11px 14px;border-radius:11px}
body.figure .node .h{font-size:12.5px}
body.figure .node .d{font-size:11px;margin-top:5px;line-height:1.4}
body.figure .node-num{width:20px;height:20px;font-size:10.5px;border-radius:6px;margin-right:7px;vertical-align:1px}
body.figure .arrow-down{font-size:11px;padding:3px 0}
body.figure .code{padding:16px 18px;font-size:11.5px;line-height:1.7;border-radius:11px}
body.figure .code-note{font-size:10px;padding-left:9px;white-space:normal;max-width:210px;text-align:right}
body.figure .code-head{margin-bottom:10px}
body.figure .code-title{font-size:10px}
body.figure .chipw{font-size:13px;padding:5px 11px;border-radius:8px}
body.figure .chips{gap:7px;margin-top:8px}
`;

/* ------------------------------------------------------------------ *
 * Layout renderers
 * ------------------------------------------------------------------ */
const esc = (s) => String(s).replace(/&(?!amp;|lt;|gt;|rarr;|minus;|times;|nbsp;|#)/g, '&amp;');

const LAYOUTS = {
  hero: (d) => `
    <div class="brandbar">
      <div class="brandmark">AI</div>
      <div>
        <div class="brandname">Local AI Zone</div>
        <div class="brandsub">DeepSeek, GGUF &amp; local inference guides</div>
      </div>
    </div>
    <div>
      <div class="kicker">${d.kicker}</div>
      <h1 class="h-title${d.titleSm ? ' sm' : ''}">${d.title}</h1>
      <p class="h-sub">${d.sub}</p>
      <div class="stats">
        ${d.stats.map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="k">${s.k}</div></div>`).join('')}
      </div>
    </div>
    <div class="footnote"><span>${d.footnote}</span><span>local-ai-zone.github.io</span></div>`,

  bars: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div>
      ${d.rows
        .map(
          (r) => `<div class="bar-row${r.hl ? ' hl' : ''}">
        <div class="bar-label">${r.label}${r.sublabel ? `<span class="tiny">${r.sublabel}</span>` : ''}</div>
        <div class="track"><div class="fill${r.tone ? ' ' + r.tone : ''}" style="width:${Math.max(r.pct, 0.7)}%"></div></div>
        <div class="bar-val">${r.value}${r.tag ? `<span class="tag">${r.tag}</span>` : ''}</div>
      </div>`
        )
        .join('')}
    </div>
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,

  list: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div class="list">
      ${d.rows
        .map(
          (r) => `<div class="list-row">
        <div class="list-date">${r.date}</div>
        <div class="list-name">${r.name}${r.sub ? `<span class="sub">${r.sub}</span>` : ''}</div>
        <div class="list-price">${r.price}</div>
      </div>`
        )
        .join('')}
    </div>
    ${d.callout ? `<div class="callout"><div class="big">${d.callout.big}</div><div class="txt">${d.callout.txt}</div></div>` : ''}
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,

  compare: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div>
      ${d.rows
        .map(
          (r) => `<div class="cmp-row">
        <div class="cmp-label">${r.label}${r.sub ? `<span class="sub">${r.sub}</span>` : ''}</div>
        <div class="cmp-move">
          ${r.before ? `<span class="pill before">${r.before}</span><span class="arrow">&rarr;</span>` : ''}
          <span class="pill after">${r.after}</span>
        </div>
        <div class="delta ${r.dir || ''}">${r.delta}${r.sub2 ? `<span class="sub">${r.sub2}</span>` : ''}</div>
      </div>`
        )
        .join('')}
    </div>
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,

  flow: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div class="flow">
      ${d.nodes
        .map(
          (n, i) => `${i ? '<div class="arrow-down">&#8595;</div>' : ''}
      <div class="node${n.tone ? ' ' + n.tone : ''}">
        <div class="h">${n.n != null ? `<span class="node-num">${n.n}</span>` : ''}${n.h}</div>
        ${n.d ? `<div class="d">${n.d}</div>` : ''}
      </div>`
        )
        .join('')}
    </div>
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,

  grid: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div class="grid ${d.cols || 'c2'}">
      ${d.cells
        .map(
          (c) => `<div class="gcell${c.tone ? ' ' + c.tone : ''}">
        ${c.tag ? `<div class="tagline">${c.tag}</div>` : ''}
        ${c.metric ? `<div class="metric${c.metricTone ? ' ' + c.metricTone : ''}">${c.metric}</div>` : ''}
        <div class="h"${c.metric ? ' style="margin-top:12px"' : ''}>${c.h}</div>
        ${c.d ? `<div class="d">${c.d}</div>` : ''}
      </div>`
        )
        .join('')}
    </div>
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,

  code: (d) => `
    <div class="f-head">
      <div class="f-kicker">${d.kicker}</div>
      <div class="f-title">${d.title}</div>
      ${d.sub ? `<div class="f-sub">${d.sub}</div>` : ''}
    </div>
    <div class="code">
      <div class="code-head"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="code-title">${d.codeTitle}</span></div>
      ${d.lines
        .map(
          (l) => `<div class="code-line"><span>${l.code}</span>${l.note ? `<span class="code-note">${l.note}</span>` : ''}</div>`
        )
        .join('')}
    </div>
    ${d.note ? `<div class="f-note">${d.note}</div>` : ''}`,
};

/* ------------------------------------------------------------------ *
 * Image definitions — every figure, and the post it belongs to
 * ------------------------------------------------------------------ */
const IMAGES = [
  /* ============ 1. September 2026 dispatch ============ */
  {
    file: 'september-2026-ai-model-updates-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'September_2026_AI_Model_Updates.html',
    kicker: 'Monthly dispatch · September 2026',
    title: 'September 2026 AI Model Updates',
    sub: 'Twenty-plus releases in two weeks, a new price floor at $0.10 per million tokens, and the largest open-weight model of the month shipped by a phone maker.',
    stats: [
      { v: '20+', k: 'Models shipped September 12&ndash;25 alone' },
      { v: '119&times;', k: 'Price spread across the leaderboard top 15' },
      { v: '$0.10 /M', k: 'Cheapest top-5 model: Muse Spark 1.3 blended' },
      { v: '46 AA', k: 'MiMo-V2.6-Pro, the top open-weight score' },
    ],
    footnote: 'Every material launch and price move, July 31 &ndash; September 25, 2026.',
  },
  {
    file: 'september-2026-blended-price-frontier.png',
    kind: 'figure',
    layout: 'bars',
    post: 'September_2026_AI_Model_Updates.html',
    kicker: 'September 2026 · Price frontier',
    title: 'Blended price per 1M tokens &mdash; leaderboard top 15',
    sub: 'An 8:1 input-to-output blend in USD, as tracked by LLM Stats and updated with the September 22 launches (verified September 26, 2026).',
    rows: [
      { label: 'Claude Fable 5.1', value: '$11.90', pct: 100, sublabel: 'Closed' },
      { label: 'GPT-5.6 Sol', value: '$6.19', pct: 52, sublabel: 'Closed' },
      { label: 'Claude Opus 5', value: '$5.95', pct: 50, sublabel: 'Closed' },
      { label: 'Claude Opus 5.5', value: '$5.78', pct: 49, sublabel: 'Closed &middot; Sep 22', tag: '20% below Opus 5' },
      { label: 'Kimi K3', value: '$3.57', pct: 30, sublabel: 'Open weights &middot; Moonshot', tone: 'open' },
      { label: 'GPT-6 Sol', value: '$2.89', pct: 24, sublabel: 'Closed &middot; Sep 22' },
      { label: 'GPT-5.6 Terra', value: '$2.48', pct: 21, sublabel: 'Closed' },
      { label: 'Qwen3.8 Max', value: '$1.81', pct: 15, sublabel: 'Open weights &middot; Alibaba', tone: 'open' },
      { label: 'GLM-5.3', value: '$1.54', pct: 13, sublabel: 'Open weights &middot; Z.ai', tone: 'open' },
      { label: 'Gemini 3.8 Flash', value: '$0.89', pct: 7.5, sublabel: 'Closed &middot; September launch' },
      { label: 'DeepSeek V4 Pro', value: '$0.46', pct: 3.9, sublabel: 'Open weights &middot; DeepSeek', tone: 'open' },
      { label: 'GLM-5.3-Flash', value: '$0.17', pct: 1.4, sublabel: 'Open weights &middot; Z.ai list price', tone: 'open' },
      { label: 'GPT-6 Luna', value: '$0.14', pct: 1.2, sublabel: 'Closed &middot; Sep 22', tag: 'New floor' },
      { label: 'Muse Spark 1.3', value: '$0.10', pct: 0.9, sublabel: 'Closed &middot; September launch', tone: 'open', tag: 'Cheapest' },
    ],
    note: 'Five of the fourteen slots are open-weight Chinese models &mdash; Kimi K3, Qwen3.8 Max, GLM-5.3, DeepSeek V4 Pro and GLM-5.3-Flash. The spread between the top and bottom row is 85&times;, or 119&times; against the cheapest top-5 model.',
  },
  {
    file: 'september-2026-release-density.png',
    kind: 'figure',
    layout: 'bars',
    post: 'September_2026_AI_Model_Updates.html',
    kicker: 'September 2026 · Release ledger',
    title: 'Release density, September 12&ndash;25',
    sub: 'Every model launch logged in this dispatch&rsquo;s late-September ledger, grouped by date. Three days carry most of the month.',
    rows: [
      { label: 'September 12', value: '2', pct: 33 },
      { label: 'September 14', value: '1', pct: 17 },
      { label: 'September 15', value: '2', pct: 33 },
      { label: 'September 18', value: '2', pct: 33 },
      { label: 'September 21', value: '5', pct: 83, hl: true },
      { label: 'September 22', value: '6', pct: 100, hl: true },
      { label: 'September 23', value: '5', pct: 83, hl: true },
      { label: 'September 24', value: '2', pct: 33 },
      { label: 'September 25', value: '2', pct: 33 },
    ],
    note: 'Two stealth rows span multi-day windows (September 16&ndash;17 and September 17&ndash;19), bringing the ledger to 29 logged launches. September 21&ndash;23 alone accounts for 16 of them &mdash; including Grok 4.7, Xiaomi&rsquo;s MiMo v2.6 family, Claude Opus 5.5 and the GPT-6 Sol/Luna pair.',
  },
  {
    file: 'september-2026-chinese-labs.png',
    kind: 'figure',
    layout: 'list',
    post: 'September_2026_AI_Model_Updates.html',
    kicker: 'September 2026 · China&rsquo;s labs',
    title: 'A phone maker took the open-weight crown',
    sub: 'Twelve September releases across seven Chinese labs &mdash; the widest open-weight field any month has produced.',
    rows: [
      { date: 'Sep 3', name: 'Qwen3.8 Max (0902)', sub: 'Alibaba', price: '$2 / $6' },
      { date: 'Sep 4&ndash;12', name: 'Ling 3.0 Flash Sante / Fin / VL', sub: 'InclusionAI', price: 'Free &middot; $0.06 / $0.18' },
      { date: 'Sep 10', name: 'DeepSeek V4.1-Flash', sub: 'DeepSeek', price: '$0.30 / $1.20 peak' },
      { date: 'Sep 14', name: 'deepseek-v4-pro rerouted to V4.1-Flash', sub: 'DeepSeek', price: 'Billed at Flash rates' },
      { date: 'Sep 18', name: 'GLM-5.3 FlashX, open weights', sub: 'Z.ai', price: '$0.37 / $1.25' },
      { date: 'Sep 18', name: 'Kimi K3 GA on Amazon Bedrock', sub: 'Moonshot &middot; 2.8T params', price: 'Hyperscaler endpoint' },
      { date: 'Sep 21', name: 'MiMo v2.6 Flash', sub: 'Xiaomi &middot; AA score 46', price: '$0.14 / $0.28' },
      { date: 'Sep 21', name: 'MiMo v2.6 Pro', sub: 'Xiaomi &middot; 1.02T / 42B active', price: '$0.435 / $0.87' },
      { date: 'Sep 21', name: 'MiMo v2.6 Pro-UltraSpeed', sub: 'Xiaomi &middot; up to 20&times; faster', price: '$4.35 / $8.70' },
      { date: 'Sep 21', name: 'Qwen3.8 Omni Flash', sub: 'Alibaba', price: 'Multimodal omni tier' },
      { date: 'Sep 22', name: '5&ndash;10T-parameter program + in-house chip', sub: 'Alibaba &middot; Reuters', price: 'Largest target on record' },
      { date: 'Sep 23', name: 'GLM 5.3 Prime', sub: 'Z.ai', price: '$2.80 / $8.80' },
      { date: 'Sep 23', name: 'Qwen3.8 Max Prime', sub: 'Alibaba &middot; 2&times; price of Max', price: '$4 / $12' },
    ],
    callout: {
      big: '46 AA',
      txt: 'MiMo-V2.6-Pro is the highest-scoring open-weight model on the Artificial Analysis Intelligence Index &mdash; and the cheapest model AA tracks at roughly $0.13 per task. Claude Opus 5.5 sits at 58: Xiaomi leads the open field, not the field.',
    },
    note: 'Tencent shipped nothing new after August 28&rsquo;s Hy4 preview, and MiniMax held at M3 &mdash; a funding-and-distribution month for both.',
  },
  {
    file: 'september-2026-price-moves.png',
    kind: 'figure',
    layout: 'compare',
    post: 'September_2026_AI_Model_Updates.html',
    kicker: 'September 2026 · Price moves',
    title: 'The month pricing stopped being a rate card',
    sub: 'Cuts, promos, one cancellation and one scheduled doubling &mdash; per million tokens, in/out.',
    rows: [
      { label: 'Fable 5.1 cache reads', sub: 'Anthropic, Sep 1', before: '$1.00', after: '$0.25', delta: '&minus;75%', dir: 'down', sub2: '~25% total, up to 45% agentic' },
      { label: 'Claude Opus 5.5', sub: 'Anthropic, Sep 22', before: '$5 / $25', after: '$4 / $20', delta: '&minus;20%', dir: 'down', sub2: '~40% cheaper per workload' },
      { label: 'GPT-6 Sol', sub: 'OpenAI, Sep 22', before: '$4 / $20', after: '$2 / $10', delta: '&minus;50%', dir: 'down', sub2: 'Cached input $0.01' },
      { label: 'GPT-6 Luna', sub: 'OpenAI, Sep 22 &middot; new API floor', after: '$0.10 / $0.50', delta: 'Undercuts', dir: 'down', sub2: 'V4.1-Flash off-peak $0.15 / $0.60' },
      { label: 'GLM-5.3-Flash promo', sub: 'Z.ai &middot; ended Sep 9', before: '$0.15 / $0.50', after: '$0.075 / $0.25', delta: '&minus;50%', dir: 'down', sub2: 'Cache $0.03' },
      { label: 'Gemini 3.8 Flash', sub: 'Google &middot; scheduled Jan 1, 2027', before: '$0.75 / $3.75', after: '$1.50 / $7.50', delta: '2&times;', dir: 'up', sub2: 'Introductory rate doubles' },
      { label: 'DeepSeek V4-Pro-0813', sub: 'DeepSeek, Aug 13 &middot; the counter-trend', after: '$1.32 / $3.96', delta: 'Up to 14&times;', dir: 'up', sub2: 'Still ~7&times; under Western peers' },
    ],
    note: 'Compiled from provider pricing pages and CloudZero&rsquo;s verified ledger (updated September 2, 2026). The most September-specific item: Anthropic cancelled the price increase it had scheduled for September 1.',
  },

  /* ============ 2. October 2026 dispatch ============ */
  {
    file: 'october-2026-ai-model-updates-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'Monthly dispatch · October 2026',
    title: 'October 2026 AI Model Updates',
    sub: 'The week the frontier went quiet: a flagship only vetted cyber defenders can use, a GPT-6.1 release OpenAI cancelled, and eight specialist models that take the slot next to the tool call.',
    stats: [
      { v: '8 in 3d', k: 'Vendor-dated releases Oct 1&ndash;3 &mdash; every one a specialist' },
      { v: '4 of 8', k: 'Ship Apache 2.0 weights on the same day' },
      { v: '$0.72', k: 'GPT-6.1 Sol per index task, cheapest in the top tier' },
      { v: '111 GB', k: 'POCKET-Darwin-180B, streamed on a 32 GB laptop' },
    ],
    footnote: 'Every material launch, price move and access change, September 27 &ndash; October 6, 2026.',
  },
  {
    file: 'october-2026-intelligence-index.png',
    kind: 'figure',
    layout: 'bars',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'October 2026 · Frontier standing',
    title: 'Anthropic holds the top three &mdash; Google ties Astra',
    sub: 'Artificial Analysis Intelligence Index v4.3.2, at each model&rsquo;s published effort level. Every row is the current released version of its family as of October 6, 2026.',
    rows: [
      { label: 'Claude Opus 5.5', value: '57.6', pct: 100, sublabel: 'Anthropic &middot; Sep 22 &middot; $4 / $20', tag: '$5.98 per task', hl: true },
      { label: 'Claude Sonnet 5.5', value: '56.0', pct: 97, sublabel: 'Anthropic &middot; Sep 28 &middot; $2 / $10', tag: 'Newest Claude' },
      { label: 'Claude Fable 5.1', value: '53.4', pct: 93, sublabel: 'Anthropic &middot; Sep 1 &middot; still shipping' },
      { label: 'GPT-6 Astra', value: '52.7', pct: 91, sublabel: 'OpenAI &middot; Sep 3 &middot; flagship' },
      { label: 'Gemini 4 Argon', value: '52.6', pct: 91, sublabel: 'Google &middot; Sep 30 &middot; Fairwind only', tone: 'warn', tag: 'Newest frontier' },
      { label: 'GPT-6.1 Sol', value: '51.8', pct: 90, sublabel: 'OpenAI &middot; Sep 29 &middot; $2 / $10', tag: 'Cheapest top tier' },
      { label: 'GPT-6 Sol', value: '47.5', pct: 82, sublabel: 'OpenAI &middot; Sep 22 &middot; superseded on value' },
      { label: 'Grok 4.7', value: '46.3', pct: 80, sublabel: 'SpaceXAI &middot; Sep 21 &middot; newest Grok' },
      { label: 'MiMo-V2.6-Pro', value: '46.3', pct: 80, sublabel: 'Xiaomi &middot; Sep 21 &middot; MIT weights', tone: 'open', tag: 'Top open model' },
      { label: 'GPT-6 Luna', value: '37.3', pct: 65, sublabel: 'OpenAI &middot; Sep 22 &middot; $0.10 / $0.50' },
    ],
    note: 'Nothing here is older than five weeks: the oldest row is September 1 and the newest is September 30, 2026. No newer version of any family on this chart has shipped as of October 6 &mdash; Claude Haiku 5.5, Grok 4.8, Muse Spark 1.4 and Qwen 4 are all unreleased. Effort level moves the score as much as the model does: Sonnet 5.5 reads 56.0 at max, 51.9 at xhigh and 46.7 at high. Argon&rsquo;s 52.6 is a high-effort reading with no published max row, and MiMo-V2.6-Pro remains the highest-scoring open-weight model at 46.3.'
  },
  {
    file: 'october-2026-cost-per-task.png',
    kind: 'figure',
    layout: 'bars',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'October 2026 · The real price war',
    title: 'Cost per run, not cost per token',
    sub: 'Artificial Analysis cost to complete one Intelligence Index run, per current model version as of October 6, 2026 &mdash; the column September&rsquo;s price cuts were actually competing on.',
    rows: [
      { label: 'GPT-6 Luna', value: '$0.07', pct: 1, sublabel: 'OpenAI &middot; Sep 22 &middot; index 37.3', tone: 'open', tag: 'Floor' },
      { label: 'MiMo-V2.6-Pro', value: '$0.13', pct: 2, sublabel: 'Xiaomi &middot; Sep 21 &middot; index 46.3', tone: 'open', tag: 'Best value' },
      { label: 'GPT-6.1 Sol', value: '$0.72', pct: 9.5, sublabel: 'OpenAI &middot; Sep 29 &middot; index 51.8', hl: true, tag: 'Cheapest top tier' },
      { label: 'GPT-6 Sol', value: '$1.06', pct: 14, sublabel: 'OpenAI &middot; Sep 22 &middot; index 47.5' },
      { label: 'Claude Sonnet 5.5 (high)', value: '$1.08', pct: 14, sublabel: 'Anthropic &middot; Sep 28 &middot; index 46.7' },
      { label: 'Gemini 4 Argon', value: '$1.99', pct: 26, sublabel: 'Google &middot; Sep 30 &middot; intro pricing', tone: 'warn', tag: 'Intro rate' },
      { label: 'Claude Sonnet 5.5 (xhigh)', value: '$2.74', pct: 36, sublabel: 'Anthropic &middot; Sep 28 &middot; index 51.9' },
      { label: 'GPT-6 Astra', value: '$3.26', pct: 43, sublabel: 'OpenAI &middot; Sep 3 &middot; index 52.7' },
      { label: 'Claude Opus 5.5', value: '$5.98', pct: 79, sublabel: 'Anthropic &middot; Sep 22 &middot; index 57.6' },
      { label: 'Claude Sonnet 5.5 (max)', value: '$7.60', pct: 100, sublabel: 'Anthropic &middot; Sep 28 &middot; index 56.0', tone: 'danger', tag: '410M tokens burned' },
    ],
    note: 'Every row is a current released version dated September 21&ndash;30, 2026 &mdash; none is superseded by anything shipped through October 6. The same model spans 7&times;: Sonnet 5.5 costs $1.08 a task at high effort and $7.60 at max, because its max run emitted 410 million tokens to reach the same index. On cost per task the October order is the reverse of the intelligence order &mdash; and MiMo-V2.6-Pro is the only model in the top five on both.',
  },
  {
    file: 'october-2026-openai-price-tiers.png',
    kind: 'figure',
    layout: 'bars',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'October 2026 · One model, five rate cards',
    title: 'The same weights at six times the price',
    sub: 'gpt-6-astra output pricing per 1M tokens on OpenAI&rsquo;s published October 2026 tiers, short-context.' ,
    rows: [
      { label: 'Ultrafast', value: '$300', pct: 100, sublabel: 'Astra only &middot; up to 300 tok/s', tone: 'danger', tag: '6&times; standard' },
      { label: 'Fast', value: '$100', pct: 33, sublabel: 'Astra, 6.1 Sol and Luna', tag: '2&times; standard' },
      { label: 'Standard', value: '$50', pct: 16.7, sublabel: 'The headline number everyone quotes', hl: true },
      { label: 'Batch', value: '$25', pct: 8.3, sublabel: 'Asynchronous, same weights', tone: 'open', tag: '&minus;50%' },
      { label: 'Flex', value: '$25', pct: 8.3, sublabel: 'Slower, same weights', tone: 'open', tag: '&minus;50%' },
    ],
    note: 'Long-context requests double every tier, so the same Ultrafast output is $450 past the short-context window. Batch and Flex are the only routes that cut the price of identical weights; Fast and Ultrafast are the only ones OpenAI sells for latency. Note the shape: the cheapest and most expensive ways to run one model differ by 12&times; ($25 to $300) before any caching.',
  },
  {
    file: 'october-2026-specialist-wave.png',
    kind: 'figure',
    layout: 'list',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'October 1&ndash;3 · The opening ledger',
    title: 'Eight releases, five vendors, no frontier LLM',
    sub: 'Every model with a vendor-dated release page in the first three days of October 2026 &mdash; Clef and Clef-flash are counted as two.',
    rows: [
      { date: 'Oct 1', name: 'Clef &amp; Clef-flash', sub: 'Cloudflare &middot; 27B and 9B decision models', price: '$0.24 / $0.09' },
      { date: 'Oct 1', name: 'Strands Decider 2B', sub: 'Amazon Strands Labs &middot; 2B decision model', price: 'Free, local' },
      { date: 'Oct 1', name: 'MAI-Voice-2.1', sub: 'Microsoft AI &middot; 23 languages, 26 locales', price: '$22 / M chars' },
      { date: 'Oct 1', name: 'MAI-Voice-2.1-Flash', sub: 'Microsoft AI &middot; 150 ms end to end', price: '$15 / M chars' },
      { date: 'Oct 1', name: 'MAI-Transcribe-2-Streaming', sub: 'Microsoft AI &middot; 60 languages', price: '$0.54 / hour' },
      { date: 'Oct 1', name: 'Griffin-Lite', sub: 'Tavus &middot; full-duplex video preview', price: 'Not published' },
      { date: 'Oct 2', name: 'Index-Translate-35B-A3B', sub: 'Bilibili Index &middot; 35B total / 3B active', price: 'Free weights' },
    ],
    note: 'Prices are per million input tokens for the text models, per million characters for the speech models, and per hour of audio for transcription, as the vendors listed them on October 3. Four of the eight carry Apache 2.0 licences with public weights; Microsoft&rsquo;s three and Tavus&rsquo;s one are API or invite only. Three further models appeared on OpenRouter inside the window with no vendor page located &mdash; Unbiased Pareto 26.10 Preview, Apodex 1.1 Mini and InclusionAI&rsquo;s Ling 3.1 Flash &mdash; and are recorded as listings, not releases.',
  },
  {
    file: 'october-2026-local-downloads.png',
    kind: 'figure',
    layout: 'bars',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'October 2026 · What people actually ran',
    title: 'The GGUF builds that moved in the first four days',
    sub: 'Hugging Face download counts for the repositories behind each build, read from this site&rsquo;s own model index on October 6, 2026.',
    rows: [
      { label: 'Qwen3.8 Flash Next (IQ quants)', value: '291,404', pct: 100, sublabel: 'SC117 &middot; Oct 2 &middot; newest Qwen weights', tone: 'open', hl: true, tag: '23&times; the next' },
      { label: 'Swift 1.5, Qwen3.8 Flash Next', value: '21,441', pct: 7.4, sublabel: 'SC117 &middot; Oct 3', tone: 'open' },
      { label: 'Cloudflare Clef Flash', value: '12,661', pct: 4.3, sublabel: 'bartowski &middot; Oct 1 &middot; 26 quantisations' },
      { label: 'POCKET-Darwin-180B', value: '7,423', pct: 2.5, sublabel: 'FINAL-Bench &middot; Oct 2 &middot; 4-bit, 111 GB' },
      { label: 'Qwen3.8 Flash Next (Strata)', value: '3,718', pct: 1.3, sublabel: 'alesha-pro &middot; Oct 4 &middot; 480 KB fix', tone: 'open' },
      { label: 'DiarizationLM Gemma 4 E4b', value: '880', pct: 0.3, sublabel: 'google &middot; Oct 4 &middot; 2.36 GB' },
    ],
    note: 'Qwen3.8-Flash-Next is still the newest Qwen with downloadable weights: Alibaba announced Qwen 4 at Apsara on September 22 and says it is in training, with no date, price or weights &mdash; the August preview is the architecture Qwen 4 will use. Counts are per repository across all of its quantisation files, not per file, and they accumulate, so a four-day-old repo competes against one published two days earlier on unequal footing. The shape is still the story.',
  },
  {
    file: 'october-2026-laptop-180b.png',
    kind: 'figure',
    layout: 'flow',
    post: 'October_2026_AI_Model_Updates.html',
    kicker: 'Open weights · October 2026',
    title: 'How a 180B model runs on a 32 GB laptop',
    sub: 'POCKET-Darwin-180B, published by VIDRAFT under the FINAL-Bench organisation on October 2, 2026.',
    nodes: [
      { n: 1, h: 'A datacentre mixture of experts', d: 'Darwin-180B-RSI-R3 &mdash; the model holding first place on seven official Hugging Face leaderboards, and the reason this class of model normally needs a rack.' },
      { n: 2, h: 'A four-bit GGUF', d: 'The release compresses the full-precision weights to roughly 111 GB. The publisher describes the compression as lossless against the leaderboard positions the base model holds.' },
      { n: 3, h: 'SSD streaming, not memory residency', d: 'The laptop story is not that 111 GB fits in 32 GB of RAM. Weights stream off the SSD and experts load selectively, so a given token touches a fraction of the file. <em>The disk is the bottleneck, and it is the whole trick.</em>' },
      { n: 4, h: 'Consumer hardware, no discrete GPU', d: 'The published target is a laptop, with hardware on the order of $1,400 in the reporting around the release. Treat the throughput figures as the publisher&rsquo;s until independent runs exist.', tone: 'warn' },
      { n: 5, h: 'The same move Bonsai 2 made, one order of magnitude up', d: 'Compression plus a runtime that keeps I/O off the critical path is now the standard shape of a local release &mdash; at 27B in September, at 180B in October. What changes is the hardware floor.', tone: 'accent' },
    ],
    note: 'Our own model index lists the POCKET-Darwin-180B repository at 425 GB across all of its files, so the 111 GB figure applies to the four-bit build specifically. Downloads: 7,423 as of October 6, 2026.',
  },

  /* ============ 3. DeepSeek KV cache research paper ============ */
  {
    file: 'deepseek-kv-cache-890-bytes-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Deep-dive research paper · Efficiency',
    title: '890 bytes per token',
    titleSm: true,
    sub: 'How DeepSeek cut its KV cache from 389,120 bytes per cached token to 890 &mdash; a 438&times; reduction in under three years &mdash; and what each architectural step cost and bought.',
    stats: [
      { v: '438&times;', k: 'Smaller than DeepSeek-V1, per cached token' },
      { v: '890 B', k: 'V4.1-Flash global HBM per token at 1M context' },
      { v: '8.1&times;', k: 'V3.2 vs V3, from MLA plus DSA' },
      { v: '30+', k: 'Cited papers, reports and kernels' },
    ],
    footnote: 'Every number cited against the papers, configs and serving stacks.',
  },
  {
    file: 'deepseek-kv-cache-four-discontinuities.png',
    kind: 'figure',
    layout: 'bars',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Fig. 1 &middot; The lineage',
    title: 'Four architectural discontinuities',
    sub: 'Track lengths are proportional to stored KV bytes per token on a linear scale. Each generation attacks a different axis of the same equation.',
    rows: [
      { label: 'DeepSeek LLM 67B &mdash; GQA-8', sublabel: 'November 2023 &middot; the baseline', value: '389,120 B', pct: 100, tone: 'dim', tag: '1&times; (baseline)' },
      { label: 'DeepSeek-V2 &mdash; MLA', sublabel: 'May 2024 &middot; latent cache', value: '69,120 B', pct: 17.8, tag: '5.6&times; smaller' },
      { label: 'DeepSeek-V3.2 &mdash; MLA + DSA', sublabel: 'September 2025 &middot; sparse attention', value: '48,068 B', pct: 12.4, tag: '8.1&times; smaller' },
      { label: 'DeepSeek-V4.1-Flash &mdash; CSA2 + CED + FP4', sublabel: 'September 2026 &middot; global projection', value: '890 B', pct: 0.7, hl: true, tag: '438&times; smaller' },
    ],
    note: 'Mixed geometry: the V2&ndash;V3.2 figures are DeepSeek&rsquo;s published per-token storage at 128K context. The V4 rows are percentages of V3.2 at 1M context per the V4 report, and the 438&times; uses DeepSeek&rsquo;s own V1 comparison.',
  },
  {
    file: 'deepseek-kv-mla-vs-mha-bytes.png',
    kind: 'figure',
    layout: 'bars',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Fig. 2 &middot; MLA at V2 geometry',
    title: 'What a latent cache actually saves',
    sub: 'Per-layer cache entries at DeepSeek-V2&rsquo;s geometry, with multi-head attention as the reference.',
    rows: [
      { label: 'MHA &mdash; the counterfactual', sublabel: '32,768 cache entries, reference = 100%', value: '100%', pct: 100, tone: 'dim' },
      { label: 'GQA-8 &mdash; grouped-query', sublabel: 'Implied by the two published ratios', value: '6.3%', pct: 6.3, tone: 'warn', tag: 'of MHA bytes' },
      { label: 'MLA &mdash; multi-head latent attention', sublabel: 'The V2 paper&rsquo;s ablation winner', value: '1.76%', pct: 1.76, tone: 'open', hl: true, tag: 'of MHA bytes' },
    ],
    note: 'MLA stores 1.76% of MHA&rsquo;s bytes and 28% of GQA-8&rsquo;s. GQA-8&rsquo;s 6.3% share is implied by those two published ratios rather than quoted directly. The V2 ablation table has MLA outperforming MHA on hard tasks at that footprint.',
  },
  {
    file: 'deepseek-kv-dsa-decode-path.png',
    kind: 'figure',
    layout: 'flow',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Fig. 3 &middot; Sparse attention',
    title: 'The DSA decode path',
    sub: 'One cheap read of everything, one expensive read of a little.',
    nodes: [
      { n: 1, h: 'A query token at long context', d: '819K tokens of history, 1M-token window.' },
      { n: 2, h: 'Lightning indexer &mdash; reads everything, cheaply', d: 'Scores every past token with a low-precision pass. This is the part that scales with context length, and it is built to be cheap.' },
      { n: 3, h: 'Top-k selection &mdash; a sparse subset is chosen', d: 'Only the highest-scoring entries survive to the expensive path.' },
      { n: 4, h: 'Attention over the selection &mdash; expensive per read', d: 'Full-precision attention runs over what the indexer picked, not over the whole history.' },
      { n: 5, h: 'Output', d: 'Storage grows with context; read time barely does.', tone: 'ok' },
    ],
    note: 'V3.2 stores the selection as an fp8 latent plus a 132-byte indexer per token &mdash; (656 + 132) &times; 61 = 48,068 bytes per token.',
  },
  {
    file: 'deepseek-kv-v41-cache-pipeline.png',
    kind: 'figure',
    layout: 'flow',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Fig. 4 &middot; V4.1-Flash',
    title: 'The cache pipeline that reaches 890 bytes',
    sub: 'One global projection, shared across layers, stored at four bits, with a local window you can rebuild.',
    nodes: [
      { n: 1, h: 'One global KV projection &mdash; 890 B per token', d: 'Instead of a per-layer cache, a single projected representation covering the whole model.', tone: 'accent' },
      { n: 2, h: 'Shared across decoder layers', d: 'Every layer reads the same global cache rather than maintaining its own.' },
      { n: 3, h: 'Four bits, pooled', d: 'FP4 storage with pooling on top &mdash; the precision-for-bytes trade taken to its conclusion.' },
      { n: 4, h: 'A replayable local window', d: 'Recent tokens are recomputed rather than stored, which is why the footprint does not simply scale with context.', tone: 'ok' },
    ],
    note: 'DeepSeek&rsquo;s reported figure for V4.1-Flash is 890 bytes per token of global HBM at 1M context, against roughly 390,000 bytes for DeepSeek-V1 at 67B scale.',
  },
  {
    file: 'deepseek-kv-bytes-per-token-lineage.png',
    kind: 'figure',
    layout: 'bars',
    post: 'deepseek-kv-cache-optimization-research-paper.html',
    kicker: 'Fig. 5 &middot; Stored bytes per token',
    title: 'A 438&times; gap, drawn honestly',
    sub: 'Linear scale, deliberately: on a log-free axis the last three bars are nearly invisible, which is the point.',
    rows: [
      { label: 'DeepSeek LLM 7B &mdash; MHA', sublabel: 'November 2023 &middot; 4K context', value: '491,520 B', pct: 100, tone: 'dim' },
      { label: 'DeepSeek LLM 67B &mdash; GQA-8', sublabel: 'November 2023 &middot; the baseline', value: '389,120 B', pct: 79.2 },
      { label: 'DeepSeek-V3 &mdash; MLA', sublabel: 'December 2024', value: '70,272 B', pct: 14.3 },
      { label: 'DeepSeek-V2 &mdash; MLA', sublabel: 'May 2024', value: '69,120 B', pct: 14.1 },
      { label: 'DeepSeek-V3.2 &mdash; MLA + DSA', sublabel: 'September 2025', value: '48,068 B', pct: 9.8 },
      { label: 'V4-Pro &mdash; CSA + HCA + SWA', sublabel: 'April 2026 &middot; ~10% of V3.2', value: '~4,807 B', pct: 1.0, tone: 'open' },
      { label: 'V4-Flash &mdash; CSA + HCA + SWA', sublabel: 'April 2026 &middot; ~7% of V3.2', value: '~3,365 B', pct: 0.7, tone: 'open' },
      { label: 'V4.1-Flash &mdash; CSA2 + CED + FP4', sublabel: 'September 2026 &middot; the current floor', value: '890 B', pct: 0.7, hl: true, tag: '438&times; down' },
    ],
    note: 'V4 rows are percentages of V3.2 at 1M context per the V4 report and should be read as order-of-magnitude; their byte values here are that percentage applied to V3.2&rsquo;s published 48,068 bytes.',
  },

  /* ============ 3. DeepSeek FFN / MoE research paper ============ */
  {
    file: 'deepseek-moe-384-experts-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'deepseek-ffn-moe-evolution-research-paper.html',
    kicker: 'Deep-dive research paper · Architecture',
    title: 'From one giant FFN to 384 tiny experts',
    titleSm: true,
    sub: 'DeepSeek&rsquo;s feed-forward evolution, from the 67B dense baseline to V4.1-Flash &mdash; a 552B-parameter MoE that activates 8B parameters per token.',
    stats: [
      { v: '384+1', k: 'Routed and shared experts per layer, V4.1-Flash' },
      { v: '5.5%', k: 'V3 parameters active per token &mdash; 37B of 671B' },
      { v: '42.5%', k: 'Training cost saved by V2 over the dense 67B' },
      { v: '1.8&times;', k: 'Decode TPS from Multi-Token Prediction' },
    ],
    footnote: 'Every number cited against the papers, configs and serving stacks.',
  },
  {
    file: 'deepseek-moe-sparsity-ladder.png',
    kind: 'figure',
    layout: 'bars',
    post: 'deepseek-ffn-moe-evolution-research-paper.html',
    kicker: 'MoE evolution · Activation share',
    title: 'The sparsity ladder',
    sub: 'Activated parameters as a share of total, per release. The dense 67B baseline is the 100% reference.',
    rows: [
      { label: 'V1 67B dense', sublabel: '67B active, every token', value: '100%', pct: 100, tone: 'dim' },
      { label: 'V2 &mdash; 21B of 236B', sublabel: 'Fine-grained experts, shared experts', value: '8.9%', pct: 8.9 },
      { label: 'V3 &mdash; 37B of 671B', sublabel: '1 shared + 8 of 256 routed experts', value: '5.5%', pct: 5.5, tag: '3.1&times; the speed of V2' },
      { label: 'V4-Flash &mdash; 13B of 284B', sublabel: 'CSA + HCA + SWA attention', value: '4.6%', pct: 4.6 },
      { label: 'V4-Pro &mdash; 49B of 1.6T', sublabel: '1 shared + 6 of 384 routed experts', value: '3.1%', pct: 3.1 },
      { label: 'V4.1-Flash prefill &mdash; 8B of 552B', sublabel: '384 routed + 1 shared, FP4 expert weights', value: '1.4%', pct: 1.4, tone: 'open', hl: true, tag: '69:1 ratio' },
    ],
    note: 'V4.1-Flash activates 16B during decode, and adds a 196B-parameter conditional memory module &mdash; Engram &mdash; built from multi-head hashing. The 5.5% figure is V3&rsquo;s, and it is the one the industry quote.',
  },
  {
    file: 'deepseek-moe-training-economics.png',
    kind: 'figure',
    layout: 'grid',
    cols: 'c4',
    post: 'deepseek-ffn-moe-evolution-research-paper.html',
    kicker: 'MoE evolution · What it bought',
    title: 'Four numbers that made sparsity the default',
    sub: 'Measured against the dense 67B baseline DeepSeek started from &mdash; not against a competitor&rsquo;s chart.',
    cells: [
      { metric: '42.5%', metricTone: 'ok', h: 'Lower training cost', d: 'Multi-head latent attention plus the MoE conversion, versus the dense 67B baseline of the first paper.', tone: 'accent' },
      { metric: '5.76&times;', h: 'Maximum generation throughput', d: 'The same comparison, on the serving side: sparse activation buys decode bandwidth.' },
      { metric: '1.8&times;', h: 'Tokens per second with MTP', d: 'Multi-Token Prediction predicts several tokens per pass &mdash; a second, independent gain.' },
      { metric: '69:1', h: 'Backbone to active ratio', d: '552B parameters against 8B activated during prefill at V4.1-Flash &mdash; the widest separation in the line.' },
    ],
    note: 'The 1.8&times; MTP multiplier is treated as part of the model rather than an optimisation, and it stacks multiplicatively with the activation share.',
  },

  /* ============ 4. Context management / agent loops paper ============ */
  {
    file: 'ai-agent-context-management-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'context-management-agent-loops-research-paper.html',
    kicker: 'Deep-dive research paper · Agents',
    title: 'Your agent&rsquo;s context window is a budget',
    titleSm: true,
    sub: 'Why agent loops spend 100 tokens of input for every token they produce, what context rot does to recall, and the patterns that shorten the bill.',
    stats: [
      { v: '100:1', k: 'Input-to-output token ratio, Manus agent runs' },
      { v: '50', k: 'Tool calls in a typical task, each re-sending the trajectory' },
      { v: '51.4 &rarr; 67.6', k: 'BrowseComp, V3.2 with context management' },
      { v: '890 B', k: 'V4.1-Flash global KV bytes per token' },
    ],
    footnote: 'Every number cited against the papers, reports and production write-ups.',
  },
  {
    file: 'context-rot-measured.png',
    kind: 'figure',
    layout: 'bars',
    post: 'context-management-agent-loops-research-paper.html',
    kicker: 'Context rot · The measurements',
    title: 'Long context is not the same as recall',
    sub: 'Accuracy on associative recall, same models, different distances.',
    rows: [
      { label: 'Short-range recall', sublabel: 'The capability every vendor quotes', value: '99.3%', pct: 99.3, tone: 'open' },
      { label: 'The same task at 32K tokens', sublabel: 'Associative recall, unseen needles', value: '69.7%', pct: 69.7, tone: 'warn', hl: true, tag: '&minus;29.6 pts' },
      { label: 'NoLiMa: the cliff at 32K', sublabel: 'A drop bigger windows did not remove', value: '50%', pct: 50, tone: 'danger', tag: 'Half the baseline' },
    ],
    note: 'A model that holds 99.3% at short range and 69.7% at 32K is not a 128K model &mdash; it is a short-context model with a 128K mask. Failures arrive exactly where agent loops work: associative recall across a long tool trajectory.',
  },
  {
    file: 'context-management-payoff.png',
    kind: 'figure',
    layout: 'compare',
    post: 'context-management-agent-loops-research-paper.html',
    kicker: 'Context management · The payoff',
    title: 'What management actually buys',
    sub: 'Measured deltas from DeepSeek&rsquo;s own studies, plus the counter-example worth reading twice.',
    rows: [
      { label: 'DeepSeek-V3.2 BrowseComp', sub: 'Hard agentic search, with context management', before: '51.4', after: '67.6', delta: '+16.2 pts', dir: 'down', sub2: 'The study&rsquo;s own asterisked number' },
      { label: 'Multi-Query NIAH with Engram', sub: 'Memory moved into the weights', before: '84.2', after: '97.0', delta: '+12.8 pts', dir: 'down', sub2: '552B backbone + 196B Engram' },
      { label: 'Crude Discard-all', sub: 'The simplest possible compaction', after: '&minus;16.2 pts', delta: 'Recovered', dir: 'down', sub2: 'Versus an unmanaged overflow' },
      { label: 'Production defaults, tested', sub: 'The honest counterweight', after: '38%', delta: 'On memory probes', dir: 'up', sub2: 'At twice the baseline cost' },
    ],
    note: 'Every ordering in the pattern catalog has task-dependence published against it: reasonable-looking production defaults scored 38% on memory probes and cost twice the baseline in the Towards AI analysis.',
  },
  {
    file: 'context-constraint-decision-map.png',
    kind: 'figure',
    layout: 'grid',
    cols: 'c1',
    post: 'context-management-agent-loops-research-paper.html',
    kicker: 'Context management · Decision map',
    title: 'Name your constraint before you reach for a pattern',
    sub: 'The three failure modes show up together and are fixed separately &mdash; which is the documented 2026 mistake.',
    cells: [
      { tag: 'A. Window overflow', h: 'The trajectory genuinely does not fit', d: 'A 500-step harness, a 10M-token corpus. Reach for <strong>P2 compaction</strong>, <strong>P3 clearing</strong>, <strong>P5 offload</strong> and <strong>P7 isolation</strong>. Even crude Discard-all beat an unmanaged overflow by 16.2 BrowseComp points.', tone: 'accent' },
      { tag: 'B. Cost', h: 'Prefill dominates at a 100:1 skew', d: 'Fix the arithmetic first: <strong>P8 stabilise the prefix</strong> and cap outputs, then <strong>P9 native caching</strong> &mdash; and only then compact. On DeepSeek pricing, keeping everything usually wins.' },
      { tag: 'C. Quality rot', h: 'Recall drops and goals drift', d: 'Blind-judged recall falls, associative lookups fail, goals drift by turn 40. Reach for <strong>P4 recitation</strong> (a todo file), <strong>P6 just-in-time loading</strong> and <strong>P7 clean sub-agent windows</strong>. P5 only with a strong driver model.' },
    ],
    note: 'Then measure on your own workload. Fixing cost with the window&rsquo;s tools &mdash; summarising to save money &mdash; is the mistake the 2026 literature keeps documenting.',
  },

  /* ============ 5. How to build an AI agent ============ */
  {
    file: 'how-to-build-ai-agent-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'how-to-build-an-ai-agent-step-by-step-guide.html',
    kicker: 'Step-by-step guide · 2026',
    title: 'How to Build an AI Agent',
    sub: 'Thirteen steps from the first question to production, the five-component anatomy every framework hides, and the four lines that are the whole loop.',
    stats: [
      { v: '13', k: 'Steps, from first question to production' },
      { v: '3', k: 'Core components: model + tools + instructions' },
      { v: '5', k: 'Composable workflow patterns, per Anthropic' },
      { v: '~80', k: 'Lines of Python by the end of Part II' },
    ],
    footnote: 'Grounded in Anthropic, OpenAI and Hugging Face documentation, plus production write-ups.',
  },
  {
    file: 'ai-agent-canonical-anatomy.png',
    kind: 'figure',
    layout: 'flow',
    post: 'how-to-build-an-ai-agent-step-by-step-guide.html',
    kicker: 'Agent anatomy',
    title: 'The parts of an agent, in the order they fail',
    sub: 'Strip the frameworks away and this is what you are left building.',
    nodes: [
      { n: 1, h: 'Model', d: 'Reasoning and decision-making. Receives messages, returns either an answer or a tool call.' },
      { n: 2, h: 'Tools', d: 'External functions with schemas &mdash; the agent&rsquo;s hands. Three types: data, action and orchestration.' },
      { n: 3, h: 'Instructions', d: 'The system prompt: role, policy, edges and the output contract.' },
      { n: 4, h: 'Memory / context', d: 'Everything the loop has seen, curated per turn. This is the step most teams under-build.' },
      { n: 5, h: 'The loop', d: 'Call the model &rarr; if it returns a tool call, execute, append the result and repeat &middot; if it returns an answer, exit &middot; on error or max turns, exit.', tone: 'accent' },
      { n: 6, h: 'Boundary', d: 'Guardrails on input and output, human escalation paths, and evaluation outside the loop.', tone: 'ok' },
    ],
    note: 'The order of the guide&rsquo;s chapters is the recommended order of implementation &mdash; and the order in which these parts tend to break.',
  },
  {
    file: 'ai-agent-loop-code.png',
    kind: 'figure',
    layout: 'code',
    post: 'how-to-build-an-ai-agent-step-by-step-guide.html',
    kicker: 'The loop, precisely',
    title: 'The whole loop is four lines',
    sub: 'smolagents publishes it as pseudocode, and it is the honest skeleton of every agent in production.',
    codeTitle: 'the multi-step agent \u2014 smolagents, Dec 2024',
    lines: [
      { code: 'memory = [<span class="str">user_defined_task</span>]', note: 'the trajectory, pre-filled' },
      { code: '<span class="key">while</span> llm_should_continue(memory):', note: 'this loop is the multi-step part' },
      { code: '&nbsp;&nbsp;&nbsp;&nbsp;action = llm_get_next_action(memory)', note: 'this is the tool-calling part' },
      { code: '&nbsp;&nbsp;&nbsp;&nbsp;observations = execute_action(action)', note: 'ground truth from the environment' },
      { code: '&nbsp;&nbsp;&nbsp;&nbsp;memory += [action, observations]', note: 'the context grows, monotonically' },
    ],
    note: 'Every arrow that appends tokens costs you on the next pass: nothing in the trajectory is free to re-derive. That is why an agent run spends about 100 input tokens per output token, and why context engineering is a build step rather than a nicety.',
  },
  {
    file: 'ai-agent-five-workflow-patterns.png',
    kind: 'figure',
    layout: 'grid',
    cols: 'c2',
    post: 'how-to-build-an-ai-agent-step-by-step-guide.html',
    kicker: 'Workflow patterns · Anthropic',
    title: 'Five patterns, plus the row they graduate into',
    sub: 'Not rungs on a complexity ladder &mdash; a palette. Each has a when-to-use test and a cost profile.',
    cells: [
      { tag: 'Prompt chaining', h: 'Your code decides, in fixed order', d: 'Use when a task decomposes cleanly into fixed subtasks, and you would trade latency for accuracy. The gate between calls is deterministic validation. <em>Cost: linear.</em>' },
      { tag: 'Routing', h: 'A classifier picks one hop', d: 'Use when categories are distinct and classification is accurate. This is where the model ladder becomes architecture &mdash; hard questions to a frontier model, easy ones down a tier. <em>Cost: 1 + branch.</em>' },
      { tag: 'Parallelization', h: 'Your code fans out', d: 'Sectioning or voting. Use when subtasks are independent, or when several perspectives raise confidence &mdash; each consideration gets its own call. <em>Cost: N&times; concurrent.</em>' },
      { tag: 'Orchestrator-workers', h: 'An orchestrator LLM plans', d: 'Use when the subtasks cannot be predicted: multi-file changes, multi-source research. Most agent-like while staying bounded &mdash; workers run with clean context. <em>Cost: dynamic.</em>' },
      { tag: 'Evaluator-optimizer', h: 'Your code bounds the loop', d: 'One call generates, another critiques. Use when criteria are clear and refinement demonstrably helps &mdash; literary translation, iterative search. <em>Cost: 2&times; per round.</em>' },
      { tag: 'The agent itself', h: 'The model decides every turn', d: 'Open-ended tasks, steps unpredictable, trust already established. The only row whose cost is unbounded &mdash; which is why you cap iterations before you ship.', tone: 'accent', metric: '&infin;', metricTone: 'accent' },
    ],
    note: 'Cost profiles are this guide&rsquo;s annotation on Anthropic&rsquo;s five patterns; the sixth row is what they graduate into once the workflow&rsquo;s fixed code paths stop fitting.',
  },

  /* ============ 6. Bonsai 2 27B ============ */
  {
    file: 'bonsai-2-27b-5-9gb-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'bonsai-2-27b-ternary-quantization-deep-dive.html',
    kicker: 'Deep-dive research paper · Quantisation',
    title: 'A 27B model that fits in 5.9 GB',
    titleSm: true,
    sub: 'Prism ML compressed a 27-billion-parameter reasoning model to 1.76 bits per weight &mdash; about a ninth of its full-precision footprint &mdash; and kept 98.2% of its intelligence.',
    stats: [
      { v: '5.93 GB', k: 'Language-model footprint, as shipped' },
      { v: '1.76', k: 'Bits per weight, Ternary g128 format' },
      { v: '98.2%', k: 'Of FP16 intelligence retained' },
      { v: '143 tok/s', k: 'Peak decode on a single RTX 5090' },
    ],
    footnote: 'Built on Qwen3.8-27B with the architecture unchanged; 20 benchmarks, twelve hardware stacks.',
  },
  {
    file: 'bonsai-2-27b-footprint-vs-4bit.png',
    kind: 'figure',
    layout: 'bars',
    post: 'bonsai-2-27b-ternary-quantization-deep-dive.html',
    kicker: 'Bonsai 2 27B · The footprint ladder',
    title: 'Three times smaller than four-bit, within 0.4 points',
    sub: 'Language-model weights in decimal GB, with the benchmark average each build reaches on the same suite.',
    rows: [
      { label: 'FP16 baseline &mdash; 16.0 bits/weight', sublabel: 'The reference build, score 86.32', value: '53.8 GB', pct: 100, tone: 'dim' },
      { label: 'UD-Q4_K_XL &mdash; 5.2 true bits/weight', sublabel: 'Conventional four-bit quantisation, score 85.18', value: '17.6 GB', pct: 33, tone: 'warn', tag: '98.7% of FP16' },
      { label: 'Bonsai 2 27B &mdash; 1.76 bits/weight', sublabel: 'Ternary g128, score 84.78', value: '5.93 GB', pct: 11, tone: 'open', hl: true, tag: '98.2% of FP16' },
    ],
    note: 'Fifteen of twenty benchmarks land within a point of the FP16 baseline, including LiveCodeBench at 90.07 against 90.05. What collapses at conventional two-bit precision is sustained reasoning, not knowledge &mdash; IQ2_XXS falls to 78.6 on AIME26 while still posting 85.79 on MMLU-Redux.',
  },
  {
    file: 'bonsai-ternary-quantization-explained.png',
    kind: 'figure',
    layout: 'flow',
    post: 'bonsai-2-27b-ternary-quantization-deep-dive.html',
    kicker: 'Bonsai 2 27B · How it works',
    title: 'What ternary quantisation changes',
    sub: 'The published pipeline, from full-precision weights to 143 tokens per second on consumer hardware.',
    nodes: [
      { n: 1, h: 'Full-precision weights', d: '53.8 GB for 27B parameters, and the reason this model normally needs a datacentre card.' },
      { n: 2, h: 'A Hadamard rotated basis', d: 'The weights are rotated before quantisation &mdash; the trick that makes three levels survivable rather than destructive.' },
      { n: 3, h: 'Ternary g128', d: 'Prism ML&rsquo;s format for the post-training ternarisation lineage &mdash; three weight levels per group instead of a continuum. <span class="chips"><span class="chipw">&minus;1</span><span class="chipw">0</span><span class="chipw">+1</span></span>' },
      { n: 4, h: '1.76 bits per weight', d: 'Against a stated information-theoretic target of 1.75&ndash;1.76 bits at 5.93&ndash;5.95 GB &mdash; roughly 9.0&ndash;9.1&times; smaller than FP16.', tone: 'accent' },
      { n: 5, h: 'Hybrid-attention low-bit kernels', d: 'The runtime half of the release: without kernels that keep low-bit matmuls on the fast path, the compression would not become throughput.', tone: 'ok' },
    ],
    note: 'The measured result on an H100 at batch 1: 104.8 &rarr; 143.8 tok/s across the binary and ternary builds, and about 130&ndash;143 tok/s of 27B-class decode from a single RTX 5090.',
  },

  /* ============ 4. System One decision models deep dive ============ */
  {
    file: 'system-one-decision-models-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'system-one-decision-models-deep-dive.html',
    kicker: 'Deep dive &middot; System One decision models',
    title: 'Jev and the seven open clones',
    sub: 'A model that never writes a token: TypeSafe&rsquo;s Jev reads a block of state and answers typed questions with calibrated probabilities instead of text. Seven open projects rebuilt the idea in a week &mdash; the architecture, the shared KV cache, and what the benchmarks really say.',
    stats: [
      { v: '0', k: 'output tokens &mdash; the answer is one position&rsquo;s logits' },
      { v: '0.966 vs 0.720', k: 'Jev vs best open, 49-task jabr benchmark' },
      { v: '5.21&times;', k: 'faster than generating the same 21 answers as JSON' },
      { v: '144 KiB', k: 'KV cache per token on a 4B model' },
    ],
    footnote: 'Eight models, three question types, every figure attributed to a primary source.',
  },
  {
    file: 'system-one-kv-cache-flow.png',
    kind: 'figure',
    layout: 'flow',
    post: 'system-one-decision-models-deep-dive.html',
    kicker: 'Fig. 1 &middot; The mechanism',
    title: 'Prefill once, share the cells, read one position',
    sub: 'The KV economics that explain almost every latency number in this article. The state is paid for once; the questions are nearly free.',
    nodes: [
      { n: 1, h: 'The state goes in first', d: 'A support ticket, a DOM, a game frame or a log line &mdash; prefilled into the KV cache a single time.' },
      { n: 2, h: 'Every question branches off the same state', d: 'The branches <em>share the state&rsquo;s KV cells instead of copying them</em>, and their text runs together in one unpadded micro-batch.' },
      { n: 3, h: 'One prefill plus a handful of micro-batches', d: 'Rizzo Flow&rsquo;s worked example: eight yes/no questions over a 218-token contract cost one prefill and two micro-batches &mdash; 136 ms in total, rather than eight separate passes.', tone: 'accent' },
      { n: 4, h: 'Read the answer letters at one position', d: 'The logits over the allowed options, softmaxed in plain code. Nothing is sampled, so the cache does not grow while the model answers.' },
      { n: 5, h: 'Which keeps the questions blind to each other', d: 'A code hidden in a sibling question reads P&nbsp;=&nbsp;0.00; the same code placed in the state reads 0.90&ndash;0.92. That isolation is what makes parallel questions safe.', tone: 'ok' },
    ],
    note: 'Cost is linear in the state and flat in the question count: Jev measures ~59 ms plus 5.5 ms per 1k state tokens, 76 ms for 2 options against 75.5 ms for 200, and 5,000 questions over a 22.8k-token state in 1.8 s. The cache is sized by the state, not by the questions &mdash; roughly 144 KiB per token on Rizzo Flow&rsquo;s 4B, or about 4.8 GiB at 32k.',
  },
  {
    file: 'system-one-eight-models.png',
    kind: 'figure',
    layout: 'grid',
    cols: 'c4',
    post: 'system-one-decision-models-deep-dive.html',
    kicker: 'Fig. 2 &middot; The field',
    title: 'The same interface, eight different bets',
    sub: 'Every project here answers typed questions and reads the answer out of logits. What differs is the backbone, whether it generates at all, and what you are expected to do with it.',
    cells: [
      { tag: 'Hosted &middot; reference', h: 'Jev', d: 'Closed, no weights. Three primitives, 0.966 macro on the independent suite, $0.042 per million input tokens with output free.', tone: 'accent' },
      { tag: 'Encoder', h: 'Von', d: '395M ModernBERT. 0.720 &mdash; the best open zero-shot entrant. Serves from a CPU in under 15 ms, with no KV cache at all.' },
      { tag: 'Encoder &middot; fine-tune it', h: 'Laya', d: '421M ModernBERT-large plus a decision head, 100+ languages behind a script-detecting router. Near chance zero-shot; strong once specialised.' },
      { tag: 'Drop-in wire format', h: 'Kev', d: 'Rank-16 LoRA plus a pointer head on Qwen3.5/3.8 at 0.8B, 4B and 9B. Serves TypeSafe&rsquo;s own /v1/systemone contract, so existing code survives.' },
      { tag: 'Trains nothing', h: 'SemIf', d: 'Reads typed option probabilities straight off a frozen Qwen3.5-4B you already host. 5.21&times; faster than generating the same answers as JSON.' },
      { tag: 'Recipe', h: 'Nimble', d: 'Qwen3.5-9B plus LoRA, and the contrastive data-curation method published end to end. 292/324 on its own held-out set against Jev&rsquo;s 302.' },
      { tag: 'llama.cpp', h: 'Rizzo Flow', d: 'Spark-X2.5-4B plus LoRA. Four commands, any GPU or none, and the most candid benchmark table of the group.' },
      { tag: 'Control loop', h: 'NanoJev', d: 'Qwen3-0.6B plus decision heads. 128/128 on ViZDoom Basic against Jev&rsquo;s 56/128 &mdash; on the games it was trained on.' },
    ],
    note: 'Ordered by approach, not by score. Star counts and repository figures were read on 6 October 2026; every project here is under three weeks old and moving daily.',
  },
  {
    file: 'system-one-accuracy-latency-trade.png',
    kind: 'figure',
    layout: 'bars',
    post: 'system-one-decision-models-deep-dive.html',
    kicker: 'Fig. 3 &middot; The trade, measured',
    title: 'Six times the speed, twenty-five points of accuracy',
    sub: 'Mean latency per task on the jabr v2 suite &mdash; 49 tasks, 866 cases, Apple MPS &mdash; with each model&rsquo;s macro accuracy in the row. The bars measure time, not quality.',
    rows: [
      { label: 'TypeSafe Jev 1.13', sublabel: 'Hosted &middot; macro accuracy 0.966', value: '330 ms', pct: 100, hl: true, tag: 'The reference' },
      { label: 'GLiNER2', sublabel: 'Local, ~300M &middot; macro accuracy 0.684', value: '73 ms', pct: 22, tag: 'Slower and less accurate than Von' },
      { label: 'Von 1.1', sublabel: 'Local, 395M &middot; macro accuracy 0.720', value: '53 ms', pct: 16, tone: 'open', tag: 'Best open on both axes' },
      { label: 'Laya', sublabel: 'Local, 421M &middot; macro accuracy 0.583', value: '46 ms', pct: 14, tag: 'Fastest, least accurate' },
    ],
    note: 'Von beats GLiNER2 on accuracy <em>and</em> on latency, which is why it is the open model this article recommends for zero-shot work: the other two encoders are not a different bargain, only a worse one. Free and local is the other half of the trade &mdash; Jev costs about $0.000014 per call on this suite, and the other three cost nothing but your own hardware.',
  },

  /* ============ 5. Decision models vs rerankers ============ */
  {
    file: 'decision-vs-reranker-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'decision-models-vs-rerankers.html',
    kicker: 'Deep dive &middot; Architecture',
    title: 'Decision models vs rerankers',
    sub: 'Both score an input and neither writes a token. One returns a raw logit you may only sort by; the other returns a probability you can threshold &mdash; and only one of those can stand in for the other.',
    stats: [
      { v: '0', k: 'output tokens from either model' },
      { v: 'Raw logit', k: 'what a reranker returns' },
      { v: 'Calibrated', k: 'what a decision model returns' },
      { v: '50 &rarr; 10', k: 'the reranker&rsquo;s standard job' },
    ],
    footnote: '15 models, two contracts, one substitution test in each direction.',
  },
  {
    file: 'decision-vs-reranker-pipeline.png',
    kind: 'figure',
    layout: 'flow',
    post: 'decision-models-vs-rerankers.html',
    kicker: 'Fig. 1 &middot; Placement',
    title: 'They sit on either side of the pipeline',
    sub: 'Retrieval is a problem where the answer set is already in hand. Judgement is a problem where you have to define the options first.',
    nodes: [
      { n: 1, h: 'Recall &mdash; an embedding model', d: 'Turns a corpus into 50&ndash;100 plausible candidates. Neither family in this article works here; a decision model has no recall stage at all.', tone: 'warn' },
      { n: 2, h: 'Precision &mdash; the reranker', d: 'Scores each query&ndash;document pair with full cross-attention and keeps the top 5&ndash;10. This is its entire job, and it does it independently per document.', tone: 'accent' },
      { n: 3, h: 'Generate &mdash; a frontier model', d: 'Writes the answer from the retrieved context. The only stage here that produces tokens.' },
      { n: 4, h: 'Arbitrate &mdash; the decision model', d: 'Routes, guards, verifies and thresholds <em>around</em> the model: labels you defined at request time, probabilities you can act on, abstention when neither fits.', tone: 'ok' },
    ],
    note: 'Only stage 2 looks outward at candidates the world supplied. Stage 4 looks at state you assembled and questions you formulated &mdash; that directional difference, not the architecture, is what stops the two from being interchangeable.',
  },
  {
    file: 'decision-vs-reranker-context.png',
    kind: 'figure',
    layout: 'bars',
    post: 'decision-models-vs-rerankers.html',
    kicker: 'Fig. 2 &middot; Published limits',
    title: 'Context, and where it actually goes',
    sub: 'Tokens a reranker handles <em>per pair</em> against tokens a decision model gets for <em>everything</em> &mdash; state plus every question in the request.',
    rows: [
      { label: 'Qwen3-Reranker 4B / 8B', sublabel: 'Reranker &middot; per query-document pair', value: '32,768', pct: 100, tone: 'open' },
      { label: 'Jev', sublabel: 'Decision model &middot; state plus longest question', value: '32,768', pct: 100, hl: true },
      { label: 'Nimble 9B', sublabel: 'Decision model &middot; latest checkpoint', value: '8,192', pct: 25 },
      { label: 'Rizzo Flow 4B', sublabel: 'Decision model &middot; default limit', value: '8,192', pct: 25 },
      { label: 'BGE-Reranker-v2-M3', sublabel: 'Reranker &middot; the safe default', value: '512', pct: 1.6, tone: 'dim' },
      { label: 'Laya (English, ONNX client)', sublabel: 'Decision model &middot; state is truncated here', value: '512', pct: 1.6, tone: 'dim' },
    ],
    note: 'The comparison is asymmetric by design: a reranker re-reads its pair from scratch, so its budget is per document, while a decision model spends one budget across a shared state and every question asked against it. That is why chapter 7&rsquo;s substitution test fails &mdash; ten passages do not fit in a 192-token option budget, and one long document costs the decision model its whole window.',
  },
  /* ============ 6. Local voice: TTS + STT ============ */
  {
    file: 'local-voice-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'local-voice-models-2026.html',
    kicker: 'Ranking &middot; Voice AI',
    title: 'Voice, run locally',
    sub: 'Open-weight text-to-speech has gone past ElevenLabs on a blind Elo board, and a 600M-parameter transcriber now beats Whisper large-v3 over the same eight English test sets. Both families run on hardware you already own.',
    stats: [
      { v: '1,215', k: 'best open-weight TTS Elo &mdash; ahead of ElevenLabs v3 at 1,177' },
      { v: '82M', k: 'Kokoro: a top-six voice that fits on a laptop CPU' },
      { v: '6.32%', k: 'best open English WER &mdash; from a 600M model' },
      { v: '3,332&times;', k: 'its real-time factor, against Whisper&rsquo;s 145' },
    ],
    footnote: '27 models, two leaderboards, every figure dated and attributed.',
  },
  {
    file: 'voice-tts-arena.png',
    kind: 'figure',
    layout: 'bars',
    post: 'local-voice-models-2026.html',
    kicker: 'Fig. 1 &middot; Blind listening tests',
    title: 'The open-weight TTS board, August 2026',
    sub: 'Artificial Analysis Speech Arena Elo: two clips of the same text, judged without knowing the maker. The two closed models are shown as reference points.',
    rows: [
      { label: 'Cartesia Sonic 3.6', sublabel: 'Proprietary &middot; overall board leader', value: '1,283', pct: 100, tone: 'dim', tag: 'The frontier, for reference' },
      { label: 'Breeze TTS 2', sublabel: '3B &middot; weights released 25 Aug 2026', value: '1,215', pct: 95, hl: true, tag: 'First open weights past ElevenLabs' },
      { label: 'ElevenLabs Eleven v3', sublabel: 'Proprietary &middot; $100 per million characters', value: '1,177', pct: 92, tone: 'dim', tag: 'The flagship it displaced' },
      { label: 'Fish Audio S2 Pro', sublabel: '4B + 400M dual-AR &middot; non-commercial', value: '1,125', pct: 88, tag: '15,000 inline prosody tags' },
      { label: 'Step Audio EditX', sublabel: '3B audio LLM &middot; Apache 2.0', value: '1,102', pct: 86, tone: 'open', tag: 'Highest-ranked model you can ship' },
      { label: 'Voxtral TTS', sublabel: 'Mistral &middot; CC BY-NC 4.0', value: '1,082', pct: 84, tag: 'Best controlled-voice cloner' },
      { label: 'Kokoro 82M', sublabel: '82M &middot; Apache 2.0', value: '1,060', pct: 83, tone: 'open', tag: 'Runs on a CPU, no cloning' },
      { label: 'Chatterbox', sublabel: 'Resemble AI &middot; MIT', value: '1,020', pct: 79, tag: '23 languages, emotion control' },
      { label: 'Zonos-v0.1', sublabel: 'Zyphra &middot; Apache 2.0', value: '1,000', pct: 78, tone: 'open', tag: '44 kHz from 6 GB VRAM' },
    ],
    note: 'Breeze&rsquo;s 90-point lead over Fish collapses to a three-way tie (1,000&ndash;1,010) on the Controlled Voice Arena added in July 2026, where every model clones the same eight voices. Its built-in voices are outstanding; its cloning is ordinary. Rank the board by the job &mdash; and note that four of the nine models here cannot be shipped commercially.',
  },
  {
    file: 'voice-stt-wer.png',
    kind: 'figure',
    layout: 'bars',
    post: 'local-voice-models-2026.html',
    kicker: 'Fig. 2 &middot; Same audio, every model',
    title: 'A 600M model beats a 24B model',
    sub: 'Average word error rate over eight identical English test sets &mdash; Open ASR Leaderboard, retrieved 18 August 2026. Shorter is better; parameter count is in each label.',
    rows: [
      { label: 'Parakeet TDT 0.6B v3', sublabel: '0.6B &middot; 3,332&times; real-time &middot; 25 European languages', value: '6.32%', pct: 50, hl: true, tag: 'Best on both axes' },
      { label: 'Voxtral Small 24B', sublabel: '24B &middot; 54&times; real-time', value: '6.62%', pct: 52, tag: 'Forty times the size, still behind' },
      { label: 'Moonshine streaming-medium', sublabel: '0.245B &middot; best on meeting audio, AMI 10.68%', value: '6.66%', pct: 53, tone: 'open', tag: 'Beats Whisper with 6&times; fewer parameters' },
      { label: 'Whisper large-v3', sublabel: '1.55B &middot; ~10 GB VRAM &middot; ~99 languages', value: '7.44%', pct: 59, tone: 'open', tag: 'The default' },
      { label: 'Whisper large-v3-turbo', sublabel: '0.8B &middot; same weights, fewer layers', value: '7.83%', pct: 62, tag: 'Cheap speed inside the Whisper family' },
      { label: 'Moonshine base', sublabel: '0.0615B &middot; 566&times; real-time', value: '9.99%', pct: 79, tag: 'The CPU and streaming pick' },
      { label: 'Moonshine tiny', sublabel: '0.0271B &middot; 753&times; real-time', value: '12.65%', pct: 100, tone: 'dim', tag: 'The floor of the field' },
    ],
    note: 'Parameter count has stopped predicting accuracy in ASR: the 600M model leads, a 245M model beats the 1.55B default, and a 24B model lands second. Every model here roughly quintuples its error rate on accented speech, and meeting audio runs 4&ndash;6&times; worse than clean read speech &mdash; LibriSpeech-clean is solved and separates nothing.',
  },

  /* ============ 7. Local image generation ============ */
  {
    file: 'local-image-hero.png',
    kind: 'hero',
    layout: 'hero',
    post: 'local-image-generation-2026.html',
    kicker: 'Ranking &middot; Image generation',
    title: 'Image generation, locally',
    sub: 'Eight open-weight models, one GPU, no per-image bill: FLUX for prompt adherence, Qwen-Image for words in the pixels, SDXL for the LoRA ecosystem &mdash; and two licences that decide what you may ship.',
    stats: [
      { v: '32B', k: 'FLUX.2 [dev] &mdash; the ceiling, on a quantised 4090' },
      { v: '8 steps', k: 'Z-Image Turbo: about 2.3 s per 1024&sup2; image on a 4090' },
      { v: '20B', k: 'Qwen-Image &mdash; Apache 2.0, the text renderer' },
      { v: '6&ndash;8 GB', k: 'SDXL: oldest and smallest, biggest LoRA library' },
    ],
    footnote: 'Eight models, licences and VRAM floors from each model card, dated 6 October 2026.',
  },
  {
    file: 'image-models-field.png',
    kind: 'figure',
    layout: 'grid',
    cols: 'c4',
    post: 'local-image-generation-2026.html',
    kicker: 'Fig. 1 &middot; The field',
    title: 'Eight models, seven different jobs',
    sub: 'Parameters, licence and the one thing each model is actually for. The licence column decides before quality does.',
    cells: [
      { tag: '12B &middot; non-commercial', h: 'FLUX.1 [dev]', d: 'The photoreal and prompt-adherence default: rectified flow, 20&ndash;28 steps, ~12 GB at GGUF Q4. Free to iterate on, not to sell.', tone: 'accent' },
      { tag: '12B &middot; Apache 2.0', h: 'FLUX.1 [schnell]', d: 'The distilled sibling: 1&ndash;4 steps, the same lineage, commercial-safe. The FLUX pick you can ship.' },
      { tag: '32B &middot; non-commercial', h: 'FLUX.2 [dev]', d: 'Quality ceiling of 25 November 2025: generation and editing, realistically a quantised RTX 4090.' },
      { tag: '4B &middot; Apache 2.0', h: 'FLUX.2 [klein]', d: 'January 2026: 4 steps, sub-second on a 3090 or 4070, ~13 GB. The speed pick inside the FLUX lineage.', tone: 'ok' },
      { tag: '3.5B &middot; OpenRAIL++', h: 'SDXL 1.0', d: 'July 2023 and still the ecosystem: the largest library of community LoRAs, checkpoints and ControlNets, 6&ndash;8 GB.' },
      { tag: '8.1B &middot; Community licence', h: 'SD 3.5 Large', d: 'The mid-ground: ~28 steps, fp8 in ~12 GB, text rendering noticeably better than SDXL.' },
      { tag: '20B MMDiT &middot; Apache 2.0', h: 'Qwen-Image', d: 'Text in the image, full stop: multi-line layouts, posters and signage in English and Chinese, GGUF Q4 in 12&ndash;13 GB.', tone: 'open' },
      { tag: '6B &middot; Apache 2.0', h: 'Z-Image Turbo', d: 'Eight distilled steps, about 2.3 s per 1024&sup2; image on a 4090, under 16 GB &mdash; with a LoRA library still in its infancy.' },
    ],
    note: 'Both FLUX [dev] models are non-commercial: they are the models you prototype on, not the ones you ship. The 7B Qwen-Image-2.0 (February 2026) is the lighter sibling of the 20B text renderer, and SDXL&rsquo;s column is the one that has barely moved in three years &mdash; ecosystem, not architecture.',
  },
  {
    file: 'image-models-vram.png',
    kind: 'figure',
    layout: 'bars',
    post: 'local-image-generation-2026.html',
    kicker: 'Fig. 2 &middot; The floor',
    title: 'What each model actually needs',
    sub: 'Minimum VRAM for the build people really run &mdash; quantised (GGUF Q4 or fp8) wherever a quant is the normal path. Shorter is cheaper.',
    rows: [
      { label: 'SDXL 1.0', sublabel: '3.5B &middot; OpenRAIL++ &middot; ~25&ndash;30 steps', value: '6&ndash;8 GB', pct: 29, tone: 'open', tag: 'The cheapest door in' },
      { label: 'FLUX.1 [dev] / [schnell]', sublabel: '12B &middot; GGUF Q4 &middot; 1&ndash;28 steps', value: '~12 GB', pct: 43, tag: 'The 12 GB standard' },
      { label: 'SD 3.5 Large', sublabel: '8.1B &middot; fp8 &middot; ~28 steps', value: '~12 GB', pct: 43, tag: 'Mid-ground quality' },
      { label: 'Qwen-Image', sublabel: '20B MMDiT &middot; GGUF Q4 &middot; ~20&ndash;30 steps', value: '12&ndash;13 GB', pct: 46, tag: 'The text renderer' },
      { label: 'FLUX.2 [klein]', sublabel: '4B &middot; 4 steps &middot; Apache 2.0', value: '~13 GB', pct: 46, hl: true, tag: 'Sub-second on a 3090/4070' },
      { label: 'Z-Image Turbo', sublabel: '6B &middot; 8 steps &middot; Apache 2.0', value: '&lt;16 GB', pct: 57, tag: '~2.3 s per 1024&sup2; image on a 4090' },
      { label: 'FLUX.2 [dev]', sublabel: '32B &middot; ~20&ndash;28 steps &middot; non-commercial', value: '24 GB', pct: 86, tone: 'dim', tag: '4090-class, quantised, or don&rsquo;t' },
    ],
    note: 'These are practical floors for quantised builds; the fp16 originals need more. NVIDIA shipped FP8 builds of the FLUX.2 family for RTX on 25 November 2025 with a stated 40% performance gain &mdash; quantisation is the normal path for image models now, not the workaround, and it is why a 20B model fits on a 16 GB card.',
  },
];

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */
function buildHtml(img) {
  const body = LAYOUTS[img.layout](img);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(img.file)}</title><style>${CSS}</style></head>
<body class="${img.kind}"><div class="card">${body}</div></body></html>`;
}

async function render(browser, img, check = false) {
  const page = await browser.newPage();
  const isHero = img.kind === 'hero';
  await page.setViewport({
    width: CARD_W[img.kind],
    height: isHero ? HERO_H : FIGURE_MIN_H,
    deviceScaleFactor: CARD_SCALE[img.kind],
  });
  await page.setContent(buildHtml(img), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const outPath = path.join(OUT_DIR, img.file);
  let problems = [];
  if (check) problems = await page.evaluate(checkLayout);
  else await page.screenshot({ path: outPath, fullPage: !isHero, type: 'png' });

  const { width, height } = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight,
  }));
  await page.close();
  const scale = CARD_SCALE[img.kind];
  return { file: img.file, w: width * scale, h: height * scale, problems, hero: isHero };
}

/** Layout self-check: catches clipped text, horizontal overflow and hero overrun. */
function checkLayout() {
  const problems = [];
  const limit = document.body.clientWidth;
  const docH = document.body.scrollHeight;
  const isHero = document.body.classList.contains('hero');

  if (isHero && docH > 631) problems.push(`hero content is ${docH}px tall (viewport 630 - clipped)`);

  document.querySelectorAll('.card *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const label = `${el.className || el.tagName}${el.textContent ? `: ${el.textContent.trim().slice(0, 42)}` : ''}`;
    if (r.right > limit + 1) problems.push(`overflows right (${Math.round(r.right)}px): ${label}`);
    if (r.bottom > docH + 1) problems.push(`overflows bottom: ${label}`);
    if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && getComputedStyle(el).overflow !== 'visible') {
      problems.push(`clipped text: ${label}`);
    }
  });
  return problems;
}

async function writeReviewSheet(images, results) {
  const rows = results
    .map((r) => {
      const spec = images.find((i) => i.file === r.file);
      return `<figure><img src="blog/${r.file}" alt="${r.file}"><figcaption><b>${r.file}</b><br>${r.w}&times;${r.h} &middot; ${spec.layout} &middot; ${spec.kind} &middot; ${spec.post}</figcaption></figure>`;
    })
    .join('\n');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Post image review</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#f6f7f9;color:#1a2233;margin:0;padding:24px}
h1{font-size:20px;margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
figure{margin:0;background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:12px}
img{width:100%;height:auto;display:block;border-radius:8px;border:1px solid #eef1f6}
figcaption{font-size:11.5px;color:#46506a;margin-top:9px;line-height:1.4}</style></head>
<body><h1>Generated post images (${results.length})</h1><div class="grid">${rows}</div></body></html>`;
  await fs.writeFile(REVIEW_PATH, html, 'utf8');
  return REVIEW_PATH;
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null;
  const kindArg = process.argv.find((a) => a.startsWith('--kind='));
  const kind = kindArg ? kindArg.split('=')[1].toLowerCase() : null;
  let images = only ? IMAGES.filter((i) => i.file.toLowerCase().includes(only)) : IMAGES;
  if (kind) images = images.filter((i) => i.kind === kind);

  if (!images.length) {
    console.error(`No images match --only=${only}`);
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });

  const checkOnly = process.argv.includes('--check');
  const results = [];
  try {
    for (const img of images) {
      process.stdout.write(`  ${checkOnly ? 'checking ' : 'rendering'} ${img.file} ... `);
      const r = await render(browser, img, checkOnly);
      results.push(r);
      if (checkOnly) {
        console.log(r.problems.length ? `${r.problems.length} problem(s)` : `ok (${r.w}x${r.h})`);
        r.problems.forEach((p) => console.log(`      ! ${p}`));
      } else {
        console.log(`${r.w}x${r.h}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (checkOnly) {
    const bad = results.filter((r) => r.problems.length);
    console.log(`\n${results.length - bad.length}/${results.length} cards laid out cleanly`);
    return;
  }

  console.log(`\n${results.length} image(s) written to blog/`);
  if (process.argv.includes('--review')) {
    const p = await writeReviewSheet(IMAGES, results);
    console.log(`Review sheet: ${p}`);
  }
}

main().catch((err) => {
  console.error('Image generation failed:', err);
  process.exit(1);
});
