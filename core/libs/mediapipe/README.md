# MediaPipe tasks-vision 1.0.1 — the face landmarker

The rig's puppet reads the author's face with it (`apps/rig/puppet/face.js`),
copied by `node scripts/vendor-mediapipe.mjs` on 2026-10-21.

**Git keeps this file only** (rule 6): the WASM and the model are binaries,
15.3 MB together, and `.gitignore` keeps the folder out but for this
README. Each machine runs the script once; with nothing here the puppet opens
and says so (rule 7). One version, never fetched at runtime.

| file | from | size | sha256 |
|---|---|---|---|
| `vision_bundle.mjs` | `npm:@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs` | 152 KB | `d885630c297c0b20…` |
| `wasm/vision_wasm_internal.js` | `npm:@mediapipe/tasks-vision@1.0.1/wasm/vision_wasm_internal.js` | 316 KB | `e170ee67dd4e16c1…` |
| `wasm/vision_wasm_internal.wasm` | `npm:@mediapipe/tasks-vision@1.0.1/wasm/vision_wasm_internal.wasm` | 11.2 MB | `8da277a733926eac…` |
| `face_landmarker.task` | `mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` | 3.6 MB | `64184e229b263107…` |

**Licence: Apache-2.0**, all of it — `LICENSE` beside these. The package
says so in its `package.json` (checked by the script); the model bundle is
three models, and each one's card says "Licensed under Apache License,
Version 2.0" (read 2026-10-21):

- MediaPipe BlazeFace Model Card (Short Range).pdf: <https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf>
- Model Card MediaPipe Face Mesh V2.pdf: <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf>
- Model Card Blendshape V2.pdf: <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf>

An upgrade is the script with the version it wants, then
`node scripts/check-puppet.mjs` and the author's own face in front of it.
