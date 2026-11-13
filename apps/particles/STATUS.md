# STATUS — particles
_last touched: 2026-11-13_

M6's app, begun: particles as a function of time, not a simulation. The plan
and *Done when* are in `docs/roadmap-done.md`, M6 — a torch loop that closes
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
6. **Depth** — done 2026-09-27: a z for each particle, a camera, far ones
   drawn first and smaller.
7. **Sprite-sheet export** — done 2026-09-27, ahead of 5 and 6
   (`core/spritesheet.js`).

## Works now

- **A loop's frames as sprites, worn by age** (M15e, 2026-11-13; the link
  `shader → particles: a surface over a life`, `docs/vfx.md`). *sprites*
  takes a `sequence` — the shader's life, or any loop — as it is:
  `core/sprites.js` replays it once (`core/rebuild.js`), each frame kept, at
  most 64, none over 512 px. *a particle wears* (`wears`): *one each*, by
  its `pick`, or *the frame of its age* — `draw.js` `spriteAt`: at half its
  life, the middle frame. A loop chosen by hand turns it to its age,
  anything else back; a recipe arriving leaves it. A smart object's next
  state is followed (L11). `check-particles-life`, 17 checks, no GPU asked;
  the shader's own loop as sprites, `check-shader-save`.

- **Its overlay, its layers** (L13b, 2026-11-12, the author's: "on peut la
  mettre dans la section stack comme une section à part entière dédiée au
  système de 'calque'"; core/layers.js, `params.js` `overlayAsLayer`). The
  Overlay section is the Stack's layers now, as every app's: "+ overlay…",
  a list, each layer composed as the overlay was — and particles draws them
  itself (`drawPicture`), the ones behind between its ground and its
  particles (`layered`: core lays none round its picture again). On the
  preview the topmost layer under a press is dragged by its middle, F puts
  the one pressed last on the picture's edge or corner. A recipe from before
  — G3's nine rows — has its overlay as its first layer wherever it comes
  in: opened, gone back to in the graph, replayed, printed, as it was drawn
  (`tests/particles-model.mjs`, `check-particles-overlay`).
- **The overlay composed** (G3, 2026-11-11, the author's pick: "overlay
  composable"; since L13b its rows are its layer's, and its box core's
  `layerBox`; `check-particles-overlay` 16). With an overlay,
  the Overlay section's rows compose it (S14b): *where* — in front of the
  particles, or behind them, over the ground — *fitted* whole or filling
  the format, what spills over cut; its *size*, a share of that; *from
  centre*, x and y in picture pixels; *turned*, clockwise round its middle;
  its *opacity*; its *blend*, CSS's names as the stack's (`core/blend.js`).
  At their defaults it stands as it did, to the pixel. With the guides on,
  its box is drawn dashed and turned, a handle at its middle: a press in it,
  away from every handle, drags it — its rows the drag's, the magnet on
  its middle — and F, pressed last, puts it with its own edge or corner on
  the picture's. One path draws a frame (`drawPicture`): the preview, a
  save, a replay and a print in tiles, turned and blended in each.
- **Each particle its own size, and an emitter object turned** (2026-11-09,
  the author's ask; `draw.js` `bornSize`, `model.js` `turned`). The Look's
  *random size*: on, *size from, to* in place of *size*, each particle
  between the two by a draw of its own at the end of its slot (`gauge`), the
  same all its life; *size at its end* multiplies it as before, and a loop
  still closes. The emitter's *object angle*, shown for an object: its points
  turned round its centre, clockwise, −180 to 180; *outward* leaves from
  where they are now, and the guides draw them turned. 0, as it always was,
  to the bit.
- **A picture in front, fitted to the format** (2026-11-09, the author's
  ask, a poster's type over its particles: "une image avec de la
  transparence devant mon rendu, en overlay mais adapter au format pour
  pouvoir gérer la composition"; `draw.js` `overlayBox`, `drawOverlay`). The
  Overlay section's *overlay*: a still or a shape of the vault, whole, as large
  as the format allows, centred — a sheet of the format fills it to the
  pixel, and on another format nothing of it is cut. In front of the
  particles and under the guides; where it is see-through, the render. In
  the save, the replay, the frames and the print, from its own pixels there;
  a parent of what is saved; not on a sprite sheet, as the ground is not.
  A3 at 300 dpi, 3510 × 4963, draws in 10 ms, and the 3508 × 4961 poster
  costs the preview nothing (`check-particles-fields`).
- **A palette of the vault colours the particles** (2026-11-09, the
  author's ask, to try BEC_2025's; `dye.js`, `core/palettes.js`). The
  Look's *palette*, an object row as *sprites* is; BEC's three are in the
  picker's folder `bec_2025`. Each particle is one of its colours, the same
  all its life, by a draw of its own at the end of its slot (`dye`), so
  nothing drawn before moves and a loop still closes pixel for pixel. A dot
  is filled with it, and the *dot colour* row goes. A sprite is printed in
  it, *on a sprite* says how: *keeps its tones* — its darkest tone takes
  the colour whole, pure white stays, what is between is between, and a
  sprite of one tone, even white, is taken whole — or *flat*, a silhouette.
  Dyed once for each halving and colour, within 256 MB: 2000 sprites at
  1080², 9 ms a frame → 10. The palette is a parent of what is saved, the
  replay draws in it to the pixel, `?open=` brings it back, the frames, the
  sheet and the print are in it; cleared, as before, and a recipe from
  before draws as it did (`check-particles-links`, `tests/particles-model.mjs`).
- **A module** (S9, 2026-11-04; `main.js` on core's `mount.js` and
  `scope.js`): `mount(host)` builds the app in any host and `unmount()`
  takes it out — its panels, bar, title bar and vault panel gone, its keys
  and pies no more core's, its params' steps forgotten, a bye to the other
  windows, every listener it put on the document and the window off.
  `index.html` mounts it on itself; the markup it had is the module's.
  Mounted again in a page — cluster's — it comes back as it was left: both
  panels, the frame, playing or not (`keep`, S9c, 2026-11-05). Its ways out
  — the save, the sheet, the frames, the print's — are `leaving.js`, as
  the rig's.
  The first of the suite, as the bench's was — `check-mount`.
- **The viewer's magnet and F** (S8, 2026-11-03; `pointer.js`, core's
  `shell/guides.js`): a handle dragged is pulled to the picture's edges, its
  centre and the guides, Ctrl held not; the one last pressed is ringed, and
  F puts it at the centre — the emitter until another is pressed.
- **Prints at a sheet's size and a dpi** (2026-10-06; core's print panel in
  the Export drawer, `docs/core-export.md`): the frame on screen, drawn
  again a window at a time through `core/windowed.js` — 81 tiles against
  the loop drawn whole (`check-print`).
- **A field from another object — M7's link, `fractal → particles: a
  field`** (2026-09-30; `forces.js`, `core/fields.js`,
  `tests/particles-model.mjs` now 92, `check-particles-links` 23). In the
  Fields drawer, *a field from*: an object whose app makes a field — a
  fractal's escape time, which way its set is — *its pull* px/s², and
  *turned*: 0 towards what it points at, 180 away, 90 round it. Given
  beside the recipe as an emitter's points are, and integrated from each
  particle's birth as the other fields are, so a loop through it closes.
  An object whose app makes none says so.
- **An emitter taken from a vault object — `ckt → particles: an emitter`**
  (2026-09-30, the author's idea; `core/points.js`, `tests/points.mjs` 16
  checks, `tests/particles-model.mjs` now 86,
  `node scripts/check-particles-links.mjs` 16). The emitter's fifth chip,
  *object*: a ckt dot-set — one cut from text is a single glyph laid out
  as the word, so a word needs nothing more; *glyph* picks one of a legacy
  font set — or a shape or a still, its ink sampled on a grid of at most
  128 a side. Every particle is born on one of its points, *size px* along
  its longer side, and *outward* launches away from its centre: a word
  that bursts. The slot's first spot draw picks the point, the second
  jitters it within a picture's sample — dots are exact — so nothing new is
  drawn and every saved recipe redraws as it did; a loop still closes. The
  recipe keeps only the object's id; its points are loaded beside it, by
  the app and by `rebuild.js` alike, and the object is the save's parent.
  The guides draw its points. Checked in Chrome: born on the dots and
  nowhere between, a glyph its own emitter, a dropped star's ink, the
  vault's replay its render to the pixel, `?open=`. ckt's `datasets.js`
  stayed in ckt: particles reads a vault dot-set in core/points.js's few
  lines and never the nine shipped with ckt.
- **A particle is a function of its slot and its age** (`model.js`,
  `tests/particles-model.mjs`, now 77 checks). A stream emits `rate` a second as
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
  `node scripts/check-particles.mjs`, 41 checks since its split). Three columns, as
  compose: *particles* on the left — Emission, Launch, Life, Forces, the
  model's recipe key for key — the picture between, *picture* on the right —
  the overlay, the player and its
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
  The picture's Export box: *Save to the vault* [S] — a
  `sequence` of every frame at the picture's `fps`, its picture the frame on
  screen — *Save the frame as a still*, and *Download every frame (zip)*,
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
  frames allow, 2 px between cells; beside it Aseprite's array JSON — which
  Phaser 3 loads as it is, checked; other engines' Aseprite importers read
  the same format, unchecked: each frame's rect, its
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
- **Depth** (2026-09-27, brick 6). Each particle has a `z`: the emitter's
  depth, and the cone tilted into depth by up to half of *into depth °*
  either way — a new draw at the end of the slot; drag slows it in depth,
  gravity and the fields stay in the plane. The picture's *Camera* drawer
  has a focal length: a particle `z` deep is `focal / (focal + z)` its size
  and as far from the centre (`draw.js` `drawOrder`), far ones drawn first,
  those behind the camera left out. With every z at 0 the scale is exactly
  1, so a flat recipe draws as it always did; no switch. A stream in depth
  still closes its loop pixel for pixel.
- **A reach for the vortex and the attractor** (2026-09-27, the author's
  ask; `forces.js` `reach`). *reach px* in Fields: full strength at the
  centre, `(1 − (d / reach)²)²` of it at `d`, nothing past the radius — a
  smooth fade, its slope 0 at the edge — so a swirl can be local; 0 is
  everywhere, as before. The noise has no centre and no reach. The guides
  draw it as a dashed circle with a handle on it, dragged to set it.
- **The guides are a switch over the viewer** (2026-09-27, the author's
  ask): on, everything shows, always — the fields' centre too with no
  field on, faint, *field · off*, so it can be placed first; off, nothing.
  Z too, and the viewer's tools since S14a. How the viewer looks, not what
  the particles are, so it is not a param and never in a recipe: remembered
  in this browser, as a drawer's open state is.
- **One sprite, or a set** (2026-09-27, the author's ask). The Look's
  `sprites` takes a shape or a still too — one sprite for every particle.
  And a picture from outside the suite comes in through the vault panel's
  *+ pictures*, or dropped on it (`core/vault-import.js`) — in the very
  picker *Choose…* opens, so a star drawn elsewhere is in and picked in
  one place. Checked: a star PNG dropped, a shape, every particle's sprite.
- **Guides, and handles to drag** (2026-09-27, the author's ask before M7;
  `guides.js`, `pointer.js`). Over the preview, never in a save, a frame or
  a sheet: the picture's centre; the emitter in blue — its shape through
  the camera at its depth, its launch cone or its arrows outward, a handle;
  the fields in magenta — arrows of the whole field on a grid, sampled
  from the very function the particles move through, a vortex's turn and
  an attractor's pull round a diamond handle; and the pull of gravity and
  wind in the corner. Drag a handle and the emitter, or the fields'
  centre, follows through the panel's own rows; an emitter in depth is
  dragged at the camera's scale so it stays under the pointer. Sized in
  CSS pixels, so they read the same at any preview size.
- **M6's *Done when* is met** (2026-09-27): a torch loop that closes
  exactly, drawn with a vault set's sprites and scrubbed to any frame, and
  a one-shot burst, both leaving as sprite sheets — the burst's tag says it
  plays once — and a game engine loads one: Phaser 3.80, in headless
  Chrome, reads the torch's sheet as 60 frames of its crop, its tag as one
  animation of exactly 2000 ms, and a sprite plays it in real time
  (`node scripts/check-sheet-engine.mjs`; Phaser from jsDelivr into the
  check's page only, nothing installed; skipped with no network).
- **It opens on a torch**: rising, warm, shrinking as it goes — the app's
  defaults, not the model's, which stay a plain fountain.

## Known

- **A flipbook's frames are 512 px at most**: worn larger — a print — they
  are stretched, as a set's pictures are; drawn again at the size is not
  done. Nor are two frames blended: a short life steps.
- **A loop chosen is two steps to undo**: the sprites, then what a particle
  wears. And an object chosen as its own sprites, or its own layer, would
  replay itself: nothing stops it.

- A slot's draws are in a fixed order — jitter, life, speed, angle, pick,
  turn, twist, spot, spot, lift, dye, gauge — and new ones go at the end, or saved
  recipes redraw differently.
- A field costs a particle's age in steps, each frame: a long life through
  one is the slow case — 20 s lives are 2400 steps each.
- The fields do not move in time — a moving field would have to repeat
  with the loop to keep it closed. A fractal loop's field is its set at
  rest.
- Depth has no gravity or field of its own, and the emitter's shape stays
  in the plane: a disc is flat, facing the camera.
- The camera looks at the picture's centre and cannot move or turn.
- A frame drawn with the guides off and on again can differ by under a
  level from the first paint: Chrome moves a canvas it has read back off
  the GPU. Only the checks see it; they allow a level there.
- A picture carries its ground onto a compose page: an opaque square
  round the torch. For placing over other things, set the ground to none.
- A loop's thumbnail is its whole picture, so a narrow torch on a square
  canvas is a thin line on its card. The sheet crops; the save does not.
- The sheet is not saved to the vault — it is a download, as frames are.
- A loop reopens at its first frame: its recipe is the loop, not the frame
  its picture was taken at.
- A value changed keeps the frame on screen; a loop made shorter than it
  lands on its last.
- The overlay is one picture, composed (G3): not several — the gabarit's
  layers (M13c, `docs/bec.md`) are. Its drag moves it, never sizes or turns it.
- A palette's colour is a particle's for its whole life: colour over life
  is not in yet. With no palette, a set's colours are its own.
- A sprite's size is its width; its height follows its own shape, so a
  tall sprite in a set of round ones stands taller.
- An object emitter's points are its ink, evenly — a still with no
  see-through pixels is its whole rectangle; darker-is-more is not in. The
  *glyph* row counts to 999 whatever the dot-set holds; the index wraps.
- On the laptop, `check-particles` fails two checks that are the machine's,
  not the code's: its copy of `./vault` is empty there — no set to draw
  with — and a frame through the fields takes 17–22 ms on its i7-8565U,
  before this brick and after, against a 16.7 ms budget set on the tower.
- The checks are three files (C2, 2026-10-22, split at their sections):
  `check-particles` — the loop, a burst, print scale, a set's sprites, the
  saves (41); `check-particles-fields` — emitters, fields and depth, the
  guides dragged, a picture from outside (22); and `check-particles-links`.

## Next single step

M6's seven bricks are in, its *Done when* met, and with them an emitter
and a field taken from other objects. Nothing of particles' own is on the
board of the cycle begun 2026-10-22 (`docs/plan.md`) — L11 will have its
sprites follow a smart object; what is left here waits under its *Later*:

- **Colour over life** — a palette run along a particle's life, on a
  curve, for dots and sprites: `dye.js` paints them in any of its colours.
  Not for BEC 2027's system: "les changements de couleurs et de taille dans
  le temps n'est pas souhaité pour ce système" (the author, 2026-11-11).
