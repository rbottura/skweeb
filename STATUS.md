# STATUS — skweeb
_last touched: 2026-09-26_

## Works right now

- **M5's link: a look** (`filter → compose: a look`, 2026-09-26;
  `node scripts/check-look.mjs`, 12 checks). A chain saved alone in filter is
  a look, a `params` object; compose puts it over a placement, sized by what
  it grows, and the page saves it in its block and among its parents and
  replays it. Filters now reach past the edge: filter's `edges`, grow or
  keep. Both clauses of M5's *Done when* are met; M5 stays open for its
  catalogue.
- **filter saves, and its objects replay** (M5's third brick, 2026-09-26;
  `node scripts/check-filter-save.mjs`, 17 checks). A still or a loop, its
  recipe `{ source, chain }` and its source its parent; `apps/filter/rebuild.js`
  replays it for the vault, compose and filter itself — a saved still came
  back with no difference here, and draws again at print scale; `?open=`
  brings the chain back. With no WebGPU a filter object shows as its render
  (core's `openPicture`, exported for it).
- **filter, M5's app, opens and filters live** (`apps/filter/`, 2026-09-26;
  `node scripts/check-filter.mjs`, 19 checks). Any vault still, shape, loop
  or moving composition — or a file dropped, with no vault — through a chain
  of GPU filters, each a card drawn from its own schema by core's ParamPanel,
  switched off, moved, taken out. A loop plays through the chain at 61 paints
  a second here; with no WebGPU the page opens, says why and shows the source
  as it is. Nothing saves yet: `apps/filter/STATUS.md` has the bricks.
- **The bar gives the status line back** after a result's three seconds —
  an app that says things only when something changes kept a result on it
  for good.
- **The GPU kit, M5's first brick** (`core/gpu/`, WebGPU, 2026-09-26), seen
  on this machine's GPU by `node scripts/check-gpu.mjs`, 18 checks. One
  device for the page; a chain of filters run in one call, handed back as an
  ImageBitmap that Canvas 2D draws at once, as `frame(i)` needs; premultiplied
  alpha throughout, rgba16float between passes; sizes in the source's pixels,
  times the print scale. Four filters, written here: brightness, contrast, a
  two-pass Gaussian blur, pixelate. Each lands on its formula's pixels — the
  blur within 0.45 of its exact weights — a blurred sprite's edge stays its
  colour, and a chain of three on 1024 × 1024 takes 1.7 ms, read back. A
  filter is data with its source and licence (rule 5); a broken shader names
  its own line; a page with no WebGPU gets null and a reason.
- **WebGPU on every machine the author uses**: the serving PC's Radeon, and
  the smallest PC's Intel gen-9 once Chrome's flags are on
  (`chrome://flags/#enable-unsafe-webgpu`, and Vulkan) — textures to 16384,
  a software fallback adapter besides (webgpureport.org, 2026-09-26).
- **The vault has a trash, and objects can be deleted** (2026-09-26), all of
  it seen in Chrome on a copy of the vault. Ctrl- or shift-click selects a
  card or a whole folder; the bar moves them to the trash — a `trash` tag, so
  nothing breaks and it can be undone. The trash is a view of its own: restore,
  or delete for good. When other objects are made from what is going, the
  panel asks once and says what each would lose: delete the chain too, or keep
  them cut loose — a set loses those members, a page those placements, and a
  recipe still naming a deleted object is set aside, the object becoming its
  picture. `server/delete.js`; rules in `docs/object-model.md`, *Trash, and
  deleting*.
- **A vault folder is a card** the size of any object — a tab, its first four
  members as its picture — opening into a strip across the grid, and it
  closes again: it never did, the grid's `display` beating `hidden`.
- **Side note, between M4's fourth and fifth bricks: the original grid's
  seven materials are in the vault.** degz, trames, sprites, myFace, shapes,
  tiles and stones — what grid_sketch loaded as mapping material — as legacy
  grid materials, `<name> (legacy grid)`: 7 sets and 59 new objects, in the
  sketch's own order, offered to grid by their role, so the material picker
  lists them beside the author's own. `node scripts/import-legacy-grid.mjs
  ../grid_sketch/img` did it and makes nothing new run again; a dither with
  `tiles (legacy grid)` is pixel-identical to the shipped ramp. Five of the
  sketch's sprites were already here as the gamepad's `brushes` 8–12, and
  the set names those. Done on the branch `grid/legacy-materials`, rebased
  onto main after. `apps/grid/STATUS.md` has the detail. The faces then
  showed a grid bug: every vault tile over 512 px was decoded as one pixel,
  so its cells were its average colour — fixed on `grid/tile-size-fix`.
- **M4 is done** (2026-09-24): compose puts objects from every app on one
  page, plays them, saves and reopens the page, and exports it at print
  scale (`apps/compose/`), all of it seen in Chrome. Three columns, as ckt
  has: `placed` on the left — what is on the page, and the chosen one's
  object and transform — the page between, `page` on the right: core's Format
  drawer, open, less the derived formats and `zoom`, A4 at 150 dpi to start.
  Any still, loop or shape from any app, added with the picker or by
  `?place=<id>`, placed whole; listed top first, ordered with ↑ ↓ or `[ ]`,
  removed with Del. A row, or a press on the page, chooses the one the panel
  edits; a drag moves it, arrows nudge it, and it is outlined on the preview.
  `x`, `y` from the page's centre in page pixels, `scale`, `rot` clockwise
  about its centre (`docs/object-model.md`, *Placement*); bleed with a trim
  line, a transparent ground, `scale` for the export's pixels. Opens with no
  vault. `apps/compose/STATUS.md` has the five bricks.
- **A composition saves, and comes back** (brick 4, done). S, or *Save to the
  vault* in the Export drawer, writes a `composition` — recipe
  `{ page, place }`, every placed object a parent, the page at the tick on
  screen as its render, drawn again from exact frames
  (`apps/compose/render.js`), never the preview's drafts. Compose's own
  `rebuild.js` answers core's dispatch, so the vault's player plays a page
  that moves, the detail offers *Open in compose ↗*, `?open=<id>` puts the
  page and its list back as saved, and a saved page can be placed on another
  page. The URL to send is `?open=`, on the author's tailnet.
- **Print scale** (brick 5): every placed object is asked for frames at the
  size it will be printed — its scale on the page times the page's — and the
  app that made it draws it again (core's `openFrames(…, { scale })`; each
  app's `redraws()`), its own size staying its render's. A picture no app
  can draw again stays its pixels and the bar names it. A grid dither at 2x
  keeps 11 times the fine detail drawn again that it would stretched.
  *Download the page (PNG)*: A4 at scale 2 is 2480 × 3508. *Download every
  frame (zip)*: numbered PNGs and the page's rate, which
  `scripts/frames-to-video.mjs` made into an MP4 with no flags; the zip holds
  each frame by reference, one frame's bytes at a time. The link,
  `any → compose: place on a sheet`: the vault detail's *Place in compose ↗*.
- **Core replays anything with a recipe and more than one frame** — a
  `sequence`, or a composition that moves — in `openFrames()` and in the
  vault detail's player, not only type `sequence`.
- **Time on a page of many things, decided by the author** (2026-09-24,
  `docs/object-model.md`): a still is there for the whole page, a loop plays
  again until the page ends, and the page lasts as long as its longest loop.
  The object model had said a still lasts one frame, against its own
  "`at: 0` for something that is simply there".
- **The page plays** (brick 2): a rate of its own, `fps`, 60 by default, with
  core's player; each loop at its own speed in real time (`time.js`) — a
  30 fps ckt loop holds each tick for two on a 60 fps page. Measured playing:
  a gamepad loop 60 paints a second, a ckt loop 60, a small grid dither
  52–60, a 1812 × 811 dither with 60 frames of growth 43 — it was 2, because
  grid's exact growth reads back 60 source frames on every skipped tick. The
  page asks for a preview's frames now, `openFrames(…, { draft: true })`,
  which grid's `rebuild.js` answers with its own preview's growth; exports
  will ask for exact ones.
- **Frame N of anything is `openFrames()`** (`core/rebuild.js`): a sequence
  replayed as before, and now a still, a shape or a set as its render, one
  frame long. Last session's STATUS said rebuild.js already did this; it did it
  for sequences only. An object's size on a page is its ink — a gamepad loop's
  `bounds`, 1812 × 811, not the 1920 × 945 screen it was drawn on.
- **A browser check is a command**: `node scripts/check-compose.mjs` starts its
  own server on a copy of the vault, drives headless Chrome
  (`scripts/chrome.mjs`, no dependencies, a real mouse included; the server
  and the temp vault in `scripts/check-kit.mjs`, for the next app's check)
  and runs 60 checks — every kind placed, a typed transform landing on the
  pixels `page.js` computes, the page's formats, every loop played in real
  time and stepped, three placed with the picker, a still kept while loops
  play, one picked up and dragged on the page, a composition saved, read
  back, reopened by link, played in the vault and placed on a page, the
  vault's link to place one, no vault at all, a console quiet on every page.
  `node scripts/check-compose-export.mjs` holds print scale in 19 more. They
  fail when the page throws. Two sessions' drivers were lost in scratchpads;
  this one is in the repo.
- **A set says where it is offered** (`core/uses.js`), all of it seen in
  Chrome. A vault set's detail has a switch per use — *gamepad brush family*,
  *grid material*, *ckt sprite family* — and each app lists only the sets
  switched on for it: the gamepad's selector, grid's material picker, ckt's
  family list. The switches are `use:<id>` tags. A set nobody has switched
  follows its role, so every family ckt emitted before stays in the gamepad;
  all off is `use:none`. Adding a consumer is a row in `USES`.
- **Tags are the one editable part of an object** — decided this session, in
  `docs/object-model.md`, *Tags change*. `PATCH /api/vault/<id>` takes
  `{ add, remove }` and nothing else; `Vault.retag()` is its client. Render,
  recipe, seed and lineage stay frozen. A set's index row now carries its
  `role`, so pickers filter without opening every set.
- **grid makes materials** (`apps/grid/maker.js`): up to twelve sprites from
  the gamepad's families on disk, the vault's sets and its loose images, kept
  light to dark by their measured tone on the current ground, previewed live
  in the dither, saved as a `set` with `role: 'material'`. A dither made with
  one replays pixel-identical. `apps/grid/STATUS.md` has the detail.
- **The legacy folder**: a disk sprite a material uses is copied into the
  vault once, as a `shape` leaf in `folder:legacy <family>` (`core/legacy.js`);
  a disk shelf's *Copy all N into the vault* copies the whole family and makes
  it a set, switched on for grid and ckt but not the gamepad, which has the
  original. Copying again makes nothing new.
- **Materials can be edited** — from grid (*Edit the material…*) or from the
  vault (*Open in grid ↗* on a material). *Save changes* makes a new version
  and puts the old one away in `earlier materials`, offered nowhere, so
  dithers made with it still replay as they were; the picker shows only the
  current one. Seen in Chrome: no-change, rename, edit back to an earlier
  version, open by link.
- **The material picker no longer comes up empty** in front of a server that
  predates rows carrying `role`: sets without one are asked their envelope
  (`core/vault-offer.js`), and the gamepad and ckt check envelopes too. A
  filtered picker now says how many never-switched sets it left out, shows
  them on request, and switches one on when it is picked.
- **Sprites grow in and out, in grid** — a cell that fills grows its tile from
  nothing, one that empties shrinks its last tile away, each over its own
  number of frames along one easing curve; any frame still renders on its own
  (each cell's history is counted back), so scrubbing, exports and replays
  agree. It took three tries to be usable on real recordings: the history is a
  tracker now, updated a frame at a time, and the live preview never reads
  back through the source. And the preview draws a dither with one fill per
  tile instead of a draw per cell — 22× faster on a dense field, so a 57,600-
  cell loop plays at 22–24 paints a second, growth on or off
  (`apps/grid/STATUS.md`). **`core/easing.js`** is the suite's easing
  asset: thirty-one classic curves, six offered in words by `easeParam()`.
- **grid has a sprite size** (`tileScale`): tiles drawn up to ten times their
  cell, overlapping, the grid itself unchanged. Size 1 is bit-identical to
  before.
- **ckt draws with vault sets**: the legacy brushes, a material, another
  family — any set switched on as ckt sprites is in its family list.
- **ckt's rotation no longer stutters**, seen and measured in Chrome against
  the previous commit. The cause was not the loop's 30 fps: the preview's
  angle cache was 4° a bucket, so a spin at 2° a frame changed on screen every
  fourth refresh at 60Hz, held 2, 4 or 6 as the timing fell — 15 pictures a
  second, unevenly. Now the preview draws sprites that turn alike at their
  exact angle, and draws *between* the loop's frames (`core/playback.js`,
  `smooth`): it paints at the screen's own rate. On egypt's heaviest glyph
  (1275 dots) it holds 60 of 60 at sizes 0.05 to 1, with a still trail, with
  the attractor moving and in `face`. Saves are untouched — the loop's `fps`
  and frame count, the quarter-degree cache — so saved objects re-render as
  they did. The stamp cache moved to `apps/ckt/stamps.js`.
- **The gamepad's page fits above the timeline.** Open, and more so with a
  layer's drawer open, it stood over the bottom half of a drawing. Now the
  whole page is drawn scaled into the space left, on the theme's ground with
  its edge marked, easing as the timeline opens and closes
  (`apps/gamepad/sketch/viewFit.js`). A view only: the canvas, the ink, the
  recorder and saves keep their size, so nothing made while fitted differs.
- **An object opens back in its app** (`core/reopen.js`), all of it seen in
  Chrome. The vault detail's *Open in ckt ↗* or *Open in grid ↗* opens
  `/apps/<app>/?open=<id>` in a new tab: a ckt still or brush at its exact
  frame, a loop playing, a dot-set into both stages and this session's list, a
  grid dither with its source loaded and dithered again. An app says which of
  its objects it can take back (`reopens()` in its `rebuild.js`); a family set
  and the gamepad's recordings get no link. A wrong id, or another app's, says
  so in the bar.
- **A picker's Use button sits on the chosen card**, across the foot of its
  picture, and a double click uses it outright. A dot-set's detail shows its
  thumbnail, its render being JSON.
- **The UI pass is in, from the author's brief** (`docs/decisions.md`, *The
  UI pass, from the author's brief*), and every part of it was seen running in
  Chrome:
  - **One theme**, neo-brutalist and light, in `core/theme.css`: cream ground,
    black ink, thick borders, hard shadows, one yellow accent that is only
    ever a fill. grid and ckt are built on it; the gamepad keeps its
    gamepad-first layout and took the look — its four stylesheets converted,
    then fixed by eye wherever the old palette had used colour as text.
  - **The bar is information only** (`core/Bar.js`): output size, density, a
    paper format's dpi, the loop's measured paint rate, the vault, keys. A row
    of the page grid, so it never covers a canvas or a panel. No header.
  - **Panels are drawers** (`core/Drawer.js`), docked into layout columns. A
    param's `group` is its drawer and `format` is core's own, the same in every
    app. The sequence player is a component (`core/Transport.js`). Rows show
    only when they apply (`when`), sliders have typed boxes, and a family's
    sprites are picked from a grid of their images (`type: 'sprite'`).
  - **The page never scrolls.** `.app` holds and clips whatever is positioned
    inside it: `overflow: hidden` on the body does not stop focus scrolling the
    page, and a switch low in a docked panel was throwing the app off-screen.
  - **`link w/h` works** — it did nothing once the format was `custom`. Either
    side drags the other and the shape is held exactly, a slider dragged to
    2 px and back included; a ratio or a paper format stays picked, so A4 at
    2480 px reads 300 dpi. Width and height run 1–4000; a linked side at the
    limit makes the typed one give way. A typed box never shows a value the
    param refused. Seen in grid and ckt.
  - **Reset resets.** `restore()` put values back silently, so no widget
    moved; it now announces each change, with `params.restoring` set so the
    frame chain leaves a recipe as it was saved.
  - **ckt is three columns**: dots left, motion right, the viewer between with
    a dots / motion toggle. Legacy dot-sets in a closed drawer; every dot-set
    made is saved at once into a session folder and listed, one click away,
    ← → stepping through them and then the legacy nine. The attractor starts
    off, the tether at 0, and the letter turns: a loop is one turn at `speed`
    degrees a frame, so a saved loop closes. Trails fade; the pulse has a
    floor instead of flipping.
  - **ckt's performance, audited and measured in the running app** on egypt's
    heaviest glyph (1275 dots, the attractor moving): at size 0.6 the old
    renderer painted 41 frames a second and the new one keeps the loop's full
    30; at size 1, 22 against 30; a 10-frame moving trail, 9 against 13; a
    trail with the attractor off — the default — keeps 30. The canvas is
    reused, marks are pre-rendered at the size and angle they appear, the
    preview is drawn at the size the viewer shows it, and a still trail is
    baked into one stamp.
  - **grid**: `zoom` scales the object inside a fixed canvas; `scale`, 0.25 to
    4, multiplies width and height and now lives in the shared Format drawer.
  - **gamepad**: a still saves on a transparent ground by default; the Canvas
    section's Save Ground row (A) or G switches to white. The recipe says which.
  - **The vault groups**: a `folder:<name>` tag files an object in a folder of
    the vault panel — ckt's session dot-sets, an emitted family's brushes.
    `docs/object-model.md`, *Tags that group*.
- **Two core bugs fixed with it**, both pushed before this pass: a picked
  format preset flipped to `custom` (the frame chain heard its own writes), and
  `snap()` wrote `0.12000000000000001` into recipes.
- **M3 as before**: ckt ported from v2's own source; the link
  `ckt → gamepad: brush family` works both ways; a ckt still replays
  pixel-identical. `apps/ckt/STATUS.md` has the app's list.
- **M2 as before**: grid dithers any vault object per frame; replay is a
  dispatch; one clock plays every loop; video is `frames.zip` plus
  `scripts/frames-to-video.mjs`.

## Tests

Twenty-two files, no runner, no dependencies — the command in `CLAUDE.md`
runs all of them, and all pass. Newest: `gpu-filters` (the catalogue as data:
licence, schema, the WGSL conventions, a chain read, sizes at print scale).
Then `delete` (a vault with every kind of
edge: the refusals, the dry plan, cutting loose, the chain; 37 checks).
Before it: `compose-page` (where a placement lands —
moved, scaled, turned about its centre, the bleed moving nothing; picking one
up, the top one where two overlap, a turned one where it stands; an object's
ink; placed whole; a page with no zoom and an A4 box that agrees with its
chip; a placement as the object model's block and back), `compose-time` (a
loop's ticks on a page at its own rate, twice it, half, a rate that does not
divide; wrapping and holding; a picture that holds) and `compose-placements`
(the list with stand-in objects opened in any order: the page's length, a
still at every tick, the stack, the newest load winning, an entry taken off
before it opened never coming back, a handle nobody holds disposed). And the browser
check above, outside the loop because it needs Chrome and a vault with
things in it. Earlier this session: `uses` (the defaults, the
switches, `use:none`, unknown uses kept) and `grid-material` (tone on a
ground, a tile in its cell, the tray, the legacy envelopes); `vault` covers the
tag edit and its refusals, `registry` a member's own file type; `easing` (every
curve lands at 0 and 1, out is in reversed, which ones overshoot) and
`grid-growth` (ages across a loop's wrap, from a start, the look-back stopping). New checks this pass: `params` (the `sprite` and
`ground` types, `when`; a reset announces what it moves), `frame` (zoom is
the object, never the canvas; the format drawer carries `scale`; the link on a
real Params — custom, a slider's round trip, shapes that stay picked, the
4000 limit, a restore left as saved), `ckt-motion` (a loop is one turn in
either direction; `off`; laps; the pulse floor; a still's crop). Run against
the old `frame.js`, 15 of the link checks fail.

The earlier browser checks — the UI pass, ckt's paint rate against the last
commit from a temporary worktree — were driven from scratchpad scripts, now
gone; `scripts/chrome.mjs` is the driver to write the next ones on.
`playback` gained smooth mode's checks.

## Broken / half-done

- **The GPU catalogue is four filters, none ported yet.** p5.FIP's, glfx's
  and GPUImage's come next, each with its copyright line. A blur's taps stop
  at 512 a side; past that it wants a smaller picture first.
- **Two kinds still print stretched from their pixels**: a gamepad still and a
  shape, and the export names them. The gamepad's is fixable (*Next*); a
  shape is a leaf, pixels by definition. `at` and `length` ride in every
  placement and nothing honours them yet: everything starts on the page's
  first frame. A print export draws its page on one canvas, tried up to
  2480 × 3508; the largest sheets at scale 4 are past a browser's canvas cap.
- **grid's own player opens its source exact** — one source handle serves
  both its preview and its saves, so it cannot ask for a draft the way
  compose does. Read from the code, not seen: a dither of a grid loop that
  has growth in it would meet the same look-back while it plays.
- **Moving trails are the one slow case left**: a pass over every dot per
  trail sample, 13 painted frames a second for 1275 dots and a 10-frame trail
  — the same before and after this pass.
  Inherent to drawing them exactly; a faster preview would be an approximation
  (an accumulation buffer), which was tried on paper and rejected for ghosting.
- **ckt's `speed` is degrees a frame**, so a loop saved at 60 fps turns twice
  as fast as at 30 unless `speed` is halved. The preview is smooth at any
  `fps` now; which rate saves should default to is the author's call.
- **The gamepad cannot reopen its recordings**: they replay in core, but
  nothing loads one back into its timeline to go on drawing.
- **ckt's width and height are two things**: the output canvas, and the world
  the glyph is centred in and the attractor's paths are measured against. So
  with `ink` picked the rows show the world, not the ink, as grid's do.
  Separating the two is the fix; it changes what an old recipe means.
- A recipe wider or taller than 4000 px would open clamped; none of the seven
  sized recipes in the vault is.
- **An identical re-cut does not join the new session folder**: the vault
  de-duplicates same bytes and same recipe, and returns the old object with
  its old tags. Correct by the object model; surprising in the vault panel.
- **Five sprite names mean two pictures** — `sprite(50)`, `(61)`–`(64)` in
  `brushes` against v2's `sprites/`, and v2 has 16 more. A cleanup must not
  renumber `brushes`: recordings store sprites by index.
- **The gamepad's params are still not on `core/params.js`**, so its panels
  are its own; it has the theme, not the drawers.
- **grid still stutters now and then while a loop plays** — the author's
  reading, 2026-09-24, after the grow-in work made it "so much smoother": not
  the growth, grid itself. The lead: its Playhead drops ticks when a frame's
  render runs over its share, so an uneven render is an uneven loop, and grid
  has no paint-rate readout to say so — ckt's bar has one (`bar.rate`).
  Measure first, as ckt was measured.
- **A server started before a change to `server.js` keeps its old API** — it
  serves the new pages from disk but answers with old code. That is what hid
  the author's two materials on 2026-09-24 (no `role` on its rows) and what
  would make the vault switches fail (no PATCH). Restart it after pulling.
- **`core/VaultPanel.js` is at exactly 400 lines.** The next thing it
  learns needs a split first — the filters, or the drawer. `server.js` was
  split this session (332).
- **Trashed brush sets still show in the gamepad and in ckt**: both register
  vault sets as families that saved recordings may need to replay, so they
  were left alone; only grid's shelves hide the trash. A cut-loose set or page
  keeps its old picture — the render is not redrawn — until it is saved again.
- **`detached` is a new envelope field**, added for cutting loose; the object
  model says not to add fields, so it is written up as decided — the author
  may want to confirm it.
- **The legacy copy is a button, not the script planned** (`scripts/` has no
  canvas for thumbnails). Heavy families copy as they are: fleurs is 18 MB on
  disk, and copying it puts 18 MB more in the vault.
- **Files over the 400-line cap**, all the gamepad's: `ui/hud.css`,
  `sketch/gamepadSketch.js` (572), `ui/TimelinePanel.js` (547),
  `ui/ParamPanel.js`. The fit to the timeline went into its own file, but
  wiring it grew the first two by a few lines each.
- **Nothing can leave the author's machines**: `Vault.publish` is specified,
  not built. The tailnet covers the author's own use (*Parked*).
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files; the gamepad's GALLERY
  panel still shows IndexedDB.

## Next single step

**M5's fifth brick, its first batch: six filters ported from p5.FIP**, each
with its copyright line, and p5.FIP's licence text beside them —
`apps/filter/STATUS.md` has the list.

Parked behind M5, still wanted: **a gamepad still drawn again at print
scale** — the last kind M4 prints stretched. A still's recipe carries
`marks`, the same shape as a recording's events, its `canvas`, and
`frame.from`, its crop. In `core/rebuild.js`,
replay them through the stage at `renderScale` with every mark shown and the
crop applied, return that as the still's handle when `openFrames` is asked
for a scale above 1, and add it to `scripts/check-compose-export.mjs`: the
gamepad still's row there should then say *drawn again*. Alongside: the
gamepad onto core params, and off p5 with it.

## Parked decisions

- **Objects are deleted in two steps** (the author, 2026-09-26): the trash,
  then deleting from it; objects made from what goes are deleted with it or
  cut loose, never left broken. `docs/decisions.md`.
- **compose's first brick settled four things** (2026-09-24,
  `docs/roadmap.md`): a page and a placement are two schemas, and a
  placement's panel edits one entry of `place[]`; a transform is page pixels
  from the page's centre, turning clockwise about the object's; an object's
  size on a page is its ink; frame N of anything is core's `openFrames()`.
  The second, two more: a page has its own `fps` and a loop keeps its own
  speed, sharing seconds, not ticks; a preview asks for `draft` frames. The
  third: a placement is picked up by its box, not its ink. The fifth: an
  object's size is its render's at any scale, and an app says which of its
  stills it can draw again (`redraws()`).
- **An export of a page writes a PNG and a frames zip** (the author,
  2026-09-24). No PDF for now; sketch-2-print's paged.js stays where it is.
- **Next: filters (M5), particles (M6), fractals (M7); 3D parked** (the
  author, 2026-09-26). The suite is to make a small game's assets — 2D first,
  fake 3D where it helps, real 3D later. The plan is in `docs/roadmap.md`.
- **The GPU kit is WebGPU** (the author, 2026-09-26), nothing cut for a
  machine without it: there the apps open and GPU objects show as their
  renders. A GPU render replays within a small difference on another machine
  — the author, 2026-09-26 (`docs/object-model.md`, *The recipe contract*).
- **Rule 8 settled** (2026-09-26): p5 is not required, and new work does not
  take it on; the gamepad and core's replay of its recordings keep p5 1.5.0
  until they are ported. **Rule 5 covers shaders**: each carries its source and
  licence; LYGIA and unlicensed Shadertoy code are noncommercial and stay out.
- **Time on a page of many things** (the author, 2026-09-24,
  `docs/object-model.md`): a still with no length is there for the whole
  page, a loop with no length plays again until the page ends, and the page
  lasts as long as its longest loop. A hand-set page length, for a post that
  must be exactly ten seconds, can be a row in the player later.
- **Where a set is offered is tags, declared per consumer** (2026-09-24):
  `use:<id>`, switched in the vault, with `core/uses.js` as the catalogue —
  the consuming half of what a link is on the producing side. Tags are the one
  mutable part of an object; everything else still makes a new object.
- **A material is a set with `role: 'material'`**, light to dark, cap twelve.
- Name is **skweeb**, `.skw` for the smart object.
- **The UI pass's decisions** — theme, bar, drawers, ckt's columns and
  sessions, the rotation loop, grid's zoom and scale, transparent stills — are
  in `docs/decisions.md`. The longer review, for the author's notes:
  https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d
- **M4 is a fourth app, `apps/compose/`, and the master rendering environment.**
- **Video is frames plus ffmpeg.** No browser muxer, ever.
- **A placement pins with `version`, and `at` is time.** `docs/object-model.md`.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference;
  `render()` stays pure so sandboxing is a worker and not a redesign.
- **Panels live in `core/`** when more than one app needs them — now drawers,
  the bar and the player too.
- Resolution is export-only: live at the size the viewer shows, full size once
  at export. ckt's preview does exactly this now.
- 3D is real and it is M5.
- `sketch-2-print` keeps its own gamepad, frozen.
- **CKT v3 keeps the dots and drops Matter**; v2's dots were overdamped, so
  the closed form is the motion.
- **A port reads the original's source, never the roadmap's summary of it.**
- Local disk vault plus a published gallery; the online skweeboteque later.
- **The vault is shared over the author's tailnet**: one machine serves it,
  work and home open it by link, and the `?open=` link is M4's "URL you can
  send" for those machines. `server.js` stays on 127.0.0.1 behind
  `tailscale serve`, or takes `--host` its tailnet address — never `0.0.0.0`.
  `docs/decisions.md`.
- **Destra is free**, from fonderiz.fr, by a friend of the author's. It ships
  once the licence is named in the files; `docs/fonts.md`.
