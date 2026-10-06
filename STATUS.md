# STATUS — skweeb
_last touched: 2026-10-06_

Where the suite stands, by area. Each app's own `STATUS.md` has its detail;
`docs/roadmap.md` has the milestones, `docs/decisions.md` why things are as
they are. Rewritten on 2026-10-02, when it had grown to 557 lines: what each
day added is in its app's file, and here only what works. Ideas the author
has between bricks wait in `docs/inbox.md` until a session sorts them.

## Works right now

### Newest — 2026-10-06 and -07

- **M11 begun: the live stack and smart objects** (the author's, after a
  week of making things with the suite: "we really need the smart objects
  and a new 'layer' system"; `docs/roadmap.md`, M11). The author's calls:
  every app its own window, the windows one stack each draws round its own
  layer; opacity and blend on every placement; live within one browser.
  - **Brick 0, the spec**: `docs/smart-objects.md` — the `skw` moved out of
    the object model, the live stack written in, a placement's `opacity`,
    `blend` and runtime-only `live`.
  - **Brick 1, windows that know each other** (`core/live.js`,
    `core/StackPanel.js`; `tests/live.mjs` 14, `check-live` 9): every
    app joins one BroadcastChannel with what is on screen — the envelope its
    print draws — and lists the windows open in its Stack drawer, itself
    first, each with what it has or why it has nothing; a change heard in
    another tab within a second; a tab closed leaves every list, a crashed
    one after three missed calls. The gamepad joins with no drawer of its
    own. `chrome.mjs` opens more tabs than one.
  - **Brick 2, the stack** (`core/stack.js`, `core/blend.js`; `tests/stack.mjs`
    18, `check-live` 14): one live composition the windows share — a layer
    from a window or the vault put on, moved up or down, taken off, its
    opacity and blend (CSS's seventeen, `plus-lighter` as add) and place set
    in the drawer's rows, from any window; the newest change wins in every
    window, two crossed changes end on one stack; a window opening late is
    handed it; a closed window's layer leaves it. Putting a layer on from a
    window not yet stacked puts that window over it — a look tried over what
    it will join.
  - **Brick 3, drawn round every canvas** (`core/stackView.js`,
    `core/place.js`; `tests/place.mjs` 12, `check-live` 17): a window in
    the stack draws, in its own frame, the layers under it on a canvas behind
    its own and each over it on one in front, its own canvas given its
    opacity and blend by CSS — the browser composites them as a save does.
    A playing app's layer goes as its loop (`loopOf`), shown everywhere at
    the wall clock's frame. Filter's loop at 0.4 and multiply under
    particles' plume, seen from both windows; taken off the stack, a window
    has its page back as it was. compose's placement math is core's now.
  - **Brick 4, Send to ▸** (2026-10-07; `core/send.js`,
    `apps/filter/following.js`; `tests/live.mjs` 32, `check-send` 8): in
    any app's Stack drawer, *Send to ▸ filter* — the filter window open
    asked to take this one, or one opened beside it — and filter's source is
    that window, live, redrawn a moment after each change there, its
    envelope carried whole in filter's own layer. Saved, filter asks the
    window it follows to save itself first — its own save, title, lineage;
    the vault's id the answer (`savedBy`) — names what it kept as its source
    and parent, and follows it again. A window asks another for what it
    answers to: `live.ask`, `live.answer`.
  - **Brick 5, smart objects** (2026-10-07; `core/smart.js`,
    `server/versions.js`; `tests/vault.mjs` now with versions, `smart` 7,
    `check-smart` 10): a `skw` — `skw_…`, its recipe the bound form, the
    app, the kind, its recipe and seed — saved by its app through its own
    save, the window bound (`Vault.bind`): a window filter follows, saved
    for filter; one reopened in its app. Saved again, a version: what it
    was kept in `versions/`, `vault:updated` on every page; filter's
    source, compose's placements and the stack's layers that are it or hold
    it are drawn again. `refs` fill in for what places one.
- **M10 is 3D, and four of its six bricks work** (`apps/3d/STATUS.md`, its
  detail; `check-3d` 58, seven unit files): primitives from a catalogue,
  each a card; an orbit view; three r186 on core's GPU device, WebGL2 where
  there is none; a `model` keeps values, never a vertex — saved, replayed,
  drawn again at scale 2, placed. A click picks a shape, three's handles
  move, turn and stretch it; a stack of modifiers per shape; a style — toon
  bands, an outline, shadows. Core's cards (`core/Cards.js`) came out of
  filter for it: `choose`, `fold`, `duplicate`, `inner`.
- **A print at a sheet's size and a dpi, in every app** (the author's asks,
  2026-10-06: 120 × 176 cm at 300 dpi, "just one export" — then "to all our
  suite apps"): 14173 × 20787 px in 77 tiles of 2048, written band by band
  into a PNG with its dpi (core/png.js). First the 3D app — 12 s, 3–5 MB,
  round shapes given the segments the sheet needs (`check-3d-poster` 8) —
  then core's `print.js` and `PrintPanel.js` in every Export drawer: each
  handle draws a `window` of its frame, so nothing holds the sheet. Rig,
  particles, map, grid, ckt and fractals' copies through their own drawing
  code on a moved context (`core/windowed.js`); escape time by the plane's
  window; filter and looks by `core/gpu/window.js`, the GPU prelude knowing
  where a run lies; compose by each placement's part. A gamepad still is
  drawn again from its marks (`core/stage/still.js`, the rig's stamps now
  core's), and the gamepad prints its canvas: E. `check-print` (16) holds
  every app's print to its object drawn whole, a seam measured apart; map
  and compose print in their own checks (`docs/core-export.md`).
- **`frames-to-video` reads a zip past 2 GiB** — a frame at a time; the
  author's 2.65 GiB loop could not be read whole (`ERR_FS_FILE_TOO_LARGE`).
  Past 4 GiB a zip cannot hold the frames, and the export says so.
- **core/noise.js `noise3`**: gradient noise in 3D on the suite's hash, JS
  only, for a displaced shape.
- **`check-map` measures its replay** now, as the note under *Tests* says a
  check must: caught in the act at worst 121, 0.03% off, it passes.
- **The docs under the cap**: `docs/decisions.md` split — its first three
  days are `docs/decisions-2026-09-21-to-23.md`, listed at its head — and
  the roadmap's finished milestones cut to what proved them.

### M9 — the rig (`apps/rig/STATUS.md`, five bricks of six, 2026-10-02)

- **A drawing made of marks, rigged at its marks**: a gamepad still's
  strokes as its bones — found where the brush jumped, jointed at corners —
  each stamp riding its stroke's bones like a scale; handles bend joints.
  Poses saved as stills, swings and walks by part as loops that close,
  worms crawling round a path; replayed to the pixel, drawn again from the
  marks at any scale, placed in compose. The vault offers *Rig this ↗*.
  Brick 6, the slug from every side, waits on the author's drawings.

### M8 — the map editor (`apps/map/STATUS.md`, three bricks of six; the player)

- **A map on a grid of large tiles** (2026-09-30): a tileset — any set,
  offered as a *map tileset* (`core/uses.js`) — painted into cells with no
  gaps; things from the vault on cells, feet at the bottom middle, back to
  front by row, dragged, their loops playing by the map's clock. A new type,
  `map`, saves, replays to the pixel, draws again at scale 2, reopens, and
  compose places and plays it: `any → map: a thing in the room`.
- **Walls, and things that answer** (2026-10-02): a wall a flag a cell; a
  sign, a warp to a map by its name, the spawn, RPG Maker's way. **The
  player** (`play/`): a saved map, point and click — what answers outlined,
  a sign shown, a warp followed and back.

### M7 — fractals (`apps/fractals/STATUS.md`, done 2026-09-30)

- Escape time on the GPU — Mandelbrot and Julia sets, dragged and wheeled,
  agreeing with doubles at every point checked — and a sprite copying
  itself, generations deep (Sierpiński, carpet, Vicsek, tree, spiral).
  Both save stills and idles that close pixel for pixel, replay, draw again
  at scale 2 and are placed in compose. Escape time's slope, in doubles, is
  a field for particles: `fractal → particles: a field`.

### M6 — particles (`apps/particles/STATUS.md`, done 2026-09-27)

- A particle is a function of its slot and its age, so a loop closes pixel
  for pixel and any frame stands alone. Emitters — a point, a line, a disc,
  a ring, or a vault object's points (`ckt → particles: an emitter`) —
  forces in closed form, a vortex, an attractor, curl noise, a field from a
  fractal; depth with a camera; a set's sprites, sized, faded and turned on
  easing curves (`set → particles: sprites`). Guides show what makes them.
  Saved, replayed, placed; a loop leaves as a sprite sheet with Aseprite's
  JSON, and Phaser 3 plays it (`check-sheet-engine`).

### M5 — filter, and the GPU kit under it (`apps/filter/STATUS.md`)

- **The GPU kit** (`core/gpu/`, WebGPU): one device a page, a chain of
  filters in one call, handed back as an ImageBitmap for `frame(i)`;
  premultiplied alpha, rgba16float between passes; a chain of three on
  1024 × 1024 in 1.7 ms. A filter is data with its source and licence
  (rule 5); a page with no WebGPU gets null and a reason. WebGPU on every
  machine the author uses — the laptop's Intel once Chrome's flags are on.
- **filter** filters any vault still, loop or page live, a chain of cards
  drawn from their schemas; saves stills and loops that replay and draw
  again at print scale. Twenty-nine filters, eighteen from p5.FIP under
  MIT, the suite's own for game assets — outline, drop shadow, palette lock.
- **A look** (`filter → compose: a look`): a chain saved alone, put over a
  placement in compose, saved in the page's block and among its parents.

### M4 — compose (`apps/compose/STATUS.md`, done 2026-09-24)

- Objects from every app on one page, placed, ordered, chosen, dragged; a
  page with its own `fps`, each loop at its own speed; a `composition`
  saved, reopened, placed on another page. Print scale: every object asked
  for frames at its printed size, drawn again by its app (`redraws()`); a
  PNG and a frames zip. `any → compose: place on a sheet`: the vault's
  *Place in compose ↗*. Frame N of anything is `openFrames()`.
- **A flipbook** (2026-09-27): placements in time with `at` and `length`;
  *Next frame…*; a held frame ripples what follows; an onion skin, paused.

### The vault

- **One vault, on the laptop that travels** (the author's setup,
  2026-09-28): it serves `~/skweeb-vault` behind `tailscale serve`; the
  pages on the work PC and the home tower save into it over the tailnet,
  and a save shows on every open panel as it happens (`server/events.js`).
  Old vaults merge in with `scripts/vault-merge.mjs`, copying, never
  overwriting. 135 objects in it on 2026-10-02.
- **A trash, and deleting** (2026-09-26): the trash is a tag; deleting for
  good asks what is made from what goes — delete the chain too, or cut it
  loose (`server/delete.js`).
- **Folders** (`folder:<name>`), **kin together** — objects made from one
  another share a small container, the most original first, or one by one
  with the `lineage` switch — and **pictures from outside**: *+ pictures*,
  or a drop, a `shape` or a `still`, several a set too.
- **A set says where it is offered** (`core/uses.js`, `use:<id>` tags,
  switched in the detail): gamepad brushes, grid materials, ckt sprites,
  particles, fractal copies, map tilesets. Tags are the one editable part.
- **An object opens back in its app** (`core/reopen.js`): *Open in … ↗*,
  `/apps/<app>/?open=<id>`, each app saying what it takes back; *Place in
  compose ↗* and *Rig this ↗* beside it.

### grid (`apps/grid/STATUS.md`)

- grid dithers any vault object per frame; makes materials — up to twelve
  sprites from the disk's families, the vault's sets and loose images,
  light to dark — saved as a set, each edit a new version, the old put
  away; the original sketch's seven materials are in the vault. Sprites
  grow in and out along an easing curve; a 57,600-cell loop plays at 22–24.

### ckt (`apps/ckt/STATUS.md`)

- ckt ported from v2's own source; `ckt → gamepad: brush family` works both
  ways; a ckt still replays pixel-identical; it draws with any set switched
  on as ckt sprites; its rotation drawn at the exact angle, between frames.

### gamepad

- The page fits above the timeline, scaled — a view only. A still saves on
  a transparent ground by default; G, or the Save Ground row, makes it
  white. Its stills keep their marks: the rig draws them again, and core
  does past their own size (`core/stage/still.js`) — within 0.001 of 255 of
  their renders on one rasterizer. E prints the drawing on the canvas, what
  S would save, at a sheet's size (`ui/PrintBox.js`).

### Across the suite

- **The UI pass, from the author's brief** (`docs/decisions.md`): one theme,
  neo-brutalist and light; a bar that is information only; drawers; core's
  Format drawer everywhere; a page that never scrolls.
- **A check that throws takes its Chrome with it** (`scripts/check-kit.mjs`),
  and `CHROME_FLAGS` lets the laptop's Intel run a GPU check's GPU half.
- Replay is a dispatch by `origin.app`; one clock plays every loop; video is
  `frames.zip` plus `scripts/frames-to-video.mjs`.

## Tests

Fifty-one files, no runner, no dependencies — the loop in `CLAUDE.md` runs
all of them, and all pass (2026-10-06). Newest: `live` — windows on Node's
own BroadcastChannel hearing each other come, change and go; `windowed` — a window's corner
moving every absolute transform and pixel, and nothing else; `stage-still`
— a gamepad still's marks as stamps, framed, mirrored, clipped, drawn;
`png` — a PNG
written band by band, read back by zlib to the byte; `3d-pick` — a ray's
answer is a card's place, what is drawn is what is picked; `3d-handles` —
three's own controls driven in Node, a drag along the x arrow moving a box
exactly as far as the pointer went; `3d-modifiers` — counts, angles,
normals true to the surface, no crack, the caps; `3d-look` — ramps, hulls,
shadows; before them `3d-shapes`, `3d-camera`, `3d-model`, and the rig's
four.

Twenty browser checks, each a command in `CLAUDE.md`: its own server on a
copy of the vault, headless Chrome through `scripts/chrome.mjs` — a real
mouse included — and `scripts/check-kit.mjs` under it. Each fails when a page
throws or its console is not quiet. Newest: `check-live` (9), windows in
tabs of one browser listing each other; `check-print` (16), every app's
print against its object drawn whole, and the gamepad's box drawn on with a
pad that is not there; `check-3d-poster` (8), the
300 dpi poster printed whole and read back; `check-3d` (61), on this
machine's WebGPU and with WebGPU taken away; `check-rig` (35), `check-map-play` (16). On the laptop Chrome keeps
WebGPU from its Intel: a GPU check there skips its GPU half unless given
`CHROME_FLAGS`, and `check-particles` fails two checks of that machine's
(`apps/particles/STATUS.md`, *Known*). A canvas read back often enough is
drawn by Chrome in software afterwards, a little differently: a check that
compares two pages' canvases measures, never demands the pixel.

## Broken / half-done

- **The stack's live view blends over the checkerboard** where nothing is
  under a layer; a save blends over nothing — alike for most blends, not for
  screen or difference. An app's own ground is opaque: set it to none to see
  what is under its layer. The gamepad and the 3D app have no clock in the
  stack: the gamepad has no drawer, the 3D app's model does not move yet.
- **A gamepad loop prints enlarged where it is large**: p5 replays it with
  no window, so it is drawn whole as large as a canvas allows — most loops
  fit a 120×176 sheet at 300 dpi, a tall one is enlarged a little, and the
  print says by how much. A shape, or a picture from outside, has only its
  pixels. The gamepad's print box is not on the pad.
- **A blur's taps stop at 512 a side**; past that it wants a smaller picture.
- **Compose's PNG export still draws its page on one canvas**, tried up to
  2480 × 3508 — its print beside it draws any sheet in tiles.
- **grid's own player opens its source exact**, so it cannot ask for drafts
  as compose does; and **grid still stutters now and then** while a loop
  plays — measure first, as ckt was (`bar.rate`).
- **ckt**: moving trails are its one slow case left; `speed` is degrees a
  frame, so a loop saved at 60 fps turns twice as fast as at 30 — which
  rate saves default to is the author's call; its width and height are both
  the canvas and the world the glyph sits in.
- **The gamepad cannot reopen its recordings**; its params are not on
  `core/params.js`, its panels its own; its GALLERY panel shows IndexedDB.
- **Files over the 400-line cap**: `scripts/check-particles.mjs` (506),
  `scripts/check-3d.mjs` (454, since brick 4 — its print section would sit
  in `check-print`), and
  the gamepad's `ui/hud.css` (721), `sketch/gamepadSketch.js` (572),
  `ui/TimelinePanel.js` (547), `ui/ParamPanel.js` (500). At it:
  `core/VaultPanel.js` (399) and `docs/roadmap.md` (400) — the next thing
  either learns needs a split first: the roadmap's finished milestones are
  the natural cut, as the object model's `.skw` went to
  `docs/smart-objects.md`.
- **A 3D model is a still until brick 5**; its handles turn about the
  world's axes only; nothing in it is undone; a shadow's darkness and map
  are fixed; not yet seen on the laptop itself, where it should draw with
  WebGL2 (`apps/3d/STATUS.md`, *Known*).
- **Trashed brush sets still show in the gamepad and in ckt**; a cut-loose
  set or page keeps its old picture until saved again.
- **`detached` is a new envelope field**, for cutting loose — written up as
  decided; the author may want to confirm it.
- **An identical re-cut does not join the new session folder**: dedup hands
  back the old object with its old tags.
- **Five sprite names mean two pictures** in `brushes` against v2's
  `sprites/`. A cleanup must never renumber `brushes`: marks name sprites
  by index — the rig's poses too.
- **A server started before a change to `server.js` keeps its old API**:
  restart it after pulling — on the laptop, `systemctl --user restart
  skweeb-vault`.
- **Nothing can leave the author's machines**: `Vault.publish` is specified,
  not built; M8's fifth brick bakes a map into a bundle instead.
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files; a recipe past
  4000 px opens clamped.

## Next single step

**M11's brick 6, its first step: opacity and blend on compose's placements**
(`docs/roadmap.md`, M11; `docs/smart-objects.md`, *Placement*). The two
rows in compose's placed panel (`apps/compose/params.js`), kept in the block
when they say something, as the stack keeps them, and `paintPage` drawing
each with `globalAlpha` and `compositeOf(blend)` (core/blend.js) — so a
page's export and print show them. Then compose opening the live stack as
its page, its windows smart objects when the page is saved.

**Waiting on the author first: how a moving model saves.** M10's brick 5
is motion — a turntable, then a shape swung as the rig swings a bone — and
the decisions say a model's "pictures are `still` and `sequence`, the model
their parent" without settling which object S writes when it moves: a
`model` whose render carries frames; a `sequence` whose recipe is the
model's and its motion, as the rig's loops are; or both, the sequence's
parent the model. The second fits what replays already, and is the
default unless the author says otherwise.

**And soon, the author's: the smart object** (`docs/roadmap.md`, after
M10): the `skw` spec moved to a file of its own first, the object model
being at the cap; its bricks laid out with the author.

**Then M10's brick 5, its first: a turntable** (`apps/3d/STATUS.md`,
*Next*). A Motion drawer — turns a loop, its length and rate — frame i seen
from the yaw plus 360° × turns × i / length, so the loop closes to the bit;
core's Playhead plays it, the handles hidden while it does; saved,
replayed, played in compose.

**Waiting on the author: the slug from the back and from the side**, drawn
in the gamepad as the front was — M9's last brick, a character set by
direction, for M8's avatar (`apps/rig/STATUS.md`). And for the worms,
when M8 resumes: **a path drawn on the map that a thing follows across the
room**, so a crawling worm goes about the room and not only round its own
box.

Waiting elsewhere (their STATUS files): a Julia set by clicking the
Mandelbrot set, more fractal families, deeper zoom; colour over life in
particles; filter's motion group — *bob* first — parked with M5's catalogue.

## Parked decisions

- **M10 is 3D, and it is meshes, drawn by three.js** (the author,
  2026-10-06): primitives generated from their params, never stored as
  vertices; `model` a type, its pictures `still` and `sequence`;
  `material` still deferred; three r186 pinned in `core/libs/three/`, its
  WebGPU renderer on core's device; the app is `apps/3d/`. Distance fields
  can come back as a family of M7. `docs/decisions.md`. Its bricks 2 to 4
  settled more the same day: the handles are three's, driven by the app's
  own pointer, their gizmo a scene of its own; a shape's modifiers are a
  stack in its own entry; a style is the model's, a colour the shape's.
- **M9 is the rig, between M8's bricks 3 and 4** (the author, 2026-10-02):
  a drawing made of marks rigged at its marks — never its pixels, which
  would stretch the scales; the mesh and Blender's heat weights wait for a
  picture with no marks; no physics, follow-through as a lagging phase.
  `docs/decisions.md`.
- **M8 is a map editor, and a room first** (the author, 2026-09-30):
  Pokémon's rules, ZQSD and E by key place, assets baked down, the player
  on a site of its own framed by the portfolio. A map is pure; the playable
  map is its export.
- **Newest behind, in the gamepad too** (the author's idea, 2026-09-27, not
  started): `destination-over` inside `_drawEvent`'s push/pop in
  `core/stage/player.js`, from a clip override, and on the live layer.
- **Next were filters, particles, fractals; 3D parked** (2026-09-26): 2D
  first, fake 3D where it helps. The GPU kit is WebGPU, nothing cut for a
  machine without it; a GPU render replays within a small difference on
  another machine.
- **Rule 8 settled** (2026-09-26): p5 is not required; the gamepad and core's
  replay of its recordings keep p5 1.5.0 until ported. **Rule 5 covers
  shaders**: LYGIA and unlicensed Shadertoy code stay out.
- **Objects are deleted in two steps** (2026-09-26); **a flipbook is
  placements in time, not a new kind**, and ripples (2026-09-27).
- **compose, brick by brick** (2026-09-24): the decisions, and the plan it
  was built to, are in `apps/compose/STATUS.md`. A page exports a PNG and a
  frames zip, no PDF for now.
- **Where a set is offered is tags, declared per consumer** (`use:<id>`,
  `core/uses.js`); a material is a set with `role: 'material'`, light to
  dark, twelve at most.
- **The vault is shared over the author's tailnet**: `server.js` stays on
  127.0.0.1 behind `tailscale serve`, or takes `--host` its tailnet address
  — never `0.0.0.0`.
- The rest — the theme and the UI pass, M4 as the master render, video as
  frames plus ffmpeg, `version` against `at`, `.skw` as a smart object, a
  port reading the original's source — in `docs/decisions.md`; Destra is
  free, its licence to be named in the files (`docs/fonts.md`). The UI
  review: https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d
