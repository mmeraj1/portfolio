import { describe, expect, it } from 'vitest';
import { detectPhoto } from './detect';
import { applyHomography, estimateAspect, orderQuad, rectifiedSize, solveHomography, warpQuad } from './geometry';
import type { Point, Quad, RgbaImage } from './geometry';

function scene(w: number, h: number, quad: Quad, opts: { table: [number, number, number]; border?: { color: [number, number, number]; width: number }; photo: (u: number, v: number) => number }): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  const unit: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const inv = solveHomography(quad, unit)!;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = applyHomography(inv, { x, y });
    let c: number[] = [...opts.table];
    if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) {
      const bw = opts.border?.width ?? 0;
      if (opts.border && (p.x < bw || p.x > 1 - bw || p.y < bw || p.y > 1 - bw)) c = [...opts.border.color];
      else { const v = opts.photo((p.x - bw) / (1 - 2 * bw), (p.y - bw) / (1 - 2 * bw)); c = [v, v * 0.9, v * 0.75]; }
    }
    const i = (y * w + x) * 4;
    data[i] = c[0] + ((x * 7 + y * 13) % 5); data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
  return { data, width: w, height: h };
}

const texture = (u: number, v: number) => 70 + 90 * Math.abs(Math.sin(u * 9) * Math.cos(v * 7));
const maxCornerError = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

describe('geometry', () => {
  it('orders corners', () => {
    const q = orderQuad([{ x: 9, y: 9 }, { x: 0, y: 0 }, { x: 0, y: 9 }, { x: 9, y: 0 }]);
    expect(q[0]).toEqual({ x: 0, y: 0 });
    expect(q[2]).toEqual({ x: 9, y: 9 });
  });
  it('recovers the aspect ratio of a rectangle seen in perspective', () => {
    // 4:3 rectangle viewed with a mild perspective, focal length 576 px (the default assumption).
    const f = 576, cx = 320, cy = 240, W = 4, H = 3, tilt = 0.5;
    const pts = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(([x, y]) => {
      const yy = y * Math.cos(tilt), z = 10 + y * Math.sin(tilt);
      return { x: cx + (f * x) / z, y: cy + (f * yy) / z };
    }) as Quad;
    expect(estimateAspect(pts, 640, 480)).toBeCloseTo(4 / 3, 1);
  });
  it('warps a quad to a rectangle', () => {
    const src = scene(200, 150, [{ x: 20, y: 20 }, { x: 180, y: 20 }, { x: 180, y: 130 }, { x: 20, y: 130 }], { table: [10, 10, 10], photo: () => 200 });
    const out = warpQuad(src, [{ x: 20, y: 20 }, { x: 180, y: 20 }, { x: 180, y: 130 }, { x: 20, y: 130 }], 100, 60)!;
    expect(out.data[(30 * 100 + 50) * 4]).toBeGreaterThan(190);
    expect(rectifiedSize([{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 120 }, { x: 0, y: 120 }], 200, 150, 80).width).toBe(80);
  });
});

describe('detectPhoto', () => {
  it('extracts a tilted print from a table, excluding a light paper border', () => {
    const quad: Quad = [{ x: 90, y: 60 }, { x: 540, y: 90 }, { x: 520, y: 420 }, { x: 70, y: 380 }];
    const img = scene(640, 480, quad, { table: [120, 100, 80], border: { color: [235, 230, 215], width: 0.07 }, photo: texture });
    const { photo, print } = detectPhoto(img);
    expect(print && maxCornerError(print.quad, quad)).toBeLessThan(14);
    const bw = 0.07;
    const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const inner = [0, 1, 2, 3].map((i) => {
      const left = lerp(quad[0], quad[3], i === 0 || i === 1 ? bw : 1 - bw), right = lerp(quad[1], quad[2], i === 0 || i === 1 ? bw : 1 - bw);
      return lerp(left, right, i === 0 || i === 3 ? bw : 1 - bw);
    }) as Quad;
    expect(photo).not.toBeNull();
    expect(maxCornerError(photo!.quad, inner)).toBeLessThan(22);
  });
  it('excludes a dark frame', () => {
    const quad: Quad = [{ x: 60, y: 50 }, { x: 580, y: 50 }, { x: 580, y: 430 }, { x: 60, y: 430 }];
    const img = scene(640, 480, quad, { table: [200, 195, 190], border: { color: [25, 20, 20], width: 0.06 }, photo: texture });
    const { photo } = detectPhoto(img);
    expect(photo).not.toBeNull();
    const p = photo!.quad;
    expect(p[0].x).toBeGreaterThan(60 + 520 * 0.04);
    expect(p[0].y).toBeGreaterThan(50 + 380 * 0.04);
  });
});
