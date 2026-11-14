# STATUS — skweeb
_last touched: 2026-11-13_

Where the suite stands, by area. Each app's own `STATUS.md` has its detail;
`docs/roadmap.md` the milestones still open, `docs/roadmap-done.md` the done
ones; `docs/plan.md` the work items; `docs/decisions.md` why things are as
they are. What each day added is in its app's file, here only what works.
Ideas the author has between bricks wait in `docs/inbox.md` until a session
sorts them.

## Works right now

### Newest — 2026-11-09 to -13: BEC 2027's graphic system (track G), a game's effects (M15)

- **The shader app** (M15, `apps/shader/STATUS.md`, `docs/vfx.md`): a surface
  from nothing — filter's chain begun by a generator, every row its picture,
  a loop or a life played once, dissolved; saved, replayed, printed. Worn by
  particles, a loop's frames by a particle's age (M15e); played once at a
  thing's cell in the map's player, an event (M15g). In cluster's strip.
- **An object's layers, in every app** (L13a, 2026-11-12, `core/layers.js`):
  its Stack section first — "+ overlay…", a vault picture in front or behind,
  fitted to the format, composed as particles' overlay — kept state by state,
  drawn round the canvas and in all that leaves: a save, a replay, compose,
  the print, E's picture; particles' overlay its first layer (L13b).
- **A cloud of dots in the 3D app** (G1, `apps/3d/cloud.js`): particles'
  emitter in 3D, its dots placed once on a vault object's ink, a ball, a disc…,
  each its size and colour by two seeds, R and C; unlit in a palette, or toon;
  saved, replayed, printed. In time (G2, `forces.js`): gravity, wind, drag, a
  vortex, a pull and curl noise — played once. In particles: a palette (G3).

### 2026-11-05 and -06: *cluster* (S9c–S9h), BEC, the workshop, the garden

- **The garden** (M14a, `apps/map/garden/`, `apps/map/STATUS.md`, *The
  garden*): a map gardened in, alone or in cluster. The gardener walks it as
  the player's avatar does; facing a flower — a drawing that keeps its
  marks — E plants its next generation beside it: its marks through a chain
  of modifiers, saved as a still, its source its parent; on bare earth, a
  flower of the set in hand. Ctrl S keeps the garden, a map's state.
- **cluster** (`apps/cluster/STATUS.md`): the apps in one page one at a
  time, through their modules, laid as the bench is — a strip, the side,
  the viewer in one place, the properties one panel, the app's panels a tab
  each (S9d); at a switch its boxes still, what is in them going and coming
  (S9e's first pass). The side's views: the vault — the app's own first, a
  card dragged onto an object field (`core/vault-drag.js`), a set in its
  folder (S9g) — the keys, the history (S9f). The app in the address; back
  as it was left (`core/mount.js` `keep`); links mounted in place.
- **The vault app's viewer** (S9h): an object at its ink's size, never
  stretched; its player's controls; seen closer — wheel, drag, double click
  (`core/zoom.js`); every viewer's picture fitted with an even margin.
- **BEC's grid in the 3D app** (M13a, `apps/3d/grid.js`, `docs/bec.md`):
  BEC_2025's cells, edges and faces in its three palettes — or a palette
  of the vault — every draw a seed: R new edges, C new colours, A's pie.
- **The vault's workshop** (V1–V3, `docs/workshop.md`): a palette made in
  the vault panel, *+ palette*, edited as a new one; its selection into a
  group or out of one, a group renamed; the pictures selected, a set — a
  character's loops too (P3, `core/character.js`, *map character*). And
  BEC_2025 in it (M13b, `scripts/import-bec.mjs`): its layers by format,
  its other pictures, its three palettes — 31 objects in `bec_2025`.

### 2026-11-04: every app a module (S9a), the vault an app (S9b)

- **The vault, an app** (`apps/vault/`): every object full screen, the one
  whose detail opens drawn large beside it and played if it moves, its
  detail the facts only; it makes nothing — `check-vault`, `check-mount`.
- **Every app on core's kit is `mount(host)` and `unmount()`**
  (`core/mount.js`): built in any host, taken out with nothing left — what
  it held outside its nodes in a scope (`core/scope.js`) the unmount closes:
  listeners, windows in the stack, keys and pies, steps; each app stops its
  own clock — `check-mount`, which counts what an app unmounted leaves.

### 2026-11-03, and -12: the bench's UI, in every app (track S, `docs/scene.md`)

- **The look and the rows**: the dark theme (S1); a value on one line — its
  box dragged, its fill, its slider only where wanted, its mark a dot when
  changed, counted by its drawer (S2); its unit in its box, two numbers on
  one line, the rows seldom touched under "n more" (S2b); the format a list
  (S4), in the viewer's head since 2026-11-12, the picture's size a chip
  opening the rest (S14b) — `check-rows`, `check-viewtools`.
- **The shell**, its first Lit components (S12): a title bar — the search,
  Save, Export ▾ — the player under the viewer, as After Effects' (S3), the
  Export box in order (S3), the status bar's hints; in every viewer rulers,
  guides and the magnet, F placing in particles (S8) — `check-guides`; and
  since 2026-11-12 the viewer's tools as the bench has them (S14a): the zoom
  — a menu, Ctrl and the wheel, Space or the middle button and a drag — the
  states, the app's guides, the ground; not in the gamepad, its own page.
- **The left hand**: ² or Ctrl K, every control and act by name (S5); keys
  by their place, tapped or held for a pie — Q D frames, A the app's own, Z
  the view, E export, R again, F place, G the ground, X a reset (S5b) —
  `check-palette`, `check-keys`.
- **States** (S6): an app's S is the next state of a smart object, its first
  S making it, "Save as a new object" another, the frozen acts naming the
  state they came from; the states a tree (`parent`, `parent2`), a page
  opened `@v3` saving a branch; compose pins a project placed, 0 to follow;
  Ctrl Z and Ctrl Y over the session's steps; a row's value in every state,
  by Alt click on its mark — `check-states`, `check-steps`, `check-smart`.
- **The graph** (S7): H, the states over the page — hovered, a state drawn;
  clicked, gone back to, its next save a branch; two Shift clicked compared
  and merged, a conflict picked row by row (S7b); A over a state, the apps
  it reaches (S7c; `core/shell/graph.js`, `merge.js`, `check-graph`).
- The bench stays a page apart: https://claude.ai/artifact/JsZT1PpgNTBYpuMAaWmaZm.

### 2026-10-21 and -22 — and a branch for each work item since (`docs/workflow.md`)

- **The rig's puppet, worn in OBS** (`apps/rig/STATUS.md`, *The puppet*):
  the author's eyes at the eyestalks' tips, the mouth on the face, the body
  swaying with the head; a smart object a page in OBS follows, kept in sight
  on the screen OBS records (`docs/guides/obs.md`, read by `core/Guide.js`).

### M11 — the live stack and smart objects (done 2026-10-07; `docs/smart-objects.md`)

- **Every app its own window, the windows one stack** (`core/live.js`,
  `stack.js`, `stackView.js`, `place.js`): every app joins one
  BroadcastChannel with what is on screen; the stack is one live
  composition every window keeps — a layer from a window or the vault, put
  on, moved, taken off, its opacity and blend by CSS's names — and each
  window draws it round its own canvas, a loop at the wall clock's frame.
- **Send to ▸ filter, ▸ grid** (`core/send.js`, `core/following.js`): a
  window as their source, live — grid's since L5; saved, the window first.
- **Smart objects** (`core/smart.js`, `server/versions.js`): a `skw` saved
  by its app through its own save, the window bound; saved again, a
  version, and every page holding it drawn again (`vault:updated`) — and
  every object field holding it, in any app (L11, 2026-11-06).
- **The stack saved as a page** (`core/stackSave.js`), every window a smart
  object; pins (L1), no cycle (L3), *Flatten* (L2), *Edit ↗* (L6).

### M10 — 3D (`apps/3d/STATUS.md`, its six bricks done 2026-11-06)

- **Primitives made from their params**, each a card (`core/Cards.js`, out
  of filter for it); an orbit view; three r186 on core's GPU device, WebGL2
  where there is none; a `model` keeps values, never a vertex — saved,
  replayed, drawn again at scale 2, placed. Picked by a click, moved by
  three's handles; a stack of modifiers per shape; a style — toon bands, an
  outline, shadows. Brick 5 (`motion.js`): a turntable (P1), a shape swung
  (P2), saved as a `sequence`; brick 6, its sides a character (P6). Since,
  a cloud of dots (G1, under *Newest*).

### The print, in every app (2026-10-06; `docs/core-export.md`)

- Any object at a sheet's size and a dpi — the 120 × 176 cm poster at 300
  dpi is 14173 × 20787 px — in tiles, each handle drawing a `window` of its
  frame, written band by band into a PNG with its dpi (`core/print.js`,
  `PrintPanel.js`, `png.js`, `windowed.js`): nothing holds the sheet. A
  gamepad still is drawn again from its marks (`core/stage/still.js`), and
  the gamepad prints its canvas, E. `check-print` holds every app's print
  to its object drawn whole.

### M9 — the rig (`apps/rig/STATUS.md`, five bricks of six, 2026-10-02)

- **A drawing made of marks, rigged at its marks**: a gamepad still's
  strokes as its bones — found where the brush jumped, jointed at corners —
  each stamp riding its stroke's bones like a scale; handles bend joints.
  Poses saved as stills, swings and walks by part as loops that close,
  worms crawling round a path; replayed to the pixel, drawn again from the
  marks at any scale, placed in compose. The vault offers *Rig this ↗*.
  Brick 6, the slug from every side, waits on the author's drawings (P5).
  Its player, the puppet, is under *Newest*.

### M8 — the map editor (`apps/map/STATUS.md`, four bricks of six; the player)

- **A map on a grid of large tiles** (2026-09-30): a tileset painted into
  cells; things from the vault on cells, back to front by row, their loops by
  the map's clock; a `map` saved, replayed, reopened, placed in compose.
- **Walls, and things that answer** (2026-10-02): a sign, a warp, the spawn,
  RPG Maker's way — an effect played once too (M15g). **The player** (`play/`): point and click, a warp followed
  and back; its avatar (P4) on the spawn — ZQSD, the arrows, a pad, E, a tap.

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
  forces in closed form, a vortex, an attractor, curl noise, a fractal's
  field; depth with a camera; a set's sprites, sized, faded and turned on
  easing curves (`set → particles: sprites`), in a palette's colours, a
  picture in front fitted to the format (2026-11-09). Guides show what makes
  them. Saved, replayed, placed; a loop leaves as a sprite sheet with
  Aseprite's JSON, and Phaser 3 plays it.

### M5 — filter, and the GPU kit under it (`apps/filter/STATUS.md`)

- **The GPU kit** (`core/gpu/`, WebGPU): one device a page, a chain of
  filters in one call, handed back as an ImageBitmap for `frame(i)`;
  premultiplied alpha, rgba16float between passes; a chain of three on
  1024 × 1024 in 1.7 ms. A filter is data with its source and licence
  (rule 5); a page with no WebGPU gets null and a reason. WebGPU on every
  machine the author uses — the laptop's Intel once Chrome's flags are on.
- **filter** filters any vault still, loop or page live, a chain of cards
  drawn from their schemas; saves stills and loops that replay and draw
  again at print scale. Thirty-six filters, eighteen from p5.FIP under
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

- **The laptop's vault, and the tower's**: the laptop serves `~/skweeb-vault`
  behind `tailscale serve` to every machine; the tower's `./vault` is in use
  again since 2026-11-06 (BEC's palettes, the garden). A save shows on every
  open panel as it happens (`server/events.js`); `scripts/vault-merge.mjs`
  merges one into another, copying, never overwriting.
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

- **A check that throws takes its Chrome with it** (`scripts/check-kit.mjs`),
  and `CHROME_FLAGS` lets the laptop's Intel run a GPU check's GPU half.
- Replay is a dispatch by `origin.app`; one clock plays every loop; video is
  `frames.zip` plus `scripts/frames-to-video.mjs`, which reads a zip past
  2 GiB a frame at a time.

## Tests

Seventy files, no runner, no dependencies — the loop in `CLAUDE.md` runs
all of them, and all pass (2026-11-13). Newest: `shader` (M15), `layers` (L13),
`steps` for a list held (L12b); `3d-forces` (G2), `3d-cloud` (G1); `garden` (M14);
`scope` and `reach`; the puppet's four; M11's, the print's, the 3D app's seven.

Forty-five browser checks, each a command in `CLAUDE.md`, run several at a
time by `scripts/checks.mjs`: each its own server on a copy of the vault,
headless Chrome through `scripts/chrome.mjs` — a real mouse included — and
`scripts/check-kit.mjs` under it; each fails when a page throws or its
console is not quiet. Newest: `check-shader`, `check-shader-save`,
`check-particles-life` (M15), `check-layers` (L13). On the laptop Chrome keeps
WebGPU from its Intel: a GPU check there skips its GPU half unless given
`CHROME_FLAGS`, and `check-particles` fails two checks of that machine's
(`apps/particles/STATUS.md`, *Known*). A canvas read back often enough is
drawn by Chrome in software afterwards, a little differently: a check that
compares two pages' canvases measures, never demands the pixel.

## Broken / half-done

- **An object's layers** (L13): a frames zip leaves without them, but in
  particles, and the map's player shows none; a window's block in the stack
  gives its opacity and blend to its picture, not its layers; dragged in particles alone.

- **`check-frames` depends on which stills come first in the vault**: red
  with the garden's sparse flowers (2026-11-09, `main` too, 3 of 3), green
  once other pictures came in. The check's, not compose's: C12.
- **`check-live` hangs under the gate's load** after its gamepad window —
  twice on 2026-11-05, taken down at 8:00, green alone each time. A flake
  of the load, noted at each merge; worth its own look (C9's helpers).
- **The stack's live view blends over the checkerboard** where nothing is
  under a layer; a save blends over nothing — alike for most blends, not for
  screen or difference. An app's own ground is opaque: set it to none to see
  what is under its layer (L4). The gamepad has no clock in the stack: it
  has no drawer.
- **A gamepad loop prints enlarged where it is large**: p5 replays it with
  no window, so it is drawn whole as large as a canvas allows — most loops
  fit a 120×176 sheet at 300 dpi, a tall one is enlarged a little, and the
  print says by how much. A shape, or a picture from outside, has only its
  pixels. The gamepad's print box is not on the pad.
- **Checks intermittent under the gate's load**, green alone, which the
  runner tries before saying red: check-compose's typed transform, check-rig's
  swing (2026-11-06); check-puppet and check-live hung once that day.
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
  `core/params.js`, its panels its own; its GALLERY panel shows IndexedDB
  (C6).
- **Files past 400 lines** (rule 4, `node scripts/lines.mjs`): the
  gamepad's `ui/hud.css` (721), `sketch/gamepadSketch.js` (572),
  `ui/TimelinePanel.js` (547) and `ui/ParamPanel.js` (500) — C6 — and four
  kept whole with their reasons: `core/VaultPanel.js`, `apps/grid/main.js`,
  `apps/filter/main.js`, `scripts/check-3d.mjs`.
- **A 3D model's handles turn about the world's axes only**; nothing in it
  is undone; a shadow's darkness and map are fixed; not yet seen on the
  laptop itself, where it should draw with WebGL2 (`apps/3d/STATUS.md`).
- **A cut-loose set or page keeps its old picture** until saved again.
- **`detached` is a new envelope field**, for cutting loose — written up as
  decided; the author may want to confirm it (`docs/plan.md`, *Waiting*).
- **Five sprite names mean two pictures** in `brushes` against v2's
  `sprites/`. A cleanup must never renumber `brushes`: marks name sprites
  by index — the rig's poses too.
- **A server started before a change to `server.js` keeps its old API**:
  restart it after pulling — on the laptop, `systemctl --user restart
  skweeb-vault`.
- **Nothing can leave the author's machines**: `Vault.publish` is specified,
  not built; M8's fifth brick bakes a map into a bundle instead (P8).
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files (C3); a recipe past
  4000 px opens clamped.

## Next single step

**S9i — the players in cluster** (`scene/players`, `ready`): the rig's
puppet and the map's player as modules on `core/mount.js`, as the garden is.
M15 is in but f, waiting for a game made elsewhere (`apps/shader/STATUS.md`).
Waiting on the author: the layers in use — a frames zip, a drag, a live window.

## Parked decisions

- **A branch for each work item** (the author, 2026-10-22): `main` always
  green, an item a branch, rebased to catch up and merged to land —
  `docs/workflow.md`; the plan's order, the author's the same day.
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
- **The GPU kit is WebGPU** (2026-09-26): nothing cut for a machine without
  it; a GPU render replays within a small difference on another machine.
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
  free, its licence to be named in the files (`docs/fonts.md`, C3). The UI
  review: https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d
