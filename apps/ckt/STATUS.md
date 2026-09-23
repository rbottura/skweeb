# STATUS — ckt
_last touched: 2026-09-23_

ColorKineType v3. Ported from v2's own source, `J:\codes\ColorKineType_v2` —
`script.js` (stage one), `p5_opencv.js` (the blob pass), `render.js` (stage
two). Read those before changing anything here; `docs/roadmap.md`'s account of
v2 was wrong once and a whole port was built on it.

## Works now — all of it seen running in Chrome

- **Three columns**: dots on the left, motion on the right, the viewer between
  with a dots / motion toggle (keys 1 and 2). Both panels are core drawers;
  rows show only when they apply.
- **Stage one, `dots`.** Text, a glyph range or an image (vault or file) on a
  white canvas; v2's white grid over it; the cells found by blobs.js and drawn
  over the picture live, 30–50 ms a cut. `Make dot-set` (S) saves a `dataset`
  into this visit's session folder and hands it to stage two.
- **Dot-sets.** This session's sets listed with a thumbnail, one click away;
  ← → step through them and then the nine legacy sets, which sit in a closed
  drawer. A set from an earlier session comes through the vault picker.
- **Stage two, `motion`.** One glyph at a time (↑ ↓), a sprite on every dot
  picked from its family's grid of images, the letter turning at `speed`
  degrees a frame. A loop is one turn: 2° a frame is 180 frames. The
  attractor starts off and the tether at 0; turn it on and v2's circle, eight,
  square or a point you drag lean the dots on their tethers.
- **Pulse and trail**, smoothed: the pulse swells between full size and a
  floor (−1 is v2's flip); the trail fades, sampled between frames.
- **Saves.** A frame (with its `tick`), the loop (one turn), the loop plus a
  frames zip, and **Emit a brush family** — every glyph as a `shape` cut to its
  ink, filed in a folder named for the family, the lot as a `set` the gamepad
  loads.
- **Replays.** `rebuild.js` is core's dispatch target; a still replays
  pixel-identical, a loop frame renders the same twice.
- **Opens its own objects** (`?open=<id>`, from the vault's *Open in ckt ↗*):
  a still or a brush comes back paused at the frame it kept, a loop playing, a
  dot-set into both stages — its cut into dots, its dots into this session's
  list. A family's set has no recipe to restore, so no link (`reopens()` in
  `rebuild.js`).
- **Speed**: the preview is drawn at the size the viewer shows it, marks are
  pre-rendered at the size and angle they appear, a still trail is one baked
  stamp. On 1275 moving dots the loop keeps its 30 fps to size 1; the bar
  shows the measured rate while it plays.
- **Standalone**: on a plain static server it boots, draws, cuts, and saves by
  download.

## Where it knowingly differs from v2

- No integrator. v2's dots were overdamped (air friction booted at 0.51), so
  the resting point is the motion; the settle-wobble after a slider moved is
  gone.
- A loop is one turn of the rotation, and the attractor fits whole laps into
  it — v2 ran open-ended. `gravEight`'s 15.6:1 is 16:1 so it closes.
- Mouse mode is a point you drag; the recipe keeps where you left it.
- Trails are finite and fade; v2's was an endless pile at full strength.
- Fonts are the eight licensed faces in `assets/fonts/`, not the system's.
- An ungridded letter with a counter gave v2 an extra dot (opencv's hole
  contour). Gridded, which is the point of the app, it does not arise.

## Known slow case

A trail while the attractor moves is a pass over every dot per sample: 13
frames a second for 1275 dots and 10 frames of trail. The preview samples it
once a frame; exports take every sample the recipe asks for.

## Next single step

**Separate the world from the output.** `width` and `height` are both the
canvas a save makes and the world the glyph is centred in and the attractor's
paths are measured against — so with `ink` the rows cannot show the ink's
size, as grid's do, without moving the motion. Give the world its own fixed
size in the recipe, and let an old recipe without it keep using its width and
height: a migration, not a change of meaning.
