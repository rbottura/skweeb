/**
 * following.js — an app's source as another window's layer, live (M11,
 * brick 4; core/send.js): filter's since then, and grid's since L5
 * (2026-11-06) — moved here from filter when a second app took windows,
 * each handing it its own two ways to open a source.
 *
 * Sent here by *Send to ▸* in another window, or named in the address
 * (`?live=<window id>`), the app's source is what that window has on screen:
 * its layer, the envelope its save would write (core/live.js), drawn by
 * core/rebuild.js — and drawn again whenever it changes there, a moment
 * after the last change, so a slider dragged there is not a hundred
 * rebuilds here. The window gone, it is said, and the last picture stays.
 *
 * Saving needs the source in the vault, for filter's recipe names its
 * source and the source is a parent: so the window followed is asked to
 * save itself first — with its own save, its own title and lineage — and
 * filter saves over what it kept, then follows the window again.
 */

import { held, listen } from './scope.js';

/**
 * @param {object} ctx
 * @param {object} ctx.live                    this window, core/live.js's
 * @param {object} ctx.params                  the app's: its `source` an object param
 * @param {(source: object, opts: object) => void} ctx.setSource
 * @param {() => ?object} ctx.source           what the app has now
 * @param {(text: string) => void} ctx.say
 * @param {(id: string) => Promise<object>} ctx.fromVault       the app's source from the vault
 * @param {(layer: object, opts: {title: string}) => Promise<object>} ctx.fromLayer   …from a window's layer
 */
export function followWindows({ live, params, setSource, source, say, fromVault, fromLayer }) {
  let followed = null;             // { windowId, stop }
  let asked = 0;

  // A smart object held as the source took a new version — saved again in its own window, or
  // anywhere on this vault: drawn again, the player where it was (core/smart.js). Heard while the app is mounted.
  listen(document, 'vault:updated', async ({ detail }) => {
    const now = source();
    if (!now || now.id !== detail.id) return;
    try {
      const next = await fromVault(detail.id);
      if (!source() || source().id !== detail.id) return next.dispose();
      setSource(next, { keep: true });
      say(`its source took version ${detail.version}: drawn again`);
    } catch (err) {
      say(`its source took a version that would not open: ${err.message}`);
    }
  });

  /** Follow window `windowId`: its layer as the source, now and whenever it changes. */
  function take(windowId) {
    stop();
    if (params.get('source')) params.set('source', null);
    let text = null, timer = 0;
    const ask = ++asked;
    const load = w => {
      if (!w || !w.layer || w.text === text) return;
      text = w.text;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const next = await fromLayer(w.layer, { title: `the ${w.app} window, live` });
          if (ask !== asked) return next.dispose();
          setSource(next, { keep: true });
          say(`its source: the ${w.app} window, live`);
        } catch (err) {
          say(`the ${w.app} window's layer would not open: ${err.message}`);
        }
      }, 250);
    };
    load(live.windows().find(w => w.id === windowId));
    const off = live.on(e => {
      if (e.window.id !== windowId) return;
      if (e.kind === 'go') return say(`its source, the ${e.window.app} window, closed: its last picture stays`);
      load(e.window);
    });
    followed = { windowId, stop() { off(); clearTimeout(timer); } };
  }

  /** Stop following: another source was chosen. */
  function stop() {
    if (!followed) return;
    followed.stop();
    followed = null;
    asked++;
  }

  /**
   * Before a save: the window followed saves itself, and filter's source is
   * what it kept. Resolves with the window to follow again after, or null
   * when filter was following none.
   */
  async function saveSourceFirst() {
    const now = source();
    if (!followed || (now && now.id)) return null;
    const windowId = followed.windowId;
    say('saving its source first, in its own window…');
    const id = await live.ask(windowId, 'save', { smart: true });
    if (!id) throw new Error('its source window kept nothing');
    stop();
    params.set('source', id);
    const end = Date.now() + 30000;
    while (!(source() && source().id === id)) {
      if (Date.now() > end) throw new Error('what its source window kept did not open');
      await new Promise(r => setTimeout(r, 100));
    }
    return windowId;
  }

  held(() => stop());              // its app unmounted: a window followed, and a load on its way, no more

  return {
    take,
    stop,
    saveSourceFirst,
    /** The window followed, or null. */
    get windowId() { return followed ? followed.windowId : null; },
  };
}
