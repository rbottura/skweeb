<#
  scripts/obs/overlay.ps1 — the puppet over the screen you record: OBS's
  own picture of it, where it stands in the scene, on nothing.

    pwsh -File scripts/obs/overlay.ps1                  the Browser source showing the puppet, found
    pwsh -File scripts/obs/overlay.ps1 -Source avatar   …or the source so named
    pwsh -File scripts/obs/overlay.ps1 -Screen 1        …over the second screen, not the main one

  OBS's projectors draw on black and stand wherever they are put. This is a
  window of its own (Overlay.cs): transparent, always on top, clicks passing
  through it, kept out of every screen capture — the recording never sees
  it — standing where the source stands in the program scene and at its
  size, mapped onto the screen through the scene's Display Capture; and
  following it when it is moved in OBS. Ctrl+Alt+P takes hold of it: drag
  it, and the source moves in OBS; the wheel sizes it; Esc lets go; Q, or
  closing this console, closes it.

  It asks OBS through obs-websocket (built into OBS 28 and later): Tools →
  WebSocket Server Settings → Enable WebSocket server. The password is read
  from OBS's own settings on this machine, never shown; -Password gives
  another. Windows 10 2004 or later. docs/guides/obs.md says the rest.
#>
param(
  [string]$Source = '',
  [int]$Fps = 15,
  [int]$Screen = -1,
  [string]$Url = 'ws://127.0.0.1:4455',
  [string]$Password = '',
  [switch]$Visible,          # seen by screen capture too: for trying it out
  [switch]$Check             # says what it did, takes hold, sizes a notch, lets go and closes: for trying it out
)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml, System.Windows.Forms

$config = Join-Path $env:APPDATA 'obs-studio\plugin_config\obs-websocket\config.json'
if (-not $Password -and (Test-Path $config)) {
  $ws = Get-Content $config -Raw | ConvertFrom-Json
  if (-not $ws.server_enabled) {
    Write-Host '[overlay] OBS''s WebSocket server is off: Tools > WebSocket Server Settings > Enable WebSocket server.'
  }
  if ($ws.auth_required) { $Password = $ws.server_password }
}

$screens = [System.Windows.Forms.Screen]::AllScreens
$target = if ($Screen -ge 0 -and $Screen -lt $screens.Count) { $screens[$Screen] } else { [System.Windows.Forms.Screen]::PrimaryScreen }
$b = $target.Bounds

# What the overlay is compiled against: .NET's reference assemblies, which PowerShell keeps for Add-Type
# (never the runtime's own, whose types they forward), and WPF's assemblies, which have none there.
$ref = Join-Path $PSHOME 'ref'
$bcl = 'netstandard', 'System.Runtime', 'System.Runtime.Extensions', 'System.Runtime.InteropServices', 'System.Threading',
  'System.Threading.Tasks', 'System.Threading.Thread', 'System.Collections', 'System.Collections.Concurrent', 'System.ObjectModel',
  'System.Memory', 'System.Net.Primitives', 'System.Net.WebSockets', 'System.Net.WebSockets.Client', 'System.Text.Json',
  'System.Console', 'System.Security.Cryptography', 'System.ComponentModel', 'System.ComponentModel.Primitives', 'Microsoft.Win32.Primitives'
$refs = @($bcl | ForEach-Object { Join-Path $ref "$_.dll" } | Where-Object { Test-Path $_ }) + @(
  [System.Windows.Window].Assembly.Location, [System.Windows.Media.Visual].Assembly.Location,
  [System.Windows.DependencyObject].Assembly.Location, [System.Xaml.XamlReader].Assembly.Location
)
$code = 'ObsSocket.cs', 'Placed.cs', 'Overlay.cs' | ForEach-Object { Join-Path $PSScriptRoot $_ }
if (-not ('Skweeb.OverlayApp' -as [type])) { Add-Type -Path $code -ReferencedAssemblies $refs }
if ($env:SKWEEB_OVERLAY_COMPILE_ONLY) { Write-Host '[overlay] compiled'; return }

Write-Host "[overlay] over $($target.DeviceName), $($b.Width)x$($b.Height): Ctrl+Alt+P to take hold of it, Ctrl+C here to close it"
if (-not [Skweeb.OverlayApp]::Run($Url, $Password, $Source, $Fps, $b.X, $b.Y, $b.Width, $b.Height, [bool]$Visible, [bool]$Check)) { exit 1 }
