# The shared boxes

What every app has, made once — U8 on the plan's board (`docs/plan.md`). The
author, 2026-10-22: "rassembler les 'boîtes' en commun de chaque app comme
les formats et export etc. en sachant que ce seront des composants
réutilisés et donc présents sur chaque app" — ahead of a new layout, found
from the author's notes on each app (U9), in a new theme (U10, U11). So a
box is made to be put anywhere: today a drawer in a column, tomorrow
wherever the layout says.

## What there is, 2026-10-22

Every app has the same few boxes, each built by hand in its `main.js` —
placed, titled and worded its own way.

| box | how it is made today | where |
|---|---|---|
| **Format** | a schema group, core's `frameParams()` (`core/frame.js`), less what an app has no use for, drawn by `ParamPanel` as a drawer | grid whole; ckt's motion side; compose, particles less `zoom`; fractals, 3d less `zoom` and `bleed`. None in map (its size is its grid), filter (its source's), the rig (its drawing's), the puppet |
| **Ground** | one `type: 'ground'` row, in whatever group the app put it | its own drawer in grid, ckt, compose (*paper*); fractals' *copies*, particles' *look*, map's *map*, 3d's light, the puppet's *For OBS* |
| **Player** | core's `Transport` on core's `Playhead`, mounted by the app | a drawer added for it in grid, filter, fractals; a holder in the *player* group's drawer in ckt, compose, particles. The rig's loop in its Motion drawer, the map's clock: no transport. A drawer for it in 3d since its turntable (P1) |
| **Export** | a drawer the app adds, *Export*, filled with its own buttons, core's `PrintPanel` inside | every app, placed before *format*, *ground*, or last |
| **Stack** | core's `stackDrawer(panel, …)`, which adds its own drawer | every app but the gamepad and the puppet |
| Vault, Bar, Guide | `VaultPanel`, `Bar`, `Guide` — components already | every app; the Guide in the puppet |

What the Export drawers say, for what are a handful of acts:

| app | into the vault | out of the suite | its own |
|---|---|---|---|
| grid | *Save to the vault [S]* | *Save + download the frames* | the material maker's saves, in the maker |
| ckt | *Save this frame [S]*, *Save the loop* | *Save the loop + frames zip* | *Emit a brush family* |
| compose | *Save to the vault [S]* | *Download the page (PNG)*, *Download every frame (zip)* | |
| filter | *Save to the vault [S]* | *Save + download the frames* | *Save the chain as a look* |
| fractals | *Save to the vault [S]* | *Download the picture (PNG)*, *Download every frame (zip)*, *Download a sprite sheet* | |
| particles | *Save the loop to the vault [S]*, *Save this frame as a still* | *Download every frame (zip)*, *Download a sprite sheet* | |
| map | *Save to the vault [S]* | *Download the picture (PNG)* | *Play the last save ↗* |
| rig | *Save to the vault [S]* | *Download the frame (PNG)* | |
| 3d | *Save to the vault [S]* | *Download the picture (PNG)*, *Download every frame (zip)* — a turntable's | |

And in every one, core's print panel: a sheet, a dpi, *Print it*.

## The contract

A **box** is a component: `{ id, title, body, note(text), dispose() }` —
an element to fill and a title to show it by, nothing about where it goes.
Core makes each shared one from what the app declares, as data; the app
never builds the inside of a shared box again.

A **layout** puts boxes somewhere. The first is today's, so that nothing
moves on screen: `columnLayout(panel, boxes, { order, closed })`, each box a
drawer of a `ParamPanel` column, in the order given, the drawer's id the
box's — so a viewer's open and closed drawers are remembered as before.
U11's layout replaces it, and no app changes for that.

An app's `main.js` declares its boxes and hands them to a layout:

```js
const boxes = {
  player: playerBox({ clock, busy: () => busy }),
  export: exportBox({ app: 'grid', say: t => bar.say(t), saves, downloads, acts, print }),
  stack:  stackBox({ app: 'grid', layer: () => printing.object(), clock, save }),
};
columnLayout(panel, boxes, { order: ['player', 'export', 'stack'] });
```

Format and Ground stay schema groups — rule 1, a control is a schema
entry — and become boxes by `ParamPanel` mounting a group outside its
column (U8c): `groupBox(panel, 'format')`.

## The Export box — U8a

The one box whose inside differs most, and the one L10's save sheet stands
on. An app declares its acts; core draws them, in one order, with one set
of words, and the print under them:

```js
exportBox({
  app, say,
  saves: {                               // into the vault: L10's three
    still:    { act, when },             // the frame on screen, a still
    sequence: { act, when, frames },     // the loop; frames: its zip in the same pass
  },
  default: 'still',                      // what S saves, until L10's sheet
  downloads: {                           // out of the suite
    picture: { act, when },              // a PNG, the format at its scale
    frames:  { act, when },              // every frame, a zip for frames-to-video
    sheet:   { act, when },              // a sprite sheet and its JSON
  },
  acts: [{ label, act, when }],          // the app's own: a brush family, a look, a play link
  print: { object, leave, tick, format },// core's PrintPanel, as each app gives it now
});
```

`when` hides an act that does not apply — a loop's where nothing moves, as
a schema's `when` hides a row. An act running says so on the bar, and the
box is busy until it is done, as every app's buttons are now.

The words, one set for every app — the default, unless the author says
otherwise:

| act | its words |
|---|---|
| the default save | *Save to the vault [S]* |
| a still, beside a loop | *Save the frame as a still* |
| a loop, beside a still | *Save the loop* |
| a loop and its frames | *Save the loop + every frame (zip)* |
| picture | *Download the picture (PNG)* |
| frames | *Download every frame (zip)* |
| sheet | *Download a sprite sheet* |

ckt's *Save this frame [S]* becomes *Save to the vault [S]*, particles'
*Save the loop to the vault [S]* too; compose's *page* and the rig's
*frame* are *the picture*; grid's and filter's *Save + download the
frames* is *Save the loop + every frame (zip)*. Every check that presses an
export button by its words is told the new ones in the same branch.

## The player and the Stack — U8b

`playerBox({ clock, busy })`: core's `Transport` in a box, with the
*player* group's rows where an app has them — the `fps`, compose's onion
skin — so that one box is the clock wherever it is shown. The rig's loop
and the map's clock take one when their apps' layouts come to it.

`stackBox(…)`: what `stackDrawer` draws, in a box: the same options, the
drawer left to the layout.

## Format and Ground — U8c

`ParamPanel` mounts a group of the schema in an element it is given,
drawn from the schema as ever, so a layout can put the Format by the
canvas and keep the rest in a column. Ground is one group, `ground`, in
every app that has one, where it lives in five different drawers now.

## The steps

1. **U8a** — this file; then `core/boxes/` (the contract, `columnLayout`,
   `exportBox`), and every app's Export drawer made by it; its checks
   given the words. *Done when* every app's export is the box and every
   browser check is green. **Made 2026-11-03 as S3's first half**:
   `core/boxes/export.js`, `exportBox(panel, { vault, disk, acts })` — the
   drawer is the layout for now, so `columnLayout` waits for S9's scene; the
   gamepad's export waits for C6.
2. **U8b** — `playerBox` and `stackBox`, every app.
3. **U8c** — groups mounted anywhere; Ground one group.

Each lands alone; none moves a box on screen. What an app keeps its own —
its Emission, its Shapes, its Bones — stays its drawers until U11.

## For the author

- The words above, or others.
- Whether the gamepad, still on panels of its own, takes the boxes now or
  with C6.
- Anything the notes of U9 already say about where a box should go: the
  contract is made so that U11 decides it alone.
