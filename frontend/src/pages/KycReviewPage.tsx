import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function KycReviewPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinder-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <Logo />
      </div>
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-8 w-full max-w-md justify-center">
        <span className="text-infinder-green font-semibold">{t('kyc_step_personal')}</span>
        <span className="text-infinder-green font-semibold">{t('kyc_step_verification')}</span>
        <span className="font-semibold text-infinder-black dark:text-white">{t('kyc_step_review')}</span>
      </div>
      <div className="w-full max-w-lg bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] p-10 shadow-sm dark:shadow-none text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-infinder-lime flex items-center justify-center text-2xl mb-4">
          ⏱
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('kyc_title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {t('kyc_sub')}
        </p>
        <div className="mt-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] p-4 text-left text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400">{t('kyc_progress_label')}</span>
            <motion.span
              className="text-infinder-green font-medium"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t('kyc_processing')}
            </motion.span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full w-3/5 bg-infinder-green rounded-full" />
          </div>
        </div>
        <Link
          to="/dashboard"
          className="mt-8 inline-block w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
        >
          {t('kyc_go_dashboard')}
        </Link>
      </div>
    </div>
  );
}
