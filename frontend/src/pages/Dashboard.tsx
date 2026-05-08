import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import CandlestickCanvas from '../components/canvas/CandlestickCanvas';

type Tx = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment';
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  meta?: { allocation?: Record<string, number>; method?: string };
  created_at: string;
};

export default function Dashboard() {
  const { user, updateProfile, refreshMe } = useAuth();
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [learnPct, setLearnPct] = useState(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [showAllTx, setShowAllTx] = useState(false);

  useEffect(() => {
    api
      .get('/api/learning/modules')
      .then((r) => {
        const mods = r.data.modules || [];
        const total = mods.reduce((s: number, m: { lesson_count?: number }) => s + (m.lesson_count || 0), 0);
        const done  = mods.reduce((s: number, m: { completed_lessons?: number }) => s + (m.completed_lessons || 0), 0);
        setLearnPct(total ? Math.round((done / total) * 100) : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get('/api/payments/history')
      .then((r) => setTransactions(r.data.transactions || []))
      .catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">
                {t('dashboard_label')}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">
                {`${t('dashboard_welcome')}${user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋`}
              </h1>
            </div>

            {/* Sharia mode toggle */}
            <label className="flex items-center gap-2.5 text-sm cursor-pointer self-start sm:self-center">
              <span className="text-gray-500 dark:text-gray-300 font-medium">{t('dashboard_sharia_mode')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={user.sharia_mode}
                onClick={async () => {
                  await updateProfile({ sharia_mode: !user.sharia_mode });
                  await refreshMe();
                }}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                  user.sharia_mode ? 'bg-infinder-green' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    user.sharia_mode ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          {/* KYC banner */}
          {user.kyc_status !== 'approved' && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-[#1a1a00] text-amber-800 dark:text-amber-200 text-sm px-4 py-3 flex gap-2 items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>{t('dashboard_kyc_banner')}</div>
            </div>
          )}

          {/* Balance + Assistant */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Total Balance card — dark bg in both modes, slightly lighter in dark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-2xl bg-infinder-black dark:bg-[#1c1c1c] text-white p-7 relative overflow-hidden"
            >
              {/* Candlestick background animation */}
              <div className="absolute inset-0 opacity-[0.18] pointer-events-none">
                <CandlestickCanvas isDark={dark} className="w-full h-full" />
              </div>
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-infinder-lime/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-infinder-lime/5 blur-2xl pointer-events-none" />

              <div className="relative z-10 flex justify-between items-start gap-4">
                <div>
                  <p className="text-white/50 text-xs font-medium tracking-widest uppercase">{t('dashboard_total_balance')}</p>
                  <p className="text-4xl md:text-5xl font-bold mt-2 tabular-nums">
                    EGP {user.wallet_balance.toFixed(2)}
                  </p>
                  <p className="mt-3 text-sm text-white/40">{t('dashboard_available_cash')}</p>
                </div>
                <Link
                  to="/funding"
                  className="rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2.5 text-sm shrink-0 hover:shadow-[0_0_20px_rgba(190,243,94,0.4)] transition-shadow"
                >
                  {t('dashboard_add_funds')}
                </Link>
              </div>
            </motion.div>

            {/* Smart Assistant card — lime green, same in both modes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              className="rounded-2xl bg-infinder-lime text-infinder-black p-7 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-infinder-black/5 blur-2xl pointer-events-none" />
              <div className="relative">
                <p className="font-bold text-lg leading-snug">{t('dashboard_smart_assistant')}</p>
                <p className="text-sm mt-2 text-infinder-black/65 leading-relaxed">
                  {t('dashboard_assistant_desc')}
                </p>
              </div>
              <Link
                to="/assistant"
                className="relative mt-5 inline-block text-center rounded-full bg-infinder-black text-white font-semibold py-2.5 text-sm hover:opacity-85 transition"
              >
                {t('dashboard_start_now')}
              </Link>
            </motion.div>
          </div>

          {/* Quick nav cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                to: '/learn',
                emoji: '📘',
                title: t('dashboard_learn_title'),
                desc: t('dashboard_learn_desc'),
                extra: (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                      <span>{t('dashboard_progress')}</span>
                      <span>{learnPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                      <div
                        className="h-full bg-infinder-green rounded-full transition-all duration-500"
                        style={{ width: `${learnPct}%` }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                to: '/invest',
                emoji: '📈',
                title: t('dashboard_invest_title'),
                desc: t('dashboard_invest_desc'),
              },
              {
                to: '/profile',
                emoji: '👤',
                title: t('dashboard_profile_title'),
                desc: t('dashboard_profile_desc'),
              },
            ].map(({ to, emoji, title, desc, extra }, i) => (
              <motion.div
                key={to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <Link
                  to={to}
                  className="group block rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] p-6 hover:border-infinder-lime/50 hover:shadow-md dark:hover:shadow-none dark:hover:border-[#b6f040]/40 transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#2a2a2a] group-hover:bg-infinder-lime/10 flex items-center justify-center text-xl transition-colors mb-4">
                    {emoji}
                  </div>
                  <h3 className="font-semibold text-base text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{desc}</p>
                  {extra}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Secondary links */}
          <div className="flex gap-3 flex-wrap items-center">
            <Link
              to="/rewards"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-white px-4 py-2 text-sm font-medium hover:border-infinder-black dark:hover:border-gray-500 hover:shadow-sm transition-all"
            >
              {t('dashboard_rewards')}
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-white px-4 py-2 text-sm font-medium hover:border-infinder-black dark:hover:border-gray-500 hover:shadow-sm transition-all"
            >
              {t('dashboard_reports')}
            </Link>
          </div>

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
                            isDeposit ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}
                          {tx.amount.toLocaleString('en-EG', { minimumFractionDigits: 2 })} EGP
                        </p>
                        {tx.fee_amount > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            fee: {tx.fee_amount.toFixed(2)} EGP
                          </p>
                        )}
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

        </div>
      </div>
    </AppShell>
  );
}
