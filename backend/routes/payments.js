import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';
import { calculateFee, PLATFORM_FEE_RATE } from '../config/fees.js';

const router = Router();

router.post('/fund', verifyToken, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const meta = { method: req.body.method || 'instapay' };
    const { data: rpcData, error: rpcErr } = await supabase.rpc('fund_wallet', {
      p_user_id: req.user.id,
      p_amount: amount,
      p_meta: meta,
    });

    const rpcMissing =
      rpcErr &&
      (String(rpcErr.message || '').includes('does not exist') ||
        String(rpcErr.message || '').includes('Could not find the function') ||
        rpcErr.code === 'PGRST202');

    if (rpcMissing) {
      const { data: user, error: uerr } = await supabase.from('users').select('wallet_balance').eq('id', req.user.id).single();
      if (uerr || !user) return res.status(404).json({ error: 'User not found' });
      const newBal = Number(user.wallet_balance) + amount;
      const { error: werr } = await supabase.from('users').update({ wallet_balance: newBal }).eq('id', req.user.id);
      if (werr) throw werr;
      await supabase.from('transactions').insert({
        user_id: req.user.id,
        type: 'deposit',
        amount,
        gross_amount: amount,
        fee_amount: 0,
        net_amount: amount,
        fee_rate: 0,
        status: 'completed',
        meta,
      });
      await evaluateRewards(req.user.id);
      return res.json({ wallet_balance: newBal });
    }

    if (rpcErr) {
      console.error('fund_wallet rpc', rpcErr);
      return res.status(500).json({ error: rpcErr.message || 'Funding failed' });
    }

    if (rpcData && rpcData.ok === false) {
      return res.status(400).json({ error: rpcData.error || 'Funding failed' });
    }

    await evaluateRewards(req.user.id);
    return res.json({ wallet_balance: Number(rpcData.wallet_balance) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Funding failed' });
  }
});

router.post('/withdraw', verifyToken, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const feeAmount = calculateFee(amount);

    const { data: rpcData, error: rpcErr } = await supabase.rpc('withdraw_wallet', {
      p_user_id: req.user.id,
      p_amount: amount,
      p_fee_amount: feeAmount,
      p_fee_rate: PLATFORM_FEE_RATE,
    });

    const rpcMissing =
      rpcErr &&
      (String(rpcErr.message || '').includes('does not exist') ||
        String(rpcErr.message || '').includes('Could not find the function') ||
        rpcErr.code === 'PGRST202');

    if (rpcMissing) {
      const { data: user, error: uerr } = await supabase.from('users').select('wallet_balance').eq('id', req.user.id).single();
      if (uerr || !user) return res.status(404).json({ error: 'User not found' });
      const bal = Number(user.wallet_balance);
      if (bal < amount) return res.status(400).json({ error: 'Insufficient balance' });
      const newBal = bal - amount;
      const netAmount = amount - feeAmount;
      const { error: werr } = await supabase.from('users').update({ wallet_balance: newBal }).eq('id', req.user.id);
      if (werr) throw werr;
      const { data: tx } = await supabase.from('transactions').insert({
        user_id: req.user.id,
        type: 'withdrawal',
        amount,
        gross_amount: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        fee_rate: PLATFORM_FEE_RATE,
        status: 'completed',
      }).select('id').single();
      if (feeAmount > 0 && tx) {
        await supabase.from('platform_fees').insert({
          transaction_id: tx.id,
          user_id: req.user.id,
          amount: feeAmount,
          type: 'withdrawal',
        });
      }
      return res.json({ wallet_balance: newBal, fee_amount: feeAmount, net_amount: netAmount });
    }

    if (rpcErr) {
      console.error('withdraw_wallet rpc', rpcErr);
      return res.status(500).json({ error: rpcErr.message || 'Withdrawal failed' });
    }

    if (rpcData && rpcData.ok === false) {
      return res.status(400).json({ error: rpcData.error || 'Withdrawal failed' });
    }

    return res.json({
      wallet_balance: Number(rpcData.wallet_balance),
      fee_amount: Number(rpcData.fee_amount || feeAmount),
      net_amount: Number(rpcData.net_amount || (amount - feeAmount)),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const list = (data || []).map((t) => ({
      ...t,
      amount:       Number(t.amount),
      gross_amount: t.gross_amount != null ? Number(t.gross_amount) : Number(t.amount),
      fee_amount:   Number(t.fee_amount || 0),
      net_amount:   t.net_amount != null ? Number(t.net_amount) : Number(t.amount),
      fee_rate:     Number(t.fee_rate || 0),
    }));
    return res.json({ transactions: list });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load history' });
  }
});

// Admin: platform fee revenue summary
router.get('/admin/fees', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const period = req.query.period || 'all'; // 'day' | 'month' | 'all'

    // All-time total
    const { data: totals } = await supabase
      .from('platform_fees')
      .select('amount, type, created_at');

    if (!totals) return res.json({ total: 0, by_type: {}, breakdown: [] });

    const total = totals.reduce((s, r) => s + Number(r.amount), 0);

    const by_type = totals.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + Number(r.amount);
      return acc;
    }, {});

    // Grouped breakdown
    const { data: summary } = await supabase
      .from('platform_fee_summary')
      .select('*')
      .order('day', { ascending: false })
      .limit(period === 'day' ? 30 : period === 'month' ? 12 : 100);

    return res.json({
      total: parseFloat(total.toFixed(2)),
      by_type: Object.fromEntries(
        Object.entries(by_type).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
      breakdown: summary || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load fee data' });
  }
});

export default router;
