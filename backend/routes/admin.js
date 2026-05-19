import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase/client.js';
import { verifyToken, requireAdmin } from '../middleware/verifyToken.js';
import { generateDepositRef } from '../utils/codes.js';

const router = Router();
router.use(verifyToken, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: kycPending },
      { data: walletData },
      { data: portfolioData },
      { data: pendingDeposits },
      { data: allFees },
      { data: monthFees },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
      supabase.from('users').select('wallet_balance'),
      supabase.from('portfolios').select('amount').eq('status', 'active'),
      supabase.from('deposits').select('amount').eq('status', 'pending'),
      supabase.from('platform_fees').select('amount'),
      supabase.from('platform_fees').select('amount').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const totalBalance = (walletData || []).reduce((s, u) => s + Number(u.wallet_balance || 0), 0);
    const totalInvested = (portfolioData || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const pendingCount = pendingDeposits?.length || 0;
    const pendingAmount = (pendingDeposits || []).reduce((s, d) => s + Number(d.amount || 0), 0);
    const totalFees = (allFees || []).reduce((s, f) => s + Number(f.amount || 0), 0);
    const thisMonthFees = (monthFees || []).reduce((s, f) => s + Number(f.amount || 0), 0);

    return res.json({
      users: { total: totalUsers || 0, kyc_pending: kycPending || 0 },
      wallet: { total_balance: parseFloat(totalBalance.toFixed(2)), total_invested: parseFloat(totalInvested.toFixed(2)) },
      deposits: { pending_count: pendingCount, pending_amount: parseFloat(pendingAmount.toFixed(2)) },
      revenue: { total_fees: parseFloat(totalFees.toFixed(2)), this_month: parseFloat(thisMonthFees.toFixed(2)) },
    });
  } catch (e) {
    console.error('admin stats', e);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/admin/users?q=&page=1&limit=20
router.get('/users', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, full_name, role, kyc_status, wallet_balance, created_at, deleted_at', { count: 'exact' });

    if (q) {
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      users: (data || []).map((u) => ({ ...u, wallet_balance: Number(u.wallet_balance || 0) })),
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('admin users', e);
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, wallet_adjustment, note } = req.body;

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Role must be admin or user' });
      }
      const { error } = await supabase.from('users').update({ role }).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    if (wallet_adjustment !== undefined) {
      const adj = Number(wallet_adjustment);
      if (!adj || isNaN(adj)) return res.status(400).json({ error: 'Invalid wallet_adjustment' });

      const { data: user, error: uErr } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', id)
        .single();
      if (uErr || !user) return res.status(404).json({ error: 'User not found' });

      const newBalance = Number(user.wallet_balance || 0) + adj;
      if (newBalance < 0) return res.status(400).json({ error: 'Adjustment would result in negative balance' });

      const { error: updateErr } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', id);
      if (updateErr) throw updateErr;

      await supabase.from('transactions').insert({
        user_id: id,
        type: 'adjustment',
        amount: Math.abs(adj),
        gross_amount: Math.abs(adj),
        fee_amount: 0,
        net_amount: adj,
        fee_rate: 0,
        status: 'completed',
        meta: { admin_id: req.user.id, note: note || '' },
      });

      return res.json({ ok: true, wallet_balance: newBalance });
    }

    return res.status(400).json({ error: 'Nothing to update' });
  } catch (e) {
    console.error('admin patch user', e);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    let deposit_ref_code = generateDepositRef();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase.from('users').select('id').eq('deposit_ref_code', deposit_ref_code).maybeSingle();
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
        role: ['admin', 'user'].includes(role) ? role : 'user',
        kyc_status: 'not_started',
        wallet_balance: 0,
        deposit_ref_code,
      })
      .select('id, email, full_name, phone, role, kyc_status, wallet_balance, created_at')
      .single();

    if (error) throw error;
    return res.status(201).json({ user });
  } catch (e) {
    console.error('admin create user', e);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('admin delete user', e);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [
      { data: user, error: uErr },
      { data: portfolios },
      { data: transactions },
    ] = await Promise.all([
      supabase.from('users').select('id, email, full_name, phone, role, kyc_status, wallet_balance, created_at, deleted_at').eq('id', id).single(),
      supabase.from('portfolios').select('id, name, status, allocation, amount, is_sharia, created_at').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('id, type, amount, net_amount, fee_amount, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (uErr || !user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user, portfolios: portfolios || [], recent_transactions: transactions || [] });
  } catch (e) {
    console.error('admin user detail', e);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

// GET /api/admin/deposits?status=&page=1
router.get('/deposits', async (req, res) => {
  try {
    const status = req.query.status || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('deposits')
      .select(`
        id, amount, fee_amount, net_amount, method, reference_code,
        status, created_at, user_confirmed_sent,
        users!inner(id, email, full_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      deposits: (data || []).map((d) => ({
        ...d,
        amount: Number(d.amount),
        fee_amount: Number(d.fee_amount),
        net_amount: Number(d.net_amount),
        user: d.users,
      })),
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('admin deposits', e);
    return res.status(500).json({ error: 'Failed to load deposits' });
  }
});

// GET /api/admin/transactions?page=1&limit=50&type=&user_id=
router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const type = req.query.type || '';
    const userId = req.query.user_id || '';

    let query = supabase
      .from('transactions')
      .select(`
        id, type, amount, fee_amount, net_amount, status, created_at, meta,
        users!inner(id, email, full_name)
      `, { count: 'exact' });

    if (type) query = query.eq('type', type);
    if (userId) query = query.eq('user_id', userId);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({
      transactions: (data || []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
        fee_amount: Number(tx.fee_amount || 0),
        net_amount: Number(tx.net_amount || tx.amount),
        user: tx.users,
      })),
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('admin transactions', e);
    return res.status(500).json({ error: 'Failed to load transactions' });
  }
});

// GET /api/admin/investments
router.get('/investments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ investments: data || [] });
  } catch (e) {
    console.error('admin investments', e);
    return res.status(500).json({ error: 'Failed to load investments' });
  }
});

// POST /api/admin/investments
router.post('/investments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ investment: data });
  } catch (e) {
    console.error('admin create investment', e);
    return res.status(500).json({ error: 'Failed to create investment' });
  }
});

// PATCH /api/admin/investments/:id
router.patch('/investments/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ investment: data });
  } catch (e) {
    console.error('admin update investment', e);
    return res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE /api/admin/investments/:id
router.delete('/investments/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('investments').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('admin delete investment', e);
    return res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// ─── Learning Modules ─────────────────────────────────────────────────────────

// GET /api/admin/learning/modules
router.get('/learning/modules', async (req, res) => {
  try {
    const { data, error } = await supabase.from('learning_modules').select('*').order('order_index');
    if (error) throw error;
    return res.json({ modules: data || [] });
  } catch (e) {
    console.error('admin learning modules', e);
    return res.status(500).json({ error: 'Failed to load modules' });
  }
});

// POST /api/admin/learning/modules
router.post('/learning/modules', async (req, res) => {
  try {
    const { data, error } = await supabase.from('learning_modules').insert(req.body).select().single();
    if (error) throw error;
    return res.status(201).json({ module: data });
  } catch (e) {
    console.error('admin create module', e);
    return res.status(500).json({ error: 'Failed to create module' });
  }
});

// PATCH /api/admin/learning/modules/:id
router.patch('/learning/modules/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('learning_modules').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    return res.json({ module: data });
  } catch (e) {
    console.error('admin update module', e);
    return res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/admin/learning/modules/:id
router.delete('/learning/modules/:id', async (req, res) => {
  try {
    const { error } = await supabase.rpc('delete_module_cascade', { p_module_id: req.params.id });
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('admin delete module', e);
    return res.status(500).json({ error: 'Failed to delete module' });
  }
});

// GET /api/admin/learning/modules/:id/lessons
router.get('/learning/modules/:id/lessons', async (req, res) => {
  try {
    const { data, error } = await supabase.from('lessons').select('*').eq('module_id', req.params.id).order('order_index');
    if (error) throw error;
    return res.json({ lessons: data || [] });
  } catch (e) {
    console.error('admin lessons', e);
    return res.status(500).json({ error: 'Failed to load lessons' });
  }
});

// POST /api/admin/learning/modules/:id/lessons
router.post('/learning/modules/:id/lessons', async (req, res) => {
  try {
    const { data, error } = await supabase.from('lessons').insert({ ...req.body, module_id: req.params.id }).select().single();
    if (error) throw error;
    return res.status(201).json({ lesson: data });
  } catch (e) {
    console.error('admin create lesson', e);
    return res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// PATCH /api/admin/learning/lessons/:id
router.patch('/learning/lessons/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('lessons').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    return res.json({ lesson: data });
  } catch (e) {
    console.error('admin update lesson', e);
    return res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/admin/learning/lessons/:id
router.delete('/learning/lessons/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('lessons').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('admin delete lesson', e);
    return res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// ─── Portfolios ───────────────────────────────────────────────────────────────

// GET /api/admin/portfolios?page=1
router.get('/portfolios', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('portfolios')
      .select('id, name, status, allocation, amount, is_sharia, created_at, users!inner(id, email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.json({
      portfolios: (data || []).map((p) => ({ ...p, user: p.users, amount: Number(p.amount || 0) })),
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error('admin portfolios', e);
    return res.status(500).json({ error: 'Failed to load portfolios' });
  }
});

// PATCH /api/admin/portfolios/:id
router.patch('/portfolios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: portfolio, error: fetchErr } = await supabase.from('portfolios').select('status').eq('id', id).single();
    if (fetchErr || !portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    if (portfolio.status === 'closed') return res.status(400).json({ error: 'Portfolio already closed' });

    const { error } = await supabase.from('portfolios').update({ status: 'closed' }).eq('id', id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('admin close portfolio', e);
    return res.status(500).json({ error: 'Failed to close portfolio' });
  }
});

export default router;
