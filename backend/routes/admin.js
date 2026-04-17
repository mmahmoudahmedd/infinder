import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken, requireAdmin } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/kyc', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, created_at')
      .in('kyc_status', ['pending', 'under_review'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    return res.json({ submissions: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load KYC queue' });
  }
});

router.post('/kyc/approve', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const { error } = await supabase.from('users').update({ kyc_status: 'approved', kyc_rejection_reason: null }).eq('id', userId);
    if (error) throw error;
    await evaluateRewards(userId);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Approve failed' });
  }
});

router.post('/kyc/reject', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const { error } = await supabase
      .from('users')
      .update({ kyc_status: 'rejected', kyc_rejection_reason: reason || 'Rejected' })
      .eq('id', userId);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Reject failed' });
  }
});

export default router;
