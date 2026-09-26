# STATUS — filter
_last touched: 2026-09-26_

M5's app: any picture or loop through a chain of GPU filters, on the kit in
`core/gpu/` (`docs/core-api.md`, *gpu/*). The plan and *Done when* are in
`docs/roadmap.md`, M5.

## The bricks

1. **The GPU kit** — done 2026-09-26, `core/gpu/`, four filters.
2. **The app opens and filters live** — done 2026-09-26, this folder.
3. **It saves**: a still or a loop with the source as its parent and
   `{ source, chain }` as its recipe; `rebuild.js` replays the source and runs
   the chain, and draws again at print scale (`redraws()`); `?open=<id>`
   brings a chain back. A replay on another machine may differ a little —
   settled 2026-09-26 (`docs/object-model.md`, *The recipe contract*).
4. **A look**: a chain saved alone, as a `params` object, and applied to a
   placement in compose — M5's link, `filter → compose: a look`.
5. **The catalogue grows**: p5.FIP's, glfx's and GPUImage's filters, each with
   its copyright line; then the suite's own groups — game assets, motion, time.

## Works now

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

- **Nothing saves yet** — brick 3. S does nothing here.
- **The chain is not in any recipe**, so reloading the page loses it; brick 3
  makes it the recipe's `chain`.
- **Four filters** in the catalogue, all written here.
- **Time filters** (echo, slit-scan) need frames other than the one shown;
  `run()` takes one picture. They wait for the catalogue's time group.

## Next single step

**Brick 3's first half: a still saves.** S saves the filtered picture as a
`still`: `{ source, chain }` its recipe, the source its parent, the runner's
picture its render — through core's `Vault.save` and `thumb.js`, as grid's
`save.js` does. A test page reloads it by `?open=<id>` and the chain comes
back card for card. Loops, `rebuild.js` and print scale are the second half.

## Parked

- Nothing waiting on the author.
