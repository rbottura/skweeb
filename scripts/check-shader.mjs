#!/usr/bin/env node
/**
 * scripts/check-shader.mjs — the shader app (apps/shader/), in a real browser.
 *
 *   node scripts/check-shader.mjs
 *
 * M15b: the app opens on one noise, drawn from nothing; fire from its
 * starter is six rows, played; each row's picture is the chain cut there —
 * held against the viewer showing that row large — and every row changes
 * it; the last row's is the whole; a frame stepped to and back is the same
 * picture; a value typed into a row changes its picture; and with WebGPU
 * taken away the page still opens, says why, and the chain can be built.
 *
 * Needs a GPU, as check-gpu.mjs does. Not in the tests loop.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const APP = c.base + '/apps/shader/';
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')]`;
const titles = () => page.eval(`${cards}.map(k => k.querySelector('.pp-title').textContent)`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = () => page.eval(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);

/** In the page: a canvas on black at a row's size, its pixels; the mean difference of two, a channel, of 255. */
await page.beforeLoad(`
  window.__on = (source, w, h) => {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.imageSmoothingQuality = 'high';
    x.drawImage(source, 0, 0, w, h);
    return x.getImageData(0, 0, w, h).data;
  };
  window.__row = i => document.querySelectorAll('.pp-card > .sh-row canvas')[i];
  window.__diff = (a, b) => {
    const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
    const p = window.__on(a, w, h), q = window.__on(b, w, h);
    let sum = 0;
    for (let i = 0; i < p.length; i += 4) sum += Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
    return sum / (p.length / 4 * 3);
  };
  window.__stage = () => document.getElementById('stage');
  window.__sum = () => { const s = window.__stage(); const d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 97) n = (n * 31 + d[i]) >>> 0; return n; };
`);

// ── 1. It opens on one noise, made from nothing ─────────────────────────────
await c.go(APP);
await page.until(`${cards}.length === 1 && ${say}.includes('1 of 1 rows on')`);
await settle();
c.ok('the app opens on one row, a noise', (await titles()).join() === 'noise', await page.eval(say));
const mid = await page.eval(`(() => { const s = window.__stage(); return Array.from(s.getContext('2d').getImageData(s.width >> 1, s.height >> 1, 1, 1).data); })()`);
c.ok('a picture from nothing: opaque, grey', mid[3] === 255 && mid[0] === mid[1] && mid[1] === mid[2], mid.join());
c.ok('its row shows it, small', await page.eval(`window.__diff(window.__row(0), window.__stage())`) < 8);
c.ok('one frame would be a still: the player is there for the loop',
  await page.eval(`[...document.querySelectorAll('.dr')].some(d => !d.hidden && d.querySelector('.dr-head').textContent.includes('Sequence player'))`));

// ── 2. Fire, from its starter ───────────────────────────────────────────────
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'fire')`);
await page.until(`${cards}.length === 6 && ${say}.includes('6 of 6 rows on')`);
c.ok('fire from its starter: six rows, top to bottom',
  (await titles()).join() === 'noise,noise,brightness,gradient,shape,gradient map', (await titles()).join());
await wait(2000);
const rate = await page.eval(`document.querySelector('.bar-fps')?.textContent || [...document.querySelectorAll('.bar span')].map(s => s.textContent).find(t => /fps/.test(t)) || ''`);
c.ok('it plays, every row with it, and the bar reads its pace', /\d+ fps/.test(rate), rate || 'no rate shown');
await key(' ');
await settle();
await c.shot('1-fire');

// ── 3. Each row's picture is the chain cut there ────────────────────────────
const cutAt = [], apart = [];
for (let i = 0; i < 6; i++) {
  await page.click(`window.__row(${i}).parentElement`);
  await page.until(`${say}.includes('seen at row ${i + 1},')`);
  await settle();
  cutAt.push(await page.eval(`window.__diff(window.__row(${i}), window.__stage())`));
  if (i) apart.push(await page.eval(`window.__diff(window.__row(${i}), window.__row(${i - 1}))`));
}
const fmt = list => list.map(v => v.toFixed(1)).join(' ');
c.ok('a row\'s picture clicked is seen large — the same picture, the chain cut there', cutAt.every(d => d < 8), fmt(cutAt));
c.ok('and every row changes it', apart.every(d => d > 1), fmt(apart));
c.ok('the row seen is marked', await page.eval(`${cards}[5].classList.contains('pp-card--chosen')`));
await c.shot('2-a-row-large');
await page.click(`window.__row(5).parentElement`);
await page.until(`!${say}.includes('seen at row')`);
await settle();
c.ok('clicked again, the whole — which the last row\'s picture is',
  await page.eval(`window.__diff(window.__row(5), window.__stage())`) < 8);
const lit = await page.eval(`(() => { const s = window.__stage(); const d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
  let warm = 0, n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 8 && d[i] > 40) { n++; if (d[i] >= d[i + 2]) warm++; } } return { n, warm }; })()`);
c.ok('fire is warm: where it is lit, red is over blue', lit.n > 100 && lit.warm === lit.n, JSON.stringify(lit));

// ── 4. A frame stepped to and back ──────────────────────────────────────────
const at0 = await page.eval(`window.__sum()`);
await key('.');
await settle();
const at1 = await page.eval(`window.__sum()`);
await key(',');
await settle();
c.ok('a frame on, the surface has moved; back, it is the same picture', at1 !== at0 && (await page.eval(`window.__sum()`)) === at0, `${at0} → ${at1}`);

// ── 5. A value typed into a row changes its picture ─────────────────────────
await page.eval(`(() => { window.__before = Object.assign(document.createElement('canvas'), { width: window.__row(0).width, height: window.__row(0).height });
  window.__before.getContext('2d').drawImage(window.__row(0), 0, 0); return true; })()`);
await page.typeInto(`${cards}[0].querySelector('.pp-num')`, '12');
await page.until(`window.__diff(window.__row(0), window.__before) > 1`);
c.ok('a value typed into a row changes its picture, and those under it', true,
  (await page.eval(`window.__diff(window.__row(0), window.__before)`)).toFixed(1));

// ── 6. No WebGPU: it opens, says why, the chain can be built ────────────────
const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(APP);
await page.until(`(document.querySelector('.bar')?.textContent || '').includes('no surface here')`);
c.ok('no WebGPU: the page opens and says why', true,
  (await page.eval(`document.querySelector('.bar').textContent`)).match(/no surface here[^·]*/)[0].trim());
await page.typeInto(`document.querySelector('.pp-cards-add')`, 'shape');
await page.until(`${cards}.length === 2 && ${say}.includes('no GPU')`);
c.ok('a chain can still be built', true, await page.eval(say));
await page.forget(stub);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
