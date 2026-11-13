# STATUS — shader
_last touched: 2026-11-13_

M15's app: a surface from nothing — filter's chain, begun by a generator, on
the kit in `core/gpu/`. The plan, the bricks and what was settled are in
`docs/vfx.md`; the guide read in the app is `docs/guides/vfx.md`.

## The bricks

- **M15a — generators in the kit**: landed 2026-11-13 (`core/gpu/filters/`).
- **M15b — the app opens**: done 2026-11-13, this folder.
- **M15c — it saves**: done 2026-11-13.
- **M15d — a life, and the moves that want one**: done 2026-11-13.
- **M15e — the link to particles**: done 2026-11-13, in particles
  (`core/sprites.js`, `apps/particles/STATUS.md`).
- **M15g — an effect in the suite's game**: done 2026-11-13, in the map's
  player (`apps/map/play/effects.js`, `apps/map/STATUS.md`).
- **M15f — an effect out to a game made elsewhere**: waits for that game.

## Works now

- **A chain over nothing** (`rows.js`, core's `Cards`): rows of the kit's
  whole catalogue, each a card from its schema, run top to bottom over a
  blank picture by one runner. It opens on one noise.
- **Every row its picture** (`frames.js`, `cut`): over each card, the chain
  cut at that row, run small — 96 pixels a side, the runner told that scale —
  on every paint, so the rows play with the loop. A picture clicked is seen
  large in the viewer, its card marked, the bar saying which; clicked again,
  the whole.
- **A loop played** (`params.js`: `frames`, `fps`, `seed`, core's format):
  a run is told its tick and the loop's length, so what scrolls comes round.
  Fire's six rows at 1080² play at the loop's 24 a second on the machine it was made on.
- **A life** (`params.js`, `time`: a loop, or a life played once): the
  player stops at the last frame, a run is told `life`, and a `dissolve`
  runs birth to death over it — whole at frame 1, gone at the last. Saved,
  its render says `loop: false`. The four moves are the kit's
  (`core/gpu/filters/`: dissolve, warp, polar, glow; `check-filters`).
- **Starters** (`starters.js`): fire, smoke, energy, and a burst
  dissolving — a life, eight rows — each a row of data,
  opened in place of the chain and played. `tests/shader.mjs` holds each to
  the catalogue: every row a filter of it, every value one its schema keeps.
- **It saves, and it replays** (`save.js`, `rebuild.js`; `check-shader-save`,
  12 checks): S saves a loop as a `sequence`, one frame as a `still` — the
  recipe `{ …values, chain }`, the seed the object's when a row draws at
  random, no parents; a smart object, so S again is its next state (S6b).
  Replayed by `openSurface`, the code the save drew with: fire's frame to
  the pixel, the same twice, the loop closed, twice the pixels at scale 2.
  `?open=` brings the values and the chain back; compose places it.
- **It prints** (core's print panel in Export): the chain over a blank
  window, run as that part of the whole (`core/gpu/window.js`) — fire at
  2160² in 81 tiles, no difference from the whole. A chain with a zoom
  blur reads from anywhere, and is printed whole.
- **A window of the stack** (`stackDrawer`): Send to ▸, as every app.
- **The guide** (`docs/guides/vfx.md`, eight sections), read in the app.
- **No WebGPU**: the page opens, says why, the chain can be built.
- **A module** (`core/mount.js`): `mount(host)`, `unmount()`.
- `node scripts/check-shader.mjs`, 19 checks; `tests/shader.mjs`.

## Known

- **Nothing leaves to disk yet**: no PNG, no frames zip, no sprite sheet —
  a life's sheet is particles', wearing it (M15e).
- **No layers** (L13, `core/layers.js`), so not in `check-layers`' list.
- **Not in cluster's strip**, nor in `check-mount`'s or `check-print`'s
  lists — a side job: one row in each, and `apps/cluster/main.js`.
- **A guide opened leaves its Escape listener on the document** at an
  unmount — `core/Guide.js` has no way out yet; the puppet's does the same.
- **Every row is run on every frame.** Fine at six rows; a long chain at a
  big format may want the rows drawn only when paused.
- **Fire's dark is opaque black under its mask**, right for a layer that is
  *added*; a `dissolve` held still (`at birth` = `at death`) clears it.
- **A chain with a warp or a polar prints whole**, not in tiles: they read
  from anywhere. Past a canvas's size such a print cannot be made.
- **A glow over nothing** leaves a grey cast where its light is faint and
  the picture clear — seen on the burst; its alpha wants another look.

## Next single step

M15's bricks are in but f, which waits for a game made elsewhere
(`docs/vfx.md`, *Settled* 6). What M15's *Done when* still asks is the
explosion itself, the author's to make: a flash, a fire dissolving, smoke
and a ring, each a life saved here, worn by particles, placed on a compose
page and played by a thing's event in the map's player (`docs/guides/vfx.md`,
7 and 8). The smallest step of this app's own: **the glow's grey cast**,
seen on the burst where its light is faint over a clear picture, and not
understood yet — its last pass (`core/gpu/filters/glow.js`) writes the
light's brightest channel as its alpha, which reads right for a
premultiplied picture. So first a case in `check-filters`: a glow over a
clear picture, read back, to see at which pass the grey comes in.

## Parked

- Nothing waiting on the author.
