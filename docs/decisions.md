# Decided — why things are the way they are, by date

What the roadmap now takes for granted, and the reasoning that settled it.
Moved out of `docs/roadmap.md` on 2026-09-24, when the roadmap reached the
400-line cap, as `docs/migration.md` was before it: the roadmap keeps the
milestones, the current day's decisions and what is still open, and the days
before live here. Read a day's section before reopening what it decided.

This file keeps the newest days. When it reaches the cap, its oldest days
move to a file named for their dates, listed here:

- **2026-09-21 to -23** — `docs/decisions-2026-09-21-to-23.md`: the `.skw`,
  export, the loop format, video as frames plus ffmpeg, replay as a
  dispatch, framing, M2 and M3 done, the UI pass, reopening, the tailnet,
  and where the name came from.
- **2026-09-26 to -27** — `docs/decisions-2026-09-26-to-27.md`: deleting in
  two steps, filters then particles then fractals with 3D parked, rule 8
  settled, WebGPU and a GPU render replaying close, a filter's reach, looks,
  kin and folders, the flipbook and its ripple, M6 over M5's catalogue, a
  shader's licence.
- **2026-09-28 to 10-02** — `docs/decisions-2026-09-28-to-10-02.md`: one
  vault on the laptop that travels, ideas between bricks in an inbox, M8 a
  map editor and a room first, M9 the rig between M8's bricks 3 and 4, few
  human shapes and many worms.
- **2026-10-06 to -20** — `docs/decisions-2026-10-06-to-20.md`: 3D back as
  M10 and meshes, `model` a type, three.js and the handles, a shape's
  modifiers and a model's style, prints past any canvas in tiles, every app
  printing, M11 the live stack and smart objects, the stack saved as a page.
- **2026-10-21 to -22** — `docs/decisions-2026-10-21-to-22.md`: a VTuber
  puppet, the rig's player, MediaPipe and OBS, the puppet a smart object OBS
  follows; a branch for each work item, the board and its order, rule 4
  eased, the UI's second pass a redesign, saved three ways.
- **2026-11-03 to -04** — `docs/decisions-2026-11-03-to-04.md`: the new UI
  found on a bench, an object's states a tree, the scene M12 after the
  boxes, every app a module, the vault an app, the scene's name.
- **2026-11-05** — `docs/decisions-2026-11-05.md`: the vault app's detail
  its facts, the scene's address, an app back as it was left, the scene laid
  as the bench is, its properties one panel, what moves at a switch, each
  app its canvas, the legacy grid's sets, the vault beside an app, an even
  margin, BEC's keys.
- **2026-11-06 to -08** — `docs/decisions-2026-11-06-to-08.md`: a model's
  sides, a shape swung, two takers and one following, a placement edited in
  place and flattened, a cycle refused, the live stack followed, what the
  avatar wears, a character's count, the turntable, sets and groups by hand,
  a slider's grid, the garden.

## Decided since, 2026-11-09

**A palette's colour on a sprite is one ink on paper.** The author:
"utiliser une palette de couleurs et l'appliquer sur les particules
générés comme les images ou couleur unis qu'on a aujourd'hui". On a dot it
is the dot's colour. A sprite is rarely flat — of the gamepad's 64 brushes
60 have lights and darks and 49 are in colour, a still is often opaque — so
a silhouette would make most of them a disc or a rectangle, and a multiply
leaves black ink black and turns cyan under red black. So by default a
sprite's darkest tone takes the colour whole, pure white stays and what is
between is between; one of a single tone has no lights to keep and takes
it whole; *flat*, the silhouette, is one chip away. A particle keeps its
colour all its life, by a draw of its own after every other, so what a
recipe drew before is as it was and a colour is not tied to a sprite.

**An overlay in particles, before the gabarit.** The author wants a poster's
type over a render now, "au plus simple", the window stack's bugs for later.
So one object row in the Format drawer, the one place a format is picked,
and no layer model: M13c's gabarit keeps its fields to be decided. It is
fitted whole and centred. `core/frame.js` has no `fit` because content is
placed at its own scale on purpose; an overlay is made for a format, and on
another one cutting it would lose what it says.

## Decided since, 2026-11-11

**A cloud of dots is a shape of the 3D app, its dots instances.** The
author, for BEC 2027: particles' emitter "dans le context 3d mais pour
générer des cercles ou des sphères à l'apparence 2d … on crée une fois les
objets dans l'espace", the seed kept for "placement random, couleurs
random". A shape of the catalogue, as BEC's grid became one, so the cards,
the handles, the style, the turntable, the print and the save are the
model's already; an app of its own would have made them again. Its dots are
an InstancedMesh, not one geometry as the grid's: thousands at once, a
matrix each that G2's forces will move without making a vertex again. The
2D look is a sphere unlit — its colour alone, exactly the palette's for a
print, a circle from every side — rather than a disc turned to the eye,
which would need the camera in the geometry and a shader of its own; unlit
is every shape's now. Two seeds as the grid's, the colours on their own, so
C never moves a dot; a dot's draws its own, so more dots move none. A
stretch moves the dots and leaves each round; the stack works on the dots,
not on one sphere.

**A cloud in time: a state at a time, its evolution played once; forces
a cloud each** (G2). Asked how time should go, the author took the first of
three: a time under the forces, the state then — what a print takes — and
the evolution from rest to it, a sequence played once; not a loop closed by
forces made to close it (a vortex of whole turns, a fall that wraps), nor
there and back. And forces in each cloud's card, as particles' are its
emitter's, rather than one field for the scene. Each dot is integrated from
rest in fixed steps, so a frame stands alone, as particles' do from birth;
states kept on the way make a frame drawn back as quick as one drawn on, and
exactly the same. Past a thousand instances three hands their matrices on
once a node frame; the 3D app's renderer had stopped three's loop (S9) and
moved only its counts on at each draw, so it now moves its node frame on
too, as that loop would — the comment there said so already.

**The overlay composed, and no more for now** (G3). Offered a list, the
author took one: "overlay composable" — and of the rest, "les changements
de couleurs et de taille dans le temps n'est pas souhaité pour ce système,
c'est à peu près tout pour l'instant une fois l'overlay en place". So its
composition is rows of the Format drawer, beside the overlay, as the
overlay itself was put there: a place in front or behind, a fit, a size, a
move, a turn, an opacity, a blend by the stack's names — still one picture,
the gabarit's layers M13c's. Dragged on the preview by a press anywhere
in it, since its middle is where the fields' centre starts, and a handle
alone there would always lose.

## Decided since, 2026-11-12

**The viewer's tools as the bench has them, the format among them** (S14).
The author, from the bench: "il manque dans le vtools du viewer le bouton
fmtQuick, le bouton de zoom, de graph, de guides et de background, ça veut
dire déplacer la section de format dans le viewer, pour toutes les apps
dans le clusters et les apps en stand alone aussi". Asked how far, two
picks. The format all in the viewer: its list there, and the size beside it
a chip opening the rest — width and height, the link, bleed, scale — the
Format section out of the properties, particles' overlay a section of its
own (S14b). The zoom a menu — Fit, 25 % to 200 % — with Ctrl and the wheel
about the pointer, the middle button or Space held and a drag to move: no
app loses its wheel or its drag, the 3D app's camera and fractals' plane
keeping the wheel alone (S14a). The zoom is the viewer's, never the
recipe's — each stage its own, at Fit when it mounts — and read where an
app already sized its preview (`viewFactor`), so a picture zoomed is drawn
in as many pixels as it shows and no more than its scale, as pixels past
that; a pan is CSS alone. Space over a viewer is held for a drag and, let
go without one, is the app's Space as before — its play, a tap later than
it was; elsewhere Space is unchanged. The guides button is the app's
overlay, Z's (particles', the map's), which left their own buttons; the
ground's is G's; the states' H's, there once the object has one.

**The window stack's bugs, and an object's layers** (L12, L13). The author's
list, 2026-11-12: the overlay "sur toutes les apps facilement" — particles'
Overlay section put "dans la section stack comme une section à part entière
dédiée au système de 'calque' avec connexion inter-app et faisant partie
des paramètres d'objets sauvegardables par état", a button "pour ajouter un
simple overlay plutôt qu'une fenêtre de l'app compose"; the stack's rows
"trop longues … les boutons deviennent inaccessibles"; and the 3D app's
states, "les paramètres n'ont pas été bien sauvegardés". The last was not
the save: every state of the cloud held its clouds, but going back to one
laid back the view alone — a params whose part was the recipe itself was
taken for all of it — so a list beside the params is now held as they are
(L12b). Asked the layers' shape, the author took the three first: layers of
the object, kept in its recipe as one param, `layers` — each a vault
object, a smart object of another app following its latest, in front or
behind, composed as particles' overlay is — drawn by core wherever the
object is drawn, the windows' live stack below them in the same section;
particles' overlay fused into them, its saves drawn as they were and its
"behind" still between its ground and its particles, where elsewhere behind
is under the picture, seen where its ground is none; and a live window as a
layer of the object later, once vault objects are.

**An object's layers drawn by core, not by each app** (L13a). Nine apps draw
their pictures nine ways, so the layers are laid round what they draw, in
the three places everything passes: a save's picture, before the vault
writes it (`Vault.finishWith`, its thumb made again); every replay, round
the frames an app's `rebuild.js` hands back — so compose, the vault, the
windows' stack and the print in tiles have them; and the preview, a canvas
each on the picture's box, its opacity and blend the page's, as the stack's
are. The format they fit is the app's, read beside them in the recipe, or,
where its source sets it — grid's `content`, filter, the map, the rig — the
picture's own size; the rig says where on its canvas its saved box is. An
app that draws them itself says `layered`: particles, from L13b.

**Particles' overlay, its first layer** (L13b). Its nine rows went, and a
recipe from before has its overlay as the first of its layers wherever it
comes in — `defineParams`'s `upgrade`, the app's own migration, as
*App versioning* has it, so an object opened, a state gone back to, a
replay and a print all read it the same. Particles draws its layers itself,
in its one drawing path, the ones behind between its ground and its
particles as the overlay was, and says `layered`; core's layer box is the
overlay's own, word for word, so an old save draws as its picture did.

## Decided since, 2026-11-13

**M15, a game's effects, taken up the day it was proposed** (`docs/vfx.md`).
The author: "un objectif serai de composé des avatars, des maps, des objets
et maintenant des vfx grace a la suite, une forme d'éditeur graphique et de
composant de jeux et de jeu intégralement. les recommandations sont bonnes,
on peut suivre le plan." So the game is the suite's own — the map's player —
and no engine's language is owed; the app is `apps/shader/`, a chain and no
graph, a particle wears the frames of a life, an effect is a page.
*Generator*, not *source*: filter's input is one already. A loop goes to
particles as it is, not as a set of its frames (M15e): one object, followed.

## Decided since, 2026-11-16

**The properties for a long use** (S15, the author's list of the day, using
the 3D app a lot). Export is the title bar's alone — its section kept in
the page, out of sight, its buttons what the menu presses — the print a box
floating by it; the object's layers a dock at the panel's foot, the 3D
app's shapes one at its head, a list and the chosen's params apart; a rail
of icons beside every app's panel, into the chosen shape's sections; the
sections a band each. Core's, so every app has it.

**Values copied by level, defaults too** (S15d). The author: "il faut
copier toutes les valeurs même par défaut, comme on ne sait pas si les
valeurs de l'objet qui reçoit sont également déjà modifiées" — a row, a
section or every value; pasted where the other has the key with the same
type; Ctrl V asks, Enter pastes, one step. What is held is the session's,
never a recipe's.

**A letter with Ctrl is never the letter** (S15i). Ctrl V opened the vault
in every app. An app's own keys are bare (`core/keys.js` `bare`); Ctrl C
and Ctrl V copy and paste, Ctrl S is the app's save — the browser's page
save prevented — as `docs/scene.md` had it, "Ctrl Z, Ctrl S keep their
letters".

**Widths and ends are the hand's, kept in the browser** (S15g, S15j). A
side 360 px, the scene's properties 340, their edges dragged; a number's
slider over two ends set by Alt click — each a preference of this browser,
never a recipe's, never the vault's.

**A drawn body is a loft, written here** (G4). The author's gamepad
drawings into 3D: each mark's brush traced to its silhouette at a threshold
(marching squares, `apps/3d/silhouette.js`), a ring per step along the
stroke, the rings joined, the ends a point or flat. No library: sand3d,
the author's lead, is Python over Blender's `bpy`, nothing a page runs;
three's `ExtrudeGeometry` keeps one section, where a stroke's marks grow,
shrink and turn. The sections stand across the stroke by default — a worm
— or as stamped, stepped back; the author's test decides which reads.
The rig's `drawing.js` and `strokes.js` are core's now (`core/stage/`):
a second app put marks into strokes, as `core/sprites.js` moved for one.

**A field may take one app's objects only** (G4, core/vault-drag.js
`takes`). An object param's `by: ['gamepad']` narrows its picker and its
drop to what that app made: `accepts: ['still', 'sequence']` alone offered
43 objects to the drawn body, 13 of them a drawing with marks.

**A drawn body's skin is its drawing, projected** (G4b, 2026-11-17). The
author: "le motif … en texture de sorte que le modèle ressemble un peu au
dessin initial". The stamps drawn again (still.js `drawStill`) on a picture
framed on the drawing alone — never on the body, which moves with its
threshold — and laid on the body from the front: the body seen from the
front is the drawing, exactly when stamped, nearly when across; its sides
take the colours stretched. Opaque, the ink's mean colour where no stamp
is. The brush wrapped round the body is the other reading, not built: its
rings close by index, so a texture round them would want a seam column.

**A model leaves as a glTF it writes itself** (G5, 2026-11-17). three's
exporter is an add-on the vendored WebGPU build would have to carry with
the helpers it imports; a `.glb` is a header, its JSON and one buffer — a
page of code, as `core/png.js` writes a PNG. The model at rest, every shape
shown, a node each, a cloud's dots baked; its skin a PNG inside. Not kept:
flat shading, the outline, the light — a viewer brings its own. Khronos's
validator was not run: a package from npm, its running not allowed here.

**A worm waves in its form** (G6, 2026-11-17). Its wave moves each ring's
centre — across the line or up from the plane — so it is made again each
frame, `phase` a form key, where a swing moves a place and a cloud its
dots: a drawn body's few thousand points cost a frame little. Its rings
turn square to the waved line; its skin keeps each point's place at rest,
so it rides along. Whole cycles a loop, as a swing has: the loop closes.

**A lathe is a shape of its own** (G7, 2026-11-17). A stroke turned round
an axis shares nothing of a drawn body's rows but its drawing, so it is the
catalogue's eleventh, `turned`, read through drawn.js as a body is. Its
wall is its marks' size: the stroke drawn thick, the vase thick. Three's
LatheGeometry spins the profile — the one geometry of three's it takes.

**A flower is a modifier** (G8, 2026-11-17). Petals round a heart are
copies of a shape round an axis, raised and in rings — what `mirror` and
`array` already are, round: `round` in the stack, so any shape is a petal
and a drawn body the author's own. The heart is left a shape to add: a
sphere, or a drawing of one.

**A body grows by its drawing's own times** (G9, 2026-11-17). Its marks'
`t`, not their distance along: the author's rhythm and pauses are the
growth. Played once, as an evolution is — the frame after the last is not
the first. Frame 0 shows its first two marks, never nothing: a body of no
points would be the worm.

**A brush wraps there and back** (G10, 2026-11-17). Round each ring the
sprite runs out and back — its u from 0 to 1 and down to 0 — so the ring,
closed by index, needs no seam column: its topology stays the loft's. One
brush a drawing, the sprite its marks use most; a brush a stroke would want
a material a stroke. `skin` turned a form key: the uv follow it.

**An SVG is drawn, not traced** (G11, 2026-11-17). An app hands its own
drawing path a context that writes SVG (`core/svg-canvas.js`): the file is
its PNG as vectors, and no second renderer drifts. The 3D app projects its
clouds through the PNG's camera; where two dots cross, a stack of circles.

## Decided since, 2026-11-18

**M16, the worm, now.** The plan read, the author: "go M16, all gas no
breaks". The game's avatar on a planet, its phases and the bond
(`docs/worm.md`); its first two bricks the draft the author asked to test
quickly — the planet walked, then the phase.

**The passage is played, not held.** Asked whether the bond is held, made
by staying in the radius or a QTE: "je vois le passage de phase dans un
premier temps comme plusieurs vas et viens très rapide, 3 ou 4 ou plus et se
fix sur B pour un passage de A vers B dans le 'pont spectrale' qui relie les
2 entitées". In the frozen worm's radius the phase swings between the two
bodies by itself — its count and its pace rows — and fixes on B; a QTE is
M16e.

**The worm's player is the 3D app's** (`apps/3d/play/`), as the map's and
the rig's are theirs: its bodies are loft.js's, its renderer the 3D app's,
one device for the page. Nothing it does is saved until a world is an
object (M16j), as the map's player saves nothing.

**The heart, then the gamepad on core's kit.** After M16c the author paused
M16d to j for the planet's heart (M16k, l). Seen, they answered: the
brushes found are "la famille legacy brushes, 17 items dedans"; drawing in
the heart is the gamepad app itself — "elle doit être retravaillée pour
fonctionner sans p5, peut-être que c'est le moment de faire cette
transition maintenant" — so C6 is chosen, before M16n. The heart is
weightless, a mouth aimed at by the pointer (M16o); items, an inventory and
an appendage to the matrix next (M16m, p); animations a batch later (M16q).
