# STATUS — grid
_last touched: 2026-09-24_

Grid v2: a source image resized so one pixel is one cell, each cell's
luminance picking a member of an ordered ramp of tiles. Ported from
`grid_sketch`, which is ~870 lines of globals — see its entry in
`docs/migration.md` for what came across and what did not.

## Works right now — seen in Chrome
- **The original sketch's seven materials are in the vault** (2026-09-24, a
  side note between M4's fourth and fifth bricks). grid_sketch's `preload()`
  loaded seven folders "as mapping material" — degz 6, trames 8, sprites 13,
  myFace 8, shapes 6, tiles 10, stones 6 — and only tiles and trames had come
  across, as the ramps grid boots with, so a grid with a vault material chosen
  showed neither. `node scripts/import-legacy-grid.mjs ../grid_sketch/img`
  put all seven in: each tile a `shape` in `folder:legacy grid <name>`, each
  folder a `set` titled `<name> (legacy grid)` with `role: 'material'`, the
  sketch's order — it drew the brightest cells with file 1, the darkest with
  the last — on the black it drew on (core/legacy.js `legacyTile`,
  `legacyMaterial`; the page half is `legacy-import.js`). The faces are JPEGs
  named .png and are stored as the JPEGs they are. Five of the sketch's
  sprites are the gamepad's `brushes` 8–12, already in the vault, so the set
  names those objects rather than copying them again. A dither with
  `tiles (legacy grid)` is pixel-identical to the shipped `tiles` ramp; the
  material picker offers all seven; run twice, nothing new. Only tiles is a
  measured ramp: degz, stones and the faces keep the order the sketch gave
  them, and *Edit the material…* re-sorts one by measured tone if wanted.
  `sprites` has 13 members, one past the maker's cap of twelve, so editing
  it in the maker would drop one.
- **Materials from the vault, and a maker for them** (2026-09-24). A material
  is a vault `set` with `role: 'material'`, members light to dark; the
  Material drawer's *from the vault* picks one (only sets switched on as a
  material — core/uses.js) and it replaces the shipped ramp while chosen.
  *Make a material…* opens the maker as a column left of the viewer, so the
  dither stays in sight and previews with the tray:
  - **Pick** from a shelf: the gamepad's families on disk (all 11 here), every
    vault set, the vault's loose stills and shapes. A click puts a sprite in
    the tray or takes it out; twelve at most.
  - **Light → dark**: each tile's tone measured as the cell shows it — fitted
    in a square, over the ground the dither is on (tone.js). The tray keeps
    itself in that order until you move one by hand; *Sort by tone* returns it.
    A new ground re-measures, and re-sorts while the order is the sort's.
  - **Save**: disk sprites are copied into the vault as legacy shapes, once —
    a sprite used in five materials is one object — then the set, its contact
    sheet one row on its ground. Opened while a vault material is chosen, the
    maker starts from its members; a material made from it has it as parent.
  - **Copy all N into the vault** on a disk shelf: the whole family as legacy
    shapes in `folder:legacy <family>` plus a set, switched on as a material
    and as ckt sprites, not as gamepad brushes. 64 brushes in 2.5 s; run twice,
    nothing new.
  - A dither saved with a vault material replays pixel-identical through
    `rebuild.js` (0 bytes differed in Chrome).
  - **A replay can be a draft** (2026-09-24): asked with `draft: true`, as
    compose's page asks for its preview, `rebuild.js` replays with the
    preview's own growth — never reading back, a jump starting settled —
    tiles filled one pattern at a time, into one reused canvas. A dither with
    60 frames of growth played on a compose page at 2 paints a second exact
    and at 43 as a draft. Without the flag, a replay is exact as before.
  - **Editing** (2026-09-24): with a material chosen the button reads *Edit
    the material…*, and the vault's *Open in grid ↗* on a material opens it
    the same way. The maker starts from its members, its name filled in, and
    offers *Save changes* and *Save as a new material*. Changes are a new
    version; the old one is put away in `earlier materials`, offered nowhere,
    so every dither made with it still replays. Nothing changed says so and
    makes nothing; a rename alone is a version (`recipe.name`); edited back
    to an earlier version, that one comes back out. A set grid did not make —
    a legacy family, a ckt family — is only a start: its first twelve, saved
    as new.
- **Grow in and out** (2026-09-24, the Transition drawer, a loop source only):
  a cell that fills grows its tile from nothing over `growIn` frames; one that
  empties keeps its last tile and shrinks it away over `growOut`, the curve run
  backwards from the size it had reached. One curve for both (`growEase`, six
  on offer — core/easing.js). A tile changing in a filled cell stays full.
  Stateless: each cell's size is read from its history, counted back, so any
  frame renders on its own; a loop wraps, so an export closes. Seen in Chrome:
  a frame replayed cold from an export matched it byte for byte; on a drain,
  grow-out leaves the just-emptied cells shrinking.
  - **It is a tracker now** (growth.js): moving on a frame updates each
    cell's history in one pass — exact, checked against the full look-back on
    1,908 random frames — and only a jump reads back. The live preview never
    reads back through the source (a replay of marks walks backwards the long
    way round the loop): skipped ticks are guessed, and after a jump or a
    setting that changes the dither it starts settled. Exports and replays are
    exact; a cold replay of an exported frame matched it byte for byte.
    The first two versions read back every frame and froze on real
    recordings (2026-09-24).
- **The preview fills tile by tile** (draft-paint.js): each tile drawn once at
  the cell's size and filled as a pattern into every cell that holds it — one
  fill per tile instead of a drawImage per cell. At 57,600 cells: 353 ms → 16 ms
  a render, pixel-identical in the check; a dense loop plays at 22–24 paints a
  second with growth off, 3/3 or 12/12, where it managed about 3 before, the
  heap flat near 10 MB. Cells mid-growth are drawn on top one by one; a sprite
  size other than 1 still draws per cell. Saves, exports and replays use the
  exact per-cell path; a still is re-rendered exactly when saved. The preview
  reuses one canvas instead of making a full-size one each frame.
- **Sprite size** (`tileScale`, 0.1–10, in the Material drawer): each tile
  drawn bigger or smaller than its cell, about the cell's centre. The grid
  does not change — cell count and which tile each cell gets — only the
  picture; past 1 a tile spills over its neighbours, painted row by row, so
  each lies over the ones to its left and above. At 1 it draws exactly what it
  drew before, to the bit (tested), so saved dithers replay unchanged; a still
  saved at 6 replayed pixel-identical in Chrome. The canvas edge cuts the
  overflow — `bleed` in Format gives it room.
- **Tiles keep their shape**: a member is fitted whole into its cell and
  centred, so a sprite or a glyph cut to its ink is not stretched. Square
  tiles — both shipped ramps — draw exactly as before.
- **On the suite's UI kit** (2026-09-23): the viewer and one docked column of
  drawers — Source, Sequence player (only for a loop), Material, Ground,
  Format, Export — and the information-only bar under them. Light,
  neo-brutalist, from `core/theme.css`.
- **The dither follows the motion.** A loop source is rebuilt and dithered
  frame by frame; a save is a `sequence` with the source as its parent — M2's
  link, `grid → vault: dithered sequence`. A still source saves a `still`.
- **Zoom and scale mean one thing each**, from the shared Format drawer:
  `zoom` scales the source inside the canvas and never changes the canvas;
  `scale`, 0.25–4, multiplies the canvas — the same dither in more pixels.
  The bar reads the output size and, on a paper format, its dpi.
- **The ground can be none**: empty cells stay transparent.
- **Opens its own objects** (`?open=<id>`, from the vault's *Open in grid ↗*):
  the recipe is restored, so its source loads and is dithered again. A leaf
  names no source and gets no link (`reopens()` in `rebuild.js`).
- **The dither is arithmetic and it is tested.** `map.js` has no canvas in it;
  `node tests/grid-map.mjs`. Alpha means something: below `alphaFloor` a cell
  draws nothing, which is what lets a cut-out drawing be a source.
- **Two ramps committed**, `tiles` (10) and `trames` (8). Regenerate the
  manifest with `node scripts/generate-grid-manifest.js`.

## Broken / half-done
- **A local file cannot be re-rendered.** Dropped in, it works, but it has no
  id, so a save is a leaf: `recipe: null`, tagged `leaf`.
- **Old recipes re-render trimmed.** They carry no `format`, so `restore()`
  fills `content`; and a derived format with `zoom` ≠ 1 now keeps its canvas
  where it used to grow it. Two objects exist from before; neither used zoom.
- **A material's order is measured on one ground.** Switch the ground from
  black to white and a saved material's order does not follow — its tones
  were measured on the ground in `recipe.ground`. *Edit the material…*, *Sort
  by tone*, *Save changes* re-measures it on the ground now.
- **Tone is an average**, and an eye does not always agree: a small bright
  sprite on black can measure darker than it looks. That is why a hand move
  wins over the sort.

## Next single step
- Nothing grid-only. The suite's next step is M4's compose, which will place
  grid's dithers as it places everything else.

## Parked decisions
- **No p5 in this app.** Grid needs `drawImage` into a canvas and nothing else,
  and a render with no p5 instance can run in a worker, which keeps a
  standalone `.skw` sandboxable. CLAUDE.md rule 8 asks for p5 in every app;
  whether that stays the rule is open in the review doc.
- **Bots on the grid — deferred, not dropped.** `playerOne.js` in the original
  is an agent: a current cell, four neighbours, verbs that act on cells —
  paint, resize, rotate, change image, swap — with `index` separating player 1
  from player 2. When it lands it is where `rng()` earns its place in grid, and
  it is a pass over the field after the mapping, which is why `renderGrid()`
  returns `indices`.
