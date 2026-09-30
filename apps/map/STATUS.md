# STATUS — map
_last touched: 2026-09-30_

M8's app: the map editor, and a room first (`docs/roadmap.md`, M8). A map
is the field's word for a level; the playable map is its export, as video
is a loop's, and nothing a player does enters a recipe.

## The bricks

1. **The map app opens** — begun 2026-09-30: an empty grid, then tiles
   painted from a tileset. Left: vault objects placed, drawn back to front
   by where they stand; saved as a `map`, replayed, placed in compose.
2. **Walkable, and events** — signs, warps, the spawn, each through a
   schema.
3. **The player, point and click.**
4. **An avatar** — grid movement, ZQSD / WASD / arrows, E, tap to walk.
5. **Baked and published** — a static bundle, the embed mode.
6. **Toys** — pushed, then rolled.

## Works now

- **Tiles painted from a tileset** (2026-09-30; `palette.js`, `pointer.js`;
  `tests/map-grid.mjs` now 14, `check-map` 17). *tileset* in the Tiles
  drawer: a set whose members are the tiles, in its order, offered through
  a new row in `core/uses.js`, *map tileset* — any set becomes one when
  picked. Its members show as a palette, with an eraser; a press paints
  the chosen tile into the cell under it, a drag into every cell it
  crosses, the cells between two moves too, so a fast stroke leaves no
  gaps; the right button erases. Which tile is chosen is the editor's and
  never saved. The cells are a list beside the panel's values, a tile
  index a cell, row after row, -1 empty — the map's recipe will be
  `{ map, cells }` — kept where they were when the map changes size. Tiles
  are drawn from one whole canvas pixel to the next, so no seam of ground
  shows between them at any preview size.
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
- Tiles are drawn square, stretched to the cell: a tileset's members are
  expected square. One layer: no tiles over the avatar yet — a tree's top,
  a door's frame. No undo.
- Nothing saves yet: a reload loses the cells.

## Next single step

**Things placed on the map.** A *Place…* on the map's panel picks any vault
object, which stands on a cell — its feet at the cell's bottom middle, its
width in tiles, its height its own shape's — and a press picks one up, a
drag moves it cell to cell; things are drawn after the tiles, back to front
by the row they stand on, and a loop placed plays by the clock, as on a
compose page (`openFrames`, `draft`). The list of things, like the cells,
beside the panel's values: `{ map, cells, place }`.
