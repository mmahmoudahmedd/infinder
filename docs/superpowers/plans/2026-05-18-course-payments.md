# Course Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Learning Hub lessons behind a 1,000 EGP wallet purchase, with a confirmation modal and graceful insufficient-balance handling.

**Architecture:** Backend adds `GET /purchases` and `POST /purchase` to `learning.js`, following the same wallet-deduction pattern as `investments.js`. Frontend uses `useAuth()` for wallet balance (already in context), adds a `purchases: Set<number>` state loaded on mount, and renders a `PurchaseModal` inline in `LearningHub.tsx`.

**Tech Stack:** Express + Supabase (backend), React + Framer Motion + react-router-dom (frontend), existing `useAuth` context for wallet balance.

---

### Task 1: Backend — GET /purchases + POST /purchase

**Files:**
- Modify: `backend/routes/learning.js`

- [ ] **Step 1: Add GET /purchases route** — paste before the existing `router.post('/quiz', ...)` line:

```js
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
```

- [ ] **Step 2: Add POST /purchase route** — paste immediately after the GET route above:

```js
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
```

- [ ] **Step 3: Verify the server starts without errors**

Run: `node --input-type=module < backend/routes/learning.js 2>&1 | head -5`
Expected: no syntax errors (may show import errors — that's fine, just check for SyntaxError)

---

### Task 2: Frontend — Add price to Course type + data

**Files:**
- Modify: `frontend/src/pages/LearningHub.tsx`

- [ ] **Step 1: Add `price` field to the Course interface** (around line 29):

```ts
interface Course {
  id: number;
  category: string;
  title: string;
  totalTime: string;
  overview: string;
  color: string;
  image: string;
  levels: Level[];
  price: number;
}
```

- [ ] **Step 2: Add `price: 1000` to all three entries in the COURSES array**

In `COURSES`, add `price: 1000,` to each course object, e.g.:
```ts
{
  id: 1,
  category: 'Startups',
  title: 'Startup Investing & Venture Capital',
  price: 1000,
  totalTime: '6h 45m',
  // ...
}
```
Repeat for ids 2 and 3.

---

### Task 3: Frontend — Add IcLock icon + PurchaseModal component

**Files:**
- Modify: `frontend/src/pages/LearningHub.tsx`

- [ ] **Step 1: Add IcLock SVG** — paste after the `IcCertificate` function:

```tsx
function IcLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
```

- [ ] **Step 2: Add PurchaseModal component** — paste after the `LEVEL_COLORS` constant and before the `HubScreen` function:

```tsx
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
```

---

### Task 4: Frontend — Update HubScreen (paywall on cards)

**Files:**
- Modify: `frontend/src/pages/LearningHub.tsx`

- [ ] **Step 1: Add `purchases` and `onPurchase` props to HubScreen**

Replace the HubScreen props type:
```tsx
function HubScreen({
  enrolled,
  onEnroll,
  completed,
  loading,
  purchases,
  onPurchase,
}: {
  enrolled: Set<number>;
  onEnroll: (course: Course) => void;
  completed: Set<string>;
  loading: boolean;
  purchases: Set<number>;
  onPurchase: (course: Course) => void;
})
```

- [ ] **Step 2: Update the course card button inside HubScreen's COURSES.map**

Replace the existing button at the bottom of each card:
```tsx
<button
  type="button"
  onClick={() => purchases.has(course.id) ? onEnroll(course) : onPurchase(course)}
  className="rounded-xl text-sm font-bold px-4 py-2.5 transition-opacity hover:opacity-90"
  style={{ backgroundColor: course.color, color: 'white' }}
>
  {!purchases.has(course.id)
    ? 'Enroll — 1,000 EGP'
    : enrolled.has(course.id) ? 'Continue' : 'Start Learning'}
</button>
```

---

### Task 5: Frontend — Update DetailScreen (locked lessons)

**Files:**
- Modify: `frontend/src/pages/LearningHub.tsx`

- [ ] **Step 1: Add `purchases` and `onPurchase` props to DetailScreen**

Add to the DetailScreen props interface:
```tsx
purchases: Set<number>;
onPurchase: (course: Course) => void;
```
Add to the destructured parameters:
```tsx
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
}: { ... })
```

- [ ] **Step 2: Derive `isPurchased` inside DetailScreen** — add after the existing `isEnrolled` line:

```tsx
const isPurchased = purchases.has(course.id);
```

- [ ] **Step 3: Update the lesson row icon and click handler** in the lesson list:

Replace the button inside `activeLevelData.lessons.map(...)`:
```tsx
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
```

- [ ] **Step 4: Update the sidebar CTA button**

Replace the sidebar button in the right column:
```tsx
<button
  type="button"
  onClick={() => isPurchased ? onEnroll(course) : onPurchase(course)}
  className="w-full rounded-xl py-3 text-sm font-bold text-white hover:opacity-90 active:opacity-80 transition-opacity"
  style={{ backgroundColor: course.color }}
>
  {!isPurchased
    ? 'Enroll — 1,000 EGP'
    : isEnrolled ? 'Continue Learning' : 'Start Learning'}
</button>
```

---

### Task 6: Frontend — Root state, mount fetch, purchase handler, modal render

**Files:**
- Modify: `frontend/src/pages/LearningHub.tsx`

- [ ] **Step 1: Add new imports** at the top of the file:

```tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
```

- [ ] **Step 2: Add new state and hooks** inside the `LearningHub` root function, after the existing state declarations:

```tsx
const { user, refreshMe } = useAuth();
const navigate = useNavigate();
const [purchases, setPurchases] = useState<Set<number>>(new Set());
const [purchaseTarget, setPurchaseTarget] = useState<Course | null>(null);
const [purchasing, setPurchasing] = useState(false);
```

- [ ] **Step 3: Add purchases fetch to useEffect** — update the existing `useEffect` to also load purchases:

```tsx
useEffect(() => {
  api.get('/api/learning/progress')
    .then(r => setCompleted(new Set(r.data.completed as string[])))
    .catch(() => {})
    .finally(() => setProgressLoading(false));
  api.get('/api/learning/enrollment')
    .then(r => {
      const ids = r.data.enrolled as number[];
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
    .then(r => setPurchases(new Set(r.data.purchased as number[])))
    .catch(() => {});
}, []);
```

- [ ] **Step 4: Add `handlePurchaseConfirm` function** — paste after `handleEnroll`:

```tsx
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
```

- [ ] **Step 5: Render PurchaseModal + pass new props to HubScreen and DetailScreen**

In the JSX return, add the modal just before `</SubpageShell>`:
```tsx
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
```

Update the `<HubScreen ... />` render to pass the new props:
```tsx
<HubScreen
  enrolled={enrolled}
  completed={completed}
  onEnroll={handleEnroll}
  loading={progressLoading}
  purchases={purchases}
  onPurchase={setPurchaseTarget}
/>
```

Update the `<DetailScreen ... />` render to pass the new props:
```tsx
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
```

---

### Task 7: Verify and commit

- [ ] **Step 1: Check TypeScript compiles without errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Step 2: Commit all changes**

```bash
git add frontend/src/pages/LearningHub.tsx backend/routes/learning.js
git commit -m "feat: gate learning courses behind 1000 EGP wallet purchase"
```
