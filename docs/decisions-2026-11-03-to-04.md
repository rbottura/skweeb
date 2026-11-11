# Decided — 2026-11-03 to 2026-11-04

The days moved out of `docs/decisions.md` on 2026-11-11, word for word,
when it reached the cap: the bench's UI and the scene planned round it.

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
