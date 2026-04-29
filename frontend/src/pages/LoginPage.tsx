import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { showAlert } from '../lib/swal';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      nav(loc.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      showAlert('Login failed', t('auth_invalid_credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-infinder-black flex flex-col">
      {/* Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-infinder-lime/8 blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="relative p-6">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-white">INFINDER</span>
        </Link>
      </div>

      {/* Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm"
        >
          <h1 className="text-2xl font-bold text-white">{t('auth_welcome_back')}</h1>
          <p className="text-white/45 text-sm mt-1">{t('auth_sign_in_sub')}</p>

          <label className="block mt-6 text-sm font-medium text-white/70">{t('auth_email')}</label>
          <input
            className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            required
          />

          <div className="flex items-center justify-between mt-5">
            <label className="text-sm font-medium text-white/70">{t('auth_password')}</label>
            <span className="text-xs text-white/30">{t('auth_forgot_password')}</span>
          </div>
          <input
            className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
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

          <p className="text-center text-sm text-white/35 mt-5">
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
