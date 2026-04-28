# UI Improvements Design Spec

**Date:** 2026-04-29
**Scope:** Polish the authenticated app's inner pages. Landing, Login, Dashboard, and SmartAssistant are already production-quality — exclude them.

---

## Design tokens (reference)

All changes must use Tailwind classes that map to the INFINDER design system:
- Lime CTA: `bg-infinder-lime text-infinder-black`
- Dark card: `bg-infinder-black text-white`
- App bg: `bg-gray-50`
- Card: `bg-white border border-gray-200 rounded-2xl`
- Hover card: `hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-0.5`
- Glow shadow: `shadow-[0_0_24px_rgba(190,243,94,0.35)]`
- Pill button: `rounded-full`
- Animations: Framer Motion, `opacity:0,y:20 → opacity:1,y:0`, stagger `i*0.07s`

---

## Pass 1 — SubpageShell (affects ALL inner pages)

**File:** `frontend/src/components/AppShell.tsx`

**Problem:** `SubpageShell` renders a bare white header with just Logo + "← Back to Dashboard" text. Every inner page (`InvestmentOptions`, `FundingPage`, `ProfilePage`, `RewardsDashboard`, `LearningModules`, `ReportsPage`) uses this shell.

**Solution:** Replace the custom bare header inside `SubpageShell` with the existing `<Navbar showNav />` component. Also add `<BottomNav />` if not already present.

```tsx
// Before
export function SubpageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <Logo />
        <Link to="/dashboard" className="text-sm text-gray-600">← Back to Dashboard</Link>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      <BottomNav />
    </div>
  );
}

// After
export function SubpageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Navbar showNav />
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
      <BottomNav />
    </div>
  );
}
```

**Impact:** All inner pages instantly get the full navigation bar with active link highlighting and the EN/AR language switcher — zero per-page changes required.

---

## Pass 2a — InvestmentOptions

**File:** `frontend/src/pages/InvestmentOptions.tsx`

### 2a-1: Page header
Add above the assistant banner, matching Dashboard header pattern exactly:
```tsx
<div className="mb-6">
  <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">
    INFINDER
  </p>
  <h1 className="text-2xl md:text-3xl font-bold text-infinder-black">
    {t('nav_invest')}
  </h1>
</div>
```

### 2a-2: Framer Motion stagger on cards
Wrap the cards grid map with `motion.div`:
```tsx
import { motion } from 'framer-motion';

{items.map((inv, i) => (
  <motion.div
    key={inv.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.07 }}
    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
  >
```

### 2a-3: Risk badge colors
Replace the single emerald badge with risk-appropriate colors:
- `low` → `bg-blue-100 text-blue-800`
- `low_medium` → `bg-teal-100 text-teal-800`
- `medium` → `bg-amber-100 text-amber-800`
- `high` → `bg-red-100 text-red-800`

### 2a-4: Invest modal
The Invest button currently does nothing useful. Add an invest modal:
- On click (when `can === true`): open a modal overlay
- Modal: dark bg overlay (`bg-black/40 backdrop-blur-sm`), centered white card (`rounded-2xl p-6 max-w-sm`)
- Content: investment title, EGP amount input with available balance shown, "Confirm & invest" lime button, "Cancel" outline button
- On confirm: call `POST /api/investments/apply` with `{ amount, allocation: { [inv.category]: 100 }, is_sharia: user.sharia_mode, name: inv.title }`
- On success: close modal, call `refreshMe()`, show inline success message in the card

### 2a-5: Risk section at bottom
Polish the dark risk section:
- Add glow blob: `<div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-infinder-lime/5 blur-3xl pointer-events-none" />`
- Add `relative overflow-hidden` to the section
- Give each risk column a subtle left border: `border-l-2 border-white/10 pl-4`
- Add colored dot per level: low = blue, medium = amber, high = red

### 2a-6: Category filter pills (new)
Above the cards grid, add horizontal scrollable filter pills:
```tsx
const CATEGORIES = ['all', 'stocks', 'baskets', 'bonds', 'gold'];
const [filter, setFilter] = useState('all');
// filter items client-side before mapping
```
Pills: `rounded-full px-4 py-1.5 text-sm font-medium transition` — active: `bg-infinder-black text-white`, inactive: `border border-gray-200 text-gray-600 hover:border-gray-400`

---

## Pass 2b — RewardsDashboard

**File:** `frontend/src/pages/RewardsDashboard.tsx`

### 2b-1: Page header with dark accent card
Replace plain `<h1>` with a dark hero strip (like the Dashboard balance card pattern):
```tsx
<div className="rounded-2xl bg-infinder-black text-white p-7 relative overflow-hidden mb-8">
  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-infinder-lime/10 blur-3xl pointer-events-none" />
  <p className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-1">INFINDER</p>
  <h1 className="text-3xl font-bold">{t('rewards_title')}</h1>
  <p className="text-white/50 text-sm mt-2">{t('rewards_sub')}</p>
  <button ... className="mt-4 rounded-full bg-infinder-lime text-infinder-black font-semibold px-4 py-2 text-sm">
    {t('rewards_refresh')}
  </button>
</div>
```

### 2b-2: Badge-specific emoji map
Replace the single 🏅 with a `badgeIcon` map keyed on `badge_key`:
```tsx
const badgeIcon: Record<string, string> = {
  first_fund: '💰',
  first_invest: '📈',
  first_lesson: '📘',
  kyc_verified: '✅',
  sharia_investor: '☪️',
  portfolio_builder: '🧩',
  learning_complete: '🎓',
  gold_investor: '🥇',
  default: '🏅',
};
```

### 2b-3: Badge card accent color
Add a subtle top border color per badge type. Use `style` prop (not dynamic Tailwind classes — Tailwind purges dynamic strings):
```tsx
const badgeAccent: Record<string, string> = {
  first_fund: '#BEF35E',
  first_invest: '#76D74F',
  first_lesson: '#60A5FA',
  kyc_verified: '#34D399',
  sharia_investor: '#A78BFA',
  learning_complete: '#FBBF24',
  default: '#E5E7EB',
};

// In JSX:
<div
  style={{ borderTop: `4px solid ${badgeAccent[a.badge_key] ?? badgeAccent.default}` }}
  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ..."
>
```

### 2b-4: Empty state polish
Replace the plain dashed border empty state with an illustrated dark card:
```tsx
<div className="mt-12 rounded-2xl bg-infinder-black text-white p-10 text-center relative overflow-hidden">
  <div className="absolute inset-0 flex items-center justify-center opacity-5 text-[120px] pointer-events-none">🏅</div>
  <p className="text-4xl mb-4">🔒</p>
  <p className="font-semibold text-lg">{t('rewards_none').split('—')[0]}</p>
  <p className="text-white/50 text-sm mt-2">{t('rewards_none').split('—')[1]}</p>
</div>
```

### 2b-5: Earned date format
Replace `toLocaleDateString()` with a nicer relative or explicit format:
```tsx
{new Date(a.earned_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
```

---

## Pass 2c — LearningModules

**File:** `frontend/src/pages/LearningModules.tsx`

### 2c-1: Module list cards
The module list (when no `moduleId`) needs motion + richer cards:
- Wrap each module card in `motion.div` with stagger
- Add a progress bar at the bottom of each card (same style as Dashboard: `h-1.5 rounded-full bg-gray-100` with `bg-infinder-green` fill)
- Add difficulty badge: `rounded-full text-xs px-2 py-0.5` — beginner=blue, intermediate=amber, advanced=red
- Add a large emoji icon container per module (use first emoji from module title if available, otherwise 📘)

### 2c-2: Lesson sidebar
When inside a module (`moduleId` present), the lesson list sidebar needs visual structure:
- Each lesson row: `flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer`
- Active lesson: `bg-infinder-lime/10 border border-infinder-lime/30`
- Completed lesson: show ✓ in `text-infinder-green` instead of lesson number
- Incomplete lesson: show number in `w-6 h-6 rounded-full bg-gray-100 text-xs text-center`
- Duration: `text-xs text-gray-400` at right

### 2c-3: Lesson content area
The active lesson content area needs a card wrapper:
- Wrap in `rounded-2xl border border-gray-200 bg-white p-6 md:p-8`
- Lesson title as `text-2xl font-bold` with an overline showing module name
- Content body: `prose text-gray-700 text-sm leading-relaxed` (just apply the leading/size classes, no prose plugin needed)
- "Mark complete" button: full lime button at bottom

### 2c-4: Quiz styling
Quiz questions in a card with radio-button style options:
- Each option: `rounded-xl border border-gray-200 p-3 flex items-center gap-3 cursor-pointer hover:border-infinder-lime/50 transition`
- Selected: `border-infinder-lime bg-infinder-lime/5`
- Result banner: green (passed) or amber (try again) banner at top of quiz area

---

## Pass 2d — FundingPage

**File:** `frontend/src/pages/FundingPage.tsx`

### 2d-1: Page header
Add overline + h1 matching the Dashboard pattern.

### 2d-2: Balance display
The current balance should show in a mini dark card (same style as Dashboard balance card but smaller):
```tsx
<div className="rounded-2xl bg-infinder-black text-white p-5 relative overflow-hidden">
  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-infinder-lime/8 blur-2xl pointer-events-none" />
  <p className="text-white/50 text-xs tracking-widest uppercase">{t('fund_current_balance')}</p>
  <p className="text-3xl font-bold mt-1 tabular-nums">EGP {balance.toFixed(2)}</p>
</div>
```

### 2d-3: Method selector tiles
Replace the current method list with proper selectable tiles:
- Each method: `rounded-2xl border-2 p-4 flex items-center gap-4 cursor-pointer transition-all`
- Unselected: `border-gray-200 bg-white hover:border-gray-300`
- Selected: `border-infinder-lime bg-infinder-lime/5 shadow-[0_0_20px_rgba(190,243,94,0.2)]`
- Left: large emoji in `w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl`
- Right: title (`font-semibold`) + subtitle (`text-sm text-gray-500`)
- Far right: `✓` checkmark pill in lime when selected

### 2d-4: Instructions layout
Instapay/Bank instruction blocks:
- Each step as a numbered row: `flex items-start gap-4`
- Step number: `w-8 h-8 rounded-full bg-infinder-lime text-infinder-black font-bold text-sm flex items-center justify-center shrink-0`
- Step content: title bold + desc below
- Code/ID blocks: `font-mono bg-gray-100 rounded-xl px-4 py-2 text-sm` with inline copy button

---

## Pass 2e — ProfilePage

**File:** `frontend/src/pages/ProfilePage.tsx`

### 2e-1: Profile hero card
The top of the profile page needs a dark hero card showing the user's name, KYC status badge, and member-since date — matching the Dashboard balance card style.

### 2e-2: Section cards
Wrap each logical section (Account details, Deposit reference, Wallet, Sharia toggle, Achievements, Learning) in its own `rounded-2xl border border-gray-200 bg-white p-6` card with a section heading. Currently it's one long flat page.

### 2e-3: Transaction list rows
Each transaction row: `flex justify-between items-center py-3 border-b border-gray-100 last:border-0`
- Type icon in `w-8 h-8 rounded-full` colored circle (green for deposit/investment, red for withdrawal)
- Amount in bold with `+/−` prefix colored green/red
- Date in `text-xs text-gray-400`

### 2e-4: Sharia toggle visual
The Sharia toggle section should be a card with a horizontal layout: icon left, title + description middle, toggle right — same visual language as a settings row.

---

## Pass 3 — Global micro-polish

### 3-1: RegisterPage & KycReviewPage
- `RegisterPage`: The step indicators (`1. Personal / 2. Verification / 3. Review`) should use the same progress-bar style as the wizard (colored dots/pills, not plain text).
- `KycReviewPage`: Add a pulsing animation to the "Processing…" state using Framer Motion `animate={{ opacity: [1, 0.4, 1] }}` with `repeat: Infinity`.

### 3-2: AdminPanel
Add motion stagger to the KYC queue rows. Style the approve/reject buttons as proper pill buttons (`rounded-full`) with colors: approve=lime, reject=red outline.

### 3-3: ReportsPage (already has i18n)
- Add overline + h1 header matching the Dashboard pattern
- Section headings (`h2`) need the overline label treatment
- Loading state: replace plain text with a centered spinner (CSS `animate-spin` border circle)

---

## What NOT to change

- `LandingPage` — already production-quality
- `LoginPage` — already polished glassmorphic form
- `Dashboard` — already matches design system perfectly
- `SmartAssistant` — already has full wizard + animations
- All backend files — UI-only changes

---

## Implementation order

1. `AppShell.tsx` (SubpageShell) — affects everything, do first
2. `InvestmentOptions.tsx` — core feature, modal invest flow
3. `RewardsDashboard.tsx` — quick wins
4. `FundingPage.tsx` — method tiles + balance card
5. `ProfilePage.tsx` — section cards + hero
6. `LearningModules.tsx` — most complex, do last
7. `ReportsPage.tsx` — header + spinner
8. `RegisterPage.tsx` + `KycReviewPage.tsx` + `AdminPanel.tsx` — micro-polish
