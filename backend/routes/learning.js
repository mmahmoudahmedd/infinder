import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

router.get('/modules', verifyToken, async (req, res) => {
  try {
    // Exclude modules that belong to partner certification tracks
    const { data: partnerLevels } = await supabase
      .from('partner_levels')
      .select('module_id')
      .not('module_id', 'is', null);
    const partnerModuleIds = [...new Set((partnerLevels || []).map((r) => r.module_id).filter(Boolean))];

    let modulesQuery = supabase.from('learning_modules').select('*').order('order_index');
    if (partnerModuleIds.length > 0) {
      modulesQuery = modulesQuery.not('id', 'in', `(${partnerModuleIds.join(',')})`);
    }
    const { data: modules, error } = await modulesQuery;
    if (error) throw error;
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, module_id, title, content, order_index, duration_minutes')
      .order('order_index');
    const { data: progress } = await supabase.from('user_progress').select('lesson_id').eq('user_id', req.user.id);
    const done = new Set((progress || []).map((p) => p.lesson_id));

    const enriched = (modules || []).map((m) => {
      const modLessons = (lessons || []).filter((l) => l.module_id === m.id);
      const total = modLessons.length;
      const completed = modLessons.filter((l) => done.has(l.id)).length;
      return {
        ...m,
        lesson_count: total,
        completed_lessons: completed,
        progress_pct: total ? Math.round((completed / total) * 100) : 0,
        lessons: modLessons,
      };
    });
    return res.json({ modules: enriched });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load modules' });
  }
});

router.get('/modules/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    let mod = null;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(id)) {
      const { data: byId, error: e1 } = await supabase.from('learning_modules').select('*').eq('id', id).maybeSingle();
      if (e1) throw e1;
      mod = byId;
    }
    if (!mod) {
      const { data: bySlug, error: e2 } = await supabase.from('learning_modules').select('*').eq('slug', id).maybeSingle();
      if (e2) throw e2;
      mod = bySlug;
    }
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    const moduleId = mod.id;
    const { data: lessons, error: lerr } = await supabase
      .from('lessons')
      .select('id, module_id, title, content, order_index, duration_minutes, quiz')
      .eq('module_id', moduleId)
      .order('order_index');
    if (lerr) throw lerr;

    const { data: progress } = await supabase.from('user_progress').select('*').eq('user_id', req.user.id);
    const pmap = new Map((progress || []).map((p) => [p.lesson_id, p]));

    const outLessons = (lessons || []).map((l) => {
      const p = pmap.get(l.id);
      return {
        ...l,
        completed: !!p,
        quiz_score: p?.quiz_score ?? null,
        certificate_issued: p?.certificate_issued ?? false,
      };
    });

    return res.json({ module: mod, lessons: outLessons });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load module' });
  }
});

router.get('/progress', verifyToken, async (req, res) => {
  try {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', req.user.id);
    return res.json({ completed: (progress || []).map((p) => p.lesson_id) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load progress' });
  }
});

router.post('/progress', verifyToken, async (req, res) => {
  try {
    const { lesson_id } = req.body;
    if (!lesson_id) return res.status(400).json({ error: 'lesson_id required' });

    const { data: lessonRow } = await supabase
      .from('lessons').select('module_id').eq('id', lesson_id).maybeSingle();
    if (!lessonRow) return res.status(404).json({ error: 'Lesson not found' });

    const { data: purchase } = await supabase
      .from('course_purchases')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', lessonRow.module_id)
      .maybeSingle();
    if (!purchase) return res.status(403).json({ error: 'Course not purchased' });

    const { error } = await supabase.from('user_progress').upsert(
      {
        user_id: req.user.id,
        lesson_id,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
    if (error) throw error;
    await evaluateRewards(req.user.id);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to save progress' });
  }
});

router.get('/enrollment', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_enrollments')
      .select('course_id')
      .eq('user_id', req.user.id);
    if (error) return res.json({ enrolled: [] });
    return res.json({ enrolled: (data || []).map(r => r.course_id) });
  } catch {
    return res.json({ enrolled: [] });
  }
});

router.post('/enrollment', verifyToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'course_id required' });
    const { error } = await supabase.from('user_enrollments').upsert(
      { user_id: req.user.id, course_id, enrolled_at: new Date().toISOString() },
      { onConflict: 'user_id,course_id' },
    );
    if (error) return res.json({ ok: true }); // graceful — table may not exist yet
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true }); // enrollment failure is non-critical
  }
});

router.get('/purchases', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('course_purchases')
      .select('course_id')
      .eq('user_id', req.user.id);
    if (error) return res.json({ purchased: [] });
    return res.json({ purchased: (data || []).map(r => r.course_id) });
  } catch {
    return res.json({ purchased: [] });
  }
});

router.post('/purchase', verifyToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'course_id required' });

    const { data: existing } = await supabase
      .from('course_purchases')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .maybeSingle();
    if (existing) return res.json({ ok: true, already_owned: true });

    const [
      { data: user, error: uerr },
      { data: module, error: merr },
    ] = await Promise.all([
      supabase.from('users').select('wallet_balance').eq('id', req.user.id).single(),
      supabase.from('learning_modules').select('price').eq('id', course_id).single(),
    ]);
    if (uerr || !user) return res.status(404).json({ error: 'User not found' });
    if (merr || !module) return res.status(404).json({ error: 'Module not found' });

    const balance = Number(user.wallet_balance);
    const price = Number(module.price ?? 0);
    if (balance < price) {
      return res.status(400).json({ error: 'insufficient_balance', balance });
    }

    const newBalance = balance - price;

    const { error: werr } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', req.user.id);
    if (werr) throw werr;

    const { error: perr } = await supabase.from('course_purchases').insert({
      user_id: req.user.id,
      course_id,
      amount: price,
    });
    if (perr) {
      // Refund wallet — purchase recording failed
      await supabase.from('users').update({ wallet_balance: balance }).eq('id', req.user.id);
      return res.status(500).json({ error: 'Purchase failed' });
    }

    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'course_purchase',
      amount: price,
      gross_amount: price,
      fee_amount: 0,
      net_amount: price,
      fee_rate: 0,
      status: 'completed',
      meta: { course_id },
    });

    try { await evaluateRewards(req.user.id); } catch { /* non-fatal */ }

    return res.json({ ok: true, wallet_balance: newBalance });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Purchase failed' });
  }
});

router.post('/quiz', verifyToken, async (req, res) => {
  try {
    const { lesson_id, answers } = req.body;
    if (!lesson_id || !Array.isArray(answers)) return res.status(400).json({ error: 'lesson_id and answers[] required' });

    const { data: lesson, error } = await supabase.from('lessons').select('quiz, module_id').eq('id', lesson_id).single();
    if (error || !lesson) return res.status(404).json({ error: 'Lesson not found' });

    const { data: purchase } = await supabase
      .from('course_purchases')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', lesson.module_id)
      .maybeSingle();
    if (!purchase) return res.status(403).json({ error: 'Course not purchased' });

    const quiz = lesson.quiz;
    const questions = quiz?.questions || [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (Number(answers[i]) === Number(q.correctIndex)) correct += 1;
    });
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= 60;
    const certificate_issued = passed && questions.length > 0;

    const { error: perr } = await supabase.from('user_progress').upsert(
      {
        user_id: req.user.id,
        lesson_id,
        completed_at: new Date().toISOString(),
        quiz_score: score,
        certificate_issued,
      },
      { onConflict: 'user_id,lesson_id' }
    );
    if (perr) throw perr;
    await evaluateRewards(req.user.id);

    return res.json({ score, passed, certificate_issued });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Quiz submit failed' });
  }
});

// ── GET /api/learning/user-level ─────────────────────────────────────────────
// Returns the highest difficulty learning module the user has fully completed.
router.get('/user-level', verifyToken, async (req, res) => {
  try {
    const { data: modules } = await supabase
      .from('learning_modules')
      .select('id, difficulty');

    const moduleIds = (modules || []).map(m => m.id);
    const completionMap = {};

    if (moduleIds.length > 0) {
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

    const LEVEL_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };
    let highestRank = 0;
    let highestLevel = null;

    for (const mod of modules || []) {
      if (!completionMap[mod.id]) continue;
      const rank = LEVEL_ORDER[mod.difficulty] ?? 0;
      if (rank > highestRank) { highestRank = rank; highestLevel = mod.difficulty; }
    }

    return res.json({ level: highestLevel });
  } catch (e) {
    console.error('user-level error:', e);
    return res.status(500).json({ error: 'Failed to compute user level' });
  }
});

// ── POST /api/learning/bypass-quiz ───────────────────────────────────────────
// 20-question bypass quiz. On pass (≥16/20) marks all module lessons complete.
const BYPASS_ANSWERS = [1, 2, 2, 3, 1, 2, 2, 1, 1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 3];

router.post('/bypass-quiz', verifyToken, async (req, res) => {
  try {
    const { module_id, answers } = req.body;
    if (!module_id || !Array.isArray(answers) || answers.length !== 20) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { data: mod } = await supabase
      .from('learning_modules')
      .select('id, difficulty')
      .eq('id', module_id)
      .maybeSingle();

    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (mod.difficulty !== 'beginner') return res.status(400).json({ error: 'Bypass quiz only available for beginner modules' });

    const score = answers.reduce((acc, ans, i) => acc + (ans === BYPASS_ANSWERS[i] ? 1 : 0), 0);
    const passed = score >= 16;

    if (passed) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', module_id);

      for (const lesson of lessons || []) {
        await supabase.from('user_progress').upsert(
          { user_id: req.user.id, lesson_id: lesson.id, completed_at: new Date().toISOString() },
          { onConflict: 'user_id,lesson_id' }
        );
      }
      await evaluateRewards(req.user.id);
    }

    return res.json({ passed, score, total: 20 });
  } catch (e) {
    console.error('bypass-quiz error:', e);
    return res.status(500).json({ error: 'Failed to process quiz' });
  }
});

export default router;
