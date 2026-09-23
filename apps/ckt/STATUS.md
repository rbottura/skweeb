# STATUS — ckt
_last touched: 2026-09-23_

ColorKineType v3. Ported from v2's own source, `J:\codes\ColorKineType_v2` —
`script.js` (stage one), `p5_opencv.js` (the blob pass), `render.js` (stage
two). Read those before changing anything here; `docs/roadmap.md`'s account of
v2 was wrong once and a whole port was built on it.

## Works now — all of it seen running in Chrome

- **Stage one, `dots`.** Text, a glyph range, or an image (vault or file) on a
  white canvas; the white grid ruled over it (line, space, rotation); the
  cells found by blobs.js and drawn over the picture live, 30–50 ms a cut.
  `Make dataset` saves a `dataset` and hands it to stage two by id.
- **Stage two, `motion`.** One glyph at a time (↑ ↓, as v2), a sprite on every
  dot, every dot tethered and leaning towards an attractor on v2's paths —
  circle, eight, square, or a point you drag. Rotation spin / face / none,
  pulse through zero, trails, v2's zoom via the frame params.
- **Saves.** Still (with its `tick`), loop (150 frames at 30fps by default,
  optional frame zip for `scripts/frames-to-video.mjs`), and **Emit family**:
  every glyph as a `shape`, cut to its ink, the lot as a `set` — which the
  gamepad lists, loads and draws with.
- **Replays.** `rebuild.js` is core's dispatch target: a ckt still replays
  pixel-identical to its saved PNG, and any loop frame renders the same twice.
- **Standalone.** On a plain static server with no vault API it boots, draws,
  cuts, and saves by download.

## Where it knowingly differs from v2

- No integrator. v2's dots were overdamped (air friction booted at 0.51), so
  the resting point is the motion; the settle-wobble after a slider moved is
  gone.
- `gravEight`'s 15.6:1 frequency ratio is 16:1, so the loop closes. Every path
  goes round once per loop instead of at v2's per-frame rates.
- Mouse mode is a point you drag; the recipe keeps where you left it.
- Trails are finite (`trail` frames), because an endless pile cannot loop.
- Fonts are the eight licensed faces in `assets/fonts/`, not the system's.
- An ungridded letter with a counter gave v2 an extra dot (opencv's hole
  contour). Gridded, which is the point of the app, it does not arise.

## Next single step

**Open a saved ckt object back in ckt.** `/apps/ckt/?open=<id>`: load the
envelope, `restore()` its recipe into the right stage — a `dataset` into dots,
anything else into motion with the clock at `recipe.tick` — and give the vault
panel an "Open in its app" button for objects whose `origin.app` is installed.
Every piece is in place; nothing opens anything yet, in any app.
