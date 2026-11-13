# STATUS — shader
_last touched: 2026-11-13_

M15's app: a surface from nothing — filter's chain, begun by a generator, on
the kit in `core/gpu/`. The plan, the bricks and what was settled are in
`docs/vfx.md`; the guide read in the app is `docs/guides/vfx.md`.

## The bricks

- **M15a — generators in the kit**: landed 2026-11-13 (`core/gpu/filters/`).
- **M15b — the app opens**: done 2026-11-13, this folder.
- **M15c — it saves**: next.
- M15d a life and its moves; M15e the link to particles; M15g, then f.

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
- **The guide** (`docs/guides/vfx.md`, four sections), read in the app.
- **No WebGPU**: the page opens, says why, the chain can be built.
- **A module** (`core/mount.js`): `mount(host)`, `unmount()`.
- `node scripts/check-shader.mjs`, 16 checks.

## Known

- **It does not save.** The bar's Save and Export are core's and find
  nothing to do here; no `rebuild.js`, no `?open=`, no Stack drawer, no
  layers (L13) — all M15c's.
- **Not in cluster's strip**, nor in `check-mount`'s list: once it saves,
  with what a scene asks of an app.
- **A guide opened leaves its Escape listener on the document** at an
  unmount — `core/Guide.js` has no way out yet; the puppet's does the same.
- **Every row is run on every frame.** Fine at six rows; a long chain at a
  big format may want the rows drawn only when paused.
- **Fire's dark is opaque black under its mask**, right for a layer that is
  *added*; a clear edge by brightness is M15d's `dissolve`.

## Next single step

**M15c — it saves** (`shader/save`): `save.js` on `openSurface` — a still,
or a loop as a `sequence`, its recipe `{ …values, chain }`, its seed the
object's; then `rebuild.js` (`openObject`, `reopens`, `redraws`) on the same
`openSurface`, and `?open=` restoring the params and `chain.restore`.
Start with the save and `check-shader-save`: saved and replayed to the pixel.

## Parked

- Nothing waiting on the author.
