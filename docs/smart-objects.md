# Smart objects, and the live stack

The one object that changes, and the live layers it is the saved form of —
M11 (`docs/roadmap-done.md`). Moved out of `docs/object-model.md` on
2026-10-06, when M11 began and that file stood at its cap: the object model
keeps the envelope and the two kinds of edge, `parents` and `refs`; this
file keeps what `refs` is for.

## Smart objects — the `skw` type

A `.skw` is a sketch with its parameters bound into it, placed by reference
rather than by copy. Edit the definition and every placement follows — the
Photoshop smart object, with the difference that a placement may override.

**Two forms, one envelope.**

```json
{ "kind": "bound",      "app": "particles", "type": "sequence", "recipe": {}, "seed": 19387 }
{ "kind": "standalone", "module": "source/sketch.js" }
```

`bound` names a registered app, the kind of object it made — its replay
takes each kind its own way — and carries its recipe and seed. It is the
`skw`'s recipe, in an ordinary envelope round it: `origin.app` the app,
`render` its picture. Drawn or reopened, it is that object (core/smart.js
`unwrap`). It is nearly free: the app's replay already exists, so this form
works the day the contract does. It needs that app to be installed.

`standalone` carries its own ES module exporting `params` and `render()`. It
needs no origin app and travels anywhere — the fuller reading of "a whole
sketch". Same envelope, so a `bound` object can be promoted to `standalone`
later by writing the module out. **Never publish a `standalone` to a public
gallery without a sandbox decision in writing**: that is shipping executable
JavaScript to someone else's browser.

**Placement.** A consuming app stores this inside its own recipe:

```json
{
  "ref": "skw_1789012345678_aa71bc",
  "version": "latest",
  "transform": { "x": 0, "y": 0, "scale": 1, "rot": 0 },
  "overrides": { "cell": 8 },
  "at": 0,
  "length": null,
  "look": "fil_1790460000000_c0ffee",
  "opacity": 0.8,
  "blend": "multiply"
}
```

- `version: "latest"` — live. Editing the definition updates this placement —
  and since L11 (2026-11-06) every object field holding one, in any app:
  core's params hear its versions (`vault:updated`) and say the field again,
  `params.following` true, so the app loads it again as if picked again —
  no step of its history; one pinned, `skw_…@v3`, follows nothing.
  Particles' and fractals' sprites take a 3D model's picture, followed so.
- `version: 4` — pinned. An old composition keeps looking as it did. Why
  `version` and not `at`: `docs/decisions.md`, 2026-09-22. Compose places a
  project at its state (S6b), its row *at its state · 0 follows*; the live
  stack's layer of a smart object follows, and the same row keeps it at a
  state — its block, and the page the stack saves, carry it (L1).
- `overrides` — per-placement param values, so two placements of one definition
  can differ. Free, because params are data.
- `at` — **when**, in frames, measured from the composition's own start.
  `0` for something that is simply there.
- `length` — how many frames it runs for. `null` means its natural length: for
  a sequence its own loop, played again until the page ends; for a still, the
  rest of the page — a still has no time of its own, so it is simply there.
  Frames are the page's, at its `fps`; a loop keeps its own speed on a page of
  any rate, its first tick at its `at`. A page lasts until the last of its
  placements ends: `at` plus `length`, or plus its own loop — one frame, for
  a still. A **flipbook** is stills one after another: `at` 0, 1, 2, each
  `length` 1. Decided by the author 2026-09-24 (`apps/compose/STATUS.md`).
- `transform` — in the composition's page pixels, before its `scale`: `x` and
  `y` put the object's centre that far from the page's centre, `scale`
  multiplies the object's own size — its ink over the whole loop — and `rot`
  turns it about its centre, in degrees, clockwise. Centre and not corner, so
  that scaling or turning an object leaves it where it is, and a page that
  changes size keeps centred what was centred on it. Decided 2026-09-24 with
  compose's first brick (`apps/compose/page.js`).
- `look` — optional: a look's id, a filter chain saved alone as a `params`
  object, run over the object's frames on the GPU (`core/gpu/look.js`). A
  look that grows past the edge makes the object's ink bigger by the chain's
  reach on every side, and the object is sized by that. Absent — not `null`
  — when there is none, so a block with no look is the block it always was.
  A look is a parent of the page it is on: the page cannot be made again
  without it. Added 2026-09-26 with M5's link, `filter → compose: a look`.
- `opacity` — how much of it shows, from 0 to 1. Absent when it is 1.
- `blend` — how it meets what is under it: `multiply`, `screen`,
  `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`,
  `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`,
  `saturation`, `color`, `luminosity` or `plus-lighter` — CSS's names for
  them, one spec with canvas's (*Compositing and Blending*), which draws
  them as `globalCompositeOperation`, `plus-lighter` as `lighter`. Absent
  when it is normal. A look changes the object's own frames; a blend, how
  they meet the page. Both added 2026-10-06 with M11, by the author.
- `live` — a window's id, in place of `ref`: a block of the live stack, never
  saved (*The live stack*, below).

**A project is one** (S6b, 2026-11-03, the author's ask: "pas un nouvel
objet à chaque pression de S"). Every app on core's kit saves its S as a
state — `Vault.save({ state: true })` — so its first S makes a smart object
and binds the page to it, strictly: only an S is a state of it. The Export
box's frozen acts say `state: false` and name the state they come from;
"Save as a new object" starts another. ckt, the gamepad and the puppet keep
their own saves until they are on the kit. Placed in compose from the vault,
a project is **pinned at the state it had** — the author's choice — its
placement's row set to 0 to follow it (`?place=skw_…@v3` pins too). A
picker takes a smart object for what it binds: the index row says, `binds`.

**Saving one.** A `skw` is saved by the app that makes it, through its own
save: the window is bound into it (core/vault.js `bind`) — reopened in its
app (`?open=skw_…`), or asked to save for what will hold it, as a window
filter follows is — and bound, the app's saves of the kind it binds are that
object, saved again. A look saved in filter stays a look. An object that
places a smart object lists it in `refs` as well as `parents`, the app
saying nothing: the id says what it is.

**Versions.** Editing a `.skw` appends `versions/vN.json` and bumps
`object.version` — `PUT /api/vault/<id>` (server/versions.js), what it was
kept with its picture of then, `versions/vN.<ext>`, and `updated` the time
of the version it is at; its index row carries `version`. Since S6
(2026-11-03) the versions are a tree, as git's: each names its `parent`, the
state it was saved from — a window holds one (`Vault.bind`'s `version`), and
one reopened at an older state, `?open=skw_…@v3`, saves a **branch** — and a
merge its `parent2`. `GET /api/vault/<id>/states` lists them (`Vault.states`). Past versions are
immutable, so a pin is a real promise. Nothing else in the vault has
versions, because nothing else is meant to be edited after the fact. A next
state whose `refs` lead back to it — A holding B holding A — is refused, the
chain named, by `Vault.save` before it is sent and by the server, 409
(L3, `core/cycles.js`): drawing it would never end. A new object closes
none, since nothing holds its id yet.

**Invalidation.** Saving a `.skw` emits `vault:updated { id, version }` — on
every page of the vault, the server's event stream naming it (core/vault.js
says it once). What is the object or holds it in its `refs` opens again:
filter's source, compose's placements, the stack's layers. Cache is
disposable; recipes never are. Pins (`version: N`) draw what was kept
(core/smart.js `innerOf`); a placement that carries one comes with compose
editing the stack (M11, brick 6), and so do flatten and refusing a cycle.

**Flatten.** Turning a live placement into a frozen one: render at the pinned
version, save as an ordinary object with `parents: ["skw_…@v4"]` and no `refs`.
The rasterize command, and the way out when a chain gets too clever.

**Cycles.** A `.skw` may place another `.skw`. `Vault.save` walks the ref graph
and refuses a cycle. One check, saves an infinite loop later.

## The live stack — M11, decided 2026-10-06

The author's three calls: separate windows, not one page holding every app;
opacity and blend on every placement; live within one browser.

**Windows.** Every skweeb page open in one browser is a window on one
channel — a `BroadcastChannel`, which reaches every page of the origin in
that browser and nothing else (`core/live.js`). A window says who it is — an
id for as long as the page is open, its app, its title — and what it has on
screen: its **layer**, the envelope a save would write, made and never saved
(the print's, `core/PrintPanel.js`), so with no id. Envelopes, never pixels:
a recipe is small, and any window draws any layer with `core/rebuild.js`, as
it draws any object. A window alone, or a browser with no channel, is the
app as it was (rule 7). A layer is the one the print draws, but a loop goes
as a loop (`loopOf`): its recipe with no frame chosen, its render with its
frames and rate — so a playing window's layer stays the same from frame to
frame, and every window shows the loop at the wall clock's frame.

**The stack** is one live composition per browser: a page and its
placements, bottom first, as a composition's recipe is — `{ page, place }` —
where a block names a vault object by `ref` or a window by `live`. Every
window keeps a copy; a change goes to every window with a count, and the
latest wins. A window that closes takes its block with it.

**Drawn in every window.** Round its own canvas each window draws the stack
in its own frame: what is under its layer on a canvas behind it, each layer
over it on a canvas of its own in front, and its own canvas given its
block's opacity and blend — CSS's `opacity` and `mix-blend-mode`, which
composite as canvas's `globalAlpha` and `globalCompositeOperation` do. So
filter shows its chain over the composition it will join, as the chain is
dragged; and compose shows the filter's layer on its page, following it.
The checkerboard goes under all of it. Where nothing is under a layer, the
window blends it with the checkerboard and a save with nothing — the same
for most blends over a light board, not for screen or difference; an exact
preview would want the layers in a group of their own.

**Send to ▸** (`core/send.js`): what one window has on screen, as another
app's source — filter's, first. The other app's window, open, is asked to
take it; with none, one opens beside this, its address naming this window,
and takes it once it hears it. The taker follows the layer, carried whole
in its own: filter's recipe holds its source's envelope while it is live,
so any window can draw a filter of particles. A recipe that names a vault
object by id cannot name a window: so a filter of a window, saved, asks
that window to save itself first, with its own save, title and lineage,
and names what it kept. Until brick 5 what it keeps is an ordinary object;
then, a smart object, that changes when the window does.

**Saved, a live block becomes a smart object.** A live block never reaches
the vault. When what holds one is saved — the stack as a composition, a
filter whose source is another window — that window's layer is saved first
as a `skw` (`bound`: its app, its recipe, its seed), and the block becomes a
`ref` to it at `version: "latest"`, a ref and a parent both. Opened in its
app again and saved, the `skw` takes a version, and every page placing it
at `latest` draws it new (*Invalidation*, above).

**The stack saved as a page** (`core/stackSave.js`), from any window's
drawer: every window in it saves itself as a smart object — this one too —
and the page is compose's recipe placing what they kept and the vault
objects it held, bottom first, each at its transform, its opacity and its
blend; its picture is compose's replay. A filter following another window
saves that window first, so a page of a filter of particles is a smart
object of a smart object: change the particles and save, and the page,
opened anywhere, is drawn again.
