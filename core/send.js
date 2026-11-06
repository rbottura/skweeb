/**
 * send.js — Send to ▸: what a window has on screen, as another app's source
 * (M11, brick 4; docs/smart-objects.md, *The live stack*).
 *
 * The other app's window, when one is open in this browser, is asked to take
 * this one (core/live.js `ask`); with none, one is opened beside this, its
 * address naming this window (`?live=<id>`), and it takes it as soon as it
 * hears it. The taker follows the layer — drawn again whenever it changes
 * here — until it is given another source. No tab, no address to paste, no
 * trip through the vault.
 *
 * Which apps take another window as their source: `TAKERS`.
 */

/** The apps that take another window as their source. */
export const TAKERS = ['filter', 'grid'];      // grid since L5, 2026-11-06

/**
 * Send this window to `target`: its window found, or opened.
 *
 * @param {object} live              this window, core/live.js's
 * @param {string} target            an app of TAKERS
 * @param {(text: string) => void} say
 */
export async function send(live, target, say) {
  const there = live.windows().find(w => w.app === target);
  if (there) {
    try {
      await live.ask(there.id, 'take', { from: live.id });
      say(`sent to the ${target} window: it follows this one`);
    } catch (err) {
      say(`the ${target} window did not take it: ${err.message}`);
    }
    return;
  }
  const url = new URL(`../${target}/?live=${encodeURIComponent(live.id)}`, location.href);
  const opened = window.open(url.href, 'skweeb-' + target, 'popup,width=1320,height=880');
  say(opened ? `a ${target} window opens beside this one, following it`
    : 'the browser kept the window from opening: allow this page its pop-ups');
}

/** `Send to ▸ <app>` buttons, for every taker but this app. */
export function sendButtons(live, app, { button, say }) {
  return TAKERS.filter(t => t !== app).map(target =>
    button(`Send to ▸ ${target}`, `what this window has on screen, as ${target}'s source, live`, () => send(live, target, say)));
}

/**
 * Take a window as the source when another asks — and the one this page's
 * address names, once it is heard.
 *
 * @param {object} live
 * @param {(windowId: string) => void} take
 */
export function takeWhenAsked(live, take) {
  live.answer('take', ({ from }) => { take(from); return true; });
  const named = new URLSearchParams(location.search).get('live');
  if (!named) return;
  const heard = () => live.windows().some(w => w.id === named);
  if (heard()) return take(named);
  const stop = live.on(() => {
    if (!heard()) return;
    stop();
    take(named);
  });
}
