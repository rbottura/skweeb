# skweeb

*web sketch suite*

Three drawing processes and one shared vault, so that what you make in one is
the material of the next.

- **gamepad** — draw with a controller; every stroke is recorded, so a drawing
  is also a loop you can replay, window, stack and phase against itself.
- **grid** — map an image or a loop onto a grid of cells: dither, tile,
  substitute, threshold.
- **ckt** — text becomes a field of dots, the dots become sprites, the sprites
  move. (ColorKineType, third pass.)

Anything any of them makes lands in the vault as an **object**: the rendered
file, a thumbnail, the recipe that made it, and the ids of what it came from.
Anything in the vault can be loaded by any of them. The keepers get published
to a gallery with a public link.

New processes are meant to be added — 3D, materials, print layout. An app is a
folder in `apps/`, a param schema, and three functions. See
`docs/object-model.md`.

## Running

```sh
node server.js      # http://127.0.0.1:3000/apps/gamepad/
```

The server serves the repo root, so apps sit at `/apps/<name>/`, the shared kit
at `/core/` and your objects at `/vault/`.

## On another machine

Clone it, run `node server.js`, open `/apps/gamepad/`. Everything needed to run
is in the repo, with two deliberate exceptions — both stay on the machine that
made them:

- **`vault/`** — your objects. Not in git by design: unbounded, holds video,
  and it is yours. Nothing saved on one machine appears on another. Copy the
  folder across if you need it, or publish the keepers into `gallery/`.
- **Six sprite families** — Destra, GaramondI, Minipax, PeaceSans, Raleway and
  fleurs, 135 MB between them, gitignored until they are recompressed
  (`docs/migration.md` has the measurements). The originals live in
  `sketch-2-print`. The app boots without them on `brushes` and `timbre`.

`brush-manifest.json` is committed and still lists all eleven families, so a
fresh clone offers six that are not there. Regenerate it from what is actually
on disk before working:

```sh
node scripts/generate-manifest.js
```

## Licence

**The code is MIT** — see `LICENSE`. That covers what was written for this
project: `core/`, `server.js`, the sources under `apps/`, `scripts/`, `tests/`.

It does not cover everything in the repository, and the difference matters:

- **The visual work is not MIT.** The sprites under `gamepad_sprites/`, and
  anything drawn with this suite, are copyright Raphael Bottura, all rights
  reserved. Ask if you want to use them.
- **The fonts in `assets/fonts/` are third-party**, each under the SIL Open
  Font License 1.1 with its own copyright holder. Their licence travels with
  the files and is not replaced by this one — `docs/fonts.md` has the audit,
  including the six fonts that were pulled for having no licence at all.
- **`apps/gamepad/libs/` is vendored and keeps its own terms.** p5.js is
  LGPL-2.1 and stays LGPL-2.1. `p5.joystick.min.js` carries no licence header,
  no author and no attribution — its provenance is unverified, which puts it
  in the same position as the pulled fonts. It should be traced or replaced
  before anything depends on it being redistributable.

## Status

Milestone 1. See `STATUS.md` for where it actually is today, and
`docs/roadmap.md` for where it is going.
