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
  it, space, `,` `.` to step.
- **`?open=<id>`** draws that object as the page opens.
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
