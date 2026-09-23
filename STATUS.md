# STATUS — skweeb
_last touched: 2026-09-23_

## Works right now

- **M3 is done, confirmed in Chrome.** ckt was ported again, this time from
  v2's own source at `J:\codes\ColorKineType_v2`, and both of M3's tests pass
  in a browser: a vault shape is the sprite on every dot of a ckt field, and a
  glyph range emits as a `set` the gamepad lists (with its contact sheet),
  loads — 58 sprites from the vault — and draws with. The catalogue of links
  has two entries now: `grid → vault: dithered sequence` and
  `ckt → gamepad: brush family`. `apps/ckt/STATUS.md` has the app's own list.
- **ckt is two stages and two objects, as v2 was two layers.** Stage one sets
  type, a glyph range or an image, rules the white grid over it and cuts the
  cells into a `dataset`; stage two draws a dataset — one of the nine shipped,
  or one stage one made, handed over through the vault by id.
- **ckt's motion is v2's, in closed form.** One attractor on v2's paths, every
  dot tethered to its place and leaning its way; sprites spin, face the
  attractor or hold still, and pulse through zero. `tests/ckt-motion.mjs`
  replays v2's own easing loops for thousands of frames and holds the closed
  forms to them — 10⁻⁶ px. No Matter, no integrator.
- **v2's sprites were already here.** 59 of its 80 distinct sprites are the
  gamepad's `brushes` family, in v2's order; ckt reads them through the
  registry and nothing new entered git.
- **A ckt still replays exactly.** Its recipe carries the `tick` it shows, so
  `core/rebuild.js` rebuilds it pixel-identical to the PNG that was saved, and
  a loop frame renders byte-identical twice.
- **The registry asks what is on this machine** (`0195196`). One HEAD per
  family before the picker is built; the nine absent families cost nine
  requests and are not offered. And it takes families from the vault now: a
  `set` becomes a brush family, with its contact sheet as the card.
- **There is a font manifest.** `assets/font-manifest.json`, generated, each
  face's licence read out of its own `name` table — rule 5 checked against the
  files. All eight pass.
- **Two core bugs found by ckt, fixed, and tested with the real thing.**
  Picking a format preset flipped it straight to `custom` in every app,
  because `applyFrameEdit` re-entered on its own writes — grid's `ink` format
  stopped following its source because of it. And `snap()` wrote
  `0.12000000000000001` into recipes. Grid was re-checked in the browser.
- **M2 as before**: grid dithers any vault object per frame and saves it with
  its source as parent; replay is a dispatch (`core/rebuild.js` hands a recipe
  to `/apps/<app>/rebuild.js`); one clock plays every loop; framing is one idea
  in core; the gamepad's still crops to its ink; video is `frames.zip` plus
  `scripts/frames-to-video.mjs`.

## Tests

Thirteen files, no runner, no dependencies — the command in `CLAUDE.md` runs
all of them, and all pass:

`recorder` `clip` `export` `vault` `grid-map` `params` `rng` `playback` `frame`
`joyimage` `registry` `ckt-motion` `ckt-blobs`

New this session: `ckt-motion` (34 checks — v2's `gravCircle` and `fastSquare`
replayed against the closed forms, tethers, rotation modes, a still's crop),
`ckt-blobs` (20 — opencv's rounding, 8-connectivity, the zero-area blobs v2
dropped, contour order, and a solid square cut into a 7x7 lattice by white
lines). `frame` +5 and `params` +2 for the two core fixes, `registry` +12 for
families from the vault.

**Browser checks** are scripted over the Chrome DevTools protocol and were run
against a throwaway vault: boot, both stages, make dataset → draw it, save
still, save loop, emit family, the gamepad loading it, a shape as the sprite,
replay determinism, grid's format chips, and ckt with no vault API at all.
The driver lived in the session scratchpad, not the repo — see *Next*.

## Broken / half-done

- **Nothing opens a saved object back in its app.** The vault panel can open a
  render file, download it and copy its id; no app restores a recipe into its
  own panels, in any app. The `restore()` half of the contract has never run.
- **ckt differs from v2 on purpose in six places** — listed in
  `apps/ckt/STATUS.md`. The one to watch is the missing settle-wobble: v2's dots
  were overdamped, so it was barely visible, but it was there.
- **Nine of eleven sprite families are still not on this machine.** Destra,
  GaramondI ×3, Minipax, PeaceSans, Raleway ×2, fleurs — 135 MB, gitignored by
  decision, never copied in the 2026-09-21 move. The registry no longer
  shouts about them; only copying them over brings the brushes back. ckt can
  now regenerate their like: `garam` is the dataset `Garam_blue` was drawn
  from.
- **Five sprite names mean two pictures.** `sprite(50)` and `(61)`–`(64)` in
  the gamepad's `brushes` are not the files of those names in v2's
  `sprites/`, and v2 has 16 more (`65`–`80`, about 2.2 MB with the five). A
  cleanup must not renumber `brushes`: recordings store sprites by index.
- **Nothing can leave this disk.** `Vault.publish(id)` is specified at
  `docs/object-model.md:252` and not implemented; there is no `gallery/`.
- **The gamepad's params are not on `core/params.js`.** A hand-written panel
  driven by `SLIDERS`/`SECTIONS`, so no format chips. Its own task.
- **Old grid recipes re-render trimmed.** They carry no `format`, so
  `restore()` fills `content`. Two objects affected. Change the default to
  `source` if old recipes should reproduce exactly.
- **Id prefixes disagree with the spec.** `docs/object-model.md:56` says
  `grd_`; `server.js` yields `gri_`. A contract divergence to settle.
- `assets/fonts/` is missing each family's `OFL.txt`.
- **Two older sequences carry the pre-fix still** — `bounce 266 marks` and
  `sweep 507 marks`. Objects are immutable; re-export fixes them.
- `apps/gamepad/gallery/` and `scripts/dev-server.js` are superseded by
  `server.js` and the vault; the gamepad's GALLERY panel still shows IndexedDB.
- **Four files over the 400-line cap**, all inherited, all in the gamepad:
  `ui/hud.css` 724, `sketch/gamepadSketch.js` 546, `ui/TimelinePanel.js` 539,
  `ui/ParamPanel.js` 492. Nothing in ckt is over 210.

## Next single step

**Start the UI pass with the theme and the bar.** A light neo-brutalist token
set in `core/theme.css`, taken by grid and ckt, and the bottom bar cut down to
information only — output size, pixel density, shortcuts — as a block in the
layout instead of an overlay. Everything else in the pass builds on those two.
The whole brief is in `docs/roadmap.md`, *The UI pass, from the author's
brief*; the longer review is at
https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d.

Then the rest of the pass, then **Open a saved object back in its app**
(`/apps/ckt/?open=<id>`, the first time `restore()` runs), then **M4 —
compose**. Worth doing alongside: move the session's Chrome DevTools driver
into `scripts/` so a browser check is a command rather than a rewrite.

## Parked decisions

- Name is **skweeb**, `.skw` for the smart object.
- **M4 is a fourth app, `apps/compose/`, and the master rendering environment.**
  Export in the gamepad, grid and ckt stays but is demoted to a shortcut for
  producing an asset; anything with more than one element in it is composed.
- **Video is frames plus ffmpeg.** No browser muxer, ever.
- **A placement pins with `version`, and `at` is time.** See
  `docs/object-model.md`.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference.
  `bound` first, `standalone` later, `render()` stays pure so sandboxing is a
  worker and not a redesign.
- **Panels live in `core/`**, not in an app, when more than one app needs them.
- Resolution is export-only. Live at screen size; export re-runs `render()` once
  at scale.
- 3D is real and it is M5.
- `sketch-2-print` keeps its own gamepad, frozen. skweeb's copy is the living
  one.
- Export: p5.capture for drafts, `core/export.js` for objects and print.
- **CKT v3 keeps the dots and drops Matter** — held, and now shown to cost
  almost nothing: v2's dots were overdamped, so the closed form is the motion.
- **A port reads the original's source, never the roadmap's summary of it.**
  The first ckt port broke this rule by necessity and got the mechanism wrong.
- Local disk vault plus a published gallery. The online skweeboteque is wanted
  but not now.
- Open: whether `destra.otf` and `GPDestra-Light.otf` are yours to license.
