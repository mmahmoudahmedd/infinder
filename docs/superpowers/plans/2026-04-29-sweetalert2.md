# SweetAlert2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all inline `msg`/`err` text feedback across 7 pages with INFINDER-themed SweetAlert2 toasts (success) and popups (errors), keeping both existing custom modals untouched.

**Architecture:** A single `swal.ts` utility creates two themed helpers — `showToast` and `showAlert` — built from a shared `Swal.mixin`. All pages import only from this utility, never from `sweetalert2` directly. State variables and JSX display blocks are removed after wiring.

**Tech Stack:** React, TypeScript, sweetalert2 ^11

---

## Files

| File | Change |
|---|---|
| `frontend/src/lib/swal.ts` | Create — themed SweetAlert2 utility |
| `frontend/src/pages/LoginPage.tsx` | Remove `err` state/JSX, call `showAlert` |
| `frontend/src/pages/RegisterPage.tsx` | Remove `err` state/JSX, call `showAlert` |
| `frontend/src/pages/ProfilePage.tsx` | Remove `msg` state/JSX, call `showToast`/`showAlert` |
| `frontend/src/pages/SmartAssistant.tsx` | Remove `err` state/JSX, call `showAlert` |
| `frontend/src/pages/FundingPage.tsx` | Remove `msg` state/JSX, call `showToast`/`showAlert` |
| `frontend/src/pages/InvestmentOptions.tsx` | Remove `investMsg` state/JSX inside modal, call `showToast`/`showAlert` |
| `frontend/src/pages/AdminPanel.tsx` | Remove `msg` state/JSX, call `showToast`/`showAlert` |

---

## Task 1: Install SweetAlert2 and create the themed utility

**Files:**
- Create: `frontend/src/lib/swal.ts`

- [ ] **Step 1: Install the package**

```bash
cd frontend && npm install sweetalert2
```

Expected: `sweetalert2` added to `package.json` dependencies.

- [ ] **Step 2: Create `frontend/src/lib/swal.ts`**

```ts
import Swal from 'sweetalert2';

const base = Swal.mixin({
  customClass: {
    popup: '!rounded-2xl',
    confirmButton: '!rounded-full !bg-[#BEF35E] !text-[#0a0a0a] !font-semibold !px-6 !py-2.5 !text-sm',
    title: '!font-bold !text-[#0a0a0a] !text-lg',
    htmlContainer: '!text-gray-600 !text-sm',
  },
  buttonsStyling: false,
});

const toastMixin = base.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  iconColor: '#BEF35E',
});

export function showToast(title: string, icon: 'success' | 'info' = 'success') {
  return toastMixin.fire({ title, icon });
}

export function showAlert(
  title: string,
  text?: string,
  icon: 'error' | 'warning' | 'info' = 'error',
) {
  return base.fire({ title, text, icon });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/swal.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add INFINDER-themed SweetAlert2 utility (showToast + showAlert)"
```

---

## Task 2: LoginPage + RegisterPage

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/RegisterPage.tsx`

### LoginPage.tsx

- [ ] **Step 1: Read the file, then apply changes**

Remove:
```tsx
const [err, setErr] = useState('');
```
Remove:
```tsx
setErr('');
```
Replace:
```tsx
setErr(t('auth_invalid_credentials'));
```
with:
```tsx
showAlert('Login failed', t('auth_invalid_credentials'));
```
Remove the inline error div:
```tsx
{err && (
  <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
    {err}
  </div>
)}
```
Add import at top of file:
```tsx
import { showAlert } from '../lib/swal';
```

### RegisterPage.tsx

- [ ] **Step 2: Apply same pattern to RegisterPage**

Remove:
```tsx
const [err, setErr] = useState('');
```
Remove:
```tsx
setErr('');
```
Replace:
```tsx
setErr(t('auth_create_error'));
```
with:
```tsx
showAlert('Registration failed', t('auth_create_error'));
```
Remove the inline error div:
```tsx
{err && (
  <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
    {err}
  </div>
)}
```
Add import at top of file:
```tsx
import { showAlert } from '../lib/swal';
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "feat: replace inline auth error divs with SweetAlert2 popups"
```

---

## Task 3: ProfilePage

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Add import**

Add at the top of the file:
```tsx
import { showToast, showAlert } from '../lib/swal';
```

- [ ] **Step 2: Replace all msg calls**

Replace `setMsg(t('profile_saved'))` with:
```tsx
showToast(t('profile_saved'));
```

Replace `setMsg(t('profile_save_error'))` with:
```tsx
showAlert('Save failed', t('profile_save_error'));
```

Replace `setMsg(t('profile_ref_copied'))` with:
```tsx
showToast('Copied!');
```

- [ ] **Step 3: Remove msg state and display JSX**

Remove:
```tsx
const [msg, setMsg] = useState('');
```
Remove all remaining `setMsg('')` reset calls.

Remove:
```tsx
{msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "feat: replace ProfilePage inline feedback with SweetAlert2 toasts and alerts"
```

---

## Task 4: SmartAssistant

**Files:**
- Modify: `frontend/src/pages/SmartAssistant.tsx`

- [ ] **Step 1: Add import**

Add at the top of the file:
```tsx
import { showAlert } from '../lib/swal';
```

- [ ] **Step 2: Replace all err calls**

Replace:
```tsx
setErr(t('chat_error_failed'));
```
with:
```tsx
showAlert('Request failed', t('chat_error_failed'));
```

Replace:
```tsx
setErr(t('wizard_error_robo'));
```
with:
```tsx
showAlert('Error', t('wizard_error_robo'));
```

Replace:
```tsx
setErr(t('common_invest_error'));
```
with:
```tsx
showAlert('Invalid amount', t('common_invest_error'), 'warning');
```

Replace:
```tsx
setErr(ax.response?.data?.error || t('common_invest_failed'));
```
with:
```tsx
showAlert('Investment failed', ax.response?.data?.error || t('common_invest_failed'));
```

- [ ] **Step 3: Remove err state, resets, and display JSX**

Remove:
```tsx
const [err, setErr] = useState('');
```
Remove all `setErr('')` reset calls.

Remove both err display paragraphs:
```tsx
{err && <p className="mt-4 text-sm text-red-600">{err}</p>}
```
```tsx
{err && mode === 'chat' && <p className="mt-4 text-sm text-red-600">{err}</p>}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SmartAssistant.tsx
git commit -m "feat: replace SmartAssistant inline errors with SweetAlert2 popups"
```

---

## Task 5: FundingPage

**Files:**
- Modify: `frontend/src/pages/FundingPage.tsx`

**Important:** Do NOT touch the `withdrawOpen` modal state or its JSX overlay.

- [ ] **Step 1: Add import**

Add at the top of the file:
```tsx
import { showToast, showAlert } from '../lib/swal';
```

- [ ] **Step 2: Replace all msg calls**

Replace `setMsg(t('fund_invalid'))` with:
```tsx
showAlert('Invalid amount', t('fund_invalid'), 'warning');
return;
```
(remove the existing `return;` that follows `setMsg(t('fund_invalid'))` since it's already there — just merge)

Replace `setMsg(t('fund_success'))` with:
```tsx
showToast(t('fund_success'));
```

Replace `setMsg(t('fund_error'))` with:
```tsx
showAlert('Payment failed', t('fund_error'));
```

Replace `setMsg(t('fund_withdraw_success'))` with:
```tsx
showToast(t('fund_withdraw_success'));
```

Replace `setMsg(t('fund_withdraw_error'))` with:
```tsx
showAlert('Withdrawal failed', t('fund_withdraw_error'));
```

Replace `setMsg(t('fund_copied'))` with:
```tsx
showToast('Copied!');
```

- [ ] **Step 3: Remove msg state, resets, and display JSX**

Remove:
```tsx
const [msg, setMsg] = useState('');
```
Remove all `setMsg('')` reset calls.

Remove:
```tsx
{msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/FundingPage.tsx
git commit -m "feat: replace FundingPage inline feedback with SweetAlert2 toasts and alerts"
```

---

## Task 6: InvestmentOptions

**Files:**
- Modify: `frontend/src/pages/InvestmentOptions.tsx`

**Important:** Do NOT touch the `investModal` overlay JSX or `investModal`/`investAmt` state.

- [ ] **Step 1: Add import**

Add at the top of the file:
```tsx
import { showToast, showAlert } from '../lib/swal';
```

- [ ] **Step 2: Replace investMsg calls inside the modal confirm handler**

Inside the `onClick` async handler of the "Confirm & invest" button, replace:
```tsx
setInvestMsg('Investment placed successfully!');
setTimeout(() => setInvestModal(null), 1500);
```
with:
```tsx
showToast('Investment placed successfully!');
setInvestModal(null);
```

Replace:
```tsx
setInvestMsg('Something went wrong. Please try again.');
```
with:
```tsx
showAlert('Investment failed', 'Something went wrong. Please try again.');
```

- [ ] **Step 3: Remove investMsg state and display JSX**

Remove:
```tsx
const [investMsg, setInvestMsg] = useState('');
```

Remove inside the modal JSX:
```tsx
{investMsg && <p className="mt-2 text-sm text-green-600">{investMsg}</p>}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/InvestmentOptions.tsx
git commit -m "feat: replace InvestmentOptions modal feedback with SweetAlert2 toasts and alerts"
```

---

## Task 7: AdminPanel

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Add import**

Add at the top of the file:
```tsx
import { showToast, showAlert } from '../lib/swal';
```

- [ ] **Step 2: Replace all msg calls**

Replace `setMsg(t('admin_load_error'))` with:
```tsx
showAlert('Load error', t('admin_load_error'));
```

Replace `setMsg(t('admin_approved_msg'))` with:
```tsx
showToast(t('admin_approved_msg'));
```

Replace `setMsg(t('admin_rejected_msg'))` with:
```tsx
showToast(t('admin_rejected_msg'));
```

- [ ] **Step 3: Remove msg state, resets, and display JSX**

Remove:
```tsx
const [msg, setMsg] = useState('');
```
Remove all `setMsg('')` reset calls.

Remove:
```tsx
{msg && <p className="text-sm text-gray-700 mt-3">{msg}</p>}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: replace AdminPanel inline feedback with SweetAlert2 toasts and alerts"
```
