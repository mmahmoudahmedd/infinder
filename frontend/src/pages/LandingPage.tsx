import { useEffect, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, BookOpen, Wallet, TrendingUp, Leaf, ShieldCheck, Library, Zap, type LucideIcon } from 'lucide-react';
import i18n from '../i18n';
import { useTheme } from '../hooks/useTheme';
import ParticleNetwork from '../components/canvas/ParticleNetwork';
import GlobeWireframe from '../components/canvas/GlobeWireframe';
import LandingFooter from '../components/LandingFooter';

export default function LandingPage() {
  const { t } = useTranslation();
  const { dark, toggle } = useTheme();
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => {
    i18n.on('languageChanged', forceUpdate);
    return () => i18n.off('languageChanged', forceUpdate);
  }, []);

  const steps: { title: string; desc: string; icon: LucideIcon; num: string }[] = [
    { title: t('landing_step_learn_title'), desc: t('landing_step_learn_desc'), icon: BookOpen,   num: '01' },
    { title: t('landing_step_fund_title'),  desc: t('landing_step_fund_desc'),  icon: Wallet,     num: '02' },
    { title: t('landing_step_invest_title'),desc: t('landing_step_invest_desc'),icon: TrendingUp, num: '03' },
    { title: t('landing_step_grow_title'),  desc: t('landing_step_grow_desc'),  icon: Leaf,       num: '04' },
  ];

  const features: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: ShieldCheck, title: t('landing_feat_safe_title'),  desc: t('landing_feat_safe_desc') },
    { icon: Library,     title: t('landing_feat_learn_title'), desc: t('landing_feat_learn_desc') },
    { icon: Zap,         title: t('landing_feat_smart_title'), desc: t('landing_feat_smart_desc') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-infinder-black">

      {/* Fixed header */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-infinder-black/80 backdrop-blur-md border-b border-gray-200/80 dark:border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">INFINDER</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <Link to="/learn" className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition hidden sm:inline">
            {t('landing_step_learn_title')}
          </Link>

          {/* Lang switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => i18n.changeLanguage('en')}
              className={`rounded-full px-2 py-1 text-xs transition ${
                i18n.language === 'en'
                  ? 'bg-infinder-lime text-infinder-black font-semibold'
                  : 'border border-gray-300 dark:border-white/20 text-gray-500 dark:text-white/60 hover:border-gray-400 dark:hover:border-white/40'
              }`}
            >
              EN 🇬🇧
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage('ar')}
              className={`rounded-full px-2 py-1 text-xs transition ${
                i18n.language === 'ar'
                  ? 'bg-infinder-lime text-infinder-black font-semibold'
                  : 'border border-gray-300 dark:border-white/20 text-gray-500 dark:text-white/60 hover:border-gray-400 dark:hover:border-white/40'
              }`}
            >
              عر 🇪🇬
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
            className="p-1.5 rounded-md text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            to="/login"
            className="rounded-full border border-gray-300 dark:border-white/20 px-4 py-2 font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            {t('landing_sign_in')}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Particle network background */}
        <ParticleNetwork isDark={dark} className="absolute inset-0 pointer-events-none" />
        {/* Glow blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-infinder-lime/8 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-infinder-lime/5 blur-[100px] pointer-events-none" />

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-infinder-lime/25 bg-infinder-lime/10 px-4 py-1.5 text-xs font-medium text-infinder-lime tracking-wide">
            {t('landing_badge')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white text-center max-w-4xl leading-[1.1]"
        >
          {t('landing_hero_pre')}{' '}
          <span className="text-infinder-lime">{t('landing_hero_highlight')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-7 text-gray-600 dark:text-white/80 max-w-xl text-center text-lg leading-relaxed"
        >
          {t('landing_hero_sub')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/register"
            className="rounded-full bg-infinder-lime text-infinder-black px-8 py-3.5 font-semibold text-sm shadow-[0_0_40px_rgba(190,243,94,0.35)] hover:shadow-[0_0_60px_rgba(190,243,94,0.5)] hover:scale-[1.02] transition-all duration-200"
          >
            {t('landing_cta_start')}
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-gray-300 dark:border-white/20 text-gray-800 dark:text-white px-8 py-3.5 font-medium text-sm hover:bg-gray-100 dark:hover:bg-white/8 transition"
          >
            {t('landing_cta_login')}
          </Link>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mt-14 flex flex-wrap justify-center gap-6 text-gray-400 dark:text-white/30 text-xs tracking-wide"
        >
          <span>{t('landing_trust_kyc')}</span>
          <span>{t('landing_trust_sharia')}</span>
          <span>{t('landing_trust_ai')}</span>
          <span>{t('landing_trust_fees')}</span>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-infinder-black px-6 py-24 overflow-hidden">
        {/* Globe — right side, partially cropped */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 opacity-40 pointer-events-none hidden lg:block">
          <GlobeWireframe isDark={dark} className="w-full h-full" />
        </div>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-infinder-lime text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              {t('landing_how_label')}
            </p>
            <h2 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-bold">
              {t('landing_how_title')}
            </h2>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] p-6 hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:border-infinder-lime/40 dark:hover:border-infinder-lime/25 transition-all duration-300 shadow-sm dark:shadow-none"
              >
                <div className="flex justify-between items-start mb-5">
                  <s.icon className="w-6 h-6 text-gray-600 dark:text-white/60 group-hover:text-infinder-green transition-colors" />
                  <span className="text-xs font-mono text-gray-300 dark:text-white/20 group-hover:text-infinder-lime/60 dark:group-hover:text-infinder-lime/40 transition">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">{s.title}</h3>
                <p className="text-gray-500 dark:text-white/45 text-sm mt-1.5 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gradient bridge */}
      <div className="h-16 bg-gradient-to-b from-gray-50 to-white dark:from-[#0a0a0a] dark:to-white" />

      {/* Features */}
      <section className="bg-white dark:bg-[#0f0f0f] px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-infinder-green text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              {t('landing_why_label')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t('landing_why_title')}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group p-7 rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-infinder-lime/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-infinder-black flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-infinder-lime" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner — lime, same in both modes */}
      <section className="bg-infinder-lime px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <h2 className="text-infinder-black text-2xl md:text-3xl font-bold">
              {t('landing_cta_banner_title')}
            </h2>
            <p className="text-infinder-black/55 text-sm mt-1.5">
              {t('landing_cta_banner_sub')}
            </p>
          </div>
          <Link
            to="/register"
            className="rounded-full bg-infinder-black text-white font-semibold px-8 py-3.5 text-sm hover:opacity-90 transition-opacity duration-150 shrink-0 shadow-lg"
          >
            {t('landing_cta_banner_btn')}
          </Link>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}
