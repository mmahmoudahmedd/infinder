import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

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

const categoryIcon: Record<string, string> = {
  stocks: '📈',
  bonds: '🏦',
  gold: '🥇',
  basket: '🧺',
  crypto: '₿',
};

const CATEGORIES = ['all', 'stocks', 'baskets', 'bonds', 'gold'] as const;

const riskBadgeClass: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  low_medium: 'bg-teal-100 text-teal-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

export default function InvestmentOptions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<Inv[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>('all');
  const [investModal, setInvestModal] = useState<Inv | null>(null);
  const [investAmt, setInvestAmt] = useState('');
  const [investMsg, setInvestMsg] = useState('');

  const riskLabel: Record<string, string> = {
    low: t('invest_risk_low_label'),
    low_medium: t('invest_risk_low_medium_label'),
    medium: t('invest_risk_medium_label'),
    high: t('invest_risk_high_label'),
  };

  useEffect(() => {
    const q = user?.sharia_mode ? '?sharia=1' : '';
    api.get(`/api/investments${q}`).then((r) => setItems(r.data.investments));
  }, [user?.sharia_mode]);

  if (!user) return null;

  const filtered = filter === 'all' ? items : items.filter((inv) => inv.category === filter);

  return (
    <SubpageShell>
      {/* 2a-1: Page header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-infinder-black">{t('nav_invest')}</h1>
      </div>

      <div className="rounded-2xl bg-infinder-lime text-infinder-black p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm font-medium">{t('invest_assistant_banner')}</p>
        <Link to="/assistant" className="rounded-full bg-infinder-black text-white text-sm font-semibold px-4 py-2 text-center shrink-0">
          {t('invest_use_assistant')}
        </Link>
      </div>

      {user.sharia_mode && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 text-sm px-4 py-3 flex gap-2">
          <span>ℹ️</span>
          <span>{t('invest_sharia_notice')}</span>
        </div>
      )}

      {/* 2a-2: Category filter pills */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition shrink-0 ${
              filter === cat
                ? 'bg-infinder-black text-white'
                : 'border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* 2a-3: Cards grid with Framer Motion stagger */}
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
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-lg">{inv.title}</h3>
                <span className="text-xl">{categoryIcon[inv.category] ?? '📊'}</span>
              </div>
              {/* 2a-4: Risk badge colors */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs rounded-full px-2 py-0.5 ${riskBadgeClass[inv.risk_level] ?? 'bg-gray-100 text-gray-700'}`}>
                  {riskLabel[inv.risk_level] || inv.risk_level}
                </span>
                {inv.is_halal && (
                  <span className="text-xs rounded-full border border-gray-300 px-2 py-0.5">{t('invest_halal')}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3">{inv.description}</p>
              <div className="mt-4 rounded-xl bg-gray-100 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('invest_min_investment')}</span>
                  <span className="font-medium">EGP {inv.min_investment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('invest_expected_returns')}</span>
                  <span className="font-medium text-infinder-green">
                    {inv.expected_return_low ?? '—'}–{inv.expected_return_high ?? '—'}% {t('invest_annually')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 text-sm text-gray-600 flex items-center gap-1 hover:text-infinder-black transition"
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
                <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {/* 2a-6: Invest button wired to modal */}
              <button
                type="button"
                disabled={!can}
                onClick={() => {
                  if (can) {
                    setInvestModal(inv);
                    setInvestAmt('');
                    setInvestMsg('');
                  }
                }}
                className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold ${
                  can ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {can ? t('invest_invest_btn') : t('invest_insufficient')}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* 2a-5: Polished risk section */}
      <section className="mt-12 rounded-2xl bg-infinder-black text-white p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-infinder-lime/5 blur-3xl pointer-events-none" />
        <h2 className="text-lg font-bold">{t('invest_risk_title')}</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm text-gray-300">
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

      {/* 2a-6: Invest modal */}
      {investModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold">{investModal.title}</h3>
            <p className="text-sm text-gray-600 mt-1">Enter amount to invest</p>
            <div className="mt-3 flex rounded-xl border border-gray-200 overflow-hidden">
              <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
              <input
                className="flex-1 px-3 py-2 outline-none text-sm"
                value={investAmt}
                onChange={(e) => setInvestAmt(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
            {investMsg && <p className="mt-2 text-sm text-green-600">{investMsg}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setInvestModal(null)}
                className="flex-1 rounded-full border border-gray-300 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const amount = Number(investAmt);
                  if (!amount || amount <= 0) return;
                  try {
                    await api.post('/api/investments/apply', {
                      amount,
                      allocation: { [investModal.category]: 100 },
                      is_sharia: user.sharia_mode,
                      name: investModal.title,
                    });
                    setInvestMsg('Investment placed successfully!');
                    setTimeout(() => setInvestModal(null), 1500);
                  } catch {
                    setInvestMsg('Something went wrong. Please try again.');
                  }
                }}
                className="flex-1 rounded-full bg-infinder-lime text-infinder-black font-semibold py-2 text-sm"
              >
                Confirm &amp; invest
              </button>
            </div>
          </div>
        </div>
      )}
    </SubpageShell>
  );
}
