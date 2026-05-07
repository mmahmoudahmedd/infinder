import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function ReportsPage() {
  const { t } = useTranslation();
  const bucketLabel: Record<string, string> = {
    stocks: t('reports_bucket_stocks'),
    baskets: t('reports_bucket_baskets'),
    bonds: t('reports_bucket_bonds'),
    gold: t('reports_bucket_gold'),
  };

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
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
          <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">{t('reports_title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('reports_sub')}</p>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-infinder-green animate-spin" />
          </div>
        ) : (
          <>
            <section className="mt-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('reports_allocation_title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('reports_allocation_sub')}</p>
              </div>
              {holdings && holdings.total_invested_egp > 0 ? (
                <div className="mt-4 h-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={holdings.bucket_breakdown.map((b) => ({
                        name: bucketLabel[b.key] || b.key,
                        amount: b.amount_egp,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: 8 }}
                        formatter={(v: number) => [`EGP ${v.toFixed(2)}`, t('reports_amount')]}
                      />
                      <Bar dataKey="amount" fill="#76D74F" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6">
                  {t('reports_no_investments')}
                </p>
              )}
            </section>

            <section className="mt-12 space-y-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('reports_benchmarks_title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports_benchmarks_sub')}</p>
              </div>
              {catalog.map((row) => (
                <div key={row.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm dark:shadow-none">
                  <div className="flex flex-wrap justify-between gap-2 items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{row.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{row.category}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="text-gray-500 dark:text-gray-400">{t('reports_mtd')}</span>{' '}
                        <span className={`font-semibold ${row.mtd_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {row.mtd_pct >= 0 ? '+' : ''}{row.mtd_pct}%
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reports_volatility')} {row.volatility_label}</p>
                    </div>
                  </div>
                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={row.series_30d}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: 8 }}
                          labelFormatter={(l) => `${t('reports_date_label')} ${l}`}
                          formatter={(v: number) => [v.toFixed(2), 'Index']}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="index"
                          name={t('reports_price_index')}
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
