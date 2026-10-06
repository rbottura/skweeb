# Smart objects, and the live stack

The one object that changes, and the live layers it is the saved form of —
M11 (`docs/roadmap.md`). Moved out of `docs/object-model.md` on
2026-10-06, when M11 began and that file stood at its cap: the object model
keeps the envelope and the two kinds of edge, `parents` and `refs`; this
file keeps what `refs` is for.

## Smart objects — the `skw` type

A `.skw` is a sketch with its parameters bound into it, placed by reference
rather than by copy. Edit the definition and every placement follows — the
Photoshop smart object, with the difference that a placement may override.

**Two forms, one envelope.**

```json
{ "kind": "bound",      "app": "gamepad", "recipe": {}, "seed": 19387 }
{ "kind": "standalone", "module": "source/sketch.js" }
```

`bound` names a registered app and carries a recipe. It is nearly free: the
app's `render()` already exists, so this form works the day the contract does.
It needs that app to be installed.

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

- `version: "latest"` — live. Editing the definition updates this placement.
- `version: 4` — pinned. An old composition keeps looking as it did. Why
  `version` and not `at`: `docs/decisions.md`, 2026-09-22.
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

**Versions.** Editing a `.skw` appends `versions/vN.json` and bumps
`object.version`. Past versions are immutable, so a pin is a real promise.
Nothing else in the vault has versions, because nothing else is meant to be
edited after the fact.

**Invalidation.** Saving a `.skw` emits `vault:updated { id, version }`. Every
object whose `refs` contain that id drops its cache and is marked stale. Cache
is disposable; recipes never are.

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
app as it was (rule 7).

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

**Saved, a live block becomes a smart object.** A live block never reaches
the vault. When what holds one is saved — the stack as a composition, a
filter whose source is another window — that window's layer is saved first
as a `skw` (`bound`: its app, its recipe, its seed), and the block becomes a
`ref` to it at `version: "latest"`, a ref and a parent both. Opened in its
app again and saved, the `skw` takes a version, and every page placing it
at `latest` draws it new (*Invalidation*, above).
