# Roadmap, open decisions, and what the ancestors taught

## Milestones

Done milestones keep what they were and what proved them; how they were
built is in their apps' `STATUS.md`, and why in `docs/decisions.md`.

**M1 — core + gamepad moved in.** `core/` extracted while porting the app it
came from, so the kit was shaped by use, not guesswork. *Done when:* a loop
drawn and recorded lands in `vault/` with its recipe, its thumbnail and its
seed, from `skweeb/` and not from `sketch-2-print/` — done.

**M2 — grid v2 on core.** The 700-line sketch rewritten onto the kit: the
honest test of a core extracted from the gamepad. *Done when:* any vault
object is dithered and saved back with its source as its parent — **done
2026-09-22**.

**M3 — ckt v3.** Text, grid, dots, sprites, motion; no Matter, and no
`opencv.js` — datasets are cut in the browser by `apps/ckt/blobs.js`. *Done
when:* ckt regenerates a family like `Garam_blue` — letterforms with a
pattern on them, emitted as a `set` the gamepad loads as a brush family —
running itself and keeping its lineage: **done 2026-09-23**.

**M4 — compose: the fourth app, and the master render.** An app where objects
from every process are placed, timed, previewed live and rendered out — and
**where a finished output is made**: export in the other apps is demoted to a
shortcut for producing an asset, and anything with more than one element in
it goes through compose. *Done when:* a sheet of objects from three apps, one
of them moving, previews live, renders at print scale, and one object has a
URL you can send — **done 2026-09-24**, in five bricks
(`apps/compose/STATUS.md`). What it cost — video as frames plus ffmpeg, a
pin named `version` apart from time's `at`, `render()` made real — is in the
decisions of 2026-09-22 and `docs/object-model.md`.

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
their rebuild.js, the producer declaring the link. M9 `gamepad → rig: a
drawing's strokes as limbs` — **done, 2026-10-02**: the vault offers a
gamepad still to the rig, *Rig this ↗*.

The next three were chosen by the author on 2026-09-26, with 3D parked: the
suite is to make the assets of a small game — 2D first, fake 3D where it helps,
real 3D later. Each stands on one new piece of core, the GPU kit.

**M5 — filters, and the GPU kit under them.** The fifth process, and the test
M5 was always meant to be: a new app should cost a folder, a schema and three
functions. Under it, a kit in `core/gpu/` that M6, M7 and M10 stand on too:
one WebGPU device for the page, however many objects are on it; filters of
several passes, on textures used in turns; a filter as data — an id, a
schema, its shader, its passes — and seeded noise, the same function in WGSL
and in JS (rule 2).

The app stacks filters on any object, each a drawer from its schema, and
saves with the source as its parent and `{ source, chain }` as its recipe; a
filter's sizes are in the source's pixels, so print scale draws it again. A
chain saved alone is a **look**, a `params` object compose lays over a
placement.

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

*So far:* *Done when* met 2026-09-26, in four bricks
(`apps/filter/STATUS.md`). M5 stays open for the big catalogue the author
asked for: twenty-nine filters — eighteen from p5.FIP, one from glfx.js,
grain and glitch from a seed, and the game-asset group begun with an
outline, a drop shadow and palette lock. Frames by hand came first, a
flipbook in compose (2026-09-27); then the author chose M6 over the rest of
the catalogue, and motion and time filters are parked, not dropped.

**M6 — particles.** A particle is a function of its spawn slot and its age,
not a step in one shared simulation: so any frame renders on its own, a loop
whose emission repeats with its period closes exactly, and a frame draws
again at any size. Particles that interact — flocking, collisions — break
all three, and wait for a mode that caches. *Done when:* a torch loop that
closes, drawn with a vault set's sprites and scrubbed to any frame, and a
one-shot burst, both leave as sprite sheets a game engine loads — **done
2026-09-27**, in seven bricks (`apps/particles/STATUS.md`), Phaser 3 loading
the torch's sheet (`check-sheet-engine`). The link: `set → particles:
sprites`, a use. Open still: colour over life.

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

*So far:* *Done when* met 2026-09-30 (`apps/fractals/STATUS.md`): the
Mandelbrot set and its Julia sets in one WGSL pass, held to doubles; a
sprite copying itself, the point families begun ahead of order; loops of the
ramp once round or a Julia `c` round a circle; escape time's slope a field
for particles. It stays open for the rest of its bricks: a Julia set by
clicking the Mandelbrot set, more families, deeper zoom.

**Across M5–M7, for the game.** Four things serve every app rather than one:

- **sprite-sheet export** for any loop, with an Aseprite-style JSON — done
  with M6 (`core/spritesheet.js`);
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

**M9 — the rig: bones, walks, and worms.** Chosen by the author on
2026-10-02, from the inbox, to come **between M8's bricks 3 and 4**: the
avatar is the first thing in the suite that needs a body that walks. Asked
on 2026-09-27 — "armature or 2d sprites to animate them like in 3d with
weight calculation like in blender" — and completed with a drawing: a slug
shaped like a person, `gam_1790893329227_77f756`, 610 stamps of the brushes'
`sprite(9).png` (#9 in the panel), its parts layers of them, to move "like
scales parts of a reptile". The same day, after trying it, the author's
direction: few human shapes for now, and **many slugs and worms**, crawling
round paths and undulating (`docs/decisions.md`).

`apps/rig/`, the **rig**: the field's word for a skeleton and what it moves —
Blender's *armature*, Spine's and Godot's *skeleton*; physics would be laid
on top. The suite's own way in: **a drawing made of marks is rigged at its
marks, not its pixels.** A gamepad still keeps every stamp in the order
drawn; where the brush jumped the pen was lifted, so its strokes are found
again, and a stroke drawn from the body out is a limb's line. A stroke is a
chain of bones, jointed at its corners; a stamp rides its own stroke's bones
and stays whole, so a bend fans the stamps like scales, where skinning
pixels would stretch them. Canvas 2D from the marks: no p5, no mesh, no GPU.

The bricks: **(1)** a gamepad still opened, its bones proposed, a joint
dragged. **(2)** A pose saved, drawn again at any scale; `?open=`; placed.
**(3)** Motion: a wave a bone, the phase lagging down a chain so a stalk
follows its base, every loop closing. **(4)** Parts and presets: each chain
named — body, head, arm, leg, tail — guessed from how it hangs, corrected by
hand; a walk, a waddle, an idle set by part, and a rise, so one walk drives
any drawing named the same. **(5)** Crawling, for worms: the body's stroke a
spine, a wave running down it in place, or the body following its head round
a path — a circle, an ellipse, an eight, or a stroke drawn in the gamepad —
slithering through wiggles laid on the ground. **(6)** Views and a character:
a back and a side drawn as the front, named the same, the left the side
mirrored — a set, `role: 'character'`, walks by direction, for M8's avatar.

Later, past *Done when*: pictures with no marks — a mesh from their alpha,
Blender's heat weights, skinning on the GPU kit; IK; keyframes on core's
easing; the gamepad as a puppeteer.

*Done when:* the author's slug walks the room in four directions, and worms
crawl about it on their paths, their stamps sliding like scales. The links:
`gamepad → rig: a drawing's strokes as limbs`; `rig → map: a character`.

*So far:* bricks 1 to 5 of six, 2026-10-02 (`apps/rig/STATUS.md`). The slug
is seven strokes and fifteen bones, its chains named rightly by guess; it
walks, waddles, idles; a snake undulates in place and slithers round a path;
every loop closes. Brick 6 waits on the author's views.

**M10 — 3D: meshes, from primitives up.** Chosen by the author on
2026-10-06, while M9's last brick waits on the slug's views: "a simple thing
to generate and manipulate some real basic primitives". Meshes, not the
ray-marched distance fields planned when 3D was parked, for what meshes open
(`docs/decisions.md`, 2026-10-06); distance fields can come back as a family
of M7, or as one more way to make a mesh.

**A model is an object like any other.** `model`, the type deferred since
2026-09-21, is what a model is made of: each shape a primitive, its params,
a transform, a colour; the camera and the light. Never its vertices — the
params make them again — so a frame draws on its own at any size, and a
print is drawn again, not enlarged. Compose places a model, a map stands one
in the room, filter takes its picture; its stills and loops are `still` and
`sequence`, the model their parent. `material` stays deferred: a colour is a
shape's param until two models share one.

three.js draws it (the author, 2026-10-06), in `apps/3d/`: its WebGPU
renderer on the page's one GPU device, WebGL2 where there is none, a
picture handed back in the call as the kit does; the recipe stays the
suite's data, never three's. The game's player stays
Canvas 2D: what 3D makes is baked into frames, as all the GPU makes is.

The bricks: **(1)** the app opens — box, sphere, cylinder, cone, torus,
plane and capsule added from a menu, each a drawer from its schema; an orbit
camera, one light, flat or smooth; a `model` saved, replayed, drawn again at
print scale, placed in compose. **(2)** Handled in the view: picked by a
click, moved, turned and scaled by handles, duplicated, deleted.
**(3)** Modifiers on a shape, in order: subdivide, displace by seeded noise,
twist, bend, mirror, array. **(4)** A look: toon shading on a ramp, shadows,
an outline. **(5)** Motion: a turntable, or a transform swung as the rig
swings a bone, every loop closing. **(6)** For the game: a model drawn from
four or eight sides, a set by direction, `role: 'character'`.

Then, each a link of its own: a gamepad stroke turned on a lathe or swept as
a tube; type extruded from the suite's fonts; a fractal or a dither as a
height field; OBJ and glTF out, and in — a mesh from outside keeping its
file in `source/`, as a font does.

*Done when:* a model of primitives, modified, lit and turning in a loop that
closes, is saved, drawn again at print scale, placed in compose and stood in
the room; and drawn from four sides as a set M8's avatar could wear. The
link: `model → map: a character from every side`.

*So far:* bricks 1 to 4 of six, 2026-10-06 (`apps/3d/STATUS.md`). Seven
of three's primitives, each a card from its schema in core's cards — the
list filter's chain moved into for it; an orbit view by hand, perspective or
orthographic; one sun and a fill. three r186 draws on the page's GPU
device, WebGL2 where there is none; a `model` saves, replays to the pixel,
is drawn again at scale 2, reopens, and compose places it. A click chooses
a shape, its card the one open; three's handles move, turn, size and
stretch it by axis, writing into its card; D duplicates it, Delete takes it
out. Each shape has a stack of modifiers in its card — subdivide, displace
by seeded noise, twist, bend, mirror, array — the normals carried by the
deformation, nothing cracking. And a style: toon bands, an outline, shadows
on a catcher of their own — the same picture at any print scale. A print
at a sheet's size and a dpi, in tiles: the 120×176 poster at 300 dpi — and
the same day the print moved into core, for every app: each handle draws a
window of its frame, a gamepad still is drawn again from its marks
(`docs/core-export.md`).

**M11 — the live stack, and smart objects.** The author's, 2026-10-06,
after a week of making things with the suite: "we really need the smart
objects and a new 'layer' system" — to try a filter over the composition it
will join, and to take a particle effect into filter without "a new tab,
then paste url and load from vault". After bgstaal's multipleWindow3dScene:
every app its own window, the windows one stack, each drawing it round its
own layer, with opacity and blend, live within one browser
(`docs/smart-objects.md`).

The bricks: **(0)** the spec — the `skw` out of the object model, at its
cap; the live stack and a placement's `opacity` and `blend` written in.
**(1)** Windows that know each other: each says who it is and what it has
on screen, its layer, over one channel; a Stack drawer in every app lists
the windows open. **(2)** The stack: one live composition the windows share
— a layer from a window or the vault added, hidden, moved up or down,
placed, its opacity and blend set, from any window. **(3)** Drawn in every
viewer: the layers under and over each app's own canvas, composited by the
browser as a save composites them; filter first. **(4)** *Send to ▸*: what
is on screen as another app's source — filter, grid, compose, rig — its
window found or opened, live as the first app changes. **(5)** Smart
objects: a `skw` saved, versioned, placed by reference, and every page
holding it drawn again when it changes; a live layer saved as one when what
holds it is saved. **(6)** Compose edits the stack: its page the live stack,
opacity and blend on every placement, saved as a page of smart objects,
printed and exported as it shows.

*Done when:* a particle loop sent to filter with no tab or URL, its look
tried live over a composition in the window behind, at an opacity and a
blend, and the three saved as a page of smart objects that follows when the
particles are changed and saved again. The link: `every app → every app: a
live layer`.

Later: a window as a lens — where it sits on the screen, the part of the
stack under it, bgstaal's own trick.

*So far:* bricks 0 to 5. Every app shares one stack and draws it round its
canvas; *Send to ▸ filter* follows another window; saved, it is a smart
object, versioned, drawn again wherever it is held.

## Decided before, 2026-09-21 to -23

In `docs/decisions-2026-09-21-to-23.md`, with their reasoning: the `.skw`
smart object, `sketch-2-print` keeping its gamepad, export as two tools, the
loop format, print resolution as an export concern, 3D as M5 (parked
2026-09-26, back as M10 on 2026-10-06), the font audit, `render()` staying
pure, and the name; video as frames plus ffmpeg, M2 done,
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
Closed, their reasoning by date in the decisions: video output (2026-09-22,
frames plus ffmpeg — no muxer); WebGPU over WebGL2 for the GPU kit, and a GPU
render replaying within a tolerance across machines (both 2026-09-26); M10's
renderer, three.js, and its app, `apps/3d/` (2026-10-06).

## Migration facts

What the three ancestors measured on 2026-09-20, and what a port must know
first, now live in `docs/migration.md`. Where the name came from is with the
first days' decisions, `docs/decisions-2026-09-21-to-23.md`.
