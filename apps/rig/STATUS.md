# STATUS — rig
_last touched: 2026-10-02_

M9's app (`docs/roadmap.md`, M9): a drawing made of marks, rigged at its
marks. Its strokes are its bones; each stamp rides its own stroke's and
stays whole, so a bend crowds and fans them like scales. It comes between
M8's bricks 3 and 4, to give the map's avatar a body that walks.

## The bricks

1. **The rig opens a gamepad still and proposes its bones** — done
   2026-10-02: strokes found, joints at corners, a joint dragged bends and
   the stamps follow.
2. **A rig saved** — done 2026-10-02: a pose, a still the rig made, its
   bones whole; replayed and drawn again at any scale, reopened, placed in
   compose; the vault offers a gamepad drawing to the rig.
3. **Motion** — each bone a wave, the phase lagging down a chain; an idle
   saved as a loop that closes.
4. **A walk, and a character** — a back and a side drawn the same way, the
   same bones' names; a set, `role: 'character'`, for M8's avatar.

## Works now

- **A pose saved** (2026-10-02; `frames.js`, `save.js`, `rebuild.js`;
  `check-rig` 21). S saves the drawing as posed: a still, `origin.app:
  'rig'`, titled *the drawing · posed* or *· at rest*, its recipe
  `{ rig, bones, turns, box }` — the panel's values, the bones kept whole
  rather than proposed again, so a pose replays as it was if proposals
  change or a bone is one day moved by hand, a turn a bone, and the box its
  ink fills, found as the gamepad trims a still (core/trim.js) — its
  parent the drawing. frames.js `openPose` draws it, for the save and the
  replay alike: the vault's replay is its render to the pixel, and at
  scale 2 it is drawn again from the marks, sharp, where a gamepad still
  is stretched. `?open=` brings back its values, its bones and its turns;
  the vault offers *Open in rig ↗* for it, and compose places it. *Download
  the pose (PNG)* too.
- **`gamepad → rig: a drawing's strokes as limbs`** (2026-10-02;
  `core/reopen.js` `rigUrl`, `core/vault-detail.js`). The vault offers
  *Rig this ↗* for a still with marks — the rig's `rebuild.js` says which
  it takes (`rigs`), as compose's says which it places — and the rig opens
  on it, `?drawing=<id>`.
- **A gamepad still, rigged at its marks** (2026-10-02; `drawing.js`,
  `strokes.js`, `bones.js`, `skin.js`, `draw.js`, `guides.js`,
  `pointer.js`; `tests/rig-strokes.mjs` 18, `tests/rig-bones.mjs` 18,
  `check-rig` 13). A still is chosen in the Drawing drawer, or
  `?drawing=<id>`; its recipe's marks are stamps in its picture's pixels,
  cropped as it was, a mirror pattern's copy a stroke of its own. Strokes
  are found where the brush jumped — *a lifted pen*, 16 px, or six of its
  usual steps — never where it paused, since the recorder keeps no mark
  for a brush held still. A stroke's line turns at its corners — *a
  corner*, 30° over a reach either side, a true peak, never a flick at
  an end — and each run between joints is a bone, a run past *longest
  bone* cut evenly. A chain hangs from the nearest bone drawn before it;
  a dot rides the bone nearest it. A stamp rides its own stroke's bones,
  shared within *bend* px of a joint, half and half at the joint, so a
  bend fans. Drawn again from the marks with Canvas 2D, as the gamepad's
  replay draws a mark: at rest the author's slug comes back within 0.04
  of 255 of its saved render, and a drawing made in the check to the
  pixel. The bones over it, a colour a chain (B); a bone's far end,
  dragged, turns it about its joint and carries what hangs from it; R,
  or *Back to rest*, puts every bone back. With no vault it opens and
  asks for a drawing; a still with no marks is said to have none.
- `core/sprites.js` gained `familySprite(familyId, index)`: a recorded
  mark's picture without p5 — the gamepad's manifest, or a vault set the
  gamepad drew with.

## Known

- A pose keeps its bones by number, its turns beside them: a correction by
  hand will have to keep those numbers, or carry the turns across.
- A pose saved on a white ground is white across its whole box.
- The proposal cannot yet be corrected by hand — a joint added or taken
  away, a chain hung elsewhere — and a bone has no name of its own.
- A chain hangs from its stroke's first mark: an arm drawn from the hand
  to the shoulder hangs from the hand. The slug was drawn from the body
  out, every stroke.
- A dot rides one bone whole. A stroke shorter than 4 px is a dot.
- The stage has a quarter of the picture's longer side as room round it;
  a long limb swung far can leave it.
- A family not on this disk draws nothing, and says how many sprites
  would not load (rule 6 keeps the heavy families out of git).

## Next single step

**Brick 3, its first step: a bone moves by itself.** In a *Motion* drawer,
for the chosen bone — its handle pressed, as now — a turn that swings:
*amplitude*, degrees, and *phase*; the loop *length* in frames and its
*fps*, every bone's swing a whole number of cycles a loop so frame
`length` is frame 0. Played by a `Playhead` (core/playback.js), each
frame a pure function of its index (frames.js, as `openPose` is): no
clock, no state. Held in a test: a loop closes, pixel for pixel. Then the
phase lagging down a chain, so a stalk follows its base, and an idle saved
as a `sequence`.
