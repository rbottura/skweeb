#!/usr/bin/env node
/**
 * scripts/check-mount.mjs — S9's seam in Chrome: every app a module,
 * mounted and unmounted (core/mount.js, core/scope.js).
 *
 *   node scripts/check-mount.mjs
 *
 * Each app alone, as its page mounts it; then unmounted — nothing of it
 * left on the page, none of its own keys answering, none of its params'
 * steps, gone from the other windows with a bye, and nothing of it still
 * running: no listener on the document or the window, no channel open, no
 * interval, no frame asked for — counted from before the page loads. Then
 * mounted again into another host, three times over, and as the first
 * mount was: one page grid, one title bar, one vault panel to V, as many
 * listeners, channels and intervals. Where it plays, it plays; where it
 * saves — particles and ckt with nothing chosen, grid on a still of the
 * vault — one S saves as the first mount's did; what a visit keeps — ckt's
 * session and the sets made in it — is kept. And no page said anything
 * wrong.
 */

import { startCheck } from './check-kit.mjs';

/** The first still in the vault, as grid's source: what it dithers, and so saves. */
const A_STILL = `import('/core/vault.js').then(async ({ Vault }) => {
  await Vault.refresh();
  const id = (Vault.index || []).find(r => r.type === 'still' && !(r.tags || []).includes('trash'))?.id;
  const { rowParams } = await import('/core/param-rows.js');
  const o = rowParams(document.querySelector('.pp-row[data-key="source"]'));
  if (id && o) o.params.set('source', id);
  return id || null;
})`;

/**
 * ckt's visit, which is the page's and not a mount's (apps/ckt/sessions.js):
 * a dot-set made in dots, and the session it is filed in — the same one
 * mounted again, the sets made before still listed.
 */
const CKT_VISIT = `(async () => {
  const say = () => document.querySelector('.bar-say')?.textContent || '';
  const rowsBefore = document.querySelectorAll('.ss-row').length;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
  for (let i = 0; i < 150 && !/in “/.test(say()); i++) await new Promise(r => setTimeout(r, 200));
  return { session: (say().match(/in “([^”]+)”/) || [])[1] || null, rowsBefore, rows: document.querySelectorAll('.ss-row').length };
})()`;

/** The newest drawing of the gamepad's, as the server lists it: what the rig is opened with, `?drawing=<id>`. */
const aDrawing = async c => {
  const { objects = [] } = await (await fetch(c.base + '/api/vault')).json();
  const drawn = objects.filter(r => r.type === 'still' && r.origin && r.origin.app === 'gamepad' && !(r.tags || []).includes('trash'))
    .sort((a, b) => String(b.created).localeCompare(String(a.created)))[0];
  return drawn ? '?drawing=' + encodeURIComponent(drawn.id) : '';
};

/** The first still in the vault, as the server lists it: what compose is opened with, `?place=<id>`. */
const placeAStill = async c => {
  const { objects = [] } = await (await fetch(c.base + '/api/vault')).json();
  const still = objects.find(r => r.type === 'still' && !(r.tags || []).includes('trash'));
  return still ? '?place=' + encodeURIComponent(still.id) : '';
};

/**
 * The apps that are modules: their own keys — those core answers for them, and
 * those they keep from core (`kept`, core/keys.js `own`) — whether they play as they open,
 * what makes them ready to save — run after every mount — and when it is;
 * what its page is opened with, read by every mount; what a visit keeps from
 * one mount to the next, where an app keeps any.
 */
const APPS = [
  { name: 'particles', own: ['KeyQ', 'KeyF'], plays: true, saves: true },
  { name: 'grid', own: [], plays: false, saves: true, prepare: A_STILL,
    ready: `/cells/.test(document.querySelector('.bar-say')?.textContent || '')` },
  { name: 'ckt', own: [], plays: true, saves: true, visit: CKT_VISIT },
  { name: 'compose', own: [], plays: false, saves: true, query: placeAStill,
    ready: `/1 placed · .+ on the page/.test(document.querySelector('.bar-say')?.textContent || '')` },
  { name: 'map', own: ['KeyQ'], plays: false, saves: true },
  { name: 'filter', own: [], plays: false, saves: true, prepare: A_STILL,
    ready: `/filters on|no filters yet/.test(document.querySelector('.bar-say')?.textContent || '')` },
  { name: 'fractals', own: [], plays: false, saves: true,
    ready: `/iterations/.test(document.querySelector('.bar-say')?.textContent || '')` },
  { name: 'rig', own: [], kept: ['KeyR'], plays: false, saves: true, query: aDrawing,
    ready: `/[0-9]+ bones/.test(document.querySelector('.bar-say')?.textContent || '')` },
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
const saved = async () => { await page.until(`window.__saved > 0`, { timeout: 30000 }); await wait(1500); return page.eval(`window.__saved`); };

/*
 * Before the page loads: every listener on the document and the window
 * counted as it comes and goes, every channel as it opens and closes, every
 * interval as it is set and cleared, every frame asked for — a mount's must
 * all go with it. The check's own channel is made with the page's own
 * BroadcastChannel, kept aside, so it is not counted.
 */
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
  const Channel = window.BroadcastChannel, channels = new Set();
  window.__Channel = Channel;
  window.BroadcastChannel = class extends Channel {
    constructor(name) { super(name); channels.add(this); }
    close() { channels.delete(this); return super.close(); }
  };
  const every = window.setInterval.bind(window), stop = window.clearInterval.bind(window), intervals = new Set();
  window.setInterval = (fn, ms, ...rest) => { const id = every(fn, ms, ...rest); intervals.add(id); return id; };
  window.clearInterval = id => { intervals.delete(id); return stop(id); };
  const raf = window.requestAnimationFrame.bind(window);
  let frames = 0;
  window.requestAnimationFrame = fn => { frames++; return raf(fn); };
  window.__held = () => ({ ...Object.fromEntries([...live].map(([n, set]) => [n, [...set.values()].reduce((a, s) => a + s.size, 0)])),
    channels: channels.size, intervals: intervals.size });
  window.__frames = () => frames;
})()`);
const held = () => page.eval(`window.__held()`);
/** Frames asked for over a little more than half a second: a clock playing asks one each. */
const framesAsked = async () => { const a = await page.eval(`window.__frames()`); await wait(600); return (await page.eval(`window.__frames()`)) - a; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const { name, own, kept = [], plays, saves, prepare = null, ready = null, visit = null, query = null } of APPS) {
  const app = `import('/apps/${name}/main.js')`;
  const say = text => `${name}: ${text}`;
  const hasOwn = list => own.every(k => list.includes(k));
  const noOwn = list => own.every(k => !list.includes(k));
  const readied = async () => {
    if (prepare && !(await page.eval(prepare))) return false;
    if (ready) { await page.until(ready, { timeout: 30000 }); await wait(400); }
    return true;
  };

  await c.go(c.base + `/apps/${name}/` + (query ? await query(c) : ''));
  await page.until(`!!document.querySelector('.pp-row') && !!document.querySelector('skw-titlebar')`);
  await wait(800);
  await page.eval(`window.__saved = 0; document.addEventListener('vault:saved', () => window.__saved++)`);
  const can = await readied();
  if (prepare || query) c.ok(say('ready to save: a still of the vault on it'), can);
  const first = { ...(await counts()) };
  Object.defineProperty(first, 'keys', { value: await keys(), enumerable: false });
  const heldFirst = await held();
  c.ok(say('alone, its page mounts it, once'), first.app === 1 && first.top === 1 && first.bar === 1, JSON.stringify(first));
  c.ok(say('its own keys answer'), hasOwn(await keys()), (await keys()).join(' '));
  if (kept.length) c.ok(say(`the keys it keeps, not core's while it is mounted: ${kept.join(' ')}`), kept.every(k => !(first.keys || []).includes(k)));
  c.ok(say('its params watched for steps'), (await watched()) >= 1);
  if (plays) c.ok(say('it plays: frames asked for'), (await framesAsked()) > 5);
  let once = 0;
  if (saves && can) { await press('s'); once = await saved(); c.ok(say('S saves'), once >= 1, `${once} saved`); }
  const visited = visit ? await page.eval(visit) : null;
  if (visit) c.ok(say('what its visit keeps, made'), !!visited.session && visited.rows > visited.rowsBefore, JSON.stringify(visited));
  // A save holds the player still: played again, so what is unmounted is playing.
  if (plays) {
    if ((await framesAsked()) < 5) await press(' ');
    c.ok(say('playing as it is unmounted'), (await framesAsked()) > 5);
  }

  // Unmounted: nothing left, nothing answering, nothing running, gone from the windows.
  await page.eval(`window.__heard = []; window.__ch = new window.__Channel('skweeb-live');
    window.__ch.onmessage = e => window.__heard.push(e.data && e.data.kind)`);
  await page.eval(`${app}.then(m => m.unmount())`);
  await wait(300);
  const gone = await counts();
  const heldGone = await held();
  c.ok(say('unmounted: no grid, no panels, no bar, no title bar, no vault panel'), Object.values(gone).every(n => n === 0), JSON.stringify(gone));
  c.ok(say('…its listeners off the document and the window'), heldGone.document < heldFirst.document && heldGone.window <= heldFirst.window,
    `${JSON.stringify(heldFirst)} → ${JSON.stringify(heldGone)}`);
  c.ok(say('…no channel open, no interval set'), heldGone.channels === 0 && heldGone.intervals === 0, JSON.stringify(heldGone));
  c.ok(say('…no frame asked for'), (await framesAsked()) === 0);
  const after = await keys();
  c.ok(say("…its own keys no more, nor the ground's"), noOwn(after) && !after.includes('KeyG'), after.join(' '));
  if (kept.length) c.ok(say(`…the keys it kept, core's again: ${kept.join(' ')}`), kept.every(k => after.includes(k)), after.join(' '));
  c.ok(say('…its params watched no more'), (await watched()) === 0);
  c.ok(say('…a bye to the other windows'), (await page.eval(`window.__heard`)).includes('bye'), JSON.stringify(await page.eval(`window.__heard`)));
  await page.eval(`window.__ch.close()`);
  c.ok(say('…its stylesheet kept: the page linked it, not the mount'),
    await page.eval(`[...document.querySelectorAll('link[rel=stylesheet]')].filter(l => l.href.endsWith('/apps/${name}/style.css')).length === 1`));
  if (saves && can) {
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
  const heldAgain = await held();
  c.ok(say('mounted again, three times: one of each'), same(again, first), `${JSON.stringify(again)}, against ${JSON.stringify(first)}`);
  c.ok(say('…as many listeners, channels and intervals as the first mount had'), same(heldAgain, heldFirst),
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
  if (saves && can && await readied()) {
    await page.eval(`window.__saved = 0`);
    await press('s');
    const later = await saved();
    c.ok(say('S: the saves of one S, as at the first mount'), later === once, `${later}, against ${once}`);
  }
  if (visit) {
    const again = await page.eval(visit);
    c.ok(say('…and its visit kept: the same session, what it made still listed'),
      again.session === visited.session && again.rowsBefore === visited.rows, `${JSON.stringify(again)}, against ${JSON.stringify(visited)}`);
  }
  const noise = c.quiet();
  c.ok(say('the console stayed quiet'), !noise.length, JSON.stringify(noise).slice(0, 300));
}

await c.finish();
