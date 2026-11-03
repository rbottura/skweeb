#!/usr/bin/env node
/**
 * scripts/check-keys.mjs — S5b in Chrome: the left hand (core/keys.js,
 * core/shell/bindings.js, core/shell/pie.js), keys by their place.
 *
 *   node scripts/check-keys.mjs
 *
 * In particles: D and Q a frame on, a frame back, Shift ten; A tapped the
 * emitter's next shape, held its pie, a digit taking a choice; Z tapped the
 * guides, held the view's pie, the pointer aiming and the key let go taking
 * what it aims at; E tapped the title bar's Export menu, held the Export
 * box's acts; R a new seed, and X over its row the seed back to its default;
 * F held, an edge or a corner for the selection; G the ground, or none, and
 * back. Typed into a field, a key is a letter. In the rig, R stays its rest:
 * core leaves a key an app keeps. No page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = key => `document.querySelector('.pp-row[data-key="${key}"]')`;
const num = key => page.eval(`+${row(key)}.querySelector('.pp-num').value`);
const chip = key => page.eval(`${row(key)}.querySelector('.pp-chip--on')?.textContent`);
const count = () => page.eval(`+document.querySelector('.tp-count').textContent.split('/')[0]`);
const key = (code, type = 'keydown', extra = '') => page.eval(`window.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '', bubbles: true${extra} }))`);
const tap = async (code, extra = '') => { await key(code, 'keydown', extra); await key(code, 'keyup', extra); await wait(120); };
const hold = async code => { await key(code); await wait(450); };
const items = () => page.eval(`[...document.querySelectorAll('skw-pie .pie-item')].map(i => i.querySelector('span').textContent + (i.classList.contains('pie-item--on') ? ' (on)' : ''))`);
const digit = n => page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit${n}', key: '${n}', bubbles: true }))`);
const aimAt = label => page.eval(`(() => { const it = [...document.querySelectorAll('skw-pie .pie-item')].find(i => i.querySelector('span').textContent === ${JSON.stringify(label)});
  const r = it.getBoundingClientRect(); window.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true })); })()`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('.tp-count') && !!${row('shape')} && !!document.querySelector('skw-titlebar .tb-export')`);
// The pointer over the viewer: a pie opens where it is.
await page.eval(`(() => { const r = document.querySelector('.viewer-stage').getBoundingClientRect(); window.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true })); })()`);

// Q and D: a frame back and on, Shift ten — by their place, KeyA and KeyD.
await page.click(`document.querySelector('.tp .tp-first')`);
await tap('KeyD');
const one = await count();
await tap('KeyD', ', shiftKey: true');
const eleven = await count();
await tap('KeyA');
c.ok('D a frame on, Shift ten; Q a frame back', one === 2 && eleven === 12 && (await count()) === 11, `${one}, ${eleven}, ${await count()}`);

// A: tapped the emitter's next shape; held its pie, a digit taking one.
const shape0 = await chip('shape');
await tap('KeyQ');
const shape1 = await chip('shape');
await hold('KeyQ');
const pie = await items();
await digit(3);
await wait(150);
c.ok("A tapped: the emitter's next shape", shape0 === 'point' && shape1 === 'line', `${shape0} → ${shape1}`);
c.ok('A held: its pie, the shape it has lit; a digit takes one', pie.length === 5 && pie[1] === 'line (on)' && (await chip('shape')) === 'disc'
  && !(await page.eval(`!!document.querySelector('skw-pie')`)), JSON.stringify(pie));
await page.click(`[...${row('shape')}.querySelectorAll('.pp-chip')].find(b => b.textContent === 'point')`);

// Z: tapped the guides, off and on; held the view's pie, aimed, let go.
const pressed = () => page.eval(`document.getElementById('guides').getAttribute('aria-pressed')`);
await tap('KeyW');
const off = await pressed();
await tap('KeyW');
c.ok('Z tapped: the guides off, and on', off === 'false' && (await pressed()) === 'true', `${off}, ${await pressed()}`);
await hold('KeyW');
const view = await items();
await aimAt('magnetism');
await key('KeyW', 'keyup');
await wait(150);
const magnet = await page.eval(`document.querySelector('skw-viewtools .vt-magnet').getAttribute('aria-pressed')`);
c.ok('Z held: the view, aimed at by the pointer, taken as the key is let go', view.includes('guides (on)') && view.includes('magnetism (on)') && magnet === 'false',
  JSON.stringify({ view, magnet }));
await page.click(`document.querySelector('skw-viewtools .vt-magnet')`);

// E: tapped the title bar's Export menu; held the Export box's acts.
await tap('KeyE');
const menu = await page.eval(`!!document.querySelector('skw-titlebar .tb-menu')`);
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await hold('KeyE');
const acts = await items();
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))`);
await key('KeyE', 'keyup');
c.ok("E tapped: the title bar's Export; held, the Export box's acts, by their words", menu && acts.includes('Save to the vault') && acts.includes('Save the frame as a still')
  && acts.includes('Print…'), JSON.stringify(acts));

// R: a new seed; X over its row, the seed back to its default.
const seed0 = await num('seed');
await tap('KeyR');
const seed1 = await num('seed');
const name = await page.eval(`(() => { const r = ${row('seed')}.querySelector('.pp-name').getBoundingClientRect(); return [r.left + 6, r.top + r.height / 2]; })()`);
await page.pointer(name, name, 1);
await tap('KeyX');
c.ok('R a new seed; X over its row, its default again', seed1 === seed0 + 1 && (await num('seed')) === seed0, `${seed0} → ${seed1} → ${await num('seed')}`);

// F held: the selection — the emitter — to an edge or a corner.
await hold('KeyF');
const anchors = await items();
await digit(8);
await wait(200);
c.ok('F held: the eight edges and corners; the selection to the top left', anchors.length === 8 && anchors[7] === 'the top left'
  && (await num('x')) === -540 && (await num('y')) === -540, `${JSON.stringify(anchors.slice(0, 3))} → ${await num('x')}, ${await num('y')}`);

// G: the ground, or none, and back.
const ground = () => page.eval(`${row('ground')}.querySelector('.pp-value').textContent`);
const g0 = await ground();
await tap('KeyG');
const g1 = await ground();
await tap('KeyG');
c.ok('G the ground: none, and its colour again', g1 === 'none' && (await ground()) === g0 && g0 !== 'none', `${g0} → ${g1} → ${await ground()}`);

// Typed into a field, a key is a letter.
const at = await count();
await page.eval(`(() => { const b = ${row('speed')}.querySelector('.pp-num'); b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true })); })()`);
await wait(120);
c.ok('typed into a field, a key is a letter', (await count()) === at);
await page.eval(`document.activeElement && document.activeElement.blur()`);

// The rig keeps R, its rest: core leaves it.
await c.go(c.base + '/apps/rig/');
await page.until(`!!document.querySelector('skw-titlebar')`);
const rig = await page.eval(`(async () => (await import('/core/keys.js')).bound().map(b => b.code))()`);
c.ok('in the rig, R stays its rest: core leaves a key an app keeps', !rig.includes('KeyR') && rig.includes('KeyD'), JSON.stringify(rig));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
