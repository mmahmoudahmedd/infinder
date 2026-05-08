import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showLoading, closeLoading, showSuccess, showError, showToast, showCopyToast } from '../lib/swal';
import DepositModal from '../components/DepositModal';

type FlowStep = 1 | 2 | 3 | 'sent';
type Method = 'instapay' | 'bank' | 'card';

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

  const [step, setStep] = useState<FlowStep>(1);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [currentDeposit, setCurrentDeposit] = useState<DepositRecord | null>(null);
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
  const cardDisabled = parsedAmount > MAX_CARD_DEPOSIT;

  function resetFlow() {
    setStep(1);
    setCurrentDeposit(null);
    setAmount('');
    setSelectedPreset(null);
    setSelectedMethod(null);
    setAmountError('');
  }

  function handleStep1Continue() {
    const n = Number(amount);
    if (!n || n < MIN_DEPOSIT) {
      setAmountError(`Minimum deposit is EGP ${MIN_DEPOSIT}`);
      return;
    }
    if (n > MAX_DEPOSIT) {
      setAmountError(`Maximum is EGP ${MAX_DEPOSIT.toLocaleString()}`);
      return;
    }
    setAmountError('');
    if (selectedMethod === 'card' && n > MAX_CARD_DEPOSIT) setSelectedMethod(null);
    setStep(2);
  }

  async function handleStep2Continue() {
    if (!selectedMethod) return;
    if (selectedMethod === 'card') {
      setDepositModalOpen(true);
      return;
    }
    setCreatingDeposit(true);
    try {
      const res = await api.post('/api/deposits', {
        method: selectedMethod,
        amount: parsedAmount,
      });
      setCurrentDeposit(res.data);
      setStep(3);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      showError('Failed to create deposit', ax.response?.data?.error || ax.message || 'Please try again.');
    } finally {
      setCreatingDeposit(false);
    }
  }

  async function handleConfirmSent() {
    if (!currentDeposit) return;
    setConfirming(true);
    try {
      await api.patch(`/api/deposits/${currentDeposit.id}/confirm-sent`);
      setStep('sent');
      fetchDeposits();
    } catch {
      showError('Error', 'Could not confirm. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleCardDepositSuccess(amt: number) {
    showLoading('Processing card deposit...');
    try {
      const res = await api.post('/api/deposits', { method: 'card', amount: amt });
      await refreshMe();
      fetchDeposits();
      setDepositModalOpen(false);
      closeLoading();
      resetFlow();
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

      {/* Step indicator */}
      {(step === 1 || step === 2 || step === 3) && (
        <div className="mt-6 flex items-center gap-2">
          {([1, 2, 3] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-infinder-lime text-infinder-black'
                    : typeof step === 'number' && step > s
                    ? 'bg-infinder-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                {typeof step === 'number' && step > s ? '✓' : s}
              </div>
              {i < 2 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />}
            </div>
          ))}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {step === 1 ? 'Enter amount' : step === 2 ? 'Select method' : 'Complete transfer'}
          </span>
        </div>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 1 && (
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
              Min EGP {MIN_DEPOSIT} · Max EGP {MAX_DEPOSIT.toLocaleString()}
            </p>
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
            onClick={handleStep1Continue}
            className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 text-sm"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Method selection ── */}
      {step === 2 && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Depositing{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              EGP {parsedAmount.toLocaleString()}
            </span>{' '}
            — choose a payment method
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Instapay */}
            <button
              type="button"
              onClick={() => setSelectedMethod('instapay')}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                selectedMethod === 'instapay'
                  ? 'border-infinder-lime bg-infinder-lime/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl">📱</div>
                {selectedMethod === 'instapay' && (
                  <span className="rounded-full bg-infinder-lime text-infinder-black text-xs font-bold px-2 py-0.5">✓</span>
                )}
              </div>
              <p className="font-semibold mt-3 text-gray-900 dark:text-white">{t('fund_method_instapay')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No fee · Instant notification</p>
              <p className="text-xs text-infinder-green mt-1 font-medium">
                You deposit EGP {parsedAmount.toFixed(2)}
              </p>
            </button>

            {/* Bank Transfer */}
            <button
              type="button"
              onClick={() => setSelectedMethod('bank')}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                selectedMethod === 'bank'
                  ? 'border-infinder-lime bg-infinder-lime/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl">🏦</div>
                {selectedMethod === 'bank' && (
                  <span className="rounded-full bg-infinder-lime text-infinder-black text-xs font-bold px-2 py-0.5">✓</span>
                )}
              </div>
              <p className="font-semibold mt-3 text-gray-900 dark:text-white">{t('fund_method_bank')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No fee · 1–2 business days</p>
              <p className="text-xs text-infinder-green mt-1 font-medium">
                You deposit EGP {parsedAmount.toFixed(2)}
              </p>
            </button>

            {/* Card */}
            {cardDisabled ? (
              <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] p-4 opacity-60 cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xl">💳</div>
                <p className="font-semibold mt-3 text-gray-400 dark:text-gray-500">{t('fund_method_card')}</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Limited to EGP {MAX_CARD_DEPOSIT.toLocaleString()} per transaction
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  selectedMethod === 'card'
                    ? 'border-infinder-lime bg-infinder-lime/5'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl">💳</div>
                  {selectedMethod === 'card' && (
                    <span className="rounded-full bg-infinder-lime text-infinder-black text-xs font-bold px-2 py-0.5">✓</span>
                  )}
                </div>
                <p className="font-semibold mt-3 text-gray-900 dark:text-white">{t('fund_method_card')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2% fee · Instant</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Fee EGP {cardFee.toFixed(2)} · You receive EGP {cardNet.toFixed(2)}
                </p>
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!selectedMethod || creatingDeposit}
              onClick={handleStep2Continue}
              className="flex-1 rounded-full bg-infinder-lime text-infinder-black font-semibold py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creatingDeposit ? 'Creating…' : selectedMethod === 'card' ? 'Pay with Card →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Reference code + instructions ── */}
      {step === 3 && currentDeposit && (
        <div className="mt-5 space-y-4">
          {/* Prominent reference code */}
          <div className="rounded-2xl bg-infinder-black text-white p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-infinder-lime/10 blur-2xl pointer-events-none" />
            <p className="text-white/50 text-xs tracking-widest uppercase mb-3">Your reference code</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-2xl md:text-3xl font-bold text-infinder-lime tracking-widest select-all break-all">
                {currentDeposit.reference_code}
              </code>
              <button
                type="button"
                onClick={() => copyText(currentDeposit.reference_code)}
                className="shrink-0 rounded-xl bg-infinder-lime/10 border border-infinder-lime/30 hover:bg-infinder-lime/20 px-3 py-2 text-xs font-medium text-infinder-lime transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-white/40 text-xs mt-3">
              ⚠ Include this code in the transfer description/note
            </p>
          </div>

          {/* Method-specific instructions */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6">
            {selectedMethod === 'instapay' ? (
              <>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  📱 {t('fund_instapay_title')}
                </h3>
                <ol className="mt-4 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0 text-infinder-black">1</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Open your mobile banking app</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Navigate to InstaPay or wallet transfer</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0 text-infinder-black">2</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">Send to our InstaPay address</p>
                      <div className="mt-2 flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                        <code className="flex-1 font-mono text-sm select-all text-gray-900 dark:text-white">$InvestEd</code>
                        <button
                          type="button"
                          className="text-xs underline text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => copyText('$InvestEd')}
                        >
                          {t('common_copy')}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-infinder-lime flex items-center justify-center text-xs font-bold shrink-0 text-infinder-black">3</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Enter the exact amount and reference</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Amount:{' '}
                        <strong className="text-gray-900 dark:text-white">EGP {parsedAmount.toFixed(2)}</strong>
                        {' '}· Note:{' '}
                        <span className="font-mono font-bold text-infinder-green">{currentDeposit.reference_code}</span>
                      </p>
                    </div>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  🏦 {t('fund_bank_title')}
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bank account number</p>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                      <code className="flex-1 font-mono text-sm select-all text-gray-900 dark:text-white">
                        1234567890123456
                      </code>
                      <button
                        type="button"
                        className="text-xs underline text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        onClick={() => copyText('1234567890123456')}
                      >
                        {t('common_copy')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transfer amount</p>
                    <p className="font-semibold text-gray-900 dark:text-white">EGP {parsedAmount.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    ⚠ Include{' '}
                    <span className="font-mono font-bold">{currentDeposit.reference_code}</span>
                    {' '}in the transfer description
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirmSent}
            className="w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 text-sm disabled:opacity-60"
          >
            {confirming ? 'Confirming…' : "I've completed the transfer ✓"}
          </button>
          <button
            type="button"
            onClick={resetFlow}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors py-1"
          >
            Cancel — start over
          </button>
        </div>
      )}

      {/* ── Confirmation screen ── */}
      {step === 'sent' && (
        <div className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-infinder-lime/20 flex items-center justify-center text-2xl mx-auto">
            ✅
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Transfer Notified</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            We've received your transfer notification. Your deposit will be credited once we verify the payment — usually within a few hours.
          </p>
          {currentDeposit && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-mono">
              {currentDeposit.reference_code}
            </p>
          )}
          <button
            type="button"
            onClick={resetFlow}
            className="mt-6 rounded-full bg-infinder-lime text-infinder-black font-semibold px-6 py-2.5 text-sm"
          >
            Back to Funding
          </button>
        </div>
      )}

      {/* ── Deposit history ── */}
      {deposits.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Deposits</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] divide-y divide-gray-100 dark:divide-[#2a2a2a]">
            {deposits.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-sm shrink-0">
                    {dep.method === 'instapay' ? '📱' : dep.method === 'bank' ? '🏦' : '💳'}
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
