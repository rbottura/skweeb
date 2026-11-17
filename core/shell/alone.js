/**
 * alone.js — the viewer alone (S15m, 2026-11-17): Tab, the bench's key for
 * the panels (docs/scene.md, the left hand), back. The author: "le tab a un
 * moment permettait de voir le viewer en full screen ou au moins sans les
 * outils".
 *
 * Tab: the stage over the whole window, every panel, bar and tool under it,
 * the rulers away — the page only covered, never laid again, so what an app
 * holds stays where it is, and the picture is fitted to the room by the
 * viewer's own observer, drawn at its new size. Shift Tab: the whole screen
 * as well, the browser's full screen, whose Escape brings the tools back
 * too. Tab again: as it was. Never in a field, where Tab moves on
 * (core/keys.js); the palette, the pies and the graph still open over it.
 *
 * Bound by core/shell/bindings.js; drawn by core/shell/shell.css. No DOM at
 * import.
 */

const ON = 'skw-alone';
const HINT_MS = 2400;
let heard = false;

/** Whether the viewer is alone now. */
export const alone = () => typeof document !== 'undefined' && document.documentElement.classList.contains(ON);

/**
 * The viewer alone, or the tools back.
 *
 * @param {boolean} on
 * @param {{screen?: boolean}} [o]   the whole screen too: the browser's full screen
 */
export function setAlone(on, { screen = false } = {}) {
  const root = document.documentElement;
  if (!heard) {
    heard = true;
    // The browser's full screen left by its own Escape: the tools come back with it.
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && alone()) setAlone(false); });
  }
  root.classList.toggle(ON, on);
  if (on && screen && !document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  document.querySelector('.alone-hint')?.remove();
  if (!on) return;
  const hint = document.createElement('div');
  hint.className = 'alone-hint';
  hint.textContent = screen ? 'Tab or Escape — the tools back' : 'Tab — the tools back';
  document.body.append(hint);
  setTimeout(() => hint.remove(), HINT_MS);
}

/** Tab's tap: alone, or back — Shift, the whole screen too. */
export const toggleAlone = ({ shiftKey = false } = {}) => setAlone(!alone(), { screen: shiftKey });
