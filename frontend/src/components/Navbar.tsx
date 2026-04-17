import { Link, useNavigate } from 'react-router-dom';
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
            <Link to="/dashboard" className="text-gray-700 hover:text-infinder-black">
              Dashboard
            </Link>
            <Link to="/invest" className="text-gray-700 hover:text-infinder-black">
              Invest
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-infinder-black">
              Profile
            </Link>
            <Link to="/learn" className="text-gray-700 hover:text-infinder-black">
              Learn
            </Link>
            <Link to="/reports" className="text-gray-700 hover:text-infinder-black">
              Reports
            </Link>
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
