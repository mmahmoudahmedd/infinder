import { useRef, useEffect } from 'react';

type Props = { isDark: boolean; className?: string };

const WAVES = [
  { amp: 18, freq: 0.012, speed: 0.022, alpha: 0.35 },
  { amp: 12, freq: 0.018, speed: 0.030, alpha: 0.20 },
  { amp: 8,  freq: 0.025, speed: 0.015, alpha: 0.12 },
];

export default function WaveCanvas({ isDark, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const rawCtx = ref.current.getContext('2d');
    if (!rawCtx) return;

    const cv: HTMLCanvasElement        = ref.current;
    const ctx: CanvasRenderingContext2D = rawCtx;

    const color = isDark
      ? { r: 182, g: 240, b: 64 }
      : { r: 90,  g: 138, b: 0 };

    const sync = () => {
      cv.width  = cv.offsetWidth;
      cv.height = cv.offsetHeight;
    };
    sync();

    const phases = WAVES.map(() => Math.random() * Math.PI * 2);
    let raf: number;

    function frame() {
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);

      WAVES.forEach((wave, wi) => {
        phases[wi] += wave.speed;
        const midY = H * 0.5;

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 2) {
          const y = midY + Math.sin(x * wave.freq + phases[wi]) * wave.amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${wave.alpha})`);
        grad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });

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
