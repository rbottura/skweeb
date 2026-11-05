/**
 * frames.js — the scene's still frames (S9e; docs/scene.md, *The motion,
 * case by case*: "Still, never moving nor fading … the frames — the
 * viewer's, the properties' box and its tab bar, the title bar's and the
 * status bar's").
 *
 * What every app's boxes look like, drawn once by the scene in the same
 * places (style.css) and under the app's own, which cover them exactly: the
 * title bar's line, the viewer's box with its head, its rulers' bands and
 * its player's strip, the properties' box, the status bar's line. As one
 * app goes and before the next is built they are there all the same, so a
 * box never blinks — only what is in it goes and comes.
 *
 * The title bar's brand and its search are the scene's, the same for every
 * app — the app's are laid out but not shown — so in it only the app's name
 * changes, and its acts.
 *
 * No DOM at import.
 */

import { openPalette } from '../../core/Palette.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * @returns {{ nodes: HTMLElement[], name: (app: ?string) => void }}  the frames, to go into the scene's grid
 *   before anything an app lays there; and the app's name in the title bar
 */
export function stillFrames() {
  const top = el('div', 'cl-fr cl-fr-top');
  const app = el('span', 'tb-app cl-fr-app');
  const brand = el('div', 'tb-brand');
  brand.append(el('span', null, 'skweeb'), el('span', 'tb-crumb', '/'), app);
  const search = el('button', 'tb-search cl-fr-search');
  search.type = 'button';
  search.title = 'Every control and act of the page, by name';
  search.append(el('span', null, 'Search controls and acts'), el('kbd', null, '²'), el('kbd', null, 'Ctrl K'));
  search.addEventListener('click', () => openPalette());
  top.append(brand, search);

  const view = el('div', 'cl-fr cl-fr-view');
  view.append(el('div', 'cl-fr-head'), el('div', 'cl-fr-stage'), el('div', 'cl-fr-player'));

  return {
    nodes: [top, view, el('div', 'cl-fr cl-fr-props'), el('div', 'cl-fr cl-fr-bar')],
    name(name) { app.textContent = name || ''; },
  };
}
