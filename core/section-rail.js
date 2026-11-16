/**
 * section-rail.js — a rail of icons beside an app's panel, a section each
 * (S15h).
 *
 * The author, 2026-11-16: "une barre de nav par icône représentant une
 * section, et sur clic ferait scroller la section à côté du curseur". The
 * panel's sections, top to bottom, the dock's after them: an icon each — its
 * own where the suite knows the section, its first letters otherwise — the
 * ones in sight marked. A click opens its section if it is folded and scrolls
 * the column so that its head comes beside the hand; one in the dock is
 * opened where it is. Under a section showing one card — the 3D app's chosen
 * shape — that card's own sections, smaller: Form, Place, Look… (S15l, the
 * author: "il en faut une pour les éléments dans les formes").
 *
 * Made by core/ParamPanel.js for an app's own panel — the one mounted in an
 * `.app-side` — never a card's, a layer's or the print's. Its sections are
 * read from the page as they stand, again when the column changes. DOM only;
 * core/shell/shell.css draws `.pp-rail`.
 */

import { held } from './scope.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/** Each a 16 × 16 drawing in strokes, by the section's group id. */
const ICONS = {
  shapes: '<rect x="2" y="2" width="7" height="7"/><rect x="7" y="7" width="7" height="7"/>',
  shape: '<path d="M8 2l5 3v6l-5 3-5-3V5z"/><path d="M3 5l5 3 5-3M8 8v6"/>',
  view: '<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  light: '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/>',
  style: '<path d="M3 13c2 0 3-1 3-2.5S7 8 8.5 8 11 6 13 3"/><circle cx="4.5" cy="11.5" r="1.5"/>',
  look: '<path d="M3 13c2 0 3-1 3-2.5S7 8 8.5 8 11 6 13 3"/><circle cx="4.5" cy="11.5" r="1.5"/>',
  motion: '<path d="M13 8a5 5 0 1 1-1.5-3.5"/><path d="M12 1.5v3h-3"/>',
  player: '<path d="M5 3l8 5-8 5z"/>',
  stack: '<rect x="2" y="3" width="9" height="7"/><rect x="5" y="6" width="9" height="7"/>',
  layers: '<path d="M8 2l6 3-6 3-6-3z"/><path d="M2 8l6 3 6-3M2 11l6 3 6-3"/>',
  format: '<rect x="3" y="2" width="10" height="12"/><path d="M5 5h6"/>',
  forces: '<path d="M2 8h9M8 5l3 3-3 3"/><path d="M13 3v10"/>',
  emission: '<circle cx="4" cy="8" r="2"/><path d="M8 5l2-1M8 8h3M8 11l2 1"/>',
  // A card's own sections — a shape's (S15l)
  form: '<circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11"/>',
  place: '<path d="M8 1.5v13M1.5 8h13"/><path d="M6 3.5l2-2 2 2M6 12.5l2 2 2-2M3.5 6l-2 2 2 2M12.5 6l2 2-2 2"/>',
  swing: '<path d="M8 2v7"/><circle cx="8" cy="11" r="2"/><path d="M3 9.5a5.5 5.5 0 0 0 10 0"/>',
  modifiers: '<path d="M2 4h12M2 8h12M2 12h12"/><circle cx="5" cy="4" r="1.4"/><circle cx="10" cy="8" r="1.4"/><circle cx="6" cy="12" r="1.4"/>',
};

const letters = title => title.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 2) || '·';

/**
 * @param {HTMLElement} root   the panel's `.pp`
 * @param {HTMLElement} body   its column that scrolls
 * @returns {{ node: HTMLElement, paint: () => void }}
 */
export function sectionRail(root, body) {
  const rail = el('nav', 'pp-rail');
  const room = el('div', 'pp-rail-room');      // the column's room past its end, as a click needs it
  rail.setAttribute('aria-label', 'Sections');
  root.classList.add('pp--railed');
  root.append(rail);

  /** The sections shown now: the column's, then the dock's. */
  const sections = () => [...root.querySelectorAll(':scope > .pp-top > .dr, :scope > .pp-body > .dr, :scope > .pp-foot > .dr')]
    .filter(d => !d.hidden && d.offsetParent !== null);

  function mark() {
    const R = body.getBoundingClientRect();
    for (const b of rail.children) {
      const r = b._dr.getBoundingClientRect();
      b.classList.toggle('pp-rail-btn--seen', b._dr.closest('.pp-foot, .pp-top') ? true : r.bottom > R.top + 8 && r.top < R.bottom - 8);
    }
  }

  function go(dr, y) {
    const head = dr.querySelector(':scope > .dr-head');
    // A card's section: the section holding the card opened first, then this one (S15l).
    for (let at = dr.parentElement && dr.parentElement.closest('.dr'); at && root.contains(at); at = at.parentElement && at.parentElement.closest('.dr')) {
      if (!at.classList.contains('dr--open')) at.querySelector(':scope > .dr-head').click();
    }
    if (!dr.classList.contains('dr--open')) head.click();
    if (body.contains(dr)) {
      // Its head beside the hand — a section near the end given the room below it to come up that far.
      room.style.height = '0px';
      body.append(room);
      const by = head.getBoundingClientRect().top - y;
      const short = by - (body.scrollHeight - body.clientHeight - body.scrollTop);
      if (short > 0) room.style.height = `${Math.ceil(short)}px`;
      body.scrollTop += by;
    }
    dr.classList.remove('pp-rail-hit');
    void dr.offsetWidth;
    dr.classList.add('pp-rail-hit');
    setTimeout(() => dr.classList.remove('pp-rail-hit'), 700);
  }

  /** A section's own: the sections of the one card it shows — a list's chosen card, the 3D app's chosen shape (S15l). */
  const inside = dr => {
    const card = dr.querySelector('.pp-cards--split > .pp-card--chosen');
    return card ? [...card.querySelectorAll(':scope > .pp > .pp-body > .dr')].filter(d => !d.hidden && d.offsetParent !== null) : [];
  };

  function paint() {
    rail.replaceChildren(...sections().flatMap(dr => [{ dr, sub: false }, ...inside(dr).map(d => ({ dr: d, sub: true }))]).map(({ dr, sub }) => {
      const title = dr.querySelector(':scope > .dr-head > span')?.textContent.trim() || '';
      const b = el('button', sub ? 'pp-rail-btn pp-rail-btn--sub' : 'pp-rail-btn');
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      const icon = ICONS[dr.dataset.group];
      if (icon) b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${icon}</svg>`;     // the suite's own drawings, never a name
      else b.append(el('span', 'pp-rail-letters', letters(title)));
      b._dr = dr;
      b.addEventListener('click', e => go(dr, e.clientY));
      return b;
    }));
    mark();
  }

  // The column changed — a section come, gone, hidden — painted again once a frame at most.
  let asked = false;
  const again = () => { if (asked) return; asked = true; requestAnimationFrame(() => { asked = false; paint(); }); };
  // Only what changes the sections: a child of the column or the dock, a section's hidden or its classes — never a row's.
  const counts = r => (r.type === 'childList' ? r.target === root || r.target.matches('.pp-top, .pp-body, .pp-foot') : (r.target.classList.contains('dr') || r.target.classList.contains('pp-card')) && r.target.parentElement !== null && !rail.contains(r.target));
  const watch = new MutationObserver(records => { if (records.some(counts)) again(); });
  watch.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  held(() => watch.disconnect());
  body.addEventListener('scroll', mark, { passive: true });
  again();
  return { node: rail, paint };
}
