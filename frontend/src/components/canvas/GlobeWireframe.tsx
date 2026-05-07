import { useRef, useEffect } from 'react';

type Props = { isDark: boolean; className?: string };

const LAT_LINES = 9;
const LON_LINES = 12;
const STEPS     = 80;
const ROT_SPEED = 0.004;

export default function GlobeWireframe({ isDark, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const rawCtx = ref.current.getContext('2d');
    if (!rawCtx) return;

    const cv: HTMLCanvasElement        = ref.current;
    const ctx: CanvasRenderingContext2D = rawCtx;

    const color = isDark
      ? { r: 182, g: 240, b: 64, a: 0.30 }
      : { r: 90,  g: 138, b: 0,  a: 0.25 };

    const sync = () => {
      cv.width  = cv.offsetWidth;
      cv.height = cv.offsetHeight;
    };
    sync();

    let rot = 0;
    let raf: number;

    function frame() {
      const W  = cv.width;
      const H  = cv.height;
      const cx = W / 2;
      const cy = H / 2;
      const R  = Math.min(W, H) * 0.42;

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.7;
      rot += ROT_SPEED;

      // Latitude circles
      for (let li = 1; li < LAT_LINES; li++) {
        const phi = -Math.PI / 2 + (li / LAT_LINES) * Math.PI;
        ctx.beginPath();
        for (let s = 0; s <= STEPS; s++) {
          const theta = (s / STEPS) * Math.PI * 2;
          const x = R * Math.cos(phi) * Math.sin(theta + rot);
          const y = R * Math.sin(phi);
          const z = R * Math.cos(phi) * Math.cos(theta + rot);
          const alpha = color.a * (0.4 + 0.6 * ((z / R + 1) / 2));
          ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`;
          if (s === 0) ctx.moveTo(cx + x, cy - y);
          else         ctx.lineTo(cx + x, cy - y);
        }
        ctx.stroke();
      }

      // Longitude arcs
      for (let li = 0; li < LON_LINES; li++) {
        const theta = (li / LON_LINES) * Math.PI * 2 + rot;
        ctx.beginPath();
        for (let s = 0; s <= STEPS; s++) {
          const phi = -Math.PI / 2 + (s / STEPS) * Math.PI;
          const x = R * Math.cos(phi) * Math.sin(theta);
          const y = R * Math.sin(phi);
          const z = R * Math.cos(phi) * Math.cos(theta);
          const alpha = color.a * (0.4 + 0.6 * ((z / R + 1) / 2));
          ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`;
          if (s === 0) ctx.moveTo(cx + x, cy - y);
          else         ctx.lineTo(cx + x, cy - y);
        }
        ctx.stroke();
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
