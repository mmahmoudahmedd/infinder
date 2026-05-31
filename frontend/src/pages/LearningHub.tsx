import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showToast, showAlert } from '../lib/swal';
import api from '../lib/api';
import { BookOpen, TrendingUp, Rocket, Building2, BarChart2, Lock as LucideLock } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type CurrentView = 'hub' | 'courseDetail' | 'lessonView' | 'quiz';
type LevelId = 'beginner' | 'intermediate' | 'advanced';

interface Lesson {
  id: number;
  dbId: string;
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
  id: string;
  category: string;
  title: string;
  totalTime: string;
  overview: string;
  color: string;
  image: string;
  levels: Level[];
  price: number;
  difficulty: string;
}

interface ApiLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  order_index: number;
  duration_minutes: number;
}

interface ApiModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  price: number;
  difficulty: string;
  lessons: ApiLesson[];
}

// ── Enrollment (localStorage-backed, server-synced) ───────────────────────

const ENROLLED_KEY = 'infinder_enrolled_courses';

function loadEnrolled(): Set<string> {
  try {
    const s = localStorage.getItem(ENROLLED_KEY);
    return s ? new Set<string>(JSON.parse(s) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveEnrolled(set: Set<string>) {
  try { localStorage.setItem(ENROLLED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function courseProgress(course: Course, completed: Set<string>): number {
  const total = course.levels.reduce((s, l) => s + l.lessons.length, 0);
  if (!total) return 0;
  const done = course.levels.reduce(
    (s, l) => s + l.lessons.filter(ls => completed.has(ls.dbId)).length,
    0,
  );
  return Math.round((done / total) * 100);
}

function levelProgress(course: Course, levelId: LevelId, completed: Set<string>): number {
  const level = course.levels.find(l => l.id === levelId);
  if (!level?.lessons.length) return 0;
  const done = level.lessons.filter(ls => completed.has(ls.dbId)).length;
  return Math.round((done / level.lessons.length) * 100);
}

// ── Course presentation metadata (slug → UI-only config) ───────────────────

const COURSE_META: Record<string, { color: string; image: string; category: string }> = {
  'hub-startup-vc':      { color: '#22c55e', image: 'https://i.pinimg.com/1200x/78/af/94/78af94689cca8a224bfe8274725fb767.jpg', category: 'Startups' },
  'hub-real-estate':     { color: '#3b82f6', image: 'https://i.pinimg.com/1200x/11/7a/55/117a550a41583be8a579e1333f795aad.jpg', category: 'Real Estate' },
  'hub-intro-investing': { color: '#8b5cf6', image: 'https://i.pinimg.com/736x/b7/89/7e/b7897e9d112634c5428994643408c5b3.jpg', category: 'Investment' },
  'investing-101':       { color: '#f59e0b', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', category: 'Fundamentals' },
  'risk-return':         { color: '#14b8a6', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80', category: 'Fundamentals' },
  'sharia-investing':    { color: '#d97706', image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&q=80', category: 'Fundamentals' },
};
const DEFAULT_META = { color: '#6b7280', image: '', category: 'Fundamentals' };

type LucideIcon = typeof BookOpen;
const CATEGORY_ICON: Record<string, LucideIcon> = {
  'Fundamentals': BookOpen,
  'Investment':   TrendingUp,
  'Startups':     Rocket,
  'Real Estate':  Building2,
  'Crypto':       BarChart2,
  'Trading':      BarChart2,
};
const DEFAULT_ICON: LucideIcon = BarChart2;

const LEVEL_IDS: LevelId[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_LABELS: Record<LevelId, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildLevels(apiLessons: ApiLesson[]): Level[] {
  const sorted = [...apiLessons].sort((a, b) => a.order_index - b.order_index);
  const total = sorted.length;
  if (total === 0) {
    return LEVEL_IDS.map((id) => ({ id, label: LEVEL_LABELS[id], lessons: [] }));
  }
  const beginnerEnd = Math.ceil(total / 3);
  const intermediateEnd = Math.ceil((total * 2) / 3);
  const groups: Record<LevelId, ApiLesson[]> = {
    beginner:     sorted.slice(0, beginnerEnd),
    intermediate: sorted.slice(beginnerEnd, intermediateEnd),
    advanced:     sorted.slice(intermediateEnd),
  };
  return LEVEL_IDS.map((id) => ({
    id,
    label: LEVEL_LABELS[id],
    lessons: groups[id].map((l, i) => ({
      id: i + 1,
      dbId: l.id,
      title: l.title,
      duration: `${l.duration_minutes}m`,
      videoId: l.content,
    })),
  }));
}

function apiModuleToCourse(m: ApiModule): Course {
  const meta = COURSE_META[m.slug] ?? DEFAULT_META;
  return {
    id:         m.id,
    category:   meta.category,
    title:      m.title,
    totalTime:  formatMinutes(m.duration_minutes),
    overview:   m.description ?? '',
    color:      meta.color,
    image:      meta.image,
    price:      Number(m.price ?? 0),
    difficulty: m.difficulty ?? 'beginner',
    levels:     buildLevels(m.lessons ?? []),
  };
}

const COMING_SOON = [
  { id: 'cs-1', title: 'Cryptocurrency & DeFi', category: 'Crypto', color: '#f59e0b' },
  { id: 'cs-2', title: 'Commodities & Forex Trading', category: 'Trading', color: '#ec4899' },
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

function IcLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
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

// ── Purchase Modal ─────────────────────────────────────────────────────────

function PurchaseModal({
  course,
  walletBalance,
  purchasing,
  onConfirm,
  onClose,
  onFundWallet,
}: {
  course: Course;
  walletBalance: number;
  purchasing: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onFundWallet: () => void;
}) {
  const canAfford = walletBalance >= course.price;
  const shortfall = course.price - walletBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
          {course.category}
        </p>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
          {course.title}
        </h2>

        <div className="mt-5 flex items-center justify-between py-4 border-y border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Course price</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {course.price.toLocaleString()} EGP
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Your balance</span>
          <span className={`text-sm font-semibold ${canAfford ? 'text-[#22c55e]' : 'text-red-500'}`}>
            {walletBalance.toFixed(2)} EGP
          </span>
        </div>

        {!canAfford && (
          <p className="mt-2 text-xs text-red-500">
            You need {shortfall.toFixed(2)} EGP more to purchase this course.
          </p>
        )}

        <div className="mt-6 space-y-2">
          {canAfford ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={purchasing}
              className="w-full rounded-xl py-3 text-sm font-bold text-black bg-[#C5F94E] disabled:opacity-60 transition-opacity hover:opacity-90"
            >
              {purchasing ? 'Processing…' : 'Confirm Purchase'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFundWallet}
              className="w-full rounded-xl py-3 text-sm font-bold text-white bg-[#22c55e] hover:opacity-90 transition-opacity"
            >
              Fund Wallet →
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 1: Hub ──────────────────────────────────────────────────────────

function HubScreen({
  courses,
  enrolled,
  onEnroll,
  completed,
  loading,
  purchases,
  onPurchase,
}: {
  courses: Course[];
  enrolled: Set<string>;
  onEnroll: (course: Course) => void;
  completed: Set<string>;
  loading: boolean;
  purchases: Set<string>;
  onPurchase: (course: Course) => void;
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Learning Hub</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Master investment strategies with expert-led courses. Three skill levels per course.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100 dark:bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                <div className="mt-4 flex justify-end">
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl w-28" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            {courses.map((course, i) => {
              const pct = courseProgress(course, completed);
              const totalLessons = course.levels.reduce((s, l) => s + l.lessons.length, 0);
              const Icon = CATEGORY_ICON[course.category] ?? DEFAULT_ICON;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.22, ease: 'easeOut' }}
                  className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
                >
                  {/* Course header: photo or icon */}
                  {course.image ? (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/35" />
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
                      <Icon size={52} strokeWidth={1.25} className="text-[#C5F94E] opacity-60" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <span
                      className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                      style={{ backgroundColor: `${course.color}1a`, color: course.color }}
                    >
                      {course.category}
                    </span>

                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug flex-1">
                      {course.title}
                    </h3>

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1"><IcBook />{totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}</span>
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

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => purchases.has(course.id) ? onEnroll(course) : onPurchase(course)}
                        className="rounded-xl text-sm font-bold px-4 py-2.5 bg-[#C5F94E] text-black transition-opacity hover:opacity-90"
                      >
                        {!purchases.has(course.id)
                          ? course.price > 0 ? `Enroll — ${course.price.toLocaleString()} EGP` : 'Start Learning'
                          : enrolled.has(course.id) ? 'Continue' : 'Start Learning'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Coming soon cards */}
            {COMING_SOON.map((cs, i) => {
              const CsIcon = CATEGORY_ICON[cs.category] ?? DEFAULT_ICON;
              return (
                <motion.div
                  key={cs.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (courses.length + i) * 0.07, duration: 0.22, ease: 'easeOut' }}
                  className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col opacity-60"
                >
                  {/* Icon header with lock overlay */}
                  <div className="h-40 relative flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
                    <CsIcon size={52} strokeWidth={1.25} className="text-white opacity-10" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                      <LucideLock size={20} strokeWidth={1.5} className="text-white/40" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3 py-1 bg-white/10 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                      {cs.category}
                    </span>
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug flex-1">
                      {cs.title}
                    </h3>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                      <button
                        type="button"
                        disabled
                        className="rounded-xl text-sm font-bold px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
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
  purchases,
  onPurchase,
  onStartQuiz,
}: {
  course: Course;
  enrolled: Set<string>;
  completed: Set<string>;
  activeLevel: LevelId;
  onSetActiveLevel: (id: LevelId) => void;
  onBack: () => void;
  onOpenLesson: (lesson: Lesson, level: Level) => void;
  onEnroll: (course: Course) => void;
  purchases: Set<string>;
  onPurchase: (course: Course) => void;
  onStartQuiz: () => void;
}) {
  const pct = courseProgress(course, completed);
  const activeLevelData = course.levels.find(l => l.id === activeLevel)!;
  const isEnrolled = enrolled.has(course.id);
  const isPurchased = purchases.has(course.id);
  const HeroIcon = CATEGORY_ICON[course.category] ?? DEFAULT_ICON;

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

      {/* Hero banner */}
      <div className="rounded-2xl overflow-hidden relative mb-6" style={{ height: 220 }}>
        {course.image ? (
          <>
            <img
              src={course.image}
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
            <HeroIcon size={72} strokeWidth={1.25} className="text-[#C5F94E] opacity-25" />
          </div>
        )}
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
                {(() => { const n = course.levels.reduce((s, l) => s + l.lessons.length, 0); return <><IcBook />{n} {n === 1 ? 'lesson' : 'lessons'}</>; })()}
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

          {/* Bypass quiz banner — beginner courses only, not yet complete */}
          {course.difficulty === 'beginner' && courseProgress(course, completed) < 100 && (
            <div className="rounded-2xl border border-[#C5F94E]/40 bg-[#C5F94E]/5 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Already know this material?</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pass a 20-question quiz in 30 min to skip this course and unlock intermediate investments.</p>
              </div>
              <button
                type="button"
                onClick={onStartQuiz}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold bg-[#C5F94E] text-black hover:opacity-90 transition-opacity"
              >
                Take Quiz
              </button>
            </div>
          )}

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
              {activeLevelData.lessons.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center text-gray-400 dark:text-gray-500">No content yet</p>
              ) : activeLevelData.lessons.map((lesson, i) => {
                const isDone = completed.has(lesson.dbId);
                return (
                  <div key={lesson.id}>
                    {i > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />}
                    <button
                      type="button"
                      onClick={() => isPurchased ? onOpenLesson(lesson, activeLevelData) : onPurchase(course)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                    >
                      {!isPurchased ? (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400">
                          <IcLock />
                        </div>
                      ) : isDone ? (
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <IcCheck size={14} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <IcPlay size={13} color="#9ca3af" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${isDone && isPurchased ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                          {lesson.title}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{lesson.duration}</span>
                      {isPurchased ? <IcChevronRight /> : <IcLock />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: info card */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 sticky top-6">
          <button
            type="button"
            onClick={() => isPurchased ? onEnroll(course) : onPurchase(course)}
            className="w-full rounded-xl py-3 text-sm font-bold text-black bg-[#C5F94E] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            {!isPurchased
              ? course.price > 0 ? `Enroll — ${course.price.toLocaleString()} EGP` : 'Start Learning'
              : isEnrolled ? 'Continue Learning' : 'Start Learning'}
          </button>

          <ul className="mt-5 space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
            {[
              { icon: <IcBook />,        text: (() => { const n = course.levels.reduce((s, l) => s + l.lessons.length, 0); return `${n} ${n === 1 ? 'lesson' : 'lessons'} across 3 levels`; })() },
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

// ── Bypass Quiz Data ───────────────────────────────────────────────────────

const QUIZ_QUESTIONS = [
  { q: 'What is an investment?', options: ['Spending money on entertainment', 'Putting money to work with the expectation of future returns', 'Keeping money under your mattress', 'Borrowing money from a bank'] },
  { q: 'Which of the following is NOT an asset class?', options: ['Stocks', 'Gold', 'A mobile phone', 'Real estate'] },
  { q: 'What does "risk" mean in investing?', options: ['The guarantee of losing money', 'The speed at which you can sell an investment', 'The possibility that an investment\'s actual return differs from the expected return', 'The fees paid to a broker'] },
  { q: 'Which investment type gives you partial ownership of a company?', options: ['Bond', 'Gold', 'Real estate', 'Stock'] },
  { q: 'What is diversification?', options: ['Investing all your money in one high-performing stock', 'Spreading investments across different asset classes to reduce risk', 'Withdrawing your money frequently', 'Buying only government bonds'] },
  { q: 'Generally, what is the relationship between risk and return?', options: ['Higher risk always guarantees higher return', 'Lower risk means higher return', 'Higher potential return usually comes with higher risk', 'Risk and return are unrelated'] },
  { q: 'What is a mutual fund?', options: ['A loan given by a bank', 'A type of cryptocurrency', 'A pooled investment vehicle managed by professionals on behalf of many investors', 'A government savings account'] },
  { q: 'What does EGX stand for?', options: ['Egyptian Gold Exchange', 'Egyptian Exchange (stock market)', 'Electronic Global Exchange', 'Egyptian Government Index'] },
  { q: 'Which asset is traditionally considered a safe haven against inflation?', options: ['Startup equity', 'Gold', 'Individual stocks', 'Cryptocurrency'] },
  { q: 'What is a minimum investment?', options: ['The maximum amount you can invest', 'The fee charged by a broker', 'The smallest amount of money required to enter an investment', 'The guaranteed profit from an investment'] },
  { q: 'What does "liquidity" mean?', options: ['The risk of an investment losing value', 'How quickly an investment can be converted to cash without significant loss', 'The annual return on an investment', 'The interest rate set by the central bank'] },
  { q: 'What is the role of the Central Bank of Egypt (CBE)?', options: ['To trade stocks on the EGX', 'To sell real estate to investors', 'To regulate monetary policy and oversee the banking system', 'To manage individual investment portfolios'] },
  { q: 'Which of the following best describes a "low risk" investment?', options: ['High potential returns with large price swings', 'Stable, predictable returns with lower chance of loss', 'Investments in new startup companies', 'Investments that can lose all their value overnight'] },
  { q: 'What is a stock market index?', options: ['A list of all banks in Egypt', 'The price of a single stock', 'A measure tracking the performance of a group of stocks', 'The interest rate on government bonds'] },
  { q: 'What does "annual return" mean?', options: ['The total amount invested over a lifetime', 'The fee paid to an investment platform', 'The profit or loss generated by an investment over one year, expressed as a percentage', 'The number of times you can withdraw per year'] },
  { q: 'What is fractional ownership in real estate?', options: ['Owning an entire building', 'Owning a small share of a property alongside other investors', 'Renting a property from a landlord', 'Taking a mortgage from a bank'] },
  { q: 'Which type of investment is considered Sharia-compliant?', options: ['Any investment with high returns', 'Investments that charge or earn interest (riba)', 'Investments that avoid interest and prohibited industries', 'Only gold investments'] },
  { q: 'What happens when you invest in an IPO?', options: ['You lend money to the government', 'You buy shares of a company that is listing on the stock market for the first time', 'You open a fixed savings account', 'You purchase a government bond'] },
  { q: 'Why is it important to research an investment before committing money?', options: ['It is not important — past performance guarantees future results', 'To find the investment with the highest advertised return', 'To understand the risks, fees, and potential returns before making a decision', 'To copy what successful investors did last year'] },
  { q: 'What is the main purpose of the Learning Hub on INFINDER?', options: ['To sell investment products directly', 'To provide entertainment content', 'To track stock prices in real time', 'To educate users about investing before they deploy real capital'] },
];

// ── Screen: Bypass Quiz ────────────────────────────────────────────────────

function QuizScreen({
  course,
  onBack,
  onPassed,
}: {
  course: Course;
  onBack: () => void;
  onPassed: (completedIds: string[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);

  const allAnswered = Object.keys(answers).length === 20;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const timerColor = timeLeft <= 300 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300';

  async function submit(ans: Record<number, number>) {
    if (submitting || result) return;
    setSubmitting(true);
    try {
      const payload = Array.from({ length: 20 }, (_, i) => ans[i] ?? -1);
      const res = await api.post('/api/learning/bypass-quiz', { module_id: course.id, answers: payload });
      setResult(res.data);
      if (res.data.passed) {
        const lessonsRes = await api.get('/api/learning/progress');
        onPassed(lessonsRes.data.completed as string[]);
      }
    } catch {
      setResult({ passed: false, score: 0 });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (result) return;
    if (timeLeft <= 0) { submit(answers); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, result]);

  return (
    <div className="max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
      >
        <IcArrowLeft />
        Back to course
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Bypass Quiz</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
        </div>
        <div className={`text-2xl font-mono font-bold ${timerColor}`}>{mins}:{secs}</div>
      </div>

      {result ? (
        <div className={`rounded-2xl border p-8 text-center ${result.passed ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}>
          <div className="text-4xl mb-3">{result.passed ? '🎉' : '📚'}</div>
          <h2 className={`text-xl font-bold mb-1 ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {result.passed ? 'You passed!' : 'Not quite there'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You scored <strong>{result.score}/20</strong>. {result.passed ? 'This course is now marked complete and intermediate investments are unlocked.' : 'You need 16/20 to pass. Study the course material and try again.'}
          </p>
          <button type="button" onClick={onBack} className="rounded-xl px-6 py-2.5 text-sm font-semibold bg-[#C5F94E] text-black hover:opacity-90 transition-opacity">
            {result.passed ? 'Back to Course' : 'Study & Retry'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Answer all 20 questions. Score 16 or more to skip this course. Timer auto-submits at 00:00.</p>
          <div className="space-y-6">
            {QUIZ_QUESTIONS.map((q, qi) => (
              <div key={qi} className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  <span className="text-gray-400 dark:text-gray-500 mr-2">{qi + 1}.</span>{q.q}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                      className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border transition-colors ${
                        answers[qi] === oi
                          ? 'border-[#C5F94E] bg-[#C5F94E]/10 text-gray-900 dark:text-white font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">{Object.keys(answers).length}/20 answered</p>
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={() => submit(answers)}
              className="rounded-xl px-6 py-2.5 text-sm font-bold bg-[#C5F94E] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        </>
      )}
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
  onNextLesson,
  onBack,
}: {
  course: Course;
  level: Level;
  lesson: Lesson;
  completed: Set<string>;
  onMarkComplete: () => void;
  onNextLesson: (lesson: Lesson, level: Level) => void;
  onBack: () => void;
}) {
  const isDone = completed.has(lesson.dbId);

  const lessonIndex = level.lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = level.lessons[lessonIndex + 1] ?? null;
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

        <div className="mt-5 space-y-3">
          {isDone ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#22c55e]">
              <IcCheck size={16} />
              Lesson completed
            </div>
          ) : (
            <button
              type="button"
              onClick={onMarkComplete}
              className="w-full rounded-xl py-3 text-sm font-bold text-black bg-[#C5F94E] transition-opacity hover:opacity-90 active:opacity-80"
            >
              Mark as Complete
            </button>
          )}

          {nextLesson && (
            <button
              type="button"
              onClick={() => onNextLesson(nextLesson, level)}
              className="w-full rounded-xl py-3 text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
            >
              Next Lesson
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function LearningHub() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<CurrentView>('hub');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; level: Level } | null>(null);
  const [activeLevels, setActiveLevels] = useState<Record<string, LevelId>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [enrolled, setEnrolled] = useState<Set<string>>(loadEnrolled);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [purchaseTarget, setPurchaseTarget] = useState<Course | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    api.get('/api/learning/modules')
      .then(r => setCourses((r.data.modules as ApiModule[]).map(apiModuleToCourse)))
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
    api.get('/api/learning/progress')
      .then(r => setCompleted(new Set(r.data.completed as string[])))
      .catch(() => {})
      .finally(() => setProgressLoading(false));
    api.get('/api/learning/enrollment')
      .then(r => {
        const ids = r.data.enrolled as string[];
        if (ids?.length) {
          setEnrolled(prev => {
            const next = new Set([...prev, ...ids]);
            saveEnrolled(next);
            return next;
          });
        }
      })
      .catch(() => {});
    api.get('/api/learning/purchases')
      .then(r => setPurchases(new Set(r.data.purchased as string[])))
      .catch(() => {});
  }, []);

  async function markComplete(dbId: string) {
    try {
      await api.post('/api/learning/progress', { lesson_id: dbId });
      setCompleted(prev => new Set([...prev, dbId]));
    } catch {
      // silently fail — progress will sync on next load
    }
  }

  async function handlePurchaseConfirm() {
    if (!purchaseTarget) return;
    setPurchasing(true);
    try {
      await api.post('/api/learning/purchase', { course_id: purchaseTarget.id });
      setPurchases(prev => new Set([...prev, purchaseTarget.id]));
      await refreshMe();
      showToast(t('learn_purchased') || 'Course purchased!');
      const course = purchaseTarget;
      setPurchaseTarget(null);
      handleEnroll(course);
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      if (msg === 'insufficient_balance') {
        showToast(t('learn_insufficient_balance') || 'Insufficient balance — fund your wallet first');
      } else {
        showToast(t('learn_purchase_failed') || 'Purchase failed, please try again');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleInitiateEnroll(course: Course) {
    if (course.price === 0) {
      try {
        await api.post('/api/learning/purchase', { course_id: course.id });
        setPurchases(prev => new Set([...prev, course.id]));
        handleEnroll(course);
      } catch (e: any) {
        const msg = e?.response?.data?.error;
        if (msg === 'already_purchased' || msg === 'already_owned') {
          setPurchases(prev => new Set([...prev, course.id]));
          handleEnroll(course);
        } else {
          showAlert(t('learn_enroll_failed') || 'Could not enroll', 'Please try again.');
        }
      }
    } else {
      setPurchaseTarget(course);
    }
  }

  function handleEnroll(course: Course) {
    if (!enrolled.has(course.id)) {
      setEnrolled(prev => {
        const next = new Set(prev);
        next.add(course.id);
        saveEnrolled(next);
        return next;
      });
      api.post('/api/learning/enrollment', { course_id: course.id }).catch(() => {});
      showToast(t('learn_enrolled'));
    }
    setSelectedCourse(course);
    setActiveLevels(prev => ({ ...prev, [course.id]: prev[course.id] ?? 'beginner' }));
    setCurrentView('courseDetail');
  }

  const loading = coursesLoading || progressLoading;

  return (
    <SubpageShell>
      <AnimatePresence mode="wait">
        {currentView === 'hub' && (
          <motion.div key="hub" variants={fade} initial="enter" animate="center" exit="exit">
            <HubScreen
              courses={courses}
              enrolled={enrolled}
              completed={completed}
              onEnroll={handleEnroll}
              loading={loading}
              purchases={purchases}
              onPurchase={handleInitiateEnroll}
            />
          </motion.div>
        )}

        {currentView === 'courseDetail' && selectedCourse && (
          <motion.div key="courseDetail" variants={fade} initial="enter" animate="center" exit="exit">
            <DetailScreen
              course={selectedCourse}
              enrolled={enrolled}
              completed={completed}
              activeLevel={activeLevels[selectedCourse.id] ?? 'beginner'}
              onSetActiveLevel={(id) => setActiveLevels(prev => ({ ...prev, [selectedCourse.id]: id }))}
              onBack={() => { setSelectedCourse(null); setCurrentView('hub'); }}
              onOpenLesson={(lesson, level) => { setSelectedLesson({ lesson, level }); setCurrentView('lessonView'); }}
              onEnroll={handleEnroll}
              purchases={purchases}
              onPurchase={handleInitiateEnroll}
              onStartQuiz={() => setCurrentView('quiz')}
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
              onMarkComplete={() => markComplete(selectedLesson.lesson.dbId)}
              onNextLesson={(lesson, level) => setSelectedLesson({ lesson, level })}
              onBack={() => setCurrentView('courseDetail')}
            />
          </motion.div>
        )}

        {currentView === 'quiz' && selectedCourse && (
          <motion.div key="quiz" variants={fade} initial="enter" animate="center" exit="exit">
            <QuizScreen
              course={selectedCourse}
              onBack={() => setCurrentView('courseDetail')}
              onPassed={(completedIds) => {
                setCompleted(new Set(completedIds));
                setCurrentView('courseDetail');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {purchaseTarget && user && (
        <PurchaseModal
          course={purchaseTarget}
          walletBalance={user.wallet_balance}
          purchasing={purchasing}
          onConfirm={handlePurchaseConfirm}
          onClose={() => setPurchaseTarget(null)}
          onFundWallet={() => { setPurchaseTarget(null); navigate('/funding'); }}
        />
      )}
    </SubpageShell>
  );
}
