import { describe, expect, it } from 'vitest';
import { clampRect, detectPhotoBounds } from './crop';
import { TILE_SIZE, blendWeights, fitWithin, reflect101, tileCount, tileStarts } from './tiling';

function scene(width: number, height: number, box: { x: number; y: number; w: number; h: number } | null) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      const noise = (x * 7 + y * 13) % 11;
      const v = inside ? 200 + (((x >> 3) + (y >> 3)) % 2) * 40 : 40 + noise;
      data[i] = v; data[i + 1] = inside ? v - 30 : 30 + noise; data[i + 2] = inside ? v - 60 : 20; data[i + 3] = 255;
    }
  }
  return data;
}

describe('tiling', () => {
  it('covers the whole length with a final aligned tile', () => {
    for (const n of [256, 300, 1000, 1600]) {
      const starts = tileStarts(n);
      expect(starts[0]).toBe(0);
      expect(starts[starts.length - 1]).toBe(n - TILE_SIZE);
    }
    expect(tileStarts(100)).toEqual([0]);
  });
  it('counts tiles and fits images', () => {
    expect(tileCount(1600, 1200)).toBe(tileStarts(1600).length * tileStarts(1200).length);
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(500, 400, 1000)).toEqual({ width: 500, height: 400 });
  });
  it('reflects indices like BORDER_REFLECT_101', () => {
    expect([reflect101(-1, 5), reflect101(5, 5), reflect101(6, 5), reflect101(2, 5)]).toEqual([1, 3, 2, 2]);
  });
  it('has positive blend weights', () => {
    const w = blendWeights();
    expect(Math.min(...w)).toBeGreaterThan(0);
  });
});

describe('detectPhotoBounds', () => {
  it('finds a bright print on a dark background', () => {
    const found = detectPhotoBounds(scene(800, 600, { x: 120, y: 60, w: 560, h: 450 }), 800, 600);
    expect(found).not.toBeNull();
    const r = found!.rect;
    expect(Math.abs(r.x - 120)).toBeLessThan(20);
    expect(Math.abs(r.y - 60)).toBeLessThan(20);
    expect(Math.abs(r.width - 560)).toBeLessThan(30);
    expect(Math.abs(r.height - 450)).toBeLessThan(30);
  });
  it('returns null when the picture has no border', () => {
    expect(detectPhotoBounds(scene(400, 300, { x: 0, y: 0, w: 400, h: 300 }), 400, 300)).toBeNull();
    expect(detectPhotoBounds(scene(400, 300, null), 400, 300)).toBeNull();
  });
  it('clamps rectangles into the image', () => {
    expect(clampRect({ x: -5, y: 10, width: 900, height: 900 }, 100, 80)).toEqual({ x: 0, y: 10, width: 100, height: 70 });
  });
});
