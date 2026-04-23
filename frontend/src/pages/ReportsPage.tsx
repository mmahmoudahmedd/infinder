import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';

type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  mtd_pct: number;
  volatility_label: string;
  series_30d: { date: string; index: number }[];
};

type Holdings = {
  total_invested_egp: number;
  bucket_breakdown: { key: string; amount_egp: number; pct_of_invested: number }[];
};

const bucketLabel: Record<string, string> = {
  stocks: 'Stocks',
  baskets: 'Stock baskets',
  bonds: 'Bonds / fixed income',
  gold: 'Gold',
};

export default function ReportsPage() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/api/analytics/catalog'), api.get('/api/analytics/holdings')])
      .then(([c, h]) => {
        if (cancelled) return;
        setCatalog(c.data.catalog || []);
        setHoldings(h.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SubpageShell>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Analytics &amp; reports</h1>
        <p className="text-gray-600 text-sm mt-1">
          Live benchmark data — 30-day normalized price index per category.
        </p>

        {loading ? (
          <p className="mt-10 text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Your allocation (EGP)</h2>
              <p className="text-sm text-gray-600 mt-1">Based on recorded portfolio investments.</p>
              {holdings && holdings.total_invested_egp > 0 ? (
                <div className="mt-4 h-64 rounded-2xl border border-gray-200 bg-white p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={holdings.bucket_breakdown.map((b) => ({
                        name: bucketLabel[b.key] || b.key,
                        amount: b.amount_egp,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`EGP ${v.toFixed(2)}`, 'Amount']} />
                      <Bar dataKey="amount" fill="#76D74F" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 p-6">
                  No investments recorded yet. Fund your wallet and invest from the assistant or invest flow.
                </p>
              )}
            </section>

            <section className="mt-12 space-y-10">
              <h2 className="text-lg font-semibold">Product benchmarks (30-day price index)</h2>
              <p className="text-sm text-gray-600">
                Each line shows a normalized price index for that product's benchmark (SPY, QQQ, TLT, XAU/USD).
              </p>
              {catalog.map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2 items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{row.title}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{row.category}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="text-gray-500">MTD:</span>{' '}
                        <span className={`font-semibold ${row.mtd_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {row.mtd_pct >= 0 ? '+' : ''}{row.mtd_pct}%
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Volatility: {row.volatility_label}</p>
                    </div>
                  </div>
                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={row.series_30d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(l) => `Date: ${l}`}
                          formatter={(v: number) => [v.toFixed(2), 'Index']}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="index"
                          name="Price index"
                          stroke="#BEF35E"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </SubpageShell>
  );
}
