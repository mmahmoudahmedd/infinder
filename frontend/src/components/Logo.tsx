import { Link } from 'react-router-dom';
import clsx from 'clsx';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={clsx('flex items-center gap-2', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-black text-infinder-lime font-bold text-sm border border-gray-800">
        i
      </span>
      <span className="font-bold tracking-tight text-infinder-black dark:text-white">INFINDER</span>
    </Link>
  );
}
