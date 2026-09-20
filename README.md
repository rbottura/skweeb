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
node server.js      # http://127.0.0.1:3000
```

## Status

Milestone 1. See `STATUS.md` for where it actually is today, and
`docs/roadmap.md` for where it is going.
