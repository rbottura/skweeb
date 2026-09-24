# STATUS — compose
_last touched: 2026-09-24_

M4's app: objects from every process placed on one page, previewed live and
rendered out (`docs/roadmap.md`, M4). Built a brick at a time; two of five
are in.

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
- **The page plays** (brick 2). The page has a rate of its own, `fps`, 60 by
  default, in a *Sequence player* drawer with core's `Transport` above it;
  space plays, `,` and `.` step. A loop keeps its own speed in real time
  (`time.js`): what a loop and the page share is seconds, so a 30 fps ckt
  loop holds each tick for two on a 60 fps page, a 60 fps loop on a 30 fps
  page shows every other tick, and the page lasts the loop — 273 ticks at 60
  are 137 frames at 30. The gamepad records at 60 and ckt loops at 30, so at
  60 every loop in the suite shows every tick. A page with nothing that moves
  is one frame and does not play. The bar gives the paint rate.
- **Measured, playing in headless Chrome**: a gamepad loop 60 paints a second,
  a ckt loop 60, grid's 426 × 653 dither 52–60, and its 1812 × 811 dither
  with sprites growing over 60 frames 43. That one painted 2 at first: its
  exact growth reads back up to 60 frames of its source on every skipped
  tick, 459 ms a tick against 37, and skipping made it skip more. The page
  now asks for a preview's frames — `openFrames(…, { draft: true })`, which
  grid's `rebuild.js` answers with its own preview's growth, the one that
  never reads back. Anything exported will ask for exact ones.

## Tests

`tests/compose-page.mjs`: the page's size and bleed; where a placement lands —
at rest, moved, scaled and turned about its centre, the bleed moving nothing;
an object's ink; placed whole; the page's schema (no zoom, no derived format,
an A4 box that agrees with its chip); a placement as the object model's block,
and back. `tests/compose-time.mjs`: a loop's ticks on a page at its own rate,
at twice it, at half, at a rate that does not divide; the page lasting the
loop; wrapping, and holding when it does not loop; a picture that holds.

`node scripts/check-compose.mjs` runs all of the above in Chrome, 34 checks.

## Next — the bricks, in order

1. ~~**One object on a page at a transform, frame 0.**~~ Done, above.
2. ~~**The page plays.**~~ Done, above.
3. **Many placements.** A list of them, one chosen at a time for the `placed`
   panel to edit — `toPlacement` and `fromPlacement` are written for exactly
   this — add, remove, order, and a placement moved by dragging it. It has a
   question to settle first: what `length: null` means for a still on a page
   that moves. The object model says a still's natural length is one frame,
   and says `at: 0` is "something that is simply there"; a still that
   vanished after frame 0 would be neither. Likewise whether a loop shorter
   than the page plays again or stops.
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

- A placed object is drawn from its saved pixels. At an export `scale` above
  1 those pixels are upscaled; brick 5 is what fixes it.
- Changing the page's `fps` starts the page again from its first frame, and
  placing another object stops it — as grid's and ckt's players do.
- A large grid dither still skips ticks while it plays: 21 ms a frame, most
  of it the source replayed and sampled, not the drawing (2 to 6 ms). The
  page keeps real time and shows fewer of its frames.
- The picker lists shapes inside their `folder:` groups, closed, so a legacy
  sprite is two clicks away.
