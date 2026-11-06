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

## Decided since, 2026-11-03

**The new UI is found on a bench, then built on core.** The author asked to
work the UI out "ensemble dans un artefact … ou une nouvelle appli comme un
bench", and gave its direction the same morning: VS Code's modern dark,
"des légers rounded corners et des borders très fines", radial menus held on
a key, the left hand where a player's rests. Six versions of a bench came of
the day (`docs/scene.md`, *The bench*): what it settled — a value on one
line with its slider a second line only where wanted, a row's mark, the
keys by place, the player as After Effects' preview, saving in the author's
order — is the description U10 waited for and much of U9's notes. The bench
is a prototype outside the suite; each thing is built again on core's kit.

**An object's states are a tree, as a file's commits.** "Il ne faut pas
qu'à chaque pression de S il y ait un nouvel objet dans le vault mais
plutôt qu'on sauvegarde un nouvel état d'un objet." A state is its values
and its parent; a merge takes what only the arriving state changed and
keeps, on a conflict, the receiving one's value until the other is picked.
Between apps the lineage stays `parents`, pinned to a state (`id@vN`): each
app keeps its own recipe's states. A gabarit is made for its format and is
laid again on another, in % or in px. The model's fields are written up as
proposed, the author's to confirm (`docs/plan.md`, *Waiting*).

**The scene is M12, after the boxes.** "Une forme de fusion inter app avec
au centre le canvas qui ne bouge pas … et le reste qui s'adapte autour",
the apps still in tabs. Planned the same day, to begin after the session's
reset at 15:40 as one refactor in bricks, S1 to S10. It takes up U8, U10,
U11 and L10. Rule 7 — "not a shell that owns the page" — is kept as long as
the scene is one more host and never the only one; the author worded it the
same afternoon: "garder la possibilité d'avoir les apps en onglet
indépendantes ou alors une scène générique", the *skweeb absolute scene*, a
name to find. The space viewer gets its own bench before S10 (S11), and the
refactor starts with S1.

**The components are Lit's.** Asked whether the suite should take a framework
for its components, now the bench's interface is to reach every app, the
author chose Lit the same evening: "anticiper lit maintenant nous fera gagner
du temps". Not React, Vue or Svelte: each wants a build, and the suite serves
its files as they are, every app alone. Lit is standards — custom elements,
templates that update only what changed, reactive properties, a lifecycle to
mount and unmount, controllers for behaviours shared — in one ES module of 29
KB, vendored and pinned like three.js (`scripts/vendor-lit.mjs`, 3.3.3). Its
components render into the page's DOM, no shadow root, so theme.css draws
them and the checks find their classes. What exists stays plain DOM until a
brick touches it.

**A guide's line takes no press** (S8). The bench moved a guide by its line,
anywhere over the viewer; in the suite the picture is its app's — particles'
handles, map's brush, rig's strokes, compose's drag, the 3D app's turn — and
a line across it would take their presses wherever it passes. So a guide is
held by its grip in the ruler it crosses, and gone dragged back into the one
it came out of. Until the gabarit is a vault type, the guides are kept per
app and per size in the browser, the bench's rule kept: on another size they
are not shown, and are laid again there in % or in px.

**G is the ground; A is each app's own pie** (S5b). Asked the same evening,
the author: G "devient le fond", as on the bench — its colour or none — so
the guides over particles' and map's pictures move to Z, the view, which a
tap shows or hides. And A, held, opens the app's own pie — particles' emitter
shapes, map's tools, the 3D app's handles — nothing where an app has none.
Keys are read by their place, `event.code`: the same fingers on an AZERTY
and a QWERTY. An app that means something else by a key keeps it (`own`):
R the rig's rest, G the puppet's guide.

**A project is a smart object, placed at its state** (S6b). Every S is the
next state of the object a page holds, its first making it; the frozen acts
stay ordinary objects. Asked whether compose, placing a project, should
follow its new states, the author: "Placé à l'état du moment" — pinned at the
version it had, a row set to 0 to follow. Nothing changes under the eyes
unless asked.

**A state has a `parent`, and a merge a `parent2`** (S6). Asked whether S
should save a new state of the same object rather than a new object, with
two fields per state in `docs/object-model.md` — the state before, and the
branch merged in — the author: "Oui, ajoute-les". S6 writes them.


## Decided since, 2026-11-04

**The scene is *cluster*, for now.** Asked to name the scene — "skweeb
absolute scene" a placeholder — the author: "je vais garder le terme
*cluster* comme nom de scène modulaire pour l'instant", a word of space
that holds many objects (*nébuleuse*, *constellation*, *amas* weighed the
same day). So the scene's host is `apps/cluster/`; the word may change.

**An app is a module: `mount(host)`, `unmount()`, and a scope** (S9). The
seam the scene asks for, made first and checked alone: every app on core's
kit builds itself in a host and takes itself out, its page mounting it on
itself (rule 7). What it holds outside its nodes — a listener on the
document, a channel, an app's pie, a key it keeps — is let go of through a
scope its unmount closes (`core/scope.js`): core's parts say how, `held`,
so no app lists them. A page alone keeps its scope open as long as it lives,
so what ends before its app takes itself out — `held` gives back a release —
and a clock is held by its app, not by core, or every viewer of the vault
would be kept to the page's end. `check-mount` counts what is left of an app
unmounted: listeners, channels, intervals, frames asked for.

**The scene's plan, confirmed** (`docs/scene.md`, *Planned, 2026-11-04*).
Asked to plan for the renderers and the libraries before building the
scene, and for a vault app full screen: the canvas is already one kind —
every app draws its viewer in 2D, the GPU's and three's pictures handed
back as bitmaps — so the scene's fixed canvas is one 2D canvas handed to
the app it mounts; each library let go of by what it holds; the vault an
app of its own; the space of objects on a bench first (S11). The author:
"je confirme, continue sur les prochaines étapes".

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

