# skweeb — agent contract

A web sketch suite. Several drawing processes that share one vault of objects,
so a thing made in one is the raw material of the next.

**Read this file every session. Open a `docs/` file only when the task touches
it.** Everything below is load-bearing; nothing below is background.

## Map

| Path | What it is | Before touching it, read |
|---|---|---|
| `core/` | the shared kit — theme, panels, drawers and cards, params, registry, rng, stage, vault client, GPU filters (`gpu/`), the print, a guide read in an app, an app's mount and what it holds (`mount.js`, `scope.js`); `libs/` holds p5, three.js and Lit, one version each, and MediaPipe — fetched on each machine, git keeps its README | `docs/core-api.md`; what leaves the suite — export, the print — `docs/core-export.md` |
| `apps/gamepad/` | draw with a gamepad, record sequences; E prints the drawing | — |
| `apps/grid/` | grid mapping and dithering over a still or a loop | — |
| `apps/ckt/` | type → dots → motion (ColorKineType v3) | — |
| `apps/compose/` | M4: objects from every app placed on one page, each at an opacity and a blend | `apps/compose/STATUS.md` |
| `apps/filter/` | M5: any picture or loop through a chain of GPU filters | `apps/filter/STATUS.md` |
| `apps/fractals/` | M7: escape time on the GPU kit, a sprite copying itself, idles, and a field for particles | `apps/fractals/STATUS.md` |
| `apps/particles/` | M6: particles as a function of time — loops that close, frames that stand alone | `apps/particles/STATUS.md` |
| `apps/map/` | M8, begun: the map editor — a room on a grid of tiles, things placed on it, what can be walked and what answers, saved as a `map`; and its player, `play/`, point and click | `apps/map/STATUS.md` |
| `apps/rig/` | M9, begun: a drawing made of marks, rigged at its marks — its strokes its bones; poses, swings, walks by part, worms crawling; and its player, `puppet/`, worn in OBS: the author's eyes from the camera at the eyestalks' tips, the mouth on the face, the body swaying with the head; the rig's bones over it as guides; sent, kept as a smart object OBS follows | `apps/rig/STATUS.md`; for OBS, `docs/guides/obs.md` |
| `apps/3d/` | M10, begun: primitives made from their params, seen from anywhere, drawn by three.js on the page's GPU device, saved as a `model` | `apps/3d/STATUS.md` |
| `apps/vault/` | S9b: the vault full screen — core's vault panel docked, the object chosen drawn large and played; makes nothing | `apps/vault/STATUS.md` |
| `apps/cluster/` | S9c: *cluster*, the scene — the apps mounted one at a time through their modules, a strip naming them, the vault first; laid as the bench is, the scene's vault four columns of pictures, the viewer in one place, the properties one panel — the app's panels a tab each (`tabs.js`), its sections folded in it — leaving and coming at a switch, the last frame held (`held.js`); `#<app>` in the address | `apps/cluster/STATUS.md`, `docs/scene.md` |
| `vault/` | every object ever made. Real files. **Not in git.** | `docs/object-model.md` |
| `gallery/` | the published subset. In git, deploys to the web. | `docs/object-model.md` |
| smart objects, the live stack | M11: the `skw`, and every open window one layer of a stack each draws | `docs/smart-objects.md` |
| `server.js` | the vault write API; `server/static.js` serves the files, `server/delete.js` is the one way out of the vault, `server/versions.js` a smart object's states, a tree by their parents — since S6b an app's S is one | `docs/object-model.md`, *Trash, and deleting* |
| `assets/fonts/` | the suite's fonts. Open-licence only, verified. | `docs/fonts.md` |
| `scripts/` | the generators, and `frames-to-video.mjs` — a frame zip into a video, via ffmpeg. Video is a conversion, not a feature. `chrome.mjs` drives headless Chrome, `check-kit.mjs` is what a browser check stands on, and `check-compose.mjs`, `check-compose-export.mjs`, `check-gpu.mjs`, `check-filter.mjs`, `check-filter-save.mjs`, `check-look.mjs`, `check-vault.mjs`, `check-filters.mjs`, `check-frames.mjs`, `check-particles.mjs`, `check-particles-fields.mjs`, `check-particles-links.mjs`, `check-sheet-engine.mjs`, `check-fractals.mjs`, `check-map.mjs`, `check-map-play.mjs`, `check-rig.mjs`, `check-puppet.mjs`, `check-3d.mjs`, `check-3d-poster.mjs`, `check-print.mjs`, `check-live.mjs`, `check-send.mjs`, `check-smart.mjs`, `check-page.mjs`, `check-palette.mjs`, `check-guides.mjs`, `check-rows.mjs`, `check-keys.mjs`, `check-steps.mjs`, `check-states.mjs`, `check-graph.mjs`, `check-mount.mjs` and `check-cluster.mjs` are thirty-four, as commands; `chrome.mjs` opens more tabs than one, for windows that talk to each other. `lines.mjs` is rule 4 as a command: a file past 400 lines split or kept whole with its reason, none past 600. `checks.mjs` is the gate as one command, the browser checks several at a time; `reach.mjs` what a change reaches — the pages that load it, by their imports, and the checks that open them. `vendor-three.mjs` copies three.js into `core/libs/three/`, one version, pinned, with the add-ons the 3D app uses — its handles; `vendor-lit.mjs` copies Lit into `core/libs/lit/`, its one-file bundle, pinned. `vendor-mediapipe.mjs` fetches MediaPipe's face landmarker into `core/libs/mediapipe/`, one version, pinned — 15 MB of WASM and model that git never holds, so once a machine. `obs/hide-projectors.lua` is loaded in OBS itself: its projectors kept out of the screen it records; `obs/overlay.ps1` (with `Overlay.cs`, `ObsSocket.cs`, `Placed.cs`; `overlay.cmd` to double-click) puts the puppet's source over that screen as it stands in the scene, transparent, through obs-websocket (`docs/guides/obs.md`). `import-legacy-grid.mjs` brings the original grid sketch's materials into the vault. `vault-merge.mjs` copies one vault's objects into another — each machine's old vault into the one on the laptop that travels. | — |
| `docs/roadmap.md` | the milestones still open, the links, open decisions; the done ones in `docs/roadmap-done.md` | when planning |
| `docs/plan.md` | the work items of the cycle — the board: each with its branch, in order, and what waits on the author | before starting work, and when an item lands |
| `docs/workflow.md` | a branch for each work item: merge or rebase, the gate before landing, several machines | before branching, and before landing |
| `docs/boxes.md` | the shared boxes — Format, Ground, the player, Export, the Stack — what every app has, made once, and the layouts that place them | before touching any of them in an app |
| `docs/scene.md` | M12: the UI the bench found, an object's states as a tree, the space of contexts, and the scene, *cluster* — one canvas, the apps round it, each a module (`core/mount.js`) | before any brick of track S |
| `docs/decisions.md` | what was decided before today, and why, by date — the newest days; its head lists the files the older ones moved to, `docs/decisions-<from>-to-<to>.md` | before reopening a decision |
| `docs/migration.md` | what the ancestors measured, and what a port must know | before porting |
| `docs/inbox.md` | the author's ideas between bricks, not yet sorted | when the author has one, and at the end of a session |

## The one idea

An **object** is anything the suite can make or eat: a still, a loop, a dot
dataset, a shape, a font, a parameter set. Every object carries the recipe that
made it and the ids of the objects it came from.

That is the whole point. It is what lets a loop recorded on the gamepad become
the input of a grid dither, and that result become a pattern inside ckt — with
every step still able to say where it came from and re-render itself bigger.

A `.skw` is the live version of that: a sketch with its parameters bound in,
placed by reference rather than copied. Edit the definition and every placement
follows. `parents` records what something was made from; `refs` records what it
still depends on. The two are not interchangeable.

And the objects are only half of it. What makes this a suite rather than three
apps sharing a drawer is the **links**: named, one-way capabilities one app
offers another — *ckt produces a gamepad brush family*. Declared by the producer,
never symmetric, never inferred. The catalogue of links is the map of the suite.
→ `docs/core-api.md`

`docs/object-model.md` is the contract. Do not invent fields.

## Rules

1. **Params are data.** An app declares its parameters as a schema; the panel
   UI, the saved recipe and the gallery filters are all generated from it.
   Adding a control is one schema entry — never HTML + CSS + JS + a serializer.
   → `docs/core-api.md`
2. **Seeded, never loose.** `Math.random()` and p5's `random()` break
   re-rendering. Use `rng()` from core, seeded from the object.
3. **Manifests, not scans.** Assets are listed in a generated manifest. Nothing
   walks a directory at runtime — and no agent should have to either.
4. **One concept per file.** 400 lines is where a file is looked at, not
   where it is cut: past it, split it along a seam it already has — never
   into a part two, nor so that the halves share state or copy a setup — or
   keep it whole and give the reason in `scripts/lines.mjs`. Past 600 it
   splits. The docs every session reads — this file, `STATUS.md`,
   `docs/plan.md` — stay under 400. What we escape: CKT v2, a 1223-line
   `index.html` with ~200 global ids — its globals more than its length;
   every edit to it cost an hour of reading. A hard cap until 2026-10-22.
5. **No font or shader enters the repo or the vault without a licence record
   in the file itself.** Six fonts were pulled for this on 2026-09-21 —
   `docs/fonts.md`. A shader names its source and its licence; LYGIA, and
   Shadertoy code with no licence header, are noncommercial and stay out.
6. **No binaries in git** except `gallery/` and the minimum an app needs to
   boot. The vault lives on disk, ignored; so are the heavy sprite families
   (579 files, 140 MB) — `brushes` and `timbre` are enough to draw with.
   Three of this project's ancestors have `.git` folders over 100 MB; one is
   674 MB. That is what carelessness here costs.
7. **Every app runs alone.** `apps/<name>/index.html` opens and works with the
   vault absent. The suite is a shared core and a shared vault, not a shell
   that owns the page: a scene may host the apps round one canvas (M12,
   `docs/scene.md`), one more host and never the only one — the author's
   wording, 2026-11-03.
8. **Every app is ES modules. No globals crossing file boundaries, ever.**
   p5 is not required, and new work does not take it on — grid and ckt draw
   with Canvas 2D. What still uses p5, the gamepad's sketch and core's replay
   of its recordings, uses the one version in `core/libs/`, in instance mode,
   until it is ported. Settled 2026-09-26. The 3D app draws with three.js, its
   one version in `core/libs/three/` — the author's call, 2026-10-06. The
   suite's components are custom elements written with Lit, its one version
   in `core/libs/lit/`, rendering into the page's DOM, no shadow root, no
   build — the author's call, 2026-11-03.

## Branches

Nothing is committed on `main`. Every work item is a branch, named on the
board in `docs/plan.md` and made from `main` when the item starts. Rebase it
on `main` to catch up — never merge `main` into it; land it after the gate —
the unit loop, the browser checks of what it touched, rule 4's lines,
its docs and its board row written — with `git merge --no-ff` when it has
two commits or more, `--ff-only` when it has one. A session ends pushed,
finished or not. Since 2026-10-22, the author's ask → `docs/workflow.md`

## Running

```sh
node server.js            # http://127.0.0.1:3000/apps/gamepad/
node server.js --vault D  # …owning a throwaway vault at D instead of ./vault

# No runner, no dependencies, one file per concern. vault.mjs spawns its own
# server against a temporary vault, so it never touches yours.
for t in recorder clip export vault grid-map params steps rng playback frame trim graph-layout merge joyimage registry ckt-motion ckt-blobs uses grid-material easing grid-growth compose-page compose-time compose-placements delete gpu-filters vault-kin particles-model spritesheet noise png fractal fractal-copies fractal-motion fractal-field vault-events points map-grid map-things map-walk map-play rig-strokes rig-bones rig-motion rig-crawl 3d-shapes 3d-camera 3d-model 3d-pick 3d-handles 3d-modifiers 3d-look windowed stage-still live stack place smart puppet-eyes puppet-mouth puppet-sway puppet-roles scope reach; do
  node tests/$t.mjs || break
done
node scripts/lines.mjs                  # rule 4: past 400 lines, a reason; past 600, none; the gamepad's four known

# The gate in one command: the unit tests, rule 4, and the browser checks the
# branch's changes reach — several at a time, a failure run again alone.
node scripts/checks.mjs --gate --since main
node scripts/checks.mjs                 # every browser check; `checks.mjs mount print`, those by name
node scripts/reach.mjs --since main     # what each change reaches, and why

# In a real browser: compose in headless Chrome, on a copy of the vault.
node scripts/check-compose.mjs
node scripts/check-compose-export.mjs   # print scale: the PNG, the frames, the save
node scripts/check-gpu.mjs              # the GPU kit, on this machine's GPU
node scripts/check-filters.mjs          # filters from the stylise batch on, each against what it does
node scripts/check-filter.mjs           # the filter app: a chain built, a loop played, no WebGPU
node scripts/check-filter-save.mjs      # …and what it saves: replayed, reopened, placed in compose
node scripts/check-look.mjs             # M5's link: a look made in filter, over a placement in compose
node scripts/check-vault.mjs            # the vault panel: kin together, folders, the lineage switch; the vault app, an object drawn as chosen
node scripts/check-frames.mjs           # a flipbook in compose: next frames, stepped, picked up, saved
node scripts/check-particles.mjs        # particles: a loop that closes, a burst, print scale, a set's sprites; saved, replayed, placed, a sprite sheet
node scripts/check-particles-fields.mjs # …emitters and fields, depth, a burst's sheet; the guides dragged; a picture from outside as the sprite
node scripts/check-particles-links.mjs  # particles from other apps' objects: a dot-set or a shape's ink as the emitter; a fractal's field
node scripts/check-sheet-engine.mjs     # that sheet loaded and played by Phaser 3, fetched into the page only
node scripts/check-fractals.mjs         # the GPU's Mandelbrot against doubles, the wheel, the drag; copies of a star; idles of both families saved and placed
node scripts/check-map.mjs              # M8's map editor: tiles, walls, things and their events; saved, replayed, reopened, placed in compose
node scripts/check-map-play.mjs         # M8's player: what answers outlined, a sign shown, a warp followed and back
node scripts/check-rig.mjs              # M9's rig: bones from strokes, a pose and a loop saved, presets by part, a crawl round a path
node scripts/check-3d-poster.mjs        # the 120×176 poster at 300 dpi, once: 77 tiles into one streamed PNG, checked whole
node scripts/check-print.mjs            # every app's print in tiles against its object drawn whole; a gamepad still from its marks; the gamepad's print box; the 3D app's print panel
node scripts/check-live.mjs             # M11: windows of one browser sharing a stack, each drawing it round its own canvas
node scripts/check-send.mjs             # M11: Send to ▸ filter — a window opened, following particles; saved, particles first
node scripts/check-smart.mjs            # M11: smart objects — saved, versioned, drawn again wherever they are held
node scripts/check-page.mjs             # M11 done: the stack saved as a page of smart objects that follows its windows
node scripts/check-palette.mjs          # S5: ² or Ctrl K, every control and act of the page by name; Enter takes it
node scripts/check-guides.mjs           # S8: rulers, guides out of them and back, the magnet, F placing the handle pressed
node scripts/check-rows.mjs             # S2, S2b: a value on one line — its unit in its box, dragged, marked; pairs; the fold
node scripts/check-keys.mjs             # S5b: the left hand — keys by place, tapped or held for a pie; an app's own keys kept
node scripts/check-steps.mjs            # S6c: the session's steps — Ctrl Z, Ctrl Y; a drag one step, a Reset one
node scripts/check-graph.mjs            # S7: H, the states as a graph over the page — hovered drawn, clicked gone back to, a branch; two compared and merged; A, where a state goes
node scripts/check-states.mjs           # S6b, S6d: S the next state of a smart object; a still named from it; a row's value in each state; pinned in compose
node scripts/check-mount.mjs            # S9: an app a module — mounted, unmounted with nothing left, mounted again elsewhere
node scripts/check-cluster.mjs          # S9c: the scene — every app mounted in turn from the strip, twice round, nothing held more; the address
node scripts/check-puppet.mjs           # the rig's puppet: a fake camera read once a frame, eyes and mouth worn, the body swayed, the guides, the camera switched; sent and followed by a page in OBS; parts found drawn eyes first, and told
node scripts/vendor-mediapipe.mjs       # once a machine, before the puppet reads a face: MediaPipe into core/libs/mediapipe/, out of git
node scripts/check-3d.mjs               # M10's 3D app: primitives by three.js, turned by hand, chosen by a click and moved by handles, twisted by a stack, drawn in a style; a model saved, drawn again at scale 2, placed; with WebGL2 too

# On a GPU Chrome keeps WebGPU from — the laptop's Intel — a GPU check skips
# its GPU half, unless Chrome is given the flags:
CHROME_FLAGS="--enable-unsafe-webgpu --enable-features=Vulkan" node scripts/check-fractals.mjs
```

The server serves the repo root, so an app is at `/apps/<name>/`, the kit at
`/core/` and the objects at `/vault/`.

## Ending a session

Rewrite `STATUS.md` — works now / broken / **next single step** / parked
decisions. One concrete step, small enough to finish in 30 minutes. This is the
file that makes the next session cost nothing to start.

Then sort `docs/inbox.md` — each idea onto the plan, marked a side job, or
parked, as its head says. An idea the author has mid-brick goes there, not
into the brick under way.

Then commit what the session did on its branch and push it. An item done
lands, its row on the board marked `landed` with the date (`docs/workflow.md`,
*The gate*); one not done stays pushed for the next machine to take up.
