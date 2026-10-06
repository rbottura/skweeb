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
2. **Handled in the view** — done 2026-10-06: picked by a click, moved,
   turned, sized and stretched by handles, duplicated, deleted.
3. **Modifiers** on a shape, in order: subdivide, displace by seeded noise,
   twist, bend, mirror, array — begun 2026-10-06: the stack, subdivide and
   twist.
4. **A look**: toon shading on a ramp, shadows, an outline.
5. **Motion**: a turntable, or a transform swung as the rig swings a bone,
   every loop closing.
6. **For the game**: a model drawn from four or eight sides, a set by
   direction, `role: 'character'`.

## Works now

- **Primitives, made from their params** (2026-10-06; `shapes.js`,
  `tests/3d-shapes.mjs` 24). Box, sphere, cylinder, cone, torus, plane and
  capsule — three's own geometries, each a catalogue entry like a filter:
  an id, a label, a schema, the geometry its values make. A card's drawers:
  *Form*, the shape's own; *Place*, where it stands, turned about each axis
  in degrees, its size, and a stretch along each of its own axes — a recipe
  from before them stands as it did; *Look*, its colour, smooth or flat. A
  shape added from the menu starts beside the last — 0, right, left,
  further right — in the next of eight colours. The cards are core's
  (`core/Cards.js`), the list filter's chain is too: shown or hidden, taken
  out.
- **A stack of modifiers** (2026-10-06, brick 3 begun; `modifiers.js`,
  `tests/3d-modifiers.mjs` 24). A shape's card holds, after its form, a list
  of modifier cards — core's cards inside a card, `inner` — in order, each on
  or off, earlier or later; its recipe entry keeps them as `modifiers: [{ id,
  params, on }]`, and the geometry is made again when they change, kept when
  they do not. They work in the shape's own space, before its place.
  *Subdivide*: every triangle into four, flat, one to four times, each
  edge's midpoint shared, stopping short of half a million triangles the
  same way every time — nothing changes to the eye, what bends after it has
  vertices to bend. *Twist*: about the shape's x, y or z, the whole angle
  from one end to the other, the middle still. A deformation carries each
  normal by the cofactor of its Jacobian, so a twisted face's normals are
  the surface's and a box's top keeps its own. A twisted model saves,
  replays to the pixel, draws again at scale 2 and reopens with its stack;
  F frames by every vertex, so a twisted, turned box is framed tight.
- **Handles** (2026-10-06, brick 2's second half; `handles.js`, `chosen.js`,
  `tests/3d-handles.mjs` 18). The chosen shape wears three's
  TransformControls: arrows and squares that move it, rings that turn it,
  cubes that stretch it along one of its own axes or, the middle one, size
  it — move, turn and size over the view, or W, E, R. What a handle does
  goes back into the card, only what its mode changes (scene.js `placeOf`):
  the card stays the recipe, the bounds of its rows the handles' bounds.
  pointer.js asks the handles first, through three's own pointer calls, so
  a press on a handle is never a turn of the view nor a pick. The gizmo is
  a scene of its own drawn over the picture, never in a save. D duplicates
  the chosen shape, right after it in the list and beside it in the world,
  the copy chosen; Delete takes it out; the buttons over the view do both,
  and are off with nothing chosen. In Node, with three's own controls: a
  drag along the x arrow moves the shape exactly as far as the pointer went,
  the ring facing the eye turns it by the angle swept, a cube stretches it
  as far as the pointer went out.
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
- **The scene kept in step** (`scene.js`, `tests/3d-model.mjs` 28). A
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
- **Saved, replayed, placed** (`save.js`, `rebuild.js`; `check-3d` 52 with
  all the above, a real mouse on the handles). S
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
- **The handles turn about the world's axes**, never the shape's own; three
  has a `local` space, Q in its examples, not offered yet. And their size is
  three's: a fixed share of the picture, small on a small screen.
- **Nothing is undone.** Delete, or Backspace as the map editor has it,
  takes the chosen shape out for good — as a card's ✕ always did.

## Next single step

**Brick 3's next: bend.** A modifier in `modifiers.js` as twist is: the
shape's x, y or z bent into an arc of a whole angle, end to end, about an
axis square to it, its middle where it was — Blender's simple deform, its
pivot at the radius the angle makes. Through `deform`, so its normals ride
the Jacobian; a test that a bend of 180° makes a half ring whose ends point
back. Then displace by seeded noise, which wants a 3D noise in
core/noise.js first — it has 2D only — and a direction shared where a
seam or an edge splits a vertex, so a box does not crack open.

## Parked

- **`material`** stays deferred: a colour is a shape's param until two
  models share one.
- **Distance fields** can come back as a family of M7, or as one more way
  to make a mesh.
