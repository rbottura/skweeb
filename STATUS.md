# STATUS — skweeb
_last touched: 2026-09-21_

## Works right now
- `node scripts/dev-server.js` serves `apps/gamepad/` and answers the gallery
  write API. Index, ES modules, manifest, p5.joystick, sprites and the gallery
  page all return 200. **Not yet confirmed in a browser with a gamepad** —
  files are served, drawing is untested.
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
  `timbre` only. They need recompressing before they can be committed —
  `pngquant` should take that 140 MB to somewhere near 40.
- `apps/gamepad/gallery/` is the old per-app gallery, superseded by the shared
  one. It stays until `core/` extraction, then goes.

## Next single step
- Open `http://127.0.0.1:3000/` with the gamepad plugged in, draw, record one
  sequence, and save it. That confirms the copy before `core/` extraction
  starts pulling it apart.

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
