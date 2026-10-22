--[[
  scripts/obs/hide-projectors.lua — OBS's projectors kept out of the
  recording, and left in front of the author.

  The puppet's guide (docs/guides/obs.md) has the author watch the avatar —
  or the whole program — in a small projector on the very screen being
  recorded. OBS's own setting, "Hide OBS windows from screen capture", leaves
  its projectors out on purpose ("those are designed to be visible /
  captured", frontend/widgets/OBSBasic.cpp, OBS 32): a projector on that
  screen would be in the recording, and a projector of the program would
  show itself showing itself. This script asks Windows to keep every
  window of OBS — its projectors among them — out of any screen capture,
  OBS's own Display Capture included: the way OBS hides its other windows,
  SetWindowDisplayAffinity with WDA_EXCLUDEFROMCAPTURE, Windows 10 2004 and
  after. What is under a hidden window is captured in its place. It runs
  inside OBS because Windows lets only the program that owns a window do
  that. Every second it looks again, so a projector opened later is hidden
  too; taken out of OBS, it gives back the windows it hid, and leaves those
  OBS hid itself.

  Tools → Scripts → + → this file. Tick OBS's own setting too (Settings →
  General), so OBS agrees about its other windows.
  skweeb's own, as the rest of the repo is.
]]

obs = obslua
local ffi = require("ffi")

ffi.cdef[[
typedef void *HWND;
typedef int BOOL;
typedef unsigned long DWORD;
typedef unsigned short WCHAR;
HWND FindWindowExW(HWND hWndParent, HWND hWndChildAfter, const WCHAR *lpszClass, const WCHAR *lpszWindow);
DWORD GetWindowThreadProcessId(HWND hWnd, DWORD *lpdwProcessId);
BOOL IsWindowVisible(HWND hWnd);
int GetWindowTextW(HWND hWnd, WCHAR *lpString, int nMaxCount);
BOOL GetWindowDisplayAffinity(HWND hWnd, DWORD *pdwAffinity);
BOOL SetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity);
DWORD GetCurrentProcessId(void);
int WideCharToMultiByte(unsigned int CodePage, DWORD dwFlags, const WCHAR *lpWideCharStr, int cchWideChar,
                        char *lpMultiByteStr, int cbMultiByte, const char *lpDefaultChar, BOOL *lpUsedDefaultChar);
]]

local user32 = ffi.load("user32")
local kernel32 = ffi.load("kernel32")

local EXCLUDE, NONE = 0x11, 0x0     -- WDA_EXCLUDEFROMCAPTURE, WDA_NONE
local EVERY_MS = 1000
local said = {}                      -- the titles already said in the log, once each
local mine = {}                      -- the windows this script hid, by handle: the ones it gives back

-- A window's title, as UTF-8.
local function title_of(h)
  local wide = ffi.new("WCHAR[512]")
  local n = user32.GetWindowTextW(h, wide, 512)
  if n <= 0 then return "" end
  local size = kernel32.WideCharToMultiByte(65001, 0, wide, n, nil, 0, nil, nil)
  local out = ffi.new("char[?]", size + 1)
  kernel32.WideCharToMultiByte(65001, 0, wide, n, out, size, nil, nil)
  return ffi.string(out, size)
end

-- Each top-level window this program owns and shows, in turn: no callback, so nothing calls back into Lua.
local function each_window(fn)
  local me, pid = kernel32.GetCurrentProcessId(), ffi.new("DWORD[1]")
  local h = user32.FindWindowExW(nil, nil, nil, nil)
  while h ~= nil do
    user32.GetWindowThreadProcessId(h, pid)
    if pid[0] == me and user32.IsWindowVisible(h) ~= 0 then fn(h) end
    h = user32.FindWindowExW(nil, h, nil, nil)
  end
end

-- Every window of OBS's kept out of screen capture — those already out, OBS's own doing, left as they are.
local function sweep()
  local now = ffi.new("DWORD[1]")
  each_window(function(h)
    if user32.GetWindowDisplayAffinity(h, now) == 0 or now[0] == EXCLUDE then return end
    local title = title_of(h)
    if user32.SetWindowDisplayAffinity(h, EXCLUDE) ~= 0 then
      mine[tostring(ffi.cast("uintptr_t", h))] = true
      if not said[title] then
        said[title] = true
        obs.script_log(obs.LOG_INFO, "out of screen capture: " .. title)
      end
    elseif not said["!" .. title] then
      said["!" .. title] = true
      obs.script_log(obs.LOG_WARNING, "Windows would not keep this out of screen capture: " .. title)
    end
  end)
end

-- The windows this script hid, given back to screen capture.
local function give_back()
  each_window(function(h)
    if mine[tostring(ffi.cast("uintptr_t", h))] then user32.SetWindowDisplayAffinity(h, NONE) end
  end)
  mine = {}
end

function script_description()
  return "<b>OBS's projectors kept out of the recording</b> — and every other OBS window."
    .. "<br>A projector of the avatar, or of the program, can stay on top of the screen you record:"
    .. " you see it, the recording does not, and no projector shows itself."
    .. "<br>Windows 10 2004 or later. skweeb, docs/guides/obs.md."
end

function script_load(settings)
  obs.timer_add(sweep, EVERY_MS)
  sweep()
end

function script_unload()
  obs.timer_remove(sweep)
  give_back()
end
