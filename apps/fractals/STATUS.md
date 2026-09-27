# STATUS — fractals
_last touched: 2026-09-27_

M7's app: fractals on the GPU kit. The plan and *Done when* are in
`docs/roadmap.md`, M7 — a Julia loop that closes, redrawn exactly at print
scale, whose field steers an M6 emitter. The link: `fractal → particles: a
field`.

## The bricks

1. **Escape time on the GPU** — done 2026-09-27: the Mandelbrot set and its
   Julia sets, smooth colouring round a ramp, dragged and wheeled.
2. **It saves** — a still into the vault, `{ …params }` its recipe;
   `rebuild.js` drawing it again at any scale, exactly, and `?open=`; and a
   Julia set chosen by clicking a point of the Mandelbrot set.
3. **Loops** — palette cycling (the phase once round), a Julia `c` round a
   circle, a turn: saved as sequences, and so as sprite sheets.
4. **More families** — Burning Ship, multibrot, Newton, Phoenix, Lyapunov;
   orbit traps.
5. **Deeper** — two floats for one (double-float in WGSL) past a zoom of
   10⁴–10⁵.
6. **Point families** — IFS, strange attractors, fractal flames, as density;
   then L-systems.
7. **A field for particles** — M7's link: the fractal's slope, or its
   escape, as a field an emitter's particles follow.

## Works now

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
- Nothing saves to the vault yet: the PNG is a download. Brick 2.
- The iterations do not follow the zoom: deep in, raise them by hand.
- A drag or a wheel redraws the whole picture each move; at 1080 square
  and a few hundred iterations that is quick, at thousands it is not.

## Next single step

**Brick 2, first half: a fractal saves, and comes back.** `save.js`: S, or
*Save to the vault* in the Export drawer — a `still`, its recipe the
params' values, its render the picture at the format's size times its
scale. `rebuild.js`: `openObject` draws it again with the runner at the
scale asked (`redraws()` true: exact at any size), `openPicture` where
there is no WebGPU, as filter's does; `reopens()` for `?open=`. Checked in
`scripts/check-fractals.mjs`: saved, the vault's replay the render to
within the GPU's rounding, drawn again at 2×, reopened, placed in compose.

## Parked

- Colour in OKLab rather than sRGB along the ramp — smoother between far
  colours; the palette's own brick, with a `palette` type (`docs/roadmap.md`,
  *Across M5–M7*).
