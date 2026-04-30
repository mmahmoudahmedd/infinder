import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import i18n from '../i18n';

type Props = {
  showNav?: boolean;
  right?: React.ReactNode;
  className?: string;
};

function LangSwitcher() {
  const lang = i18n.language;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => i18n.changeLanguage('en')}
        className={clsx(
          'rounded-full px-2 py-1 text-xs transition',
          lang === 'en' ? 'bg-infinder-lime text-infinder-black font-semibold' : 'border border-gray-300 text-gray-600 hover:border-gray-400'
        )}
      >
        EN 🇬🇧
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('ar')}
        className={clsx(
          'rounded-full px-2 py-1 text-xs transition',
          lang === 'ar' ? 'bg-infinder-lime text-infinder-black font-semibold' : 'border border-gray-300 text-gray-600 hover:border-gray-400'
        )}
      >
        عر 🇪🇬
      </button>
    </div>
  );
}

const navLinks = [
  { to: '/dashboard', labelKey: 'nav_dashboard' },
  { to: '/invest',    labelKey: 'nav_invest' },
  { to: '/learn',     labelKey: 'nav_learn' },
  { to: '/reports',   labelKey: 'nav_reports' },
  { to: '/profile',   labelKey: 'nav_profile' },
];

export function Navbar({ showNav, right, className }: Props) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'pb-0.5 border-b-2 transition-colors duration-150',
      isActive
        ? 'text-infinder-black font-semibold border-infinder-lime'
        : 'text-gray-600 border-transparent hover:text-infinder-black'
    );

  return (
    <header className={clsx('border-b border-gray-100 bg-white/95 backdrop-blur', className)}>
      {/* Main bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-4 text-sm">
          {showNav && user && (
            <>
              {navLinks.map(({ to, labelKey }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  {t(labelKey)}
                </NavLink>
              ))}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="pb-0.5 border-b-2 border-transparent text-amber-700 font-medium transition-colors duration-150 hover:text-amber-900"
                >
                  {t('nav_admin')}
                </Link>
              )}
            </>
          )}
          {right}
          <LangSwitcher />
          {user && (
            <button
              type="button"
              className="text-gray-500 hover:text-infinder-black transition-colors duration-150"
              onClick={() => { logout(); nav('/'); }}
            >
              {t('nav_sign_out')}
            </button>
          )}
        </div>

        {/* Mobile: right slot + lang + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          {right}
          <LangSwitcher />
          {showNav && user && (
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="p-1.5 text-gray-600 hover:text-infinder-black transition-colors duration-150"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
          {user && !showNav && (
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-infinder-black transition-colors duration-150"
              onClick={() => { logout(); nav('/'); }}
            >
              {t('nav_sign_out')}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && showNav && user && (
        <nav className="lg:hidden bg-white border-b border-gray-100 shadow-sm flex flex-col px-4 py-2 gap-0 text-sm">
          {navLinks.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'py-3 border-b border-gray-50 transition-colors duration-150',
                  isActive ? 'text-infinder-black font-semibold' : 'text-gray-600 hover:text-infinder-black'
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              {t(labelKey)}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="py-3 border-b border-gray-50 text-amber-700 font-medium transition-colors duration-150"
              onClick={() => setMobileOpen(false)}
            >
              {t('nav_admin')}
            </Link>
          )}
          <button
            type="button"
            className="py-3 text-left text-gray-500 hover:text-infinder-black transition-colors duration-150"
            onClick={() => { setMobileOpen(false); logout(); nav('/'); }}
          >
            {t('nav_sign_out')}
          </button>
        </nav>
      )}
    </header>
  );
}
