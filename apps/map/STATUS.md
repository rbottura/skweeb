# STATUS — map
_last touched: 2026-11-06_

M8's app: the map editor, and a room first (`docs/roadmap.md`, M8). A map
is the field's word for a level; the playable map is its export, as video
is a loop's, and nothing a player does enters a recipe.

## The bricks

1. **The map app opens** — done 2026-09-30: an empty grid, tiles painted
   from a tileset, things from the vault standing on it, drawn back to front
   by where they stand; saved as a `map`, replayed, reopened, placed in
   compose.
2. **Walkable, and events** — done 2026-10-02: walls, solid things; signs,
   warps, the spawn, each a thing's event, edited through its schema.
3. **The player, point and click** — done 2026-10-02: `play/`, what answers
   outlined under the pointer, a sign shown over the map, a warp followed.
   Then M9, the rig (`docs/roadmap.md`): the avatar's body, and its walk.
4. **An avatar** — done 2026-11-06 (P4): grid movement, ZQSD / WASD /
   arrows, a pad, E, tap to walk; a character worn.
5. **Baked and published** — a static bundle, the embed mode.
6. **Toys** — pushed, then rolled.

## Works now

- **The player's avatar** (P4, 2026-11-06; `play/avatar.js`, `walk.js`,
  `tests/map-walk.mjs`, `check-map-play`). On the spawn — through a warp,
  on the warp back — wearing what stands there: a character
  (`core/character.js`), its direction's loop, the left the right mirrored
  when there are three; any other object, facing every way; nothing, a disc
  with a nose. It walks a cell at a time, 240 ms a cell, drawn between the
  two, among the things by its row: ZQSD or WASD by where the keys are
  (`event.code`), the arrows, a pad's cross or stick; walls and solid
  things stop it, turning it to face them. A step onto a warp takes it
  through. E — or Enter, space, the pad's A — uses what it faces: a sign
  read, a warp gone through; again, the sign put away. A tap walks it to a
  cell by the shortest way (`pathTo`, breadth first, round every warp but
  the one it ends on); a tap on what answers still uses it. Its loop plays
  while it walks, its stance standing. Where it stands is the player's.

- **The editor a module** (S9a, 2026-11-04; `main.js` on core's
  `mount.js`): `mount(host)` and `unmount()` — its keys and observer on the
  scope, its clock stopped, its pie and its guides' switch gone with it;
  its things disposed with it (`things.js` `dispose`), and a thing taken off
  while it opened lets its frames go as they come, where before they were
  kept. The player, `play/`, stays a page of its own: a playable map is an
  export — `check-mount`.

- **Prints at a sheet's size and a dpi** (2026-10-06; core's print panel in
  the Export drawer, `docs/core-export.md`): the map on screen, a window at
  a time through `core/windowed.js`, the torch at the frame shown — 30
  tiles against the map drawn whole, to the pixel (`check-map`).
- **The player, point and click** (2026-10-02; `play/`; `tests/map-play.mjs`
  8 checks, `check-map-play` 16). A page of its own, no panels:
  `play/?map=<id>` opens a saved map, `play/?name=<name>` the latest map so
  called. Drawn by the editor's own code (frames.js `openParts`, draw.js,
  things.js) fitted to the window, in as many pixels as the screen shows
  it with, framed in ink on the suite's ground, its loops playing. A thing
  that answers is outlined under the pointer, the pointer a hand; a press
  on a **sign** shows over the map what it shows — another object, or the
  thing itself, a loop playing by its own clock, at most four times its
  size — and what it says; a click or Escape puts it away. A **warp**
  opens the latest map of its name, pushed onto the browser's history, so
  Back comes back. With no vault, no map asked for, or a name no map has,
  it says so. The editor's Export drawer has *Play the last save ↗*, once
  a map is saved or opened.
- **Things do something, RPG Maker's way** (2026-10-02; `params.js`,
  `editing.js`, `list.js`, `guides.js`; `check-map` 44). A thing's
  panel has an *Event* drawer: none, a **sign** — what it *says*, and what
  it *shows*: another object, or nothing for the thing itself — a **warp**
  — *to the map* of that name, its latest, so a door survives the map it
  leads to being saved again — or the **spawn**, where the avatar appears,
  *facing* one way. One spawn a map: a thing made the spawn takes it from
  the other. *Mark* puts down a thing with no object, an event and nothing
  to see — an exit, the spawn; a thing whose object is cleared is one too.
  With the guides on, a sign or a warp is tagged on its cell, a mark is a
  dashed square, and the spawn an arrow the way it faces — faint while it
  falls to the middle, red on a cell that cannot be walked. What a sign
  shows is a parent of the map. The list says what each thing does.
- **What can be walked** (2026-10-02; `walk.js`, `pointer.js`;
  `tests/map-walk.mjs` 24 checks, `check-map` 44). The *walls* tool (3):
  a press marks a cell as not walkable, a drag a line of them, the right
  button clears — a list beside the cells, `walls`, a flag a cell, kept
  where they were when the map changes size, as Pokémon keeps a cell's
  permission apart from its tile. A thing made *solid* blocks the cells
  under its feet: its own, and on its row those its width covers more
  than half of — one at a width of one or two, three at three or four.
  Hatched — walls red, a solid thing's feet blue — while the tool is in
  hand or the guides are on, never in the picture; the bar counts what
  cannot be walked. `walkable(recipe, col, row)` is what the avatar will
  ask before each step; `spawnOf` where it starts; `arrival` where it
  lands through a warp — on the warp back to the map it left, as Pokémon
  pairs its doors, or at the spawn. A map saved before walls is walkable
  all over. The recipe is `{ map, cells, walls, place }`.
- **A map saves, replays, reopens, and compose places it** (2026-09-30;
  `frames.js`, `save.js`, `rebuild.js`; `check-map` 34). A new type,
  `map`, a row in `docs/object-model.md`: its recipe `{ map, cells, place }`
  — the panel's values, a tile index a cell, the things' blocks — and its
  picture the map at its own pixels, drawn by frames.js, the code a replay
  draws with, every loop on it at the frame on screen. With a loop standing
  on it, it saves with the loop's frames and rate, as a page that moves
  does. Its tileset and every thing on it are its parents; its title is its
  *name*. The vault's replay of a frame is its render, pixel for pixel; at
  scale 2 it is drawn again, its things by the apps that made them;
  `?open=` brings the values, the tiles and the things back; compose
  places a map and plays it. *Download the picture (PNG)* too.
- **Things stand on the map** (2026-09-30; `things.js`, `editing.js`,
  `list.js`; `tests/map-things.mjs` 8 checks, `check-map` 28). The things
  tool (2, or its switch): *Place…* picks any still, loop, shape or page
  from the vault and stands it on the middle cell — its feet at the cell's
  bottom middle, `width` tiles wide, as tall as its shape, so a tall thing
  rises over the cells above. A press picks up the nearest thing under it
  and a drag moves it cell to cell, never off the map; its panel — object,
  column, row, width — edits one block of `place`, as compose's placement
  panel does, and follows a drag. Things are drawn after the tiles, back to
  front by the row they stand on, then as placed; the list reads nearest
  first; Del takes the chosen one off. A loop standing on the map plays by
  the map's clock, `fps`, each at its own speed — `moves`, `framesOnPage`
  and `tickAt` moved from compose into `core/playback.js` for it. The grid
  and the chosen thing's box are one switch, *guides*.
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
  shows. The grid is a guide over it — with the chosen thing's box, one
  switch, G — remembered in this browser, never saved. A cell is found under a point, and a map that
  changes size keeps each cell where it was (`grid.js`, for the tiles to
  come). Opens as plain files with no vault.

## Known

- No Format drawer: a map's size is its grid. What it is drawn at for the
  web is the bake's, brick 5.
- Tiles are drawn square, stretched to the cell: a tileset's members are
  expected square. One layer: no tiles over the avatar yet — a tree's top,
  a door's frame. No undo.
- A thing carries its picture's ground: a particles loop saved on a cream
  ground is a cream square on the map. Save it on no ground to stand it
  over the tiles, as on a compose page.
- A thing stands on a cell, not between two; no mirror, no turn yet.
- A map's things open once each on a replay: a map with many heavy loops
  on it is as slow to open as they are, and a print is drawn with each one
  again at its scale.
- The player reads the vault: a visitor without the author's tailnet sees
  nothing until the bake (brick 5). Its things are drafts, as the editor's
  are. A mark that answers is invisible until pointed at: an exit wants a
  door's picture to be found.
- A warp names a map by its name, unchecked: a map renamed leaves the doors
  to it leading nowhere, and two maps of one name are one place, the
  latest. A solid thing blocks one row: a deep bed needs its other rows
  walled. No *trigger* yet — a cell that answers when stepped on.

## Next single step

**P7 — a worm's path across the map** (`docs/plan.md`, *P*): a path drawn on
the map that a thing follows across the room, as the rig's worm crawls round
its path, its loop closing on the map's clock. Then P8, brick 5, baked and
published. Neither is next on the board: L11 is.
