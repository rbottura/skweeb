/**
 * wall.js — the wall between cluster's side and the viewer, moved by hand
 * (the author, 2026-11-15: "bouger la paroi entre le vault et le viewer pour
 * agrandir ou non le panneau et adapter la taille des items dedans").
 *
 * Dragged, the side is wider or narrower, and the vault's pictures with it:
 * four columns until a picture is 150 px, then more (style.css, `--vp-card`).
 * The arrows move it by 16 px, Shift by 64; a double click puts it back.
 * Never so narrow its head's acts leave their line, never so wide the viewer
 * is no longer one. The width is this browser's, remembered as a convenience
 * — never a recipe's, never the vault's.
 */

const KEY = 'skweeb.cluster.side';
const BASE = 256;      // the bench's side view
const LEAST = 200;     // its head's count and acts on one line
const VIEWER = 360;    // what the viewer keeps, at the most

/**
 * The wall over `scene`'s grid, between its side and its viewer — returned to
 * be placed in it; the side's width set from what this browser remembers.
 *
 * @param {HTMLElement} scene  cluster's grid, `--vault-w` its side's column
 * @returns {HTMLElement}
 */
export function wall(scene) {
  const node = document.createElement('div');
  node.className = 'cl-wall';
  node.tabIndex = 0;
  node.title = 'The side, wider or narrower — drag it, or the arrows · a double click: as it was';
  node.setAttribute('role', 'separator');
  node.setAttribute('aria-orientation', 'vertical');
  node.setAttribute('aria-label', 'the side’s width');

  const px = name => parseFloat(getComputedStyle(scene).getPropertyValue(name)) || 0;
  const most = () => Math.max(LEAST, innerWidth - px('--strip') - px('--props-w') - 4 * px('--gap') - VIEWER);
  let wanted = BASE;     // the width asked for; the window may hold less of it for a while
  const lay = w => {
    const width = Math.round(Math.min(most(), Math.max(LEAST, w)));
    scene.style.setProperty('--vault-w', width + 'px');
    node.setAttribute('aria-valuenow', String(width));
    return width;
  };
  const keep = w => {
    wanted = lay(w);
    try { localStorage.setItem(KEY, String(wanted)); } catch { /* no storage here: as wide for this visit */ }
  };
  try { wanted = Number(localStorage.getItem(KEY)) || BASE; } catch { /* no storage here: the bench's width */ }
  lay(wanted);

  let held = null;
  node.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const w = lay(wanted);
    held = { x: e.clientX, w, now: w };
    node.setPointerCapture(e.pointerId);
    node.classList.add('cl-wall--held');
    document.body.classList.add('cl-walling');
  });
  node.addEventListener('pointermove', e => { if (held) held.now = lay(held.w + e.clientX - held.x); });
  const letGo = () => {
    if (!held) return;
    keep(held.now);
    held = null;
    node.classList.remove('cl-wall--held');
    document.body.classList.remove('cl-walling');
  };
  node.addEventListener('pointerup', letGo);
  node.addEventListener('pointercancel', letGo);
  node.addEventListener('dblclick', () => keep(BASE));
  node.addEventListener('keydown', e => {
    const by = { ArrowLeft: -16, ArrowRight: 16 }[e.key];
    if (!by) return;
    e.preventDefault();
    e.stopPropagation();
    keep(lay(wanted) + by * (e.shiftKey ? 4 : 1));
  });
  window.addEventListener('resize', () => lay(wanted));     // the window narrower: the side gives way, and comes back
  return node;
}
