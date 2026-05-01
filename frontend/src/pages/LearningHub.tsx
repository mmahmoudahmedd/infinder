import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubpageShell } from '../components/AppShell';

// ── Types ──────────────────────────────────────────────────────────────────

type CurrentView = 'hub' | 'courseDetail' | 'curriculum';
type LessonStatus = 'completed' | 'current' | 'locked';

interface CurriculumItem {
  id: number;
  title: string;
  duration: string;
  status: LessonStatus;
}

interface Course {
  id: number;
  category: string;
  title: string;
  price: number;
  totalTime: string;
  overview: string;
  color: string;
  curriculum: CurriculumItem[];
}

// ── Data ───────────────────────────────────────────────────────────────────

const COURSES: Course[] = [
  {
    id: 1,
    category: 'Startups',
    title: 'Startup Investing & Venture Capital',
    price: 299,
    totalTime: '3h 20m',
    overview:
      'Discover how venture capital fuels innovation. Learn how early-stage investors evaluate startups, structure deals, and manage risk across a diversified portfolio.',
    color: '#22c55e',
    curriculum: [
      { id: 1, title: 'Introduction to Venture Capital', duration: '20m', status: 'completed' },
      { id: 2, title: 'Deal Flow & Due Diligence', duration: '45m', status: 'completed' },
      { id: 3, title: 'Term Sheets & Valuations', duration: '50m', status: 'current' },
      { id: 4, title: 'Portfolio Construction', duration: '55m', status: 'locked' },
      { id: 5, title: 'Exit Strategies & Returns', duration: '30m', status: 'locked' },
    ],
  },
  {
    id: 2,
    category: 'Real Estate',
    title: 'Real Estate Investment Fundamentals',
    price: 199,
    totalTime: '4h 10m',
    overview:
      'Build a foundation in property investment. Understand how to analyze markets, evaluate yields, and leverage financing to grow a real estate portfolio.',
    color: '#3b82f6',
    curriculum: [
      { id: 1, title: 'Types of Real Estate Assets', duration: '25m', status: 'completed' },
      { id: 2, title: 'Market Analysis Basics', duration: '40m', status: 'current' },
      { id: 3, title: 'Financing & Leverage', duration: '55m', status: 'locked' },
      { id: 4, title: 'Rental Yield Calculations', duration: '50m', status: 'locked' },
      { id: 5, title: 'Risk Mitigation Strategies', duration: '1h 20m', status: 'locked' },
    ],
  },
  {
    id: 3,
    category: 'Investment',
    title: 'Introduction to Investing',
    price: 149,
    totalTime: '3h 40m',
    overview:
      'Explore advanced financial markets mechanics including derivative instruments, risk assessment frameworks, and strategic portfolio construction for navigating complex investment landscapes.',
    color: '#8b5cf6',
    curriculum: [
      { id: 1, title: 'Introduction to Core Concepts', duration: '15m', status: 'completed' },
      { id: 2, title: 'Understanding Market Cycles', duration: '45m', status: 'completed' },
      { id: 3, title: 'Risk Management Protocols', duration: '35m', status: 'current' },
      { id: 4, title: 'Advanced Order Types', duration: '55m', status: 'locked' },
      { id: 5, title: 'Portfolio Allocation Strategy', duration: '1h 10m', status: 'locked' },
    ],
  },
];

// ── SVG Icons ──────────────────────────────────────────────────────────────

function IcArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IcPlay({ size = 20, color = '#22c55e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={0}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IcCheck({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IcClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IcBook() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20l-7-3-7 3V2z" />
    </svg>
  );
}

function IcCertificate() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
    </svg>
  );
}

function IcInfinity() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 000 8c2 0 4-1.5 6-4z" />
      <path d="M12 12c2 2.5 4 4 6 4a4 4 0 000-8c-2 0-4 1.5-6 4z" />
    </svg>
  );
}

// ── Fade transition ────────────────────────────────────────────────────────

const fade = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

// ── Screen 1: Hub ──────────────────────────────────────────────────────────

function HubScreen({ onEnroll }: { onEnroll: (course: Course) => void }) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Learning Hub</h1>
        <p className="text-gray-500 mt-1 text-sm">Master investment strategies with expert-led courses.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.22, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
          >
            {/* Coloured banner */}
            <div className="relative h-40 overflow-hidden" style={{ backgroundColor: course.color }}>
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 75% 15%, rgba(255,255,255,0.18) 0%, transparent 65%)' }}
              />
              <span className="absolute bottom-3 left-3 bg-gray-900/75 text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                {course.category}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              <p className="text-[11px] font-bold text-[#22c55e] tracking-widest uppercase">
                {course.category}
              </p>
              <h3 className="text-[15px] font-bold text-gray-900 mt-0.5 leading-snug flex-1">
                {course.title}
              </h3>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><IcBook />{course.curriculum.length} lessons</span>
                <span className="flex items-center gap-1"><IcClock />{course.totalTime}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">${course.price}</span>
                <button
                  type="button"
                  onClick={() => onEnroll(course)}
                  className="rounded-xl bg-[#22c55e] text-white text-sm font-bold px-4 py-2.5 hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  Enroll Now
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Screen 2: Course Detail ────────────────────────────────────────────────

function DetailScreen({
  course,
  onBack,
  onViewCurriculum,
}: {
  course: Course;
  onBack: () => void;
  onViewCurriculum: () => void;
}) {
  const currentLesson = course.curriculum.find((l) => l.status === 'current');
  const completedCount = course.curriculum.filter((l) => l.status === 'completed').length;
  const pct = Math.round((completedCount / course.curriculum.length) * 100);

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <IcArrowLeft />
        Back to courses
      </button>

      {/* Hero banner */}
      <div className="rounded-2xl overflow-hidden relative mb-6" style={{ height: 260 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }} />
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 30% 30%, ${course.color}20 0%, transparent 70%)` }}
        />
        {currentLesson && (
          <div className="absolute top-5 left-5 z-10">
            <span className="bg-[#22c55e] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
              Current Lesson
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            type="button"
            onClick={onViewCurriculum}
            aria-label="Play current lesson"
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform pl-1"
          >
            <IcPlay size={26} color="#1f2937" />
          </button>
        </div>
        {currentLesson && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 pt-8 pb-5 z-10">
            <p className="text-white text-sm font-semibold">{currentLesson.title}</p>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-3 gap-6 items-start">

        {/* Left: info + overview */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-[11px] font-bold text-[#22c55e] tracking-widest uppercase mb-1">
              {course.category}
            </p>
            <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>

            <div className="mt-4 flex items-center gap-5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <IcBook />{course.curriculum.length} Lessons
              </span>
              <span className="flex items-center gap-1.5">
                <IcClock />{course.totalTime} Total
              </span>
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Your Progress</span>
                <span className="text-xs font-bold text-[#22c55e]">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#22c55e' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>

            <div className="mt-6 h-px bg-gray-100" />

            <h2 className="mt-6 font-bold text-gray-900">Course Overview</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{course.overview}</p>
          </div>
        </div>

        {/* Right: pricing card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
          <p className="text-3xl font-bold text-gray-900">${course.price}</p>
          <p className="text-sm text-gray-400 mt-0.5">One-time payment · Lifetime access</p>

          <button
            type="button"
            onClick={onViewCurriculum}
            className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white bg-[#22c55e] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Enroll & Start Learning
          </button>
          <button
            type="button"
            onClick={onViewCurriculum}
            className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Curriculum
          </button>

          <ul className="mt-5 space-y-2.5 text-sm text-gray-600">
            {[
              { icon: <IcBook />,         text: `${course.curriculum.length} lessons` },
              { icon: <IcClock />,        text: `${course.totalTime} of content` },
              { icon: <IcInfinity />,     text: 'Lifetime access' },
              { icon: <IcCertificate />,  text: 'Certificate of completion' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="text-[#22c55e]">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Curriculum ───────────────────────────────────────────────────

function CurriculumScreen({ course, onBack }: { course: Course; onBack: () => void }) {
  const completedCount = course.curriculum.filter((l) => l.status === 'completed').length;
  const pct = Math.round((completedCount / course.curriculum.length) * 100);

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <IcArrowLeft />
        Back to course
      </button>

      {/* Progress card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{course.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your Progress: {pct}%</p>
          </div>
          <span className="text-lg font-bold text-[#22c55e]">{pct}%</span>
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: '#22c55e' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          />
        </div>
      </div>

      {/* Lesson list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {course.curriculum.map((lesson, i) => (
          <div key={lesson.id}>
            {i > 0 && <div className="h-px bg-gray-100 mx-5" />}
            <div
              className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                lesson.status === 'current'
                  ? 'border-l-[3px] border-[#22c55e] bg-green-50/60 pl-[17px]'
                  : lesson.status === 'completed'
                  ? 'hover:bg-gray-50'
                  : 'opacity-60'
              }`}
            >
              {lesson.status === 'completed' ? (
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <IcCheck size={14} />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lesson.status === 'current' ? '#22c55e' : '#f3f4f6' }}
                >
                  <IcPlay size={14} color={lesson.status === 'current' ? 'white' : '#9ca3af'} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${lesson.status === 'locked' ? 'text-gray-400' : 'text-gray-900'}`}>
                  {lesson.title}
                </p>
              </div>

              <span className="text-xs text-gray-400 shrink-0 tabular-nums">{lesson.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function LearningHub() {
  const [currentView, setCurrentView] = useState<CurrentView>('hub');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumItem | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- state contract for future lesson-player
  void setSelectedLesson;

  return (
    <SubpageShell>
      <AnimatePresence mode="wait">
        {currentView === 'hub' && (
          <motion.div key="hub" variants={fade} initial="enter" animate="center" exit="exit">
            <HubScreen
              onEnroll={(course) => {
                setSelectedCourse(course);
                setCurrentView('courseDetail');
              }}
            />
          </motion.div>
        )}

        {currentView === 'courseDetail' && selectedCourse && (
          <motion.div key="courseDetail" variants={fade} initial="enter" animate="center" exit="exit">
            <DetailScreen
              course={selectedCourse}
              onBack={() => {
                setSelectedCourse(null);
                setCurrentView('hub');
              }}
              onViewCurriculum={() => setCurrentView('curriculum')}
            />
          </motion.div>
        )}

        {currentView === 'curriculum' && selectedCourse && (
          <motion.div key="curriculum" variants={fade} initial="enter" animate="center" exit="exit">
            <CurriculumScreen
              course={selectedCourse}
              onBack={() => setCurrentView('courseDetail')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </SubpageShell>
  );
}
