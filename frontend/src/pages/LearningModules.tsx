import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string;
  duration_minutes: number;
  lesson_count: number;
  completed_lessons: number;
  progress_pct: number;
};

type LessonRow = {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
  duration_minutes: number;
  quiz: { questions?: { id: string; prompt: string; options: string[]; correctIndex: number }[] } | null;
  completed: boolean;
  quiz_score: number | null;
  certificate_issued: boolean;
};

export default function LearningModules() {
  const { t } = useTranslation();
  const { moduleId } = useParams();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [detail, setDetail] = useState<{ module: ModuleRow; lessons: LessonRow[] } | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonRow | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; certificate_issued: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/learning/modules')
      .then((r) => setModules(r.data.modules))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!moduleId) {
      setDetail(null);
      setActiveLesson(null);
      return;
    }
    setLoading(true);
    api
      .get(`/api/learning/modules/${moduleId}`)
      .then((r) => {
        setDetail({ module: r.data.module, lessons: r.data.lessons });
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  async function markComplete(lessonId: string) {
    await api.post('/api/learning/progress', { lesson_id: lessonId });
    if (!moduleId) return;
    const r = await api.get(`/api/learning/modules/${moduleId}`);
    setDetail({ module: r.data.module, lessons: r.data.lessons });
    const m = await api.get('/api/learning/modules');
    setModules(m.data.modules);
  }

  async function submitQuiz(lessonId: string) {
    const r = await api.post('/api/learning/quiz', { lesson_id: lessonId, answers });
    setQuizResult(r.data);
    if (r.data.certificate_issued) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
    if (!moduleId) return;
    const d = await api.get(`/api/learning/modules/${moduleId}`);
    setDetail({ module: d.data.module, lessons: d.data.lessons });
    const m = await api.get('/api/learning/modules');
    setModules(m.data.modules);
  }

  if (!moduleId) {
    return (
      <SubpageShell>
        <h1 className="text-3xl font-bold">{t('learn_title')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('learn_sub')}</p>
        {loading ? (
          <p className="mt-8 text-gray-500 text-sm">{t('common_loading')}</p>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={`/learn/${mod.slug}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-infinder-lime/50 transition hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        mod.difficulty === 'beginner' ? 'bg-blue-100 text-blue-800' :
                        mod.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>{mod.difficulty}</span>
                      <h2 className="text-lg font-semibold mt-2">{mod.title}</h2>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{mod.description}</p>
                    </div>
                    <span className="text-2xl shrink-0">📘</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-infinder-green rounded-full transition-all" style={{ width: `${mod.progress_pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('learn_lessons_count', { done: mod.completed_lessons, total: mod.lesson_count, pct: mod.progress_pct })}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </SubpageShell>
    );
  }

  if (loading || !detail) {
    return (
      <SubpageShell>
        <p className="text-gray-500 text-sm">{t('learn_loading_module')}</p>
      </SubpageShell>
    );
  }

  const { module, lessons } = detail;

  return (
    <SubpageShell>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link to="/learn" className="underline">
          {t('learn_all_modules')}
        </Link>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <h1 className="text-2xl font-bold">{module.title}</h1>
      <p className="text-gray-600 text-sm mt-1">{module.description}</p>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">{t('learn_lessons_label')}</h2>
          {lessons.map((l, li) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setActiveLesson(l);
                setAnswers([]);
                setQuizResult(null);
              }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                activeLesson?.id === l.id
                  ? 'bg-infinder-lime/10 border border-infinder-lime/30'
                  : 'hover:bg-gray-100'
              }`}
            >
              {l.completed ? (
                <span className="w-6 h-6 rounded-full bg-infinder-green/20 flex items-center justify-center text-infinder-green text-xs shrink-0">✓</span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 shrink-0">{li + 1}</span>
              )}
              <span className="flex-1 text-sm font-medium text-left">{l.title}</span>
              <span className="text-xs text-gray-400 shrink-0">{l.duration_minutes}m</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 min-h-[320px]">
          {!activeLesson && <p className="text-gray-500 text-sm">{t('learn_select_lesson')}</p>}
          {activeLesson && (
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">{module.title}</p>
              <h3 className="text-2xl font-bold">{activeLesson.title}</h3>
              <p className="text-gray-700 text-sm mt-4 leading-relaxed whitespace-pre-wrap">{activeLesson.content}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markComplete(activeLesson.id)}
                  className="rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2.5 text-sm"
                >
                  {t('learn_mark_complete')}
                </button>
              </div>

              {activeLesson.quiz?.questions && activeLesson.quiz.questions.length > 0 && (
                <div className="mt-10 border-t border-gray-100 pt-8">
                  <h4 className="font-semibold">{t('learn_quick_check')}</h4>
                  <p className="text-xs text-gray-500 mt-1">{t('learn_pass_msg')}</p>
                  <div className="mt-4 space-y-6">
                    {activeLesson.quiz.questions.map((q, qi) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium">{q.prompt}</p>
                        <div className="mt-2 space-y-2">
                          {q.options.map((opt, oi) => (
                            <label
                              key={oi}
                              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:border-infinder-lime/50 transition ${
                                answers[qi] === oi ? 'border-infinder-lime bg-infinder-lime/5' : 'border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={answers[qi] === oi}
                                onChange={() => {
                                  const next = [...answers];
                                  next[qi] = oi;
                                  setAnswers(next);
                                }}
                                className="accent-infinder-lime"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={answers.length < (activeLesson.quiz.questions?.length || 0)}
                    onClick={() => submitQuiz(activeLesson.id)}
                    className="mt-6 rounded-full bg-infinder-black text-white font-medium px-5 py-2 text-sm disabled:opacity-40"
                  >
                    {t('learn_submit_quiz')}
                  </button>
                  {quizResult && (
                    <div className={`mt-4 rounded-xl p-4 text-sm font-medium flex items-start gap-2 ${
                      quizResult.passed ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {quizResult.passed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <div>
                        {t('learn_score')} <strong>{quizResult.score}%</strong> — {quizResult.passed ? t('learn_passed') : t('learn_try_again')}
                        {quizResult.certificate_issued && (
                          <span className="block mt-2 text-infinder-green font-semibold">{t('learn_certificate')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SubpageShell>
  );
}
