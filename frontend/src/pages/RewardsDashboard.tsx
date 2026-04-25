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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('rewards_title')}</h1>
          <p className="text-gray-600 text-sm mt-1">{t('rewards_sub')}</p>
        </div>
        <button
          type="button"
          onClick={recheck}
          className="rounded-full border border-infinder-black px-4 py-2 text-sm font-medium self-start"
        >
          {t('rewards_refresh')}
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500 text-sm">{t('common_loading')}</p>
      ) : items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-600 text-sm">
          {t('rewards_none')}
        </div>
      ) : (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-glow transition"
            >
              <div className="text-3xl mb-2">🏅</div>
              <h2 className="font-semibold">{a.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{a.description}</p>
              <p className="text-xs text-gray-400 mt-3">{new Date(a.earned_at).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </SubpageShell>
  );
}
