// sRGB (D65) <-> CIE Lab, matching OpenCV's float conversions (L in 0..100).
const WX = 0.950456, WZ = 1.088754;
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const finv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = lin(r / 255), G = lin(g / 255), B = lin(b / 255);
  const x = (0.412453 * R + 0.35758 * G + 0.180423 * B) / WX;
  const y = 0.212671 * R + 0.71516 * G + 0.072169 * B;
  const z = (0.019334 * R + 0.119193 * G + 0.950227 * B) / WZ;
  const fy = f(y);
  return [116 * fy - 16, 500 * (f(x) - fy), 200 * (fy - f(z))];
}

export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = finv(fx) * WX, y = finv(fy), z = finv(fz) * WZ;
  const R = 3.240479 * x - 1.53715 * y - 0.498535 * z;
  const G = -0.969256 * x + 1.875991 * y + 0.041556 * z;
  const B = 0.055648 * x - 0.204043 * y + 1.057311 * z;
  const c = (v: number) => Math.max(0, Math.min(255, gam(Math.max(0, Math.min(1, v))) * 255));
  return [c(R), c(G), c(B)];
}
