#!/usr/bin/env node
/**
 * scripts/check-steps.mjs — S6c in Chrome: the session's steps
 * (core/steps.js), Ctrl Z and Ctrl Y over a page's params.
 *
 *   node scripts/check-steps.mjs
 *
 * In particles: a value typed, Ctrl Z gives back the one before and Ctrl Y
 * the one typed, Ctrl Shift Z too, the bar saying each; a box dragged
 * sideways is one step however long; a panel's Reset is one step, gone
 * back over by Ctrl Z; and in a field, Ctrl Z is the field's own — the
 * page's steps untouched. No page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = key => `document.querySelector('.pp-row[data-key="${key}"]')`;
const num = key => page.eval(`+${row(key)}.querySelector('.pp-num').value`);
const ctrl = (k, shift = false) => page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', ctrlKey: true, shiftKey: ${shift}, bubbles: true }))`);
const said = () => page.eval(`document.querySelector('.bar-say').textContent`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!${row('rate')} && !!${row('speed')}`);

// A value typed: back and on.
const rate0 = await num('rate');
await page.typeInto(`${row('rate')}.querySelector('.pp-num')`, '150');
await wait(600);
await ctrl('z');
await wait(150);
const back = [await num('rate'), await said()];
await ctrl('y');
await wait(150);
const on = await num('rate');
await ctrl('z'); await wait(150);
await ctrl('z', true); await wait(150);
c.ok('Ctrl Z the value before, Ctrl Y the one typed, the bar saying so', back[0] === rate0 && /a step back/.test(back[1]) && on === 150,
  JSON.stringify({ back, on }));
c.ok('Ctrl Shift Z on too', (await num('rate')) === 150, String(await num('rate')));

// A box dragged sideways: one step, however long.
await wait(600);
const speed0 = await num('speed');
const b = await page.eval(`(() => { const r = ${row('speed')}.querySelector('.pp-num').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await page.pointer(b, [b[0] + 60, b[1]], 14);
const dragged = await num('speed');
await wait(600);
await ctrl('z'); await wait(150);
c.ok('a drag is one step: one Ctrl Z, where it began', dragged !== speed0 && (await num('speed')) === speed0, `${speed0} → ${dragged} → ${await num('speed')}`);

// A panel's Reset: one step.
await ctrl('y'); await wait(150);
const before = [await num('rate'), await num('speed')];
await page.click(`[...document.querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'Reset')`);
await wait(200);
const reset = [await num('rate'), await num('speed')];
await ctrl('z'); await wait(200);
c.ok('a Reset is one step: Ctrl Z, the values before it', reset[0] === rate0 && reset[1] === speed0
  && JSON.stringify([await num('rate'), await num('speed')]) === JSON.stringify(before), JSON.stringify({ before, reset }));

// In a field, Ctrl Z is the field's.
const held = await num('rate');
await page.eval(`(() => { const box = ${row('seed')}.querySelector('.pp-num'); box.focus();
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); })()`);
await wait(150);
c.ok("in a field, Ctrl Z is the field's own: the page's steps untouched", (await num('rate')) === held);
await page.eval(`document.activeElement && document.activeElement.blur()`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
