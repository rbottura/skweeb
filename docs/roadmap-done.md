# Roadmap — the milestones done

What each finished milestone was and what proved it, moved out of
`docs/roadmap.md` word for word on 2026-10-22, when it stood at the
400-line cap — as the decisions' older days moved to files of their own.
How each was built is in its app's `STATUS.md`, and why in
`docs/decisions.md` and the files its head lists. M5 and M7 met their
*Done when* and stay in the roadmap, their catalogues open.

**M1 — core + gamepad moved in.** `core/` extracted while porting the app it
came from, so the kit was shaped by use, not guesswork. *Done when:* a loop
drawn and recorded lands in `vault/` with its recipe, its thumbnail and its
seed, from `skweeb/` and not from `sketch-2-print/` — done.

**M2 — grid v2 on core.** The 700-line sketch rewritten onto the kit: the
honest test of a core extracted from the gamepad. *Done when:* any vault
object is dithered and saved back with its source as its parent — **done
2026-09-22**.

**M3 — ckt v3.** Text, grid, dots, sprites, motion; no Matter, and no
`opencv.js` — datasets are cut in the browser by `apps/ckt/blobs.js`. *Done
when:* ckt regenerates a family like `Garam_blue` — letterforms with a
pattern on them, emitted as a `set` the gamepad loads as a brush family —
running itself and keeping its lineage: **done 2026-09-23**.

**M4 — compose: the fourth app, and the master render.** An app where objects
from every process are placed, timed, previewed live and rendered out — and
**where a finished output is made**: export in the other apps is demoted to a
shortcut for producing an asset, and anything with more than one element in
it goes through compose. *Done when:* a sheet of objects from three apps, one
of them moving, previews live, renders at print scale, and one object has a
URL you can send — **done 2026-09-24**, in five bricks
(`apps/compose/STATUS.md`). What it cost — video as frames plus ffmpeg, a
pin named `version` apart from time's `at`, `render()` made real — is in the
decisions of 2026-09-22 and `docs/object-model.md`.

**M6 — particles.** A particle is a function of its spawn slot and its age,
not a step in one shared simulation: so any frame renders on its own, a loop
whose emission repeats with its period closes exactly, and a frame draws
again at any size. Particles that interact — flocking, collisions — break
all three, and wait for a mode that caches. *Done when:* a torch loop that
closes, drawn with a vault set's sprites and scrubbed to any frame, and a
one-shot burst, both leave as sprite sheets a game engine loads — **done
2026-09-27**, in seven bricks (`apps/particles/STATUS.md`), Phaser 3 loading
the torch's sheet (`check-sheet-engine`). The link: `set → particles:
sprites`, a use. Open still: colour over life.

**M11 — the live stack, and smart objects.** The author's, 2026-10-06,
after a week of making things with the suite: "we really need the smart
objects and a new 'layer' system" — to try a filter over the composition it
will join, and to take a particle effect into filter without "a new tab,
then paste url and load from vault". After bgstaal's multipleWindow3dScene:
every app its own window, the windows one stack, each drawing it round its
own layer, with opacity and blend, live within one browser
(`docs/smart-objects.md`).

The bricks: **(0)** the spec — the `skw` out of the object model, at its
cap; the live stack and a placement's `opacity` and `blend` written in.
**(1)** Windows that know each other: each says who it is and what it has
on screen, its layer, over one channel; a Stack drawer in every app lists
the windows open. **(2)** The stack: one live composition the windows share
— a layer from a window or the vault added, hidden, moved up or down,
placed, its opacity and blend set, from any window. **(3)** Drawn in every
viewer: the layers under and over each app's own canvas, composited by the
browser as a save composites them; filter first. **(4)** *Send to ▸*: what
is on screen as another app's source — filter, grid, compose, rig — its
window found or opened, live as the first app changes. **(5)** Smart
objects: a `skw` saved, versioned, placed by reference, and every page
holding it drawn again when it changes; a live layer saved as one when what
holds it is saved. **(6)** Compose edits the stack: its page the live stack,
opacity and blend on every placement, saved as a page of smart objects,
printed and exported as it shows.

*Done when:* a particle loop sent to filter with no tab or URL, its look
tried live over a composition in the window behind, at an opacity and a
blend, and the three saved as a page of smart objects that follows when the
particles are changed and saved again. The link: `every app → every app: a
live layer`.

Later: a window as a lens — where it sits on the screen, the part of the
stack under it, bgstaal's own trick.

*Done* 2026-10-07, bricks 0 to 6: the stack in every window, *Send to ▸*,
smart objects, the stack saved as a page that follows — `check-page`.
