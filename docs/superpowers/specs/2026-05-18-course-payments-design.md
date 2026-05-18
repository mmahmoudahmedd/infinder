---
name: course-payments
description: Design for monetising Learning Hub courses at 1,000 EGP each, using the existing wallet system, with a purchase-confirmation modal.
metadata:
  type: project
---

# Course Payments Design

**Date:** 2026-05-18
**Status:** Approved

## Overview

Each Learning Hub course costs 1,000 EGP. Payment is deducted from the user's existing in-app wallet. Unpaid users can browse course details and see the lesson list but cannot open any lesson. A purchase-confirmation modal handles the transaction inline — no separate checkout page.

---

## Data Layer

### `course_purchases` table (new)

| column | type | notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → auth.users | not null |
| course_id | int | not null |
| amount | numeric | default 1000 |
| purchased_at | timestamptz | default now() |

- Unique constraint on `(user_id, course_id)` — one purchase per user per course.
- RLS enabled; policy: users can read/insert only their own rows.

### `transactions` row on purchase

A row is inserted into the existing `transactions` table alongside the purchase:
- `type`: `'course_purchase'`
- `amount`: 1000
- `gross_amount`: 1000
- `fee_amount`: 0
- `net_amount`: 1000
- `status`: `'completed'`
- `meta`: `{ course_id, course_title }`

---

## Backend (`backend/routes/learning.js`)

### `GET /api/learning/purchases`
Returns purchased course IDs for the authenticated user.
```json
{ "purchased": [1, 3] }
```
Fails gracefully (returns `[]`) if the table doesn't exist yet.

### `POST /api/learning/purchase`
Body: `{ course_id: number }`

Steps:
1. Reject if `course_id` missing.
2. Check if already purchased — return `{ ok: true, already_owned: true }` (idempotent).
3. Fetch `wallet_balance` from `users`.
4. Reject with `{ error: 'insufficient_balance', balance }` if balance < 1000.
5. Deduct 1000 from `wallet_balance`.
6. Insert into `course_purchases`.
7. Insert into `transactions` (type `course_purchase`).
8. Return `{ ok: true, wallet_balance: <new> }`.

All steps 5–7 run sequentially; if any fails, return 500 (no rollback needed — partial state is detectable and safe).

---

## Frontend (`LearningHub.tsx`)

### New state
- `purchases: Set<number>` — course IDs the user has bought, loaded on mount alongside progress.
- `purchaseTarget: Course | null` — the course currently shown in the purchase modal.
- `walletBalance: number` — fetched from user profile or returned by the purchase endpoint.

### On mount
`GET /api/learning/purchases` and `GET /api/user/me` (or existing profile endpoint) run in parallel. `purchases` and `walletBalance` are set from responses.

### `COURSES` array
Each course gains `price: 1000`.

### HubScreen changes
- Unpaid course → button label: **"Enroll — 1,000 EGP"**, onClick opens `PurchaseModal`.
- Paid course → button label: **"Continue"**, onClick navigates to course detail (existing behaviour).

### DetailScreen changes
- If not purchased: each lesson row shows a padlock icon; clicking a lesson row opens `PurchaseModal` instead of navigating to the lesson.
- Sidebar CTA: **"Enroll — 1,000 EGP"** if unpaid, **"Continue Learning"** if paid.

### `PurchaseModal` component (new, inline in LearningHub.tsx)
Props: `{ course, walletBalance, onConfirm, onClose, onFundWallet }`

Renders:
- Course title + price (1,000 EGP)
- "Your balance: X EGP" — green if ≥ 1000, red if < 1000
- **If balance ≥ 1000:** "Confirm Purchase" button (course color) + "Cancel"
- **If balance < 1000:** "Confirm Purchase" disabled + "Fund Wallet →" button (navigates to `/funding`) + "Cancel"
- Loading spinner while the API call is in flight (disable buttons)

### After successful purchase
1. `purchases` state updated (add `course.id`).
2. `walletBalance` updated to new value from response.
3. Enrollment also recorded (existing `handleEnroll` flow runs).
4. Modal closes.
5. Toast: "Course purchased!"
6. Navigate to course detail.

---

## Supabase migration SQL

```sql
-- Run in Supabase SQL editor
CREATE TABLE course_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id int not null,
  amount numeric not null default 1000,
  purchased_at timestamptz default now(),
  unique (user_id, course_id)
);

ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own purchases"
ON course_purchases
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Error states

| Scenario | Behaviour |
|---|---|
| Balance < 1,000 EGP | Modal shows red balance + "Fund Wallet" button; confirm disabled |
| API call fails (network) | Toast "Purchase failed, try again"; modal stays open |
| Already purchased (race condition) | Backend returns `already_owned: true`; frontend treats as success |
| `course_purchases` table missing | GET returns `[]`; POST returns 500 with toast error |
