# Decided — 2026-10-21 to 2026-10-22

The days moved out of `docs/decisions.md` on 2026-11-06, word for word,
when it reached the cap: the puppet, and the work as a board.

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
