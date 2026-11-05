/**
 * mount.js — an app as a module: `mount(host)` and `unmount()` (S9,
 * 2026-11-04; docs/scene.md, *The scene*).
 *
 * What every app's mount does the same: one at a time — a mount over a
 * mounted one unmounts it first; a scope opened for all it will hold
 * (core/scope.js); its stylesheet linked where its page has not linked it —
 * a scene's, cluster's — and loaded before anything is built, so the app is
 * never seen without its layout; its page grid, `.app`, built from its
 * markup in the host; and its smart object let go of when it goes, so the
 * next app saves into none.
 * What it does of its own is `start(root, scope)`: its state made again,
 * its panels, its clock.
 *
 * An app taken out once it has booted leaves what it was doing (S9c): what
 * its `keep` says — the recipe it would save, the frame on screen — and the
 * smart object it is bound to, kept for the page's life, so a scene that
 * mounts it again gives it back as it was left, as a tab would have kept it.
 * Its next mount finds it as an object opened (core/reopen.js `requested`)
 * when the page's address asks it nothing.
 *
 * An app's page mounts it on itself (`mount(document.body)`) and it runs
 * alone as ever (rule 7). Nothing happens at import, here or in the app.
 */

import { openScope } from './scope.js';
import { Vault }     from './vault.js';

/** What each app was doing when it was last taken out, by its name: `{ state, bound }`. */
const left = new Map();

/**
 * What `app` was doing when it was last unmounted — its `keep`'s state, and
 * the smart object it was bound to — or null. Read, not taken: its next
 * unmount writes it again.
 *
 * @param {string} app
 * @returns {?{ state: object, bound: ?object }}
 */
export const leftBehind = app => left.get(app) || null;

/**
 * @param {string} app                 the app's name, for its scope and the console
 * @param {object} opts
 * @param {string} opts.markup         the inside of its `.app`: its columns, its viewer
 * @param {string} [opts.style]        its stylesheet's URL — `new URL('./style.css', import.meta.url).href`
 * @param {(root: HTMLElement, scope: object) => (void|Promise<void>)} opts.start
 * @param {() => ?object} [opts.keep]  what it is doing, to be given back: `{ recipe, … }` as its reopen
 *                                     takes it — read as it is taken out, once it has booted
 * @returns {{ mount: (host?: HTMLElement) => Promise<void>, unmount: () => void,
 *             readonly scope: ?object, readonly root: ?HTMLElement }}
 */
export function appModule(app, { markup, style = null, start, keep = null }) {
  let scope = null, root = null, booted = false;

  async function mount(host = document.body) {
    if (scope) unmount();
    const mine = scope = openScope(app);
    const came = style ? linked(style, mine) : null;
    if (came) {
      await came;
      if (scope !== mine) return;            // unmounted while its stylesheet came
    }
    root = document.createElement('div');
    root.className = 'app';
    root.innerHTML = markup;
    host.append(root);
    mine.hold(() => Vault.bind(null));
    try {
      await start(root, mine);
      if (scope === mine) booted = true;
    } catch (err) {
      console.error(`[${app}] failed to boot:`, err);
    }
  }

  function unmount() {
    if (!scope) return;
    // Taken out halfway through its boot, it has done nothing yet: what it left before stays.
    if (keep && booted) keepLeft();
    const was = scope, node = root;
    scope = root = null;
    booted = false;
    was.close();
    if (node) node.remove();                 // none yet, while its stylesheet comes
  }

  /**
   * What it is doing, and what it is bound to, before its scope lets go of either — a copy, as it is
   * now: a recipe is data, and what the app goes on doing to its own arrays is no longer the app's.
   */
  function keepLeft() {
    try {
      const state = keep();
      if (state) left.set(app, { state: JSON.parse(JSON.stringify(state)), bound: Vault.bound ? { ...Vault.bound } : null });
      else left.delete(app);
    } catch (err) {
      console.warn(`[${app}] what it was doing could not be kept:`, err);
    }
  }

  return { mount, unmount, get scope() { return scope; }, get root() { return root; } };
}

/**
 * A stylesheet the page has not linked, linked for as long as the scope is
 * open. Back, when it links one, what comes once it has loaded — or failed,
 * after which the app is built all the same; null when the page has it.
 */
function linked(href, scope) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === href)) return null;
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  const came = new Promise(done => {
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
  });
  document.head.append(link);
  scope.hold(() => link.remove());
  return came;
}
