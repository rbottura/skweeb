# three.js 0.186.1

The 3D app's renderer (`apps/3d/`, M10), copied from npm through jsDelivr by
`node scripts/vendor-three.mjs` on 2026-10-06. MIT — `LICENSE`; the build's
files carry the licence in their heads, an add-on in its first line (rule 5).

One version, never fetched at runtime (rule 7). An upgrade is the script with
the version it wants, then `node scripts/check-3d.mjs`: three releases monthly
and may change what a recipe draws.

| file | from | size | sha256 |
|---|---|---|---|
| `three.core.js` | `build/three.core.js` | 1424 KB | `9edde002b066a9a0…` |
| `three.webgpu.js` | `build/three.webgpu.js` | 2231 KB | `15cfce5c65354170…` |
| `addons/controls/TransformControls.js` | `examples/jsm/controls/TransformControls.js` | 51 KB | `56ebde3c659ed1da…` |

Only `apps/3d/` imports these. `three.webgpu.js` is the WebGPU renderer and
everything `three.core.js` has; geometry and scenes can import
`three.core.js` alone, which Node runs too (`tests/3d-*.mjs`).
