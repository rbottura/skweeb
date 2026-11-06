/**
 * controls.js — the garden's keys and pointer (M14), and what each asks the
 * garden to do: ZQSD or WASD walk, by where the keys are (../steering.js);
 * E or Enter plants; Delete uproots; a digit puts that flower of the set in
 * hand; Ctrl S saves — S walks here; V the vault; a click walks there by the
 * shortest way. Never in a field, and Ctrl, Alt or Meta otherwise left to the
 * browser. It holds nothing: the garden hands it its acts.
 */

import { typing } from '../../../core/Palette.js';

/**
 * @param {object} scope            the garden's (core/scope.js): every listener goes with it
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {object} o.steer          ../steering.js's: the ways held and tapped
 * @param {object} acts             { save, act, uproot, walked, sow(n), vault, walkTo(u, v) } —
 *                                  `walkTo` a point of the canvas as shares of its width and height
 */
export function wireControls(scope, { canvas, steer }, acts) {
  scope.listen(document, 'keydown', e => {
    if (typing(e.target)) return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); acts.save(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const is = (...names) => names.includes(e.code) || names.includes(e.key);
    if (steer.press(e)) { e.preventDefault(); acts.walked(); return; }
    if (is('KeyE', 'Enter', 'NumpadEnter') && !e.repeat) { e.preventDefault(); acts.act(); return; }
    if (is('Delete', 'Backspace')) { e.preventDefault(); acts.uproot(); return; }
    if (/^Digit[1-9]$/.test(e.code)) { acts.sow(Number(e.code.slice(5))); return; }
    if (is('KeyV', 'v', 'V')) acts.vault();
  });
  scope.listen(document, 'keyup', e => steer.release(e));
  scope.listen(window, 'blur', () => steer.clear());
  scope.listen(canvas, 'click', e => {
    const r = canvas.getBoundingClientRect();
    acts.walkTo((e.clientX - r.left) / Math.max(1, r.width), (e.clientY - r.top) / Math.max(1, r.height));
  });
}
