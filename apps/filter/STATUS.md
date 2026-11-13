# STATUS — filter
_last touched: 2026-11-13_

M5's app: any picture or loop through a chain of GPU filters, on the kit in
`core/gpu/` (`docs/core-api.md`, *gpu/*). The plan and *Done when* are in
`docs/roadmap.md`, M5.

## The bricks

1. **The GPU kit** — done 2026-09-26, `core/gpu/`, four filters.
2. **The app opens and filters live** — done 2026-09-26, this folder.
3. **It saves** — done 2026-09-26: a still or a loop with the source as its
   parent and `{ source, chain }` as its recipe; `rebuild.js` replays the
   source and runs the chain, and draws again at print scale (`redraws()`);
   `?open=<id>` brings a chain back. A replay on another machine may differ a
   little — settled 2026-09-26 (`docs/object-model.md`, *The recipe contract*).
4. **A look** — done 2026-09-26: a chain saved alone, as a `params` object,
   and applied to a placement in compose — M5's link, `filter → compose: a
   look`. With it, filters reach past the edge (`edges`: grow or keep).
5. **The catalogue grows** — begun 2026-09-26: p5.FIP's, glfx's and GPUImage's
   filters, each with its copyright line; then the suite's own groups — game
   assets, motion, time. In: eighteen from p5.FIP, glfx's zoom blur, grain,
   gradient map, ordered dither, and the game-asset group begun — outline,
   drop shadow, palette lock.

## Works now

- **A module** (S9a, 2026-11-04; `main.js` on core's `mount.js`):
  `mount(host)` and `unmount()` — its keys and drops on the scope, its
  clock stopped, its source disposed, its runner's GPU memory let go of,
  never the device, which is the page's; following a window, it stops with
  the app (`core/following.js`, core's `listen` and `held`) — `check-mount`.

- **Another window as the source, live** (2026-10-07, M11's brick 4;
  `core/following.js` — filter's, until grid took windows too (L5) — `core/send.js`; `check-send`). *Send to ▸ filter* in
  another app's Stack drawer, or `?live=<window id>`: the source is what
  that window has on screen — its layer, the envelope its save would write —
  drawn again a moment after each change there, so a slider dragged there
  is not a hundred rebuilds here; the window gone, it is said, and the last
  picture stays. Saved, filter asks the window to save itself first, with
  its own save, title and lineage — as a smart object since brick 5 — and
  saves over what it kept, then follows the window again.
- **Prints at a sheet's size and a dpi** (2026-10-06; core's print panel in
  the Export drawer, `docs/core-export.md`): the chain over its part of the
  source and as far round it as the chain reads — a filter that reads
  further than it spreads says so, `reads`: pixelate, dots, halftone,
  erode, unsharp, emboss, sharpen — read from the source's own window
  (`core/gpu/window.js`), and run as that part of the whole: the GPU
  prelude says where it lies, so a vignette, a halftone's grid and grain
  land as they would whole. Two chains over a gamepad still, 15 and 8
  tiles, match the chain run whole to 0.0001 of 255; taking only the reach,
  the second came apart on every seam (`check-print`). A zoom blur reads
  from anywhere, so a chain with one is printed whole. A source in the
  vault only.
- **For game assets** (the suite's own, 2026-09-26): an *outline* round a
  sprite — its width and colour, measured by an exact distance in two passes,
  its corners round; a *drop shadow* — moved, softened, coloured, faded; and
  *palette lock* — every pixel to the nearest colour of a palette as the eye
  judges it (OKLab), up to 32, four greens of an old handheld to start. The
  outline and the shadow reach past the edge, so a sprite grows to hold them,
  and lay the sprite back over what they drew — `orig` is now a filter's own
  input, whatever runs before it in the chain.
- **The neighbourhood filters, from p5.FIP** (2026-09-26): sharpen, unsharp
  mask, emboss, edges (Sobel), dilate, erode — each changed where p5.FIP
  would have hurt a sprite or cut a corner: held in range so a sprite's edge
  does not overshoot into a rim, a true Gaussian under unsharp mask (the
  blur's own passes, then its original laid back against it), the Sobel
  kernel itself on brightness and alpha, a disc for dilate and erode where
  there were four neighbours, erode keeping its colour. Their distances
  follow the print scale. `check-gpu` holds each to one step from dark to
  light, and dilate and erode to a sprite grown and shrunk by their radius.
- **Stylise** (2026-09-27): halftone — dots of an ink on an optional paper,
  its screen turned, their area following the darkness; dots — each cell's
  colour; CRT — lines that hold still, so a loop still closes, and a colour
  split; vignette; grain; glitch — bands torn sideways, colours split.
  Grain and glitch are the first filters to draw at random: from the
  Filters drawer's `seed` and the loop's frame, never the clock (rule 2) —
  the same seed, the same noise; the seed is saved in the recipe, and as
  the object's seed when its chain draws at random. `check-filters.mjs`
  holds each to what it does.
- **The author's four** (2026-09-27): a *gradient map* — brightness looked up
  on up to 16 colours, dark to light; a *motion blur* — any length, any
  angle, centred, from p5.FIP's fixed diagonal; a *zoom blur* — glfx.js's
  (MIT, its licence beside the filters), its jitter fixed per pixel so it
  needs no seed; an *ordered dither* — Bayer's 2×2, 4×4 or 8×8, in levels,
  in colour or grey, chunky if asked. Held to exact values in
  `check-filters`: a half grey dithers exactly half white.
- **Generators** (M15a, 2026-11-13; `docs/vfx.md`): `noise`, `gradient`,
  `shape` — filters that make their picture, each a grey meeting what is
  under it by its blend (`core/gpu/filters/meet.js`). A run is told its
  loop's length now (`frames`), so a noise scrolled over a loop comes
  round with it; over a still it holds still. `check-filters` holds them.
- **An effect's moves** (M15d, 2026-11-13; `docs/vfx.md`): `dissolve` — a
  threshold over a run's age, a soft edge, a hot rim; `warp` — what is
  under read through a noise; `polar` — wound round a point; `glow` — the
  bright spread and added. A run may be told it is a *life* (`life`).
  Warp and polar read from anywhere, so a chain with one prints whole.
- **Thirty-six filters**, in the menu by group — tone and colour; blur and
  detail; shape and edges; stylise; for game assets; the generators; an
  effect's moves. Written here: brightness,
  contrast, gaussian blur, pixelate, outline, drop shadow, palette lock. From p5.FIP (MIT, its whole licence in
  `core/gpu/filters/LICENSE-p5.FIP.txt`): saturation, invert, sepia, duotone,
  threshold, posterize — each file names its source, licence and copyright
  line and what was changed: all six unpremultiply and keep the alpha, where
  p5.FIP greyed a sprite's clear pixels (saturation) or darkened its soft
  edge; posterize holds white to the last step. `check-gpu` holds each to
  its formula on a pixel; `tests/gpu-filters.mjs` holds every ported filter
  to its notice.
- **A look** (`node scripts/check-look.mjs`, 12 checks). *Save the chain as a
  look* writes the chain alone — `{ chain, edges }`, a `params` object with a
  picture of what it does; `?open=<look>` puts the chain back over whatever is
  chosen next. In compose, a placement's *look* row takes one: its frames run
  through it (`core/gpu/look.js`), the placement sized by what it grows — a
  blur of 3 over a 228 × 501 sprite makes it 246 × 519 on the page. The page
  saves with the look in its block and among its parents, replays with no
  difference here, and at print scale; with no WebGPU it opens without the
  look and says so.
- **Past the edge**: a blur reaches its three deviations, and `edges` — grow,
  the default, or keep, in the Filters drawer — says whether the picture
  grows to give it room. A sprite keeps its halo; a photograph keeps its size.
  A recipe saved before `edges` replays as it was, kept.
- **It saves, and it replays** (`node scripts/check-filter-save.mjs`, 17
  checks). S — or *Save to the vault* — saves what is on screen: a still
  source a `still`, a loop a `sequence`, the recipe `{ source, chain }` and
  the source the parent (`save.js`). A save filters its source exact, never
  the preview's draft. A loop's picture is the frame on screen, compose's rule;
  *Save the loop + every frame (zip)* filters them all into a zip with the rate. A
  file saves as a leaf. `rebuild.js` replays an object for anything that asks
  — the vault's player, compose, a filter of a filter: a saved still came back
  with no difference at all on this machine, the same twice; at print scale
  it is drawn again at twice the pixels. `?open=<id>` brings the chain back
  card for card. A 696-frame loop saved, replayed, downloaded and went onto a
  compose page. With no WebGPU a filter object shows as its saved render.
- **Open, pick, filter, play** (`node scripts/check-filter.mjs`, 19 checks,
  seen in headless Chrome on the serving machine's GPU). The source is any
  vault still, shape, loop or moving composition, through `openFrames()`,
  chosen in the Source drawer or with V; or a file opened or dropped, with no
  vault at all. A loop is cropped to its ink over the whole loop, the size
  compose places it at — a gamepad loop is 1812 × 811, not the screen it was
  drawn on.
- **The chain** (`chain.js`): a filter added from the catalogue gets a card
  drawn from its own schema by core's ParamPanel — the app writes no control.
  Each card's head: Reset, on/off, ↑ ↓, ✕. A value typed in changes the
  pixels; a filter switched off stays in the chain, editable, not run.
- **Live on the GPU**: one runner for the page, the chain compiled when it
  changes and run on every frame shown; while a new filter compiles the
  canvas keeps what it showed. A gamepad loop through pixelate and contrast
  plays at 61 paints a second, which the bar shows while it plays.
- **No WebGPU**: the page opens, says why, lets the chain be built, and shows
  the source as it is (the check takes WebGPU away before the page loads).

## Broken / half-done

- **Reloading the page loses an unsaved chain** — only a save keeps it.
- **A frames download holds every PNG until the zip is built**, as grid's
  does: a long loop at a big size is a lot of memory.
- **Time filters** (echo, slit-scan) need frames other than the one shown;
  `run()` takes one picture. They wait for the catalogue's time group.

## Next single step

**The motion group's first brick: a still becomes a loop**, for idle
animation. When the source is a still, the Filters drawer offers `frames`
and `fps`, and the clock plays that many; a motion filter reads its phase
from the tick — 2π · tick / frames — so the loop closes on its first frame.
The first is *bob*: the picture up and down by a height, eased. Saving such
a chain saves a `sequence`, its render the frame on screen, replayed by
rebuild.js from the still and the chain. Then breathe, sway, glow pulse,
spin — and time, a loop in.

Not on the board of the cycle begun 2026-10-22 (`docs/plan.md`): it waits
there under *Later*, as M5's catalogue has since M6 was chosen over it.

## Parked

- Nothing waiting on the author.
