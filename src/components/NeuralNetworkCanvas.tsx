import { useEffect, useRef } from 'react';

interface Node { x: number; y: number; z: number; layer: number }
interface Edge { a: number; b: number; offset: number; speed: number }

const LAYERS = 5;

/**
 * Decorative 3D-inspired neural network drawn on a 2D canvas.
 * Nodes sit in layers in 3D space, rotate slowly and are perspective-projected;
 * pulses travel along the connections. The loop pauses while the canvas is off
 * screen or the tab is hidden, and one static frame is drawn for reduced motion.
 */
export default function NeuralNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const small = window.matchMedia('(max-width: 640px)');
    const lowPower = (navigator.hardwareConcurrency ?? 4) <= 2;

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let running = false;
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let last = 0;
    let phase = 0;

    const sprite = document.createElement('canvas');
    const SPRITE = 64;
    sprite.width = sprite.height = SPRITE;
    const sctx = sprite.getContext('2d');
    if (sctx) {
      const g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
      g.addColorStop(0, 'rgba(207, 250, 254, 1)');
      g.addColorStop(0.18, 'rgba(34, 211, 238, .75)');
      g.addColorStop(0.5, 'rgba(59, 130, 246, .18)');
      g.addColorStop(1, 'rgba(37, 99, 235, 0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
    }

    const build = () => {
      const perLayer = small.matches || lowPower ? 6 : 9;
      let seed = 7;
      const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      nodes = [];
      for (let l = 0; l < LAYERS; l += 1) {
        const count = l === 0 || l === LAYERS - 1 ? perLayer - 3 : perLayer;
        for (let i = 0; i < count; i += 1) {
          nodes.push({
            x: (l / (LAYERS - 1) - 0.5) * 2.1 + (rand() - 0.5) * 0.16,
            y: ((i + 0.5) / count - 0.5) * 1.7 + (rand() - 0.5) * 0.22,
            z: (rand() - 0.5) * 1.4,
            layer: l,
          });
        }
      }
      edges = [];
      nodes.forEach((from, a) => {
        nodes.forEach((to, b) => {
          if (to.layer !== from.layer + 1) return;
          const d = Math.hypot(from.y - to.y, from.z - to.z);
          if (d < 0.95) edges.push({ a, b, offset: rand(), speed: 0.12 + rand() * 0.14 });
        });
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      draw(0);
    };

    const project = (n: Node, cos: number, sin: number) => {
      const x = n.x * cos - n.z * sin;
      const z = n.x * sin + n.z * cos;
      const persp = 2.6 / (2.6 + z);
      const scale = Math.min(width / 2.9, height / 2.3);
      return { px: width / 2 + x * persp * scale, py: height / 2 + n.y * persp * scale, depth: persp, z };
    };

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      if (width === 0) return;
      // Oscillate rather than spin so the network always faces the viewer.
      const angle = 0.35 + Math.sin(phase) * 0.45;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const pts = nodes.map((n) => project(n, cos, sin));

      ctx!.lineWidth = 1;
      for (const e of edges) {
        const p = pts[e.a];
        const q = pts[e.b];
        const alpha = 0.07 + 0.2 * ((p.depth + q.depth) / 2 - 0.7);
        ctx!.strokeStyle = `rgba(96, 165, 250, ${Math.max(alpha, 0.04).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.moveTo(p.px, p.py);
        ctx!.lineTo(q.px, q.py);
        ctx!.stroke();
      }

      // Pulses with short trails travelling along the connections.
      for (const e of edges) {
        const p = pts[e.a];
        const q = pts[e.b];
        const base = (time * e.speed * 0.001 + e.offset) % 1;
        for (let t = 0; t < 4; t += 1) {
          const f = base - t * 0.035;
          if (f < 0) continue;
          const x = p.px + (q.px - p.px) * f;
          const y = p.py + (q.py - p.py) * f;
          const r = (4.5 - t) * ((p.depth + q.depth) / 2);
          ctx!.globalAlpha = (0.85 - t * 0.2) * Math.sin(f * Math.PI);
          ctx!.drawImage(sprite, x - r * 2, y - r * 2, r * 4, r * 4);
        }
      }
      ctx!.globalAlpha = 1;

      const order = pts.map((_, i) => i).sort((i, j) => pts[j].z - pts[i].z);
      for (const i of order) {
        const pt = pts[i];
        const pulse = 0.85 + 0.15 * Math.sin(time * 0.0014 + i);
        const r = (5 + pt.depth * 6) * pulse;
        ctx!.globalAlpha = Math.min(1, 0.45 + pt.depth * 0.5);
        ctx!.drawImage(sprite, pt.px - r * 2.2, pt.py - r * 2.2, r * 4.4, r * 4.4);
      }
      ctx!.globalAlpha = 1;
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      phase += dt * 0.0004;
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced.matches || !visible || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    });
    const resizeObserver = new ResizeObserver(() => { stop(); resize(); start(); });
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onMotion = () => { if (reduced.matches) { stop(); draw(0); } else start(); };

    observer.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotion);
    resize();
    start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotion);
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />;
}
