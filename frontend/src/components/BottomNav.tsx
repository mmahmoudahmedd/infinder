import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const link = 'flex flex-col items-center text-[9px] sm:text-[10px] gap-0.5 px-1 sm:px-2 py-1 rounded-lg min-w-0 flex-1';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-around py-2 safe-area-pb">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
      >
        Home
      </NavLink>
      <NavLink
        to="/invest"
        className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
      >
        Invest
      </NavLink>
      <NavLink
        to="/learn"
        className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
      >
        Learn
      </NavLink>
      <NavLink
        to="/reports"
        className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
      >
        Reports
      </NavLink>
      <NavLink
        to="/profile"
        className={({ isActive }) => clsx(link, isActive ? 'text-infinder-black font-semibold' : 'text-gray-500')}
      >
        Profile
      </NavLink>
    </nav>
  );
}
