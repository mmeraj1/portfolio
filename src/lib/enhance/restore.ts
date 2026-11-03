import { blendWeightsFor, reflect101, tileStartsFor } from './tiling';
import { loadSession, yieldToUi } from './runtime';
import type { LoadedModel } from './runtime';

const TILE = 128;      // input tile edge; the network outputs 4x this
const OVERLAP = 16;
const SCALE = 4;

const spec = {
  name: 'Real-ESRGAN restoration model',
  url: `${import.meta.env.BASE_URL}models/realesrgan-general-x4v3.onnx`,
  bytes: 4866420,
  selfTest: async (ort: typeof import('onnxruntime-web/webgpu'), session: import('onnxruntime-web/webgpu').InferenceSession) => {
    const out = await session.run({ input: new ort.Tensor('float32', new Float32Array(3 * 32 * 32), [1, 3, 32, 32]) });
    if (out[session.outputNames[0]].dims.join() !== '1,3,128,128') throw new Error('Unexpected restoration output shape.');
  },
};

export const loadRestorer = (onProgress: (l: number, t: number) => void, onStage: (t: string) => void) => loadSession(spec, onProgress, onStage);

export interface RestoreOptions {
  /** Output size relative to the input: 1 keeps the size (detail is averaged down), 2 doubles it. */
  outputScale: 1 | 2;
  /** 0..1 mix between the original and the restored pixels. */
  strength: number;
}

/**
 * Real-ESRGAN (general-x4v3) over overlapping tiles. Each 4x tile is box-averaged down to the requested
 * output scale immediately, so memory never holds a full 4x image.
 */
export async function restore(source: HTMLCanvasElement, model: LoadedModel, options: RestoreOptions, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  const { session, ort } = model;
  const width = source.width, height = source.height;
  const s = options.outputScale;
  const outW = width * s, outH = height * s;
  const src = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const tile = Math.min(TILE, Math.max(width, height) < TILE ? Math.max(width, height) : TILE);
  const xs = tileStartsFor(Math.max(width, tile), tile, OVERLAP), ys = tileStartsFor(Math.max(height, tile), tile, OVERLAP);
  const weights = blendWeightsFor(tile * s);
  const merged = new Float32Array(outW * outH * 3);
  const total = new Float32Array(outW * outH);
  const input = new Float32Array(3 * tile * tile);
  const plane = tile * tile;
  const down = SCALE / s; // box size in network-output pixels per output pixel
  const outTile = tile * SCALE;
  const totalTiles = xs.length * ys.length;
  let done = 0;

  for (const top of ys) for (const left of xs) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    for (let ty = 0; ty < tile; ty++) {
      const sy = reflect101(top + ty, height);
      for (let tx = 0; tx < tile; tx++) {
        const si = (sy * width + reflect101(left + tx, width)) * 4;
        input[ty * tile + tx] = src[si] / 255; input[plane + ty * tile + tx] = src[si + 1] / 255; input[2 * plane + ty * tile + tx] = src[si + 2] / 255;
      }
    }
    const out = await session.run({ input: new ort.Tensor('float32', input, [1, 3, tile, tile]) });
    const pred = out[session.outputNames[0]].data as Float32Array;
    const oplane = outTile * outTile;
    const tileOut = tile * s;
    for (let oy = 0; oy < tileOut; oy++) {
      const y = top * s + oy;
      if (y >= outH) break;
      for (let ox = 0; ox < tileOut; ox++) {
        const x = left * s + ox;
        if (x >= outW) break;
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < down; dy++) for (let dx = 0; dx < down; dx++) {
          const p = (oy * down + dy) * outTile + ox * down + dx;
          r += pred[p]; g += pred[oplane + p]; b += pred[2 * oplane + p];
        }
        const n = down * down, w = weights[oy * tileOut + ox], mi = y * outW + x;
        merged[mi * 3] += (r / n) * 255 * w; merged[mi * 3 + 1] += (g / n) * 255 * w; merged[mi * 3 + 2] += (b / n) * 255 * w;
        total[mi] += w;
      }
    }
    done++;
    onProgress(done, totalTiles);
    await yieldToUi();
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(outW, outH);
  const mix = Math.max(0, Math.min(1, options.strength));
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const i = y * outW + x, wsum = Math.max(total[i], 1e-6);
    // Original pixel for blending: nearest source pixel, bilinear is unnecessary at mix < 1 for scale <= 2.
    const si = (Math.min(height - 1, Math.floor(y / s)) * width + Math.min(width - 1, Math.floor(x / s))) * 4;
    for (let c = 0; c < 3; c++) image.data[i * 4 + c] = (merged[i * 3 + c] / wsum) * mix + src[si + c] * (1 - mix);
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
