# The vault shared from the ThinkPad

One vault, on the ThinkPad that travels between home and work —
`~/skweeb-vault` — and the other machines open the suite from it over the
tailnet: what they save lands there (`docs/decisions-2026-09-28-to-10-02.md`).
The server stays on 127.0.0.1, as it always does — it writes files — and
`tailscale serve` hands it to the tailnet alone, over https on the ThinkPad's
name: never `0.0.0.0`, which would open its write API to whatever network the
laptop is on. Its lid shut, it sleeps, on purpose, and the address waits.

No machine's name is written here — the repo is public — and none is needed:
`tailscale status` lists them, and a part of one is enough for the scripts.
Four things; the first and the third once a machine.

## 1. The ThinkPad: the code, and its launcher

In the repo, wherever it is cloned:

```sh
git checkout main
git pull --ff-only
scripts/share-vault.sh --install
```

`--install` puts **skweeb vault** on the desktop and in the menu, then
shares the vault. Should GNOME show the desktop icon as a file, its right
click says *Allow Launching*. Should tailscale refuse — `tailscale serve` and
`tailscale file get` want root or its operator — once:

```sh
sudo tailscale set --operator=$USER
```

## 2. Each time: skweeb vault

A double click — or `scripts/share-vault.sh`, `--no-pull` to keep the code as
it is:

1. it pulls main, when the checkout is on main with nothing uncommitted:
   what the tower pushed is what every machine is served;
2. it puts the server behind `tailscale serve`, if it was not;
3. it restarts the user service `skweeb-vault` when the laptop has one, and
   shows its log — closing the window leaves it serving. Without one, the
   server runs in the window, and closing it stops the sharing;
4. it prints the address: `https://<the ThinkPad>.<the tailnet>.ts.net/apps/cluster/`.

`SKWEEB_VAULT` and `SKWEEB_PORT` move the vault and the port.

## 3. A Windows machine: the address on its desktop

In the repo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\vault-shortcut.ps1
```

A shortcut **skweeb** on the desktop: the scene, `/apps/cluster/`, in the
default browser. The ThinkPad is found by *thinkpad* in its name;
`-Path 'apps/cluster/#3d'` opens the scene on the 3D app, `-Path 'apps/3d/'`
the app alone, `-Name` names the shortcut. The tower's was made on
2026-11-17.

## 4. Two vaults made one

A machine that served itself — `node server.js` on its own `vault/` — kept
what it saved there: on 2026-11-17 the tower held 76 objects the ThinkPad had
not, and the ThinkPad 59 the tower had not. `scripts/vault-sync.mjs` packs
one machine's vault, sends it to the other by Taildrop — the tailnet's own,
nothing to set up — and there merges it: `scripts/vault-merge.mjs`'s merge,
the objects it has not got copied, nothing overwritten or removed, an object
on both sides that differs kept as it is and said.

The tower's into the ThinkPad's. On the tower, in the repo:

```powershell
node scripts/vault-sync.mjs send thinkpad
```

Then on the ThinkPad, in the repo:

```sh
node scripts/vault-sync.mjs take --dry     # what it would copy
node scripts/vault-sync.mjs take
```

`take` finds the newest vault sent, merges it into `~/skweeb-vault`, and
restarts the service: the new objects show on every machine.

The other way round is the same, swapped: `send` on the ThinkPad with a part
of the tower's name, `take` on the tower — into the repo's `vault/`, which
the browser checks copy, so a still more there may change what
`check-frames` picks.

Windows puts what it receives in Downloads; Linux keeps it until
`tailscale file get`, which `take` runs. Without the tailnet, `pack <file>`
writes the `.tgz` to carry by hand, and `take <file>` takes it.
