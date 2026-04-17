import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

type Inv = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  min_investment: number;
  expected_return_low: number | null;
  expected_return_high: number | null;
  risk_level: string;
  is_halal: boolean;
  learn_more: string[] | null;
};

const riskLabel: Record<string, string> = {
  low: 'Low risk',
  low_medium: 'Low–medium risk',
  medium: 'Medium risk',
  high: 'High risk',
};

export default function InvestmentOptions() {
  const { user } = useAuth();
  const [items, setItems] = useState<Inv[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = user?.sharia_mode ? '?sharia=1' : '';
    api.get(`/api/investments${q}`).then((r) => setItems(r.data.investments));
  }, [user?.sharia_mode]);

  if (!user) return null;

  return (
    <SubpageShell>
      <div className="rounded-2xl bg-infinder-lime text-infinder-black p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm font-medium">Our Smart Assistant can recommend a mix based on your goals and comfort with risk.</p>
        <Link to="/assistant" className="rounded-full bg-infinder-black text-white text-sm font-semibold px-4 py-2 text-center shrink-0">
          Use Smart Assistant
        </Link>
      </div>

      {user.sharia_mode && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 text-sm px-4 py-3 flex gap-2">
          <span>ℹ️</span>
          <span>
            <strong>Sharia-compliant mode active:</strong> only showing investments that align with Islamic principles in this demo catalog.
          </span>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {items.map((inv) => {
          const can = user.wallet_balance >= inv.min_investment;
          const isOpen = open[inv.id];
          const bullets = Array.isArray(inv.learn_more) ? inv.learn_more : [];
          return (
            <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-lg">{inv.title}</h3>
                <span className="text-xl">📊</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">{riskLabel[inv.risk_level] || inv.risk_level}</span>
                {inv.is_halal && (
                  <span className="text-xs rounded-full border border-gray-300 px-2 py-0.5">✓ Halal</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3">{inv.description}</p>
              <div className="mt-4 rounded-xl bg-gray-100 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Min. investment</span>
                  <span className="font-medium">EGP {inv.min_investment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected returns</span>
                  <span className="font-medium text-infinder-green">
                    {inv.expected_return_low ?? '—'}–{inv.expected_return_high ?? '—'}% annually
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 text-sm text-gray-600 flex items-center gap-1"
                onClick={() => setOpen((o) => ({ ...o, [inv.id]: !isOpen }))}
              >
                Learn more {isOpen ? '▲' : '▼'}
              </button>
              {isOpen && bullets.length > 0 && (
                <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                disabled={!can}
                className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold ${
                  can ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {can ? 'Invest' : 'Insufficient balance'}
              </button>
            </div>
          );
        })}
      </div>

      <section className="mt-12 rounded-2xl bg-infinder-black text-white p-6">
        <h2 className="text-lg font-bold">Understanding risk &amp; return</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm text-gray-300">
          <p>
            <span className="text-infinder-lime font-semibold">Low risk</span> — stable returns with minimal chance of losing money. Good for short horizons.
          </p>
          <p>
            <span className="text-infinder-lime font-semibold">Medium risk</span> — balanced approach with moderate ups and downs.
          </p>
          <p>
            <span className="text-infinder-lime font-semibold">High risk</span> — higher potential returns with greater volatility. Long-term focus.
          </p>
        </div>
      </section>
    </SubpageShell>
  );
}
