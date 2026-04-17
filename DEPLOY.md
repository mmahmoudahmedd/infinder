# Deploying INFINDER on Vercel

This repo is set up for a **single Vercel project**: static **frontend** from `frontend/dist` and a **serverless Express** handler at `api/index.js` that imports `backend/server.js`.

## 1. Supabase

1. Run migrations in order (`supabase/migrations/`), including `003_atomic_wallet_operations.sql`, in the Supabase SQL editor or via the Supabase CLI.
2. Copy the project URL and **service role** key (backend only — never expose to the browser).

## 2. Vercel project settings

- **Root directory:** repository root (where `vercel.json` lives).
- **Install command:** `npm install` (uses npm workspaces).
- **Build command:** `npm run build -w infinder-frontend` (or rely on `vercel.json` `buildCommand`).
- **Output directory:** `frontend/dist`.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set these for **Production** (and Preview if you use previews):

| Name | Notes |
|------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Long random string |
| `SUPABASE_URL` | From Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `GEMINI_API_KEY` | From Google AI Studio (do not commit) |
| `GEMINI_MODEL` | e.g. `gemini-2.0-flash` or `gemini-1.5-flash` |
| `FRONTEND_ORIGIN` | Your site URL, e.g. `https://your-app.vercel.app` |

**Frontend** (prefix `VITE_` — add to Vercel if you use them in the client):

| Name | Notes |
|------|--------|
| `VITE_API_URL` | Leave **empty** for same-origin API on Vercel (`/api/...`). Set only if the API is on another domain. |
| `VITE_GA_MEASUREMENT_ID` | Optional Google Analytics 4 measurement ID |

## 4. After deploy

- Open `https://your-app.vercel.app/api/health` — should return `{ "ok": true }` if the API is wired correctly. (Use `/api/health` on Vercel so the request hits the serverless API, not the SPA.)
- If login fails with CORS, confirm `FRONTEND_ORIGIN` matches the exact URL (including `https`).

## Security

- Never commit API keys or the Supabase service role key.
- Rotate any key that was pasted into chat or checked into git.
