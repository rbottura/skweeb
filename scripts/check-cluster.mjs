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
 */

import { startCheck, countHeld } from './check-kit.mjs';

/** The strip's apps, in its order, and what shows each has booted — as check-mount has them. */
const APPS = [
  ['vault', '.vp-card'], ['grid', '.pp-row'], ['ckt', '.pp-row'], ['compose', '.pp-row'], ['filter', '.pp-row'],
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

// ── Every app in turn, twice ─────────────────────────────────────────────────
const rounds = [];
for (let round = 1; round <= 2; round++) {
  const each = {};
  const wrong = [];
  for (const [name] of APPS.slice(1)) {
    await open(name);
    const got = await counts();
    each[name] = await held();
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
