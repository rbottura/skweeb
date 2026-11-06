/**
 * vault-set.js — a set, by hand (V2, 2026-11-06; docs/workshop.md). The
 * author: "la création de set custom en sélectionnant les images qu'on veut".
 *
 * What the vault panel selects — Ctrl or Shift click — the bar makes *a set
 * of these*: the pictures among it, shapes and stills, in the order they were
 * picked; a name, and what it is made as, its `recipe.role` (core/uses.js) —
 * a family of sprites, a grid material, a map tileset, a map character, or
 * none, offered nowhere until switched in its detail, which opens on it. A
 * character's members are its loops by direction, sequences or pictures,
 * four or three (core/character.js, P3): loops and no pictures selected, it
 * is the role the form starts on. A `set` as the
 * object model has it (docs/object-model.md, *Sets*): its members by id, its
 * render a contact sheet of them (core/sheet.js) — a material's in one row, as
 * grid lays one, the first the lightest, the last the darkest, and a
 * character's, its directions in RPG Maker's order; its name in
 * its recipe, since the vault dedups on content. Its origin is the vault's,
 * as a palette's (apps/vault/rebuild.js): nothing to reopen, nothing to
 * redraw. The legacy grid's materials and ckt's families were made by their
 * apps; this one by the hand.
 *
 * DOM only when the form is drawn.
 */

import { Vault }           from './vault.js';
import { USES }            from './uses.js';
import { contactSheet }    from './sheet.js';
import { toPng }           from './export.js';
import { thumbFromCanvas } from './thumb.js';
import { fileUrl }         from './vault-card.js';
import { PALETTE_ORIGIN }  from './vault-palette.js';
import { nameForm }        from './vault-name.js';
import { ROLE as CHARACTER, isCharacterCount, MEMBERS_SAID } from './character.js';

/** The vault's, as a palette's: made by hand in its workshop. */
export const SET_ORIGIN = PALETTE_ORIGIN;

/** What a set's members can be: a picture, its render one image — and a character's, its loops too. */
const PICTURES = new Set(['shape', 'still']);
const MEMBERS = { [CHARACTER]: new Set(['sequence', 'shape', 'still']) };

/** What among `ids` a set of `role` can hold, in their order — the selection's, the order it was picked in. */
export const membersIn = (ids, rows, role = null) => {
  const types = MEMBERS[role] || PICTURES;
  return ids.map(id => rows.find(r => r.id === id)).filter(r => r && types.has(r.type) && r.render && r.render.file);
};

/** The pictures among `ids`, in their order. */
export const picturesIn = (ids, rows) => membersIn(ids, rows);

/** How many of `ids` any set can hold: what the bar offers *a set of these* for. */
export const setsCanHold = (ids, rows) => membersIn(ids, rows, CHARACTER).length;

/** What a set by hand can be made as: each role a use is offered by default (core/uses.js), and none. */
export function rolesToMake() {
  const by = new Map();
  for (const u of USES) if (u.role) by.set(u.role, [...(by.get(u.role) || []), u.label]);
  return [...[...by].map(([role, labels]) => ({ role, label: labels.join(' · ') })),
    { role: null, label: 'none yet — switched where it goes, in its detail' }];
}

/** A set's name before one is given: its first member's and its last's, and how many. */
export function nameFor(rows) {
  const t = r => r.title || r.id;
  if (!rows.length) return 'a set';
  return rows.length === 1 ? t(rows[0]) : `${t(rows[0])} … ${t(rows[rows.length - 1])} (${rows.length})`;
}

/** The set's envelope, its render aside: members in their order, a role if any, its name. */
export const setEnvelope = ({ members, role, name }) => ({
  type: 'set', title: name, tags: ['by hand'], origin: SET_ORIGIN, seed: null, parents: [],
  recipe: { members, ...(role ? { role } : {}), name },
});

/**
 * These pictures — a character's loops — a set: their renders read, a contact sheet of them, saved.
 *
 * @param {object} o
 * @param {string[]} o.ids    the selection, in its order; what is not a picture is left out
 * @param {string} o.name
 * @param {?string} o.role    one of rolesToMake()'s, or null
 * @returns {Promise<{set: object, made: boolean}>}   `made` false when the vault had exactly this set already
 */
export async function makeSet({ ids, name, role }) {
  const rows = membersIn(ids, Vault.index, role);
  if (!rows.length) throw new Error(role === CHARACTER ? 'no loops among them' : 'no pictures among them');
  if (role === CHARACTER && !isCharacterCount(rows.length)) throw new Error(`a character is ${MEMBERS_SAID}`);
  const images = await Promise.all(rows.map(async r =>
    createImageBitmap(await (await fetch(fileUrl(r.id, r.render.file))).blob())));
  try {
    const sheet = contactSheet(images, role === 'material' || role === CHARACTER ? { cols: images.length } : {});
    const blob = await toPng(sheet);
    const had = new Set(Vault.index.map(r => r.id));
    const set = await Vault.save({
      ...setEnvelope({ members: rows.map(r => r.id), role, name }),
      render: { blob, ext: 'png', w: sheet.width, h: sheet.height },
      thumb: await thumbFromCanvas(sheet),
    });
    return { set, made: !had.has(set.id) };
  } finally {
    for (const b of images) b.close();
  }
}

/**
 * The bar's form: the set's name and its role, asked for in place; made, its detail is the panel's to open.
 *
 * @param {HTMLElement} at
 * @param {object} o
 * @param {string[]} o.ids
 * @param {(set: object, made: boolean) => void} o.onMade
 * @param {() => void} o.onCancel
 */
export function setForm(at, { ids, onMade, onCancel }) {
  const role = document.createElement('select');
  role.className = 'vp-set-role';
  role.setAttribute('aria-label', 'what the set is made as');
  for (const r of rolesToMake()) role.append(Object.assign(document.createElement('option'), { value: r.role || '', textContent: r.label }));
  // Loops and no pictures among them: a character, the one set made of loops (core/character.js).
  if (!picturesIn(ids, Vault.index).length) role.value = CHARACTER;
  const held = () => membersIn(ids, Vault.index, role.value || null);
  const said = () => { const n = held().length; return n === ids.length ? `${n} into a set` : `${n} of the ${ids.length} into a set`; };
  role.addEventListener('change', () => { const say = at.querySelector('.vp-bar-say'); if (say) say.textContent = said(); });
  const ask = () => nameForm(at, {
    label: said(),
    value: nameFor(held()), placeholder: 'a set’s name', extra: [role], act: 'Make the set', onCancel,
    onName: async name => {
      // What the role cannot hold is said in the form, which stays: nothing of it among them, a character miscounted.
      const r = role.value || null, n = held().length;
      const wrong = !n ? 'nothing selected is what that set holds'
        : r === CHARACTER && !isCharacterCount(n) ? `${n} loops: a character is ${MEMBERS_SAID}` : '';
      if (wrong) { at.querySelector('.vp-bar-say').textContent = wrong; return; }
      const making = document.createElement('span');
      making.className = 'vp-bar-say';
      making.textContent = 'making the set…';
      at.replaceChildren(making);
      try {
        const { set, made } = await makeSet({ ids, name, role: role.value || null });
        onMade(set, made);
      } catch (err) {
        console.error('[vault] the set could not be made:', err);
        ask();
        at.querySelector('.vp-bar-say').textContent = 'not made: ' + (err.message || err);
      }
    },
  });
  ask();
}
