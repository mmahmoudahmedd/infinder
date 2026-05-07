import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { showAlert, showSuccess } from '../lib/swal';
import { useTheme } from '../hooks/useTheme';
import WaveCanvas from '../components/canvas/WaveCanvas';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const { t } = useTranslation();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      await showSuccess('Welcome back!', 'You have signed in successfully.');
      nav(loc.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      showAlert('Login failed', t('auth_invalid_credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinder-black flex flex-col relative overflow-hidden">
      {/* Wave background */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none">
        <WaveCanvas isDark={dark} className="w-full h-full" />
      </div>
      {/* Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-infinder-lime/8 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">INFINDER</span>
        </Link>
        <button
          type="button"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggle}
          className="p-1.5 rounded-md text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-sm dark:shadow-none backdrop-blur-sm"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth_welcome_back')}</h1>
          <p className="text-gray-500 dark:text-white/45 text-sm mt-1">{t('auth_sign_in_sub')}</p>

          <label className="block mt-6 text-sm font-medium text-gray-700 dark:text-white/70">{t('auth_email')}</label>
          <input
            className="mt-1.5 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            required
          />

          <div className="flex items-center justify-between mt-5">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">{t('auth_password')}</label>
            <span className="text-xs text-gray-400 dark:text-white/30">{t('auth_forgot_password')}</span>
          </div>
          <input
            className="mt-1.5 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3.5 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(190,243,94,0.2)]"
          >
            {loading ? t('auth_signing_in') : t('auth_sign_in_btn')}
          </button>

          <p className="text-center text-sm text-gray-400 dark:text-white/35 mt-5">
            {t('auth_no_account')}{' '}
            <Link to="/register" className="font-medium text-infinder-lime hover:opacity-80 transition">
              {t('auth_create_one')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
