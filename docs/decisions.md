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

## Decided since, 2026-10-21

**A VTuber puppet, now, the rest paused.** The author, 2026-10-21, with a
bust drawn in the gamepad — a tube of stamps, two eyestalks, two small arms
(`gam_1792618477805_861bac`, on the tower's vault until the next merge):
"je voudrais mes yeux dans un premier temps, je voudrais qu'on teste ça
maintenant et mettre le reste sur pause si c'est pas bloquant". So M9's
brick 6, M8's fourth and the newsroom idea wait. "Mes yeux dans les yeux
de l'avatar" is the camera's own eyes, cut out and worn at the stalks'
tips — not drawn eyes that blink as the author does.

**The puppet is the rig's player, and a performance.** `apps/rig/puppet/`,
as `play/` is the map's: it wears what the rig rigs, drawn by the rig's own
code, and what it does live — the camera's eyes, the head's turn, springs
with a past — never enters a recipe. Its values live in its address, the
thing OBS is given. A puppet saved in the vault, a `params` object, waits
until one is wanted. No VTuber program is used: Live2D, Inochi2D and
VSeeFace want the avatar made again as a mesh or a 3D model, and the stamps
riding their bones would be lost.

**MediaPipe reads the face, and git never holds it.** The Face Landmarker
of `@mediapipe/tasks-vision`, pinned at 1.0.1 (1.1.1 was a week old):
Apache-2.0 by its `package.json` and by each of the three model cards its
bundle is made of. Its WASM is 11.8 MB and its model 3.8 MB, binaries, so
`scripts/vendor-mediapipe.mjs` fetches them on each machine into
`core/libs/mediapipe/` and git keeps its README (rule 6); the page never
fetches them from outside (rule 7), and opens without them, saying how.

**OBS is started with a flag, and guides live in `docs/guides/`.** OBS 32
gives a Browser source nothing of its own accord but the loopback network
(obs-browser's permission handler), so the camera is refused; started with
`--enable-media-stream --use-fake-ui-for-media-stream` it is given — tried
by the author the same day: "ça fonctionne comme sur chrome dans obs". The
page says so inside OBS. What needs another program is written in
`docs/guides/` and read in the app by `core/Guide.js` — the author's
suggestion, made in core for every app.

**The puppet is kept as a smart object, and OBS follows it.** 2026-10-22,
the author: the settings chosen in the window "did not stay in OBS" — the
address, copied once, was OBS's copy. So a puppet is sent (S): saved as a
`params` object bound into a `skw`, every send its next version, the page
in OBS opened on `?open=<id>` taking each version as the server announces
it (server/events.js) — M11's smart objects, unchanged. A send is a
version, so versions are what the author chose to send, never every
slider's step. Its app is `rig/puppet`: core builds `/apps/<app>/` for
`rebuild.js` and `?open=`, so the puppet's own page and file are found with
no change to core. And the camera has a switch, and a page waiting for it
takes it when it is let go: on this machine one camera goes to one program.

**The puppet finds its parts; the rig's proposal can be ordered.** The same
day, a drawing made eyes first had its mouth on an eye: the rig takes the
first stroke for the body. The puppet takes the widest — a bust is drawn
with a bigger brush than its stalks — and reads each stroke from the end it
hangs by, the author telling any of it otherwise (`parts`). For it the rig
took two options and changed nothing it draws: `proposeBones(…, { order })`
and `drawingOf(…, { reverse })` — the rig's own proposal by hand, parked in
its STATUS, can stand on them.

## Decided since, 2026-10-22

**A branch for each work item.** The author: "je suis le seul dev sur le
projet pour l'instant mais je voudrais adopter une méthode de production
correcte". Until that day every commit went straight onto `main`, and two
days of the puppet sat uncommitted on the tower. So `main` is always green
and is what every machine runs; every item of the plan is a branch, made
when the item starts. A rebase brings a branch up to `main`, a merge lands
it: `--no-ff` for two commits or more, so `git log --first-parent` reads as
the board and one revert takes an item out; `--ff-only` for one, since a
merge commit round a single commit says nothing. No squash: the commits are
the project's diary, a brick's commits how it was built. A gate before
landing — the unit loop, the checks of what was touched, the line cap, the
docs — and a session ends pushed, three machines sharing the code. Side
jobs keep the inbox's definition and run in worktrees of their own
(`docs/workflow.md`).

**The work is a board, and its order the author's.** `docs/plan.md`, the
same day: the suite tidied, columns that fit, the paused bricks, layers and
smart objects — each item with its branch, its size, what it needs and a
*Done when*; and what waits on the author, each with what happens if
nothing is said. The order, laid out and taken — "l'ordre proposé me va":
the ground cleared, then the columns, then the bricks that wait on no one,
then the layers, and the shell last, after a mockup.

**The UI's second pass closes before it moves.** Measured that day in every
app at 1600 × 1000: a column runs 2.14 screens on average as it opens,
ckt's motion column 3.2. Four drawers every app shares — Format, Export,
Stack, the player — are open by default under the app's own, and a range
row is two lines, 70 px. Closing those by default takes the mean to 1.54,
a row on one line to 1.32; moving them out of the column, to the viewer, a
sheet and a panel of their own, to 1.23 only. So the cheapest step goes
first, and where the shared things live waits on the author's eye.

**The roadmap keeps the milestones still open.** It stood at the cap: the
done ones — M1 to M4, M6 and M11 — went word for word to
`docs/roadmap-done.md`, as the decisions' older days went before them; the
roadmap keeps an index of all eleven, and the links as a section of their
own.

**Saved three ways, and followed wherever used.** Asked how a moving model
saves, the author answered for every app: "sauvegarder une still doit être
possible, une séquence aussi, et un smart object aussi" — a 3D smart object
as a particle sprite, drawn again in particles when the model is changed in
the 3D app. So S opens a sheet in every app on core's kit — 1 a still, 2 a
sequence, 3 a smart object — the keys by their place, & é " on the
author's AZERTY as ZQSD is WASD; what an app cannot make is greyed, and
Enter repeats the last choice. A smart object is M11's bound form,
unchanged: what is on screen bound, its next save its next version. And it
is followed wherever an object can be picked, not only where compose
places it and filter takes it: core's picker hears its versions and core's
loaders unwrap it. A moving model's sequence keeps the default asked on
2026-10-06 — the model's recipe and its motion, the model its parent — and
a character is taken as proposed: "on adaptera sûrement plus tard".

**A tolerance comes with the fault it must still catch.** C7, the same
day: check-print's still painted as the gamepad paints stood 0.13 of 255
from core's drawing of it from its marks, where 0.05 was asked, on the
commit of 2026-10-07 as on that day's — and drawn by the same path in a
fresh page the two are 0.0009 apart. So `core/stage/still.js` is right,
and Chrome 155 draws a sprite's turned edges a little differently by what
the page drew with that picture before; which history, the measures did
not pin down. A frame one pixel off is 2.8 of 255 and 3.6% of values: the
bounds sit between, 0.5 and 1%, and the check draws that pixel-off frame
too and fails if the bounds no longer tell it apart. The rule of the
checks — measure, never demand the pixel — now says how far: as far as a
fault measured beside it allows.

**Rule 4 eased: a file is looked at past 400 lines, split past 600.** The
author, the same day: the cap "un peu trop arbitraire", cutting files in
parts where one would be cleaner. Seen that day: check-3d, cut to pass
under 400, copied its helpers and built its model again for the half that
saves — a split that shares a setup is coupling by copy — and the plan was
trimmed to fit rather than shaped. What the cap was for stays: one concept
per file, and a session's reading bounded. So past 400 a file is split
along a seam it already has — never into a part two — or kept whole with
its reason written in `scripts/lines.mjs`; past 600 it splits; and the docs
every session reads — CLAUDE.md, STATUS.md, docs/plan.md — keep 400, since
every session pays for them. check-3d is whole again, 414 lines, its print
in check-print where it belongs; the checks' helpers, copied in every
check, wait to be shared (C9).

**The UI's second pass becomes a redesign, boxes first.** The author, the
same day, to the plan's measures: "mesurer les colonnes n'est pas
nécessaire" — what is wanted is "une manière de mise en page plus efficace
qu'une colonne scrollable", found from notes the author will take opening
each app; meanwhile the boxes every app shares, "comme les formats et
export", gathered as components "présents sur chaque app"; and with it the
theme: "nous allons certainement laisser tomber le néo-brutalisme comme
thème global", the new one to be described. So U0 is dropped; the proposals
measured that day become the new layout's starting points, not items; the
shared boxes come first, one contract in core, today's drawers their first
layout so that nothing moves on screen; and nothing is restyled before the
description. The theme of 2026-09-23 is reopened, not yet replaced.

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

**Each app keeps its own canvas; the scene lays them in one place**
(S9c). Planned on 2026-11-04 as one canvas handed to each app. Weighed
when built: the apps put their pointer listeners and classes on their
canvas and set its 2D state, all of which the scene would have to take
back between two apps, for a picture the eye cannot tell apart from
every viewer laid in the same place — which the scene's grid does — and
the last frame held as a copy over it until the next app draws.
