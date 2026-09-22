# Roadmap, open decisions, and what the ancestors taught

## Milestones

**M1 — core + gamepad moved in.** Extract `core/` while porting the app it comes
from, so the kit is shaped by real use instead of guesswork.
*Done when:* you draw, record a loop, and it lands in `vault/` with its recipe,
its thumbnail and its seed, from `skweeb/` and not from `sketch-2-print/`.
*Prerequisite:* the timeline work in `sketch-2-print` is committed first.

**M2 — grid v2 on core.** A rewrite of the 700-line sketch, straight onto the
kit. The honest test: the core was extracted from the gamepad, so only a foreign
app proves it generalises. Grid also has no save or load at all today, so it
gains the most.
*Done when:* you load any vault object, dither it, and save the result back with
the source recorded as its parent.

**M3 — ckt v3.** Text, grid, dots, sprites, motion. No Matter. Ships with the 9
existing datasets; new ones come from a script, so the 8 MB `opencv.js` leaves
the browser.
*Done when:* a shape from the gamepad can be the sprite on a ckt dot field —
and, the stronger test, when ckt can **regenerate a family like `Garam_blue`**:
letterforms with a pattern on them, emitted as a `set` the gamepad loads as a
brush family. Those folders are that exact chain, run by hand and frozen. M3 is
done when it runs itself and keeps its lineage.

**M4 — compose: the fourth app, and the master render.** Not a page and not a
mode bolted onto the others — an app, `apps/compose/`, where objects from all
three processes are placed, timed, previewed live and rendered out. A small
image and video editor whose material is the vault: stills, sequences and
`.skw` smart objects, mixed on one surface.

The part that changes the other three: **compose becomes where a finished
output is made.** Export in the gamepad, grid and ckt stays, but its job is
demoted from "how you make work" to **a shortcut for producing an asset** —
you export from grid because you want a dithered sequence in the vault, not
because it is the last step. Anything with more than one element in it goes
through compose. That is what makes it the master rendering environment rather
than a fourth way to save a PNG.

*Done when:* a sheet carrying objects from all three apps — at least one of
them moving — previews live, renders at print scale, and one object has a URL
you can send.

Three consequences, recorded here because each of them is work:

1. **Video output is frames plus ffmpeg, not a muxer.** Settled 2026-09-22 —
   see *Decided since* below. A composition renders a numbered PNG sequence
   into a zip exactly as the gamepad and grid already do, and `scripts/` turns
   that into a file. Nothing is blocked and nothing has to be written in
   JavaScript that a mature C program does better.
2. **Placement needs a time axis — done, in the document.** The `place[]`
   entry used `at` to pin a `.skw` *version*, and a composition of sequences
   also needs *when* each element starts. `at: 4` cannot mean both. The pin is
   now `version`; `at` and `length` are time, in frames. Renamed on 2026-09-22
   while it was still only a document — see `docs/object-model.md`.
3. **`render()` finally has to be real.** It is the one moment the roadmap
   already named, and compose is that moment: A3 at 300dpi is about
   3500 x 4960 and every placed object has to redraw itself at that size.

Each milestone after M1 should also leave **one link** behind, since the
catalogue of links is the only real measure of whether this is a suite:
M2 `grid → vault: dithered sequence` — **done, 2026-09-22**, and the first
entry in the catalogue. M3 `ckt → gamepad: brush family`.
M4 `any → compose: place on a sheet or a timeline`.

**M5 — 3D, the fourth process.** The test of whether this architecture was worth
building: a new app should cost a folder, a schema and three functions, and the
`model` and `material` types should slot in without touching the envelope.

## The page, and what print resolution actually means

Resolution is an **export** concern, never a live one. The live loop runs at
screen size with a `density` parameter, as it does today. When a composition is
right, export re-runs `render()` once, at scale, for the frames it needs — one
pass, not a loop you have to watch.

That makes a `composition` an object like any other, and a nearly free one,
because placement is already specified for `.skw`:

```json
{
  "type": "composition",
  "recipe": {
    "page": { "format": "A3", "mm": [297, 420], "bleed": 3 },
    "place": [
      { "ref": "gmp_…k3f9", "version": "latest", "at": 0,  "length": null,
        "transform": { "x": 20, "y": 30, "scale": 1 } },
      { "ref": "grd_…88f0", "version": 4, "at": 60, "length": 240,
        "transform": { "x": 120, "y": 30, "scale": 0.5 } }
    ]
  }
}
```

Its `render(recipe, { width, height, frame, rng, load })` walks `place`, calls
`load()` on each ref and draws it at the transform. Export passes a `width` in
pixels derived from the page size and the target dpi; nothing else changes.
A3 at 300 dpi is about 3500 x 4960, so this is the moment `render()` has to be
real — and the only moment.

This is also where `sketch-2-print`'s print half could rejoin: paged.js, the
A5 to A1 formats and the PDF export already solve the second half of M4.

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

## Still open

1. **`destra.otf` and `GPDestra-Light.otf`** carry no copyright and no licence.
   If they are yours, say so in the files. See `docs/fonts.md`.
2. **The online skweeboteque.** Wanted, not now — it needs a server, and it is
   also what turns sandboxing from theory into work. Nothing in the local design
   blocks it; the vault interface is the seam it would go behind.
3. ~~**Video output.**~~ **Closed 2026-09-22** — the answer is frames plus
   ffmpeg. See *Decided since* below. It was open for three sessions on the
   assumption that a sequence object needed a playable file inside the browser;
   it does not, and the muxer that would have provided one is now work that
   will not be done.

## Migration facts

Measured 2026-09-20, so nobody re-derives them.

**sketch-2-print** — `gamepad/` is the only part that moves. ES modules, a DOM
event bus, an IndexedDB store, a manifest-driven registry, and the whole
`core/sequence*` and `TimelinePanel` system, uncommitted as of that date: 10
modified, 10 untracked. `.git` is 253 MB. No `.gitignore`. `gallery/images/` is
33 MB for 41 PNGs, around 800 KB each, which is the argument for running
`oxipng` before any commit.

**ColorKineType_v2** — `index.html` is 1223 lines with roughly 200 global ids;
`render.js` about 1000; `script.js` 561; all on globals. Matter.js appears only
in `render.js`, 25 call sites, zero elsewhere, so removing it is surgery rather
than archaeology. The chain from dataset to `creaParticules2()` to `showBalls()`
is the physics render: dropping Matter drops balls, constraints, anchors and
particle fill. `gravCircle`, `gravEight`, `fastSquare`, `animateMode` and the
rotation animation are behaviours driven through it and are worth keeping as
hand-written motion. `node_modules` is committed, 13 files. `.git` is 116 MB.
Datasets are `[char][point][x,y]`, nine of them, generated by `opencv.js` at
about 8 MB with its own progress bar.

**grid_sketch** — re-measured 2026-09-21, because the first pass had the wrong
copy. ~870 lines across five files (`functions.js` 338, `world.js` 255,
`sketch.js` 121, `playerOne.js` 137, `data.js` 18), globals throughout, and no
save or load of any kind. `.git` is 674 MB despite a "removing big images"
commit: the history still holds them. **Do not import that history** — and note
it does not hold the good code either, so there is nothing to import.

**The source to port is the working copy, not the GitHub repo.** There were two
clones of the same repository, sharing the same two commits from 2024-05-24
pushed a minute apart: `codes/grid_sketch`, clean, and `Sketches/p5_grid_sketch`,
carrying a year of *uncommitted* work last touched 2025-05-20. The pushed state
had never run — `pathRefImage` was `./img/fish1.png`, and `removing big images`
deleted that file sixty seconds after `first push`. Both are now at `9b0b8c0`
and identical, so either folder is fine; the point to remember is that the
running version of this sketch lived outside git for a year.

What that year added, and what the port should keep:

- `easing(type1, type2, type3)` tested `if (type1 || type2 || type3 == "bck")`,
  which is truthy whenever `type1` is set, so every branch fired. Now a correct
  single-argument `easing(type)`. Port the fixed one.
- `genGrid()` moved out of `sketch.js` into `functions.js`, and a `mouseModes()`
  dispatcher drives live cell-size from `mouseX` — `map(mouseX, 0, WiW, 4, 250)`.
  That is the interaction worth keeping; it becomes a `range` param.
- The canvas stopped being the window. `createCanvas(1728 * 0.3, 2160 * 0.3)`,
  with the grid counting cells against `cnvW`/`cnvH` rather than `WiW`/`WiH` —
  a page rather than a browser, which is the shape skweeb wants anyway. It is
  also already the `density` argument in disguise: a fixed page times a scale.
- `globalCellSize` 12 → 6, `frameRate` 12 → 1.

**Two things the port fixes rather than carries.** `loadFont` reads
`"/fonts/SpaceMono-Regular.ttf"` from the server root, so it breaks the moment
it is served under a subpath — which is exactly what `/apps/grid/` is. The face
is already in the suite: `assets/fonts/` holds all four Space Mono weights,
cleared. Note there is no font manifest yet — `scripts/generate-manifest.js`
covers sprites only — so either the port references the file by a path relative
to the app, or it writes the generator rule 3 asks for. And `pathRefImage` is a
hardcoded constant, which is the whole reason grid has no source picker: it
becomes a param of `type: "object"`, which is also what records the dithered
result's `parents` without the app writing any lineage code.

**Sprite weight** — `gamepad_sprites/` is 579 PNGs and 140 MB, every one of
them referenced by `brush-manifest.json`, so there is nothing dead to delete.
Only five files exceed 1200 px; the bulk is ~500 letterform sprites at roughly
240 KB each, RGBA and badly compressed. Measured on `Garam_blue` (58 files, 19.03 MB)
with libimagequant via sharp: **q80 gives 5.56 MB, 71% off**, for a mean error
of about 2/255 across visible pixels, 1.4 to 2.2 percent of subpixels differing
by more than 8, and alpha essentially untouched. q65 gives 4.41 MB at roughly
1.4x that error. A *lossless* re-encode makes them 11% **bigger** — these PNGs
are already well packed as RGBA, so palette quantization is the only real win.
Extrapolated, 140 MB lands near 40 MB.

`brushes` stays lossless by decision — those 64 sprites are drawing tools and
are committed as they are. Until the type families are converted they are
gitignored and live in `sketch-2-print`.

**p5 versions across the three:** 1.5.0, 1.5.0, 1.9.0. The suite picks one and
every app uses instance mode against it.

## Where the name came from

`playground` was already doing four jobs on the portfolio: the tagline
("building playground tools for graphics and print"), the bio, a project section
called "Playground projects", and an empty nav slot called "Personal
Playground", plus a tier of done in `methodology.md`. The suite fills that empty
slot; it should not also be named after the category. Hence **skweeb**, and
`.skw` for the process object.
