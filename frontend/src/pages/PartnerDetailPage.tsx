import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Landmark, Award, Lock, CheckCircle2, type LucideIcon } from 'lucide-react';
import { SubpageShell } from '../components/AppShell';
import api from '../lib/api';

type ModuleInfo = { id: string; title: string; slug: string };

type PartnerLevel = {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  description: string | null;
  module_id: string | null;
  order_index: number;
  module: ModuleInfo | null;
  completed: boolean;
};

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

const levelStyle = {
  beginner: {
    dot:   'border-emerald-300 dark:border-emerald-700',
    num:   'text-emerald-600 dark:text-emerald-400',
    card:  'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
  intermediate: {
    dot:   'border-blue-300 dark:border-blue-700',
    num:   'text-blue-600 dark:text-blue-400',
    card:  'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  advanced: {
    dot:   'border-violet-300 dark:border-violet-700',
    num:   'text-violet-600 dark:text-violet-400',
    card:  'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  },
};

export default function PartnerDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [levels, setLevels] = useState<PartnerLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/api/partners/${slug}`)
      .then(r => {
        setPartner(r.data.partner);
        setLevels(r.data.levels || []);
      })
      .catch(e => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const backBtn = (
    <button
      type="button"
      onClick={() => navigate('/partners')}
      className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
      </svg>
      {t('partners_back')}
    </button>
  );

  if (loading) {
    return (
      <SubpageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-28 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="flex gap-4 items-start mt-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-64 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="h-4 w-full rounded-full bg-gray-100 dark:bg-white/5" />
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        </div>
      </SubpageShell>
    );
  }

  if (notFound || !partner) {
    return (
      <SubpageShell>
        {backBtn}
        <p className="text-sm text-gray-500 dark:text-gray-400">Partner not found.</p>
      </SubpageShell>
    );
  }

  const Icon = iconMap[partner.icon] ?? ShieldCheck;

  return (
    <SubpageShell>
      {backBtn}

      {/* Partner header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-infinder-lime/10 flex items-center justify-center shrink-0">
          <Icon className="w-7 h-7 text-infinder-black dark:text-[#C5F94E]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-snug">{partner.name}</h1>
          {partner.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{partner.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {(partner.tags || []).map(tag => (
              <span key={tag} className="text-xs rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-2.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{t('partners_roadmap_title')}</h2>

      <div className="relative">
        {/* Vertical connector line sits behind the cards */}
        {levels.length > 1 && (
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-gray-700 -z-0" />
        )}

        <div className="space-y-5">
          {levels.map((level, idx) => {
            const prevCompleted = idx === 0 || levels[idx - 1].completed;
            const isLocked = !prevCompleted;
            const hasModule = !!level.module_id;
            const style = levelStyle[level.level] ?? levelStyle.beginner;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative z-10 flex gap-4"
              >
                {/* Step indicator */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 bg-white dark:bg-[#1a1a1a] ${
                  isLocked
                    ? 'border-gray-200 dark:border-gray-700'
                    : level.completed
                    ? 'border-[#C5F94E]'
                    : style.dot
                }`}>
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                  ) : level.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#C5F94E]" />
                  ) : (
                    <span className={`text-sm font-bold ${style.num}`}>{idx + 1}</span>
                  )}
                </div>

                {/* Level card */}
                <div className={`flex-1 rounded-2xl border bg-white dark:bg-[#1a1a1a] p-5 shadow-sm ${
                  isLocked
                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                    : level.completed
                    ? 'border-[#C5F94E]/40'
                    : style.card
                }`}>
                  {/* Level badge + cert */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                      {level.title}
                    </span>
                    {level.completed && (
                      <span className="text-xs font-medium text-[#C5F94E]">✓ {t('partners_cert_earned')}</span>
                    )}
                  </div>

                  {level.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{level.description}</p>
                  )}

                  {/* CTA */}
                  {isLocked ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl py-2.5 text-sm font-semibold bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {t('partners_locked')}
                    </button>
                  ) : level.completed ? (
                    <div className="w-full rounded-xl py-2.5 text-sm font-semibold bg-[#C5F94E]/10 text-infinder-black dark:text-[#C5F94E] text-center">
                      ✓ {t('partners_completed')}
                    </div>
                  ) : !hasModule ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl py-2.5 text-sm font-semibold bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    >
                      {t('partners_coming_soon')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/${level.module!.slug}`)}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold bg-infinder-lime text-infinder-black hover:opacity-90 transition-opacity"
                    >
                      {t('partners_start_level')} →
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SubpageShell>
  );
}
