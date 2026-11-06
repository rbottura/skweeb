/**
 * vault-set.js — a set, by hand (V2, 2026-11-06; docs/workshop.md). The
 * author: "la création de set custom en sélectionnant les images qu'on veut".
 *
 * What the vault panel selects — Ctrl or Shift click — the bar makes *a set
 * of these*: the pictures among it, shapes and stills, in the order they were
 * picked; a name, and what it is made as, its `recipe.role` (core/uses.js) —
 * a family of sprites, a grid material, a map tileset, or none, offered
 * nowhere until switched in its detail, which opens on it. A `set` as the
 * object model has it (docs/object-model.md, *Sets*): its members by id, its
 * render a contact sheet of them (core/sheet.js) — a material's in one row, as
 * grid lays one, the first the lightest, the last the darkest; its name in
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

/** The vault's, as a palette's: made by hand in its workshop. */
export const SET_ORIGIN = PALETTE_ORIGIN;

/** What a set's members can be: a picture, its render one image. */
const PICTURES = new Set(['shape', 'still']);

/** The pictures among `ids`, in their order — the selection's, the order it was picked in. */
export const picturesIn = (ids, rows) => ids.map(id => rows.find(r => r.id === id))
  .filter(r => r && PICTURES.has(r.type) && r.render && r.render.file);

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
 * These pictures, a set: their renders read, a contact sheet of them, saved.
 *
 * @param {object} o
 * @param {string[]} o.ids    the selection, in its order; what is not a picture is left out
 * @param {string} o.name
 * @param {?string} o.role    one of rolesToMake()'s, or null
 * @returns {Promise<{set: object, made: boolean}>}   `made` false when the vault had exactly this set already
 */
export async function makeSet({ ids, name, role }) {
  const rows = picturesIn(ids, Vault.index);
  if (!rows.length) throw new Error('no pictures among them');
  const images = await Promise.all(rows.map(async r =>
    createImageBitmap(await (await fetch(fileUrl(r.id, r.render.file))).blob())));
  try {
    const sheet = contactSheet(images, role === 'material' ? { cols: images.length } : {});
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
  const rows = picturesIn(ids, Vault.index);
  const role = document.createElement('select');
  role.className = 'vp-set-role';
  role.setAttribute('aria-label', 'what the set is made as');
  for (const r of rolesToMake()) role.append(Object.assign(document.createElement('option'), { value: r.role || '', textContent: r.label }));
  const ask = () => nameForm(at, {
    label: rows.length === ids.length ? `${rows.length} into a set` : `${rows.length} of the ${ids.length} — the pictures — into a set`,
    value: nameFor(rows), placeholder: 'a set’s name', extra: [role], act: 'Make the set', onCancel,
    onName: async name => {
      const said = document.createElement('span');
      said.className = 'vp-bar-say';
      said.textContent = 'making the set…';
      at.replaceChildren(said);
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
