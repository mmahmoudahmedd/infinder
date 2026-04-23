import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

type Props = {
  showNav?: boolean;
  right?: React.ReactNode;
  className?: string;
};

export function Navbar({ showNav, right, className }: Props) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/90 backdrop-blur', className)}>
      <Logo />
      <div className="flex items-center gap-4 text-sm">
        {showNav && user && (
          <>
            {[
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/invest', label: 'Invest' },
              { to: '/learn', label: 'Learn' },
              { to: '/reports', label: 'Reports' },
              { to: '/profile', label: 'Profile' },
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
                Admin
              </Link>
            )}
          </>
        )}
        {right}
        {user && (
          <button
            type="button"
            className="text-gray-500 hover:text-infinder-black"
            onClick={() => {
              logout();
              nav('/');
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
