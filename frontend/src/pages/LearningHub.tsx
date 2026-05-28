import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../lib/swal';
import api from '../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

type CurrentView = 'hub' | 'courseDetail' | 'lessonView';
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
  'investing-101':       { color: '#f59e0b', image: '', category: 'Fundamentals' },
  'risk-return':         { color: '#14b8a6', image: '', category: 'Fundamentals' },
  'sharia-investing':    { color: '#d97706', image: '', category: 'Fundamentals' },
};
const DEFAULT_META = { color: '#6b7280', image: '', category: 'Fundamentals' };

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
    id:        m.id,
    category:  meta.category,
    title:     m.title,
    totalTime: formatMinutes(m.duration_minutes),
    overview:  m.description ?? '',
    color:     meta.color,
    image:     meta.image,
    price:     Number(m.price ?? 0),
    levels:    buildLevels(m.lessons ?? []),
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
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: course.color }}
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
                        className="rounded-xl text-sm font-bold px-4 py-2.5 transition-opacity hover:opacity-90"
                        style={{ backgroundColor: course.color, color: 'white' }}
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
            {COMING_SOON.map((cs, i) => (
              <motion.div
                key={cs.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (courses.length + i) * 0.07, duration: 0.22, ease: 'easeOut' }}
                className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col opacity-60"
              >
                <div className="relative h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="bg-gray-900/70 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    Coming Soon
                  </span>
                  <span className="absolute bottom-3 left-3 bg-gray-900/75 text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                    {cs.category}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug flex-1">
                    {cs.title}
                  </h3>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                    <button
                      type="button"
                      disabled
                      className="rounded-xl text-sm font-bold px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
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
}) {
  const pct = courseProgress(course, completed);
  const activeLevelData = course.levels.find(l => l.id === activeLevel)!;
  const isEnrolled = enrolled.has(course.id);
  const isPurchased = purchases.has(course.id);

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
            className="w-full rounded-xl py-3 text-sm font-bold text-white hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ backgroundColor: course.color }}
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
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: course.color }}
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
              onPurchase={setPurchaseTarget}
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
              onPurchase={setPurchaseTarget}
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
