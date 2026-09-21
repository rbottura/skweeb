# STATUS — skweeb
_last touched: 2026-09-21_

## Works right now
- **The vault spine works.** `node server.js` serves the repo root and owns
  `vault/`. `GET/POST /api/vault` and `GET /api/vault/<id>` are exercised and
  pass: create, dedup on same-bytes-and-same-recipe, a new object for the same
  bytes with a *different* recipe, magic-byte rejection, missing-type
  rejection, id traversal refused, and renders served byte-exact.
- Saving in the gamepad now writes both tiers: ImageStore as before (browser
  scratchpad) and a vault object with its recipe attached. The status bar shows
  the vault count.
- The copy is confirmed working: drawing, the gallery panel, image upload and
  save all behave, in the browser with the controller.
- The gamepad's drawing is already deterministic — the only `random()` calls in
  it are id generation in `imageStore` and `sequenceRecorder`. Recipes will
  reproduce without any seeding work here, though `rng.js` still matters for
  ckt and grid.
- The contract: `CLAUDE.md`, five docs, two skills, and `assets/fonts/` with
  eight verified open-licence faces.
- `sketch-2-print` is clean and `main` carries the sequence/timeline work
  (6823f56, 820cd2d). The two gamepads have now forked.

## Broken / half-done
- Everything in `docs/` describes code that does not exist. The docs are the
  spec for M1, not a description of a working system.
- `assets/fonts/` is missing each family's `OFL.txt`, which the licence asks
  to travel with the files.
- Six sprite families (135 MB: Destra, GaramondI, Minipax, PeaceSans, Raleway,
  fleurs) are on disk but gitignored. A clone boots with `brushes` and
  `timbre` only. Quantization is measured and waiting on a look: q80 takes
  Garam_blue from 19.03 MB to 5.56 MB at ~2/255 mean error on visible pixels.
  `brushes` stays lossless by decision. Test output and the A/B page are in the
  session scratchpad, `quant/out/compare.html`.
- `apps/gamepad/gallery/` and `scripts/dev-server.js` are the old per-app
  gallery and its server, superseded by `server.js` and the vault. They still
  work if run directly; they go at `core/` extraction.
- Nothing reads the vault back yet — no gallery, no picker. Objects go in and
  sit there until `Vault.list()` has a panel in front of it.
- The timeline can make sequences but cannot keep them: there is no export
  anywhere in `TimelinePanel.js` or `core/sequence*`, so a composition
  evaporates on reload. Everything an exporter needs is in place — `step()`
  refuses the clock, the player takes a scale, a loop knows its tick count.

## Next single step
- `core/export.js` plus an export control on the timeline: advance the
  transport tick in a bare loop over one complete cycle, writing a webm and a
  PNG sequence. That is what lets a loop become an object, and it closes M1's
  acceptance test.

Then: the mechanical moves into `core/` (`stage/`, `input.js`, `registry.js`,
`libs/`) with the import rewrite; then `core/params.js`, which is what grid v2
gets written against at M2.

## Parked decisions
- Name is **skweeb**, `.skw` for the smart object.
- `.skw` is a Photoshop-style smart object: bound params, placed by reference,
  edit once and every placement follows. `bound` form first, `standalone` later,
  and `render()` stays pure so sandboxing is a worker and not a redesign.
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
