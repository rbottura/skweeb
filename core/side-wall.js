/**
 * side-wall.js — an app's side column, wider or narrower by hand (S15j).
 *
 * The author, 2026-11-16: "on peut élargir le panel et ajouter la fonction de
 * l'agrandir comme le panel gauche avec le vault, car des éléments commencent
 * à être rongés par le panel" — the scene's wall (apps/cluster/wall.js), for
 * an app open alone. On the side's edge toward the viewer, a line lit as it
 * is hovered: dragged, the side is wider or narrower; the arrows move it by
 * 16 px, Shift by 64; a double click puts it back. Never narrower than its
 * rows want, never so wide the viewer is no longer one. Its width is this
 * browser's, for this app and this side — a convenience, never a recipe's.
 *
 * Made by core/ParamPanel.js with the rail, for a panel in an `.app-side`; one
 * a side. In the scene the scene's own walls do it, and this one is not made.
 * The width is `--side-l` or `--side-r` on the app's grid, which each app's
 * `--app-columns` reads (its style.css). DOM only; core/shell/shell.css draws
 * `.pp-sidewall`.
 */

import { listen } from './scope.js';

const LEAST = 300;     // a row's name, its number and its unit on one line, the rail beside them
const VIEWER = 360;    // what the viewer keeps, at the most

/**
 * @param {HTMLElement} side   an `.app-side`, a child of its app's `.app-main`
 * @param {string} app         whose width it is
 * @returns {?HTMLElement}     its wall, or null where none is made
 */
export function sideWall(side, app) {
  const main = side && side.parentElement;
  if (!main || !main.classList.contains('app-main') || side.closest('.cl-host')) return null;
  if (side.querySelector(':scope > .pp-sidewall')) return null;          // one a side: two panels may share it
  const viewer = main.querySelector(':scope > .viewer');
  const right = !viewer || !!(viewer.compareDocumentPosition(side) & Node.DOCUMENT_POSITION_FOLLOWING);
  const name = right ? '--side-r' : '--side-l';
  const key = `skweeb/side/${app}/${right ? 'r' : 'l'}`;

  const node = document.createElement('div');
  node.className = 'pp-sidewall ' + (right ? 'pp-sidewall--r' : 'pp-sidewall--l');
  node.tabIndex = 0;
  node.title = 'The panel, wider or narrower — drag it, or the arrows · a double click: as it was';
  node.setAttribute('role', 'separator');
  node.setAttribute('aria-orientation', 'vertical');
  node.setAttribute('aria-label', 'the panel’s width');
  side.append(node);

  const most = () => {
    const others = [...main.children].filter(c => c !== side && c.classList.contains('app-side') && !c.hidden)
      .reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
    const gap = parseFloat(getComputedStyle(main).columnGap) || 0;
    return Math.max(LEAST, main.clientWidth - others - VIEWER - 4 * gap);
  };
  let wanted = 0;        // asked for; 0, the app's own width
  const lay = w => {
    if (!w) { main.style.removeProperty(name); node.removeAttribute('aria-valuenow'); return side.getBoundingClientRect().width; }
    const width = Math.round(Math.min(most(), Math.max(LEAST, w)));
    main.style.setProperty(name, width + 'px');
    node.setAttribute('aria-valuenow', String(width));
    return width;
  };
  const keep = w => {
    wanted = w ? lay(w) : (lay(0), 0);
    try { if (wanted) localStorage.setItem(key, String(wanted)); else localStorage.removeItem(key); } catch { /* no storage: for this visit */ }
  };
  try { wanted = Number(localStorage.getItem(key)) || 0; } catch { /* no storage: the app's width */ }
  if (wanted) lay(wanted);

  let held = null;
  node.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const w = side.getBoundingClientRect().width;
    held = { x: e.clientX, w, now: w };
    node.setPointerCapture(e.pointerId);
    node.classList.add('pp-sidewall--held');
    document.body.classList.add('pp-walling');
  });
  node.addEventListener('pointermove', e => {
    if (held) held.now = lay(held.w + (right ? held.x - e.clientX : e.clientX - held.x));
  });
  const letGo = () => {
    if (!held) return;
    keep(held.now);
    held = null;
    node.classList.remove('pp-sidewall--held');
    document.body.classList.remove('pp-walling');
  };
  node.addEventListener('pointerup', letGo);
  node.addEventListener('pointercancel', letGo);
  node.addEventListener('dblclick', () => keep(0));
  node.addEventListener('keydown', e => {
    const by = { ArrowLeft: -16, ArrowRight: 16 }[e.key];
    if (!by) return;
    e.preventDefault();
    e.stopPropagation();
    const now = side.getBoundingClientRect().width;
    keep(now + (right ? -by : by) * (e.shiftKey ? 4 : 1));
  });
  listen(window, 'resize', () => { if (wanted) lay(wanted); });      // the window narrower: the side gives way, and comes back
  return node;
}
