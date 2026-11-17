<#
  scripts/vault-shortcut.ps1 — a shortcut on this Windows machine's desktop to the suite the
  ThinkPad shares over the tailnet (docs/guides/vault-share.md).

    powershell -ExecutionPolicy Bypass -File scripts\vault-shortcut.ps1
    powershell -ExecutionPolicy Bypass -File scripts\vault-shortcut.ps1 -Path 'apps/cluster/#3d' -Name 'skweeb 3d'

  The machine is found on the tailnet by a part of its name — "thinkpad" unless -Machine says
  another — and the address is its https name, as scripts/share-vault.sh serves it: no machine's
  name is written in the repo, `tailscale status` gives it. The shortcut is a .url file the
  default browser opens, named -Name, on this user's desktop; made again, it is replaced.
#>
param(
  [string]$Machine = 'thinkpad',
  [string]$Path = 'apps/cluster/',
  [string]$Name = 'skweeb'
)
$ErrorActionPreference = 'Stop'

$status = (tailscale status --json | Out-String) | ConvertFrom-Json
$peer = @($status.Peer.PSObject.Properties.Value) | Where-Object { $_.HostName -like "*$Machine*" } | Select-Object -First 1
if (-not $peer) { throw "No machine on the tailnet has '$Machine' in its name: tailscale status lists them." }

$url = 'https://' + $peer.DNSName.TrimEnd('.') + '/' + $Path.TrimStart('/')
$file = Join-Path ([Environment]::GetFolderPath('Desktop')) ($Name + '.url')
Set-Content -LiteralPath $file -Value @('[InternetShortcut]', "URL=$url") -Encoding ascii
Write-Output "made $file"
Write-Output "  -> $url"
if (-not $peer.Online) { Write-Output '  (the ThinkPad sleeps now: open its lid, and the link answers)' }
