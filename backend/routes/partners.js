import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('order_index');
    if (error) throw error;
    return res.json({ partners: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load partners' });
  }
});

router.get('/:slug', verifyToken, async (req, res) => {
  try {
    const { data: partner, error: perr } = await supabase
      .from('partners')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('active', true)
      .maybeSingle();
    if (perr) throw perr;
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const { data: levels, error: lerr } = await supabase
      .from('partner_levels')
      .select('*')
      .eq('partner_id', partner.id)
      .order('order_index');
    if (lerr) throw lerr;

    const moduleIds = (levels || []).filter(l => l.module_id).map(l => l.module_id);

    const moduleMap = {};
    const completionMap = {};

    if (moduleIds.length > 0) {
      const { data: modules } = await supabase
        .from('learning_modules')
        .select('id, title, slug')
        .in('id', moduleIds);
      for (const m of modules || []) moduleMap[m.id] = m;

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds);

      const lessonIds = (lessons || []).map(l => l.id);
      let completedSet = new Set();
      if (lessonIds.length > 0) {
        const { data: progress } = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', req.user.id)
          .in('lesson_id', lessonIds);
        completedSet = new Set((progress || []).map(p => p.lesson_id));
      }

      const lessonsByModule = {};
      for (const l of lessons || []) {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l.id);
      }
      for (const mid of moduleIds) {
        const ml = lessonsByModule[mid] || [];
        completionMap[mid] = ml.length > 0 && ml.every(id => completedSet.has(id));
      }
    }

    const enrichedLevels = (levels || []).map(level => ({
      ...level,
      module: level.module_id ? (moduleMap[level.module_id] ?? null) : null,
      completed: level.module_id ? (completionMap[level.module_id] ?? false) : false,
    }));

    return res.json({ partner, levels: enrichedLevels });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load partner' });
  }
});

export default router;
