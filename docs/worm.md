# The worm — the game's avatar, its phases and the bond (M16, taken up 2026-11-18)

The author, 2026-11-18: "je veux créer un ensemble d'outils pour servir la
création graphique et mes idées de jeu. maintenant j'ai envie de créer un
personnage qui est un ver" — on two legs and two arms, its eyes a snail's,
as the puppet's worms are, or "un ver simple sans membre qui ondule et se
déplace à l'intérieur de la matière". In 3D, "proche d'un dessin fait au
gamepad et transformé par loft en 3D", with "un ensemble d'expression du
visage et mouvement du corps riche et complexe". The whole idea, in the
author's words, is in `docs/inbox.md`, *Sorted*. Then, the plan read:
"go M16, all gas no breaks".

It is the suite's aim since 2026-09-26 — the assets of a small game — and
its decision of 2026-11-13, *the game's engine is the suite*
(`docs/vfx.md`, *Settled* 6), taken into 3D.

## What it is

- **The avatar**: a worm, its body a gamepad drawing lofted (G4), alive on
  its wave (G6). Later its face — eyes on stalks, lids, a mouth — and its
  limbs.
- **The world**: a planet, "une sphère comme sur mario galaxy, mais plus
  grande si en terme de performance on peut se le permettre", walked in the
  third person, "vu tps d'assez haut". Or swum just under its skin, "comme
  un ver de dune, qui fait une bosse en surface suivant la courbe de son
  corps".
- **Phases**: places "des réalité temporellement et spatiallement éloigné
  mais 'phasé' dans sa réalité", each marked by a worm frozen in space-time;
  reached by **the bond** — "le saut" — through a wormhole.
- **Gears**: five to seven evolutions, "principalement des effets de shading
  et d'accésoires".
- **Garden's ideas later**: "les idées passé dans garden servirons également
  à l'avenir" — flowers grown on a planet.

## The phase, as the author sees it

"notre avatar se fige, la caméra centre les 2 corps dans le cadre, un lien
'spectrale' se forme entre les 2 corps comme la série de frame de la
séquence de morphing du corps A vers B et B vers A, notre corps devient un
coquille vide légèrement transparente quand la phase se concentre en B et
inversement". And its passage, asked how it is made: "plusieurs vas et
viens très rapide, 3 ou 4 ou plus et se fix sur B pour un passage de A vers
B dans le 'pont spectrale' qui relie les 2 entitées".

1. **In B's radius** — a ring on the ground round the frozen worm — A
   stops: its wave holds where it was, its keys let go of.
2. **Framed**: the camera leaves A's back and eases to where both bodies
   fill the picture, side by side, seen from above.
3. **The spectral bridge**: the morph from A to B, its in-between frames
   laid on an arc from one body to the other — a chronophotograph, Marey's
   — each a ghost, lit as the phase passes it.
4. **The swings**: the phase, 0 at A and 1 at B, goes there and back
   `swings` times, fast, then fixes on B. Whichever body it leaves is a
   shell, seen through, its edges lit; whichever it reaches fills.
5. **The bond**: B is played, the camera behind it, the world B's reality —
   its ground, its sky. A stays behind, frozen, a shell: the way back.

## How it is made

- **A body on a sphere.** Its up is the planet's normal where it stands;
  its heading turns about that up; a step carries it along the great circle
  ahead — a turn of the whole frame about `up × forward`, so the frame never
  drifts off the ground. The body hangs in that frame: the drawing's x its
  forward, its y its up, seen from the side — or its y its side, seen from
  above.
- **Its wave by the distance walked**: the phase of G6's wave is the
  distance over a wavelength, the crests still on the ground as the body
  slides through them — a snake's way. Standing, it holds; frozen, for free.
- **The camera** sits behind and above in the walker's frame, its up the
  walker's, eased each frame toward where it should be.
- **The morph.** loft.js lays each stroke as rings of `segments` points.
  Both bodies' rings, resampled to as many rings by their length and as
  many points round, match point for point: any in-between is a mix of the
  two, and the ghosts are those mixes, `k / (n + 1)` of the way.
- **A shell** is a material of edges: bright where the surface turns away
  from the eye, see-through where it faces it — a *fresnel*, the word to
  search by — added, so a shell is light, not matter.

## In skweeb: what is there, what is missing

| the game's | in skweeb today | missing |
|---|---|---|
| the body | a drawing lofted (G4), its skin (G4b), its brush round it (G10); with none, loft.js's own worm | its rings for a morph |
| its motion | the wave along it (G6), a loop that closes | the wave by the distance walked |
| the world | three.js on the page's GPU device (`apps/3d/renderer.js`) | a planet, its gravity, a camera that follows |
| the game's words | the map's player: things, events, a warp followed and back (M8) | a phase, a bond — in 3D |
| effects | the shader app (M15); particles | surfaces on meshes — a rim, a noise of three axes (M16f) |
| a face | the puppet: eyes and mouth from the camera (M9) | in 3D |

## The bricks

The first two are the draft the author asked to test quickly; the rest
wait their turn, in the order the author picks.

| | brick | branch | size | done when |
|---|---|---|---|---|
| M16a | **the planet walked**: a sphere, things on it; a worm on it — a drawing lofted, waving as it goes — ZQSD, WASD, the arrows or a stick; the camera behind and above | `3d/planet` | M | **landed 2026-11-18** — below; `check-3d-play`: alone on loft.js's worm, walked round, on the ground, the camera behind it |
| M16b | **the phase**: a frozen worm and its radius; the camera framing both, the bridge of the morph's frames, the phase swung and fixed on B; the bond, B played in its reality, A left a shell | `3d/phase` | M | **landed 2026-11-18** — below; `check-3d-phase`: walked in, swung, bonded, and back |
| M16c | **under the surface**: the worm swims beneath, the ground raised along its body; a dive in and out, a speed for each | `3d/dune` | M | **landed 2026-11-18** — below; `check-3d-dune`: dived, buried, walked under, up again, no phase under |
| M16d | **the window**: a frozen worm showing its reality — what a camera there sees, drawn in its silhouette | `3d/window` | M | later |
| M16e | **the bond as a game**: a QTE while B's reality opens | `3d/bond-qte` | S | later |
| M16f | **surfaces on meshes, and the gears**: generators of a position, a rim; a gear a state of the avatar — its shading, its accessories at a ring | `3d/gears` | L | later; the inbox's *generators in 3D* |
| M16g | **the face**: eyes on stalks, lids, a mouth; an expression a state of its values, the puppet's camera able to drive them | `3d/face` | M | later |
| M16h | **the worm on limbs**: a stroke a limb, bones by stroke — the rig in 3D | `3d/limbs` | L | later |
| M16i | **a bigger planet**: detail near the eye, a cube-sphere in chunks | `3d/planet-lod` | M | later |
| M16j | **a world saved**: its planet, its worms, its phases, an object — as a map is | `3d/world` | M | later; its type the author's |
| M16k | **the heart reached**: six ways in, a hole each; a cut through four, seen flat, the worm its drawing in it, moved up, down, left, right; the heart's hollow walked inside, a wider field; and out again | `3d/heart` | M | **landed 2026-11-18** — below; `check-3d-heart`: down the north, walked in the heart, up by another |
| M16l | **the matrix**: a sphere floating in the heart, translucent, viscous; inside it, the planet's things itemized — a stone, a tuft | `3d/matrix` | M | **landed 2026-11-18** — below; `check-3d-heart`: seen from the wall, amber, its things drifting |
| M16m | **an item found**: an item and its nature — a legacy brush, one of the family's 17, lying on the ground — picked up; the inventory, what the worm carries | `3d/found` | M | **landed 2026-11-18** — below; `check-3d-play`: three on the ground, one walked into, carried |
| M16n | **drawn in the heart**: the gamepad app itself, off p5 (C6), the brush found its brush; the drawing put in the matrix; found on the ground in 3D, lofted | `3d/drawn-heart` | M | after C6 |
| M16o | **the heart weightless**: floating round the matrix, both framed, ZQSD; aimed by the pointer, a mouth found on the wall, a click into it | `3d/weightless` | M | **landed 2026-11-18** — below; `check-3d-heart`: floated round, aimed, out by a mouth |
| M16p | **the appendage**: from the matrix to the worm, the heart's control — an item put in, taken out; what else it changes, the author's later | `3d/appendage` | M | next |
| M16q | **the embellishments**: the animations left for later — into a mouth and out of it, and what else waits for one | — | — | later, a batch: the author's |

## The planet walked — M16a, landed 2026-11-18

`/apps/3d/play/`, and `?worm=<id>`: a gamepad drawing, lofted with
loft.js's rows at their defaults, or a model's drawn body with the rows the
author gave it there, its colour or its skin. Its rows in four drawers —
the worm, its walk, the planet, the camera — tuned by hand.

- **The parts**: `walker.js` the body on its sphere; `follow.js` the camera;
  `worm.js` the body lofted, hung and waved; `planet.js` the ground, its
  things and its light; `hands.js` the keys and the stick; `main.js` the
  module and its frame. Pure but `hands.js` and `main.js`: Node holds them
  (`tests/3d-play.mjs`).
- **loft.js says where its rings lie** — `userData.bodies`, each stroke's
  first point, its rings, the points round each, its line's length — so
  the worm finds its head without the drawing, and the phase will find its
  rings to morph.
- **One renderer for the page**, the 3D app's: the planet drawn into its
  OffscreenCanvas, the picture handed to the viewer's canvas through
  `bitmaprenderer`, never copied. At most 1920 pixels along the longer side.
- **Toon in three bands**, as the 3D app's style draws them; the ground's
  patches six long waves round the planet, its things a seed's.
- **Left for later**: the things are not in its way, nor the camera's; the
  stick turns the worm, it does not steer it by the camera; no shadows.
  (It hung on the ground's tangent, its ends off a small planet: laid on
  the planet's curve since M16c.)

## The phase — M16b, landed 2026-11-18

A second worm, frozen: `other` — a drawing, a model's drawn body, or
loft.js's own in `otherColour` — `away` units from the start, `bearing`
round, facing back. A shell from the first, its radius a ribbon breathing
on the ground. Its reality is two colours, `otherGround` and `otherSky`:
by default a night to the planet's day.

- **The passage** (`phase.js`): framing, 0.9 s; the swings, `swing`
  seconds for `swings` there and back and over once more, each half a
  cosine, so the last comes to rest on B; held 0.7 s; bonded. The hands let
  go of — Z held, nothing moves — and the camera square to the line
  between the two, above its middle, on the side it was on
  (`follow.js` `aimBetween`).
- **The world holds its breath**: dimmed as it frames — its sky, its sun,
  its sky's light — so the spectral light shows; held on B, it turns to
  B's reality and brightens again.
- **The bridge** (`morph.js`, `bridge.js`): each body's longest stroke read
  as its rings, tail to head, its head ahead whichever way it was drawn;
  both resampled to 48 rings of 24 points; `ghosts` mixes between, each a
  tube on an arc over the ground, raised at the middle, turned between the
  two; each lit as the phase passes it, so the swings run along it.
- **The shell** (`spectral.js`): a node material, three's TSL, drawn by
  WebGPU and WebGL2 alike: the light at a point how far its normal turns
  from the eye, added; the body under it down to an eighth of itself.
- **Bonded**: B walked, from its rest; A left a frozen phase where it
  stood, its radius round it — the way back, the same passage the other
  way, A's reality again. Not at once: the walked worm leaves every radius
  first.
- **Left for later**: only the longest strokes are morphed — limbs wait for
  M16h; the bridge is an arc in the air, not on the ground; a reality is
  two colours — its own place and time is the window's and a world's
  (M16d, M16j); the passage is watched, not played (M16e).

## Under the ground — M16c, landed 2026-11-18

The author, after a and b: "on aura une vitesse de déplacement surface et
une vitesse sous-surface (enterré), et une animation de plongeons pour
passer de l'état en surface à enterrée et inversement". Space, or the
pad's first button: down, and up again. Its rows in *Under the ground*,
at size 1, growing with the worm.

- **The dive** (`dive.js`): a path as long as the body, followed head
  first — off the ground in an arch `leap` high, steeply into it, level
  again under — each point as high as the path is where that point has
  come to along the ground, so the body pours through the one hole its
  head made. Played, not held: it carries the worm its path and its own
  length in `plunge` seconds, the hands only turning it. Up, the same path
  the other way, its head out first.
- **Under**: every ring's back `depth` under the ground — a body drawn
  arched swims level, its wave its own — walked at `under` units a
  second; on the ground, at `speed`.
- **The ground raised** (`dune.js`): a patch over the planet's where the
  worm is, each point raised by the rings under it — a bell its girth and
  `spread` wide, `ridge` high, as much as each ring is under; deeper,
  lower and wider. In the ground's own material and shades, darker along
  its crest in a band: three bands of toon flattened a gentle rise.
- **The planet's curve** (`bend.js`): the worm and the patch laid from the
  tangent onto the sphere — as far round, as high over.
- **For now**: no phase is passed into under the ground, nor on the way —
  the camera frames two bodies in sight; come up in a radius, the passage
  begins.
- **Left for later**: the ground closes behind it at once — no furrow, no
  trail; the things stand where they were, the ridge under them; the
  camera does not go down with it.

## The heart — the author's, 2026-11-18

"Les prochains steps sont bien mais on les met en pause pour
l'introduction de nouveaux éléments en priorité : la planète a un cœur,
une zone creuse en son centre, atteignable. Pour y accéder, 6 points
d'accès, 2 aux pôles nord et sud, et 4 sur l'équateur, répartis à égale
distance à chaque 90 degrés du cercle de l'équateur. Cela revient à
sectionner la planète en 3 plans, un par axe, et chaque plan connecté à 4
points d'accès en surface. Entrer dans un point d'accès passerait la vue
en 2D, une vue section de la planète avec l'avatar en 2D ; au joystick les
déplacements passent en avant haut bas gauche droite, et pour les
commandes clavier c'est à tester : Z vers le haut et S vers le bas, Q et D
toujours gauche droite. Une fois sorti dans le cœur, (draft) on repasse en
3D, fov plus large pour un espace plus réduit ; on trouve une sphère
flottante translucide en plein centre (matrice de planète) qui semble
faite d'un liquide visqueux, présentant flottant à l'intérieur la version
itémisée des éléments qu'on peut trouver sur et dans la planète — si il y
a des rochers en surface, on trouverait un petit rocher flottant dans le
cœur, etc. Une action dans le cœur serait de pouvoir y déposer des items
qu'on trouve dans le monde : on peut trouver une des formes des legacy
brushes en surface, activer le gamepad dans le cœur, dessiner avec le
motif, placer le motif dans la matrice, puis retrouver la forme dessinée
en 3D en surface."

And, the heart seen: "1. La famille legacy brushes, 17 items dedans.
2. J'aimerais réutiliser l'app gamepad elle-même, elle doit être
retravaillée pour fonctionner sans p5, peut-être que c'est le moment de
faire cette transition maintenant. Suite : dans le cœur j'aimerais qu'on
soit dans une forme d'apesanteur autour de la matrice, une forme d'orbit
control qui cadre à la fois l'avatar et la matrice dans le même champ, et
ZQSD pour contrôler la caméra orbitale qui regarde toujours la matrice,
deux degrés de liberté. Ce qui fait que notre avatar serait détaché de la
paroi ; donc pour repartir dans un tunnel par un trou, il faudrait un mode
de vue où on contrôle le regard de la caméra par le pointeur de la souris,
on vise un trou sur la paroi, puis un bouton d'action pour partir dedans,
avec une animation probablement — pas urgente, pour plus tard, dans un lot
de tâches d'animations d'enjolivement. Trouver un item en surface implique
plusieurs nouveaux éléments : l'objet item et sa nature, le concept
d'inventaire, et dans le cœur, un appendice reliant la matrice à notre
avatar comme interface de contrôle pour ajouter / retirer des items, faire
des modifications qu'on précisera plus tard."

## The heart reached — M16k, landed 2026-11-18

- **Six ways in** (`access.js`): the planet's three axes, both ways — its
  north and south, four round its equator a right angle apart — turned so
  the start stands as far from all as it can, between three. A hole each
  on the ground, a rim round it, nothing growing in it.
- **Three cuts**, each square to one axis through the four ways of the
  other two, seen one way always: the equator's from the north, the two
  through the poles the north up — so up, down, left and right are the
  cut's. A way lies in two: walked into, the one its heading lies in most.
- **A cut seen flat** (`section.js`): the sky round it, its ground a band,
  its earth in strata, four tunnels `tunnel` wide to the heart, the
  heart's hollow; the worm its drawing as drawn — its own body, flat, its
  wave in the drawing's plane — moved by the stick or ZQSD, held in the
  tunnels, its head turned to where it goes, its back up as it faces.
- **The heart** (`heart.js`): a hollow `core` of the radius round, walked
  on the inside of its wall — its up the heart's middle — the field 75°;
  the six tunnels' mouths on it. Into a mouth, a cut at its bottom; out of
  a cut at the ground, beside that way's hole, facing away.
- **For now**: each way between is a cut; a buried worm, or one in a
  phase, goes into no way; the heart's wall is the reality's earth.

## The matrix — M16l, landed 2026-11-18

- **A sphere at the heart's middle** (`matrix.js`), `matrix` of the heart
  round, in `matrixColour` — amber, a honey: a node material, three's TSL,
  see-through, its edges brighter as they turn from the eye, its surface
  breathing in long slow waves. Its light is the heart's.
- **The planet's things in it, itemized**: one of each kind the ground
  grows (`planet.js` `KINDS`, the same shapes) — a tuft in the reality's
  green, a stone — each drifting round where it floats and turning, as in
  honey. A planet growing nothing holds nothing there.
- **Seen**: from where the worm floats (M16o), the camera on it; in a cut,
  the matrix a disc in the heart's hollow.

## The heart weightless — M16o, landed 2026-11-18

- **Floating** (`orbit.js`), off the wall, `float` of the way out from the
  matrix to it: ZQSD, the arrows or a stick move it on the screen — right,
  left, up, down — round the matrix, `drift` units a second. Where it is
  and the screen's up turn together, so no pole stops it: over the top, up
  is the way it was going. Seen from its side, as in a cut — its head where
  it goes, its back up as it faces — its turns eased.
- **The camera** out behind it, inside the wall, always on the matrix's
  middle, the worm low in the field before it.
- **Aimed**: the right button held, E pressed — again to stop — or the
  pad's left trigger. The gaze starts where the camera looked; the pointer
  turns it — locked to the canvas where the browser lets it, a fifth of a
  degree a pixel — ZQSD and the right stick too, up and down short of
  straight. The worm faces it, the camera over its head; where the gaze
  meets the wall is under the sight, a mouth there lit, the sight warm. A
  click, Space or the pad's first button: into its cut, at its bottom.
- **For now**: no animation between places — the embellishments' (M16q).

## An item found — M16m, landed 2026-11-18

- **An item** (`items.js`): its nature — what kind of thing it is, what it
  is for: a brush, a shape the gamepad draws with — and what it is: a vault
  object's id, its title, its picture. The brushes are the vault's legacy
  brushes, its shapes tagged `folder:legacy brushes`; with no vault,
  seventeen of the gamepad's own stand in.
- **On the ground** (`finds.js`): `finds` of them, three at first, where
  the seed puts them — never by a way's hole, nor by the start, nor by one
  another — a card of its picture over a warm ring, rising and falling,
  turned to the eye.
- **Walked into**, on the ground and not under it, the worm's head within
  reach: picked up, its card gone, into what the worm carries — its
  inventory, a strip of pictures over the viewer. Kept for the session, as
  all the player does (*Settled* 5); a planet built again lays again what
  is not carried.

## Settled, 2026-11-18

1. **M16 now**: "go M16, all gas no breaks".
2. **The passage is played, not held**: in the radius, the phase swings
   between the two bodies, fast, `swings` times — "3 ou 4 ou plus" — and
   fixes on B. Its count and its pace are rows; a QTE comes later (M16e).
3. **Where**: `apps/3d/play/`, the 3D app's player, as the map has `play/`
   and the rig `puppet/` — a module (`core/mount.js`), on the 3D app's own
   renderer, loft and wave.
4. **The worms are the 3D app's**: a gamepad drawing lofted by `loft.js`,
   or a model's drawn body as the author shaped it; with neither, loft.js's
   own worm (rule 7).
5. **Nothing the player does is saved** at first, as the map's player:
   its rows are tuned by hand, and a world becomes an object at M16j.
6. **Two paces and a dive** (M16c): a speed on the ground and one under
   it, and a dive between the two, played as an animation.
7. **The heart first** (after M16c): M16d to j wait; the planet's heart,
   its ways in, its matrix and what is put in it come before them.
8. **The gamepad itself, off p5**: the heart draws with the gamepad app,
   on core's kit first — C6, "peut-être que c'est le moment" — so M16n
   waits on it; the brushes found are the legacy brushes family's, 17.
