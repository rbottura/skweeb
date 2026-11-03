# Decided — 2026-10-06 to 2026-10-20

The days moved out of `docs/decisions.md` on 2026-11-03, word for word,
when it reached 400 lines — as the days before them moved, its head listing
each file. Read a day's section before reopening what it decided.

## Decided since, 2026-10-06

**3D comes back, as M10, and it is meshes.** The author, 2026-10-06, with
M9's last brick waiting on the slug's views and nothing else under way: "a
simple thing to generate and manipulate some real basic primitives". Two
ways were weighed. Distance fields, ray-marched — the plan when 3D was
parked: one pass on the GPU kit as escape time is, pure, exact at print
scale, shapes melting into each other for nothing. And meshes, which the
author kept — "i also like opportunity meshes gives to us" — for what they
open: a stroke turned on a lathe or swept along a path, type extruded, a
height field from a picture, modifiers, OBJ and glTF out and in, skinning
one day. Distance fields can come back as a family of M7, or as one more
way to make a mesh.

**`model` is a type.** Deferred since 2026-09-21 "until there is something
that makes them"; M10 makes them. A model's recipe is what it is made of —
each shape a primitive, its params, a transform, a colour — with its camera
and its light, never its vertices, which the params make again: a frame
draws on its own at any size, and a print is drawn again, not enlarged. Its
pictures are `still` and `sequence`, the model their parent. `material`
stays deferred: a colour is a shape's param until two models share one.

**three.js draws M10, and the app is `apps/3d/`.** The author, the same
day, after the rundown of what three.js offers: "lets go threejs". Its
WebGPU renderer takes the page's own device (`parameters.device`, read in
r186's source), so the one-device kit holds; where there is no WebGPU it
falls back to WebGL2 by itself, so the 3D app should open on the laptop's
Intel with no flags — checked with WebGPU taken away, not yet there. What it brings that the suite would otherwise write: lathe,
extrude and tube, the handles of brick 2, toon shading, shadows, outlines,
skinning, glTF and OBJ in and out. What it costs: 3.6 MB of build, a
release a month — pinned in `core/libs/three/` by
`scripts/vendor-three.mjs`, upgraded on purpose — and code too big to read
when it breaks. The recipe stays the suite's data, never three's own JSON,
whose ids are random (rule 2) and whose shape is three's version's. The
name is the author's: `3d`, lowercase as every app is, since the laptop's
server tells `3D` from `3d`.

**The handles are three's, driven by the app.** Brick 2, the same day.
three's TransformControls is the gizmo, vendored as an add-on, but never
given the canvas: pointer.js owns the pointer and hands it a press first,
through the add-on's own public calls, so a press on a handle is never a
turn of the view nor a pick, whichever listener came first. Its gizmo is a
scene of its own, drawn over the model's picture as the chosen shape's
dashed box is: a save never has it, and a mesh the model lets go of is never
left held. What a handle does goes back into the shape's card, only what its
mode changes, so the card stays what the recipe keeps. And the per-axis
size parked with brick 1 is taken, since the handles stretch by axis: every
shape's place has `sx`, `sy`, `sz`, a stretch along its own axes times its
`size`, each 1 unless set, so a recipe from before draws as it did. Chosen
by a click, a shape's card is the one open and the rest fold to a line —
core's cards learned `fold` for it; filter's chain does not fold.

**A shape's modifiers are a stack in its own entry.** Brick 3, begun the
same day: `modifiers: [{ id, params, on }]` beside a shape's `params`, run
in order on its geometry in its own space before its place, as Blender's
stack runs — a list of cards inside the shape's card (core's cards,
`inner`). Not a list for the whole model: a twist belongs to the shape it
twists, and travels with it when it is duplicated. A deformation carries
the normals with the vertices, by the cofactor of its Jacobian, rather
than making them again, so a box's edges stay hard and a sphere's seam
stays smooth. Subdividing stops short of half a million triangles, the same
way every time, since a recipe must draw the same everywhere it opens — and
so does a row cut shorter, a mirror left out. The rest of the six the same
day: a displacement by 3D noise carries its seed among its params (rule 2),
moving a point's copies together so nothing cracks; a bend lays an axis on
an arc, end to end, as the twist turns; a mirror reflects across a plane a
distance from the shape's middle, since a primitive is centred and would
mirror onto itself; a row keeps its middle where the shape was, so it
turns and frames about it.

**A model's style is the model's; a shape's colour its own.** Brick 4, the
same day: bands of light, an outline and shadows are rows of the model's
Style drawer, since a look is the whole picture's — a game's sprites share
one — while a shape keeps its colour and its flat or smooth. Toon is
three's MeshToonMaterial on a ramp whose steps sit at their bands'
middles, so its brightest stays under white where physical shading would.
The outline is an inverted hull, as three's toon outline pass draws one,
but a mesh of each shape's own rather than a pass, so it draws in the same
call as the model; its push is a share of the picture's height, never
pixels, so a print at scale 2 is the same line, and its normals are
smoothed where a box's edge splits them, so no corner opens. Shadows fall
on a catcher of nothing but shadows under the model, so a model on no
ground keeps its shadow as a sprite's; the shadow map is one size for the
preview and its saves — a print's is larger, below — and three's map is on
from the start, since turning it on later would rebuild every lit material.

**A print past any canvas is tiles and a streamed PNG.** The author, the
same day: a still of a model at 120 × 176 cm and 300 dpi, "extremely large
but we don't need to preview it live, just one export". That is 14173 ×
20787 px, past Chrome's canvas cap and any GPU's side, so it is drawn in
tiles, each a window of the whole sheet's camera, and written band by band
into a PNG by core/png.js through the platform's deflate, its dpi in a
pHYs — nothing holds the whole picture. The sheet is a print format in
core's table, as A1 is, so the bar says its dpi in every app. A print is
not the vault's: it is a file for a printer, and the model saves as
before. And it is drawn again sharper, never enlarged: a smooth round
shape gets π√R segments for the sheet, since 48 round a sphere five
thousand pixels across is five pixels off a circle; a flat shape keeps its
facets, its look; the shadow map is 4096 a side.

**Every app prints, a window at a time.** The author, the same day: "can we
open / add that new print format and image creation process to all our
suite apps?" So the print is core's — the picture fitted whole on the
sheet, the paper round it — and every app's Export drawer has the same
panel: the sheet, the dpi, the paper. What a print asks of an object is
one thing more of its handle, `window(i, win)`: a part of a frame at the
handle's scale, so no app ever draws the whole sheet. Most draw it with
their own drawing code through a context moved by the window's corner; the
3D app with its camera's view offset; escape time with the plane's own
window; a chain of filters over its part of the source and as far round it
as the chain reads — a pixelation reads a block and spreads nowhere, so a
filter says each — run as that part of the whole, the GPU prelude taught
where a run lies, so a vignette's middle and a halftone's grid land where
they would;
compose asks each placement for its part. A gamepad still, its picture at
any size until now, is drawn again from its marks by core, each sprite
from its own pixels — the stamps the rig rigs, moved into core so the two
cannot drift; at its own size its sprites resample as the gamepad's canvas
did, which is how its render was made. A gamepad loop, replayed by p5, has
no window yet: drawn whole as large as a canvas allows, enlarged into the
tiles, and the print says by how much. The gamepad's print is a box of its
own, E — a mouse's and a keyboard's, since a print is chosen once, sitting
down. A print is never saved: it is what a save would write, drawn again.
How each kind meets the window is in `docs/core-export.md`, moved out of
the core API's file, which stood at its cap.

**M11 is the live stack and smart objects: windows, not one page.** The
author, the same day, choosing from three: every app stays its own window —
no page holding them all, which would be a shell owning the page (rule 7)
and every app at once in one tab — and the windows share one stack, each
drawing it round its own layer. A browser cannot see through a window nor
set the order of windows, so the windows share recipes and draw each other,
as bgstaal's multipleWindow3dScene shares one scene between its windows.
Live within one browser, over a `BroadcastChannel`: the tower's and the
laptop's windows share saved smart objects through the vault, never what is
unsaved. And every placement gains `opacity` and `blend`, CSS's blend
modes by name — one spec with canvas's, so a window shows a layer as a save
will draw it. Written into `docs/smart-objects.md`, the spec's own file now.

**A smart object binds the kind of thing it is, and a window binds into
one.** M11's brick 5, 2026-10-07. The bound form carries the `type` its app
made — a loop, a page, a model — since each app replays each kind its own
way, and the spec's form had no room for it. A `skw` is saved by the app
that makes it, through its own save: the window is bound, and its next save
of that kind is the next version, so its title, lineage and picture are the
app's as ever. A window filter follows, asked to save, saves as one; one
reopened in its app binds that window. `refs` fill in by themselves: a
`skw_` id among the parents is a dependency too. Pins, flatten and
refusing a cycle wait for compose's placements to carry a version.

**The stack is saved as a page; compose's placements blend.** M11's brick 6,
the same day. Any window's drawer saves the stack, not only compose's: a
page is compose's recipe whoever writes it, and its picture is compose's
replay — so the stack can be kept from the window the author is working
in. Every window in it is saved as a smart object, so the page follows
them. And compose's placements take the stack's `opacity` and `blend`,
drawn by its one drawing path, so its preview, its saves, its export and
its print show them alike.
