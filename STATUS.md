# STATUS — skweeb
_last touched: 2026-09-22_

## Works right now

- **M2 is done, confirmed in the browser.** Grid loads a vault object, dithers
  it, and saves the result with the source in `parents`. The catalogue of links
  has its first entry: `grid → vault: dithered sequence`. That is the honest
  measure of whether this is a suite rather than three apps sharing a drawer,
  and it now passes.
- **The chain is walked, not just specified.** A grid sequence carries grid's
  recipe and the id of the loop it came from, so replaying it rebuilds the
  parent from *its* marks, loads the sprites, and re-runs the dither over every
  frame. Nothing was stored to make that work — the envelope already held all
  of it. First time anything in this project actually used `parents`.
- **Replay is a dispatch.** `core/rebuild.js` replays marks itself and hands
  anything else to the app that wrote it, loading `/apps/<app>/rebuild.js` by
  convention. Core never learns what dithering is. This is the capability M4
  needs and M5 inherits for the price of a file.
- **A loop plays in three places on one clock.** `core/playback.js` owns the
  timing — accumulated against the wall clock, spent in whole ticks, remainder
  carried — and both the vault's `SequenceViewer` and grid use it. When a frame
  costs more than its share of time it drops ticks and keeps real time, which
  for grid (a whole re-dither per frame) is the normal case.
- **Framing is one idea in core.** `core/frame.js` + `core/formats.js`:
  `format`, `width`, `height`, `link`, `bleed`, `zoom`, spread into an app's
  schema, with a table of named shapes carrying a ratio, exact pixels or
  millimetres. Content sits at 1:1 and may overflow — no auto-fit, no auto-crop.
  Grid renders the format row as chips. Print support is `dpiOf()` and nothing
  else: the readout says `312 dpi on A3, print`.
- **The gamepad's still crops to its ink**, which sequences have always done.
  Trimmed on the ink layer where alpha still means something, before the white
  composite. The crop is recorded in the recipe, because the marks are in canvas
  coordinates and the render is a window onto them.
- **The gamepad draws again.** `joyImage.js` re-exported `PATTERNS` with a bare
  `export … from`, which forwards a name without binding it locally, so the
  three internal uses had nothing to resolve. It threw on the first brush
  selection — never on import, which is why the stage move's 30-file module
  graph check could not see it. In since `45ca7be`.
- **Video is a conversion, and it works.** `node scripts/frames-to-video.mjs
  <frames.zip>` → mp4, webm, prores (alpha kept) or gif. The rate travels in a
  `meta.json` inside the zip, so no flags are needed to get the speed right.
  Verified end to end: 5 frames in, h264 out at 12fps, duration 5/12s.
  The zip is read by the script itself with `node:zlib` — the first version
  shelled out to `tar` and broke immediately, because Git Bash resolves `tar`
  to GNU tar, which reads `C:\Users\…` as a `host:path` remote spec and tries
  to connect to a machine called C.
  **The browser muxer is cancelled**, after three sessions open. See
  `docs/roadmap.md`.
- **The vault spine, the read path, the write API, the representative still**
  all as before — see the 2026-09-21 entries in git.

## Tests

Ten files, no runner, no dependencies. `node tests/<name>.mjs`:

`recorder` `clip` `export` `vault` `grid-map` `params` `rng` `playback` `frame`
`joyimage` — the command in `CLAUDE.md` runs all of them.

New this session: `playback` (22 checks, stubbed clock — the 120Hz
double-speed case, tick-dropping, both loop ends), `frame` (43 checks — the
chain, the overflow-as-negative-offset rule, every trim), `joyimage` (11
checks, and it exists because **constructing a thing is a different question
from importing it**; it would have caught the `PATTERNS` bug and the import
graph check could not).

## Broken / half-done

- **Nine of eleven sprite families are not on this machine**, so the gamepad
  404s nine times a boot and those brushes draw nothing. Not a code fault: the
  135 MB of type packs — Destra, GaramondI ×3, Minipax, PeaceSans, Raleway ×2,
  fleurs — are gitignored by decision and never came across in the 2026-09-21
  machine move. `brushes` and `timbre` are all this checkout has. Two fixes,
  independent: copy the packs over, and make the registry skip a family it
  cannot load instead of shouting. The second is the next step below.
- **Nothing can leave this disk.** `Vault.publish(id)` is specified at
  `docs/object-model.md:252` and not implemented; there is no `gallery/`. An
  object survives a device change only once published, which the machine move
  proved the hard way.
- **The gamepad's params are not on `core/params.js`.** A plain object with a
  hand-written panel driven by an explicit `SLIDERS`/`SECTIONS` list, so it
  cannot have the format chips grid has. `frameFormat` and `frameBleed` are
  editable in code only. Migrating it is its own task, not an adjustment.
- **Old grid recipes re-render trimmed.** They carry no `format`, so
  `restore()` fills the default — `content` — and the picture is framed
  differently from when it was saved. Two objects affected, both made today, so
  the practical cost is nil. Change the default to `source` if old recipes
  should reproduce exactly instead.
- **Id prefixes disagree with the spec.** `docs/object-model.md:56` says `grd_`;
  `server.js` yields `gri_`. Two of four are wrong. `safeId()` accepts both, so
  this is a contract divergence to settle, not a bug to chase.
- `assets/fonts/` is missing each family's `OFL.txt`.
- **Two older sequences carry the pre-fix still** — `bounce 266 marks` and
  `sweep 507 marks`. Objects are immutable; the fix reaches them by re-export.
- A sequence still has no playable file inside the vault — its render is one
  PNG. That is no longer a gap: the frames zip plus
  `scripts/frames-to-video.mjs` is the answer, and playback never needed a file
  in the first place. See *Works right now*.
- `apps/gamepad/gallery/` and `scripts/dev-server.js` are superseded by
  `server.js` and the vault. The GALLERY panel in the app is still the old one,
  showing this browser's IndexedDB rather than the vault.
- **Four files over the 400-line cap**, all inherited, all in the gamepad:
  `ui/hud.css` 724, `sketch/gamepadSketch.js` 546, `ui/TimelinePanel.js` 539,
  `ui/ParamPanel.js` 492. `gamepadSketch` went 531 → 546 this session: the save
  framing moved out to `core/stillFrame.js` (92 lines), which took back 41 of
  the 56 added, and the remaining +15 is the two framing params, which belong
  there. Worse than it was, and still on the list.

## Next single step

**Make the registry skip a sprite family it cannot load.** A family whose files
404 is marked unavailable and left out of the picker, instead of erroring once
per sprite and then drawing nothing when you cycle onto it. `missingFamilies()`
in `core/stage/bounds.js` already answers this question for sequences; the
registry never asks it at load time.

Small, and worth more than the annoyance it removes: it is the same code path a
**published object whose families are not installed** will hit, which is the
first thing `gallery/` will need. Do it before M3 rather than after, because
ckt will produce families of its own.

Then **M3 — ckt v3**, which is the next milestone and a large one.

## Parked decisions

- Name is **skweeb**, `.skw` for the smart object.
- **M4 is a fourth app, `apps/compose/`, and the master rendering environment.**
  Decided 2026-09-22. Export in the gamepad, grid and ckt stays but is demoted
  to a shortcut for producing an asset; anything with more than one element in
  it is composed. See `docs/roadmap.md`.
- **Video is frames plus ffmpeg.** No browser muxer, ever. The app owes a
  numbered PNG zip; the video is a conversion, and producing one is two steps
  with a terminal in the middle. Accepted.
- **A placement pins with `version`, and `at` is time.** `at` used to mean the
  `.skw` version, which stopped working the moment a placement could also have
  a start frame. Renamed 2026-09-22 while it was still only a document and
  nothing had been written to disk in the old shape — `docs/object-model.md`.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference.
  `bound` first, `standalone` later, `render()` stays pure so sandboxing is a
  worker and not a redesign.
- **Panels live in `core/`**, not in an app, when more than one app needs them.
- Resolution is export-only. Live at screen size with a density param; export
  re-runs `render()` once at scale.
- 3D is real and it is M5 — a fourth process, not a retrofit. (Fifth now.)
- `sketch-2-print` keeps its own gamepad, frozen. skweeb's copy is the living
  one. They diverge on purpose.
- Export: p5.capture for drafts, `core/export.js` for objects and print.
- CKT v3 keeps the dots, drops Matter — a physics engine cannot promise the
  same pixels twice, and recipes depend on that.
- Local disk vault plus a published gallery. The online skweeboteque is wanted
  but not now; the vault interface is the seam it goes behind.
- Open: whether `destra.otf` and `GPDestra-Light.otf` are yours to license.
