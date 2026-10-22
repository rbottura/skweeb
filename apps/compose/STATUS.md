# STATUS — compose
_last touched: 2026-10-22_

M4's app: objects from every process placed on one page, previewed live and
rendered out (`docs/roadmap.md`, M4). Built in five bricks, all in: **M4 is
done** (2026-09-24).

## Works now — all of it seen running in Chrome

- **Opacity and blend on every placement** (2026-10-07, M11's brick 6; a
  Blend drawer in the placed panel): kept in the block when they say
  something, drawn by `paintPage` with `globalAlpha` and canvas's blend —
  the preview, a save, an export and a print alike. A page saved from the
  live stack (core/stackSave.js) is a compose page like any other, its
  windows smart objects: what holds one is opened again when it takes a
  version (`placements.js`, `vault:updated`).
- **Prints at a sheet's size and a dpi** (2026-10-06; core's print panel in
  the Export drawer, `docs/core-export.md`): the page at the tick on screen
  in tiles, each placement asked for its part of each in its own pixels, a
  pixel round it (`placements.js` `windowLayers`) — or for its whole frame
  where its app draws no window, as a gamepad loop's; a look runs over its
  part (`core/gpu/window.js`). A part is mapped by its frame's own pixels,
  as the page draws them: by the scale alone, a box of no whole size drifted
  a fraction across the page. 35 tiles against the page drawn whole, 0.005
  of 255, nothing on a seam (`check-compose`). The PNG export beside it
  still draws on one canvas.
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
- **The ripple** (2026-09-27, the author's word; `time.js` `ripple`). A
  placement's end moved moves the ones that started at it, and on down the
  chain: frame 2 held for two pushes frame 3 and after one frame on; cut
  back, pulls them; taken off the page, the frames after it close up; and
  *Next frame…* after a frame with others after it makes room and goes in
  the stack just over the one it follows, so the list reads in order. Only
  a chain that touches end to start moves — what comes later on its own
  stays — and one with no length ends it. The bar says how many moved.
- **The onion skin** (2026-09-27; `onion.js`). Paused, the frame before the
  one shown is a red ghost and the frame after it a blue one, under it —
  only what comes and goes, so a still under the whole page is not
  doubled; before the first frame is the last. *onion skin, paused* in the
  player drawer, on by default; preview only, never in a render. Both
  checked by `scripts/check-frames.mjs`, 16 checks.

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
  and in the export. A picture no app can draw again — a shape, a picture
  from outside — stays its pixels, says so (`handle.scale`), and the bar
  names it; a gamepad still is drawn again from its marks by core since
  2026-10-06 (`core/stage/still.js`). On a grid dither at 2x, drawn
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

The five bricks are in, and M11 gave the placements opacity and blend. On
the board of `docs/plan.md`, compose's next come with the layers: **L1,
pins** — a smart placement *follows the latest* or is *kept at vN*, in the
placed panel — then L2, flatten, and L6, edit in place. Not on the board,
waiting:

- **A timeline**, if the list's frame labels stop being enough: rows by
  time, dragged to move `at` and `length`.
- **A page length set by hand**, for a post that must be exactly ten
  seconds — the newsroom's first need, if it becomes a milestone.

## Known

- A shape, or a picture from outside, prints stretched from its pixels, and
  the bar says which.
- A print export draws its page on one canvas. Tried up to A4 at scale 2,
  2480 × 3508; a browser caps a canvas's area — about 268 million pixels in
  Chrome — and the largest sheets at scale 4 are past that. Untested there.
- The chosen placement's outline is drawn on every frame, shown or not, so
  it says where the chosen one is; only what shows can be picked up.
- *Next frame…* repeats a loop placed with no length once: it is given its
  own loop's length on the page before the next frame follows it.
- **The ripple follows ends, not intent.** A placement on another layer
  that happens to start where a frame ends moves with it. On a flipbook that
  is what is meant; on a page that is not one, it is rare, and the bar says
  when anything moved.
- The onion skin ghosts only what comes and goes, so a loop that runs
  through the flipbook shows no frames of its own either side.
- Changing the page's `fps`, or anything that changes its length, starts the
  page again from its first frame.
- A large grid dither still skips ticks while it plays: 21 ms a frame, most
  of it the source replayed and sampled, not the drawing. The page keeps real
  time and shows fewer of its frames.
- A placement is picked up by its box, so a press on the clear corner of a
  turned sprite takes it, not what shows through beneath.
- The picker lists shapes inside their `folder:` groups, closed, so a legacy
  sprite is two clicks away.
- `main.js` is at 365 lines, the placement editing moved to `editing.js`;
  `scripts/check-compose.mjs` is at 345, and print scale has a check of its
  own.

## Decided as it was built — M4, 2026-09-24

Moved here from `docs/roadmap.md` on 2026-10-02, word for word, when the
roadmap passed the 400-line cap: the plan compose was built to, and what
each brick settled. `docs/decisions.md` keeps the days before and after.

### The plan it was built to: the page, and what print resolution means

Resolution is an **export** concern, never a live one. The live loop runs at
screen size with a `density` parameter, as it does today. When a composition is
right, export re-runs `render()` once, at scale, for the frames it needs — one
pass, not a loop you have to watch.

That makes a `composition` an object like any other, and a nearly free one,
because placement is already specified for `.skw`:

```json
{
  "type": "composition",
  "recipe": {
    "page": { "format": "A3", "mm": [297, 420], "bleed": 3 },
    "place": [
      { "ref": "gmp_…k3f9", "version": "latest", "at": 0,  "length": null,
        "transform": { "x": 20, "y": 30, "scale": 1 } },
      { "ref": "grd_…88f0", "version": 4, "at": 60, "length": 240,
        "transform": { "x": 120, "y": 30, "scale": 0.5 } }
    ]
  }
}
```

Its `render(recipe, { width, height, frame, rng, load })` walks `place`, calls
`load()` on each ref and draws it at the transform. Export passes a `width` in
pixels derived from the page size and the target dpi; nothing else changes.
A3 at 300 dpi is about 3500 x 4960, so this is the moment `render()` has to be
real — and the only moment.

This is also where `sketch-2-print`'s print half could rejoin: paged.js, the
A5 to A1 formats and the PDF export already solve the second half of M4.

### What the bricks settled

**M4 has begun: `apps/compose/` places one object on a page.** The first
brick of five — the rest, in order, are in `apps/compose/STATUS.md`: the page
plays, many placements, a composition in the vault, export at print scale. It
settled four things the specification had left open.

- **Two schemas, a page and a placement.** The page is core's frame group,
  less the derived formats — a page has no one source to take its size from —
  and less `zoom`, since every placement has its own scale. A placement is an
  object and a transform, and its panel edits one entry of `place[]`: the list
  is values, and no param type had to be invented for it.
- **A transform is in page pixels from the page's centre**, before the page's
  `scale`, turning clockwise about the object's centre
  (`docs/object-model.md`, *Placement*). Pixels and not millimetres because the
  page's size is pixels; millimetres are the dpi readout's business.
- **An object's size on a page is its ink** — the bounds its loop reaches. A
  gamepad loop replays onto the whole screen it was drawn on; placed by that,
  it was centred and fitted by empty space.
- **Frame N of anything is `openFrames()`**, in `core/rebuild.js`. The last
  STATUS said rebuild.js already gave frame N of anything; it gave frame N of
  a sequence, and a gamepad still, a shape or a set had no way through it. A
  sequence is replayed, a picture is its render, and data goes to its app.

**The second brick, the page plays, settled two more.**

- **A page has its own rate, and a loop keeps its own speed.** What they
  share is seconds, not ticks (`apps/compose/time.js`): a placement's `at`
  and `length` are the page's frames, at the page's `fps`. It is 60 by
  default because the gamepad records at 60 and ckt loops at 30, so at 60
  every loop in the suite shows every one of its ticks.
- **A preview asks for a preview's frames.** `openFrames(…, { draft: true })`
  lets the app that made an object answer faster and near-exact, as its own
  preview does; an export will not ask. It is the live half of "resolution is
  an export concern", and it was needed at once: grid's exact growth made a
  placed dither paint 2 frames a second, and its draft 43.

**The third, many placements, waited on one answer from the author**, and
got it the same day: on a page that moves, a still with no length is there
for the whole page, a loop with no length plays again until the page ends,
and the page lasts as long as its longest loop (`docs/object-model.md`,
*Placement*). The object model had said a still lasts one frame, against its
own "`at: 0` for something that is simply there". And a placement is picked
up on the page by its box, not its ink, as a sheet of glass would be.

**The fourth, a composition in the vault, left M4 one clause short.** A
composition saves as `{ page, place }` with every placed object a parent,
its render drawn from exact frames; compose's `rebuild.js` answers core's
dispatch, so the vault plays a page that moves, `?open=<id>` restores one,
and a page can be placed on a page. Against *Done when*: a sheet of objects
from all three apps, one of them moving, previews live — yes; one object has
a URL you can send — the `?open=` link, on the author's tailnet — yes;
renders at print scale — the fifth brick. Core replays anything with a
recipe and more than one frame now, not only a `sequence`.

**The fifth, print scale, finished M4.** An object's size is its render's —
every handle reports that, whatever it is asked — and `scale` asks for its
frames at more pixels: a recording's marks at `renderScale`, grid's tiles
at the cell's size times it, ckt's whole picture, a page's objects each at
theirs. An app says which of its stills it can draw again (`redraws()`, as
`reopens()`); a picture no app can draw again stays its pixels, says so
(`handle.scale`), and the export names it before anyone prints. On a grid
dither at 2x, drawn again keeps eleven times the fine detail of stretched.
The export writes a PNG and a frames zip — the author's call, no PDF for
now — and the zip holds its frames by reference, one frame's bytes at a time.

**Side note, between M4's fourth and fifth bricks: the original grid's
materials are in the vault.** grid_sketch loaded seven folders as mapping
material — degz, trames, sprites, myFace, shapes, tiles, stones — and only
tiles and trames had come across, as ramps grid boots with.
`scripts/import-legacy-grid.mjs` put all seven into the vault as legacy grid
materials, in the sketch's own order, offered to grid by their role; a dither
with `tiles (legacy grid)` is pixel-identical to the shipped ramp. Done on a
side branch, `grid/legacy-materials`, rebased onto main after.
