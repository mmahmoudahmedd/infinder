import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';

type Achievement = {
  id: string;
  badge_key: string;
  title: string;
  description: string | null;
  earned_at: string;
};

const badgeIcon: Record<string, string> = {
  first_fund: '💰',
  first_invest: '📈',
  first_lesson: '📘',
  kyc_verified: '✅',
  sharia_investor: '☪️',
  portfolio_builder: '🧩',
  learning_complete: '🎓',
  gold_investor: '🥇',
  default: '🏅',
};

const badgeAccent: Record<string, string> = {
  first_fund: '#BEF35E',
  first_invest: '#76D74F',
  first_lesson: '#60A5FA',
  kyc_verified: '#34D399',
  sharia_investor: '#A78BFA',
  learning_complete: '#FBBF24',
  default: '#E5E7EB',
};

export default function RewardsDashboard() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/rewards')
      .then((r) => setItems(r.data.achievements))
      .finally(() => setLoading(false));
  }, []);

  async function recheck() {
    const r = await api.post('/api/rewards/check');
    setItems(r.data.achievements);
  }

  return (
    <SubpageShell>
      <div className="rounded-2xl bg-infinder-black text-white p-7 relative overflow-hidden mb-8">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-infinder-lime/10 blur-3xl pointer-events-none" />
        <p className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-3xl font-bold">{t('rewards_title')}</h1>
        <p className="text-white/50 text-sm mt-2">{t('rewards_sub')}</p>
        <button
          type="button"
          onClick={recheck}
          className="mt-4 rounded-full bg-infinder-lime text-infinder-black font-semibold px-4 py-2 text-sm"
        >
          {t('rewards_refresh')}
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500 dark:text-gray-400 text-sm">{t('common_loading')}</p>
      ) : items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">{t('rewards_none')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('rewards_none_sub')}</p>
        </div>
      ) : (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm dark:shadow-none hover:shadow-[0_0_24px_rgba(190,243,94,0.35)] hover:-translate-y-1 transition-all duration-200"
              style={{ borderTop: `4px solid ${badgeAccent[a.badge_key] ?? badgeAccent.default}` }}
            >
              <div className="text-3xl mb-2">{badgeIcon[a.badge_key] ?? badgeIcon.default}</div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{a.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{new Date(a.earned_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </motion.div>
          ))}
        </div>
      )}
    </SubpageShell>
  );
}
