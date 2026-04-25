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

export function Navbar({ showNav, right, className }: Props) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();

  return (
    <header className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/90 backdrop-blur', className)}>
      <Logo />
      <div className="flex items-center gap-4 text-sm">
        {showNav && user && (
          <>
            {[
              { to: '/dashboard', label: t('nav_dashboard') },
              { to: '/invest', label: t('nav_invest') },
              { to: '/learn', label: t('nav_learn') },
              { to: '/reports', label: t('nav_reports') },
              { to: '/profile', label: t('nav_profile') },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'pb-0.5 border-b-2 transition',
                    isActive
                      ? 'text-infinder-black font-semibold border-infinder-lime'
                      : 'text-gray-600 border-transparent hover:text-infinder-black'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            {user.role === 'admin' && (
              <Link to="/admin" className="text-amber-700 font-medium">
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
            className="text-gray-500 hover:text-infinder-black"
            onClick={() => { logout(); nav('/'); }}
          >
            {t('nav_sign_out')}
          </button>
        )}
      </div>
    </header>
  );
}
