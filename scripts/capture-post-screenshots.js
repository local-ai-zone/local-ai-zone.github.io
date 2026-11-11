#!/usr/bin/env node
/**
 * Capture a real screenshot for one of the blog's prepared photo slots.
 *
 * Serves this repository over a throwaway local port (so pages that fetch
 * gguf_models.json work), loads a page in headless Chrome and screenshots it at the
 * slot's aspect ratio.
 *
 *   node scripts/capture-post-screenshots.js --slot=dispatch
 *   node scripts/capture-post-screenshots.js --slot=ffn --url=http://127.0.0.1:8080
 *   node scripts/capture-post-screenshots.js --slot=agent --url=http://127.0.0.1:8080 \
 *        --wait-for=".message" --scroll=400
 *   node scripts/capture-post-screenshots.js --slot=kv --url=http://127.0.0.1:8080 --full
 *
 * Anything a browser can render counts: your own model browser, a local llama.cpp web UI,
 * a hosted dashboard you are signed into, or a cloud GPU console. Physical photos (a GPU
 * on a desk) have to come from a camera — see scripts/PHOTO_SLOTS.md.
 *
 * After capturing, publish it with:
 *   python scripts/install-post-photo.py --slot=<id> --file=<output>
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SLOTS = {
  dispatch: {
    out: 'blog/september-2026-local-models-dashboard.png',
    page: 'index.html',
    note: 'the site\'s own GGUF model browser (served from this checkout)',
    width: 1600,
    height: 900,
    waitFor: '.premium-model-card',
    align: '.premium-model-card',
    pad: 240,
    settle: 1800,
  },
  october: {
    out: 'blog/october-2026-local-models-dashboard.png',
    page: 'index.html',
    note: 'the site\'s own GGUF model browser — search the box for "Qwen3.8 Flash Next" (or Clef) before shooting so the grid shows the October uploads',
    width: 1600,
    height: 900,
    waitFor: '.premium-model-card',
    align: '.premium-model-card',
    pad: 240,
    settle: 1800,
  },
  ffn: {
    out: 'blog/deepseek-moe-expert-parallel-gpus.png',
    url: 'http://127.0.0.1:8080',
    note: 'a local llama.cpp / Ollama web UI, or a GPU dashboard URL you pass with --url',
    width: 1600,
    height: 900,
  },
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveRepo() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const body = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch (error) {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function parseArgs() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    args[key] = value === undefined ? true : value;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const slotId = args.slot;

  if (args.help || !slotId) {
    console.log('usage: node scripts/capture-post-screenshots.js --slot=<id> [--url=...] [options]\n');
    console.log('slots:');
    for (const [id, slot] of Object.entries(SLOTS)) {
      console.log(`  ${id.padEnd(9)} ${slot.note}`);
      console.log(`  ${' '.repeat(9)} default output: ${slot.out}${slot.url ? `  (default url ${slot.url})` : ''}`);
    }
    console.log('\noptions: --url --out --page --width --height --dpr --wait-for --align --pad --scroll --click --full --settle');
    console.log('\nslots without a browser page (kv, context, agent, bonsai) are terminal captures —');
    console.log('see scripts/PHOTO_SLOTS.md for the exact commands to run and shoot.');
    return;
  }

  const slot = SLOTS[slotId] || {};
  const out = path.resolve(ROOT, args.out || slot.out || `blog/capture-${slotId}.png`);
  const width = Number(args.width || slot.width || 1600);
  const height = Number(args.height || slot.height || 900);
  const dpr = Number(args.dpr || 1);
  const settle = Number(args.settle || slot.settle || 900);
  const scroll = Number(args.scroll || slot.scroll || 0);

  const { server, port } = await serveRepo();
  const url = args.url || `http://127.0.0.1:${port}/${args.page || slot.page || 'index.html'}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: dpr });
    console.log(`capturing ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    if (args['wait-for'] || slot.waitFor) {
      const selector = args['wait-for'] || slot.waitFor;
      await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {
        console.warn(`  note: selector "${selector}" never appeared — capturing whatever rendered`);
      });
    }
    if (args.click) {
      await page.click(args.click).catch(() => console.warn(`  note: could not click ${args.click}`));
    }
    await new Promise((resolve) => setTimeout(resolve, settle));

    // Frame the page on a specific element: its top lands `pad` pixels down the viewport.
    // This runs AFTER the settle on purpose — pages that render their content late will
    // otherwise reset the scroll and the shot ends up framing the hero instead.
    const pad = Number(args.pad || slot.pad || 200);
    const alignSelector = args.align || slot.align;
    if (alignSelector) {
      // A single scroll is not enough on pages that keep growing (lazy images, late JS):
      // realign until the target actually sits at `pad` and stays there.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const moved = await page.evaluate((selector, pad) => {
          const el = document.querySelector(selector);
          if (!el) return false;
          window.scrollTo(0, Math.max(0, window.scrollY + el.getBoundingClientRect().top - pad));
          return true;
        }, alignSelector, pad);
        if (!moved) {
          console.warn(`  warning: --align selector ${alignSelector} not found — check the frame`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
        const stable = await page.evaluate((selector, pad) => {
          const el = document.querySelector(selector);
          if (!el) return false;
          const top = el.getBoundingClientRect().top;
          return Math.abs(top - pad) < 12;
        }, alignSelector, pad);
        if (stable) break;
      }
    } else if (scroll) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Report what is actually inside the frame — visible elements only, since the page may
    // contain hundreds of cards while the viewport shows a handful.
    const frame = await page.evaluate((selector) => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 16 && r.width > 4 && r.height > 4;
      };
      const cards = [...document.querySelectorAll('.premium-model-card')];
      const titles = cards.filter(visible).map((c) => (c.querySelector('h3, h2, .title, .model-name') || c).textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
      const target = selector ? document.querySelector(selector) : null;
      return {
        scrollY: Math.round(window.scrollY),
        visibleCards: cards.filter(visible).length,
        totalCards: cards.length,
        sampleTitles: titles.slice(0, 4),
        alignTargetInFrame: target ? visible(target) : null,
        pageTop: window.scrollY < 40,
      };
    }, alignSelector || '');

    if (frame.totalCards) {
      console.log(`  frame: ${frame.visibleCards}/${frame.totalCards} model cards visible` +
        (frame.sampleTitles.length ? ` — ${frame.sampleTitles.join(' | ')}` : ''));
    }
    console.log(`  scrollY ${frame.scrollY}` + (frame.alignTargetInFrame === false ? ' (WARNING: the align target is not in frame)' : ''));
    if (frame.pageTop) {
      console.warn('  WARNING: the frame is at the top of the page — is that the part you want to show?');
    }

    await fs.mkdir(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: Boolean(args.full), type: 'png' });
    const stats = fsSync.statSync(out);
    console.log(`wrote ${path.relative(ROOT, out)}  (${width}x${height} at ${dpr}x, ${Math.round(stats.size / 1024)} KB)`);
    console.log(`\nnext: python scripts/install-post-photo.py --slot=${slotId} --file=${path.relative(ROOT, out)}`);
    if (stats.size > 400 * 1024) {
      console.log('note: over 400 KB — the installer will re-encode it (JPEG) automatically.');
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error('capture failed:', error.message);
  process.exit(1);
});
