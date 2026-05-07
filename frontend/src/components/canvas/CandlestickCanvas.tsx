import { useRef, useEffect } from 'react';

type Props = { isDark: boolean; className?: string };

const CANDLE_W   = 10;
const CANDLE_GAP = 5;
const SCROLL_SPD = 0.4;

type Candle = { open: number; close: number; high: number; low: number };

function randomCandle(prev: number): Candle {
  const move  = (Math.random() - 0.48) * 12;
  const open  = prev;
  const close = Math.max(10, Math.min(90, open + move));
  const wick  = Math.random() * 6;
  return {
    open,
    close,
    high: Math.max(open, close) + wick,
    low:  Math.min(open, close) - wick,
  };
}

function mapY(v: number, H: number) {
  const pad = H * 0.12;
  return H - pad - (v / 100) * (H - pad * 2);
}

export default function CandlestickCanvas({ isDark, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const rawCtx = ref.current.getContext('2d');
    if (!rawCtx) return;

    const cv: HTMLCanvasElement        = ref.current;
    const ctx: CanvasRenderingContext2D = rawCtx;

    const colors = isDark
      ? { up: '#b6f040', down: '#ff4d4d' }
      : { up: '#3a7a00', down: '#cc2200' };

    const sync = () => {
      cv.width  = cv.offsetWidth;
      cv.height = cv.offsetHeight;
    };
    sync();

    const stride  = CANDLE_W + CANDLE_GAP;
    const needed  = Math.ceil(cv.width / stride) + 4;
    const candles: Candle[] = [];
    let mid = 50;
    for (let i = 0; i < needed; i++) {
      const c = randomCandle(mid);
      candles.push(c);
      mid = c.close;
    }

    let offset = 0;
    let raf: number;

    function frame() {
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);

      offset += SCROLL_SPD;
      if (offset >= stride) {
        offset -= stride;
        candles.shift();
        candles.push(randomCandle(candles[candles.length - 1].close));
      }

      const totalCandles = Math.ceil(W / stride) + 2;
      const startIdx     = Math.max(0, candles.length - totalCandles);

      for (let i = startIdx; i < candles.length; i++) {
        const cd = candles[i];
        const xi = (i - startIdx) * stride - offset;
        const col = cd.close >= cd.open ? colors.up : colors.down;

        const yHigh = mapY(cd.high,  H);
        const yLow  = mapY(cd.low,   H);
        const bodyT = Math.min(mapY(cd.open, H), mapY(cd.close, H));
        const bodyH = Math.max(1, Math.abs(mapY(cd.close, H) - mapY(cd.open, H)));

        ctx.beginPath();
        ctx.moveTo(xi + CANDLE_W / 2, yHigh);
        ctx.lineTo(xi + CANDLE_W / 2, yLow);
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.stroke();

        ctx.fillStyle = col;
        ctx.fillRect(xi, bodyT, CANDLE_W, bodyH);
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
