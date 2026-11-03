# The scene — M12

One canvas in the middle, the suite around it. The milestone the author asked
for on 2026-11-03, after a day on a bench: "un moteur de rendu global, un
viewer de scène, donc que les panels s'animent en sortant de l'écran ou
changeant dynamiquement pour s'adapter au nouveau contexte chargé, une forme
de fusion inter app avec au centre le canvas qui ne bouge pas comme objet
central de toutes les apps de la suite et le reste qui s'adapte autour" —
the apps still open in tabs, "connectés dynamiquement par les objets
connectés". Planned that day, to start after the session's reset at 15:40 as
one large refactor, brick by brick: track S on the board of `docs/plan.md`.

## The bench

Everything below was tried first on a page apart from the suite:
https://claude.ai/artifact/JsZT1PpgNTBYpuMAaWmaZm — private, the author's,
version 6 on 2026-11-03. Its source is the artifact's published files,
`skweeb-bench.html` and twelve `bench-*.js`, read with the Artifact tool
(`read`, with `path`). It is a prototype with its own copy of particles'
schema and a stand-in for grid, never code to move in as it is: each brick
below builds the thing on core's kit, from the schema (rule 1).

What the author kept of its settings is in its database (`kept`) and became
its defaults: dark, accent violet, corners 9 px, borders 7.5 %, contrast 5,
IBM Plex, properties in two tabs, sliders where the schema marks them.

## What the bench settled

The author's, 2026-11-03, each tried before it was kept.

- **The look** — U10's description: "entre la modern UI de vscode en dark
  avec des légers rounded corners et des borders très fines et des niveaux
  de contrastes fins entre les éléments". Neo-brutalism goes. Surfaces are
  steps of one lightness, borders a white alpha, one accent; a frame round
  floating panels, a title bar above, a status bar below that says the keys
  of what is under the cursor.
- **A value is one line** — dragged (Shift ×10, Ctrl ×0.1), typed (a sum
  works), stepped by the arrows; a fill shows where it sits in its range:
  "rend l'usage d'un slider traditionnel obsolète". A slider is a second
  line where the schema marks it, with Alt held over a section, or pinned
  by Alt click; its step five times the field's, "pour aller plus
  rapidement à une valeur ronde". The schema gains `unit`, `slider`,
  `more` — rows folded under *n more* — and `pair`, two values on one row.
- **A row's mark** — a hairline in the field's tint; a dot when the value
  differs from its default, "modifié depuis la valeur par défaut", the
  section's count beside its title; a ring when the value changed across
  the object's states. Alt click on the mark: its value in every state,
  hovered drawn, clicked taken — "je pourrais dans ma v5 choisir
  facilement la valeur d'un paramètre que j'aimais bien en v2".
- **The left hand** — "avec la main gauche sur zqsd ou azer comme sur
  league of legends". Keys by place (`event.code`), the right hand on the
  mouse: the cursor says where, a key says what. Hold A Z E R F for a pie,
  move toward a choice, let go; a tap does its first act — the app's own
  (particles: the emitter), the view, export, again (a new seed, revert,
  reset), place. Q D frames, S save, Space play or pan, Tab the panels, X
  reset what is under the cursor, G ground, H the states, ² the search —
  every control and act by name — Ctrl K too. Ctrl Z, Ctrl S keep their
  letters.
- **The player** as After Effects' preview: first, back, play, on, last,
  loop; a timecode; the fps a list; the loop's length; a ruler to scrub.
- **Saving, in the author's order** — the project: S, the next state of
  the same object; into the vault: a still, a sequence; to disk: the
  picture, every frame for a video, a sprite sheet; the print. L10's S
  then 1 2 3 is folded in: E, tapped, opens this menu, its digits pick.
- **The format** a list of every format, grouped; width × height on one
  line, linked and swapped; no slider.
- **Rulers, guides, magnetism** — guides drawn out of the rulers and back;
  the selection (particles: the emitter, the fields' centre) snaps to the
  edges, the centre and the guides, Ctrl held none; F puts it at the
  centre, an edge or a corner.
- **A gabarit** — a format and its guides as one object, made for that
  format: "il disparaîtrait" when the format changes, laid again "en
  pourcentage ou les mêmes valeurs en pixel", or with its own format.

## States, and their graph

- **An object is a tree of states** — "il ne faut pas qu'à chaque pression
  de S il y ait un nouvel objet dans le vault mais plutôt qu'on sauvegarde
  un nouvel état d'un objet … comme git pour un fichier de code". A state
  is its values; its parent, the state it was made from; saved from an
  older one, a branch. The session's steps are the same thing held in
  memory, so going back costs nothing: Ctrl Z and Ctrl Y walk them, a click
  in the History panel jumps. Today's smart objects keep versions in a
  line (`server/versions.js`); a parent each makes them a tree — a field
  in `docs/object-model.md`, the author's to confirm.
- **Merge** — two states picked with Shift click, compared side by side;
  one receives, one arrives, swapped by a button. What only the arriving
  one changed is taken, what only the receiving one changed is kept, and
  a conflict keeps the receiving one's value until the other is picked,
  row by row — "en gardant la priorité des valeurs sans conflit de la
  branche qui reçoit". A merge is a state with two parents.
- **The graph, over the whole page** and see-through, so the page behind
  draws what is hovered (Shift held, nothing is): a 2D space, panned and
  zoomed; v1 at the bottom and the newest at the top, or left to right;
  each state a node with its picture, wired to its parent. Clicked, you go
  back to it; A over one, the apps its links reach (`core/uses.js`), the
  others greyed with why.
- **Across apps, two levels** — an object's own states, in the app that
  made it; and the lineage between objects: what another app made names
  the state it came from, `parents: ["skw_torch@v3"]` (L2 already writes
  `@vN`). Each app keeps its own recipe's states, the vault links them;
  a merge stays inside one object.
- **The space of contexts** — "le plan 2d que nous voyons là est la couche
  particles de l'objet"; a state another app took has a layer behind it,
  drawn as a card under its card. Alt click opens the layers in an
  orthographic space and stays there; the wheel travels along Z; a click
  enters a layer, the page behind taking its context. Each layer a plate
  named for its context, the Z axis drawn, and the bridge — the same object
  in two contexts — a link along Z whose passage is drawn: particles to
  grid, "des petits cubes volants s'aplatir dans une surface grillagée et
  coloriser les cellules". In time "un mode de navigation parmi tous les
  objets présents dans le vault et les fonctions des applications".

## The scene

One host page: the canvas fixed in the middle, an app mounted round it,
its boxes — U8's — leaving and coming back as another app's context comes
in. The bench does it for particles and a stand-in grid. Tabs still work:
each app's own page mounts it alone, and the windows stay linked by the
live stack (`core/live.js`) and the vault.

What it asks, in this order:

1. **The boxes** (U8): what is mounted anywhere can be swapped.
2. **Every app a module** — `mount(host)` and `unmount()`, giving its
   boxes and its renderer; its `index.html` mounting it alone. There are no
   globals to untangle: rule 8 already holds.
3. **One canvas for every renderer.** A canvas cannot go from 2D to WebGPU,
   and filter and fractals draw with WebGPU, 3d with three.js. So each app
   hands the scene an ImageBitmap — the GPU kit does already — drawn on one
   2D canvas; or a canvas a renderer, stacked in the same place.
4. **The gamepad** stays outside until C6: it is p5's.

**Open, the author's**: rule 7 says the suite is "not a shell that owns the
page". The scene keeps it true as one more host, never the only one — "on
garderait quand même la possibilité d'avoir des apps ouvertes dans des
onglets". Rule 7 reworded so before S9, or S9 waits.

## The bricks

Track S on the board, in this order; each a branch, landed after the gate
(`docs/workflow.md`). What each one changes on screen changes in every app
at once, so every browser check runs at each gate.

| | brick | branch | takes up |
|---|---|---|---|
| S1 | the dark theme, from the bench's tokens | `ui/theme` | U10 |
| S2 | a value on one line: the field, its fill, its slider, its mark | `ui/rows` | U2 |
| S3 | the shared boxes as the bench has them: export in order, the player | `ui/boxes` | U8a, U8b, L10 |
| S4 | Format and Ground mounted anywhere; the format a list | `ui/boxes-format` | U8c |
| S5 | the left hand: keys by place, pies, the search | `ui/keys` | U3 |
| S6 | an object's states as a tree, and the session's steps | `layers/states` | L7 |
| S7 | the graph over the page: compare, merge, open in | `ui/graph` | — |
| S8 | rulers, guides, magnetism, placing; the gabarit | `ui/guides` | — |
| S9 | every app a module; the scene, one canvas | `scene/host` | U11 |
| S10 | the space of contexts, and the bridge | `scene/space` | — |
