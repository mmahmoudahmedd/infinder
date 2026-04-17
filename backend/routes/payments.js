import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

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

    const { data: rpcData, error: rpcErr } = await supabase.rpc('withdraw_wallet', {
      p_user_id: req.user.id,
      p_amount: amount,
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
      const { error: werr } = await supabase.from('users').update({ wallet_balance: newBal }).eq('id', req.user.id);
      if (werr) throw werr;
      await supabase.from('transactions').insert({
        user_id: req.user.id,
        type: 'withdrawal',
        amount,
        status: 'completed',
      });
      return res.json({ wallet_balance: newBal });
    }

    if (rpcErr) {
      console.error('withdraw_wallet rpc', rpcErr);
      return res.status(500).json({ error: rpcErr.message || 'Withdrawal failed' });
    }

    if (rpcData && rpcData.ok === false) {
      return res.status(400).json({ error: rpcData.error || 'Withdrawal failed' });
    }

    return res.json({ wallet_balance: Number(rpcData.wallet_balance) });
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
      amount: Number(t.amount),
    }));
    return res.json({ transactions: list });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load history' });
  }
});

export default router;
