# STATUS — filter
_last touched: 2026-09-26_

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
   assets, motion, time. First batch in: six from p5.FIP.

## Works now

- **Ten filters.** Written here: brightness, contrast, gaussian blur,
  pixelate. From p5.FIP (MIT, its whole licence in
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
  *Save + download the frames* filters them all into a zip with the rate. A
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

**Brick 5, the next batch: the game-asset group, the suite's own** — a
sprite *outline* (a width and a colour, reaching its width past the edge),
a *drop shadow* (an offset, a blur, a colour, reaching as far as both), and
*palette lock* (every pixel to the nearest colour of a `color[]` param, until
the `palette` type exists). Written here; `check-gpu` holds each to what it
should do to a sprite on nothing — an outline one colour and one width, a
shadow where it was sent.

After it, from p5.FIP: the neighbourhood filters — sharpen, unsharp mask,
emboss, sobel edges, dilate, erode — and glfx's and GPUImage's after.

## Parked

- Nothing waiting on the author.
