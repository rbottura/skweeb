# STATUS — 3d
_last touched: 2026-10-06_

M10's app (`docs/roadmap.md`, M10): 3D, from primitives up. A model is
its shapes — each a primitive, its params, a place and a look — with a
camera and a light, never its vertices: three.js makes them again from the
params, so a frame draws on its own at any size and a print is drawn again,
not enlarged. Drawn by three.js r186 (`core/libs/three/`, pinned by
`scripts/vendor-three.mjs`) on the page's one GPU device — the author's
call, 2026-10-06 (`docs/decisions.md`).

## The bricks

1. **The app opens** — done 2026-10-06: primitives from a menu, each a
   card from its schema; an orbit camera, one light, flat or smooth; a
   `model` saved, replayed, drawn again at print scale, placed in compose.
2. **Handled in the view**: picked by a click — done 2026-10-06 — moved,
   turned and scaled by handles, duplicated, deleted.
3. **Modifiers** on a shape, in order: subdivide, displace by seeded noise,
   twist, bend, mirror, array.
4. **A look**: toon shading on a ramp, shadows, an outline.
5. **Motion**: a turntable, or a transform swung as the rig swings a bone,
   every loop closing.
6. **For the game**: a model drawn from four or eight sides, a set by
   direction, `role: 'character'`.

## Works now

- **Primitives, made from their params** (2026-10-06; `shapes.js`,
  `tests/3d-shapes.mjs` 23). Box, sphere, cylinder, cone, torus, plane and
  capsule — three's own geometries, each a catalogue entry like a filter:
  an id, a label, a schema, the geometry its values make. A card's drawers:
  *Form*, the shape's own; *Place*, where it stands, turned about each axis
  in degrees, its size; *Look*, its colour, smooth or flat. A shape added
  from the menu starts beside the last — 0, right, left, further right — in
  the next of eight colours. The cards are core's (`core/Cards.js`), the
  list filter's chain is too: shown or hidden, taken out.
- **Chosen by a click** (2026-10-06, brick 2's first half; `pick.js`,
  `guides.js`, `tests/3d-pick.mjs` 19). A click — a press that never moved
  four pixels, so a drag never picks — sends a ray from the eye through the
  point, by the camera the picture was drawn with, and the first shape it
  meets is chosen: its card the one open, its head in the accent, the others
  folded to a line each (core's cards, `fold`), and its outline's box dashed
  round it in the view, as the map editor marks its chosen thing — never in
  a save. A click on nothing, or Escape, chooses none; a card's name chooses
  its shape too, and a shape added from the menu is chosen. What is drawn is
  what is picked: a hidden shape is not, a plane is from behind, and what an
  orthographic eye draws behind itself is — three starts that ray at the
  eye, this one at the near plane. The answer is the shape's place in the
  list, hidden ones counted, so a card and its shape always agree.
- **Seen from anywhere** (`camera.js`, `pointer.js`, `tests/3d-camera.mjs`
  23). The View drawer is an orbit — turned, raised, a distance, the point
  looked at — and a lens: perspective by its field of view, or
  orthographic, the game's; both frame the same height at the point looked
  at, so switching keeps the size. A drag turns round the model, 240° for
  the picture's height; the right button or shift slides it, the point
  under the pointer staying under it; the wheel comes nearer; F frames
  every shape from where it is seen. Only the picture's shape counts:
  twice the pixels is the same picture.
- **The scene kept in step** (`scene.js`, `tests/3d-model.mjs` 26). A
  move or a colour keeps a shape's geometry; a change of form makes it
  again and frees the old; a shape taken out is freed. One sun, fixed in
  the world — turning round shows the dark side — and an ambient fill, in
  three's physical units: a white face square to a sun of π is white. The
  ground is the 2D canvas's, under three's picture: `none` is a model on
  nothing, a sprite.
- **Drawn on the page's GPU device** (`renderer.js`). three's
  `WebGPURenderer` takes core/gpu/device.js's device — one for the page —
  and draws into an OffscreenCanvas of its own, the picture handed back in
  the call as the filter kit's runner hands back its own. With no WebGPU
  it draws with WebGL2 by itself, the bar saying so — checked with WebGPU
  taken away, the same opening drawn; its one line about falling back is
  kept off the console.
- **Saved, replayed, placed** (`save.js`, `rebuild.js`, `check-3d` 30). S
  saves a `model`: its recipe the panel's values and `shapes: [{ id,
  params, on }]`, titled by its shapes — *box, sphere, torus* — its render
  the format drawn again by `frames.js`. The vault shows the render; asked
  for scale 2, three draws it again at 2160 square, the same picture
  sharper (mean difference 0.02 of 255 once halved); its own replay at
  scale 1 is its render to the pixel on the same machine. `?open=` brings
  the cards back; compose, map and filter take a model.
- **Opens with no vault** (rule 7), on a box, a sphere and a torus.

## Known

- **A model is a still.** No loop until brick 5; the Format drawer has no
  rate.
- **A print past the GPU's side throws** — 16384 here, a WebGL2 fallback
  8192 — with the size in words; compose's print export at scale 4 of an
  A-size sheet is under it.
- **No tone mapping.** Colours stay as typed, so a face square to a strong
  sun clips to white: sun 2.6 and ambient 1 keep the opening under it.
- **The laptop's Intel** should draw with WebGL2 unless Chrome's flags are
  on — the fallback is checked here with WebGPU taken away, not yet seen on
  the laptop itself.

## Next single step

**Brick 2's second half: handles on the chosen shape.** three's
`TransformControls`, vendored by adding it to `ADDONS` in
`scripts/vendor-three.mjs`; its gizmo in the preview's scene only, on the
chosen shape's mesh, a drag on it writing back into the card's x, y, z,
turns and size — and stretched by axis, the parked `sx`, `sy`, `sz`. A
press on a handle is the handle's, never a turn of the view or a pick.
Then duplicated and deleted by key.

## Parked

- **`material`** stays deferred: a colour is a shape's param until two
  models share one.
- **Distance fields** can come back as a family of M7, or as one more way
  to make a mesh.
- **Per-axis size** — `sx`, `sy`, `sz` — waits for the handles, which
  stretch by axis; a box has its own width, height and depth meanwhile.
