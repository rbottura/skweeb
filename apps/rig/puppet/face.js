/**
 * face.js — the author's face, read from the camera by MediaPipe's Face
 * Landmarker: 478 points a frame, in the camera's pixels — their depth in
 * the same pixels as across — and the face's transform, which way the head
 * is turned (head.js).
 *
 * MediaPipe is a copy in core/libs/mediapipe/, put there once a machine by
 * `node scripts/vendor-mediapipe.mjs` and never fetched by the page (rule
 * 7): its WASM and its model are binaries git does not hold (rule 6), so
 * without them `openFace` throws a `NoTracker` that says how to get them.
 * It reads on the GPU where the browser offers it one (WebGL2), on the CPU
 * otherwise — the CPU is fast enough for one face at the camera's rate.
 */

const LIBS = new URL('../../../core/libs/mediapipe/', import.meta.url);
const at = file => new URL(file, LIBS).href;

/** MediaPipe is not on this machine. */
export class NoTracker extends Error {}

/**
 * @returns {Promise<{on: string, read(video: HTMLVideoElement, now: number): ?{points: Array<{x, y, z}>, transform: ?ArrayLike<number>}, close(): void}>}
 *          `on` says where it reads, GPU or CPU; `read` gives the face in this frame, or null
 */
export async function openFace() {
  const there = await fetch(at('face_landmarker.task'), { method: 'HEAD' }).then(r => r.ok, () => false);
  if (!there) throw new NoTracker('MediaPipe is not on this machine — run  node scripts/vendor-mediapipe.mjs  once');
  const { FaceLandmarker } = await import(at('vision_bundle.mjs'));
  const fileset = { wasmLoaderPath: at('wasm/vision_wasm_internal.js'), wasmBinaryPath: at('wasm/vision_wasm_internal.wasm') };
  const options = delegate => ({
    baseOptions: { modelAssetPath: at('face_landmarker.task'), delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  });
  let landmarker, on = 'GPU';
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    on = 'CPU';
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
  let last = 0;
  return {
    on,
    read(video, now) {
      if (!(video.readyState >= 2) || !video.videoWidth) return null;
      last = Math.max(now, last + 1);            // every timestamp later than the last, as MediaPipe asks
      const result = landmarker.detectForVideo(video, last);
      const face = (result.faceLandmarks || [])[0];
      if (!face) return null;
      const w = video.videoWidth, h = video.videoHeight, m = (result.facialTransformationMatrixes || [])[0];
      return { points: face.map(p => ({ x: p.x * w, y: p.y * h, z: p.z * w })), transform: m ? m.data : null };
    },
    close() { landmarker.close(); },
  };
}
