# STATUS — skweeb
_last touched: 2026-09-21_

## Works right now
- **M1's acceptance test passes.** A sequence recorded on the controller,
  exported from the timeline with ⤓, landed in the vault with its recipe:
  `gam_1789993444808_0cca28` — "bounce 266 marks", 1060 frames at 60fps,
  475×926, `render.png` + `thumb.webp` + a 59 KB envelope holding all 266 marks
  with their family, sprite, rotation, scale and pattern. That was the one part
  the previous session could not check itself. It is checked.
- **A sequence plays back, confirmed in the browser.** Press V, open a
  sequence, hit ▶. `core/rebuild.js` replays it from the recipe — there is no
  file to play, the loop having only ever existed as marks — and
  `core/SequenceViewer.js` drives the playhead. It works in `/apps/grid/` too,
  which is the part that matters: that page has no p5 of its own, and
  `rebuild.js` loads and owns one so no app has to.
- **Grid draws, confirmed in the browser**, from a dropped file and from a
  vault object. Saving from grid has *not* been exercised yet.
- **The stage and the registry live in `core/`.** `core/stage/` holds `clip`,
  `player`, `recorder`, `stage`, `transport` and `bounds`; `core/registry.js`
  and `core/stamp.js` came with them. The gamepad imports them from there and
  still boots — its whole module graph, 30 files, was checked against the
  running server. That is what M1 meant by "core + gamepad moved in", and it
  is what makes a sequence replayable by something that is not the gamepad.
- **The vault has a read path, confirmed in the browser.** `core/VaultPanel.js`
  — press **V** in the gamepad, or click the count in the status bar. Grid of cards from
  `index.json` alone; clicking one opens a drawer that calls `Vault.load()` for
  the envelope, the recipe, lineage and the actions. Type chips appear once
  there is more than one type. Empty, offline and no-recipe states all say what
  is going on rather than showing nothing.
  It lives in `core/` on purpose: at M2 the same markup is the object picker a
  param of `type: "object"` renders — pass `onPick` and the cards select.
- **A sequence's still is the frame that represents it**, not the last one.
  `representativeTick()` asks the window rule which tick shows the most marks —
  arithmetic over the window, no pixels read. Confirmed: a freshly exported
  `sweep` now shows the whole drawing on its vault card. Before this, `sweep`
  and `build` kept a fully transparent PNG (their last tick is a deliberate
  blank) and `bounce` kept two marks out of 266.
- **The vault spine works.** `node server.js` serves the repo root and owns
  `vault/`. `GET/POST /api/vault` and `GET /api/vault/<id>` pass: create, dedup
  on same-bytes-and-same-recipe, a new object for the same bytes with a
  *different* recipe, magic-byte rejection, missing-type rejection, id
  traversal refused, and renders served byte-exact.
- Saving in the gamepad writes both tiers: ImageStore as before (browser
  scratchpad) and a vault object with its recipe attached.
- Marks are buffered whether or not a sequence is armed, so a still carries the
  marks that made it. `node tests/recorder.mjs` covers the semantics, 19 checks.
  `node tests/export.mjs` covers the frame loop and the zip, 14 checks.
  `node tests/clip.mjs` covers the window rules and which frame becomes a
  sequence's still, 25 checks — including the three walk diagrams in
  `sequenceClip.js`, pinned character for character so comment and code cannot
  drift apart. `node tests/vault.mjs` covers the write API end to end, 59
  checks: it spawns `server.js` on a free port against a throwaway vault in the
  temp directory and removes both afterwards, so it never touches yours.
- The gamepad's drawing is already deterministic — the only `random()` calls in
  it are id generation. Recipes reproduce without seeding work here, though
  `rng.js` still matters for ckt and grid.
- The contract: `CLAUDE.md`, five docs, two skills, and `assets/fonts/` with
  eight verified open-licence faces.

## Broken / half-done
- **Nothing can leave this disk.** `Vault.publish(id)` is specified in
  `docs/object-model.md:252` and is not implemented; there is no `gallery/`
  directory and no publish path. Combined with the next item, that means work
  made on one machine is stuck there.
- **The vault is per-device and does not sync** — it is gitignored real files,
  by design. This was met head-on on 2026-09-21: the session moved to a new
  machine and the vault started empty. Nothing was lost (the previous vault
  held API test objects only), but the rule to hold onto is that **an object
  survives a device change only once it is published to `gallery/`**, which is
  the half that is in git. So publish is now load-bearing, not a nicety.
- **Id prefixes disagree with the spec.** `docs/object-model.md:56` says
  `gmp_` `grd_` `ckt_` `skw_`; `server.js` `newId()` takes the first three
  letters of `origin.app`, which yields `gam_` for the gamepad and would yield
  `gri_` for grid. Two of four are wrong. Nothing breaks — `safeId()` accepts
  both — so this is a contract divergence to settle, not a bug to chase. Decide
  which is right and make the other follow.
- `assets/fonts/` is missing each family's `OFL.txt`, which the licence asks to
  travel with the files.
- Six sprite families (135 MB: Destra, GaramondI, Minipax, PeaceSans, Raleway,
  fleurs) are on disk but gitignored. A clone boots with `brushes` and `timbre`
  only. Quantization is measured and waiting on a look: q80 takes Garam_blue
  from 19.03 MB to 5.56 MB at ~2/255 mean error on visible pixels. `brushes`
  stays lossless by decision.
- `apps/gamepad/gallery/` and `scripts/dev-server.js` are the old per-app
  gallery and its server, superseded by `server.js` and the vault. Note the
  **GALLERY panel in the app is still the old one** — it shows this browser's
  IndexedDB scratchpad, not the vault. Two galleries, one of which is now
  redundant; they go at `core/` extraction.
- A still's recipe holds everything needed to redraw it, but nothing redraws it
  yet: the exporter drives `SequencePlayer`, which replays a *clip*, and there
  is no equivalent path for a plain still.
- A sequence object has no playable file. Its render is one PNG — the fullest
  frame the window rule shows — and the frames come out as a zip on request.
  Video needs a muxer, which is still the real fix; see `docs/roadmap.md`.
- **Two older sequences still carry the pre-fix still** — `bounce 266 marks`
  and `sweep 507 marks`, both exported before 2026-09-21's fix, so their cards
  are blank or near-blank. Objects are immutable: the fix reaches them by
  re-export, not by rewrite. `sweep 214 marks` is the first one exported after,
  and it looks right.
- Load an image onto the canvas and marks no longer account for it, so the
  still saves as a leaf — `recipe: null`, tagged `leaf`. Correct, but a drawing
  made on top of a loaded image cannot be re-rendered. Lineage through
  `parents` would fix it once the loaded image is itself an object.
- Four files are over the 400-line cap, all inherited and all still in the
  gamepad: `ui/hud.css` 724, `ui/TimelinePanel.js` 539,
  `sketch/gamepadSketch.js` 531, `ui/ParamPanel.js` 492. `sequencePlayer.js`
  came off the list at the move — extracting `bounds.js` took it from 407 to
  338.

## Next single step
- **Grid dithers a sequence frame by frame**, which is M2's link:
  `grid → vault: dithered sequence`. Everything it needs now exists —
  `openSequence()` gives the frames, `renderGrid()` already dithers one image,
  and `core/export.js` already runs a clockless frame loop. What has to be
  decided rather than assembled is what comes out: a `sequence` object whose
  render is one frame and whose `parents` is the loop it was made from, which
  means grid's save path grows a second shape.

Then M2 is done and the catalogue has its first link — the honest measure of
whether this is a suite rather than apps sharing a drawer. `input.js` is still
unmoved but blocks nothing. The webm muxer stays an open decision: staged, not
scheduled, and nothing built since has needed it.

## Parked decisions
- Name is **skweeb**, `.skw` for the smart object.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference,
  edit once and every placement follows. `bound` form first, `standalone` later,
  and `render()` stays pure so sandboxing is a worker and not a redesign.
- **Panels live in `core/`, not in an app**, when more than one app needs them —
  `docs/core-api.md` lists `panel.js` and the vault picker as core, and a panel
  built in `apps/gamepad/ui/` would only have to move at M2. `VaultPanel` is
  the first one written that way: it imports `core/vault.js` and nothing else,
  and its stylesheet falls back to its own colours when an app supplies no
  `--hud-*` tokens.
- Resolution is export-only. Live runs at screen size with a `density` param;
  export re-runs `render()` once at scale. A composition is the case it exists
  for, and it is M4.
- 3D is real and it is M5 — a fourth app, not a retrofit.
- `sketch-2-print` keeps its own gamepad, frozen. skweeb's copy is the living
  one. They diverge on purpose.
- Export: p5.capture for drafts, `core/export.js` for objects and print.
- CKT v3 keeps the dots, drops Matter — a physics engine cannot promise the
  same pixels twice, and recipes depend on that.
- Local disk vault plus a published gallery. An online skweeboteque is wanted
  but not now; the vault interface is the seam it goes behind.
- Open: whether `destra.otf` and `GPDestra-Light.otf` are yours to license.
