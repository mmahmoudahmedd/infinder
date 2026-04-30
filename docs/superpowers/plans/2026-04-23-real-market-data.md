# Real Market Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake demo analytics curves with real Alpha Vantage market data in the Analytics & Reports page.

**Architecture:** The backend fetches daily price series from Alpha Vantage (one symbol per investment category), normalizes them to a base-100 index, and caches the result in memory for 24 hours to stay within the free tier's 25 req/day limit. The frontend receives the same response shape as before — only the data inside changes.

**Tech Stack:** Node.js (ESM), Express, Alpha Vantage REST API (free tier), React + TypeScript, Recharts

---

## Files

| File | Change |
|---|---|
| `backend/.env` | Add `ALPHA_VANTAGE_KEY` |
| `backend/.env.example` | Add `ALPHA_VANTAGE_KEY` placeholder |
| `backend/routes/analytics.js` | Replace demo logic with real fetches + cache |
| `frontend/src/pages/ReportsPage.tsx` | Remove disclaimer, relabel chart labels |

---

## Task 1: Add Alpha Vantage API key to env files

**Files:**
- Modify: `backend/.env`
- Modify: `backend/.env.example`

- [ ] **Step 1: Get your free Alpha Vantage API key**

Go to https://www.alphavantage.co/support/#api-key, enter your email and get a free key instantly.

- [ ] **Step 2: Add key to `.env`**

Open `backend/.env` and add this line at the bottom:

```
ALPHA_VANTAGE_KEY=YOUR_KEY_HERE
```

Replace `YOUR_KEY_HERE` with the actual key you just got.

- [ ] **Step 3: Add placeholder to `.env.example`**

Open `backend/.env.example` and add this line at the bottom:

```
ALPHA_VANTAGE_KEY=your-alpha-vantage-api-key
```

- [ ] **Step 4: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add ALPHA_VANTAGE_KEY to env example"
```

(Do NOT commit `.env` — it contains your real key.)

---

## Task 2: Rewrite analytics.js to fetch real market data

**Files:**
- Modify: `backend/routes/analytics.js`

- [ ] **Step 1: Manually verify the Alpha Vantage endpoint works**

Run this in your terminal (replace `YOUR_KEY`):

```bash
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact&apikey=YOUR_KEY"
```

Expected: JSON with a `"Time Series (Daily)"` key containing date → OHLCV entries. If you see `"Note"` or `"Information"` instead, the key is wrong or rate-limited.

Also test gold:

```bash
curl "https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=XAU&to_symbol=USD&outputsize=compact&apikey=YOUR_KEY"
```

Expected: JSON with a `"Time Series FX (Daily)"` key.

- [ ] **Step 2: Replace the entire contents of `backend/routes/analytics.js`**

```js
import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const BUCKETS = ['stocks', 'baskets', 'bonds', 'gold'];

// Maps each investment category to a real benchmark symbol
const CATEGORY_SYMBOLS = {
  stocks: 'SPY',
  basket: 'QQQ',
  baskets: 'QQQ',
  bonds: 'TLT',
  gold: 'XAU/USD',
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const seriesCache = {};

async function fetchSeries(symbol) {
  const cached = seriesCache[symbol];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.series;
  }

  const key = process.env.ALPHA_VANTAGE_KEY;
  let url;
  let timeSeriesKey;

  if (symbol === 'XAU/USD') {
    url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=XAU&to_symbol=USD&outputsize=compact&apikey=${key}`;
    timeSeriesKey = 'Time Series FX (Daily)';
  } else {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${key}`;
    timeSeriesKey = 'Time Series (Daily)';
  }

  const response = await fetch(url);
  const json = await response.json();
  const rawSeries = json[timeSeriesKey];

  if (!rawSeries) {
    console.warn(`Alpha Vantage returned no series for ${symbol}:`, JSON.stringify(json).slice(0, 200));
    return seriesCache[symbol]?.series ?? [];
  }

  const dates = Object.keys(rawSeries).sort().slice(-30);
  const base = parseFloat(rawSeries[dates[0]]['4. close']);
  const series = dates.map((date) => ({
    date,
    index: Math.round((parseFloat(rawSeries[date]['4. close']) / base) * 10000) / 100,
  }));

  seriesCache[symbol] = { fetchedAt: Date.now(), series };
  return series;
}

router.get('/catalog', verifyToken, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('investments')
      .select('*')
      .eq('active', true)
      .order('min_investment');
    if (error) throw error;

    const uniqueSymbols = [
      ...new Set((rows || []).map((r) => CATEGORY_SYMBOLS[r.category]).filter(Boolean)),
    ];

    const seriesMap = {};
    await Promise.all(
      uniqueSymbols.map(async (sym) => {
        seriesMap[sym] = await fetchSeries(sym);
      }),
    );

    const list = (rows || []).map((row) => {
      const symbol = CATEGORY_SYMBOLS[row.category];
      const series = symbol ? (seriesMap[symbol] ?? []) : [];
      const first = series[0];
      const last = series[series.length - 1];
      const mtdPct =
        first && last ? Math.round(((last.index - first.index) / first.index) * 10000) / 100 : 0;
      const volatilityLabel =
        row.risk_level === 'high' ? 'High' : row.risk_level === 'low' ? 'Low' : 'Medium';

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        min_investment: Number(row.min_investment),
        expected_return_low: row.expected_return_low != null ? Number(row.expected_return_low) : 4,
        expected_return_high:
          row.expected_return_high != null ? Number(row.expected_return_high) : 8,
        risk_level: row.risk_level,
        is_halal: row.is_halal,
        mtd_pct: mtdPct,
        volatility_label: volatilityLabel,
        series_30d: series,
      };
    });

    return res.json({ catalog: list });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.get('/holdings', verifyToken, async (req, res) => {
  try {
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('id, name, allocation, created_at, is_sharia')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: invTx } = await supabase
      .from('transactions')
      .select('amount, meta, reference')
      .eq('user_id', req.user.id)
      .eq('type', 'investment');

    const txList = invTx || [];
    const findTx = (pid) =>
      txList.find((t) => t.reference === pid || t.reference === String(pid));

    const agg = { stocks: 0, baskets: 0, bonds: 0, gold: 0 };
    let totalInvested = 0;

    for (const p of portfolios || []) {
      const alloc = p.allocation || {};
      const tx = findTx(p.id);
      const amt = tx ? Number(tx.amount) : 0;
      totalInvested += amt;
      for (const k of BUCKETS) {
        const pct = Math.max(0, Math.min(100, Number(alloc[k]) || 0));
        agg[k] += (amt * pct) / 100;
      }
    }

    const breakdown = BUCKETS.map((k) => ({
      key: k,
      amount_egp: Math.round(agg[k] * 100) / 100,
      pct_of_invested:
        totalInvested > 0 ? Math.round((agg[k] / totalInvested) * 1000) / 10 : 0,
    }));

    return res.json({
      total_invested_egp: Math.round(totalInvested * 100) / 100,
      bucket_breakdown: breakdown,
      portfolios: portfolios || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load holdings' });
  }
});

export default router;
```

- [ ] **Step 3: Restart the backend and test the catalog endpoint**

```bash
# In backend directory
npm run dev
```

Then in a second terminal (replace TOKEN with a real JWT from your app):

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/analytics/catalog
```

Expected: JSON with `catalog` array where each item has a `series_30d` array of 30 real price index points (e.g. `[{ "date": "2026-03-24", "index": 100 }, ...]`). The first index value should be exactly `100` (that's the base).

If you see `series_30d: []` for all items, check the console — there will be a warning showing what Alpha Vantage returned (likely a rate limit message).

- [ ] **Step 4: Commit**

```bash
git add backend/routes/analytics.js
git commit -m "feat: replace demo analytics with real Alpha Vantage market data"
```

---

## Task 3: Update ReportsPage.tsx to remove demo labels

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Replace the entire contents of `frontend/src/pages/ReportsPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';

type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  mtd_pct: number;
  volatility_label: string;
  series_30d: { date: string; index: number }[];
};

type Holdings = {
  total_invested_egp: number;
  bucket_breakdown: { key: string; amount_egp: number; pct_of_invested: number }[];
};

const bucketLabel: Record<string, string> = {
  stocks: 'Stocks',
  baskets: 'Stock baskets',
  bonds: 'Bonds / fixed income',
  gold: 'Gold',
};

export default function ReportsPage() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/api/analytics/catalog'), api.get('/api/analytics/holdings')])
      .then(([c, h]) => {
        if (cancelled) return;
        setCatalog(c.data.catalog || []);
        setHoldings(h.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SubpageShell>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Analytics &amp; reports</h1>
        <p className="text-gray-600 text-sm mt-1">
          Live benchmark data — 30-day normalized price index per category.
        </p>

        {loading ? (
          <p className="mt-10 text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Your allocation (EGP)</h2>
              <p className="text-sm text-gray-600 mt-1">Based on recorded portfolio investments.</p>
              {holdings && holdings.total_invested_egp > 0 ? (
                <div className="mt-4 h-64 rounded-2xl border border-gray-200 bg-white p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={holdings.bucket_breakdown.map((b) => ({
                        name: bucketLabel[b.key] || b.key,
                        amount: b.amount_egp,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`EGP ${v.toFixed(2)}`, 'Amount']} />
                      <Bar dataKey="amount" fill="#76D74F" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 p-6">
                  No investments recorded yet. Fund your wallet and invest from the assistant or invest flow.
                </p>
              )}
            </section>

            <section className="mt-12 space-y-10">
              <h2 className="text-lg font-semibold">Product benchmarks (30-day price index)</h2>
              <p className="text-sm text-gray-600">
                Each line shows a normalized price index for that product's benchmark (SPY, QQQ, TLT, XAU/USD).
              </p>
              {catalog.map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2 items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{row.title}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{row.category}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="text-gray-500">MTD:</span>{' '}
                        <span className={`font-semibold ${row.mtd_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {row.mtd_pct >= 0 ? '+' : ''}{row.mtd_pct}%
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Volatility: {row.volatility_label}</p>
                    </div>
                  </div>
                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={row.series_30d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(l) => `Date: ${l}`}
                          formatter={(v: number) => [v.toFixed(2), 'Index']}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="index"
                          name="Price index"
                          stroke="#BEF35E"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </SubpageShell>
  );
}
```

- [ ] **Step 2: Start the frontend and verify the Reports page**

```bash
# In frontend directory
npm run dev
```

Open http://localhost:5173/reports. You should see:
- No amber disclaimer banner at the top
- Subtitle reads "Live benchmark data — 30-day normalized price index per category."
- Each product chart shows a real price curve (not a smooth sine wave)
- MTD % is shown in green (positive) or red (negative)
- Chart legend reads "Price index" not "Demo index"

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: remove demo labels from reports page, show real market data"
```
