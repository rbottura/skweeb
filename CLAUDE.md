# skweeb — agent contract

A web sketch suite. Several drawing processes that share one vault of objects,
so a thing made in one is the raw material of the next.

**Read this file every session. Open a `docs/` file only when the task touches
it.** Everything below is load-bearing; nothing below is background.

## Map

| Path | What it is | Before touching it, read |
|---|---|---|
| `core/` | the shared kit — theme, panels and drawers, params, registry, rng, stage, vault client, GPU filters (`gpu/`) | `docs/core-api.md` |
| `apps/gamepad/` | draw with a gamepad, record sequences | — |
| `apps/grid/` | grid mapping and dithering over a still or a loop | — |
| `apps/ckt/` | type → dots → motion (ColorKineType v3) | — |
| `apps/compose/` | M4: objects from every app placed on one page | `apps/compose/STATUS.md` |
| `apps/filter/` | M5: any picture or loop through a chain of GPU filters | `apps/filter/STATUS.md` |
| `apps/fractals/` | M7: escape time on the GPU kit, a sprite copying itself, idles, and a field for particles | `apps/fractals/STATUS.md` |
| `apps/particles/` | M6: particles as a function of time — loops that close, frames that stand alone | `apps/particles/STATUS.md` |
| `apps/map/` | M8, begun: the map editor — a room on a grid of tiles, things placed on it, what can be walked and what answers, saved as a `map`; and its player, `play/`, point and click | `apps/map/STATUS.md` |
| `apps/rig/` | M9, begun: a drawing made of marks, rigged at its marks — its strokes its bones; poses, swings, walks by part, worms crawling | `apps/rig/STATUS.md` |
| `vault/` | every object ever made. Real files. **Not in git.** | `docs/object-model.md` |
| `gallery/` | the published subset. In git, deploys to the web. | `docs/object-model.md` |
| `server.js` | the vault write API; `server/static.js` serves the files, `server/delete.js` is the one way out of the vault | `docs/object-model.md`, *Trash, and deleting* |
| `assets/fonts/` | the suite's fonts. Open-licence only, verified. | `docs/fonts.md` |
| `scripts/` | the generators, and `frames-to-video.mjs` — a frame zip into a video, via ffmpeg. Video is a conversion, not a feature. `chrome.mjs` drives headless Chrome, `check-kit.mjs` is what a browser check stands on, and `check-compose.mjs`, `check-compose-export.mjs`, `check-gpu.mjs`, `check-filter.mjs`, `check-filter-save.mjs`, `check-look.mjs`, `check-vault.mjs`, `check-filters.mjs`, `check-frames.mjs`, `check-particles.mjs`, `check-particles-links.mjs`, `check-sheet-engine.mjs`, `check-fractals.mjs`, `check-map.mjs`, `check-map-play.mjs` and `check-rig.mjs` are sixteen, as commands. `import-legacy-grid.mjs` brings the original grid sketch's materials into the vault. `vault-merge.mjs` copies one vault's objects into another — each machine's old vault into the one on the laptop that travels. | — |
| `docs/roadmap.md` | milestones, open decisions | when planning |
| `docs/decisions.md` | what was decided before today, and why, by date | before reopening a decision |
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
4. **One concept per file, 400 lines hard cap.** If a file needs a table of
   contents it needs splitting. This is the thing we are escaping: CKT v2 was a
   1223-line `index.html` with ~200 global ids, and every edit to it cost an
   hour of reading.
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
   that owns the page.
8. **Every app is ES modules. No globals crossing file boundaries, ever.**
   p5 is not required, and new work does not take it on — grid and ckt draw
   with Canvas 2D. What still uses p5, the gamepad's sketch and core's replay
   of its recordings, uses the one version in `core/libs/`, in instance mode,
   until it is ported. Settled 2026-09-26.

## Running

```sh
node server.js            # http://127.0.0.1:3000/apps/gamepad/
node server.js --vault D  # …owning a throwaway vault at D instead of ./vault

# No runner, no dependencies, one file per concern. vault.mjs spawns its own
# server against a temporary vault, so it never touches yours.
for t in recorder clip export vault grid-map params rng playback frame joyimage registry ckt-motion ckt-blobs uses grid-material easing grid-growth compose-page compose-time compose-placements delete gpu-filters vault-kin particles-model spritesheet noise fractal fractal-copies fractal-motion fractal-field vault-events points map-grid map-things map-walk map-play rig-strokes rig-bones rig-motion rig-crawl; do
  node tests/$t.mjs || break
done

# In a real browser: compose in headless Chrome, on a copy of the vault.
node scripts/check-compose.mjs
node scripts/check-compose-export.mjs   # print scale: the PNG, the frames, the save
node scripts/check-gpu.mjs              # the GPU kit, on this machine's GPU
node scripts/check-filters.mjs          # filters from the stylise batch on, each against what it does
node scripts/check-filter.mjs           # the filter app: a chain built, a loop played, no WebGPU
node scripts/check-filter-save.mjs      # …and what it saves: replayed, reopened, placed in compose
node scripts/check-look.mjs             # M5's link: a look made in filter, over a placement in compose
node scripts/check-vault.mjs            # the vault panel: kin together, folders, the lineage switch
node scripts/check-frames.mjs           # a flipbook in compose: next frames, stepped, picked up, saved
node scripts/check-particles.mjs        # particles: a loop that closes, sprites, saved, replayed, placed, a sprite sheet
node scripts/check-particles-links.mjs  # particles from other apps' objects: a dot-set or a shape's ink as the emitter; a fractal's field
node scripts/check-sheet-engine.mjs     # that sheet loaded and played by Phaser 3, fetched into the page only
node scripts/check-fractals.mjs         # the GPU's Mandelbrot against doubles, the wheel, the drag; copies of a star; idles of both families saved and placed
node scripts/check-map.mjs              # M8's map editor: tiles, walls, things and their events; saved, replayed, reopened, placed in compose
node scripts/check-map-play.mjs         # M8's player: what answers outlined, a sign shown, a warp followed and back
node scripts/check-rig.mjs              # M9's rig: bones from strokes, a pose and a loop saved, presets by part, a crawl round a path

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
