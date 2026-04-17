import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
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
        <h1 className="text-3xl font-bold">Learning modules</h1>
        <p className="text-gray-600 text-sm mt-1">Short lessons with quick checks — learn at your pace.</p>
        {loading ? (
          <p className="mt-8 text-gray-500 text-sm">Loading…</p>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <Link
                key={mod.id}
                to={`/learn/${mod.slug}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition hover:-translate-y-0.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs uppercase text-gray-500">{mod.difficulty}</span>
                    <h2 className="text-lg font-semibold mt-1">{mod.title}</h2>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{mod.description}</p>
                  </div>
                  <span className="text-2xl">📘</span>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-infinder-green rounded-full transition-all" style={{ width: `${mod.progress_pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {mod.completed_lessons}/{mod.lesson_count} lessons · {mod.progress_pct}% complete
                </p>
              </Link>
            ))}
          </div>
        )}
      </SubpageShell>
    );
  }

  if (loading || !detail) {
    return (
      <SubpageShell>
        <p className="text-gray-500 text-sm">Loading module…</p>
      </SubpageShell>
    );
  }

  const { module, lessons } = detail;

  return (
    <SubpageShell>
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link to="/learn" className="underline">
          All modules
        </Link>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <h1 className="text-2xl font-bold">{module.title}</h1>
      <p className="text-gray-600 text-sm mt-1">{module.description}</p>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Lessons</h2>
          {lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setActiveLesson(l);
                setAnswers([]);
                setQuizResult(null);
              }}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                activeLesson?.id === l.id ? 'border-infinder-green bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{l.title}</span>
                {l.completed && <span className="text-emerald-600 text-xs">Done</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{l.duration_minutes} min</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 min-h-[320px]">
          {!activeLesson && <p className="text-gray-500 text-sm">Select a lesson to begin.</p>}
          {activeLesson && (
            <div>
              <h3 className="text-xl font-semibold">{activeLesson.title}</h3>
              <p className="text-gray-700 text-sm mt-4 whitespace-pre-wrap">{activeLesson.content}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markComplete(activeLesson.id)}
                  className="rounded-full bg-infinder-lime text-infinder-black font-medium px-4 py-2 text-sm"
                >
                  Mark lesson complete
                </button>
              </div>

              {activeLesson.quiz?.questions && activeLesson.quiz.questions.length > 0 && (
                <div className="mt-10 border-t border-gray-100 pt-8">
                  <h4 className="font-semibold">Quick check</h4>
                  <p className="text-xs text-gray-500 mt-1">Pass at 60%+ to unlock a certificate banner.</p>
                  <div className="mt-4 space-y-6">
                    {activeLesson.quiz.questions.map((q, qi) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium">{q.prompt}</p>
                        <div className="mt-2 space-y-2">
                          {q.options.map((opt, oi) => (
                            <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                checked={answers[qi] === oi}
                                onChange={() => {
                                  const next = [...answers];
                                  next[qi] = oi;
                                  setAnswers(next);
                                }}
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
                    Submit quiz
                  </button>
                  {quizResult && (
                    <p className="mt-4 text-sm">
                      Score: <strong>{quizResult.score}%</strong> — {quizResult.passed ? 'Passed' : 'Try again'}
                      {quizResult.certificate_issued && (
                        <span className="block mt-2 text-infinder-green font-semibold">🎓 Certificate unlocked!</span>
                      )}
                    </p>
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
