# STATUS — compose
_last touched: 2026-09-24_

M4's app: objects from every process placed on one page, previewed live and
rendered out (`docs/roadmap.md`, M4). Built a brick at a time; this is the
first.

## Works now — all of it seen running in Chrome

- **Three columns**, as ckt has: `placed` on the left (the object and its
  transform), the page between, `page` on the right (core's Format drawer,
  open, and the ground). Both panels are core's, drawn from the two schemas in
  `params.js`; compose draws no control of its own.
- **The page is the Format drawer** (`pageParams`), less what a page has no
  use for: no `ink` or `canvas` format — a page has no one source to take its
  size from — and no `zoom`, since each placement has its own scale. It opens
  as A4 at 150 dpi, 1240 × 1754, that shape to the pixel, so the chip and the
  box agree from the start and after a Reset. `bleed` grows the canvas round
  the sheet, and the preview marks the trim with a dashed line that is never
  in a render. `scale` multiplies the output: A3 at scale 2 reads
  `2480 × 3508 px · 2× · 212 dpi on A3`.
- **One object, placed** (`ref`, a `type: 'object'` param taking a still, a
  sequence or a shape), from the picker or by link, `?place=<id>`. Whatever
  made it comes through core's `openFrames()` (`core/rebuild.js`) and shows
  its frame 0: a gamepad still, a gamepad loop, a grid dither, a ckt still, a
  ckt loop, a shape — each placed in Chrome, no console errors.
- **Placed whole**: a choice made by hand sets `scale` so the object fits the
  sheet, never above 1 (`fitScale`). A restore keeps the scale it was given.
- **Its size is its ink** (`inkSize`): the `bounds` its handle gives. A
  gamepad loop replays onto the 1920 × 945 screen it was drawn on, and its
  marks reach 1812 × 811 of it — its render's size too — so it is centred and
  fitted by what can be seen, not by an empty screen.
- **The transform** (`page.js`, `placementMatrix`): `x` and `y` from the
  page's centre in page pixels, before `scale`; `scale` of the object's own
  size; `rot` in degrees, clockwise, about its centre. Typed in Chrome: a
  228 × 501 still at x 200, y −300, 0.5, 90° lands on the pixel the matrix
  says.
- **The preview is drawn at the size the viewer shows**, as ckt's is: as many
  canvas pixels as the viewer holds in device pixels, in twentieths, never
  more than an export would make. A frame is asked for once per tick
  (`frameOf`), so dragging a slider over a grid dither never re-dithers it.
- **Standalone**: served as plain files with no vault, the page draws, the bar
  says `no vault`, and a `?place=` link says it could not open the object.

## Tests

`tests/compose-page.mjs`: the page's size and bleed; where a placement lands —
at rest, moved, scaled and turned about its centre, the bleed moving nothing;
an object's ink; placed whole; the page's schema (no zoom, no derived format,
an A4 box that agrees with its chip); a placement as the object model's block,
and back.

## Next — the bricks, in order

1. ~~**One object on a page at a transform, frame 0.**~~ Done, above.
2. **The page plays.** A clock over the placement — `at` 0, its own length —
   with core's `Transport` in a *Sequence player* drawer on the page panel,
   space to play, and the bar's paint rate. Then measure a grid loop placed:
   each of its frames is a full-size re-dither (grid's `rebuild.js`), the slow
   path, where grid's own preview draws a draft.
3. **Many placements.** A list of them, one chosen at a time for the `placed`
   panel to edit — `toPlacement` and `fromPlacement` are written for exactly
   this — add, remove, order, and a placement moved by dragging it.
4. **A composition in the vault.** `{ page, place: [...] }` saved as a
   `composition`, lineage from every placed ref, a `rebuild.js` so the vault
   replays one, and `?open=<id>`.
5. **Export at print scale.** Each placement drawn again by its own app at the
   size the page needs, not its saved pixels scaled up — the roadmap's
   "`render()` finally has to be real". A still, or frames and ffmpeg for a
   page that moves.

And the link, `any → compose: place on a sheet`: the vault detail's
*Place in compose ↗* on anything placeable. `?place=<id>` is ready for it.

## Known

- A placed object is drawn from its saved pixels, frame 0. At an export
  `scale` above 1 those pixels are upscaled; brick 5 is what fixes it.
- A placed loop shows its frame 0, which need not be its fullest — the
  vault's thumbnail is the fullest — until brick 2 lets it play.
- The picker lists shapes inside their `folder:` groups, closed, so a legacy
  sprite is two clicks away.
