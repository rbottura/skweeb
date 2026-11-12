# core — what leaves the suite: frames, and prints

Moved out of `docs/core-api.md` on 2026-10-06, when the print came and that
file stood at its cap: an export and a print are the two ways a picture
leaves, and they share the rule that makes both possible — an app's frames
drawn again, at any size, from the recipe.

## export.js — frames out, exactly

Given an app's frames — its `frames.js`, the code its save and its replay
draw with — an export is a bare loop with no clock in it:

```js
await runFrames({ count: frames.length, frame: async i => entries.push(await entry(frameName(i, frames.length), frames.frame(i))) });
download(zipStore(entries), name);
```

Same recipe and seed, same bytes, every time, at any size. The discipline is
the stage's: the gamepad's transport derives every position from one master
tick, and `step()` refuses to read a clock — the header of
`core/stage/player.js`. A capture of the live canvas — p5.capture, say, or
MediaRecorder — is the wrong tool for anything that becomes an object: it
cannot give frame 437 at 7000 px without running frames 0 to 436 on screen
first, and a realtime recorder drops frames under load.

**What exists.** `runFrames({ count, frame, onProgress, signal })` runs the
loop and keeps nothing — grid dithering a sequence runs every frame and keeps
one; `captureFrames({ count, draw })` collects PNG blobs; `toPng(canvas)`;
`zipStore(entries)` packs a store-only zip whose entries may be Blobs, by
reference — PNGs are already deflated, so compressing again costs time and
saves nothing; `frameName(i, total)` pads so an alphabetical sort is a
numeric one; `download(blob, name)` hands it to the browser.
`tests/export.mjs` covers the loop indexing and the zip. A loop leaves as a
sprite sheet too (`spritesheet.js`).

**Video is the zip plus ffmpeg** (settled 2026-09-22, `docs/decisions.md`):
`scripts/frames-to-video.mjs` makes the file. No muxer is written in
JavaScript. It reads the zip a frame at a time, never whole — Node reads no
file past 2 GiB into memory, and a loop at print scale passes that (the first
was 2.65 GiB). A zip holds 4 GiB and 65535 files without ZIP64, which nothing
here writes: past that, `zipStore` says so rather than wrap its numbers.

**A sequence's picture** is one of its frames, and which is a decision, not a
detail. For a recording, `representativeTick()` (`stage/clip.js`) asks the
window rule which tick shows the most marks — never the last: `sweep` and
`build` end on a blank tick by design and `bounce` on its first two marks, so
keeping frame N-1 kept a transparent PNG for half the rules. For the other
apps' loops it is the frame on screen when the loop was saved.

**Resolution.** Export is the only place print scale appears. The live loop
stays at screen size; an export draws the frames it needs again at the scale
asked for, once. A print export is one pass, not a loop to sit through.

## print.js — a picture past any canvas

A sheet at a dpi — 120 × 176 cm at 300 dpi is 14173 × 20787 px, 294.6
megapixels — is more than any canvas or GPU texture holds (Chrome's 2D cap is
2^28 pixels; a GPU's side 16384, WebGL2's 8192). So a print is drawn a tile
at a time, 2048 px a side, and the tiles go straight into a PNG written band
by band (`png.js`: rows filtered Up, deflated as they come, its dpi in a
pHYs). Nothing ever holds the whole picture.

```js
const { blob, enlarged } = await printObject(object, { sheet: [14173, 20787], dpi: 300, paper: '#ffffff', tick });
```

`printObject` fits the object whole on the sheet, centred, the paper round
it; `paper: null` keeps transparency. `object` is any envelope — one in the
vault, or one an app makes of what is on screen without saving it. Each tile
asks the object's handle (`rebuild.js` `openFrames`, opened at the print's
scale) for **a window**:

```js
handle.window(i, { x, y, w, h })   // a canvas at least w × h: that part of frame i, at the handle's scale
```

An object with layers (L13, `core/layers-draw.js`) is laid round in each
window as in its frame: the ones behind under the app's window, those in
front over it, through `windowed.js` — each layer from its own pixels.

That is the one addition to the handle a print needs, and every app's
rebuild.js has it. The ways it is met:

- **`windowed.js`** — an app's own drawing code, unchanged, draws one window:
  a context whose every absolute transform, pixel put and pixel read is moved
  by the window's corner, its canvas saying the whole picture's size (rig,
  particles, map, grid, ckt, compose, fractals' copies; `tests/windowed.mjs`).
- **A camera's view offset** — the 3D app's (three.js `setViewOffset`).
- **The plane's own window** — escape time draws the part of the plane under
  the window (fractals' `windowOf`).
- **A chain over its part** — `gpu/window.js` `chainWindow`: the window and
  as far round it as the chain reads (`runner.js` `readsOf` — a blur its
  taps, a pixelation its block, which spreads nowhere), read from the
  source's own window, run as that part of the whole picture — the prelude's
  `frame.origin` and `frame.here` (`gpu/wgsl.js`), so a vignette's middle,
  a halftone's grid and grain's seed land where they would in the whole —
  then cut. Filter's replay, and a look over a placement (`look.js`). A zoom
  blur reads from anywhere: a chain with one has no window.
- **Each placement's part** — compose maps the window into each placement's
  own pixels, a pixel round it for smoothing, and asks it for that.
- **A gamepad still's marks** — `stage/still.js` draws a still again from its
  marks, each sprite from its own pixels, clipped to what its render shows
  of its canvas. `openFrames` takes it there past a still's own size, and
  for a drawing printed straight off the gamepad's canvas. The rig stamps
  the same stamps (`apps/rig/drawing.js`).

A handle with no window — a gamepad loop, replayed by p5 — is drawn whole at
the largest scale a canvas allows and enlarged into the tiles; `enlarged`
says by how much, and also where a window's own source is a picture that
cannot be drawn finer (the handle's `scale`). `PrintPanel.js` is the print in
an app's Export drawer: the sheet (the print formats, `formats.js`; the app's
own format when it is one), the dpi, the paper, what that comes to, and the
button. `scripts/check-print.mjs` holds every app's print to its object drawn
whole — `seams` in `printMatch` says whether the difference lies on the tiles'
edges — and `scripts/check-3d-poster.mjs` makes the 120 × 176 poster itself.
