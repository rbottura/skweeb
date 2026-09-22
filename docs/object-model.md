# The object model

One envelope for everything the suite makes or eats. If a new kind of thing does
not fit, add a **type** — do not add fields to the envelope.

## On disk

```
vault/                        ← not in git
  objects/<id>/
    object.json               the envelope
    render.<ext>              the primary artifact: png webp webm json otf glb
    thumb.webp                256px preview. Every object has one, any type.
    versions/                 .skw only: v1.json, v2.json … past recipes
    cache/                    disposable: rendered frames, preview video
    source/                   optional: extra files the object needs
  index.json                  generated. The gallery reads this and nothing else.

gallery/                      ← in git, deployed
  objects/<id>/               the published subset, same layout, cache stripped
  index.json
```

## The envelope

```json
{
  "id": "gmp_1789012345678_k3f9x2",
  "type": "sequence",
  "title": "band loop 3",
  "note": "",
  "tags": ["loop", "dense"],
  "created": "2026-09-21T14:02:11.482Z",

  "origin":  { "app": "gamepad", "version": "1.0.0" },
  "recipe":  {},
  "seed":    19387,
  "parents": ["gmp_1788900000000_a1b2c3"],
  "refs":    [],

  "render": {
    "file": "render.webm",
    "w": 1080, "h": 1080, "density": 1,
    "frames": 120, "fps": 30, "loop": true,
    "bytes": 4183902,
    "sha256": "b18deb0b62d383f2ac4ae5082165ea8a5ffbe363ff"
  },
  "thumb": "thumb.webp",
  "published": false
}
```

| field | rule |
|---|---|
| `id` | `<app3>_<ms>_<rand6>`. Prefixes `gmp_` `grd_` `ckt_` `skw_`. Guessable and greppable on purpose. |
| `type` | from the registry below. One word, singular. |
| `title` | what you would call it out loud. Defaults to the app's own naming. |
| `tags` | free. The gallery filters on these plus `type` and `origin.app`. |
| `origin.version` | the app version that wrote the recipe. An old recipe in a newer app is a migration, not a crash. |
| `recipe` | app-specific, JSON-serializable, complete. Anything not in here is lost. |
| `seed` | the integer every `rng()` in that render was drawn from. No seed, no re-render. `null` is correct only when the render used no randomness at all — true of the gamepad, which draws exactly what you drew. |
| `parents` | **made from.** Historical, frozen, for lineage. |
| `refs` | **depends on.** Live, for invalidation. See *Smart objects*. |
| `render.density` | the scale this render was made at. 1 is screen. Export writes a second render at 4 or more; the object keeps both. |
| `render.sha256` | of the bytes of `render.<ext>`. Identity for dedup. |
| `published` | true once a copy exists under `gallery/`. |

## Types (v1)

| type | render | recipe | made by | eaten by |
|---|---|---|---|---|
| `still` | png/webp | yes | all | all |
| `sequence` | webm, frames cached | yes | gamepad, grid, ckt | grid, ckt |
| `skw` | preview webm/png | **yes, versioned** | all | all |
| `dataset` | json, `[char][point][x,y]` | yes | ckt | ckt |
| `shape` | png with alpha | maybe | gamepad | gamepad, ckt, grid |
| `set` | contact sheet | yes, an ordered member list | all | gamepad as a brush family, ckt as a sprite library |
| `font` | otf/ttf in `source/` | no | imported | ckt, grid |
| `params` | none, the recipe *is* the object | yes | all | its own app |
| `composition` | png/pdf, rendered at export scale | yes | the page app, M4 | all |
| `model` `material` | **deferred**, 3D, when a 3D process exists | | | |

Adding a type means a row here, a thumbnailer in `core/thumb.js`, and a line in
the gallery type filter. Nothing else in the suite knows about types.

## Two kinds of edge

`parents` is history. `refs` is dependency. An object can have both, and the
difference between them is the difference between a copy and a smart object.

```
gmp_a1b2c3   still, gamepad          (drawn)
   └─ gmp_k3f9x2   sequence, gamepad     parents [a1b2c3]   frozen
        └─ grd_88f0e1   sequence, grid    refs    [skw_5c7d]  live
```

`parents` never changes and never invalidates anything. `refs` means *when that
changes, I am stale*: the gallery marks it, the next render rebuilds it.

Ordinary objects are **immutable** — a change makes a new object whose parent is
the old one. `skw` is the single exception, and versioning is how it stays
honest about it.

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
  "length": null
}
```

- `version: "latest"` — live. Editing the definition updates this placement.
- `version: 4` — pinned. An old composition keeps looking as it did.
- `overrides` — per-placement param values, so two placements of one definition
  can differ. Free, because params are data.
- `at` — **when**, in frames, measured from the composition's own start.
  `0` for something that is simply there.
- `length` — how many frames it runs for. `null` means its natural length: one
  frame for a still, the loop's own length for a sequence.

**Why `version` and not `at` for the pin.** This block said `at` for the
version until 2026-09-22, which worked only while nothing in a placement had a
time. A composition holds sequences, so a placement needs to say *when* as well
as *which* — and `at: 4` cannot mean both "version 4" and "starts at frame 4".
Renamed while it was still only a document and nothing had been written to
disk in the old shape. The lesson is cheap here and would not have been later:
a field with two plausible readings has one reading too many.

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

## Sets — the unit the gamepad actually thinks in

A `shape` is one image. The gamepad does not load shapes, it loads **families**:
an ordered folder of sprites picked through with the D-pad. So a set is its own
object, not a tag over loose ones.

```json
{ "type": "set",
  "recipe": { "members": ["ckt_…a1", "ckt_…a2", "ckt_…a3"], "role": "brush-family" },
  "parents": ["ckt_…dataset7"] }
```

Order is the recipe, because order is what the D-pad walks. `render` is a
contact sheet, which doubles as the thumbnail. Members stay ordinary objects
with their own lineage — a set is a view over them, not a container that owns
them.

**This is not hypothetical, and the set is only half of what it shows.**
`gamepad_sprites/GaramondI/Garam_blue` and `Minipax/minipax_white` are
letterforms generated in ColorKineType with a pattern applied, exported by hand
and imported into the gamepad as a folder. A `set` is the shape of that output.
The more useful reading is the direction: ckt has a capability, *produce a
gamepad brush family*, that knows what the gamepad expects. That is a **link**,
it points one way, and it is specified in `docs/core-api.md`. The folders on
disk are its output, run by hand before it existed.

## The recipe contract

Every app registers three functions with the core. This is the entire contract
between an app and the suite, and it is what makes `.skw` possible at all.

```js
registerApp("grid", {
  version: "2.0.0",

  // live app state to plain JSON. Goes into object.recipe.
  serialize() { return { ...params.values } },

  // recipe to live app state. The user sees the thing come back.
  restore(recipe) { params.set(recipe) },

  // headless render. No clock, no DOM, no Math.random. This is what makes a
  // still re-printable at A2 and a loop re-exportable at any frame rate.
  render(recipe, { width, height, frame, rng, load }) { }
});
```

`load(id)` inside `render` resolves a parent or a ref, so a grid dither can be
rebuilt at print size *from its source* rather than from a scaled-up copy of
what it looked like on screen. It is also how a placed `.skw` draws itself.

If `render()` genuinely cannot be written for something, that thing is
pixels-only: save it with `recipe: null` and it is a leaf — viewable, usable as
input, never re-rendered, never a smart object. A legitimate object, just a
smaller one.

## Resolution is an export concern

The live loop runs at screen size, with `density` as an ordinary parameter.
`render()` is size-parametric so that **export** can run it once at scale —
A3 at 300 dpi is about 3500 x 4960 — for the frames actually wanted. It is
never run at print scale in a loop you have to sit through.

A composition is the case this exists for: many objects placed on a sheet,
previewed live, exported once. See `docs/roadmap.md`.

## Frames are a cache, not an archive

Grid needs a sequence frame by frame; a browser wants one file. Storing both for
everything means 120 MB where 4 MB would do.

So `render.webm` is the object, and `cache/<w>x<h>/frames/0001.png` is built on
demand by re-running `render()` at the size asked for, and can be deleted at any
time. For a `recipe: null` object — an imported video — frames are extracted
from the file once and cached the same way.

## App versioning

`origin.version` is checked on load. Same major: restore directly. Older major:
the app supplies `migrate(recipe, fromVersion)`. Missing migration: the object
still opens read-only, with its render and its lineage, and the panel says so.
An old object must never disappear because its app moved on.

## Identity and dedup

`render.sha256` is the identity of the bytes. Saving the same bytes twice is a
no-op whatever it is named — this is how `gamepad/gallery` already works and it
is kept. Two objects may legitimately share a sha (same pixels, different
recipe): the id is the object, the sha is only the file.

## Publishing

`Vault.publish(id)` copies the object folder from `vault/` into `gallery/`
without `cache/`, sets `published: true` in both, and regenerates
`gallery/index.json`. Then it is a commit and a deploy away from being a link
you can send.

Nothing else moves between the two. The vault is private, unbounded and on your
disk; the gallery is small, curated and in git. Clearing one never touches the
other.
