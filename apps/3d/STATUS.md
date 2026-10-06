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
3. **Modifiers** on a shape, in order — done 2026-10-06: subdivide,
   displace by seeded noise, twist, bend, mirror, array.
4. **A look** — done 2026-10-06: toon shading on a ramp, shadows, an
   outline.
5. **Motion**: a turntable, or a transform swung as the rig swings a bone,
   every loop closing.
6. **For the game**: a model drawn from four or eight sides, a set by
   direction, `role: 'character'`.

## Works now

- **Primitives, made from their params** (2026-10-06; `shapes.js`,
  `tests/3d-shapes.mjs` 28). Box, sphere, cylinder, cone, torus, plane and
  capsule — three's own geometries, each a catalogue entry like a filter:
  an id, a label, a schema, the geometry its values make. A card's drawers:
  *Form*, the shape's own; *Place*, where it stands, turned about each axis
  in degrees, its size, and a stretch along each of its own axes — a recipe
  from before them stands as it did; *Look*, its colour, smooth or flat. A
  shape added from the menu starts beside the last — 0, right, left,
  further right — in the next of eight colours. The cards are core's
  (`core/Cards.js`), the list filter's chain is too: shown or hidden, taken
  out.
- **A stack of modifiers** (2026-10-06, brick 3; `modifiers.js` the
  catalogue, `deform.js`, `repeat.js`, `tests/3d-modifiers.mjs` 41). A
  shape's card holds, after its form, a list of modifier cards — core's
  cards inside a card, `inner` — in order, each on or off, sooner or later;
  its recipe entry keeps them as `modifiers: [{ id, params, on }]`, and the
  geometry is made again when they change, kept when they do not. They work
  in the shape's own space, before its place:
  - *subdivide* — every triangle into four, flat, one to four times, each
    edge's midpoint shared: nothing changes to the eye, what bends after it
    has vertices to bend;
  - *displace* — along the normals by seeded 3D noise (core/noise.js
    `noise3`, new), its amount, its bumps' size, its detail, its seed; a
    point's copies, at a seam or a box's edge, move together, so nothing
    cracks, and the normals are made again — smooth across a seam, hard
    across an edge that was hard;
  - *twist* — about the shape's x, y or z, the whole angle end to end, the
    middle still;
  - *bend* — an axis laid on an arc of a whole angle, end to end, up (along
    y, toward +x); 180° makes a plank a half ring, its ends facing up;
  - *mirror* — a twin across a plane a distance from the middle, facing out;
  - *array* — a row of itself, its middle where the shape was.

  Twist and bend carry each normal by the cofactor of their Jacobian, so a
  twisted face's normals are the surface's and a box's top keeps its own.
  No stack passes half a million triangles: subdivide stops a level short,
  a row is cut shorter, a mirror left out, the same way every time. A
  model twisted and displaced saves, replays to the pixel, draws again at
  scale 2 and reopens with its stack; F frames by every vertex.
- **A style** (2026-10-06, brick 4; `look.js`, `tests/3d-look.mjs` 29), the
  model's, in its Style drawer — a shape keeps its colour and its flat or
  smooth:
  - *bands of light* — 0 is three's physical shading as before; 1 to 6 a
    MeshToonMaterial on a ramp of that many steps, each at its band's
    middle, nearest-read, one ramp shared by every model;
  - *outline* — thousandths of the picture's height, and its colour: a hull
    of each shape behind it, its back faces pushed out on the picture along
    normals smoothed where a box's edge splits them, so no corner opens; a
    share of the picture, so scale 2 is the same line; none for a plane;
  - *shadows* — the shapes cast and receive, the sun's shadow camera round
    the model, a catcher under its foot that is nothing but shadows, so a
    model on a ground of `none` keeps its shadow.

  All three draw under WebGPU and WebGL2, save, replay to the pixel and draw
  again at scale 2 the same picture (mean 0.07 of 255).
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
- **The scene kept in step** (`scene.js`, `tests/3d-model.mjs` 29). A
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
- **Saved, replayed, placed** (`save.js`, `rebuild.js`; `check-3d` 61 with
  all the above, a real mouse on the handles). S
  saves a `model`: its recipe the panel's values and `shapes: [{ id,
  params, on }]`, titled by its shapes — *box, sphere, torus* — its render
  the format drawn again by `frames.js`. The vault shows the render; asked
  for scale 2, three draws it again at 2160 square, the same picture
  sharper (mean difference 0.02 of 255 once halved); its own replay at
  scale 1 is its render to the pixel on the same machine. `?open=` brings
  the cards back; compose, map and filter take a model.
- **A print at a sheet's size and a dpi** (2026-10-06; core's `print.js` and
  `PrintPanel.js` — this app's own print moved into core the same day, for
  every app — core/png.js, `tests/png.mjs` 10, `check-3d-poster` 8). On a print format
  — A5 to A1, or the new 120×176 — the Export drawer's print panel takes a
  dpi and says what it comes to; *Print it* draws the model at the sheet's
  pixels in tiles of 2048, each a window of the whole sheet's camera, the
  outline's push in each tile's terms, and writes them band by band into a
  PNG with the dpi in its pHYs. Never the vault's: a file for a printer.
  Drawn again sharper — smooth round shapes get π√R segments for the sheet,
  the shadow map 4096 — flat shapes keep their facets. The 120×176 poster
  at 300 dpi, 14173 × 20787 px in 77 tiles, prints in 12 s to 3–5 MB for a
  model on its ground; twelve tiles against the model drawn whole differ by
  0.009 of 255; a crop across a tile's corner shows no seam.
- **Opens with no vault** (rule 7), on a box, a sphere and a torus.

## Known

- **A model is a still.** No loop until brick 5; the Format drawer has no
  rate.
- **A replay asked for a scale draws in one piece**: compose placing a
  model and exporting its page as one PNG at scale 4 asks rebuild.js for the
  whole frame, which throws past the GPU's side — 16384 here, 8192 under
  WebGL2 — with the size in words. A print asks for windows (`frames.js`
  `window`), in compose too; a print's file sizes are measured on a
  model with ground round it, and a picture filling the sheet will be
  larger.
- **No tone mapping.** Colours stay as typed, so a face square to a strong
  sun clips to white: sun 2.6 and ambient 1 keep the opening under it.
- **The style's fixed parts**: a shadow's darkness (0.35) and its map
  (2048 a side) are not rows yet; a long, low shadow can leave its map's
  reach and be cut. A plane has no outline.
- **The laptop's Intel** should draw with WebGL2 unless Chrome's flags are
  on — the fallback is checked here with WebGPU taken away, not yet seen on
  the laptop itself.
- **The handles turn about the world's axes**, never the shape's own; three
  has a `local` space, Q in its examples, not offered yet. And their size is
  three's: a fixed share of the picture, small on a small screen.
- **Nothing is undone.** Delete, or Backspace as the map editor has it,
  takes the chosen shape out for good — as a card's ✕ always did.

## Next single step

**Brick 5's first: a turntable.** A Motion drawer: turns a loop — 0 still,
±1, ±2 — its length in frames and its rate; frame i seen from the yaw plus
360° × turns × i / length, so frame `length` is frame 0 to the bit.
frames.js's `openModel` gives that many frames at that rate; core's
Playhead plays them in the view, space to stop, the handles hidden while
it plays. S saves a `sequence`, as the rig's loops are — its recipe the
model's and its motion — replayed by rebuild.js; compose plays it — unless
the author answers otherwise what a moving model saves as (`STATUS.md`,
*Next*). Then a shape's place swung on a wave, as the rig swings a bone.

## Parked

- **`material`** stays deferred: a colour is a shape's param until two
  models share one.
- **Distance fields** can come back as a family of M7, or as one more way
  to make a mesh.
