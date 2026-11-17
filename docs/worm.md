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
| M16a | **the planet walked**: a sphere, things on it; a worm on it — a drawing lofted, waving as it goes — ZQSD, WASD, the arrows or a stick; the camera behind and above | `3d/planet` | M | `apps/3d/play/` opens alone on loft.js's worm; walked round, it stays on the ground and the camera behind it (`check-3d-play`) |
| M16b | **the phase**: a frozen worm and its radius; the camera framing both, the bridge of the morph's frames, the phase swung and fixed on B; the bond, B played in its reality, A left a shell | `3d/phase` | M | walked into the radius, the swings played, B is the one walked |
| M16c | **under the surface**: the worm swims beneath, the ground raised along its body | `3d/dune` | M | later |
| M16d | **the window**: a frozen worm showing its reality — what a camera there sees, drawn in its silhouette | `3d/window` | M | later |
| M16e | **the bond as a game**: a QTE while B's reality opens | `3d/bond-qte` | S | later |
| M16f | **surfaces on meshes, and the gears**: generators of a position, a rim; a gear a state of the avatar — its shading, its accessories at a ring | `3d/gears` | L | later; the inbox's *generators in 3D* |
| M16g | **the face**: eyes on stalks, lids, a mouth; an expression a state of its values, the puppet's camera able to drive them | `3d/face` | M | later |
| M16h | **the worm on limbs**: a stroke a limb, bones by stroke — the rig in 3D | `3d/limbs` | L | later |
| M16i | **a bigger planet**: detail near the eye, a cube-sphere in chunks | `3d/planet-lod` | M | later |
| M16j | **a world saved**: its planet, its worms, its phases, an object — as a map is | `3d/world` | M | later; its type the author's |

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
