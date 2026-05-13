import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { generateDepositRef } from '../utils/codes.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, full_name, phone, sharia_mode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    let deposit_ref_code = generateDepositRef();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase
        .from('users')
        .select('id')
        .eq('deposit_ref_code', deposit_ref_code)
        .maybeSingle();
      if (!clash) break;
      deposit_ref_code = generateDepositRef();
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        full_name: full_name || null,
        phone: phone || null,
        sharia_mode: !!sharia_mode,
        deposit_ref_code,
        kyc_status: 'not_started',
      })
      .select('id, email, full_name, phone, kyc_status, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .single();

    if (error) throw error;

    user.wallet_balance = Number(user.wallet_balance);
    const token = signToken(user);
    return res.status(201).json({ token, user });

  } catch (e) {
    console.error('register error:', e?.message, e?.code);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.deleted_at) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString().slice(0, 10) })
      .eq('id', user.id);

    const token = signToken(user);
    const safe = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      kyc_status: user.kyc_status,
      sharia_mode: user.sharia_mode,
      wallet_balance: Number(user.wallet_balance),
      role: user.role,
      deposit_ref_code: user.deposit_ref_code,
      created_at: user.created_at,
      risk_tolerance: user.risk_tolerance ?? null,
      investment_horizon: user.investment_horizon ?? null,
      investment_goal: user.investment_goal ?? null,
      profile_completed_at: user.profile_completed_at ?? null,
    };
    return res.json({ token, user: safe });

  } catch (e) {
    console.error('login error:', e?.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.patch('/me', verifyToken, async (req, res) => {
  try {
    const { full_name, phone, sharia_mode } = req.body;
    const patch = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (phone !== undefined) patch.phone = phone;
    if (sharia_mode !== undefined) patch.sharia_mode = !!sharia_mode;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No fields to update' });

    const { data: user, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    user.wallet_balance = Number(user.wallet_balance);
    return res.json({ user });

  } catch (e) {
    console.error('update me error:', e?.message);
    return res.status(500).json({ error: 'Update failed' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    user.wallet_balance = Number(user.wallet_balance);
    return res.json({ user });

  } catch (e) {
    console.error('get me error:', e?.message);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.delete('/account', verifyToken, async (req, res) => {
  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('wallet_balance, deleted_at')
      .eq('id', req.user.id)
      .single();

    if (uErr || !user) return res.status(404).json({ error: 'User not found' });
    if (user.deleted_at) return res.status(410).json({ error: 'Account already deleted' });

    if (Number(user.wallet_balance) > 0) {
      return res.status(400).json({ error: 'Withdraw your funds before deleting your account' });
    }

    const { data: activePortfolios } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .limit(1);
    if (activePortfolios?.length > 0) {
      return res.status(400).json({ error: 'Exit all investments before deleting your account' });
    }

    const { data: pendingDeposits } = await supabase
      .from('deposits')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .limit(1);
    if (pendingDeposits?.length > 0) {
      return res.status(400).json({ error: 'You have pending deposits. Wait for them to clear or contact support' });
    }

    const { error: delErr } = await supabase
      .from('users')
      .update({
        deleted_at:       new Date().toISOString(),
        email:            `deleted_${req.user.id}@deleted.invalid`,
        full_name:        null,
        phone:            null,
        password_hash:    '',
        deposit_ref_code: null,
      })
      .eq('id', req.user.id);

    if (delErr) throw delErr;

    return res.json({ ok: true });
  } catch (e) {
    console.error('delete account error:', e?.message);
    return res.status(500).json({ error: 'Account deletion failed' });
  }
});

export default router;