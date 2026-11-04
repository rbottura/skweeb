#!/usr/bin/env node
/**
 * scripts/check-mount.mjs — S9's seam in Chrome: every app a module,
 * mounted and unmounted (core/mount.js, core/scope.js).
 *
 *   node scripts/check-mount.mjs
 *
 * Each app alone, as its page mounts it; then unmounted — nothing of it
 * left on the page, none of its own keys answering, none of its params'
 * steps, gone from the other windows with a bye — and mounted again into
 * another host, three times over, as before: one page grid, one title bar,
 * one vault panel to V, as many listeners on the document and the window as
 * the first mount had, counted from before the page loads. Where it plays
 * with nothing chosen, it plays; where S saves with nothing chosen, one S
 * saves as the first mount's did. And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

/** The apps that are modules, and what each does with nothing chosen. */
const APPS = [
  { name: 'particles', own: ['KeyQ', 'KeyF'], plays: true, saves: true },
  { name: 'grid', own: [], plays: false, saves: false },
];

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const press = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`);
const counts = () => page.eval(`({ app: document.querySelectorAll('.app').length, top: document.querySelectorAll('skw-titlebar').length,
  vp: document.querySelectorAll('.vp').length, pp: document.querySelectorAll('.pp').length, bar: document.querySelectorAll('footer.bar').length,
  rulers: document.querySelectorAll('skw-rulers').length })`);
const keys = () => page.eval(`import('/core/keys.js').then(k => k.bound().map(b => b.code))`);
const watched = () => page.eval(`import('/core/steps.js').then(s => s.watched().length)`);
const frame = () => page.eval(`(document.querySelector('.tp .tp-time, .tp-time')?.textContent || '') + '|' + (document.querySelector('.bar-say')?.textContent || '')`);
const saved = async () => { await page.until(`window.__saved > 0`, { timeout: 20000 }); await wait(1500); return page.eval(`window.__saved`); };

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

for (const { name, own, plays, saves } of APPS) {
  const app = `import('/apps/${name}/main.js')`;
  const say = text => `${name}: ${text}`;
  const hasOwn = list => own.every(k => list.includes(k));
  const noOwn = list => own.every(k => !list.includes(k));

  await c.go(c.base + `/apps/${name}/`);
  await page.until(`!!document.querySelector('.pp-row') && !!document.querySelector('skw-titlebar')`);
  await wait(800);
  await page.eval(`window.__saved = 0; document.addEventListener('vault:saved', () => window.__saved++)`);
  const first = await counts();
  const heldFirst = await listeners();
  c.ok(say('alone, its page mounts it, once'), first.app === 1 && first.top === 1 && first.bar === 1, JSON.stringify(first));
  const before = await keys();
  c.ok(say('its own keys answer'), hasOwn(before), before.join(' '));
  c.ok(say('its params watched for steps'), (await watched()) >= 1);
  let once = 0;
  if (saves) { await press('s'); once = await saved(); c.ok(say('S saves'), once >= 1, `${once} saved`); }

  // Unmounted: nothing left, nothing answering, gone from the windows.
  await page.eval(`window.__heard = []; window.__ch = new BroadcastChannel('skweeb-live');
    window.__ch.onmessage = e => window.__heard.push(e.data && e.data.kind)`);
  await page.eval(`${app}.then(m => m.unmount())`);
  await wait(300);
  const gone = await counts();
  const heldGone = await listeners();
  c.ok(say('unmounted: no grid, no panels, no bar, no title bar, no vault panel'), Object.values(gone).every(n => n === 0), JSON.stringify(gone));
  c.ok(say('…its listeners off the document and the window'), heldGone.document < heldFirst.document && heldGone.window <= heldFirst.window,
    `${JSON.stringify(heldFirst)} → ${JSON.stringify(heldGone)}`);
  const after = await keys();
  c.ok(say("…its own keys no more, nor the ground's"), noOwn(after) && !after.includes('KeyG'), after.join(' '));
  c.ok(say('…its params watched no more'), (await watched()) === 0);
  c.ok(say('…a bye to the other windows'), (await page.eval(`window.__heard`)).includes('bye'), JSON.stringify(await page.eval(`window.__heard`)));
  c.ok(say('…its stylesheet kept: the page linked it, not the mount'),
    await page.eval(`[...document.querySelectorAll('link[rel=stylesheet]')].filter(l => l.href.endsWith('/apps/${name}/style.css')).length === 1`));
  if (saves) {
    await page.eval(`window.__saved = 0`);
    await press('s');
    await wait(1200);
    c.ok(say('…S saves nothing'), (await page.eval(`window.__saved`)) === 0);
  }

  // Mounted again, into a host of its own, three times over: as the first.
  await page.eval(`(() => { const h = document.createElement('div'); h.id = 'host'; document.body.append(h); })()`);
  for (let i = 0; i < 3; i++) await page.eval(`${app}.then(m => m.mount(document.getElementById('host')))`);
  await page.until(`!!document.querySelector('#host .app .pp-row')`);
  await wait(800);
  const again = await counts();
  const heldAgain = await listeners();
  c.ok(say('mounted again, three times: one of each'), JSON.stringify(again) === JSON.stringify(first), `${JSON.stringify(again)}, against ${JSON.stringify(first)}`);
  c.ok(say('…as many listeners as the first mount had'), JSON.stringify(heldAgain) === JSON.stringify(heldFirst),
    `${JSON.stringify(heldAgain)}, against ${JSON.stringify(heldFirst)}`);
  c.ok(say('…into the host it was given'), await page.eval(`!!document.querySelector('#host > .app')`));
  c.ok(say('…its own keys back'), hasOwn(await keys()));
  if (plays) {
    const a = await frame();
    await wait(700);
    const b = await frame();
    c.ok(say('…and it plays'), a !== b, `${a} → ${b}`);
  }
  await press('v');
  await wait(300);
  c.ok(say('V: one vault panel opens'), await page.eval(`document.querySelectorAll('.vp.vp--visible').length === 1`));
  await press('v');
  if (saves) {
    await page.eval(`window.__saved = 0`);
    await press('s');
    const later = await saved();
    c.ok(say('S: the saves of one S, as at the first mount'), later === once, `${later}, against ${once}`);
  }
  const noise = c.quiet();
  c.ok(say('the console stayed quiet'), !noise.length, JSON.stringify(noise).slice(0, 300));
}

await c.finish();
