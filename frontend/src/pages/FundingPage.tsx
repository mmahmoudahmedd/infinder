import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showToast, showAlert } from '../lib/swal';

const presets = [100, 500, 1000, 5000];

export default function FundingPage() {
  const { user, refreshMe } = useAuth();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'instapay' | 'bank' | 'card'>('instapay');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  async function confirmFund() {
    const n = Number(amount);
    if (!n || n <= 0) {
      showAlert('Invalid amount', t('fund_invalid'), 'warning');
      return;
    }
    try {
      await api.post('/api/payments/fund', { amount: n, method });
      await refreshMe();
      showToast(t('fund_success'));
      setAmount('');
      setSelectedPreset(null);
    } catch {
      showAlert('Payment failed', t('fund_error'));
    }
  }

  async function confirmWithdraw() {
    const n = Number(withdrawAmt);
    if (!n || n <= 0) return;
    try {
      await api.post('/api/payments/withdraw', { amount: n });
      await refreshMe();
      setWithdrawOpen(false);
      setWithdrawAmt('');
      showToast(t('fund_withdraw_success'));
    } catch (e: unknown) {
      showAlert('Withdrawal failed', t('fund_withdraw_error'));
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    showToast('Copied!');
  }

  if (!user) return null;

  return (
    <SubpageShell>
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-infinder-black">{t('fund_title')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('fund_sub')}</p>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-infinder-black text-white p-5 relative overflow-hidden border border-gray-200 shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-infinder-lime/8 blur-2xl pointer-events-none" />
          <p className="text-white/50 text-xs tracking-widest uppercase">{t('fund_current_balance')}</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">EGP {user.wallet_balance.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <label className="text-sm font-medium">{t('fund_amount_label')}</label>
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
                onClick={() => {
                  setSelectedPreset(p);
                  setAmount(String(p));
                }}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedPreset === p
                    ? 'bg-infinder-lime text-infinder-black font-semibold border-infinder-lime'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-infinder-black'
                }`}
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
            {t('common_confirm')}
          </button>
        </div>
      </div>

      <h2 className="mt-10 font-semibold">{t('fund_select_method')}</h2>
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        {(
          [
            { id: 'instapay' as const, title: t('fund_method_instapay'), sub: t('fund_method_instapay_sub'), icon: '📱' },
            { id: 'bank' as const, title: t('fund_method_bank'), sub: t('fund_method_bank_sub'), icon: '🏦' },
            { id: 'card' as const, title: t('fund_method_card'), sub: t('fund_method_card_sub'), icon: '💳' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              method === m.id
                ? 'border-2 border-infinder-lime bg-infinder-lime/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">{m.icon}</div>
              {method === m.id && (
                <span className="rounded-full bg-infinder-lime text-infinder-black text-xs font-bold px-2 py-0.5">✓</span>
              )}
            </div>
            <p className="font-semibold mt-3">{m.title}</p>
            <p className="text-xs text-gray-500 mt-1">{m.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        {method === 'instapay' && (
          <>
            <h3 className="font-semibold flex items-center gap-2">📱 {t('fund_instapay_title')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('fund_instapay_note')}</p>
            <ol className="mt-6 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium">{t('fund_instapay_step1_title')}</p>
                  <p className="text-gray-600">{t('fund_instapay_step1_desc')}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <div className="flex-1">
                  <p className="font-medium">{t('fund_instapay_step2_title')}</p>
                  <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <code className="flex-1 font-mono text-sm select-all">$InvestEd</code>
                    <button type="button" className="text-xs underline" onClick={() => copy('$InvestEd')}>
                      {t('common_copy')}
                    </button>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <div className="flex-1">
                  <p className="font-medium">{t('fund_instapay_step3_title')}</p>
                  <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600">{t('fund_instapay_code_label')}</span>
                    <code className="flex-1 font-mono text-sm font-bold text-infinder-green select-all">{user.deposit_ref_code || '—'}</code>
                    <button type="button" className="text-xs underline" onClick={() => copy(user.deposit_ref_code || '')}>
                      {t('common_copy')}
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">⚠ {t('fund_instapay_warning')}</p>
                </div>
              </li>
            </ol>
          </>
        )}
        {method === 'bank' && (
          <>
            <h3 className="font-semibold flex items-center gap-2">🏦 {t('fund_bank_title')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('fund_bank_note')}</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <code className="flex-1 font-mono text-sm select-all">1234567890123456</code>
                <button type="button" className="text-xs underline" onClick={() => copy('1234567890123456')}>
                  {t('common_copy')}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600">{t('fund_bank_ref')}</span>
                <code className="flex-1 font-mono text-sm font-bold text-infinder-green select-all">{user.deposit_ref_code}</code>
                <button type="button" className="text-xs underline" onClick={() => copy(user.deposit_ref_code || '')}>
                  {t('common_copy')}
                </button>
              </div>
              <p className="text-xs text-amber-700">⚠ {t('fund_bank_warning')}</p>
            </div>
          </>
        )}
        {method === 'card' && (
          <p className="text-sm text-gray-600">{t('fund_card_note')}</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold">{t('fund_withdraw_title')}</p>
          <p className="text-sm text-gray-600">{t('fund_withdraw_sub')}</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="rounded-full border border-infinder-black px-5 py-2 text-sm font-medium self-start"
        >
          {t('fund_withdraw_btn')}
        </button>
      </div>

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold">{t('fund_withdraw_modal_title')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('fund_withdraw_modal_sub')}</p>
            <label className="block mt-4 text-sm font-medium">{t('fund_withdraw_amount_label')}</label>
            <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
              <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
              <input
                className="flex-1 px-3 py-2 outline-none"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('fund_withdraw_available')} EGP {user.wallet_balance.toFixed(2)}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setWithdrawOpen(false)}>
                {t('fund_withdraw_cancel')}
              </button>
              <button
                type="button"
                disabled={!Number(withdrawAmt)}
                className="rounded-full bg-infinder-lime px-4 py-2 text-sm font-semibold disabled:opacity-40"
                onClick={confirmWithdraw}
              >
                {t('fund_withdraw_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </SubpageShell>
  );
}
