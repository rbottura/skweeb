---
name: skweeb-app
description: Add a new process to the skweeb suite, or port a sketch into it — the folder, the param schema, the frames a save and a replay share, the rebuild.js core asks about an app's objects, and the checks that keep it running standalone. Use when creating an app under apps/, porting a p5 or canvas sketch into skweeb, adding a parameter or a drawer, or making an app save to, replay from or reopen out of the vault.
---

# Add a process to skweeb

An app is a folder: a param schema, a page that draws from it, a save, and a
`rebuild.js` that core asks about the app's objects. Panels, the bar, the
player, the vault and its panel, lineage, export and the GPU kit are
`core/`'s. An app writing any of those itself has gone wrong; what two apps
need moves into core, as `stamps.js`, `view.js` and `sprites.js` did.

Read `docs/core-api.md` before the first edit and the `skweeb-object` skill
before the first save. Copy the shape of the newest apps, `apps/particles/`
and `apps/fractals/` — never the gamepad's, the one app still on p5 and its
own panels, whose recordings core replays itself.

## The folder

```
apps/<name>/
  index.html   `.app`, its columns, a canvas, main.js as a module — no p5
  main.js      boot: schema → ParamPanel, the Bar, the player, keys, ?open=
  params.js    the schema, and its drawers as GROUPS
  frames.js    a recipe as frames: what a save draws and a replay draws
  save.js      Vault.save; every frame as a zip; a sprite sheet
  rebuild.js   what core asks: openObject(), reopens(), redraws()
  style.css    @imports core's theme.css, param-panel.css, vault-panel.css
               (and sequence-viewer.css for a loop), then only its layout
  STATUS.md    works now / known / next single step / parked
```

One concept per file, 400 lines at most: the model, the drawing, the pointer
and the guides each get their own (particles: `model.js`, `forces.js`,
`draw.js`, `guides.js`, `pointer.js`).

## The schema first

The panel, the recipe and the gallery filters all come from it: a value not
in the schema is a value that cannot be saved.

```js
import { defineParams } from '../../core/params.js';
import { frameParams }  from '../../core/frame.js';
import { easeParam }    from '../../core/easing.js';

export const GROUPS = { look: { label: 'Look', open: true }, format: { label: 'Format', open: false } };

export function appParams() {
  const { zoom, ...frame } = frameParams({ format: 'ig-square' });   // core's Format drawer, less what has no use here
  return defineParams('<name>', {
    sprites: { type: 'object', accepts: ['set', 'shape', 'still'], use: '<name>', label: 'sprites', group: 'look' },
    size:    { type: 'range', min: 0.1, max: 20, step: 'any', log: true, default: 1, label: 'size ×', group: 'look' },
    fade:    easeParam({ label: 'fade', group: 'look', when: { sprites: { not: null } } }),
    ...frame,
  });
}
```

- `group` names the drawer; `format` is core's own, the same in every app.
- `when` shows a row only when it applies — `{ k: v }`, `{ k: [a, b] }`,
  `{ k: { not: v } }`, or a list of those, any one enough. A hidden value
  stays in the recipe.
- `type: 'object'` is how an app eats what another made: a vault picker
  filtered by `accepts`, the choice a parent by itself. `use` narrows sets to
  those offered for it — a new consumer is one row in `core/uses.js`.
- `log: true` for a range over orders of ten; `step: 'any'` keeps every digit.

Adding a control is one entry. What cannot be one is a new widget type in
`core/params.js` and `core/widgets.js`, once, for every app.

## frames.js — one drawing for the save and the replay

```js
export function openThing(recipe, { sprites = null, scale = 1 } = {}) {
  // → { length, fps, loop, width, height, scale, frame(i) }
  //   frame(i) lends one canvas, drawn again on every call
}
```

Frame `i` comes from the recipe and `i` alone: no clock, no DOM, no
`Math.random()`. Random is `makeRng(seed)` (`core/rng.js`), seeded from the
recipe and what it draws for — and a new draw goes at the end of the list,
or every saved recipe redraws differently. So a loop closes (frame `length`
is frame 0), any frame scrubs to, and a still re-prints. An object's size is
its render's; asked for `scale` k, draw k times the pixels again, never
stretched.

## Saving

```js
return Vault.save({                       // null with no server: it downloaded instead — say so
  type: loop ? 'sequence' : 'still',
  title, tags: ['<name>'],
  origin: { app: '<name>', version: '1.0.0' },   // what core/rebuild.js dispatches on
  seed,                                   // null only when nothing in it is random
  recipe: params.values,                  // plus what the panel does not hold: a still's tick
  parents: params.consumedObjectIds(),    // never assembled by hand
  render: { blob, ext: 'png', w, h, ...(loop ? { frames, fps, loop: true } : {}) },
  thumb: await thumbFromBlob(blob),       // core/thumb.js
});
```

The render is drawn by `frames.js` at the format times its `scale`, never
taken off the preview. Every frame leaves as a zip — `runFrames`, `toPng`,
`frameName`, `zipStore` in `core/export.js`; `scripts/frames-to-video.mjs`
makes a video of it — and a loop as a sprite sheet (`buildSheet`,
`core/spritesheet.js`).

## rebuild.js — what core asks

`core/rebuild.js` imports `/apps/<origin.app>/rebuild.js` for the vault's
player, compose's placements and a print export alike.

```js
export const reopens = object => …;   // ?open=<id> brings it back: the vault offers Open in <name> ↗
export const redraws = object => …;   // drawn again at a scale rather than stretched

export async function openObject(object, { scale = 1, draft, url } = {}) {
  // open what the recipe names (loadSprites, core/sprites.js); what will not open goes in `missing`
  // a GPU app where createRunner() is null: return openPicture(object, url)
  const frames = openThing(object.recipe, { sprites, scale });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return { length: frames.length, fps: frames.fps, loop: frames.loop,
           width: frames.width, height: frames.height, bounds: box, missing, scale: frames.scale,
           frame: i => frames.frame(i),
           drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },   // core/rebuild.js
           dispose() {} };
}
```

`draft: true` is a live preview asking: an app may answer faster and
near-exact. An app that produces a field for particles exports `fieldOf(object)`
too — `{ at(x, y) }`, a direction per point — asked by `core/fields.js`, as
fractals' escape time is: a link is declared by the app that produces. At boot `main.js` restores `await requested('<name>')`
(`core/reopen.js`) with `params.restore(object.recipe)`; a listener that
chains one value to another leaves a restore alone (`params.restoring`).

## The page

`main.js` wires core's pieces; the app only draws.

- `new Bar({ app, mount, keys })` — information only: `say()` the state,
  `announce()` a result.
- `new ParamPanel(params, { title, mount, groups })`; `addDrawer({ id,
  title, before })` for the player and the export buttons.
- `params.on(key => { applyFrameEdit(params, key); … })`, that call first:
  picking a format writes width and height (`core/frame.js`).
- A loop: a `Playhead` (`core/playback.js`) as the clock, a `Transport` in
  its drawer; space plays, `,` `.` step, S saves, V opens the `VaultPanel`.
- The preview at `viewFactor()` (`core/view.js`): the size the viewer
  shows, never more than an export makes.
- The GPU: `createRunner()` (`core/gpu/runner.js`) is null where there is
  no WebGPU — say why (`whyNoGpu()`, `core/gpu/device.js`) and keep going.

## Porting a sketch

1. Read the original's own source, never a summary of it — a port of ckt
   was once built on the roadmap's wrong account of v2.
2. Inventory the globals: each is a param, the app's state, or a constant.
3. Leave p5 behind (rule 8): Canvas 2D, or the GPU kit.
4. Seed it: every `random()` becomes the recipe's `rng`.
5. Params to schema, deleting the hand-made panel's HTML and CSS as each
   control moves.
6. `frames.js` out of `draw()`.
7. Vault in and out: asset paths become `type: 'object'` params; files the
   app ships are listed in a generated manifest, never scanned (rule 3).
   Root-absolute paths break under the suite's server — grep for them first.

## Before calling it done

- Served as plain files with no vault, it opens and draws (rule 7).
- No file over 400 lines; no global crosses a file.
- Saved and replayed, the vault's frame is the render, pixel for pixel; at
  scale 2 it is drawn again; `?open=` brings the panels back; compose places
  it (`/apps/compose/?place=<id>`). A loop's frame after the last is its
  first, pixel for pixel.
- The pure parts are held in `tests/<name>.mjs` — no runner, an `ok()`, the
  exit code — added to the loop in `CLAUDE.md`; the page in
  `scripts/check-<name>.mjs` on `scripts/check-kit.mjs`, listed there too.
  On the laptop's Intel a GPU check needs `CHROME_FLAGS` (`CLAUDE.md`).
- `CLAUDE.md`'s map has the app's row; its `STATUS.md` names one next step;
  a new link or use is in `docs/roadmap.md`'s catalogue.
