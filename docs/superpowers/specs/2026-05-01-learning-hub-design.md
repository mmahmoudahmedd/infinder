# Learning Hub — Design Spec
**Date:** 2026-05-01  
**File:** `frontend/src/pages/LearningHub.tsx` (full rewrite)

---

## Overview

A single-file React component that implements a 3-screen mobile learning experience. All screens live in one parent component with shared state; sub-screen components receive data as props.

---

## Architecture

Single parent component `LearningHub` with three child screen components:
- `HubScreen` — course listing
- `DetailScreen` — single course detail + curriculum CTA
- `CurriculumScreen` — lesson list with progress

Navigation direction is tracked via a ref (`dir`) for framer-motion slide direction. Screen transitions use `AnimatePresence` with a custom slide variant.

---

## State

```ts
const [currentView, setCurrentView] = useState<'hub' | 'courseDetail' | 'curriculum'>('hub');
const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
const dir = useRef(1); // 1 = forward, -1 = backward
```

`selectedLesson` is reserved for future lesson-player navigation; it is not actively used in this spec but is required as part of the state contract.

---

## Data Model

```ts
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
  lessons: number;        // total lesson count
  totalTime: string;      // e.g. "3h 40m"
  overview: string;       // paragraph shown on detail screen
  color: string;          // hex, used for banner background
  curriculum: CurriculumItem[];
}
```

Three hardcoded courses, each with 5 curriculum items spanning at least one of each status.

---

## Navigation Flow

```
Hub  ──[Start Course]──►  CourseDetail  ──[View Curriculum]──►  Curriculum
Hub  ◄──[back arrow]────  CourseDetail  ◄──[back arrow]─────────  Curriculum
```

- **Hub → CourseDetail:** `setSelectedCourse(course)` + `goTo('courseDetail', forward=true)`
- **CourseDetail → Curriculum:** `goTo('curriculum', forward=true)`
- **Curriculum → CourseDetail:** `goTo('courseDetail', forward=false)`
- **CourseDetail → Hub:** `goTo('hub', forward=false)` + `setSelectedCourse(null)`

---

## Progress Bar

Computed dynamically from `selectedCourse.curriculum`:

```ts
const completed = selectedCourse.curriculum.filter(l => l.status === 'completed').length;
const pct = Math.round((completed / selectedCourse.curriculum.length) * 100);
```

Animated via framer-motion `animate={{ width: \`${pct}%\` }}`.

---

## Lesson Icons

| Status | Icon | Row style |
|--------|------|-----------|
| `completed` | Green circle with white checkmark | normal |
| `current` | Green circle with white play icon | green left border (`border-l-[3px] border-[#22c55e]`), `bg-green-50/60` |
| `locked` | Grey circle with grey play icon | `opacity-60` |

---

## Layout

- Container: `h-dvh w-full max-w-[390px] mx-auto flex flex-col overflow-hidden`
- Background: `#f5f5f5`
- Scrollable main: `flex-1 overflow-y-auto overscroll-y-contain`, `scrollbarWidth: none`
- Bottom nav: persistent, fixed at bottom, Learn tab always active

---

## Bottom Nav

Four tabs: Home, Learn (active), Trade, Invest. SVG icons, green (#22c55e) when active, grey (#9ca3af) otherwise. Taps navigate via `useNavigate` to app routes except Learn which calls `goTo('hub')`.

---

## Styling

- Tailwind utility classes throughout
- Green accent: `#22c55e`
- Card background: white with `shadow-sm` and `rounded-2xl`
- Page background: `#f5f5f5`
- framer-motion slide variants: `x: ±32, opacity: 0` on enter/exit

---

## What Is NOT in Scope

- Lesson video player
- Backend / API integration
- `selectedLesson` mutation (state exists but is unused)
- Search filtering (not specified — omit from this rewrite)
