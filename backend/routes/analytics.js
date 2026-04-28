import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const BUCKETS = ['stocks', 'baskets', 'bonds', 'gold'];

// Maps each investment category to a real benchmark symbol
const CATEGORY_SYMBOLS = {
  stocks: 'SPY',
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

  try {
    const response = await fetch(url);
    const json = await response.json();
    const rawSeries = json[timeSeriesKey];

    if (!rawSeries) {
      console.warn(`Alpha Vantage returned no series for ${symbol}:`, JSON.stringify(json).slice(0, 200));
      return seriesCache[symbol]?.series ?? [];
    }

    const dates = Object.keys(rawSeries).sort().slice(-30);
    const base = parseFloat(rawSeries[dates[0]]?.['4. close']);
    if (!base || isNaN(base)) {
      console.warn(`fetchSeries: invalid base price for ${symbol}`);
      return seriesCache[symbol]?.series ?? [];
    }
    const series = dates.map((date) => ({
      date,
      index: Math.round((parseFloat(rawSeries[date]['4. close']) / base) * 10000) / 100,
    }));

    seriesCache[symbol] = { fetchedAt: Date.now(), series };
    return series;
  } catch (err) {
    console.warn(`fetchSeries network error for ${symbol}:`, err.message);
    return seriesCache[symbol]?.series ?? [];
  }
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
