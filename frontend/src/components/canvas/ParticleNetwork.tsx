import { useRef, useEffect } from 'react';

type Props = { isDark: boolean; className?: string };

const COUNT  = 62;
const RADIUS = 120;
const SPEED  = 0.35;

export default function ParticleNetwork({ isDark, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const rawCtx = ref.current.getContext('2d');
    if (!rawCtx) return;

    const cv: HTMLCanvasElement       = ref.current;
    const ctx: CanvasRenderingContext2D = rawCtx;

    const colors = isDark
      ? { dot: '#b6f040', r: 182, g: 240, b: 64 }
      : { dot: '#5a8a00', r: 90,  g: 138, b: 0 };

    const sync = () => {
      cv.width  = cv.offsetWidth;
      cv.height = cv.offsetHeight;
    };
    sync();

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    const pts: P[] = Array.from({ length: COUNT }, () => ({
      x:  Math.random() * cv.width,
      y:  Math.random() * cv.height,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r:  Math.random() * 1.2 + 1,
    }));

    let raf: number;

    function frame() {
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.dot;
        ctx.fill();
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx   = pts[i].x - pts[j].x;
          const dy   = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS) {
            const a = (1 - dist / RADIUS) * (isDark ? 0.5 : 0.4);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${colors.r},${colors.g},${colors.b},${a.toFixed(3)})`;
            ctx.lineWidth   = 0.6;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(sync);
    ro.observe(cv);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isDark]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
