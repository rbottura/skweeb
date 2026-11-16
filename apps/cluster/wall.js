/**
 * wall.js — the walls between cluster's viewer and its columns, moved by hand
 * (the author, 2026-11-15: "bouger la paroi entre le vault et le viewer pour
 * agrandir ou non le panneau et adapter la taille des items dedans"; and
 * 2026-11-16, of the properties: "élargir le panel et ajouter la fonction de
 * l'agrandir comme le panel gauche avec le vault" — S15j).
 *
 * The side's wall: dragged, the side is wider or narrower, and the vault's
 * pictures with it — four columns until a picture is 150 px, then more
 * (style.css, `--vp-card`). The properties' wall, on the other edge of the
 * viewer: the app's panel wider or narrower. The arrows move either by 16 px,
 * Shift by 64; a double click puts it back. Never so narrow its head's acts
 * leave their line, never so wide the viewer is no longer one. Each width is
 * this browser's, remembered as a convenience — never a recipe's, never the
 * vault's.
 */

/** The two walls: the column each moves, how wide it starts and least is, and which edge of the viewer it is on. */
const WALLS = {
  side:  { prop: '--vault-w', other: '--props-w', key: 'skweeb.cluster.side', base: 256, least: 200, right: false },
  props: { prop: '--props-w', other: '--vault-w', key: 'skweeb.cluster.props', base: 340, least: 300, right: true },
};
const VIEWER = 360;    // what the viewer keeps, at the most

/**
 * A wall over `scene`'s grid — returned to be placed in it; its column's
 * width set from what this browser remembers.
 *
 * @param {HTMLElement} scene  cluster's grid, `--vault-w` and `--props-w` its columns
 * @param {'side'|'props'} [which]
 * @returns {HTMLElement}
 */
export function wall(scene, which = 'side') {
  const { prop, other, key, base, least, right } = WALLS[which];
  const node = document.createElement('div');
  node.className = 'cl-wall' + (right ? ' cl-wall--props' : '');
  node.tabIndex = 0;
  node.title = `The ${right ? 'properties' : 'side'}, wider or narrower — drag it, or the arrows · a double click: as it was`;
  node.setAttribute('role', 'separator');
  node.setAttribute('aria-orientation', 'vertical');
  node.setAttribute('aria-label', right ? 'the properties’ width' : 'the side’s width');

  const px = name => parseFloat(getComputedStyle(scene).getPropertyValue(name)) || 0;
  const most = () => Math.max(least, innerWidth - px('--strip') - px(other) - 4 * px('--gap') - VIEWER);
  let wanted = base;     // the width asked for; the window may hold less of it for a while
  const lay = w => {
    const width = Math.round(Math.min(most(), Math.max(least, w)));
    scene.style.setProperty(prop, width + 'px');
    node.setAttribute('aria-valuenow', String(width));
    return width;
  };
  const keep = w => {
    wanted = lay(w);
    try { localStorage.setItem(key, String(wanted)); } catch { /* no storage here: as wide for this visit */ }
  };
  try { wanted = Number(localStorage.getItem(key)) || base; } catch { /* no storage here: the bench's width */ }
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
  // The properties' wall is on the viewer's right: dragged left, they are wider.
  node.addEventListener('pointermove', e => { if (held) held.now = lay(held.w + (right ? held.x - e.clientX : e.clientX - held.x)); });
  const letGo = () => {
    if (!held) return;
    keep(held.now);
    held = null;
    node.classList.remove('cl-wall--held');
    document.body.classList.remove('cl-walling');
  };
  node.addEventListener('pointerup', letGo);
  node.addEventListener('pointercancel', letGo);
  node.addEventListener('dblclick', () => keep(base));
  node.addEventListener('keydown', e => {
    const by = { ArrowLeft: -16, ArrowRight: 16 }[e.key];
    if (!by) return;
    e.preventDefault();
    e.stopPropagation();
    keep(lay(wanted) + (right ? -by : by) * (e.shiftKey ? 4 : 1));
  });
  window.addEventListener('resize', () => lay(wanted));     // the window narrower: the column gives way, and comes back
  return node;
}
