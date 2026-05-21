import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Landmark, Award, type LucideIcon } from 'lucide-react';
import { SubpageShell } from '../components/AppShell';
import api from '../lib/api';

type Partner = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  tags: string[];
};

const iconMap: Record<string, LucideIcon> = {
  shield:   ShieldCheck,
  trending: TrendingUp,
  bank:     Landmark,
  ribbon:   Award,
};

export default function PartnersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/partners')
      .then(r => setPartners(r.data.partners || []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SubpageShell>
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">{t('partners_title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('partners_subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10" />
                <div className="h-4 w-40 rounded-full bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-white/5 mb-2" />
              <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-white/5 mb-4" />
              <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-white/5 mb-4" />
              <div className="h-9 rounded-xl bg-gray-200 dark:bg-white/10" />
            </div>
          ))
        ) : partners.map((partner, i) => {
          const Icon = iconMap[partner.icon] ?? ShieldCheck;
          return (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-infinder-lime/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-infinder-black dark:text-[#C5F94E]" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{partner.name}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex-1">{partner.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {(partner.tags || []).map(tag => (
                  <span key={tag} className="text-xs rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-2.5 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/partners/${partner.slug}`)}
                className="w-full rounded-xl py-2.5 text-sm font-semibold bg-infinder-lime text-infinder-black hover:opacity-90 transition-opacity"
              >
                {t('partners_explore_btn')}
              </button>
            </motion.div>
          );
        })}
      </div>
    </SubpageShell>
  );
}
