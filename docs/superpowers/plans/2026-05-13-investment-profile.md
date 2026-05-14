# Investment Profile Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist robo-wizard answers (goal / horizon / risk) on the user record so users never re-answer the same questions and so the wizard can auto-fill on re-entry.

**Architecture:** Add 4 nullable columns to `users`; expose them via a new `/api/profile/investment` route; extend `GET /me` to return them; wire up SmartAssistant wizard to save/restore; add an "Investment Profile" section to ProfilePage and a completion badge on Dashboard.

**Tech Stack:** PostgreSQL / Supabase, Node.js/Express (ESM), React 18 + TypeScript, Tailwind CSS, react-i18next

---

## ⚠️ Column constraint discrepancy — read before implementing

The user's feature spec listed `investment_goal` values as `('preservation','income','growth','aggressive_growth')`. However, the wizard (`SmartAssistant.tsx`) and the backend robo engine (`investments.js`) both hard-code **`preserve`** and **`grow`** as the only valid goal strings. Using the 4-value set would break the robo endpoint.

**Decision: use the wizard's actual values:**
- `investment_goal TEXT CHECK (investment_goal IN ('preserve', 'grow'))`
- `investment_horizon TEXT CHECK (investment_horizon IN ('short', 'medium', 'long'))`
- `risk_tolerance TEXT CHECK (risk_tolerance IN ('low', 'medium', 'high'))`

No RPC is needed — updating 4 columns on a single user row is fully atomic with a plain `UPDATE`.

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/010_investment_profiles.sql` |
| Create | `backend/routes/profile.js` |
| Modify | `backend/routes/auth.js` — extend SELECT in `GET /me` and `PATCH /me` |
| Modify | `backend/server.js` — register new route |
| Modify | `frontend/src/context/AuthContext.tsx` — extend User type |
| Modify | `frontend/src/pages/SmartAssistant.tsx` — auto-fill + post-wizard save |
| Modify | `frontend/src/pages/ProfilePage.tsx` — Investment Profile section |
| Modify | `frontend/src/pages/Dashboard.tsx` — profile-complete badge |

---

### Task 1: Migration — add investment profile columns

**Files:**
- Create: `supabase/migrations/010_investment_profiles.sql`

- [ ] **Step 1: Write migration**

```sql
-- 010_investment_profiles.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS risk_tolerance       TEXT NULL
    CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS investment_horizon   TEXT NULL
    CHECK (investment_horizon IN ('short', 'medium', 'long')),
  ADD COLUMN IF NOT EXISTS investment_goal      TEXT NULL
    CHECK (investment_goal IN ('preserve', 'grow')),
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.users.risk_tolerance       IS 'low | medium | high — robo wizard answer';
COMMENT ON COLUMN public.users.investment_horizon   IS 'short | medium | long — robo wizard answer';
COMMENT ON COLUMN public.users.investment_goal      IS 'preserve | grow — robo wizard answer';
COMMENT ON COLUMN public.users.profile_completed_at IS 'Set when all three profile fields are saved';
```

- [ ] **Step 2: Apply to Supabase**

Go to Supabase dashboard → SQL Editor → paste and run the migration. Confirm the 4 columns appear in `users` schema.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_investment_profiles.sql
git commit -m "feat: add investment profile columns to users"
```

---

### Task 2: Backend — new profile route + extend /me

**Files:**
- Create: `backend/routes/profile.js`
- Modify: `backend/routes/auth.js` lines 57, 129, 144-146
- Modify: `backend/server.js`

#### 2a — Create `backend/routes/profile.js`

- [ ] **Step 1: Write failing test (manual — no test runner configured)**

Mentally verify the endpoint logic against these scenarios before writing:
1. `GET /api/profile/investment` returns `{investment_goal, investment_horizon, risk_tolerance, profile_completed_at}` for the authed user.
2. `PATCH /api/profile/investment` with all 3 fields sets `profile_completed_at = now()` and returns updated values.
3. `PATCH` with only 1 field updates that field, leaves `profile_completed_at` unchanged if any of the 3 remain null.
4. `PATCH` with an invalid value (e.g. `risk_tolerance: 'extreme'`) returns 400.

- [ ] **Step 2: Write `backend/routes/profile.js`**

```js
import { Router } from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const VALID = {
  risk_tolerance:     new Set(['low', 'medium', 'high']),
  investment_horizon: new Set(['short', 'medium', 'long']),
  investment_goal:    new Set(['preserve', 'grow']),
};

router.get('/investment', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .eq('id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    return res.json({ profile: data });
  } catch (e) {
    console.error('get investment profile error:', e?.message);
    return res.status(500).json({ error: 'Failed to load investment profile' });
  }
});

router.patch('/investment', verifyToken, async (req, res) => {
  try {
    const { risk_tolerance, investment_horizon, investment_goal } = req.body;
    const patch = {};

    if (risk_tolerance !== undefined) {
      if (!VALID.risk_tolerance.has(risk_tolerance))
        return res.status(400).json({ error: 'Invalid risk_tolerance — must be low, medium, or high' });
      patch.risk_tolerance = risk_tolerance;
    }
    if (investment_horizon !== undefined) {
      if (!VALID.investment_horizon.has(investment_horizon))
        return res.status(400).json({ error: 'Invalid investment_horizon — must be short, medium, or long' });
      patch.investment_horizon = investment_horizon;
    }
    if (investment_goal !== undefined) {
      if (!VALID.investment_goal.has(investment_goal))
        return res.status(400).json({ error: 'Invalid investment_goal — must be preserve or grow' });
      patch.investment_goal = investment_goal;
    }

    if (Object.keys(patch).length === 0)
      return res.status(400).json({ error: 'No valid fields to update' });

    // Fetch current values to decide whether to set profile_completed_at
    const { data: current } = await supabase
      .from('users')
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .eq('id', req.user.id)
      .single();

    const merged = { ...current, ...patch };
    if (merged.risk_tolerance && merged.investment_horizon && merged.investment_goal && !merged.profile_completed_at) {
      patch.profile_completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select('risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
      .single();

    if (error || !data) return res.status(500).json({ error: 'Failed to update investment profile' });
    return res.json({ profile: data });
  } catch (e) {
    console.error('patch investment profile error:', e?.message);
    return res.status(500).json({ error: 'Failed to update investment profile' });
  }
});

export default router;
```

#### 2b — Register route in `backend/server.js`

- [ ] **Step 3: Add import and mount in server.js**

Open `backend/server.js`. Find the block where other routes are imported and registered (look for lines like `import authRoutes` / `app.use('/api/auth'`). Add:

```js
// at the top with other imports
import profileRoutes from './routes/profile.js';

// with other app.use() calls
app.use('/api/profile', profileRoutes);
```

#### 2c — Extend `GET /me` and `PATCH /me` in `backend/routes/auth.js`

- [ ] **Step 4: Add the 4 new columns to every SELECT in auth.js**

There are three SELECT strings in `auth.js` that name user columns — at lines 57 (register), 129 (PATCH /me), and 144-146 (GET /me). Append `, risk_tolerance, investment_horizon, investment_goal, profile_completed_at` to all three SELECT strings.

Line 57 (register):
```js
.select('id, email, full_name, phone, kyc_status, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
```

Line 129 (PATCH /me):
```js
.select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
```

Lines 144-146 (GET /me):
```js
.select('id, email, full_name, phone, kyc_status, kyc_rejection_reason, sharia_mode, wallet_balance, role, deposit_ref_code, created_at, risk_tolerance, investment_horizon, investment_goal, profile_completed_at')
```

Note: the `login` route (line 95-106) builds a `safe` object manually — add the 4 fields there too:

```js
const safe = {
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  phone: user.phone,
  kyc_status: user.kyc_status,
  sharia_mode: user.sharia_mode,
  wallet_balance: Number(user.wallet_balance),
  role: user.role,
  deposit_ref_code: user.deposit_ref_code,
  created_at: user.created_at,
  risk_tolerance: user.risk_tolerance ?? null,
  investment_horizon: user.investment_horizon ?? null,
  investment_goal: user.investment_goal ?? null,
  profile_completed_at: user.profile_completed_at ?? null,
};
```

- [ ] **Step 5: Commit**

```bash
git add backend/routes/profile.js backend/server.js backend/routes/auth.js
git commit -m "feat: add /api/profile/investment endpoints and extend /me with profile fields"
```

---

### Task 3: Frontend — extend User type in AuthContext

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx` lines 4-16

- [ ] **Step 1: Extend the `User` type**

In `frontend/src/context/AuthContext.tsx`, update the `User` type (lines 4-16):

```ts
export type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  kyc_rejection_reason?: string | null;
  sharia_mode: boolean;
  wallet_balance: number;
  role: string;
  deposit_ref_code?: string | null;
  created_at?: string;
  risk_tolerance?: 'low' | 'medium' | 'high' | null;
  investment_horizon?: 'short' | 'medium' | 'long' | null;
  investment_goal?: 'preserve' | 'grow' | null;
  profile_completed_at?: string | null;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors related to User type

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "feat: add investment profile fields to User type"
```

---

### Task 4: Frontend — SmartAssistant wizard auto-fill + save

**Files:**
- Modify: `frontend/src/pages/SmartAssistant.tsx`

The wizard has 7 steps (0-6). Steps 0/1/2 collect goal/horizon/risk. Step 3 collects sharia. Step 4 collects amount. Step 5 is a confirm screen. Step 6 shows the result.

Two changes needed:
1. When the user switches to wizard mode and has a saved profile, offer a "Use saved answers" shortcut at step 0.
2. After `confirmWizard()` succeeds (step reaches 6), silently save the profile.

- [ ] **Step 1: Add `useEffect` to initialize wizard from saved profile**

In `SmartAssistant.tsx`, add an effect that runs when `mode` switches to `'wizard'` and the user has a saved profile. Add after the existing state declarations (around line 57):

```ts
// Auto-populate wizard state from saved profile when entering wizard mode
useEffect(() => {
  if (mode === 'wizard' && user) {
    if (user.investment_goal)    setGoal(user.investment_goal);
    if (user.investment_horizon) setHorizon(user.investment_horizon);
    if (user.risk_tolerance)     setRisk(user.risk_tolerance);
    if (user.sharia_mode !== undefined) setSharia(user.sharia_mode);
  }
}, [mode, user]);
```

- [ ] **Step 2: Add "Use saved profile" banner to step 0**

In the wizard `wizardStep === 0` block (around line 404), insert a banner above the goal cards when the user has a saved profile:

```tsx
{wizardStep === 0 && (
  <motion.div key="s0" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6">
    {/* Saved profile shortcut */}
    {user.investment_goal && user.investment_horizon && user.risk_tolerance && (
      <div className="mb-5 rounded-xl bg-infinder-lime/10 dark:bg-infinder-lime/5 border border-infinder-lime/30 p-3 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-infinder-black dark:text-white">Saved: </span>
          {user.investment_goal === 'preserve' ? 'Preserve capital' : 'Grow wealth'} ·{' '}
          {user.investment_horizon}-term · {user.risk_tolerance} risk
        </p>
        <button
          type="button"
          onClick={() => {
            setGoal(user.investment_goal!);
            setHorizon(user.investment_horizon!);
            setRisk(user.risk_tolerance!);
            setSharia(user.sharia_mode);
            setWizardStep(4);
          }}
          className="shrink-0 rounded-lg bg-infinder-lime text-infinder-black text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition"
        >
          Use saved
        </button>
      </div>
    )}
    <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white">{t('wizard_goal_title')}</h2>
    {/* ... rest of existing step 0 content unchanged ... */}
```

Note: replace the opening `<motion.div key="s0"...>` tag and add the banner inside it. Keep all the existing goal option buttons below unchanged.

- [ ] **Step 3: Save profile after wizard confirms allocation**

In `confirmWizard()` (lines 131-150), add a silent save after `setWizardStep(6)`:

```ts
async function confirmWizard() {
  if (!goal || !horizon || !risk || sharia === null) return;
  setLoading(true);
  try {
    const { data } = await api.post('/api/investments/robo', {
      goal,
      horizon,
      risk,
      isSharia: sharia,
    });
    setWizardAlloc(data.allocation);
    setWizardLabel(data.label || 'Suggested portfolio');
    setWizardExplanation(data.explanation || '');
    setWizardStep(6);

    // Silently persist profile answers — failure is non-critical
    api.patch('/api/profile/investment', {
      investment_goal: goal,
      investment_horizon: horizon,
      risk_tolerance: risk,
    }).then(() => refreshMe()).catch(() => {});
  } catch {
    showAlert('Error', t('wizard_error_robo'));
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 4: Check TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SmartAssistant.tsx
git commit -m "feat: wizard auto-fills from saved profile and saves after confirmation"
```

---

### Task 5: Frontend — ProfilePage "Investment Profile" section

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`

The ProfilePage has multiple sections. The new "Investment Profile" section should appear after the "Account Details" section and before the wallet/transactions section.

- [ ] **Step 1: Add local state for profile editing**

In `ProfilePage.tsx`, after the existing state declarations near the top of the component function, add:

```ts
const [editingProfile, setEditingProfile] = useState(false);
const [profGoal, setProfGoal]       = useState<string>(user?.investment_goal ?? '');
const [profHorizon, setProfHorizon] = useState<string>(user?.investment_horizon ?? '');
const [profRisk, setProfRisk]       = useState<string>(user?.risk_tolerance ?? '');
const [profSaving, setProfSaving]   = useState(false);
```

- [ ] **Step 2: Add `saveInvestmentProfile` function**

After the existing save/update functions in ProfilePage, add:

```ts
async function saveInvestmentProfile() {
  if (!profGoal || !profHorizon || !profRisk) {
    showAlert('Incomplete', 'Please fill in all three fields.', 'warning');
    return;
  }
  setProfSaving(true);
  try {
    await api.patch('/api/profile/investment', {
      investment_goal: profGoal,
      investment_horizon: profHorizon,
      risk_tolerance: profRisk,
    });
    await refreshMe();
    setEditingProfile(false);
    showToast('Investment profile updated');
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } };
    showAlert('Error', ax.response?.data?.error || 'Failed to save profile');
  } finally {
    setProfSaving(false);
  }
}
```

- [ ] **Step 3: Add the Investment Profile section JSX**

Find a good insertion point in the ProfilePage JSX — after the Account Details card and before the wallet/transactions section. Add:

```tsx
{/* ─── Investment Profile ──────────────────────────────── */}
<section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Investment Profile</h2>
      {user.profile_completed_at && (
        <span className="inline-flex items-center gap-1 rounded-full bg-infinder-green/15 text-infinder-black dark:text-infinder-lime text-xs font-semibold px-2 py-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Profile complete
        </span>
      )}
    </div>
    {!editingProfile && (
      <button
        type="button"
        onClick={() => {
          setProfGoal(user.investment_goal ?? '');
          setProfHorizon(user.investment_horizon ?? '');
          setProfRisk(user.risk_tolerance ?? '');
          setEditingProfile(true);
        }}
        className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {user.investment_goal ? 'Update' : 'Set up'}
      </button>
    )}
  </div>

  {!editingProfile ? (
    user.investment_goal ? (
      <dl className="grid sm:grid-cols-3 gap-4 text-sm">
        {[
          { label: 'Goal', value: user.investment_goal === 'preserve' ? 'Preserve capital' : 'Grow wealth' },
          { label: 'Horizon', value: user.investment_horizon ? `${user.investment_horizon.charAt(0).toUpperCase()}${user.investment_horizon.slice(1)}-term` : '—' },
          { label: 'Risk tolerance', value: user.risk_tolerance ? `${user.risk_tolerance.charAt(0).toUpperCase()}${user.risk_tolerance.slice(1)}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/[0.04] px-4 py-3">
            <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No investment profile set. Complete the{' '}
        <a href="/assistant" className="underline hover:text-gray-900 dark:hover:text-white">robo-advisor wizard</a>{' '}
        or click "Set up" to save your preferences.
      </p>
    )
  ) : (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal</label>
        <select
          value={profGoal}
          onChange={(e) => setProfGoal(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none"
        >
          <option value="">Select…</option>
          <option value="preserve">Preserve capital</option>
          <option value="grow">Grow wealth</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Time horizon</label>
        <select
          value={profHorizon}
          onChange={(e) => setProfHorizon(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none"
        >
          <option value="">Select…</option>
          <option value="short">Short-term (≤ 2 years)</option>
          <option value="medium">Medium-term (2–5 years)</option>
          <option value="long">Long-term (5+ years)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Risk tolerance</label>
        <select
          value={profRisk}
          onChange={(e) => setProfRisk(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none"
        >
          <option value="">Select…</option>
          <option value="low">Low — preserve first</option>
          <option value="medium">Medium — balanced</option>
          <option value="high">High — growth focused</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={saveInvestmentProfile}
          disabled={profSaving}
          className="rounded-xl bg-infinder-lime text-infinder-black font-semibold px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {profSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditingProfile(false)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</section>
```

- [ ] **Step 4: Check TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "feat: add Investment Profile section to ProfilePage"
```

---

### Task 6: Frontend — Dashboard profile-complete badge

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

The dashboard has 3 quick-nav cards: Learn (with progress bar), Invest, and Profile. The Profile card is the right place for the completion badge.

- [ ] **Step 1: Add badge to the Profile quick-nav card**

In `Dashboard.tsx`, find the quick-nav card array (around line 158). The Profile card entry looks like:
```ts
{ to: '/profile', emoji: '👤', title: t('dashboard_profile_title'), desc: t('dashboard_profile_desc') }
```

Extend it to include an `extra` field:

```ts
{
  to: '/profile',
  emoji: '👤',
  title: t('dashboard_profile_title'),
  desc: t('dashboard_profile_desc'),
  extra: user.profile_completed_at ? (
    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-infinder-green/15 text-infinder-black dark:text-infinder-lime text-xs font-semibold px-2.5 py-1">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Profile complete
    </div>
  ) : (
    <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">Set up investment profile</div>
  ),
},
```

Note: the existing Learn card already uses an `extra` field (lines 165-178). The Profile and Invest card entries must also accept an `extra` field — the map renderer uses `{ extra }` in its destructure. Verify the card renderer already handles `extra` (line 192 area). If it's typed, update the local type to make `extra` optional for all cards.

- [ ] **Step 2: Check TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: show profile-complete badge on Dashboard profile card"
```

---

## End-to-end verification checklist

After all tasks:

- [ ] New user registers → `GET /api/auth/me` returns all 4 profile fields as `null`
- [ ] Open wizard, complete all 3 steps, reach step 6 (allocation shown) → `GET /api/auth/me` returns the saved goal/horizon/risk
- [ ] Open wizard again → step 0 shows "Saved: … Use saved" banner
- [ ] Click "Use saved" → jumps to step 4 (amount) with pre-filled values
- [ ] ProfilePage → Investment Profile section shows the saved values + green badge
- [ ] ProfilePage → "Update" button → select new values → Save → section updates
- [ ] Dashboard → Profile card shows green "Profile complete" badge
- [ ] User with no profile → dashboard card shows "Set up investment profile" text
- [ ] `PATCH /api/profile/investment` with bad value (e.g. `risk_tolerance: 'extreme'`) → 400 error
