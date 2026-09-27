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
3. **Sprites from a set** — done 2026-09-27: ckt's stamps renderer in
   core, a set chosen through a row in `core/uses.js`, size, alpha and spin
   over a particle's life on `core/easing.js` curves. M6's link.
4. **It saves** — a still or a loop, `render()` redrawn at print scale,
   `rebuild.js` for the vault's replay.
5. **Emitters and forces**: a line, a circle, a shape's alpha; vortex,
   attractors, seeded curl noise.
6. **Depth**: x, y and z behind a simple camera, sprites sorted by depth.
7. **Sprite-sheet export** (`docs/roadmap.md`, *Across M5–M7*).

## Works now

- **A particle is a function of its slot and its age** (`model.js`,
  `tests/particles-model.mjs`, 42 checks). A stream emits `rate` a second as
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
  `node scripts/check-particles.mjs`, now 23 checks). Three columns, as
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

- **Sprites from a vault set — M6's link, `set → particles: sprites`**
  (2026-09-27; `sprites.js`, `core/uses.js`'s `particles` row). The Look's
  `sprites` picks a set; its members' renders are the sprites, in its order,
  and a particle draws `images[floor(pick × n)]`, so it is the same sprite
  every frame and the loop still closes pixel for pixel. A brush family is
  offered by default; any other set is shown past the filter and switched
  on as particle sprites when picked. With none, or no vault, dots.
- **Over a particle's life** (2026-09-27): its size from `size` to `size ×
  grow` along a curve, its alpha from 1 to 0 when it fades along another;
  and, in the *Turning* drawer, a start angle spread, a spin in °/s with a
  spread — or *face where it goes*, for sparks. `rot` is the model's, from
  two new draws at the end of each slot's list, so every earlier draw is
  as it was. A sprite is drawn from the halving of its picture nearest
  above its size (`core/stamps.js` `mipFor`) with one transformed
  `drawImage`: every particle has its own size and angle, so ckt's shared
  stamps would only churn their cache. A loop that turns and shrinks still
  closes pixel for pixel.
- **Stacking** (the author's ask, 2026-09-27): *newest on top*, or *newest
  behind* — a trail or smoke, the older ones in front. The picture is
  redrawn whole each frame, so it is the draw loop's order, not a composite
  operation; checked, and the loop still closes.
- **It opens on a torch**: rising, warm, shrinking as it goes — the app's
  defaults, not the model's, which stay a plain fountain.

## Known

- A slot's draws are in a fixed order — jitter, life, speed, angle, pick,
  turn, twist — and new ones go at the end, or saved recipes redraw
  differently.
- 2D only: z and the camera are brick 6.
- Nothing saves yet: brick 4.
- A value changed keeps the frame on screen; a loop made shorter than it
  lands on its last.
- Sprites have no tint: a set's colours are its own. Colour over life, for
  dots and a tint for sprites, is not in yet.
- A sprite's size is its width; its height follows its own shape, so a
  tall sprite in a set of round ones stands taller.

## Next single step

**Brick 4: it saves.** `save.js` beside `main.js`, filter's `save.js` the
pattern: *Save to the vault* in an Export drawer, or S — paused, a `still`
of the frame on screen; a stream or a burst, a `sequence` of every frame
at the picture's `fps`, its picture the frame on screen. The recipe is
`{ emit, picture }`, both panels' values; the set picked is a parent, by
the `object` param (core/params.js `consumedObjectIds`); the seed is the
emitter's. Then `rebuild.js` answering core's dispatch
(`core/rebuild.js`, filter's and compose's are the pattern), so the vault
plays it and compose places it — and `redraws()`, since `draw.js` at a
larger `scale` is exact. Add the save, the replay and a placement in
compose to `scripts/check-particles.mjs`.
