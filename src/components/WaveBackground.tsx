import { useEffect, useRef } from 'react';

interface Point { u: number; v: number; s: number }

/**
 * Decorative particle-wave animation drawn on a 2D canvas.
 * Particle count adapts to screen size and CPU cores; the loop pauses while the
 * tab or hero is off screen, and a single static frame is drawn when the user
 * prefers reduced motion.
 */
export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cores = navigator.hardwareConcurrency ?? 4;
    const lowPower = cores <= 2;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let points: Point[] = [];
    let raf = 0;
    let visible = true;
    let running = false;
    let prevX = 0;
    let prevY = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const budget = lowPower ? 420 : width < 640 ? 520 : 1100;
      const rows = width < 640 ? 14 : 22;
      const cols = Math.round(budget / rows);
      points = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          points.push({ u: c / (cols - 1), v: r / (rows - 1), s: 0.6 + ((r * 31 + c * 17) % 10) / 12 });
        }
      }
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = time / 1000;
      const horizon = height * 0.34;
      const depthSpan = height * 0.66;

      for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        // v = 0 is the far row, v = 1 the near row; nearer rows are larger and brighter.
        const depth = p.v;
        const perspective = 0.35 + depth * 0.65;
        const x = width * 0.5 + (p.u - 0.5) * width * (0.9 + depth * 0.5);
        const wave =
          Math.sin(p.u * 7 + t * 0.55 + depth * 3.2) * 34 +
          Math.sin(p.u * 3.1 - t * 0.35 + depth * 5) * 22;
        const y = horizon + depth * depthSpan + wave * perspective;
        const mix = (Math.sin(p.u * 4 + t * 0.25) + 1) / 2;
        const alpha = (0.12 + depth * 0.55) * (0.6 + 0.4 * mix);
        const radius = (0.5 + depth * 1.5) * p.s;
        // Blend from electric blue to cyan across the wave.
        const g = Math.round(130 + 81 * mix);
        const b = Math.round(246 - 8 * mix);
        ctx.fillStyle = `rgba(${Math.round(59 - 25 * mix)}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Faint curve joining neighbouring particles along each row.
        if (p.u > 0) {
          ctx.strokeStyle = `rgba(59, 130, 246, ${(alpha * 0.28).toFixed(3)})`;
          ctx.lineWidth = 0.6 + depth * 0.6;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        prevX = x;
        prevY = y;
      }
    };

    const loop = (time: number) => {
      draw(time);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced.matches || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const refresh = () => {
      stop();
      build();
      if (reduced.matches) draw(2000);
      else start();
    };

    refresh();

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    observer.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', refresh);
    const resize = new ResizeObserver(refresh);
    resize.observe(canvas);

    return () => {
      stop();
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', refresh);
    };
  }, []);

  return <canvas ref={canvasRef} className="wave-canvas" aria-hidden="true" />;
}
