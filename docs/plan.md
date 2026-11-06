# Plan — the work items, and their branches

The cycle begun 2026-10-22, from the author: "faire un peu le ménage dans
la suite, faire les quelques briques mises en pause, avancer sur le système
de couche 'layer' et de smart object, et aussi faire des optimisations
d'ui" — some columns are long to scroll. Four tracks: **C**, the suite
tidied; **U**, columns that fit; **L**, layers and smart objects; **P**,
the paused bricks; and since 2026-11-03 **S**, the scene — M12,
`docs/scene.md` — which takes U up. Each item is a branch (`docs/workflow.md`). The roadmap
keeps the milestones and why, an app's `STATUS.md` how its bricks were
built; this file what is to do, in what order, and what waits on whom.

A session takes the board's first `ready` row, makes its branch, and marks
the row `landed` with the date in the branch's last commit. An idea that
comes mid-item goes to `docs/inbox.md`, as before; sorted onto the plan, it
becomes a row here. A row is `ready`; `needs` another; `waits` on the
author or on something made; or is a `side job`, run beside the main
thread in a worktree of its own (`docs/inbox.md`, its head). A landed item
keeps its row, and its paragraph shrinks to a line: git keeps the rest.

## The board

In the order the main thread takes them; side jobs and waits at the end.

| | item | branch | size | state |
|---|---|---|---|---|
| C0 | the puppet landed | `rig/puppet` | — | landed 2026-10-22 |
| — | this plan, and the method | `docs/plan` | — | landed 2026-10-22 |
| C1 | the docs true again | `docs/status` | S | landed 2026-10-22 |
| C2 | under the line cap | `clean/line-cap` | S | landed 2026-10-22 |
| C7 | check-print green again | `fix/print-still` | S | landed 2026-10-22 |
| C8 | rule 4 eased: a file looked at past 400, split past 600 | `docs/rule-4` | S | landed 2026-10-22 |
| U0 | the columns measured | — | — | dropped: "mesurer les colonnes n'est pas nécessaire" |
| — | the scene planned: M12, `docs/scene.md` | `docs/scene` | — | landed 2026-11-03 |
| S1 | the dark theme, from the bench's tokens | `ui/theme` | M | landed 2026-11-03 |
| S2 | a value on one line: field, fill, slider, mark | `ui/rows` | M | landed 2026-11-03 |
| S3 | the shared boxes, as the bench has them | `ui/boxes`, `ui/player` | M | landed 2026-11-03 |
| S4 | the format a list | `ui/boxes-format` | S | landed 2026-11-03; Format and Ground mounted anywhere → S9 |
| S5 | the left hand: the search, then keys by place and pies | `ui/keys`, `ui/keys-pies` | M | landed 2026-11-03: the search, then the keys and pies |
| — | Lit, the components' one library | `ui/lit` | — | landed 2026-11-03 |
| S12 | the bench's shell in every app: title bar, the player under the viewer, the status bar's hints | `ui/shell` | M | landed 2026-11-03 |
| S6 | an object's states as a tree: S6a the tree, S6c Ctrl Z and Y, S6b S a state, S6d a value in each | `layers/states`, `layers/steps`, `layers/save-state`, `layers/values` | M | landed 2026-11-03, its four bricks |
| S7 | the graph over the page: S7a the graph, S7b compare and merge, S7c open in | `ui/graph`, `ui/merge`, `ui/open-in` | M | landed 2026-11-03, its three bricks |
| S8 | rulers, guides, magnetism, F; the gabarit | `ui/guides` | M | rulers, guides, the magnet and F landed 2026-11-03; the gabarit's type waits on the author |
| S2b | S2's rest: the unit in the box, the fold of rows seldom touched, a pair on one line | `ui/rows-more` | S | landed 2026-11-03 |
| S9a | every app a module: `mount(host)`, `unmount()`, a scope | `scene/host` | M | landed 2026-11-04: the nine on core's kit; the players' pages wait on the author |
| S9b | the vault, an app: full screen, the canvas showing what is chosen | `scene/vault`, `ui/vault-info` | S | landed 2026-11-04; its detail the facts only, the author's C, 2026-11-05 |
| S9c | *cluster*, the scene: the host; an app back as it was left; the links taken in place; one canvas fixed, the last frame held; the panels moving | `scene/cluster`, `scene/kept`, `scene/links`, `scene/canvas`, `scene/panels` | L | landed 2026-11-05, its five bricks: the host, an app back as it was left, the links, one canvas in the bench's layout, the panels |
| S9d | cluster closer to the bench: the properties one panel, its sections folded in it; the vault four columns of pictures | `scene/props` | S | landed 2026-11-05 |
| S9g | the scene's vault beside an app: still at a switch, the app's own first, dragged onto a field, a set in its folder | `scene/side-vault` | S | landed 2026-11-05 |
| S9h | the vault app's viewer: an object at its ink's size, its player's controls, seen closer, an even fit | `scene/vault-viewer` | S | landed 2026-11-05 |
| M13a | BEC's grid, a primitive of the 3D app: cells, edges, faces, palettes, every draw a seed | `3d/grid` | M | landed 2026-11-05 (`docs/bec.md`) |
| M13b | BEC's files into the vault, in a folder `bec_2025`: titles and infos by format, its palettes | `bec/import` | S | landed 2026-11-06, and run: 31 objects in `bec_2025` |
| V1 | the palette, a type: made by hand in the vault panel, edited as a new one, BEC's grid drawn in one | `vault/palette` | M | landed 2026-11-06 (`docs/workshop.md`) |
| V2 | a set by hand: the pictures selected, in their order, a set of a role | `vault/set` | S | landed 2026-11-06 |
| V3 | groups by hand: the selection into a group, out of it, a group renamed | `vault/groups` | S | landed 2026-11-06 |
| M13c | the gabarit, a type: a format, its guides, its layers under the render and over it | `ui/gabarit` | M | waits: its fields, the author's |
| M13d | the project as one page: the grid and a gabarit's layers saved together, its states | `bec/project` | S | needs M13b, M13c |
| S11 | the space viewer's own bench, on an artifact | — | M | version 1 2026-11-05 (`docs/scene.md`), tried: "très prometteur" — its version 2 once the author has scenarios for it |
| S9e | the motion, case by case: what holds still at a switch, what adapts, what goes and comes — every change animated | `scene/motion` | M | first pass landed 2026-11-05, the proposal as written; the rest with the author's eye (`docs/scene.md`) |
| S9f | the scene's other side views: the keys, the history | `scene/side-views` | S | landed 2026-11-05 |
| S13 | the player's lanes: a composition's sequences a lane each, one opened there | `compose/lanes` | M | waits: worked out with the author, with S9e |
| S10 | the space of contexts, and the bridge | `scene/space` | L | needs S7, S9c, S11 |
| — | U8a U8b U8c, L10, L7, U10, U11: taken up by track S | — | — | → S3, S4, S6, S7, S1, S9 |
| P1 | M10's brick 5: a turntable | `3d/turntable` | M | ready: S3 landed 2026-11-03 |
| P3 | a character, defined once | `core/character` | S | ready |
| P4 | M8's brick 4: an avatar that walks | `map/avatar` | M | needs P3 |
| L11 | a smart object followed wherever it is picked | `layers/follow` | M | ready |
| L1 | pins | `layers/pins` | M | ready |
| L3 | no cycle | `layers/cycles` | S | ready |
| L2 | flatten | `layers/flatten` | S | needs L1 |
| L6 | edit in place | `layers/edit` | S | ready |
| L5 | grid takes a window | `layers/grid-takes` | M | ready |
| U9 | the author's notes on each app | — | — | in part, 2026-11-03: `docs/scene.md` |
| P2 | M10's brick 5: a shape swung | `3d/swing` | M | needs P1 |
| P6 | M10's brick 6: a model from every side | `3d/sides` | S | needs P1, P3 |
| P7 | a worm's path across the map | `map/paths` | M | needs P4 |
| P8 | M8's brick 5: baked and published | `map/bake` | L | needs P4 |
| C3 | fonts licensed in their files | `clean/font-licences` | S | side job; Destra waits on the author |
| C4 | two known bugs | `fix/trashed-sets`, `fix/recut-folder` | S | side jobs |
| C9 | the checks' helpers shared | `clean/check-helpers` | S | side job |
| C10 | the checks several at a time, picked by what a change reaches | `clean/checks` | S | landed 2026-11-04 |
| C11 | the sliders and boxes: a slider with no grid moving, a count's by one, a box dragged by the hand | `fix/sliders` | S | landed 2026-11-06 |
| L4 | the live view blends as a save does | `layers/isolation` | S | side job |
| P5 | M9's brick 6: the slug from every side | `rig/views` | M | waits: the author's drawings |
| P0 | the puppet on the author's head | `rig/puppet-defaults` | S | waits: an evening in OBS |
| L8 | overrides | `layers/overrides` | L | waits: the author — now, or later |
| L9 | the other apps worn in OBS | `layers/obs` | M | waits: the author — which app first |
| C5 | the unit loop on GitHub | `clean/ci` | S | waits: the author's yes |
| C6 | the gamepad on core's kit | — | L+ | waits: the author — a milestone, or later |

S is a session, M two or three, L more.

## The order, and why

The author's, 2026-10-22: "l'ordre proposé me va". Since 2026-11-03 the
scene comes first: a day on a bench found the UI the author wanted, and
the author asked for the scene round it — S1 to S10, `docs/scene.md`, as
one refactor in bricks from the session's reset at 15:40. It takes up U8,
U10, U11 and L10's save; the order below goes on after it.

1. **The ground cleared** — C1, C2, C7, C8. The docs say what is true,
   rule 4 says what it means, and `main` is green.
2. **The shared boxes** — U8a, U8b, U8c: Format, Ground, the player, Export
   and its print, the Stack — one contract in core, each app declaring its
   boxes as data, mounted wherever a layout puts them; today's drawers stay
   the layout until U11, so nothing moves on screen. Before the bricks,
   since every brick after them would build its boxes by hand again.
3. **Saving, and the paused bricks that wait on no one** — L10, P1, P3,
   P4. Asked how a moving model saves, the author answered for every app:
   a still, a sequence or a smart object (2026-10-22). So the sheet comes
   first, on U8a's Export box, and the turntable saves through it.
4. **Layers and smart objects** — L11 first, the author's own example: a
   3D smart object as a particle sprite, drawn again in particles when the
   model changes. Then L1, L3, L2, L6, L7, L5: what M11 left after its
   *Done when*, in compose's placed panel and the Stack box, moving where
   the new layout puts the layers.
5. **The new layout and theme** — U9, U10, U11: a layout better than a
   column that scrolls, from the author's notes on each app, in a theme the
   author describes. Nothing is restyled before the description.
6. **Then** P2, P6, P7, P8 as the board reaches them; P5 the day the
   drawings exist.

Two hot spots set it. `core/ParamPanel.js`, `widgets.js`, `Drawer.js`,
`theme.css` and every app's `main.js` are U's — U8a touches every app's
export, U11 every app's layout, and L10 every app's S — so no app brick
runs beside them. `core/smart.js`, `vault.js` and compose's
placed panel are L's. The side jobs touch neither and run any time.

## Waiting on the author

Each with what happens if nothing is said.

- **The motion, case by case** (S9e): its first pass is the proposal as
  written (`docs/scene.md`); what the author sees in it, case by case — "on
  va travailler ça ensemble" — is its next pass.
- **The player's lanes** (S13): a composition of several sequences, each a
  lane in the player, one opened there to be seen or changed — as After
  Effects' timeline, as the gamepad's clips. Its shape worked out with the
  author before it is a branch.

- **The players in cluster** (S9a): map's player (`play/`) and the rig's
  puppet stay pages of their own — a playable map is an export, a puppet
  worn is a performance OBS follows by its address. Mounted in cluster, the
  puppet would turn the camera on there, and its address — rewritten every
  change — would be the scene's. If nothing is said: pages of their own.
- **The gabarit, a type** (S8): a format and its guides as an object, made
  for its format (`docs/scene.md`) — its fields to confirm before S8; BEC's
  layers by format, titles under the render and infos over it, one to weigh.
- **BEC again, M13** (`docs/bec.md`): M13a landed; M13b answered — BEC's
  assets in a folder `bec_2025`, for BEC 2027's first renders. Still the
  author's: the gabarit's fields (M13c). And the workshop's (`docs/workshop.md`):
  a palette's fields — colours and their names — and its place, the panel.
- **A project made by several** (the roadmap's *Still open*, 3): after
  BEC — PDF layers, the print kept vector, people live on one stack;
  pdf.js and pdf-lib; the app that sets the text; beyond the tailnet.
- **Notes on each app** (U9): given in part on the bench, 2026-11-03.
- **The slug's back and side**, drawn in the gamepad as the front was (P5).
- **An evening in OBS with the puppet** (P0): sway, rise, wobble and the
  mouth on the author's own head — what is too much, what too little.
- **Overrides**, now or later (L8); **which app first in OBS** (L9) —
  particles, an overlay that loops, is the suggestion.
- **The newsroom** (inbox, 2026-10-08): a milestone, and before what. It
  would want compose's page length set by hand, and ckt's whole words.
- **The gamepad on core's kit** (C6): a milestone of its own, or later.
- **The unit loop on GitHub** (C5): yes or no.
- **Destra's licence**, in words its files can carry (C3).
- **`docs/layers_ref.png`**, the sketch of the layers: rule 6 keeps it out
  of git, so into the vault, by *+ pictures* on the laptop;
  `docs/smart-objects.md` will name its id.
- **`detached`**, the envelope field for cutting loose, written up as
  decided: to confirm (root `STATUS.md`, *Broken*).

## C — the suite tidied

**C1 — the docs true again** · landed 2026-10-22, `docs/status`.

**C2 — under the line cap** · landed 2026-10-22, `clean/line-cap`.

**C3 — fonts licensed in their files** · `clean/font-licences` · S, a side
job. Rule 5: `assets/fonts/` lacks its `OFL.txt` files, and Destra's
licence is to be named in its own (`docs/fonts.md`; the roadmap's *Still
open*, 1). *Done when* every face has its licence beside it.

**C4 — two known bugs** · `fix/trashed-sets`, `fix/recut-folder` · S each,
side jobs, one commit each. Trashed brush sets still offered in the gamepad
and in ckt; an identical re-cut in ckt handed back as the old object with
its old tags, so it never joins the new session's folder.

**C5 — the unit loop on GitHub** · `clean/ci` · S. A workflow that runs
every `tests/*.mjs` on Node 22 at each push — a red mark on a branch before
it lands. Nothing to install; the browser checks stay on the machines.

**C6 — the gamepad on core's kit.** The last app on panels and params of
its own, four files past the cap, its recordings never reopened, no clock
in the stack. A milestone's size: listed so it is chosen, not forgotten.

**C7 — check-print green again** · landed 2026-10-22, `fix/print-still`.

**C8 — rule 4 eased** · landed 2026-10-22, `docs/rule-4`.

**C9 — the checks' helpers shared** · `clean/check-helpers` · S, a side job.
Every check defines its own `say`, `wait`, `row`, `set`, `scrubTo`,
`pixels`, `apart`, `readZip` — the same lines in twenty files, a little
different in each. A module of them beside `check-kit.mjs`, each check
taking what it uses: what rule 4's eased cap leaves to split is then
seams, never copies. *Done when* no check defines a helper another has.

**C10 — the checks several at a time, picked by what a change reaches** ·
landed 2026-11-04, `clean/checks`: `docs/workflow.md`, *The gate*.

## U — the UI redesigned: boxes, layout, theme

The author, 2026-10-22, after the measures: measuring the columns is not
needed (U0, dropped); what is wanted is a layout better than a column that
scrolls, found from notes the author takes app by app (U9); the boxes every
app shares gathered first, as components present in every app (U8); and
the theme rethought with it — the neo-brutalism of 2026-09-23 likely left
for what the author will describe (U10). The measures of that day stay as
data (`docs/decisions.md`): a column ran 2.14 screens as it opened; the
shared drawers closed, 1.54; a row on one line, 1.32; the shared boxes
out of the column, 1.23.

**U8a — the shared boxes: one contract, Export first** · → S3, landed 2026-11-03.

**U8b — the player and the Stack, as boxes** · → S3, landed 2026-11-03.

**U8c — Format and Ground, mounted anywhere** · `ui/boxes-format` · S.
`ParamPanel` learns to mount a group of the schema outside its column,
still drawn from it (rule 1); Ground one group in every app, where today
it lives in five different drawers.

**U9 — the author's notes on each app.** Not a branch: the author opens
each app and writes what is in the way and what is wanted where — the
brief of U11.

**U10 — the new theme** · → S1, landed 2026-11-03, from the author's description.

**U11 — the new layout** · `ui/layout` · L. From U9's notes, in U10's
theme, on U8's boxes: where the clock, the frame, the output, the layers
and an app's own controls live. The proposals of 2026-10-22, to start from
or to leave: drawers on demand, Blender's Ctrl-click (U1); a row on one
line, Tweakpane's density (U2); any control by name, Ctrl+K (U3); the
viewer's own chrome — the clock under the picture, the frame beside it
(U4); export on a sheet (U5); the layers in a panel of their own (U6);
tabs (U7).

## S — the scene (M12)

What the bench settled, the bricks and their order are `docs/scene.md`; the
bench itself is https://claude.ai/artifact/JsZT1PpgNTBYpuMAaWmaZm, its
source its published files. **S1 — the dark theme** · landed 2026-11-03.

## L — layers and smart objects

What M11 left after its *Done when* (`docs/smart-objects.md`; decisions,
2026-10-07): pins, flatten and refusing a cycle wait for a placement to
carry a version; filter is the one app that takes a window; `overrides` is
written and never built; the live view blends over the checkerboard where
a save blends over nothing. And the author's of 2026-10-22: every app saves
a still, a sequence or a smart object, and a smart object is followed
wherever it is used.

**L10 — saved three ways: S, then 1 2 3** · → S3 and S6, landed 2026-11-03: S the next state of a smart object, E's menu the rest.

**L11 — a smart object followed wherever it is picked** · `layers/follow` ·
M. The author's example: a 3D smart object as a particle sprite, drawn
again in particles when the model is changed and saved in the 3D app.
Today only compose's placements, filter's source, the stack's layers and
the puppet hear a new version (`vault:updated`), and core's loaders —
`sprites.js`, `points.js`, `fields.js` — know nothing of a smart object,
where `openFrames` unwraps one. So core's object param, the picker every
app takes an object with, offers a smart object wherever the kind it binds
is accepted, and holding one, hears its versions and says it changed: the
app loads it again as if picked again, the loaders unwrapping it as
`openFrames` does. Every picker at once — particles' sprites and emitter,
grid's source, a map's things, the rig's drawing. *Done when* a check
saves a model again in one window, and particles' sprites change in
another, with no reload.

**L1 — pins** · `layers/pins` · M. A placement of a smart object carries
its `version`, shown in compose's placed panel and in the Stack drawer —
*follows the latest*, or *kept at v3* — with a switch. Kept, it draws what
was kept (`core/smart.js` `innerOf`, there already) and no longer follows;
a page keeps the version in its block. *Done when* `check-smart` keeps a
page at v1, saves the smart object again, and the page still draws v1
while a page that follows draws v2.

**L3 — no cycle** · `layers/cycles` · S. `Vault.save` walks the refs and
refuses a page that would come to hold itself, naming the chain; the server
refuses it too. *Done when* `tests/smart.mjs` makes A hold B hold A, and
the save is refused.

**L2 — flatten** · `layers/flatten` · S. A smart placement made ordinary:
drawn at its version, saved as a still or a loop with
`parents: ["skw_…@vN"]` and no refs, the placement pointing at it — the
way out when a chain gets too clever. The vault's kin and its delete learn
that a parent may carry `@vN`.

**L6 — edit in place** · `layers/edit` · S. A smart placement offers *Edit
in <app> ↗*, in compose's placed panel and a row of the stack: its app
opened on `?open=skw_…`, the window bound, so its next save is the next
version and every page holding it follows — Photoshop's double-click.

**L7 — versions in the vault** · `layers/versions` · S. A smart object's
detail lists its versions, each with the picture it had (`versions/vN.*`,
numbered, never scanned — rule 3), and takes one back as the newest
version, so nothing kept is lost.

**L5 — grid takes a window** · `layers/grid-takes` · M. `TAKERS` in
`core/send.js` gains grid: a window as grid's source, followed live as
filter follows one (`apps/filter/following.js` the model), saved as a smart
object when grid saves.

**L4 — the live view blends as a save does** · `layers/isolation` · S, a
side job. The stage is a group already (`isolation: isolate`,
`core/stackView.js`), but the checkerboard is its own background, inside
the group: the layers go into a group of their own within it, the
checkerboard behind, so screen and difference meet nothing where nothing
is under them, as in a save.

**L8 — overrides** · `layers/overrides` · L. Two placements of one smart
object differing by a few values: the placed panel shows the smart
object's own schema, a value changed is kept in the placement's
`overrides`, and its app is asked to draw the recipe with them merged.

**L9 — the other apps worn in OBS** · `layers/obs` · M. The puppet's way
made core's (inbox, 2026-10-22): any app's smart object on a page with
nothing but its picture, transparent, following each version the server
announces.

Later: a window as a lens — where it sits on the screen, the part of the
stack under it, bgstaal's own trick.

## P — the paused bricks

Paused on 2026-10-21 for the puppet: M9's brick 6, M8's fourth, the
newsroom. Waiting since 2026-10-06: M10's brick 5. One piece serves three
of them — the set by direction that M9's and M10's sixth bricks make and
M8's avatar wears — so it is defined once and first (P3), and the avatar
does not wait on drawings to walk.

**P0 — the puppet on the author's head** · `rig/puppet-defaults` · S. An
evening in OBS, then the defaults moved to what the author kept.

**P1 — M10's brick 5: a turntable** · `3d/turntable` · M. A Motion drawer:
turns a loop — 0, ±1, ±2 — its frames and its fps; frame i seen from the
yaw plus 360° × turns × i / frames, so the last frame meets the first to
the bit (`apps/3d/STATUS.md`, *Next*). Saved through L10's sheet: 1 the
model as it stands, as today; 2 the loop, a `sequence` whose recipe is the
model's and its motion, the model its parent, as the rig's loops are; 3 a
smart object of whichever is on screen. Replayed by `rebuild.js`, played
in compose. Its player is the player box, U8b's.

**P2 — M10's brick 5: a shape swung** · `3d/swing` · M. A shape's place
swung on a wave, as the rig swings a bone, a phase a shape, every loop
closing.

**P3 — a character, defined once** · `core/character` · S. The fields the
author took on 2026-10-22, "on adaptera sûrement plus tard": a `set`,
`role: 'character'`, its members loops by direction in RPG Maker's order —
down, left, right, up — the first frame of each its stance; a left left
out is the right, mirrored; eight directions later, by the same rule. A
row of `docs/object-model.md` and of `core/uses.js`, *map character*, with
a test.

**P4 — M8's brick 4: an avatar that walks** · `map/avatar` · M. In the
player, a character on the spawn — or, until there is one, any loop facing
every way; ZQSD or WASD by `event.code`, the arrows, a gamepad's stick; E
uses what it faces; a tap walks to a cell by the shortest way over
`walkable`; walls and solid things stop it, warps take it. Where it stands
lives in the player, never in a recipe (M8's rule).

**P5 — M9's brick 6: the slug from every side** · `rig/views` · M. The
back and the side drawn in the gamepad as the front was, named the same by
the rig, a walk saved for each direction, kept as P3's set.

**P6 — M10's brick 6: a model from every side** · `3d/sides` · S. A model
drawn from four or eight yaws, a loop each, kept as P3's set.

**P7 — a worm's path across the map** · `map/paths` · M. A path drawn on
the map that a thing follows across the room, so a crawling worm goes
about it and not only round its own box (`apps/rig/STATUS.md`).

**P8 — M8's brick 5: baked and published** · `map/bake` · L. Placements
drawn at the map's pixel size and cleaned by a look, sheets packed, a
bundle a static site serves, the embed mode: the first thing to leave the
author's machines.

Later, each in its app's `STATUS.md`: M5's motion and time filters, *bob*
first; colour over life; a Julia set by a click, more families, deeper
zoom, the point families; ckt's world apart from its output; compose's
timeline, and a page's length set by hand; a `palette` type, pixel mode,
tileable output; newest behind, in the gamepad; M8's toys; the
skweeboteque.
