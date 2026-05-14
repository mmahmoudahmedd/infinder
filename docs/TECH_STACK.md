# Tech Stack Reference — INFINDER

## 1. FRONTEND

**Framework / Language:** React 18 + TypeScript, built with Vite

### Dependencies (`frontend/package.json`)

| Package | Purpose |
|---|---|
| `react` `react-dom` | Core UI library and DOM renderer |
| `react-router-dom` | Client-side routing (SPA navigation) |
| `framer-motion` | Declarative animation library |
| `recharts` | Chart library built on D3 (portfolio graphs, analytics) |
| `lucide-react` | SVG icon set |
| `@supabase/supabase-js` | Supabase client (used on frontend for auth token management) |
| `axios` | HTTP client for backend API calls |
| `i18next` | Internationalization framework (Arabic / English support) |
| `i18next-browser-languagedetector` | Auto-detects browser language for i18next |
| `react-i18next` | React bindings for i18next |
| `sweetalert2` | Styled modal dialogs and toast alerts |
| `canvas-confetti` | Confetti burst animation for achievements/rewards |
| `clsx` | Utility for composing conditional CSS class names |
| `@vercel/analytics` | Vercel built-in analytics (page views, web vitals) |

**Optional dependency:**

| Package | Purpose |
|---|---|
| `@rollup/rollup-linux-x64-gnu` | Native Rollup binary for Vercel's Linux build environment |

---

## 2. BACKEND

**Runtime / Framework:** Node.js (ESM) + Express.js

### Dependencies (`backend/package.json`)

| Package | Purpose |
|---|---|
| `express` | HTTP web framework (routes, middleware) |
| `express-rate-limit` | Per-route request rate limiting (auth endpoints) |
| `cors` | Cross-Origin Resource Sharing middleware |
| `dotenv` | Loads `.env` into `process.env` |
| `@supabase/supabase-js` | Supabase client for all database and storage operations |
| `bcryptjs` | Password hashing and comparison (custom auth) |
| `jsonwebtoken` | JWT signing and verification (7-day session tokens) |
| `multer` | Multipart file upload middleware (KYC document uploads) |
| `@google/generative-ai` | Google Gemini SDK — installed, superseded by Groq via `fetch` |

---

## 3. DATABASE & STORAGE

**Provider:** Supabase (hosted PostgreSQL)

### Features in use

| Feature | How it's used |
|---|---|
| **Database** | Primary data store — all tables below |
| **Storage** | `kyc-documents` bucket stores uploaded ID photos and selfies |
| **RPC functions** | `fund_wallet`, `withdraw_wallet`, `apply_investment`, `exit_investment`, `credit_deposit`, `credit_deposit_card` — atomic wallet/investment operations |
| **Views** | `platform_fee_summary` — aggregated daily fee revenue for admin |

### Tables

`users`, `portfolios`, `transactions`, `deposits`, `investments`, `kyc_submissions`, `achievements`, `learning_modules`, `lessons`, `user_progress`, `platform_fees`

> **Auth note:** Supabase Auth is **not** used. Authentication is custom-built with `bcryptjs` + `jsonwebtoken`, and the `users` table is managed directly.

---

## 4. EXTERNAL APIs

| API | What it does |
|---|---|
| **Groq** (`api.groq.com`) | LLM inference using `llama-3.3-70b-versatile` — powers the Smart Investment Assistant chat |
| **Alpha Vantage** (`alphavantage.co`) | Daily price series for SPY, QQQ, TLT, and XAU/USD — used for portfolio performance and analytics charts |
| **Google Analytics** (optional) | Frontend analytics via `gtag.js`; activated only when `VITE_GA_MEASUREMENT_ID` env var is set |
| **Vercel Analytics** | Automatic page-view and web vitals tracking via `@vercel/analytics` |

---

## 5. DEPLOYMENT

| Item | Detail |
|---|---|
| **Hosting** | Vercel (frontend static site + backend via `vercel.json` rewrites) |
| **Version control** | Git / GitHub (`mmahmoudahmedd`) |
| **CI/CD** | Vercel's built-in pipeline — auto-deploys on push to `main` |
| **Build output** | `frontend/dist` served as static files; `/api/*` routes proxied to backend |

---

## 6. DEVELOPMENT TOOLS

| Tool | Role |
|---|---|
| `typescript` (~5.6) | Static type checking across the frontend |
| `vite` (5.4) | Frontend dev server and production bundler |
| `@vitejs/plugin-react` | Vite plugin enabling React fast refresh |
| `tailwindcss` (3.4) | Utility-first CSS framework |
| `postcss` | CSS transformation pipeline (required by Tailwind) |
| `autoprefixer` | PostCSS plugin that adds vendor prefixes automatically |
| `@types/react` `@types/react-dom` `@types/canvas-confetti` | TypeScript type definitions for untyped packages |
