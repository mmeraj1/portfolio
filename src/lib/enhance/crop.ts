export interface CropRect { x: number; y: number; width: number; height: number }

export interface CropDetection { rect: CropRect; confidence: number }

const ANALYSIS_SIDE = 320;

/**
 * Detects the photograph area inside a picture of a print/frame on a different background.
 * The background colour is estimated from the outer border, pixels that differ from it form a mask,
 * and the mask's bounding box (rows/columns with enough foreground) becomes the crop.
 * Returns null when no clear border is found so the caller can fall back to manual cropping.
 */
export function detectPhotoBounds(data: Uint8ClampedArray, width: number, height: number): CropDetection | null {
  const scale = Math.min(1, ANALYSIS_SIDE / Math.max(width, height));
  const w = Math.max(8, Math.round(width * scale));
  const h = Math.max(8, Math.round(height * scale));
  const px = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, Math.floor((y + 0.5) / scale));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, Math.floor((x + 0.5) / scale));
      const si = (sy * width + sx) * 4;
      const di = (y * w + x) * 3;
      px[di] = data[si]; px[di + 1] = data[si + 1]; px[di + 2] = data[si + 2];
    }
  }

  const band = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const border: number[][] = [[], [], []];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < band || y < band || x >= w - band || y >= h - band) {
        for (let c = 0; c < 3; c++) border[c].push(px[(y * w + x) * 3 + c]);
      }
    }
  }
  const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  const bg = border.map(median);

  const dist = new Float32Array(w * h);
  let maxDist = 0;
  for (let i = 0; i < w * h; i++) {
    const d = Math.hypot(px[i * 3] - bg[0], px[i * 3 + 1] - bg[1], px[i * 3 + 2] - bg[2]);
    dist[i] = d; if (d > maxDist) maxDist = d;
  }
  if (maxDist < 30) return null;

  const threshold = Math.max(28, otsu(dist, maxDist));
  const rowCount = new Float32Array(h);
  const colCount = new Float32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dist[y * w + x] > threshold) { rowCount[y]++; colCount[x]++; }

  const rows = occupiedSpan(rowCount, w);
  const cols = occupiedSpan(colCount, h);
  if (!rows || !cols) return null;

  const rect: CropRect = {
    x: Math.round(cols[0] / w * width),
    y: Math.round(rows[0] / h * height),
    width: Math.round((cols[1] - cols[0] + 1) / w * width),
    height: Math.round((rows[1] - rows[0] + 1) / h * height),
  };
  const coverage = (rect.width * rect.height) / (width * height);
  if (coverage > 0.96 || coverage < 0.15) return null;
  return { rect, confidence: Math.min(1, maxDist / 120) };
}

function otsu(values: Float32Array, maxValue: number): number {
  const bins = 64;
  const hist = new Float64Array(bins);
  for (const v of values) hist[Math.min(bins - 1, Math.floor((v / maxValue) * bins))]++;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];
  let wB = 0, sumB = 0, best = 0, bestT = 0;
  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) { best = between; bestT = t; }
  }
  return ((bestT + 1) / bins) * maxValue;
}

/** First and last index whose foreground fraction is at least 35%, ignoring isolated specks. */
function occupiedSpan(counts: Float32Array, lineLength: number): [number, number] | null {
  const need = lineLength * 0.35;
  const ok = Array.from(counts, (c) => c >= need);
  const minRun = Math.max(3, Math.round(counts.length * 0.04));
  let first = -1, last = -1;
  for (let i = 0; i + minRun <= ok.length; i++) if (ok.slice(i, i + minRun).every(Boolean)) { first = i; break; }
  for (let i = ok.length - 1; i - minRun + 1 >= 0; i--) if (ok.slice(i - minRun + 1, i + 1).every(Boolean)) { last = i; break; }
  return first >= 0 && last > first ? [first, last] : null;
}

export function clampRect(rect: CropRect, width: number, height: number): CropRect {
  const x = Math.min(Math.max(0, Math.round(rect.x)), width - 1);
  const y = Math.min(Math.max(0, Math.round(rect.y)), height - 1);
  return { x, y, width: Math.max(1, Math.min(Math.round(rect.width), width - x)), height: Math.max(1, Math.min(Math.round(rect.height), height - y)) };
}
