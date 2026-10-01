# Roadmap, open decisions, and what the ancestors taught

## Milestones

**M1 — core + gamepad moved in.** Extract `core/` while porting the app it comes
from, so the kit is shaped by real use instead of guesswork.
*Done when:* you draw, record a loop, and it lands in `vault/` with its recipe,
its thumbnail and its seed, from `skweeb/` and not from `sketch-2-print/`.
*Prerequisite:* the timeline work in `sketch-2-print` is committed first.

**M2 — grid v2 on core.** A rewrite of the 700-line sketch, straight onto the
kit. The honest test: the core was extracted from the gamepad, so only a foreign
app proves it generalises. Grid also has no save or load at all today, so it
gains the most.
*Done when:* you load any vault object, dither it, and save the result back with
the source recorded as its parent.

**M3 — ckt v3.** Text, grid, dots, sprites, motion. No Matter. Ships with the 9
existing datasets; new ones are cut in the browser by `apps/ckt/blobs.js`, a
flood fill with no dependency, so the 8 MB `opencv.js` is gone rather than
moved. **Done 2026-09-23** — see `docs/decisions.md`, 2026-09-23.
*Done when:* a shape from the gamepad can be the sprite on a ckt dot field —
and, the stronger test, when ckt can **regenerate a family like `Garam_blue`**:
letterforms with a pattern on them, emitted as a `set` the gamepad loads as a
brush family. Those folders are that exact chain, run by hand and frozen. M3 is
done when it runs itself and keeps its lineage.

**M4 — compose: the fourth app, and the master render.** Not a page and not a
mode bolted onto the others — an app, `apps/compose/`, where objects from all
three processes are placed, timed, previewed live and rendered out. A small
image and video editor whose material is the vault: stills, sequences and
`.skw` smart objects, mixed on one surface.

The part that changes the other three: **compose becomes where a finished
output is made.** Export in the gamepad, grid and ckt stays, but its job is
demoted from "how you make work" to **a shortcut for producing an asset** —
you export from grid because you want a dithered sequence in the vault, not
because it is the last step. Anything with more than one element in it goes
through compose. That is what makes it the master rendering environment rather
than a fourth way to save a PNG.

*Done when:* a sheet carrying objects from all three apps — at least one of
them moving — previews live, renders at print scale, and one object has a URL
you can send. **Done 2026-09-24**, in five bricks — see *Decided since,
2026-09-24*.

Three consequences, recorded here because each of them is work:

1. **Video output is frames plus ffmpeg, not a muxer.** Settled 2026-09-22 —
   see `docs/decisions.md`. A composition renders a numbered PNG sequence
   into a zip exactly as the gamepad and grid already do, and `scripts/` turns
   that into a file. Nothing is blocked and nothing has to be written in
   JavaScript that a mature C program does better.
2. **Placement needs a time axis — done, in the document.** The `place[]`
   entry used `at` to pin a `.skw` *version*, and a composition of sequences
   also needs *when* each element starts. `at: 4` cannot mean both. The pin is
   now `version`; `at` and `length` are time, in frames. Renamed on 2026-09-22
   while it was still only a document — see `docs/object-model.md`.
3. **`render()` finally has to be real.** It is the one moment the roadmap
   already named, and compose is that moment: A3 at 300dpi is about
   3500 x 4960 and every placed object has to redraw itself at that size.

Each milestone after M1 should also leave **one link** behind, since the
catalogue of links is the only real measure of whether this is a suite:
M2 `grid → vault: dithered sequence` — **done, 2026-09-22**, and the first
entry in the catalogue. M3 `ckt → gamepad: brush family` — **done, 2026-09-23**.
M4 `any → compose: place on a sheet` — **done, 2026-09-24**: compose's
picker takes any object, and the vault detail offers *Place in compose ↗*.
M5 `filter → compose: a look` — **done, 2026-09-26**: a chain saved in filter
as a look goes over any placement, and the page keeps it in its block.
M6 `set → particles: sprites` — **done, 2026-09-27**: a set picked in the
particles' Look is its sprites, offered through `core/uses.js`. And one
between milestones, the author's idea: `ckt → particles: an emitter` —
**done, 2026-09-30**: a dot-set, or a shape's ink, is where particles leave
from. M7 `fractal → particles: a field` — **done, 2026-09-30**: escape
time's slope, which way the set is, pulls particles; fractals answer it in
their rebuild.js, the producer declaring the link.

The next three were chosen by the author on 2026-09-26, with 3D parked: the
suite is to make the assets of a small game — 2D first, fake 3D where it helps,
real 3D later. Each stands on one new piece of core, the GPU kit.

**M5 — filters, and the GPU kit under them.** The fifth process, and the test
M5 was always meant to be: a new app should cost a folder, a schema and three
functions. Under it, a kit in `core/` that M6 and M7 stand on too:

- **one GPU device or context for the page**, however many objects are on it —
  compose places many, and browsers cap WebGL contexts at about sixteen;
- **filters of several passes**, on textures used in turns, so a blur is
  separable and stays linear in its radius at print scale;
- **a filter is data** — an id, a param schema, its shader, its passes — so its
  panel is rule 1's and a chain of them is a recipe;
- **seeded noise**, the same function in the shader language and in JS (rule 2).

The API is WebGPU (*Still open*, 4 — closed 2026-09-26).

The app opens any object — a still, a loop, a composition — and stacks filters
on it, each a drawer from its schema. It saves a still or a loop with the
source as its parent and `{ source, chain }` as its recipe; its `rebuild.js`
replays the source through `openFrames()` and runs the chain, as grid's does.
A filter's sizes are in the source's pixels, so print scale draws it again
exactly instead of stretching it. A chain saved alone is a **look**, a `params`
object, and compose applies a look to a placement or to a page.

The catalogue starts from p5.FIP (MIT, 45 effects, each one pass) and grows from
glfx.js (MIT) and GPUImage (BSD, about 125): tone and colour, blur and sharpen,
edges, stylise, distort. Three groups are the suite's own. **For game assets**:
palette lock, sprite outline, drop shadow, nearest-neighbour scaling, alpha
cleanup, a normal map from a sprite, make tileable. **Motion**, a still in and a
loop out, for idle animation: bob, breathe, sway, shimmer, glow pulse, palette
cycling, a spin. **Time**, a loop in: echo, slit-scan, blended motion blur, each
reading a bounded window of frames, so any frame still renders on its own and a
loop still closes. LYGIA and unlicensed Shadertoy code stay out (rule 5).

*Done when:* any still or loop in the vault goes through a chain of filters
previewed live on the GPU, saves with its source as its parent, replays, and
redraws at print scale; and a look made there is applied to a placement in
compose. The link: `filter → compose: a look`.

*So far:* the kit, the app, saving, and the look — 2026-09-26, in four
bricks (`apps/filter/STATUS.md`). A still or a loop filtered, saved with its
source as its parent, replayed and drawn again at print scale; a look made
in filter over a placement in compose, the page saved with it and replayed.
Both clauses of *Done when* are met. M5 stays open for what the author asked
it for, a big catalogue: twenty-nine filters — eighteen of them p5.FIP's,
one glfx.js's,
grain and glitch at random from a seed, and the game-asset group begun with
an outline, a drop shadow and palette lock — is under way, not done. Frames
by hand came first (2026-09-27): compose honours a placement's `at` and
`length`, *Next frame…* makes a flipbook of stills, a held frame ripples
the ones after it, and a paused page shows an onion skin. **Then the author
chose M6 over the rest of the catalogue** (2026-09-27): motion and time
filters are parked, not dropped.

**M6 — particles.** A particle is a function of its spawn slot and its age, not
a step in one shared simulation: seeded from its emitter and its slot, and
integrated from its own birth. So any frame renders on its own; emission that
repeats with the loop's period closes the loop exactly, after one lifetime of
warm-up; and a frame draws again at any size. Particles that interact —
flocking, collisions — break all three, and wait for a mode that caches.
Canvas 2D first: ckt already stamps thousands of turned sprites at 60 fps
(`apps/ckt/stamps.js`), and that renderer moves into core. Sprites come from
vault sets through one row in `core/uses.js`; an emitter is a point, a line, a
circle or a shape's alpha; forces are gravity, wind, drag, vortex, attractors,
seeded curl noise and a field taken from another object; colour, size, alpha
and spin run over a particle's life on `core/easing.js` curves. Particles live
in x, y and z behind a simple camera and are drawn as sprites sorted by depth —
the suite's first fake 3D, and a start on the real one.

*Done when:* a torch loop that closes exactly, drawn with a vault set's
sprites and scrubbed to any frame, and a one-shot burst, both leaving as
sprite sheets a game engine loads. The link: `set → particles: sprites`, a use.

*So far:* the model, the app, and sprites from a set — the link — all
2026-09-27. The model (`apps/particles/model.js`): slots seeded
from `k mod n`, so the picture at `t + period` is the one at `t`; slots
before zero born too, so the first frame needs no warm-up — the roadmap's
"one lifetime of warm-up" is paid in arithmetic, not in frames. The app
plays dots or a set's sprites, sized, faded and turned over their life, and
opens on a torch. The link, `set → particles: sprites`, is a row in
`core/uses.js`: a brush family is offered by default. It saves a loop or a
still, replays them to the pixel, and compose places them; any loop leaves
as a sprite sheet (`core/spritesheet.js`); emitters are a point, a line, a
disc or a ring, with a vortex, an attractor and curl noise
(`core/noise.js`); and particles have depth behind a camera. **Done when
is met, 2026-09-27**, all seven bricks in — but for loading a sheet in an
engine, which no check has done yet.

**M7 — fractals.** Escape-time on the GPU — Mandelbrot, Julia, Burning Ship,
multibrot, Newton, Phoenix, Lyapunov — with smooth colouring and orbit traps,
navigated by drag and zoom, a Julia chosen by clicking the Mandelbrot. A pure
function of its params, so print scale is exact; GPU floats run out near a zoom
of 10⁴–10⁵, and deeper is a later brick. Then the point families — IFS, strange
attractors, fractal flames — as density plots, and L-systems for trees and
plants. A loop closes by palette cycling, a Julia constant on a circle, or a
turn. It makes palettes, and fields for the others: particles flow along a
field, filters displace by one.

*Done when:* a Julia loop that closes, redrawn exactly at print scale, whose
field steers an M6 emitter. The link: `fractal → particles: a field`.

*So far:* bricks 1 to 3 of seven, and 6 begun, 2026-09-27 to -30
(`apps/fractals/STATUS.md`). The Mandelbrot set and its Julia sets as one
WGSL pass through the GPU kit, smooth colouring round a ramp, dragged and
wheeled about the pointer, the picture a function of its params — a PNG at
print scale is drawn again, not enlarged; held to the escape count in
doubles. Both families save and replay. A sprite copying itself, the point
families begun ahead of order, as the author asked. And loops: one param
swung over a loop in either family — for escape time the ramp once round,
or a Julia `c` round a circle. Against *Done when*: a Julia loop that
closes, redrawn exactly at print scale — met, 2026-09-30; whose field
steers an M6 emitter — met the same day, brick 7: escape time's slope in
doubles, taken in by particles' Fields drawer. **M7's *Done when* is met,
2026-09-30.** It stays open for the rest of its bricks, as M5 does for its
catalogue: families, depth, point families.

**Across M5–M7, for the game.** Four things serve every app rather than one:

- **sprite-sheet export** for any loop — the frames on one sheet with an
  Aseprite-style JSON of frame rects, durations and tags. `core/sheet.js`
  already lays out a set's contact sheet; this is its sibling. It needs
  nothing new and can land any time, at the latest with M6;
- **a `palette` type** — a game has one, and palette lock, gradient maps,
  colour over life and fractal colouring all read it. A row in the object
  model, not a field;
- **pixel mode** — small, nearest-sampled, whole-number scales, if the game is
  pixel art;
- **tileable output** — filters, noise and fractals that wrap at their edges,
  for backgrounds and textures.

And fake 3D where it is cheap: particles in depth (M6); a sprite lit through
its normal map by a moving light, and a spin (M5's motion filters); parallax
by depth in compose; a sprite stack — a set of slices turned as one object.

M8 is where the last three are needed: its bake draws at a pixel size, cleans
to a palette, and lays floors that tile.

**M8 — the map editor, and a room first.** Chosen by the author on
2026-09-30, after M7's third brick, M7 to be finished first: the suite as a
game editor as well as the maker of a game's assets — PokéWebKit's kind of
tool, for the suite's own objects rather than a ROM. The first thing it makes
is the author's room at home: posters, a PC, toys, each answering when it is
used, shown on the author's website.

`apps/map/`, the **map editor**, makes a `map`: the field's word for it — the
unit of Pokémon's own data, of RPG Maker, of Tiled, and of Porymap, the map
editor for pokeemerald. "Level" is the industry's general word but leans to
stages; "terrain" is heightmapped ground; "scene" is an engine's container
for anything, menus included; "room" is GameMaker's, and one interior. A room
is a map; a house is maps joined by warps; a game's maps together will be a
**world**, LDtk's word, when there are several. Grid's *mapping* stays grid's
verb.

Pokémon's rules first, the model its maps are made of: a grid of tiles, each
walkable or not; objects placed on it; an avatar moving tile by tile and
answered by what it faces; and events — a **sign**, used and something shows
(a poster, the PC), an **object**, a **warp** to another map, a **trigger**.
ZQSD to move and E to use, on the author's AZERTY: bound by the key's place,
not its letter (`event.code`), so a visitor's QWERTY moves with WASD; arrows
and a gamepad besides; on a phone, tap to walk and tap to use.

**A map is an object like any other**: its recipe is its tiles, its
placements, what can be walked and what answers. Any frame of it draws on its
own at any scale — every loop placed on it plays by the clock — so compose
can place a map and the vault shows one. **The playable map is an export of
it**, as video is a loop's: where the avatar stands, what is open, a toy
rolling — state that grows with a player's input — live only in the player
and never in a recipe. That keeps every promise the suite makes.

- **Assets are made large and baked small.** The apps make high-resolution
  objects; publishing draws each placement again at the map's pixel size
  (`openFrames(…, { scale })`) and cleans what scaling leaves rough with a
  look — palette lock, outline, alpha cleanup — so a grid poster, a fractal
  and a sprite drawn by hand sit in one style. Pixel art at a small tile, or
  smooth at a larger one, is the bake's setting, not the map's: one map tries
  both.
- **A tileset and a character are sets with a role**, as a material is —
  `role: 'tileset'` with its tile size, `role: 'character'` with its walk
  loops by direction — offered through `core/uses.js`. `map` is the one new
  type.
- **The player is the suite's own**: Canvas 2D at a whole-number scale, baked
  sheets and a `map.json`, no dependency, and no WebGPU — a visitor's GPU is
  anyone's, and the laptop's Intel has none by default — so what the GPU made
  is baked into frames.
- **Physics comes later and stays small**: a thing pushed a tile at a time, as
  Pokémon's boulders are; then a few bodies that roll against the walls,
  stepped at a fixed rate in the player.
- **Where it runs**: a site of its own for the player, where a larger game
  can grow; the author's portfolio frames the room in an iframe, in a minimal
  mode — the room and its showcase, nothing else. So the player has an embed
  mode, takes the keyboard when clicked, and lets that one site frame it.

The bricks, in order: **(1)** the map app opens — tiles painted from a
tileset, vault objects placed, drawn back to front by where they stand; saved
as a `map`, replayed, placed in compose. **(2)** Walkable, and events — signs,
warps, the spawn — each edited through a schema (rule 1). **(3)** The player,
point and click: hovered, used, shown — already a showcase. Then M9, the rig,
gives the avatar a body that walks (the author, 2026-10-02). **(4)** An
avatar: a character set, grid movement, the keys, tap to walk. **(5)** Baked
and published: placements drawn at the map's size and cleaned, sheets packed,
a bundle a static site serves, the embed mode. **(6)** Toys: pushed, then
rolled.

*Done when:* the author's room, made of the suite's own objects — a poster
from grid, a fractal on the PC's screen, a particle lamp — walked and used in
the portfolio's iframe, on a phone as on a laptop, with no vault and no
WebGPU. The link: `any → map: a thing in the room`; tilesets and characters
are uses.

*So far:* bricks 1 to 3 of six (`apps/map/STATUS.md`). 2026-09-30: tiles
painted from any set offered as a tileset; things from the vault on cells,
back to front by row, loops playing; a `map` saved, replayed to the pixel,
reopened, placed in compose — the link, `any → map: a thing in the room`.
2026-10-02: walls apart from the tiles, solid things; events on things as
RPG Maker has them — a sign, a warp to a map by its name, the spawn; and
the player, `play/`, point and click — a sign shown, a warp followed.

**M9 — the rig: a character's bones, and its walk.** Chosen by the author on
2026-10-02, from the inbox, to come **between M8's bricks 3 and 4**: by then
the room is a showcase, point and click, and its avatar is the first thing in
the suite that needs a body that walks. Asked first on 2026-09-27 — "armature
or 2d sprites to animate them like in 3d with weight calculation like in
blender" — and completed with a drawing: a slug shaped like a person,
`gam_1790893329227_77f756`, 610 stamps of the brushes' `sprite(9).png` (#9 in
the panel), its body, arms, legs and two long eye stalks each made of layers
of them, so that what moves moves "like scales parts of a reptile".

`apps/rig/`, the **rig**: the field's word for a skeleton and what it moves.
Blender calls the skeleton an *armature* — the sculptor's word for the wire
inside the clay — and so does DragonBones; Spine and Godot say *skeleton*.
Neither means physics, which is laid on top: a *ragdoll*, or springs on a few
bones for what follows a move.

The suite's own way in: **a drawing made of marks is rigged at its marks, not
its pixels.** A gamepad still keeps every stamp in its recipe, in the order
drawn; a pause between two is the pen lifted, so its strokes are found again,
and a stroke drawn from the body out is a limb's line. The slug's are seven —
a body, two stalks, two arms, two legs — each limb drawn from the body to its
tip, its elbows, knee and bends corners in it.

- **A stroke is a chain of bones**, jointed at its corners, hung from the
  part it starts on: proposed from the drawing, corrected by hand.
- **A stamp rides its own stroke's bones**, never the nearest, and stays
  whole: a bend crowds the stamps inside it and fans those outside — the
  scales — where skinning pixels would stretch them. Blended over the few
  stamps either side of a joint, a bend is a fan, not a hinge.
- **Canvas 2D from the marks**: no p5 (rule 8), no mesh, no GPU. The parts
  are drawn in the strokes' order — the limbs over the body, as drawn —
  which the rig may change.

The bricks, in order: **(1)** the rig app opens a gamepad still, finds its
strokes and proposes its bones; a joint dragged bends, the stamps follow.
**(2)** A rig saved — the drawing it rigs and its bones — replayed, reopened,
placed in compose. **(3)** Motion: each bone a wave — a turn, an amplitude, a
phase, whole cycles a loop — the phase lagging down a chain, so a stalk
follows its base and every loop closes; an idle saved as a loop. **(4)** A
walk, and a character: legs against each other, arms against the legs, the
body bobbing twice a step; a back and a side drawn the same way, with the same
bones' names, so one walk drives every view, the left the side mirrored —
saved as a set, `role: 'character'`, its walks by direction, for M8's avatar.

Later, past *Done when*: pictures with no marks — a mesh traced from their
alpha, Blender's automatic weights as heat spread inside the shape, skinning
on the GPU kit, the plan of 2026-09-27; IK; keyframes on core's easing; parts
from the vault; the gamepad as a puppeteer, a performance recorded as it
records a sequence.

*Done when:* the author's slug walks the room in four directions, its stamps
sliding over each other like scales. The links: `gamepad → rig: a drawing's
strokes as limbs`; `rig → map: a character`, a use.

*So far:* brick 1 of four, 2026-10-02 (`apps/rig/STATUS.md`): the slug opens
in the rig as seven strokes and fifteen bones, drawn again from its marks
as it was saved; a joint dragged bends it, the stamps fanning at the joints.

**3D, parked.** It was M5. When it returns it starts from the GPU kit:
ray-marched shapes and 3D fractals are shader work and come first, as a family
of M7; an app with the `model` and `material` types only when the game needs
models.

## Decided before, 2026-09-21 to -23

In `docs/decisions.md`, with their reasoning: the `.skw` smart object,
`sketch-2-print` keeping its gamepad, export as two tools, the loop format,
print resolution as an export concern, 3D as M5 (parked since, 2026-09-26),
the font audit, `render()` staying pure; video as frames plus ffmpeg, M2 done,
replay as a dispatch, framing as one idea, trim measured; M3 done and ckt
ported twice, the UI pass from the author's brief, an object reopening in its
app, and the tailnet. What M4's bricks settled as compose was built, with the
plan it was built to, is in `apps/compose/STATUS.md`.

## Still open

1. ~~**`destra.otf` and `GPDestra-Light.otf`**~~ **Answered 2026-09-23** —
   free, from fonderiz.fr, made by a friend of the author's. What is left is
   naming the licence in the files before they ship. See `docs/fonts.md`.
2. **The online skweeboteque.** Wanted, not now — it needs a server, and it is
   also what turns sandboxing from theory into work. Nothing in the local design
   blocks it; the vault interface is the seam it would go behind.

Closed, their reasoning in `docs/decisions.md`: video output (2026-09-22,
frames plus ffmpeg — no muxer); WebGPU over WebGL2 for the GPU kit, and a GPU
render replaying within a tolerance across machines (both 2026-09-26).

## Migration facts

What the three ancestors measured on 2026-09-20, and what a port must know
first, now live in `docs/migration.md`.

## Where the name came from

`playground` was already doing four jobs on the portfolio: the tagline
("building playground tools for graphics and print"), the bio, a project section
called "Playground projects", and an empty nav slot called "Personal
Playground", plus a tier of done in `methodology.md`. The suite fills that empty
slot; it should not also be named after the category. Hence **skweeb**, and
`.skw` for the process object.
