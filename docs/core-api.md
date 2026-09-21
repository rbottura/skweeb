# core — the shared kit

Extracted from `sketch-2-print/gamepad`, which already had the right shapes.
Most of this is a move plus a rename, not new code. Status per module:

| module | what it does | state |
|---|---|---|
| `vault.js` | save / load / list; the client for `server.js` | **in** |
| `thumb.js` | one thumbnailer per object type | **in** |
| `export.js` | deterministic frame export | **in**, no video yet |
| `rng.js` | seeded random, the only random in the suite | **in**, 32 checks |
| `params.js` | **the param schema** — see below | **in**, 43 checks |
| `registry.js` | manifest-driven asset loading, families of sprites | **in**, was `gamepad/core/brushRegistry.js` |
| `stage/` | `clip` `player` `transport` `recorder` `stage` `bounds` | **in**, was `gamepad/core/sequence*.js` |
| `stamp.js` | where a pattern puts its stamps | **in**, split out of `joyImage.js` |
| `VaultPanel.js` | the window onto the objects on disk | **in** |
| `ParamPanel.js` | a widget per schema type; the `object` row is the picker | **in** |
| `bus.js` | DOM CustomEvents on `document`, namespaced | not yet; apps dispatch directly |
| `panel.js` | base class: show/hide, focus, gamepad + keyboard nav | not yet; two concrete panels exist instead |
| `links.js` | the named one-way links between apps | not yet, see below |
| `input.js` | gamepad + keyboard mapping | not yet; `gamepad/core/inputManager.js` |
| `libs/` | one p5, shared by every app | not yet; 1.5.0 sits in `apps/gamepad/libs/`. Grid uses none. |

The stage moved on 2026-09-21, which is what M1 promised and what lets a
sequence be replayed by something other than the gamepad. Two files came *out*
of that move rather than going in unchanged. `bounds.js`, because measuring a
clip against the registry is a question about a clip and not about the
player's state — and it took `player.js` back under the 400-line cap. And
`stamp.js`, because the live brush and the player must expand the same
patterns from the same code, which `joyImage.js` stated in a comment while
keeping both halves in one file.

`registry.js` now takes a manifest URL. It used to `fetch('brush-manifest.json')`
with no path at all, which resolves against the *page* — invisible while the
only page was the gamepad's, and wrong the moment a second app wants those
sprites. Family paths now resolve against wherever the manifest was found.

## params.js — parameters are data

The single decision that makes this suite cheap to extend. An app declares its
parameters once; the panel UI, the saved recipe, the gallery filters, the
gamepad bindings and the undo stack are all generated from that declaration.

```js
export const params = defineParams("grid", {
  cell:    { type: "range",  min: 4, max: 64, step: 1, default: 12, label: "cell size" },
  mode:    { type: "enum",   options: ["dither", "tile", "threshold"], default: "dither" },
  source:  { type: "object", accepts: ["still", "sequence"], label: "image" },
  palette: { type: "color[]", default: ["#000", "#fff"] },
  invert:  { type: "bool",   default: false, bind: "Y" },
});
```

What those five lines buy:

- a `ParamPanel` that renders itself, with the right widget per type,
- `params.values` becomes `object.recipe`, and `restore()` comes free,
- `type: "object"` renders a vault picker filtered to `accepts`, and records the
  chosen object in `parents` automatically — **this is how cross-app loading
  works**; an app never writes lineage code,
- `bind` wires a gamepad button,
- the gallery can filter on any declared param.

Adding a control is one entry here. Never HTML, never CSS, never a serializer.
If a control cannot be expressed as a schema entry, extend `params.js` with a
new widget type — once, for everyone.

## bus.js — event names

`namespace:verb`, past tense, always on `document`:

```
vault:saved        { id, type }        vault:published  { id }
vault:removed      { id }              params:changed   { app, key, value }
app:ready          { app }             stage:recorded   { clipId }
```

An app listens for what it needs and never reaches into another app. The gallery
listens to `vault:*` and nothing else.

## vault.js — the client

```js
await Vault.save({ type, render, recipe, parents, title, tags });   // returns id
await Vault.load(id);                    // { object, blob, url }
await Vault.list({ type, app, tag });    // index rows, no blobs
await Vault.publish(id);
Vault.available                          // false when served without the write API
```

`list()` reads `index.json` only — it never opens object folders, so the gallery
stays fast with thousands of objects. When `available` is false (a plain static
server, no node), the apps still run and saving falls back to a download. That
fallback is required, not optional: rule 7 in `CLAUDE.md`.

## rng.js — seeded random

```js
const rng = makeRng(seed);   // rng() in [0,1), rng.int(n), rng.pick(arr)
```

p5's `random()` and `Math.random()` are banned in app code. A render that cannot
be reproduced cannot be re-printed, and `object.seed` is the promise that it can.
Lint for it before it spreads.

## stage/ — sequences

Moved from the gamepad unchanged: recorder to clip to player to stage to
transport, with one clock deriving every layer's position rather than each
accumulating its own. The reasoning is written up in the `sequence-stage` skill
— **read that skill rather than re-deriving it**, and in particular before
touching `createGraphics`, `tint`, canvas filters, or anything exporting frames.

## export.js — two exporters, different jobs

**p5.capture stays.** It is already in grid and ckt, it costs nothing, and it is
the right tool for the draft button: hit record, do the thing, get a file. Its
limit is structural, not a bug — it captures the *live* canvas at its *display*
size, driven by the live `draw()` loop. Its zip formats are frame-locked; its
webm goes through MediaRecorder and is realtime, so it drops and duplicates
frames under load. It cannot give you frame 437 at 7000 px without first running
frames 0 to 436 on screen at that size.

**`core/export.js` is the other one.** Given `render()`, it is a bare loop with
no clock in it:

```js
for (let frame = 0; frame < frames; frame++) {
  App.render(recipe, { width, height, frame, rng: makeRng(seed), load });
  await encoder.add(canvas);
}
```

Same recipe and seed, same bytes, every time, at any size. Most of the hard part
already exists: the gamepad's transport derives every position from one master
tick rather than accumulating, and `SequencePlayer.step()` already refuses to
read a clock. That discipline is exactly what this needs — see the
`sequence-stage` skill.

| | p5.capture | `core/export.js` |
|---|---|---|
| captures | the live canvas | `render()` in a loop |
| size | whatever is on screen | anything, 7000 px included |
| determinism | none in webm, partial in zip | exact |
| cost | zero, already there | about 60 lines |
| for | drafts, screen recordings | anything entering the vault or going to print |

**What exists.** `captureFrames({count, draw, onProgress})` runs the loop and
collects PNG blobs; `zipStore(entries)` packs them into a store-only zip —
PNGs are already deflated, so compressing again costs time and saves nothing,
and store-only is forty lines rather than a dependency; `frameName(i, total)`
pads so an alphabetical sort is a numeric one; `download(blob, name)` hands it
to the browser. `tests/export.mjs` covers the loop indexing and the zip.

**What does not exist: video.** A sequence object's render is currently a
single PNG, and the frames come out as a zip on request. Which frame is a
decision, not a detail: `representativeTick()` in `sequenceClip.js` asks the
window rule which tick shows the most marks. It is never the last one — `sweep`
and `build` end on a blank tick by design and `bounce` ends on its first two
marks, so keeping frame N-1 kept a transparent PNG for half the rules. Writing a
webm needs a muxer — WebCodecs encodes frames but does not container them —
which means either vendoring one or writing one, and that is a decision rather
than an afternoon. MediaRecorder is not the answer: it is realtime and drops
frames, which is the whole thing this file exists to avoid.

**Resolution.** Export is the only place print scale appears. The live loop
stays at screen size with `density` as a parameter; `export.js` re-runs
`render()` once at the scale asked for, for the frames asked for. A print
export is one pass, not a loop to sit through.

**The rule.** p5.capture for drafts, `export.js` for anything that becomes an
object. The vault's promise is that an object can be rebuilt; a screen recording
cannot keep that promise.

## links.js — apps that know about each other, one way at a time

A shared vault makes every object reachable from every app. That is necessary
and it is not sufficient: **reachable is not useful.** Dropping 58 letterforms
into the vault still leaves you to work out by hand that the gamepad wants them
at a consistent size, on transparent ground, in order, registered as a family.

A **link** is that knowledge, named and pointed one way.

```js
registerLink({
  from: "ckt",
  to:   "gamepad",
  label: "produce a brush family",
  produces: { type: "set", role: "brush-family" },
  async run(state, { emit }) { }
});
```

Declared by the app that produces, never by the one that consumes. Links are not
inferred and never symmetric: `ckt → gamepad: brush family` says nothing about
whether `gamepad → ckt` exists, and if it does it is a different link, with a
different name, a different shape and different work behind it. Two apps may be
joined by one link, by five, or by none.

What a link buys over a generic save:

- in ckt, a **Send to** menu listing exactly what ckt can make for other apps —
  the app states its capabilities instead of the user guessing them,
- one action in place of an export, a rename, a folder and a manifest regen,
- the output keeps `refs` back to its source, so it re-runs when the source
  moves rather than quietly going stale.

**The catalogue of links is the map of the suite.** A vault is a drawer; the
list of links is what makes this a cluster rather than three apps sharing
storage. It is also the honest measure of progress, because each one is a
sentence you can say out loud: *ckt produces a gamepad brush family.* At M1
there are none.

The frozen case is already on disk: `gamepad_sprites/GaramondI/Garam_blue` is
this exact link's output, produced by hand years before the link existed. See
*Sets* in `docs/object-model.md`.

## Writing an app against core

```
apps/<name>/
  index.html      loads core, then main.js. Opens and works on its own.
  main.js         defineParams, registerApp, the sketch
  params.js       the schema, if it earns its own file
  manifest.json   generated: assets, never a runtime directory scan
  STATUS.md
```

Then the three functions from `docs/object-model.md`: `serialize`, `restore`,
`render`. That is the whole integration. Everything else — panels, vault,
gallery, lineage, thumbnails, publishing — is inherited.
