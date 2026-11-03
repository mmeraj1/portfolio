export interface Point { x: number; y: number }
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

export interface RgbaImage { data: Uint8ClampedArray; width: number; height: number }

export function orderQuad(points: Point[]): Quad {
  const sum = (p: Point) => p.x + p.y;
  const diff = (p: Point) => p.x - p.y;
  const tl = points.reduce((a, b) => (sum(b) < sum(a) ? b : a));
  const br = points.reduce((a, b) => (sum(b) > sum(a) ? b : a));
  const tr = points.reduce((a, b) => (diff(b) > diff(a) ? b : a));
  const bl = points.reduce((a, b) => (diff(b) < diff(a) ? b : a));
  return [tl, tr, br, bl];
}

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

export function isConvexQuad(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}

/** Solves the 3x3 homography (h33 = 1) mapping each src[i] to dst[i]. Returns null if degenerate. */
export function solveHomography(src: Point[], dst: Point[]): number[] | null {
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c < 9; c++) a[r][c] -= f * a[col][c];
    }
  }
  return [...Array.from({ length: 8 }, (_, i) => a[i][8] / a[i][i]), 1];
}

export function applyHomography(h: number[], p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/**
 * Estimates the true width/height ratio of a rectangle seen in perspective (Zhang & He, "Whiteboard
 * scanning and image enhancement"), assuming the optical centre is the image centre. Uses an assumed focal
 * length when it cannot be recovered, and falls back to the mean side lengths if the estimate is implausible.
 */
export function estimateAspect(q: Quad, imageWidth: number, imageHeight: number): number {
  const naive = (dist(q[0], q[1]) + dist(q[3], q[2])) / (dist(q[0], q[3]) + dist(q[1], q[2]));
  const u0 = imageWidth / 2, v0 = imageHeight / 2;
  const m1 = [q[0].x - u0, q[0].y - v0, 1], m2 = [q[1].x - u0, q[1].y - v0, 1];
  const m3 = [q[3].x - u0, q[3].y - v0, 1], m4 = [q[2].x - u0, q[2].y - v0, 1];
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
  const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]);
  const n3 = m3.map((v, i) => k3 * v - m1[i]);
  if (!Number.isFinite(k2) || !Number.isFinite(k3)) return naive;
  const denom = n2[2] * n3[2];
  let f2 = Math.abs(denom) < 1e-6 ? NaN : -((n2[0] * n3[0]) + (n2[1] * n3[1])) / denom;
  // One-axis tilt makes the focal length unrecoverable; assume a typical phone camera instead.
  if (!(f2 > 0) || !Number.isFinite(f2)) f2 = (0.9 * Math.max(imageWidth, imageHeight)) ** 2;
  const num = n2[0] ** 2 + n2[1] ** 2 + f2 * n2[2] ** 2;
  const den = n3[0] ** 2 + n3[1] ** 2 + f2 * n3[2] ** 2;
  const ratio = Math.sqrt(num / den);
  return Number.isFinite(ratio) && ratio > naive * 0.7 && ratio < naive * 1.43 ? ratio : naive;
}

/** Output size of the rectified photograph, preserving the estimated aspect ratio. */
export function rectifiedSize(q: Quad, imageWidth: number, imageHeight: number, maxSide: number): { width: number; height: number; aspect: number } {
  const aspect = estimateAspect(q, imageWidth, imageHeight);
  const width = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
  const height = width / aspect;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), aspect };
}

/** Warps the quad region of the source into a width x height rectangle (bilinear sampling). */
export function warpQuad(src: RgbaImage, q: Quad, width: number, height: number): RgbaImage | null {
  const unit: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const h = solveHomography(unit, q);
  if (!h) return null;
  const out = new Uint8ClampedArray(width * height * 4);
  const sw = src.width, sh = src.height, s = src.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w = h[6] * px + h[7] * py + 1;
      const sx = (h[0] * px + h[1] * py + h[2]) / w - 0.5;
      const sy = (h[3] * px + h[4] * py + h[5]) / w - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const fx = sx - x0, fy = sy - y0;
      const xa = Math.min(sw - 1, Math.max(0, x0)), xb = Math.min(sw - 1, Math.max(0, x0 + 1));
      const ya = Math.min(sh - 1, Math.max(0, y0)), yb = Math.min(sh - 1, Math.max(0, y0 + 1));
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = s[(ya * sw + xa) * 4 + c] * (1 - fx) + s[(ya * sw + xb) * 4 + c] * fx;
        const bottom = s[(yb * sw + xa) * 4 + c] * (1 - fx) + s[(yb * sw + xb) * 4 + c] * fx;
        out[o + c] = top * (1 - fy) + bottom * fy;
      }
      out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
}
