import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, updateProfile, refreshMe } = useAuth();
  const [learnPct, setLearnPct] = useState(0);

  useEffect(() => {
    api
      .get('/api/learning/modules')
      .then((r) => {
        const mods = r.data.modules || [];
        const total = mods.reduce((s: number, m: { lesson_count?: number }) => s + (m.lesson_count || 0), 0);
        const done = mods.reduce((s: number, m: { completed_lessons?: number }) => s + (m.completed_lessons || 0), 0);
        setLearnPct(total ? Math.round((done / total) * 100) : 0);
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">Dashboard</p>
              <h1 className="text-2xl md:text-3xl font-bold text-infinder-black">
                Welcome back{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
              </h1>
            </div>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer self-start sm:self-center">
              <span className="text-gray-500 font-medium">Sharia mode</span>
              <button
                type="button"
                role="switch"
                aria-checked={user.sharia_mode}
                onClick={async () => {
                  await updateProfile({ sharia_mode: !user.sharia_mode });
                  await refreshMe();
                }}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                  user.sharia_mode ? 'bg-infinder-green' : 'bg-gray-200'
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3 flex gap-2 items-start">
              <span>ℹ️</span>
              <div>
                <strong>Account verification pending</strong> — your identity is being reviewed. Some actions may be limited until complete.
              </div>
            </div>
          )}

          {/* Balance + Assistant */}
          <div className="grid lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-2xl bg-infinder-black text-white p-7 relative overflow-hidden"
            >
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-infinder-lime/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-infinder-lime/5 blur-2xl pointer-events-none" />

              <div className="relative flex justify-between items-start gap-4">
                <div>
                  <p className="text-white/50 text-xs font-medium tracking-widest uppercase">Total balance</p>
                  <p className="text-4xl md:text-5xl font-bold mt-2 tabular-nums">
                    EGP {user.wallet_balance.toFixed(2)}
                  </p>
                  <p className="mt-3 text-sm text-white/40">Available cash</p>
                </div>
                <Link
                  to="/funding"
                  className="rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2.5 text-sm shrink-0 hover:shadow-[0_0_20px_rgba(190,243,94,0.4)] transition-shadow"
                >
                  + Add funds
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              className="rounded-2xl bg-infinder-lime text-infinder-black p-7 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-infinder-black/5 blur-2xl pointer-events-none" />
              <div className="relative">
                <p className="font-bold text-lg leading-snug">✨ Smart Assistant</p>
                <p className="text-sm mt-2 text-infinder-black/65 leading-relaxed">
                  Get a personalized portfolio mix based on your goals.
                </p>
              </div>
              <Link
                to="/assistant"
                className="relative mt-5 inline-block text-center rounded-full bg-infinder-black text-white font-semibold py-2.5 text-sm hover:opacity-85 transition"
              >
                Start now →
              </Link>
            </motion.div>
          </div>

          {/* Quick nav cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                to: '/learn',
                emoji: '📘',
                title: 'Learn',
                desc: 'Continue your investing education.',
                extra: (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Progress</span>
                      <span>{learnPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
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
                title: 'Invest',
                desc: 'Browse and manage your investments.',
              },
              {
                to: '/profile',
                emoji: '👤',
                title: 'Profile',
                desc: 'Manage account settings and wallet.',
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
                  className="group block rounded-2xl border border-gray-200 bg-white p-6 hover:border-infinder-lime/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-infinder-lime/10 flex items-center justify-center text-xl transition-colors mb-4">
                    {emoji}
                  </div>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
                  {extra}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Secondary links */}
          <div className="flex gap-3 flex-wrap items-center">
            <Link
              to="/rewards"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:border-infinder-black hover:shadow-sm transition-all"
            >
              🏅 Rewards
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:border-infinder-black hover:shadow-sm transition-all"
            >
              📊 Reports
            </Link>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
