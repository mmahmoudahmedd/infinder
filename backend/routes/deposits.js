import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken, requireAdmin } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

const CARD_FEE_RATE = 0.02;
const MAX_CARD_DEPOSIT = 20_000;
const METHOD_LETTER = { instapay: 'I', bank: 'B', card: 'C' };

function generateRefCode(method) {
  const letter = METHOD_LETTER[method] || 'X';
  const digits = String(Math.floor(1_000_000 + Math.random() * 9_000_000));
  return `INV${letter}${digits}`;
}

// POST /api/deposits
router.post('/', verifyToken, async (req, res) => {
  try {
    const { data: kycUser, error: kycErr } = await supabase.from('users').select('kyc_status').eq('id', req.user.id).single();
    if (kycErr || !kycUser) return res.status(404).json({ error: 'User not found' });
    if (kycUser.kyc_status !== 'approved') return res.status(403).json({ error: 'KYC verification required before depositing' });

    const { method, amount } = req.body;
    const n = Number(amount);

    if (!['instapay', 'bank', 'card'].includes(method)) {
      return res.status(400).json({ error: 'Invalid method' });
    }
    if (!n || n <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (method === 'card' && n > MAX_CARD_DEPOSIT) {
      return res.status(400).json({ error: `Card deposits are limited to EGP ${MAX_CARD_DEPOSIT}` });
    }

    // Card: atomic credit via RPC
    if (method === 'card') {
      const feeAmount = parseFloat((n * CARD_FEE_RATE).toFixed(2));
      const netAmount = parseFloat((n - feeAmount).toFixed(2));

      for (let attempt = 0; attempt < 3; attempt++) {
        const refCode = generateRefCode('card');
        const { data, error } = await supabase.rpc('credit_deposit_card', {
          p_user_id: req.user.id,
          p_amount: n,
          p_fee_amount: feeAmount,
          p_net_amount: netAmount,
          p_reference_code: refCode,
        });

        if (error) {
          const msg = String(error.message || '');
          if (error.code === '23505' || msg.includes('unique') || msg.includes('23505')) continue;
          if (msg.includes('User not found')) return res.status(404).json({ error: 'User not found' });
          console.error('credit_deposit_card rpc', error);
          return res.status(500).json({ error: error.message || 'Deposit failed' });
        }

        if (data && data.ok === false) {
          return res.status(400).json({ error: data.error || 'Deposit failed' });
        }

        await evaluateRewards(req.user.id);
        return res.json({
          id: data.deposit_id,
          wallet_balance: Number(data.wallet_balance),
          fee_amount: feeAmount,
          net_amount: netAmount,
          reference_code: refCode,
          method: 'card',
          status: 'credited',
        });
      }

      return res.status(500).json({ error: 'Failed to generate unique reference code. Please try again.' });
    }

    // Instapay / Bank: create pending row
    for (let attempt = 0; attempt < 3; attempt++) {
      const refCode = generateRefCode(method);
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: req.user.id,
          amount: n,
          method,
          reference_code: refCode,
          status: 'pending',
          user_confirmed_sent: false,
          fee_amount: 0,
          net_amount: n,
        })
        .select('id, reference_code, status, created_at')
        .single();

      if (error) {
        if (error.code === '23505') continue;
        console.error('deposits insert', error);
        return res.status(500).json({ error: error.message || 'Deposit creation failed' });
      }

      return res.json({
        id: data.id,
        reference_code: data.reference_code,
        status: data.status,
        created_at: data.created_at,
        amount: n,
        fee_amount: 0,
        net_amount: n,
        method,
      });
    }

    return res.status(500).json({ error: 'Failed to generate unique reference code. Please try again.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Deposit creation failed' });
  }
});

// GET /api/deposits
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return res.json({
      deposits: (data || []).map((d) => ({
        ...d,
        amount: Number(d.amount),
        fee_amount: Number(d.fee_amount),
        net_amount: Number(d.net_amount),
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load deposits' });
  }
});

// GET /api/deposits/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Deposit not found' });

    return res.json({
      deposit: {
        ...data,
        amount: Number(data.amount),
        fee_amount: Number(data.fee_amount),
        net_amount: Number(data.net_amount),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load deposit' });
  }
});

// PATCH /api/deposits/:id/confirm-sent
router.patch('/:id/confirm-sent', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .update({ user_confirmed_sent: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .select('id, status, user_confirmed_sent')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Deposit not found or already processed' });
    }

    return res.json({ ok: true, deposit: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to confirm deposit' });
  }
});

// POST /api/deposits/:id/credit  — admin only
router.post('/:id/credit', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('credit_deposit', {
      p_deposit_id: req.params.id,
      p_admin_id: req.user.id,
    });

    if (error) {
      console.error('credit_deposit rpc', error);
      return res.status(500).json({ error: error.message || 'Credit failed' });
    }

    if (data && data.ok === false) {
      return res.status(400).json({ error: data.error || 'Credit failed' });
    }

    await evaluateRewards(data.user_id);

    return res.json({
      ok: true,
      wallet_balance: Number(data.wallet_balance),
      transaction_id: data.transaction_id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Credit failed' });
  }
});

export default router;
