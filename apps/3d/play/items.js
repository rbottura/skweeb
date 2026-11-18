/**
 * items.js — what the worm finds and carries (M16m, docs/worm.md): "trouver
 * un item en surface implique plusieurs nouveaux éléments : l'objet item et
 * sa nature, le concept d'inventaire".
 *
 * An item is a thing of the world that can be carried: its nature — what
 * kind of thing it is, what it is for — and what it is: a vault object's id,
 * its title, its picture. The first nature is a brush, one of the legacy
 * brushes — "la famille legacy brushes, 17 items dedans", the vault's shapes
 * in that folder — a shape the gamepad draws with, drawn with in the heart
 * at M16n. With no vault, the gamepad's own brushes stand in (rule 7).
 *
 * Where they lie on the ground is the planet's seed's (rule 2): never by a
 * way's hole, nor by where the worm starts, nor by one another. Walked into
 * on the ground, one is picked up into what the worm carries, its
 * inventory: kept for the session, never saved (docs/worm.md, *Settled* 5).
 *
 * Pure: three's core only, Node runs it (tests/3d-items.mjs).
 */

import { Vector3 } from '../../../core/libs/three/three.core.js';
import { makeRng } from '../../../core/rng.js';

/** The natures an item can have, and what each is for. */
export const NATURES = { brush: 'a shape the gamepad draws with' };

/** The vault's folder of the legacy brushes: their tag. */
export const LEGACY = 'folder:legacy brushes';
/** How many it holds, the author's count — as many of the gamepad's own stand in with no vault. */
const FOLDER = 17;

const own = n => new URL(`../../gamepad/gamepad_sprites/brushes/sprite(${n}).png`, import.meta.url).href;

/** An item of `nature`: what it is — a vault object's `id` and `title`, or none — its picture, and a small one. */
export const itemOf = (nature, { id = null, title = '', picture = '', thumb = '' } = {}) =>
  ({ nature, id, title, picture, thumb: thumb || picture });

/** The brushes there are to find: the vault's legacy brushes, from their index rows — or, none there, the gamepad's own. */
export function brushesOf(rows = []) {
  const found = rows.filter(r => r && r.id && r.render && r.render.file);
  if (found.length) {
    return found.map(r => itemOf('brush', { id: r.id, title: r.title || r.id, picture: `/vault/objects/${r.id}/${r.render.file}`,
                                             thumb: r.thumb ? `/vault/objects/${r.id}/${r.thumb}` : '' }));
  }
  return Array.from({ length: FOLDER }, (_, i) => itemOf('brush', { title: `the gamepad's brush ${i + 1}`, picture: own(i + 1) }));
}

/**
 * `count` of `items` to lie on a planet's ground, each with its way up from the middle — which and where from `seed`;
 * none nearer than `clear`, radians, to any of `avoid`, nor to one another.
 */
export function strew(items, count, seed, { avoid = [], clear = 0.2 } = {}) {
  const rng = makeRng(((seed >>> 0) ^ 0x51ed) >>> 0), pool = items.slice(), out = [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const item of pool.slice(0, Math.max(0, Math.round(count)))) {
    for (let tries = 0; tries < 400; tries++) {
      const z = 2 * rng() - 1, a = 2 * Math.PI * rng(), s = Math.sqrt(1 - z * z);
      const up = new Vector3(s * Math.cos(a), z, s * Math.sin(a));
      if ([...avoid, ...out.map(o => o.up)].every(d => up.angleTo(d) > clear)) { out.push({ item, up }); break; }
    }
  }
  return out;
}

/** What the worm carries: its items, in the order they were found. */
export class Inventory {
  constructor() { this.items = []; }

  get count() { return this.items.length; }

  add(item) { if (item) this.items.push(item); return this; }

  /** Whether it carries `item`: the same one, or the same vault object, or the same picture. */
  has(item) { return this.items.some(i => i === item || (item.id ? i.id === item.id : i.picture === item.picture)); }

  /** Item `i` taken out of it — into the matrix, at M16p — or null. */
  take(i) { return this.items.splice(i, 1)[0] || null; }
}
