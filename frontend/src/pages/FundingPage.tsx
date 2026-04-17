import { useState } from 'react';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

const presets = [100, 500, 1000, 5000];

export default function FundingPage() {
  const { user, refreshMe } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'instapay' | 'bank' | 'card'>('instapay');
  const [msg, setMsg] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');

  async function confirmFund() {
    setMsg('');
    const n = Number(amount);
    if (!n || n <= 0) {
      setMsg('Enter a valid amount');
      return;
    }
    try {
      await api.post('/api/payments/fund', { amount: n, method });
      await refreshMe();
      setMsg('Balance updated (demo deposit).');
      setAmount('');
    } catch {
      setMsg('Could not add funds.');
    }
  }

  async function confirmWithdraw() {
    setMsg('');
    const n = Number(withdrawAmt);
    if (!n || n <= 0) return;
    try {
      await api.post('/api/payments/withdraw', { amount: n });
      await refreshMe();
      setWithdrawOpen(false);
      setWithdrawAmt('');
      setMsg('Withdrawal recorded.');
    } catch (e: unknown) {
      setMsg('Withdrawal failed.');
    }
  }

  function copy(t: string) {
    navigator.clipboard.writeText(t);
    setMsg('Copied to clipboard.');
  }

  if (!user) return null;

  return (
    <SubpageShell>
      <h1 className="text-3xl font-bold">Fund your account</h1>
      <p className="text-gray-600 text-sm mt-1">Add money to start investing.</p>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-infinder-black text-white p-6">
          <p className="text-white/70 text-sm">Current balance</p>
          <p className="text-4xl font-bold mt-2">EGP {user.wallet_balance.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <label className="text-sm font-medium">Amount to add</label>
          <div className="mt-2 flex rounded-xl border border-gray-200 overflow-hidden">
            <span className="px-3 flex items-center bg-gray-50 text-gray-600 text-sm">EGP</span>
            <input
              className="flex-1 px-3 py-2 outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-infinder-black"
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={confirmFund}
            className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3"
          >
            Confirm
          </button>
        </div>
      </div>

      <h2 className="mt-10 font-semibold">Select funding method</h2>
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        {(
          [
            { id: 'instapay' as const, title: 'Instapay', sub: 'Instant transfer (recommended)', icon: '📱' },
            { id: 'bank' as const, title: 'Bank transfer', sub: '1–2 business days', icon: '🏦' },
            { id: 'card' as const, title: 'Debit card', sub: 'Instant, 2% fee', icon: '💳' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              method === m.id ? 'border-infinder-green ring-2 ring-infinder-green/30' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xl">{m.icon}</span>
              {method === m.id && <span className="text-xs text-infinder-green font-semibold">Selected ✓</span>}
            </div>
            <p className="font-semibold mt-2">{m.title}</p>
            <p className="text-xs text-gray-600 mt-1">{m.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        {method === 'instapay' && (
          <>
            <h3 className="font-semibold flex items-center gap-2">📱 Instapay transfer instructions</h3>
            <p className="text-sm text-gray-600 mt-1">Funds are credited within the same day (demo).</p>
            <ol className="mt-6 space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium">Open your banking app</p>
                  <p className="text-gray-600">Navigate to Instapay or instant transfer.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <div className="flex-1">
                  <p className="font-medium">Enter our Instapay ID</p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
                    <code className="flex-1 text-sm">$InvestEd</code>
                    <button type="button" className="text-xs underline" onClick={() => copy('$InvestEd')}>
                      Copy
                    </button>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <div className="flex-1">
                  <p className="font-medium">Add your unique code in the notes</p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
                    <span className="text-xs text-gray-600">Your code:</span>
                    <code className="flex-1 text-sm font-bold text-infinder-green">{user.deposit_ref_code || '—'}</code>
                    <button type="button" className="text-xs underline" onClick={() => copy(user.deposit_ref_code || '')}>
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">⚠ Include this code so we can credit your account.</p>
                </div>
              </li>
            </ol>
          </>
        )}
        {method === 'bank' && (
          <>
            <h3 className="font-semibold flex items-center gap-2">🏦 Bank transfer instructions</h3>
            <p className="text-sm text-gray-600 mt-1">Funds arrive in 1–2 business days (demo).</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
                <code className="flex-1">1234567890123456</code>
                <button type="button" className="text-xs underline" onClick={() => copy('1234567890123456')}>
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
                <span className="text-xs text-gray-600">Reference:</span>
                <code className="flex-1 font-bold text-infinder-green">{user.deposit_ref_code}</code>
                <button type="button" className="text-xs underline" onClick={() => copy(user.deposit_ref_code || '')}>
                  Copy
                </button>
              </div>
              <p className="text-xs text-amber-700">⚠ Include your reference code in the transfer notes.</p>
            </div>
          </>
        )}
        {method === 'card' && (
          <p className="text-sm text-gray-600">Card funding would integrate with a payment provider — use Instapay or bank for this demo.</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold">Need to withdraw funds?</p>
          <p className="text-sm text-gray-600">Transfer money back to your bank account.</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="rounded-full border border-infinder-black px-5 py-2 text-sm font-medium self-start"
        >
          Withdraw
        </button>
      </div>

      {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold">Withdraw funds</h3>
            <p className="text-sm text-gray-600 mt-1">Enter the amount to withdraw to your bank account.</p>
            <label className="block mt-4 text-sm font-medium">Withdrawal amount</label>
            <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
              <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
              <input
                className="flex-1 px-3 py-2 outline-none"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Available: EGP {user.wallet_balance.toFixed(2)}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setWithdrawOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!Number(withdrawAmt)}
                className="rounded-full bg-infinder-lime px-4 py-2 text-sm font-semibold disabled:opacity-40"
                onClick={confirmWithdraw}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </SubpageShell>
  );
}
