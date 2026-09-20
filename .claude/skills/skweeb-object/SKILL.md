---
name: skweeb-object
description: Save, load or extend the objects in the skweeb vault — the envelope every still, loop, dataset, shape, font and parameter set is stored in, plus lineage, seeds, recipes, thumbnails and publishing. Use when adding save or load to an app, when one app has to consume what another made, when adding a new object type, or when touching vault.js, index.json, the gallery, or anything named object.json.
---

# Objects in the vault

The full contract is `docs/object-model.md`. Read it once per task that touches
the envelope; this skill is the working procedure, not a summary of it.

## Saving

Never write `object.json` by hand and never build the folder yourself.

```js
const id = await Vault.save({
  type:    "sequence",
  render:  { blob, w, h, frames, fps, loop: true },
  recipe:  App.serialize(),
  seed:    App.seed,
  parents: Params.consumedObjectIds(),   // usually automatic, see below
  title:   "band loop 3",
  tags:    ["loop"],
});
```

`Vault.save` writes the folder, hashes the render, makes the thumbnail, updates
`index.json` and emits `vault:saved`. Four things are easy to get wrong:

- **`seed` is not optional.** Without it the object cannot be re-rendered, which
  is most of why it is an object and not a file.
- **`parents` is lineage, not history.** It lists what this was *made from*, not
  what the user looked at. A param of `type: "object"` records itself
  automatically — if lineage is being assembled by hand, that is usually the
  bug.
- **An object is never edited in place** — except `skw`, which versions. A
  change to anything else makes a new object whose
  parent is the old one.
- **`recipe: null` is legal** for something that genuinely cannot be re-rendered.
  Say so explicitly rather than saving an incomplete recipe; a half-recipe fails
  silently three months later.

## Loading

```js
const rows = await Vault.list({ type: "sequence" });   // index.json only, no blobs
const { object, blob, url } = await Vault.load(id);    // one folder
```

Loading something made by another app: use `object.render` and treat `recipe` as
opaque. Only the origin app interprets its own recipe — the one exception is
`render()` called through the core to rebuild a parent at a different size.

## Adding a type

Four edits, in this order, and nothing else in the suite should need to know:

1. a row in the types table in `docs/object-model.md`,
2. a thumbnailer in `core/thumb.js` — every type has a `thumb.webp`, including
   fonts (a specimen), datasets (a dot plot) and 3D (a render),
3. the gallery type filter,
4. `accepts:` on whatever param is meant to eat it.

If a type needs a new envelope field, stop: that is a design change, and the
answer is almost always a new type or a key inside `recipe` instead.

## Publishing

`Vault.publish(id)` copies vault to gallery and flips `published`. It does not
commit. Compress before committing — `oxipng -o4 --strip safe` — because the
gallery is in git forever and its ancestor reached 33 MB for 41 images.

## Smart objects

`skw` is the one mutable type and the one that carries `refs`. Three things to
get right, all in `docs/object-model.md`:

- **Editing appends a version.** `versions/vN.json`, bump `object.version`,
  emit `vault:updated`. Never overwrite a past version: something may be pinned
  to it, and a pin is a promise.
- **`refs` is not `parents`.** A placement that tracks the definition goes in
  `refs` and invalidates the cache when the definition moves. A flattened copy
  goes in `parents` and never changes again. Putting a live dependency in
  `parents` is the bug to watch for — it fails silently, months later, as a
  render that never updates.
- **`standalone` is executable code.** A `bound` skw names an installed app and
  is safe. A `standalone` skw carries a module. It runs locally; it does not go
  in the public gallery without a sandbox decision in writing.

Before implementing anything that places a skw, re-read *Smart objects* in
`docs/object-model.md` — placement, pinning, overrides, flattening and cycle
refusal are all specified there, and none of them should be reinvented.
