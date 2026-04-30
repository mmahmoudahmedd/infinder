# Real Market Data — Analytics & Reports

**Date:** 2026-04-23  
**Status:** Approved

## Goal

Replace the fake deterministic demo curves in the Analytics & Reports page with real market data from the Alpha Vantage free API. Remove the "Demo analytics only" disclaimer.

## Category → Symbol Mapping

| Investment Category | Real Symbol | API Endpoint |
|---|---|---|
| stocks | SPY (S&P 500 ETF) | TIME_SERIES_DAILY |
| baskets | QQQ (Nasdaq 100 ETF) | TIME_SERIES_DAILY |
| bonds | TLT (Treasury Bond ETF) | TIME_SERIES_DAILY |
| gold | XAU/USD | FX_DAILY |

All products in the same category share the same benchmark series.

## Architecture

```
Frontend (ReportsPage.tsx)
    ↓ GET /api/analytics/catalog
Backend (analytics.js)
    ↓ checks in-memory cache (24hr TTL)
    ↓ if stale → fetches Alpha Vantage API
Alpha Vantage (external)
```

- API key stored in backend `.env` as `ALPHA_VANTAGE_KEY`
- Never exposed to the frontend
- One fetch per category per day (4 total = well within 25 req/day free limit)

## Backend Changes (`backend/routes/analytics.js`)

1. Add `CATEGORY_SYMBOLS` map: `{ stocks: 'SPY', baskets: 'QQQ', bonds: 'TLT', gold: 'XAU/USD' }`
2. Add `seriesCache` object: `{ symbol: { fetchedAt: Date, series: [...] } }`
3. Add `fetchSeries(symbol)` function:
   - For gold (`XAU/USD`): call `FX_DAILY` endpoint, parse `Time Series FX (Daily)`
   - For others: call `TIME_SERIES_DAILY` endpoint, parse `Time Series (Daily)`
   - Normalize the last 30 days of closing prices to a base-100 index
   - Cache result for 24 hours
4. In the `/catalog` route, replace `demoSeriesForSlug()` call with `fetchSeries(symbol)`
5. Remove `disclaimer` field from the response (or set it to empty string)
6. Remove `hashSeed()` and `demoSeriesForSlug()` helper functions

## Frontend Changes (`frontend/src/pages/ReportsPage.tsx`)

1. Remove the `disclaimer` state variable and amber disclaimer banner
2. Rename chart `Line` label from `"Demo index"` to `"Price index"`
3. Rename section heading from `"Product benchmarks (30-day demo index)"` to `"Product benchmarks (30-day price index)"`
4. Remove `"MTD (demo):"` / `"YTD (demo):"` labels → rename to `"MTD:"` / `"YTD:"`
5. Remove `mtd_demo_pct` / `ytd_demo_pct` field references (or keep but relabel)

## Config

- `backend/.env` → add `ALPHA_VANTAGE_KEY=<key>`
- User must sign up at alphavantage.co to get a free API key

## Error Handling

- If Alpha Vantage fetch fails (network error, rate limit), fall back to the last cached value
- If no cached value exists, return an empty `series_30d: []` for that product — frontend already handles empty gracefully

## Out of Scope

- No Supabase persistence of market data
- No individual stock symbols per investment product
- No real-time / websocket prices
