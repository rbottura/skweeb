# STATUS — skweeb
_last touched: 2026-09-23_

## Works right now

- **The UI pass is in, from the author's brief** (`docs/roadmap.md`, *The UI
  pass, from the author's brief*), and every part of it was seen running in
  Chrome:
  - **One theme**, neo-brutalist and light, in `core/theme.css`: cream ground,
    black ink, thick borders, hard shadows, one yellow accent that is only
    ever a fill. grid and ckt are built on it; the gamepad keeps its
    gamepad-first layout and took the look — its four stylesheets converted,
    then fixed by eye wherever the old palette had used colour as text.
  - **The bar is information only** (`core/Bar.js`): output size, density, a
    paper format's dpi, the loop's measured paint rate, the vault, keys. A row
    of the page grid, so it never covers a canvas or a panel. No header.
  - **Panels are drawers** (`core/Drawer.js`), docked into layout columns. A
    param's `group` is its drawer and `format` is core's own, the same in every
    app. The sequence player is a component (`core/Transport.js`). Rows show
    only when they apply (`when`), sliders have typed boxes, and a family's
    sprites are picked from a grid of their images (`type: 'sprite'`).
  - **The page never scrolls.** `.app` holds and clips whatever is positioned
    inside it: `overflow: hidden` on the body does not stop focus scrolling the
    page, and a switch low in a docked panel was throwing the app off-screen.
  - **`link w/h` works** — it did nothing once the format was `custom`. Either
    side drags the other and the shape is held exactly, a slider dragged to
    2 px and back included; a ratio or a paper format stays picked, so A4 at
    2480 px reads 300 dpi. Width and height run 1–4000; a linked side at the
    limit makes the typed one give way. A typed box never shows a value the
    param refused. Seen in grid and ckt.
  - **Reset resets.** `restore()` put values back silently, so no widget
    moved; it now announces each change, with `params.restoring` set so the
    frame chain leaves a recipe as it was saved.
  - **ckt is three columns**: dots left, motion right, the viewer between with
    a dots / motion toggle. Legacy dot-sets in a closed drawer; every dot-set
    made is saved at once into a session folder and listed, one click away,
    ← → stepping through them and then the legacy nine. The attractor starts
    off, the tether at 0, and the letter turns: a loop is one turn at `speed`
    degrees a frame, so a saved loop closes. Trails fade; the pulse has a
    floor instead of flipping.
  - **ckt's performance, audited and measured in the running app** on egypt's
    heaviest glyph (1275 dots, the attractor moving): at size 0.6 the old
    renderer painted 41 frames a second and the new one keeps the loop's full
    30; at size 1, 22 against 30; a 10-frame moving trail, 9 against 13; a
    trail with the attractor off — the default — keeps 30. The canvas is
    reused, marks are pre-rendered at the size and angle they appear, the
    preview is drawn at the size the viewer shows it, and a still trail is
    baked into one stamp.
  - **grid**: `zoom` scales the object inside a fixed canvas; `scale`, 0.25 to
    4, multiplies width and height and now lives in the shared Format drawer.
  - **gamepad**: a still saves on a transparent ground by default; the Canvas
    section's Save Ground row (A) or G switches to white. The recipe says which.
  - **The vault groups**: a `folder:<name>` tag files an object in a folder of
    the vault panel — ckt's session dot-sets, an emitted family's brushes.
    `docs/object-model.md`, *Tags that group*.
- **Two core bugs fixed with it**, both pushed before this pass: a picked
  format preset flipped to `custom` (the frame chain heard its own writes), and
  `snap()` wrote `0.12000000000000001` into recipes.
- **M3 as before**: ckt ported from v2's own source; the link
  `ckt → gamepad: brush family` works both ways; a ckt still replays
  pixel-identical. `apps/ckt/STATUS.md` has the app's list.
- **M2 as before**: grid dithers any vault object per frame; replay is a
  dispatch; one clock plays every loop; video is `frames.zip` plus
  `scripts/frames-to-video.mjs`.

## Tests

Thirteen files, no runner, no dependencies — the command in `CLAUDE.md` runs
all of them, and all pass. New checks this pass: `params` (the `sprite` and
`ground` types, `when`; a reset announces what it moves), `frame` (zoom is
the object, never the canvas; the format drawer carries `scale`; the link on a
real Params — custom, a slider's round trip, shapes that stay picked, the
4000 limit, a restore left as saved), `ckt-motion` (a loop is one turn in
either direction; `off`; laps; the pulse floor; a still's crop). Run against
the old `frame.js`, 15 of the link checks fail.

The browser checks were driven over the Chrome DevTools protocol against a
throwaway vault, from a script in the session scratchpad — still not in the
repo. See *Next*.

## Broken / half-done

- **Moving trails are the one slow case left**: a pass over every dot per
  trail sample, 13 painted frames a second for 1275 dots and a 10-frame trail.
  Inherent to drawing them exactly; a faster preview would be an approximation
  (an accumulation buffer), which was tried on paper and rejected for ghosting.
- **The headless Chrome here never reproduced the author's frame drops
  exactly**; the numbers above are from the heaviest glyph at large sizes,
  where the old renderer did drop. The bar's fps readout is there so the
  author's own machine can say.
- **Nothing opens a saved object back in its app.** `restore()` has run only
  as Reset. When it does, a recipe wider or taller than 4000 px would come
  back clamped; none of the seven sized recipes in the vault is.
- **An identical re-cut does not join the new session folder**: the vault
  de-duplicates same bytes and same recipe, and returns the old object with
  its old tags. Correct by the object model; surprising in the vault panel.
- **Five sprite names mean two pictures** — `sprite(50)`, `(61)`–`(64)` in
  `brushes` against v2's `sprites/`, and v2 has 16 more. A cleanup must not
  renumber `brushes`: recordings store sprites by index.
- **The gamepad's params are still not on `core/params.js`**, so its panels
  are its own; it has the theme, not the drawers.
- **Files over the 400-line cap**, all the gamepad's: `ui/hud.css`,
  `sketch/gamepadSketch.js`, `ui/TimelinePanel.js`, `ui/ParamPanel.js` — the
  last two grew a few lines this pass (the Save Ground row).
- Rule 8 asks for p5 in every app; grid and ckt draw with Canvas 2D alone. Open
  in the review doc, not decided.
- **Nothing can leave this disk**: `Vault.publish` is specified, not built.
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files; the gamepad's GALLERY
  panel still shows IndexedDB.

## Next single step

**Open a saved object back in its app** — `/apps/ckt/?open=<id>` restores the
envelope's recipe into the right stage (a `dataset` into dots; a still, loop
or brush into motion, the clock at its `tick`), plus an "Open in its app"
button in the vault panel's detail. Small now: the panels follow a restore,
and the frame chain leaves one as it was saved — which M4's compose needs for
every object it places.

Then **M4 — compose**. Alongside it: move the Chrome DevTools driver into
`scripts/` so a browser check is a command, and the gamepad onto core params.

## Parked decisions

- Name is **skweeb**, `.skw` for the smart object.
- **The UI pass's decisions** — theme, bar, drawers, ckt's columns and
  sessions, the rotation loop, grid's zoom and scale, transparent stills — are
  in `docs/roadmap.md`. The longer review, for the author's notes:
  https://claude.ai/code/artifact/28ad1346-969d-44e7-b058-b6d7abeced8d
- **M4 is a fourth app, `apps/compose/`, and the master rendering environment.**
- **Video is frames plus ffmpeg.** No browser muxer, ever.
- **A placement pins with `version`, and `at` is time.** `docs/object-model.md`.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference;
  `render()` stays pure so sandboxing is a worker and not a redesign.
- **Panels live in `core/`** when more than one app needs them — now drawers,
  the bar and the player too.
- Resolution is export-only: live at the size the viewer shows, full size once
  at export. ckt's preview does exactly this now.
- 3D is real and it is M5.
- `sketch-2-print` keeps its own gamepad, frozen.
- **CKT v3 keeps the dots and drops Matter**; v2's dots were overdamped, so
  the closed form is the motion.
- **A port reads the original's source, never the roadmap's summary of it.**
- Local disk vault plus a published gallery; the online skweeboteque later.
- Open: whether `destra.otf` and `GPDestra-Light.otf` are yours to license.
