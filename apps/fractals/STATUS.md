# STATUS — fractals
_last touched: 2026-09-30_

M7's app: fractals — escape time on the GPU kit, and a sprite copying
itself. The plan and *Done when* are in `docs/roadmap.md`, M7 — a Julia loop that closes, redrawn exactly at print
scale, whose field steers an M6 emitter. The link: `fractal → particles: a
field`.

## The bricks

1. **Escape time on the GPU** — done 2026-09-27: the Mandelbrot set and its
   Julia sets, smooth colouring round a ramp, dragged and wheeled.
2. **It saves** — done 2026-09-28, both families: a still or an idle into
   the vault, `rebuild.js` drawing it again at any scale, `?open=`. Left: a
   Julia set chosen by clicking a point of the Mandelbrot set.
3. **Loops** — done 2026-09-30: one param swung over a loop, an idle,
   saved as a sequence and so as a sprite sheet — copies' first
   (2026-09-28), then escape time's: the ramp once round, a Julia `c` round
   a circle.
4. **More families** — Burning Ship, multibrot, Newton, Phoenix, Lyapunov;
   orbit traps.
5. **Deeper** — two floats for one (double-float in WGSL) past a zoom of
   10⁴–10⁵.
6. **Point families** — begun 2026-09-28, ahead of order, as the author
   asked: a sprite copying itself, an IFS drawn with a sprite (*copies*).
   Then strange attractors and fractal flames as density, and L-systems.
7. **A field for particles** — M7's link: the fractal's slope, or its
   escape, as a field an emitter's particles follow.

## Works now

- **Escape time moves** (2026-09-30; `motion.js`, `tests/fractal-motion.mjs`
  34 checks, `check-fractals` 42). The Motion drawer's *moving* is the
  family's own. For escape time, *the ramp, round*: the phase from where it
  is, once round, evenly — a palette cycling, its last frame a step short of
  its first. Or *julia c, round a circle*: the Julia set's `c` taken round a
  circle of *radius round c* — 0.02 to start, on a log slider — about the
  `c` chosen, `from` and `to` then its degrees; picked on the Mandelbrot
  set, it makes the set a Julia set, since a Julia `c` moves nothing else.
  The rows under it — from, to, loop, curve, frames, fps — are the copies',
  shown for whichever family moves: core's `when` takes a list now, any one
  of which is enough. Both loops close pixel for pixel in Chrome; the Julia
  one saves as a sequence of 48 at 24, titled *c round 0.02*, replays to
  its render, is drawn again at scale 2, reopens and is placed in compose.
- **Idles: one param swung over a loop** (2026-09-28, the author's find —
  a tree's twist swung −10 to +10; `motion.js`, `tests/fractal-motion.mjs`
  17 checks, `check-fractals` 29). The Motion drawer: *moving* — each copy
  turned, branches apart, each copy ×, the whole turned or sized — *from*,
  *to*, *there and back* (eased at each end, the loop closing on itself)
  or *once through* (a whole turn), a curve, frames, fps. Picking what
  moves fills in a range round its value now — the twist ±10 — and plays.
  A frame's values come from its tick alone, so the frame after the last
  is the first, pixel for pixel.
- **It saves, replays and leaves** (2026-09-28; `save.js`, `frames.js`,
  `rebuild.js`). *Save to the vault* [S]: a still, or an idle as a
  `sequence` of its frames at its fps, its picture the frame on screen, the
  sprite its parent; *every frame* as a zip; *a sprite sheet* cropped to
  where the copies reach, with Aseprite's JSON; the PNG. A save and a
  replay draw with the same code, so the vault's frame is the render to
  the pixel, and at scale 2 it is drawn again. `?open=` brings it back;
  compose places an idle — *a 24 fps loop of 48*. Copies replay on any
  machine; escape time needs WebGPU, and without it shows its render.

- **A sprite, copied** (2026-09-28, the author's ask; `copies.js`,
  `tests/fractal-copies.mjs` 19 checks, `check-fractals` 17). The *family*
  switch: *escape time*, or *a sprite, copied* — a vault sprite (a shape, a
  still, or a set: a member a generation or a branch) copied by a few maps,
  each a shrink, a turn and a move, `generations` deep: a **triangle**
  (Sierpiński's), a **carpet**, a **cross** (Vicsek's), a **tree** (copies
  standing on each copy's tip, `branches` of them `spread` apart), a
  **spiral**. Each copy ×, each turned by *twist*; *every generation* or
  *the last*. A shape picked starts from its own ratio, twist and depth. No
  random: the copies are all the maps' compositions, generation by
  generation, a parent under its children, so the picture is a function of
  its params — fitted to the picture together, sized and turned about its
  centre, and drawn again at print scale from the sprite's own pixels. Up to
  50 000 copies; past that the last generation is left out, and the bar
  says so. No GPU needed: Canvas 2D. The wheel sizes it. With no sprite, dots.
- **Log sliders** (2026-09-28, the author's ask): a range may say
  `log: true` (`core/widgets.js`) — every factor of ten the same length of
  track. The zoom (0.1 to a million), the iterations, the ramp's turn and
  the copies' size run so.

- **The Mandelbrot set and its Julia sets, on the GPU** (2026-09-27, brick 1;
  `fractal.js`, `tests/fractal.mjs` 23 checks, `node scripts/check-fractals.mjs`
  9). Escape time — `z ← z² + c` till `|z|` passes 256 — colour smoothed by
  how far past it went, round a ramp of up to 16 colours that comes round
  every *iterations a turn*, turned by *phase*; the inside its own colour.
  One filter-shaped WGSL pass that reads nothing, run over a blank picture
  through `core/gpu/runner.js`, carried in a chain entry of its own — no
  filter of filter's. The plane is `cx`, `cy` at the centre and `SPAN /
  zoom` up the picture's height, so the picture is the same at any size in
  pixels: *Download the picture* draws it again at the format times its
  scale, 2160 square at 2. Drag pans, keeping the point taken hold of under
  the pointer; the wheel zooms about the pointer, keeping its point. Held
  to the escape count in doubles at 158 points away from the set's edge,
  every one agreeing. Opens with no vault; with no WebGPU it says why.
- **The format** is core's Format drawer less `ink`, `canvas`, `zoom` and
  `bleed`: a fractal fills whatever it is given.
- **`step: 'any'`** for a range (core/params.js): no grid to snap to, so the
  centre and the zoom keep every digit a wheel gives them.

## Known

- 32-bit floats: past a zoom of about 5 × 10⁴ the picture blocks up into
  flat squares, and the bar says so. Brick 5.
- One param moves at a time; two swung together — the twist and the
  spread — would be the next step for the Motion drawer.
- The two families share one range: from, to, loop, curve, frames and fps
  are one set of rows. A family switched to, with something moving in it,
  refits from and to round what moves there — so a range set by hand in the
  other family is not kept.
- The iterations do not follow the zoom: deep in, raise them by hand.
- A drag or a wheel redraws the whole picture each move; at 1080 square
  and a few hundred iterations that is quick, at thousands it is not. Tens
  of thousands of copies are slow to drag a slider over too.
- A copy drawn larger than its sprite's own pixels is soft: a 96 px star as
  a tree's trunk. The sprite's resolution is the ceiling.


## Next single step

The suite's next step is in particles: an emitter taken from a vault object
(`STATUS.md`, *Next single step*). Fractals' own, after it: **a field for
particles** — brick 7, M7's link, and the last clause of its *Done when*,
*whose field steers an M6 emitter*. A fractals object picked in particles'
Fields drawer, its escape sampled in doubles by `fractal.js`'s `escape` —
so a field needs no GPU — and its slope the force: particles pushed away
from the set, or, the slope turned a quarter, going round it. It takes its
object in as the emitter will. Left of brick 2 meanwhile: a Julia set
chosen by clicking a point of the Mandelbrot set.

## Parked

- Colour in OKLab rather than sRGB along the ramp — smoother between far
  colours; the palette's own brick, with a `palette` type (`docs/roadmap.md`,
  *Across M5–M7*).
