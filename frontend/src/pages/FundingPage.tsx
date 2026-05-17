import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showLoading, closeLoading, showSuccess, showError, showToast, showCopyToast } from '../lib/swal';
import DepositModal from '../components/DepositModal';


type DepositRecord = {
  id: string;
  reference_code: string;
  status: string;
  created_at: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  method?: string;
  user_confirmed_sent?: boolean;
};

const CARD_FEE_RATE = 0.02;
const MAX_CARD_DEPOSIT = 20_000;
const MIN_DEPOSIT = 100;
const MAX_DEPOSIT = 50_000;
const WITHDRAW_FEE_RATE = 0.0025;
const WITHDRAW_MIN_FEE = 1;

const presets = [100, 500, 1000, 5000];

function calcCardFee(amount: number) {
  return parseFloat((amount * CARD_FEE_RATE).toFixed(2));
}

function calcWithdrawFee(amount: number) {
  return Math.max(parseFloat((amount * WITHDRAW_FEE_RATE).toFixed(2)), WITHDRAW_MIN_FEE);
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    credited: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    failed: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function FundingPage() {
  const { user, refreshMe } = useAuth();
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');

  const fetchDeposits = useCallback(() => {
    api
      .get('/api/deposits')
      .then((r) => setDeposits(r.data.deposits || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  if (!user) return null;

  const parsedAmount = Number(amount);
  const cardFee = parsedAmount > 0 ? calcCardFee(parsedAmount) : 0;
  const cardNet = parsedAmount - cardFee;

  function resetFlow() {
    setAmount('');
    setSelectedPreset(null);
    setAmountError('');
  }

  function handleContinue() {
    const n = Number(amount);
    if (!n || n < MIN_DEPOSIT) {
      setAmountError(`Minimum deposit is EGP ${MIN_DEPOSIT}`);
      return;
    }
    if (n > MAX_CARD_DEPOSIT) {
      setAmountError(`Card deposits are limited to EGP ${MAX_CARD_DEPOSIT.toLocaleString()}`);
      return;
    }
    if (n > MAX_DEPOSIT) {
      setAmountError(`Maximum is EGP ${MAX_DEPOSIT.toLocaleString()}`);
      return;
    }
    setAmountError('');
    setDepositModalOpen(true);
  }

  async function handleCardDepositSuccess(amt: number) {
    showLoading('Processing card deposit...');
    try {
      const res = await api.post('/api/deposits', { method: 'card', amount: amt });
      await refreshMe();
      fetchDeposits();
      setDepositModalOpen(false);
      resetFlow();
      closeLoading();
      await showSuccess(
        'Deposit Successful!',
        `EGP ${Number(res.data.net_amount).toFixed(2)} added to your wallet. Card fee: EGP ${Number(res.data.fee_amount).toFixed(2)}.`,
      );
    } catch (e: unknown) {
      closeLoading();
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      showError('Deposit Failed', ax.response?.data?.error || 'Card deposit could not be processed. Please try again.');
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
    } catch {
      showError('Withdrawal failed', t('fund_withdraw_error'));
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    showCopyToast();
  }

  return (
    <SubpageShell>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">{t('fund_title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('fund_sub')}</p>
      </div>

      {/* Balance */}
      <div className="rounded-2xl bg-infinder-black text-white p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-infinder-lime/10 blur-2xl pointer-events-none" />
        <p className="text-white/50 text-xs tracking-widest uppercase">{t('fund_current_balance')}</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">EGP {user.wallet_balance.toFixed(2)}</p>
      </div>

      {/* ── Amount ── */}
      <div className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6">
        <label className="text-sm font-medium text-gray-900 dark:text-white">Deposit amount</label>
        <div
          className={`mt-2 flex rounded-xl border overflow-hidden ${
            amountError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <span className="px-3 flex items-center bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-700">
            EGP
          </span>
          <input
            className="flex-1 px-3 py-2.5 outline-none bg-white dark:bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError('');
            }}
            placeholder="0"
            inputMode="decimal"
            autoFocus
          />
        </div>
        {amountError ? (
          <p className="text-xs text-red-500 mt-1">{amountError}</p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Min EGP {MIN_DEPOSIT} · Max EGP {MAX_CARD_DEPOSIT.toLocaleString()} · 2% card fee
          </p>
        )}
        {parsedAmount > 0 && !amountError && (
          <div className="mt-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800 px-3 py-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Card fee (2%)</span>
              <span>− EGP {cardFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1.5">
              <span>You receive</span>
              <span>EGP {cardNet.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPreset(p);
                setAmount(String(p));
                setAmountError('');
              }}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                selectedPreset === p
                  ? 'bg-infinder-lime text-infinder-black font-semibold border-infinder-lime'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleContinue}
          className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 text-sm"
        >
          Pay with Card →
        </button>
      </div>

      {/* ── Deposit history ── */}
      {deposits.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Deposits</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] divide-y divide-gray-100 dark:divide-[#2a2a2a]">
            {deposits.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-sm shrink-0">
                    💳
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {dep.method} deposit
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                      {dep.reference_code}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    EGP {Number(dep.amount).toFixed(2)}
                  </p>
                  <div className="mt-0.5">
                    <StatusBadge status={dep.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Withdraw — always at bottom ── */}
      <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{t('fund_withdraw_title')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('fund_withdraw_sub')}</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="rounded-full border border-infinder-black dark:border-gray-500 dark:text-gray-300 px-5 py-2 text-sm font-medium self-start hover:border-gray-700 dark:hover:border-gray-300 transition-colors"
        >
          {t('fund_withdraw_btn')}
        </button>
      </div>

      {/* Withdraw modal */}
      {withdrawOpen &&
        (() => {
          const wAmt = Number(withdrawAmt);
          const wFee = wAmt > 0 ? calcWithdrawFee(wAmt) : 0;
          const wNet = wAmt > 0 ? wAmt - wFee : 0;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-transparent dark:border-gray-800 max-w-md w-full p-6 shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('fund_withdraw_modal_title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('fund_withdraw_modal_sub')}</p>
                <label className="block mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  {t('fund_withdraw_amount_label')}
                </label>
                <div className="mt-1 flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <span className="px-3 flex items-center bg-gray-50 dark:bg-white/5 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                    EGP
                  </span>
                  <input
                    className="flex-1 px-3 py-2 outline-none bg-white dark:bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(e.target.value)}
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('fund_withdraw_available')} EGP {user.wallet_balance.toFixed(2)}
                </p>
                {wAmt > 0 && (
                  <div className="mt-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800 px-3 py-2.5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Withdrawal</span>
                      <span>EGP {wAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Platform fee (0.25%)</span>
                      <span className="text-red-500">− EGP {wFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1.5">
                      <span>You receive</span>
                      <span>EGP {wNet.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                    onClick={() => {
                      setWithdrawOpen(false);
                      setWithdrawAmt('');
                    }}
                  >
                    {t('fund_withdraw_cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!wAmt || wAmt > user.wallet_balance}
                    className="rounded-full bg-infinder-lime px-4 py-2 text-sm font-semibold text-infinder-black disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={confirmWithdraw}
                  >
                    {t('fund_withdraw_confirm')}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Card deposit modal */}
      {depositModalOpen && (
        <DepositModal
          onClose={() => setDepositModalOpen(false)}
          onSuccess={handleCardDepositSuccess}
          initialAmount={parsedAmount}
        />
      )}
    </SubpageShell>
  );
}
