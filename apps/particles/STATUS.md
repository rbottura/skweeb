# STATUS — particles
_last touched: 2026-09-27_

M6's app, begun: particles as a function of time, not a simulation. The plan
and *Done when* are in `docs/roadmap.md`, M6 — a torch loop that closes
exactly, drawn with a vault set's sprites and scrubbed to any frame, and a
one-shot burst, both leaving as sprite sheets a game engine loads. The link:
`set → particles: sprites`, a use.

## The bricks

1. **The model** — done 2026-09-27, `model.js`. No page yet.
2. **The app opens and plays** — dots, no sprites: `index.html`, the schema,
   core's player, Canvas 2D.
3. **Sprites from a set**: the stamps renderer moved from `apps/ckt/stamps.js`
   into core, a set chosen through a row in `core/uses.js`, colour, size,
   alpha and spin over a particle's life on `core/easing.js` curves.
4. **It saves** — a still or a loop, `render()` redrawn at print scale,
   `rebuild.js` for the vault's replay.
5. **Emitters and forces**: a line, a circle, a shape's alpha; vortex,
   attractors, seeded curl noise.
6. **Depth**: x, y and z behind a simple camera, sprites sorted by depth.
7. **Sprite-sheet export** (`docs/roadmap.md`, *Across M5–M7*).

## Works now

- **A particle is a function of its slot and its age** (`model.js`,
  `tests/particles-model.mjs`, 36 checks). A stream emits `rate` a second as
  `rate × period` slots a loop; slot `k` draws everything from the seed and
  `k mod n`, so slot `k + n` is slot `k` one period on, and the picture at
  `t + period` is the picture at `t` — checked to a millionth of a pixel,
  ten periods on too. With `prewarm` the slots before zero were born, so
  frame 0 is as full as any; without, the stream starts empty and, one life
  in, is the prewarmed one exactly. A `burst` emits `count` at zero and is
  over when its longest life is. Motion is the closed form of
  dv/dt = a − k v: launch speed and cone (degrees clockwise from up),
  gravity, wind, linear drag, checked against the schoolbook and against
  its own derivative. Positions are px at scale 1 from the picture's
  centre, y down, so print scale is a multiplication. Oldest first, the
  draw order. More than 20 000 alive keeps the newest.

## Known

- A slot's draws are in a fixed order — jitter, life, speed, angle, pick —
  and new ones go at the end, or saved recipes redraw differently.
- 2D only: z and the camera are brick 6.

## Next single step

**Brick 2: the app opens and plays dots.** `apps/particles/index.html`,
`params.js` with the model's `DEFAULTS` as a schema (core/params.js; format
drawer from `core/frame.js`, as compose's page), `main.js` drawing
`particlesAt(recipe, tick / fps)` as filled circles on Canvas 2D at the size
the viewer shows, played and scrubbed by core's `Playhead` and `Transport`
over `duration()` — ckt's `main.js` is the pattern. Opens with no vault.
