export const TILE_SIZE = 256;
export const TILE_OVERLAP = 32;

export function tileStarts(length: number): number[] {
  if (length <= TILE_SIZE) return [0];
  const stride = TILE_SIZE - TILE_OVERLAP;
  const starts: number[] = [];
  for (let s = 0; s <= length - TILE_SIZE; s += stride) starts.push(s);
  const last = length - TILE_SIZE;
  if (starts[starts.length - 1] !== last) starts.push(last);
  return starts;
}

export function tileCount(width: number, height: number): number {
  return tileStarts(Math.max(width, TILE_SIZE)).length * tileStarts(Math.max(height, TILE_SIZE)).length;
}

/** Scale so the longest side is at most maxSide; never upscales. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Hann-style blending weights (floored so tile borders never reach zero). */
export function blendWeights(): Float32Array {
  const w1 = new Float32Array(TILE_SIZE);
  for (let i = 0; i < TILE_SIZE; i++) w1[i] = Math.max(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (TILE_SIZE - 1)), 0.05);
  const w = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) w[y * TILE_SIZE + x] = w1[y] * w1[x];
  return w;
}

/** Mirror index into [0, n) without repeating the edge pixel (matches OpenCV BORDER_REFLECT_101). */
export function reflect101(i: number, n: number): number {
  if (n === 1) return 0;
  const period = 2 * (n - 1);
  const m = ((i % period) + period) % period;
  return m < n ? m : period - m;
}
