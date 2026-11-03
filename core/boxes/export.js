/**
 * export.js — the Export box, made once (docs/boxes.md; S3 on the board).
 *
 * Every app built its Export drawer by hand and worded it its own way —
 * "Save this frame", "Save this frame as a still", "Save to the vault" for
 * one act. Now an app says what it saves and what it downloads, as data, and
 * the box draws the acts in one order and with one set of words: into the
 * vault, to disk, the app's own. Its body keeps the print (core/PrintPanel.js),
 * mounted after them by the app as before.
 *
 *   const box = exportBox(panel, {
 *     before: 'format',
 *     vault: { save, still, loop, loopFrames },    // each a function, or left out
 *     disk:  { picture, frames, sheet },
 *     acts:  [{ id: 'look', label: 'Save the chain as a look', run }],
 *   });
 *   box.buttons.save, box.body — to hide an act that does not apply, to mount the print.
 *
 * DOM only; theme.css draws `.nb-btn`, core/param-panel.css `.pp-actions`.
 *
 * Since S6b, `save` — the app's S — is the next state of the smart object
 * the page holds, its first making it (core/vault.js); "Save as a new object"
 * is the box's own, the first state of another.
 */

import { Vault } from '../vault.js';

/** One set of words for every app — docs/boxes.md, *The words*. */
export const EXPORT_WORDS = {
  save: 'Save to the vault  [S]',
  saveNew: 'Save as a new object',
  still: 'Save the frame as a still',
  loop: 'Save the loop',
  loopFrames: 'Save the loop + every frame (zip)',
  picture: 'Download the picture (PNG)',
  frames: 'Download every frame (zip)',
  sheet: 'Download a sprite sheet',
};

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * @param {object} panel            a ParamPanel: the box is one of its drawers
 * @param {object} [opts]
 * @param {string} [opts.before]    the drawer it goes in front of
 * @param {object} [opts.vault]     { save, still, loop, loopFrames }: what it saves into the vault
 * @param {object} [opts.disk]      { picture, frames, sheet }: what it downloads
 * @param {{id: string, label: string, run: Function}[]} [opts.acts]  the app's own
 * @returns {{ drawer: object, body: HTMLElement, buttons: Object<string, HTMLButtonElement> }}
 */
export function exportBox(panel, { before = null, vault = {}, disk = {}, acts = [] } = {}) {
  const drawer = panel.addDrawer({ id: 'export', title: 'Export', before });
  const buttons = {};
  const section = (title, entries) => {
    const given = entries.filter(e => typeof e.run === 'function');
    if (!given.length) return;
    const list = el('div', 'pp-actions');
    list.append(el('div', 'pp-actions-head', title));
    for (const { id, label, run, primary } of given) {
      const b = el('button', 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : ''), label);
      b.type = 'button';
      b.dataset.act = id;
      b.addEventListener('click', () => run());
      list.append(b);
      buttons[id] = b;
    }
    drawer.body.append(list);
  };
  const W = EXPORT_WORDS;
  section('Into the vault', [
    { id: 'save', label: W.save, run: vault.save, primary: true },
    // S is the next state of the object the page holds (S6b); this, the first of another — the page bound to it after.
    { id: 'saveNew', label: W.saveNew, run: vault.save && (() => { Vault.bind(null); return vault.save(); }) },
    { id: 'still', label: W.still, run: vault.still },
    { id: 'loop', label: W.loop, run: vault.loop },
    { id: 'loopFrames', label: W.loopFrames, run: vault.loopFrames },
  ]);
  section('To disk', [
    { id: 'picture', label: W.picture, run: disk.picture },
    { id: 'frames', label: W.frames, run: disk.frames },
    { id: 'sheet', label: W.sheet, run: disk.sheet },
  ]);
  section('Its own', acts);
  return { drawer, body: drawer.body, buttons };
}

/**
 * The Export box as the page has it now: its sections and the acts that
 * apply — for the title bar's Export menu and E's pie (core/shell/).
 *
 * @returns {Array<{ title: string, acts: Array<{ label: string, button: HTMLElement }> }>}
 */
export function actsOnPage() {
  const list = document.querySelector('.dr .pp-actions');
  const dr = list && list.closest('.dr');
  if (!dr) return [];
  return [...dr.querySelectorAll('.pp-actions')].map(l => ({
    title: l.querySelector('.pp-actions-head')?.textContent || '',
    acts: [...l.querySelectorAll('.nb-btn')]
      .filter(b => !b.hidden && !b.disabled && !b.closest('[hidden]'))
      .map(b => ({ label: b.textContent.replace(/\s+/g, ' ').trim(), button: b })),
  })).filter(s => s.acts.length);
}

/** The print under the box: its drawer opened and brought into view. */
export function showPrint() {
  const list = document.querySelector('.dr .pp-actions');
  const dr = list && list.closest('.dr');
  if (!dr) return;
  if (!dr.classList.contains('dr--open')) dr.querySelector(':scope > .dr-head').click();
  (dr.querySelector('.pp-print') || dr).scrollIntoView({ block: 'center', behavior: 'smooth' });
}
