# Plan — the work items, and their branches

The cycle begun 2026-10-22, from the author: "faire un peu le ménage dans
la suite, faire les quelques briques mises en pause, avancer sur le système
de couche 'layer' et de smart object, et aussi faire des optimisations
d'ui" — some columns are long to scroll. Four tracks: **C**, the suite
tidied; **U**, columns that fit; **L**, layers and smart objects; **P**,
the paused bricks. Each item is a branch (`docs/workflow.md`). The roadmap
keeps the milestones and why, an app's `STATUS.md` how its bricks were
built; this file what is to do, in what order, and what waits on whom.

A session takes the board's first `ready` row, makes its branch, and marks
the row `landed` with the date in the branch's last commit. An idea that
comes mid-item goes to `docs/inbox.md`, as before; sorted onto the plan, it
becomes a row here. A row is `ready`; `needs` another; `waits` on the
author or on something made; or is a `side job`, run beside the main
thread in a worktree of its own (`docs/inbox.md`, its head).

## The board

In the order the main thread takes them; side jobs and waits at the end.

| | item | branch | size | state |
|---|---|---|---|---|
| C0 | the puppet landed | `rig/puppet` | — | landed 2026-10-22 |
| — | this plan, and the method | `docs/plan` | — | landed 2026-10-22 |
| C1 | the docs true again | `docs/status` | S | landed 2026-10-22 |
| C2 | under the line cap | `clean/line-cap` | S | ready |
| U0 | the columns measured | `ui/measure` | S | ready |
| U1 | drawers on demand | `ui/drawers` | S | needs U0 |
| U2 | a row on one line | `ui/rows` | M | needs C2, U1 |
| U3 | any control by name | `ui/find` | S | needs U1 |
| P1 | M10's brick 5: a turntable | `3d/turntable` | M | ready, on the default below |
| P3 | a character, defined once | `core/character` | S | waits: the author's yes on its fields |
| P4 | M8's brick 4: an avatar that walks | `map/avatar` | M | needs P3 |
| L1 | pins | `layers/pins` | M | ready |
| L3 | no cycle | `layers/cycles` | S | ready |
| L2 | flatten | `layers/flatten` | S | needs L1 |
| L6 | edit in place | `layers/edit` | S | ready |
| L7 | versions in the vault | `layers/versions` | S | ready |
| L5 | grid takes a window | `layers/grid-takes` | M | ready |
| U4 | the viewer's own chrome | `ui/viewer` | L | waits: the author's look at a mockup |
| U5 | export on a sheet | `ui/export` | M | needs U4 |
| U6 | the layers panel | `ui/layers` | M | needs U4 |
| P2 | M10's brick 5: a shape swung | `3d/swing` | M | needs P1 |
| P6 | M10's brick 6: a model from every side | `3d/sides` | S | needs P1, P3 |
| P7 | a worm's path across the map | `map/paths` | M | needs P4 |
| P8 | M8's brick 5: baked and published | `map/bake` | L | needs P4 |
| C3 | fonts licensed in their files | `clean/font-licences` | S | side job; Destra waits on the author |
| C4 | two known bugs | `fix/trashed-sets`, `fix/recut-folder` | S | side jobs |
| L4 | the live view blends as a save does | `layers/isolation` | S | side job |
| P5 | M9's brick 6: the slug from every side | `rig/views` | M | waits: the author's drawings |
| P0 | the puppet on the author's head | `rig/puppet-defaults` | S | waits: an evening in OBS |
| L8 | overrides | `layers/overrides` | L | waits: the author — now, or later |
| L9 | the other apps worn in OBS | `layers/obs` | M | waits: the author — which app first |
| U7 | tabs in a column | `ui/tabs` | M | only if U0 still asks for them after U6 |
| C5 | the unit loop on GitHub | `clean/ci` | S | waits: the author's yes |
| C6 | the gamepad on core's kit | — | L+ | waits: the author — a milestone, or later |

S is a session, M two or three, L more.

## The order, and why

The author's, 2026-10-22: "l'ordre proposé me va".

1. **The ground cleared** — C1, C2, U0. The docs say what is true, the
   line cap holds, and the columns have numbers before anything moves
   them. C2 splits `core/param-panel.css` (392 lines), which U2 grows.
2. **Columns that fit** — U1, U2, U3: core alone, every app at once, from
   2.14 screens a column to 1.32, projected (*U*, below). Before any brick,
   since every brick after them adds rows.
3. **The paused bricks that wait on no one** — P1, then P3 and P4 once the
   author has said yes to a character's fields. P1 has waited since
   2026-10-06 on one answer, and has a default.
4. **Layers and smart objects** — L1, L3, L2, L6, L7, L5: what M11 left
   after its *Done when*, in compose's placed panel and the Stack drawer;
   they move into the layers panel with U6.
5. **The shell** — U4, U5, U6, once the author has seen a mockup: where
   the clock, the frame, the output and the layers live is a matter for the
   author's eye more than a measure — after U2 they take a column from
   1.32 screens to 1.23 only.
6. **Then** P2, P6, P7, P8 as the board reaches them; P5 the day the
   drawings exist.

Two hot spots set it. `core/ParamPanel.js`, `widgets.js`, `Drawer.js`,
`theme.css` and every app's `main.js` are U's — U4 touches every app — so
no app brick runs beside U4. `core/smart.js`, `vault.js` and compose's
placed panel are L's. The side jobs touch neither and run any time.

## Waiting on the author

Each with what happens if nothing is said.

- **How a moving model saves** (P1, asked 2026-10-06): a `sequence` whose
  recipe is the model's and its motion, the model its parent, as the rig's
  loops are. The default.
- **A character's fields** (P3; the object model is the contract): a `set`,
  `role: 'character'`, its members loops by direction in RPG Maker's order
  — down, left, right, up — the first frame of each its stance; a left left
  out is the right, mirrored; eight directions later, by the same rule.
- **The shell's look** (U4 to U6): a mockup to look at before a line of it.
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

**C1 — the docs true again** · `docs/status` · S. Every `STATUS.md`'s
*Next single step* true again: grid's names M4's compose, and a p5 question
settled on 2026-09-26; compose's first *Next*, a gamepad still at print
scale, landed with the print on 2026-10-06; map's points at a root step
that moved; ckt's, particles' and filter's say a row of this board, or
that they wait. The root `STATUS.md` (395 lines) rewritten under the cap,
its next step this board. The roadmap (399) split as the decisions were:
the done milestones' paragraphs into `docs/roadmap-done.md`. *Done when* no
STATUS names a step done or gone, and no doc is past 400 lines.

**C2 — under the line cap** · `clean/line-cap` · S.
`scripts/check-particles.mjs` (506) split in two; `scripts/check-3d.mjs`
(454) gives its print section to `check-print`, as its STATUS says;
`core/param-panel.css` (392) gives the cards and the stack files of their
own, before U2. And `scripts/lines.mjs`, the gate's fourth step as a
command, the gamepad's four files named as known until C6. *Done when* it
prints those four alone, and the split checks count what they counted.

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

## U — columns that fit

Measured on 2026-10-22 in headless Chrome at 1600 × 1000, where a column
shows 791 px — a laptop at 1366 × 768 shows nearer 650, a fifth more to
scroll. In screens, how far a column runs as it opens, then projected
after each step; the puppet's own drawers, and ckt's sprite grid, are left
as they are in the projection:

| column | now | U1 | + U2 | + U4–U6 |
|---|---|---|---|---|
| ckt · motion | 3.2 | 2.3 | 2.0 | 1.7 |
| particles · picture | 3.1 | 1.5 | 1.3 | 1.0 |
| 3d | 3.1 | 2.2 | 1.6 | 1.4 |
| rig/puppet | 2.8 | 2.8 | 2.3 | 2.3 |
| fractals | 2.5 | 1.5 | 1.3 | 1.1 |
| rig | 2.5 | 1.6 | 1.3 | 1.2 |
| grid | 2.2 | 1.4 | 1.2 | 1.1 |
| particles · particles | 2.1 | 2.1 | 1.5 | 1.5 |
| compose · page | 2.1 | 1.0 | 1.0 | 1.0 |
| map | 2.0 | 1.0 | 1.0 | 1.0 |
| the mean of fifteen columns | 2.14 | 1.54 | 1.32 | 1.23 |

What weighs: a range row is two lines, 70 px; and four drawers that every
app shares — Format, 513 to 685 px with its eighteen chips; Export, 516 to
630 with the print in it; Stack, about 246; the Sequence player, about 200
— open by default under the app's own. Closing them is the largest step and
the cheapest. ckt's sprite grid is 703 px alone.

The system, after the tools that met this first:

- **drawers on demand** — Blender's panels: a Ctrl-click on a head, and
  the others fold;
- **a row on one line** — Tweakpane's and Leva's density, under the
  suite's own theme;
- **any control by name** — Blender's F3, VS Code's palette: cheap here,
  since every control is a schema entry (rule 1);
- **what every app shares, where every editor puts it** — the clock under
  the picture, the frame by the canvas, the output on a sheet, the layers
  in a panel of their own, as Photoshop's are;
- **tabs last** — Blender's property tabs — and only for a column still
  past 1.5 screens.

**U0 — the columns measured** · `ui/measure` · S. `scripts/check-ui.mjs`:
every app at 1600 × 1000 and at 1366 × 768, each column in screens as it
opens and with every drawer open — the table above, as its output. It
fails when a column grows past its last measure, kept in the check, so no
brick after it lengthens a column unseen.

**U1 — drawers on demand** · `ui/drawers` · S. Format, Ground, Export and
Stack start closed wherever an app adds them, and each app closes its own
secondary drawers — the puppet's Parts, Camera and For OBS among them. A
Ctrl-click on a head opens that drawer alone in its column; the panel's
head has *fold all*. Open or closed is remembered per viewer as today
(`core/Drawer.js`), under a new key, so a browser that remembered the old
defaults sees the new ones once. *Done when* U0's mean is 1.6 or under.

**U2 — a row on one line** · `ui/rows` · M. `core/widgets.js` and
`param-panel.css`: a range's label, slider and number on one line — 34 px,
not 70 — a long label wrapping in its own cell; a switch beside its label;
chips and the rule between rows lighter; a colour, a text and a sprite grid
keep their room, the grid a height of its own and its own scroll. Every app
at once, none touched. *Done when* U0's mean is 1.35 or under, every
browser check passes — one that drags a slider by its place may have to
find it again — and the author has seen three apps before and after.

**U3 — any control by name** · `ui/find` · S. Ctrl+K: a box over the page
that finds a row or a button of the page's panels by its label or its
drawer's as it is typed; Enter opens the drawer, brings the row into view
and puts the cursor in it. Drawn from the schemas alone: no app writes an
entry.

**U4 — the viewer's own chrome** · `ui/viewer` · L. The player
(`core/Transport.js`) a strip under the picture in every app with a clock —
play, scrub, frame N of M, fps — and the Format group behind a chip in the
viewer's head, `1080 × 1080 · 1:1 ▾`, opening over the viewer:
`ParamPanel` learns to mount a group elsewhere, still drawn from the
schema. Every app's `main.js`. A mockup first.

**U5 — export on a sheet** · `ui/export` · M. The Export drawer's actions
and core's print panel on a sheet over the page, as the guide's, from a
button in the viewer's head. S still saves at once.

**U6 — the layers panel** · `ui/layers` · M. The Stack drawer out of the
column: a panel of its own over the viewer's edge, toggled from its head —
Photoshop's Layers — where L1's pins and L2's flatten then show.

**U7 — tabs in a column** · `ui/tabs` · M. A group's `tab` in the schema,
a strip of tabs at the column's top — only if U0 still finds a column past
1.5 screens after U6.

## L — layers and smart objects

What M11 left after its *Done when* (`docs/smart-objects.md`; decisions,
2026-10-07): pins, flatten and refusing a cycle wait for a placement to
carry a version; filter is the one app that takes a window; `overrides` is
written and never built; the live view blends over the checkerboard where
a save blends over nothing.

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
the bit (`apps/3d/STATUS.md`, *Next*). Saved by the default above,
replayed by `rebuild.js`, played in compose. Its player is a drawer until
U4 moves every player.

**P2 — M10's brick 5: a shape swung** · `3d/swing` · M. A shape's place
swung on a wave, as the rig swings a bone, a phase a shape, every loop
closing.

**P3 — a character, defined once** · `core/character` · S. The fields the
author says yes to, as a row of `docs/object-model.md` and of
`core/uses.js` — *map character* — with a test.

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
