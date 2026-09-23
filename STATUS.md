# STATUS — skweeb
_last touched: 2026-09-24_

## Works right now

- **A set says where it is offered** (`core/uses.js`), all of it seen in
  Chrome. A vault set's detail has a switch per use — *gamepad brush family*,
  *grid material*, *ckt sprite family* — and each app lists only the sets
  switched on for it: the gamepad's selector, grid's material picker, ckt's
  family list. The switches are `use:<id>` tags. A set nobody has switched
  follows its role, so every family ckt emitted before stays in the gamepad;
  all off is `use:none`. Adding a consumer is a row in `USES`.
- **Tags are the one editable part of an object** — decided this session, in
  `docs/object-model.md`, *Tags change*. `PATCH /api/vault/<id>` takes
  `{ add, remove }` and nothing else; `Vault.retag()` is its client. Render,
  recipe, seed and lineage stay frozen. A set's index row now carries its
  `role`, so pickers filter without opening every set.
- **grid makes materials** (`apps/grid/maker.js`): up to twelve sprites from
  the gamepad's families on disk, the vault's sets and its loose images, kept
  light to dark by their measured tone on the current ground, previewed live
  in the dither, saved as a `set` with `role: 'material'`. A dither made with
  one replays pixel-identical. `apps/grid/STATUS.md` has the detail.
- **The legacy folder**: a disk sprite a material uses is copied into the
  vault once, as a `shape` leaf in `folder:legacy <family>` (`core/legacy.js`);
  a disk shelf's *Copy all N into the vault* copies the whole family and makes
  it a set, switched on for grid and ckt but not the gamepad, which has the
  original. Copying again makes nothing new.
- **Materials can be edited** — from grid (*Edit the material…*) or from the
  vault (*Open in grid ↗* on a material). *Save changes* makes a new version
  and puts the old one away in `earlier materials`, offered nowhere, so
  dithers made with it still replay as they were; the picker shows only the
  current one. Seen in Chrome: no-change, rename, edit back to an earlier
  version, open by link.
- **The material picker no longer comes up empty** in front of a server that
  predates rows carrying `role`: sets without one are asked their envelope
  (`core/vault-offer.js`), and the gamepad and ckt check envelopes too. A
  filtered picker now says how many never-switched sets it left out, shows
  them on request, and switches one on when it is picked.
- **grid has a sprite size** (`tileScale`): tiles drawn up to ten times their
  cell, overlapping, the grid itself unchanged. Size 1 is bit-identical to
  before.
- **ckt draws with vault sets**: the legacy brushes, a material, another
  family — any set switched on as ckt sprites is in its family list.
- **ckt's rotation no longer stutters**, seen and measured in Chrome against
  the previous commit. The cause was not the loop's 30 fps: the preview's
  angle cache was 4° a bucket, so a spin at 2° a frame changed on screen every
  fourth refresh at 60Hz, held 2, 4 or 6 as the timing fell — 15 pictures a
  second, unevenly. Now the preview draws sprites that turn alike at their
  exact angle, and draws *between* the loop's frames (`core/playback.js`,
  `smooth`): it paints at the screen's own rate. On egypt's heaviest glyph
  (1275 dots) it holds 60 of 60 at sizes 0.05 to 1, with a still trail, with
  the attractor moving and in `face`. Saves are untouched — the loop's `fps`
  and frame count, the quarter-degree cache — so saved objects re-render as
  they did. The stamp cache moved to `apps/ckt/stamps.js`.
- **The gamepad's page fits above the timeline.** Open, and more so with a
  layer's drawer open, it stood over the bottom half of a drawing. Now the
  whole page is drawn scaled into the space left, on the theme's ground with
  its edge marked, easing as the timeline opens and closes
  (`apps/gamepad/sketch/viewFit.js`). A view only: the canvas, the ink, the
  recorder and saves keep their size, so nothing made while fitted differs.
- **An object opens back in its app** (`core/reopen.js`), all of it seen in
  Chrome. The vault detail's *Open in ckt ↗* or *Open in grid ↗* opens
  `/apps/<app>/?open=<id>` in a new tab: a ckt still or brush at its exact
  frame, a loop playing, a dot-set into both stages and this session's list, a
  grid dither with its source loaded and dithered again. An app says which of
  its objects it can take back (`reopens()` in its `rebuild.js`); a family set
  and the gamepad's recordings get no link. A wrong id, or another app's, says
  so in the bar.
- **A picker's Use button sits on the chosen card**, across the foot of its
  picture, and a double click uses it outright. A dot-set's detail shows its
  thumbnail, its render being JSON.
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

Fifteen files, no runner, no dependencies — the command in `CLAUDE.md` runs
all of them, and all pass. New this session: `uses` (the defaults, the
switches, `use:none`, unknown uses kept) and `grid-material` (tone on a
ground, a tile in its cell, the tray, the legacy envelopes); `vault` covers the
tag edit and its refusals, `registry` a member's own file type. New checks this pass: `params` (the `sprite` and
`ground` types, `when`; a reset announces what it moves), `frame` (zoom is
the object, never the canvas; the format drawer carries `scale`; the link on a
real Params — custom, a slider's round trip, shapes that stay picked, the
4000 limit, a restore left as saved), `ckt-motion` (a loop is one turn in
either direction; `off`; laps; the pulse floor; a still's crop). Run against
the old `frame.js`, 15 of the link checks fail.

The browser checks were driven over the Chrome DevTools protocol against a
throwaway vault, from a script in the session scratchpad — still not in the
repo. See *Next*. This pass's also compared against the last commit, served
from a temporary worktree: paint rate, and how often the screen changes.
`playback` gained smooth mode's checks.

## Broken / half-done

- **Moving trails are the one slow case left**: a pass over every dot per
  trail sample, 13 painted frames a second for 1275 dots and a 10-frame trail
  — the same before and after this pass.
  Inherent to drawing them exactly; a faster preview would be an approximation
  (an accumulation buffer), which was tried on paper and rejected for ghosting.
- **ckt's `speed` is degrees a frame**, so a loop saved at 60 fps turns twice
  as fast as at 30 unless `speed` is halved. The preview is smooth at any
  `fps` now; which rate saves should default to is the author's call.
- **The gamepad cannot reopen its recordings**: they replay in core, but
  nothing loads one back into its timeline to go on drawing.
- **ckt's width and height are two things**: the output canvas, and the world
  the glyph is centred in and the attractor's paths are measured against. So
  with `ink` picked the rows show the world, not the ink, as grid's do.
  Separating the two is the fix; it changes what an old recipe means.
- A recipe wider or taller than 4000 px would open clamped; none of the seven
  sized recipes in the vault is.
- **An identical re-cut does not join the new session folder**: the vault
  de-duplicates same bytes and same recipe, and returns the old object with
  its old tags. Correct by the object model; surprising in the vault panel.
- **Five sprite names mean two pictures** — `sprite(50)`, `(61)`–`(64)` in
  `brushes` against v2's `sprites/`, and v2 has 16 more. A cleanup must not
  renumber `brushes`: recordings store sprites by index.
- **The gamepad's params are still not on `core/params.js`**, so its panels
  are its own; it has the theme, not the drawers.
- **A server started before a change to `server.js` keeps its old API** — it
  serves the new pages from disk but answers with old code. That is what hid
  the author's two materials on 2026-09-24 (no `role` on its rows) and what
  would make the vault switches fail (no PATCH). Restart it after pulling.
- **`server.js` is at 399 lines.** The next endpoint splits it — the vault
  API into `server/vault.js`, say — before anything is added.
- **The legacy copy is a button, not the script planned** (`scripts/` has no
  canvas for thumbnails). Heavy families copy as they are: fleurs is 18 MB on
  disk, and copying it puts 18 MB more in the vault.
- **Files over the 400-line cap**, all the gamepad's: `ui/hud.css`,
  `sketch/gamepadSketch.js` (572), `ui/TimelinePanel.js` (547),
  `ui/ParamPanel.js`. The fit to the timeline went into its own file, but
  wiring it grew the first two by a few lines each.
- Rule 8 asks for p5 in every app; grid and ckt draw with Canvas 2D alone. Open,
  not decided — the proposal is to keep the rule's point (ES modules, no
  globals, one p5 when an app uses p5) and drop "every app".
- **Nothing can leave the author's machines**: `Vault.publish` is specified,
  not built. The tailnet covers the author's own use (*Parked*).
- As before: old grid recipes re-render trimmed; `grd_` against `gri_` id
  prefixes; `assets/fonts/` lacks its `OFL.txt` files; the gamepad's GALLERY
  panel still shows IndexedDB.

## Next single step

**M4's first brick: `apps/compose/` boots on the kit and places one object.**
The shell from `core/theme.css`, a docked panel whose Format drawer is the
page, one `type: 'object'` param, and that object drawn on the page at a
transform — frame 0, through `core/rebuild.js`, which already gives frame N
of anything. Standalone, like every app.

Then the rest of **M4 — compose**. Alongside it: move the Chrome DevTools
driver into `scripts/` so a browser check is a command, and the gamepad onto
core params.

## Parked decisions

- **Where a set is offered is tags, declared per consumer** (2026-09-24):
  `use:<id>`, switched in the vault, with `core/uses.js` as the catalogue —
  the consuming half of what a link is on the producing side. Tags are the one
  mutable part of an object; everything else still makes a new object.
- **A material is a set with `role: 'material'`**, light to dark, cap twelve.
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
- **The vault is shared over the author's tailnet**: one machine serves it,
  work and home open it by link, and the `?open=` link is M4's "URL you can
  send" for those machines. `server.js` stays on 127.0.0.1 behind
  `tailscale serve`, or takes `--host` its tailnet address — never `0.0.0.0`.
  `docs/roadmap.md`.
- **Destra is free**, from fonderiz.fr, by a friend of the author's. It ships
  once the licence is named in the files; `docs/fonts.md`.
