# Inbox — ideas as they come

The author's ideas between bricks, in the author's words, dated. Nothing here
is planned yet: an idea waits here instead of starting, so the brick under way
stays one brick.

A session sorts each one before it ends (`CLAUDE.md`, *Ending a session*):

- **onto the plan** — into an app's `STATUS.md` or `docs/roadmap.md`, and down
  to *Sorted* with where it went. An idea is often a roadmap item already, in
  other words; sorting is where that is noticed.
- **a side job** — marked `side`. It touches no file the brick under way
  touches, fits in one sitting with a check that proves it, needs no decision
  from the author midway, and leaves the object model, recipes and core's APIs
  alone. It runs on a branch of its own, as `grid/legacy-materials` did, and
  never edits `STATUS.md`, `docs/roadmap.md` or `CLAUDE.md`: its commit
  message says what it did, and the main thread folds that in at the merge.
- **parked** — marked, with why.

A sorted entry goes once what it became is done; git keeps it.

## Waiting

- **2026-10-08 — moving pictures for a newsroom, Blast first.** "try to
  setup skweeb suite to create motion designs just like kielmd did for the
  new york times, or people like him making animation art to illustrate an
  article, display as like a header or for social media posts, but for media
  i'd like to work with that does not do it yet. i have blast in mind … could
  also more mainstream media, more difficult to access i guess". And the same
  day: "If they have illustrations, i dont want to replace the illustration
  by my creation, i can come after, before the title or just after maybe."
  kielmd is Kiel D. Mutschelknaus (@kiel.d.m): for the NYT in November 2019,
  an online animation for an article on gender bias in AI — the brief
  "illustrate with code", his Space Type Generator's Layers made an endless
  succession of pronouns (Eye, summer 2020). Blast's headers are still
  photomontages in a house style, credited article by article, and nothing
  on its site moves. So the piece is the story's own words and figures in
  motion, beside its illustration and never instead of it: ckt's type first —
  whole words, and motion of their own — then a page's length set by hand in
  compose, and a delivery: every format of one page, an MP4 made for the
  web, a poster. Waits on the author: whether it is a milestone, and what it
  comes before.
- **2026-10-22 — the suite's other apps in OBS.** "ça veut dire donc aussi
  qu'on peut connecter d'autre app de la suite à des scènes obs de la même
  manière non ? c'est à explorer plus tard mais la possibilité est
  intéressante". The puppet showed how: a page with nothing on it but its
  picture, transparent (`&obs`), opened on a smart object and following each
  version the server announces — since M11's live stack stays inside one
  browser, and OBS's is another. Any app could have such a page for what it
  makes: a particle loop over a stream, a fractal behind it, a compose page
  as an overlay, a map's room. Waits on the author: which first, and
  whether it is a milestone.

## Sorted

- **2026-10-21 — a VTuber avatar: the slug, worn.** "je veux savoir si on
  peut rapidement créer un système pour créer un avatar de vtubing … un rig
  comme fait précédemment très simple d'un haut de corps comme celui d'un
  escargot ou limace fait de plein de sprites les uns sur les autres comme
  des segments d'un corps en tube, et 2 yeux un peu longs rattachés à la tête
  … l'utiliser via un logiciel tiers ou OBS pour faire un avatar avec mes
  yeux dans les yeux de l'avatar et la bouche sur le visage et l'animer
  légèrement avec mes mouvements de tête"; "si cela nécessite un logiciel on
  peut créer un document de doc ici dans skweeb et y avoir accès dans les
  apps de skweeb pour le lire". Then, the drawing made: "je voudrais mes yeux
  dans un premier temps … mettre le reste sur pause si c'est pas bloquant".
  → the rig's puppet, `apps/rig/STATUS.md`, *The puppet*: the eyes, OBS and
  the head done 2026-10-21 and -22, the mouth next; M9's *later* in
  `docs/roadmap.md`; the guide in `docs/guides/obs.md`, read by
  `core/Guide.js`; decided those days (`docs/decisions.md`).

- **2026-10-06 — layers across apps, live.** "we really need the smart
  objects and a new 'layer' system where i need to be able to test effect in
  filter on my image with a 'composition' in the background or anything in
  vault or open in app … all my skweeb apps as windows with z indexes … to act
  as stacked layer of apps with all common renderer in the middle so we could
  visually stack, with transparency or low opacity" — after
  bgstaal/multipleWindow3dScene, sketched in `docs/layers_ref.png`. And:
  "when in app, creating some particle effect i want to use filter app over
  it, i dont have to open a new tab then paste url and load from vault but
  something more direct". → M11 in `docs/roadmap.md`, the
  live stack and smart objects; the author's three calls the same day —
  windows, opacity and blend, live within one browser (`docs/decisions.md`).
- **2026-10-06 — the smart object, soon.** "we'll soon to tackle the link
  'smart' object between apps very soon." → `docs/roadmap.md`, after M10's
  *So far*: the `skw` type, specified in `docs/object-model.md` since
  2026-09-21 and not built; its first step the spec moved to a file of its
  own, the object model being at the cap; its bricks laid out with the
  author when it starts.
- **2026-09-30 — the suite as a game editor, a room first.** "Using these
  apps as vfx and assets editor for a little game, so also game editor with
  map editor, some physics, something like pokewebkit … a space editor where
  i can create my room at home, place items, allow interaction with them
  like posters, pc, toys etc." → M8 in `docs/roadmap.md`, the map editor,
  after M7 is finished; settled the same day (`docs/decisions.md`).
- **2026-10-02 — a character, rigged: the slug.** Asked on 2026-09-27 —
  "can we do armature or 2d sprites to animate them like in 3d with weight
  calculation like in blender etc. ?" — and completed: "a caracter (and later
  characters) that is like a snail slug human shaped character … it has
  articulated arms and legs and 2 long eyes, i like that each part is compose
  of multiple layers of brush 8 so the movement of body and body parts is
  like scales parts of a reptile" — drawn as `gam_1790893329227_77f756`.
  → M9 in `docs/roadmap.md`, the rig, rigged at its marks, between M8's
  bricks 3 and 4; settled the same day (`docs/decisions.md`).
