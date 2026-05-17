import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark, Coins, ShoppingBasket, Bitcoin, Info, type LucideIcon } from 'lucide-react';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showLoading, closeLoading, showSuccess, showError } from '../lib/swal';

type Inv = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  min_investment: number;
  expected_return_low: number | null;
  expected_return_high: number | null;
  risk_level: string;
  is_halal: boolean;
  learn_more: string[] | null;
};

type Position = {
  id: string;
  name: string;
  allocation: Record<string, number>;
  is_sharia: boolean;
  status: string;
  created_at: string;
  amount: number | null;
  fee_amount: number;
};

const FEE_RATE = 0.0025;
const MIN_FEE = 1;
function calcFee(amount: number): number {
  return Math.max(parseFloat((amount * FEE_RATE).toFixed(2)), MIN_FEE);
}

const categoryIcon: Record<string, LucideIcon> = {
  stocks:  TrendingUp,
  bonds:   Landmark,
  gold:    Coins,
  basket:  ShoppingBasket,
  crypto:  Bitcoin,
};

const CATEGORIES = ['all', 'stocks', 'baskets', 'bonds', 'gold'] as const;

const riskBadgeClass: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  low_medium: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function InvestmentOptions() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const [items, setItems] = useState<Inv[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>('all');
  const [investModal, setInvestModal] = useState<Inv | null>(null);
  const [investAmt, setInvestAmt] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [exitTarget, setExitTarget] = useState<Position | null>(null);
  const [exiting, setExiting] = useState(false);

  const riskLabel: Record<string, string> = {
    low: t('invest_risk_low_label'),
    low_medium: t('invest_risk_low_medium_label'),
    medium: t('invest_risk_medium_label'),
    high: t('invest_risk_high_label'),
  };

  const fetchPositions = useCallback(() => {
    api.get('/api/investments/positions')
      .then((r) => setPositions(r.data.positions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = user?.sharia_mode ? '?sharia=1' : '';
    api.get(`/api/investments${q}`).then((r) => setItems(r.data.investments));
  }, [user?.sharia_mode]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  if (!user) return null;

  const filtered = filter === 'all' ? items : items.filter((inv) => inv.category === filter);

  return (
    <SubpageShell>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">{t('nav_invest')}</h1>
      </div>

      {/* ── My Active Positions ── */}
      {positions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">My Active Positions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {positions.map((pos) => {
              const allocEntries = Object.entries(pos.allocation || {}).filter(([, v]) => v > 0);
              const allocSummary = allocEntries
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}%`)
                .join(' · ');
              return (
                <div
                  key={pos.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{pos.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{allocSummary}</p>
                    <p className="text-xs font-medium text-infinder-green mt-1">
                      EGP {pos.amount != null ? Number(pos.amount).toFixed(2) : '—'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(pos.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExitTarget(pos)}
                    className="shrink-0 rounded-full border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Exit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-infinder-lime text-infinder-black p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm font-medium">{t('invest_assistant_banner')}</p>
        <Link to="/assistant" className="rounded-full bg-infinder-black text-white text-sm font-semibold px-4 py-2 text-center shrink-0">
          {t('invest_use_assistant')}
        </Link>
      </div>

      {user.sharia_mode && (
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] text-sm px-4 py-3 flex gap-2 text-gray-700 dark:text-gray-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('invest_sharia_notice')}</span>
        </div>
      )}

      {/* Category filter pills */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition shrink-0 ${
              filter === cat
                ? 'bg-infinder-black dark:bg-white text-white dark:text-infinder-black'
                : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {filtered.map((inv, i) => {
          const can = user.wallet_balance >= inv.min_investment;
          const isOpen = open[inv.id];
          const bullets = Array.isArray(inv.learn_more) ? inv.learn_more : [];
          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm dark:shadow-none hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{inv.title}</h3>
                {(() => { const Icon = categoryIcon[inv.category]; return Icon ? <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" /> : null; })()}
              </div>
              {/* Risk badge */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs rounded-full px-2 py-0.5 ${riskBadgeClass[inv.risk_level] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {riskLabel[inv.risk_level] || inv.risk_level}
                </span>
                {inv.is_halal && (
                  <span className="text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-2 py-0.5">{t('invest_halal')}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{inv.description}</p>
              <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/[0.04] border-l-4 border-infinder-lime pl-4 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('invest_min_investment')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">EGP {inv.min_investment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('invest_expected_returns')}</span>
                  <span className="font-medium text-infinder-green">
                    {inv.expected_return_low ?? '—'}–{inv.expected_return_high ?? '—'}% {t('invest_annually')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 hover:text-infinder-black dark:hover:text-white transition p-2 -ml-2"
                onClick={() => setOpen((o) => ({ ...o, [inv.id]: !isOpen }))}
              >
                {t('invest_learn_more')}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {isOpen && bullets.length > 0 && (
                <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5 space-y-1">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {/* Invest button */}
              <button
                type="button"
                disabled={!can}
                onClick={() => {
                  if (can) {
                    setInvestModal(inv);
                    setInvestAmt('');
                  }
                }}
                className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold ${
                  can ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {can ? t('invest_invest_btn') : t('invest_insufficient')}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Risk section */}
      <section className="mt-12 rounded-2xl bg-infinder-black text-white p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-infinder-lime/5 blur-3xl pointer-events-none" />
        <h2 className="text-lg font-bold">{t('invest_risk_title')}</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm text-gray-200">
          <div className="border-l-2 border-white/10 pl-4">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" />
            {t('invest_risk_low_text')}
          </div>
          <div className="border-l-2 border-white/10 pl-4">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2" />
            {t('invest_risk_medium_text')}
          </div>
          <div className="border-l-2 border-white/10 pl-4">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
            {t('invest_risk_high_text')}
          </div>
        </div>
      </section>

      {/* Exit confirmation modal */}
      {exitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-transparent dark:border-gray-800 p-6 max-w-sm w-full shadow-xl">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-lg mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Exit Position</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{exitTarget.name}</p>

            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Invested amount</span>
                <span>EGP {exitTarget.amount != null ? Number(exitTarget.amount).toFixed(2) : '—'}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span>You will receive</span>
                <span className="text-infinder-green">EGP {exitTarget.amount != null ? Number(exitTarget.amount).toFixed(2) : '—'}</span>
              </div>
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
              ⚠ This action is irreversible. The position will be permanently closed.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setExitTarget(null)}
                className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={exiting}
                onClick={async () => {
                  if (!exitTarget) return;
                  setExiting(true);
                  showLoading('Closing position...');
                  try {
                    const res = await api.post(`/api/investments/${exitTarget.id}/exit`);
                    closeLoading();
                    await refreshMe();
                    fetchPositions();
                    setExitTarget(null);
                    await showSuccess(
                      'Position Closed',
                      `EGP ${Number(res.data.amount).toFixed(2)} has been returned to your wallet.`,
                    );
                  } catch (e: unknown) {
                    closeLoading();
                    const ax = e as { response?: { data?: { error?: string } }; message?: string };
                    showError('Exit Failed', ax.response?.data?.error || ax.message || 'Please try again.');
                  } finally {
                    setExiting(false);
                  }
                }}
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exiting ? 'Closing…' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invest modal */}
      {investModal && (() => {
        const amount = Number(investAmt);
        const fee = amount > 0 ? calcFee(amount) : 0;
        const totalCost = amount + fee;
        const hasEnough = amount > 0 && user.wallet_balance >= totalCost;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-transparent dark:border-gray-800 p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{investModal.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Enter amount to invest</p>
              <div className="mt-3 flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <span className="px-3 flex items-center bg-gray-50 dark:bg-white/5 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">EGP</span>
                <input
                  className="flex-1 px-3 py-2 outline-none text-sm bg-white dark:bg-transparent text-gray-900 dark:text-white"
                  value={investAmt}
                  onChange={(e) => setInvestAmt(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>

              {amount > 0 && (
                <div className="mt-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800 px-3 py-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Investment amount</span>
                    <span>EGP {amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Platform fee (0.25%)</span>
                    <span>EGP {fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1.5">
                    <span>Total deducted</span>
                    <span>EGP {totalCost.toFixed(2)}</span>
                  </div>
                  {!hasEnough && (
                    <p className="text-red-500 pt-0.5">Insufficient balance for amount + fee</p>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setInvestModal(null)}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!hasEnough}
                  onClick={async () => {
                    if (!hasEnough) return;
                    showLoading('Processing your investment...');
                    try {
                      await api.post('/api/investments/apply', {
                        amount,
                        allocation: { [investModal.category]: 100 },
                        is_sharia: user.sharia_mode,
                        name: investModal.title,
                      });
                      closeLoading();
                      await showSuccess(
                        'Investment Successful!',
                        `EGP ${amount.toFixed(2)} invested in ${investModal.title}. Platform fee: EGP ${fee.toFixed(2)}. Total deducted: EGP ${totalCost.toFixed(2)}.`,
                      );
                      await refreshMe();
                      fetchPositions();
                      setInvestModal(null);
                      setInvestAmt('');
                    } catch (e: unknown) {
                      closeLoading();
                      const ax = e as { response?: { data?: { error?: string } }; message?: string };
                      const raw = ax.response?.data?.error || ax.message || '';
                      let msg = 'Something went wrong. Please try again.';
                      if (/insufficient|balance/i.test(raw)) {
                        msg = 'Your available balance is not enough for this investment.';
                      } else if (!ax.response) {
                        msg = 'Connection lost. Please try again.';
                      } else if (raw) {
                        msg = raw;
                      }
                      showError('Investment Failed', msg);
                    }
                  }}
                  className="flex-1 rounded-full bg-infinder-lime text-infinder-black font-semibold py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm &amp; invest
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </SubpageShell>
  );
}
