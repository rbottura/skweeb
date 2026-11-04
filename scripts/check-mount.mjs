#!/usr/bin/env node
/**
 * scripts/check-mount.mjs — S9's seam in Chrome: an app a module, mounted
 * and unmounted (apps/particles/main.js, core/scope.js).
 *
 *   node scripts/check-mount.mjs
 *
 * particles alone, as its page mounts it; then unmounted — nothing of it
 * left on the page, none of its keys answering, none of its params' steps,
 * gone from the other windows with a bye — and mounted again into another
 * host, three times over, playing as before: one page grid, one title bar,
 * one vault panel to V, one save to S, the same as the first mount made —
 * and as many listeners on the document and the window as it had, counted
 * from before the page loads.
 * And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const app = `import('/apps/particles/main.js')`;
const press = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`);
const counts = () => page.eval(`({ app: document.querySelectorAll('.app').length, top: document.querySelectorAll('skw-titlebar').length,
  vp: document.querySelectorAll('.vp').length, pp: document.querySelectorAll('.pp').length, bar: document.querySelectorAll('footer.bar').length,
  rulers: document.querySelectorAll('skw-rulers').length })`);
const keys = () => page.eval(`import('/core/keys.js').then(k => k.bound().map(b => b.code))`);
const watched = () => page.eval(`import('/core/steps.js').then(s => s.watched().length)`);
const frame = () => page.eval(`(document.querySelector('.tp .tp-time, .tp-time')?.textContent || '') + '|' + (document.querySelector('.bar-say')?.textContent || '')`);

// Every listener on the document and the window, counted as it comes and goes: a mount's must all go.
await page.beforeLoad(`(() => {
  const live = new Map();
  for (const [name, t] of [['document', document], ['window', window]]) {
    const add = t.addEventListener.bind(t), rm = t.removeEventListener.bind(t);
    const key = (type, fn, o) => type + '|' + (typeof o === 'boolean' ? o : !!(o && o.capture));
    const set = new Map();
    live.set(name, set);
    t.addEventListener = (type, fn, o) => { if (fn) { const k = key(type, fn, o); if (!set.has(k)) set.set(k, new Set()); set.get(k).add(fn); } return add(type, fn, o); };
    t.removeEventListener = (type, fn, o) => { const s = set.get(key(type, fn, o)); if (s) s.delete(fn); return rm(type, fn, o); };
  }
  window.__listeners = () => Object.fromEntries([...live].map(([n, set]) => [n, [...set.values()].reduce((a, s) => a + s.size, 0)]));
})()`);
const listeners = () => page.eval(`window.__listeners()`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('.pp-row .pp-num') && !!document.querySelector('skw-titlebar')`);
await wait(600);
await page.eval(`window.__saved = 0; document.addEventListener('vault:saved', () => window.__saved++)`);
const first = await counts();
const heldFirst = await listeners();
c.ok('alone: its page mounts it, once', first.app === 1 && first.top === 1 && first.bar === 1, JSON.stringify(first));
const before = await keys();
c.ok("its keys answer: A its own, F placing", before.includes('KeyQ') && before.includes('KeyF'), before.join(' '));
c.ok('its params watched for steps', (await watched()) >= 2);

// One S, and the saves it makes: what every later mount's S must make too.
await press('s');
await page.until(`window.__saved > 0`, 20000);
await wait(1500);
const once = await page.eval(`window.__saved`);
c.ok('S saves', once >= 1, `${once} saved`);

// Unmounted: nothing left, nothing answering, gone from the windows.
await page.eval(`window.__heard = []; window.__ch = new BroadcastChannel('skweeb-live');
  window.__ch.onmessage = e => window.__heard.push(e.data && e.data.kind)`);
await page.eval(`${app}.then(m => m.unmount())`);
await wait(300);
const gone = await counts();
const heldGone = await listeners();
c.ok('…its listeners off the document and the window', heldGone.document < heldFirst.document && heldGone.window <= heldFirst.window,
  `${JSON.stringify(heldFirst)} → ${JSON.stringify(heldGone)}`);
c.ok('unmounted: no grid, no panels, no bar, no title bar, no vault panel',
  Object.values(gone).every(n => n === 0), JSON.stringify(gone));
const after = await keys();
c.ok("…its own keys no more: A and F are not core's now", !after.includes('KeyQ') && !after.includes('KeyF'), after.join(' '));
c.ok('…its params watched no more', (await watched()) === 0);
c.ok('…a bye to the other windows', (await page.eval(`window.__heard`)).includes('bye'), JSON.stringify(await page.eval(`window.__heard`)));
c.ok('…its stylesheet kept: the page linked it, not the mount',
  await page.eval(`[...document.querySelectorAll('link[rel=stylesheet]')].filter(l => l.href.endsWith('/apps/particles/style.css')).length === 1`));
await page.eval(`window.__saved = 0`);
await press('s');
await wait(1200);
c.ok('…S saves nothing', (await page.eval(`window.__saved`)) === 0);

// Mounted again, into a host of its own, three times over: as the first.
await page.eval(`(() => { const h = document.createElement('div'); h.id = 'host'; document.body.append(h); })()`);
for (let i = 0; i < 3; i++) await page.eval(`${app}.then(m => m.mount(document.getElementById('host')))`);
await page.until(`!!document.querySelector('#host .app .pp-row .pp-num')`);
await wait(800);
const again = await counts();
const heldAgain = await listeners();
c.ok('…as many listeners as the first mount had, three mounts on', JSON.stringify(heldAgain) === JSON.stringify(heldFirst),
  `${JSON.stringify(heldAgain)}, against ${JSON.stringify(heldFirst)}`);
c.ok('mounted again, three times: one of each', again.app === 1 && again.top === 1 && again.bar === 1 && again.rulers === 1
  && again.vp === 1, JSON.stringify(again));
c.ok('…into the host it was given', await page.eval(`!!document.querySelector('#host > .app')`));
const a = await frame();
await wait(700);
const b = await frame();
c.ok('…and it plays', a !== b, `${a} → ${b}`);
const back = await keys();
c.ok('…its keys back', back.includes('KeyQ') && back.includes('KeyF'), back.join(' '));
await press('v');
await wait(300);
c.ok('V: one vault panel opens', await page.eval(`document.querySelectorAll('.vp.vp--visible').length === 1`));
await press('v');
await page.eval(`window.__saved = 0`);
await press('s');
await page.until(`window.__saved > 0`, 20000);
await wait(1500);
const later = await page.eval(`window.__saved`);
c.ok('S: the saves of one S, as at the first mount — no listener left twice', later === once, `${later}, against ${once}`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
