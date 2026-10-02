# STATUS — skweeb
_last touched: 2026-10-02_

Where the suite stands, by area. Each app's own `STATUS.md` has its detail;
`docs/roadmap.md` has the milestones, `docs/decisions.md` why things are as
they are. Rewritten on 2026-10-02, when it had grown to 557 lines: what each
day added is in its app's file, and here only what works. Ideas the author
has between bricks wait in `docs/inbox.md` until a session sorts them.

## Works right now

### Newest — 2026-10-02

- **M9 is the rig, between M8's bricks 3 and 4** (the author's idea from
  the inbox, `docs/roadmap.md`, M9): a drawing made of marks rigged at its
  marks. Five of its six bricks done the same day (`apps/rig/STATUS.md`):
  - **Strokes are bones** (`check-rig` 27; `tests/rig-strokes.mjs` 18,
    `rig-bones` 18). A gamepad still's marks become stamps; strokes found
    where the brush jumped, never where it paused; a stroke jointed at its
    corners, a long run cut; a chain hung from the nearest bone drawn before
    it. A stamp rides its own stroke's bones, shared near a joint, and stays
    whole, so a bend fans the stamps like scales. Drawn again from the
    marks with Canvas 2D: the author's slug — seven strokes, fifteen bones —
    comes back within 0.04 of 255 of its saved render. A handle dragged
    bends a joint; R back to rest.
  - **A pose saved**: a still the rig made, its bones kept whole, its turns,
    its drawing its parent; replayed to the pixel, drawn again from the marks
    at any scale — sharp, where a gamepad still prints stretched; `?open=`;
    compose places it. The link `gamepad → rig: a drawing's strokes as
    limbs`: the vault offers *Rig this ↗* (`core/reopen.js` `rigUrl`).
  - **Bones that swing by themselves** (`tests/rig-motion.mjs` 13): a bone's
    wave — swing, cycles, phase — the chain following a lag later, so a
    stalk whips; whole cycles close every loop to the bit. Saved as a
    `sequence`, replayed, placed in compose and played.
  - **Walks by part, and worms that crawl** — the author's direction, few
    human shapes and many worms (`tests/rig-crawl.mjs` 30, `check-rig` 35).
    Every chain named — body, head, arm, leg, tail — by guess, all seven
    of the slug's right, and by hand; *Walk*, *Waddle*, *Idle* set waves by
    part, with a rise. A worm's first stroke is its spine: a wave down it in
    place, or the body following its head round a circle, an ellipse, an
    eight or a drawn path, slithering through wiggles fixed to the ground;
    every loop closes.
  - `core/sprites.js` `familySprite`: a recorded mark's picture without p5.
- **M8, bricks 2 and 3** (`apps/map/STATUS.md`):
  - **Walls, and things that answer** (`check-map` 44, `tests/map-walk.mjs`
    24). The walls tool (3): a flag a cell apart from its tile, as Pokémon
    keeps it; a solid thing blocks the cells under its feet. Events on
    things, RPG Maker's way — a sign (what it says, what it shows), a warp to
    a map by its name, the spawn — a thing with no object an event alone.
    `walk.js` answers what the avatar will ask: `walkable`, the spawn, where
    a warp lands. Guides only, never in the picture. The recipe is
    `{ map, cells, walls, place }`.
  - **The player, point and click** (`apps/map/play/`, `check-map-play` 16,
    `tests/map-play.mjs` 8). A saved map, or the latest of a name, fitted to
    the window: what answers outlined under the pointer, a sign shown over
    the map, a warp followed, Back coming back. The editor's *Play the last
    save ↗*.
- **The docs back under the cap**: M4's build-time decisions moved from the
  roadmap to `apps/compose/STATUS.md`; the object model trimmed. And
  `scripts/chrome.mjs`'s pointer can press the right button.

### M8 — the map editor (`apps/map/STATUS.md`, three bricks of six)

- **A map on a grid of large tiles** (2026-09-30): a tileset — any set,
  offered as a *map tileset* (`core/uses.js`) — painted into cells with no
  gaps; things from the vault on cells, feet at the bottom middle, back to
  front by row, dragged, their loops playing by the map's clock. A new type,
  `map`, saves, replays to the pixel, draws again at scale 2, reopens, and
  compose places and plays it: `any → map: a thing in the room`.

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
  white. Its stills keep their marks: the rig draws them again.

### Across the suite

- **The UI pass, from the author's brief** (`docs/decisions.md`): one theme,
  neo-brutalist and light; a bar that is information only; drawers; core's
  Format drawer everywhere; a page that never scrolls.
- **A check that throws takes its Chrome with it** (`scripts/check-kit.mjs`),
  and `CHROME_FLAGS` lets the laptop's Intel run a GPU check's GPU half.
- Replay is a dispatch by `origin.app`; one clock plays every loop; video is
  `frames.zip` plus `scripts/frames-to-video.mjs`.

## Tests

Forty files, no runner, no dependencies — the loop in `CLAUDE.md` runs
all of them, and all pass (2026-10-02). Newest: `rig-crawl` — a spine that
carries, undulates and follows a path, closing; parts and presets;
`rig-strokes`, `rig-bones` and `rig-motion` — strokes, corners, bones, the
skin's promises, waves that close; `map-walk` — what can be walked, the spawn, a warp's arrival;
`map-play` — what answers, a sign's picture, the latest map of a name.

Sixteen browser checks, each a command in `CLAUDE.md`: its own server on a
copy of the vault, headless Chrome through `scripts/chrome.mjs` — a real
mouse included — and `scripts/check-kit.mjs` under it. Each fails when a page
throws or its console is not quiet. Newest: `check-rig` (35),
`check-map-play` (16); `check-map` grew to 44. On the laptop Chrome keeps
WebGPU from its Intel: a GPU check there skips its GPU half unless given
`CHROME_FLAGS`, and `check-particles` fails two checks of that machine's
(`apps/particles/STATUS.md`, *Known*). A canvas read back often enough is
drawn by Chrome in software afterwards, a little differently: a check that
compares two pages' canvases measures, never demands the pixel.

## Broken / half-done

- **A gamepad still prints stretched from its pixels**, as a shape does, and
  the export names them. A rig's pose is drawn again from the same marks,
  so the fix is near: core's replay of a still's marks at a scale (*Next*).
- **A blur's taps stop at 512 a side**; past that it wants a smaller picture.
- **A print export draws its page on one canvas**, tried up to 2480 × 3508;
  the largest sheets at scale 4 are past a browser's canvas cap.
- **grid's own player opens its source exact**, so it cannot ask for drafts
  as compose does; and **grid still stutters now and then** while a loop
  plays — measure first, as ckt was (`bar.rate`).
- **ckt**: moving trails are its one slow case left; `speed` is degrees a
  frame, so a loop saved at 60 fps turns twice as fast as at 30 — which
  rate saves default to is the author's call; its width and height are both
  the canvas and the world the glyph sits in.
- **The gamepad cannot reopen its recordings**; its params are not on
  `core/params.js`, its panels its own; its GALLERY panel shows IndexedDB.
- **Files over the 400-line cap**: `scripts/check-particles.mjs` (506), and
  the gamepad's `ui/hud.css` (721), `sketch/gamepadSketch.js` (572),
  `ui/TimelinePanel.js` (547), `ui/ParamPanel.js` (500). At it:
  `core/VaultPanel.js` (399) and `docs/roadmap.md` (400) — the next thing
  either learns needs a split, or a move to `docs/decisions.md`, first.
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

**Waiting on the author: the slug from the back and from the side**, drawn
in the gamepad as the front was — M9's last brick, a character set by
direction, for M8's avatar (`apps/rig/STATUS.md`). Meanwhile, for the
worms: **a path drawn on the map that a thing follows across the room** —
M8's, beside the avatar — so a crawling worm goes about the room and not
only round its own box.

Waiting elsewhere (their STATUS files): a Julia set by clicking the
Mandelbrot set, more fractal families, deeper zoom; colour over life in
particles; filter's motion group — *bob* first — parked with M5's catalogue.

Still wanted, and nearer now: **a gamepad still drawn again at print
scale**. Its recipe's `marks` are drawn by the rig already (`apps/rig/
draw.js`, from a still's `canvas` and `frame.from`); core's `openFrames`,
asked for a scale above 1, could draw them the same way, and
`scripts/check-compose-export.mjs`'s gamepad row would say *drawn again*.

## Parked decisions

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
