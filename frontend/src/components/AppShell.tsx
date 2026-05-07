import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] pb-20 md:pb-6">
      <Navbar showNav />
      {children}
      <BottomNav />
    </div>
  );
}

export function SubpageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] pb-24 md:pb-8">
      <Navbar showNav />
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
      <BottomNav />
    </div>
  );
}
