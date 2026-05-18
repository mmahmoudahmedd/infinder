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
import { useTheme } from '../hooks/useTheme';

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

export default function ReportsPage() {
  const { t } = useTranslation();
  const { dark } = useTheme();

  const bucketLabel: Record<string, string> = {
    stocks: t('reports_bucket_stocks'),
    baskets: t('reports_bucket_baskets'),
    bonds: t('reports_bucket_bonds'),
    gold: t('reports_bucket_gold'),
  };

  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const gridColor = dark ? '#374151' : '#e5e7eb';
  const tooltipStyle = {
    background: dark ? '#1a1a1a' : '#ffffff',
    border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
    borderRadius: 8,
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/api/analytics/catalog'), api.get('/api/analytics/holdings')])
      .then(([c, h]) => {
        if (cancelled) return;
        setCatalog(c.data.catalog || []);
        setHoldings(h.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
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
        ) : error ? (
          <p className="mt-10 text-center text-sm text-red-500">{t('reports_error')}</p>
        ) : (
          <>
            {holdings && holdings.total_invested_egp > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('reports_summary_invested')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    EGP {holdings.total_invested_egp.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('reports_summary_current')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    EGP {holdings.total_current_value_egp.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('reports_summary_return')}</p>
                  <p className={`text-lg font-bold ${holdings.total_return_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {holdings.total_return_pct >= 0 ? '+' : ''}{holdings.total_return_pct}%
                  </p>
                </div>
              </div>
            )}

            <section className="mt-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('reports_allocation_title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('reports_allocation_sub')}</p>
              </div>
              {holdings && holdings.total_invested_egp > 0 ? (
                <div className="mt-4 h-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={holdings.bucket_breakdown.map((b) => ({
                        name: bucketLabel[b.key] || b.key,
                        invested: b.invested_egp,
                        current: b.current_value_egp,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [`EGP ${v.toFixed(2)}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="invested" name={t('reports_invested_label')} fill="#76D74F" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="current" name={t('reports_current_label')} fill="#BEF35E" radius={[6, 6, 0, 0]} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={tooltipStyle}
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
