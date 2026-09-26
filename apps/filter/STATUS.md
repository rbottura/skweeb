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
4. **A look**: a chain saved alone, as a `params` object, and applied to a
   placement in compose — M5's link, `filter → compose: a look`.
5. **The catalogue grows**: p5.FIP's, glfx's and GPUImage's filters, each with
   its copyright line; then the suite's own groups — game assets, motion, time.

## Works now

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
- **Four filters** in the catalogue, all written here.
- **Time filters** (echo, slit-scan) need frames other than the one shown;
  `run()` takes one picture. They wait for the catalogue's time group.

## Next single step

**Brick 4's first half: a look saves.** *Save the chain as a look*, in the
Export drawer, writes the chain alone as a `params` object — recipe
`{ chain }`, tagged `look`, its render the chain on the picture on screen —
and `?open=<look id>` puts the chain back over whatever source is chosen.
The second half is compose: a placement takes a look, and its frames run
through the look's chain. That adds `look` to the placement block, a field
in `docs/object-model.md`'s *Placement*, written there before it is used.

## Parked

- Nothing waiting on the author.
