import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const BUCKETS = ['stocks', 'baskets', 'bonds', 'gold'];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic demo performance curve (not real market data). */
function demoSeriesForSlug(slug, days = 30, baseLow = 4, baseHigh = 6) {
  const seed = hashSeed(slug);
  const mid = (baseLow + baseHigh) / 2;
  const vol = 0.15 + (seed % 100) / 500;
  const out = [];
  let v = 100;
  const d0 = new Date();
  d0.setUTCDate(d0.getUTCDate() - days);
  for (let i = 0; i <= days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + i);
    const noise = Math.sin((seed + i) * 0.7) * vol + (seed % 7) * 0.01;
    v += (mid / 100 / 12 + noise * 0.05) * v;
    out.push({
      date: d.toISOString().slice(0, 10),
      index: Math.round(v * 100) / 100,
    });
  }
  return out;
}

router.get('/catalog', verifyToken, async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from('investments').select('*').eq('active', true).order('min_investment');
    if (error) throw error;
    const list = (rows || []).map((row) => {
      const low = row.expected_return_low != null ? Number(row.expected_return_low) : 4;
      const high = row.expected_return_high != null ? Number(row.expected_return_high) : 8;
      const series = demoSeriesForSlug(row.slug, 30, low, high);
      const last = series[series.length - 1];
      const first = series[0];
      const mtdPct = first && last ? Math.round(((last.index - first.index) / first.index) * 10000) / 100 : 0;
      const seed = hashSeed(row.slug);
      const volatilityLabel = row.risk_level === 'high' ? 'High' : row.risk_level === 'low' ? 'Low' : 'Medium';
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        min_investment: Number(row.min_investment),
        expected_return_low: low,
        expected_return_high: high,
        risk_level: row.risk_level,
        is_halal: row.is_halal,
        mtd_demo_pct: mtdPct,
        ytd_demo_pct: Math.round((mtdPct * 3.2 + (seed % 5) - 2) * 10) / 10,
        volatility_label: volatilityLabel,
        series_30d: series,
      };
    });
    return res.json({ catalog: list, disclaimer: 'Demo analytics only — not real market data.' });
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
      pct_of_invested: totalInvested > 0 ? Math.round((agg[k] / totalInvested) * 1000) / 10 : 0,
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
