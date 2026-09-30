---
name: skweeb-object
description: Save, load or extend the objects in the skweeb vault — the envelope every still, loop, dataset, shape, set and parameter set is stored in, plus lineage, seeds, recipes, thumbnails, tags, the trash and publishing. Use when adding save or load to an app, when one app has to consume what another made, when adding a new object type or set role, or when touching vault.js, server.js, index.json, the gallery, or anything named object.json.
---

# Objects in the vault

The full contract is `docs/object-model.md`. Read it once per task that touches
the envelope; this skill is the working procedure, not a summary of it.

## Saving

Never write `object.json` by hand and never build the folder yourself.

```js
const object = await Vault.save({          // the envelope — or null: no server, it downloaded instead
  type:    loop ? 'sequence' : 'still',
  title:   'torch · 60 frames',
  tags:    ['particles', 'loop'],
  origin:  { app: 'particles', version: '1.0.0' },   // core/rebuild.js dispatches on origin.app
  seed,                                    // null only when nothing in the render is random
  recipe:  params.values,                  // plus what the panel does not hold: a still's tick
  parents: params.consumedObjectIds(),     // automatic, from `type: 'object'` params
  render:  { blob, ext: 'png', w, h, frames, fps, loop: true },
  thumb:   await thumbFromBlob(blob),      // core/thumb.js — the server makes none
});
```

The server writes the folder, checks the bytes, hashes the render, dedups —
the same bytes and recipe return the old object, as `vault:duplicate` — and
rewrites `index.json`, which every open page hears as `vault:changed`, from
any machine on the vault. Four things are easy to get wrong:

- **`seed` is the promise of a replay.** Whatever is random draws from
  `makeRng(seed)` (`core/rng.js`); a save with randomness and no seed cannot
  be re-rendered, which is most of why it is an object and not a file.
- **`parents` is lineage, not history.** It lists what this was *made from*,
  not what the user looked at. A param of `type: 'object'` records itself —
  if lineage is being assembled by hand, that is usually the bug.
- **An object is never edited in place** — except its tags:
  `Vault.retag(id, { add, remove })` (a set's `use:` switches, a `folder:`,
  the trash). Anything else makes a new object whose parent is the old one.
- **`recipe: null` is legal** for something that genuinely cannot be
  re-rendered — a picture from outside is one (`origin.app: 'import'`, a
  leaf). Say so rather than saving half a recipe; a half-recipe fails
  silently three months later.

## Loading

```js
const rows = await Vault.list({ type: 'sequence' });   // index rows: no recipes, no blobs; never the trash
const { object, url, thumbUrl } = await Vault.load(id); // one envelope; its render at `url`
const frames = await openFrames(object, { url, scale, draft });   // core/rebuild.js
```

To draw something another app made, go through `openFrames()`: it replays a
sequence or a moving composition, shows a picture as itself, and hands the
rest to the origin app's `rebuild.js`. Never read another app's recipe — only
the app that wrote it knows what it means. `draft: true` asks for a live
preview's frames; `scale` asks for more pixels, drawn again where the app
`redraws()` it and stretched, and said so by `handle.scale`, where not.

## Sets, roles and uses

A new kind of thing is often a **set with a role**, not a new type: a
material is a set with `role: 'material'`, a brush family one with
`role: 'brush-family'`. Where a set is *offered* is tags — `use:<id>`,
switched in the vault's detail — with `core/uses.js` as the catalogue: an app
that learns to eat sets is one row in `USES`, and its param says
`use: '<id>'`. Folders are `folder:<name>` tags. Rules in
`docs/object-model.md`, *Sets* and *Uses*.

## The trash, and deleting

`Vault.trash(ids)` is a tag — nothing breaks, `restore(ids)` undoes it.
`Vault.remove(ids, { dependents, dry })` deletes for good, from the trash
only, and first asks what else names what is going: the chain goes too
(`'delete'`), or they are cut loose (`'detach'`). `server/delete.js` is the
one way out of the vault. Rules in `docs/object-model.md`, *Trash, and
deleting*.

## Adding a type

Edits in this order, and nothing else in the suite should need to know:

1. a row in the types table in `docs/object-model.md`;
2. its thumbnail, made by the saving app — `thumbFromCanvas`,
   `thumbFromBlob`, or `thumbFromLabel` for data with nothing to photograph;
3. what shows it where its render is not a picture — the vault's card and
   detail (`core/vault-card.js`, `core/vault-detail.js`), as a dataset's JSON;
4. `accepts:` on whatever param is meant to eat it, and a `rebuild.js` in the
   app that replays it.

If a type needs a new envelope field, stop: that is a design change, and the
answer is almost always a new type, a set role, or a key inside `recipe`.

## Specified, not built

- **Publishing.** `docs/object-model.md` specifies `Vault.publish(id)`: copy
  an object into `gallery/`, which is in git and deploys, and flip
  `published`. The client has no such call yet. When it lands, compress
  before committing — `oxipng -o4 --strip safe` — because the gallery is in
  git forever and its ancestor reached 33 MB for 41 images.
- **Smart objects.** `skw` — the one mutable type, versioned, the one that
  carries `refs` — is specified in *Smart objects* and not built: the server
  writes no versions. Before building anything that places one, read that
  section whole — placement, pinning, overrides, flattening and cycle
  refusal are specified there, and none of them should be reinvented. Two
  things to hold from the start: editing appends a version and never
  overwrites one, since something may be pinned to it; and `refs` is not
  `parents` — a live dependency put in `parents` fails silently, months
  later, as a render that never updates. A `standalone` skw carries code: it
  does not go in the public gallery without a sandbox decision in writing.
