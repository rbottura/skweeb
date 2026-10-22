// scripts/obs/Placed.cs — a scene item's transform as obs-websocket gives it, and the box its
// picture fills on OBS's canvas — its alignment, its bounds.
// Compiled with Overlay.cs by overlay.ps1. skweeb's own, as the rest of the repo is.

using System;
using System.Text.Json;
using System.Windows;

namespace Skweeb
{
    /// <summary>A scene item's transform as obs-websocket gives it, and the box it fills on OBS's canvas.</summary>
    public sealed class Placed
    {
        public double X, Y, Rotation, ScaleX, ScaleY, Width, Height, SourceWidth, SourceHeight, BoundsWidth, BoundsHeight, CropLeft, CropRight, CropTop, CropBottom;
        public int Alignment, BoundsAlignment;
        public string Bounds = "OBS_BOUNDS_NONE";

        static double N(JsonElement t, string k) { JsonElement v; return t.TryGetProperty(k, out v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : 0; }

        public static Placed Of(JsonElement t)
        {
            JsonElement b;
            return new Placed
            {
                X = N(t, "positionX"), Y = N(t, "positionY"), Rotation = N(t, "rotation"), ScaleX = N(t, "scaleX"), ScaleY = N(t, "scaleY"),
                Width = N(t, "width"), Height = N(t, "height"), SourceWidth = N(t, "sourceWidth"), SourceHeight = N(t, "sourceHeight"),
                BoundsWidth = N(t, "boundsWidth"), BoundsHeight = N(t, "boundsHeight"), CropLeft = N(t, "cropLeft"), CropRight = N(t, "cropRight"),
                CropTop = N(t, "cropTop"), CropBottom = N(t, "cropBottom"), Alignment = (int)N(t, "alignment"), BoundsAlignment = (int)N(t, "boundsAlignment"),
                Bounds = t.TryGetProperty("boundsType", out b) && b.ValueKind == JsonValueKind.String ? b.GetString() : "OBS_BOUNDS_NONE",
            };
        }

        public bool Bound { get { return Bounds != "OBS_BOUNDS_NONE"; } }

        /// <summary>Where an anchor puts a box: OBS's alignment, its left 1, right 2, top 4, bottom 8; none of them its middle.</summary>
        static Point Corner(double x, double y, double w, double h, int a)
        {
            return new Point(x - ((a & 1) != 0 ? 0 : (a & 2) != 0 ? w : w / 2), y - ((a & 4) != 0 ? 0 : (a & 8) != 0 ? h : h / 2));
        }

        /// <summary>The box the item's picture fills on the canvas: its own size, or fitted into its bounds as their type says.</summary>
        public Rect Box()
        {
            if (!Bound) return new Rect(Corner(X, Y, Width, Height, Alignment), new Size(Math.Max(0, Width), Math.Max(0, Height)));
            var b = new Rect(Corner(X, Y, BoundsWidth, BoundsHeight, Alignment), new Size(Math.Max(0, BoundsWidth), Math.Max(0, BoundsHeight)));
            double sw = SourceWidth - CropLeft - CropRight, sh = SourceHeight - CropTop - CropBottom;
            if (sw <= 0 || sh <= 0 || Bounds == "OBS_BOUNDS_STRETCH") return b;
            double kx = b.Width / sw, ky = b.Height / sh, k;
            switch (Bounds)
            {
                case "OBS_BOUNDS_SCALE_INNER": k = Math.Min(kx, ky); break;
                case "OBS_BOUNDS_SCALE_OUTER": k = Math.Max(kx, ky); break;
                case "OBS_BOUNDS_SCALE_TO_WIDTH": k = kx; break;
                case "OBS_BOUNDS_SCALE_TO_HEIGHT": k = ky; break;
                case "OBS_BOUNDS_MAX_ONLY": k = Math.Min(1, Math.Min(kx, ky)); break;
                default: return b;
            }
            double w = sw * k, h = sh * k;
            int a = BoundsAlignment;
            return new Rect((a & 1) != 0 ? b.X : (a & 2) != 0 ? b.Right - w : b.X + (b.Width - w) / 2,
                            (a & 4) != 0 ? b.Y : (a & 8) != 0 ? b.Bottom - h : b.Y + (b.Height - h) / 2, w, h);
        }
    }
}
