#!/usr/bin/env node
/**
 * scripts/check-cluster.mjs — S9c's scene in Chrome: cluster, the suite's
 * apps mounted in one page one at a time (apps/cluster/).
 *
 *   node scripts/check-cluster.mjs
 *
 * The scene opens on the vault. A click on the strip mounts another app in
 * its place, the one before gone with what it held: one page grid, one title
 * bar, one bar, one app's stylesheet beside the scene's; the strip and the
 * address say which. Every app mounted in turn, round twice: what the page
 * holds back on the vault — listeners on the document and the window,
 * channels, intervals — is what it held after the first round, no channel
 * and no interval more than the vault alone had, and no frame asked for that
 * the vault alone did not ask. A switch asked while an app is booting waits
 * for it, and the app last asked is the one mounted, nothing more held than
 * when it came in turn. Back goes to the app before; a reload comes back to
 * the app the address names; `?open=<id>` is the app's to read, and a switch
 * leaves it behind. The search finds the apps by name. With no vault at all
 * the scene opens and mounts as ever (rule 7). And no page said anything
 * wrong.
 *
 * Laid as the bench is: every app's viewer — its stage, where its canvas is
 * — in the same place to the pixel; the scene's vault the same one beside
 * it whatever app is mounted; an app's panels a tab each, the one shown
 * kept for its next mount; an object opened in that vault a tab of its own,
 * gone when closed; and as an app is taken out its panels leaving to their
 * side, fading, the next app's coming in, the viewer still — its last frame
 * held where its canvas was, gone once the next has drawn.
 */

import { startCheck, countHeld } from './check-kit.mjs';

/** The strip's apps, in its order, and what shows each has booted — as check-mount has them. */
const APPS = [
  ['vault', 'footer.bar'], ['grid', '.pp-row'], ['ckt', '.pp-row'], ['compose', '.pp-row'], ['filter', '.pp-row'],
  ['fractals', '.pp-row'], ['particles', '.pp-row'], ['map', '.pp-row'], ['rig', '.pp-row'], ['3d', '.pp-row'],
];
const BOOTED = Object.fromEntries(APPS);

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const { held, framesAsked } = await countHeld(page);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What is on the page: its grids, title bars, bars, the app named in the title bar, the apps' stylesheets linked. */
const counts = () => page.eval(`({ app: document.querySelectorAll('.app').length, top: document.querySelectorAll('skw-titlebar').length,
  bar: document.querySelectorAll('footer.bar').length, named: document.querySelector('skw-titlebar')?.getAttribute('app') || null,
  sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => (l.href.match(/\\/apps\\/([^/]+)\\/style\\.css$/) || [])[1]).filter(Boolean) })`);
const marked = () => page.eval(`[...document.querySelectorAll('.cl-app[aria-current="page"]')].map(b => b.dataset.app)`);
const booted = (name, timeout = 30000) =>
  page.until(`!!document.querySelector('.cl-host > .app ${BOOTED[name]}') && document.querySelector('skw-titlebar')?.getAttribute('app') === '${name}'`, { timeout });
const click = name => page.eval(`document.querySelector('.cl-app[data-app="${name}"]').click()`);
/** An app mounted from the strip, booted, and given a moment to settle. */
const open = async name => { await click(name); await booted(name); await wait(600); };

// ── The scene opens on the vault ─────────────────────────────────────────────
await c.go(c.base + '/apps/cluster/');
await booted('vault');
await wait(800);
const start = await counts();
c.ok('cluster opens on the vault: one page grid, one title bar, one bar', start.app === 1 && start.top === 1 && start.bar === 1
  && start.named === 'vault', JSON.stringify(start));
c.ok('…the strip marks it, and the address says it', same(await marked(), ['vault']) && await page.eval(`location.hash === '#vault'`));
c.ok('…its stylesheet beside the scene\'s, and no other app\'s', same(start.sheets.sort(), ['cluster', 'vault']), start.sheets.join(' '));
const alone = await held();
const still = await framesAsked();
await c.shot('1-vault');
c.ok('…beside it the scene\'s vault, with its objects', await page.eval(`!!document.querySelector('.cl-side .vp.vp--docked .vp-card')`));
await page.eval(`window.__side = document.querySelector('.cl-side .vp')`);
/** Where the viewer's stage is — the canvas's room: left, top, width, height. */
const stageBox = () => page.eval(`(() => { const r = document.querySelector('.cl-host .viewer-stage').getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round).join(','); })()`);
const boxes = { vault: await stageBox() };

// ── Every app in turn, twice ─────────────────────────────────────────────────
const rounds = [];
for (let round = 1; round <= 2; round++) {
  const each = {};
  const wrong = [];
  for (const [name] of APPS.slice(1)) {
    await open(name);
    const got = await counts();
    each[name] = await held();
    if (round === 1) boxes[name] = await stageBox();
    const right = got.app === 1 && got.top === 1 && got.bar === 1 && got.named === name
      && same(got.sheets.sort(), ['cluster', name].sort()) && same(await marked(), [name])
      && await page.eval(`location.hash === '#${name}' && !document.title.indexOf('${name} — cluster')`);
    if (!right) wrong.push(`${name}: ${JSON.stringify(got)}`);
    if (round === 1 && name === 'particles') await c.shot('2-particles');
  }
  c.ok(`round ${round}: each app in its turn the one mounted — alone on the page, its stylesheet the one linked`, !wrong.length, wrong.join('; ').slice(0, 400));
  await open('vault');
  await wait(400);
  rounds.push({ each, back: await held() });
}
const [one, two] = rounds;
c.ok('back on the vault, the second round holds what the first did', same(two.back, one.back),
  `${JSON.stringify(one.back)} → ${JSON.stringify(two.back)}`);
c.ok('…no channel and no interval more than the vault alone had', two.back.channels === alone.channels && two.back.intervals === alone.intervals,
  `${JSON.stringify(alone)} → ${JSON.stringify(two.back)}`);
c.ok('…each app mounted again holds what it held the first time round', APPS.slice(1).every(([n]) => same(two.each[n], one.each[n])),
  APPS.slice(1).filter(([n]) => !same(two.each[n], one.each[n])).map(([n]) => `${n}: ${JSON.stringify(one.each[n])} → ${JSON.stringify(two.each[n])}`).join('; ').slice(0, 400));
const after = await framesAsked();
c.ok('…and nothing asks for frames the vault alone did not', after <= still, `${still} alone, ${after} after`);

// ── The bench's columns: the viewer in one place, the scene's vault, the tabs ──
const places = [...new Set(Object.values(boxes))];
c.ok('every app\'s viewer in the same place, to the pixel: the canvas does not move', places.length === 1, JSON.stringify(boxes).slice(0, 400));
c.ok('…the scene\'s vault beside it all along, the same one', await page.eval(`document.querySelector('.cl-side .vp') === window.__side`));
const tabsNow = () => page.eval(`[...document.querySelectorAll('.cl-tabs .cl-tab')].map(t => t.textContent + (t.getAttribute('aria-selected') === 'true' ? '*' : ''))`);
const shownSides = () => page.eval(`[...document.querySelectorAll('.cl-host .app-main > .app-side')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id)`);
await open('particles');
const opening = await tabsNow();
c.ok('particles\' two panels, a tab each, the first shown', same(opening, ['particles*', 'picture']) && same(await shownSides(), ['emit-side']), JSON.stringify(opening));
await page.eval(`[...document.querySelectorAll('.cl-tabs .cl-tab')].find(t => t.textContent === 'picture').click()`);
c.ok('…its picture\'s tab: that panel shown, the other not', same(await shownSides(), ['picture-side']) && same(await tabsNow(), ['particles', 'picture*']));
await open('fractals');
c.ok('…fractals: its one panel, its one tab', same(await tabsNow(), ['fractal*']) && same(await shownSides(), ['side']), JSON.stringify(await tabsNow()));
await open('particles');
c.ok('…particles again: the tab it showed shown again', same(await tabsNow(), ['particles', 'picture*']) && same(await shownSides(), ['picture-side']));
// One panel, as the bench's: the tabs its head, the panel's Reset at the end of their row; its sections one
// column under them, no box and no gap; a section folds, its height moving; the scene's vault four columns.
const look = await page.eval(`(() => {
  const side = document.querySelector('.cl-host .app-main > .app-side.cl-shown'), tabs = document.querySelector('.cl-tabs').getBoundingClientRect();
  const reset = side.querySelector(':scope > .pp > .pp-head > .pp-btn').getBoundingClientRect(), box = side.getBoundingClientRect();
  const drs = [...side.querySelectorAll(':scope > .pp > .pp-body > .dr')].filter(d => getComputedStyle(d).display !== 'none');
  const gaps = drs.slice(1).map((d, i) => Math.round(d.getBoundingClientRect().top - drs[i].getBoundingClientRect().bottom));
  const boxed = drs.filter(d => { const s = getComputedStyle(d); return s.borderTopWidth !== '0px' || s.borderLeftWidth !== '0px' || parseFloat(s.borderTopLeftRadius) > 0; });
  return { sections: drs.length, gaps: [...new Set(gaps)], boxed: boxed.length, joined: Math.round(box.top - tabs.bottom),
    reset: reset.top >= tabs.top && reset.bottom <= tabs.bottom && reset.right <= tabs.right,
    columns: getComputedStyle(document.querySelector('.cl-side .vp-grid')).gridTemplateColumns.split(' ').length };
})()`);
c.ok('the properties one panel: the tabs its head, Reset at their end, its sections a column with no gap and no box',
  look.sections > 1 && same(look.gaps, [0]) && !look.boxed && look.joined === 0 && look.reset, JSON.stringify(look));
const fold = await page.eval(`(async () => {
  const dr = document.querySelector('.cl-host .app-main > .app-side.cl-shown .dr.dr--open'), body = dr.querySelector(':scope > .dr-body');
  const open = Math.round(body.getBoundingClientRect().height);
  dr.querySelector(':scope > .dr-head').click();
  const moving = body.getAnimations().some(a => a.transitionProperty === 'height');
  await new Promise(r => setTimeout(r, 450));
  const shut = Math.round(body.getBoundingClientRect().height), seen = getComputedStyle(body).visibility;
  dr.querySelector(':scope > .dr-head').click();
  await new Promise(r => setTimeout(r, 450));
  return { open, moving, shut, seen, again: Math.round(body.getBoundingClientRect().height) };
})()`);
c.ok('…a section folds, its height moving to none, and opens again as it was', fold.moving && fold.shut === 0 && fold.seen === 'hidden'
  && fold.again === fold.open, JSON.stringify(fold));
c.ok('…the scene\'s vault, a grid of pictures four columns wide', look.columns === 4, `${look.columns} columns`);
// An object opened in the scene's vault: its detail a tab beside the panels, gone when it closes.
await page.eval(`[...document.querySelectorAll('.cl-side .vp-card')].find(k => k.querySelector('.vp-type')?.textContent === 'still').click()`);
await page.until(`!!document.querySelector('.cl-detail.cl-shown .vp-detail--open .vp-name')`, { timeout: 20000 });
c.ok('a still opened in the scene\'s vault: its detail a tab of the properties, shown', same(await tabsNow(), ['particles', 'picture', 'still*'])
  && same(await shownSides(), []), JSON.stringify(await tabsNow()));
c.ok('…with its picture, particles drawing its own', await page.eval(`!!document.querySelector('.cl-detail .vp-preview')`));
await page.eval(`document.querySelector('.cl-detail .vp-detail-head .vp-btn').click()`);
c.ok('…closed: its tab gone, the panel shown before it shown again', same(await tabsNow(), ['particles', 'picture*']) && same(await shownSides(), ['picture-side']));

// The last frame held: particles playing, taken out for fractals — its frame over where its canvas was, until fractals draws.
const was = await page.eval(`(() => { const r = document.querySelector('.cl-host .viewer-stage > canvas').getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round).join(','); })()`);
await page.eval(`window.__holds = []; new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes)
  if (n.classList && n.classList.contains('cl-held')) { const r = n.getBoundingClientRect();
    window.__holds.push([r.left, r.top, r.width, r.height].map(Math.round).join(',')); } }).observe(document.querySelector('.cluster'), { childList: true })`);
/** The panel shown in the properties: how see-through, and how far moved to its side. */
const panelLook = () => page.eval(`(() => { const s = document.querySelector('.cl-host .app-main > .app-side.cl-shown'); if (!s) return null;
  const cs = getComputedStyle(s), m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
  return { opacity: Math.round(Number(cs.opacity) * 100) / 100, x: Math.round(m.m41) }; })()`);
await click('fractals');
await page.until(`document.querySelector('.cluster').classList.contains('cl-out')`, { timeout: 5000 });
await wait(160);
const leaving = await panelLook();
const during = await stageBox();
await booted('fractals');
await page.until(`!document.querySelector('.cluster').classList.contains('cl-out')`, { timeout: 10000 });
await wait(400);
const came = await panelLook();
c.ok('a switch: particles\' panels leave to their side, fading, the viewer still', !!leaving && leaving.opacity < 1 && leaving.x > 0
  && during === places[0], `${JSON.stringify(leaving)} · the stage at ${during}`);
c.ok('…fractals\' come in, in their place and whole', !!came && came.opacity === 1 && came.x === 0, JSON.stringify(came));
await page.until(`!document.querySelector('.cl-held')`, { timeout: 10000 });
const holds = await page.eval(`window.__holds`);
c.ok('particles taken out: its last frame held where its canvas was, gone once fractals drew', holds.length === 1 && holds[0] === was,
  `${JSON.stringify(holds)} against ${was}`);

// ── Back as it was left: a value changed in each app, kept across a switch ─
/**
 * The first number of the app's own panel that is not its size, moved one step: its key and the value it
 * took. Its own: compose's page, the rig's — a placement's values or a bone's are the one chosen's, and
 * nothing is chosen.
 */
const OWN_PANEL = { compose: '#page-side', rig: '#side' };
const moveANumber = name => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => {
  for (const row of document.querySelectorAll('.cl-host ${OWN_PANEL[name] || ''} .pp-row--num')) {
    const o = rowParams(row);
    if (!o || ['width', 'height', 'scale'].includes(o.key) || typeof o.params.get(o.key) !== 'number') continue;
    const spec = o.params.spec(o.key), v = o.params.get(o.key), step = spec.step || 1;
    o.params.set(o.key, spec.max != null && v + step > spec.max ? v - step : v + step);
    return { key: o.key, value: o.params.get(o.key), was: v };
  }
  return null;
})`);
const numberNow = key => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => {
  const row = [...document.querySelectorAll('.cl-host .pp-row--num')].find(r => rowParams(r)?.key === '${key}');
  return row ? rowParams(row).params.get('${key}') : null;
})`);
const lost = [];
for (const [name] of APPS.slice(1)) {
  await open(name);
  const moved = await moveANumber(name);
  if (!moved) { lost.push(`${name}: no number to move`); continue; }
  await wait(400);
  await open('vault');
  await open(name);
  const back = await numberNow(moved.key);
  if (back !== moved.value) lost.push(`${name}: ${moved.key} ${moved.was} → ${moved.value}, back as ${back}`);
}
c.ok('every app mounted again comes back as it was left: a value moved in it still where it was put', !lost.length, lost.join('; ').slice(0, 400));

// A smart object made by S stays the one S saves into: its next state, across a switch.
await open('particles');
// The check's own ear on the saves, taken off after: what the page holds is counted again below.
await page.eval(`window.__saved = 0; window.__onSaved = () => window.__saved++; document.addEventListener('vault:saved', window.__onSaved)`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }))`);
await page.until(`window.__saved > 0`, { timeout: 30000 });
await wait(1500);
const bound = () => page.eval(`import('/core/vault.js').then(({ Vault }) => Vault.bound && { id: Vault.bound.id, version: Vault.bound.version })`);
const first = await bound();
await open('grid');
await open('particles');
c.ok('…particles back, bound to the smart object its S made', !!first && !!first.id && JSON.stringify(await bound()) === JSON.stringify(first),
  `${JSON.stringify(first)} → ${JSON.stringify(await bound())}`);
c.ok('…and saying so', /back as it was left/.test(await page.eval(`document.querySelector('.bar-say')?.textContent || ''`)));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }))`);
await page.until(`import('/core/vault.js').then(({ Vault }) => !!Vault.bound && Vault.bound.version === ${first ? first.version + 1 : -1})`, { timeout: 30000 });
c.ok('…its next S the next state of the same object', true, `${first.id} v${first.version} → v${first.version + 1}`);
await page.eval(`document.removeEventListener('vault:saved', window.__onSaved)`);

// The vault app keeps the object it draws.
await open('vault');
await page.eval(`[...document.querySelectorAll('.vp-card')].find(k => k.querySelector('.vp-type')?.textContent === 'still').click()`);
await page.until(`/ · still/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
const drawn = await page.eval(`document.querySelector('.bar-say').textContent`);
await open('fractals');
await click('vault');
await booted('vault');
await page.until(`/ · still/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
c.ok('the vault app back: the still it drew, drawn again', (await page.eval(`document.querySelector('.bar-say').textContent`)) === drawn, drawn);

// ── The links between apps, taken in place ──────────────────────────────────
// A loose sequence particles made, as the server lists it: its card in the vault app, its detail's links.
const everything = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const ofParticles = everything.find(r => r.type === 'sequence' && r.origin && r.origin.app === 'particles'
  && !(r.tags || []).some(t => t === 'trash' || t.startsWith('folder:')));
if (ofParticles) {
  const detailOf = async id => {
    await open('vault');
    await page.eval(`document.querySelector('.vp-card[data-id="${id}"]').click()`);
    await page.until(`!!document.querySelector('.vp-detail--open .vp-actions .vp-btn')`, { timeout: 20000 });
  };
  const press = text => page.eval(`[...document.querySelectorAll('.vp-detail--open .vp-actions .vp-btn')].find(b => b.textContent.startsWith(${JSON.stringify(text)})).click()`);
  await page.eval(`window.__tabs = []; window.open = (...a) => { window.__tabs.push(a[0]); return null; }`);
  await detailOf(ofParticles.id);
  await press('Open in particles');
  await booted('particles');
  await page.until(`/opened /.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 30000 });
  const at = await page.eval(`({ search: location.search, hash: location.hash, said: document.querySelector('.bar-say').textContent, tabs: window.__tabs.length })`);
  c.ok('Open in particles ↗, in the vault app: particles mounted in place, on that object, no tab', at.hash === '#particles'
    && at.search === '?open=' + encodeURIComponent(ofParticles.id) && at.said.includes(ofParticles.id) && at.tabs === 0, JSON.stringify(at));
  await detailOf(ofParticles.id);
  await press('Place in compose');
  await booted('compose');
  await page.until(`/1 placed · .+ on the page/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 30000 });
  c.ok('Place in compose ↗: compose mounted on a page of its own with it placed', await page.eval(`location.search.startsWith('?place=') && window.__tabs.length === 0`));
  await page.eval(`history.back()`);
  await booted('vault');
  await page.until(`/ · sequence/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
  c.ok('…Back: the vault app as it was left, the sequence it drew drawn again', await page.eval(`location.hash === '#vault' && location.search === ''`),
    await page.eval(`document.querySelector('.bar-say').textContent`));
} else {
  console.log('     (no loose sequence of particles in this vault — skipping the links)');
}

// ── A switch asked while an app boots: the last asked is the one mounted ───
await click('particles');
await page.until(`!!document.querySelector('.cl-host > .app') && document.querySelector('skw-titlebar')?.getAttribute('app') === 'particles'`);
await click('grid');
await booted('grid');
await wait(800);
const cut = await counts();
c.ok('a switch asked while particles boots: grid mounted once it has, particles gone', cut.app === 1 && cut.named === 'grid'
  && same(cut.sheets.sort(), ['cluster', 'grid']) && same(await marked(), ['grid']), JSON.stringify(cut));
c.ok('…holding what grid held when it came in turn', same(await held(), two.each.grid), `${JSON.stringify(await held())} against ${JSON.stringify(two.each.grid)}`);

// ── The address: Back, a reload, what an app is asked ───────────────────────
await page.eval(`history.back()`);
await booted('particles');
c.ok('Back: the app before, particles, mounted again', same(await marked(), ['particles']) && await page.eval(`location.hash === '#particles'`));
// Opened anew — by its index.html: the same address but its fragment would only move within the page.
await c.go(c.base + '/apps/cluster/index.html#fractals');
await booted('fractals');
c.ok('opened with #fractals: fractals mounted', same(await marked(), ['fractals']) && (await counts()).app === 1);

const listed = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const aStill = listed.find(r => r.type === 'still' && !(r.tags || []).includes('trash'));
if (aStill) {
  await c.go(c.base + `/apps/cluster/?open=${encodeURIComponent(aStill.id)}#vault`);
  await booted('vault');
  await page.until(`/ · still/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
  c.ok('?open=<id>#vault: the vault app reads it, and draws that still', true, aStill.id);
  await open('particles');
  c.ok('…a switch leaves the query behind: particles is asked nothing', await page.eval(`location.search === '' && location.hash === '#particles'`),
    await page.eval(`location.search + location.hash`));
} else {
  console.log('     (no still in this vault — skipping ?open=)');
}

// ── The search finds the apps ───────────────────────────────────────────────
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '²', bubbles: true }))`);
await page.until(`!!document.querySelector('.pal-input')`);
await page.eval(`(() => { const i = document.querySelector('.pal-input'); i.value = 'map'; i.dispatchEvent(new Event('input')); })()`);
const offered = await page.eval(`[...document.querySelectorAll('.pal-list li')].map(li => li.querySelector('.pal-name')?.textContent + ' = ' + (li.querySelector('.pal-detail')?.textContent || ''))`);
c.ok('the search finds an app by its name, in the cluster', offered.includes('map = Cluster'), JSON.stringify(offered.slice(0, 4)));
await page.eval(`(() => { const li = [...document.querySelectorAll('.pal-list li')].find(l => l.querySelector('.pal-name')?.textContent === 'map');
  if (li) li.click(); })()`);
await booted('map');
c.ok('…and takes it: map mounted', same(await marked(), ['map']));

c.ok('the gamepad, its own page: a link out, mounted nowhere', await page.eval(`(() => {
  const a = document.querySelector('a.cl-page'); return !!a && a.pathname === '/apps/gamepad/' && a.target === '_blank'; })()`));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));

// ── No vault at all (rule 7) ─────────────────────────────────────────────────
await c.go(c.plain + '/apps/cluster/');
await page.until(`/no vault/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
c.ok('no vault: the scene opens on the vault app, which says so', (await counts()).named === 'vault');
await click('particles');
await page.until(`!!document.querySelector('.cl-host > .app .pp-row') && document.querySelector('skw-titlebar')?.getAttribute('app') === 'particles'`);
c.ok('…and mounts particles all the same', (await counts()).app === 1);
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('…saying nothing but that the vault is not there', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await c.finish();
