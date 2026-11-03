import { dist, isConvexQuad, orderQuad, applyHomography, polygonArea, rectifiedSize, solveHomography, warpQuad } from './geometry';
import type { Point, Quad, RgbaImage } from './geometry';

export interface QuadDetection { quad: Quad; confidence: number }
export interface PhotoDetection {
  /** The printed picture itself (inside any paper border / frame). */
  photo: QuadDetection | null;
  /** The whole print including its paper border, when one was found. */
  print: QuadDetection | null;
}

const ANALYSIS_SIZE = 480;

function downscale(img: RgbaImage, maxSide: number): { img: RgbaImage; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1) return { img, scale };
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y / scale), y1 = Math.max(y0 + 1, Math.min(img.height, Math.floor((y + 1) / scale)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x / scale), x1 = Math.max(x0 + 1, Math.min(img.width, Math.floor((x + 1) / scale)));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * img.width + xx) * 4;
        r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
      }
      const o = (y * w + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { img: { data: out, width: w, height: h }, scale };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function otsu(values: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (const v of values) hist[v]++;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let wB = 0, sumB = 0, best = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

function boxMorph(mask: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let hit = dilate ? 0 : 1;
      for (let k = -r; k <= r; k++) {
        const xx = horizontal ? x + k : x, yy = horizontal ? y : y + k;
        const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? (dilate ? 0 : 1) : src[yy * w + xx];
        if (dilate ? v : !v) { hit = dilate ? 1 : 0; break; }
      }
      out[y * w + x] = hit;
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array | null {
  const label = new Int32Array(w * h);
  let best = 0, bestId = 0, id = 0;
  const stack: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || label[i]) continue;
    id++; let size = 0;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop()!; size++;
      const x = p % w, y = (p - x) / w;
      if (x > 0 && mask[p - 1] && !label[p - 1]) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !label[p + 1]) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !label[p - w]) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !label[p + w]) { label[p + w] = id; stack.push(p + w); }
    }
    if (size > best) { best = size; bestId = id; }
  }
  if (!bestId) return null;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = label[i] === bestId ? 1 : 0;
  return out;
}

function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (p: number) => { if (!mask[p] && !outside[p]) { outside[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop()!; const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  return mask.map((v, i) => (v || !outside[i] ? 1 : 0)) as Uint8Array;
}

function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: Point[]) => {
    const hull: Point[] = [];
    for (const p of list) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  return [...build(pts), ...build([...pts].reverse())];
}

/** Reduces a convex polygon to four vertices by repeatedly dropping the vertex that loses least area. */
function reduceToQuad(hull: Point[]): Point[] {
  const poly = [...hull];
  while (poly.length > 4) {
    let bestIdx = 0, bestArea = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
      if (area < bestArea) { bestArea = area; bestIdx = i; }
    }
    poly.splice(bestIdx, 1);
  }
  return poly;
}

interface Line { px: number; py: number; dx: number; dy: number }

function fitLine(points: Point[]): Line | null {
  if (points.length < 8) return null;
  let line: Line | null = null;
  let use = points;
  for (let iter = 0; iter < 3; iter++) {
    const n = use.length;
    const mx = use.reduce((s, p) => s + p.x, 0) / n, my = use.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of use) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; }
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    line = { px: mx, py: my, dx: Math.cos(angle), dy: Math.sin(angle) };
    const res = points.map((p) => Math.abs((p.x - line!.px) * line!.dy - (p.y - line!.py) * line!.dx));
    const cut = Math.max(1.5, 2.5 * median(res));
    use = points.filter((_, i) => res[i] <= cut);
    if (use.length < 8) break;
  }
  return line;
}

function intersect(a: Line, b: Line): Point | null {
  const det = a.dx * b.dy - a.dy * b.dx;
  if (Math.abs(det) < 1e-6) return null;
  const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / det;
  return { x: a.px + t * a.dx, y: a.py + t * a.dy };
}

/** Finds the dominant object that differs from the background colour sampled around the image border. */
function detectObject(img: RgbaImage): QuadDetection | null {
  const { img: small, scale } = downscale(img, ANALYSIS_SIZE);
  const { width: w, height: h, data } = small;
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x < ring || y < ring || x >= w - ring || y >= h - ring) {
      const i = (y * w + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  const bg = [median(rs), median(gs), median(bs)];
  const d = new Uint8Array(w * h);
  for (let i = 0; i < d.length; i++) {
    const dr = data[i * 4] - bg[0], dg = data[i * 4 + 1] - bg[1], db = data[i * 4 + 2] - bg[2];
    d[i] = Math.min(255, Math.sqrt(dr * dr + dg * dg + db * db));
  }
  const threshold = Math.max(18, otsu(d));
  let mask: Uint8Array = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = d[i] > threshold ? 1 : 0;
  const r = Math.max(1, Math.round(Math.min(w, h) * 0.012));
  mask = boxMorph(boxMorph(mask, w, h, r, true), w, h, r, false);
  mask = boxMorph(boxMorph(mask, w, h, r, false), w, h, r, true);
  const comp = largestComponent(mask, w, h);
  if (!comp) return null;
  const filled = fillHoles(comp, w, h);

  const boundary: Point[] = [];
  let area = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!filled[y * w + x]) continue;
    area++;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !filled[y * w + x - 1] || !filled[y * w + x + 1] || !filled[(y - 1) * w + x] || !filled[(y + 1) * w + x];
    if (edge) boundary.push({ x: x + 0.5, y: y + 0.5 });
  }
  if (boundary.length < 16 || area < w * h * 0.08) return null;

  const hull = convexHull(boundary);
  if (hull.length < 4) return null;
  let quad = orderQuad(reduceToQuad(hull));

  const diag = Math.hypot(w, h);
  const tolerance = diag * 0.04;
  const lines: (Line | null)[] = [];
  let inliers = 0;
  for (let s = 0; s < 4; s++) {
    const a = quad[s], b = quad[(s + 1) % 4];
    const len = dist(a, b) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const side = boundary.filter((p) => {
      const t = ((p.x - a.x) * ux + (p.y - a.y) * uy) / len;
      const off = Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux);
      return t > 0.08 && t < 0.92 && off < tolerance;
    });
    const line = fitLine(side);
    lines.push(line);
    if (line) inliers += side.filter((p) => Math.abs((p.x - line.px) * line.dy - (p.y - line.py) * line.dx) < diag * 0.01).length;
  }
  if (lines.every(Boolean)) {
    const corners = [0, 1, 2, 3].map((i) => intersect(lines[(i + 3) % 4]!, lines[i]!));
    if (corners.every(Boolean)) {
      const refined = corners as Point[];
      const sane = refined.every((p, i) => dist(p, quad[i]) < diag * 0.12);
      if (sane && isConvexQuad(refined as Quad)) quad = refined as Quad;
    }
  }

  const quadArea = polygonArea(quad);
  const areaRatio = quadArea / (w * h);
  const fill = Math.min(1, area / quadArea);
  const fit = Math.min(1, inliers / Math.max(1, boundary.length * 0.8));
  let confidence = 0.45 * fill + 0.4 * fit + 0.15 * (areaRatio > 0.12 ? 1 : areaRatio / 0.12);
  if (areaRatio > 0.985 || !isConvexQuad(quad)) confidence *= 0.4;
  const full = quad.map((p) => ({ x: p.x / scale, y: p.y / scale })) as Quad;
  const clamped = full.map((p) => ({ x: Math.min(img.width, Math.max(0, p.x)), y: Math.min(img.height, Math.max(0, p.y)) })) as Quad;
  return { quad: clamped, confidence: Math.max(0, Math.min(1, confidence)) };
}

/**
 * Two-stage detection: first the print against the table, then the picture inside the print's paper
 * border or frame (on the rectified print, so the second stage sees an axis-aligned problem).
 */
export function detectPhoto(img: RgbaImage): PhotoDetection {
  const outer = detectObject(img);
  if (!outer) return { photo: null, print: null };
  const size = rectifiedSize(outer.quad, img.width, img.height, 900);
  const rect = warpQuad(img, outer.quad, size.width, size.height);
  if (!rect) return { photo: outer, print: null };

  const inset = Math.round(Math.min(rect.width, rect.height) * 0.012);
  const trimmed = cropRgba(rect, inset);
  const edges = findBorderDepths(trimmed);
  const [t, r, b, l] = edges.depth;
  const innerW = trimmed.width - l - r, innerH = trimmed.height - t - b;
  if (!edges.found || innerW < trimmed.width * 0.4 || innerH < trimmed.height * 0.4) return { photo: outer, print: null };

  const unit: Point[] = [{ x: 0, y: 0 }, { x: size.width, y: 0 }, { x: size.width, y: size.height }, { x: 0, y: size.height }];
  const h = solveHomography(unit, outer.quad);
  if (!h) return { photo: outer, print: null };
  const corners = [
    { x: inset + l, y: inset + t }, { x: inset + trimmed.width - r, y: inset + t },
    { x: inset + trimmed.width - r, y: inset + trimmed.height - b }, { x: inset + l, y: inset + trimmed.height - b },
  ].map((p) => applyHomography(h, p)) as Quad;
  return { photo: { quad: corners, confidence: Math.min(outer.confidence, edges.confidence) }, print: outer };
}

/**
 * Looks for a paper border or frame inside the rectified print: for each side, the strongest straight
 * brightness step within the outer 18% that is consistent along the side. Sides without one stay at depth 0.
 */
function findBorderDepths(img: RgbaImage): { depth: [number, number, number, number]; found: boolean; confidence: number } {
  const { width: w, height: h, data } = img;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  const SEGMENTS = 6;
  const depths: number[] = [];
  let strength = 0, sides = 0;
  for (let side = 0; side < 4; side++) {
    const horizontal = side % 2 === 0; // top/bottom scan rows
    const length = horizontal ? w : h, span = horizontal ? h : w;
    const maxDepth = Math.floor(span * 0.18), win = Math.max(3, Math.round(span * 0.008));
    const found: number[] = [];
    let contrastSum = 0;
    for (let seg = 0; seg < SEGMENTS; seg++) {
      const from = Math.floor((length * seg) / SEGMENTS), to = Math.floor((length * (seg + 1)) / SEGMENTS);
      const profile = new Float32Array(maxDepth + win + 1);
      for (let dpt = 0; dpt < profile.length; dpt++) {
        const vals: number[] = [];
        for (let k = from; k < to; k += 2) {
          const x = horizontal ? k : side === 1 ? w - 1 - dpt : dpt;
          const y = horizontal ? (side === 0 ? dpt : h - 1 - dpt) : k;
          vals.push(gray[y * w + x]);
        }
        profile[dpt] = median(vals);
      }
      let bestDepth = -1, bestContrast = 0;
      for (let dpt = win; dpt <= maxDepth; dpt++) {
        let before = 0, after = 0;
        for (let k = 1; k <= win; k++) { before += profile[dpt - k]; after += profile[dpt + k - 1]; }
        const contrast = Math.abs(after - before) / win;
        if (contrast > 22 && dpt >= bestDepth) { bestDepth = dpt; bestContrast = contrast; }
      }
      if (bestDepth > 0) { found.push(bestDepth); contrastSum += bestContrast; }
    }
    if (found.length >= 4) {
      const m = median(found);
      const agree = found.filter((v) => Math.abs(v - m) <= span * 0.015);
      if (agree.length >= 4) {
        depths.push(Math.round(median(agree)));
        strength += contrastSum / found.length; sides++;
        continue;
      }
    }
    depths.push(0);
  }
  const confidence = sides ? Math.min(1, 0.55 + (strength / sides) / 120) : 0;
  return { depth: depths as [number, number, number, number], found: sides > 0, confidence };
}

function cropRgba(img: RgbaImage, inset: number): RgbaImage {
  const w = img.width - 2 * inset, h = img.height - 2 * inset;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y + inset) * img.width + inset) * 4;
    out.set(img.data.subarray(from, from + w * 4), y * w * 4);
  }
  return { data: out, width: w, height: h };
}
