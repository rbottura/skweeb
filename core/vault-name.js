/**
 * vault-name.js — a name asked for in place, in the vault panel: a group's
 * (V3, vault-groups.js) — the selection's bar, a group's strip — or a set's
 * (V2, vault-set.js). A field, the names there are offered as it is typed,
 * its act on Enter, Escape for none.
 *
 * DOM only when it is drawn.
 */

/** A group's name made sure of: trimmed, its spaces one, sixty characters at most; empty is none. */
export const groupName = name => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: names are user data
  return node;
};

/**
 * A name asked for in place: a field, the groups there are offered as it is typed, and its acts.
 *
 * @param {HTMLElement} at                      where it goes, its content replaced
 * @param {object} o
 * @param {string} o.label                      what the field is for
 * @param {string} [o.value]                    the name it starts with
 * @param {string[]} [o.offer]                  names offered — the groups there are
 * @param {string} [o.placeholder]
 * @param {Node[]} [o.extra]                    what else is asked, after the name — a set's role
 * @param {string} o.act                        the button's word
 * @param {(name: string) => void} o.onName     the name, once given
 * @param {?() => void} [o.onOut]               a second act, out of every group — where any is grouped
 * @param {() => void} o.onCancel
 */
export function nameForm(at, { label, value = '', offer = [], placeholder = 'a group’s name', extra = [], act, onName, onOut = null, onCancel }) {
  const field = el('input', 'vp-group-name');
  Object.assign(field, { type: 'text', value, placeholder });
  field.setAttribute('aria-label', label);
  const list = el('datalist');
  list.id = 'vp-groups-' + Math.random().toString(36).slice(2);
  for (const name of offer) { const o = el('option'); o.value = name; list.append(o); }
  field.setAttribute('list', list.id);
  const go = el('button', 'vp-btn vp-btn--primary', act);
  go.type = 'button';
  const give = () => { const name = groupName(field.value); if (name) onName(name); else field.focus(); };
  go.addEventListener('click', give);
  field.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); give(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
  });
  const parts = [el('span', 'vp-bar-say', label), field, list, ...extra, go];
  if (onOut) {
    const out = el('button', 'vp-btn', 'Out of their group');
    out.type = 'button';
    out.addEventListener('click', () => onOut());
    parts.push(out);
  }
  const cancel = el('button', 'vp-btn', 'Cancel');
  cancel.type = 'button';
  cancel.addEventListener('click', () => onCancel());
  parts.push(cancel);
  at.replaceChildren(...parts);
  field.focus();
  field.select();
}
