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

  const kycBanner =
    user.kyc_status !== 'approved' ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3 flex gap-2 items-start">
        <span>ℹ️</span>
        <div>
          <strong>Account verification pending:</strong> your identity is being verified. Some actions may be limited until
          complete.
        </div>
      </div>
    ) : null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Welcome back{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
            <p className="text-gray-600 text-sm mt-1">Here&apos;s your investment overview.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <span>Sharia mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={user.sharia_mode}
              onClick={async () => {
                await updateProfile({ sharia_mode: !user.sharia_mode });
                await refreshMe();
              }}
              className={`relative h-7 w-12 rounded-full transition ${user.sharia_mode ? 'bg-infinder-green' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  user.sharia_mode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>

        {kycBanner}

        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl bg-infinder-black text-white p-6 relative overflow-hidden"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-white/70 text-sm">Total balance</p>
                <p className="text-4xl font-bold mt-1">EGP {user.wallet_balance.toFixed(2)}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
                  <span>Available cash</span>
                  <span>Invested —</span>
                  <span>Returns (+0.00%)</span>
                </div>
              </div>
              <Link
                to="/funding"
                className="rounded-full bg-infinder-lime text-infinder-black font-semibold px-4 py-2 text-sm shrink-0"
              >
                Add funds
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-infinder-lime text-infinder-black p-6 flex flex-col justify-between"
          >
            <div>
              <p className="font-semibold flex items-center gap-2">✨ Smart Assistant</p>
              <p className="text-sm mt-2 opacity-90">Get personalized guidance and a suggested mix.</p>
            </div>
            <Link to="/assistant" className="mt-4 inline-block text-center rounded-full bg-infinder-black text-white font-semibold py-2 text-sm">
              Start now
            </Link>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/learn"
            className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition hover:-translate-y-0.5"
          >
            <div className="text-xl">📘</div>
            <h3 className="font-semibold mt-2">Learn</h3>
            <p className="text-sm text-gray-600 mt-1">Continue your investing education.</p>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-infinder-green rounded-full transition-all"
                style={{ width: `${learnPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{learnPct}% complete</p>
          </Link>
          <Link
            to="/invest"
            className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition hover:-translate-y-0.5"
          >
            <div className="text-xl">📈</div>
            <h3 className="font-semibold mt-2">Invest</h3>
            <p className="text-sm text-gray-600 mt-1">Browse investment options.</p>
          </Link>
          <Link
            to="/profile"
            className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition hover:-translate-y-0.5"
          >
            <div className="text-xl">👤</div>
            <h3 className="font-semibold mt-2">Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Manage account settings.</p>
          </Link>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <Link to="/rewards" className="text-sm font-medium text-infinder-black underline">
            Rewards
          </Link>
          <span className="text-gray-300">·</span>
          <Link to="/reports" className="text-sm font-medium text-infinder-black underline">
            Reports
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
