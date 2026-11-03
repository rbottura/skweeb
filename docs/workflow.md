# Workflow — a branch for each work item

How work reaches `main`, since 2026-10-22, the author's ask: "adopter une
méthode de production correcte", one author and several machines. Until
that day work went straight onto `main` — 164 commits and one side branch,
`grid/legacy-materials` — and two days of the puppet sat uncommitted on
one machine. Now `main` is what every machine runs and is always green,
and every item of `docs/plan.md` is a branch, landed when it passes the
gate below.

## The shape

- **`main` is green.** The unit loop passes on every commit of it, the
  browser checks on every merge. Nothing is committed on `main` directly:
  a one-line fix is a one-commit branch.
- **A work item is a branch**, named on the plan's board, `<track>/<slug>`:
  `clean/…`, `ui/…`, `layers/…`, `docs/…`, `fix/…` for a bug, and an app's
  name for its bricks — `3d/turntable`, `map/avatar`, as
  `grid/legacy-materials` was. It is made when its item starts, from `main`
  as it is that day, never ahead: a branch made early only grows stale.
- **A branch lives days, not weeks**: one brick, one to three sessions. An
  item that grows past that is split on the board, not left open.
- **One main thread.** One branch at a time edits the shared docs —
  `CLAUDE.md`, `docs/roadmap.md`, the root `STATUS.md`, `docs/decisions.md`.
  A side job (`docs/inbox.md`, its head) runs beside it, in a worktree of
  its own, and leaves them alone; the main thread folds it in.

## Merge or rebase

**A rebase moves a branch; a merge lands it.**

- To bring a branch up to `main` — before landing it, or when it needs
  what `main` has since — rebase it: `git rebase main`. Never merge `main`
  into a branch: its history would braid for nothing. A rebase rewrites
  only the branch, which only the author holds; pushed already, it goes
  back with `git push --force-with-lease`, which refuses if another machine
  pushed in the meantime.
- To land a branch, merge it into `main`, rebased first, so the merge never
  has a conflict of its own to solve:
  - **two commits or more: `git merge --no-ff`**, the merge commit naming
    the item — `Merge ui/drawers: drawers on demand (U1)`. Then
    `git log --first-parent main` reads as the board, a line an item, and
    `git revert -m 1 <merge>` takes a whole item back out;
  - **one commit: `git merge --ff-only`.** A merge commit round a single
    commit says nothing it does not.
- Never rebase `main`, never force-push it. `git pull` on `main` only ever
  fast-forwards (*Once a machine*, below).
- No squash. The commits are the project's diary — "M11, brick 3: the
  stack drawn round every canvas" — and a brick's commits say how it was
  built. A branch with noise in it, `wip:` commits or a fix of a fix, is
  tidied before it lands: `git reset --soft main`, then committed again in
  a few commits that each say one thing.

## A day

```sh
git switch main && git pull                       # fast-forward only
git switch -c ui/drawers                          # the board's branch, as its item starts
# …work, committed as it goes…
git push -u origin ui/drawers                     # every session's end, finished or not
```

The same branch on another machine:

```sh
git fetch && git switch ui/drawers                # `git pull` if it is already there
```

Landing it:

```sh
git fetch && git rebase origin/main               # today's main under the branch
# …the gate, below…
git switch main && git pull
git merge --no-ff ui/drawers -m "Merge ui/drawers: drawers on demand (U1)"   # or --ff-only, one commit
git push
git branch -d ui/drawers && git push origin --delete ui/drawers
```

`git merge -m` takes a line; a longer message goes in a file, `-F <file>`
— `git merge` reads no message from stdin.

## The gate

What a branch passes before it lands — the definition of done:

1. **Rebased** on `main`.
2. **The unit loop**, all green (`CLAUDE.md`, *Running*).
3. **The browser checks of what it touched:**

   | it touched | it runs |
   |---|---|
   | an app's folder | that app's checks, `check-<app>*`, and `check-print` if its drawing changed |
   | core's panels, widgets, drawers, cards, theme | every browser check: every app is drawn with them |
   | `core/vault*.js`, `smart.js`, `server.js`, `server/` | `check-vault`, `check-smart`, `check-page`, `check-send` |
   | `core/live.js`, `stack*.js`, `send.js`, `place.js` | `check-live`, `check-send`, `check-page` |
   | `core/gpu/` | `check-gpu`, `check-filters`, `check-filter`, `check-look`, `check-fractals` |
   | `core/rebuild.js`, `print.js`, `windowed.js`, `stage/` | `check-print`, `check-compose`, `check-compose-export` |
   | docs alone | nothing more |

   Every check, one line each — the 3D poster left out, being long:

   ```sh
   for c in scripts/check-*.mjs; do
     case $c in */check-kit.mjs|*/check-3d-poster.mjs) continue;; esac
     printf '%-40s' "$c"; node "$c" 2>&1 | tail -1
   done
   ```
4. **Rule 4's lines**: `node scripts/lines.mjs`. A file past 400 lines is
   split along a seam it has, or kept whole with its reason in the script's
   `KEPT`; none passes 600; the docs every session reads stay under 400; the
   gamepad's four are known until C6. A file new on the branch counts once git knows it:
   `git add -N` it first.
5. **Written where it is read:** its app's `STATUS.md`; `CLAUDE.md` for a
   new command, test or check; `docs/decisions.md` for a decision; and its
   row on the plan's board marked `landed` with the date — in the branch's
   last commit, so that nothing is committed on `main` after it.

A check that fails for the machine and not the code — the laptop's empty
`./vault`, its Intel without Chrome's flags — is said in the merge
commit's message, never skipped in silence.

## Commits

In the repo's voice, as before: `<area>: what it does — the brick it is`
(`rig: walks by part, and worms that crawl — M9's bricks 4 and 5`), a body
that says why, and the `Co-Authored-By` line of the agent that wrote it.
One concern a commit; each passes the unit loop, so `git bisect` can trust
any of them.

## Several machines

The tower, the laptop and the work PC share the code through GitHub, and
the vault through the laptop (`docs/decisions-2026-09-28-to-10-02.md`). So a
session ends pushed: a branch half done is committed — `wip: …` — and
pushed, never left in a working tree. The next machine fetches and
switches. A branch is rebased only on the machine about to land it.

## Agents side by side

A second session works in a worktree of its own, never in the same
folder: `git worktree add ../skweeb-<slug> -b <branch>` — Claude Code's
worktree isolation is the same thing. Only a side job runs beside the
main thread; two branches that edit the same core file wait for each
other, and the plan's order says which first.

A worktree holds what git holds, and no more: no `./vault`, no heavy
sprite families, no MediaPipe (`core/libs/mediapipe/`). Its browser checks
that need them fail for the machine — "the vault has a loose still…", a
404 on `gamepad_sprites/` — never for the code (2026-11-03). Run those in
the main tree, or link the three folders into the worktree first.

## When main breaks

`git revert -m 1 <merge>` takes the item out at once; it is mended on its
branch — the same one, rebased — and lands again. Nothing is mended in a
hurry on `main` itself.

## Once a machine

```sh
git config pull.ff only        # main only fast-forwards
git config fetch.prune true    # a branch deleted on GitHub goes from here too
```

And a key that pushes without asking, or a session cannot end pushed: the
GitHub key (`~/.ssh/config`, `id_ed25519_perso`) has a passphrase, and on
the tower, 2026-10-22, no agent held it — Windows' own was disabled — so
an agent session's push was refused. Once, in PowerShell, the first two
lines as an administrator:

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519_perso       # the passphrase, once: the agent keeps it
git config --global core.sshCommand C:/Windows/System32/OpenSSH/ssh.exe
```

The last line has Git use Windows' ssh, which asks that agent, instead of
the ssh Git brings. Any program run as the author can then push with the
key — the agent sessions included, which is the point. Without it, the
author pushes by hand, and the session says so.

## GitHub, if wanted

A pull request is a place to read a large item over before it lands, and
to run `/code-review` on it; merged as a merge commit, it is the
`--no-ff` above. A small item needs none. The unit loop can run on every
push — C5 on the plan, waiting on the author's yes; the browser checks
stay on the machines, since they need Chrome, a GPU and a vault.
