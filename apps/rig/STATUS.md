# STATUS — rig
_last touched: 2026-10-02_

M9's app (`docs/roadmap.md`, M9): a drawing made of marks, rigged at its
marks. Its strokes are its bones; each stamp rides its own stroke's and
stays whole, so a bend crowds and fans them like scales. It comes between
M8's bricks 3 and 4, to give the map's avatar a body that walks — and, the
author's direction, many slugs and worms that crawl.

## The bricks

1. **The rig opens a gamepad still and proposes its bones** — done
   2026-10-02: strokes found, joints at corners, a joint dragged bends and
   the stamps follow.
2. **A rig saved** — done 2026-10-02: a pose, a still the rig made, its
   bones whole; replayed and drawn again at any scale, reopened, placed in
   compose; the vault offers a gamepad drawing to the rig.
3. **Motion** — done 2026-10-02: each bone a wave, the phase lagging down
   a chain; a loop saved, replayed, closing to the pixel, placed.
4. **Parts and presets** — done 2026-10-02: each chain named, a walk, a
   waddle, an idle set by part, a rise.
5. **Crawling** — done 2026-10-02: the body a spine, undulating in place or
   following its head round a path.
6. **Views and a character** — a back and a side drawn as the front, named
   the same; a set, `role: 'character'`, for M8's avatar.

## Works now

- **Worms crawl** (2026-10-02; `crawl.js`, `tests/rig-crawl.mjs` 30,
  `check-rig` 35). The Crawl drawer moves the body — the first stroke, its
  root chain's — as a spine, every stamp carried with it at the point
  nearest it, its offset and its turn kept, so the scales turn with the
  body and a stalk past the head stays on it. *In place*: a wave down the
  body — *undulate* degrees, a *wavelength*, *ripples* a loop, head to tail —
  its middle kept where it was drawn. *Along a path*: the head runs round a
  *circle*, *ellipse* or *eight* (*path width*, *height*), or a *drawn*
  path — a gamepad still, its first stroke, closed — *laps* a loop, either
  *way round*; a *wiggle* laid on the path, *wiggles* round it, fixed to the
  ground, makes the body slither through it, each point passing where the
  head passed. The stage widens to the path, drawn dashed. Whole ripples
  and laps close every loop to the bit; saved as `· crawling`, replayed to
  its render. On the author's snake: it writhes in place, and slithers
  round an ellipse; the slug scuttles round an eight.
- **Parts, and presets by part** (2026-10-02; `parts.js`, `presets.js`,
  `drawers.js`). Every chain is named — body, head, arm, leg, tail, left
  and right as seen — guessed from where it hangs on the body and which way
  it points, and changed in the chosen bone's *part*, for its whole chain:
  on the slug, all seven guessed right. The Motion drawer's presets — *Walk*,
  from the side; *Waddle*, from the front; *Idle*, breathing; *Still* —
  set a wave on each named chain's first bone, the chain following, legs
  against each other and each arm against its leg, and a *rise* of the
  whole drawing, a share of its body's length, *rises* times a loop. The bar
  says which parts move. What a preset sets is ordinary waves, edited after.
- **Bones that swing by themselves** (2026-10-02; `motion.js`,
  `chosen.js`, `tests/rig-motion.mjs` 13, `check-rig` 27). A handle
  pressed chooses its bone — a drag still turns it — and the column on the
  left edits its wave: *swing*, degrees either way, *cycles* a loop, its
  *phase*, and whether *the chain follows*, each bone below it in its
  stroke a *lag* later: a stalk whips, its tip last. The waves add to the
  pose. Whole cycles, counted in whole frames before the sine, close every
  loop: frame `length` is frame 0, to the bit. The loop — *loop, frames*
  and *fps* in the Motion drawer — plays by a `Playhead` as soon as a
  bone swings; space stops it. S saves a loop as a `sequence` with its
  frames and rate, titled *· moving*, the waves in its recipe beside the
  pose, its box the ink of every frame so it never jitters; the vault's
  replay has its render among its frames to the pixel, and compose plays
  it. On the author's slug: both stalks whipping out of step, the arms
  waving against each other, the body swaying.
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
- A wave is kept by bone number, as a turn is: a preset applied again to
  another drawing is what carries a walk across, by part.
- A crawl's spine is the first stroke: draw a worm's body first, from its
  tail to its head — the last stamp, on top, is its face — and anything
  else after, from the body out. A body much longer than its path overlaps
  itself round it.
- While crawling the bones are not drawn and no handle is taken: a crawl
  is set in its drawer, a swing before it, crawl none.
- The walk is a side view's; on a drawing from the front it reads as a
  stomp — the waddle is the front's.

## Next single step

**Brick 6 waits on the author: the slug's back and side**, drawn in the
gamepad as the front was. A worm stands on the map already — a crawling
loop placed as a thing goes round inside its own box. What comes next for
the worms is M8's: a path drawn on the map, that a thing follows across
the room.
