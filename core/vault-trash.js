/**
 * vault-trash.js — what the vault panel does with a selection: the bar across
 * the top of the grid, and the one question a delete has to ask.
 *
 * Two steps, never one. Moving to the trash is a tag and breaks nothing
 * (core/vault.js); deleting for good is only offered from the trash, and asks
 * first — once, with everything it is about to do in front of you: which
 * other objects are made from these, and what each would lose if it were kept
 * (server/delete.js). The panel owns the selection; this builds DOM and holds
 * none.
 */

import { Vault } from './vault.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: titles are user data
  return node;
};

const button = (label, cls, onClick) => {
  const b = el('button', 'vp-btn' + (cls ? ' ' + cls : ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};

const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

/**
 * Fill the bar over the grid: what is selected and what can be done with it.
 * Empty and hidden when there is nothing to say.
 *
 * @param {HTMLElement} bar
 * @param {object} s
 * @param {number} s.selected
 * @param {boolean} s.inTrash    the panel is showing the trash
 * @param {number} s.shown       objects on screen, for "select all"
 * @param {(action:'trash'|'restore'|'delete'|'all'|'none'|'group')=>void} s.act
 */
export function paintBar(bar, { selected, inTrash, shown, act }) {
  bar.replaceChildren();
  bar.hidden = !selected && !inTrash;
  if (bar.hidden) return;

  bar.append(el('span', 'vp-bar-say', selected
    ? plural(selected, 'object') + ' selected'
    : 'The trash. What is here still works wherever it is used — ctrl-click to select.'));
  bar.append(el('span', 'vp-spacer'));

  if (selected) {
    if (inTrash) {
      bar.append(button('Restore', '', () => act('restore')),
        button('Delete for good…', 'vp-btn--danger', () => act('delete')));
    } else {
      bar.append(button('Into a group…', '', () => act('group')),     // V3, vault-groups.js
        button('Move to trash', 'vp-btn--primary', () => act('trash')));
    }
    bar.append(button('Clear', '', () => act('none')));
  } else if (shown) {
    bar.append(button('Select all', '', () => act('all')));
  }
}

/**
 * Delete objects for good, after asking. Resolves to the server's answer, or
 * null when nothing was done.
 *
 * @param {HTMLElement} host   the panel, which the question covers
 * @param {string[]} ids       all of them in the trash
 */
export async function deleteFlow(host, ids) {
  const plan = await Vault.remove(ids, { dry: true });
  const choice = await ask(host, ids, plan);
  if (!choice) return null;
  return Vault.remove(ids, choice === 'plain' ? {} : { dependents: choice });
}

/** What cutting one object loose takes from it, in words. */
function losses(row) {
  const l = row.loses || {};
  if (l.recipe) return 'keeps its picture, can no longer be replayed or reopened';
  const out = [];
  if (l.members) out.push('loses ' + (l.all ? 'all ' : '') + plural(l.members, 'member'));
  if (l.placements) out.push('loses ' + (l.all ? 'all ' : '') + plural(l.placements, 'placement'));
  if (!out.length) return 'loses only the line of where it came from';
  // The render was made with them, and nothing here can draw it again.
  return out.join(', ') + (l.all ? ' — empty after' : '') + '; its picture still shows them';
}

/** @returns {Promise<'plain'|'delete'|'detach'|null>} */
function ask(host, ids, plan) {
  return new Promise(resolve => {
    const veil = el('div', 'vp-ask');
    const box = el('div', 'vp-ask-box');
    box.setAttribute('role', 'alertdialog');
    veil.append(box);

    const done = value => { veil.remove(); document.removeEventListener('keydown', esc, true); resolve(value); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
    document.addEventListener('keydown', esc, true);

    box.append(el('div', 'vp-ask-title', 'Delete ' + plural(ids.length, 'object') + ' for good?'));
    const deps = plan.dependents || [];

    if (!deps.length) {
      box.append(el('p', null, 'They leave the vault and the disk. This cannot be undone.'));
      const go = button('Delete for good', 'vp-btn--danger', () => done('plain'));
      box.append(row(go, button('Cancel', '', () => done(null))));
      host.append(veil);
      go.focus();
      return;
    }

    box.append(el('p', null, plural(deps.length, 'other object') + (deps.length === 1 ? ' is' : ' are')
      + ' made from them. Take ' + (deps.length === 1 ? 'it' : 'them') + ' too, or keep '
      + (deps.length === 1 ? 'it' : 'them') + ' without these?'));

    const list = el('ul', 'vp-ask-list');
    for (const d of deps.slice(0, 8)) {
      const li = el('li');
      li.append(el('strong', null, d.title || d.id), el('span', 'vp-type', ' ' + d.type),
        el('div', 'vp-sub', 'kept: ' + losses(d)));
      list.append(li);
    }
    if (deps.length > 8) list.append(el('li', 'vp-sub', '…and ' + (deps.length - 8) + ' more'));
    box.append(list);

    const chain = (plan.chain || []).length;
    const keep = button(deps.length === 1 ? 'Keep it, cut loose' : 'Keep them, cut loose', 'vp-btn--primary', () => done('detach'));
    box.append(row(
      keep,
      button((deps.length === 1 ? 'Delete it too' : 'Delete them too') + (chain > deps.length ? ' — ' + chain + ' down the chain' : ''),
        'vp-btn--danger', () => done('delete')),
      button('Cancel', '', () => done(null))));
    host.append(veil);
    keep.focus();
  });
}

const row = (...nodes) => { const r = el('div', 'vp-actions'); r.append(...nodes); return r; };
