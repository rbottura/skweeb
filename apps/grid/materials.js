/**
 * materials.js — the ramps, loaded once per page.
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

const ROOT = '/apps/grid/';

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
