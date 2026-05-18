import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

router.get('/modules', verifyToken, async (req, res) => {
  try {
    const { data: modules, error } = await supabase.from('learning_modules').select('*').order('order_index');
    if (error) throw error;
    const { data: lessons } = await supabase.from('lessons').select('id, module_id');
    const counts = {};
    for (const l of lessons || []) {
      counts[l.module_id] = (counts[l.module_id] || 0) + 1;
    }
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
    const { data: byId, error: e1 } = await supabase.from('learning_modules').select('*').eq('id', id).maybeSingle();
    if (e1) throw e1;
    if (byId) mod = byId;
    else {
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

    const { data: user, error: uerr } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', req.user.id)
      .single();
    if (uerr || !user) return res.status(404).json({ error: 'User not found' });

    const balance = Number(user.wallet_balance);
    const price = 1000;
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
    if (perr) throw perr;

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

    await evaluateRewards(req.user.id);
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

    const { data: lesson, error } = await supabase.from('lessons').select('quiz').eq('id', lesson_id).single();
    if (error || !lesson) return res.status(404).json({ error: 'Lesson not found' });
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

export default router;
