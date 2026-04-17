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
