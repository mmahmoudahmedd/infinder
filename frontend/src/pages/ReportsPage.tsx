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
  mtd_demo_pct: number;
  ytd_demo_pct: number;
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
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/api/analytics/catalog'), api.get('/api/analytics/holdings')])
      .then(([c, h]) => {
        if (cancelled) return;
        setCatalog(c.data.catalog || []);
        setDisclaimer(c.data.disclaimer || '');
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
          Educational demo metrics — not live market data. Use licensed sources for real decisions.
        </p>
        {disclaimer && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">{disclaimer}</p>}

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
                    <BarChart data={holdings.bucket_breakdown.map((b) => ({ name: bucketLabel[b.key] || b.key, amount: b.amount_egp }))}>
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
              <h2 className="text-lg font-semibold">Product benchmarks (30-day demo index)</h2>
              <p className="text-sm text-gray-600">Each line is a normalized demo index for that catalog product.</p>
              {catalog.map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2 items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{row.title}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{row.category}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="text-gray-500">MTD (demo):</span>{' '}
                        <span className="font-semibold">{row.mtd_demo_pct >= 0 ? '+' : ''}{row.mtd_demo_pct}%</span>
                      </p>
                      <p>
                        <span className="text-gray-500">YTD (demo):</span>{' '}
                        <span className="font-semibold">{row.ytd_demo_pct >= 0 ? '+' : ''}{row.ytd_demo_pct}%</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Volatility (label): {row.volatility_label}</p>
                    </div>
                  </div>
                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={row.series_30d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={(l) => `Date: ${l}`} formatter={(v: number) => [v.toFixed(2), 'Index']} />
                        <Legend />
                        <Line type="monotone" dataKey="index" name="Demo index" stroke="#BEF35E" strokeWidth={2} dot={false} />
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
