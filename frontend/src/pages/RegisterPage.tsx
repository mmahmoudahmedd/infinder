import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { showAlert, showSuccess } from '../lib/swal';
import { useTheme } from '../hooks/useTheme';
import WaveCanvas from '../components/canvas/WaveCanvas';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { dark, toggle } = useTheme();
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sharia_mode, setSharia] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ email, password, full_name, phone, sharia_mode });
      await showSuccess('Account created!', 'Welcome to INFINDER. Let\'s verify your identity.');
      nav('/onboarding/review', { replace: true });
    } catch {
      showAlert('Registration failed', t('auth_create_error'));
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
      <div className="relative p-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">INFINDER</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
            className="p-1.5 rounded-md text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link to="/login" className="text-sm text-gray-500 dark:text-white/45 hover:text-gray-900 dark:hover:text-white transition">
            {t('auth_have_account')}
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-lg bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-sm dark:shadow-none backdrop-blur-sm"
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs mb-6">
            <span className="font-semibold text-infinder-lime bg-infinder-lime/10 border border-infinder-lime/25 rounded-full px-3 py-1">
              {t('auth_step_personal')}
            </span>
            <span className="text-gray-300 dark:text-white/25">—</span>
            <span className="text-gray-400 dark:text-white/30">{t('auth_step_verification')}</span>
            <span className="text-gray-300 dark:text-white/25">—</span>
            <span className="text-gray-400 dark:text-white/30">{t('auth_step_review')}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth_create_account')}</h1>
          <p className="text-gray-500 dark:text-white/45 text-sm mt-1">{t('auth_create_sub')}</p>

          {[
            { label: t('auth_full_name'), value: full_name, setter: setFullName, type: 'text',     placeholder: 'Your full name' },
            { label: t('auth_email'),     value: email,     setter: setEmail,    type: 'email',    placeholder: 'you@example.com' },
            { label: t('auth_phone'),     value: phone,     setter: setPhone,    type: 'tel',      placeholder: '+20 xxx xxx xxxx' },
            { label: t('auth_password'),  value: password,  setter: setPassword, type: 'password', placeholder: '••••••••', minLength: 6 },
          ].map(({ label, value, setter, type, placeholder, minLength }) => (
            <div key={label} className="mt-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70">{label}</label>
              <input
                className="mt-1.5 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required={type !== 'tel'}
                minLength={minLength}
              />
            </div>
          ))}

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4 cursor-pointer hover:border-infinder-lime/40 dark:hover:border-infinder-lime/25 transition">
            <input
              type="checkbox"
              checked={sharia_mode}
              onChange={(e) => setSharia(e.target.checked)}
              className="mt-0.5 accent-infinder-lime"
            />
            <span>
              <span className="font-medium text-gray-900 dark:text-white block text-sm">{t('auth_enable_sharia')}</span>
              <span className="text-xs text-gray-500 dark:text-white/40 mt-0.5 block">{t('auth_sharia_desc')}</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3.5 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(190,243,94,0.2)]"
          >
            {loading ? t('auth_creating_account') : t('auth_continue_verification')}
          </button>
        </form>
      </div>
    </div>
  );
}
