/**
 * params.js — the map's schema: its size in tiles, its tile in px, its
 * ground.
 *
 * M8's app (docs/roadmap.md): a map, the field's word for a level — a room
 * is one. Its size is its grid, not a format: `cols` × `rows` tiles of
 * `tile` px, in the map's own pixels, large, since assets are made large and
 * baked small. So core's Format drawer is not here; what the map is drawn
 * at for the web is the bake's, a later brick.
 *
 * The cells are not here either: a list, one tile index a cell, row after
 * row, kept beside these values as compose keeps its placements beside its
 * page; nor its walls, a flag a cell beside them. Nor are the things standing
 * on the map: a list of blocks, each edited through `thingParams` — the map's
 * recipe is `{ map, cells, walls, place }`.
 */

import { defineParams } from '../../core/params.js';
import { FACES }        from './walk.js';

/** The drawers. */
export const MAP_GROUPS = {
  map:   { label: 'Map', open: true },
  tiles: { label: 'Tiles', open: true },
};

export function mapParams() {
  return defineParams('map', {
    /** What it is called: its title in the vault, and later what a warp names. */
    name:   { type: 'text', default: 'a room', label: 'name', group: 'map' },
    cols:   { type: 'int', min: 1, max: 128, default: 12, label: 'columns', group: 'map' },
    rows:   { type: 'int', min: 1, max: 128, default: 10, label: 'rows', group: 'map' },
    /** A tile's side in the map's own pixels: large, as the assets are. */
    tile:   { type: 'int', min: 8, max: 512, default: 64, label: 'tile px', group: 'map' },
    /** What an empty cell shows: a colour, or nothing at all. */
    ground: { type: 'ground', default: '#fffdf6', label: 'ground', group: 'map' },
    /** The map's own rate: a loop standing on it keeps its speed, as on a compose page. */
    fps:    { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'map' },
    /**
     * A set whose members are the tiles, in its order — offered through
     * core/uses.js as a map tileset. The cells name them by their place.
     */
    tileset: { type: 'object', accepts: ['set'], use: 'tileset', label: 'tileset', group: 'tiles' },
  });
}

/** What can stand on a map: anything compose places. */
export const PLACEABLE = ['still', 'sequence', 'shape', 'composition', 'model'];

/** The chosen thing's drawers. */
export const THING_GROUPS = {
  thing: { label: 'The thing', open: true },
  event: { label: 'Event', open: true },
};

/**
 * What a thing does, RPG Maker's way: an event is a thing on the map, and
 * one with no object is an event and nothing to see — an exit, a spawn.
 * A *sign* is used and something shows — its words, and a picture: another
 * object, or the thing itself. A *warp* is stepped on and leads to the map
 * of that name, its latest. The *spawn* is where the avatar appears, facing
 * one way: one a map, so a thing made the spawn takes it from another.
 */
export const EVENTS = ['none', 'sign', 'warp', 'spawn'];

/**
 * One thing standing on the map — a block of `place` — as its panel edits
 * it: what it is, the cell it stands on, its feet at the cell's bottom
 * middle, and how many tiles wide it is; its height is its own shape's.
 * Solid, its feet cannot be walked (walk.js). Its event's rows show only for
 * that event, and keep their values when hidden, as every row does.
 */
export function thingParams() {
  return defineParams('map-thing', {
    ref:   { type: 'object', accepts: PLACEABLE, label: 'object', group: 'thing' },
    col:   { type: 'int', min: 0, max: 127, default: 0, label: 'column', group: 'thing' },
    row:   { type: 'int', min: 0, max: 127, default: 0, label: 'row', group: 'thing' },
    width: { type: 'range', min: 0.25, max: 16, step: 0.25, default: 1, label: 'width, tiles', group: 'thing' },
    solid: { type: 'bool', default: false, label: 'solid', group: 'thing' },
    event: { type: 'enum', options: EVENTS, default: 'none', label: 'event', group: 'event' },
    says:  { type: 'text', multiline: true, default: '', label: 'says', group: 'event', when: { event: 'sign' } },
    /** What shows when it is used: another object, or — nothing chosen — the thing itself. */
    shows: { type: 'object', accepts: PLACEABLE, label: 'shows', group: 'event', when: { event: 'sign' } },
    /** A map's name: the warp leads to the latest map so called. */
    to:    { type: 'text', default: '', label: 'to the map', group: 'event', when: { event: 'warp' } },
    face:  { type: 'enum', options: FACES, default: FACES[0], label: 'facing', group: 'event', when: { event: 'spawn' } },
  });
}
