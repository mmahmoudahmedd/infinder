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

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    console.log('🔍 EXISTING CHECK:', { existing, existingError });

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

    console.log('🟡 ATTEMPTING INSERT with:', {
      email: email.toLowerCase().trim(),
      full_name,
      deposit_ref_code,
      kyc_status: 'under_review',
    });

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        full_name: full_name || null,
        phone: phone || null,
        sharia_mode: !!sharia_mode,
        deposit_ref_code,
        kyc_status: 'under_review',
      })
      .select('id, email, full_name, phone, kyc_status, sharia_mode, wallet_balance, role, deposit_ref_code, created_at')
      .single();

    console.log('🟡 INSERT RESULT - data:', user);
    console.log('🟡 INSERT RESULT - error:', JSON.stringify(error, null, 2));

    if (error) throw error;

    user.wallet_balance = Number(user.wallet_balance);
    const token = signToken(user);
    return res.status(201).json({ token, user });

  } catch (e) {
    console.error('🔴 REGISTER ERROR MESSAGE:', e?.message);
    console.error('🔴 REGISTER ERROR CODE:', e?.code);
    console.error('🔴 REGISTER ERROR DETAILS:', e?.details);
    console.error('🔴 REGISTER ERROR HINT:', e?.hint);
    console.error('🔴 REGISTER FULL ERROR:', JSON.stringify(e, null, 2));
    return res.status(500).json({
      error: e?.message || 'Registration failed',
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
    });
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

    console.log('🔍 LOGIN USER FOUND:', user ? `yes — id: ${user.id}` : 'null');
    console.log('🔍 LOGIN DB ERROR:', JSON.stringify(error, null, 2));

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    console.log('🔍 PASSWORD MATCH:', ok);

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
    };
    return res.json({ token, user: safe });

  } catch (e) {
    console.error('🔴 LOGIN ERROR MESSAGE:', e?.message);
    console.error('🔴 LOGIN ERROR CODE:', e?.code);
    console.error('🔴 LOGIN ERROR DETAILS:', e?.details);
    console.error('🔴 LOGIN FULL ERROR:', JSON.stringify(e, null, 2));
    return res.status(500).json({
      error: e?.message || 'Login failed',
      code: e?.code,
      details: e?.details,
    });
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
      .select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at')
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    user.wallet_balance = Number(user.wallet_balance);
    return res.json({ user });

  } catch (e) {
    console.error('🔴 UPDATE ME ERROR:', e?.message);
    return res.status(500).json({ error: 'Update failed' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    user.wallet_balance = Number(user.wallet_balance);
    return res.json({ user });

  } catch (e) {
    console.error('🔴 GET ME ERROR:', e?.message);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;