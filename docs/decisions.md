# Decided — why things are the way they are, by date

What the roadmap now takes for granted, and the reasoning that settled it.
Moved out of `docs/roadmap.md` on 2026-09-24, when the roadmap reached the
400-line cap, as `docs/migration.md` was before it: the roadmap keeps the
milestones, the current day's decisions and what is still open, and the days
before live here. Read a day's section before reopening what it decided.

## Decided since, 2026-09-21

**The `.skw` is a smart object.** A sketch with its parameters bound into it,
placed by reference, so editing the definition updates everything holding it.
Two forms — `bound` (names an installed app, nearly free once `render()` exists)
and `standalone` (carries its own module). Placements can pin to a version or
override params; only the definition carries versions. See
`docs/object-model.md`.

**`sketch-2-print` keeps its gamepad.** The copy under `skweeb/apps/gamepad/` is
the living one; the original stays where it is, frozen at the moment of the
copy, bugfixes only. They will diverge, and that is accepted rather than
accidental. Nothing is deleted.

**Export is two tools.** p5.capture for drafts; `core/export.js`, driven by
`render()` with no clock in it, for anything that becomes an object or goes to
print. See `docs/core-api.md`.

**Loop format.** `render.webm` is the object; frames are a cache rebuilt on
demand at whatever size is asked for.

**Print resolution is export-only.** Live rendering stays at screen size with a
density parameter. `render()` must be size-parametric, but it only ever runs at
print scale once, at export. See the section above.

**3D is real, and it is M5.** A fourth app rather than a retrofit, so `model`
and `material` stay deferred until there is something that makes them.

**Fonts are audited.** Eight files cleared into `assets/fonts/`, six pulled, all
from the licence records embedded in the files themselves. `docs/fonts.md`.

**Standalone `.skw` sandboxing is deferred, with one design rule.** The problem,
plainly: a standalone `.skw` contains JavaScript. Running your own is no
different from running your own sketch — locally, single user, there is no risk
at all. It only becomes a question the day a `.skw` written by someone else runs
in your browser, or yours in theirs, because that code can do whatever the page
can. So the rule that keeps the door open: **`render()` stays pure** — it
receives `{ width, height, frame, rng, load }` and returns pixels, and never
touches `Vault`, the DOM or the network itself. Keep that and sandboxing later
is "run it in a worker", not a redesign.

## Decided since, 2026-09-22

**Video is frames plus ffmpeg, and the muxer is cancelled.** A sequence's
frames already come out as a numbered PNG zip, which is a good archival format
and a lossless one. `scripts/frames-to-video.mjs` turns that into a file with
ffmpeg on the command line. No WebCodecs, no vendored container writer, no
MediaRecorder.

The reasoning, so nobody reopens it: a browser muxer would be several hundred
lines of bit-packing to reimplement, badly, a thing ffmpeg does correctly, with
every codec, and that the person running this already has. The only argument
for it was that a `.webm` inside the vault would let the gallery play a loop —
and that argument died when `core/rebuild.js` and `core/playback.js` made any
object replayable from its recipe, with no file to play. The envelope still
allows `render.webm`; nothing stops a rendered file being brought back in as an
object later.

What this costs, stated plainly: producing a video is two steps and one of them
is a terminal. That is accepted. The zip is the deliverable the app owes; the
video is a conversion.

**M2 is done.** Grid loads a vault object, dithers it, and saves the result
with the source in `parents`. Per-frame was chosen over dithering once and
replaying: the dither follows the motion, and the cost lands on export because
the preview only ever dithers the frame under the playhead. The output carries
**grid's** recipe with the source named inside it, so re-rendering re-runs the
whole chain — which is the first time anything actually walked `parents`.

**Replay is a dispatch, and it is what M4 stands on.** `core/rebuild.js` used
to mean one thing: replay a recording of marks. It now recognises that a recipe
it does not understand belongs to the app that wrote it, and loads
`/apps/<app>/rebuild.js` by convention to ask. Core never learns what dithering
is; grid answers for its own objects, and a grid sequence replays by rebuilding
its parent and re-running the dither over every frame.

That is exactly the capability a composition needs — *give me frame N of this
object, whatever made it* — so M4 does not have to invent it, and M5's fourth
process gets it for a file rather than an edit to core.

**Framing is one idea, in core.** `core/frame.js` and `core/formats.js`: a
parameter group an app spreads into its own schema — `format`, `width`,
`height`, `link`, `bleed`, `zoom` — plus a table of named shapes carrying
either a ratio, exact pixels, or millimetres. Content is placed at 1:1 and
allowed to overflow; there is no automatic fit and no automatic crop, because
letterboxing is "a bigger canvas" and cropping is "a smaller one" and neither
needs a policy that would be wrong half the time.

The field names are `format`, `mm` and `bleed` on purpose, so **M4's page is a
user of this table rather than a second copy of it**. The `page` block
specified above is already written in its vocabulary.

Print support is that table plus `dpiOf()`, and deliberately nothing else. The
workflow was already reachable — replay a sequence at density 4 and the still
is print quality — and what was missing was being able to see whether it had.
Grid's readout now says `312 dpi on A3, print`.

**Trim is measured, not derived.** `contentBounds()` bounds each sprite by half
its diagonal, which is safe and generous; `core/trim.js` scans for the pixels
actually painted. The gamepad's still now crops to its ink, which sequences
have always done, and the crop goes into the recipe — the marks are in canvas
coordinates and the render is a window onto them, so a replay without it would
redraw the whole canvas and believe it matched.

## Decided since, 2026-09-23

**M3 is done, and ckt was ported twice.** The first port (2026-09-22) was
written before v2's folder was on this machine, from this document's
description of it, and got the mechanism wrong. It was never pushed, and its
branch was deleted once what it got right had been carried over — the
datasets, the blob pass, the manifests. The second read `render.js`, `script.js` and
`p5_opencv.js` end to end. Both of M3's tests pass in a browser: a vault
shape is the sprite on a dot field, and a glyph range emits as a `set` that
the gamepad lists, loads and draws with. That is the catalogue's second link,
`ckt → gamepad: brush family`.

**Two stages, two objects.** Stage one sets type, a range of glyphs or an
image, rules the white grid over it and saves a `dataset`. Stage two draws a
dataset — one of the nine, or one stage one made, by id. The vault is the
handover v2 did inside the page, in a slot that was gone on reload. The grid's
spacing is the dot pitch: it is what cuts a solid letter into hundreds of
dots.

**Motion is v2's, in closed form.** v2 eased its attractor a fixed fraction of
the way to a moving target each frame. That is a first-order filter, and its
steady state is exactly computable from the frame index, so `attractor.js`
reproduces `gravCircle` and `fastSquare` to 10⁻⁶ px of v2 replayed for
thousands of frames (`tests/ckt-motion.mjs`). A tethered dot sits at
`anchor + L·unit(A − anchor)`. v2's sliders booted at air friction 0.51, so
its dots sat there rather than swinging. No integrator, no Matter, and frame
400 costs what frame 1 costs.

**The sprites were already here.** v2's 81 sprites are 69 MB and stay out of
git. 59 of its 80 distinct files are the gamepad's `brushes` family in the same
order, and v2's default `sprites[8]` is `brushes` 8. ckt reads the registry.

**A still records its tick.** A ckt still is one frame of a loop. Without the
frame in its recipe, a replay showed frame 0 and a brush was cropped to the
whole loop's sway. `tick` goes in the recipe of every still and brush; a
replay through `core/rebuild.js` is pixel-identical to what was saved.

**Two core fixes ckt found.** `applyFrameEdit` re-entered on its own writes, so
picking a preset flipped the format to `custom` in every app — including grid,
whose `ink` then stopped following its source. The test used a stand-in
Params with no listeners, which is the one thing a real one always has. And
`snap()` wrote `0.12000000000000001` into recipes.

**The UI pass, from the author's brief.** Decided 2026-09-23, after M3, and
it comes before M4:

- **One theme, neo-brutalist and light.** Cream ground, black ink, thick
  borders, hard offset shadows, one yellow accent, no glow or blur. It lives
  in core and every app takes it; the neon blue HUD is retired. The gamepad
  keeps its gamepad-first layout and only takes the theme.
- **The bottom bar is information only.** Output size in pixels, pixel
  density, a few shortcuts, in larger, higher-contrast type. It is a block in
  the page layout, never over the canvas or a panel. Actions leave it. There
  is no header.
- **Parameter sections are collapsible drawers, built once in core** —
  Format, Sequence player, Ground, Sprites, Export — and apps compose their
  panels from them.
- **ckt:** the dots panel on the left, motion on the right, the viewer between
  with a dots / motion toggle above it. The nine shipped sets become *legacy
  dot-sets*, in a drawer closed by default. Every dot-set made is saved at
  once, and the vault panel groups them in one folder per ckt session — a
  grouping, not a folder on disk, so every link keeps working. A session list
  steps with ← →. The attractor drawer is closed by default, with the
  attractor off and tether 0. The default motion is a rotation 0→360° at a
  speed, and a loop is exactly one turn, 360 ÷ speed frames. Trails fade and
  pulses stop flipping. And a performance audit: v2 did not drop frames with
  large sprites, and ckt does.
- **grid:** `zoom` scales the object inside a fixed canvas; `scale`
  multiplies width and height, up to 4x, and moves into the shared Format
  section so every app has it.
- **gamepad:** a still saves on a transparent ground by default, with the
  choice of white when saving.

**Done the same day**, all of it seen running — STATUS.md has the list and the
measurements. Two choices the brief left to the build: the vault's session
folders are a `folder:` tag, a view and not a place on disk
(`docs/object-model.md`, *Tags that group*); and the gamepad's white-or-none
is a Save Ground row in its Canvas section and the G key, rather than a
question asked at every save.

**An object opens back in its app.** `/apps/<app>/?open=<id>` restores its
recipe — a ckt still at its frame, a dot-set into both stages, a grid dither
with its source — and the vault's detail offers the link wherever the app's
`rebuild.js` says `reopens()` (`core/reopen.js`). It is the first time
`restore()` runs for real, and it is what M4 reaches for.

**The vault is reached over the author's tailnet.** One machine serves it; the
others, at work and at home, open it by link. For the author's own machines,
M4's "an object has a URL you can send" is therefore the `?open=` link;
`Vault.publish` into the public `gallery/` stays for sending outside the
tailnet. `server.js` binds to 127.0.0.1 because it writes files, so the
serving machine puts it behind `tailscale serve`, or passes `--host` its
tailnet address — never `0.0.0.0`, which opens the write API to the local
network as well.

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
objects, so a second backend stays possible and is not built.

**A GPU render replays close, not bit for bit.** The author's answer, before
the first GPU object was saved: a small difference between two machines is
fine. So a GPU object's promise is its recipe; on the machine that made it, it
replays the same, and a check compares a replay with a tolerance. Written into
`docs/object-model.md`, *The recipe contract*.

**A shader carries its licence, as a font does.** Rule 5 now covers shaders. The
filter catalogue ports from p5.FIP and glfx.js (MIT) and GPUImage (BSD). LYGIA
is under the Prosperity licence — noncommercial, a thirty-day commercial trial —
and Shadertoy code with no licence header is CC BY-NC-SA 3.0 by default: both
stay out of a suite meant to make a game's assets.
