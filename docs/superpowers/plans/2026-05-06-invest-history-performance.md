# Investment Execution, Transaction History & Portfolio Performance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the INFINDER investment loop by adding "Invest All" + live breakdown to the assistant, a transaction history section to the dashboard, and a real portfolio performance view to the analytics page.

**Architecture:** Most backend is already built — `POST /api/investments/apply`, `GET /api/payments/history` and `GET /api/analytics/holdings` all exist. The only backend change is extending the holdings endpoint to include performance data via the already-cached Alpha Vantage price series. All other work is frontend-only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Recharts, react-i18next, axios (`api` from `../lib/api`), Express/Supabase backend

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/locales/en.ts` | Add 14 new translation keys |
| `frontend/src/locales/ar.ts` | Add same 14 keys in Arabic |
| `frontend/src/pages/SmartAssistant.tsx` | Add "Invest All" button, live breakdown, disabled state |
| `frontend/src/pages/Dashboard.tsx` | Add Recent Transactions section |
| `backend/routes/analytics.js` | Extend `GET /holdings` with performance data |
| `frontend/src/pages/ReportsPage.tsx` | Add "Your Performance" section |

---

## Task 1: Add Translation Keys

**Files:**
- Modify: `frontend/src/locales/en.ts`
- Modify: `frontend/src/locales/ar.ts`

- [ ] **Step 1: Add English keys to en.ts**

Open `frontend/src/locales/en.ts`. After the line `invest_insufficient: 'Insufficient balance',` add:

```ts
  invest_all_btn: 'Invest all',
```

After the `// Smart Assistant - shared` section, after `common_invest_failed: 'Could not invest.',` add:

```ts
  invest_breakdown_title: 'Allocation breakdown',
```

Add a new section at the end of the object, before the closing `} as const;`:

```ts
  // Transactions
  tx_title: 'Recent Transactions',
  tx_show_all: 'Show all',
  tx_show_less: 'Show less',
  tx_empty: 'No transactions yet — fund your wallet to get started.',
  tx_deposit: 'Deposit',
  tx_withdrawal: 'Withdrawal',
  tx_investment: 'Investment',
  tx_status_completed: 'Completed',
  tx_status_pending: 'Pending',

  // Performance
  perf_title: 'Your Performance',
  perf_total_invested: 'Total invested',
  perf_current_value: 'Current value',
  perf_return: 'Return',
  perf_category: 'Category',
  perf_invested: 'Invested',
```

- [ ] **Step 2: Add Arabic keys to ar.ts**

Open `frontend/src/locales/ar.ts`. After the line for `invest_insufficient` add:

```ts
  invest_all_btn: 'استثمر الكل',
```

After `common_invest_failed` entry add:

```ts
  invest_breakdown_title: 'توزيع الاستثمار',
```

Add at the end of the ar object before the closing `}`:

```ts
  // Transactions
  tx_title: 'المعاملات الأخيرة',
  tx_show_all: 'عرض الكل',
  tx_show_less: 'عرض أقل',
  tx_empty: 'لا توجد معاملات بعد — أضف أموالاً إلى محفظتك للبدء.',
  tx_deposit: 'إيداع',
  tx_withdrawal: 'سحب',
  tx_investment: 'استثمار',
  tx_status_completed: 'مكتمل',
  tx_status_pending: 'معلق',

  // Performance
  perf_title: 'أداء محفظتك',
  perf_total_invested: 'إجمالي الاستثمار',
  perf_current_value: 'القيمة الحالية',
  perf_return: 'العائد',
  perf_category: 'الفئة',
  perf_invested: 'المستثمر',
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If there are "Property X does not exist" errors about the new keys, verify both files have the exact same key names.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/en.ts frontend/src/locales/ar.ts
git commit -m "feat: add translation keys for invest-all, transactions, and performance"
```

---

## Task 2: SmartAssistant — Invest All Button + Live Breakdown

**Files:**
- Modify: `frontend/src/pages/SmartAssistant.tsx`

- [ ] **Step 1: Add computed helpers after the existing `chartData` useMemo**

In `SmartAssistant.tsx`, after the `chartData` useMemo block (around line 71), add:

```tsx
  const breakdownRows = useMemo(() => {
    const a = mode === 'chat' ? alloc : wizardAlloc;
    const amt = Number(investAmount);
    if (!a || !amt || amt <= 0) return [];
    const labels: Record<string, string> = {
      stocks: 'Stocks',
      baskets: 'Baskets',
      bonds: 'Bonds',
      gold: 'Gold',
    };
    return (['stocks', 'baskets', 'bonds', 'gold'] as const)
      .filter((k) => a[k] > 0)
      .map((k) => ({ key: k, label: labels[k], egp: (a[k] / 100) * amt }));
  }, [alloc, wizardAlloc, investAmount, mode]);

  const overBalance = !!user && Number(investAmount) > 0 && Number(investAmount) > user.wallet_balance;
```

- [ ] **Step 2: Replace the chat mode amount input block**

Find this block in the chat mode section (inside the `alloc ?` branch, around line 270):

```tsx
                <label className="block mt-4 text-sm font-medium">{t('common_invest_amount_label')}</label>
                <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-2 outline-none text-sm"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
                <button type="button" onClick={confirmInvest} className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3">
                  {t('common_invest_confirm')}
                </button>
```

Replace with:

```tsx
                <label className="block mt-4 text-sm font-medium">{t('common_invest_amount_label')}</label>
                <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-2 outline-none text-sm"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() => setInvestAmount(String(user.wallet_balance))}
                    className="px-3 text-xs font-semibold text-infinder-black bg-infinder-lime/80 hover:bg-infinder-lime transition shrink-0"
                  >
                    {t('invest_all_btn')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
                {overBalance && (
                  <p className="text-xs text-red-500 mt-1">{t('invest_insufficient')}</p>
                )}
                {breakdownRows.length > 0 && (
                  <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 space-y-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('invest_breakdown_title')}</p>
                    {breakdownRows.map((r) => (
                      <div key={r.key} className="flex justify-between text-xs text-gray-700">
                        <span>{r.label}</span>
                        <span className="font-medium">EGP {r.egp.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={confirmInvest}
                  disabled={overBalance || !investAmount || Number(investAmount) <= 0}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('common_invest_confirm')}
                </button>
```

- [ ] **Step 3: Add "Invest All" to wizard step 4 and disable Continue when over balance**

Find the wizard step 4 block (around line 421). Find the amount input div:

```tsx
                <div className="mt-6 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-4 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-3 outline-none text-sm"
                    placeholder={t('wizard_amount_placeholder')}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  disabled={!investAmount || Number(investAmount) <= 0}
                  onClick={() => setWizardStep(5)}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-40 transition-opacity"
                >
                  {t('wizard_continue')}
                </button>
```

Replace with:

```tsx
                <div className="mt-6 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-4 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-3 outline-none text-sm"
                    placeholder={t('wizard_amount_placeholder')}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setInvestAmount(String(user.wallet_balance))}
                    className="px-3 text-xs font-semibold text-infinder-black bg-infinder-lime/80 hover:bg-infinder-lime transition shrink-0"
                  >
                    {t('invest_all_btn')}
                  </button>
                </div>
                {overBalance && (
                  <p className="text-xs text-red-500 mt-1">{t('invest_insufficient')}</p>
                )}
                <button
                  type="button"
                  disabled={!investAmount || Number(investAmount) <= 0 || overBalance}
                  onClick={() => setWizardStep(5)}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-40 transition-opacity"
                >
                  {t('wizard_continue')}
                </button>
```

- [ ] **Step 4: Manual test**

1. Start both servers (backend: `cd backend && node server.js`, frontend: `cd frontend && npm run dev`)
2. Log in, go to `/assistant`, use the wizard
3. On the amount step: verify "Invest All" pre-fills the wallet balance
4. Type a valid amount — verify the breakdown table appears with correct EGP splits
5. Type an amount larger than wallet balance — verify the button is disabled and red warning shows
6. Complete a successful investment — verify wallet balance updates on the dashboard

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SmartAssistant.tsx
git commit -m "feat: add invest-all button, live allocation breakdown, and balance guard to assistant"
```

---

## Task 3: Dashboard — Recent Transactions Section

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add the Tx type and new state at the top of the component**

After the existing imports, before `export default function Dashboard()`, add the type:

```tsx
type Tx = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment';
  amount: number;
  status: string;
  meta?: { allocation?: Record<string, number>; method?: string };
  created_at: string;
};
```

Inside the `Dashboard` component, after `const [learnPct, setLearnPct] = useState(0);` add:

```tsx
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [showAllTx, setShowAllTx] = useState(false);
```

- [ ] **Step 2: Fetch transactions on mount**

The existing `useEffect` fetches learning modules. Add a second `useEffect` after it:

```tsx
  useEffect(() => {
    api
      .get('/api/payments/history')
      .then((r) => setTransactions(r.data.transactions || []))
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Add the transactions section to the JSX**

Find the secondary links `<div>` (the one containing the Rewards and Reports links, ends at `</div>` before the outer closing `</div></div></div>`):

```tsx
          {/* Secondary links */}
          <div className="flex gap-3 flex-wrap items-center">
            ...
          </div>

        </div>
      </div>
    </AppShell>
```

Add the transactions section after `{/* Secondary links */}` div and before `</div></div>`:

```tsx
          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('tx_title')}
              </h2>
              {transactions.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllTx((v) => !v)}
                  className="text-sm text-infinder-green hover:underline"
                >
                  {showAllTx ? t('tx_show_less') : t('tx_show_all')}
                </button>
              )}
            </div>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-200 dark:border-[#2a2a2a] p-6">
                {t('tx_empty')}
              </p>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                {(showAllTx ? transactions : transactions.slice(0, 10)).map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  const isInvestment = tx.type === 'investment';
                  const alloc = tx.meta?.allocation;
                  const allocSummary = alloc
                    ? Object.entries(alloc)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}%`)
                        .join(' · ')
                    : '';
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold ${
                            isDeposit
                              ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                              : isInvestment
                              ? 'bg-infinder-lime/20 text-infinder-black dark:text-infinder-lime'
                              : 'bg-red-50 text-red-500 dark:bg-red-900/20'
                          }`}
                        >
                          {isDeposit ? '↓' : isInvestment ? '↗' : '↑'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {isDeposit
                              ? t('tx_deposit')
                              : isInvestment
                              ? `${t('tx_investment')}${allocSummary ? ` — ${allocSummary}` : ''}`
                              : t('tx_withdrawal')}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold ${
                            isDeposit ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}
                          {tx.amount.toLocaleString('en-EG', { minimumFractionDigits: 2 })} EGP
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                          }`}
                        >
                          {tx.status === 'completed' ? t('tx_status_completed') : t('tx_status_pending')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
```

- [ ] **Step 4: Manual test**

1. Go to `/dashboard`
2. If no transactions yet: verify "No transactions yet" placeholder shows
3. Make a deposit from `/funding`, come back to dashboard — verify the deposit row shows with green `+amount`, date, and "Completed" badge
4. Make an investment from `/assistant` — verify the investment row shows with the allocation summary (e.g. "Stocks 40% · Gold 30%")
5. Verify "Show all" button only appears when > 10 transactions exist

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add recent transactions section to dashboard"
```

---

## Task 4: Backend — Extend Holdings with Performance Data

**Files:**
- Modify: `backend/routes/analytics.js`

- [ ] **Step 1: Replace the entire `GET /holdings` route handler**

Open `backend/routes/analytics.js`. Find the route starting at `router.get('/holdings', verifyToken, async (req, res) => {` (line 167) and replace the entire function body with:

```js
router.get('/holdings', verifyToken, async (req, res) => {
  try {
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('id, name, allocation, created_at, is_sharia')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: invTx } = await supabase
      .from('transactions')
      .select('amount, meta, reference')
      .eq('user_id', req.user.id)
      .eq('type', 'investment');

    const txList = invTx || [];
    const findTx = (pid) =>
      txList.find((t) => t.reference === pid || t.reference === String(pid));

    // Aggregate invested amounts per bucket
    const agg = { stocks: 0, baskets: 0, bonds: 0, gold: 0 };
    let totalInvested = 0;
    for (const p of portfolios || []) {
      const alloc = p.allocation || {};
      const tx    = findTx(p.id);
      const amt   = tx ? Number(tx.amount) : 0;
      totalInvested += amt;
      for (const k of BUCKETS) {
        const pct = Math.max(0, Math.min(100, Number(alloc[k]) || 0));
        agg[k] += (amt * pct) / 100;
      }
    }

    // Fetch price series for performance calculation (uses existing cache)
    const seriesMap = {};
    await Promise.all(
      BUCKETS.map(async (cat) => {
        seriesMap[cat] = await fetchSeries(CATEGORY_SYMBOLS[cat]);
      })
    );

    // Calculate current value per bucket using benchmark price movement
    const perfAgg = {};
    for (const k of BUCKETS) perfAgg[k] = { invested: 0, currentValue: 0 };

    for (const p of portfolios || []) {
      const tx  = findTx(p.id);
      const amt = tx ? Number(tx.amount) : 0;
      if (!amt) continue;

      const investDate = p.created_at.slice(0, 10); // YYYY-MM-DD

      for (const k of BUCKETS) {
        const pct = Math.max(0, Math.min(100, Number((p.allocation || {})[k]) || 0));
        const bucketAmt = (amt * pct) / 100;
        if (!bucketAmt) continue;

        const series = seriesMap[k] || [];
        const currentPoint = series[series.length - 1];
        // Find the series point on or after the invest date
        const investPoint = series.find((s) => s.date >= investDate) || series[0];

        let currentVal = bucketAmt;
        if (investPoint && currentPoint && investPoint.index) {
          currentVal = bucketAmt * (currentPoint.index / investPoint.index);
        }

        perfAgg[k].invested     += bucketAmt;
        perfAgg[k].currentValue += currentVal;
      }
    }

    let totalCurrentValue = 0;
    const breakdown = BUCKETS.map((k) => {
      const inv = perfAgg[k].invested;
      const cur = perfAgg[k].currentValue;
      totalCurrentValue += cur;
      const returnPct = inv > 0 ? Math.round(((cur - inv) / inv) * 10000) / 100 : 0;
      return {
        key:               k,
        amount_egp:        Math.round(agg[k] * 100) / 100,
        pct_of_invested:   totalInvested > 0 ? Math.round((agg[k] / totalInvested) * 1000) / 10 : 0,
        invested_egp:      Math.round(inv * 100) / 100,
        current_value_egp: Math.round(cur * 100) / 100,
        return_pct:        returnPct,
      };
    });

    const totalReturnPct =
      totalInvested > 0
        ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 10000) / 100
        : 0;

    return res.json({
      total_invested_egp:      Math.round(totalInvested * 100) / 100,
      total_current_value_egp: Math.round(totalCurrentValue * 100) / 100,
      total_return_pct:        totalReturnPct,
      bucket_breakdown:        breakdown,
      portfolios:              portfolios || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load holdings' });
  }
});
```

- [ ] **Step 2: Verify the endpoint manually**

With the backend running (`cd backend && node server.js`), call the endpoint (replace TOKEN with a real JWT from login):

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/analytics/holdings
```

Expected response shape (values will vary):
```json
{
  "total_invested_egp": 5000,
  "total_current_value_egp": 5177.0,
  "total_return_pct": 3.54,
  "bucket_breakdown": [
    {
      "key": "stocks",
      "amount_egp": 2000,
      "pct_of_invested": 40,
      "invested_egp": 2000,
      "current_value_egp": 1997.0,
      "return_pct": -0.15
    }
  ],
  "portfolios": [...]
}
```

If `total_invested_egp` is 0 (no investments yet), make a test investment first from `/assistant`.

- [ ] **Step 3: Commit**

```bash
git add backend/routes/analytics.js
git commit -m "feat: extend holdings endpoint with performance data using Alpha Vantage price series"
```

---

## Task 5: ReportsPage — Your Performance Section

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Update the Holdings type to include performance fields**

Find the `Holdings` type at the top of `ReportsPage.tsx`:

```tsx
type Holdings = {
  total_invested_egp: number;
  bucket_breakdown: { key: string; amount_egp: number; pct_of_invested: number }[];
};
```

Replace with:

```tsx
type Holdings = {
  total_invested_egp: number;
  total_current_value_egp: number;
  total_return_pct: number;
  bucket_breakdown: {
    key: string;
    amount_egp: number;
    pct_of_invested: number;
    invested_egp: number;
    current_value_egp: number;
    return_pct: number;
  }[];
};
```

- [ ] **Step 2: Add the "Your Performance" section before the allocation section**

Find this block inside the `<>` fragment (after the `loading` check):

```tsx
            <section className="mt-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
                <h2 className="text-lg font-semibold">{t('reports_allocation_title')}</h2>
```

Insert the performance section **immediately before** that `<section>`:

```tsx
            {holdings && holdings.total_invested_egp > 0 && (
              <section className="mt-10">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
                  <h2 className="text-lg font-semibold">{t('perf_title')}</h2>
                </div>

                {/* Headline stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    {
                      label: t('perf_total_invested'),
                      value: `EGP ${holdings.total_invested_egp.toLocaleString('en-EG', { minimumFractionDigits: 2 })}`,
                      color: '',
                    },
                    {
                      label: t('perf_current_value'),
                      value: `EGP ${holdings.total_current_value_egp.toLocaleString('en-EG', { minimumFractionDigits: 2 })}`,
                      color: '',
                    },
                    {
                      label: t('perf_return'),
                      value: `${holdings.total_return_pct >= 0 ? '+' : ''}${holdings.total_return_pct}%`,
                      color: holdings.total_return_pct >= 0 ? 'text-green-600' : 'text-red-500',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className={`text-xl font-bold ${color || 'text-infinder-black'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Per-category table */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">{t('perf_category')}</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">{t('perf_invested')}</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">{t('perf_current_value')}</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">{t('perf_return')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {holdings.bucket_breakdown
                        .filter((b) => b.invested_egp > 0)
                        .map((b) => (
                          <tr key={b.key}>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {bucketLabel[b.key] || b.key}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              EGP {b.invested_egp.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              EGP {b.current_value_egp.toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                b.return_pct >= 0 ? 'text-green-600' : 'text-red-500'
                              }`}
                            >
                              {b.return_pct >= 0 ? '+' : ''}
                              {b.return_pct}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test**

1. Go to `/reports`
2. If no investments: verify the performance section is hidden, only allocation placeholder and benchmarks show
3. Make an investment from `/assistant`, come back to `/reports`
4. Verify the three headline cards show: Total Invested, Current Value, Overall Return (green if positive, red if negative)
5. Verify the per-category table only shows rows for categories with invested funds
6. Verify the return % is realistic (matches the MTD% of the corresponding benchmark chart below)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: add your-performance section to analytics page with real P&L from Alpha Vantage"
```

---

## Final Verification

- [ ] **End-to-end flow test**

1. Register a new account, add funds via `/funding`
2. Go to `/assistant` → wizard → enter amount → click "Invest All" → verify breakdown → Confirm investment
3. Go to `/dashboard` → verify investment shows in "Recent Transactions" with allocation summary
4. Go to `/reports` → verify "Your Performance" section shows with correct invested amount, current value, and return %
5. Go back to `/assistant` → verify wallet balance updated correctly

- [ ] **Final commit if any cleanup needed**

```bash
git add -A
git commit -m "feat: complete investment loop — execution, history, and performance tracking"
```
