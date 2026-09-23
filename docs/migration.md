# Migration facts — what the ancestors measured

Moved out of `docs/roadmap.md` on 2026-09-23, when the roadmap reached the
400-line cap: this is what the three projects skweeb came from looked like
when they were measured, and what a port must know before it starts. Read
the original's source before trusting any summary here — the ckt paragraph
below was wrong once, and a whole port was built on it.

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
than archaeology. `node_modules` is committed, 13 files. `.git` is 116 MB.
Datasets are `[char][point][x,y]`, nine of them, cut by v2's own stage one —
type under a white grid, blobbed by `opencv.js` at about 8 MB with its own
progress bar.

*Corrected 2026-09-23, from the source.* This paragraph used to call
`gravCircle`, `gravEight` and `fastSquare` "behaviours driven through Matter,
worth keeping as hand-written motion", and a first port read that as each dot
running its own little circle. That is not what they do. They move **one
attractor body** along a path, easing towards a target every frame. Every dot
is a body tied to its dataset point by a constraint of length `constLength`,
and leans the attractor's way. Rotation has three modes — spin, **face the
attractor**, stop — and scale a pulse through zero. `Render.run` is commented
out, so v2's fill colour, tether lines and anchors never reached the screen:
it drew sprites on a p5 overlay and nothing else. The source is on disk at
`J:\codes\ColorKineType_v2`; read it, not this, before touching `apps/ckt/`.

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
