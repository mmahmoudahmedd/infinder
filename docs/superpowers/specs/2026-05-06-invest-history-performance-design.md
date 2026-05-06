# Design: Investment Execution, Transaction History & Portfolio Performance

**Date:** 2026-05-06  
**Status:** Approved

---

## Overview

Three features that complete the core investment loop in INFINDER:

1. **Investment Execution** — let users act on a robo-advisor recommendation by committing wallet funds
2. **Transaction History** — surface past deposits, withdrawals, and investments on the Dashboard
3. **Portfolio Performance** — show real P&L on the Analytics page using Alpha Vantage benchmark data

---

## Feature 1: Investment Execution

### Where
`/assistant` page — both chat mode and wizard mode. Both already have amount inputs and a "Confirm & Invest" / "Invest Now" button that calls the existing `POST /api/investments/apply` endpoint.

### What's already built
- `POST /api/investments/apply` — fully implemented (wallet deduction, portfolio creation, transaction insert, rewards evaluation)
- `confirmInvest()` function in `SmartAssistant.tsx` — calls the endpoint, refreshes wallet
- Wizard step 6 shows allocation pie chart + "Invest Now" button
- Chat mode shows allocation panel + amount input + "Confirm & Invest" button

### What's missing (frontend only)
Two additions to `SmartAssistant.tsx`:

1. **"Invest All" button** next to the amount input in both modes — clicking it sets `investAmount` to `user.wallet_balance.toFixed(2)`

2. **Live allocation breakdown** below the amount input in both modes — updates as user types:
   - One row per category with non-zero allocation: `Stocks — 800.00 EGP`, `Gold — 600.00 EGP`
   - Calculated as `(allocation_pct / 100) * Number(investAmount)`
   - Only shown when `investAmount` is a valid positive number

3. **Disabled state** on the invest button when `Number(investAmount) > user.wallet_balance`, with inline red warning: "Insufficient balance"

---

## Feature 2: Transaction History

### Where
New section at the bottom of the Dashboard page (`/dashboard`), below the existing assistant/learn/invest quick-links.

### What's already built
- `GET /api/payments/history` — fully implemented, returns up to 100 transactions ordered by `created_at` desc

### What's missing (frontend only)
New "Recent Transactions" section in `Dashboard.tsx`:

- Call `GET /api/payments/history` on mount (alongside existing data fetches)
- Display the first 10 rows; "Show all" button expands inline to show all — no new route
- Each row:
  - Icon: deposit = green arrow-down, withdrawal = red arrow-up, investment = lime chart/trending-up icon
  - Description: `"Deposit"`, `"Withdrawal"`, or `"Investment"` + allocation summary from `meta.allocation` (e.g. "Stocks 40% · Gold 30%")
  - Amount: `+1,000 EGP` green for deposit / `-500 EGP` red for withdrawal/investment
  - Date: formatted as "May 6, 2026"
  - Status badge: `completed` (green pill) / `pending` (yellow pill)
- Empty state: "No transactions yet — fund your wallet to get started."

---

## Feature 3: Portfolio Performance

### Where
New "Your Performance" section added at the **top** of the Analytics page (`/reports`), above the existing allocation bar chart.

### UI
Three headline stat cards in a row:

| Total Invested | Current Value | Overall Return |
|---|---|---|
| 10,000 EGP | 10,354 EGP | +3.54% ↑ |

Below the headline cards, a per-category breakdown table:

| Category | Invested | Current Value | Return |
|---|---|---|---|
| Stocks | 4,000 EGP | 3,994 EGP | -0.15% |
| Stock Baskets | 1,000 EGP | 961.8 EGP | -3.82% |
| Bonds | 2,000 EGP | 1,986.6 EGP | -0.67% |
| Gold | 3,000 EGP | 3,106.2 EGP | +3.54% |

- Positive returns shown in green (`infinder-lime`), negative in red
- Empty state (no investments): same placeholder already on the page — "No investments recorded yet."
- No new endpoint needed — extend existing `GET /api/analytics/holdings`

### Backend: Extend `GET /api/analytics/holdings`

Add performance calculation to existing logic:

1. For each portfolio row, record its `created_at` date
2. Fetch the Alpha Vantage price series for each category's benchmark (SPY, QQQ, TLT, XAU/USD) — already cached in `seriesCache`
3. For each category with invested funds:
   - Find the series entry closest to the portfolio's `created_at` date (or earliest available)
   - Calculate: `current_value = invested_amount * (current_price_index / invest_date_price_index)`
   - `return_pct = ((current_price_index / invest_date_price_index) - 1) * 100`
4. Aggregate across multiple portfolios by weighted average
5. Fallback: if series data unavailable for the invest date, use `expected_return` from DB as static annual rate, prorated by days held

**Extended response shape:**
```json
{
  "total_invested_egp": 10000,
  "total_current_value_egp": 10354,
  "total_return_pct": 3.54,
  "bucket_breakdown": [
    {
      "key": "stocks",
      "amount_egp": 4000,
      "current_value_egp": 3994,
      "return_pct": -0.15,
      "pct_of_invested": 40
    }
  ],
  "portfolios": [...]
}
```

---

## Data Flow Summary

```
User on /assistant
  → enters amount → clicks Confirm
  → POST /api/investments/invest
  → wallet deducted, portfolio + transaction created
  → refreshMe() updates wallet display

User on /dashboard
  → GET /api/payments/transactions
  → shows last 10 rows; "Show all" expands inline

User on /reports
  → GET /api/analytics/holdings (extended)
  → performance section shows P&L using Alpha Vantage series
  → existing allocation chart and benchmark charts unchanged
```

---

## Files to Create / Modify

**Backend (only one file needs changes):**
- `backend/routes/analytics.js` — extend `GET /holdings` to also return `current_value_egp`, `total_return_pct`, and per-bucket `return_pct` / `current_value_egp`

**Frontend (three files need changes):**
- `frontend/src/pages/SmartAssistant.tsx` — add "Invest All" button + live allocation breakdown + disabled/warning state
- `frontend/src/pages/Dashboard.tsx` — add Recent Transactions section (calls existing `/api/payments/history`)
- `frontend/src/pages/ReportsPage.tsx` — add "Your Performance" section at top (uses extended `holdings` response)
- `frontend/src/locales/en.ts` — add new translation keys for new UI strings
- `frontend/src/locales/ar.ts` — add Arabic equivalents
