# BEC again — its scenarios, in skweeb (M13, proposed 2026-11-05)

The author, 2026-11-05: "j'ai très envie de réutiliser le projet BEC 2025
et les quelques scénarios qu'il a introduits pour refaire ces scénarios
avec skweeb, comment on crée un objet de type projet par exemple qui
encapsule un objet, ici du contexte de l'app 3d qui serait la grille 3d de
l'app BEC originelle et embarque aussi la possibilité de charger les
paramètres et leurs évènements associés au rendu dans skweeb, comme de
nouveaux panels qu'on introduit de l'extérieur pour l'import d'un projet
particulier, et jouer avec les scénarios de couches de textes, les
itérations, les sauvegardes de versions, la visualisation de ses versions,
leur comparaison".

BEC_2025 is the ancestor `core/formats.js` took its formats from; what its
layers did is in `docs/migration.md`, and its source is on disk at
`C:\Users\bottu\Documents\code\BEC_2025` — read it before porting anything.
What a project made by several would add later — PDF layers, a print that
keeps its type vector, people live on one stack — is the roadmap's *Still
open*, 3. This file is BEC itself, first.

## What BEC is, read in its source

A p5 sketch in WEBGL, made for a communication project's art direction.
A `Matrix` of cells, X by Y by Z at a cell's size; `Edge`s between its
vertices, each with its joints, its size, its thickness and a colour of the
identity's palette — five, blue, red, green, yellow and black, and two
other palettes kept in comments; the `Cell`s and `Face`s those edges close,
some of them filled. A `Scene` turning at a speed. Its panels: the axes,
the formats, the edges' size, the edges drawn at random, the canvas's
filtering, the list of edges — each on or off, its colour — the visible
edges animated, and the layers by format. Its events, keys: `q` `s` `d`
fill four, six or eight faces at random, `c` deals the colours again, `e`
draws a new set of edges. Every one of them is `random()`, loose.

## Its scenarios, and what skweeb has for each

| scenario | in BEC | in skweeb today | missing |
|---|---|---|---|
| a 3D grid and its parameters | the sketch above | the 3D app: primitives made from their params, a card each, picked in the view and moved by handles (M10) | the grid, as a primitive of the 3D app |
| its events | keys, `random()` | seeds (rule 2); an app's own keys, and every act in the search (S5) | each shuffle a seed of the recipe, an act on a key |
| every format of one identity | `formats.json` | its formats, `core/formats.js`; the print at any size, in tiles | — |
| text layers over the render and under it | titles under, infos over, PNGs by format | the Stack: a picture with alpha over or under any app's canvas, at an opacity and a blend (M11) | by format: the gabarit (S8's type) |
| iterating, keeping the best | by eye, PNGs saved, presets a to-do | S, the next state of the project; stills, sequences, `params` in the vault | — |
| its versions seen and compared | — | H, the states as a graph over the page, the hovered one drawn; two Shift-clicked, side by side, merged; a row's mark Alt-clicked, its value in every state (S6, S7) | — |
| printed with its type sharp | rasterized | PNG, in tiles | the roadmap's *Still open*, 3 |

## A project, in skweeb

**Not a new type to begin with.** What the author calls a project is what
S saves since S6b: a smart object, `skw`, bound to an app's recipe, its
states a tree — the versions, the graph, the comparison and the merge come
with it. A project of several parts — BEC's grid and its layers — is the
stack saved as a page (M11, `core/stackSave.js`): every window in it a
smart object, the page compose's recipe holding them, the page itself the
project S saves into.

**Panels from outside are data, not code.** The code that draws the grid
enters the repo once, as a primitive of the 3D app, and rule 1 makes its
panel from its schema. Everything particular to the BEC project is data in
the vault: its layers, pictures filed by format; its palettes; its presets,
`params` objects; its gabarits. Brought in at once by a script, as
`scripts/import-legacy-grid.mjs` brought grid_sketch's materials. A project
from elsewhere is then the same thing: data a primitive already knows how
to draw, never code that arrives with it.

## The bricks

1. **M13a — BEC's grid in the 3D app** · `3d/grid` · M · *landed
   2026-11-05* (`apps/3d/grid.js`). A primitive of the catalogue: the cells
   X × Y × Z, their size, the edges' count, offset and thickness, the faces
   filled, BEC's three palettes, each a param of its card. BEC's keys are
   the suite's already — S saves, E exports, Q and D step frames — so its
   `e` is R, a new `seed`, the colours dealt anew with the edges as BEC
   did; its `c` is C, new `hues`; its `q` `s` `d`, four, six or eight
   faces, are in the 3D app's pie, A. Still to come: an edge picked in the
   view, on or off, its colour — a list in the recipe, a decision of its
   own; and its edges animated, with the 3D app's motion (P1, P2).
2. **M13b — BEC's files into the vault** · `bec/import` · S.
   `scripts/import-bec.mjs`: the titles and infos of each format, shapes
   with alpha; BEC's three palettes as palettes (V1, `docs/workshop.md`) —
   all in one folder, `bec_2025`, the author's word of 2026-11-06: "un
   groupe ou dossier de ce nom avec tous les éléments concernés". The
   suite is to try BEC 2027's first renders: "tester des rendus graphiques
   de l'édition bec_2027".
3. **M13c — the gabarit, a type** · `ui/gabarit` · M. S8's gabarit — a
   format and its guides — and its layers, under the render and over it,
   BEC's titles and infos; chosen with the format in any app, laid on the
   stack. Its fields are the author's to confirm (`docs/plan.md`).
4. **M13d — the project as one page** · `bec/project` · S. The 3D app's
   grid and a gabarit's layers saved together as the stack's page; its
   states seen by H, two compared — BEC's scenario played end to end, and
   what is missing fixed.

*Done when:* BEC's grid, made in the 3D app with its keys, is laid under
and over its layers in every format of its gabarit, saved as one page, its
states seen and two compared — and printed at the poster's size.

## Waiting on the author

- Whether it is M13, and when: after S9e and S9f, its brick a first — the
  suggestion.
- The grid in the 3D app, the author's "du contexte de l'app 3d", rather
  than an app of its own.
- The gabarit's fields, now that BEC says what one holds.
- A project as data — layers, palettes, presets and gabarits in the vault
  — with no code that comes from outside.
