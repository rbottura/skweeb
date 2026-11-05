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
 * An app's page mounts it on itself (`mount(document.body)`) and it runs
 * alone as ever (rule 7). Nothing happens at import, here or in the app.
 */

import { openScope } from './scope.js';
import { Vault }     from './vault.js';

/**
 * @param {string} app                 the app's name, for its scope and the console
 * @param {object} opts
 * @param {string} opts.markup         the inside of its `.app`: its columns, its viewer
 * @param {string} [opts.style]        its stylesheet's URL — `new URL('./style.css', import.meta.url).href`
 * @param {(root: HTMLElement, scope: object) => (void|Promise<void>)} opts.start
 * @returns {{ mount: (host?: HTMLElement) => Promise<void>, unmount: () => void,
 *             readonly scope: ?object, readonly root: ?HTMLElement }}
 */
export function appModule(app, { markup, style = null, start }) {
  let scope = null, root = null;

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
    } catch (err) {
      console.error(`[${app}] failed to boot:`, err);
    }
  }

  function unmount() {
    if (!scope) return;
    const was = scope, node = root;
    scope = root = null;
    was.close();
    if (node) node.remove();                 // none yet, while its stylesheet comes
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
