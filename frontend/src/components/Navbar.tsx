import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import i18n from '../i18n';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

type Props = {
  showNav?: boolean;
  right?: React.ReactNode;
  className?: string;
};

const navLinks = [
  { to: '/dashboard', labelKey: 'nav_dashboard' },
  { to: '/invest',    labelKey: 'nav_invest' },
  { to: '/learn',     labelKey: 'nav_learn' },
  { to: '/reports',   labelKey: 'nav_reports' },
  { to: '/profile',   labelKey: 'nav_profile' },
];

function AvatarIcon() {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="14" cy="14" r="14" fill="#374151" className="dark:fill-gray-600" />
        <circle cx="14" cy="11.5" r="4.5" fill="#9ca3af" />
        <ellipse cx="14" cy="24" rx="9" ry="6" fill="#9ca3af" />
      </svg>
    </div>
  );
}


export function Navbar({ showNav, right, className }: Props) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lang = i18n.language;
  const { dark, toggle } = useTheme();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'pb-[3px] border-b-2 text-sm transition-colors duration-150 whitespace-nowrap',
      isActive
        ? 'text-gray-900 dark:text-white font-semibold border-[#b6f040]'
        : 'text-gray-400 dark:text-gray-500 font-normal border-transparent hover:text-gray-600 dark:hover:text-gray-300'
    );

  return (
    <header className={clsx('bg-white dark:bg-[#0f0f0f] border-b border-gray-100 dark:border-gray-800', className)}>
      {/* 56px main bar */}
      <div className="h-14 flex items-center px-6 gap-8">

        {/* Left: logo mark + wordmark */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0a0a0a] dark:bg-[#b6f040] font-bold text-sm"
            style={{ color: '#b6f040' }}
          >
            <span className="dark:text-[#0a0a0a]">i</span>
          </span>
          <span className="font-bold tracking-tight text-[#0a0a0a] dark:text-white text-sm">INFINDER</span>
        </Link>

        {/* Center: nav links (desktop) */}
        {showNav && user ? (
          <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {navLinks.map(({ to, labelKey }) => (
              <NavLink key={to} to={to} className={navLinkClass} end={to === '/dashboard'}>
                {t(labelKey)}
              </NavLink>
            ))}
            {user.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx(
                    'pb-[3px] border-b-2 text-sm transition-colors duration-150 whitespace-nowrap',
                    isActive
                      ? 'text-amber-700 dark:text-amber-400 font-semibold border-amber-400'
                      : 'text-amber-600 dark:text-amber-500 border-transparent hover:text-amber-800 dark:hover:text-amber-300'
                  )
                }
              >
                {t('nav_admin')}
              </NavLink>
            )}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: lang switcher + theme toggle + avatar + sign out (desktop) */}
        <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto">
          {right}

          {/* EN GB — active pill */}
          <button
            type="button"
            onClick={() => i18n.changeLanguage('en')}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150',
              lang === 'en'
                ? 'bg-[#b6f040] text-[#0a0a0a]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            EN GB
          </button>

          {/* عر EG — plain text */}
          <button
            type="button"
            onClick={() => i18n.changeLanguage('ar')}
            className={clsx(
              'text-xs transition-colors duration-150',
              lang === 'ar'
                ? 'text-[#0a0a0a] dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            عر EG
          </button>

          {/* Dark / light toggle */}
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && <AvatarIcon />}

          {user && (
            <button
              type="button"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-150"
              onClick={() => { logout(); nav('/'); }}
            >
              {t('nav_sign_out')}
            </button>
          )}
        </div>

        {/* Mobile: right slot + hamburger */}
        <div className="flex lg:hidden items-center gap-2 ml-auto">
          {right}

          {/* Lang pills compact */}
          <button
            type="button"
            onClick={() => i18n.changeLanguage('en')}
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
              lang === 'en' ? 'bg-[#b6f040] text-[#0a0a0a]' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('ar')}
            className={clsx(
              'text-xs transition-colors',
              lang === 'ar' ? 'text-[#0a0a0a] dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            عر
          </button>

          {/* Theme toggle (mobile) */}
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {showNav && user && (
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
          {user && !showNav && (
            <button
              type="button"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => { logout(); nav('/'); }}
            >
              {t('nav_sign_out')}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && showNav && user && (
        <nav className="lg:hidden bg-white dark:bg-[#0f0f0f] border-b border-gray-100 dark:border-gray-800 shadow-sm flex flex-col px-6 py-1 text-sm">
          {navLinks.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                clsx(
                  'py-3 border-b border-gray-50 dark:border-gray-800 transition-colors duration-150',
                  isActive
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              {t(labelKey)}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  'py-3 border-b border-gray-50 dark:border-gray-800 transition-colors duration-150',
                  isActive
                    ? 'text-amber-700 dark:text-amber-400 font-semibold'
                    : 'text-amber-600 dark:text-amber-500'
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              {t('nav_admin')}
            </NavLink>
          )}
          <button
            type="button"
            className="py-3 text-left text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick={() => { setMobileOpen(false); logout(); nav('/'); }}
          >
            {t('nav_sign_out')}
          </button>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
