# Decided — why things are the way they are, by date

What the roadmap now takes for granted, and the reasoning that settled it.
Moved out of `docs/roadmap.md` on 2026-09-24, when the roadmap reached the
400-line cap, as `docs/migration.md` was before it: the roadmap keeps the
milestones, the current day's decisions and what is still open, and the days
before live here. Read a day's section before reopening what it decided.

This file keeps the newest days. When it reaches the cap, its oldest days
move to a file named for their dates, listed here:

- **2026-09-21 to -23** — `docs/decisions-2026-09-21-to-23.md`: the `.skw`,
  export, the loop format, video as frames plus ffmpeg, replay as a
  dispatch, framing, M2 and M3 done, the UI pass, reopening, the tailnet,
  and where the name came from.
- **2026-09-26 to -27** — `docs/decisions-2026-09-26-to-27.md`: deleting in
  two steps, filters then particles then fractals with 3D parked, rule 8
  settled, WebGPU and a GPU render replaying close, a filter's reach, looks,
  kin and folders, the flipbook and its ripple, M6 over M5's catalogue, a
  shader's licence.
- **2026-09-28 to 10-02** — `docs/decisions-2026-09-28-to-10-02.md`: one
  vault on the laptop that travels, ideas between bricks in an inbox, M8 a
  map editor and a room first, M9 the rig between M8's bricks 3 and 4, few
  human shapes and many worms.

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

## Decided since, 2026-10-21

**A VTuber puppet, now, the rest paused.** The author, 2026-10-21, with a
bust drawn in the gamepad — a tube of stamps, two eyestalks, two small arms
(`gam_1792618477805_861bac`, on the tower's vault until the next merge):
"je voudrais mes yeux dans un premier temps, je voudrais qu'on teste ça
maintenant et mettre le reste sur pause si c'est pas bloquant". So M9's
brick 6, M8's fourth and the newsroom idea wait. "Mes yeux dans les yeux
de l'avatar" is the camera's own eyes, cut out and worn at the stalks'
tips — not drawn eyes that blink as the author does.

**The puppet is the rig's player, and a performance.** `apps/rig/puppet/`,
as `play/` is the map's: it wears what the rig rigs, drawn by the rig's own
code, and what it does live — the camera's eyes, the head's turn, springs
with a past — never enters a recipe. Its values live in its address, the
thing OBS is given. A puppet saved in the vault, a `params` object, waits
until one is wanted. No VTuber program is used: Live2D, Inochi2D and
VSeeFace want the avatar made again as a mesh or a 3D model, and the stamps
riding their bones would be lost.

**MediaPipe reads the face, and git never holds it.** The Face Landmarker
of `@mediapipe/tasks-vision`, pinned at 1.0.1 (1.1.1 was a week old):
Apache-2.0 by its `package.json` and by each of the three model cards its
bundle is made of. Its WASM is 11.8 MB and its model 3.8 MB, binaries, so
`scripts/vendor-mediapipe.mjs` fetches them on each machine into
`core/libs/mediapipe/` and git keeps its README (rule 6); the page never
fetches them from outside (rule 7), and opens without them, saying how.

**OBS is started with a flag, and guides live in `docs/guides/`.** OBS 32
gives a Browser source nothing of its own accord but the loopback network
(obs-browser's permission handler), so the camera is refused; started with
`--enable-media-stream --use-fake-ui-for-media-stream` it is given — tried
by the author the same day: "ça fonctionne comme sur chrome dans obs". The
page says so inside OBS. What needs another program is written in
`docs/guides/` and read in the app by `core/Guide.js` — the author's
suggestion, made in core for every app.

**The puppet is kept as a smart object, and OBS follows it.** 2026-10-22,
the author: the settings chosen in the window "did not stay in OBS" — the
address, copied once, was OBS's copy. So a puppet is sent (S): saved as a
`params` object bound into a `skw`, every send its next version, the page
in OBS opened on `?open=<id>` taking each version as the server announces
it (server/events.js) — M11's smart objects, unchanged. A send is a
version, so versions are what the author chose to send, never every
slider's step. Its app is `rig/puppet`: core builds `/apps/<app>/` for
`rebuild.js` and `?open=`, so the puppet's own page and file are found with
no change to core. And the camera has a switch, and a page waiting for it
takes it when it is let go: on this machine one camera goes to one program.

**The puppet finds its parts; the rig's proposal can be ordered.** The same
day, a drawing made eyes first had its mouth on an eye: the rig takes the
first stroke for the body. The puppet takes the widest — a bust is drawn
with a bigger brush than its stalks — and reads each stroke from the end it
hangs by, the author telling any of it otherwise (`parts`). For it the rig
took two options and changed nothing it draws: `proposeBones(…, { order })`
and `drawingOf(…, { reverse })` — the rig's own proposal by hand, parked in
its STATUS, can stand on them.

## Decided since, 2026-10-22

**A branch for each work item.** The author: "je suis le seul dev sur le
projet pour l'instant mais je voudrais adopter une méthode de production
correcte". Until that day every commit went straight onto `main`, and two
days of the puppet sat uncommitted on the tower. So `main` is always green
and is what every machine runs; every item of the plan is a branch, made
when the item starts. A rebase brings a branch up to `main`, a merge lands
it: `--no-ff` for two commits or more, so `git log --first-parent` reads as
the board and one revert takes an item out; `--ff-only` for one, since a
merge commit round a single commit says nothing. No squash: the commits are
the project's diary, a brick's commits how it was built. A gate before
landing — the unit loop, the checks of what was touched, the line cap, the
docs — and a session ends pushed, three machines sharing the code. Side
jobs keep the inbox's definition and run in worktrees of their own
(`docs/workflow.md`).

**The work is a board, and its order the author's.** `docs/plan.md`, the
same day: the suite tidied, columns that fit, the paused bricks, layers and
smart objects — each item with its branch, its size, what it needs and a
*Done when*; and what waits on the author, each with what happens if
nothing is said. The order, laid out and taken — "l'ordre proposé me va":
the ground cleared, then the columns, then the bricks that wait on no one,
then the layers, and the shell last, after a mockup.

**The UI's second pass closes before it moves.** Measured that day in every
app at 1600 × 1000: a column runs 2.14 screens on average as it opens,
ckt's motion column 3.2. Four drawers every app shares — Format, Export,
Stack, the player — are open by default under the app's own, and a range
row is two lines, 70 px. Closing those by default takes the mean to 1.54,
a row on one line to 1.32; moving them out of the column, to the viewer, a
sheet and a panel of their own, to 1.23 only. So the cheapest step goes
first, and where the shared things live waits on the author's eye.

**The roadmap keeps the milestones still open.** It stood at the cap: the
done ones — M1 to M4, M6 and M11 — went word for word to
`docs/roadmap-done.md`, as the decisions' older days went before them; the
roadmap keeps an index of all eleven, and the links as a section of their
own.

**Saved three ways, and followed wherever used.** Asked how a moving model
saves, the author answered for every app: "sauvegarder une still doit être
possible, une séquence aussi, et un smart object aussi" — a 3D smart object
as a particle sprite, drawn again in particles when the model is changed in
the 3D app. So S opens a sheet in every app on core's kit — 1 a still, 2 a
sequence, 3 a smart object — the keys by their place, & é " on the
author's AZERTY as ZQSD is WASD; what an app cannot make is greyed, and
Enter repeats the last choice. A smart object is M11's bound form,
unchanged: what is on screen bound, its next save its next version. And it
is followed wherever an object can be picked, not only where compose
places it and filter takes it: core's picker hears its versions and core's
loaders unwrap it. A moving model's sequence keeps the default asked on
2026-10-06 — the model's recipe and its motion, the model its parent — and
a character is taken as proposed: "on adaptera sûrement plus tard".

**A tolerance comes with the fault it must still catch.** C7, the same
day: check-print's still painted as the gamepad paints stood 0.13 of 255
from core's drawing of it from its marks, where 0.05 was asked, on the
commit of 2026-10-07 as on that day's — and drawn by the same path in a
fresh page the two are 0.0009 apart. So `core/stage/still.js` is right,
and Chrome 155 draws a sprite's turned edges a little differently by what
the page drew with that picture before; which history, the measures did
not pin down. A frame one pixel off is 2.8 of 255 and 3.6% of values: the
bounds sit between, 0.5 and 1%, and the check draws that pixel-off frame
too and fails if the bounds no longer tell it apart. The rule of the
checks — measure, never demand the pixel — now says how far: as far as a
fault measured beside it allows.

**Rule 4 eased: a file is looked at past 400 lines, split past 600.** The
author, the same day: the cap "un peu trop arbitraire", cutting files in
parts where one would be cleaner. Seen that day: check-3d, cut to pass
under 400, copied its helpers and built its model again for the half that
saves — a split that shares a setup is coupling by copy — and the plan was
trimmed to fit rather than shaped. What the cap was for stays: one concept
per file, and a session's reading bounded. So past 400 a file is split
along a seam it already has — never into a part two — or kept whole with
its reason written in `scripts/lines.mjs`; past 600 it splits; and the docs
every session reads — CLAUDE.md, STATUS.md, docs/plan.md — keep 400, since
every session pays for them. check-3d is whole again, 414 lines, its print
in check-print where it belongs; the checks' helpers, copied in every
check, wait to be shared (C9).

**The UI's second pass becomes a redesign, boxes first.** The author, the
same day, to the plan's measures: "mesurer les colonnes n'est pas
nécessaire" — what is wanted is "une manière de mise en page plus efficace
qu'une colonne scrollable", found from notes the author will take opening
each app; meanwhile the boxes every app shares, "comme les formats et
export", gathered as components "présents sur chaque app"; and with it the
theme: "nous allons certainement laisser tomber le néo-brutalisme comme
thème global", the new one to be described. So U0 is dropped; the proposals
measured that day become the new layout's starting points, not items; the
shared boxes come first, one contract in core, today's drawers their first
layout so that nothing moves on screen; and nothing is restyled before the
description. The theme of 2026-09-23 is reopened, not yet replaced.

## Decided since, 2026-11-03

**The new UI is found on a bench, then built on core.** The author asked to
work the UI out "ensemble dans un artefact … ou une nouvelle appli comme un
bench", and gave its direction the same morning: VS Code's modern dark,
"des légers rounded corners et des borders très fines", radial menus held on
a key, the left hand where a player's rests. Six versions of a bench came of
the day (`docs/scene.md`, *The bench*): what it settled — a value on one
line with its slider a second line only where wanted, a row's mark, the
keys by place, the player as After Effects' preview, saving in the author's
order — is the description U10 waited for and much of U9's notes. The bench
is a prototype outside the suite; each thing is built again on core's kit.

**An object's states are a tree, as a file's commits.** "Il ne faut pas
qu'à chaque pression de S il y ait un nouvel objet dans le vault mais
plutôt qu'on sauvegarde un nouvel état d'un objet." A state is its values
and its parent; a merge takes what only the arriving state changed and
keeps, on a conflict, the receiving one's value until the other is picked.
Between apps the lineage stays `parents`, pinned to a state (`id@vN`): each
app keeps its own recipe's states. A gabarit is made for its format and is
laid again on another, in % or in px. The model's fields are written up as
proposed, the author's to confirm (`docs/plan.md`, *Waiting*).

**The scene is M12, after the boxes.** "Une forme de fusion inter app avec
au centre le canvas qui ne bouge pas … et le reste qui s'adapte autour",
the apps still in tabs. Planned the same day, to begin after the session's
reset at 15:40 as one refactor in bricks, S1 to S10. It takes up U8, U10,
U11 and L10. Rule 7 — "not a shell that owns the page" — is kept as long as
the scene is one more host and never the only one; the author worded it the
same afternoon: "garder la possibilité d'avoir les apps en onglet
indépendantes ou alors une scène générique", the *skweeb absolute scene*, a
name to find. The space viewer gets its own bench before S10 (S11), and the
refactor starts with S1.

