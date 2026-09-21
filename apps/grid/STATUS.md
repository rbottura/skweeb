# STATUS — grid
_last touched: 2026-09-21_

Grid v2: a source image resized so one pixel is one cell, each cell's
luminance picking a member of an ordered ramp of tiles. Ported from
`grid_sketch`, which is ~870 lines of globals — see the migration entry in
`docs/roadmap.md` for what came across and what did not.

## Works right now
- **The dither is arithmetic and it is tested.** `map.js` has no canvas in it:
  `gridSize()`, `luminance()`, `mapPixels()`, `rampUsage()`.
  `node tests/grid-map.mjs`, 32 checks. It fixes the original's alpha leak and
  the `- 255` that was hiding it, and pins both so neither returns.
- **Alpha means something.** Below `alphaFloor` a cell draws nothing instead of
  reading as black. That is what lets a cut-out gamepad drawing be a source at
  all rather than a page of the densest tile in the ramp.
- **Eight parameters, one schema**, built from the material manifest so the
  ramp list is whatever is on disk. `source` is a `type: "object"` row, which
  is both the vault picker and the whole of the lineage.
- **Two ramps committed**, `tiles` (10) and `trames` (8), 136 KB. Regenerate
  the manifest with `node scripts/generate-grid-manifest.js` — it sorts on the
  trailing number, because `tile1, tile10, tile2` is alphabetical and is not
  the ramp.
- Every URL the app requests was checked against the running server: its own
  five files, the seven core imports, and all 18 ramp members.

## Broken / half-done
- **Nothing here has been seen in a browser.** The modules parse, the pure core
  is tested and every path resolves, but no pixel has been drawn. That is the
  next step and it cannot be done from a terminal.
- **A `sequence` source only uses its render**, which is one frame — the
  fullest one, since 2026-09-21. Dithering a loop frame by frame is a different
  job and is what M2's link (`grid → vault: dithered sequence`) actually means.
  Today choosing a sequence dithers its still.
- **A local file cannot be re-rendered.** Drag an image in and it works, but it
  has no id, so a save is a leaf: `recipe: null`, tagged `leaf`, exactly as the
  gamepad does for a drawing over a loaded image. Lineage would need the file
  to become an object first.
- **No export at scale yet.** `renderGrid()` takes a width and scales the cell
  with it, so the path is there and untested above screen size. Nothing calls
  it with a print width.
- `width` is a parameter but the canvas is not resizable by dragging, and the
  preview never scales past 1:1 — a dither shown enlarged lies about how fine
  it is.

## Next single step
- Open `http://127.0.0.1:3000/apps/grid/`, drop an image on it, and see whether
  it draws. Then press **V** and pick the `sweep 214 marks` sequence, which is
  the first time one app eats what another made. Expect the readout to show
  cells, drawn, empty, and how much of the ramp got used — that last number is
  the one worth watching, because a ramp with most of its members unused means
  the step count is wrong for that image.

## Parked decisions
- **No p5 in this app.** Grid needs `drawImage` into a canvas and nothing else;
  the original used p5 for `createCanvas`, `image()`, `resize()`, `loadPixels()`
  and `map()`, all of which are Canvas 2D or Math. It also buys something to
  leave out: `render()` must stay pure so sandboxing is later a worker rather
  than a redesign, and a worker can hold an `OffscreenCanvas` but not a p5
  instance. CLAUDE.md rule 8 asks for instance-mode p5 and one version of it —
  the rule it protects is kept by having none. Reversible: `grid.js` is the
  only file that would change.
- **Bots on the grid — deferred, not dropped.** `playerOne.js` in the original
  is an agent, not leftovers: it holds a current cell, knows its four
  neighbours, moves in bounds, and has a verb set that acts on cells — paint,
  resize, rotate, change image, swap with another cell — with `index` already
  separating player 1 from player 2. The intent is several of them wandering
  the grid under programmed behaviours, as a parameter, later.
  Two notes for when it lands. It is where `rng()` finally earns its place in
  grid: today the dither is a pure function of source and ramp and `seed` is
  honestly `null`, but the moment a bot wanders, the seed is what makes the
  wander re-renderable. And a bot mutates cells after the mapping, so it is a
  pass over the field rather than a change to `map.js` — which is why the
  field comes back out of `renderGrid()` as `indices`.
- **The ramp is an app asset, not a vault object, for now.** Modelling a ramp
  as a `set` is the right end state and is what M3 needs anyway; a manifest is
  what M2 needs today.
