// scripts/obs/Overlay.cs — the puppet over the screen the author records:
// compiled with ObsSocket.cs and Placed.cs, and run, by overlay.ps1.
//
// A window of its own, transparent, always on top, that clicks pass through
// and no screen capture sees (SetWindowDisplayAffinity, as
// hide-projectors.lua does for OBS's windows), standing where the puppet's
// source stands in OBS's program scene and at its size — mapped through the
// scene's Display Capture onto the screen it captures. What it shows is
// OBS's own picture of the source, asked of obs-websocket a few times a
// second, on nothing: OBS renders a screenshot on a transparent ground
// (TakeSourceScreenshot clears to zero, RGBA). It follows the source as it
// is moved in OBS. Ctrl+Alt+P takes hold of it: dragged, it moves the
// source in OBS; the wheel sizes it; Esc, or Ctrl+Alt+P again, lets go; Q
// closes it.
//
// skweeb's own, as the rest of the repo is.

using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace Skweeb
{
    public sealed class Overlay : Window
    {
        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
        [DllImport("user32.dll")] static extern bool SetWindowDisplayAffinity(IntPtr h, uint a);
        [DllImport("user32.dll")] static extern bool GetWindowDisplayAffinity(IntPtr h, out uint a);
        [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h, int id, uint mods, uint vk);
        [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr h, int id);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }

        const int GWL_EXSTYLE = -20, WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_NOACTIVATE = 0x08000000, WM_HOTKEY = 0x0312, HOTKEY = 1;
        const uint WDA_EXCLUDEFROMCAPTURE = 0x11, MOD_ALT = 1, MOD_CONTROL = 2, MOD_NOREPEAT = 0x4000, VK_P = 0x50;
        const uint SWP_NOACTIVATE = 0x10, SWP_SHOWWINDOW = 0x40;
        static readonly IntPtr TOPMOST = new IntPtr(-1);

        // Scene items, and what is read of them: obs-websocket 5's event subscriptions — scenes, scene items, and transforms as they change.
        const int EVENTS = (1 << 2) | (1 << 7) | (1 << 19);

        readonly ObsSocket obs = new ObsSocket();
        readonly Image picture = new Image { Stretch = Stretch.Fill };
        readonly Rectangle held = new Rectangle { Stroke = Brushes.Gold, StrokeThickness = 2, StrokeDashArray = new DoubleCollection { 4, 3 }, Fill = new SolidColorBrush(Color.FromArgb(1, 0, 0, 0)), Visibility = Visibility.Collapsed };
        readonly TextBlock hint = new TextBlock { Text = "drag · wheel to size · Esc when done · Q to close", Foreground = Brushes.White, Background = new SolidColorBrush(Color.FromArgb(170, 17, 17, 17)), Padding = new Thickness(6, 3, 6, 3), FontSize = 12, VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Left, Visibility = Visibility.Collapsed };
        readonly Uri url;
        readonly string password;
        readonly int fps;
        readonly Int32Rect screen;          // the screen recorded, in its own pixels
        readonly bool visible;              // seen by screen capture too: for trying it out
        readonly bool check;                // say what it did, take hold, size, let go, and close: for trying it out
        string source, scene;
        int item = -1, captureItem = -1;
        Placed placed, capture;
        bool shown, holding;
        double baseWidth = 1920, baseHeight = 1080;
        Rect box;                           // where the picture is on the screen, its pixels
        IntPtr hwnd;

        /// <summary>Closed by a trouble rather than by the author: what the launcher keeps its window open for.</summary>
        public bool Failed { get; private set; }

        public Overlay(Uri url, string password, string source, int fps, Int32Rect screen, bool visible, bool check)
        {
            this.url = url; this.password = password; this.source = source; this.fps = Math.Max(1, Math.Min(30, fps)); this.screen = screen; this.visible = visible; this.check = check;
            WindowStyle = WindowStyle.None; AllowsTransparency = true; Background = Brushes.Transparent; Topmost = true;
            ShowInTaskbar = false; ResizeMode = ResizeMode.NoResize; ShowActivated = false; Width = 1; Height = 1; Left = -10000; Top = -10000;
            Title = "skweeb puppet overlay";
            var grid = new Grid();
            grid.Children.Add(held); grid.Children.Add(picture); grid.Children.Add(hint);
            Content = grid;
            SourceInitialized += (s, e) => Begin();
            Loaded += async (s, e) => await Start();
            MouseLeftButtonDown += (s, e) => { if (holding) Drag(); };
            MouseWheel += async (s, e) => { if (holding) await Size(e.Delta > 0 ? 1.05 : 1 / 1.05); };
            KeyDown += (s, e) => { if (e.Key == Key.Escape) Hold(false); if (e.Key == Key.Q && holding) Close(); };
            Closed += (s, e) => { if (hwnd != IntPtr.Zero) UnregisterHotKey(hwnd, HOTKEY); };
        }

        static void Say(string text) { Console.WriteLine("[overlay] " + text); }

        /// <summary>The window's own: out of screen capture, clicks passing through, Ctrl+Alt+P to take hold of it.</summary>
        void Begin()
        {
            hwnd = new WindowInteropHelper(this).Handle;
            SetWindowLong(hwnd, GWL_EXSTYLE, GetWindowLong(hwnd, GWL_EXSTYLE) | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
            if (!visible && !SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)) Say("Windows would not keep the overlay out of screen capture (Windows 10 2004 or later)");
            if (!RegisterHotKey(hwnd, HOTKEY, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_P)) Say("Ctrl+Alt+P is taken by another program: the overlay cannot be taken hold of");
            HwndSource.FromHwnd(hwnd).AddHook((IntPtr h, int msg, IntPtr w, IntPtr l, ref bool handled) =>
            {
                if (msg == WM_HOTKEY && w.ToInt32() == HOTKEY) { Hold(!holding); handled = true; }
                return IntPtr.Zero;
            });
        }

        async Task Start()
        {
            try
            {
                await obs.Connect(url, password, EVENTS);
                Say("OBS answered, obs-websocket " + obs.Version);
                if (string.IsNullOrEmpty(source)) source = await FindPuppet();
                JsonElement video = await obs.Request("GetVideoSettings");
                baseWidth = video.GetProperty("baseWidth").GetDouble(); baseHeight = video.GetProperty("baseHeight").GetDouble();
                obs.Heard += (type, data) => Dispatcher.BeginInvoke(new Action(() => Hear(type, data)));
                await Read();
                Say("over the screen: " + source + ", " + fps + " pictures a second - Ctrl+Alt+P to move it");
                Task looping = Pictures();
                if (check) await Check(); else await looping;
            }
            catch (Exception err)
            {
                Say(err is System.Net.WebSockets.WebSocketException ? err.Message + " - is OBS open, its WebSocket server on? (Tools > WebSocket Server Settings)" : err.Message);
                Failed = true;
                Close();
            }
        }

        /// <summary>-Check: what the window is, as it stands, taken hold of, sized a notch, and let go — then closed.</summary>
        async Task Check()
        {
            await Task.Delay(1500);
            Report("placed");
            Hold(true); Report("taken hold of");
            await Size(1.05); await Task.Delay(400); Report("a notch bigger");
            Hold(false); Report("let go");
            Close();
        }

        void Report(string when)
        {
            RECT r; uint a;
            GetWindowRect(hwnd, out r); GetWindowDisplayAffinity(hwnd, out a);
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            Say(string.Format("{0}: {1},{2} {3}x{4} - clicks pass through {5} - on top {6} - out of capture {7} - picture {8}", when, r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top,
                (ex & WS_EX_TRANSPARENT) != 0, (ex & 0x8) != 0, a == WDA_EXCLUDEFROMCAPTURE, picture.Source == null ? "none" : picture.Source.Width + "x" + picture.Source.Height));
        }

        /// <summary>The Browser source showing the puppet: the first whose address is the puppet's page.</summary>
        async Task<string> FindPuppet()
        {
            JsonElement list = await obs.Request("GetInputList", new { inputKind = "browser_source" });
            foreach (JsonElement input in list.GetProperty("inputs").EnumerateArray())
            {
                string name = input.GetProperty("inputName").GetString();
                JsonElement settings = (await obs.Request("GetInputSettings", new { inputName = name })).GetProperty("inputSettings"), u;
                if (settings.TryGetProperty("url", out u) && (u.GetString() ?? "").Contains("/apps/rig/puppet/")) return name;
            }
            throw new Exception("no Browser source shows the puppet — name one: overlay.ps1 -Source <its name>");
        }

        /// <summary>The program scene read again: where the source is in it, and the Display Capture that maps it onto the screen.</summary>
        async Task Read()
        {
            JsonElement now = await obs.Request("GetCurrentProgramScene");
            scene = now.GetProperty("currentProgramSceneName").GetString();
            JsonElement items = (await obs.Request("GetSceneItemList", new { sceneName = scene })).GetProperty("sceneItems");
            item = captureItem = -1; placed = capture = null; shown = false;
            foreach (JsonElement it in items.EnumerateArray())
            {
                JsonElement kind;
                string name = it.GetProperty("sourceName").GetString();
                bool on = it.GetProperty("sceneItemEnabled").GetBoolean();
                if (name == source) { item = it.GetProperty("sceneItemId").GetInt32(); placed = Placed.Of(it.GetProperty("sceneItemTransform")); shown = on; }
                else if (captureItem < 0 && on && it.TryGetProperty("inputKind", out kind) && kind.ValueKind == JsonValueKind.String && kind.GetString() == "monitor_capture")
                { captureItem = it.GetProperty("sceneItemId").GetInt32(); capture = Placed.Of(it.GetProperty("sceneItemTransform")); }
            }
            if (item < 0) Say("“" + source + "” is not in the scene “" + scene + "”: nothing to show");
            if (placed != null && placed.Rotation != 0) Say("the source is turned in OBS: the overlay shows it unturned");
            Place();
        }

        void Hear(string type, JsonElement data)
        {
            if (type == "OverlayLost") { Say("OBS went away"); Close(); return; }
            if (type == "CurrentProgramSceneChanged" || type == "SceneItemCreated" || type == "SceneItemRemoved" || type == "SceneItemEnableStateChanged")
            {
                var reading = Read();
                return;
            }
            if (type != "SceneItemTransformChanged" || data.GetProperty("sceneName").GetString() != scene) return;
            int id = data.GetProperty("sceneItemId").GetInt32();
            if (id == item) placed = Placed.Of(data.GetProperty("sceneItemTransform"));
            else if (id == captureItem) capture = Placed.Of(data.GetProperty("sceneItemTransform"));
            else return;
            if (!holding) Place();
        }

        /// <summary>A point of OBS's canvas on the screen recorded: through the Display Capture's box, or the canvas stretched over the screen.</summary>
        Point OnScreen(Point c)
        {
            if (capture == null) return new Point(screen.X + c.X * screen.Width / baseWidth, screen.Y + c.Y * screen.Height / baseHeight);
            Rect b = capture.Box();
            double sw = capture.SourceWidth - capture.CropLeft - capture.CropRight, sh = capture.SourceHeight - capture.CropTop - capture.CropBottom;
            return new Point(screen.X + capture.CropLeft + (c.X - b.X) / Math.Max(1, b.Width) * sw, screen.Y + capture.CropTop + (c.Y - b.Y) / Math.Max(1, b.Height) * sh);
        }

        /// <summary>Screen pixels in canvas pixels, across: what a drag on the screen moves the source by in OBS.</summary>
        double CanvasPerPixel()
        {
            if (capture == null) return baseWidth / screen.Width;
            double sw = capture.SourceWidth - capture.CropLeft - capture.CropRight;
            return capture.Box().Width / Math.Max(1, sw);
        }

        /// <summary>The window over the source's box on the screen, or out of sight when the source is not shown.</summary>
        void Place()
        {
            if (placed == null || !shown) { SetWindowPos(hwnd, TOPMOST, -10000, -10000, 1, 1, SWP_NOACTIVATE); box = Rect.Empty; return; }
            Rect c = placed.Box();
            Point a = OnScreen(c.TopLeft), z = OnScreen(c.BottomRight);
            box = new Rect(a, z);
            SetWindowPos(hwnd, TOPMOST, (int)Math.Round(box.X), (int)Math.Round(box.Y), Math.Max(1, (int)Math.Round(box.Width)), Math.Max(1, (int)Math.Round(box.Height)), SWP_NOACTIVATE | SWP_SHOWWINDOW);
        }

        /// <summary>OBS's picture of the source, on nothing, a few times a second, at the pixels it fills on the screen.</summary>
        async Task Pictures()
        {
            var clock = new Stopwatch();
            while (IsLoaded)
            {
                clock.Restart();
                if (!box.IsEmpty && box.Width >= 8 && box.Height >= 8)
                {
                    try
                    {
                        JsonElement shot = await obs.Request("GetSourceScreenshot", new
                        {
                            sourceName = source, imageFormat = "png",
                            imageWidth = (int)Math.Min(4096, Math.Round(box.Width)), imageHeight = (int)Math.Min(4096, Math.Round(box.Height)),
                        });
                        string data = shot.GetProperty("imageData").GetString();
                        var image = new BitmapImage();
                        image.BeginInit();
                        image.CacheOption = BitmapCacheOption.OnLoad;
                        image.StreamSource = new MemoryStream(Convert.FromBase64String(data.Substring(data.IndexOf(',') + 1)));
                        image.EndInit();
                        image.Freeze();
                        picture.Source = image;
                    }
                    catch (Exception err) { Say(err.Message); await Task.Delay(1000); }
                }
                int wait = 1000 / fps - (int)clock.ElapsedMilliseconds;
                await Task.Delay(Math.Max(5, wait));
            }
        }

        /// <summary>Taken hold of, or let go: clicks caught and the window outlined, or passing through it again.</summary>
        void Hold(bool on)
        {
            holding = on;
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            SetWindowLong(hwnd, GWL_EXSTYLE, on ? ex & ~WS_EX_TRANSPARENT & ~WS_EX_NOACTIVATE : ex | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE);
            held.Visibility = hint.Visibility = on ? Visibility.Visible : Visibility.Collapsed;
            if (on) { Activate(); Focus(); Say("taken hold of: drag it, the wheel sizes it, Esc lets go"); }
            else { Place(); Say("let go: clicks pass through it again"); }
        }

        /// <summary>Dragged with the mouse, then the source moved in OBS by as much.</summary>
        async void Drag()
        {
            RECT before, after;
            GetWindowRect(hwnd, out before);
            try { DragMove(); } catch (InvalidOperationException) { return; }
            GetWindowRect(hwnd, out after);
            double k = CanvasPerPixel(), dx = (after.Left - before.Left) * k, dy = (after.Top - before.Top) * k;
            if (placed == null || (dx == 0 && dy == 0)) return;
            try
            {
                await obs.Request("SetSceneItemTransform", new { sceneName = scene, sceneItemId = item, sceneItemTransform = new { positionX = placed.X + dx, positionY = placed.Y + dy } });
                placed.X += dx; placed.Y += dy;
                box = new Rect(after.Left, after.Top, box.Width, box.Height);
            }
            catch (Exception err) { Say(err.Message); }
        }

        /// <summary>Sized by the wheel, about its anchor, as OBS sizes a source: its scale, or its bounds when it has some.</summary>
        async Task Size(double k)
        {
            if (placed == null) return;
            try
            {
                if (placed.Bound) await obs.Request("SetSceneItemTransform", new { sceneName = scene, sceneItemId = item, sceneItemTransform = new { boundsWidth = placed.BoundsWidth * k, boundsHeight = placed.BoundsHeight * k } });
                else await obs.Request("SetSceneItemTransform", new { sceneName = scene, sceneItemId = item, sceneItemTransform = new { scaleX = placed.ScaleX * k, scaleY = placed.ScaleY * k } });
                if (placed.Bound) { placed.BoundsWidth *= k; placed.BoundsHeight *= k; }
                else { placed.ScaleX *= k; placed.ScaleY *= k; placed.Width *= k; placed.Height *= k; }
                Place();
            }
            catch (Exception err) { Say(err.Message); }
        }
    }

    public static class OverlayApp
    {
        [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        /// <summary>The overlay on a thread of its own, as WPF wants one; returns when it is closed — false when a trouble closed it.</summary>
        public static bool Run(string url, string password, string source, int fps, int x, int y, int width, int height, bool visible, bool check)
        {
            SetProcessDpiAwarenessContext(new IntPtr(-4));     // per monitor: the screen's own pixels, wherever it is
            bool failed = false;
            var thread = new Thread(() =>
            {
                var app = new Application { ShutdownMode = ShutdownMode.OnMainWindowClose };
                var overlay = new Overlay(new Uri(url), password, source, fps, new Int32Rect(x, y, width, height), visible, check);
                app.Run(overlay);
                failed = overlay.Failed;
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();
            return !failed;
        }
    }
}
