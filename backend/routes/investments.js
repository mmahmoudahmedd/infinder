import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';
import { calculateFee, PLATFORM_FEE_RATE } from '../config/fees.js';

const router = Router();

const ROBO_TEMPLATES = {
  preserve_short_low:       { stocks: 10, baskets: 10, bonds: 60, gold: 20 },
  preserve_short_med:       { stocks: 15, baskets: 15, bonds: 50, gold: 20 },
  grow_long_high:           { stocks: 45, baskets: 25, bonds: 15, gold: 15 },
  balanced:                 { stocks: 40, baskets: 20, bonds: 30, gold: 10 },
  preserve_short_low_halal: { stocks: 15, baskets: 10, bonds: 0,  gold: 75 },
  preserve_short_med_halal: { stocks: 20, baskets: 20, bonds: 0,  gold: 60 },
  grow_long_high_halal:     { stocks: 50, baskets: 30, bonds: 0,  gold: 20 },
  balanced_halal:           { stocks: 45, baskets: 25, bonds: 0,  gold: 30 },
};

function buildRoboLabel(goal, horizon, risk, isSharia) {
  const horizonPart = horizon === 'long' ? 'Long-term' : horizon === 'medium' ? 'Medium-term' : 'Short-term';
  const riskPart = risk === 'high' ? 'Growth' : risk === 'low' ? 'Conservative' : 'Balanced';
  const halal = isSharia ? ' Halal' : '';
  return `${horizonPart} ${riskPart}${halal} Portfolio`;
}

function buildRoboExplanation(goal, horizon, risk, isSharia) {
  const riskText = risk === 'high' ? 'higher risk tolerance' : risk === 'low' ? 'lower risk preference' : 'balanced risk approach';
  const horizonText = horizon === 'long' ? 'long-term horizon' : horizon === 'short' ? 'short-term horizon' : 'medium-term horizon';
  const goalText = goal === 'grow' ? 'growth focus' : 'capital preservation focus';
  const shariaNote = isSharia ? ' Bonds were replaced with gold to keep the portfolio fully halal.' : '';
  return `Based on your ${goalText}, ${horizonText}, and ${riskText}, we built this allocation to match your objectives.${shariaNote}`;
}

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
  const { goal, horizon, risk, isSharia } = req.body;
  if (!goal || !horizon || !risk) {
    return res.status(400).json({ error: 'goal, horizon, and risk are required' });
  }
  let key = 'balanced';
  if (goal === 'preserve' && horizon === 'short' && risk === 'low') key = 'preserve_short_low';
  else if (goal === 'preserve' && horizon === 'short') key = 'preserve_short_med';
  else if (goal === 'grow' && (horizon === 'long' || horizon === 'medium') && risk === 'high') key = 'grow_long_high';
  if (isSharia) key = `${key}_halal`;
  const allocation = { ...ROBO_TEMPLATES[key] };
  return res.json({
    allocation,
    label: buildRoboLabel(goal, horizon, risk, isSharia),
    explanation: buildRoboExplanation(goal, horizon, risk, isSharia),
    expected_return: '6-10%',
    risk_level: risk === 'high' ? 'High' : risk === 'low' ? 'Low' : 'Medium',
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
    const largest = keys.reduce((a, b) => (out[a] >= out[b] ? a : b));
    out[largest] += diff;
  }
  return out;
}

async function applyInvestmentLegacy(req, res, amt, feeAmount, norm, reasoning, is_sharia, name) {
  const { data: user, error: uerr } = await supabase.from('users').select('wallet_balance, kyc_status').eq('id', req.user.id).single();
  if (uerr || !user) return res.status(404).json({ error: 'User not found' });
  if (user.kyc_status !== 'approved') return res.status(403).json({ error: 'KYC verification required before investing' });
  const bal = Number(user.wallet_balance);
  const totalCost = amt + feeAmount;
  if (bal < totalCost) return res.status(400).json({ error: 'Insufficient balance' });

  const newBal = bal - totalCost;
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

  const { data: tx } = await supabase.from('transactions').insert({
    user_id: req.user.id,
    type: 'investment',
    amount: amt,
    gross_amount: amt,
    fee_amount: feeAmount,
    net_amount: amt,
    fee_rate: PLATFORM_FEE_RATE,
    status: 'completed',
    reference: portfolio.id,
    meta: { allocation: norm },
  }).select('id').single();

  if (feeAmount > 0 && tx) {
    await supabase.from('platform_fees').insert({
      transaction_id: tx.id,
      user_id: req.user.id,
      amount: feeAmount,
      type: 'investment',
    });
  }

  await evaluateRewards(req.user.id);

  return res.status(201).json({ portfolio, wallet_balance: newBal, fee_amount: feeAmount });
}

router.post('/apply', verifyToken, async (req, res) => {
  try {
    const { data: kycUser, error: kycErr } = await supabase.from('users').select('kyc_status').eq('id', req.user.id).single();
    if (kycErr || !kycUser) return res.status(404).json({ error: 'User not found' });
    if (kycUser.kyc_status !== 'approved') return res.status(403).json({ error: 'KYC verification required before investing' });

    const { amount, allocation, reasoning, is_sharia, name } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const norm = normalizeAllocation(allocation || {});
    if (!norm) return res.status(400).json({ error: 'Invalid allocation' });

    const feeAmount = calculateFee(amt);

    const { data: rpcData, error: rpcErr } = await supabase.rpc('apply_investment', {
      p_user_id: req.user.id,
      p_amount: amt,
      p_allocation: norm,
      p_reasoning: reasoning || null,
      p_is_sharia: !!is_sharia,
      p_portfolio_name: name || 'My Portfolio',
      p_fee_amount: feeAmount,
      p_fee_rate: PLATFORM_FEE_RATE,
    });

    const rpcMissing =
      rpcErr &&
      (String(rpcErr.message || '').includes('does not exist') ||
        String(rpcErr.message || '').includes('Could not find the function') ||
        rpcErr.code === 'PGRST202');

    if (rpcMissing) {
      return applyInvestmentLegacy(req, res, amt, feeAmount, norm, reasoning, is_sharia, name);
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

    return res.status(201).json({
      portfolio,
      wallet_balance: Number(result.wallet_balance),
      fee_amount: Number(result.fee_amount || feeAmount),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Investment failed' });
  }
});

// GET /api/investments/positions — active portfolios with invested amounts
router.get('/positions', verifyToken, async (req, res) => {
  try {
    const { data: portfolios, error: perr } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (perr) throw perr;

    if (!portfolios || portfolios.length === 0) {
      return res.json({ positions: [] });
    }

    // Fetch the investment transaction for each portfolio to get the amount
    const ids = portfolios.map((p) => p.id);
    const { data: txs, error: terr } = await supabase
      .from('transactions')
      .select('reference, amount, fee_amount, created_at')
      .in('reference', ids.map(String))
      .eq('type', 'investment');

    if (terr) throw terr;

    const amountByPortfolio = {};
    const feeByPortfolio = {};
    for (const tx of txs || []) {
      amountByPortfolio[tx.reference] = Number(tx.amount);
      feeByPortfolio[tx.reference] = Number(tx.fee_amount || 0);
    }

    const positions = portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      allocation: p.allocation,
      is_sharia: p.is_sharia,
      status: p.status,
      created_at: p.created_at,
      amount: amountByPortfolio[p.id] ?? null,
      fee_amount: feeByPortfolio[p.id] ?? 0,
    }));

    return res.json({ positions });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load positions' });
  }
});

// POST /api/investments/:id/exit — close a position and return funds
router.post('/:id/exit', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('exit_investment', {
      p_portfolio_id: req.params.id,
      p_user_id: req.user.id,
    });

    if (error) {
      console.error('exit_investment rpc', error);
      return res.status(500).json({ error: error.message || 'Exit failed' });
    }

    if (data && data.ok === false) {
      return res.status(400).json({ error: data.error || 'Exit failed' });
    }

    await evaluateRewards(req.user.id);

    return res.json({
      wallet_balance: Number(data.wallet_balance),
      amount: Number(data.amount),
      transaction_id: data.transaction_id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Exit failed' });
  }
});

export default router;
