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
existing datasets; new ones are cut in the browser by `apps/ckt/blobs.js`, a
flood fill with no dependency, so the 8 MB `opencv.js` is gone rather than
moved. **Done 2026-09-23** — see `docs/decisions.md`, 2026-09-23.
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
   see `docs/decisions.md`. A composition renders a numbered PNG sequence
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
entry in the catalogue. M3 `ckt → gamepad: brush family` — **done, 2026-09-23**.
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

## Decided before, 2026-09-21 to -23

In `docs/decisions.md`, with their reasoning: the `.skw` smart object,
`sketch-2-print` keeping its gamepad, export as two tools, the loop format,
print resolution as an export concern, 3D as M5, the font audit, `render()`
staying pure; video as frames plus ffmpeg, M2 done, replay as a dispatch,
framing as one idea, trim measured; M3 done and ckt ported twice, the UI pass
from the author's brief, an object reopening in its app, and the tailnet.

## Decided since, 2026-09-24

**M4 has begun: `apps/compose/` places one object on a page.** The first
brick of five — the rest, in order, are in `apps/compose/STATUS.md`: the page
plays, many placements, a composition in the vault, export at print scale. It
settled four things the specification had left open.

- **Two schemas, a page and a placement.** The page is core's frame group,
  less the derived formats — a page has no one source to take its size from —
  and less `zoom`, since every placement has its own scale. A placement is an
  object and a transform, and its panel edits one entry of `place[]`: the list
  is values, and no param type had to be invented for it.
- **A transform is in page pixels from the page's centre**, before the page's
  `scale`, turning clockwise about the object's centre
  (`docs/object-model.md`, *Placement*). Pixels and not millimetres because the
  page's size is pixels; millimetres are the dpi readout's business.
- **An object's size on a page is its ink** — the bounds its loop reaches. A
  gamepad loop replays onto the whole screen it was drawn on; placed by that,
  it was centred and fitted by empty space.
- **Frame N of anything is `openFrames()`**, in `core/rebuild.js`. The last
  STATUS said rebuild.js already gave frame N of anything; it gave frame N of
  a sequence, and a gamepad still, a shape or a set had no way through it. A
  sequence is replayed, a picture is its render, and data goes to its app.

**The second brick, the page plays, settled two more.**

- **A page has its own rate, and a loop keeps its own speed.** What they
  share is seconds, not ticks (`apps/compose/time.js`): a placement's `at`
  and `length` are the page's frames, at the page's `fps`. It is 60 by
  default because the gamepad records at 60 and ckt loops at 30, so at 60
  every loop in the suite shows every one of its ticks.
- **A preview asks for a preview's frames.** `openFrames(…, { draft: true })`
  lets the app that made an object answer faster and near-exact, as its own
  preview does; an export will not ask. It is the live half of "resolution is
  an export concern", and it was needed at once: grid's exact growth made a
  placed dither paint 2 frames a second, and its draft 43.

**The third, many placements, waited on one answer from the author**, and
got it the same day: on a page that moves, a still with no length is there
for the whole page, a loop with no length plays again until the page ends,
and the page lasts as long as its longest loop (`docs/object-model.md`,
*Placement*). The object model had said a still lasts one frame, against its
own "`at: 0` for something that is simply there". And a placement is picked
up on the page by its box, not its ink, as a sheet of glass would be.

**The fourth, a composition in the vault, left M4 one clause short.** A
composition saves as `{ page, place }` with every placed object a parent,
its render drawn from exact frames; compose's `rebuild.js` answers core's
dispatch, so the vault plays a page that moves, `?open=<id>` restores one,
and a page can be placed on a page. Against *Done when*: a sheet of objects
from all three apps, one of them moving, previews live — yes; one object has
a URL you can send — the `?open=` link, on the author's tailnet — yes;
renders at print scale — the fifth brick. Core replays anything with a
recipe and more than one frame now, not only a `sequence`.

**Side note, between M4's fourth and fifth bricks: the original grid's
materials are in the vault.** grid_sketch loaded seven folders as mapping
material — degz, trames, sprites, myFace, shapes, tiles, stones — and only
tiles and trames had come across, as ramps grid boots with.
`scripts/import-legacy-grid.mjs` put all seven into the vault as legacy grid
materials, in the sketch's own order, offered to grid by their role; a dither
with `tiles (legacy grid)` is pixel-identical to the shipped ramp. Done on a
side branch, `grid/legacy-materials`, rebased onto main after.

## Still open

1. ~~**`destra.otf` and `GPDestra-Light.otf`**~~ **Answered 2026-09-23** —
   free, from fonderiz.fr, made by a friend of the author's. What is left is
   naming the licence in the files before they ship. See `docs/fonts.md`.
2. **The online skweeboteque.** Wanted, not now — it needs a server, and it is
   also what turns sandboxing from theory into work. Nothing in the local design
   blocks it; the vault interface is the seam it would go behind.
3. ~~**Video output.**~~ **Closed 2026-09-22** — the answer is frames plus
   ffmpeg. See `docs/decisions.md`. It was open for three sessions on the
   assumption that a sequence object needed a playable file inside the browser;
   it does not, and the muxer that would have provided one is now work that
   will not be done.

## Migration facts

What the three ancestors measured on 2026-09-20, and what a port must know
first, now live in `docs/migration.md`.

## Where the name came from

`playground` was already doing four jobs on the portfolio: the tagline
("building playground tools for graphics and print"), the bio, a project section
called "Playground projects", and an empty nav slot called "Personal
Playground", plus a tier of done in `methodology.md`. The suite fills that empty
slot; it should not also be named after the category. Hence **skweeb**, and
`.skw` for the process object.
