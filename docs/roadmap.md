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
particles' Look is its sprites, offered through `core/uses.js`.

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

**3D, parked.** It was M5. When it returns it starts from the GPU kit:
ray-marched shapes and 3D fractals are shader work and come first, as a family
of M7; an app with the `model` and `material` types only when the game needs
models.

## The page, and what print resolution actually means

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

## Decided before, 2026-09-21 to -23

In `docs/decisions.md`, with their reasoning: the `.skw` smart object,
`sketch-2-print` keeping its gamepad, export as two tools, the loop format,
print resolution as an export concern, 3D as M5 (parked since, 2026-09-26),
the font audit, `render()` staying pure; video as frames plus ffmpeg, M2 done,
replay as a dispatch, framing as one idea, trim measured; M3 done and ckt
ported twice, the UI pass from the author's brief, an object reopening in its
app, and the tailnet.

## Decided since, 2026-09-24

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

## Still open

1. ~~**`destra.otf` and `GPDestra-Light.otf`**~~ **Answered 2026-09-23** —
   free, from fonderiz.fr, made by a friend of the author's. What is left is
   naming the licence in the files before they ship. See `docs/fonts.md`.
2. **The online skweeboteque.** Wanted, not now — it needs a server, and it is
   also what turns sandboxing from theory into work. Nothing in the local design
   blocks it; the vault interface is the seam it would go behind.
3. ~~**Video output.**~~ **Closed 2026-09-22** — the answer is frames plus
   ffmpeg. See `docs/decisions.md`. It was open for three sessions on the
   assumption that a sequence object needed a playable file inside the browser;
   it does not, and the muxer that would have provided one is now work that
   will not be done.
4. ~~**WebGPU or WebGL2, for the GPU kit.**~~ **Closed 2026-09-26: WebGPU**,
   the author's call, with nothing cut for a machine without it — there the
   apps still open and GPU objects show as their renders (`docs/core-api.md`,
   *gpu/*). The author's smallest PC, an Intel gen-9, had WebGPU off for its
   GPU until Chrome's WebGPU flags turned it on. What decided it: a probe on 2026-09-26 on the
   author's machine (Chrome 154, a Radeon RX 7600), in headless Chrome as the
   checks run it: both work with no flags, and both hand a frame to Canvas 2D in the same
   call, which `frame(i)` needs. WebGPU adds compute with atomics — flame
   accumulation, histograms, sorting particles — one device for any number of
   canvases, and it is where 3D is going; it needs a real GPU (with the GPU
   off, no adapter) and a WebGPU browser on every machine that opens the apps,
   and every GLSL source is translated as it is ported. WebGL2 runs anywhere,
   in software too, and takes the GLSL literature almost as it is; it has no
   compute and gets no new features.
5. ~~**A GPU render replays within a tolerance across machines**~~ **Closed
   2026-09-26: yes**, the author's call — "totally ok with a bit of difference
   between two machines". On the machine that made it, it replays the same
   until a driver or the browser changes; the recipe stays the truth, and a
   check compares with a tolerance (`docs/object-model.md`, *The recipe
   contract*).

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
