# STATUS — map
_last touched: 2026-09-30_

M8's app: the map editor, and a room first (`docs/roadmap.md`, M8). A map
is the field's word for a level; the playable map is its export, as video
is a loop's, and nothing a player does enters a recipe.

## The bricks

1. **The map app opens** — begun 2026-09-30: an empty grid. Left: tiles
   painted from a tileset; vault objects placed, drawn back to front by
   where they stand; saved as a `map`, replayed, placed in compose.
2. **Walkable, and events** — signs, warps, the spawn, each through a
   schema.
3. **The player, point and click.**
4. **An avatar** — grid movement, ZQSD / WASD / arrows, E, tap to walk.
5. **Baked and published** — a static bundle, the embed mode.
6. **Toys** — pushed, then rolled.

## Works now

- **It opens on an empty grid** (2026-09-30; `tests/map-grid.mjs` 9 checks,
  `node scripts/check-map.mjs` 9). `cols` × `rows` tiles of `tile` px — 12
  × 10 of 64 to start, the map's own pixels, large, since assets are made
  large and baked small — on its ground, drawn at the size the viewer
  shows. The grid is a guide over it: G or its switch, remembered in this
  browser, never saved. A cell is found under a point, and a map that
  changes size keeps each cell where it was (`grid.js`, for the tiles to
  come). Opens as plain files with no vault.

## Known

- No Format drawer: a map's size is its grid. What it is drawn at for the
  web is the bake's, brick 5.

## Next single step

**Tiles from a tileset.** A `tileset` row — a set, `use: 'tileset'`, a new
row in `core/uses.js` — whose members are the tiles; a palette of them in
a Tiles drawer; a press and a drag on the map paint the chosen tile into
cells, the eraser empties them; the cells a list beside the panel's values,
row after row, kept through a change of size by `grid.js` `resize`.
