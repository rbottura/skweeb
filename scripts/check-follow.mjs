#!/usr/bin/env node
/**
 * scripts/check-follow.mjs — L11: a smart object followed wherever it is
 * picked (core/params.js, core/sprites.js).
 *
 *   node scripts/check-follow.mjs
 *
 * The 3D app's model saved — S, its smart object's first state — and picked
 * in another window as particles' sprites: one sprite, the model's picture.
 * The sphere taken out in the 3D app and saved again, version 2: particles'
 * sprites follow it there, the loop held still, with no reload — its field
 * says the new version; and following is no step of particles' history. The
 * same smart object a layer of particles' stack (L1): its row keeps it at a
 * state, a window's layer has none, and the page the stack saves places it
 * at that state. Placed in compose at its state, and flattened (L2): a
 * model of its own, its parent that state, no refs, the placement pointing
 * at it. And no page said anything wrong. Needs a 3D backend:
 * WebGPU, or WebGL2.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const hash = `(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0; for (let i = 0; i < d.length; i += 37) h = (h * 31 + d[i]) >>> 0; return h; })()`;
const onStage = (fx, fy) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [Math.round(r.left + ${fx} * r.width), Math.round(r.top + ${fy} * r.height)]; })()`);
const steps = `import('/core/steps.js').then(m => m.list().length)`;

// The 3D app's model, saved: its smart object's first state.
await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
if (/nothing draws/.test(await page.eval(say))) {
  console.log('     (nothing draws in 3D here — nothing to follow)');
  await c.finish();
}
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const skw = ((await page.eval(say)).match(/^saved (skw_\S+)/) || [])[1];
c.ok('the 3D app\'s model saved: a smart object, its first state', !!skw, await page.eval(say));

// Particles, in another window: that model picked as its sprites.
const parts = await c.tab(c.base + '/apps/particles/');
await parts.until(`!!${row('sprites')}`, { timeout: 30000 });
await wait(800);
await parts.click(`[...${row('sprites')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
const card = `document.querySelector('.vp--visible .vp-card[data-id="${skw}"]')`;
await parts.until(`!!${card}`, { timeout: 20000 }).catch(() => {});
c.ok('particles\' picker offers the smart object, for the model it binds', await parts.eval(`!!${card}`));
await parts.click(`${card}?.closest('.vp-cell')?.querySelector('.vp-use')`);
await parts.until(`/: 1 sprite/.test(${say})`, { timeout: 30000 }).catch(() => {});
c.ok('picked as its sprites: the model\'s picture, one sprite', /box, sphere, torus: 1 sprite/.test(await parts.eval(say)), await parts.eval(say));
await parts.typeInto(`${row('size')}?.querySelector('.pp-num')`, '30');   // an edit by hand: a step of its history
await wait(1500);                                   // particles out, wearing it
await parts.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
await wait(600);
await parts.eval(`window.__notReloaded = true`);
const was = await parts.eval(hash);
const fieldWas = await parts.eval(`${row('sprites')}?.querySelector('.pp-object-sub')?.textContent || ''`);
const stepsWere = await parts.eval(steps);

// In the 3D app: the sphere chosen, taken out, and saved again — version 2.
await page.pointer(await onStage(0.5, 0.5));
await wait(400);
await page.click(`document.getElementById('remove')`);
await page.until(`/^box, torus/.test(${say})`, { timeout: 10000 }).catch(() => {});
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed/.test(${say})`, { timeout: 60000 }).catch(() => {});
const v2 = skw ? inner(await (await fetch(c.base + '/api/vault/' + skw)).json()) : null;
c.ok('the sphere taken out in the 3D app and saved: the same smart object, version 2', !!v2 && v2.version === 2 && v2.recipe.shapes.length === 2,
  v2 ? `${v2.id} v${v2.version}, ${v2.recipe.shapes.length} shapes` : 'nothing saved');

// In particles: the sprites follow, held still, no reload.
await parts.until(`(${hash}) !== ${was}`, { timeout: 30000 }).catch(() => {});
const is = await parts.eval(hash);
c.ok('particles\' sprites follow it: drawn again in the new picture, the loop held still', is !== was, `${was} → ${is}`);
c.ok('…with no reload', await parts.eval(`window.__notReloaded === true`));
await parts.until(`/v2/.test(${row('sprites')}?.querySelector('.pp-object-sub')?.textContent || '')`, { timeout: 10000 }).catch(() => {});
const fieldIs = await parts.eval(`${row('sprites')}?.querySelector('.pp-object-sub')?.textContent || ''`);
c.ok('…its field says the new version', /v1/.test(fieldWas) && /v2/.test(fieldIs), `${fieldWas} → ${fieldIs}`);
c.ok('…and following it is no step of particles\' history — its hand\'s edit the last', stepsWere >= 1 && (await parts.eval(steps)) === stepsWere,
  `${stepsWere} → ${await parts.eval(steps)}`);
await c.shot('1-followed');

// L1: the same smart object a layer of particles' stack, kept at a state — and the page the stack saves keeps it so.
const stackButton = label => `[...document.querySelectorAll('.pp-stack-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
const layerRow = name => `[...document.querySelectorAll('.pp-stack-layer .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
await parts.click(stackButton('＋ from the vault…'));
await parts.until(`!!${card}`, { timeout: 20000 }).catch(() => {});
await parts.click(`${card}?.closest('.vp-cell')?.querySelector('.vp-use')`);
await parts.until(`document.querySelectorAll('.pp-stack-row').length === 2`, { timeout: 10000 }).catch(() => {});
const stateRow = layerRow('at its state · 0 follows');
await parts.click(`[...document.querySelectorAll('.pp-stack-row')].find(r => !/from the vault/.test(r.textContent))`);
await wait(300);
const windowHasNone = await parts.eval(`!${stateRow} || ${stateRow}.hidden`);
await parts.click(`[...document.querySelectorAll('.pp-stack-row')].find(r => /from the vault/.test(r.textContent))`);
await parts.until(`!!${stateRow} && !${stateRow}.hidden`, { timeout: 5000 }).catch(() => {});
c.ok('its layer in the stack has a state to be kept at — a window\'s has none', windowHasNone && await parts.eval(`!!${stateRow} && !${stateRow}.hidden`));
await parts.typeInto(`${layerRow('at its state · 0 follows')}?.querySelector('.pp-num')`, '1');
await wait(400);
const said = `(document.querySelector('.pp-stack-said')?.textContent || '')`;
const before = new Set(((await (await fetch(c.base + '/api/vault')).json()).objects || []).map(o => o.id));
await parts.click(stackButton('Save the stack as a page'));
await parts.until(`/^saved |not saved/.test(${said})`, { timeout: 120000 }).catch(() => {});
const pageMade = ((await (await fetch(c.base + '/api/vault')).json()).objects || []).find(o => !before.has(o.id) && o.type === 'composition');
const kept = pageMade ? (await (await fetch(c.base + '/api/vault/' + pageMade.id)).json()).recipe.place.find(b => b.ref === skw) : null;
c.ok('…kept at version 1, the page the stack saves places it at version 1', !!kept && kept.version === 1, kept ? JSON.stringify(kept) : await parts.eval(said));

// L2: the same smart object placed in compose — at its state, as S6b places a project — and flattened.
const compose = await c.tab(c.base + '/apps/compose/');
const plAct = label => `[...document.querySelectorAll('.pl-actions .nb-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
await compose.until(`!!${plAct('Add…')}`, { timeout: 20000 });
await compose.click(plAct('Add…'));
await compose.until(`!!${card}`, { timeout: 20000 }).catch(() => {});
await compose.click(`${card}?.closest('.vp-cell')?.querySelector('.vp-use')`);
await compose.until(`document.querySelectorAll('#place-side .pl-row').length === 1`, { timeout: 30000 }).catch(() => {});
await compose.until(`!!${plAct('Flatten')} && !${plAct('Flatten')}.disabled`, { timeout: 10000 }).catch(() => {});
c.ok('placed in compose, the smart object can be flattened', await compose.eval(`!!${plAct('Flatten')} && !${plAct('Flatten')}.disabled`));
await compose.click(plAct('Flatten'));
await compose.until(`/^flattened: |could not flatten/.test(${say})`, { timeout: 30000 }).catch(() => {});
const flatId = ((await compose.eval(say)).match(/ — (\S+)$/) || [])[1];
const flat = flatId ? await (await fetch(c.base + '/api/vault/' + flatId)).json() : null;
c.ok('flattened: a model of its own, made from the state it was placed at, holding nothing', !!flat && flat.type === 'model'
  && JSON.stringify(flat.parents) === JSON.stringify([skw + '@v2']) && !(flat.refs || []).length,
  flat ? JSON.stringify({ type: flat.type, parents: flat.parents, refs: flat.refs }) : await compose.eval(say));
await compose.until(`${plAct('Flatten')}?.disabled`, { timeout: 10000 }).catch(() => {});
c.ok('…the placement pointing at it, nothing left there to flatten', await compose.eval(`!!${plAct('Flatten')}?.disabled`));

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
