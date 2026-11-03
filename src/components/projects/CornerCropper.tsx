import { useEffect, useMemo, useRef } from 'react';
import { rectifiedSize, warpQuad } from '../../lib/enhance/geometry';
import type { Point, Quad } from '../../lib/enhance/geometry';

interface Props {
  base: HTMLCanvasElement;
  quad: Quad;
  disabled?: boolean;
  onChange: (quad: Quad) => void;
}

const LABELS = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left'];
const PREVIEW_SIDE = 340;

/** Source image with four draggable corner handles and a live rectified preview. */
export default function CornerCropper({ base, quad, disabled, onChange }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const url = useMemo(() => base.toDataURL('image/jpeg', 0.85), [base]);
  const proxy = useMemo(() => {
    const scale = Math.min(1, 900 / Math.max(base.width, base.height));
    const c = document.createElement('canvas');
    c.width = Math.round(base.width * scale); c.height = Math.round(base.height * scale);
    c.getContext('2d')!.drawImage(base, 0, 0, c.width, c.height);
    return { canvas: c, scale, data: c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height) };
  }, [base]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = preview.current;
      if (!canvas) return;
      const q = quad.map((p) => ({ x: p.x * proxy.scale, y: p.y * proxy.scale })) as Quad;
      const size = rectifiedSize(q, proxy.canvas.width, proxy.canvas.height, PREVIEW_SIDE);
      const out = warpQuad(proxy.data, q, size.width, size.height);
      canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext('2d')!;
      if (out) ctx.putImageData(new ImageData(new Uint8ClampedArray(out.data), out.width, out.height), 0, 0);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    return () => cancelAnimationFrame(frame);
  }, [quad, proxy]);

  const toImage = (clientX: number, clientY: number): Point => {
    const box = stage.current!.getBoundingClientRect();
    return {
      x: Math.min(base.width, Math.max(0, ((clientX - box.left) / box.width) * base.width)),
      y: Math.min(base.height, Math.max(0, ((clientY - box.top) / box.height) * base.height)),
    };
  };
  const move = (index: number, p: Point) => onChange(quad.map((q, i) => (i === index ? p : q)) as Quad);

  const pct = (p: Point) => ({ left: `${(p.x / base.width) * 100}%`, top: `${(p.y / base.height) * 100}%` });
  const points = quad.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="pj-cropper">
      <div className="pj-cropper-stage" ref={stage} style={{ aspectRatio: `${base.width} / ${base.height}` }}>
        <img src={url} alt="Uploaded photograph with the detected photo outline" draggable={false} />
        <svg viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none" aria-hidden="true">
          <polygon points={points} vectorEffect="non-scaling-stroke" />
        </svg>
        {quad.map((p, i) => (
          <button
            key={i} type="button" className="pj-handle" style={pct(p)} disabled={disabled}
            aria-label={`${LABELS[i]} corner. Drag, or use the arrow keys, to adjust.`}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(i, toImage(e.clientX, e.clientY)); }}
            onKeyDown={(e) => {
              const step = Math.max(base.width, base.height) / 400 * (e.shiftKey ? 5 : 1);
              const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              if (d[e.key]) { e.preventDefault(); move(i, { x: Math.min(base.width, Math.max(0, p.x + d[e.key][0])), y: Math.min(base.height, Math.max(0, p.y + d[e.key][1])) }); }
            }}
          />
        ))}
      </div>
      <div className="pj-cropper-preview">
        <span>Live crop preview</span>
        <canvas ref={preview} aria-label="Rectified crop preview" />
      </div>
    </div>
  );
}
