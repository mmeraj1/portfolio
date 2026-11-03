import { labToRgb, rgbToLab } from './lab';
import { loadSession, yieldToUi } from './runtime';
import type { LoadedModel } from './runtime';

export const DDCOLOR_BYTES = 135444402;
export const DDCOLOR_URL = 'https://huggingface.co/edgetools/ddcolor/resolve/main/ddcolor-tiny-fp16.onnx';
const SIZE = 512;

const spec = {
  name: 'DDColor-tiny colorization model',
  url: DDCOLOR_URL,
  bytes: DDCOLOR_BYTES,
  selfTest: async (ort: typeof import('onnxruntime-web/webgpu'), session: import('onnxruntime-web/webgpu').InferenceSession) => {
    const out = await session.run({ input: new ort.Tensor('float32', new Float32Array(3 * SIZE * SIZE), [1, 3, SIZE, SIZE]) });
    if (out[session.outputNames[0]].dims.join() !== `1,2,${SIZE},${SIZE}`) throw new Error('Unexpected colorization output shape.');
  },
};

export const loadColorizer = (onProgress: (l: number, t: number) => void, onStage: (t: string) => void) => loadSession(spec, onProgress, onStage, 'wasm');

/** Bilinear sample of a planar float image. */
function sample(plane: Float32Array, w: number, h: number, x: number, y: number): number {
  const fx = Math.min(w - 1, Math.max(0, x)), fy = Math.min(h - 1, Math.max(0, y));
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  return (plane[y0 * w + x0] * (1 - tx) + plane[y0 * w + x1] * tx) * (1 - ty) + (plane[y1 * w + x0] * (1 - tx) + plane[y1 * w + x1] * tx) * ty;
}

export interface ColorizeResult { ab: Float32Array; L: Float32Array; width: number; height: number; canvasAtIntensity: (intensity: number) => HTMLCanvasElement }

/**
 * DDColor predicts only the chroma (a,b) channels at 512x512 from the luminance. We keep the photograph's
 * own full-resolution luminance and upsample the predicted chroma, so detail and faces are preserved.
 * The returned object can be re-rendered at any intensity without running the network again.
 */
export async function colorize(source: HTMLCanvasElement, model: LoadedModel, signal?: AbortSignal): Promise<ColorizeResult> {
  const { session, ort } = model;
  const width = source.width, height = source.height;
  const src = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const L = new Float32Array(width * height);
  for (let i = 0; i < L.length; i++) L[i] = rgbToLab(src[i * 4], src[i * 4 + 1], src[i * 4 + 2])[0];

  const input = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const l = sample(L, width, height, ((x + 0.5) * width) / SIZE - 0.5, ((y + 0.5) * height) / SIZE - 0.5);
    const [r, g, b] = labToRgb(l, 0, 0);
    input[y * SIZE + x] = r / 255; input[plane + y * SIZE + x] = g / 255; input[2 * plane + y * SIZE + x] = b / 255;
  }
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  await yieldToUi();
  const out = await session.run({ input: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  const pred = out[session.outputNames[0]].data as Float32Array;
  const a = pred.subarray(0, plane), b = pred.subarray(plane, 2 * plane);

  const ab = new Float32Array(width * height * 2);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = ((x + 0.5) * SIZE) / width - 0.5, sy = ((y + 0.5) * SIZE) / height - 0.5;
    ab[(y * width + x) * 2] = sample(a, SIZE, SIZE, sx, sy);
    ab[(y * width + x) * 2 + 1] = sample(b, SIZE, SIZE, sx, sy);
  }

  const canvasAtIntensity = (intensity: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const [r, g, bl] = labToRgb(L[i], ab[i * 2] * intensity, ab[i * 2 + 1] * intensity);
      image.data[i * 4] = r; image.data[i * 4 + 1] = g; image.data[i * 4 + 2] = bl; image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  };
  return { ab, L, width, height, canvasAtIntensity };
}
