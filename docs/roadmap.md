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

**M4 — compose, export, publish.** The page: many objects placed on a sheet,
previewed live at screen resolution, exported once at print resolution. Then
`gallery/` deploys.
*Done when:* an A3 sheet of objects from all three apps exports as a print file,
and one object has a URL you can send.

Each milestone after M1 should also leave **one link** behind, since the
catalogue of links is the only real measure of whether this is a suite:
M2 `grid → vault: dithered sequence`, M3 `ckt → gamepad: brush family`,
M4 `any → composition: place on a sheet`.

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
      { "ref": "gmp_…k3f9", "at": "latest", "transform": { "x": 20, "y": 30, "scale": 1 } },
      { "ref": "grd_…88f0", "at": 4, "transform": { "x": 120, "y": 30, "scale": 0.5 } }
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

## Still open

1. **`destra.otf` and `GPDestra-Light.otf`** carry no copyright and no licence.
   If they are yours, say so in the files. See `docs/fonts.md`.
2. **The online skweeboteque.** Wanted, not now — it needs a server, and it is
   also what turns sandboxing from theory into work. Nothing in the local design
   blocks it; the vault interface is the seam it would go behind.
3. **Video output.** A sequence object has no playable file: its render is the
   last frame, and the frames come out as a zip on request. Writing webm needs
   a muxer, vendored or hand-written, since WebCodecs encodes frames but does
   not container them. MediaRecorder is not the answer — realtime, drops
   frames. Until this is decided the gallery cannot play anything back. The
   envelope already allows `render.webm`, so nothing structural is blocked.

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

**grid_sketch** — 700 lines, globals, no save or load of any kind,
`pathRefImage` hardcoded, and `loadFont("/fonts/SpaceMono-Regular.ttf")` reads
from the server root, so it breaks the moment it is served under a subpath.
`.git` is 674 MB despite a "removing big images" commit: the history still holds
them. Do not import that history.

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
