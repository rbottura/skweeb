# skweeb — agent contract

A web sketch suite. Several drawing processes that share one vault of objects,
so a thing made in one is the raw material of the next.

**Read this file every session. Open a `docs/` file only when the task touches
it.** Everything below is load-bearing; nothing below is background.

## Map

| Path | What it is | Before touching it, read |
|---|---|---|
| `core/` | the shared kit — theme, panels and drawers, params, registry, rng, stage, vault client | `docs/core-api.md` |
| `apps/gamepad/` | draw with a gamepad, record sequences | — |
| `apps/grid/` | grid mapping and dithering over a still or a loop | — |
| `apps/ckt/` | type → dots → motion (ColorKineType v3) | — |
| `vault/` | every object ever made. Real files. **Not in git.** | `docs/object-model.md` |
| `gallery/` | the published subset. In git, deploys to the web. | `docs/object-model.md` |
| `server.js` | static server + the vault write API | — |
| `assets/fonts/` | the suite's fonts. Open-licence only, verified. | `docs/fonts.md` |
| `scripts/` | the generators, and `frames-to-video.mjs` — a frame zip into a video, via ffmpeg. Video is a conversion, not a feature. | — |
| `docs/roadmap.md` | milestones, open decisions | when planning |
| `docs/migration.md` | what the ancestors measured, and what a port must know | before porting |

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
5. **No font enters the repo or the vault without a licence record in the
   file itself.** Six were pulled for this on 2026-09-21 — `docs/fonts.md`.
6. **No binaries in git** except `gallery/` and the minimum an app needs to
   boot. The vault lives on disk, ignored; so are the heavy sprite families
   (579 files, 140 MB) — `brushes` and `timbre` are enough to draw with.
   Three of this project's ancestors have `.git` folders over 100 MB; one is
   674 MB. That is what carelessness here costs.
7. **Every app runs alone.** `apps/<name>/index.html` opens and works with the
   vault absent. The suite is a shared core and a shared vault, not a shell
   that owns the page.
8. **Every app is ES modules, instance-mode p5, one p5 version** (`core/libs/`).
   No globals crossing file boundaries, ever.

## Running

```sh
node server.js            # http://127.0.0.1:3000/apps/gamepad/
node server.js --vault D  # …owning a throwaway vault at D instead of ./vault

# No runner, no dependencies, one file per concern. vault.mjs spawns its own
# server against a temporary vault, so it never touches yours.
for t in recorder clip export vault grid-map params rng playback frame joyimage registry ckt-motion ckt-blobs uses grid-material; do
  node tests/$t.mjs || break
done
```

The server serves the repo root, so an app is at `/apps/<name>/`, the kit at
`/core/` and the objects at `/vault/`.

## Ending a session

Rewrite `STATUS.md` — works now / broken / **next single step** / parked
decisions. One concrete step, small enough to finish in 30 minutes. This is the
file that makes the next session cost nothing to start.
