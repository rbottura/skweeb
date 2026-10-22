# Decided, 2026-09-26 to -27

After M4: deleting, the next three milestones, rule 8, the GPU kit, looks,
kin in the vault, flipbooks, and M6 chosen. Moved out of
`docs/decisions.md` on 2026-10-22, when it reached the 400-line cap; the
days since are there. Read a day's section before reopening what it
decided.

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

