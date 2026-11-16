/**
 * print-box.js — the print, a box floating by the title bar's Export (S15a).
 *
 * The Export section left the properties: the title bar's Export lists its
 * acts (core/shell/titlebar.js), so the section was the same buttons twice
 * in a long column — the author, 2026-11-16: "la section d'export est
 * redondante … pareil pour print qui deviendrait une boîte flottante près du
 * bouton en haut". The section stays in the page, out of sight, its buttons
 * what the menu, E's pie and the search press; the print it held floats.
 *
 * `exportBox` makes one for its section (`printBox`); a print mounted in the
 * section's body is mounted in the floating box instead (`printHostOf`, read
 * by core/PrintPanel.js), so no app changes. `showPrint` opens it under the
 * Export button; ×, Escape or Export's Print… again close it. Held by the
 * app's scope: an app unmounted takes its box with it (core/scope.js).
 *
 * DOM only; core/shell/shell.css draws `.pp-printbox`.
 */

import { held, listen } from '../scope.js';

const hosts = new WeakMap();      // an Export section's body → its floating box's body

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/** Where a print given `mount` goes: the floating box, for an Export section's body; else `mount` itself. */
export function printHostOf(mount) { return hosts.get(mount) || mount; }

/** A floating box for the print of the Export section whose body is `body`. */
export function printBox(body) {
  if (typeof document === 'undefined') return null;
  const box = el('section', 'pp-printbox');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Print');
  const head = el('header', 'pp-printbox-head');
  const close = el('button', 'pp-printbox-x', '×');
  close.type = 'button';
  close.title = 'Close the print [Esc]';
  close.addEventListener('click', () => { box.hidden = true; });
  head.append(el('span', 'pp-printbox-title', 'Print'), close);
  const inner = el('div', 'pp-printbox-body');
  box.append(head, inner);
  document.body.append(box);
  hosts.set(body, inner);
  held(() => box.remove());
  listen(document, 'keydown', e => {
    if (e.key === 'Escape' && !box.hidden) { box.hidden = true; e.stopPropagation(); }
  }, true);
  return box;
}

/** The page's print box — the last one made that is still on the page. */
function current() {
  const all = document.querySelectorAll('body > .pp-printbox');
  return all.length ? all[all.length - 1] : null;
}

/** Under the title bar's Export, its right edge on the button's; where there is no button, under the page's top right. */
function place(box) {
  const button = [...document.querySelectorAll('skw-titlebar .tb-export')].find(b => b.offsetParent);
  const r = button ? button.getBoundingClientRect() : { bottom: 48, right: innerWidth - 16 };
  const top = Math.round(r.bottom + 6);
  box.style.top = `${top}px`;
  box.style.right = `${Math.max(4, Math.round(innerWidth - r.right))}px`;
  box.style.maxHeight = `${Math.max(160, innerHeight - top - 12)}px`;
}

/** Whether the page has a print to float: an Export box whose body was given one — the garden's has none. */
export function hasPrint() {
  const box = current();
  return !!box && box.querySelector('.pp-printbox-body').childElementCount > 0;
}

/** The print opened by the Export button — or closed, when `toggle` and it was open. True if it is open now. */
export function showPrintBox({ toggle = false } = {}) {
  const box = current();
  if (!box || !hasPrint()) return false;
  if (toggle && !box.hidden) { box.hidden = true; return false; }
  place(box);
  box.hidden = false;
  return true;
}
