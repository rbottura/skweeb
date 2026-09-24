# STATUS — compose
_last touched: 2026-09-24_

M4's app: objects from every process placed on one page, previewed live and
rendered out (`docs/roadmap.md`, M4). Built a brick at a time; four of five
are in.

## Works now — all of it seen running in Chrome

- **Three columns**, as ckt has: `placed` on the left — what is on the page,
  and the chosen one's object and transform — the page between, `page` on
  the right: core's Format drawer, open, the player and the ground. Both
  panels are core's, drawn from the two schemas in `params.js`; compose draws
  no control of its own but its list.
- **The page is the Format drawer** (`pageParams`), less what a page has no
  use for: no `ink` or `canvas` format — a page has no one source to take its
  size from — and no `zoom`, since each placement has its own scale. It opens
  as A4 at 150 dpi, 1240 × 1754, that shape to the pixel. `bleed` grows the
  canvas round the sheet, marked on the preview by a dashed trim line that is
  never in a render. `scale` multiplies the output: A3 at scale 2 reads
  `2480 × 3508 px · 2× · 212 dpi on A3`.
- **Many placements** (brick 3, `placements.js`, `list.js`). *On the page*
  lists them top first; *Add…* opens the picker for a new one, on top; ↑ and
  ↓, or `]` and `[`, move the chosen one through the stack; *Remove*, or Del,
  takes it off. A row chooses the one the `placed` panel edits — so does a
  press on the page, which picks up the topmost placement under the pointer
  by its box, turned and scaled as it is placed, and a drag moves it through
  the panel's own `x` and `y` (`pointer.js`); arrows nudge it, Shift by ten.
  The chosen one is outlined on the preview. Clearing its object, or a Reset,
  takes it off the page. An object picked with nothing chosen — or
  `?place=<id>` — goes on top, placed whole.
- **Anything core gives frames of**: a gamepad still, a gamepad loop, a grid
  dither, a ckt still, a ckt loop, a shape — each placed, all seven kinds in
  the vault, through core's `openFrames()`. **Its size is its ink**
  (`inkSize`): a gamepad loop is the 1812 × 811 its marks reach, not the
  1920 × 945 screen it was drawn on. **Placed whole**: an object chosen by
  hand fits the sheet, never above its own size (`fitScale`).
- **The transform** (`page.js`): `x` and `y` from the page's centre in page
  pixels, before `scale`; `scale` of the object's own size; `rot` in degrees,
  clockwise, about its centre. A typed transform lands on the pixel the
  matrix says; a drag of 100 page pixels moves it 100.
- **The page plays** (brick 2, `time.js`): its own `fps`, 60 by default, and
  core's player; space plays, `,` and `.` step. A loop keeps its own speed in
  real time — the page and a loop share seconds, not ticks — so a 30 fps ckt
  loop holds each tick for two on a 60 fps page.
- **Time on a page of many things**, the author's rule of 2026-09-24
  (`docs/object-model.md`, *Placement*): a still is there for the whole page,
  a loop plays again until the page ends, and the page lasts as long as its
  longest loop. Seen: a still under two loops kept every one of its ink
  pixels through 120 frames of play; a 273-tick 60 fps loop with a 180-tick
  30 fps one made a page of 360 frames.
- **Measured, playing**: a gamepad loop 60 paints a second, a ckt loop 60,
  grid's 426 × 653 dither 52–60, its 1812 × 811 dither with 60 frames of
  growth 36–45. That one painted 2 until the page asked for a preview's
  frames, `openFrames(…, { draft: true })`: grid's exact growth reads back up
  to 60 source frames on every skipped tick, 459 ms against 37.
- **The preview is drawn at the size the viewer shows**, as ckt's is, never
  more than an export would make, and each object's frame is asked for once
  per tick, so a dragged slider never re-dithers a grid.
- **Standalone**: served as plain files with no vault, the page draws, the bar
  says `no vault`, and a `?place=` link says it could not open the object.
- **A composition saves** (brick 4, its first move; `save.js`, `render.js`).
  *Save to the vault* in the Export drawer, or S: a `composition` whose recipe
  is `{ page, place }` — the page's values and every block, bottom first —
  with every placed object as a parent (`parentsOf`) and no refs, since an
  ordinary object never changes. Its render is the page at the tick on
  screen, at the page's scale, drawn again from every object opened
  **exactly** — never the preview's drafts — and let go after; a page that
  moves records its frames, rate and loop. A page with an object that would
  not open is not saved. Seen: a grid dither under a ckt loop turned −12°,
  saved as `A4 · 2 placed`, 1240 × 1754, 668 frames at 60; saved twice
  unchanged, one object.
- **A composition comes back** (brick 4, done; `rebuild.js`). Compose
  answers core's dispatch: `openObject()` opens every object on the page and
  paints it at the tick asked for, so the vault's player plays a composition
  that moves — core now replays anything with a recipe and more than one
  frame, not only a `sequence` — and the vault's detail offers *Open in
  compose ↗*. `?open=<id>` restores the page's values and its list as saved,
  nothing refitted, the top one chosen. And a page is placeable: a saved
  composition goes on another page like any loop, replayed by the same
  dispatch, core's depth guard stopping a chain nobody meant. Seen: the list
  back in order with a dragged `x` of 100, the vault playing 360 frames, the
  page placed whole on a new one.

## Tests

`tests/compose-page.mjs`: the page's size and bleed; where a placement lands —
at rest, moved, scaled and turned about its centre, the bleed moving nothing;
picking one up — the top one where two overlap, a turned one where it stands
and not where it lay; an object's ink; placed whole; the page's schema; a
placement as the object model's block, and back. `tests/compose-time.mjs`: a
loop's ticks on a page at its own rate, twice it, half, a rate that does not
divide. `tests/compose-placements.mjs`: the list with stand-in objects opened
in any order — bottom first, the page's length, a still at every tick, a
tick asked for once, moving through the stack, the newest load winning, an
entry taken off before it opened never coming back, a handle nobody holds
disposed.

`node scripts/check-compose.mjs` runs it all in Chrome: 59 checks — the save
read back out of the vault copy, reopened by link, played in the vault and
placed on a page included.

## Next — the bricks, in order

1. ~~**One object on a page at a transform, frame 0.**~~
2. ~~**The page plays.**~~
3. ~~**Many placements.**~~
4. ~~**A composition in the vault.**~~
5. **Export at print scale.** Each placement drawn again by its own app at the
   size the page needs, not its saved pixels scaled up — the roadmap's
   "`render()` finally has to be real". A still, or frames and ffmpeg for a
   page that moves. Its first move: `openFrames(object, { scale })` asking
   the app that made an object for pixels at that scale — the gamepad's
   replay has `renderScale` already, grid's `renderGrid` a `scale`, ckt's
   `framing` a view factor — so `render.js` can ask each placement for the
   page's scale times its own, and a still with a recipe is drawn again
   rather than stretched. What an export writes — a PNG, frames for ffmpeg,
   a PDF by way of sketch-2-print's paged.js — is the author's to say.

And the link, `any → compose: place on a sheet`: the vault detail's
*Place in compose ↗* on anything placeable. `?place=<id>` is ready for it.

## Known

- A placed object is drawn from its saved pixels. At an export `scale` above
  1 they would be upscaled; brick 5 is what fixes it.
- `at` and `length` are in every block and honoured by nothing yet: every
  placement starts at the page's first frame and runs its natural length.
  A timeline to set them is not one of the five bricks; it is the next thing
  after them, if the author wants one.
- Changing the page's `fps`, or anything that changes its length, starts the
  page again from its first frame.
- A large grid dither still skips ticks while it plays: 21 ms a frame, most
  of it the source replayed and sampled, not the drawing. The page keeps real
  time and shows fewer of its frames.
- A placement is picked up by its box, so a press on the clear corner of a
  turned sprite takes it, not what shows through beneath.
- The picker lists shapes inside their `folder:` groups, closed, so a legacy
  sprite is two clicks away.
- A page placed on a page is drawn at its own page pixels and scaled like a
  picture; brick 5's scale reaches through it too.
- `main.js` is at 341 lines and `scripts/check-compose.mjs` at 333. Before
  brick 5 adds to either: the placement editing (`choose`, `sync`, `putOn`,
  `takeOff`, `fitWhenOpen`) is one concept for a file of its own, and the
  check splits by what it checks.
