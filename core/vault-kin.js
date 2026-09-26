/**
 * vault-kin.js — objects made from one another, kept together in the vault.
 *
 * Every object names what it was made from (`parents`) and what it still
 * depends on (`refs`). By default the vault panel shows the ones joined that
 * way side by side, in one small container, in the order they came: the most
 * original first, the last made last, an arrow between each.
 *
 * Only loose objects are drawn in one. A folder is an explicit decision — a
 * session's dot-sets, the earlier versions of a material, put away — and
 * keeps what it holds. But the whole vault joins them: two loops made from
 * one dot-set that lives in a session folder are kin, and their container
 * names that parent, one click from its detail.
 *
 * A container sits where its newest member would — the grid is newest first
 * — and spans as many columns as it has members, no more than the grid has.
 * Reads index rows only, as the rest of the panel does.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: titles are user data
  return node;
};

const namedBy = r => [...(r.parents || []), ...(r.refs || [])];

/**
 * Whether this viewer keeps kin together — on unless they turned it off. A
 * convenience, kept in localStorage and never relied on, as a drawer's open
 * state is (core/Drawer.js).
 */
const STORE = 'skweeb:vault:lineage';
export function lineageOn() {
  try { return localStorage.getItem(STORE) !== '0'; } catch { return true; }
}
export function rememberLineage(on) {
  try { localStorage.setItem(STORE, on ? '1' : '0'); } catch { /* storage off: fine */ }
}

/**
 * The groups of kin among `rows`, joined through `all`.
 *
 * @param {object[]} rows   what the grid would show loose
 * @param {object[]} all    every row the vault has, the folders' and the trash's included
 * @returns {Map<string, {members: object[], outside: object[]}>}  a member's id → its group,
 *   for groups of two or more; `outside` the parents of members the group does not show
 */
export function kinOf(rows, all) {
  const up = new Map();
  const find = x => {
    if (!up.has(x)) up.set(x, x);
    while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x); }
    return x;
  };
  const byId = new Map(all.map(r => [r.id, r]));
  for (const r of all) for (const p of namedBy(r)) if (byId.has(p)) up.set(find(r.id), find(p));

  const groups = new Map();
  for (const r of rows) {
    const k = find(r.id);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  const out = new Map();
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const ids = new Set(members.map(m => m.id));
    const outside = [...new Set(members.flatMap(namedBy))].filter(id => !ids.has(id) && byId.has(id)).map(id => byId.get(id));
    const group = { members: inOrder(members), outside };
    for (const m of members) out.set(m.id, group);
  }
  return out;
}

/**
 * Most original first: a member after every member it was made from, and
 * otherwise the older first. A cycle cannot be saved (lineage points back in
 * time), but if one were, its oldest goes first rather than nothing at all.
 */
function inOrder(members) {
  const ids = new Set(members.map(m => m.id));
  const byAge = [...members].sort((a, b) => String(a.created).localeCompare(String(b.created)));
  const done = new Set();
  const out = [];
  while (out.length < members.length) {
    const next = byAge.find(m => !done.has(m.id) && namedBy(m).every(p => !ids.has(p) || done.has(p)))
      || byAge.find(m => !done.has(m.id));
    done.add(next.id);
    out.push(next);
  }
  return out;
}

/**
 * What the grid holds, in its order: loose rows, folders, and kin.
 *
 * @param {object[]} shown   the rows the panel shows, newest first
 * @param {object[]} all     every row the vault has
 * @param {object} opts
 * @param {boolean} opts.kin              group kin (the panel's `lineage` switch)
 * @param {(row:object)=>?string} opts.folderOf
 * @returns {Array<{row}|{folder: string, rows: object[]}|{kin: object}>}
 */
export function arrange(shown, all, { kin, folderOf }) {
  const groups = kin ? kinOf(shown.filter(r => !folderOf(r)), all) : new Map();
  const items = [];
  const folders = new Map();
  const placed = new Set();
  for (const row of shown) {
    const name = folderOf(row);
    if (name) {
      if (!folders.has(name)) { folders.set(name, []); items.push({ folder: name, rows: folders.get(name) }); }
      folders.get(name).push(row);
      continue;
    }
    const group = groups.get(row.id);
    if (!group) items.push({ row });
    else if (!placed.has(group)) { placed.add(group); items.push({ kin: group }); }
  }
  return items;
}

/** How many columns the grid has at a width — vault-panel.css: 150px cards, 14px gaps, 16px padding. */
export const columnsIn = width => Math.max(1, Math.floor((width - 32 + 14) / (150 + 14)));

/** A container's span: its members, no more than the grid's columns. */
export function fit(box, cols) {
  box.style.setProperty('--kin-span', String(Math.max(1, Math.min(Number(box.dataset.n) || 1, cols))));
}

/**
 * One group's container.
 *
 * @param {{members: object[], outside: object[]}} group
 * @param {object} opts
 * @param {(row:object)=>Element} opts.card       a member's card, as the grid makes it
 * @param {(id:string)=>void} opts.open           open an object's detail — a parent outside
 * @param {(e:MouseEvent, ids:string[])=>boolean} [opts.select]  a ctrl-click on the head selects them all
 * @param {number} opts.cols
 */
export function kinBox({ members, outside }, { card, open, select, cols }) {
  const box = el('div', 'vp-kin');
  box.dataset.n = String(members.length);

  const head = el('div', 'vp-kin-head');
  const name = el('button', 'vp-kin-name', 'lineage · ' + members.length);
  name.type = 'button';
  name.title = 'Made one from another, the most original first — ctrl-click to select them all';
  name.addEventListener('click', e => { if (select) select(e, members.map(m => m.id)); });
  head.append(name);
  for (const o of outside.slice(0, 2)) {
    const from = el('button', 'vp-kin-from', 'from ' + (o.title || o.id));
    from.type = 'button';
    from.title = `${o.title || o.id} — ${o.type}, not shown here: open it`;
    from.addEventListener('click', () => open(o.id));
    head.append(from);
  }
  if (outside.length > 2) head.append(el('span', 'vp-kin-more', '+' + (outside.length - 2)));

  box.append(head, ...members.map(card));
  fit(box, cols);
  return box;
}
