# STATUS — compose
_last touched: 2026-09-27_

M4's app: objects from every process placed on one page, previewed live and
rendered out (`docs/roadmap.md`, M4). Built in five bricks, all in: **M4 is
done** (2026-09-24).

## Works now — all of it seen running in Chrome

- **Frames: a flipbook** (2026-09-27, the author's ask). A placement's `at`
  and `length` are honoured (`time.js` `showsAt`, `endOf`): the *Time*
  drawer of the `placed` panel says from which frame and for how many, 0
  its own — for a still the rest of the page, for a loop its loop, again
  and again, from its first tick at its `at`. The page lasts until the last
  placement ends. *Next frame…*, under *On the page*, opens the picker and
  puts the object picked where the chosen one is — the top one, if none —
  with its look, from where it ends and for as long; one with no length is
  given its own first. Waits for the one it follows to open, since its
  length is known then. Paused, a row chosen in the list, or a next frame
  added, is shown; the rows say `frame 2`, `frames 3–4`, `from frame 5`.
  A press on the page picks up only what shows at the page's tick. Checked
  by `scripts/check-frames.mjs`: three stills, a loop of three at 8 fps,
  each frame its own and the first again after the last, the press, the
  save, the vault's replay.

- **A placement can carry a look** (2026-09-26, M5's link): the placement
  panel's *look* row takes a chain saved in filter, and the object's frames
  run through it on the GPU (`core/gpu/look.js`), in the preview and in the
  exact render alike; the object is sized by what the look grows. The block
  keeps `look`, and a look is one of the page's parents. With no WebGPU the
  page shows the object as it is and says it is drawn without the look.
  Checked by `scripts/check-look.mjs`.
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
- **Print scale** (brick 5; `render.js`, `export.js`, core's `openFrames`).
  Every object is asked for frames at the size it will be drawn — its scale
  on the page times the page's — and the app that made it draws it again: a
  recording's marks at `renderScale`, grid's tiles at the cell's size times
  it, ckt's whole picture, a page's objects each at theirs. Its own size stays
  its render's at any scale, so a page places it the same way in the preview
  and in the export. A picture no app can draw again — a gamepad still, a
  shape — stays its pixels, says so (`handle.scale`), and the bar names it:
  `stretched from their pixels: brushes`. On a grid dither at 2x, drawn
  again keeps 11 times the fine detail of stretched; on a ckt still, twice.
- **Export**: *Download the page (PNG)* — A4 at scale 2 is 2480 × 3508, in
  about 0.4 to 1.6 s — and, for a page that moves, *Download every frame
  (zip)*: numbered PNGs and a `meta.json` with the page's rate, which
  `scripts/frames-to-video.mjs` turns into a video with no flags (seen: 134
  frames at 12 fps, 35 MB, into a 329 KB MP4). The zip holds each frame's PNG
  by reference (core/export.js `zipStore`), so a long export keeps one
  frame's bytes at a time. A save at scale 2 renders at print scale too. The
  author's call: PNG and frames, no PDF for now.
- **The link**, `any → compose: place on a sheet`: the vault detail offers
  *Place in compose ↗* on anything a page takes (`places()` in
  `rebuild.js`), opening `/apps/compose/?place=<id>`.

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

`node scripts/check-compose.mjs` runs it all in Chrome: 60 checks — the save
read back out of the vault copy, reopened by link, played in the vault, placed
on a page, and the vault's link to place it included.
`node scripts/check-compose-export.mjs` holds print scale: 19 checks — every
kind's own size at scale 1 and 2, drawn again or said to be stretched, the
detail a dither keeps, the PNG, the frames zip and its `meta.json`, a save
at scale 2.

## Next

The five bricks are in. What would come after them, none of it started:

- **A gamepad still drawn again at print scale**, the one kind that still
  prints stretched: its recipe's `marks` are a recording's events — the same
  shape — its `canvas` the screen, and `frame.from` its crop, so core can
  replay them through the stage at `renderScale`, every mark shown, cropped.
- **An onion skin** for a flipbook: paused, the frames before and after
  the one shown, faint, so the next is drawn to follow — preview only.
- **A timeline**, if the list's frame labels stop being enough: rows by
  time, dragged to move `at` and `length`.
- **A page length set by hand**, for a post that must be exactly ten seconds.

## Known

- A gamepad still or a shape prints stretched from its pixels, and the bar
  says which; the first item under *Next* fixes the gamepad's.
- A print export draws its page on one canvas. Tried up to A4 at scale 2,
  2480 × 3508; a browser caps a canvas's area — about 268 million pixels in
  Chrome — and the largest sheets at scale 4 are past that. Untested there.
- The chosen placement's outline is drawn on every frame, shown or not, so
  it says where the chosen one is; only what shows can be picked up.
- *Next frame…* repeats a loop placed with no length once: it is given its
  own loop's length on the page before the next frame follows it.
- **A longer frame does not push the ones after it.** Holding frame 2 for
  two frames in its *Time* drawer leaves frame 3 starting where it did, so
  the two overlap for a frame; the later ones are moved by hand. A ripple —
  the frames that started where it ended move with its end — is the obvious
  fix, and wants the author's word, since a page that is not a flipbook may
  not want it.
- Changing the page's `fps`, or anything that changes its length, starts the
  page again from its first frame.
- A large grid dither still skips ticks while it plays: 21 ms a frame, most
  of it the source replayed and sampled, not the drawing. The page keeps real
  time and shows fewer of its frames.
- A placement is picked up by its box, so a press on the clear corner of a
  turned sprite takes it, not what shows through beneath.
- The picker lists shapes inside their `folder:` groups, closed, so a legacy
  sprite is two clicks away.
- `main.js` is at 342 lines, the placement editing moved to `editing.js`;
  `scripts/check-compose.mjs` is at 336, and print scale has a check of its
  own.
