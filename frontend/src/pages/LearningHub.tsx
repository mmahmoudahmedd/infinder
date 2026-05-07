import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showAlert, showToast } from '../lib/swal';

// ── Types ──────────────────────────────────────────────────────────────────

type CurrentView = 'hub' | 'courseDetail' | 'lessonView';
type LevelId = 'beginner' | 'intermediate' | 'advanced';

interface Lesson {
  id: number;
  title: string;
  duration: string;
  videoId: string;
}

interface Level {
  id: LevelId;
  label: string;
  lessons: Lesson[];
}

interface Course {
  id: number;
  category: string;
  title: string;
  price: number;
  totalTime: string;
  overview: string;
  color: string;
  image: string;
  levels: Level[];
}

// ── Progress / Enrollment (localStorage-backed) ───────────────────────────

const STORAGE_KEY = 'infinder_learning_progress';
const ENROLLED_KEY = 'infinder_enrolled_courses';

function lessonKey(courseId: number, levelId: LevelId, lessonId: number): string {
  return `${courseId}:${levelId}:${lessonId}`;
}

function loadCompleted(): Set<string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? new Set<string>(JSON.parse(s) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompleted(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function loadEnrolled(): Set<number> {
  try {
    const s = localStorage.getItem(ENROLLED_KEY);
    return s ? new Set<number>(JSON.parse(s) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveEnrolled(set: Set<number>) {
  try { localStorage.setItem(ENROLLED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function courseProgress(course: Course, completed: Set<string>): number {
  const total = course.levels.reduce((s, l) => s + l.lessons.length, 0);
  if (!total) return 0;
  const done = course.levels.reduce(
    (s, l) => s + l.lessons.filter(ls => completed.has(lessonKey(course.id, l.id, ls.id))).length,
    0,
  );
  return Math.round((done / total) * 100);
}

function levelProgress(course: Course, levelId: LevelId, completed: Set<string>): number {
  const level = course.levels.find(l => l.id === levelId);
  if (!level?.lessons.length) return 0;
  const done = level.lessons.filter(ls => completed.has(lessonKey(course.id, levelId, ls.id))).length;
  return Math.round((done / level.lessons.length) * 100);
}

// ── Data ───────────────────────────────────────────────────────────────────

const COURSES: Course[] = [
  {
    id: 1,
    category: 'Startups',
    title: 'Startup Investing & Venture Capital',
    price: 299,
    totalTime: '6h 45m',
    overview:
      'Discover how venture capital fuels innovation. Learn how early-stage investors evaluate startups, structure deals, and manage risk across a diversified portfolio.',
    color: '#22c55e',
    image: 'https://i.pinimg.com/1200x/78/af/94/78af94689cca8a224bfe8274725fb767.jpg',
    levels: [
      {
        id: 'beginner',
        label: 'Beginner',
        lessons: [
          { id: 1, title: 'What is Venture Capital?', duration: '15m', videoId: '1qy1GX6gugw' },
          { id: 2, title: 'What is a Startup?', duration: '20m', videoId: 'gA2lb0W7Qi8' },
          { id: 3, title: 'Equity 101', duration: '25m', videoId: 'ji3H1t9ZqvQ' },
          { id: 4, title: 'Cap Tables Explained', duration: '20m', videoId: 'W_r4Uq4E8GE' },
        ],
      },
      {
        id: 'intermediate',
        label: 'Intermediate',
        lessons: [
          { id: 1, title: 'Deal Flow & Sourcing', duration: '35m', videoId: 'I6uxOktTRE0' },
          { id: 2, title: 'Due Diligence Process', duration: '45m', videoId: 'O69c82yhSr0' },
          { id: 3, title: 'Term Sheets & Valuations', duration: '50m', videoId: 'YV-ddY5AN50' },
          { id: 4, title: 'Portfolio Construction', duration: '40m', videoId: 'JUr6xa7-a4I' },
        ],
      },
      {
        id: 'advanced',
        label: 'Advanced',
        lessons: [
          { id: 1, title: 'Exit Strategies & M&A', duration: '45m', videoId: 'Xt6nrONHVbQ' },
          { id: 2, title: 'LP/GP Dynamics', duration: '40m', videoId: 'kFtqLRfWXt0' },
          { id: 3, title: 'Carry & Fund Economics', duration: '35m', videoId: 'n1bwGuW7Nqk' },
          { id: 4, title: 'Secondary Markets', duration: '35m', videoId: 'rHOo2Utr4Xc' },
        ],
      },
    ],
  },
  {
    id: 2,
    category: 'Real Estate',
    title: 'Real Estate Investment Fundamentals',
    price: 199,
    totalTime: '7h 10m',
    overview:
      'Build a foundation in property investment. Understand how to analyze markets, evaluate yields, and leverage financing to grow a real estate portfolio.',
    color: '#3b82f6',
    image: 'https://i.pinimg.com/1200x/11/7a/55/117a550a41583be8a579e1333f795aad.jpg',
    levels: [
      {
        id: 'beginner',
        label: 'Beginner',
        lessons: [
          { id: 1, title: 'Types of Properties', duration: '20m', videoId: 'OKuSNm3apCs' },
          { id: 2, title: 'Understanding Markets', duration: '25m', videoId: 'shJd65HpqDg' },
          { id: 3, title: 'Basic Financing Concepts', duration: '30m', videoId: 'gagJf0XIkKw' },
          { id: 4, title: 'ROI Basics', duration: '20m', videoId: 'nhLhEwYSvsg' },
        ],
      },
      {
        id: 'intermediate',
        label: 'Intermediate',
        lessons: [
          { id: 1, title: 'Rental Yield Analysis', duration: '40m', videoId: '4EyeoYQlxeA' },
          { id: 2, title: 'Leveraged Purchases', duration: '45m', videoId: 'HLQvI3SNwvk' },
          { id: 3, title: 'Commercial vs Residential', duration: '35m', videoId: 'ZbtIGBtRxxQ' },
          { id: 4, title: 'Market Deep Dive', duration: '50m', videoId: 'x8D7raX1O5w' },
        ],
      },
      {
        id: 'advanced',
        label: 'Advanced',
        lessons: [
          { id: 1, title: 'REITs & Property Funds', duration: '45m', videoId: 'KwhfiIzx96g' },
          { id: 2, title: 'Tax Optimization Strategies', duration: '40m', videoId: '0yNYqWLmo5I' },
          { id: 3, title: 'Portfolio Diversification', duration: '35m', videoId: 'fcC6m-0dguE' },
          { id: 4, title: 'Risk Mitigation', duration: '45m', videoId: '-2vJgt2lLD8' },
        ],
      },
    ],
  },
  {
    id: 3,
    category: 'Investment',
    title: 'Introduction to Investing',
    price: 149,
    totalTime: '7h 25m',
    overview:
      'Explore financial markets mechanics including derivative instruments, risk assessment frameworks, and strategic portfolio construction for navigating complex investment landscapes.',
    color: '#8b5cf6',
    image: 'https://i.pinimg.com/736x/b7/89/7e/b7897e9d112634c5428994643408c5b3.jpg',
    levels: [
      {
        id: 'beginner',
        label: 'Beginner',
        lessons: [
          { id: 1, title: 'Stock Market Basics', duration: '20m', videoId: 'bb6_M_srMBk' },
          { id: 2, title: 'Bonds & Fixed Income', duration: '25m', videoId: 'BgEZn-HJNb4' },
          { id: 3, title: 'ETFs & Index Funds', duration: '20m', videoId: 'hE2NsJGpEq4' },
          { id: 4, title: 'Risk vs Return', duration: '20m', videoId: 'ktpeNzqEVCs' },
        ],
      },
      {
        id: 'intermediate',
        label: 'Intermediate',
        lessons: [
          { id: 1, title: 'Portfolio Theory', duration: '40m', videoId: 'YtrMGKLRtwA' },
          { id: 2, title: 'Asset Allocation', duration: '45m', videoId: 'QTgvWPAihIc' },
          { id: 3, title: 'Technical Analysis Basics', duration: '50m', videoId: 'W8OjEjASfBo' },
          { id: 4, title: 'Understanding Market Cycles', duration: '40m', videoId: '9YdPQizV0xQ' },
        ],
      },
      {
        id: 'advanced',
        label: 'Advanced',
        lessons: [
          { id: 1, title: 'Options & Derivatives', duration: '55m', videoId: 'N4m-2Ng__Eg' },
          { id: 2, title: 'Factor Investing', duration: '45m', videoId: 'balyUmSLq8g' },
          { id: 3, title: 'Macro Economics & Markets', duration: '40m', videoId: 'PlZNbY45iPk' },
          { id: 4, title: 'Alternative Investments', duration: '45m', videoId: 'nrkLMCWnnYU' },
        ],
      },
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

function IcCheck({ size = 13, color = '#22c55e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IcChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IcClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IcBook() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20l-7-3-7 3V2z" />
    </svg>
  );
}

function IcInfinity() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 000 8c2 0 4-1.5 6-4z" />
      <path d="M12 12c2 2.5 4 4 6 4a4 4 0 000-8c-2 0-4 1.5-6 4z" />
    </svg>
  );
}

function IcCertificate() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85" />
    </svg>
  );
}

// ── Fade transition ────────────────────────────────────────────────────────

const fade = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

// ── Level badge colours ────────────────────────────────────────────────────

const LEVEL_COLORS: Record<LevelId, { bg: string; text: string }> = {
  beginner:     { bg: '#dcfce7', text: '#15803d' },
  intermediate: { bg: '#dbeafe', text: '#1d4ed8' },
  advanced:     { bg: '#ede9fe', text: '#6d28d9' },
};

// ── Screen 1: Hub ──────────────────────────────────────────────────────────

function HubScreen({
  enrolled,
  onEnroll,
  completed,
}: {
  enrolled: Set<number>;
  onEnroll: (course: Course) => void;
  completed: Set<string>;
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Learning Hub</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Master investment strategies with expert-led courses. Three skill levels per course.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course, i) => {
          const pct = courseProgress(course, completed);
          const totalLessons = course.levels.reduce((s, l) => s + l.lessons.length, 0);
          const isEnrolled = enrolled.has(course.id);

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.22, ease: 'easeOut' }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
            >
              {/* Course image banner */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/35" />
                <span className="absolute bottom-3 left-3 bg-gray-900/75 text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                  {course.category}
                </span>
                {/* Level badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                  {course.levels.map(l => (
                    <span
                      key={l.id}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: LEVEL_COLORS[l.id].bg, color: LEVEL_COLORS[l.id].text }}
                    >
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <p className="text-[11px] font-bold text-[#22c55e] tracking-widest uppercase">
                  {course.category}
                </p>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mt-0.5 leading-snug flex-1">
                  {course.title}
                </h3>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1"><IcBook />{totalLessons} lessons</span>
                  <span className="flex items-center gap-1"><IcClock />{course.totalTime}</span>
                </div>

                {/* Progress bar if started */}
                {pct > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 dark:text-gray-500">Progress</span>
                      <span className="font-semibold text-[#22c55e]">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#22c55e] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">${course.price}</span>
                  <button
                    type="button"
                    onClick={() => onEnroll(course)}
                    className="rounded-xl text-sm font-bold px-4 py-2.5 transition-opacity"
                    style={{ backgroundColor: course.color, color: 'white' }}
                  >
                    {isEnrolled ? 'Continue' : 'Enroll Now'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Screen 2: Course Detail ────────────────────────────────────────────────

function DetailScreen({
  course,
  enrolled,
  completed,
  activeLevel,
  onSetActiveLevel,
  onBack,
  onOpenLesson,
  onEnroll,
}: {
  course: Course;
  enrolled: Set<number>;
  completed: Set<string>;
  activeLevel: LevelId;
  onSetActiveLevel: (id: LevelId) => void;
  onBack: () => void;
  onOpenLesson: (lesson: Lesson, level: Level) => void;
  onEnroll: (course: Course) => void;
}) {
  const pct = courseProgress(course, completed);
  const activeLevelData = course.levels.find(l => l.id === activeLevel)!;
  const isEnrolled = enrolled.has(course.id);

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
      >
        <IcArrowLeft />
        Back to courses
      </button>

      {/* Hero banner with course image */}
      <div className="rounded-2xl overflow-hidden relative mb-6" style={{ height: 220 }}>
        <img
          src={course.image}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-12 pb-5">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{course.category}</p>
          <h1 className="text-white text-xl font-bold leading-snug">{course.title}</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-3 gap-6 items-start">

        {/* Left: overview + levels + lessons */}
        <div className="md:col-span-2 space-y-5">

          {/* Overview + overall progress */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <IcBook />{course.levels.reduce((s, l) => s + l.lessons.length, 0)} lessons
              </span>
              <span className="text-gray-200 dark:text-gray-700">·</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <IcClock />{course.totalTime}
              </span>
              <span className="text-gray-200 dark:text-gray-700">·</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">3 levels</span>
            </div>

            {/* Overall progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</span>
                <span className="text-xs font-bold text-[#22c55e]">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#22c55e' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-5 h-px bg-gray-100 dark:bg-gray-800" />
            <p className="mt-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{course.overview}</p>
          </div>

          {/* Level tabs + lessons */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Tab row */}
            <div className="flex border-b border-gray-100 dark:border-gray-800">
              {course.levels.map(level => {
                const lPct = levelProgress(course, level.id, completed);
                const isActive = level.id === activeLevel;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => onSetActiveLevel(level.id)}
                    className={`flex-1 py-3.5 px-3 text-sm font-semibold transition-colors relative ${
                      isActive
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <span
                      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mr-1.5"
                      style={{
                        backgroundColor: isActive ? LEVEL_COLORS[level.id].bg : '#f3f4f6',
                        color: isActive ? LEVEL_COLORS[level.id].text : '#9ca3af',
                      }}
                    >
                      {level.label}
                    </span>
                    {lPct > 0 && (
                      <span className="text-xs" style={{ color: LEVEL_COLORS[level.id].text }}>{lPct}%</span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: LEVEL_COLORS[level.id].text }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lesson list */}
            <div>
              {activeLevelData.lessons.map((lesson, i) => {
                const key = lessonKey(course.id, activeLevel, lesson.id);
                const isDone = completed.has(key);
                return (
                  <div key={lesson.id}>
                    {i > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />}
                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson, activeLevelData)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                    >
                      {isDone ? (
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <IcCheck size={14} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <IcPlay size={13} color="#9ca3af" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${isDone ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {lesson.title}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{lesson.duration}</span>
                      <IcChevronRight />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: pricing card */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 sticky top-6">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">${course.price}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">One-time payment · Lifetime access</p>

          <button
            type="button"
            onClick={() => onEnroll(course)}
            className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ backgroundColor: course.color }}
          >
            {isEnrolled ? 'Continue Learning' : 'Enroll & Start Learning'}
          </button>

          <ul className="mt-5 space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
            {[
              { icon: <IcBook />,        text: `${course.levels.reduce((s, l) => s + l.lessons.length, 0)} lessons across 3 levels` },
              { icon: <IcClock />,       text: `${course.totalTime} of content` },
              { icon: <IcInfinity />,    text: 'Lifetime access' },
              { icon: <IcCertificate />, text: 'Certificate of completion' },
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

// ── Screen 3: Lesson View ──────────────────────────────────────────────────

function LessonView({
  course,
  level,
  lesson,
  completed,
  onMarkComplete,
  onBack,
}: {
  course: Course;
  level: Level;
  lesson: Lesson;
  completed: Set<string>;
  onMarkComplete: () => void;
  onBack: () => void;
}) {
  const isDone = completed.has(lessonKey(course.id, level.id, lesson.id));

  const lessonIndex = level.lessons.findIndex(l => l.id === lesson.id);
  const levelPct = levelProgress(course, level.id, completed);
  const { bg, text: textColor } = LEVEL_COLORS[level.id];

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
      >
        <IcArrowLeft />
        Back to course
      </button>

      {/* Level + position badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: bg, color: textColor }}
        >
          {level.label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Lesson {lessonIndex + 1} of {level.lessons.length}
        </span>
      </div>

      {/* YouTube embed */}
      <div className="w-full rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${lesson.videoId}?rel=0&modestbranding=1`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>

      {/* Lesson card */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 p-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
          {course.title} · {level.label}
        </p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lesson.title}</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
          <IcClock /> {lesson.duration}
        </p>

        {/* Level progress mini bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">{level.label} progress</span>
            <span className="text-xs font-bold" style={{ color: textColor }}>{levelPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${levelPct}%`, backgroundColor: textColor }}
            />
          </div>
        </div>

        <div className="mt-5">
          {isDone ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#22c55e]">
              <IcCheck size={16} />
              Lesson completed
            </div>
          ) : (
            <button
              type="button"
              onClick={onMarkComplete}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: course.color }}
            >
              Mark as Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function LearningHub() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<CurrentView>('hub');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; level: Level } | null>(null);
  const [activeLevel, setActiveLevel] = useState<LevelId>('beginner');
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted);
  const [enrolled, setEnrolled] = useState<Set<number>>(loadEnrolled);

  function markComplete(courseId: number, levelId: LevelId, lessonId: number) {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(lessonKey(courseId, levelId, lessonId));
      saveCompleted(next);
      return next;
    });
  }

  function handleEnroll(course: Course) {
    if (enrolled.has(course.id)) {
      setSelectedCourse(course);
      setActiveLevel('beginner');
      setCurrentView('courseDetail');
      return;
    }
    const balance = user?.wallet_balance ?? 0;
    if (balance >= course.price) {
      setEnrolled(prev => {
        const next = new Set(prev);
        next.add(course.id);
        saveEnrolled(next);
        return next;
      });
      showToast('Enrolled successfully!');
      setSelectedCourse(course);
      setActiveLevel('beginner');
      setCurrentView('courseDetail');
    } else {
      showAlert(
        'Insufficient Funds',
        `Your balance is EGP ${balance.toFixed(2)}. You need $${course.price} to enroll.`,
        'error',
      );
    }
  }

  return (
    <SubpageShell>
      <AnimatePresence mode="wait">
        {currentView === 'hub' && (
          <motion.div key="hub" variants={fade} initial="enter" animate="center" exit="exit">
            <HubScreen
              enrolled={enrolled}
              completed={completed}
              onEnroll={handleEnroll}
            />
          </motion.div>
        )}

        {currentView === 'courseDetail' && selectedCourse && (
          <motion.div key="courseDetail" variants={fade} initial="enter" animate="center" exit="exit">
            <DetailScreen
              course={selectedCourse}
              enrolled={enrolled}
              completed={completed}
              activeLevel={activeLevel}
              onSetActiveLevel={setActiveLevel}
              onBack={() => {
                setSelectedCourse(null);
                setCurrentView('hub');
              }}
              onOpenLesson={(lesson, level) => {
                setSelectedLesson({ lesson, level });
                setCurrentView('lessonView');
              }}
              onEnroll={handleEnroll}
            />
          </motion.div>
        )}

        {currentView === 'lessonView' && selectedCourse && selectedLesson && (
          <motion.div key="lessonView" variants={fade} initial="enter" animate="center" exit="exit">
            <LessonView
              course={selectedCourse}
              level={selectedLesson.level}
              lesson={selectedLesson.lesson}
              completed={completed}
              onMarkComplete={() =>
                markComplete(selectedCourse.id, selectedLesson.level.id, selectedLesson.lesson.id)
              }
              onBack={() => setCurrentView('courseDetail')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </SubpageShell>
  );
}
