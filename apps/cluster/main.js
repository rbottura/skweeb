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
 * The app mounted is the address's fragment, `#particles`: a reload comes
 * back to it, Back goes to the one before, and what the address asks of the
 * app — `?open=<id>` — is the app's to read, as on its own page. A switch
 * leaves the query behind, so the next app is asked nothing the last one
 * was; and a page that sets its query to go back to a state of its object
 * (core/shell/graph.js) keeps its fragment, so it comes back in the same app.
 *
 * A switch asked while another is under way waits for it, and only the last
 * asked is mounted: an app is never taken out halfway through its boot. The
 * search (², Ctrl K) finds the apps by name, as it finds the viewer's tools
 * (core/Palette.js, `data-pal`). The gamepad stays outside until C6 — it
 * draws with p5 — a link to its page.
 *
 * Every app runs alone as ever (rule 7): the scene is one more host. Nothing
 * happens at import.
 */

import { installPalette } from '../../core/Palette.js';

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

let strip, host;
let now = null;            // { name, module }: the app mounted
let wanted = null;         // the app last asked for
let settling = null;       // the switch under way, until `wanted` is mounted
const there = () => (now ? now.name : null);

/**
 * The scene on `page`: its strip, and the app the address names mounted —
 * the vault when it names none.
 *
 * @param {HTMLElement} [page]
 * @returns {Promise<void>}  once that app is mounted
 */
export function start(page = document.body) {
  const scene = el('div', 'cluster');
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
  host = el('div', 'cl-host');
  scene.append(strip, host);
  page.append(scene);

  installPalette();                          // ² from the start: the vault has no panel to install it
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

/** Another app in place of the one there, the address saying so — and nothing of what the last was asked. */
function go(name) {
  if (name === wanted) return settling || Promise.resolve();
  history.pushState(null, '', location.pathname + '#' + name);
  return settle(name);
}

/** `name` the app to mount; mounted once the switch under way is done, if it is still the one wanted. */
function settle(name) {
  wanted = name;
  if (!settling) {
    settling = (async () => {
      try {
        while (wanted !== there()) await swap(wanted);
      } finally {
        settling = null;
      }
    })();
  }
  return settling;
}

/** One switch: its module loaded, the app there unmounted, this one mounted in its place. */
async function swap(name) {
  let module;
  try {
    module = await APPS[name]();
  } catch (err) {
    console.error(`[cluster] ${name} did not load:`, err);
    wanted = there();                        // the app there stays
    return;
  }
  if (wanted !== name) return;               // another was asked for while it came
  if (now) now.module.unmount();
  now = { name, module };
  for (const b of strip.querySelectorAll('.cl-app[data-app]')) {
    if (b.dataset.app === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  document.title = `${name} — cluster — skweeb`;
  await module.mount(host);
}
