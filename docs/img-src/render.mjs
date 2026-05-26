// docs/img-src/render.mjs
// One-shot renderer for README image assets.
//
// Usage:
//   cd <repo root>
//   npm install --no-save puppeteer    # downloads Chromium (~170MB, one-time)
//   node docs/img-src/render.mjs       # writes PNGs into docs/img/
//
// Each entry in SOURCES corresponds to one HTML source -> one PNG output.
// Renders at deviceScaleFactor 2 so the PNG is retina-quality.

import puppeteer from 'puppeteer';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../img');
mkdirSync(OUT_DIR, { recursive: true });

const SOURCES = [
  { html: 'hero-before-after.html', png: 'hero-before-after.png', width: 830, height: 280 },
  { html: 'how-it-works.html',      png: 'how-it-works.png',      width: 840, height: 260 },
];

// --no-sandbox required in containerized / VPS environments (no user namespace)
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  for (const s of SOURCES) {
    const srcPath = resolve(__dirname, s.html);
    if (!existsSync(srcPath)) {
      console.warn(`skipped ${s.html} (source not found)`);
      continue;
    }
    const page = await browser.newPage();
    await page.setViewport({ width: s.width, height: s.height, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(srcPath).href, { waitUntil: 'networkidle0' });
    const outPath = resolve(OUT_DIR, s.png);
    // omitBackground:false → render the page's own white background so PNGs look right on GitHub's light theme
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`wrote ${outPath}`);
    await page.close();
  }
} finally {
  await browser.close();
}
