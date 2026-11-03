#!/usr/bin/env node
/**
 * scripts/check-states.mjs — S6b in Chrome: S, the next state of the object
 * open (core/vault.js `state`, core/boxes/export.js).
 *
 *   node scripts/check-states.mjs
 *
 * In particles: S makes a smart object, version 1, the vault's row saying
 * what it binds; changed and saved again, the same object's version 2, its
 * parent version 1. The frame saved as a still is an ordinary object, named
 * from that state and not depending on it. "Save as a new object" starts
 * another. Alt click on a row's mark lists its value in every state (S6d);
 * a pick sets it, Ctrl Z takes it back. In compose, the project placed at a
 * state is pinned there, its row saying so. No page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const row = key => `document.querySelector('.pp-row[data-key="${key}"]')`;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const envelope = async id => (await fetch(c.base + '/api/vault/' + id)).json();
const indexRow = async id => ((await (await fetch(c.base + '/api/vault')).json()).objects || []).find(o => o.id === id);
const act = text => page.click(`[...document.querySelectorAll('.pp-actions .nb-btn')].find(b => b.textContent.startsWith(${JSON.stringify(text)}))`);
const saved = async () => {
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  const id = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  return id;
};

await c.go(c.base + '/apps/particles/');
await page.until(`!!${row('rate')} && !!document.querySelector('.pp-actions')`);

// S: the first state of a smart object.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
const id = await saved();
const v1 = id ? await envelope(id) : null;
const listed = id ? await indexRow(id) : null;
c.ok('S makes a smart object, its first state; the vault\'s row says what it binds', !!v1 && v1.type === 'skw' && v1.version === 1
  && v1.recipe.type === 'sequence' && listed && listed.binds === 'sequence', JSON.stringify({ id, version: v1 && v1.version, binds: listed && listed.binds }));

// Changed and saved again: the same object, its next state.
await page.typeInto(`${row('rate')}.querySelector('.pp-num')`, '150');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
const again = await saved();
const v2 = await envelope(id);
c.ok('changed and saved again: the same object, version 2, its parent version 1', again === id && v2.version === 2 && v2.parent === 1
  && v2.recipe.recipe.emit.rate === 150, JSON.stringify({ again, version: v2.version, parent: v2.parent }));

// The frame as a still: frozen, named from the state it came from.
await act('Save the frame as a still');
const sid = await saved();
const still = sid ? await envelope(sid) : null;
c.ok('the frame as a still: an ordinary object, made from that state, not depending on it', !!still && still.type === 'still'
  && still.parents.includes(`${id}@v2`) && !still.refs.some(r => r.startsWith(id)), JSON.stringify(still && { type: still.type, parents: still.parents, refs: still.refs }));

// S6d: Alt click on a row's mark — its value in every state, the newest first; a pick sets it, Ctrl Z takes it back.
await page.typeInto(`${row('rate')}.querySelector('.pp-num')`, '200');
await page.eval(`${row('rate')}.querySelector(':scope > .pp-mark').dispatchEvent(new MouseEvent('click', { altKey: true, bubbles: true }))`);
await page.until(`document.querySelectorAll('.pp-hist-item').length >= 2`, { timeout: 15000 }).catch(() => {});
const listedValues = await page.eval(`[...document.querySelectorAll('.pp-hist-item')].map(i => i.querySelector('.pp-hist-v').textContent + ' = ' + i.querySelector('.pp-hist-val').textContent)`);
c.ok("Alt click on a row's mark: its value in every state, the newest first", JSON.stringify(listedValues) === JSON.stringify(['v2 · held = 150', 'v1 = 90']),
  JSON.stringify(listedValues));
await page.click(`[...document.querySelectorAll('.pp-hist-item')].find(i => i.querySelector('.pp-hist-v').textContent === 'v1')`);
await new Promise(r => setTimeout(r, 200));
const picked = +(await page.eval(`${row('rate')}.querySelector('.pp-num').value`));
await new Promise(r => setTimeout(r, 600));
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))`);
await new Promise(r => setTimeout(r, 200));
const backTo = +(await page.eval(`${row('rate')}.querySelector('.pp-num').value`));
c.ok("a state's value picked is set, and Ctrl Z takes it back", picked === 90 && backTo === 200, `${picked}, then ${backTo}`);

// Save as a new object: another smart object, and the page bound to it.
await act('Save as a new object');
const other = await saved();
const bound = await page.eval(`import('/core/vault.js').then(m => m.Vault.bound)`);
const o2 = other ? await envelope(other) : null;
c.ok('"Save as a new object": another smart object, its first state, the page holding it', !!o2 && other !== id && o2.type === 'skw'
  && o2.version === 1 && bound && bound.id === other, JSON.stringify({ other, bound }));

// Placed in compose at a state: pinned there.
await c.go(c.base + `/apps/compose/?place=${id}@v1`);
await page.until(`(document.querySelector('.bar-say')?.textContent || '').includes(' on the page')`, { timeout: 60000 }).catch(() => {});
const pin = await page.eval(`(() => { const r = [...document.querySelectorAll('#place-side .pp-row')].find(r => r.dataset.key === 'version');
  return r && !r.hidden ? +r.querySelector('.pp-num').value : null; })()`);
c.ok('placed in compose at a state: pinned there, its row saying so', pin === 1, `${pin} · ${await page.eval(say)}`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
