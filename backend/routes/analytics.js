import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const BUCKETS = ['stocks', 'baskets', 'bonds', 'gold'];

const CATEGORY_SYMBOLS = {
  stocks: 'SPY',
  baskets: 'QQQ',
  bonds: 'TLT',
  gold: 'XAU/USD',
};

// Shown when no DB row exists for a category
const BENCHMARK_DEFAULTS = {
  stocks: { title: 'Global Equities (SPY)', volatility_label: 'Medium', risk_level: 'medium', mtd_seed: 1.4 },
  baskets: { title: 'Tech Basket (QQQ)',    volatility_label: 'High',   risk_level: 'high',   mtd_seed: 2.1 },
  bonds:   { title: 'Fixed Income (TLT)',   volatility_label: 'Low',    risk_level: 'low',    mtd_seed: -0.4 },
  gold:    { title: 'Gold (XAU/USD)',        volatility_label: 'Medium', risk_level: 'medium', mtd_seed: 0.9 },
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const seriesCache = {};

// Deterministic seeded random — keeps fallback series stable across requests
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateFallbackSeries(symbol) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const today = new Date();
  const series = [];
  let index = 100;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    // Small daily drift ±1.5 %
    index += (rand() - 0.48) * 1.5;
    series.push({ date: `${yyyy}-${mm}-${dd}`, index: Math.round(index * 100) / 100 });
  }
  return series;
}

async function fetchSeries(symbol) {
  const cached = seriesCache[symbol];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.series;
  }

  const key = process.env.ALPHA_VANTAGE_KEY;
  let url, timeSeriesKey;

  if (symbol === 'XAU/USD') {
    url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=XAU&to_symbol=USD&outputsize=compact&apikey=${key}`;
    timeSeriesKey = 'Time Series FX (Daily)';
  } else {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${key}`;
    timeSeriesKey = 'Time Series (Daily)';
  }

  try {
    const response = await fetch(url);
    const json = await response.json();
    const rawSeries = json[timeSeriesKey];

    if (!rawSeries) {
      console.warn(`Alpha Vantage: no series for ${symbol} (rate-limited or invalid key) — using fallback`);
      const fallback = generateFallbackSeries(symbol);
      seriesCache[symbol] = { fetchedAt: Date.now(), series: fallback };
      return fallback;
    }

    const dates = Object.keys(rawSeries).sort().slice(-30);
    const base  = parseFloat(rawSeries[dates[0]]?.['4. close']);
    if (!base || isNaN(base)) {
      console.warn(`fetchSeries: invalid base price for ${symbol} — using fallback`);
      const fallback = generateFallbackSeries(symbol);
      seriesCache[symbol] = { fetchedAt: Date.now(), series: fallback };
      return fallback;
    }

    const series = dates.map((date) => ({
      date,
      index: Math.round((parseFloat(rawSeries[date]['4. close']) / base) * 10000) / 100,
    }));

    seriesCache[symbol] = { fetchedAt: Date.now(), series };
    return series;
  } catch (err) {
    console.warn(`fetchSeries error for ${symbol}: ${err.message} — using fallback`);
    const fallback = generateFallbackSeries(symbol);
    seriesCache[symbol] = { fetchedAt: Date.now(), series: fallback };
    return fallback;
  }
}

router.get('/catalog', verifyToken, async (req, res) => {
  try {
    // Pull any active investments from DB to enrich category metadata
    const { data: rows } = await supabase
      .from('investments')
      .select('*')
      .eq('active', true);

    const dbByCategory = {};
    for (const row of rows || []) {
      if (!dbByCategory[row.category]) dbByCategory[row.category] = row;
    }

    // Fetch all 4 benchmark series in parallel
    const seriesMap = {};
    await Promise.all(
      BUCKETS.map(async (cat) => {
        const sym = CATEGORY_SYMBOLS[cat];
        seriesMap[cat] = await fetchSeries(sym);
      }),
    );

    // Always return one card per category
    const catalog = BUCKETS.map((cat) => {
      const dbRow  = dbByCategory[cat];
      const def    = BENCHMARK_DEFAULTS[cat];
      const series = seriesMap[cat] ?? [];
      const first  = series[0];
      const last   = series[series.length - 1];
      const mtdPct =
        first && last && first.index
          ? Math.round(((last.index - first.index) / first.index) * 10000) / 100
          : def.mtd_seed;

      return {
        id:                   dbRow?.id ?? cat,
        slug:                 dbRow?.slug ?? cat,
        title:                dbRow?.title ?? def.title,
        category:             cat,
        min_investment:       dbRow ? Number(dbRow.min_investment) : 0,
        expected_return_low:  dbRow?.expected_return_low  != null ? Number(dbRow.expected_return_low)  : 4,
        expected_return_high: dbRow?.expected_return_high != null ? Number(dbRow.expected_return_high) : 8,
        risk_level:           dbRow?.risk_level ?? def.risk_level,
        is_halal:             dbRow?.is_halal   ?? false,
        mtd_pct:              mtdPct,
        volatility_label:     dbRow
          ? (dbRow.risk_level === 'high' ? 'High' : dbRow.risk_level === 'low' ? 'Low' : 'Medium')
          : def.volatility_label,
        series_30d: series,
      };
    });

    return res.json({ catalog });
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

    // Aggregate invested amounts per bucket
    const agg = { stocks: 0, baskets: 0, bonds: 0, gold: 0 };
    let totalInvested = 0;
    for (const p of portfolios || []) {
      const alloc = p.allocation || {};
      const tx    = findTx(p.id);
      const amt   = tx ? Number(tx.amount) : 0;
      totalInvested += amt;
      for (const k of BUCKETS) {
        const pct = Math.max(0, Math.min(100, Number(alloc[k]) || 0));
        agg[k] += (amt * pct) / 100;
      }
    }

    // Fetch price series for performance calculation (uses existing cache)
    const seriesMap = {};
    await Promise.all(
      BUCKETS.map(async (cat) => {
        seriesMap[cat] = await fetchSeries(CATEGORY_SYMBOLS[cat]);
      })
    );

    // Calculate current value per bucket using benchmark price movement
    const perfAgg = {};
    for (const k of BUCKETS) perfAgg[k] = { invested: 0, currentValue: 0 };

    for (const p of portfolios || []) {
      const tx  = findTx(p.id);
      const amt = tx ? Number(tx.amount) : 0;
      if (!amt) continue;

      const investDate = p.created_at.slice(0, 10); // YYYY-MM-DD

      for (const k of BUCKETS) {
        const pct = Math.max(0, Math.min(100, Number((p.allocation || {})[k]) || 0));
        const bucketAmt = (amt * pct) / 100;
        if (!bucketAmt) continue;

        const series = seriesMap[k] || [];
        const currentPoint = series[series.length - 1];
        // Find the series point on or after the invest date
        const investPoint = series.find((s) => s.date >= investDate) || series[0];

        let currentVal = bucketAmt;
        if (investPoint && currentPoint && investPoint.index) {
          currentVal = bucketAmt * (currentPoint.index / investPoint.index);
        }

        perfAgg[k].invested     += bucketAmt;
        perfAgg[k].currentValue += currentVal;
      }
    }

    let totalCurrentValue = 0;
    const breakdown = BUCKETS.map((k) => {
      const inv = perfAgg[k].invested;
      const cur = perfAgg[k].currentValue;
      totalCurrentValue += cur;
      const returnPct = inv > 0 ? Math.round(((cur - inv) / inv) * 10000) / 100 : 0;
      return {
        key:               k,
        amount_egp:        Math.round(agg[k] * 100) / 100,
        pct_of_invested:   totalInvested > 0 ? Math.round((agg[k] / totalInvested) * 1000) / 10 : 0,
        invested_egp:      Math.round(inv * 100) / 100,
        current_value_egp: Math.round(cur * 100) / 100,
        return_pct:        returnPct,
      };
    });

    const totalReturnPct =
      totalInvested > 0
        ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 10000) / 100
        : 0;

    return res.json({
      total_invested_egp:      Math.round(totalInvested * 100) / 100,
      total_current_value_egp: Math.round(totalCurrentValue * 100) / 100,
      total_return_pct:        totalReturnPct,
      bucket_breakdown:        breakdown,
      portfolios:              portfolios || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load holdings' });
  }
});

export default router;
