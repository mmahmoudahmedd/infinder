# INFINDER — Project Overview

> **Purpose:** Retail investment platform for Egyptian users (EGP-denominated). Supports wallet funding, portfolio creation via a robo-advisor or AI chat, learning modules, KYC verification, and a rewards/badge system. Targets beginner investors with optional Sharia-compliant filtering.

---

## 1. Project Structure

```
gradweb/
├── backend/                  # Node.js / Express REST API (deployed on Railway)
│   ├── config/fees.js        # Platform fee constants (0.25%, min EGP 1)
│   ├── middleware/
│   │   ├── rateLimit.js      # express-rate-limit (auth endpoints)
│   │   └── verifyToken.js    # JWT middleware + requireAdmin guard
│   ├── routes/               # One file per resource group
│   │   ├── auth.js
│   │   ├── investments.js
│   │   ├── payments.js
│   │   ├── deposits.js
│   │   ├── kyc.js
│   │   ├── learning.js
│   │   ├── rewards.js
│   │   ├── analytics.js
│   │   ├── assistant.js
│   │   └── admin.js
│   ├── services/
│   │   └── rewardsEngine.js  # Badge evaluation logic
│   ├── supabase/client.js    # Supabase service-role client singleton
│   ├── utils/codes.js        # Deposit ref-code generator
│   └── server.js             # Express entry point; exports `app` for Vercel
│
├── frontend/                 # React 18 + TypeScript + Vite (deployed on Vercel)
│   └── src/
│       ├── components/       # Shared UI components
│       ├── context/
│       │   └── AuthContext.tsx  # JWT token + user state via localStorage
│       ├── hooks/useTheme.ts
│       ├── lib/
│       │   ├── api.ts        # Axios instance (injects Bearer token)
│       │   ├── supabase.ts   # Supabase anon client (frontend-only reads)
│       │   └── swal.ts       # SweetAlert2 wrapper
│       ├── locales/          # i18n: en.ts, ar.ts
│       ├── pages/            # Route-level page components
│       └── App.tsx           # React Router v6 route definitions
│
├── supabase/
│   └── migrations/           # Ordered SQL migration files (001–008)
│
└── docs/                     # Architecture docs and plans
```

---

## 2. API Endpoints

All endpoints are prefixed with `/api`. Auth-required endpoints use `Authorization: Bearer <JWT>`. Admin-only endpoints also require `role = 'admin'` in the token.

### Auth — `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account; returns JWT + user object |
| POST | `/login` | Validate credentials; returns JWT + user object |
| GET | `/me` | Return current user profile |
| PATCH | `/me` | Update `full_name`, `phone`, or `sharia_mode` |
| DELETE | `/account` | Soft-delete account (requires zero balance, no active portfolios) |

### Investments — `/api/investments`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List active investment products; optional `?sharia=1` filter |
| POST | `/robo` | Return robo-advisor allocation for given goal/horizon/risk inputs |
| POST | `/apply` | Deduct wallet and create a portfolio (KYC approved required) |
| GET | `/positions` | List user's active portfolios with invested amounts |
| POST | `/:id/exit` | Close a portfolio and return funds to wallet |

### Payments — `/api/payments`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/fund` | Legacy direct wallet top-up (Instapay/bank method label) |
| POST | `/withdraw` | Withdraw from wallet (0.25% fee applied) |
| GET | `/history` | Last 100 transactions for the user |
| GET | `/admin/fees` | Admin: platform fee revenue summary (by type and period) |

### Deposits — `/api/deposits`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create deposit request; card = instant credit, Instapay/bank = pending |
| GET | `/` | List user's last 10 deposit records |
| GET | `/:id` | Get a single deposit record |
| PATCH | `/:id/confirm-sent` | User confirms they have sent the bank/Instapay transfer |
| POST | `/:id/credit` | **Admin** — atomically credit a pending deposit to user wallet |

### KYC — `/api/kyc`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/submit` | Upload documents (national ID front/back + selfie + optional address proof) |
| GET | `/status` | Return current KYC status and latest submission for the user |
| GET | `/admin/pending` | **Admin** — list pending `kyc_submissions` with nested `user` object |
| POST | `/:id/approve` | **Admin** — approve a submission (atomically updates `kyc_submissions` + `users` via RPC) |
| POST | `/:id/reject` | **Admin** — reject a submission with `{ reason }` body (atomically updates both) |

### Learning — `/api/learning`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules` | List all modules with per-user progress percentage |
| GET | `/modules/:id` | Get module by id or slug with lessons and user completion state |
| POST | `/progress` | Mark a lesson as completed |
| POST | `/quiz` | Submit quiz answers; returns score and certificate flag |

### Rewards — `/api/rewards`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all earned badges for the user |
| POST | `/check` | Trigger badge evaluation and return updated list |

### Analytics — `/api/analytics`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog` | Investment category cards enriched with 30-day price series (Alpha Vantage) |
| GET | `/holdings` | User's holdings breakdown by asset bucket with benchmark-based performance |

### Assistant — `/api/assistant`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Multi-turn chat with Groq LLM (llama-3.3-70b); returns portfolio allocation JSON when ready |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` or `/api/health` | Server liveness check |

---

## 3. Database Tables

Database: **Supabase (PostgreSQL)**. Backend uses the **service role key** which bypasses RLS. Migrations live in `supabase/migrations/`.

### `users`
Core account table. Custom JWT auth (no Supabase Auth).
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | TEXT UNIQUE | Lowercased on write; set to `deleted_<id>@deleted.invalid` on soft-delete |
| password_hash | TEXT | bcrypt 10 rounds |
| full_name | TEXT | nullable |
| phone | TEXT | nullable |
| kyc_status | TEXT | `not_started`, `pending`, `approved`, `rejected` |
| kyc_rejection_reason | TEXT | nullable |
| sharia_mode | BOOLEAN | toggles halal filter across the app |
| wallet_balance | NUMERIC(14,2) | must be ≥ 0 |
| role | TEXT | `user` or `admin` |
| deposit_ref_code | TEXT UNIQUE | auto-generated reference used for bank transfers |
| last_login_at | DATE | updated on login |
| deleted_at | TIMESTAMPTZ | soft-delete marker (migration 008) |
| created_at / updated_at | TIMESTAMPTZ | `updated_at` maintained by trigger |

### `investments`
Product catalog (static seed + admin-managed).
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | TEXT UNIQUE | e.g. `stocks`, `gold`, `stock-baskets`, `fixed-income` |
| title / description | TEXT | display copy |
| category | TEXT | `stocks`, `baskets`, `bonds`, `gold` |
| min_investment | NUMERIC(14,2) | minimum entry amount in EGP |
| expected_return_low/high | NUMERIC(5,2) | percentage range |
| risk_level | TEXT | `low`, `low_medium`, `medium`, `high` |
| is_halal | BOOLEAN | used for Sharia filter |
| learn_more | JSONB | array of bullet strings |
| active | BOOLEAN | soft-disables from catalog |

### `portfolios`
Each row is one active user investment.
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID FK → users | |
| name | TEXT | user-supplied or AI-generated label |
| status | TEXT | `active` or `closed` |
| allocation | JSONB | `{stocks, baskets, bonds, gold}` percentages summing to 100 |
| assistant_reasoning | TEXT | AI explanation stored for display |
| is_sharia | BOOLEAN | |

### `transactions`
Immutable ledger of all money movements.
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID FK → users | |
| type | TEXT | `deposit`, `withdrawal`, `investment`, `return`, `adjustment` |
| amount | NUMERIC(14,2) | gross amount |
| gross_amount / fee_amount / net_amount | NUMERIC | fee breakdown (migration 004) |
| fee_rate | NUMERIC(8,6) | rate captured at time of transaction |
| status | TEXT | `pending`, `completed`, `failed` |
| reference | TEXT | portfolio UUID for investment rows |
| meta | JSONB | arbitrary context (method, allocation, credited_by, etc.) |

### `deposits`
Tracks pending manual deposits and instant card deposits.
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID FK → users | |
| amount | NUMERIC(14,2) | |
| method | TEXT | `instapay`, `bank`, `card` |
| reference_code | TEXT UNIQUE | e.g. `INVI1234567` |
| status | TEXT | `pending`, `credited`, `failed`, `expired` |
| user_confirmed_sent | BOOLEAN | user signals they sent the bank transfer |
| fee_amount / net_amount | NUMERIC | 2% for card; 0 for bank/Instapay |
| credited_at | TIMESTAMPTZ | set when admin or RPC credits the deposit |

### `platform_fees`
Revenue ledger for fees collected on investments and withdrawals.
| Column | Type | Notes |
|--------|------|-------|
| transaction_id | UUID FK → transactions | nullable on delete |
| user_id | UUID FK → users | nullable on delete |
| amount | NUMERIC(14,2) | |
| type | TEXT | `investment` or `withdrawal` |

**View:** `platform_fee_summary` — daily/monthly aggregation by fee type.

### `kyc_submissions`
Document upload records for identity verification.
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID FK → users | |
| status | TEXT | `pending`, `approved`, `rejected` |
| national_id_front_url / national_id_back_url / selfie_url | TEXT | Storage paths in `kyc-documents` bucket |
| address_proof_url | TEXT | optional |
| reviewed_at / reviewed_by | TIMESTAMPTZ / UUID | set by admin on decision |
| rejection_reason | TEXT | |

### `learning_modules`
Top-level learning tracks (e.g. "Investing 101").
Columns: `slug`, `title`, `description`, `difficulty` (`beginner`/`intermediate`/`advanced`), `duration_minutes`, `order_index`.

### `lessons`
Individual lessons within a module.
Columns: `module_id` FK, `title`, `content` (plain text), `order_index`, `duration_minutes`, `quiz` (JSONB with `questions[].correctIndex`).

### `user_progress`
Records lesson completion and quiz scores per user.
Columns: `user_id`, `lesson_id`, `completed_at`, `quiz_score`, `certificate_issued`. Unique per (user, lesson).

### `achievements`
Earned badges. Unique per (user, badge_key).
Columns: `user_id`, `badge_key`, `title`, `description`, `earned_at`.

---

## 4. Frontend Pages & Key Components

### Pages (`frontend/src/pages/`)
| File | Route | Description |
|------|-------|-------------|
| `LandingPage.tsx` | `/` (unauthenticated) | Marketing homepage with animated canvas elements |
| `LoginPage.tsx` | `/login` | Email/password login form |
| `RegisterPage.tsx` | `/register` | Registration with Sharia preference toggle |
| `KycReviewPage.tsx` | `/onboarding/review` | KYC document upload flow (3 required + 1 optional) |
| `Dashboard.tsx` | `/dashboard` | Wallet balance, quick actions, transaction history |
| `FundingPage.tsx` | `/funding` | 3-step deposit flow (method → amount → confirm) |
| `InvestmentOptions.tsx` | `/invest` | Browse product catalog, robo-advisor wizard, apply allocation |
| `SmartAssistant.tsx` | `/assistant` | Chat interface backed by Groq LLM; produces allocation proposals |
| `ProfilePage.tsx` | `/profile` | Edit profile, KYC status, Sharia toggle, account deletion |
| `LearningHub.tsx` | `/learn` | Module catalog with progress overview |
| `LearningModules.tsx` | `/learn/:moduleId` | Lesson reader with inline quiz |
| `RewardsDashboard.tsx` | `/rewards` | Badge grid and earned achievements |
| `ReportsPage.tsx` | `/reports` | Holdings breakdown and performance charts |
| `AdminPanel.tsx` | `/admin` | KYC review queue and deposit credit actions (admin only) |
| `legal/TermsPage.tsx` | `/legal/terms` | Terms of Service |
| `legal/PrivacyPage.tsx` | `/legal/privacy` | Privacy Policy |
| `legal/RiskPage.tsx` | `/legal/risk` | Risk Disclosure |
| `SupportPage.tsx` | `/support` | Contact/support info |
| `HelpPage.tsx` | `/help` | FAQ / help content |

### Key Components (`frontend/src/components/`)
| File | Description |
|------|-------------|
| `AppShell.tsx` | Layout wrapper with sidebar/navbar for authenticated pages |
| `BottomNav.tsx` | Mobile bottom navigation bar |
| `ProtectedRoute.tsx` | Redirects unauthenticated users to `/login`; `admin` prop restricts to admins |
| `DepositModal.tsx` | Modal for the quick-deposit flow |
| `LegalPage.tsx` | Shared layout wrapper for legal pages |
| `Navbar.tsx` | Top navigation bar |
| `Logo.tsx` | Brand logo component |
| `OptionalGa.tsx` | Lazy Google Analytics injection (only if `VITE_GA_MEASUREMENT_ID` is set) |
| `canvas/` | Decorative animated canvas elements: `CandlestickCanvas`, `GlobeWireframe`, `ParticleNetwork`, `WaveCanvas` |

---

## 5. Authentication Flow

1. **Register/Login** — frontend POSTs credentials to `/api/auth/register` or `/api/auth/login`.
2. **Token storage** — the server returns a JWT (7-day expiry, signed with `JWT_SECRET`). The frontend stores it in `localStorage` under key `infinder_token`.
3. **Request injection** — `frontend/src/lib/api.ts` is an Axios instance with a request interceptor that reads the token from localStorage and adds `Authorization: Bearer <token>` to every request.
4. **Session bootstrap** — `AuthContext` reads the token from localStorage on mount and calls `GET /api/auth/me` to hydrate the user object.
5. **Route protection** — `ProtectedRoute` checks the `token` field from `AuthContext`. Unauthenticated users are redirected to `/login`. Admin-only routes (`/admin`) additionally check `user.role === 'admin'`.
6. **Logout** — removes the token from localStorage and clears React state. No server-side token revocation.
7. **Middleware** — `backend/middleware/verifyToken.js` uses `jsonwebtoken.verify()` to decode the token and attach `req.user = { id, email, role }`.

> **No Supabase Auth is used.** The frontend has a Supabase anon client (`lib/supabase.ts`) but it is only used for direct DB reads where RLS permits. All mutations go through the backend API.

---

## 6. Environment Variables

### Backend (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: `4000`) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | Yes | Secret for signing/verifying JWTs |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `GROQ_API_KEY` | Yes | API key for Groq LLM (llama-3.3-70b); assistant falls back to demo mode if absent |
| `FRONTEND_ORIGIN` | Yes | Allowed CORS origin (e.g. `https://your-app.vercel.app`) |
| `ALPHA_VANTAGE_KEY` | Yes | Free-tier API key for price series; falls back to deterministic synthetic data if absent/rate-limited |

### Frontend (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend base URL; empty in dev (Vite proxy to `localhost:4000`) |
| `VITE_SUPABASE_URL` | No | Supabase URL (only needed for direct anon reads) |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key |
| `VITE_GA_MEASUREMENT_ID` | No | Optional Google Analytics 4 measurement ID |

---

## 7. Known Issues / TODOs / Technical Debt

- **KYC approval refactored (2026-05-13).** The dual-path approval design (`POST /api/kyc/:id/approve` + `POST /api/admin/kyc/approve`) was consolidated into a single `review_kyc_submission` Postgres RPC (migration 009). All KYC review actions now go through `POST /api/kyc/:id/approve|reject`. The `admin.js` route file was removed as it became empty.
- **Alpha Vantage rate limits.** Free tier allows ~25 requests/day. With 4 symbols × every page load, the cache TTL (24 h in-memory) is critical but resets on each server restart. Under heavy load or after a cold start, all users may see synthetic fallback data simultaneously.
- **In-memory price cache.** `seriesCache` in `analytics.js` is process-local. On Railway with multiple instances or restarts, cache is lost. A Redis or DB-backed cache would be more robust.
- **No server-side JWT revocation.** Deleted accounts' tokens remain valid for up to 7 days. The login endpoint checks `deleted_at`, but already-issued tokens are not invalidated. Adding a `token_version` or short-lived token strategy would close this.
- **Admin KYC queue only shows `pending`/`under_review`.** The deposit credit flow and KYC review flow are only exposed through `AdminPanel.tsx`; there is no dedicated admin dashboard for deposits management.
- **`pg_cron` for deposit expiry is manual.** Migration 005 documents the `cron.schedule()` call but it must be run manually in the Supabase SQL editor — it is not applied by the migration file itself.
- **No email notifications.** There is no email service integrated. Users have no automated notification for KYC approval/rejection or deposit crediting.
- **`@google/generative-ai` installed but unused.** The package is in `backend/package.json` but no route references the Gemini SDK; the assistant exclusively uses Groq.
- **Sharia compliance uses `is_halal` column but bonds are always excluded in Sharia robo templates** — this logic is hardcoded in `investments.js` rather than being data-driven from the DB.
- **No test suite.** There are no unit or integration tests in either the frontend or backend.

---

## 8. Recent Major Features Added

### KYC Verification Flow (migration 007 + `routes/kyc.js` + `pages/KycReviewPage.tsx`)
- New `kyc_submissions` table tracks document uploads separately from user status.
- Users upload national ID (front + back), selfie, and optional address proof via multipart form.
- Files are stored in the private Supabase Storage bucket `kyc-documents`.
- Status states renamed: `pending` (schema default, no docs) → `not_started`; `under_review` → `pending`.
- Admin approve/reject endpoints update both the submission row and the user's `kyc_status`.

### Deposits Flow (migration 005 + `routes/deposits.js` + `pages/FundingPage.tsx`)
- New `deposits` table with `instapay`, `bank`, and `card` methods.
- **Card deposits:** instantly credited via `credit_deposit_card()` RPC (2% fee deducted, wallet credited atomically).
- **Instapay/bank:** creates a `pending` row with a unique `reference_code` (e.g. `INVI1234567`). User must confirm they sent the transfer; admin then calls the `credit_deposit()` RPC.
- `expire_stale_deposits()` function designed for `pg_cron` to expire unconfirmed deposits after 48 h.
- 3-step UI: select method → enter amount (show fee preview) → confirm and receive reference code.

### Platform Fees (migration 004 + `config/fees.js`)
- `PLATFORM_FEE_RATE = 0.0025` (0.25%), minimum EGP 1.
- Fee columns added to `transactions`: `gross_amount`, `fee_amount`, `net_amount`, `fee_rate`.
- New `platform_fees` revenue table; `platform_fee_summary` view for daily/monthly reporting.
- `apply_investment` and `withdraw_wallet` RPCs updated to accept and record fee parameters.
- Admin fee report endpoint: `GET /api/payments/admin/fees`.

### Legal Pages
- Three static legal pages added: Terms of Service (`/legal/terms`), Privacy Policy (`/legal/privacy`), Risk Disclosure (`/legal/risk`).
- Shared `LegalPage.tsx` layout component with shared styling.
- Links surfaced in `LandingFooter.tsx`.

### Soft Account Deletion (migration 008 + `DELETE /api/auth/account`)
- `deleted_at` column added to `users`.
- Deletion anonymises the account (email/name/phone scrubbed) rather than hard-deleting.
- Guards prevent deletion if the user has a non-zero wallet balance, active portfolios, or pending deposits.

### Investment Holdings Performance (analytics endpoint extension)
- `GET /api/analytics/holdings` now computes current portfolio value using benchmark price series from Alpha Vantage.
- Returns `invested_egp`, `current_value_egp`, and `return_pct` per asset bucket.
- Uses same in-memory price cache as the catalog endpoint to avoid redundant API calls.
