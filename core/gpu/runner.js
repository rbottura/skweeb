/**
 * runner.js — a chain of filters, run on the GPU, handed back as a picture.
 *
 *   const runner = await createRunner();    // null where there is no WebGPU
 *   await runner.prepare(chain);            // compiles; says which pass failed
 *   const picture = runner.run(source, chain, { scale, time, seed });
 *
 * A chain is data, the part of a recipe that says what was done:
 * `[{ id: 'blur', params: { radius: 4 } }, …]`, an entry with `on: false`
 * skipped. Its params are coerced as an app's are (params.js, valuesFor), so
 * an old recipe runs in a newer catalogue.
 *
 * run() is synchronous, because a handle's frame(i) is (core/rebuild.js): it
 * uploads the source, runs every pass, draws the result into a canvas of its
 * own and takes it as an ImageBitmap, drawable in the same call — the
 * hand-off the probe of 2026-09-26 showed working (docs/roadmap.md). The
 * picture is the runner's, good until its next run(). What takes time,
 * compiling, is prepare()'s, awaited before.
 *
 * Between passes the picture is rgba16float, premultiplied as a canvas is, so
 * a long chain does not band. A filter of several passes may need its own
 * input again at its last — an outline lays the sprite back over its line —
 * so that input stays put while the filter runs, and its passes read it as
 * `orig`: three work textures turn, a filter writing into the two it did not
 * start from. They and the source's are kept for the next run at the same
 * size.
 *
 * ── Past the edge ───────────────────────────────────────────────────────────
 *
 * A blur, a glow, an outline reaches past what it is given; a sprite trimmed
 * to its ink would lose its halo at the trim. A filter says how far it
 * reaches (`reach(values)`, in the source's pixels), a chain adds its filters
 * up (`reachOf`), and a run asked to `grow` puts the picture in the middle of
 * that much clear room on every side — `marginOf(chain, scale)` pixels — and
 * hands back the bigger picture. Not growing, the edge is held: what lies
 * past it is the edge's own colour, right for a photograph that fills its
 * frame.
 */

import { openGpu } from './device.js';
import { moduleFor, PRESENT, PRELUDE_LINES } from './wgsl.js';
import { FILTERS } from './filters/index.js';
import { valuesFor } from '../params.js';

const MID = 'rgba16float';
const PARAM_BYTES = 1024;        // 256 f32 — a palette of 32 colours and room over

/** A pass's whole module, built once per pass rather than once per run. */
const _modules = new WeakMap();
const moduleOf = pass => {
  let code = _modules.get(pass);
  if (!code) _modules.set(pass, code = moduleFor(pass));
  return code;
};

/** A runner on the page's device, or null — openGpu()'s whyNoGpu() says why. */
export async function createRunner() {
  const gpu = await openGpu();
  return gpu ? new Runner(gpu) : null;
}

/**
 * How far past its picture a chain can reach, in the source's pixels at
 * scale 1, rounded up to whole pixels: its filters' reaches added up — a safe
 * bound, since blurs in a row spread less than their sum.
 */
export function reachOf(chain) {
  let sum = 0;
  for (const entry of chain || []) {
    if (!entry || entry.on === false) continue;
    const filter = FILTERS[entry.id];
    if (filter && filter.reach) sum += Math.max(0, filter.reach(valuesFor(filter.params || {}, entry.params)) || 0);
  }
  return Math.ceil(sum);
}

/** Whether a chain draws at random — then what it made has a seed to keep (rule 2). */
export function drawsAtRandom(chain) {
  return (chain || []).some(e => e && e.on !== false && FILTERS[e.id] && FILTERS[e.id].random);
}

/** The room a grown run adds on each side, in pixels at this scale. */
export function marginOf(chain, scale = 1) {
  return Math.round(reachOf(chain) * scale);
}

/** The passes a chain runs, each with the values its filter was given. */
export function passesOf(chain) {
  const out = [];
  for (const entry of chain || []) {
    if (!entry || entry.on === false) continue;
    const filter = FILTERS[entry.id];
    if (!filter) throw new Error(`gpu: no filter "${entry.id}" in this catalogue`);
    const values = valuesFor(filter.params || {}, entry.params);
    filter.passes.forEach((pass, i) => out.push({ filter, pass, values, first: i === 0, label: `${filter.id}.${i}` }));
  }
  return out;
}

class Runner {
  constructor({ device, format, maxSide }) {
    this.device = device;
    this.format = format;
    this.maxSide = maxSide;

    const FRAG = GPUShaderStage.FRAGMENT;
    this.layout = device.createBindGroupLayout({
      label: 'filter pass',
      entries: [
        { binding: 0, visibility: FRAG, buffer: { type: 'uniform' } },
        { binding: 1, visibility: FRAG, sampler: { type: 'filtering' } },
        { binding: 2, visibility: FRAG, texture: { sampleType: 'float' } },
        { binding: 3, visibility: FRAG, buffer: { type: 'uniform' } },
        { binding: 4, visibility: FRAG, texture: { sampleType: 'float' } },
      ],
    });
    this.pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    this.sampler = device.createSampler({
      magFilter: 'linear', minFilter: 'linear',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
    });
    this.frameBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.paramBuffers = [];      // one per pass of a run: a run's writes all land before it
    this.pipelines = new Map();  // target format + module → pipeline

    this.canvas = new OffscreenCanvas(1, 1);
    this.context = this.canvas.getContext('webgpu');
    this.context.configure({ device, format, alphaMode: 'premultiplied' });

    this.w = 0;
    this.h = 0;
    this.src = null;
    this.work = [];                  // three, made to the size by fit()
    this.picture = null;
  }

  /** Compile everything a chain needs. Rejects naming the pass and its line. */
  async prepare(chain) {
    const want = [[PRESENT, this.format, 'present']];
    for (const p of passesOf(chain)) want.push([p.pass, MID, p.label]);
    for (const [pass, format, label] of want) await this.compile(pass, format, label);
  }

  async compile(pass, format, label) {
    const code = moduleOf(pass);
    const key = format + '\n' + code;
    if (this.pipelines.has(key)) return this.pipelines.get(key);

    // Caught here rather than left to the console: the messages below say it
    // better, and name the pass's own line.
    this.device.pushErrorScope('validation');
    const module = this.device.createShaderModule({ label, code });
    const info = await module.getCompilationInfo();
    await this.device.popErrorScope();
    const errors = info.messages.filter(m => m.type === 'error');
    if (errors.length) {
      const shift = PRELUDE_LINES + (pass.uniforms ? 1 : 0);
      throw new Error(`gpu: ${label} does not compile — ` +
        errors.map(m => `line ${m.lineNum - shift}: ${m.message}`).join('; '));
    }
    const pipeline = await this.device.createRenderPipelineAsync({
      label, layout: this.pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    this.pipelines.set(key, pipeline);
    return pipeline;
  }

  /** Whether everything a chain needs is compiled, so run() will not refuse it. */
  ready(chain) {
    const has = (pass, format) => this.pipelines.has(format + '\n' + moduleOf(pass));
    try {
      return has(PRESENT, this.format) && passesOf(chain).every(p => has(p.pass, MID));
    } catch {
      return false;                    // a filter this catalogue does not have
    }
  }

  pipeline(pass, format, label) {
    const found = this.pipelines.get(format + '\n' + moduleOf(pass));
    if (!found) throw new Error(`gpu: ${label} is not compiled — await runner.prepare(chain) first`);
    return found;
  }

  /**
   * Run a chain over a picture.
   *
   * @param {CanvasImageSource} source   a canvas, an OffscreenCanvas, an ImageBitmap, an image
   * @param {object[]} [chain]
   * @param {{scale?: number, time?: number, seed?: number, tick?: number, grow?: boolean}} [opts]
   *   scale multiplies every size a filter has — its sizes are in the
   *   source's pixels at 1, so a picture drawn again at 2x keeps its look;
   *   grow gives the chain room past the edge, and the picture comes back
   *   `marginOf(chain, scale)` bigger on every side; seed and tick are what a
   *   filter drawing at random draws from — the recipe's seed, the loop's frame
   * @returns {ImageBitmap} the runner's, good until its next run()
   */
  run(source, chain = [], { scale = 1, time = 0, seed = 0, tick = 0, grow = false } = {}) {
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const m = grow ? marginOf(chain, scale) : 0;
    const w = sw + 2 * m;
    const h = sh + 2 * m;
    this.fit(w, h);
    const { device } = this;

    // The room starts clear, whatever an earlier run left in it: submitted
    // before the copy, so the queue keeps them in that order.
    if (m > 0) {
      const clearing = device.createCommandEncoder({ label: 'room' });
      clearing.beginRenderPass({ colorAttachments: [{ view: this.src.createView(), loadOp: 'clear',
        storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] }).end();
      device.queue.submit([clearing.finish()]);
    }
    device.queue.copyExternalImageToTexture({ source },
      { texture: this.src, origin: [m, m], premultipliedAlpha: true }, [sw, sh]);

    const frame = new ArrayBuffer(32);
    new Float32Array(frame, 0, 6).set([w, h, 1 / w, 1 / h, scale, time]);
    new Uint32Array(frame, 24, 2).set([seed >>> 0, tick >>> 0]);
    device.queue.writeBuffer(this.frameBuffer, 0, frame);

    const encoder = device.createCommandEncoder({ label: 'chain' });
    const info = { width: w, height: h, scale, time, seed, tick };
    let input = this.src;
    let own = input;                 // the filter's own input: its passes' `orig`
    let free = [];                   // the two textures it writes into, in turns
    let k = 0;
    passesOf(chain).forEach(({ pass, values, label, first }, i) => {
      if (first) {
        own = input;
        free = this.work.filter(t => t !== own);
        k = 0;
      }
      const output = free[k++ % 2];
      const params = this.paramBuffer(i);
      if (pass.uniforms) device.queue.writeBuffer(params, 0, new Float32Array(pass.uniforms(values, info)));
      this.draw(encoder, this.pipeline(pass, MID, label), input, params, output.createView(), own);
      input = output;
    });

    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    const present = this.pipeline(PRESENT, this.format, 'present');
    this.draw(encoder, present, input, this.paramBuffer(0), this.context.getCurrentTexture().createView(), input);
    device.queue.submit([encoder.finish()]);

    if (this.picture) this.picture.close();
    this.picture = this.canvas.transferToImageBitmap();
    return this.picture;
  }

  draw(encoder, pipeline, input, params, view, own) {
    const group = this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: input.createView() },
        { binding: 3, resource: { buffer: params } },
        { binding: 4, resource: own.createView() },
      ],
    });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.draw(3);
    pass.end();
  }

  paramBuffer(i) {
    while (this.paramBuffers.length <= i) {
      this.paramBuffers.push(this.device.createBuffer({
        size: PARAM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }));
    }
    return this.paramBuffers[i];
  }

  /** The three textures at this size — kept from the last run when it matches. */
  fit(w, h) {
    if (w === this.w && h === this.h) return;
    if (!(w >= 1 && h >= 1)) throw new Error(`gpu: a ${w} × ${h} picture has nothing to filter`);
    if (w > this.maxSide || h > this.maxSide) {
      throw new Error(`gpu: ${w} × ${h} is past this GPU's largest texture, ${this.maxSide}`);
    }
    for (const t of [this.src, ...this.work]) if (t) t.destroy();
    const make = (label, usage) => this.device.createTexture({ label, size: [w, h], format: MID, usage });
    const U = GPUTextureUsage;
    this.src = make('source', U.TEXTURE_BINDING | U.COPY_DST | U.RENDER_ATTACHMENT);
    this.work = ['work 0', 'work 1', 'work 2'].map(label => make(label, U.TEXTURE_BINDING | U.RENDER_ATTACHMENT));
    this.w = w;
    this.h = h;
  }

  /** Let the GPU memory go; the runner is done. */
  dispose() {
    for (const t of [this.src, ...this.work]) if (t) t.destroy();
    for (const b of [this.frameBuffer, ...this.paramBuffers]) b.destroy();
    if (this.picture) this.picture.close();
    this.src = this.picture = null;
    this.work = [];
    this.w = this.h = 0;
  }
}
