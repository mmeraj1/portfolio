type Ort = typeof import('onnxruntime-web/webgpu');
export type Session = import('onnxruntime-web/webgpu').InferenceSession;
export type Tensor = import('onnxruntime-web/webgpu').Tensor;
export type BackendName = 'webgpu' | 'wasm';

export interface LoadedModel { session: Session; ort: Ort; backend: BackendName; bytes: number; loadMs: number; fromCache: boolean }

let ortPromise: Promise<Ort> | null = null;
export const getOrt = () => (ortPromise ??= import('onnxruntime-web/webgpu'));

async function webGpuAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
  if (!gpu) return false;
  try { return (await gpu.requestAdapter()) !== null; } catch { return false; }
}

const CACHE_NAME = 'ai-restoration-models-v1';

async function readStream(res: Response, onProgress: (loaded: number, total: number) => void): Promise<Uint8Array> {
  if (!res.body) throw new Error('The browser cannot stream this download.');
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

/** Downloads a model with real progress, using the Cache API so repeat visits skip the download. */
async function fetchModel(url: string, expectedBytes: number, onProgress: (loaded: number, total: number) => void): Promise<{ bytes: Uint8Array; fromCache: boolean }> {
  const cache = 'caches' in globalThis ? await caches.open(CACHE_NAME).catch(() => null) : null;
  const hit = await cache?.match(url);
  if (hit) {
    const bytes = await readStream(hit, onProgress);
    if (bytes.length === expectedBytes) return { bytes, fromCache: true };
    await cache!.delete(url);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the model (HTTP ${res.status}).`);
  const copy = cache ? res.clone() : null;
  const bytes = await readStream(res, (l, t) => onProgress(l, t || expectedBytes));
  if (bytes.length !== expectedBytes) throw new Error('The model download was incomplete. Please try again.');
  if (cache && copy) await cache.put(url, new Response(new Blob([bytes as BlobPart]), { headers: { 'content-length': String(bytes.length) } })).catch(() => undefined);
  return { bytes, fromCache: false };
}

export interface ModelSpec {
  name: string;
  url: string;
  bytes: number;
  optimization?: 'disabled' | 'basic' | 'extended' | 'all';
  /** Runs a real inference to prove every operator works on the chosen backend. */
  selfTest: (ort: Ort, session: Session) => Promise<void>;
}

const cacheByName = new Map<string, Promise<LoadedModel>>();

export function loadSession(spec: ModelSpec, onProgress: (loaded: number, total: number) => void, onStage: (text: string) => void, preferred?: BackendName): Promise<LoadedModel> {
  const key = `${spec.name}:${preferred ?? 'auto'}`;
  const existing = cacheByName.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const started = performance.now();
    const ort = await getOrt();
    onStage(`Downloading ${spec.name}…`);
    const { bytes, fromCache } = await fetchModel(spec.url, spec.bytes, onProgress);
    onStage(`Starting ${spec.name}…`);
    const gpu = await webGpuAvailable();
    const backends: BackendName[] = preferred ? [preferred] : gpu ? ['webgpu', 'wasm'] : ['wasm'];
    let lastError: unknown;
    for (const backend of backends) {
      try {
        const session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: spec.optimization ?? 'all' });
        await spec.selfTest(ort, session);
        return { session, ort, backend, bytes: bytes.length, loadMs: performance.now() - started, fromCache };
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`${spec.name} could not run in this browser: ${(lastError as Error)?.message ?? 'unknown error'}`);
  })().catch((err) => { cacheByName.delete(key); throw err; });
  cacheByName.set(key, promise);
  return promise;
}

export const yieldToUi = () => new Promise<void>((r) => setTimeout(r));
