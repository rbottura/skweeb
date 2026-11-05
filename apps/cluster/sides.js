/**
 * sides.js — cluster's side, on the left (S9f; the bench's side views): the
 * vault, the keys, the history — one shown at a time, a tab each, its bar
 * the side's head as the properties' is theirs on the right. The vault is the
 * scene's (core/VaultPanel.js); the keys (keys-view.js) and the history
 * (history-view.js) are painted when shown, and again as an app is mounted.
 * The one shown is remembered — this browser's convenience, never relied on.
 *
 * No DOM at import.
 */

import { inkFor, comeIn } from './ink.js';

const STORE = 'skweeb:cluster:side';
const remembered = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const remember = key => { try { localStorage.setItem(STORE, key); } catch { /* storage off: fine */ } };

/**
 * @param {HTMLElement} bar  the side's tab bar, on the page already
 * @param {{ key: string, label: string, el: HTMLElement, paint?: () => void }[]} views
 * @returns {{ paint: () => void, show: (key: string) => void, readonly shown: string }}
 */
export function sideViews(bar, views) {
  const ink = inkFor(bar);
  const kept = remembered();
  let on = views.some(v => v.key === kept) ? kept : views[0].key;
  const tabs = views.map(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cl-tab';
    b.textContent = v.label;
    b.dataset.side = v.key;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => show(v.key));
    return b;
  });
  bar.replaceChildren(...tabs, ink.node);

  function lay() {
    views.forEach((v, i) => {
      tabs[i].setAttribute('aria-selected', String(v.key === on));
      v.el.hidden = v.key !== on;
    });
    ink.place();
  }

  function show(key) {
    if (key === on || !views.some(v => v.key === key)) return;
    on = key;
    remember(key);
    lay();
    const v = views.find(x => x.key === key);
    if (v.paint) v.paint();
    comeIn(v.el);
  }

  lay();
  const shown = views.find(v => v.key === on);
  if (shown.paint) shown.paint();
  return {
    /** The view shown painted again: an app mounted has keys and steps of its own. */
    paint() { const v = views.find(x => x.key === on); if (v && v.paint) v.paint(); },
    show,
    get shown() { return on; },
  };
}
