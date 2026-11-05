# STATUS — cluster, the scene
_last touched: 2026-11-05_

S9c on the board of `docs/plan.md`: M12's scene (`docs/scene.md`), the
apps round one canvas. The name is the author's, "pour l'instant"
(2026-11-04): a word of space that holds many objects. Rule 7 holds: every
app still opens alone on its own page; the scene is one more host.

## Works now

- **One app at a time, each through its module** (`main.js`): a strip on
  the left names the suite's apps — the vault, grid, ckt, compose, filter,
  fractals, particles, map, the rig, the 3D app — and a click on one takes
  the app there out, with everything it held, and mounts that one in its
  place (`mount(host)`, `unmount()`, `core/mount.js`). The vault first: the
  app open when nothing else is. The gamepad is a link to its own page: it
  draws with p5 until C6.
- **The address says which app**: its fragment, `#particles`. Opened with
  one, that app is mounted; Back goes to the app before. What the address's
  query asks — `?open=<id>` — is the app's to read, as on its own page, and
  a switch leaves it behind, so the next app is asked nothing the last one
  was. A page that sets its query to go back to a state of its object (the
  graph, `core/shell/graph.js`) keeps the fragment, and so its app.
- **A switch asked while an app boots** waits for it, and the app asked
  last is the one mounted — never one taken out halfway through its boot.
- **An app is never seen without its layout**: its stylesheet, linked by
  its mount, has loaded before its nodes are built (`core/mount.js`); taken
  out, it goes with the app — two apps' stylesheets are never on the page.
- **The search finds the apps** — ², Ctrl K, "map", Enter — as it finds the
  viewer's tools (`data-pal`, `core/Palette.js`), said to be the cluster's.
- **With no vault at all** it opens on the vault app, which says so, and
  mounts the others as ever.
- `check-cluster`: every app mounted in turn, twice round, nothing more held
  after the second round than after the first — listeners, channels,
  intervals, frames asked for — and a switch cut short holding what the app
  held when it came in turn.

## Known

- **An app comes back as it starts**, not as it was left: its values, its
  object bound and its steps go with it at a switch, as a page closed. The
  next brick keeps them (`docs/plan.md`, S9c).
- **A switch while an app saves** takes it out mid-save: the save goes on
  in the background and lands in the vault, but nothing says so.
- **Each app keeps its own canvas and its own layout**: the viewer moves
  from one app to the next. One canvas fixed in the middle, the last frame
  held between two apps and the panels leaving and coming are the bricks
  after (`docs/scene.md`).
- **Open in … ↗, Place in compose ↗, Rig this ↗** open a new tab, as on any
  page: in the scene they should mount that app in place, its object
  reopened.

## Next

The bricks of S9c, in order (`docs/plan.md`): an app comes back as it was
left; the links between apps taken by the scene; one canvas fixed in the
middle and the last frame held; the panels leaving and coming as the bench
has them.
