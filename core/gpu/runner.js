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
 * a long chain does not band. Two such textures are used in turns; the
 * source keeps its own, which a pass reads as `orig`. They are kept for the
 * next run at the same size.
 */

import { openGpu } from './device.js';
import { moduleFor, PRESENT, PRELUDE_LINES } from './wgsl.js';
import { FILTERS } from './filters/index.js';
import { valuesFor } from '../params.js';

const MID = 'rgba16float';
const PARAM_BYTES = 256;         // 64 f32 — far more than a pass has

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

/** The passes a chain runs, each with the values its filter was given. */
export function passesOf(chain) {
  const out = [];
  for (const entry of chain || []) {
    if (!entry || entry.on === false) continue;
    const filter = FILTERS[entry.id];
    if (!filter) throw new Error(`gpu: no filter "${entry.id}" in this catalogue`);
    const values = valuesFor(filter.params || {}, entry.params);
    filter.passes.forEach((pass, i) => out.push({ filter, pass, values, label: `${filter.id}.${i}` }));
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
   * @param {{scale?: number, time?: number, seed?: number}} [opts]
   *   scale multiplies every size a filter has — its sizes are in the
   *   source's pixels at 1, so a picture drawn again at 2x keeps its look
   * @returns {ImageBitmap} the runner's, good until its next run()
   */
  run(source, chain = [], { scale = 1, time = 0, seed = 0 } = {}) {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    this.fit(w, h);
    const { device } = this;

    device.queue.copyExternalImageToTexture({ source }, { texture: this.src, premultipliedAlpha: true }, [w, h]);

    const frame = new ArrayBuffer(32);
    new Float32Array(frame, 0, 6).set([w, h, 1 / w, 1 / h, scale, time]);
    new Uint32Array(frame, 24, 2).set([seed >>> 0, 0]);
    device.queue.writeBuffer(this.frameBuffer, 0, frame);

    const encoder = device.createCommandEncoder({ label: 'chain' });
    const info = { width: w, height: h, scale, time, seed };
    let input = this.src;
    passesOf(chain).forEach(({ pass, values, label }, i) => {
      const output = input === this.ping ? this.pong : this.ping;
      const params = this.paramBuffer(i);
      if (pass.uniforms) device.queue.writeBuffer(params, 0, new Float32Array(pass.uniforms(values, info)));
      this.draw(encoder, this.pipeline(pass, MID, label), input, params, output.createView());
      input = output;
    });

    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    const present = this.pipeline(PRESENT, this.format, 'present');
    this.draw(encoder, present, input, this.paramBuffer(0), this.context.getCurrentTexture().createView());
    device.queue.submit([encoder.finish()]);

    if (this.picture) this.picture.close();
    this.picture = this.canvas.transferToImageBitmap();
    return this.picture;
  }

  draw(encoder, pipeline, input, params, view) {
    const group = this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: input.createView() },
        { binding: 3, resource: { buffer: params } },
        { binding: 4, resource: this.src.createView() },
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
    for (const t of [this.src, this.ping, this.pong]) if (t) t.destroy();
    const make = (label, usage) => this.device.createTexture({ label, size: [w, h], format: MID, usage });
    const U = GPUTextureUsage;
    this.src = make('source', U.TEXTURE_BINDING | U.COPY_DST | U.RENDER_ATTACHMENT);
    this.ping = make('ping', U.TEXTURE_BINDING | U.RENDER_ATTACHMENT);
    this.pong = make('pong', U.TEXTURE_BINDING | U.RENDER_ATTACHMENT);
    this.w = w;
    this.h = h;
  }

  /** Let the GPU memory go; the runner is done. */
  dispose() {
    for (const t of [this.src, this.ping, this.pong]) if (t) t.destroy();
    for (const b of [this.frameBuffer, ...this.paramBuffers]) b.destroy();
    if (this.picture) this.picture.close();
    this.src = this.ping = this.pong = this.picture = null;
    this.w = this.h = 0;
  }
}
