#!/usr/bin/env bash
# scripts/share-vault.sh — the vault shared from the ThinkPad, over the tailnet
#
#   scripts/share-vault.sh             pull main, serve the vault, behind tailscale serve
#   scripts/share-vault.sh --no-pull   …the code as it is
#   scripts/share-vault.sh --install   …and first a launcher, "skweeb vault", on the desktop and in the menu
#
# docs/guides/vault-share.md. One vault, on the laptop that travels
# (docs/decisions-2026-09-28-to-10-02.md): ~/skweeb-vault, or SKWEEB_VAULT. The
# server binds 127.0.0.1, as it always does — it writes files — and `tailscale
# serve` hands it to the tailnet alone, over https on this machine's name:
# never 0.0.0.0, which would open its write API to whatever network the laptop
# is on.
#
# When the laptop has the user service `skweeb-vault`, it is restarted — the
# code just pulled served, the index rebuilt — and its log shown: closing the
# window leaves it serving. Without one, the server runs in the window, and
# closing it stops the sharing. The port is the one `tailscale serve` already
# hands on, else 3000, or SKWEEB_PORT.

set -euo pipefail

REPO="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
VAULT="${SKWEEB_VAULT:-$HOME/skweeb-vault}"
SERVICE=skweeb-vault
pull=1
install=0
for a in "$@"; do
  case "$a" in
    --no-pull) pull=0 ;;
    --install) install=1 ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "share-vault: $a? (--no-pull, --install)" >&2; exit 2 ;;
  esac
done

# Launched from the desktop, a window that shut on an error would hide it: it waits for Enter.
trap 'code=$?; if [ "$code" -ne 0 ] && [ "$code" -ne 130 ] && [ -t 0 ]; then read -r -p "(Enter closes this window) " _ || true; fi' EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
need() {
  command -v "$1" >/dev/null 2>&1 && return
  echo "share-vault: no $1 here — $2" >&2
  exit 1
}
need node 'the server runs on it'
need git 'the code comes by it'
need tailscale 'the tailnet is how the other machines reach the vault'

cd "$REPO"

# ── A launcher: skweeb vault, in the menu and on the desktop ─────────────────
if [ "$install" = 1 ]; then
  apps="$HOME/.local/share/applications"
  desk="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
  desk="${desk:-$HOME/Desktop}"
  mkdir -p "$apps"
  cat > "$apps/skweeb-vault.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=skweeb vault
Comment=Share the vault with the tailnet's other machines
Exec="$REPO/scripts/share-vault.sh"
Icon=network-server
Terminal=true
Categories=Graphics;Network;
EOF
  chmod +x "$apps/skweeb-vault.desktop"
  where='the menu'
  if [ -d "$desk" ]; then
    cp "$apps/skweeb-vault.desktop" "$desk/skweeb-vault.desktop"
    chmod +x "$desk/skweeb-vault.desktop"
    gio set "$desk/skweeb-vault.desktop" metadata::trusted true 2>/dev/null || true
    where="the menu and $desk"
  fi
  say "a launcher, skweeb vault, in $where"
fi

# ── The code: main, as the tower pushed it ───────────────────────────────────
if [ "$pull" = 1 ]; then
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$branch" != main ]; then
    say "on the branch $branch, not main: the code left as it is"
  elif [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    say "changes not committed here: the code left as it is (git status shows them)"
  else
    say "pulling main…"
    git pull --ff-only || say "the pull failed: the code as it was (GitHub refuses at times — again later)"
  fi
fi

mkdir -p "$VAULT/objects"

# ── The tailnet: https on this machine's name, to the server ────────────────
served="$( (tailscale serve status 2>/dev/null || true) | grep -oE '(127\.0\.0\.1|localhost):[0-9]+' | head -n 1 | cut -d: -f2 || true)"
PORT="${SKWEEB_PORT:-${served:-3000}}"
if [ "$served" != "$PORT" ]; then
  say "tailscale serve: https on this machine's name, to 127.0.0.1:$PORT"
  if ! tailscale serve --bg "$PORT"; then
    echo "share-vault: tailscale says no — once:  sudo tailscale set --operator=\$USER  then again" >&2
    exit 1
  fi
fi
name="$(tailscale status --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(((JSON.parse(s).Self||{}).DNSName||'').replace(/\.\$/,'')))")"
url="https://$name/apps/cluster/"

# ── The server: the service's, restarted; else here ─────────────────────────
if command -v systemctl >/dev/null 2>&1 && systemctl --user cat "$SERVICE" >/dev/null 2>&1; then
  say "restarting the service $SERVICE…"
  systemctl --user restart "$SERVICE"
  say "shared:  $url"
  echo "The service serves it: closing this window leaves it on. Its log:"
  journalctl --user -u "$SERVICE" -f -n 20 || read -r -p "(Enter closes this window) " _ || true
  exit 0
fi
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "share-vault: something already answers on port $PORT — stop it, or SKWEEB_PORT=<another>" >&2
  exit 1
fi
say "shared:  $url"
echo "Served from this window: Ctrl C, or closing it, stops the sharing."
exec node server.js --vault "$VAULT" --port "$PORT"
