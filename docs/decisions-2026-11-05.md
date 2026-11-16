# Decided — 2026-11-05

Moved out of `docs/decisions.md` on 2026-11-16, when it reached its cap, as
the days before it were. Read it before reopening what it decided.

## Decided since, 2026-11-05

**The vault app's detail is the object's facts.** The author, seeing the
vault app: "le viewer à droite de la grille du vault est vraiment super,
mais ça rend presque le vp-detail obsolète sauf pour les informations".
Three ways were put — the bench's three columns, the facts under the
viewer, the drawer kept over the grid with its facts only — and the author
chose the last, C: the detail keeps its place over the grid's right edge,
loses its picture and its player — the viewer has them — and is as wide
as the bench's properties, 300 px. Over another app, where no viewer is
beside it, the detail keeps its picture.

**The scene's address is its fragment** (S9c, its host). `#particles`
names the app *cluster* has mounted; the query stays what it is on an
app's own page — the app's to read, `?open=<id>` — and is left behind at a
switch, so the next app is asked nothing the last one was. So a page that
sets its query — the graph going back to a state — reloads into the same
app, and a link made for an app's page opens in the scene with its
fragment added. The host mounts each app with its own canvas and layout;
the one canvas, as planned, is a brick of its own, where what handing it
over costs the apps is weighed first (`docs/scene.md`).

**An app mounted again comes back as it was left** (S9c). A scene that
switches apps must not lose what one was doing, or it is worse than a
tab. So an app taken out once booted leaves what its `keep` says — the
recipe it would save, the frame, whether it played — with the smart
object it is bound to, and its next mount opens on it through the path
a saved object takes (`requested`): no second way to restore an app.
The address goes first — an app given a query does as it says — and
what is kept is the recipe, not the session: the steps start again.

**The scene is laid as the bench is.** Asked whether cluster should take
the bench's layout for one canvas fixed — the scene's side views on the
left, the viewer and its player in the middle, the app's properties on
the right, two panels as two tabs — the author: "oui tu peux prendre la
mise en page du bench qui est super !". Tried in cluster first, each
app's own page as it is. Its side view is the vault for now, the
scene's; an object opened there is a tab of the properties.

**The properties one panel, as the bench's; the vault four columns** (S9d).
The author, on cluster: "pour la mise du bench initial je me souviens avoir
un panel droit avec 2 onglets et une liste de catégories dépliables mais
tout dans une même section, ici je vois plusieurs sections" — and the
vault's grid, where an object took the column's width: "peut-être 3
colonnes ou 4 serait pas mal". The bench's panel taken back: its tabs its
head, the sections a column inside it with a hairline between. Four
columns of pictures, the names in their titles, the rest in the detail.

**At a switch the viewer stays, and whatever changes moves** — the author's
principle for the scene's motion, the same day: "le viewer ne devrait
quasiment pas bouger entre 2 apps, les règles toujours ou adapter avec une
animation … tout élément qui transitionne même très légèrement doit avoir
une animation aussi fine et rapide soit-elle", the player adapting as
well. Which element does what, case by case, is worked out with the author
(S9e, `docs/scene.md`). The corrections are cluster's first: "ses
modifications couleront plus naturellement sur les pages propres aux apps
après". And S11's bench "au plus vite", ahead of S9e's rest.

**Each app keeps its own canvas; the scene lays them in one place**
(S9c). Planned on 2026-11-04 as one canvas handed to each app. Weighed
when built: the apps put their pointer listeners and classes on their
canvas and set its 2D state, all of which the scene would have to take
back between two apps, for a picture the eye cannot tell apart from
every viewer laid in the same place — which the scene's grid does — and
the last frame held as a copy over it until the next app draws.

**The legacy grid's sets stay, filed in the folder of their tiles** (S9g).
The author: "les objets de sets de legacy grid sont trop petits et
redondants avec les folders, est-ce qu'on pourrait s'en défaire ?" They
are grid's materials — a ramp is a set, the folder only its tiles — and
the dithers made with one name it as a parent, so they are not deleted:
a set filed nowhere whose members are exactly a folder's shown members is
shown in that folder, first, across the grid in cluster. A set's index row
carries its members for it, as its role. To have one gone for good is
still the trash's, by hand.

**Beside an app, the vault shows the app's own first; dropping is picking**
(S9g). "Un filtrage automatique des objets du vault issus de l'app
courante … puis le reste": an order, not a filter — every object stays in
sight, the app's own above a line, the rest under another, beside the vault
app neither. And an object dropped on a field is what the field's picker
would have handed it: the same types taken, a set switched on for the
field's use, one step.

**Every viewer's picture fitted with an even margin** (S9h). The stage's
padding was the rulers' 18 px all round, so a picture fitted against the
rulers on two sides and 18 px off the edges on the other two — "une petite
marge … à droite et en bas selon le format". It is now the rulers' bands
and 12 px on every side (12 alone where the rulers are off), the picture
centred in what they leave: in every app at once, as what cluster settles
flows to the apps' own pages. And the vault app's object is drawn at its
ink, as compose places it — `inkSize` core's, one rule for both.

**BEC's keys, the suite's places** (M13a). BEC_2025 drew its grid anew by
`q` `s` `d` (faces), `c` (colours) and `e` (edges), each `random()`. In the
suite S saves, E exports and Q and D step frames, by place: so each draw is
a seed of the recipe (rule 2) and BEC's keys land where the suite has room —
`e` on R, "again", a new seed of which edges, the colours dealt anew with
them as BEC did; `c` on C, new hues alone; `q` `s` `d` in the 3D app's pie,
A, four, six or eight faces filled. The grid is the catalogue's eighth shape,
one geometry with its colours at its vertices, so it has no colour of its
own.
