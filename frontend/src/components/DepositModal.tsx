import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

type Props = {
  onClose: () => void;
  onSuccess?: (amount: number) => void;
  initialAmount?: number;
};

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function isExpiryValid(expiry: string): boolean {
  const [mm, yy] = expiry.split('/');
  if (!mm || !yy || yy.length < 2) return false;
  const month = parseInt(mm, 10);
  const year = 2000 + parseInt(yy, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

const CHIP_SVG = (
  <svg width="40" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="30" rx="4" fill="#D4A843" />
    <rect x="13" y="0" width="14" height="30" fill="#C49A35" />
    <rect x="0" y="9" width="40" height="12" fill="#C49A35" />
    <rect x="13" y="9" width="14" height="12" fill="#B8891F" />
    <rect x="16" y="1" width="8" height="28" rx="1" fill="none" stroke="#B8891F" strokeWidth="0.5" />
    <rect x="1" y="10" width="38" height="10" rx="1" fill="none" stroke="#B8891F" strokeWidth="0.5" />
  </svg>
);

const CARD_FEE_RATE = 0.02;

export default function DepositModal({ onClose, onSuccess, initialAmount }: Props) {
  const { user, updateProfile } = useAuth();
  const saved = user?.payment_method_type === 'card' ? user.payment_method_data : null;

  const [useSaved, setUseSaved] = useState(!!saved);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(saved?.holder_name ?? '');
  const [expiry, setExpiry] = useState(saved?.expiry ?? '');
  const [cvc, setCvc] = useState('');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [saveCard, setSaveCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiryErr, setExpiryErr] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function switchToNewCard() {
    setUseSaved(false);
    setCardName('');
    setExpiry('');
    setCardNumber('');
    setCvc('');
  }

  const displayNumber = useSaved && saved
    ? `•••• •••• •••• ${saved.last4}`
    : cardNumber
    ? cardNumber.replace(/ /g, '').padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim()
    : '•••• •••• •••• ••••';

  const displayName = cardName.trim() || 'CARD HOLDER';
  const displayExpiry = expiry || 'MM/YY';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (expiry.length === 5 && !isExpiryValid(expiry)) {
      setExpiryErr(true);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));

    if (saveCard && cardNumber && cardName && expiry) {
      const digits = cardNumber.replace(/\D/g, '');
      await updateProfile({
        payment_method_type: 'card',
        payment_method_data: {
          holder_name: cardName,
          last4: digits.slice(-4),
          expiry,
        },
      }).catch(() => {});
    }

    setLoading(false);
    onSuccess?.(amt);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-transparent dark:border-gray-800 w-full max-w-[390px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deposit Funds</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Saved card banner */}
        {saved && useSaved && (
          <div className="mx-6 mb-2 flex items-center justify-between rounded-xl bg-infinder-lime/20 border border-infinder-lime/40 px-3.5 py-2.5 text-sm">
            <span className="font-medium text-gray-900 dark:text-white">
              Using saved card •••• {saved.last4}
            </span>
            <button
              type="button"
              onClick={switchToNewCard}
              className="text-xs underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-3 shrink-0"
            >
              Use different
            </button>
          </div>
        )}

        {/* Card Preview */}
        <div className="px-6 pt-2 pb-4">
          <div
            className="relative rounded-2xl p-5 overflow-hidden select-none"
            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: 180 }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative flex justify-between items-start mb-5">
              {CHIP_SVG}
              <svg className="h-6 w-auto opacity-90" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="16" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="18" fill="white" letterSpacing="1">VISA</text>
              </svg>
            </div>

            <p className="relative text-white font-mono tracking-[0.2em] text-base mb-5" style={{ letterSpacing: '0.15em' }}>
              {displayNumber}
            </p>

            <div className="relative flex justify-between items-end">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Card Holder</p>
                <p className="text-white text-sm font-medium uppercase tracking-wide truncate max-w-[160px]">
                  {displayName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Expires</p>
                <p className="text-white text-sm font-medium">{displayExpiry}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Card Number — always shown (security: never pre-filled) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5" htmlFor="dep-card-number">
              Card Number
            </label>
            <input
              id="dep-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder={useSaved && saved ? `•••• •••• •••• ${saved.last4}` : '0000 0000 0000 0000'}
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5" htmlFor="dep-card-name">
              Name on Card
            </label>
            <input
              id="dep-card-name"
              type="text"
              autoComplete="cc-name"
              placeholder="JOHN DOE"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm uppercase focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>

          {/* Expiry + CVC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5" htmlFor="dep-expiry">
                MM/YY
              </label>
              <input
                id="dep-expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => {
                  const val = formatExpiry(e.target.value);
                  setExpiry(val);
                  if (val.length === 5) setExpiryErr(!isExpiryValid(val));
                  else setExpiryErr(false);
                }}
                maxLength={5}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 ${expiryErr ? 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30' : 'border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-200 dark:focus:ring-gray-700'}`}
              />
              {expiryErr && <p className="mt-1 text-xs text-red-500">Card has expired</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5" htmlFor="dep-cvc">
                CVC
              </label>
              <input
                id="dep-cvc"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5" htmlFor="dep-amount">
              Deposit Amount
            </label>
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-gray-400 dark:focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-200 dark:focus-within:ring-gray-700 transition-colors">
              <span className="flex items-center px-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border-r border-gray-200 dark:border-gray-700">EGP</span>
              <input
                id="dep-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="flex-1 px-3.5 py-2.5 text-sm outline-none bg-white dark:bg-transparent text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
            {parseFloat(amount) > 0 && (() => {
              const amt = parseFloat(amount);
              const fee = parseFloat((amt * CARD_FEE_RATE).toFixed(2));
              const net = parseFloat((amt - fee).toFixed(2));
              return (
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Card fee (2%)</span><span>EGP {fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                    <span>You receive</span><span>EGP {net.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Save card checkbox — only shown when entering a new card */}
          {!useSaved && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-infinder-green"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Save this card for future deposits</span>
            </label>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
            style={{ backgroundColor: '#22c55e' }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            )}
            {loading ? 'Processing…' : 'Secure Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}
