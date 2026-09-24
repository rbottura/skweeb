/**
 * materials.js — the ramps, loaded once per page: the two shipped with grid,
 * and any material from the vault — a `set` whose members, in order, are the
 * ramp (docs/object-model.md, *Uses*).
 *
 * Split out of main.js the moment a second caller appeared. `rebuild.js` has
 * to load the same ramp from a page that is not grid's — the vault panel in
 * the gamepad, replaying a dithered sequence — so the URLs here are absolute.
 * A relative './materials/…' works only while the page doing the asking is
 * `/apps/grid/`, which is exactly the bug the port already fixed once in
 * grid_sketch's `loadFont`.
 *
 * Rule 3: the list comes from the generated manifest. Nothing walks a
 * directory, here or at runtime.
 */

import { Vault } from '../../core/vault.js';

const ROOT = '/apps/grid/';

/**
 * A tile is drawn at a cell's size — 64px at most, times a scale of 4 — so a
 * member is decoded no larger than this. A 1920px still as a tile would be
 * resampled from full size for every cell it fills.
 */
const TILE_MAX = 512;

let _manifest = null;
const _ramps = new Map();

/** The material manifest, fetched once. */
export async function manifest() {
  if (_manifest) return _manifest;
  const res = await fetch(ROOT + 'material-manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('grid: no material manifest (HTTP ' + res.status + ')');
  _manifest = await res.json();
  return _manifest;
}

/**
 * One ramp, decoded and ordered light to dark.
 *
 * A member that will not decode is skipped rather than fatal — a hole costs
 * the cells that would have used it, not the render. An unknown ramp id gives
 * an empty array for the same reason: a recipe naming a material this
 * installation does not have should say so on screen, not throw during a
 * rebuild three objects deep.
 *
 * @param {string} id
 * @returns {Promise<ImageBitmap[]>}
 */
export async function ramp(id) {
  if (_ramps.has(id)) return _ramps.get(id);

  const found = (await manifest()).ramps.find(r => r.id === id);
  if (!found) {
    console.warn('[grid] no such material ramp:', id);
    _ramps.set(id, []);
    return [];
  }

  const loaded = await Promise.all(found.files.map(async file => {
    try {
      return await createImageBitmap(await (await fetch(ROOT + file)).blob());
    } catch {
      console.warn('[grid] ramp member failed to load:', file);
      return null;
    }
  }));

  const tiles = loaded.filter(Boolean);
  _ramps.set(id, tiles);
  return tiles;
}

const _tiles = new Map();         // url → Promise<?ImageBitmap>

/**
 * The size an image is decoded at as a tile: null to keep its own, or
 * `[w, h]` scaled to fit TILE_MAX, its shape kept. Numbers in, numbers out —
 * read off the image *before* it is closed. A closed ImageBitmap is 0 × 0, and
 * reading it after `close()` resized every tile over TILE_MAX to one pixel: a
 * face drawn as its average colour, in every cell (fixed 2026-09-24).
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [max=TILE_MAX]
 * @returns {?[number, number]}
 */
export function tileSize(width, height, max = TILE_MAX) {
  if (width <= max && height <= max) return null;
  const k = max / Math.max(width, height);
  return [Math.max(1, Math.round(width * k)), Math.max(1, Math.round(height * k))];
}

/**
 * One image as a tile, decoded once per page and never wider or taller than
 * TILE_MAX. Null when it will not load: a hole costs its cells, not the render.
 *
 * @param {string} url
 * @returns {Promise<?ImageBitmap>}
 */
export function tileFromUrl(url) {
  if (!_tiles.has(url)) {
    _tiles.set(url, (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const full = await createImageBitmap(blob);
        const size = tileSize(full.width, full.height);
        if (!size) return full;
        full.close();
        return await createImageBitmap(blob, {
          resizeWidth: size[0],
          resizeHeight: size[1],
          resizeQuality: 'high',
        });
      } catch {
        console.warn('[grid] a tile would not load:', url);
        return null;
      }
    })());
  }
  return _tiles.get(url);
}

/** Where a vault object's render is served. */
export const renderUrl = (id, file = 'render.png') => '/vault/objects/' + id + '/' + file;

/**
 * A material from the vault: its members' renders, in the set's order.
 *
 * @param {string} id   a `set`
 * @returns {Promise<{tiles: ImageBitmap[], title: string, missing: string[]}>}
 */
export async function materialTiles(id) {
  const { object } = await Vault.load(id);
  const members = (object.recipe && object.recipe.members) || [];
  const files = await Promise.all(members.map(async m => {
    const row = Vault.index.find(r => r.id === m);
    if (row && row.render) return renderUrl(m, row.render.file);
    try { return (await Vault.load(m)).url; } catch { return null; }
  }));
  const loaded = await Promise.all(files.map(url => (url ? tileFromUrl(url) : null)));
  return {
    tiles: loaded.filter(Boolean),
    title: object.title || id,
    missing: members.filter((m, i) => !loaded[i]),
  };
}
