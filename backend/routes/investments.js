import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

const ROBO_TEMPLATES = {
  preserve_short_low: { stocks: 10, baskets: 10, bonds: 60, gold: 20 },
  preserve_short_med: { stocks: 15, baskets: 15, bonds: 50, gold: 20 },
  grow_long_high: { stocks: 45, baskets: 25, bonds: 15, gold: 15 },
  balanced: { stocks: 40, baskets: 20, bonds: 30, gold: 10 },
};

router.get('/', verifyToken, async (req, res) => {
  try {
    let q = supabase.from('investments').select('*').eq('active', true).order('min_investment');
    const sharia = req.query.sharia === '1' || req.query.sharia === 'true';
    if (sharia) q = q.eq('is_halal', true);
    const { data, error } = await q;
    if (error) throw error;
    const list = (data || []).map((row) => ({
      ...row,
      min_investment: Number(row.min_investment),
      expected_return_low: row.expected_return_low != null ? Number(row.expected_return_low) : null,
      expected_return_high: row.expected_return_high != null ? Number(row.expected_return_high) : null,
    }));
    return res.json({ investments: list });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load investments' });
  }
});

router.post('/robo', verifyToken, (req, res) => {
  const { goal, horizon, risk } = req.body;
  let key = 'balanced';
  if (goal === 'preserve' && horizon === 'short' && risk === 'low') key = 'preserve_short_low';
  else if (goal === 'preserve' && horizon === 'short') key = 'preserve_short_med';
  else if (goal === 'grow' && (horizon === 'long' || horizon === 'medium') && risk === 'high') key = 'grow_long_high';
  const allocation = { ...ROBO_TEMPLATES[key] };
  return res.json({
    allocation,
    label: key === 'balanced' ? 'Balanced Portfolio' : key.replace(/_/g, ' '),
    expected_return: '6-10%',
    risk_level: 'Medium',
  });
});

function normalizeAllocation(a) {
  const keys = ['stocks', 'baskets', 'bonds', 'gold'];
  const out = {};
  let sum = 0;
  for (const k of keys) {
    const v = Math.max(0, Math.min(100, Number(a[k]) || 0));
    out[k] = v;
    sum += v;
  }
  if (sum === 0) return null;
  if (Math.abs(sum - 100) > 1) {
    const f = 100 / sum;
    for (const k of keys) out[k] = Math.round(out[k] * f);
    let diff = 100 - keys.reduce((s, k) => s + out[k], 0);
    out.stocks += diff;
  }
  return out;
}

async function applyInvestmentLegacy(req, res, amt, norm, reasoning, is_sharia, name) {
  const { data: user, error: uerr } = await supabase.from('users').select('wallet_balance, kyc_status').eq('id', req.user.id).single();
  if (uerr || !user) return res.status(404).json({ error: 'User not found' });
  if (user.kyc_status === 'rejected') return res.status(403).json({ error: 'KYC rejected — contact support' });
  const bal = Number(user.wallet_balance);
  if (bal < amt) return res.status(400).json({ error: 'Insufficient balance' });

  const newBal = bal - amt;
  const { error: werr } = await supabase.from('users').update({ wallet_balance: newBal }).eq('id', req.user.id);
  if (werr) throw werr;

  const { data: portfolio, error: perr } = await supabase
    .from('portfolios')
    .insert({
      user_id: req.user.id,
      name: name || 'My Portfolio',
      allocation: norm,
      assistant_reasoning: reasoning || null,
      is_sharia: !!is_sharia,
    })
    .select()
    .single();
  if (perr) throw perr;

  await supabase.from('transactions').insert({
    user_id: req.user.id,
    type: 'investment',
    amount: amt,
    status: 'completed',
    reference: portfolio.id,
    meta: { allocation: norm },
  });

  await evaluateRewards(req.user.id);

  return res.status(201).json({ portfolio, wallet_balance: newBal });
}

router.post('/apply', verifyToken, async (req, res) => {
  try {
    const { amount, allocation, reasoning, is_sharia, name } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const norm = normalizeAllocation(allocation || {});
    if (!norm) return res.status(400).json({ error: 'Invalid allocation' });

    const { data: rpcData, error: rpcErr } = await supabase.rpc('apply_investment', {
      p_user_id: req.user.id,
      p_amount: amt,
      p_allocation: norm,
      p_reasoning: reasoning || null,
      p_is_sharia: !!is_sharia,
      p_portfolio_name: name || 'My Portfolio',
    });

    const rpcMissing =
      rpcErr &&
      (String(rpcErr.message || '').includes('does not exist') ||
        String(rpcErr.message || '').includes('Could not find the function') ||
        rpcErr.code === 'PGRST202');

    if (rpcMissing) {
      return applyInvestmentLegacy(req, res, amt, norm, reasoning, is_sharia, name);
    }

    if (rpcErr) {
      console.error('apply_investment rpc', rpcErr);
      return res.status(500).json({ error: rpcErr.message || 'Investment failed' });
    }

    const result = rpcData;
    if (result && result.ok === false) {
      return res.status(400).json({ error: result.error || 'Investment failed' });
    }
    if (!result || result.ok !== true || !result.portfolio_id) {
      return res.status(500).json({ error: 'Unexpected investment response' });
    }

    const { data: portfolio, error: perr } = await supabase.from('portfolios').select('*').eq('id', result.portfolio_id).single();
    if (perr || !portfolio) return res.status(500).json({ error: 'Investment saved but portfolio fetch failed' });

    await evaluateRewards(req.user.id);

    return res.status(201).json({ portfolio, wallet_balance: Number(result.wallet_balance) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Investment failed' });
  }
});

export default router;
