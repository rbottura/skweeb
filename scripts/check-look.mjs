#!/usr/bin/env node
/**
 * scripts/check-look.mjs — M5's link, `filter → compose: a look`, end to end.
 *
 *   node scripts/check-look.mjs
 *
 * On a copy of the vault: a chain made in filter over a sprite — a blur that
 * grows past the edge, a brightness — saved alone as a look, a `params`
 * object; opened back in filter; put over a placement in compose, which then
 * sizes the sprite by its glow; the page saved with the look in its block
 * and among its parents, replayed exactly and at print scale; and with WebGPU
 * taken away, the page still opens and says it is drawn without the look.
 *
 * Needs a GPU. Not in the tests loop.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.fl-card')]`;
const api = async id => (await fetch(c.base + '/api/vault/' + id)).json();
const settled = `(() => { const t = ${say}; return t.includes(' on the page') || t.includes('could not'); })()`;
const onPage = async () => (await page.eval(say)).match(/(\d+) × (\d+) on the page/);

// A sprite to glow: a loose still, unmistakable in the picker.
const rows = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const loose = r => !(r.tags || []).some(t => t.startsWith('folder:') || t === 'trash');
const label = r => r.title + ' ' + r.render.w + '×' + r.render.h;
const still = rows.find(r => r.type === 'still' && loose(r) && rows.filter(o => label(o) === label(r)).length === 1);
if (!still) { c.ok('the vault has a loose still to put a look over', false); await c.finish(); }

// ── 1. A look, made in filter ────────────────────────────────────────────────
await c.go(c.base + '/apps/filter/');
await page.click(`[...document.querySelectorAll('.pp-object-actions .pp-btn')].find(b => b.textContent === 'Choose…')`);
await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k =>
  k.querySelector('.vp-name')?.textContent === ${JSON.stringify(still.title)}
  && k.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(still.render.w + '×' + still.render.h)}))?.querySelector('.vp-use')`);
await page.until(`${say}.startsWith(${JSON.stringify(still.title + ' · ')})`, { timeout: 60000 });
await page.typeInto(`document.querySelector('.fl-add')`, 'blur');
await page.until(`${cards}.length === 1`);
await page.typeInto(`${cards}[0].querySelector('.pp-num')`, '3');
await page.typeInto(`document.querySelector('.fl-add')`, 'brightness');
await page.until(`${cards}.length === 2`);
await page.typeInto(`${cards}[1].querySelector('.pp-num')`, '0.2');
const grown = [still.render.w + 18, still.render.h + 18];
await page.until(`document.getElementById('stage').width === ${grown[0]} && ${say}.includes('2 of 2 filters on')`);
c.ok('a blur of 3 over the sprite grows it 9 a side', true, `${still.render.w} × ${still.render.h} → ${grown.join(' × ')}`);

await page.click(`[...document.querySelectorAll('.pp-actions .nb-btn')].find(b => b.textContent === 'Save the chain as a look')`);
await page.until(`/saved the look \\w+_\\d+_\\w+/.test(${say})`, { timeout: 60000 });
const lookId = (await page.eval(say)).match(/saved the look (\w+_\d+_\w+)/)[1];
const look = await api(lookId);
c.ok('the chain saves alone, as a params object: a look', look.type === 'params' && look.tags.includes('look')
  && look.origin.app === 'filter' && !look.parents.length, `${look.id} — ${look.title}`);
c.ok('its recipe is the chain and what it does at the edge', JSON.stringify(look.recipe) === JSON.stringify({
  chain: [{ id: 'blur', params: { radius: 3 }, on: true }, { id: 'brightness', params: { amount: 0.2 }, on: true }],
  edges: 'grow' }), JSON.stringify(look.recipe));
c.ok('its picture is what it did to the sprite', look.render.w === grown[0] && look.render.h === grown[1],
  `${look.render.w} × ${look.render.h}`);

await c.go(c.base + '/apps/filter/?open=' + lookId);
await page.until(`${cards}.length === 2 && ${say}.includes('choose a source to see it on')`);
c.ok('opened in filter, it is the chain again, waiting for a source', true, await page.eval(say));

// ── 2. Over a placement in compose ──────────────────────────────────────────
await c.go(c.base + '/apps/compose/?place=' + still.id);
await page.until(settled, { timeout: 60000 });
const before = await onPage();
await page.click(`[...document.querySelectorAll('#place-side .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === 'look')
  ?.querySelector('.pp-object-actions .pp-btn')`);
await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k =>
  k.querySelector('.vp-name')?.textContent === ${JSON.stringify(look.title)})?.querySelector('.vp-use')`);
await page.until(`(() => { const m = ${say}.match(/(\\d+) × (\\d+) on the page/); return m && m[0] !== ${JSON.stringify(before[0])}; })()`, { timeout: 60000 });
const after = await onPage();
const want = grown[0] / still.render.w;
c.ok('with the look, the sprite is sized by its glow', Math.abs(after[1] / before[1] - want) < 0.02,
  `${before[1]} × ${before[2]} → ${after[1]} × ${after[2]} on the page, ×${want.toFixed(3)} wanted`);

await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed/.test(${say})`, { timeout: 120000 });
const pageId = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const comp = pageId ? await api(pageId) : null;
c.ok('the page saves with the look in its block', !!comp && comp.recipe.place[0].look === lookId,
  comp ? JSON.stringify(comp.recipe.place[0]) : await page.eval(say));
c.ok('and the look among its parents', !!comp && comp.parents.includes(lookId) && comp.parents.includes(still.id),
  comp ? JSON.stringify(comp.parents) : '');

// ── 3. Replayed exactly, and at print scale ─────────────────────────────────
if (comp) {
  const replay = await page.eval(`(async () => {
    const { renderComposition } = await import('/apps/compose/render.js');
    const { Vault } = await import('/core/vault.js');
    const { object, url } = await Vault.load(${JSON.stringify(pageId)});
    const read = pic => { const k = new OffscreenCanvas(pic.width, pic.height), x = k.getContext('2d');
      x.drawImage(pic, 0, 0); return x.getImageData(0, 0, k.width, k.height).data; };
    const once = await renderComposition(object.recipe, { tick: 0 });
    const a = read(once.canvas), r = read(await createImageBitmap(await (await fetch(url)).blob()));
    let worst = 0;
    for (let i = 0; i < a.length; i += 4) {
      for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(a[i + j] * a[i + 3] - r[i + j] * r[i + 3]) / 255);
      worst = Math.max(worst, Math.abs(a[i + 3] - r[i + 3]));
    }
    const big = await renderComposition(object.recipe, { tick: 0, scale: 2 });
    return { worst: Math.round(worst * 10) / 10, size: a.length === r.length,
      print: [big.canvas.width, big.canvas.height], page: [once.canvas.width, once.canvas.height] };
  })()`);
  c.ok('the page replays exactly, the look and all, close to its render', replay.size && replay.worst <= 3,
    'worst premultiplied channel off by ' + replay.worst);
  c.ok('and at print scale', replay.print[0] === 2 * replay.page[0] && replay.print[1] === 2 * replay.page[1],
    `${replay.page.join(' × ')} → ${replay.print.join(' × ')}`);
}

// ── 4. No WebGPU: the page opens, without its look, and says so ─────────────
if (comp) {
  const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
  await c.go(c.base + '/apps/compose/?open=' + pageId);
  await page.until(`${say}.includes('(no WebGPU here)')`, { timeout: 60000 });
  c.ok('with no WebGPU the page opens, drawn without the look, and says so', true, await page.eval(say));
  await page.forget(stub);
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
