import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', req.user.id)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return res.json({ achievements: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load rewards' });
  }
});

router.post('/check', verifyToken, async (req, res) => {
  try {
    await evaluateRewards(req.user.id);
    const { data } = await supabase.from('achievements').select('*').eq('user_id', req.user.id).order('earned_at', { ascending: false });
    return res.json({ achievements: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Rewards check failed' });
  }
});

export default router;
