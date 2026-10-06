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

## Decided since, 2026-09-26

**Objects can be deleted, in two steps.** Decided 2026-09-26, by the author:
a trash first, then deleting for good from it; and when other objects are made
from what is going, either the chain goes too, or they are kept and cut loose —
"still there and usable, but maybe not with all its past features". The trash
is a `trash` tag; cutting loose is the one edit an ordinary object gets besides
its tags, and it records itself in a new envelope field, `detached`. Rules in
`docs/object-model.md`, *Trash, and deleting*.

**Filters, particles and fractals are next; 3D is parked.** The author, after
M4: the suite is to make the assets of a small game, 2D first — with fake 3D
motion where it helps — and 3D later. So M5 is filters, on a GPU kit in core
that the next two share; M6 particles; M7 fractals. 3D was M5 (2026-09-21) and
comes back after, starting from the kit. The plan, each milestone's *Done
when* and its link are in `docs/roadmap.md`.

**Rule 8 is settled: p5 is not required.** Open since M2, when grid was
written without it, then ckt. Every app is ES modules with no globals across
files, which was the point of the rule; p5 is optional and new work does not
take it on. The gamepad's sketch and core's replay of its recordings still use
it, the one version in `core/libs/`, until they are ported — a job of its own,
since every recording in the vault replays through that code and must replay
the same after.

**The GPU kit is WebGPU.** The author's call, after a probe of both on the
serving machine: WebGL2 and WebGPU each ran in headless Chrome with no flags
and each handed a frame to Canvas 2D in the same call; WebGPU adds compute,
one device for any number of canvases, and is where 3D is going. Its cost is
that it needs a real GPU the browser trusts: the author's smallest PC, an
Intel gen-9, had the API but no adapter until Chrome's flags
(`#enable-unsafe-webgpu`, and Vulkan) turned it on — textures to 16384, a
software fallback adapter besides. Nothing is cut to fit a machine without it. Where WebGPU is missing the
apps still open, an app that makes GPU objects says why, and a GPU object
shows as its saved render; a flag lifts the browser's list where the GPU is
merely unlisted. The kit's API speaks canvases, chains and schemas, never GPU
objects, so a second backend stays possible and is not built. The probe ran
on Chrome 154 and a Radeon RX 7600; WebGL2's case was that it runs anywhere,
in software too, and takes the GLSL literature almost as it is — with no
compute, and no new features coming.

**A GPU render replays close, not bit for bit.** The author's answer, before
the first GPU object was saved: a small difference between two machines is
fine. So a GPU object's promise is its recipe; on the machine that made it, it
replays the same, and a check compares a replay with a tolerance. Written into
`docs/object-model.md`, *The recipe contract*.

**A filter may reach past its picture, and a sprite gets the room.** A blur,
a glow, an outline spreads past what it is given; a sprite trimmed to its ink
lost its halo at the trim. So a filter says how far it reaches, and filter's
`edges` — grow or keep — says whether the picture grows to give it room:
`grow` by default, since the suite's pictures are mostly sprites on nothing,
`keep` for a photograph that fills its frame. A recipe from before `edges`
kept its size, and still does: read as `keep`, it replays as it was saved.

**A look is a chain saved alone, and a placement may carry one.** M5's link.
A `params` object made by filter, `{ chain, edges }`, with a picture of what
it does; compose puts it over a placement, whose frames then run through it
(`core/gpu/look.js`), sized by what the look grows. The placement block
gains `look` — written into the object model's *Placement* before it was
used — and a look is a parent of the page it is on.

**Kin sit together in the vault; folders keep their own.** The author, on
2026-09-27: objects joined as parent and child are shown together by
default, from the most original to the last made, in a small container.
Only loose objects: a folder is an explicit decision — a session's
dot-sets, a material's earlier versions put away — and keeps what it holds.
The whole vault still joins them, so two loops made from one dot-set in a
folder sit together and name it. A `lineage` switch in the panel's head
lays them out one by one. And a folder should not look like one more
object: it is shorter now, a peek of its members on a small stack.

**A flipbook is placements in time, not a new kind.** The author, on
2026-09-27: idle animation wants a few frames by hand before it wants motion
filters. The placement block has said *when* since 2026-09-22 — `at` and
`length`, in the page's frames — and nothing honoured it; compose now does.
So a flipbook is stills placed one after another and saved as a composition:
a loop the vault replays and exports, each frame still its own object with
its lineage. No field was added. *Next frame…* puts the object picked where
the chosen one is, with its look, from where it ends, for as long; one with
no length is given its own first, or it would show under every frame after
it. And a press on the page picks up only what shows at the page's tick,
since a flipbook's frames are stacked in one place.

**A ripple, and an onion skin.** The author, the same day, after trying the
flipbook: a placement's end, moved, moves the placements that started at it,
and on down the chain — held longer, cut short, taken off, or a frame put in
after it. Only a chain touching end to start moves, so a page that is not a
flipbook is left as it was unless something on it happens to start exactly
where another ends. No switch: the bar says when anything moved. And paused,
the frames either side show faint — before in red, after in blue — preview
only, a switch in the player drawer, on by default.

**M6 next, M5's catalogue parked.** The author, 2026-09-27: after the
flipbook, particles. M5's *Done when* was met on 2026-09-26; what it stays
open for — the motion group, the time group, more of the catalogue — waits.

**A shader carries its licence, as a font does.** Rule 5 now covers shaders. The
filter catalogue ports from p5.FIP and glfx.js (MIT) and GPUImage (BSD). LYGIA
is under the Prosperity licence — noncommercial, a thirty-day commercial trial —
and Shadertoy code with no licence header is CC BY-NC-SA 3.0 by default: both
stay out of a suite meant to make a game's assets.

## Decided since, 2026-09-28

**One vault, on the laptop that travels.** The author, 2026-09-28: the
machine that serves the vault is the laptop, the smallest of the three, and it
goes between the work PC and the home tower — so what is made at work and at
home lands in one vault, and neither big machine has to stay on for the other.
It serves `~/skweeb-vault` behind `tailscale serve`, a user service that
starts at boot, and sleeps with its lid shut, on purpose: it travels in a bag.
A save made on one machine reaches a panel open on another as it happens
(`server/events.js`), and each machine's old `vault/` is brought over once by
`scripts/vault-merge.mjs`, which copies and never overwrites.

**Ideas between bricks wait in an inbox.** 2026-09-30: the author asked
whether the small ideas that come daily should go to side threads, run by
cheaper agents beside the main one. Mostly not, was the answer taken. A
session's cost here is reading the rules, not typing, and an agent that skips
the reading breaks what the tests do not hold — the order of a slot's draws,
the line cap, a licence line. Threads side by side collide on `STATUS.md`,
`CLAUDE.md` and `core/uses.js`. And an idea is often a roadmap item already:
the first one was. So ideas wait in `docs/inbox.md` and a session sorts them;
only a narrow kind, set out in its head, runs beside the main thread, on a
branch that leaves the shared docs alone.

**M8 is a map editor, and a room first.** The author, 2026-09-30, after M7's
third brick: the suite as a game editor as well as the maker of a game's
assets — a map editor, some physics, a room with posters, a PC and toys to
use, shown on the author's website; PokéWebKit's kind of tool, for the
suite's own objects rather than a ROM. Settled with it: Pokémon's rules for
now — top-down, a grid, tile by tile — with ZQSD to move and E to use, keys
bound by place so a QWERTY moves with WASD; assets made at high resolution
and baked down, cleaned by a look where scaling leaves them rough, pixel art
or smooth to be tried both ways; M7 finished first; the player on a site of
its own, for a larger game later, the portfolio framing the room, minimal;
and the name, `map`, the field's word — its reasons in M8 in
`docs/roadmap.md`. What keeps it in the suite: a map is an object like any
other, pure; the playable map is its export, as video is a loop's, and a
player's state never enters a recipe.

## Decided since, 2026-10-02

**M9 is the rig, between M8's bricks 3 and 4.** The author, 2026-10-02,
taking the slot proposed for an idea in the inbox: the armatures asked about
on 2026-09-27, "with weight calculation like in blender", completed by a
drawing — a slug shaped like a person (`gam_1790893329227_77f756`), whose
parts are layers of one gamepad brush, to move "like scales parts of a
reptile". After brick 3 the room is a showcase with no avatar; brick 4 is the
avatar, the first thing in the suite that needs a body that walks. Settled
with it: a drawing made of marks is rigged at its marks — a stroke a chain of
bones, a stamp riding its own stroke's and staying whole — not its pixels,
which would stretch the scales; the mesh and Blender's heat weights wait for
a picture with no marks. *Armature* is Blender's word for the skeleton; the
app takes the field's wider one, the *rig*. And no physics in it: what
follows a move is a phase lagging down a chain, so a loop still closes;
springs, stepped, belong to M8's player, as its toys do.

**Few human shapes, many worms.** The author, the same day, after seeing the
rig's first loops: walking presets for a basic human-like skeleton, but few
human shapes for now — rather many slugs and worms, moving like a snake
following a path, undulating. So a chain is named a *part* — body, head, arm,
leg, tail — guessed from how it hangs and corrected by hand, and a preset
sets waves by part, so one walk drives any drawing named the same. And a
worm crawls: its first stroke is a spine, every stamp carried with it — a
wave down it in place, Hirose's serpenoid, or the body following its head
round a closed path, slithering through a wiggle laid on the ground — whole
ripples and whole laps, so a loop still closes; a function of the frame,
never a simulation.

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
ground keeps its shadow as a sprite's; the shadow map is one size at every
scale, and three's map is on from the start, since turning it on later
would rebuild every lit material.
