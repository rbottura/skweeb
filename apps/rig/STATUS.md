# STATUS — rig
_last touched: 2026-10-22_

M9's app (`docs/roadmap.md`, M9): a drawing made of marks, rigged at its
marks. Its strokes are its bones; each stamp rides its own stroke's and
stays whole, so a bend crowds and fans them like scales. It comes between
M8's bricks 3 and 4, to give the map's avatar a body that walks — and, the
author's direction, many slugs and worms that crawl. And its player, the
**puppet** (`puppet/`), worn by the author in OBS — below.

## The puppet — `puppet/`, begun 2026-10-21

The author's ask, from the inbox: a VTuber avatar — a slug's bust drawn in
the gamepad, its body a tube of stamps, two eyestalks — wearing the
author's own eyes from the camera, moved a little by the head, shown in
OBS. M9's *later*, "the gamepad as a puppeteer", with the face as one.
`/apps/rig/puppet/?drawing=<id>`; `&obs`, the avatar alone. Its bricks:
**(1)** the eyes — done 2026-10-21; **(2)** in OBS — done 2026-10-21;
**(3)** moved by the head, the eyes trembling less — done 2026-10-22;
**(4)** the mouth on the face, and the rig's guides over the puppet —
done 2026-10-22, the author's ask: "on peut rajouter la bouche et la
visualisation des guides de l'app de rig ?"; **(5)** kept and followed in
OBS, the camera switched, the parts found and told — done 2026-10-22, the
author's: settings that did not stay in OBS, "un moyen de disable la cam
avec un bouton pour faire des aller retour facilement entre skweeb et obs",
and a drawing made eyes first whose mouth went into an eye.

- **Kept, and followed in OBS** (2026-10-22; `keeping.js`, `rebuild.js`;
  `check-puppet` 41). *Send to OBS*, or S, keeps the puppet in the vault as
  a smart object — a `params` object, its values the recipe, its picture
  the avatar as worn then, `origin.app` `rig/puppet` so core's paths find
  `puppet/rebuild.js` and this page. The first send makes it and binds the
  window; every send after is its next version. Its address is then
  `?open=<id>`, given to OBS once: the page in OBS hears each new version
  through the server's event stream and takes its values, with no reload.
  The button counts the changes OBS has not had. The vault offers it back,
  *Open in rig/puppet ↗*.
- **The avatar over the screen recorded, on nothing** (2026-10-22;
  `scripts/obs/overlay.ps1`, `Overlay.cs`, `ObsSocket.cs`, `Placed.cs`;
  `overlay.cmd` to double-click). OBS's projectors draw on black, so a
  window of skweeb's own: WPF from PowerShell 7, transparent, on top,
  clicks passing through, out of screen capture; standing where the source
  stands in the program scene and at its size — its alignment and bounds
  read, mapped through the scene's Display Capture onto the screen; showing
  OBS's own picture of it, asked of obs-websocket 5 fifteen times a second
  (`GetSourceScreenshot`, transparent round it). Ctrl+Alt+P takes hold of
  it: dragged it moves the source in OBS, the wheel sizes it, Esc lets go.
  The password is read from OBS's settings. Tried against a fake
  obs-websocket in the scratchpad, by its own `-Check`: placed at 60,620
  400×400 as the scene said, clicks through, on top, out of capture, a
  notch of the wheel 420×420 and OBS told so — not yet against OBS, whose
  WebSocket server is off here; a drag only by hand.
- **The avatar watched on the screen recorded** (2026-10-22;
  `scripts/obs/hide-projectors.lua`, the guide's *Watching the avatar*). An
  OBS projector of the source, always on top, on the very screen the
  Display Capture records: OBS's own "Hide OBS windows from screen capture"
  leaves projectors in on purpose (`OBSBasic::SetDisplayAffinity`, OBS 32),
  so a Lua script inside OBS asks Windows to keep every OBS window out of
  capture (`SetWindowDisplayAffinity`, WDA_EXCLUDEFROMCAPTURE), and gives
  back those it hid when taken out. Tried in OBS's own LuaJIT on a window
  titled as a projector: 0x0, 0x11, 0x0 again; not yet in OBS itself.
- **The camera switched** (`seeing.js`, which the camera and the reading
  moved into): off, it is let go and the puppet wears its own eyes; a page
  that finds the camera held, or none yet, asks again every two seconds —
  so OBS takes it as soon as the window lets go.
- **The parts found, and told** (`roles.js`, `drawers.js`;
  `tests/puppet-roles.mjs` 17). The puppet no longer takes the first stroke
  for the body, as the rig does: its body is the widest stroke, the longest
  among strokes as wide, read from its base — its higher end the face;
  every other stroke is read from the end it hangs by, an eyestalk when it
  hangs from the body's upper half and points up, a limb otherwise; and the
  body is hung first. The rig took `order` in `proposeBones` and `reverse`
  in `drawingOf` for it. On the author's drawing made eyes first,
  `gam_1792624494217_04d278`: the rig alone named an eye the body; the
  puppet, eye, eye, body. The *Parts* drawer shows each stroke in its
  guides' colour — its number on it in the guides — with the part found and
  a choice that tells it otherwise, kept as `parts`, a word a stroke.

- **The mouth on the face** (2026-10-22; `mouth.js`, `tips.js`, `crop.js`,
  `draw.js`; `tests/puppet-mouth.mjs` 15, `check-puppet` 23). Cut from the
  camera as the eyes are, wider than tall (0.75), faded to an ellipse; its
  box held to the face, not the lips — its width a share of the eyes'
  distance (a closed mouth is 0.85 of it; MediaPipe's portrait smiles at
  1.2), its middle between the corners and a little below, where an open
  mouth goes — so a smile and an open mouth move inside it. Worn on the
  face, the body's last stamp, or *lower* down the body, turning with it:
  *my mouth on the face*, *mouth size*, *around the mouth*, *mouth lower*.
  Each cut is laid just after the stamp it goes on (`drawRig` took an
  `after` for it), so the stalks drawn over the face's edge pass over the
  mouth too.
- **The guides** (2026-10-22; `guides.js`): B, or *guides* over the viewer,
  draws the bones as the rig draws them (`../guides.js`), moving with the
  head; a dashed ring where each eye and the mouth go; and in the corner,
  what the camera sees as the page shows it, the boxes cut from it ringed —
  to set *around the eye* and *around the mouth* by looking. A view, never
  in the address.

- **Moved by the head** (2026-10-22; `head.js`, `sway.js`, `wear.js`;
  `tests/puppet-sway.mjs` 24, `check-puppet` 18). MediaPipe's face
  transform read as yaw, pitch and roll, measured on its own portrait
  turned and mirrored, from *straight* — the head's first second in front
  of the camera, or C. The body bends towards a lean, a turn and a move
  aside (*sway with my head*), its top turning most and its base kept; the
  stalks lean into a turn; a nod lifts the drawing (*rise as I nod*). Each
  bone a damped spring on the way it points, so the stalks and arms are
  left behind and swing past (*wobble*). A gamepad drawing is cut into
  bones of 70 px (*longest bone*) so the body bends along it; a rig's pose
  keeps its own bones, its loop playing under the head. The room is fixed,
  with space for the sway, so the avatar keeps its size in OBS.
- **Steadier eyes** (2026-10-22). The face is read once a frame of the
  camera, when the video says the frame came (`requestVideoFrameCallback`),
  at that frame's time — read at every frame of the screen, the box moved
  between two screen frames over the same picture and the 1€ filter read a
  still frame, then a jump: measured on a portrait leaning in a video, the
  eye slid 1.24 px in its circle at every camera frame, and now none. An
  eye's centre is its ring of sixteen points; the boxes' size is the eyes'
  distance in depth as well as across, which a turn does not narrow — its
  wobble halved, and no zoom as the head turns; size and angle held still,
  the place let go fast, its speed counted in boxes a second.
- **Worn in OBS** (2026-10-21): the address the page writes as it changes,
  copied with `&obs`, in a Browser source — OBS started with
  `--enable-media-stream --use-fake-ui-for-media-stream`, which OBS 32
  needs to give a Browser source the camera; inside OBS without it the page
  says so. The guide, `docs/guides/obs.md`, is read in the page (G), by
  core's new `Guide.js`. The camera is let go with the page and asked for
  again while it is held, so a refresh finds it.
- **The author's eyes at the stalks' tips** (2026-10-21; `face.js`,
  `eyes.js`, `steady.js`, `crop.js`, `tips.js`, `draw.js`, `params.js`,
  `address.js`; `tests/puppet-eyes.mjs` 27). MediaPipe's Face Landmarker,
  `@mediapipe/tasks-vision` 1.0.1, on the GPU or the CPU, from
  `core/libs/mediapipe/` — `node scripts/vendor-mediapipe.mjs` once a
  machine; git keeps its README (rule 6). Each eye cut level, mirrored, a
  soft disc, drawn as wide as its stalk's last stamp and turned with it;
  with no face the drawing's own eyes show. On the author, in Chrome and in
  OBS: "je vois bien mes yeux au bon endroit".

Known: the head's motion and the mouth are tried on a portrait leaning in
a video, not yet on the author. A crawling rig is worn without the head's
motion, and shows no bones in its guides. A pose the rig saved keeps its
own parts: Parts tells only a gamepad drawing. Once kept, a change not sent
is lost with the page — the address is the kept puppet's. When OBS holds
the camera, the window waits until OBS lets go: hiding the source does it.
The camera is the browser's first unless chosen, and not remembered. An eye
is cut from about fifty of the camera's pixels and shown larger: soft.

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

- **Prints at a sheet's size and a dpi** (2026-10-06; core's print panel in
  the Export drawer, `docs/core-export.md`): the pose on screen, drawn again
  from its marks a window at a time through `core/windowed.js`, the bones
  never on it — sixteen tiles against the pose drawn whole (`check-rig`).
  Its drawing's stamps are core's now (`core/stage/still.js`), the same
  ones a gamepad still is printed with; its strokes are its own.
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

**The puppet on the author's own head** — P0 on the board of
`docs/plan.md`, waiting on an evening in OBS: *sway*, *rise as I nod*,
*wobble* and the mouth's size and place tried and set — what is too much,
what too little — and the defaults moved to what the author keeps.

Paused, the author's call on 2026-10-21: **brick 6 waits on the author —
the slug's back and side**, drawn in the gamepad as the front was (P5,
after P3 has defined a character). A worm stands on the map already — a
crawling loop placed as a thing goes round inside its own box. What comes
next for the worms is M8's: a path drawn on the map, that a thing follows
across the room (P7).
