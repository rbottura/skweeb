# core — the shared kit

Extracted from `sketch-2-print/gamepad`, which already had the right shapes.
Most of this is a move plus a rename, not new code. Status per module:

| module | what it does | state |
|---|---|---|
| `vault.js` | save / load / list; the client for `server.js` | **in** |
| `thumb.js` | one thumbnailer per object type | **in** |
| `export.js` | deterministic frame export, and a store-only zip whose entries may be Blobs, by reference | **in**; video is the zip plus `scripts/frames-to-video.mjs` |
| `rng.js` | seeded random, the only random in the suite | **in**, 32 checks |
| `params.js` | **the param schema** — see below | **in**, 43 checks |
| `registry.js` | manifest-driven asset loading, families of sprites | **in**, was `gamepad/core/brushRegistry.js` |
| `stage/` | `clip` `player` `transport` `recorder` `stage` `bounds` | **in**, was `gamepad/core/sequence*.js` |
| `stamp.js` | where a pattern puts its stamps | **in**, split out of `joyImage.js` |
| `VaultPanel.js` | the window onto the objects on disk; `folder:` tags group; ctrl-click selects, for the trash | **in**, detail view in `vault-detail.js`, a card in `vault-card.js`, a folder's card and strip in `vault-folder.js`, the selection bar and the delete question in `vault-trash.js` |
| `gpu/` | filters on the GPU, WebGPU: one device for the page (`device.js`), a chain run in one call (`runner.js`), the catalogue as data (`filters/`) — see *gpu/* below | **in**, 2026-09-26, M5's first brick: four filters |
| `reopen.js` | an object back in its app: `/apps/<app>/?open=<id>` | **in**, 2026-09-23 |
| `rebuild.js` | frame N of any object: `openFrames()` — anything with a recipe and more than one frame replayed by its app (a sequence, a composition that moves), a picture as itself — and the dispatch to an app's own `rebuild.js`. `draft: true` asks for a live preview's frames, which an app may make faster and near-exact; nothing saved asks for them. `scale` asks for frames at more pixels: an app draws a still again when its rebuild.js `redraws()` it, and a handle's `scale` says what it really drew — its size is always its render's | **in**; `openFrames`, `draft` and `scale` 2026-09-24, for compose |
| `ParamPanel.js` | lays out a widget per param, docked or floating, in drawers | **in** |
| `widgets.js` | one widget per param type, split out of ParamPanel | **in** |
| `Drawer.js` | a collapsible section — what every panel is made of | **in**, 2026-09-23 |
| `Bar.js` | the strip under every app: information only | **in**, 2026-09-23 |
| `Transport.js` | the sequence player: play, scrub, frame count | **in**, 2026-09-23 |
| `theme.css` | the suite's look: tokens, the page shell, controls | **in**, 2026-09-23 |
| `bus.js` | DOM CustomEvents on `document`, namespaced | not yet; apps dispatch directly |
| `panel.js` | base class: show/hide, focus, gamepad + keyboard nav | not yet; two concrete panels exist instead |
| `links.js` | the named one-way links between apps | not yet, see below |
| `uses.js` | what a set can be used as, and where each set is offered | **in**, 2026-09-23 |
| `easing.js` | the suite's easing curves, and the param that offers one | **in**, 2026-09-24 |
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
  works**; an app never writes lineage code. `use: "material"` narrows the
  sets it offers to those switched on for that use (`uses.js`); the picker
  says how many never-switched sets it left out, shows them on request, and
  switches one on when it is picked (`vault-offer.js`),
- `bind` wires a gamepad button,
- the gallery can filter on any declared param.

Adding a control is one entry here. Never HTML, never CSS, never a serializer.
If a control cannot be expressed as a schema entry, extend `params.js` with a
new widget type — once, for everyone. That is how `text` got `multiline: true`
(a box rather than a line) when ckt needed v2's text area.

A recipe may carry more than the schema when the render needs it: a ckt still
records the `tick` it shows, because it is one frame of a loop and the loop's
params alone would replay frame 0. `restore()` drops such keys — they are the
object's, not the panel's.

`restore()` announces every key it changes, the ones going back to a default
included, with `params.restoring` true while it does. A listener that chains
one value to another — the frame's link — leaves a restore alone: a recipe
arriving is not an edit. (Until 2026-09-23 it went back silently, and Reset
moved no widget.)

## The UI kit — decided 2026-09-23

One look and one set of pieces for every app. `theme.css` is neo-brutalist
and light: cream ground, black ink, thick borders, hard shadows, one yellow
accent — and yellow is a fill, never text. The page is a grid (`.app`): the
work above, `Bar.js` below as a row of its own, so the bar never covers a
canvas or a panel. The page itself never scrolls: `.app` holds and clips
whatever is positioned inside it, because `overflow: hidden` on the body does
not stop focus from scrolling the page — so a popover that must spill past
the shell is `position: fixed`. The bar says what an app will make — output
size, density, a paper format's dpi, the paint rate while a loop plays — and a
few keys. It holds no buttons. A result (`announce`) holds the status line for
three seconds; what was said meanwhile shows when they are up.

A panel docks into a layout column (`new ParamPanel(params, { mount })`) and
is made of drawers. A small panel can also be a card inside another's drawer
— one per filter in filter's chain — with `panel.head` for an app's buttons
beside Reset and `panel.remove()` to take it off the page. A param's `group` names its drawer; `format` is core's
own group, so the frame section is the same in every app. Things that are not
parameters get drawers too: `panel.addDrawer({ id, title })` for the sequence
player (`Transport.js`) or an app's export actions, `panel.drawer(id).body`
to put a button into a param drawer.

Three more schema keys, all data:

- `when` — the row shows only when it applies: `{ path: 'point' }`,
  `{ input: ['text', 'glyphs'] }`, `{ mark: { not: 'dot' } }`. Its value stays
  in the recipe while hidden (params.js `applies`).
- `type: 'sprite'` — an index into the family named by `family: '<param>'`,
  picked from a grid of that family's own images.
- `type: 'ground'` — a colour or `none`; one value, so a recipe cannot say
  "white, but transparent".

Every slider has a typed number beside it. And the frame group changed
meaning: `zoom` scales the object inside a canvas the format fixes, never the
canvas; `scale` (0.25–4) multiplies the canvas's width and height, applied by
the renderer last — resolution, not composition. Width and height run 1 to
4000 (`MAX_SIDE`), since resolution past that is `scale`'s. `link w/h` holds
the box's shape while either side is typed or dragged; a ratio or a paper
format stays picked, being still that shape at any size, so a sheet's dpi can
be read while its pixels are set.

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
await Vault.retag(id, { add, remove });  // tags are the one thing that changes
await Vault.trash(ids);                  // the `trash` tag: hidden from list(), nothing breaks
await Vault.restore(ids);
await Vault.remove(ids, { dependents, dry });  // for good, from the trash only — see below
await Vault.publish(id);
Vault.available                          // false when served without the write API
```

`remove()` asks the server first when other objects name what is going: it
returns `{ status: 'dependents', dependents, chain }`, and is called again with
`dependents: 'delete'` (the chain goes too) or `'detach'` (they are cut loose).
`dry: true` returns that plan without doing anything. `isTrashed(row)` is
exported for code that offers objects straight from `Vault.index`, which keeps
the trash so a set can still find its members. Rules in
`docs/object-model.md`, *Trash, and deleting*.

`list()` reads `index.json` only — it never opens object folders, so the gallery
stays fast with thousands of objects. When `available` is false (a plain static
server, no node), the apps still run and saving falls back to a download. That
fallback is required, not optional: rule 7 in `CLAUDE.md`.

## gpu/ — filters on the GPU

WebGPU, decided 2026-09-26: one device for the page, however many canvases
draw through it (`device.js`).

```js
const runner = await createRunner();       // null where there is no WebGPU — whyNoGpu() says why
await runner.prepare(chain);               // compiles; rejects naming the pass and its line
const picture = runner.run(source, chain, { scale, time, seed });   // same call: an ImageBitmap
runner.dispose();
```

A chain is data, the part of a recipe that says what was done:
`[{ id, params, on? }]`, its params coerced as an app's are (`valuesFor` in
`params.js`). `run()` is synchronous because a handle's `frame(i)` is; the
picture is the runner's until its next run. Sizes are in the source's pixels
and multiplied by `scale`, so a picture drawn again at print scale keeps its
look. Textures hold premultiplied alpha, as a canvas does, and rgba16float
between passes.

A filter is data too (`gpu/filters/`, listed in its `index.js`): an id, a
label, its `source` and `licence` (rule 5), a param schema, and passes — each
a WGSL `fx(uv)` with, if it takes params, a `Params` of f32 fields, the
numbers its `uniforms(values, info)` returns. `wgsl.js` is what a pass is
written against. `node tests/gpu-filters.mjs` holds the catalogue to all of
this without a GPU; `node scripts/check-gpu.mjs` runs it on one.

**Where there is no WebGPU** — a machine whose GPU the browser has not listed,
a browser without it — `createRunner()` is null and nothing throws: every app
still opens (rule 7). An app that makes GPU objects says why it cannot there;
a GPU object shows as its saved render, as any picture does.

## uses.js — where a set is offered

```js
USES                  // [{ id: 'brushes', app: 'gamepad', label, role }, …]
offers(rowOrObject, 'brushes')   // is this set offered to that use?
retagFor(object, new Set(['material']))  // the Vault.retag() edit for exactly those
```

The consuming side's half of what a link is on the producing side: *the gamepad
can eat a set as brushes*. A set with no `use:` tag follows its role; once it
has one, the tags decide. The vault detail draws a switch per row of `USES`.
Rules in `docs/object-model.md`, *Uses*.

## easing.js — how a change runs from start to end

```js
growEase: easeParam({ group: 'motion' })   // in a schema: the six BASIC curves, in words
easeParam({}, { all: true })               // …or all thirty-one
const ease = easing(recipe.growEase);      // (t in [0,1]) → progress, clamped
ease(0) === 0; ease(1) === 1               // every curve lands where it was going
```

The classic set — linear, and sine, quad, cubic, quart, quint, expo, circ,
back, elastic and bounce, each `in`, `out` and `inOut` — thirty-one curves. A
recipe stores the name; an unknown name is linear. A picker offers six by
default — linear, ease in, ease out, ease in-out, overshoot, bounce — and the
rest stay here for whoever needs them. `back` and `elastic` leave
[0, 1] on the way, which a scale may want. First used by grid's grow-in; any
animation in the suite takes its curves from here.

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
  rebuild.js      what core asks about your objects: openObject() replays
                  one, reopens(object) says which ?open=<id> can bring back
  STATUS.md
```

Then the three functions from `docs/object-model.md`: `serialize`, `restore`,
`render`. That is the whole integration. Everything else — panels, vault,
gallery, lineage, thumbnails, publishing — is inherited.

An app that can take its objects back reads `requested('<app>')` from
`core/reopen.js` at boot and restores what it gets; the vault's detail then
offers *Open in <app> ↗* for every object its `reopens()` accepts. The link,
`/apps/<app>/?open=<id>`, is the thing to send — to another tab, or to another
machine serving the same vault.
