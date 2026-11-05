# STATUS — skweeb
_last touched: 2026-11-05_

Where the suite stands, by area. Each app's own `STATUS.md` has its detail;
`docs/roadmap.md` the milestones still open and `docs/roadmap-done.md` the
done ones; `docs/plan.md` the work items and their branches;
`docs/decisions.md` why things are as they are. Rewritten on 2026-10-02,
when it had grown to 557 lines, and on 2026-10-22, M11's bricks folded into
what works: what each day added is in its app's file, here only what works.
Ideas the author has between bricks wait in `docs/inbox.md` until a session
sorts them.

## Works right now

### Newest — 2026-11-05: *cluster*, the scene (S9c, its five bricks)

- **cluster** (`apps/cluster/`, `apps/cluster/STATUS.md`): the suite's apps
  in one page one at a time, through their modules, laid as the bench is —
  the author's yes — a strip of apps, the scene's vault, the viewer in one
  place to the pixel for every app, the properties one panel as the
  bench's — the app's panels a tab each, their sections folded in it — and
  the vault four columns of pictures (S9d); at a switch the panels leave
  and the next app's come, its last frame held until the next draws. The app in the address,
  `#particles`; mounted again it comes back as it was left, recipe, frame
  and smart object (`core/mount.js` `keep`); *Open in … ↗* and the other
  links between apps mount theirs in place (`core/reopen.js` `follow`) —
  `check-cluster`. particles' and compose's ways out are a `leaving.js`.
- **The scene's vault beside an app** (S9g): still at a switch, its
  stylesheet the scene's; the app's own objects first, the cards sliding
  (`core/flip.js`); a card dragged onto any app's object field
  (`core/vault-drag.js`); a set in the folder of its tiles —
  `check-cluster-vault`.

### 2026-11-04: every app a module (S9a), the vault an app (S9b)

- **The vault, an app** (`apps/vault/`): every object full screen — core's
  vault panel docked in the page — the one whose detail opens drawn large
  beside it and played if it moves, the detail its facts only (the author's
  C, 2026-11-05); it makes nothing, so its title bar has no Save and no
  Export — `check-vault`, `check-mount`.
- **Every app on core's kit is `mount(host)` and `unmount()`** — particles,
  grid, ckt, compose, map, the rig, filter, fractals, the 3D app
  (`core/mount.js`): built in any host, taken out with nothing left — what
  they held outside their nodes in a scope (`core/scope.js`) the unmount
  closes: listeners, their windows in the stack and the stack's channel,
  keys and pies, their params' steps; what ends first takes itself out of
  the scope, and each app stops its own clock. Their pages mount them on
  themselves — `check-mount`, which counts what an app unmounted leaves:
  listeners, channels, intervals, frames asked for. Cards (filter's chain,
  a model's shapes) remove a card's panel with it now — three listeners on
  the window were left behind each time.

### 2026-11-03: the bench's UI, in every app (track S, `docs/scene.md`)

- **The look and the rows**: the dark theme (S1); a value on one line — its
  box dragged, its fill, its slider only where wanted, its mark a dot when
  changed, counted by its drawer (S2); its unit in its box, two numbers on
  one line, the rows seldom touched under "n more" (S2b); the format a list
  (S4) — `check-rows`.
- **The shell**, its first Lit components (S12): a title bar — the search,
  Save, Export ▾ — the player under the viewer, as After Effects' (S3), the
  Export box in order (S3), the status bar's hints; in every viewer rulers,
  guides and the magnet, F placing in particles (S8) — `check-guides`.
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
- **The graph** (S7a): H opens the states over the page, see-through, panned
  and zoomed, v1 at the bottom and a branch in a column of its own; hovered,
  the page draws a state, clicked it goes back to it, its next save a branch;
  two Shift clicked are compared and merged — taken where only the arriving
  one changed, a conflict picked row by row — its save a state with both
  parents (S7b); A over a state, the apps it reaches, each on that state
  (S7c; `core/shell/graph.js`, `merge.js`, `check-graph`).
- The bench stays a page apart: https://claude.ai/artifact/JsZT1PpgNTBYpuMAaWmaZm.

### 2026-10-21 and -22

- **The rig's puppet, worn in OBS** (`apps/rig/STATUS.md`, *The puppet*):
  the author's eyes from the camera at the eyestalks' tips, the mouth on
  the face, the body swaying with the head, the rig's bones over it as
  guides; kept as a smart object that a page in OBS follows; and scripts
  that keep the avatar in sight on the screen OBS records
  (`docs/guides/obs.md`, read in the page by `core/Guide.js`).
- **A plan, and a branch for each item** (`docs/plan.md`,
  `docs/workflow.md`): the cycle's work items on one board, in order, each
  a branch landed after a gate; the puppet the first, `rig/puppet`.

### M11 — the live stack and smart objects (done 2026-10-07; `docs/smart-objects.md`)

- **Every app its own window, the windows one stack** (`core/live.js`,
  `stack.js`, `stackView.js`, `place.js`): every app joins one
  BroadcastChannel with what is on screen; the stack is one live
  composition every window keeps — a layer from a window or the vault, put
  on, moved, taken off, its opacity and blend by CSS's names — and each
  window draws it round its own canvas, a loop at the wall clock's frame.
- **Send to ▸ filter** (`core/send.js`, `apps/filter/following.js`): a
  window as filter's source, live; saved, the window saves itself first.
- **Smart objects** (`core/smart.js`, `server/versions.js`): a `skw` saved
  by its app through its own save, the window bound; saved again, a
  version, and every page holding it drawn again (`vault:updated`).
- **The stack saved as a page** (`core/stackSave.js`): every window a smart
  object, the page compose's, whose placements blend. What M11 left — pins,
  flatten, no cycle, more takers, overrides — is L in `docs/plan.md`.

### M10 — 3D (`apps/3d/STATUS.md`, four bricks of six, 2026-10-06)

- **Primitives made from their params**, each a card (`core/Cards.js`, out
  of filter for it); an orbit view; three r186 on core's GPU device, WebGL2
  where there is none; a `model` keeps values, never a vertex — saved,
  replayed, drawn again at scale 2, placed. Picked by a click, moved by
  three's handles; a stack of modifiers per shape; a style — toon bands, an
  outline, shadows. Brick 5, a turntable, is P1 on the board.

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

- **A check that throws takes its Chrome with it** (`scripts/check-kit.mjs`),
  and `CHROME_FLAGS` lets the laptop's Intel run a GPU check's GPU half.
- Replay is a dispatch by `origin.app`; one clock plays every loop; video is
  `frames.zip` plus `scripts/frames-to-video.mjs`, which reads a zip past
  2 GiB a frame at a time.

## Tests

Sixty-four files, no runner, no dependencies — the loop in `CLAUDE.md` runs
all of them, and all pass (2026-11-05). Newest: `scope` and `reach`
(2026-11-04); before them the puppet's four —
`puppet-eyes` (27), `puppet-mouth` (15), `puppet-sway` (24), `puppet-roles`
(17): the eyes and the mouth cut and worn, the sway, the parts found;
before them M11's — `live`, `stack`, `place`, `smart` — the print's —
`windowed`, `stage-still`, `png` — and the 3D app's seven.

Thirty-five browser checks, each a command in `CLAUDE.md`, run several at a
time by `scripts/checks.mjs`: each its own server on a
copy of the vault, headless Chrome through `scripts/chrome.mjs` — a real
mouse included — and `scripts/check-kit.mjs` under it. Each fails when a page
throws or its console is not quiet. Newest: `check-cluster-vault`, the
scene's vault beside each app (S9g); `check-cluster`, the scene, and
`check-mount`, an app unmounted with nothing left (S9); `check-puppet`, the
puppet on a fake camera, sent and followed by a page in OBS; M11's four —
`check-live`, `check-send`, `check-smart`, `check-page` — `check-print`
(20), `check-3d-poster` (8) and `check-3d` (58). On the laptop Chrome keeps
WebGPU from its Intel: a GPU check there skips its GPU half unless given
`CHROME_FLAGS`, and `check-particles` fails two checks of that machine's
(`apps/particles/STATUS.md`, *Known*). A canvas read back often enough is
drawn by Chrome in software afterwards, a little differently: a check that
compares two pages' canvases measures, never demands the pixel.

## Broken / half-done

- **The stack's live view blends over the checkerboard** where nothing is
  under a layer; a save blends over nothing — alike for most blends, not for
  screen or difference. An app's own ground is opaque: set it to none to see
  what is under its layer (L4). The gamepad and the 3D app have no clock in
  the stack: the gamepad has no drawer, the 3D app's model does not move yet.
- **A gamepad loop prints enlarged where it is large**: p5 replays it with
  no window, so it is drawn whole as large as a canvas allows — most loops
  fit a 120×176 sheet at 300 dpi, a tall one is enlarged a little, and the
  print says by how much. A shape, or a picture from outside, has only its
  pixels. The gamepad's print box is not on the pad.
- **check-map's press is intermittent** (2026-11-03): "a press paints the
  cell under it" read the cell unpainted once in six runs — the pixel read a
  little early after a real press; it passed every rerun. Under the load of
  checks run together (`scripts/checks.mjs`) it fails more, and so, now and
  then, does check-compose's "a typed transform lands where page.js says":
  both green alone, which the runner tries before saying red.
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
  `ui/TimelinePanel.js` (547) and `ui/ParamPanel.js` (500) — C6 — and
  `scripts/check-3d.mjs` (414), kept whole with its reason.
  `core/VaultPanel.js` stands at 399.
- **A 3D model is a still until brick 5** (P1); its handles turn about the
  world's axes only; nothing in it is undone; a shadow's darkness and map
  are fixed; not yet seen on the laptop itself, where it should draw with
  WebGL2 (`apps/3d/STATUS.md`, *Known*).
- **Trashed brush sets still show in the gamepad and in ckt** (C4); a cut-loose
  set or page keeps its old picture until saved again.
- **`detached` is a new envelope field**, for cutting loose — written up as
  decided; the author may want to confirm it (`docs/plan.md`, *Waiting*).
- **An identical re-cut does not join the new session folder**: dedup hands
  back the old object with its old tags (C4).
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

**The author tries S11's bench** — https://claude.ai/artifact/W6qyTQ6hG45rkaLWD4nwYL,
version 1 (`docs/scene.md`, *The space viewer gets a bench of its own
first*): its five tests, its parameters, *Keep* for what works — and
S9g in cluster, the vault beside each app, a card dragged onto a field.
And goes through S9e's cases, the motion at a switch, in `docs/scene.md`.
Then, by what is said: the bench's version 2, or S9e's first pass in
cluster.

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
  free, its licence to be named in the files (`docs/fonts.md`, C3). The UI
  review: https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d
