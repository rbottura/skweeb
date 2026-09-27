#!/usr/bin/env node
/**
 * scripts/check-particles.mjs — M6's app in Chrome: particles as a function of time.
 *
 *   node scripts/check-particles.mjs
 *
 * Served as plain files with no vault, it opens and draws (rule 7). On the
 * server: it plays; the frame after the last is the first again, pixel for
 * pixel; a frame scrubbed to is the frame stepped to; the first frame is as
 * full as any; a burst starts all at the emitter and ends; print scale makes
 * the same picture in more pixels.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const alive = async () => Number(((await page.eval(say)).match(/^(\d+) alive/) || [])[1] || -1);
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick};
    s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(250);
};
// The picture as a 16 × 16 grid of mean colours: two frames are the same when no cell differs.
const pixels = () => page.eval(`(() => { const c = document.getElementById('stage');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++;
  }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));

// ── Rule 7: no vault at all ─────────────────────────────────────────────────

await c.go(c.plain + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
c.ok('opens with no vault, and draws', (await alive()) > 0, await page.eval(say));
c.ok('the bar says there is no vault', await page.eval(`document.body.textContent.includes('no vault')`));

// ── Plays, and closes its loop ──────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
// The plain page's console, heard as this one opened: its vault's API was
// missing, and saying so is all it may have said.
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
const before = await page.eval(count);
await wait(700);
const after = await page.eval(count);
c.ok('it plays', before !== after && /^\d+ \/ 60$/.test(after), `${before} → ${after}`);

key(' '); await wait(200);
await scrubTo(0);
const first = await pixels();
const full = await alive();
await scrubTo(59);
key('.'); await wait(300);
c.ok('the frame after the last is the first', (await page.eval(count)) === '1 / 60', await page.eval(count));
c.ok('pixel for pixel: the loop closes', apart(await pixels(), first) === 0, 'apart by ' + apart(await pixels(), first));
await c.shot('1-stream');

// Stepped to frame 31, one frame at a time, against scrubbed straight to it.
for (let i = 0; i < 30; i++) key('.');
await wait(400);
const stepped = await pixels();
const at = await page.eval(count);
await scrubTo(5); await scrubTo(30);
c.ok('a frame scrubbed to is the frame stepped to', at === '31 / 60' && apart(await pixels(), stepped) === 0,
  `${at}, apart by ${apart(await pixels(), stepped)}`);
const later = await alive();
c.ok('the first frame is as full as any', Math.abs(full - later) < later * 0.25, `${full} at frame 1, ${later} at 31`);

// Changing the loop's length keeps its frame; changing a force redraws it.
await set('gravity px/s²', '-300');
c.ok('a force changed, the frame redrawn where it was', apart(await pixels(), stepped) > 0 && (await page.eval(count)) === '31 / 60');

// ── A burst ─────────────────────────────────────────────────────────────────

await page.click(`[...${row('mode')}.querySelectorAll('button')].find(b => b.textContent === 'burst')`);
await wait(300);
const note = await page.eval(`[...document.querySelectorAll('#picture-side .dr-note')].map(n => n.textContent).join(' ')`);
c.ok('a burst lasts until its longest life, once', /\d+ frames · [\d.]+ s, once/.test(note), note);
await scrubTo(0);
c.ok('at its first frame, every one of it', (await alive()) === 120, await page.eval(say));
const frames = Number((await page.eval(count)).split(' / ')[1]);
await scrubTo(frames - 1);
c.ok('by its last, nearly all gone', (await alive()) < 30, await page.eval(say));
await c.shot('2-burst');

// ── Print scale: more pixels, the same picture ──────────────────────────────

await page.click(`[...${row('mode')}.querySelectorAll('button')].find(b => b.textContent === 'stream')`);
await scrubTo(10);
const out1 = await page.eval(`document.querySelector('.bar')?.textContent || ''`);
await set('scale', '2');
const out2 = await page.eval(`document.querySelector('.bar')?.textContent || ''`);
c.ok('scale 2 is twice the pixels out', out1.includes('1080 × 1080') && out2.includes('2160 × 2160'),
  (out2.match(/\d+ × \d+[^·]*/) || [''])[0]);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
