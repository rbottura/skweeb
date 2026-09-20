# STATUS — skweeb
_last touched: 2026-09-21_

## Works right now
- Nothing runs yet. The repo holds its own contract: `CLAUDE.md`, five docs,
  two skills, and `assets/fonts/` with eight verified open-licence faces.
- `sketch-2-print` is clean: the sequence/timeline system and the three new
  brushes are committed on branch `gamepad-sequences` (6823f56, 820cd2d).
  `main` is still one fast-forward behind them.

## Broken / half-done
- Everything in `docs/` describes code that does not exist. The docs are the
  spec for M1, not a description of a working system.
- `assets/fonts/` is missing each family's `OFL.txt`, which the licence asks
  to travel with the files.

## Next single step
- Fast-forward `sketch-2-print` main onto `gamepad-sequences`, then copy
  `sketch-2-print/gamepad/` into `skweeb/apps/gamepad/` — files only, no git
  history, since that history is 253 MB and carries nothing this repo needs.
  That copy is M1's starting point and the moment the two gamepads fork.

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
