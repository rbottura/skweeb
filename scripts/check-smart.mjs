#!/usr/bin/env node
/**
 * scripts/check-smart.mjs — M11's brick 5 in Chrome: smart objects, the one
 * object saved again (core/smart.js, server/versions.js).
 *
 *   node scripts/check-smart.mjs
 *
 * Particles sent to filter, and filter saved: particles saves itself as a
 * smart object — `skw_…`, version 1 — and the filter names it as its source,
 * a parent and a ref. Particles is bound to it now: a rate changed there and
 * saved is its version 2, and a filter opened on what was saved draws the
 * new particles, its player where it was. Compose placing that filter is
 * drawn again at version 3. Reopened in particles, the smart object is the
 * loop to work on, and that window is bound to it too: saved, version 4.
 * Reopened at version 1 (S6), it is that state; saved, a branch from it.
 * And no page said anything wrong. Needs WebGPU, for filter.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const sendButton = `[...document.querySelectorAll('.pp-stack-sends .pp-stack-btn')].find(b => b.textContent === 'Send to ▸ filter')`;
const barSay = `(document.querySelector('.bar-say')?.textContent || '')`;
const bound = `import('/core/vault.js').then(m => m.Vault.bound)`;
const vault = async () => ((await (await fetch(c.base + '/api/vault')).json()).objects || []);
const envelope = async id => (await fetch(c.base + '/api/vault/' + id)).json();
const hash = `(() => { const c = document.getElementById('stage'); const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0); const d = x.getImageData(0, 0, g.width, g.height).data;
  let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) % 1000003; return s; })()`;

await c.go(c.base + '/apps/particles/');
await page.until(`!!${sendButton}`, { timeout: 20000 });
if (!(await page.eval(`(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()`))) {
  console.log('     no WebGPU here: filter draws nothing, and smart objects through it go unchecked');
  await c.finish();
}

// Sent to filter, and filter saved: particles saves itself as a smart object.
const at = await page.eval(`(() => { const b = ${sendButton}; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await page.pointer(at);
const filter = await c.found(url => url.includes('/apps/filter/?live='), { timeout: 15000 });
await filter.until(`${barSay}.includes('the particles window, live')`, { timeout: 30000 });
const before = new Set((await vault()).map(o => o.id));
await filter.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent.startsWith('Save to the vault'))`);
await filter.until(`/^saved |failed/.test(${barSay})`, { timeout: 90000 }).catch(() => {});
const fresh = (await vault()).filter(o => !before.has(o.id));
const skw = fresh.find(o => o.type === 'skw' && o.origin && o.origin.app === 'particles');
const saved = fresh.find(o => o.origin && o.origin.app === 'filter');        // the filter's own S: a state of its own smart object (S6b)
const held = saved ? inner(await envelope(saved.id)) : null;
c.ok('filter saved: particles is a smart object, version 1', !!skw && skw.id.startsWith('skw_') && skw.version === 1 && skw.origin.app === 'particles',
  skw ? `${skw.id} v${skw.version}` : JSON.stringify(fresh.map(o => o.id)));
c.ok('…the filter names it: its source, a parent and a ref', !!held && !!skw && held.recipe.source === skw.id
  && held.parents.includes(skw.id) && held.refs.includes(skw.id), held ? JSON.stringify({ source: held.recipe.source, parents: held.parents, refs: held.refs }) : 'no filter saved');
c.ok('particles\' window is bound to it now', (await page.eval(bound))?.id === skw?.id, JSON.stringify(await page.eval(bound)));

// A filter opened on what was saved holds the smart object, not a window.
const holder = await c.tab(c.base + '/apps/filter/?open=' + saved.id);
await holder.until(`/^opened /.test(${barSay})`, { timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
const was = await holder.eval(hash);

// Changed and saved in particles: version 2, drawn again where it is held.
await page.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '233');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await page.until(`/^saved |failed/.test(${barSay})`, { timeout: 60000 }).catch(() => {});
const v2 = await envelope(skw.id);
c.ok('a rate changed in particles and saved: the smart object\'s version 2', v2.version === 2 && v2.recipe.recipe.emit.rate === 233,
  `v${v2.version} rate ${v2.recipe && v2.recipe.recipe && v2.recipe.recipe.emit.rate} · ${await page.eval(barSay)}`);
await holder.until(`(${hash}) !== ${was}`, { timeout: 30000 }).catch(() => {});
const is = await holder.eval(hash);
c.ok('…and the filter holding it draws the new particles', is !== was, `${was} → ${is}`);

// Compose placing that filter: drawn again at the next version.
await c.go(c.base + '/apps/compose/?place=' + saved.id);
await page.until(`(document.querySelector('.bar-say')?.textContent || '').includes(' on the page')`, { timeout: 60000 }).catch(() => {});
const particles = await c.tab(c.base + '/apps/particles/?open=' + skw.id);
await particles.until(`/^opened /.test(${barSay})`, { timeout: 30000 }).catch(() => {});
const reopened = await particles.eval(`${row('a second')}?.querySelector('.pp-num')?.value`);
c.ok('reopened in particles: the smart object is the loop to work on', Number(reopened) === 233 && (await particles.eval(bound))?.id === skw.id,
  `rate ${reopened} · ${JSON.stringify(await particles.eval(bound))}`);
await particles.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '277');
await particles.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await particles.until(`/^saved |failed/.test(${barSay})`, { timeout: 60000 }).catch(() => {});
await page.until(`${barSay}.includes('drawn again, version 3')`, { timeout: 30000 }).catch(() => {});
c.ok('saved there, version 3: compose places the filter of it, drawn again', (await envelope(skw.id)).version === 3
  && (await page.eval(barSay)).includes('drawn again, version 3'), `${await page.eval(barSay)} · v${(await envelope(skw.id)).version}`);
const v1 = await (await fetch(c.base + '/vault/objects/' + skw.id + '/versions/v1.json')).json();
c.ok('what it was stays: version 1 kept, at its first rate', v1.version === 1 && v1.recipe.recipe.emit.rate !== 233, `v1 rate ${v1.recipe.recipe.emit.rate}`);

// A state to go on from (S6): reopened at version 1, changed and saved — a branch, its parent version 1.
const old = await c.tab(c.base + '/apps/particles/?open=' + skw.id + '@v1');
await old.until(`/^opened /.test(${barSay})`, { timeout: 30000 }).catch(() => {});
const first = await old.eval(`${row('a second')}?.querySelector('.pp-num')?.value`);
const holds = await old.eval(bound);
await old.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '188');
await old.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await old.until(`/^saved |failed/.test(${barSay})`, { timeout: 60000 }).catch(() => {});
const tree = (await (await fetch(c.base + '/api/vault/' + skw.id + '/states')).json()).states || [];
c.ok('reopened at version 1, it holds that state; saved, a branch from it', Number(first) === v1.recipe.recipe.emit.rate && holds?.version === 1
  && tree.length === 4 && tree[3].parent === 1 && tree[2].parent === 2, `rate ${first}, holds v${holds?.version}, ${JSON.stringify(tree.map(t => [t.version, t.parent]))}`);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
