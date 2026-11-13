# STATUS — shader
_last touched: 2026-11-13_

M15's app: a surface from nothing — filter's chain, begun by a generator, on
the kit in `core/gpu/`. The plan, the bricks and what was settled are in
`docs/vfx.md`; the guide read in the app is `docs/guides/vfx.md`.

## The bricks

- **M15a — generators in the kit**: landed 2026-11-13 (`core/gpu/filters/`).
- **M15b — the app opens**: done 2026-11-13, this folder.
- **M15c — it saves**: done 2026-11-13.
- **M15d — a life, and the moves that want one**: next.
- M15e the link to particles; M15g, then f.

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
- **Starters** (`starters.js`): fire, smoke, energy — each a row of data,
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
- **The guide** (`docs/guides/vfx.md`, five sections), read in the app.
- **No WebGPU**: the page opens, says why, the chain can be built.
- **A module** (`core/mount.js`): `mount(host)`, `unmount()`.
- `node scripts/check-shader.mjs`, 16 checks; `tests/shader.mjs`.

## Known

- **Nothing leaves to disk yet**: no PNG, no frames zip, no sprite sheet —
  the sheet is M15e's, where particles want it.
- **No layers** (L13, `core/layers.js`), so not in `check-layers`' list.
- **Not in cluster's strip**, nor in `check-mount`'s or `check-print`'s
  lists — a side job: one row in each, and `apps/cluster/main.js`.
- **A guide opened leaves its Escape listener on the document** at an
  unmount — `core/Guide.js` has no way out yet; the puppet's does the same.
- **Every row is run on every frame.** Fine at six rows; a long chain at a
  big format may want the rows drawn only when paused.
- **Fire's dark is opaque black under its mask**, right for a layer that is
  *added*; a clear edge by brightness is M15d's `dissolve`.

## Next single step

**M15d's first move — `dissolve`** (`shader/life`), in
`core/gpu/filters/dissolve.js`: what is under kept where its brightness is
over a threshold, the threshold run `from` → `to` over the loop on
`phaseOf(info)` and `core/easing.js`, a soft edge, a hot rim of a colour.
Held in `check-filters`: whole at the first frame, gone at the last. Then
the *life* — a `time` enum in `params.js`, loop or life, the player's
`loop: false` — and `warp`, `polar`, `glow`.

## Parked

- Nothing waiting on the author.
