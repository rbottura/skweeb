# Layouts — a gallery by use (S15f, proposed)

The author, 2026-11-16: "réfléchir à une 'galerie' de disposition des
fenêtres selon les usages comme dans les logiciels d'édition". U11's
question — where the clock, the frame, the output, the layers and an app's
own controls live — asked again, now that every box is a component (S3,
S14b, S15a) and can be put anywhere. Nothing here is built; this is what
the author reads, and answers.

## What the editing software does

- **Blender** — *workspaces*, tabs along the top: Layout, Modeling,
  Shading, Animation, Rendering… Each is a split of the window into
  editors, its own; a tab is a click, the scene the same in all of them. A
  workspace is saved in the file, and new ones are made from a template.
- **Photoshop, Illustrator** — *workspaces* from a menu: Essentials,
  Painting, Photography… which panels are open, where, folded or not; one
  of the user's saved by name; *Reset* puts one back as it was.
- **DaVinci Resolve** — *pages* along the bottom: Media, Cut, Edit, Fusion,
  Color, Deliver — one per stage of a job, each its own layout and tools.
- **Figma** — few: the panels stay, *UI3* hides them all with one key
  (Ctrl \\), for the canvas alone.

What they share: the work stays where it is; only what is round it moves;
a layout is chosen in one click or one key, never built at each session.

## What a layout is, in skweeb

A layout is data — rule 1's spirit — never a page of its own:

```js
{
  name: 'Model',                 // what the gallery calls it
  app: '3d',                     // or '*': every app
  sections: { shapes: 'open', view: 'open', light: 'folded', style: 'folded', motion: 'hidden' },
  order: ['shapes', 'view', 'light', 'style', 'motion'],
  side: 360,                     // the properties' width, px
  dock: 'open',                  // the layers at the panel's foot (S15b): open, one line, hidden
  player: 'under',               // the player under the viewer, or hidden
  views: 'vault',                // cluster's side view: the vault, the keys, the history, none
  floats: [],                    // boxes floating: 'print'
}
```

It says what is shown and where, never a value: a layout changed changes
no object, no recipe, no state — Ctrl Z does not see it.

## The gallery

A button in the title bar, *Layout ▾*, by Export: a grid of small
pictures, each a layout drawn as blocks — the viewer, the panel, its
sections as bars, the dock — its name under it. A click puts it on;
`Alt 1` to `Alt 5` the first five; *Save this one as…* keeps the page as
it stands under a name; *Reset* puts a given one back as it came.

## The uses, for a start — the 3D app

| layout | for | what is round the viewer |
|---|---|---|
| **Model** | placing and shaping | the shapes' list and the chosen's params open; View; Light and Style folded; Motion hidden |
| **Look** | a style, a light, a palette | Style and Light open, the shapes' list one line; the chosen's Look section only |
| **Motion** | a turntable, a swing, forces | Motion open, the player under the viewer, the shapes' Swing and Forces sections |
| **Out** | a print, an overlay, a character | the format's list in the viewer, the print floating, the layers' dock open |
| **Viewer** | looking, showing, OBS | the panel gone, the viewer whole; Tab gives it back |

The same five fit the other apps with their own sections: *Model* is
particles' Emission and Forces, filter's chain; *Out* is the same
everywhere.

## Where they live — for the author

1. **This browser only** (localStorage), a convenience: quick, nothing in
   the vault; lost with a cleared browser, not on the other machine.
2. **In the vault**, a `layout` object: on both machines, in the gallery,
   kin of nothing. A new type: `docs/object-model.md` changes, the
   author's call.
3. **In the suite**, the given layouts in `core/layouts.js`, in git — and
   the author's own in (1) or (2).

The proposal: 3 for the given ones, 1 for the author's own to begin, 2
once they are worth keeping across machines.

## For the author

- The five uses, or others — and which app first: the 3D app's, since
  S15 is its.
- Per app, or one gallery for every app with an app's own added.
- Where the author's own live: 1, 2 or 3 above.
- The button in the title bar, or a strip of tabs as Blender has them.
