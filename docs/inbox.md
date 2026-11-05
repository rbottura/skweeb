# Inbox — ideas as they come

The author's ideas between bricks, in the author's words, dated. Nothing here
is planned yet: an idea waits here instead of starting, so the brick under way
stays one brick.

A session sorts each one before it ends (`CLAUDE.md`, *Ending a session*):

- **onto the plan** — a row on the board of `docs/plan.md`, or into an app's
  `STATUS.md` or `docs/roadmap.md`, and down to *Sorted* with where it went.
  An idea is often a roadmap item already, in other words; sorting is where
  that is noticed.
- **a side job** — marked `side`, its row on the board too. It touches no
  file the item under way touches, fits in one sitting with a check that
  proves it, needs no decision from the author midway, and leaves the object
  model, recipes and core's APIs alone. Every item is a branch since
  2026-10-22 (`docs/workflow.md`); a side job's runs beside the main
  thread's, in a worktree of its own, and never edits `STATUS.md`,
  `docs/roadmap.md`, `docs/plan.md` or `CLAUDE.md`: its commit message says
  what it did, and the main thread folds that in at the merge.
- **parked** — marked, with why.

A sorted entry goes once what it became is done; git keeps it.

## Waiting

Nothing, 2026-11-05: the day's ideas went onto the plan, into
`docs/scene.md` and into the roadmap's *Still open*.

## Sorted

- **2026-11-05 — the motion kept; the vault app's viewer; M13a.** "les
  animations de transitions sont super comme elles sont maintenant"; in
  the vault app, a sequence stretched — `gam_1790189754737_d12aab` — no
  player's controls, no pan or zoom, the fit's margin at the right and the
  bottom; "on peut passer sur la brique M13a rapidement si rien d'autre de
  plus urgent prend la priorité". → S9h landed the same day; M13a next
  (`docs/bec.md`); `docs/decisions.md`, 2026-11-05: the even fit.

- **2026-11-05 — the planned bricks now; BEC again, as a project.** "je
  pense qu'on peut continuer celles déjà planifiées maintenant"; S11's
  bench "très prometteur mais je n'ai pas encore assez utilisé et de
  visions de scénario pour pousser les fonctionnalités maintenant, nous y
  reviendrons très bientôt"; "j'ai très envie de réutiliser le projet BEC
  2025 et les quelques scénarios qu'il a introduits … comment on crée un
  objet de type projet … qui encapsule un objet, ici du contexte de l'app
  3d qui serait la grille 3d de l'app BEC originelle et embarque aussi la
  possibilité de charger les paramètres et leurs évènements … et jouer avec
  les scénarios de couches de textes, les itérations, les sauvegardes de
  versions, la visualisation de ses versions, leur comparaison". → S9e
  next, its proposal as written; S11's version 2 later; M13 proposed,
  `docs/bec.md`, waiting on the author in `docs/plan.md`.

- **2026-11-05 — cluster's vault, beside an app.** "la transition du
  canvas et du panel droit est pas mal. le vault a une sorte de bug jumpy …
  comme s'il se redimensionne d'un coup puis encore une fois pour redevenir
  à la normale"; "un filtrage automatique des objets du vault issus de
  l'app courante ouverte dans cluster puis le reste"; "un cliqué-glissé-
  déposé depuis un objet du vault sur un champ d'input d'objet comme un
  sprite dans fractals devrait être possible"; "les objets de sets de
  legacy grid sont trop petits et redondants avec les folders … est-ce
  qu'on pourrait s'en défaire ?" → S9g landed the same day, the board of
  `docs/plan.md`; `docs/decisions.md`, 2026-11-05: the sets kept, in their
  folder.

- **2026-11-05 — BEC's layers again, the print kept vector, a project made
  by several.** BEC_2025 is the ancestor `core/formats.js` took its formats
  from: "une partie de l'interface servait à ajouter des images avec des
  couches alpha devant le rendu du viewer pour ainsi itérer les versions de
  générations de la grille pour jouer avec la modularité et l'infinité du
  système et sélectionner les images, séquences et lots de paramètres qu'on
  curatait nous-mêmes … ces images sont des compositions de textes donc pas
  idéal car la rasterisation de texte produisait des images de mauvaise
  qualité pour l'impression". Then: "j'aimerais ouvrir skweeb à cette vision
  d'avoir des fonctionnalités soit de chargement de couches overlay issues
  de pdf ou fichiers images comme BEC mais en augmentant la fonctionnalité
  pour l'imprimer sans perdre la qualité vectorielle des données textes,
  voire collaborer en live sur l'appli avec 2 utilisateurs au moins, l'un
  sur une app de composition de texte (ou mise en page) l'autre sur l'app
  de particules ou cluster pour paramétrer le système visuel choisi … un
  troisième qui upload (ou même plus loin, modifie en ligne) sa font
  customisée pour le projet … 2 creative coders, l'un typo et l'autre sur
  des formes graphiques plus illustratives et un 3e étant designer
  graphique qui gère les gabarits des formats, les positions des éléments,
  leur taille". What BEC's layers did, read in its source, is in
  `docs/migration.md`. → the roadmap's *Still open*, 3: what is there
  already and what is missing; a milestone, and when, on the board's
  *Waiting on the author*; BEC's layers by format, a field for the gabarit
  (S8) to weigh.

- **2026-11-05 — cluster seen: one panel, a closer vault, the motion, the
  player's lanes, the space now.** "pour la mise du bench initial je me
  souviens avoir un panel droit avec 2 onglets et une liste de catégories
  dépliables mais tout dans une même section … et minifier la grille des
  objets du vault à gauche … peut-être 3 colonnes ou 4"; "les transitions
  sont assez saccadées on va travailler ça ensemble en pensant selon les
  cas de figures"; a composition of several sequences wanting "des players
  ou des bancs d'intégration de la séquence dans le player … un peu comme
  dans after effect et dans le player du gamepad"; "la vue latérale du
  vault suffit pour le moment, les touches et historiques sont bien, on
  peut les ajouter tout de suite si ça prend pas bcp de temps sinon pour
  plus tard"; "appliquons les corrections à clusters … et commençons le
  bench de l'espace 3d de navigation au plus vite". → S9d landed (the
  panel, the vault); S11 next; S9e the motion, its cases in
  `docs/scene.md` for the author; S9f the keys and the history, after
  S11; S13 the player's lanes, with S9e — the board of `docs/plan.md`;
  `docs/decisions.md`, 2026-11-05.

- **2026-11-04 — the scene, planned before it is built; a vault app; the
  space on its bench; a name.** During S9: "pour la scène modulaire il va
  falloir planifier correctement pour gérer les fonctionnalités qui
  utilisent des contextes de canvas différents et des libs extérieures" —
  2D, WebGPU (filter, fractals), three.js (3d), p5 (the gamepad), MediaPipe
  (the puppet). "Pareil il nous faudra pouvoir ouvrir une app vault pour
  une consultation full screen du vault" — the vault an app of its own, not
  only a panel over another. "Ne pas oublier que l'exploration 3d des
  objets est à expérimenter, sûrement sur un artefact comme mentionné
  hier" — S11's bench. The name: "un mot comme *cluster* ou *nébuleuse*
  … un terme associé à l'espace spatial et qui sous-entend un concept de
  pluralisme d'objet en son sein, peut-être que d'autres termes pourraient
  encore mieux représenter cette idée". → the plan for renderers and
  libraries in `docs/scene.md`, *Planned, 2026-11-04*, confirmed; the
  vault app S9b and cluster S9c on the board of `docs/plan.md`, S11 the
  space's bench as before; the name, *cluster* for now, in
  `docs/decisions.md`.

- **2026-11-03 — the UI, worked out on a bench, and the scene round it.**
  The morning's direction: "la modern UI de vscode en dark avec des légers
  rounded corners et des borders très fine … les menus circulaires, les
  activations de menus par keyboard shortcut … la main gauche sur zqsd ou
  azer comme sur league of legends"; the formats a list, sections smaller,
  sliders optional, "le player … comme la boîte preview d'after effect",
  saving set in order. Then, on the bench: a slider's step five times the
  field's; a row's mark, "modifié depuis la valeur par défaut", and its
  value in every state on Alt click; "le versionning de projet … comme git
  pour un fichier de code", a graph of the states over the page, "les
  fonctions de git de base comme le merge entre 2 branches"; rulers,
  magnetism, F to place, and "un concept de partage de gabarit entre les
  apps"; versions that cross apps, "en stackant les versions in-app ou
  d'une autre manière"; a state opened in another app "si la passerelle le
  permet"; layers of contexts along Z, the bridge's "petits cubes volants";
  and "un moteur de rendu global, un viewer de scène". → M12 in
  `docs/roadmap.md`, its spec `docs/scene.md`, track S on the board of
  `docs/plan.md`; decided the same day (`docs/decisions.md`).

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
  comes before. → `docs/plan.md`, *Waiting on the author*, 2026-10-22, with
  what it would want first: a page's length set by hand
  (`apps/compose/STATUS.md`, *Next*) and ckt's whole words.
- **2026-10-22 — the suite's other apps in OBS.** "ça veut dire donc aussi
  qu'on peut connecter d'autre app de la suite à des scènes obs de la même
  manière non ? c'est à explorer plus tard mais la possibilité est
  intéressante". The puppet showed how: a page with nothing on it but its
  picture, transparent (`&obs`), opened on a smart object and following each
  version the server announces — since M11's live stack stays inside one
  browser, and OBS's is another. Any app could have such a page for what it
  makes: a particle loop over a stream, a fractal behind it, a compose page
  as an overlay, a map's room. Waits on the author: which first, and
  whether it is a milestone. → L9 on the board of `docs/plan.md`, the
  other apps worn in OBS, 2026-10-22: the puppet's way made core's; which
  app first waits on the author.
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
