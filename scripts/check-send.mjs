#!/usr/bin/env node
/**
 * scripts/check-send.mjs — M11's brick 4 in Chrome: Send to ▸, what one
 * window has on screen as another app's source (core/send.js).
 *
 *   node scripts/check-send.mjs
 *
 * In particles, *Send to ▸ filter* — pressed with the mouse, as a pop-up
 * wants — opens a filter window beside it whose source is particles, live:
 * it draws them through its chain, and a rate changed in particles is in
 * filter's own layer a moment later, carried whole. Saved in filter,
 * particles is asked to save itself first, in its own window — as a smart
 * object, since filter will hold it (core/smart.js); the filter
 * saved names what particles kept as its source and its parent, and goes
 * on following particles after. Sent again, the filter window open takes it
 * without another opening. And no page said anything wrong. Needs WebGPU,
 * for filter draws nothing without it.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const sendButton = `[...document.querySelectorAll('.pp-stack-sends .pp-stack-btn')].find(b => b.textContent === 'Send to ▸ filter')`;
const said = `(document.querySelector('.pp-stack-said')?.textContent || '')`;
const barSay = `(document.querySelector('.bar-say')?.textContent || '')`;

await c.go(c.base + '/apps/particles/');
await page.until(`!!${sendButton}`, { timeout: 20000 });
const gpu = await page.eval(`(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()`);
if (!gpu) {
  console.log('     no WebGPU here: filter draws nothing, and Send to ▸ filter goes unchecked');
  await c.finish();
}

// Particles' layer as filter's, heard from particles' own page: filter's layer carries its source whole.
await page.eval(`(async () => {
  const { joinLive } = await import('/core/live.js');
  window.inFilter = [];
  joinLive({ app: 'listening', layer: () => null }).on(e => {
    const s = e.window.app === 'filter' && e.window.layer && e.window.layer.recipe.source;
    if (s && typeof s === 'object') window.inFilter.push(s.recipe.emit.rate);
  });
})()`);

// The mouse on the button: a pop-up opens only for a person's press.
const at = await page.eval(`(() => { const b = ${sendButton}; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await page.pointer(at);
const filter = await c.found(url => url.includes('/apps/filter/?live='), { timeout: 15000 });
await filter.until(`${barSay}.includes('its source: the particles window, live')`, { timeout: 30000 }).catch(() => {});
c.ok('Send to ▸ filter opens a filter window, its source particles, live', (await filter.eval(barSay)).includes('the particles window, live')
  && (await page.eval(said)).startsWith('a filter window opens'), `${await filter.eval(barSay)} · ${await page.eval(said)}`);
const inked = await filter.eval(`(() => { const c = document.getElementById('stage'); const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0); const d = x.getImageData(0, 0, g.width, g.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n / (d.length / 4); })()`);
c.ok('…and draws them through its chain', inked > 0.001, `${(inked * 100).toFixed(2)}% inked`);

await page.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '151');
await page.until(`window.inFilter.includes(151)`, { timeout: 10000 }).catch(() => {});
c.ok('a rate changed in particles is in filter\'s layer a moment later, carried whole', (await page.eval(`window.inFilter`)).includes(151),
  JSON.stringify(await page.eval(`window.inFilter`)));

// Saved in filter: particles first, in its own window.
const before = new Set(((await (await fetch(c.base + '/api/vault')).json()).objects || []).map(o => o.id));
await filter.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent.startsWith('Save to the vault'))`);
await filter.until(`/^saved |failed/.test(${barSay})`, { timeout: 90000 }).catch(() => {});
const now = ((await (await fetch(c.base + '/api/vault')).json()).objects || []).filter(o => !before.has(o.id));
const kept = now.find(o => o.origin && o.origin.app === 'particles');
const made = now.find(o => o.origin && o.origin.app === 'filter');
const full = made ? await (await fetch(c.base + '/api/vault/' + made.id)).json() : null;
c.ok('saved in filter: particles saves itself first, in its own window — a smart object', !!kept && kept.type === 'skw', kept ? `${kept.id} ${kept.type}` : await filter.eval(barSay));
c.ok('…and the filter saved names what particles kept, its source and its parent', !!full && !!kept && full.recipe.source === kept.id
  && full.parents.includes(kept.id), full ? `${full.id} source ${full.recipe.source} parents ${JSON.stringify(full.parents)}` : await filter.eval(barSay));

// …and filter goes on following particles.
await filter.until(`${barSay}.includes('its source: the particles window, live')`, { timeout: 20000 }).catch(() => {});
await page.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '163');
await page.until(`window.inFilter.includes(163)`, { timeout: 10000 }).catch(() => {});
c.ok('after the save, filter follows particles again', (await page.eval(`window.inFilter`)).includes(163), JSON.stringify(await page.eval(`window.inFilter`)));

// Sent again: the filter window open takes it, nothing more opened.
await page.click(sendButton);
await page.until(`${said}.startsWith('sent to the filter window')`, { timeout: 10000 }).catch(() => {});
c.ok('sent again, the filter window open takes it, no other opened', (await page.eval(said)).startsWith('sent to the filter window'), await page.eval(said));

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
