# The vault's workshop — what is made of objects, for every app (V, 2026-11-06)

The author, 2026-11-06: "la palette de couleur de bec me fait penser que
l'objet palette de couleur doit exister, et il nous faut un endroit pour
accéder à des fonctions d'édition inter app comme la création de palette
de couleurs, la création de set custom en sélectionnant les images qu'on
veut, et aussi des groupes d'objets pour ranger le vault à terme". And
for BEC: "pour les assets de bec_2025 on peut avoir un groupe ou dossier de
ce nom … j'aimerais utiliser cette application pour tester des rendus
graphiques de l'édition bec_2027" (`docs/bec.md`).

## The place: the vault panel

Not an app of its own. What is made of objects, for every app, is made
where the objects are: the vault panel (`core/VaultPanel.js`) — in every
app, beside every viewer in cluster, full screen in the vault app. It
already selects — Ctrl or Shift click, a card or a folder — for the trash
(`core/vault-trash.js`); the same selection gets the acts below, in the
same bar, and its head a way to make what needs nothing selected.

## V1 — the palette, a type

*Landed 2026-11-06* — the palette made by hand and edited, BEC's grid drawn
in one; *its colours* from a picture, still to come.

- **`palette`**, an object of the vault: its recipe the colours in their
  order, `#rrggbb`, and a name for each, optional — BEC's were blue, red,
  green, yellow and black; its render a strip of its swatches, as a set's
  is a strip of its members; a row of `docs/object-model.md`. Made from a
  picture, the picture is its parent.
- **Made** from the panel's head, *+ palette*: its swatches, added, taken
  out, moved, each a colour and a name, and a name for the palette; kept,
  it is an object like any other. From a picture's detail, *its colours*:
  the few that cover most of it, as a palette whose parent is the picture.
- **Edited** in its detail: as a material is (`docs/object-model.md`,
  *Editing a material*), a new object, the old one kept — whatever was made
  with it keeps the colours it had.
- **Used** by every list of colours that can take one, by the object param
  every app has: BEC's grid first — its palette one of its own three, or
  one of the vault's — then particles' colours (2026-11-09, a colour of it
  each, `apps/particles/dye.js`); a ground and ckt's dots to come.
  Dragged onto a palette field from the vault, as any object (S9g).

## V2 — a set, by hand

*Landed 2026-11-06* — the bar's *A set of these…*, a name and a role
(`core/vault-set.js`); made, its detail opens on its switches. A
character's loops too, the same day (P3, `core/character.js`): loops and
no pictures selected, the form starts on *map character*.

The pictures selected, in the order they were picked: *a set of these* —
a name and what it is made as, a brush family, a material, sprites, a
tileset — a `set` as the object model has it, its members by id, offered
where its role is (`core/uses.js`). The legacy grid's materials and ckt's
families were made by their apps; this is a set made by the hand.

## V3 — groups

*Landed 2026-11-06* — the bar's *Into a group…*, *Out of their group*, and
*rename* at a group's strip (`core/vault-groups.js`, `core/vault-name.js`).

The folders, by hand: the selection *into a group…*, a new name or one
there is — `folder:<name>`, a view and not a place (`docs/object-model.md`,
*Tags that group*); out of a group; a group renamed, every member's tag
with it. BEC_2025's assets come in as one, `bec_2025` (M13b).

## Order, and what waits

V1 first — BEC 2027 will have colours of its own, and BEC's grid takes
them — then M13b, BEC_2025's assets into `bec_2025`, its three palettes as
palettes; then V3 and V2. The author's to say: a palette's fields —
colours and their names, enough? — and the workshop's place, the vault
panel, or an app of its own.
