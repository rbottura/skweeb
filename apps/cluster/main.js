/**
 * main.js — cluster, the scene (S9c, 2026-11-05; docs/scene.md, *The scene*).
 *
 * One page, the suite's apps mounted in it one at a time — each through its
 * module, `mount(host)` and `unmount()` (core/mount.js) — and a strip that
 * names them: a click on one takes the app there out, everything it held let
 * go of, and mounts that one in its place. The vault first: the app that is
 * open when nothing else is. The name is the author's, "pour l'instant"
 * (2026-11-04): a word of space that holds many objects.
 *
 * Laid as the bench is (the author's yes, 2026-11-05): the strip, then the
 * scene's vault, then the app's viewer, then its properties — so the viewer,
 * its canvas in it, is in one place whatever app is round it (style.css).
 * The vault and the tab bar are the scene's and stay — the vault showing the
 * app's own objects first, then the rest, its cards sliding to their places
 * (S9g); the app brings its title bar, its viewer, its panels — a tab each
 * (tabs.js) — and its status bar, laid in the scene's grid as they are. An object opened in the vault is
 * a tab beside the panels, its detail; the vault app draws it. As an app is
 * taken out its last frame is held where it was until the next draws its
 * first (held.js): the centre never flashes empty. And its panels leave
 * first, as the bench's do — out to their side, faded — then the next app's
 * come in, the viewer and the vault still: the app going is taken out once
 * its panels are gone, so two apps' stylesheets never meet.
 *
 * The app mounted is the address's fragment, `#particles`: a reload comes
 * back to it, Back goes to the one before, and what the address asks of the
 * app — `?open=<id>` — is the app's to read, as on its own page. A switch
 * leaves the query behind, so the next app is asked nothing the last one
 * was; and a page that sets its query to go back to a state of its object
 * (core/shell/graph.js) keeps its fragment, so it comes back in the same app.
 *
 * A switch asked while another is under way waits for it, and only the last
 * asked is mounted: an app is never taken out halfway through its boot. An
 * app taken out comes back as it was left (core/mount.js). The links between
 * apps — *Open in …*, *Place in compose*, *Rig this*, the graph's — are the
 * scene's to take (core/reopen.js `takeLinks`): the app a link names is
 * mounted here in place of the one open, the link's query with it, where
 * alone it would open a tab. The search (², Ctrl K) finds the apps by name,
 * as it finds the viewer's tools (core/Palette.js, `data-pal`). The gamepad
 * stays outside until C6 — it draws with p5 — a link to its page.
 *
 * Every app runs alone as ever (rule 7): the scene is one more host. Nothing
 * happens at import.
 */

import { installPalette } from '../../core/Palette.js';
import { takeLinks }      from '../../core/reopen.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { holdFrames }     from './held.js';
import { propsTabs }      from './tabs.js';

/**
 * The apps the scene mounts, in the strip's order, each loaded when first
 * asked for. Written out, a manifest (rule 3) — and so what reads the
 * imports, scripts/reach.mjs, knows the scene loads every one of them.
 */
const APPS = {
  vault:     () => import('../vault/main.js'),
  grid:      () => import('../grid/main.js'),
  ckt:       () => import('../ckt/main.js'),
  compose:   () => import('../compose/main.js'),
  filter:    () => import('../filter/main.js'),
  fractals:  () => import('../fractals/main.js'),
  particles: () => import('../particles/main.js'),
  map:       () => import('../map/main.js'),
  rig:       () => import('../rig/main.js'),
  '3d':      () => import('../3d/main.js'),
};
const FIRST = 'vault';

/** Pages of their own, linked and not mounted. */
const PAGES = [
  { name: 'gamepad', href: '../gamepad/', title: "The gamepad draws with p5: its own page, until it is on core's kit (C6)" },
];

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

let scene, strip, host, vault, props, frames;
let opened = null;         // { object, urls }: the object open in the scene's vault, for an app that draws it
let now = null;            // { name, module, n, ready }: the app mounted, the ask it answers, whether it has started
let wanted = null;         // { name, n }: the app last asked for — a link to the app there is an ask of its own
let asks = 0;              // asks so far, numbering them
let settling = null;       // the switch under way, until `wanted` is mounted

/**
 * The scene on `page`: its strip, and the app the address names mounted —
 * the vault when it names none.
 *
 * @param {HTMLElement} [page]
 * @returns {Promise<void>}  once that app is mounted
 */
export function start(page = document.body) {
  scene = el('div', 'cluster');
  strip = el('nav', 'cl-strip');
  strip.setAttribute('aria-label', 'the apps');
  const head = el('div', 'cl-head');
  head.append(el('span', 'cl-mark'), el('span', 'cl-name', 'cluster'));
  strip.append(head);
  for (const name of Object.keys(APPS)) {
    const b = el('button', 'cl-app', name);
    b.type = 'button';
    b.dataset.app = name;
    b.dataset.pal = name;                    // the search finds it, "in cluster"
    b.dataset.palWhere = 'Cluster';
    b.title = `${name}, here in place of the app open`;
    b.addEventListener('click', () => go(name));
    strip.append(b);
  }
  strip.append(el('div', 'cl-sep'));
  for (const p of PAGES) {
    const a = el('a', 'cl-app cl-page', p.name + ' ↗');
    Object.assign(a, { href: p.href, target: '_blank', rel: 'noopener', title: p.title });
    strip.append(a);
  }
  const side = el('aside', 'cl-side');
  side.setAttribute('aria-label', 'the vault');
  const tabs = el('nav', 'cl-tabs');
  tabs.setAttribute('aria-label', 'the properties');
  tabs.setAttribute('role', 'tablist');
  const detail = el('div', 'cl-detail');
  const none = el('p', 'cl-none', 'An object chosen in the vault opens here.');
  host = el('div', 'cl-host');
  scene.append(strip, side, tabs, detail, none, host);
  page.append(scene);

  installPalette();                          // ² from the start: the vault has no panel to install it
  props = propsTabs({ bar: tabs, detail, none });
  frames = holdFrames(scene);
  // The scene's vault, beside the viewer whatever app is round it — made before any app, so none holds it.
  vault = new VaultPanel({
    mount: side, detailMount: detail,
    onDetail: (object, urls) => { opened = { object, urls }; props.showDetail(object.type); tell(); },
    onClose: () => { opened = null; props.hideDetail(); },
  });
  // A link to an app the scene has: that app here, in place, its query with it.
  takeLinks(url => {
    const name = appOf(url);
    if (!name) return false;
    history.pushState(null, '', location.pathname + url.search + '#' + name);
    settle(name);
    return true;
  });
  window.addEventListener('popstate', () => settle(named() || FIRST));
  const first = named();
  if (!first) history.replaceState(null, '', location.pathname + location.search + '#' + FIRST);
  return settle(first || FIRST);
}

/** The app the address names, `#particles`, when the scene has it. */
function named() {
  let name = '';
  try { name = decodeURIComponent(location.hash.slice(1)); } catch { /* a fragment of no app */ }
  return Object.hasOwn(APPS, name) ? name : null;
}

/** The app a link names — `/apps/particles/`, or its index.html — when the scene has it. */
function appOf(url) {
  const m = /^\/apps\/([^/]+)\/(?:index\.html)?$/.exec(url.pathname);
  return m && Object.hasOwn(APPS, m[1]) ? m[1] : null;
}

/** Another app in place of the one there, the address saying so — and nothing of what the last was asked. */
function go(name) {
  if (wanted && name === wanted.name) return settling || Promise.resolve();
  history.pushState(null, '', location.pathname + '#' + name);
  return settle(name);
}

/** `name` asked for; mounted once the switch under way is done, if it is still the ask last made. */
function settle(name) {
  wanted = { name, n: ++asks };
  if (!settling) {
    settling = (async () => {
      try {
        while (wanted && !(now && now.n === wanted.n)) {
          const ask = wanted;
          if (await swap(ask) || wanted !== ask) continue;
          wanted = now && { name: now.name, n: now.n };   // it did not load: the app there stays, its panels in
          mark(now && now.name);
          scene.classList.remove('cl-out');
        }
      } finally {
        settling = null;
      }
    })();
  }
  return settling;
}

/** One switch: its module loaded, the app there unmounted, this one mounted in its place. False if it did not load. */
async function swap(ask) {
  let module;
  try {
    module = await APPS[ask.name]();
  } catch (err) {
    console.error(`[cluster] ${ask.name} did not load:`, err);
    return false;
  }
  if (wanted !== ask) return true;           // another was asked for while it came
  if (now) {
    // Its panels out first, as the bench's: the viewer and the vault stay; asked again meanwhile, out once.
    if (!scene.classList.contains('cl-out')) {
      scene.classList.add('cl-out');
      if (!still()) await wait(MOVE_MS);
      if (wanted !== ask) return true;
    }
    const going = host.querySelector(':scope > .app');
    frames.take(going);                      // its last frame, held where it is
    props.leaving();
    now.module.unmount();
  }
  now = { name: ask.name, module, n: ask.n, ready: false };
  mark(ask.name);
  // Told of its root as it is built, before it starts: its panels a tab each, its canvas watched for its first frame.
  await module.mount(host, { vault, built: root => { props.mounted(ask.name, root); frames.watch(root); } });
  if (now && now.n === ask.n) {
    now.ready = true;
    props.paint();
    tell();
    vault.first = ask.name === FIRST ? null : ask.name;   // its own objects first in the scene's vault, then the rest
    await frame();                           // laid out where they leave from, before they move
    // Its panels in — unless another app was asked for meanwhile: they stay out, and it comes.
    if (now && now.n === ask.n && wanted === ask) scene.classList.remove('cl-out');
  }
  return true;
}

/**
 * The app mounted told of the object open in the scene's vault, when it draws
 * one — the vault app, `chosen` — and the detail its facts only then, the
 * picture being the viewer's; with its picture beside any other app.
 */
function tell() {
  const draws = !!(now && now.ready && typeof now.module.chosen === 'function');
  vault.detailPicture = !draws;
  if (draws && opened) now.module.chosen(opened.object, { url: opened.urls.url });
}

/** The bench's: a panel leaves, or comes, in this long. */
const MOVE_MS = 240;
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(done => setTimeout(done, ms));
const frame = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

/** The strip and the page's title say which app is mounted. */
function mark(name) {
  for (const b of strip.querySelectorAll('.cl-app[data-app]')) {
    if (b.dataset.app === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  document.title = name ? `${name} — cluster — skweeb` : 'cluster — skweeb';
}
