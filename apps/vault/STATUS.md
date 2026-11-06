# STATUS — the vault, an app
_last touched: 2026-11-05_

S9b on the board of `docs/plan.md`: the author's ask of 2026-11-04, "une app
vault pour une consultation full screen du vault". In *cluster* (S9c), the
app that is open when nothing else is (`docs/scene.md`, *Planned*).

## Works now

- **Every object full screen** — core's vault panel docked in the page
  (`VaultPanel` with `mount`: in its host, always shown, no close; Escape
  closes the detail, not the panel): its grid, folders, kin, lineage switch,
  trash, `+ pictures` and detail. The detail is the object's facts only —
  its name, facts, lineage, recipe and acts, no picture of its own, as wide
  as the bench's properties, over the grid's right edge (`detailPicture:
  false`): the picture is the viewer's. The author's choice of three, C,
  2026-11-05 — against three columns and the facts under the viewer.
- **The object whose detail opens, drawn large** beside it, as compose
  would draw it (`core/rebuild.js` `openFrames`, drafts): a still, a shape,
  a set's sheet; a loop or a page that moves played by core's player under
  it, space, `,` `.` to step. At its ink's size (`inkSize`, S9h, 2026-11-05):
  a gamepad loop's canvas is the screen it was drawn on and its frames the
  ink cut out of it — drawn over the screen's shape, it was stretched, the
  author's `gam_1790189754737_d12aab`. Its player is core's strip under the
  viewer: the app's own was left empty since S12, the controls gone.
- **Seen closer** (`core/zoom.js`, S9h): the wheel zooms about the pointer,
  a drag moves the picture, a double click — or the zoom said at the head of
  the viewer — fits it again; nearer than its own pixels it is shown as
  pixels, in a canvas no bigger than the picture. Fitted with an even margin
  round it, the rulers' bands aside (theme.css, every app's viewer).
- **`?open=<id>`** draws that object as the page opens.
- **A set, by hand** (V2, 2026-11-06; `core/vault-set.js`): the pictures
  selected, in the order they were picked, *a set of these…* — a name and
  a role, each a use's default, or none; its picture a contact sheet, a
  material's one row; made, its detail opens where its uses are switched.
  The app's count follows the vault (`vault:changed`).
- **Groups, by hand** (V3, 2026-11-06; `core/vault-groups.js`): the panel's
  selection — Ctrl or Shift click — *into a group…*, a name typed or one
  there is, or *out of their group*; a group's strip *rename*, every
  member's `folder:` tag with it — everywhere the panel is.
- **A palette, made by hand** (V1, 2026-11-06; `core/vault-palette.js`,
  `docs/workshop.md`): *+ palette* in the panel's head — its name, its
  swatches, each a colour and a name, moved, taken out, one added — kept,
  an object of the vault, its picture their strip; *Edit its colours* in a
  palette's detail, kept as a new palette, the first its parent. Its origin
  is the vault app, so a palette reopens here (`rebuild.js`) — the panel's
  every link asked an app that had none, a 404 in every console.
- **It makes nothing**: no recipe, no `rebuild.js`, no S; its title bar has
  no Save and no Export (`Bar` with `acts: false`). With no vault it opens
  and says so (rule 7).
- **A module** (`core/mount.js`): `mount(host)` and `unmount()`, its page
  mounting it on itself — `check-mount`; the app itself — `check-vault`.
- **In cluster** (S9c, 2026-11-05): the scene's vault is beside the viewer,
  so the app builds no panel of its own there (`given.vault`); it draws what
  that one opens (`chosen`), the detail its facts only in the properties.

## Next

- Choosing by the keyboard — the arrows through the grid — as the gamepad
  will want; a filter by the app that made an object, as the vault panel's
  chips have by type.
