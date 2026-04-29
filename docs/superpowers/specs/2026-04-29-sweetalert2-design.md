# SweetAlert2 Integration Design Spec

**Date:** 2026-04-29
**Scope:** Replace all inline `msg`/`err` feedback text across the authenticated app with SweetAlert2 themed toasts and popups. Custom modals (FundingPage withdrawal, InvestmentOptions invest) are explicitly excluded.

---

## Design tokens

Colors from `tailwind.config.ts`:
- `infinder-lime`: `#BEF35E`
- `infinder-green`: `#76D74F`
- `infinder-black`: `#0a0a0a`
- Font: `Inter` (global sans)

---

## Utility: `frontend/src/lib/swal.ts` (new file)

Single source of truth for all SweetAlert2 usage in the app. Two exports:

### `toast(title, icon?)`
- Toast notification — bottom-right corner, auto-dismisses after 2500ms
- Non-blocking, small footprint
- Used for: all **success** confirmations (saved, copied, invested, approved, etc.)
- Default icon: `'success'`
- Icon color: `#BEF35E` (lime)
- Timer progress bar: enabled

### `fireAlert(title, text?, icon?)`
- Centered popup — requires user to click OK to dismiss
- Used for: all **errors** and **warnings**
- Default icon: `'error'`
- Confirm button: lime background (`#BEF35E`), dark text (`#0a0a0a`), `rounded-full px-6 py-2.5 font-semibold text-sm`
- `buttonsStyling: false` so Tailwind-style classes apply

### Shared mixin options
```ts
customClass: {
  popup: '!rounded-2xl !font-sans',
  confirmButton: '!rounded-full !bg-[#BEF35E] !text-[#0a0a0a] !font-semibold !px-6 !py-2.5 !text-sm',
  title: '!font-bold !text-[#0a0a0a]',
  htmlContainer: '!text-gray-600 !text-sm',
},
buttonsStyling: false,
```

---

## Replacement rules

| Current pattern | Replace with |
|---|---|
| `setMsg(t('...success...'))` + `{msg && <p>}` | `toast(t('...'))` — remove state entirely |
| `setMsg(t('...error...'))` + `{msg && <p>}` | `fireAlert('Error', t('...'))` — remove state |
| `setErr(t('...'))` + `{err && <div>}` (inline) | `fireAlert('Error', t('...'))` — remove state |
| Clipboard copy success | `toast('Copied!')` |

**State removal:** After replacing, delete the `useState` declaration, all `setState` calls, and the JSX display block if they are no longer used for anything else.

---

## Files changed

### `frontend/src/lib/swal.ts` ← new
Full themed helper as described above.

### `frontend/src/pages/LoginPage.tsx`
- `setErr(t('auth_invalid_credentials'))` → `fireAlert('Login failed', t('auth_invalid_credentials'))`
- Remove `err` state + inline error div

### `frontend/src/pages/RegisterPage.tsx`
- `setErr(t('auth_create_error'))` → `fireAlert('Registration failed', t('auth_create_error'))`
- Remove `err` state + inline error div

### `frontend/src/pages/ProfilePage.tsx`
- `setMsg(t('profile_saved'))` → `toast(t('profile_saved'))`
- `setMsg(t('profile_save_error'))` → `fireAlert('Save failed', t('profile_save_error'))`
- `setMsg(t('profile_ref_copied'))` → `toast('Copied!')`
- Remove `msg` state + inline `{msg && <p>}`

### `frontend/src/pages/SmartAssistant.tsx`
- All `setErr(...)` → `fireAlert('Error', ...)`
- Remove `err` state + both inline error `<p>` elements

### `frontend/src/pages/FundingPage.tsx`
- `setMsg(t('fund_success'))` → `toast(t('fund_success'))`
- `setMsg(t('fund_error'))` → `fireAlert('Error', t('fund_error'))`
- `setMsg(t('fund_withdraw_success'))` → `toast(t('fund_withdraw_success'))`
- `setMsg(t('fund_withdraw_error'))` → `fireAlert('Error', t('fund_withdraw_error'))`
- `setMsg(t('fund_copied'))` → `toast('Copied!')`
- `setMsg(t('fund_invalid'))` → `fireAlert('Invalid amount', t('fund_invalid'))`
- Remove `msg` state + `{msg && <p>}`
- **Do NOT touch** the `withdrawOpen` modal

### `frontend/src/pages/InvestmentOptions.tsx`
- `setInvestMsg('Investment placed successfully!')` → `toast('Investment placed!')`
- `setInvestMsg('Investment failed.')` or similar error → `fireAlert('Investment failed', '...')`
- Remove `investMsg` state + `{investMsg && <p>}`
- **Do NOT touch** the `investModal` overlay

### `frontend/src/pages/AdminPanel.tsx`
- `setMsg(t('admin_approved_msg'))` → `toast(t('admin_approved_msg'))`
- `setMsg(t('admin_rejected_msg'))` → `toast(t('admin_rejected_msg'))`
- `setMsg(t('admin_load_error'))` → `fireAlert('Load error', t('admin_load_error'))`
- Remove `msg` state + `{msg && <p>}`

---

## What NOT to change

- `FundingPage` withdrawal modal (`withdrawOpen` state + overlay JSX)
- `InvestmentOptions` invest modal (`investModal` state + overlay JSX)
- Loading spinners / loading text (not feedback)
- `LearningModules` quiz result banner (it's a UI element, not a feedback toast)
- `LoginPage` / `RegisterPage` inline error divs style — these are already styled; just remove them after wiring SweetAlert2
- All backend files

---

## Implementation order

1. Install `sweetalert2`: `npm install sweetalert2` in `frontend/`
2. Create `frontend/src/lib/swal.ts`
3. Update each page file (can be done in parallel per file)
4. Run `npx tsc --noEmit` to verify no TypeScript errors
