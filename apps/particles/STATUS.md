# STATUS — particles
_last touched: 2026-09-27_

M6's app, begun: particles as a function of time, not a simulation. The plan
and *Done when* are in `docs/roadmap.md`, M6 — a torch loop that closes
exactly, drawn with a vault set's sprites and scrubbed to any frame, and a
one-shot burst, both leaving as sprite sheets a game engine loads. The link:
`set → particles: sprites`, a use.

## The bricks

1. **The model** — done 2026-09-27, `model.js`.
2. **The app opens and plays** — done 2026-09-27: dots, no sprites.
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

- **The app opens and plays dots** (`main.js`, `params.js`, `draw.js`;
  `node scripts/check-particles.mjs`, 15 checks). Three columns, as
  compose: *particles* on the left — Emission, Launch, Life, Forces, the
  model's recipe key for key — the picture between, *picture* on the right —
  core's Format drawer less `ink`, `canvas` and `zoom`, the player and its
  `fps`, the Look: dot size, colour, a fade over life, the ground. Every
  frame is `particlesAt(recipe, tick / fps)`. A stream's loop is set in
  frames, so its period is whole frames and it closes on one: the frame
  after the last is the first, pixel for pixel; a frame scrubbed to is the
  frame stepped to; frame 1 is as full as frame 31. A burst lasts until its
  longest life, all 120 at the emitter on its first frame. Drawn at the
  size the viewer shows (`core/view.js`, moved there from compose); `scale`
  multiplies the output. Rows that mean nothing in a mode hide (`when`). Opens
  and plays served as plain files with no vault.

## Known

- A slot's draws are in a fixed order — jitter, life, speed, angle, pick —
  and new ones go at the end, or saved recipes redraw differently.
- 2D only: z and the camera are brick 6.
- Nothing saves yet, and nothing in the page reads the vault but the
  panel on V: brick 3 brings the first object in, brick 4 the first out.
- A value changed keeps the frame on screen; a loop made shorter than it
  lands on its last.
- The defaults are a small fountain: wanted, a torch that reads at once.

## Next single step

**Brick 3, first half: the stamps renderer into core, dots as sprites.**
Move `apps/ckt/stamps.js` (and `surface.js`, which it needs) to `core/`,
ckt importing it from there — `node scripts/check-*.mjs` has no ckt check,
so run ckt by hand and `tests/ckt-motion.mjs`. Then a `sprite` param in the
Look (`type: 'object'`, `accepts: ['set']`, offered through a new row in
`core/uses.js`, `particles`), each particle drawing `set[floor(pick × n)]`
through `stampFor` at its size. Size, alpha and spin over life on
`core/easing.js` curves are the second half.
