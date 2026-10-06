#!/usr/bin/env node
/**
 * scripts/check-filter.mjs — the filter app (apps/filter/), in a real browser.
 *
 *   node scripts/check-filter.mjs
 *
 * On a copy of the vault, as every check here: an image dropped on the page
 * becomes the source; filters added from the catalogue each get a card drawn
 * from their schema; a value typed into a card changes the pixels; a card
 * moves, switches off and comes out; a loop from the vault, chosen in the
 * picker, plays through the chain on the GPU; and with WebGPU taken away the
 * page still opens, says why, and shows its source as it is.
 *
 * Needs a GPU, as check-gpu.mjs does. Not in the tests loop.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const APP = c.base + '/apps/filter/';
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')]`;
const titles = () => page.eval(`${cards}.map(k => k.querySelector('.pp-title').textContent)`);
const headButton = (i, label) => `(${cards}[${i}] && [...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === ${JSON.stringify(label)}))`;
const pixel = (x, y) => page.eval(`Array.from(document.getElementById('stage').getContext('2d').getImageData(${x}, ${y}, 1, 1).data)`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const addMenu = `document.querySelector('.pp-cards-add')`;

/** Drop a 64 × 48 picture on the page: grey 100 with a red square, as a person would drop a file. */
const drop = () => page.eval(`(async () => {
  const c = Object.assign(document.createElement('canvas'), { width: 64, height: 48 });
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(100,100,100)'; x.fillRect(0, 0, 64, 48);
  x.fillStyle = '#f00'; x.fillRect(40, 20, 12, 12);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'grey.png', { type: 'image/png' }));
  document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  return true;
})()`);

// ── 1. It opens, and asks for a source ───────────────────────────────────────
await c.go(APP);
await page.until(`${say}.includes('choose a source')`);
c.ok('the app opens and asks for a source', true, await page.eval(say));

// ── 2. A file dropped is the source ──────────────────────────────────────────
await drop();
await page.until(`document.getElementById('stage').width === 64 && ${say}.includes('no filters yet')`);
c.ok('a dropped image is the source, at its own size', true, await page.eval(say));
c.ok('shown as it is', (await pixel(5, 5)).join() === '100,100,100,255', (await pixel(5, 5)).join());

// ── 3. A filter from the catalogue, its card from its schema ────────────────
await page.typeInto(addMenu, 'brightness');
await page.until(`${cards}.length === 1 && ${say}.includes('1 of 1 filters on')`);
c.ok('adding a filter makes its card', (await titles()).join() === 'brightness', (await titles()).join());
c.ok('the card is drawn from its schema', await page.eval(`!!${cards}[0].querySelector('.pp-range') && !!${cards}[0].querySelector('.pp-num')`));
await page.typeInto(`${cards}[0].querySelector('.pp-num')`, '0.2');
await page.until(`(() => { const d = document.getElementById('stage').getContext('2d').getImageData(5, 5, 1, 1).data; return Math.abs(d[0] - 151) <= 2; })()`);
c.ok('a value typed into the card changes the pixels', true, '100 → ' + (await pixel(5, 5))[0]);

// ── 4. A second, moved, switched off, taken out ─────────────────────────────
await page.typeInto(addMenu, 'blur');
await page.until(`${cards}.length === 2`);
c.ok('a second filter goes under the first', (await titles()).join() === 'brightness,gaussian blur', (await titles()).join());
const size = `[document.getElementById('stage').width, document.getElementById('stage').height].join(' × ')`;
await page.until(`${size} === '88 × 72'`);
c.ok('a blur grows the picture by its reach, 12 a side', true, await page.eval(size));
await page.click(`[...document.querySelectorAll('.pp-chip')].find(b => b.textContent === 'keep')`);
await page.until(`${size} === '64 × 48'`);
c.ok('kept, the picture stays its size — for one that fills its frame', true, await page.eval(size));
await page.click(headButton(1, '↑'));
await page.until(`${cards}[0].querySelector('.pp-title').textContent === 'gaussian blur'`);
c.ok('↑ runs it earlier', (await titles()).join() === 'gaussian blur,brightness', (await titles()).join());
c.ok('the first cannot go up, the last cannot go down',
  await page.eval(`${headButton(0, '↑')}.disabled && ${headButton(1, '↓')}.disabled && !${headButton(0, '↓')}.disabled`));
await page.click(headButton(1, 'on'));
await page.until(`${say}.includes('1 of 2 filters on')`);
await page.until(`(() => { const d = document.getElementById('stage').getContext('2d').getImageData(5, 5, 1, 1).data; return Math.abs(d[0] - 100) <= 2; })()`);
c.ok('switched off, brightness no longer runs', true, 'back to ' + (await pixel(5, 5))[0]);
c.ok('its card says it is off', await page.eval(`${cards}[1].classList.contains('pp-card--off') && ${headButton(1, 'off')} !== undefined`));
await page.click(headButton(1, '✕'));
await page.click(headButton(0, '✕'));
await page.until(`${cards}.length === 0 && !document.querySelector('.pp-cards-empty').hidden && ${say}.includes('no filters yet')`);
c.ok('taken out, the chain is empty and says so', true, await page.eval(say));
await c.shot('1-empty-again');

// ── 4b. Picking a colour leaves the picker open ─────────────────────────────
// A native picker cannot be driven from here, so what closed it is checked: a
// drag in it sets the input's value and fires `input`, over and over, and the
// widget answering must neither replace the input nor write its value back.
await page.typeInto(addMenu, 'palette');
await page.typeInto(addMenu, 'duotone');
await page.until(`${cards}.length === 2`);
const drag = which => page.eval(`(async () => {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const card = ${cards}.find(k => k.querySelector('.pp-title').textContent === ${JSON.stringify(which)});
  const input = card.querySelector('.pp-color');
  let writes = 0;
  Object.defineProperty(input, 'value', { configurable: true,
    get() { return proto.get.call(this); }, set(v) { writes++; proto.set.call(this, v); } });
  for (const c of ['#112233', '#223344', '#334455']) {
    proto.set.call(input, c);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { same: input.isConnected && card.querySelector('.pp-color') === input, writes, value: proto.get.call(input) };
})()`);
const swatch = await drag('palette lock');
c.ok('dragging in a palette swatch\'s picker keeps the swatch, and its picker', swatch.same && swatch.writes === 0
  && swatch.value === '#334455', JSON.stringify(swatch));
const tone = await drag('duotone');
c.ok('and a single colour is not written back under the hand', tone.same && tone.writes === 0
  && tone.value === '#334455', JSON.stringify(tone));
await page.click(`${cards}[0].querySelector('.pp-colors .pp-btn')`);
c.ok('adding a colour still makes its swatch', await page.eval(`${cards}[0].querySelectorAll('.pp-colors .pp-color').length`) === 5);
await page.click(headButton(1, '✕'));
await page.click(headButton(0, '✕'));
await page.until(`${cards}.length === 0`);

// ── 5. A loop from the vault, through the chain, playing ────────────────────
const rows = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const loop = rows.find(r => r.type === 'sequence' && r.origin && r.origin.app === 'gamepad'
  && !(r.tags || []).some(t => t.startsWith('folder:') || t === 'trash'));
if (!loop) console.log('     (the vault has no gamepad loop to pick — skipping the loop)');
else {
  await page.click(`[...document.querySelectorAll('.pp-object-actions .pp-btn')].find(b => b.textContent === 'Choose…')`);
  await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
  await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k =>
    k.querySelector('.vp-name')?.textContent === ${JSON.stringify(loop.title)}
    && k.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(loop.render.w + '×' + loop.render.h)}))?.querySelector('.vp-use')`);
  await page.until(`${say}.startsWith(${JSON.stringify(loop.title + ' · ')})`, { timeout: 60000 });
  c.ok('a loop chosen in the picker is the source', true, await page.eval(say));
  const [sw, sh] = await page.eval(`[document.getElementById('stage').width, document.getElementById('stage').height]`);
  c.ok('at the size of its ink, as compose places it', Math.abs(sw - loop.render.w) <= 2 && Math.abs(sh - loop.render.h) <= 2,
    `${sw} × ${sh}, the object ${loop.render.w} × ${loop.render.h}`);
  c.ok('and the player shows, since it has frames', await page.eval(`[...document.querySelectorAll('.dr')].some(d => !d.hidden && d.querySelector('.dr-head').textContent.includes('Sequence player'))`));
  await page.typeInto(addMenu, 'pixelate');
  await page.typeInto(addMenu, 'contrast');
  await page.until(`${say}.includes('2 of 2 filters on')`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
  await wait(2500);
  const rate = await page.eval(`document.querySelector('.bar-fps')?.textContent || [...document.querySelectorAll('.bar span')].map(s => s.textContent).find(t => /fps/.test(t)) || ''`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
  c.ok('it plays through the chain, and the bar reads its pace', /\d+ fps/.test(rate), rate || 'no rate shown');
  await c.shot('2-loop-filtered');
}

// ── 6. No WebGPU: it opens, says why, shows the source as it is ─────────────
const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(APP);
await page.until(`(document.querySelector('.bar')?.textContent || '').includes('no GPU filters here')`);
c.ok('no WebGPU: the page opens and says why', true,
  (await page.eval(`document.querySelector('.bar').textContent`)).match(/no GPU filters here[^·]*/)[0].trim());
await drop();
await page.typeInto(addMenu, 'brightness');
await page.until(`${say}.includes('no GPU — unfiltered')`);
c.ok('a chain can still be built; the source shows as it is', (await pixel(5, 5)).join() === '100,100,100,255', await page.eval(say));
await page.forget(stub);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
