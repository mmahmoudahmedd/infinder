import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
  lessons: number;
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
    lessons: 5,
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
    lessons: 5,
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
    lessons: 5,
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

function IcHome({ active }: { active?: boolean }) {
  const c = active ? '#22c55e' : '#9ca3af';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IcLearn({ active }: { active?: boolean }) {
  const c = active ? '#22c55e' : '#9ca3af';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function IcTrade({ active }: { active?: boolean }) {
  const c = active ? '#22c55e' : '#9ca3af';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IcInvest({ active }: { active?: boolean }) {
  const c = active ? '#22c55e' : '#9ca3af';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IcArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

function IcCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
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

function IcDots() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" stroke="none">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────

function BottomNavBar({
  onHome,
  onLearn,
  onTrade,
  onInvest,
}: {
  onHome: () => void;
  onLearn: () => void;
  onTrade: () => void;
  onInvest: () => void;
}) {
  const items = [
    { id: 'home',   label: 'Home',   icon: <IcHome />,   activeIcon: <IcHome active />,   fn: onHome },
    { id: 'learn',  label: 'Learn',  icon: <IcLearn />,  activeIcon: <IcLearn active />,  fn: onLearn },
    { id: 'trade',  label: 'Trade',  icon: <IcTrade />,  activeIcon: <IcTrade active />,  fn: onTrade },
    { id: 'invest', label: 'Invest', icon: <IcInvest />, activeIcon: <IcInvest active />, fn: onInvest },
  ];

  return (
    <nav
      className="bg-white border-t border-gray-200 flex justify-around shrink-0"
      role="navigation"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const isActive = item.id === 'learn';
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.fn}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 px-4 py-3 min-w-[56px] transition-colors cursor-pointer ${
              isActive ? 'text-[#22c55e]' : 'text-gray-400'
            }`}
          >
            {isActive ? item.activeIcon : item.icon}
            <span className="text-[10px] font-semibold leading-none tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Screen 1: Hub ──────────────────────────────────────────────────────────

function HubScreen({ onStartCourse }: { onStartCourse: (course: Course) => void }) {
  return (
    <div className="px-4 pt-7 pb-6">
      <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Learning Hub</h1>
      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
        Master investment strategies with interactive courses.
      </p>

      <div className="mt-6 space-y-4">
        {COURSES.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.22, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="relative h-44 overflow-hidden" style={{ backgroundColor: course.color }}>
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 75% 15%, rgba(255,255,255,0.18) 0%, transparent 65%)' }}
              />
              <span className="absolute bottom-3 left-3 bg-gray-900/75 text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                {course.category}
              </span>
            </div>

            <div className="px-4 pt-3 pb-4">
              <p className="text-[11px] font-bold text-[#22c55e] tracking-widest uppercase">
                {course.category}
              </p>
              <h3 className="text-[15px] font-bold text-gray-900 mt-0.5 leading-snug">
                {course.title}
              </h3>
              <button
                type="button"
                onClick={() => onStartCourse(course)}
                className="mt-3 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                <IcPlay size={13} color="#374151" />
                Start Course
              </button>
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
    <div className="pb-4">
      <div className="px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 min-h-[44px] pr-2 hover:text-gray-900 transition-colors"
          aria-label="Back to courses"
        >
          <IcArrowLeft />
          <span>Back to Courses</span>
        </button>
      </div>

      <div className="mx-4 rounded-2xl overflow-hidden relative" style={{ height: 216 }}>
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 30% 30%, ${course.color}20 0%, transparent 70%)` }}
        />

        {currentLesson && (
          <div className="absolute top-4 left-4 z-10">
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
            className="w-[64px] h-[64px] bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform pl-1"
          >
            <IcPlay size={26} color="#1f2937" />
          </button>
        </div>

        {currentLesson && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-4 pt-8 pb-4 z-10">
            <p className="text-white text-sm font-semibold">{currentLesson.title}</p>
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>

        <div className="mt-3 flex items-center gap-5 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <IcBook />
            {course.lessons} Lessons
          </span>
          <span className="flex items-center gap-1.5">
            <IcClock />
            {course.totalTime} Total
          </span>
        </div>

        <div className="mt-4">
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

        <div className="mt-5 h-px bg-gray-100" />

        <h3 className="mt-5 text-sm font-bold text-gray-900">Course Overview</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{course.overview}</p>

        <button
          type="button"
          onClick={onViewCurriculum}
          className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: '#22c55e' }}
        >
          View Curriculum
        </button>
      </div>
    </div>
  );
}

// ── Screen 3: Curriculum ───────────────────────────────────────────────────

function CurriculumScreen({ course, onBack }: { course: Course; onBack: () => void }) {
  const completedCount = course.curriculum.filter((l) => l.status === 'completed').length;
  const pct = Math.round((completedCount / course.curriculum.length) * 100);

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors -ml-1"
        >
          <IcArrowLeft />
        </button>
        <button
          type="button"
          aria-label="More options"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <IcDots />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Curriculum</h2>
          <span className="text-sm font-bold text-[#22c55e]">{pct}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-3">Your Progress: {pct}%</p>
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

      <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        {course.curriculum.map((lesson, i) => (
          <div key={lesson.id}>
            {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
            <div
              className={`flex items-center gap-3 px-4 py-4 transition-colors ${
                lesson.status === 'current'
                  ? 'border-l-[3px] border-[#22c55e] bg-green-50/60 pl-[13px]'
                  : lesson.status === 'completed'
                  ? 'hover:bg-gray-50'
                  : 'opacity-60'
              }`}
            >
              {lesson.status === 'completed' ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <IcCheck />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lesson.status === 'current' ? '#22c55e' : '#f3f4f6' }}
                >
                  <IcPlay
                    size={13}
                    color={lesson.status === 'current' ? 'white' : '#9ca3af'}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-snug ${
                    lesson.status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {lesson.title}
                </p>
              </div>

              <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                {lesson.duration}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide variants ─────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (dir: number) => ({
    x: dir * -32,
    opacity: 0,
    transition: { duration: 0.16, ease: [0.55, 0, 1, 0.45] as const },
  }),
};

// ── Root ───────────────────────────────────────────────────────────────────

export default function LearningHub() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<CurrentView>('hub');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumItem | null>(null);
  const dir = useRef(1);

  function goTo(to: CurrentView, forward = true) {
    dir.current = forward ? 1 : -1;
    setCurrentView(to);
  }

  function handleStartCourse(course: Course) {
    setSelectedCourse(course);
    goTo('courseDetail', true);
  }

  function handleBackToHub() {
    setSelectedCourse(null);
    goTo('hub', false);
  }

  // selectedLesson is part of the state contract for future lesson-player integration
  void selectedLesson;

  return (
    <div
      className="h-dvh w-full max-w-[390px] mx-auto flex flex-col overflow-hidden"
      style={{ background: '#f5f5f5' }}
    >
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{ scrollbarWidth: 'none' }}
      >
        <AnimatePresence mode="wait" custom={dir.current} initial={false}>
          {currentView === 'hub' && (
            <motion.div
              key="hub"
              custom={dir.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <HubScreen onStartCourse={handleStartCourse} />
            </motion.div>
          )}

          {currentView === 'courseDetail' && selectedCourse && (
            <motion.div
              key="courseDetail"
              custom={dir.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <DetailScreen
                course={selectedCourse}
                onBack={handleBackToHub}
                onViewCurriculum={() => goTo('curriculum', true)}
              />
            </motion.div>
          )}

          {currentView === 'curriculum' && selectedCourse && (
            <motion.div
              key="curriculum"
              custom={dir.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <CurriculumScreen
                course={selectedCourse}
                onBack={() => goTo('courseDetail', false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNavBar
        onHome={() => navigate('/dashboard')}
        onLearn={() => goTo('hub')}
        onTrade={() => navigate('/invest')}
        onInvest={() => navigate('/invest')}
      />
    </div>
  );
}
