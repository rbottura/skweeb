# STATUS — skweeb
_last touched: 2026-09-30_

Where the suite stands, by area. Each app's own `STATUS.md` has its detail;
`docs/roadmap.md` has the milestones, `docs/decisions.md` why things are as
they are. Rewritten on 2026-09-27 from a 500-line log of sessions: what
it said is here, shorter, or in the files it points to. Ideas the author
has between bricks wait in `docs/inbox.md` until a session sorts them.

## Works right now

### Newest

- **Escape time moves — M7's third brick done** (2026-09-30;
  `apps/fractals/motion.js`, `tests/fractal-motion.mjs` 34 checks,
  `check-fractals` 42). Each family has its own *moving*: for escape time,
  the ramp once round — a palette cycling — or a Julia `c` round a circle of
  a radius about the `c` chosen. Both close pixel for pixel; a Julia loop
  saves, replays to its render, is drawn again at scale 2 and is placed in
  compose — the first clause of M7's *Done when*. The Motion rows serve both
  families because core's `when` may now be a list, any one of which is
  enough (`docs/core-api.md`).
- **One vault, on the laptop that travels** (the author's setup,
  2026-09-28; `docs/decisions.md`). The laptop goes between the work PC and
  the home tower and serves `~/skweeb-vault` behind `tailscale serve`, a
  user service that starts at boot; the pages on both machines save into
  it over the tailnet. 130 objects in it on 2026-09-30.
- **A save on one machine shows on the others, live** (2026-09-30;
  `server/events.js`, `tests/vault-events.mjs`). The server streams
  `changed` at `/api/vault/events` whenever it rewrites the index — a save,
  a retag, a delete, from any machine; `core/vault.js` listens once a
  server answers and passes it on as `vault:changed`, and the vault panel
  redraws. Before, a panel saw only the saves made in its own tab.
- **Old vaults merge into the one that travels** (2026-09-30;
  `node scripts/vault-merge.mjs <from> [--into ~/skweeb-vault] [--dry]`).
  Ids are minted per machine and never collide, so a merge copies the
  folders the target lacks: never overwriting, `cache/` left behind, each
  renamed into place so a running server never reads half an object. The
  same id differing, a twin under another id, a parent neither vault has:
  reported, not resolved. Run twice, it copies nothing. Restart the server
  after, so it rebuilds its index.
- **Idles from fractal copies** (2026-09-28, the author's find; `check-fractals`,
  29 checks; `tests/fractal-motion.mjs`, 17). A Motion drawer swings one of
  the copies' params over a loop — the tree's twist −10 to +10, there and
  back — and plays it; the loop closes pixel for pixel. Fractals saves now,
  both families: a still or an idle into the vault, the sprite its parent,
  replayed to the pixel and drawn again at scale 2, every frame, a sprite
  sheet, `?open=`, and compose places an idle.
- **A sprite copying itself** (2026-09-28, the author's ask; `check-fractals`,
  17 checks; `tests/fractal-copies.mjs`, 19). Fractals has a second family:
  a vault sprite copied by a few maps, generations deep — a Sierpiński
  triangle, a carpet, a Vicsek cross, a tree, a spiral — every copy placed
  by the maps, none at random, drawn again at print scale from the sprite's
  pixels. And sliders over many orders run on the logarithm now
  (`log: true`, `core/widgets.js`): the zoom is usable. `core/sprites.js`
  moved from particles; `core/uses.js` offers sets as fractal copies.
- **M7 has begun: the Mandelbrot set and its Julia sets on the GPU**
  (2026-09-27; `apps/fractals/`, `tests/fractal.mjs` 23 checks,
  `check-fractals` 9). One WGSL pass through the GPU kit, carried in a chain
  entry of its own (`core/gpu/runner.js` now takes `{ filter, params }`);
  smooth colouring round a ramp; drag pans, the wheel zooms about the
  pointer; a PNG at print scale drawn again. The GPU agrees with the escape
  count in doubles at all 158 points checked. A range may say
  `step: 'any'` now (`core/params.js`): the centre keeps every digit.
- **A game engine loads a particles sheet** (2026-09-27;
  `node scripts/check-sheet-engine.mjs`, 8 checks). Phaser 3.80, in the
  check's headless Chrome, reads the torch's sheet and JSON as they are:
  60 frames of the crop, the tag one animation of exactly 2000 ms, a sprite
  playing it in real time. M6's *Done when* has no unchecked word left.
  Phaser comes from jsDelivr into that page only — nothing installed.
- **A local swirl, and the guides as one switch** (2026-09-27, the author's
  ask; `check-particles`, 62 checks). The vortex and the attractor take a
  reach — full at the centre, nothing past it, a smooth fade between —
  drawn by the guides as a dashed circle whose handle sets it. The guides
  are a switch over the viewer and G: on, all of it always, the fields'
  centre too before any field is on; not a param, remembered per browser.
- **Pictures from outside come into the vault** (2026-09-27, the author's
  ask; `core/vault-import.js`; `check-particles`, 60 checks). *+ pictures*
  in the vault panel's head, or a drop on it, in every app: each file a
  `shape` when it has see-through pixels, a `still` when not, several at
  once a sprite-family `set` too; origin `import`, a leaf. Particles take
  one sprite as well as a set. `core/reopen.js` asks no app about a leaf
  any more — it was a 404 for every legacy sprite's detail.
- **Particles show what makes them** (2026-09-27, the author's ask;
  `check-particles`, 54 checks). Guides over the preview — the emitter and
  its launch, the whole field as arrows, the fields' centre, the pull —
  never in anything saved; the emitter and the fields' centre dragged by
  their handles, the rows following. G switches them.
- **Particles have depth, and M6's *Done when* is met** (2026-09-27, brick 6;
  `check-particles`, 48 checks; `particles-model`, 68). A z per particle —
  the cone tilted into depth — and a camera: far ones smaller, drawn first.
  A torch loop with a set's sprites and a one-shot burst both leave as
  sprite sheets, the burst tagged as played once. `check-compose` no longer
  lets a loop shorter than 2.5 s wrap before it asks whether it moved —
  a saved particles loop, 2 s long, had shown it.
- **Particles leave from a line, a disc or a ring, and swirl** (2026-09-27,
  M6 brick 5; `check-particles`, 45 checks; `tests/noise.mjs`). A burst
  from a ring aimed outward blooms; a vortex, an attractor and curl noise
  in a *Fields* drawer, each particle integrated from its own birth, so a
  loop through them still closes pixel for pixel. `core/noise.js`: seeded
  noise on the GPU kit's hash, bit for bit, with its exact slope.
- **A loop leaves as a sprite sheet** (2026-09-27; `core/spritesheet.js`,
  `tests/spritesheet.mjs`, 26 checks; `check-particles`, 41). Every frame
  on one PNG, cropped to the box the loop reaches, and Aseprite's array
  JSON beside it — rects, whole-ms durations that sum exactly, one tag —
  in one zip. Particles first; any app's loop can use it.
- **Particles save** (2026-09-27, M6 brick 4; `node scripts/check-particles.mjs`,
  35 checks). S saves the loop as a `sequence`, the sprite set its parent;
  a frame saves as a still; every frame downloads as a zip for
  `frames-to-video`. The vault's replay of a frame is its render to the
  pixel, drawn again at scale 2; `?open=` brings the panels back; compose
  places a saved loop and plays it.
- **Particles draw a vault set's sprites — M6's link** (2026-09-27, brick 3;
  `node scripts/check-particles.mjs`, 21 checks). The Look's `sprites`
  picks a set, each particle one of its members, the same one every frame;
  size and fade over life on easing curves, and a *Turning* drawer — spin,
  a start spread, or facing where it goes. Loops still close pixel for
  pixel. ckt's `stamps.js` and `surface.js` are in core now (ckt booted and
  drew in Chrome after the move); `core/uses.js` has a `particles` row,
  brush families offered by default. The app opens on a torch. And the
  stack turns over: *newest behind*, the author's ask.
- **The particles app opens and plays** (2026-09-27, M6 brick 2;
  `node scripts/check-particles.mjs`, 15 checks). `apps/particles/`: the
  emitter's drawers on the left, the picture on the right, dots between.
  The frame after the last is the first, pixel for pixel; a frame scrubbed
  to is the frame stepped to; a burst starts all at the emitter and ends.
  Opens with no vault. `core/view.js` — how large a preview draws — moved
  there from compose, which now imports it.
- **M6 has begun: a particle is a function of its slot and its age**
  (2026-09-27; `apps/particles/model.js`, `tests/particles-model.mjs`, 36
  checks). Any time asked for in any order gives the same particles; `t`
  and `t + period` are the same picture, so a loop closes exactly; a
  prewarmed stream is full from frame 0; a burst is over when its longest
  life is. Launch cone, gravity, wind and drag in closed form. No page yet —
  seven bricks planned in `apps/particles/STATUS.md`.
- **A flipbook ripples, and has an onion skin** (2026-09-27, the author's
  ask after trying it; `node scripts/check-frames.mjs`, now 16 checks;
  `tests/compose-time.mjs`). A frame held longer in its *Time* drawer
  pushes the frames after it on, cut back pulls them, taken off lets them
  close up; *Next frame…* after a middle frame makes room and sits in the
  stack just over the one it follows. Only a chain touching end to start
  moves. Paused, the frame before shows as a red ghost and the one after as
  a blue one (`apps/compose/onion.js`), a switch in the player drawer —
  preview only.
- **Frames in compose: a flipbook** (2026-09-27, the author's ask;
  `node scripts/check-frames.mjs`, 11 checks). A placement's `at` and
  `length` are honoured at last: its *Time* drawer says from which frame and
  for how many, 0 its own. *Next frame…*, under *On the page*, puts the
  object picked where the chosen one is, with its look, from where it ends
  and for as long, and shows it; the list says which frame each is. Three
  stills made a loop of three at 8 fps, stepped with `,` and `.`, saved,
  replayed by the vault. A press on the page picks up only what shows at
  that frame, not the frame stacked over it.
- **Kin sit together in the vault** (2026-09-27, the author's ask;
  `node scripts/check-vault.mjs`, 10 checks; `tests/vault-kin.mjs`). Loose
  objects made from one another share a small dashed container, the most
  original first, an arrow between each, where the newest of them would sit;
  joined through the whole vault, so two loops from one dot-set in a session
  folder sit together and name it — a click opens it. Folders keep their
  own. The head's `lineage` switch lays them out one by one, and the panel
  remembers it. A folder no longer reads as an object: shorter, its members
  a small tilted peek, on a little stack.
- **The filter catalogue is twenty-nine** (2026-09-27), the author's four
  favourites last: gradient map, motion blur, zoom blur (glfx.js's, MIT),
  ordered dither. Brightness, contrast, blur, pixelate, grain, gradient map
  and ordered dither written here; eighteen from p5.FIP, under MIT, its
  whole licence beside them — saturation, invert, sepia, duotone,
  threshold, posterize, sharpen, unsharp mask, emboss, edges, dilate, erode,
  halftone, dots, CRT, vignette, glitch — each changed where p5.FIP would
  have hurt a sprite or broken a loop; and, for game assets, the suite's own
  outline, drop shadow and palette lock. Grain and glitch draw at random
  from the recipe's seed and the loop's frame (rule 2). Each is held to what
  it should do on the GPU (`check-gpu`, `check-filters`) and to its notice
  (`tests/gpu-filters`).
- **A colour picker stays open while you drag in it** — every app's: the
  panel synced each change back into the widget, and a `color[]` row was
  rebuilt under the hand (found by the author, 2026-09-26).

### M5 — filter, and the GPU kit under it (`apps/filter/STATUS.md`)

- **The GPU kit** (`core/gpu/`, WebGPU, 2026-09-26; `check-gpu`, 18
  checks). One device for the page; a chain of filters run in one call,
  handed back as an ImageBitmap that Canvas 2D draws at once, as `frame(i)`
  needs; premultiplied alpha throughout, rgba16float between passes; sizes
  in the source's pixels, times the print scale. A chain of three on
  1024 × 1024 takes 1.7 ms, read back. A filter is data with its source and
  licence (rule 5); a broken shader names its own line; a page with no
  WebGPU gets null and a reason.
- **WebGPU on every machine the author uses**: the serving PC's Radeon, and
  the smallest PC's Intel gen-9 once Chrome's flags are on
  (`chrome://flags/#enable-unsafe-webgpu`, and Vulkan) — textures to 16384,
  a software fallback adapter besides (webgpureport.org, 2026-09-26).
- **filter opens and filters live** (`check-filter`, 19 checks). Any vault
  still, shape, loop or moving composition — or a file dropped, with no
  vault — through a chain of GPU filters, each a card drawn from its own
  schema by core's ParamPanel, switched off, moved, taken out. A loop plays
  through the chain at 61 paints a second here; with no WebGPU the page
  opens, says why and shows the source as it is.
- **It saves, and what it saves replays** (`check-filter-save`, 17 checks).
  A still or a loop, its recipe `{ source, chain }` and its source its
  parent; `apps/filter/rebuild.js` replays it for the vault, compose and
  filter itself, and draws it again at print scale; `?open=` brings the
  chain back. With no WebGPU a filter object shows as its render (core's
  `openPicture`).
- **M5's link: a look** (`filter → compose: a look`; `check-look`, 12
  checks). A chain saved alone in filter is a look, a `params` object;
  compose puts it over a placement, sized by what it grows, and the page
  saves it in its block and among its parents and replays it. Filters reach
  past the edge: filter's `edges`, grow or keep. Both clauses of M5's *Done
  when* are met; M5 stays open for its catalogue and the motion group.

### M4 — compose (`apps/compose/STATUS.md`, done 2026-09-24)

- **Objects from every app on one page**, in three columns: `placed` on the
  left — the list, top first, and the chosen one's object, look, transform
  and time — the page between, `page` on the right: core's Format drawer, A4
  at 150 dpi to start, bleed with a trim line, a transparent ground, `scale`
  for the export's pixels. Any still, loop or shape, added with the picker or
  by `?place=<id>`, placed whole; ordered with ↑ ↓ or `[ ]`, removed with
  Del; chosen by a row or a press on the page, dragged, nudged, outlined.
  `x`, `y` from the page's centre in page pixels, `scale`, `rot` clockwise
  about its centre (`docs/object-model.md`, *Placement*). An object's size on
  a page is its ink: a gamepad loop is the 1812 × 811 its marks reach.
- **The page plays** at its own `fps`, 60 by default, each loop at its own
  speed in real time (`time.js`): a gamepad loop 60 paints a second, a ckt
  loop 60, a large grid dither with growth 43 — it was 2, before the page
  asked for a preview's frames, `openFrames(…, { draft: true })`.
- **A composition saves and comes back**: S writes a `composition` — recipe
  `{ page, place }`, every placed object and look a parent, its render drawn
  again from exact frames (`render.js`), never the preview's drafts. The
  vault plays a page that moves, `?open=<id>` puts the page and its list back
  as saved, and a saved page can be placed on another page. The URL to send
  is `?open=`, on the author's tailnet.
- **Print scale**: every placed object is asked for frames at the size it
  will be printed, and the app that made it draws it again (`openFrames(…,
  { scale })`, each app's `redraws()`); a picture no app can draw again stays
  its pixels and the bar names it. *Download the page (PNG)* — A4 at scale 2
  is 2480 × 3508 — and *Download every frame (zip)*, which
  `scripts/frames-to-video.mjs` makes into an MP4. The link,
  `any → compose: place on a sheet`: the vault detail's *Place in compose ↗*.
- **Frame N of anything is `openFrames()`** (`core/rebuild.js`): a sequence,
  or a composition that moves, replayed; a still, a shape or a set as its
  render, one frame long — in compose and in the vault detail's player.

### The vault

- **A trash, and deleting** (2026-09-26). Ctrl- or shift-click selects a
  card or a whole folder; the bar moves them to the trash — a `trash` tag, so
  nothing breaks and it can be undone. The trash is a view of its own:
  restore, or delete for good. When other objects are made from what is
  going, the panel asks once and says what each would lose: delete the chain
  too, or keep them cut loose — a set loses those members, a page those
  placements, and a recipe still naming a deleted object is set aside, the
  object becoming its picture. `server/delete.js`; rules in
  `docs/object-model.md`, *Trash, and deleting*.
- **Folders** (`folder:<name>` tags): a card that opens into a strip across
  the grid and closes again — ckt's session dot-sets, an emitted family's
  brushes, the legacy families.
- **A set says where it is offered** (`core/uses.js`): a vault set's detail
  has a switch per use — *gamepad brush family*, *grid material*, *ckt sprite
  family* — and each app lists only the sets switched on for it. The
  switches are `use:<id>` tags; a set nobody has switched follows its role;
  all off is `use:none`. Adding a consumer is a row in `USES`.
- **Tags are the one editable part of an object** (`docs/object-model.md`,
  *Tags change*): `PATCH /api/vault/<id>` takes `{ add, remove }` and nothing
  else; `Vault.retag()` is its client. A set's index row carries its `role`,
  so pickers filter without opening every set.
- **An object opens back in its app** (`core/reopen.js`): the detail's
  *Open in ckt ↗*, *in grid ↗*, *in filter ↗*, *in compose ↗* open
  `/apps/<app>/?open=<id>` — a ckt still at its exact frame, a loop playing, a
  dot-set into both stages, a grid dither with its source, a page with its
  list. An app says which of its objects it takes back (`reopens()`).
- **A picker's Use button sits on the chosen card**, and a double click uses
  it outright. A dot-set's detail shows its thumbnail, its render being JSON.

### grid (`apps/grid/STATUS.md`)

- **grid makes materials** (`maker.js`): up to twelve sprites from the
  gamepad's families on disk, the vault's sets and loose images, kept light
  to dark by their measured tone on the current ground, saved as a `set`
  with `role: 'material'`; a dither made with one replays pixel-identical.
  Materials can be edited — from grid or from the vault — each save a new
  version, the old one put away in `earlier materials`, offered nowhere, so
  dithers made with it replay as they were.
- **The legacy folder** (`core/legacy.js`): a disk sprite a material uses is
  copied into the vault once, as a `shape` in `folder:legacy <family>`; a
  disk shelf's *Copy all N into the vault* copies a whole family as a set.
  And the original grid sketch's seven materials are in the vault, as
  `<name> (legacy grid)` (`scripts/import-legacy-grid.mjs`).
- **Sprites grow in and out**, each over its own number of frames along one
  easing curve (`core/easing.js`, thirty-one curves), any frame rendering on
  its own; the preview fills once per tile, so a 57,600-cell loop plays at
  22–24 paints a second. **A sprite size** (`tileScale`) draws tiles up to
  ten times their cell.

### ckt (`apps/ckt/STATUS.md`)

- **M3 as before**: ckt ported from v2's own source; the link
  `ckt → gamepad: brush family` works both ways; a ckt still replays
  pixel-identical. It draws with any vault set switched on as ckt sprites.
- **Its rotation no longer stutters**: the preview draws sprites at their
  exact angle and between the loop's frames (`core/playback.js`, `smooth`),
  60 of 60 on egypt's heaviest glyph; saves are untouched.

### gamepad

- **The page fits above the timeline**, scaled into the space left
  (`sketch/viewFit.js`) — a view only: the canvas, the recorder and saves
  keep their size. A still saves on a transparent ground by default; the
  Canvas section's Save Ground row (A) or G switches to white.

### Across the suite

- **The UI pass, from the author's brief** (`docs/decisions.md`): one theme,
  neo-brutalist and light (`core/theme.css`); a bar that is information only
  (`core/Bar.js`), which gives the status line back after a result's three
  seconds; panels as drawers (`core/Drawer.js`) with core's Format drawer the
  same in every app; a page that never scrolls; `link w/h` that holds a shape
  exactly; Reset that resets.
- **M2 as before**: grid dithers any vault object per frame; replay is a
  dispatch; one clock plays every loop; video is `frames.zip` plus
  `scripts/frames-to-video.mjs`.

## Tests

Thirty files, no runner, no dependencies — the loop in `CLAUDE.md` runs
all of them, and all pass (2026-09-30). Newest: `fractal-motion` grew
escape time's idles, and `params` a `when` that is a list; `vault-events` —
a save, a retag and a delete each heard by two listeners at once, standing
for two machines. Before them the fractals' three. Then `compose-time` gained the ripple, and
with `compose-placements` a placement's time — windows, a page's end, a
flipbook of three stills — then `vault-kin` (who is kin, in what order, a cycle that must not
hang), `gpu-filters` (the catalogue as data: licence, schema, the WGSL
conventions, sizes at print scale) and `delete` (every kind of edge: the
refusals, the dry plan, cutting loose, the chain; 37 checks).

Twelve browser checks, each a command in `CLAUDE.md`: its own server on a copy
of the vault, headless Chrome through `scripts/chrome.mjs` — a real mouse
included — and `scripts/check-kit.mjs` under it. Outside the loop because
each needs Chrome and a vault with things in it; each fails when a page
throws or its console is not quiet.

## Broken / half-done

- **A blur's taps stop at 512 a side**; past that it wants a smaller
  picture first.
- **Two kinds still print stretched from their pixels**: a gamepad still and a
  shape, and the export names them. The gamepad's is fixable (*Next*); a
  shape is a leaf, pixels by definition. A print export draws its page on
  one canvas, tried up to 2480 × 3508; the largest sheets at scale 4 are
  past a browser's canvas cap.
- **grid's own player opens its source exact** — one source handle serves
  both its preview and its saves, so it cannot ask for a draft the way
  compose does. Read from the code, not seen: a dither of a grid loop that
  has growth in it would meet the same look-back while it plays.
- **grid still stutters now and then while a loop plays** — the author's
  reading, 2026-09-24: not the growth, grid itself. The lead: its Playhead
  drops ticks when a frame's render runs over its share, and grid has no
  paint-rate readout to say so — ckt's bar has one (`bar.rate`). Measure
  first, as ckt was measured.
- **Moving trails are ckt's one slow case left**: a pass over every dot per
  trail sample, 13 painted frames a second for 1275 dots and a 10-frame
  trail. Inherent to drawing them exactly; an accumulation buffer was tried
  on paper and rejected for ghosting.
- **ckt's `speed` is degrees a frame**, so a loop saved at 60 fps turns twice
  as fast as at 30 unless `speed` is halved. Which rate saves should default
  to is the author's call.
- **ckt's width and height are two things**: the output canvas, and the world
  the glyph is centred in and the attractor's paths are measured against. So
  with `ink` picked the rows show the world, not the ink, as grid's do.
  Separating the two is the fix; it changes what an old recipe means.
- **The gamepad cannot reopen its recordings**: they replay in core, but
  nothing loads one back into its timeline to go on drawing. Its params are
  still not on `core/params.js`, so its panels are its own; it has the theme,
  not the drawers. Its GALLERY panel still shows IndexedDB.
- **Files over the 400-line cap**, all the gamepad's: `ui/hud.css` (721),
  `sketch/gamepadSketch.js` (572), `ui/TimelinePanel.js` (547),
  `ui/ParamPanel.js` (500). `core/VaultPanel.js` is at 399: the next thing it
  learns needs a split first.
- **Trashed brush sets still show in the gamepad and in ckt**: both register
  vault sets as families that saved recordings may need to replay, so they
  were left alone; only grid's shelves hide the trash. A cut-loose set or page
  keeps its old picture — the render is not redrawn — until it is saved again.
- **`detached` is a new envelope field**, added for cutting loose; the object
  model says not to add fields, so it is written up as decided — the author
  may want to confirm it.
- **An identical re-cut does not join the new session folder**: the vault
  de-duplicates same bytes and same recipe, and returns the old object with
  its old tags. Correct by the object model; surprising in the vault panel.
- **Five sprite names mean two pictures** — `sprite(50)`, `(61)`–`(64)` in
  `brushes` against v2's `sprites/`, and v2 has 16 more. A cleanup must not
  renumber `brushes`: recordings store sprites by index.
- **A server started before a change to `server.js` keeps its old API** — it
  serves the new pages from disk but answers with old code. Restart it after
  pulling — on the laptop that serves the vault,
  `systemctl --user restart skweeb-vault`.
- **The legacy copy is a button, not the script planned** (`scripts/` has no
  canvas for thumbnails). Heavy families copy as they are: fleurs is 18 MB on
  disk, and copying it puts 18 MB more in the vault.
- A recipe wider or taller than 4000 px would open clamped; none of the seven
  sized recipes in the vault is.
- **Nothing can leave the author's machines**: `Vault.publish` is specified,
  not built. The tailnet covers the author's own use (*Parked*).
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files.

## Next single step

**Particles: an emitter taken from a vault object — its first step, the
model** (the author's idea, 2026-09-30, sorted from `docs/inbox.md`;
`apps/particles/STATUS.md`). `model.js`'s `spotOf` takes the points an
emitter is given — offsets from its centre, px at scale 1, passed in beside
the recipe and never in it, since the recipe names the object — and its
first spot draw picks one, `floor(a × n)`, the second left for a jitter
round it: no slot draws anything new, so every saved recipe redraws as it
did. Held in `tests/particles-model.mjs`: every birth on a point; a loop
through them still closes, `t + period` the picture at `t`; a recipe with
no points unchanged. Then the app: ckt's `datasets.js` into core, a
dot-set or a shape picked in Emission — the author to say whether a
dot-set is one glyph at a time or a word — the object a parent of the
save, `rebuild.js` loading it first, the guides drawing the points.

After it, **M7's field** (`apps/fractals/STATUS.md`), which takes a second
object into particles the same way, and M7's *Done when* is met. Left of M6
besides: colour over life. The gamepad's *newest behind* stays parked.

Parked with M5's catalogue (the author, 2026-09-27): **the motion group** —
a still becomes a loop, `frames` and `fps` for a still source and *bob*
first; `apps/filter/STATUS.md` has it.

Parked behind M5, still wanted: **a gamepad still drawn again at print
scale** — the last kind M4 prints stretched. A still's recipe carries
`marks`, the same shape as a recording's events, its `canvas`, and
`frame.from`, its crop. In `core/rebuild.js`, replay them through the stage
at `renderScale` with every mark shown and the crop applied, return that as
the still's handle when `openFrames` is asked for a scale above 1, and add it
to `scripts/check-compose-export.mjs`: the gamepad still's row there should
then say *drawn again*. Alongside: the gamepad onto core params, and off p5
with it.

## Parked decisions

- **Newest behind, in the gamepad too** (the author's idea, 2026-09-27,
  not started): the gamepad paints each mark once into a buffer that keeps
  the earlier ones, so it cannot reorder — there it is the composite
  operation, `destination-over`, set inside `_drawEvent`'s push/pop in
  `core/stage/player.js` from a clip override, and the same on the live
  drawing layer as you draw. The buffer is transparent until the stage
  puts it over the ground, so behind is behind the marks, not the paper.
- **A flipbook ripples; M6 next** (the author, 2026-09-27): an end moved
  moves what started at it, down the chain, with no switch; the onion skin
  is preview only. Particles before the rest of M5's catalogue.
  `docs/decisions.md`.
- **A flipbook is placements in time, not a new kind** (2026-09-27): stills
  placed one after another with `at` and `length`, saved as a composition.
  No field was added. `docs/decisions.md`.
- **Objects are deleted in two steps** (the author, 2026-09-26): the trash,
  then deleting from it; objects made from what goes are deleted with it or
  cut loose, never left broken. `docs/decisions.md`.
- **Next: filters (M5), particles (M6), fractals (M7); 3D parked** (the
  author, 2026-09-26). The suite is to make a small game's assets — 2D first,
  fake 3D where it helps, real 3D later. The plan is in `docs/roadmap.md`.
- **The GPU kit is WebGPU** (the author, 2026-09-26), nothing cut for a
  machine without it: there the apps open and GPU objects show as their
  renders. A GPU render replays within a small difference on another machine
  (`docs/object-model.md`, *The recipe contract*).
- **Rule 8 settled** (2026-09-26): p5 is not required, and new work does not
  take it on; the gamepad and core's replay of its recordings keep p5 1.5.0
  until they are ported. **Rule 5 covers shaders**: each carries its source and
  licence; LYGIA and unlicensed Shadertoy code are noncommercial and stay out.
- **compose settled, brick by brick** (2026-09-24, `docs/roadmap.md`): a page
  and a placement are two schemas; a transform is page pixels from the page's
  centre, turning clockwise about the object's; an object's size on a page is
  its ink; frame N of anything is `openFrames()`; a page has its own `fps` and
  a loop keeps its own speed; a preview asks for `draft` frames; a placement
  is picked up by its box, not its ink; an app says which of its stills it
  can draw again (`redraws()`).
- **Time on a page of many things** (the author, 2026-09-24,
  `docs/object-model.md`): a still with no length is there for the rest of
  the page, a loop with no length plays again until the page ends, and the
  page lasts until the last placement ends. A hand-set page length, for a
  post that must be exactly ten seconds, can be a row in the player later.
- **An export of a page writes a PNG and a frames zip** (the author,
  2026-09-24). No PDF for now; sketch-2-print's paged.js stays where it is.
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
- `sketch-2-print` keeps its own gamepad, frozen.
- **CKT v3 keeps the dots and drops Matter**; v2's dots were overdamped, so
  the closed form is the motion.
- **A port reads the original's source, never the roadmap's summary of it.**
- Local disk vault plus a published gallery; the online skweeboteque later.
- **The vault is shared over the author's tailnet**: one machine serves it —
  the laptop, which travels between work and home (2026-09-28) — the others
  open it by link, and the `?open=` link is M4's "URL you can
  send" for those machines. `server.js` stays on 127.0.0.1 behind
  `tailscale serve`, or takes `--host` its tailnet address — never `0.0.0.0`.
  `docs/decisions.md`.
- **Destra is free**, from fonderiz.fr, by a friend of the author's. It ships
  once the licence is named in the files; `docs/fonts.md`.
