# The puppet in OBS

The rig's puppet (`/apps/rig/puppet/`) is a page: OBS shows it as a
**Browser source**, the avatar on nothing, and the page reads the camera
itself. OBS keeps the camera from its Browser sources until it is told
otherwise — the puppet then says *no camera: OBS keeps the camera from its
Browser sources*. Three steps, the first once for good.

## 1. Start OBS with the camera allowed

Close OBS, then give its shortcut the two flags:

1. Right-click the OBS Studio shortcut — on the desktop, or in the Start menu
   under *Open file location* — then **Properties**.
2. **Target**, the flags after the closing quote:
   `"C:\Program Files\obs-studio\bin\64bit\obs64.exe" --enable-media-stream --use-fake-ui-for-media-stream`
3. **Start in** stays `"C:\Program Files\obs-studio\bin\64bit"` — OBS will
   not start from anywhere else.
4. OK, and start OBS from that shortcut, every time.

Or once, from PowerShell, OBS closed:

```
Start-Process "C:\Program Files\obs-studio\bin\64bit\obs64.exe" -WorkingDirectory "C:\Program Files\obs-studio\bin\64bit" -ArgumentList "--enable-media-stream","--use-fake-ui-for-media-stream"
```

`--enable-media-stream` is the flag OBS's browser (CEF) reads; the second
is Chromium's own, and answers the camera's question where the first does
not. Both are for the whole of OBS: every Browser source and dock may then
use the camera and the microphone without asking.

## 2. The source, once

1. In the puppet's own window, set it up, then **Send to OBS** (or **S**):
   the puppet is kept in the vault, and the window's address becomes
   `?open=skw_…`.
2. **Copy the address for OBS**: it ends in `&obs`, the avatar alone on
   nothing.
3. In OBS: **+ → Browser**, paste the address into **URL**.
4. **Width** and **Height**: the room the avatar is fitted into — 1080 × 1080
   for a square. The page fits the drawing to it.
5. Leave **Shutdown source when not visible** off, so the camera does not
   start again each time the scene changes.

From then on, set the puppet in its window and **Send to OBS** again: the
page in OBS follows each send by itself, nothing to paste. The button says
how many changes OBS has not had yet.

## Back and forth with one camera

To set the puppet while OBS shows it, switch the window's camera off —
**camera on** in its *Camera* drawer: it lets go of the camera, and the page
in OBS, waiting for it, takes it at once. Switch it on again to see your
eyes in the window; if OBS holds the camera then, the window waits for it
in turn — hide the source in OBS, and it lets go.

The puppet learns where your head is straight from your first second in
front of the camera. If it leans when you do not, sit as you sit and look
at the screen, then in OBS right-click the source, **Interact**, and press
**C**.

## Your avatar over the screen you record, on nothing

The avatar as OBS makes it, standing on your screen exactly where it stands
in the scene and at its size, transparent round it, clicks passing through
it, and never in the recording:

1. In OBS, **Tools → WebSocket Server Settings** (*Outils → Paramètres du
   serveur WebSocket*) → **Enable WebSocket server**. The overlay reads the
   password OBS keeps, on this machine; it never shows it.
2. Double-click `scripts\obs\overlay.cmd` in skweeb's folder — or, in a
   terminal there, `pwsh -File scripts/obs/overlay.ps1`. It finds the
   Browser source showing the puppet, and stands over it. Close its window,
   or Ctrl+C in it, to close the overlay.
3. To move it: **Ctrl+Alt+P** takes hold of it — dashed round it. Drag it,
   and the source moves in OBS by as much; the wheel sizes it, as OBS sizes
   the source; **Esc**, or Ctrl+Alt+P again, lets go, and clicks pass
   through it again. **Q** closes it. Moved in OBS, it follows.

It follows the program scene, mapped onto the screen through the scene's
Display Capture. `-Source <name>` names the source when it is not found,
`-Screen 1` puts it over another screen, `-Fps 10` asks OBS for fewer
pictures a second (15). A source turned in OBS is shown unturned; one inside
a group or a nested scene is not found. `-Check` says where it stands and
what it does, then closes.

## Watching the whole program on the screen you record

OBS shows a source — the avatar — or the whole program in a small window of
its own, a *projector*, on top of everything else:

1. Right-click the puppet's Browser source → **Open Source Projector**
   (*Ouvrir le projecteur de Source*) → **New window** (*Nouvelle fenêtre*).
   For everything OBS makes, right-click the preview → **Open Preview
   Projector** (*Ouvrir le projecteur pour la Prévisualisation*) instead.
2. Right-click the projector → **Always On Top** (*Toujours au premier
   plan*); size it, and put it where you like on the screen you record.
3. **Tools → Scripts → +** (*Outils → Scripts → +*), and choose
   `scripts/obs/hide-projectors.lua` from skweeb's folder.
4. **Settings → General**: tick **Hide OBS windows from screen capture**
   (*Masquer les fenêtres d'OBS sur la capture d'écran*) too.

The projector stays in front of you and out of the recording: no second
avatar in the captured screen, and a projector of the program never shows
itself showing itself. OBS's own setting hides its other windows but leaves
its projectors in, on purpose — they are made to be captured — and only OBS
may hide a window of its own, so the script does it from inside OBS.
Windows 10 2004 or later. Taken out of OBS, it gives the projectors back.

## 3. One camera, one program

A webcam may be held by whoever opened it first: the puppet open in
Chrome, or OBS's own *Video Capture Device* source of that camera. The page
then says *waiting for the camera: another program has it*, and takes it as
soon as it is let go — switch the window's camera off, close its tab, or
hide the camera's own source in OBS.

## Still no camera

- Windows: *Settings → Privacy & security → Camera*, and *Let desktop apps
  access your camera* on.
- Started from the shortcut? The flags are only there when OBS is started
  from it — not from a pinned taskbar icon made before.
- The other way round, always possible: the puppet in a Chrome window, which
  has the camera, captured by OBS. In the puppet set **ground** to green
  (`#00ff00`) and press **H**; in OBS, a **Window Capture** of that window and
  a **Chroma Key** filter on it. Chrome stops drawing a window it thinks is
  covered, so start that Chrome with
  `--disable-backgrounding-occluded-windows --disable-features=CalculateNativeWinOcclusion`,
  or keep the window in sight.
