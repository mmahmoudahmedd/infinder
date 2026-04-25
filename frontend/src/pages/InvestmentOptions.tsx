import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function InvestmentOptions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<Inv[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  return (
    <SubpageShell>
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

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {items.map((inv) => {
          const can = user.wallet_balance >= inv.min_investment;
          const isOpen = open[inv.id];
          const bullets = Array.isArray(inv.learn_more) ? inv.learn_more : [];
          return (
            <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-lg">{inv.title}</h3>
                <span className="text-xl">{categoryIcon[inv.category] ?? '📊'}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">{riskLabel[inv.risk_level] || inv.risk_level}</span>
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
              <button
                type="button"
                disabled={!can}
                className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold ${
                  can ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {can ? t('invest_invest_btn') : t('invest_insufficient')}
              </button>
            </div>
          );
        })}
      </div>

      <section className="mt-12 rounded-2xl bg-infinder-black text-white p-6">
        <h2 className="text-lg font-bold">{t('invest_risk_title')}</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm text-gray-300">
          <p>{t('invest_risk_low_text')}</p>
          <p>{t('invest_risk_medium_text')}</p>
          <p>{t('invest_risk_high_text')}</p>
        </div>
      </section>
    </SubpageShell>
  );
}
