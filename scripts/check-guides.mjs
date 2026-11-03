#!/usr/bin/env node
/**
 * scripts/check-guides.mjs — S8 in Chrome: the viewer's rulers, guides and
 * magnet (core/shell/rulers.js, core/shell/guides.js), and F's placing.
 *
 *   node scripts/check-guides.mjs
 *
 * In particles: the rulers sit over the stage's padding, never the picture,
 * in its own pixels; a level guide drawn out of the top ruler and let go
 * near the middle is pulled to the centre; with the magnet off, it stays
 * where it is let go; one held by its grip and dragged back into the ruler
 * it came out of is gone; an upright one out of the left ruler. A guide's
 * line takes no press: the handle under it is still the app's. A handle dragged near a guide is pulled onto it; the one
 * last pressed is what F puts at the centre, and the bar says so. On another
 * format the guides are not shown, and the offer lays them again in %. The
 * rulers off, none of it is shown; the search finds the switches by their
 * words. In compose, a viewer with no head of its own is given one, its
 * tools in it. And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const G = `(await import('/core/shell/guides.js'))`;
const guides = () => page.eval(`(async () => ${G}.guides().map(g => g.axis + g.px).join(' '))()`);
const rect = sel => page.eval(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height] : null; })()`);
const num = key => page.eval(`+document.querySelector('.pp-row[data-key="${key}"] .pp-num').value`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('skw-rulers .rl-x') && !!document.querySelector('.pp-row[data-key="x"] .pp-num')`);

const cv = await rect('.viewer-stage canvas'), rx = await rect('skw-rulers .rl-x'), ry = await rect('skw-rulers .rl-y');
const [cl, ct, cw, ch] = cv;
const z = cw / 1080;                                   // the picture is 1080 × 1080 until the format changes
c.ok('the rulers sit over the stage\'s padding, not the picture', rx[1] + rx[3] <= ct + 0.5 && ry[0] + ry[2] <= cl + 0.5, JSON.stringify({ cv, rx, ry }));
const zero = await page.eval(`(() => { const t = [...document.querySelectorAll('skw-rulers .rl-x text')].find(n => n.textContent === '0'); return t ? t.getBoundingClientRect().left : null; })()`);
c.ok('the top ruler counts the picture\'s pixels from its left edge', zero != null && Math.abs(zero - (cl + 3)) < 2.5, `0 at ${zero}, the picture at ${cl}`);

// A level guide out of the top ruler, let go 3 screen pixels under the middle: the magnet takes it.
await page.pointer([cl + cw * 0.3, rx[1] + 9], [cl + cw * 0.3, ct + ch / 2 + 3], 8);
c.ok('a guide drawn out of the top ruler, near the middle, is pulled to the centre', (await guides()) === 'y540', await guides());

// The magnet off: let go near the middle, it stays where it is let go.
await page.click(`document.querySelector('skw-viewtools .vt-magnet')`);
await page.pointer([cl + cw * 0.6, rx[1] + 9], [cl + cw * 0.6, ct + 550 * z], 8);
const free = await guides();
c.ok('with the magnet off, a guide stays where it is let go', /^y540 y5(49|50|51)$/.test(free), free);
await page.click(`document.querySelector('skw-viewtools .vt-magnet')`);

// The second held by its grip in the left ruler, dragged back up into the top one: gone.
const grip = await page.eval(`(() => { const r = document.querySelectorAll('skw-rulers .gd-grip-y')[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await page.pointer(grip, [grip[0], rx[1] + 6], 8);
c.ok('a guide dragged back into a ruler is gone', (await guides()) === 'y540', await guides());

// An upright one out of the left ruler, at 30 % across: nothing near, so no pull.
await page.pointer([ry[0] + 9, ct + ch * 0.2], [cl + 324 * z, ct + ch * 0.2], 8);
c.ok('an upright guide out of the left ruler', (await guides()) === 'y540 x324', await guides());

// The emitter dragged to 4 screen pixels right of the upright guide: pulled onto it.
const ex = await num('x'), ey = await num('y');
const handle = [cl + (540 + ex) * z, ct + (540 + ey) * z];
await page.pointer(handle, [cl + 324 * z + 4, handle[1] - 40], 10);
c.ok('a handle dragged near a guide is pulled onto it', (await num('x')) === 324 - 540, `x from centre ${await num('x')}`);

// The field's centre, under the level guide at the middle, pressed and moved — the guide takes no press —
// then F: the one last pressed, to the centre.
const fieldAt = [cl + (540 + await num('fx')) * z, ct + (540 + await num('fy')) * z];
await page.pointer(fieldAt, [fieldAt[0] + 120, fieldAt[1] + 70], 8);
const moved = [await num('fx'), await num('fy')];
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true }))`);
await wait(300);
const placed = [await num('fx'), await num('fy')];
const said = await page.eval(`document.querySelector('.bar-say').textContent`);
c.ok('F puts the one last pressed at the centre, and the bar says so', moved[0] !== 0 && placed[0] === 0 && placed[1] === 0 && /fields' centre → the centre/.test(said),
  JSON.stringify({ moved, placed, said }));

// Another format: the guides are not shown, and the offer lays them again — in %, scaled.
await page.typeInto(`document.querySelector('.pp-row[data-key="format"] select')`, 'hd');
await page.until(`!!document.querySelector('skw-rulers .gd-away')`, { timeout: 5000 }).catch(() => {});
const away = await page.eval(`(async () => ({ shown: ${G}.guides().length, offer: document.querySelector('skw-rulers .gd-away span')?.textContent || '' }))()`);
c.ok('on another format the guides are not shown, and laying them again is offered', away.shown === 0 && /2 guides of 1080 × 1080/.test(away.offer), JSON.stringify(away));
await page.click(`[...document.querySelectorAll('skw-rulers .gd-act')].find(b => b.textContent === 'in %')`);
c.ok('laid again in %, they are scaled to it', (await guides()) === 'y540 x576', await guides());

// Rulers off: neither rulers nor guides.
await page.click(`document.querySelector('skw-viewtools .vt-rulers')`);
const off = await page.eval(`({ rulers: !!document.querySelector('skw-rulers .rl'), guides: document.querySelectorAll('skw-rulers .gd').length })`);
c.ok('the rulers off, neither rulers nor guides', !off.rulers && off.guides === 0, JSON.stringify(off));

// The search finds the switch by its words, and Enter presses it.
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '²', bubbles: true }))`);
await page.eval(`(() => { const i = document.querySelector('.pal-input'); i.value = 'rulers'; i.dispatchEvent(new Event('input')); })()`);
const pal = await page.eval(`[...document.querySelectorAll('.pal-list li.pal-act .pal-name')].map(n => n.textContent)`);
await page.eval(`document.querySelector('.pal-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
await wait(300);
c.ok('the search finds the rulers by name, and Enter turns them back on', pal.includes('Rulers and guides, on or off')
  && await page.eval(`!!document.querySelector('skw-rulers .rl-x')`), JSON.stringify(pal));

// compose has no viewer head of its own: one is made, the tools at its end.
await c.go(c.base + '/apps/compose/');
await page.until(`!!document.querySelector('skw-rulers .rl-x')`);
c.ok('a viewer with no head is given one, its tools in it', await page.eval(`!!document.querySelector('.viewer > .viewer-head > skw-viewtools .vt-rulers')`));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
