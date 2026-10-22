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
| `tags` | free. The gallery filters on these plus `type` and `origin.app`. Two conventions: `folder:<name>` files the object in a folder of the vault panel — see *Tags that group* — and `use:<id>` says where a set is offered — see *Uses*. **The one field that may change after a save** — see *Tags change*. |
| `origin.version` | the app version that wrote the recipe. An old recipe in a newer app is a migration, not a crash. |
| `recipe` | app-specific, JSON-serializable, complete. Anything not in here is lost. |
| `seed` | the integer every `rng()` in that render was drawn from. No seed, no re-render. `null` is correct only when the render used no randomness at all — true of the gamepad, which draws exactly what you drew. |
| `parents` | **made from.** Historical, frozen, for lineage. |
| `refs` | **depends on.** Live, for invalidation. See *Smart objects*. |
| `render.density` | the scale this render was made at. 1 is screen. Export writes a second render at 4 or more; the object keeps both. |
| `render.sha256` | of the bytes of `render.<ext>`. Identity for dedup. |
| `published` | true once a copy exists under `gallery/`. |
| `detached` | absent until an object is **cut loose** from ones deleted since: a list of `{ at, ids, members?, placements?, recipe? }`, one per cut, with the recipe it had to set aside. Decided 2026-09-26 — see *Trash, and deleting*. |

## Tags that group

Some things are made in dozens and looked at as one: the dot-sets of a ckt
session, the 58 brushes of an emitted family. A tag `folder:<name>` puts every
object that carries it into one folder of the vault panel, closed until it is
opened. Decided 2026-09-23.

A folder is a view, not a place. Every object still lives at
`objects/<id>/`, so no URL, parent or ref changes, and an object can leave a
folder by losing a tag. The objects worth seeing on their own — a still, a
loop, the `set` itself — carry no folder tag and stay at the top.

## Tags change

Everything about an object is fixed when it is saved — except its tags.
Decided 2026-09-23, for a set's switches (*Uses*, below): where a family is
offered is a choice the author keeps making, and making a new object for each
flip would give the set a new id and orphan every recipe that names it.

So tags are the object's label, not its content. The render, the recipe, the
seed and the lineage never change; `PATCH /api/vault/<id>` takes
`{ add: [tag], remove: [tag] }` and nothing else, and `Vault.retag()` is its
client. An edit, not a replacement, so two machines on one vault cannot erase
each other's tags. Dedup still compares bytes and recipe only: saving an
identical object returns the old one with the tags it has now.

## Trash, and deleting

Decided 2026-09-26. Nothing leaves the vault in one step.

**The trash is a tag**, `trash`, so it is the edit *Tags change* already
allows and nothing about the object moves. A trashed object is still on disk
and still loads — a page placing it still draws it — but `Vault.list()`
leaves it out, and so does anything offering objects to choose from. The vault
panel shows it in a trash view of its own, where it is restored or deleted.

**Deleting is only from the trash**, `POST /api/vault/delete`
(`server/delete.js`). The folder and its line in `index.json` go, and the id
with them: the same bytes saved again are a new object.

**What names it is asked about.** An object is named by another that lists it
in `parents` or `refs`, or whose recipe holds its id anywhere — a set's
members, a composition's placements, grid's source. `parents` is history, but
it is also the only copy of how to make a replayed object again, so a delete
treats it as a dependency. When anything outside the request names what is
going, the delete asks first, and there are two answers:

- **delete the chain** — everything that names a deleted object goes too, and
  everything that names those, all the way down;
- **cut them loose** — they stay, without what was deleted. `parents` and
  `refs` lose the ids; a set's `recipe.members` and a composition's
  `recipe.place` lose the members and placements that were them, and stay a
  set and a page; a recipe that still names one after that cannot be replayed,
  so it is set aside and `recipe` becomes `null` — the object is its render
  now, and a loop becomes its poster. The render is not redrawn: a set's sheet
  and a page's picture still show what was cut until they are saved again.

Cutting loose is the one edit an ordinary object receives besides its tags,
and it is written down in `detached`. The alternative, a new object for each
dependent, would give each a new id and orphan every recipe naming *it* in
turn — the same reason tags change in place.

## Types (v1)

| type | render | recipe | made by | eaten by |
|---|---|---|---|---|
| `still` | png/webp | yes | all | all |
| `sequence` | webm, frames cached | yes | gamepad, grid, ckt | grid, ckt |
| `skw` | png, its picture | **yes, versioned**: the bound form, `{ kind, app, type, recipe, seed }` (`docs/smart-objects.md`) | the app it binds, bound (core/vault.js `bind`) | all, as the object it binds |
| `dataset` | json, `[char][point][x,y]` | yes | ckt | ckt |
| `shape` | png with alpha | maybe | gamepad | gamepad, ckt, grid |
| `set` | contact sheet | yes, an ordered member list | all | gamepad as a brush family, ckt as a sprite library |
| `font` | otf/ttf in `source/` | no | imported | ckt, grid |
| `params` | the recipe *is* the object; its render a picture of what it does — a look, the chain on the frame it was made on; a puppet, the avatar as worn when it was sent | yes | all | its own app; a filter look, compose on a placement; the rig's puppet (`origin.app` `rig/puppet`), kept as a smart object a page in OBS follows |
| `composition` | png/pdf, rendered at export scale | yes | the page app, M4 | all |
| `map` | png, the map at its own pixels; with frames and a rate when loops stand on it — never its walls or events | yes: `{ map, cells, walls, place }` — the panel's values, a tile index a cell, a flag a cell that cannot be walked, the things standing on it and what each does: solid, a sign, a warp to a map by its name, the spawn (`apps/map/params.js`) | the map editor, M8 | compose; the player, M8 |
| `model` | png, the model from its own camera at its format | yes: the panel's values — the view (`lens`, `yaw`, `pitch`, `distance`, `fov`, the point looked at `tx` `ty` `tz`), the light (`sun`, `sunYaw`, `sunPitch`, `ambient`), the `ground`, the style (`toon`, `outline`, `ink`, `shadows`), the format — and `shapes: [{ id, params, on, modifiers }]`, each a primitive by id with its form, its place and its look, and its stack of `modifiers: [{ id, params, on }]` in order; never its vertices, which the params make again (`apps/3d/params.js`, `shapes.js`, `modifiers.js`). `material` stays deferred: a colour is a shape's param until two models share one | the 3D app, M10 | compose, drawn again at a scale; a map, as a thing; filter, through its picture |

Adding a type means a row here, a thumbnail made by the app that saves it
(`core/thumb.js`), and — where its render is not a picture — what shows it in
the vault. Nothing else in the suite knows about types.

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
honest about it. (Tags aside — they are a label on the object, not the object;
see *Tags change*.)

## Smart objects — the `skw` type

The one object that changes — placed by reference, versioned — and the live
stack of windows it is the saved form of: `docs/smart-objects.md`, moved
out on 2026-10-06 when M11 began and this file stood at its cap.

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

**Not hypothetical.** `gamepad_sprites/GaramondI/Garam_blue` and
`Minipax/minipax_white` are letterforms made in ColorKineType, exported by hand
and imported into the gamepad as folders: a `set` is the shape of that output,
and the folders are what ckt's *produce a gamepad brush family* — a **link**,
one way, `docs/core-api.md` — makes, run by hand before it existed.

### Uses — where a set is offered

More than one app eats sets: the gamepad as a brush family, grid as a dither
material, ckt as sprites for its dots, particles as sprites for its
particles. `recipe.role` says what a set was
*made as* — `brush-family`, `material` — and it is history. Where it is
*offered* is a tag, `use:<id>`, one per use, switched in the vault detail;
`core/uses.js` holds the catalogue of uses and the rule:

- a set with **no `use:` tag** is offered to the uses its role is the default
  for — so a set saved before the switches existed keeps working;
- a set with **any `use:` tag** is offered to exactly those, and `use:none`
  means nowhere.

A set's index row carries its `role`, copied out of the recipe, so a picker can
apply the default without opening every set. A material is a set with
`role: "material"`, its members ordered light to dark — grid maps the darkest
pixels to the last member — with `recipe.ground`, the ground that order was
measured on, and `recipe.name`: the vault dedups on content, so a material
renamed and nothing else must differ in its recipe to be saved at all.

**Editing a material** makes a new version, never a change in place: every
dither made with it names it by id and must replay as it was. The new version
carries the old one's `use:` switches and names it as a parent; the old one is
put away — `use:none` and `folder:earlier materials` — and stays, since those
dithers still name it. Edited back to exactly an earlier version, the vault
hands that one back, and it is brought out again. To the author it is editing.

**Legacy sprites.** A set lists objects, and the gamepad's families on disk are
files. So a sprite from them becomes an object when something needs it as one
— a member of a material, or its whole family copied in from grid's maker — as
a `shape` leaf, titled `<family> <index>`, filed in `folder:legacy <family>`.
`core/legacy.js` builds that envelope for every path that copies one, so the
same bytes and the same null recipe dedup to one object however often it is
copied. A family copied whole is a set in the D-pad's order, switched on as a
material and as sprites but not as brushes: the gamepad has the original.

**Pictures from outside.** A file drawn in another program comes in through
the vault panel — *+ pictures*, or dropped on it (`core/vault-import.js`) —
as a leaf with `origin.app: "import"`, which no app answers to, so nothing
asks to reopen or replay it: a `shape` when any pixel is see-through, a
`still` when none is, titled by its file's name, tagged `import`. Several
at once come in each so, and as a `set` of them in their names' order,
`role: "brush-family"`, so the gamepad and particles are offered it by
default. The vault dedups on bytes: a file brought in twice, under any
name, is the first object it made.

## The recipe contract

Three things are the entire contract between an app and the suite, and what
makes `.skw` possible at all. Live state to plain JSON, which goes into
`object.recipe`: the schema's `params.values`. A recipe back to live state, the
user seeing the thing come back: `params.restore(recipe)`. And a headless
render — no clock, no DOM, no `Math.random()`, which is what makes a still
re-printable at A2 and a loop re-exportable at any rate: the app's
`rebuild.js`, whose `openObject(object, { scale })` hands back frames drawn
from the recipe alone, found by core through `origin.app` (`docs/core-api.md`,
*Writing an app against core*). The plan had a `registerApp(name, { serialize,
restore, render })`; none was needed.

`load(id)` inside `render` resolves a parent or a ref, so a grid dither can be
rebuilt at print size *from its source* rather than from a scaled-up copy of
what it looked like on screen. It is also how a placed `.skw` draws itself.

If `render()` genuinely cannot be written for something, that thing is
pixels-only: save it with `recipe: null` and it is a leaf — viewable, usable as
input, never re-rendered, never a smart object. A legitimate object, just a
smaller one.

**A GPU render replays close, not bit for bit, on another machine.** Decided
by the author on 2026-09-26, when the first GPU objects were about to be saved
(`core/gpu/`): GPU arithmetic is not the same on every GPU and driver. On the
machine that made it, an object replays the same until a driver or the
browser changes; elsewhere it replays within a small difference. The recipe
stays the truth, and a check compares a GPU replay with a tolerance, never
byte for byte. Dedup is untouched — it compares a save's bytes — so the same
recipe saved again on another machine may be a second object.

## Resolution is an export concern

The live loop runs at screen size, with `density` as an ordinary parameter.
`render()` is size-parametric so that **export** can run it once at scale —
A3 at 300 dpi is about 3500 x 4960 — for the frames actually wanted. It is
never run at print scale in a loop you have to sit through.

A composition is the case this exists for: many objects placed on a sheet,
previewed live, exported once. See *Placement*, above, and the plan compose
was built to, in `apps/compose/STATUS.md`.

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
