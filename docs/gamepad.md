# The gamepad on core's kit, off p5 (C6, planned 2026-11-18)

The author, 2026-11-18, of drawing in the planet's heart (M16n, `docs/worm.md`):
"j'aimerais réutiliser l'app gamepad elle-même, elle doit être retravaillée
pour fonctionner sans p5, peut-être que c'est le moment de faire cette
transition maintenant" — and, M16m and p landed: "on peut envoyer C6, le
port de l'app gamepad". The bricks below are planned from the gamepad's own
source, read whole that day, never from a summary of it (the `skweeb-app`
skill, *Porting a sketch*).

## What it is, read 2026-11-18

- **The page** (`index.html`, `app.js` 300): p5 and p5.joystick loaded as
  globals before the module. At boot a splash (`ui/BrushSelector.js` 248)
  chooses which of the manifest's families to load, the vault's sets offered
  as brushes beside them (M3's link); then the sketch, five panels of its
  own, core's vault panel, a status bar and a help card of its own. They
  speak through events on `document`.
- **The sketch** (`sketch/gamepadSketch.js` 572, past the cap): a p5
  instance the window's size, at the screen's pixel density. The ink is a
  `p5.Graphics`; the cursor (`core/joyImage.js` 113) stamps in five patterns
  (`core/stamp.js`); a reference image lies under the ink, the recordings'
  stage over it while it plays (`core/stage/`). Its state — the brush's
  family, sprite and pattern, and `params`, a plain object — is exported as
  live bindings the panels read and write. The page is fitted above the
  timeline by `viewFit.js` (68); a still is framed by `core/stillFrame.js` (93).
- **The pad** (`core/inputManager.js` 232): read once a frame, in four
  modes — drawing, and three panels the D-pad walks. Drawing: the left stick
  moves, A held stamps, the triggers or the right stick turn, X and Y scale,
  the D-pad steps the family and the sprite, R3 the pattern, L3 back to the
  middle; L1, Start and Select open the panels.
- **Its own panels**: the parameters (`ui/ParamPanel.js` 500, past the cap),
  a carousel of five columns walked by L1, R1 and the D-pad — clear, the
  ground, three speeds, a reference and its opacity, the pattern, the
  recording armed; the brushes (`ui/BrushPanel.js` 235); the timeline
  (`ui/TimelinePanel.js` 547, past the cap), every recording a layer over
  core/stage with a drawer of its timing, transform and look, by the mouse;
  the gallery (`ui/GalleryPanel.js` 377), a scratchpad of saves in IndexedDB
  (`core/imageStore.js` 232) published to a gallery only
  `scripts/dev-server.js` serves (`core/galleryPublisher.js` 95); the print
  (`ui/PrintBox.js` 77, core's PrintPanel). Their style: `ui/hud.css` (721,
  past the cap), `bsel.css`, `timeline.css`, `style.css`.
- **Saved** (`core/vaultBridge.js` 115): a still, its recipe the marks the
  recorder buffers (`core/stage/recorder.js`), its frame and its brush — none
  when an image lies under the ink; a recording as a `sequence`
  (`core/exportSequence.js` 128). Neither reopens in it: core replays both
  itself (`core/rebuild.js`), and the gamepad has no `rebuild.js`.
- **p5 in core**, for the gamepad's recordings alone: a clip's buffer is a
  `p5.Graphics` (`core/stage/player.js`), the layers are blitted by p5
  (`stage.js`), the sprites are `p5.Image`s (`registry.js`), and
  `rebuild.js` keeps a hidden p5 to replay a recording anywhere. A still is
  drawn again in Canvas 2D already (`core/stage/still.js`).

## The bricks

| | brick | branch | size | status |
|---|---|---|---|---|
| C6a | **core's stage off p5**: a clip's buffer a canvas, the layers blitted on a 2D context, the sprites decoded images, a recording replayed with no hidden p5 | `gamepad/stage-2d` | M | **landed 2026-11-18** — below; `check-gamepad`, new |
| C6b | **the page off p5**: its canvas, the ink, the cursor, the reference, the view and a still's composite in Canvas 2D, on its own frame clock; p5 and p5.joystick out of the page, `core/libs/p5.min.js` out of the repo | `gamepad/canvas` | M | next |
| C6c | **its params a schema**: `params.js` in core's panel, core's bar and keys, the format core's; the pad still draws, Start arms the recording; `ParamPanel.js`, the status bar and the help card gone | `gamepad/params` | M | |
| C6d | **a module**: `mount(host)`, `unmount()`; the families a section of its panel, each loaded when first drawn with, no splash; cluster mounts it — and the heart can (M16n) | `gamepad/module` | M | |
| C6e | **its objects its own**: `rebuild.js`, a still's and a recording's replay moved out of core; `?open=`, a still's marks back on the ink, a recording back on the timeline | `gamepad/reopen` | M | |
| C6f | **the timeline on core's kit**: core's Transport its clock, a layer's drawer rows of a schema; a recording in the stack played in its time | `gamepad/timeline` | M | waits: the author — below |
| C6g | **the scratchpad**: the gallery panel, IndexedDB and the publisher | `gamepad/scratchpad` | S | waits: the author — below |

M16n, drawn in the heart with the gamepad itself, comes after C6d; C6e to g
before it or after, in the author's order.

**C6a — core's stage off p5.** `SequencePlayer` built with no p5: its
buffer a canvas at `renderScale` times a density it is given — the
gamepad's screen's, what p5 did by itself; `SequenceStage.draw(ctx, w, h)`;
`registry.loadSelected()` decoding the images itself, a loader given in
tests; `rebuild.js`'s hidden p5 gone. The gamepad follows with the least:
its sprites loaded before its sketch rather than in p5's preload, the cursor
stamped through the ink's 2D context, the stage drawn on the canvas's.
*Done when* no `p5` is left in `core/` outside `core/libs/`; a recording
replayed in the vault, placed in compose, through filter, printed, as
before — the checks `reach.mjs` names; the timeline plays as before.
*Landed 2026-11-18*: `rebuild.js` reaches every page, so the gate ran all
fifty-one checks; `check-gamepad` is new, the gamepad's own — a recording
a layer, played on the stage, exported and replayed by core to the pixel.
A recording exported is its own pixels now, whatever the screen: p5 drew
its frames at the screen's density, twice their declared size on a HiDPI one.

**C6b — the page off p5.** `createSketch` with no p5: a canvas the window's
size at its pixel density, the ink a canvas beside it, `requestAnimationFrame`
its clock and its own `deltaTime`; keys by `keydown`, images by `Image`;
`viewFit.js` and `stillFrame.js` on a context. p5.joystick's one use, A
stamping, is the pad's already. *Done when* p5 is nowhere in the repo; rule
8's sentence on p5 is history (CLAUDE.md); `check-print`'s gamepad half and
`check-live`'s pass as before, served as plain files too.

**C6c — its params a schema.** The skill's shape. `params.js`: the move,
turn and scale speeds and the scale's limits, the reference's opacity, the
ground, the format — `content` and `source` are core's (`core/frame.js`) —
and the pattern; core's ParamPanel and its drawers; core's Bar saying the
brush and the count; keys through `core/keys.js`, the same letters as now.
The pad keeps all it does while drawing. Its carousel goes with the panel,
and Start arms and disarms the recording instead: the one thing of that
panel a hand on the pad needs while it draws. The pad walking core's
panel — its rows, its values — would be core's, for every app: a brick of
its own if the author wants it. *Done when* `ParamPanel.js`, the status bar
and the help card are gone, every value saved is the schema's, and
`hud.css` is under the cap.

**C6d — a module.** `appModule('gamepad', …)` (`core/mount.js`): its
markup, its style, `start`, `keep`; the pad, its keys, its clock and its
panels let go of at `unmount`. The splash goes: the families are a section
of the panel — the manifest's on this disk and the vault's sets offered as
brushes — each loaded the first time it is drawn with, so the D-pad steps
through all of them. Cluster's strip mounts it, its link gone. *Done when*
`check-mount` and `check-cluster` mount it twice round with nothing held
more, and it runs alone as ever (rule 7).

**C6e — its objects its own.** `apps/gamepad/rebuild.js`: `openObject` for
a still (`core/stage/still.js`) and a recording (the player), `reopens`,
`redraws` — what `core/rebuild.js` does for the gamepad today, moved where
the skill puts it. `?open=<id>`: a still's marks stamped again on the ink,
its brush and params restored; a recording a layer of the timeline again.
*Done when* the vault offers *Open in gamepad ↗* and it opens as saved.

**C6f — the timeline, the author's.** The timeline is a compositor of its
own: recordings stacked with a blend, a filter, a transform and a phase —
what compose does with objects (M4) and the stack with windows (M11). On
core's kit it is core's Transport and a drawer of rows for each layer; or
the recordings go to compose to be layered there, and the gamepad keeps one
played over its ink.

**C6g — the scratchpad, the author's.** A save goes to the vault and, as
since the gamepad began, to a scratchpad in IndexedDB browsed by Select and
published to a gallery only `scripts/dev-server.js` serves. The vault's
panel (V) shows the same saves with their recipes. Kept, or the vault alone.
