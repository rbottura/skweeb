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

### Planned, 2026-11-04 — confirmed the same day

Asked during S9: "il va falloir planifier correctement pour gérer les
fonctionnalités qui utilisent des contextes de canvas différents et des
libs extérieures", a vault app "pour une consultation full screen", and
the space of objects tried first on a bench (S11). What S9's first bricks
found, and what follows from it:

- **The canvas is already one kind.** Every app on core's kit draws its
  viewer on a 2D canvas: filter and fractals get an ImageBitmap back from
  the GPU kit, the 3D app from three's renderer on an OffscreenCanvas. The
  GPU device (`core/gpu/`) and the 3D renderer (`apps/3d/renderer.js`) are
  one a page, opened once and kept — a mount after another costs nothing,
  and an unmount lets go of its own textures and pipelines, never the
  device. So the scene's fixed canvas can be one 2D canvas, handed to the
  app it mounts — `mount(host, { canvas })` — in place of the one it makes
  alone. Item 3 above, answered: the first of its two ways.
- **The libraries, by what they hold.** Lit: components in the page's DOM,
  each gone with its node. three.js: the one renderer, kept; a model's
  geometries and materials disposed at unmount. MediaPipe and the camera
  (the puppet): the landmarker closed and the camera's tracks stopped at
  unmount — the light goes off. p5 (the gamepad): out of the scene until C6,
  as above; its page alone as ever.
- **Between two apps**, the canvas keeps the last frame of the one going
  until the next draws its first, so the centre never flashes empty; the
  panels leave and come as the bench has them.
- **The vault, an app** — `apps/vault/`: VaultPanel full screen, its grid,
  folders, kin and detail, the canvas showing the object chosen. In the
  scene, the app that is open when nothing else is.
- **The space** — S11's bench first, on an artifact as the bench was: the
  objects of the vault in 3D, its parameters and its small tests, before
  S10 builds it in the suite.

The order, the author's yes the same day — "je confirme, continue sur les
prochaines étapes": S9 goes on — every app a module, the 2D ones first
(particles, grid, ckt, compose, map, rig), then filter, fractals, 3d, the
puppet; then the vault app; then the scene's host — the canvas handed over,
the last frame held, the panels moving; S11's bench beside it; S10 last.
The scene's name: ***cluster***, the author's word "pour l'instant" — a
word of space that holds many objects; its host `apps/cluster/`.

**Rule 7, settled by the author the same day**: "nous devons garder la
possibilité d'avoir les apps en onglet indépendantes ou alors une scène
générique qui peut être la *skweeb absolute scene*, l'application skweeb
principale et organique, nous trouverons peut-être un meilleur nom". Both,
then: every app its own page, and the scene one more host, never the only
one — CLAUDE.md's rule 7 says so since. The name: *cluster*, for now
(2026-11-04, `docs/decisions.md`).

### *cluster*, brick by brick — 2026-11-05

The host first (`scene/cluster`, landed 2026-11-05; `apps/cluster/`): a
strip naming the apps, one mounted at a time through its module, the vault
first. The app is the address's fragment, `#particles`, so what the query
asks — `?open=<id>` — stays the app's, as on its own page, and a page that
sets its query to go back to a state reloads into the same app; a switch
asked during a boot waits for it; an app's stylesheet loads before its
nodes are built, so it is never seen without its layout. In this brick each
app keeps its own canvas and its own layout. Then, a brick each:

1. **An app back as it was left** (`scene/kept`, landed 2026-11-05): what
   it was doing — the recipe it would save, the frame, whether it played —
   and the smart object it is bound to, left at a switch and given back at
   its next mount as an object asked for; what the address asks goes first.
   Its steps start again.
2. **The links taken in place** (`scene/links`, landed 2026-11-05): *Open
   in … ↗*, *Place in compose ↗*, *Rig this ↗*, the graph's open-in and the
   stack's saved page, followed through core (`core/reopen.js` `follow`),
   mount that app in the scene with the link's query, where alone they open
   a tab; the app left comes back as it was.
3. **One canvas, fixed; the last frame held** (`scene/canvas`, landed
   2026-11-05): the bench's layout, the author's yes — the strip, the
   scene's vault, the viewer, the properties, an app's panels a tab each —
   every app's parts laid in the scene's grid as they are (`display:
   contents`), so its viewer is in one place to the pixel; the frame of the
   app going held over its canvas until the next draws its first. Each app
   keeps its own canvas: weighed in the brick, handing one element over
   would have made the apps' listeners on it — seven `pointer.js`, ckt's
   own — the classes they set on it and its 2D state the scene's to undo,
   for a picture the eye cannot tell apart.
4. **The panels leaving and coming** (`scene/panels`, landed 2026-11-05),
   as the bench's `swapping`: the properties out to their side and faded,
   the app going taken out once they are gone, the next app's in; the
   viewer and the vault still. S9c done.
5. **The properties one panel; the vault four columns** (S9d,
   `scene/props`, landed 2026-11-05). The author, on S9c: "un panel droit
   avec 2 onglets et une liste de catégories dépliables mais tout dans une
   même section", and the vault's grid "minifier … peut-être 3 colonnes ou
   4". So the tabs are the panel's head, its Reset at their end, the app's
   sections fold in it with a hairline between and a chevron, the height
   moving; the vault a grid of pictures, four columns, its density three
   tokens of core's vault panel the scene sets.
6. **The scene's vault, beside an app** (S9g, `scene/side-vault`, landed
   2026-11-05). The author, on S9d: "la transition du canvas et du panel
   droit est pas mal", but the vault "jumpy … comme s'il se redimensionne
   d'un coup puis encore une fois" — its stylesheet came with each app's and
   went with it, so between two apps it had none: the scene's now. Then
   "un filtrage automatique des objets du vault issus de l'app courante …
   puis le reste": the app's own first, a line naming each part, the cards
   sliding to their places (`core/flip.js`). An object dragged from it onto
   a field that takes it — "comme un sprite dans fractals" — every field
   that would lit, a folded section or a tab over one opening as the drag
   rests on it (`core/vault-drag.js`). And the legacy grid's sets, "trop
   petits et redondants avec les folders": kept, grid's materials, each in
   the folder of exactly its tiles, first, across the grid.

### The motion, case by case (S9e) — asked 2026-11-05

The author, on S9c: "les transitions sont assez saccadées, on va
travailler ça ensemble en pensant selon les cas de figures quels sont les
éléments qui transitionnent et lesquels ne bougent pas, et lesquels
s'adaptent … le viewer ne devrait quasiment pas bouger entre 2 apps, les
règles toujours ou adapter avec une animation, d'ailleurs tout élément qui
transitionne même très légèrement doit avoir une animation aussi fine et
rapide soit-elle selon le cas de figure, pareil pour adapter le player en
circonstances". The jolt today is the middle of a switch: the panels out
(240 ms), then everything else of the next app in one frame — its title
bar's acts, its viewer's head, its rulers, its picture at its own size, its
player or none, its status bar — then the panels in (240 ms). Seen
again by the author after S9d: the canvas and the right panel's way "pas
mal"; the vault's jump was its stylesheet (S9g).

Three kinds of element, the proposal to go through:

- **Still**, never moving nor fading: the strip, the scene's vault, the
  frames — the viewer's, the properties' box and its tab bar, the title
  bar's and the status bar's. The properties' box is the app's today: the
  scene's, it would stay while what is in it changes.
- **Adapting**, the same element given a new value, animated in place:
  the picture's frame, from one app's format to the next — the frame held
  moves and resizes into the next canvas's place, then gives way to it; the
  rulers, always there, the vault app's too, their numbers following the
  format; the player's strip, always there, its controls coming or going
  with the sequence; the chosen tab's underline sliding to its tab.
- **Going and coming**, what one app has and the next has not: its panel's
  contents, its viewer head's own buttons, its title bar's acts, its status
  bar's words — each a short fade, the panel's with a slide, the next
  app's coming as soon as it is built rather than after a wait.

**Its first pass** (`scene/motion`, landed 2026-11-05, the proposal as
written — "on peut continuer celles déjà planifiées"): the scene draws its
own frames under the app's boxes, the same as them (`apps/cluster/frames.js`)
— the title bar's line, the viewer's box with its head, its rulers' bands
and its player's strip, the properties' box, the status bar's line — so as
one app goes and before the next is built, no box blinks; the brand and the
search are the scene's, only the app's name and acts change. What is in
the boxes goes and comes in 160 ms — the title bar's acts, the viewer's
head, the rulers' marks, the player, the status bar's words, the tabs —
the panel's contents slide out and in inside a box that holds still. The
frame held moves onto the next picture at its size, its own covering the
changing box, and the two cross (`held.js`); the chosen tab's underline is
one, sliding; a panel shown by its tab fades in; the player's strip is
always there, empty where nothing plays (`motion.css`). Left for the
author's eye: the next app's contents wait for its boot to come in; the
rulers' numbers and the viewer's own tools go and come rather than adapt.

The cases: a still to a still (grid → fractals), a still to a sequence
(grid → particles) and back, a sequence to a sequence of another length,
to and from the vault app, an object opened in the vault beside, a link
taken in place, Back, a tab of the same app, a switch asked mid-switch;
less motion asked of the system, none. And the one the author names as a
problem: **a composition of several sequences** — one player, where "il
faudrait aussi des players ou des bancs d'intégration de la séquence dans
le player pour visualiser ou modifier un objet qu'on souhaiterait
modifier, un peu comme dans after effect et dans le player du gamepad" —
the player's lanes, S13: each sequence placed a lane under the player's
ruler, its start and its length, the one chosen opened there to be seen
alone or changed, as After Effects' layers in its timeline and the
gamepad's stack of clips (`apps/gamepad/ui/TimelinePanel.js`).

**The space viewer gets a bench of its own first (S11).** The author, on
version 6: "le viewer 3d est excellent, c'est quelque chose qu'il faut que
j'explore absolument" — but the pan takes the clicks, the wheel is not
smooth, what can be clicked is not clear, and layers too close on Z cover
one another. The bridge's animation is kept, playing "de manière permanente
comme une petite loop infinie" while the space is open. A bench of its own,
"avec son lot de paramètres et de petits tests", since the vault itself is
to be explored this way soon.

Its bench, version 1 on 2026-11-05, the author's "au plus vite":
https://claude.ai/artifact/W6qyTQ6hG45rkaLWD4nwYL — private, the author's;
its source the published files, `space-bench.html` and five `sb-*.js`. The
vault's objects, shaped as the index's rows, each on the layer of the app
that made it — or the author's own vault, read from its folder in the
browser and nowhere else. What v6 lacked, answered: a press that does not
move is a click, one that moves turns the space (Shift, the right button
or Space held: moves it); the wheel eased, settling on a layer, the depth a
ruler under the space to travel along; what is under the pointer lifted
and named, what a click does said in the status bar; the layers in front
of the one gone to seen through, staired and faded, a parameter each. The
passage loops along the chosen's bridges, or down a chain of seven apps.
Five small tests, a question each; the author's settings kept in its store
(`kept`), as the first bench's were.

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
| S11 | the space viewer's own bench: its parameters, its small tests | — | before S10, a side bench |
| S12 | the bench's shell in every app, ahead of S8: title bar, the player under the viewer, hints | `ui/shell` | — |
| S13 | the player's lanes: a composition's sequences a lane each, one opened there to be seen or changed | `compose/lanes` | compose's timeline |

S12 came forward on the author's word of 2026-11-03 — the bench's
interface is what every app should have first — and with it the
components' one library, Lit (`docs/decisions.md`). S8 followed: rulers,
guides and the magnet in every viewer, F in particles; the gabarit, a vault
type, waits on the author.
