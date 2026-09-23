# STATUS — grid
_last touched: 2026-09-23_

Grid v2: a source image resized so one pixel is one cell, each cell's
luminance picking a member of an ordered ramp of tiles. Ported from
`grid_sketch`, which is ~870 lines of globals — see its entry in
`docs/migration.md` for what came across and what did not.

## Works right now — seen in Chrome
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
- **The ramp is an app asset, not a family.** Making a ramp a `set` would let
  any family — a ckt emit, a gamepad folder — be a dither material. In the
  review doc as a question.

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
