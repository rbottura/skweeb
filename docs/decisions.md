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

## Decided since, 2026-11-05

**The vault app's detail is the object's facts.** The author, seeing the
vault app: "le viewer à droite de la grille du vault est vraiment super,
mais ça rend presque le vp-detail obsolète sauf pour les informations".
Three ways were put — the bench's three columns, the facts under the
viewer, the drawer kept over the grid with its facts only — and the author
chose the last, C: the detail keeps its place over the grid's right edge,
loses its picture and its player — the viewer has them — and is as wide
as the bench's properties, 300 px. Over another app, where no viewer is
beside it, the detail keeps its picture.

**The scene's address is its fragment** (S9c, its host). `#particles`
names the app *cluster* has mounted; the query stays what it is on an
app's own page — the app's to read, `?open=<id>` — and is left behind at a
switch, so the next app is asked nothing the last one was. So a page that
sets its query — the graph going back to a state — reloads into the same
app, and a link made for an app's page opens in the scene with its
fragment added. The host mounts each app with its own canvas and layout;
the one canvas, as planned, is a brick of its own, where what handing it
over costs the apps is weighed first (`docs/scene.md`).

**An app mounted again comes back as it was left** (S9c). A scene that
switches apps must not lose what one was doing, or it is worse than a
tab. So an app taken out once booted leaves what its `keep` says — the
recipe it would save, the frame, whether it played — with the smart
object it is bound to, and its next mount opens on it through the path
a saved object takes (`requested`): no second way to restore an app.
The address goes first — an app given a query does as it says — and
what is kept is the recipe, not the session: the steps start again.

**The scene is laid as the bench is.** Asked whether cluster should take
the bench's layout for one canvas fixed — the scene's side views on the
left, the viewer and its player in the middle, the app's properties on
the right, two panels as two tabs — the author: "oui tu peux prendre la
mise en page du bench qui est super !". Tried in cluster first, each
app's own page as it is. Its side view is the vault for now, the
scene's; an object opened there is a tab of the properties.

**The properties one panel, as the bench's; the vault four columns** (S9d).
The author, on cluster: "pour la mise du bench initial je me souviens avoir
un panel droit avec 2 onglets et une liste de catégories dépliables mais
tout dans une même section, ici je vois plusieurs sections" — and the
vault's grid, where an object took the column's width: "peut-être 3
colonnes ou 4 serait pas mal". The bench's panel taken back: its tabs its
head, the sections a column inside it with a hairline between. Four
columns of pictures, the names in their titles, the rest in the detail.

**At a switch the viewer stays, and whatever changes moves** — the author's
principle for the scene's motion, the same day: "le viewer ne devrait
quasiment pas bouger entre 2 apps, les règles toujours ou adapter avec une
animation … tout élément qui transitionne même très légèrement doit avoir
une animation aussi fine et rapide soit-elle", the player adapting as
well. Which element does what, case by case, is worked out with the author
(S9e, `docs/scene.md`). The corrections are cluster's first: "ses
modifications couleront plus naturellement sur les pages propres aux apps
après". And S11's bench "au plus vite", ahead of S9e's rest.

**Each app keeps its own canvas; the scene lays them in one place**
(S9c). Planned on 2026-11-04 as one canvas handed to each app. Weighed
when built: the apps put their pointer listeners and classes on their
canvas and set its 2D state, all of which the scene would have to take
back between two apps, for a picture the eye cannot tell apart from
every viewer laid in the same place — which the scene's grid does — and
the last frame held as a copy over it until the next app draws.

**The legacy grid's sets stay, filed in the folder of their tiles** (S9g).
The author: "les objets de sets de legacy grid sont trop petits et
redondants avec les folders, est-ce qu'on pourrait s'en défaire ?" They
are grid's materials — a ramp is a set, the folder only its tiles — and
the dithers made with one name it as a parent, so they are not deleted:
a set filed nowhere whose members are exactly a folder's shown members is
shown in that folder, first, across the grid in cluster. A set's index row
carries its members for it, as its role. To have one gone for good is
still the trash's, by hand.

**Beside an app, the vault shows the app's own first; dropping is picking**
(S9g). "Un filtrage automatique des objets du vault issus de l'app
courante … puis le reste": an order, not a filter — every object stays in
sight, the app's own above a line, the rest under another, beside the vault
app neither. And an object dropped on a field is what the field's picker
would have handed it: the same types taken, a set switched on for the
field's use, one step.

**Every viewer's picture fitted with an even margin** (S9h). The stage's
padding was the rulers' 18 px all round, so a picture fitted against the
rulers on two sides and 18 px off the edges on the other two — "une petite
marge … à droite et en bas selon le format". It is now the rulers' bands
and 12 px on every side (12 alone where the rulers are off), the picture
centred in what they leave: in every app at once, as what cluster settles
flows to the apps' own pages. And the vault app's object is drawn at its
ink, as compose places it — `inkSize` core's, one rule for both.

**BEC's keys, the suite's places** (M13a). BEC_2025 drew its grid anew by
`q` `s` `d` (faces), `c` (colours) and `e` (edges), each `random()`. In the
suite S saves, E exports and Q and D step frames, by place: so each draw is
a seed of the recipe (rule 2) and BEC's keys land where the suite has room —
`e` on R, "again", a new seed of which edges, the colours dealt anew with
them as BEC did; `c` on C, new hues alone; `q` `s` `d` in the 3D app's pie,
A, four, six or eight faces filled. The grid is the catalogue's eighth shape,
one geometry with its colours at its vertices, so it has no colour of its
own.

## Decided since, 2026-11-06

**A palette is a type; what is made of objects is made in the vault
panel** (V1). The author: "l'objet palette de couleur doit exister, et il
nous faut un endroit pour accéder à des fonctions d'édition inter app".
A `palette` holds its colours in order and a name for each; made by hand,
edited as a material is — a new one, the old kept. The place is not an app
of its own but the vault panel, which is in every app and beside every
viewer: its head makes a palette, a palette's detail edits it, and the
selection it has for the trash will make a set and a group (V2, V3,
`docs/workshop.md`). Both the author's to correct. BEC_2025's assets come
in as one folder, `bec_2025`: "un groupe ou dossier de ce nom".

**A model's sides are the eye turned round it** (P6). Down is the model as
it is framed, facing the eye; left the eye a quarter round to its left,
right the other way, up from behind — four objects of their own, frozen
acts, no turntable among them — and a character of the four. Eight sides
wait, as the character's eight directions do.

**A shape swings one of its place keys** (P2). What swings is named by the
place key it moves — a turn, a move, its size — so the wave needs no table
of its own, and an old recipe, which names none, stands still. A shape that
swings has no handles: dragged at a frame, one would write the wave's moment
into its place; its rows edit where it rests.

**Two takers, one following** (L5). When grid took windows as filter does,
filter's following moved to core, each app handing it its two ways to open
a source — a copy would have drifted. A smart source at a new version is
the following's to draw again, the player kept; the field said again
(L11) is let be in both apps, so it is drawn once.

**Edited in place, a kept placement follows** (L6). Compose places a
project at its state, nothing changing unless asked (S6b); *Edit in <app>
↗* is the asking — the page is to draw what is made of it — so a placement
kept at a state follows from then on, and says so. A change of state, kept
or following, opens a placement again: it did not, and a row changed drew
nothing new.

**Flattened, a state is a parent** (L2). A flattened placement is an
object of the kind its smart object binds, its parent that object at the
state it was placed at — `skw_…@vN`, no ref — so it follows nothing, and
the kin and the delete read the state as the object it names.

**A cycle is refused twice** (L3). A smart object's next state whose refs
lead back to it is refused by the page before it sends and by the server
after: the page to say so at once, the server because a page is not the
only thing that writes. The chain is named, by title where it has one.

**The live stack follows; a row keeps a state** (L1). Compose places a
project at its state, as the author asked on 2026-11-03 (S6b); the stack is
the live composition, so a smart object's layer in it follows its states,
and the same row as compose's — *at its state · 0 follows* — keeps one.
The page the stack saves places it as the stack had it.

**A smart object held is followed, and that is no edit** (L11). An object
field holding one hears its versions and says itself again, `following`
true: the app loads it again, as if picked again, and its history takes no
step — the author did nothing there. One pinned at a state follows
nothing. A 3D model's picture is a sprite, as a still's is: the author's
example of 2026-10-22.

**The avatar wears what stands on the spawn** (P4). No field names it: the
spawn's thing is what it wears — a character, or any object, facing every
way — so a map is made walkable in the editor, as everything else on it
is. Its keys are by place (`event.code`), ZQSD where WASD is; a sign it
reads faced is solid, as Pokémon's are, so a step does not take it onto
it; a step onto a warp goes through, a tap on one still uses it.

**A character's count is its rule** (P3). Four members are down, left,
right, up; three, down, right, up, the left the right mirrored — no field
beside the members, as the fields were taken on 2026-10-22. A character a
delete cuts is read by its new count: made again, it is right.

**A turntable turns the model** (P1). The sun turns with the eye by
default, so every side comes round into the light, as on a turntable under
a studio's lamps; the eye walked round under the world's sun — the drag's
way, its dark side coming round — is the other choice, a row. A model that
turns saves as a `sequence`, as fractals' idles and the rig's loops do: what
moves is one, and a smart object's states may be either.

**A set by hand keeps the order it was picked in** (V2). Its members are
the pictures selected, in the order of the clicks; a material made so has
no ground — its order the hand's, not measured. Its role is one a use
defaults to, or none, and its switches are its detail's, as every set's.

**A group is a folder, one at most** (V3). Groups by hand are `folder:`
tags, as the folders the apps make: a view, never a place. Filed in a group,
an object leaves the one it was in — a tree of groups waits for a want of it.

**A slider's grid** (C11). `step: 'any'` has none — a slider and a box
give what the hand moved; a count's slider stops at every whole value; a
box dragged crosses its range in four hundred pixels whatever its step.
The five-steps rule of 2026-11-03 stays for continuous ranges.


**The garden: a flower is its marks, a generation the chain's work** (M14a,
the author's brief, `docs/iterations-modifications.md`, and the answers of
the same day). The player is the map's avatar — "très simplement un sprite
… pour bouger dessus et faire quelques actions" — so the garden is a map,
walked as the player walks one, and the map editor's own page as the puppet
is the rig's: "une sous catégorie de map", mounted in cluster. Its flowers
are drawings the author makes and picks, "une collection d'objets produits
au gamepad … avec leurs recettes": a set made as *flowers*. A modifier acts
on marks and on parts of the drawing's order — "la première moitié, le 1er
et 3ème quart". "Si on a une recette, on a automatiquement une séquence":
a flower grows as its marks come, and their order and pace are modifiers
too. A generation keeps its marks, not only its source and chain: it stands
without its source, every app that draws marks draws it, and it is the next
one's source; its picture is drawn from its marks at its size, never taken
off the garden. The garden plants: what a gardener does is saved — a
flower in the vault, a garden as a map's next state — where M8's player
keeps nothing, and stays so. A mirror copies its marks round the flower's
middle: the gamepad's patterns turn sprites over but round the canvas's
middle, and a mark has no field to turn one over. Later, the author's:
modifiers from another app's values (M14b) — "le modificateur de particules
ajouterait des marques dans la recette de la fleur avec un sprite de rendu
associé"; two flowers crossed (M14c), "pour plus tard".

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
