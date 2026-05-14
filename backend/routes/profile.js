import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const VALID = {
  risk_tolerance:     new Set(['low', 'medium', 'high']),
  investment_horizon: new Set(['short', 'medium', 'long']),
  investment_goal:    new Set(['preserve', 'grow']),
};

router.get('/investment', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .eq('id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    return res.json({ profile: data });
  } catch (e) {
    console.error('get investment profile error:', e?.message);
    return res.status(500).json({ error: 'Failed to load investment profile' });
  }
});

router.patch('/investment', verifyToken, async (req, res) => {
  try {
    const { risk_tolerance, investment_horizon, investment_goal } = req.body;
    const patch = {};

    if (risk_tolerance !== undefined) {
      if (!VALID.risk_tolerance.has(risk_tolerance))
        return res.status(400).json({ error: 'Invalid risk_tolerance — must be low, medium, or high' });
      patch.risk_tolerance = risk_tolerance;
    }
    if (investment_horizon !== undefined) {
      if (!VALID.investment_horizon.has(investment_horizon))
        return res.status(400).json({ error: 'Invalid investment_horizon — must be short, medium, or long' });
      patch.investment_horizon = investment_horizon;
    }
    if (investment_goal !== undefined) {
      if (!VALID.investment_goal.has(investment_goal))
        return res.status(400).json({ error: 'Invalid investment_goal — must be preserve or grow' });
      patch.investment_goal = investment_goal;
    }

    if (Object.keys(patch).length === 0)
      return res.status(400).json({ error: 'No valid fields to update' });

    // Fetch current values to decide whether to set profile_completed_at
    const { data: current, error: fetchErr } = await supabase
      .from('users')
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .eq('id', req.user.id)
      .single();

    if (fetchErr || !current)
      return res.status(500).json({ error: 'Failed to load current profile' });

    const merged = { ...current, ...patch };
    // Two-query approach; race condition is accepted for this low-frequency operation
    if (merged.risk_tolerance && merged.investment_horizon && merged.investment_goal && !merged.profile_completed_at) {
      patch.profile_completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .single();

    if (error || !data) return res.status(500).json({ error: 'Failed to update investment profile' });
    return res.json({ profile: data });
  } catch (e) {
    console.error('patch investment profile error:', e?.message);
    return res.status(500).json({ error: 'Failed to update investment profile' });
  }
});

export default router;
