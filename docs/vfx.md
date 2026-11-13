# Effects — a game's VFX, made in skweeb (M15, taken up 2026-11-13)

The author, 2026-11-13: "une zone de créations qui s'intégrerai dans la
suite skweeb qui permettrai de comprendre et créer des vfx de jeux ? je
pense qu'il manque une app de shader à la suite mais je ne comprends pas
encore bien comment créer des shaders, comment ils s'empilent ensuite pour
être utilisé en jeu, est-ce qu'il se lie aussi avec des objets du jeu
comme des particules etc, utilisent aussi ce qu'on a déjà en place".

And the plan read, the same day: "la suite contient déjà des apps comme rig,
map, garden qui sont des morceaux encore à approfondir mais qui on des
bases de comportement pour un jeu en ligne, issu des objets créer dans la
suite. donc un objectif serai de composé des avatars, des maps, des objets
et maintenant des vfx grace a la suite, une forme d'éditeur graphique et de
composant de jeux et de jeu intégralement. les recommandations sont bonnes,
on peut suivre le plan." So the game is the suite's own, and M15 was taken
up the day it was proposed; M15a landed that day.

It is a plan and a lesson at once: each brick is
one idea of how a game's effect is made, in the order they are learnt, and
leaves something a game can use that day. The roadmap's aim since
2026-09-26 — "the suite is to make the assets of a small game" — is where
it comes from.

## What a game's effect is

An explosion is not one thing. It is five or six **layers** drawn over each
other for half a second — a flash, fire, smoke, sparks, a ring — and each
layer is three things:

- a **carrier** — where it is, when, how big: a particle system's sprites
  most often, or one sheet, a ribbon, a mesh;
- a **surface** — what each of those shows: a shader, a small function the
  GPU runs for every pixel — *where am I, when is it → which colour*;
- a **blend** — how it meets what is behind: added for light (fire, sparks,
  magic), laid over for matter (smoke, dust).

**How a shader is made.** Computed, not drawn, from a handful of moves every
effect repeats: a *noise*; the noise *scrolled* in time; two noises
*multiplied*, so the motion never repeats; one *warping* where another is
read; a *mask* giving it a shape; a threshold that *erodes* it — a dissolve;
a gradient that *colours* its greys. Fire, smoke, water, energy are those
seven in different amounts.

**How shaders stack.** In three places, and they are three different stacks:

1. *inside one surface* — the moves above, one after the other: a chain;
2. *in the scene* — the layers, drawn back to front, each by its blend;
3. *on the screen* — once all is drawn: a glow, a heat haze, a grade.

**How a surface meets a particle.** The particle system hands each
particle's numbers to its shader — its age above all, a random, a colour —
and the shader reads them: the dissolve's threshold *is* the age, so each
particle dissolves on its own clock. A game's own values come in the same
way: a hit, a health, a place. The cheap form, most 2D games': the surface
drawn once at every age, as frames — a flipbook — each particle showing the
frame of its age.

The other half of a shader, the vertex stage — where each corner goes — is
in the suite under other names: particles' motion, the 3D app's modifiers,
the rig's bones. M15 is the pixel's half.

An engine's words for all this, to search by: *material*; *billboard*;
*panning* (a scroll); *distortion*, *flow map*; *erosion*, *dissolve*;
*ramp*, *LUT*; *flipbook*, *SubUV*; *additive*; *bloom*; *custom data*
(Unity), *dynamic parameter* (Unreal), `INSTANCE_CUSTOM` (Godot).

## In skweeb: what is there, what is missing

| a game's effect | in skweeb today | missing |
|---|---|---|
| a surface | a pass of the GPU kit, `fx(uv)` in WGSL (`core/gpu/wgsl.js`): filter's twenty-nine, fractals' escape time | **generators** — a pass that makes a picture: there since M15a |
| its moves | `gradientmap` and `palette` colour; `threshold`; noise, scroll, multiply, mask (M15a); `warp`, `dissolve`, `polar` (M15d) | — |
| a carrier | particles, a function of slot and age; the 3D app's cloud and models | — |
| carrier → surface | a particle keeps one sprite all its life (`images[floor(pick × n)]`) | **the frame of its age** |
| layers, blended | `core/blend.js` — *add* is `plus-lighter`; an object's layers (L13); compose | a layer's start in the effect — S13's lanes |
| the screen after | filter's chain; a look over a placement; `glow`, `warp` (M15d) | — |
| out to a game | a sprite sheet Phaser 3 loads (`check-sheet-engine`) | an effect's layers as one bundle |
| the game asking | the map's events, its player | an event that plays an effect |

So the suite is most of the way: the stack inside a surface is the kit's
chain, the stack in the scene is blends and layers, the stack on the screen
is a look. What it has never had is a picture made from nothing, in time.

## The app — `apps/shader/`

A surface from nothing: filter's chain, begun by a generator.

- **A generator is a filter that makes its picture** and says how it meets
  what is under it — `blend`: replace, multiply, add, screen, mask. So a chain
  stays what the kit runs today, `[{ id, params }]` in order, and "two
  noises multiplied, masked by a disc, dissolved, coloured" is five rows —
  no graph of nodes. In the catalogue, a group of their own: filter's menu
  has them too, a noise multiplied over a photograph.
- **Every row shows the picture as it stands there** — the chain cut at
  that row. That is the lesson: the grey noise, the noise moving, masked,
  eroded, in colour. A row clicked is seen large.
- **In time, two ways**, the player's: a *loop*, which closes — a generator
  scrolls a whole number of its tiles in it, and its noise has a period; or
  a *life*, played once, frame 0 its birth and the last its death — what a
  particle wears. A `dissolve` runs its threshold between two values over
  either, on `core/easing.js`.
- **It saves** a still or a loop, its chain its recipe, its seed the
  object's (rule 2); replayed by its `rebuild.js` at any scale and printed
  in tiles as filter's are — `frame.origin` already tells a pass where it
  lies in the whole.
- **A guide and starters**: `docs/guides/vfx.md`, a section a brick; and a
  few chains to open — fire, smoke, energy, a dissolve — each a row of data.
- **WebGPU only**, as filter and fractals: elsewhere its objects show as
  their saved renders (rule 7); the laptop's Intel wants Chrome's flags.
- **Rule 5**: every generator and filter written here from the technique,
  never from code — `source: 'skweeb'`, MIT. LYGIA and Shadertoy's
  unlicensed code stay out. Noise is `core/noise.js`'s, its twin in WGSL.

## The bricks

A session or two each. *Done when*, M15: an explosion — a flash, fire
eroding as it ages, smoke, a ring — made of the suite's own objects, loaded
by Phaser 3 from its sheets, and played in the map's player on a click.
The link it leaves: **`shader → particles: a surface over a life`**.

| | brick | branch | size | done when |
|---|---|---|---|---|
| M15a | **generators in the kit**: `noise` (seeded, with a period, octaves), `gradient` (along, round, about), `shape` (a disc, a ring, a star — a distance), each blended, the first two scrolled | `gpu/generators` | M | **landed 2026-11-13** — below |
| M15b | **the app opens**: the chain, every row its picture, the loop played; the starters; the guide's first pages | `shader/app` | M | **landed 2026-11-13** — `apps/shader/STATUS.md`; `check-shader`: fire from its starter, each row's picture the chain cut there |
| M15c | **it saves**: a still, a loop; replayed, reopened, printed, placed in compose | `shader/save` | S | **landed 2026-11-13** — `check-shader-save`: saved and replayed to the pixel, `?open=`, a print in tiles against the whole |
| M15d | **a life, and the moves that want one**: `dissolve` (a threshold over the life, a soft edge, a hot rim), `warp` (what is under, read through a noise), `polar` (rings, vortices), `glow` (the bright spread and added) | `shader/life` | M | **landed 2026-11-13** — `check-filters`: each against what it does; a dissolve whole at birth, gone at death; `check-shader`: a life played once |
| M15e | **the link**: a life offered to particles as sprites; a particle shows the frame of its age | `particles/life-frames` | S | `check-particles`: at half its life, the middle frame; saved, replayed, on its sheet |
| M15f | **an effect out to a game**: its layers — each its sheet, its blend, its start — and one manifest | `export/effect` | M | Phaser 3 plays it, its fire added, as `check-sheet-engine` plays a sheet |
| M15g | **an effect in the suite's game**: a thing's event plays one at its cell | `map/effects` | S | `check-map-play`: a click, the effect once, then gone |

a to c are the shader app, and a alone already gives a game its tiles of
noise. d and e are where it becomes effects. f and g wait on the choices
below.

What each brick reads first, found while planning:

- **b, c** — the `skweeb-app` skill; fractals, the one app that already
  draws over a blank picture through the kit (`{ filter, params }`). A
  blank picture is a canvas whose 2D context has been got: the GPU's queue
  refuses one that has none — found drawing M15a's first sheet.
- **e** — particles take a *set* as sprites (`core/uses.js`); whether a
  loop is offered as it is or as a set of its frames is
  `docs/object-model.md`'s, *Uses*. Particles stay Canvas 2D.
- **f** — compose places in time already (a flipbook); a layer's start in
  an effect is S13's lanes, which wait on the author.

## The generators — M15a, landed 2026-11-13

`noise`, `gradient` and `shape`, in the catalogue (`core/gpu/filters/`,
`generates: true`), so filter's add menu has them today: any picture as the
source, *+ noise*, and it is replaced by a tile of noise; a second noise,
its `variant` 1 and its blend *multiply*; a `shape`, its blend *mask*; a
`gradientmap` to colour it. Over a loop, a scroll of 1 is one tile across in
the loop's length, and the loop still closes.

- **A grey at every pixel, and a blend** — `filters/meet.js`: replace,
  multiply, mask, add, screen, and `amount`. *Generator* and not *source*,
  this plan's first word: filter's source is the picture a chain runs over,
  and a filter's `source` where its code came from.
- **Nothing in pixels**: cells, repeats and sizes are counted across the
  picture, in units of its shorter side — a print scale changes nothing,
  and a window of a picture is its part of the whole (`check-filters`).
- **A run is told its loop's length** — `run(…, { tick, frames })`, handed
  on by filter, a look and a print's windows; `phaseOf(info)` is the tick
  over it. What scrolls moves by whole tiles, or whole repeats, and comes
  round; told no length, it holds still.
- **Noise is `core/noise.js`'s `noiseTile2`** — Perlin's improved noise on
  a lattice that wraps — and `tileNoise` its twin in WGSL; `noiseAt` is the
  whole pass in JS. `tests/gpu-filters.mjs` holds the tile and the loop
  without a GPU; `check-filters` the GPU's grey to the JS one, within 1 of
  255 at every pixel. `TILE_NOISE` is exported for M15d's `warp`.
- **Left for later**: a noise that boils in place (a third axis, looped), a
  gradient's own colours, a shape drawn in the gamepad as the mask — a
  picture from the vault in a chain needs a third texture, which no pass has.

## Not now

- **A graph of nodes.** Another UI and another recipe; the chain first, a
  graph if the chain binds.
- **Particles on the GPU**, each with its age in the shader: when a count
  asks for it. The frames of a life are what a sheet carries anyway.
- **The shader's code out.** A shader does not travel: each engine has its
  language. Tiles, ramps and sheets do, to every engine.
- **Surfaces on meshes** — a ring, a shield, a slash: a scroll along a
  model's UVs, a rim. The 3D app's, a link of M10 later.
- **What is behind, bent** — refraction, a shockwave: a pass that reads the
  layers under it, which no pass does today.

## Settled, 2026-11-13

The six choices this plan ended on, each as recommended — "les
recommandations sont bonnes" (`docs/decisions.md`).

1. **Its name**: `apps/shader/`, the author's word.
2. **A chain, not nodes.**
3. **Frames of a life, not a shader per particle.**
4. **An effect is a compose page played once**: nothing new in the object
   model.
5. **M15 now**: a brick after the other, before S9i on the board.
6. **The game's engine is the suite**: the map's player, a page that can
   run the kit itself. So g comes before f, f waits for a game made
   elsewhere, and no engine's language is owed.
