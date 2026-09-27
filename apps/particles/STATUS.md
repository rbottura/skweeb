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
4. **It saves** — done 2026-09-27: a loop or a still, every frame as a zip,
   `rebuild.js` for the vault's replay, compose's placing and print scale.
5. **Emitters and forces** — done 2026-09-27: a line, a disc, a ring, aimed
   outward or not; a vortex, an attractor and curl noise. A shape's alpha
   as an emitter, and a field from another object, are still to come.
6. **Depth**: x, y and z behind a simple camera, sprites sorted by depth.
7. **Sprite-sheet export** — done 2026-09-27, ahead of 5 and 6
   (`core/spritesheet.js`).

## Works now

- **A particle is a function of its slot and its age** (`model.js`,
  `tests/particles-model.mjs`, now 58 checks). A stream emits `rate` a second as
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
  `node scripts/check-particles.mjs`, now 45 checks). Three columns, as
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
- **It saves** (2026-09-27, brick 4; `save.js`, `frames.js`, `rebuild.js`).
  The picture's Export drawer: *Save the loop to the vault* [S] — a
  `sequence` of every frame at the picture's `fps`, its picture the frame on
  screen — *Save this frame as a still*, and *Download every frame (zip)*,
  numbered PNGs and a `meta.json` for `scripts/frames-to-video.mjs`. The
  recipe is `{ emit, picture }`, both panels' values, and `tick` for a
  still; the sprite set is the parent (`consumedObjectIds`), the seed the
  emitter's. A save and a replay draw with the same code (`frames.js`), so
  the vault's replay of a frame is its render to the pixel; at scale 2 it
  is drawn again at twice the pixels. `?open=<id>` brings both panels back
  and the sprites with them — a still at the frame it is — and compose
  places a saved loop and plays it: *a 30 fps loop of 60*.
- **A sprite sheet** (2026-09-27, brick 7; `core/spritesheet.js`,
  `tests/spritesheet.mjs`). *Download a sprite sheet*: every frame on one
  PNG, cropped to the one box the particles reach over the whole loop —
  the torch is 92 × 438 of a 1080 square — in a grid as square as the
  frames allow, 2 px between cells; beside it Aseprite's array JSON, which
  Phaser, Godot's importers and PixiJS read: each frame's rect, its
  duration in whole ms summing to the loop exactly (33, 34, 33… at 30 fps),
  one tag for the loop, and in `meta.skweeb` the crop and the recipe. One
  zip, `<name>.png` and `<name>.json`. Drawn on no ground, whatever the
  picture's.
- **Emitters and fields** (2026-09-27, brick 5; `forces.js`,
  `core/noise.js`, `tests/noise.mjs`). The emitter is a point, a line
  (length, angle), a disc filled evenly or a ring — on a disc or a ring the
  launch can aim outward, so a burst blooms; the spot is two new draws at
  the end of each slot. The *Fields* drawer: a vortex round a centre, an
  attractor to it (or away), and curl noise of a size, all in px/s². None
  has a closed form, so with any on, each particle is integrated from its
  own birth, 120 steps a second by the midpoint rule — the same age, the
  same steps — and every frame still stands alone: a stream through a
  vortex and noise closes its loop pixel for pixel. With none on, the
  formula places them, as before. The noise is `core/noise.js`: WGSL's
  `pcg` bit for bit, gradient noise from eight directions with its exact
  slope in one pass, so a frame through the fields is 2.3 ms, not 27.
- **It opens on a torch**: rising, warm, shrinking as it goes — the app's
  defaults, not the model's, which stay a plain fountain.

## Known

- A slot's draws are in a fixed order — jitter, life, speed, angle, pick,
  turn, twist, spot, spot — and new ones go at the end, or saved recipes
  redraw differently.
- A field costs a particle's age in steps, each frame: a long life through
  one is the slow case — 20 s lives are 2400 steps each.
- The fields do not move in time — a moving field would have to repeat
  with the loop to keep it closed.
- 2D only: z and the camera are brick 6.
- A picture carries its ground onto a compose page: an opaque square
  round the torch. For placing over other things, set the ground to none.
- A loop's thumbnail is its whole picture, so a narrow torch on a square
  canvas is a thin line on its card. The sheet crops; the save does not.
- The sheet is not saved to the vault — it is a download, as frames are.
- A loop reopens at its first frame: its recipe is the loop, not the frame
  its picture was taken at.
- A value changed keeps the frame on screen; a loop made shorter than it
  lands on its last.
- Sprites have no tint: a set's colours are its own. Colour over life, for
  dots and a tint for sprites, is not in yet.
- A sprite's size is its width; its height follows its own shape, so a
  tall sprite in a set of round ones stands taller.

## Next single step

**Brick 6: depth.** A `z` for each particle — launched in a 3D cone, the
forces in z too — and a simple camera: a focal length and its distance, so
a particle's drawn size and position are divided by its depth, and the
particles drawn far first. Still a function of slot and age, so a loop
still closes; checked the same way.
