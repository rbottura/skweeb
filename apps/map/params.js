/**
 * params.js — the map's schema: its size in tiles, its tile in px, its
 * ground.
 *
 * M8's app (docs/roadmap.md): a map, the field's word for a level — a room
 * is one. Its size is its grid, not a format: `cols` × `rows` tiles of
 * `tile` px, in the map's own pixels, large, since assets are made large and
 * baked small. So core's Format drawer is not here; what the map is drawn
 * at for the web is the bake's, a later brick.
 */

import { defineParams } from '../../core/params.js';

/** The drawers. */
export const MAP_GROUPS = {
  map: { label: 'Map', open: true },
};

export function mapParams() {
  return defineParams('map', {
    cols:   { type: 'int', min: 1, max: 128, default: 12, label: 'columns', group: 'map' },
    rows:   { type: 'int', min: 1, max: 128, default: 10, label: 'rows', group: 'map' },
    /** A tile's side in the map's own pixels: large, as the assets are. */
    tile:   { type: 'int', min: 8, max: 512, default: 64, label: 'tile px', group: 'map' },
    /** What an empty cell shows: a colour, or nothing at all. */
    ground: { type: 'ground', default: '#fffdf6', label: 'ground', group: 'map' },
  });
}
