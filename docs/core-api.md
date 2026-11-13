# core — the shared kit

Extracted from `sketch-2-print/gamepad`, which already had the right shapes.
Most of this is a move plus a rename, not new code. Status per module:

| module | what it does | state |
|---|---|---|
| `vault.js` | save / load / list; the client for `server.js` | **in** |
| `thumb.js` | one thumbnailer per object type | **in** |
| `export.js` | deterministic frame export, and a store-only zip whose entries may be Blobs, by reference; `png.js` beside it writes a PNG band by band, its dpi in a pHYs, for a picture no canvas holds — a 120×176 poster at 300 dpi | **in**; video is the zip plus `scripts/frames-to-video.mjs`; `png.js` 2026-10-06, for the 3D app's print — `docs/core-export.md` |
| `live.js` | the windows of the suite open in this browser, over one BroadcastChannel: each says who it is and its layer — what is on screen, as the envelope a save would write — and hears the others come, change and go (`joinLive`); `stack.js` is the stack they share — one live composition, `{ page, place }`, each block a window or a vault object with its transform, opacity and blend (`blend.js`: CSS's names, canvas's spellings), kept in every window, the newest change winning (`joinStack`); `StackPanel.js` shows it in a drawer, one line an app adds (`stackDrawer`) — since L13 (2026-11-12) after the object's own layers: `layers.js`, one param of the app's schema, `LAYERS`, its rows `layers-row.js` with "+ overlay…", drawn round the canvas by `layers-view.js` and by `layers-draw.js` in all that leaves — a save's picture (`Vault.finishWith`), every replay (`rebuild.js`), the print; an app that draws its own says `layered`; a window asks another for what it answers to (`ask`, `answer`) — to save itself, the vault's id the answer (`savedBy`), or to take it as a source: `send.js`, *Send to ▸* — filter and grid, followed by `following.js` (L5) | **in**, 2026-10-06, M11's bricks 1 and 2; asking, and `send.js`, 2026-10-07, brick 4 — `docs/smart-objects.md`, *The live stack* |
| `stackView.js` | the stack drawn round a window's own canvas: the layers under it on one canvas, each over it on its own, its own canvas given its opacity and blend by CSS, all in its own frame; a loop at the wall clock's frame; `place.js` is where a placement sits — compose's page math, moved | **in**, 2026-10-06, M11's brick 3 |
| `smart.js` | a smart object as the object it binds: `unwrap`, `innerOf` at a version, `openSmart` — `openFrames` and `?open=` go through it; `vault.js` binds a page into one (`Vault.bind`), an app's S — `Vault.save({ state: true })`, S6b — the next state (`PUT`, server/versions.js) — its parent the state the page holds, so a page opened `@vN` saves a branch; `Vault.states(id)` the tree — and says `vault:updated` — a state that would hold itself refused (`cycles.js`, L3); `stackSave.js` saves the live stack as a page of them, every window asked to save itself | **in**, 2026-10-07, M11's bricks 5 and 6 — `docs/smart-objects.md` |
| `print.js` | any object at a sheet's size and dpi, in tiles, each a `window` of its frame asked of its handle; `windowed.js` lets an app's drawing code draw one window unchanged; `PrintPanel.js` is the print in an Export drawer | **in**, 2026-10-06, every app — `docs/core-export.md` |
| `rng.js` | seeded random, the only random in the suite | **in**, 32 checks |
| `params.js` | **the param schema** — see below | **in**, 43 checks |
| `registry.js` | manifest-driven asset loading, families of sprites | **in**, was `gamepad/core/brushRegistry.js` |
| `stage/` | `clip` `player` `transport` `recorder` `stage` `bounds`; `still`, a gamepad still drawn again from its marks at any scale, and the stamps the rig rigs | **in**, was `gamepad/core/sequence*.js`; `still` 2026-10-06, for the print |
| `stamp.js` | where a pattern puts its stamps | **in**, split out of `joyImage.js` |
| `VaultPanel.js` | the window onto the objects on disk — over the page, or docked in a host (`mount`, the vault app's, S9b) with `onDetail` told the object opened, its detail the facts only with `detailPicture: false` — a setter too; its detail in another place with `detailMount`, `onClose` told it closed (cluster's properties, S9c); its grid's density three tokens a host sets, `--vp-card` `--vp-gap` `--vp-pad` (`densityOf` in `vault-kin.js`; cluster's four columns, S9d); `first`, an app: its own objects first, then the rest, a line naming each part (`ownFirst`; cluster's, S9g); `folder:` tags group, and a set goes in the folder holding exactly its members (`filedWith`); kin — objects made from one another — sit together, the most original first; laid again, its cards slide to their places (`flip.js`); a card dragged onto a field that takes it (`vault-drag.js`: `dragOut`, `dropOn`, `takes`); *+ palette* in its head and *Edit its colours* in a palette's detail, its editor in the detail (`vault-palette.js`, V1; `onEditor` told, a scene's tab); ctrl-click selects, for the trash and into a group or out of one, a group renamed from its strip (`vault-groups.js`, `vault-name.js`, V3); the pictures selected, a set (`vault-set.js`, V2) | **in**, detail view in `vault-detail.js`, a card in `vault-card.js`, a folder's card and strip in `vault-folder.js`, kin in `vault-kin.js`, the selection bar and the delete question in `vault-trash.js`; S9g 2026-11-05 |
| `gpu/` | filters on the GPU, WebGPU: one device for the page (`device.js`), a chain run in one call (`runner.js`), the catalogue as data (`filters/`), a look over any object's frames (`look.js`), a window of a chain's picture (`window.js`) — see *gpu/* below | **in**, 2026-09-27, M5: twenty-nine filters, eighteen from p5.FIP, one from glfx.js; looks |
| `param-history.js` | Alt click on a row's mark: its value in every state of the object the page holds, picked back as a step | **in**, 2026-11-03, S6d |
| `steps.js` | the session's steps: every change of a watched params a step, a drag one, a Reset one (`around`); Ctrl Z, Ctrl Y — ParamPanel watches every panel's; listed for a page that shows them (`list`, `go`, `onSteps` — cluster's History) | **in**, 2026-11-03, S6c; listed 2026-11-05, S9f |
| `reopen.js` | an object back in its app: `/apps/<app>/?open=<id>`, a smart object's state `?open=<id>@v3`; an app asked nothing, mounted again, gets what it left (`requested` → `kept`), `openedLine` says which; a link to an app followed — `follow(url)`, a tab, or the app mounted in place by a scene that took the links (`takeLinks`) | **in**, 2026-09-23; `@vN` 2026-11-03; what was left, the links 2026-11-05 |
| `rebuild.js` | frame N of any object: `openFrames()` — anything with a recipe and more than one frame replayed by its app (a sequence, a composition that moves), a picture as itself — and the dispatch to an app's own `rebuild.js`. `draft: true` asks for a live preview's frames, which an app may make faster and near-exact; nothing saved asks for them. `scale` asks for frames at more pixels: an app draws a still again when its rebuild.js `redraws()` it, core a gamepad still (`stage/still.js`), and a handle's `scale` says what it really drew — its size is always its render's; `window(i, win)`, a part of a frame, for a print `inkSize(handle)`, the size an object shows at — its ink, a recording's canvas cropped as its frames are | **in**; `openFrames`, `draft` and `scale` 2026-09-24, for compose |
| `ParamPanel.js` | lays out a widget per param, docked or floating, in drawers — the Format group in the viewer's head where there is one (`viewformat.js`: the format's list, the size a chip opening the rest) | **in**; the format in the viewer 2026-11-12, S14b |
| `widgets.js` | one widget per param type, split out of ParamPanel; a number's box is `numbox.js`'s — typed, dragged, filled, its unit inside; an object's field takes one dropped from the vault, as its picker would | **in**; `numbox.js` 2026-11-03; the drop 2026-11-05 |
| `param-rows.js` | a param's row as ParamPanel lays it out: its mark, label and widget; two numbers on one line; the fold of rows seldom touched (`param-rows.css`) | **in**, 2026-11-03, S2b |
| `Drawer.js` | a collapsible section — what every panel is made of | **in**, 2026-09-23 |
| `Cards.js` | a list of small param panels, each from its own catalogue entry's schema — filter's chain, a model's shapes; `recipe()` is `[{ id, params, on }]`; `choose()` marks one card, and with `fold` it is the only one open, the others a line each; `duplicate()` puts an entry again after itself; `inner` is a list inside each card, kept in its entry under a key | **in**, 2026-10-06, moved from filter when the 3D app needed it; `fold` and `inner` the same day, for a model's shapes and their modifiers |
| `Bar.js` | the strip under every app: information only; it puts the shell in the page and tells the rulers the picture's size | **in**, 2026-09-23; the shell 2026-11-03 |
| `shell/` | the shell the bench found, Lit components in the page's DOM (`libs/lit/`): the title bar (`titlebar.js`); the viewer's rulers and guides (`rulers.js`) over `guides.js` — a size's guides, the magnet, what F places — and its tools, the zoom, the states, the rulers, the magnet, the app's guides, the ground (`viewtools.js`, S14a); the pies (`pie.js`) and what each key does (`bindings.js`); the states as a graph over the page, H (`graph.js`, placed by `layout.js`), two compared and merged (`merge.js`); `shell.css` | **in**, 2026-11-03: S12, S8, S5b, S7 |
| `Guide.js` | a page of `docs/guides/` read inside an app: its markdown — headings, paragraphs, lists, code, links — on a sheet over the page, fetched when opened (`guide.css`) | **in**, 2026-10-21, the author's ask: what needs another program is written down and read where it is needed — the puppet's guide to OBS first |
| `mount.js` | an app as a module: `appModule(app, { markup, style, start })` gives its `mount(host)` and `unmount()` — one at a time, its `.app` built in the host, its stylesheet linked where the page has not — cluster — and loaded before the `.app` is built, its smart object let go of when it goes; `mount(host, given)` hands `start` what its host gives — a scene's `vault`, and `built(root)` told before it starts; taken out once booted, what its `keep` says it is doing and the smart object it is bound to left for its next mount (`leftBehind`) | **in**, 2026-11-04, S9: particles first; `keep` 2026-11-05 |
| `scope.js` | what a mounted app holds outside its nodes — a listener on the document, a channel, a pie, a key kept from core: core's parts say how each is let go of (`held`, `listen`), the app's unmount closes the scope; what ends first takes itself out by the release `held` gives back, and a clock is its app's to hold; with none open, nothing is kept, so a page alone is as before | **in**, 2026-11-04, S9 |
| `Transport.js` | the sequence player: play, scrub, frame count | **in**, 2026-09-23 |
| `stamps.js` | a sprite drawn once at the size and angle it shows, blitted to many (`stampFor`, `blit`); the halving of a picture nearest above a size (`mipFor`) | **in**, 2026-09-27, moved from ckt when particles needed `mipFor` |
| `surface.js` | an off-screen canvas: OffscreenCanvas where there is one | **in**, 2026-09-27, with `stamps.js`; grid keeps its own copy |
| `spritesheet.js` | a loop as a sprite sheet: every frame on one PNG, cropped to the box the loop reaches, and Aseprite's array JSON — rects, whole-ms durations that sum exactly, one tag (`buildSheet`; the pure parts in `tests/spritesheet.mjs`) | **in**, 2026-09-27, for particles first |
| `noise.js` | seeded noise in JS on the GPU kit's hash — `pcg` and `randAt` bit for bit WGSL's — gradient noise with its exact slope, and its curl; `noise3` in 3D, JS only, and its slope and curl, `noiseGrad3`, `curl3` (`tests/noise.mjs`) | **in**, 2026-09-27, for particles' fields; `noise3` 2026-10-06, for a displaced shape; `curl3` 2026-11-11, for a cloud's dots in time |
| `vault-import.js` | pictures from outside into the vault: *+ pictures* in the panel's head, or a drop on it — each a `shape` (see-through) or a `still`, several a `set` too | **in**, 2026-09-27, the author's ask |
| `sprites.js` | a vault set, shape or still as images to draw with (`loadSprites`) | **in**, 2026-09-28, moved from particles when fractals needed it |
| `palettes.js` | a vault palette as colours to draw with (`loadPalette`, `coloursIn`); `vault-palette.js` makes them | **in**, 2026-11-09, moved from the 3D app when particles needed it |
| `points.js` | an object as points to leave from: a dot-set's glyph, a picture's ink, centred, its longer side 1 (`loadPoints`) | **in**, 2026-09-30, for particles' object emitter |
| `fields.js` | an object as a field, asked of the app that made it — its rebuild.js's `fieldOf` (`loadField`) | **in**, 2026-09-30, M7's link |
| `view.js` | how large a preview draws: `viewFactor()`, the size the viewer shows, never more than an export makes; `zoom.js`, a picture seen closer — the wheel about the pointer, a drag, a double click to fit (`closer`, the vault app's, S9h); `viewzoom.js`, every other viewer's zoom — Fit, 25 % to 200 %, Ctrl and the wheel, Space or the middle button and a drag — read by `viewFactor`, so an app sizing its preview by it gives its Bar a `redraw` and nothing more; one drawn in its own pixels calls `viewAsIs` as it paints | **in**, 2026-09-27, moved from compose when particles needed it; the zoom 2026-11-12, S14a |
| `theme.css` | the suite's look: tokens, the page shell, controls | **in**, 2026-09-23 |
| `bus.js`, `panel.js`, `input.js` | namespaced DOM events on `document`; a base panel — show/hide, focus, gamepad and keyboard nav; gamepad and keyboard mapping | not yet: apps dispatch directly; panels are concrete; `gamepad/core/inputManager.js` |
| `links.js` | the named one-way links between apps | not yet, see below |
| `uses.js`, `character.js` | what a set can be used as, and where each set is offered; a character's loops by direction (P3) | **in**, 2026-09-23; 2026-11-06 |
| `easing.js` | the suite's easing curves, and the param that offers one | **in**, 2026-09-24 |
| `libs/` | p5 1.5.0, for the gamepad and core's replay of its recordings; three.js r186, for the 3D app — `libs/three/README.md`, copied by `scripts/vendor-three.mjs`; MediaPipe's face landmarker, tasks-vision 1.0.1, for the rig's puppet — fetched on each machine by `scripts/vendor-mediapipe.mjs`, 15 MB of WASM and model git never holds, its README kept | **in**; three since 2026-10-06, MediaPipe since 2026-10-21 |

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
moved no widget.) An object field holding a smart object is said again at its new version, `params.following` true (L11).

## The UI kit — decided 2026-09-23

Reopened 2026-10-22: the layout and the theme are to be redesigned from the
author's notes, and the boxes every app shares become components first —
`docs/plan.md`, *U*, and `docs/boxes.md`.

One look and one set of pieces for every app. `theme.css` is dark since
2026-11-03, the bench's (its head; `docs/scene.md`). The page is a grid (`.app`): the
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
— a list of them is `Cards.js`: filter's chain, a model's shapes, folded to the chosen one — with `panel.head` for an app's buttons
beside Reset and `panel.remove()` to take it off the page. A param's `group` names its drawer; `format` is core's
own group, so the frame section is the same in every app. Things that are not
parameters get drawers too: `panel.addDrawer({ id, title })` for the sequence
player (`Transport.js`) or an app's export actions, `panel.drawer(id).body`
to put a button into a param drawer.

Three more schema keys, all data:

- `when` — the row shows only when it applies: `{ path: 'point' }`,
  `{ input: ['text', 'glyphs'] }`, `{ mark: { not: 'dot' } }`, or a list of
  those, any one of which is enough — fractals' Motion rows serve two families
  so. Its value stays in the recipe while hidden (params.js `applies`). An
  id of a kind is `{ ref: { prefix: 'skw_' } }` — a smart object placed.
- `type: 'sprite'` — an index into the family named by `family: '<param>'`,
  picked from a grid of that family's own images.
- `type: 'ground'` — a colour or `none`; one value, so a recipe cannot say
  "white, but transparent".

And the bench's, since S2 and S2b (2026-11-03), how a row looks — never what
is saved: `slider: true`, the number's slider shown under it; `unit: 'px'`,
inside its box, not in its label; `more: true`, folded under its drawer's
"n more", a changed value staying out; `pair: '<key>'`, this number and that
one on one line — `pairLabel` the line's name, `axis` each box's letter,
`link: '<bool key>'` a switch between them, `swap: true` a button that swaps
them. A pair's halves are rows still, each with its whole label.

Every slider has a typed number beside it. And the frame group changed
meaning: `zoom` scales the object inside a canvas the format fixes, never the
canvas; `scale` (0.25–4) multiplies the canvas's width and height, applied by
the renderer last — resolution, not composition. Width and height run 1 to
4000 (`MAX_SIDE`), since resolution past that is `scale`'s. `link w/h` holds
the box's shape while either side is typed or dragged; a ratio or a paper
format stays picked, being still that shape at any size, so a sheet's dpi can
be read while its pixels are set.

The viewer and the left hand are core's (S8, S5b): Bar puts `<skw-rulers>`
in `.viewer-stage`, `<skw-viewtools>` in `.viewer-head` (made if missing),
tells them the picture's size, zooms the stage (S14a), installs `keys.js` — a
key by its place, `event.code`, tapped or held for its pie (`shell/pie.js`),
each key's act in every app `shell/bindings.js`'s. An app adds what is its
own: `placeable([{ id, label, put(x, y) }])` from `shell/guides.js`, then
`select(id)` when one is pressed and `snapPoint(x, y, ctrlKey)` through a
drag, `endSnap()` after; its pie on A, `setAppPie({ title, items, tap })`
or `enumPie(params, key, title)`; Z's first, `setOverlay({ label, on,
toggle })`; and `own('KeyR')` for a key it means otherwise.

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
look. An entry may carry its own filter, `{ filter, params }`, the same
shape as the catalogue's: an app's pass through the kit that is no filter
of filter's — the fractals app draws escape time so, over a blank picture.
Such an entry is the app's to keep; a recipe names a catalogue filter by id. Textures hold premultiplied alpha, as a canvas does, and rgba16float
between passes.

A filter is data too (`gpu/filters/`, listed in its `index.js`): an id, a
label, its `source` and `licence` (rule 5), a param schema, and passes — each
a WGSL `fx(uv)` with, if it takes params, a `Params` of f32 fields and, last,
at most one `array<vec4f, N>` (a palette): the numbers its
`uniforms(values, info)` returns. A pass reads the pass before it as `src`
and its filter's own input as `orig` — what an outline lays the sprite back
over. A filter that draws at random says so (`random: true`) and draws from
`frame.seed` and `frame.tick` — the recipe's seed and the loop's frame, which
`run()` is handed — so the same seed gives the same noise and a loop's
noise comes round with it. `wgsl.js` is what a pass is written against. `node tests/gpu-filters.mjs` holds the catalogue to all of
this without a GPU; `node scripts/check-gpu.mjs` runs it on one. A **generator** (`generates: true`) makes its picture — `noise`, `gradient`, `shape` — and meets what is under it by its `blend` (`filters/meet.js`); what scrolls in one comes round in a loop whose length a run is told, `run(…, { tick, frames })` — `docs/vfx.md`, *The generators*. Told `life: true`, those frames are played once: `ageOf(info)` is 0 at the first and 1 at the last, what `dissolve` runs its threshold over (M15d).

**Past the edge.** A filter may say how far it reaches past its picture —
`reach(values)`, in the source's pixels: a blur its three deviations. A run
asked to `grow` gives the chain that room on every side and hands back the
bigger picture (`marginOf(chain, scale)` more each side; `reachOf(chain)` at
scale 1); not growing, the edge is held. A sprite on nothing wants to grow, a
photograph filling its frame to keep — filter's `edges` param says which. A
filter that reads further than it spreads says so too — `reads(values)`, a
pixelation's block, an erosion's radius, Infinity for a zoom blur — and
`readsOf(chain)` is what a window of a chain's picture takes round it
(`window.js`, `docs/core-export.md`).

**A look** is a chain saved alone, a `params` object (`{ chain, edges }`,
made by filter). `lookOver(handle, lookId)` (`look.js`) wraps any
`openFrames()` handle so its frames run through the look, its bounds grown by
the look's reach where it grows; a look that cannot run leaves the frames as
they are and says so in `missing`. Compose puts one over a placement.

```js
const looked = await lookOver(await openFrames(object, { url }), block.look);
```

**Where there is no WebGPU** — a machine whose GPU the browser has not listed,
a browser without it — `createRunner()` is null and nothing throws: every app
still opens (rule 7). An app that makes GPU objects says why it cannot there;
a GPU object shows as its saved render, as any picture does — an app's
rebuild.js hands back core's `openPicture(object)` when `createRunner()` is
null, as filter's does.

## uses.js — where a set is offered

```js
USES                  // [{ id: 'brushes', app: 'gamepad', label, role }, …]
offers(rowOrObject, 'brushes')   // is this set offered to that use?
retagFor(object, new Set(['material']))  // the Vault.retag() edit for exactly those
```

The consuming side's half of what a link is on the producing side: *the gamepad
can eat a set as brushes*. A set with no `use:` tag follows its role; once it
has one, the tags decide. The vault detail draws a switch per row of `USES`.
Rules in `docs/object-model.md`, *Uses*; a character's, `character.js`.

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
accumulating its own. The reasoning is in the headers of `player.js` (`step()`
never reads a clock), `transport.js` (one clock) and `stage.js` (placement is
the layer's, not the clip's) — **read those rather than re-deriving it**, and
the files themselves before touching `createGraphics`, `tint`, canvas
filters, or anything exporting frames.

## export.js and print.js — out of the suite

Frames out exactly, and a print past any canvas — a window of a frame asked
of every handle — are in `docs/core-export.md`.

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

The working procedure is the `skweeb-app` skill; the shape, in short:

```
apps/<name>/
  index.html      the page: mounts main.js on itself. Opens and works on its own.
  main.js         mount(host), unmount() (core/mount.js): the panels, the Bar, the player, ?open=
  params.js       the schema, with its drawers
  frames.js       a recipe as frames: what a save draws and a replay draws
  save.js         Vault.save, its parents from consumedObjectIds()
  rebuild.js      what core asks about your objects: openObject() replays
                  one, reopens(object) says which ?open=<id> can bring back,
                  redraws(object) which are drawn again at a scale,
                  fieldOf(object) — where it makes one — a field
  STATUS.md
```

The recipe contract of `docs/object-model.md` is met so: `serialize` is
`params.values`, `restore` is `params.restore(recipe)`, and `render` is
`rebuild.js`'s `openObject()` — frames drawn from the recipe alone. There is
no `registerApp`: core imports `/apps/<app>/rebuild.js`, by the object's
`origin.app`, when it needs it. Everything else — panels, vault, gallery,
lineage, publishing — is inherited.

An app that can take its objects back reads `requested('<app>')` from
`core/reopen.js` at boot and restores what it gets; the vault's detail then
offers *Open in <app> ↗* for every object its `reopens()` accepts. The link,
`/apps/<app>/?open=<id>`, is the thing to send — to another tab, or to another
machine serving the same vault.
