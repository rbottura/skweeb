# GamepadDraw Gallery

The published gallery — a static, git-tracked folder of curated drawings.
Served at `/gallery/` when the app root is `gamepad/`.

```
gallery/
├── images/          ← curated PNGs, committed to git
├── manifest.json    ← generated index (do not hand-edit `file`/`bytes`/`sha256`)
├── index.html       ← the page
├── gallery.css
└── gallery.js
```

## Publishing a drawing

Start the dev server instead of `npx serve` — it serves the app *and* accepts
writes into `images/`:

```sh
node scripts/dev-server.js          # http://127.0.0.1:3000
```

Open the gallery panel in the app (Select) and click **⇧ Publish** on the image
you want, or **⇧ Publish all**. Images already here are marked ✓ and skipped.
Then commit and push — Netlify redeploys and they are live.

The publish buttons hide themselves when the app is served by anything without
the write API (plain `npx serve`). To publish by hand in that case:

1. Click **⬇ Download**. It lands in your downloads as
   `<brush-label>_<YYYY-MM-DD-HH-MM-SS>.png`.
2. Move the file into `gamepad/gallery/images/`.
3. Regenerate the index:
   ```sh
   node scripts/generate-gallery.js
   ```

Keeping the filename the app generates means the title and date are filled in
automatically. Renaming the file is fine too; the title is just the name with
dashes turned into spaces.

## Duplicates

An image's identity is the SHA-256 of its bytes, recorded as `sha256` in
`manifest.json` — so publishing the same drawing twice is a no-op however it is
named, and re-running the generator never creates a second copy. A genuinely
different image that collides on filename gets `-2`, `-3`, … appended.

## Annotating

`title` and `note` in `manifest.json` are yours to edit by hand — the generator
preserves them across runs, matching on `file`. Entries whose image no longer
exists are dropped; new images are appended and the list is re-sorted newest
first.

## Keeping the repo small

Git stores every version of a binary forever, so only commit keepers, and
compress before committing:

```sh
oxipng -o4 --strip safe gamepad/gallery/images/*.png
# or
pngquant --quality 65-85 --ext .png --force gamepad/gallery/images/*.png
```

## In-browser drafts vs. the gallery

Everything you draw is kept in the browser's IndexedDB (`gamepaddraw` database)
and survives a reload — that's your working scratchpad, private to that browser
and that device. This folder is the curated, public subset. The two are
independent: clearing browser data never touches what's committed here.
