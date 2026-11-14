# Writing shaders — the code side

How a shader is written in skweeb, and where each kind of new feature goes.
`docs/guides/vfx.md` is how to *use* the shader app; `docs/vfx.md` is the
plan and what was settled. This file is for the day you open an editor.

The three filters written out below — `tint`, `polka`, `fade` — are not in
the catalogue: they are worked examples, compiled and run on the GPU the day
this was written (2026-11-14), so each can be pasted as it stands.

## 1. Where a shader lives

**There is no shader code in `apps/shader/`.** A shader here is a *filter*
of the GPU kit's catalogue, and the app only lines filters up:

```
recipe { seed, frames, fps, time, format…, chain: [{ id, params, on }] }
   │  apps/shader/frames.js   drawSurface(runner, blank, recipe, tick, px)
   ▼
runner.run(blank, chain, { scale, seed, tick, frames, life })    core/gpu/runner.js
   │  for each row of the chain, for each pass of its filter:
   │     one triangle over the picture, your  fx(uv)  run at every pixel
   │     → an rgba16float texture, the next pass's `src`
   ▼
an ImageBitmap — the viewer, a row's small picture, a save, a print
```

| File | What it is |
|---|---|
| `core/gpu/filters/<id>.js` | **one filter: its params, its WGSL** — what you write |
| `core/gpu/filters/index.js` | the catalogue, a manifest (rule 3): listed here, it exists |
| `core/gpu/wgsl.js` | the prelude every pass is written against |
| `core/gpu/filters/meet.js` | a generator's blends; the loop's phase, a life's age |
| `core/gpu/runner.js` | compiles a chain, runs it, hands back a picture |
| `core/gpu/window.js` | a part of a chain's picture, for a print past any canvas |
| `apps/shader/params.js` | the app's own schema: seed, loop or life, frames, fps, format |
| `apps/shader/frames.js` | a recipe as frames — the one code the preview, a save and a replay run |
| `apps/shader/starters.js` | fire, smoke, energy, the burst: chains as data |
| `apps/shader/rows.js`, `main.js` | the cards with their pictures; the app assembled |
| `apps/shader/save.js`, `rebuild.js` | into the vault; replayed from it |

So one file in `core/gpu/filters/` and two lines in `index.js` give a new
row to the shader app's add menu, to filter's, to a look over a placement
in compose, and to every starter — with its panel, its place in the recipe
and its replay, all generated from its schema (rule 1).

## 2. A pass: what you write, what you are given

A filter is data. Its `passes` run in order; each is a piece of WGSL that
defines one function:

```wgsl
fn fx(uv: vec2f) -> vec4f      // where am I → which colour
```

`uv` is the pixel's place in the picture, (0, 0) at the **top left**,
(1, 1) at the bottom right — y runs down. What comes back is the pixel's
colour, **premultiplied** (rgb already multiplied by alpha, as a canvas
holds it). Between passes the picture is float, so light past 1 survives.

The prelude (`core/gpu/wgsl.js`) is put before every pass:

| Name | What it is |
|---|---|
| `frame.size`, `frame.texel` | the picture in pixels, and one pixel in uv (1 / size) |
| `frame.scale` | pixels drawn per pixel of the format — section 7 |
| `frame.seed`, `frame.tick` | the recipe's seed, the frame of the loop (`u32`) |
| `frame.time` | seconds, `tick / fps` — a loop does not close on it: section 5 |
| `tex(uv)` | the picture so far, sampled smoothly at any uv |
| `texAt(px)` | one exact pixel of it, `px` a `vec2i`: `vec2i(uv * frame.size)` |
| `origAt(px)` | one pixel of the filter's own input — section 8 |
| `unpremul(c)`, `premul(c)` | out of premultiplied alpha, and back |
| `luma(rgb)` | brightness, Rec. 709 |
| `oklab(rgb)` | a colour where distance is how different two colours look |
| `rand(px)`, `randAt(px, salt)` | a seeded number in [0, 1] for a pixel — section 6 |
| `pcg(n)` | the hash under them, `u32 → u32` |

Two habits follow. A **colour change** unpremultiplies first and
premultiplies last, or a sprite's soft edge goes dark. A **blur**, or
anything that averages neighbours, stays premultiplied, so a clear
neighbour adds nothing.

### Params: the panel's values, as numbers

A pass that takes values declares `struct Params` and reads `params.x`.
Its `uniforms(values, info)` returns the numbers, **in the order the fields
are declared**:

- every field is an `f32` — a bool is 0 or 1 (`> 0.5` in WGSL), an enum
  the index of its option, a colour three fields, an angle turned to
  radians in JS;
- a list (a palette) is one `array<vec4f, N>`, the **last** field, after a
  multiple of four `f32` — pad with `pad0`, `pad1` (`palette.js`);
- `values` are already coerced to the schema: in range, the default where
  missing. `info` is the run: `{ width, height, scale, time, seed, tick,
  frames, life }`.

The schema's types are core's (`core/params.js`): `range`, `int`, `bool`,
`enum` (`display: 'chips'` for a short list), `color`, `color[]`;
`easeParam()` from `core/easing.js` for a curve.

## 3. A first filter: `tint`

`core/gpu/filters/tint.js` — a file's head says what it does and where its
code came from, which rule 5 asks of every shader:

```js
/**
 * tint — every colour multiplied by one colour.
 *
 * Written for skweeb: the textbook formula, no outside code.
 */

const rgb = hex => [1, 3, 5].map(i => parseInt(String(hex || '#000000').slice(i, i + 2), 16) / 255 || 0);

export default {
  id: 'tint',
  label: 'tint',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    colour: { type: 'color', default: '#ff8a00', label: 'colour' },
    amount: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { r: f32, g: f32, b: f32, amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let tinted = c.rgb * vec3f(params.r, params.g, params.b);
  return premul(vec4f(mix(c.rgb, tinted, params.amount), c.a));
}`,
    uniforms: v => [...rgb(v.colour), v.amount],
  }],
};
```

Then list it, in `core/gpu/filters/index.js` — the import, and its place in
`FILTERS`, whose order is the add menu's:

```js
import tint from './tint.js';
…
  brightness, contrast, saturation, tint, invert, …
```

And look:

```sh
node tests/gpu-filters.mjs      # no GPU: its licence, its schema, Params against uniforms()
node server.js                  # http://127.0.0.1:3000/apps/shader/ → add a row… → tint
```

The server sends nothing cached: save the file, reload the page. A pass
that does not compile is named in the bar — `gpu: tint.0 does not compile —
line 4: …`, the line counted in the pass's own code — and the rest of the
app stays up.

## 4. A generator: `polka`

A **generator** makes its picture instead of changing one: a grey `v` in
[0, 1] at every pixel, handed to `meet()` with the picture under it. That
is the whole contract (`meet.js`): `generates: true`, the schema ending
with `...MEET_PARAMS`, `Params` ending with `blend: f32, amount: f32`, the
uniforms ending with `...meetUniforms(v)`.

```js
import { MEET, MEET_PARAMS, meetUniforms, phaseOf } from './meet.js';

export default {
  id: 'polka',
  label: 'polka dots',
  source: 'skweeb',
  licence: 'MIT',
  generates: true,
  params: {
    cells:   { type: 'int', min: 1, max: 64, default: 8, label: 'cells across' },
    size:    { type: 'range', min: 0, max: 1, step: 0.01, default: 0.6, label: 'size' },
    soft:    { type: 'range', min: 0.01, max: 1, step: 0.01, default: 0.2, label: 'soft edge' },
    scrollX: { type: 'int', min: -8, max: 8, default: 0, label: 'scroll right, tiles a loop' },
    scrollY: { type: 'int', min: -8, max: 8, default: 0, label: 'scroll down' },
    ...MEET_PARAMS,
  },
  passes: [{
    code: MEET + /* wgsl */ `
struct Params { cells: f32, size: f32, soft: f32, scrollX: f32, scrollY: f32, phase: f32, blend: f32, amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  // A whole number of cells across, the nearest whole number down: the picture is a tile.
  let across = max(1.0, params.cells);
  let down = max(1.0, floor(across * frame.size.y / frame.size.x + 0.5));
  let at = uv - vec2f(params.scrollX, params.scrollY) * params.phase;
  let d = length(fract(at * vec2f(across, down)) - vec2f(0.5)) * 2.0;
  let v = 1.0 - smoothstep(params.size * (1.0 - params.soft), params.size, d);
  return meet(tex(uv), v, params.blend, params.amount);
}`,
    uniforms: (v, info) => [v.cells, v.size, v.soft, v.scrollX, v.scrollY, phaseOf(info), ...meetUniforms(v)],
  }],
};
```

Three things in it are the suite's rules for a generator, not style:

- **Nothing in pixels.** Cells are counted across the picture, sizes in
  units of a cell or of the picture's shorter side. Then a row's 96-pixel
  picture, the viewer and a print at 300 dpi are the same surface.
- **It is a tile.** A whole number of cells each way, so the left edge
  meets the right.
- **Its scroll is an `int`, times the phase** — next section.

WGSL is concatenated as strings: `MEET + …` brings `meet()` in, as
`TILE_NOISE` (`noise.js`) brings `tileNoise(p, period, salt)` to `warp.js`.
A function several filters need is exported from the one that owns it.

## 5. Time: a loop that closes, a life played once

A run is told its frame and the loop's length; `meet.js` turns them into
the two numbers a pass moves by, computed in `uniforms` and passed as a
field:

| | in a loop | in a life | a still |
|---|---|---|---|
| `phaseOf(info)` | 0 → just under 1, then round again | the same | 0 |
| `ageOf(info)` | the phase | **0 at the first frame, 1 at the last** | 0 |

**What scrolls** moves by `scroll * phase` with `scroll` an `int` of the
schema: a whole number of tiles in a loop, so the last frame leads into the
first. A `range` there, or `frame.time`, and the loop jumps where it closes.

**What happens once** runs over the age. All of a fade:

```js
import { ageOf } from './meet.js';

export default {
  id: 'fade',
  label: 'fade',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    from: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'at birth' },
    to:   { type: 'range', min: 0, max: 1, step: 0.01, default: 0, label: 'at death' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { alpha: f32 }
fn fx(uv: vec2f) -> vec4f {
  return tex(uv) * params.alpha;
}`,
    uniforms: (v, info) => [v.from + (v.to - v.from) * ageOf(info)],
  }],
};
```

The picture is premultiplied, so the whole `vec4f` is multiplied.
`dissolve.js` is the same shape with a threshold in place of the alpha, and
an easing over the age.

## 6. Drawing at random (rule 2)

No clock, no `Math.random()`. `rand(px)` hashes a pixel with the recipe's
seed; `randAt(px, salt)` mixes more in — `frame.tick` for grain that moves
and still comes round with the loop, a constant for a second independent
draw. A filter that uses them says **`random: true`**: a saved object then
carries its seed in its envelope (`drawsAtRandom`, `apps/shader/save.js`) —
the object model's way of saying *this picture hangs on a seed* — and
`tests/gpu-filters.mjs` names the catalogue's random filters, a list to
extend.

Where a number must be the same in JS and on the GPU — particles reading a
noise the shader also draws — the hash has a twin, `core/noise.js`, bit for
bit; `noise.js`'s `noiseAt` is its whole pass in JS, which is how node
holds it without a GPU.

## 7. Sizes, the edge, and a print

One recipe is drawn at many sizes: a row's picture at 96 pixels, the
viewer, the save at the format's size, a print at several times that —
some of them a *window* at a time, a part of a picture too big for any
canvas.

- **A size in pixels is multiplied by the scale** — `v.radius * info.scale`
  in `uniforms` (`blur.js`), or `frame.scale` in WGSL. Forget it and the
  rows' pictures, the viewer and the print each show a different blur.
- **Place things by `uv` and `frame.size`**, read through `tex`, `texAt`
  and `origAt`. In a window they still mean the whole picture; the
  texture's own dimensions do not.
- **`reach: v => …`** — how far past its picture the filter spreads, in
  pixels at scale 1: a blur's three deviations, an outline's width. Absent
  is 0. It is the room a sprite is given so its halo is not cut.
- **`reads: v => …`** — how far from a pixel it reads, where that is more
  than it spreads. `reads: () => Infinity` says *from anywhere* (`warp`,
  `polar`, `zoomblur`): the chain is then printed whole, never in windows —
  and past a canvas's size, not at all. Say it when it is true, and only
  then.

## 8. Several passes

`passes: [a, b, c]` run in order, each reading the one before as `src`.
All of them can still read the filter's own input, as it was before the
first, with `origAt(px)`. `glow.js` is the model: keep the bright, blur it
across, blur it down, add the result over `orig`. A pass is an object, so
it can be shared — `across(dx, dy)` from `blur.js` is the blur's pass, used
again by `unsharp` and `glow`.

One pass per filter is the rule until a filter needs more: two passes of
2n + 1 taps instead of one of (2n + 1)², or a result laid back over its
input.

## 9. WGSL, coming from GLSL or Shadertoy

| GLSL | WGSL |
|---|---|
| `vec2`, `vec3`, `float`, `int` | `vec2f`, `vec3f`, `f32`, `i32` (`u32`) |
| `float x = 1.0;` | `let x = 1.0;` — fixed; `var x = 1.0;` — may change |
| `float(i)`, `1` where a float is meant | `f32(i)`, `1.0` — nothing converts by itself |
| `cond ? a : b` | `select(b, a, cond)` — **the false value first** |
| `mod(x, y)` | `x - y * floor(x / y)`; `%` truncates, wrong below zero |
| `atan(y, x)` | `atan2(y, x)` |
| `texture(tex, uv)` | `tex(uv)` — the kit's, safe in a loop or a branch |
| `#define N 8` | `const N = 8;` — or `${N}` from JS, the code is a string |
| `fragCoord`, `iResolution` | `uv * frame.size`, `frame.size` — y down, not up |
| `iTime` | a phase or an age, as a field of `Params` (section 5) |

WGSL reserves words a shader reaches for — `filter`, `pass`, `target`,
`type`, `module`, `set`, `smooth`, `common` — which is why the function is
`fx`; the unit test names any used.

**Before porting anyone's code: rule 5.** A shader names its source and its
licence, and the licence must allow a game — MIT, BSD, Apache-2.0, ISC,
Zlib, CC0. Shadertoy code with no licence header is noncommercial by
default, and LYGIA is noncommercial: both stay out. A ported filter carries
`source` (its URL), `copyright` (the line the licence asks to keep) and
`notice` (the licence's whole text in a file beside it, as
`LICENSE-glfx.txt`). The technique is free; the code is not — writing it
again from the idea, as every filter here marked `skweeb` was, is always
allowed.

## 10. Holding what you add

| Check | What it holds | For a new filter |
|---|---|---|
| `node tests/gpu-filters.mjs` | every filter listed: licence, schema, `fx`, `Params` against `uniforms()` | nothing to add — but it names the catalogue's generators and its random filters, lists to extend when yours is one |
| `node scripts/check-gpu.mjs` | every filter of the catalogue compiles, on a real GPU | nothing to add |
| `node scripts/check-filters.mjs` | each filter against what it should do, pixels read back | add its id to the `prepare` list, and a case |
| `node tests/shader.mjs` | the starters: every row a filter, every value its schema's | names the starters' ids — extend with yours |
| `node scripts/check-shader.mjs`, `check-shader-save.mjs` | the app; what it saves, replayed to the pixel, printed in tiles | when the app itself changed |

A case in `check-filters.mjs` is a few lines in the page, and one line out
of it — a picture drawn, run, read back, and what must be true said in
words:

```js
// in inPage(): white through a tint is the tint's colour.
out.tint = at(read(runner.run(flat('#ffffff'), [{ id: 'tint', params: { colour: '#ff8a00' } }])), 64, 10, 10);
// after it:
c.ok('tint: white to its colour, alpha kept', r.tint.join() === '255,138,0,255', String(r.tint));
```

The gate before landing is one command, and rule 4's lines:

```sh
node scripts/checks.mjs --gate --since main
node scripts/lines.mjs
```

On the laptop's Intel GPU Chrome keeps WebGPU back; the GPU checks skip
their GPU half unless given
`CHROME_FLAGS="--enable-unsafe-webgpu --enable-features=Vulkan"`.

## 11. Other features, and where each goes

| I want… | It goes in | Mind |
|---|---|---|
| a new filter or generator | `core/gpu/filters/<id>.js` + `index.js` | sections 3 to 8 |
| a new starter | `apps/shader/starters.js`, a row of data: `values` and a `chain` | begun by a generator on `replace`; scrolls whole numbers; `tests/shader.mjs` |
| a new control on the app itself, beside seed, frames and fps | one entry in `apps/shader/params.js` (rule 1): its row, its place in the recipe and in a save come by themselves | if drawing depends on it, hand it on in `drawSurface` (`frames.js`) — the one place the preview, a save and a replay all pass through |
| a new blend for generators | `meet.js`: `BLENDS`, and a branch of `meet()` | a recipe keeps the blend's name; WGSL is handed its index in `BLENDS` — the list and `meet()`'s branches must agree, and `tests/gpu-filters.mjs` holds `mask` at 2 |
| a helper every pass can call | `PRELUDE` in `core/gpu/wgsl.js` | every pass of the suite compiles it; a helper for two filters is exported from one of them instead |
| a pass of one app's own, not for the menu | a chain entry carrying its filter, `{ filter, params }` — fractals' escape time (`apps/fractals/fractal.js`) | the app keeps it; a recipe can only name a catalogue filter by id |
| a new number every pass reads | `struct Frame` in `wgsl.js` and the buffer `run()` packs in `runner.js` — 48 bytes, both sides | the kit's contract: `docs/core-api.md`, and a decision first |
| a picture from the vault inside a chain — a drawn mask | nowhere yet: a pass has two textures, `src` and `orig`; this needs a third | `docs/vfx.md`, *left for later* |
| a PNG, a frames zip, a sheet to disk | `apps/shader/` has none yet (`STATUS.md`, *Known*); core's export box is what the other apps use | `docs/core-export.md`, `docs/boxes.md` |

Whatever it is, the preview, the save and the replay must stay one code
path — `frames.js`. A feature drawn in `main.js` alone is on screen and in
no saved object.

## 12. Where to start

Written down already, each small enough for a branch:

- **the glow's grey cast** over a clear picture — `apps/shader/STATUS.md`,
  *Next single step*: a case in `check-filters` first;
- **a noise that boils in place** — a third axis, looped; **a gradient's
  own colours** — `docs/vfx.md`, *The generators*, left for later;
- **rows drawn only when paused**, for a long chain at a big format —
  `STATUS.md`, *Known*.

And one this file suggests, not yet on any list: a **cellular noise**
(Worley) generator — cracks, scales, caustics — on the kit's hash and a
wrapping lattice, the way `noise.js` tiles.

## 13. Landing it

A feature is a work item: a row on the board (`docs/plan.md`), a branch
from `main`, the gate of section 10, then `docs/workflow.md`. What it owes
in words: the filter's own head (what, from where, under what licence),
`apps/shader/STATUS.md`, `docs/guides/vfx.md` when what the author sees in
the app changed, and `docs/core-api.md` when the kit's contract did.
