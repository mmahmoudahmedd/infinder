import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const link = 'flex flex-col items-center text-[9px] sm:text-[10px] gap-0.5 px-1 sm:px-2 py-1 rounded-lg min-w-0 flex-1';

export function BottomNav() {
  const { t } = useTranslation();
  const navItems = [
    { to: '/dashboard', icon: '🏠', label: t('nav_dashboard') },
    { to: '/invest', icon: '📈', label: t('nav_invest') },
    { to: '/learn', icon: '📘', label: t('nav_learn') },
    { to: '/reports', icon: '📊', label: t('nav_reports') },
    { to: '/profile', icon: '👤', label: t('nav_profile') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-around py-2 safe-area-pb">
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
        >
          <span className="text-base leading-none">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
