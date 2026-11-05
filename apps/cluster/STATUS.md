# STATUS — cluster, the scene
_last touched: 2026-11-05_

S9c on the board of `docs/plan.md`: M12's scene (`docs/scene.md`), the
apps round one canvas. The name is the author's, "pour l'instant"
(2026-11-04): a word of space that holds many objects. Rule 7 holds: every
app still opens alone on its own page; the scene is one more host.

## Works now

- **Laid as the bench is** (`scene/canvas`, 2026-11-05 — the author's yes:
  "tu peux prendre la mise en page du bench qui est super"): the strip of
  apps, the scene's vault, the app's viewer and its player, its properties.
  The app's own boxes give up their layout (`display: contents`): its title
  bar, viewer, panels and status bar are laid in the scene's grid as they
  are, so **every app's viewer is in the same place to the pixel** and the
  canvas does not move; the player's strip keeps its room where nothing
  plays (`style.css`). The vault there is the scene's, the same one
  whatever app is round it; the vault app, mounted, builds none and draws
  what it opens (`given.vault`, `chosen`).
- **The properties, one panel as the bench's** (`scene/props`, 2026-11-05 —
  the author: "une liste de catégories dépliables mais tout dans une même
  section"): the tabs are its head, the panel's Reset at the end of their
  row; under them the app's sections fold, a hairline between each and no
  box of their own, a chevron turned, the height moving as one opens or
  shuts; a list of cards — the 3D app's shapes — rows the same way. Each
  of the app's panels a tab (`tabs.js`) — particles' two, compose's placed
  and page, map's map and things — the one shown kept for its next mount;
  a panel its app shows or hides, grid's maker, gains or loses its tab. An
  object opened in the scene's vault is a tab beside them, its detail, its
  picture there unless the vault app draws it; closed, the panel shown
  before it again.
- **The scene's vault, four columns of pictures** (`scene/props`): the
  author's "peut-être 3 colonnes ou 4" — a card is its picture, its name
  and type its title, a sequence marked by a small play; kin and folders
  kept, a folder two pictures wide with its name; the head two rows, what
  it is and its acts, then lineage, trash and the kinds, scrolled. Its
  density is three tokens of core's vault panel the scene sets (`--vp-card`,
  `--vp-gap`, `--vp-pad`); the vault app's own page keeps its large cards.
- **The panels leave and come** (`scene/panels`, 2026-11-05), as the
  bench's `swapping`: at a switch the properties — the tabs, the panel, the
  detail — slide out to their side and fade in 240 ms, the app going is
  taken out once they are gone, and the next app's slide in; the viewer and
  the vault do not move. Asked again meanwhile, they go out once; with less
  motion asked of the system, none.
- **The last frame held** (`held.js`): as an app is taken out its frame is
  copied over where its canvas was, and stays until the next app's canvas
  is first drawn on — watched from its build, before the app starts
  (`core/mount.js` `built`) — so the centre never flashes empty.
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
- **An app comes back as it was left** (`scene/kept`, 2026-11-05): taken
  out, it leaves what it was doing — the recipe it would save, the frame on
  screen and whether it played, the smart object it is bound to — and its
  next mount opens on that, as on an object asked for, saying "back as it
  was left" (`keep` in each app's module, `core/mount.js`, `core/reopen.js`
  `requested`). Its next S is the next state of the same object. The
  vault app keeps the object it draws. What the address asks goes first:
  an app given a query — a link to it — does as it says.
- **The links between apps are the scene's** (`scene/links`, 2026-11-05):
  *Open in … ↗*, *Place in compose ↗* and *Rig this ↗* in the vault's
  detail, the graph's open-in, the stack's saved page — followed through
  core (`core/reopen.js` `follow`) — mount that app here in place of the
  one open, the link's query with it, where alone they open a tab
  (`takeLinks`). The app left comes back as it was: Back after *Open in
  particles* is the vault app, the object it drew drawn again. The map's
  player and the gamepad stay tabs: they are not the scene's apps.
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
  held when it came in turn; a value moved in each app still there when it
  comes back, particles' smart object saved into again at its next state,
  the vault app's still drawn again; *Open in particles* and *Place in
  compose* taken in place from the vault app, no tab opened, and Back.

## Known

- **What an app keeps is its recipe**, not its session: its steps — Ctrl Z
  — start again, its zoom and what was chosen in it (a shape, a bone) go,
  compose's chosen placement aside; a file opened from disk is not kept,
  having no id, nor a window filter followed. A reload keeps nothing: the
  page's memory is where it is kept.
- **A switch while an app saves** takes it out mid-save: the save goes on
  in the background and lands in the vault, but nothing says so.
- **The motion at a switch is not worked out**: the panels go out, then
  everything else of the next app appears in one frame — its title bar's
  acts, its viewer's head, its rulers, its picture at its own size, its
  player — then the panels come in; "assez saccadées", the author found.
  What holds still, what adapts, what goes and comes, case by case, is
  S9e, worked out with the author (`docs/scene.md`, *The motion, case by
  case*).
- Keys and history, the bench's other side views, are not there yet (S9f);
  nor the bench's focus, the viewer alone.

## Next

S9e, the motion case by case, once the author has gone through the cases
of `docs/scene.md` (*The motion, case by case*); S11's bench first, the
author's "au plus vite". Then the keys and the history as side views
(S9f). What cluster settles flows onto the apps' own pages after — the
author's order, 2026-11-05.
