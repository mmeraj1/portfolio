import { TILE_SIZE, blendWeights, reflect101, tileStarts } from './tiling';

type Ort = typeof import('onnxruntime-web/webgpu');
type Session = import('onnxruntime-web/webgpu').InferenceSession;

export type BackendName = 'webgpu' | 'wasm';

export interface ModelInfo { backend: BackendName; modelBytes: number; loadMs: number }

const MODEL_URL = `${import.meta.env.BASE_URL}models/deblurgan-v2-fp16.onnx`;

let ortPromise: Promise<Ort> | null = null;
let loaded: { session: Session; info: ModelInfo; ort: Ort } | null = null;
let loading: Promise<{ session: Session; info: ModelInfo; ort: Ort }> | null = null;

async function getOrt(): Promise<Ort> {
  ortPromise ??= import('onnxruntime-web/webgpu');
  return ortPromise;
}

async function webGpuAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
  if (!gpu) return false;
  try { return (await gpu.requestAdapter()) !== null; } catch { return false; }
}

async function download(onProgress: (loadedBytes: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) throw new Error(`Could not download the model (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); received += value.length;
    onProgress(received, total || received);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  return bytes;
}

async function selfTest(ort: Ort, session: Session): Promise<void> {
  const input = new ort.Tensor('float32', new Float32Array(TILE_SIZE * TILE_SIZE * 3), [1, TILE_SIZE, TILE_SIZE, 3]);
  const out = await session.run({ input });
  const first = out[session.outputNames[0]];
  if (first.dims.join() !== `1,${TILE_SIZE},${TILE_SIZE},3`) throw new Error('Unexpected model output shape.');
}

/** Downloads the DeblurGAN-v2 ONNX model once and creates a WebGPU session, falling back to WASM. */
export function loadModel(onProgress: (loadedBytes: number, total: number) => void, onStage: (text: string) => void) {
  if (loaded) return Promise.resolve(loaded.info);
  loading ??= (async () => {
    const started = performance.now();
    const ort = await getOrt();
    onStage('Downloading DeblurGAN-v2 model…');
    const bytes = await download(onProgress);
    onStage('Initializing inference engine…');
    const backends: BackendName[] = (await webGpuAvailable()) ? ['webgpu', 'wasm'] : ['wasm'];
    let lastError: unknown;
    for (const backend of backends) {
      try {
        const session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: 'all' });
        await selfTest(ort, session);
        loaded = { session, ort, info: { backend, modelBytes: bytes.length, loadMs: performance.now() - started } };
        return loaded;
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`The AI engine could not start in this browser: ${(lastError as Error)?.message ?? 'unknown error'}`);
  })().catch((err) => { loading = null; throw err; });
  return loading.then((l) => l.info);
}

export interface DeblurProgress { done: number; total: number }

/** Runs DeblurGAN-v2 over overlapping 256px tiles and blends them. Returns a canvas with the result. */
export async function deblur(source: HTMLCanvasElement, onProgress: (p: DeblurProgress) => void, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  if (!loaded) throw new Error('Model is not loaded.');
  const { session, ort } = loaded;
  const width = source.width, height = source.height;
  const src = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  const padW = Math.max(width, TILE_SIZE), padH = Math.max(height, TILE_SIZE);
  const merged = new Float32Array(width * height * 3);
  const total = new Float32Array(width * height);
  const weights = blendWeights();
  const ys = tileStarts(padH), xs = tileStarts(padW);
  const totalTiles = xs.length * ys.length;
  const input = new Float32Array(TILE_SIZE * TILE_SIZE * 3);
  let done = 0;

  for (const top of ys) {
    for (const left of xs) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      for (let ty = 0; ty < TILE_SIZE; ty++) {
        const sy = reflect101(top + ty, height);
        for (let tx = 0; tx < TILE_SIZE; tx++) {
          const si = (sy * width + reflect101(left + tx, width)) * 4;
          const di = (ty * TILE_SIZE + tx) * 3;
          input[di] = src[si] / 127.5 - 1; input[di + 1] = src[si + 1] / 127.5 - 1; input[di + 2] = src[si + 2] / 127.5 - 1;
        }
      }
      const out = await session.run({ input: new ort.Tensor('float32', input, [1, TILE_SIZE, TILE_SIZE, 3]) });
      const pred = out[session.outputNames[0]].data as Float32Array;
      for (let ty = 0; ty < TILE_SIZE; ty++) {
        const y = top + ty;
        if (y >= height) break;
        for (let tx = 0; tx < TILE_SIZE; tx++) {
          const x = left + tx;
          if (x >= width) break;
          const w = weights[ty * TILE_SIZE + tx];
          const pi = (ty * TILE_SIZE + tx) * 3, mi = y * width + x;
          merged[mi * 3] += (pred[pi] + 1) * 127.5 * w;
          merged[mi * 3 + 1] += (pred[pi + 1] + 1) * 127.5 * w;
          merged[mi * 3 + 2] += (pred[pi + 2] + 1) * 127.5 * w;
          total[mi] += w;
        }
      }
      done++;
      onProgress({ done, total: totalTiles });
      await new Promise((r) => setTimeout(r)); // let the UI repaint between tiles
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const wsum = Math.max(total[i], 1e-6);
    image.data[i * 4] = merged[i * 3] / wsum; image.data[i * 4 + 1] = merged[i * 3 + 1] / wsum; image.data[i * 4 + 2] = merged[i * 3 + 2] / wsum;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
