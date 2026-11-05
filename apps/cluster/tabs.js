/**
 * tabs.js — cluster's properties, on the right (S9c; the bench's layout, the
 * author's yes of 2026-11-05: "tu peux prendre la mise en page du bench qui
 * est super"). The app's panels — its `.app-side`s, one or two — shown one at
 * a time, a tab each, as the bench had particles' two; and the object open
 * in the scene's vault, its detail, a tab beside them. Which panel each app
 * showed is kept for its next mount — by its id: its title is there only
 * once the app has started.
 *
 * The panels stay the app's: laid by the scene in one place (style.css),
 * each is only shown or not (`cl-shown`). One the app hides or shows — grid's
 * maker — loses or gains its tab as it does.
 *
 * An object dragged from the vault (core/vault-drag.js): a tab whose panel
 * holds a field that would take it is marked, and opens as the drag rests on
 * it — the field may be in a panel not shown.
 *
 * Its motion (S9e): the chosen tab's underline is one, sliding to the tab
 * chosen; a panel shown by its tab, or an object's detail, comes in a short
 * fade — over the scene's box, the same as its own, so what fades is what is
 * in it (frames.js).
 *
 * No DOM at import.
 */

const DETAIL = '\u0000detail';      // the detail's key: no panel can be named so

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/** A panel's name: its title, core/ParamPanel.js's — or what its id says. */
const nameOf = side => ((side.querySelector('.pp-title') || {}).textContent || side.id.replace(/-side$/, '') || 'panel').trim();

/**
 * @param {object} o
 * @param {HTMLElement} o.bar      the tab bar, the scene's
 * @param {HTMLElement} o.detail   where the scene's vault puts an object's detail
 * @param {HTMLElement} o.none     what the column says when it has nothing to show
 * @returns {{ mounted: (app: string, root: HTMLElement) => void, paint: () => void, leaving: () => void,
 *             showDetail: (label: string) => void, hideDetail: () => void, readonly shown: ?string }}
 */
export function propsTabs({ bar, detail, none }) {
  const kept = new Map();   // app → the panel it showed
  let app = null, root = null, watch = null;
  let open = null;          // the detail's label — its object's type — while one is open
  let on = null;            // the tab shown: a panel's id, or DETAIL
  let back = null;          // the panel shown before the detail took the column
  let dragging = false;     // an object from the vault under way: the tabs whose panel would take it marked
  let said = '';            // what the bar says, as last built
  const ink = el('span', 'cl-tabs-ink');   // the chosen tab's underline: one, sliding from tab to tab
  document.addEventListener('vault:drag', e => { dragging = !!e.detail.row; paint(); });

  /** The panels showing now, the detail after them. */
  function tabs() {
    const sides = root ? [...root.querySelectorAll('.app-main > .app-side')].filter(s => !s.hidden) : [];
    const out = sides.map(s => ({ key: s.id || nameOf(s), label: nameOf(s), el: s }));
    if (open) out.push({ key: DETAIL, label: open, el: detail });
    return out;
  }

  /**
   * The tabs as they are. Asked often — on every change in the app's panels, a frame's readout among them —
   * the bar is built again only when what it says changed: a tab hovered, or rested on by a drag, stays itself.
   */
  function paint() {
    const all = tabs();
    if (!all.some(t => t.key === on)) on = (all.find(t => t.key === (app && kept.get(app))) || all[0] || {}).key || null;
    const takes = all.map(t => dragging && t.key !== on && !!t.el.querySelector('.skw-takes'));
    const says = JSON.stringify([all.map(t => [t.key, t.label]), on, takes]);
    if (says !== said) {
      said = says;
      bar.replaceChildren(...all.map((t, i) => {
        const b = el('button', 'cl-tab' + (t.key === DETAIL ? ' cl-tab--detail' : '') + (takes[i] ? ' skw-spring' : ''), t.label);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(t.key === on));
        b.addEventListener('click', () => choose(t.key));
        return b;
      }), ink);
    }
    for (const t of all) t.el.classList.toggle('cl-shown', t.key === on);
    if (!open) detail.classList.remove('cl-shown');
    none.hidden = all.length > 0;
    underline();
  }

  /** The underline under the chosen tab — slid there, once it has been somewhere. */
  function underline() {
    const b = bar.querySelector('.cl-tab[aria-selected="true"]');
    ink.hidden = !b;
    if (!b) return;
    const at = `translateX(${b.offsetLeft + 8}px)`, width = Math.max(0, b.offsetWidth - 16) + 'px';
    if (ink.style.transform === at && ink.style.width === width) return;
    ink.classList.toggle('cl-tabs-ink--placed', !!ink.style.width);     // the first time, it is put there
    Object.assign(ink.style, { transform: at, width });
  }

  /** A panel shown by a tab, or a detail opened, comes in: a short fade. */
  function comeIn(key) {
    const t = tabs().find(x => x.key === key);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (t && !reduced && typeof t.el.animate === 'function') t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease' });
  }

  function choose(key) {
    const was = on;
    on = key;
    if (key !== DETAIL && app) kept.set(app, key);
    paint();
    if (key !== was) comeIn(key);
  }

  return {
    /** An app's root, built in the scene: its panels watched, a tab each, the one it showed last shown again. */
    mounted(name, at) {
      if (watch) watch.disconnect();
      app = name;
      root = at;
      on = kept.get(name) || null;           // its own panel first: an object still open waits in its tab
      back = null;
      const main = root.querySelector('.app-main');
      // A panel shown or hidden by its app — the `hidden` of a child of its grid — and the tabs follow.
      watch = new MutationObserver(list => {
        if (list.some(m => m.type === 'childList' || (m.target.parentElement === main && m.target.classList.contains('app-side')))) paint();
      });
      if (main) watch.observe(main, { childList: true, attributes: true, attributeFilter: ['hidden'], subtree: true });
      paint();
    },
    /** Painted again: the panels' titles are there once the app has booted. */
    paint,
    /** The app going: what it showed kept, nothing of it watched. */
    leaving() {
      if (watch) watch.disconnect();
      watch = null;
      if (app && on && on !== DETAIL) kept.set(app, on);
      app = root = null;
      paint();
    },
    /** An object open in the scene's vault: its detail, a tab, shown. */
    showDetail(label) {
      const was = on;
      if (on !== DETAIL) back = on;
      open = label;
      on = DETAIL;
      paint();
      if (was !== DETAIL) comeIn(DETAIL);
    },
    /** Its detail closed: the panel shown before it, again. */
    hideDetail() {
      open = null;
      const was = on;
      if (on === DETAIL) on = back;
      back = null;
      paint();
      if (was === DETAIL && on) comeIn(on);
    },
    /** The tab shown: a panel's id, 'detail', or null. */
    get shown() { return on === DETAIL ? 'detail' : on; },
  };
}
