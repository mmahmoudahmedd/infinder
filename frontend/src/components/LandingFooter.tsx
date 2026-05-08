import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Invest',    to: '/invest' },
      { label: 'Learn',     to: '/learn' },
      { label: 'Reports',   to: '/reports' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/legal/terms' },
      { label: 'Privacy Policy',   to: '/legal/privacy' },
      { label: 'Risk Disclosure',  to: '/legal/risk' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'Contact',     to: '/support' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="bg-infinder-black border-t border-infinder-lime/20 px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 md:gap-8 justify-between">

        {/* Left — logo + tagline */}
        <div className="shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
              i
            </span>
            <span className="font-bold tracking-tight text-white">INFINDER</span>
          </Link>
          <p className="mt-3 text-sm text-white/45 max-w-[200px] leading-relaxed">
            Beginner-friendly investing in EGP
          </p>
          <p className="mt-4 text-xs text-white/25">
            © 2026 Infinder. Built for Egypt.
          </p>
        </div>

        {/* Right — link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-white/40 hover:text-infinder-lime transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>
    </footer>
  );
}
