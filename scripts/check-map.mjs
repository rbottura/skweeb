#!/usr/bin/env node
/**
 * scripts/check-map.mjs — M8's map editor in Chrome.
 *
 *   node scripts/check-map.mjs
 *
 * Served as plain files with no vault, it opens and draws its grid
 * (rule 7). On the server: the bar says the map's size in tiles; the grid is
 * drawn over the ground, each cell's middle the ground's colour; a map made
 * wider is drawn wider; the grid's switch takes it away. Needs no GPU, and
 * brings what it needs: the vault it runs on may be empty.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
/** A pixel of the preview, at a place in the map's own pixels, the map `mapWidth` wide. */
const pixel = async (x, y, mapWidth) => page.eval(`(() => { const c = document.getElementById('stage'); const k = c.width / ${mapWidth};
  return [...c.getContext('2d').getImageData(Math.min(c.width - 1, Math.round(${x} * k)), Math.min(c.height - 1, Math.round(${y} * k)), 1, 1).data]; })()`);
const ground = p => Math.abs(p[0] - 255) + Math.abs(p[1] - 253) + Math.abs(p[2] - 246) < 6;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/map/');
await page.until(`${say}.includes('tiles of')`, { timeout: 20000 });
c.ok('opens with no vault, and draws its grid', (await page.eval(say)).includes('12 × 10 tiles of 64 px'), await page.eval(say));
c.ok('the bar says there is no vault', await page.eval(`document.body.textContent.includes('no vault')`));

// ── On the server ───────────────────────────────────────────────────────────

await c.go(c.base + '/apps/map/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${say}.includes('tiles of')`, { timeout: 20000 });
c.ok('its canvas is the map\'s shape', await page.eval(`Math.abs(document.getElementById('stage').width / document.getElementById('stage').height - 768 / 640) < 0.01`));
c.ok('a cell\'s middle is the ground', ground(await pixel(96, 96, 768)), JSON.stringify(await pixel(96, 96, 768)));
c.ok('the grid is drawn between cells', !ground(await pixel(128, 96, 768)), JSON.stringify(await pixel(128, 96, 768)));
await set('columns', 20);
c.ok('a map made wider is drawn wider', (await page.eval(say)).includes('20 × 10')
  && await page.eval(`Math.abs(document.getElementById('stage').width / document.getElementById('stage').height - 1280 / 640) < 0.01`), await page.eval(say));
await page.click(`document.getElementById('grid')`);
await wait(300);
c.ok('the grid\'s switch takes it away', ground(await pixel(128, 96, 1280)), JSON.stringify(await pixel(128, 96, 1280)));
await c.shot('1-grid');

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
