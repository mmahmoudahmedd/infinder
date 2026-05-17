import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, RefreshCw, SlidersHorizontal, BarChart2, Moon, type LucideIcon } from 'lucide-react';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showToast, showAlert, showLoading, closeLoading, showError, showCopyToast } from '../lib/swal';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tx = {
  id: string;
  type: string;
  amount: number;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  fee_rate: number;
  created_at: string;
  status: string;
  reference?: string | null;
  meta?: Record<string, unknown>;
};

type Position = {
  id: string;
  name: string;
  allocation: Record<string, number>;
  is_sharia: boolean;
  status: string;
  created_at: string;
  amount: number | null;
  fee_amount: number;
};

type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
type KycData = { kyc_status: KycStatus; kyc_rejection_reason: string | null };
type TxFilter = 'all' | 'investment' | 'deposit' | 'withdrawal' | 'return';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allocationSummary(allocation: Record<string, number> | null | undefined): string {
  if (!allocation) return '';
  const labels: Record<string, string> = { stocks: 'Stocks', baskets: 'Baskets', bonds: 'Bonds', gold: 'Gold' };
  const entries = Object.entries(allocation)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return '';
  if (entries.length === 1) return labels[entries[0][0]] ?? entries[0][0];
  return entries
    .slice(0, 2)
    .map(([k]) => labels[k] ?? k)
    .join(' · ');
}

function methodLabel(meta: Record<string, unknown> | undefined): string {
  const m = meta?.method as string | undefined;
  if (m === 'card') return 'Card';
  if (m === 'instapay') return 'InstaPay';
  if (m === 'bank') return 'Bank Transfer';
  return '';
}

function txSubtitle(tx: Tx): string {
  if (tx.type === 'investment' || tx.type === 'return') {
    const alloc = (tx.meta?.allocation ?? (tx.meta?.meta as Record<string, number>)) as Record<string, number> | undefined;
    return allocationSummary(alloc);
  }
  if (tx.type === 'deposit') return methodLabel(tx.meta) || 'Deposit';
  if (tx.type === 'withdrawal') return methodLabel(tx.meta) || 'Withdrawal';
  return '';
}

const TX_ICON: Record<string, LucideIcon> = {
  investment: TrendingUp,
  deposit:    ArrowDownLeft,
  withdrawal: ArrowUpRight,
  return:     RefreshCw,
  adjustment: SlidersHorizontal,
};

const TX_COLOR: Record<string, string> = {
  investment: 'bg-blue-100 dark:bg-blue-900/30',
  deposit:    'bg-green-100 dark:bg-green-900/30',
  withdrawal: 'bg-red-100 dark:bg-red-900/30',
  return:     'bg-emerald-100 dark:bg-emerald-900/30',
  adjustment: 'bg-gray-100 dark:bg-gray-800',
};

const isCredit = (type: string) => type === 'deposit' || type === 'return' || type === 'adjustment';

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'completed'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : status === 'pending'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${cls}`}>
      {status}
    </span>
  );
}

// ─── Transaction Detail Modal ────────────────────────────────────────────────

function TransactionDetailModal({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const allocation = tx.meta?.allocation as Record<string, number> | undefined;
  const method = methodLabel(tx.meta);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    showCopyToast();
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-transparent dark:border-gray-800 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${TX_COLOR[tx.type] ?? 'bg-gray-100 dark:bg-gray-800'}`}>
              {(() => { const Icon = TX_ICON[tx.type]; return Icon ? <Icon className="w-4 h-4" /> : <span>·</span>; })()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{tx.type}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Amount block */}
          <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] p-4 text-center">
            <p className={`text-3xl font-bold ${isCredit(tx.type) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isCredit(tx.type) ? '+' : '−'}EGP {tx.amount.toFixed(2)}
            </p>
            <div className="mt-2 flex justify-center">
              <StatusBadge status={tx.status} />
            </div>
          </div>

          {/* Fee breakdown */}
          {tx.fee_amount > 0 && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Gross amount</span>
                <span>EGP {(tx.gross_amount || tx.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Platform fee {tx.fee_rate > 0 ? `(${(tx.fee_rate * 100).toFixed(2)}%)` : ''}</span>
                <span className="text-red-500">−EGP {tx.fee_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-800 pt-1.5">
                <span>Net amount</span>
                <span>EGP {(tx.net_amount || tx.amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Asset allocation */}
          {allocation && Object.keys(allocation).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Allocation</p>
              <div className="space-y-1.5">
                {Object.entries(allocation)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-infinder-lime rounded-full" style={{ width: `${v}%` }} />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 w-20 text-right capitalize">{k} {v}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Method */}
          {method && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Method</span>
              <span className="text-gray-900 dark:text-white font-medium">{method}</span>
            </div>
          )}

          {/* Reference */}
          {tx.reference && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reference</p>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] px-3 py-2">
                <code className="text-xs font-mono text-gray-700 dark:text-gray-300 flex-1 break-all">{tx.reference}</code>
                <button
                  type="button"
                  onClick={() => copy(tx.reference!)}
                  className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Transaction ID */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Transaction ID</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] px-3 py-2">
              <code className="text-xs font-mono text-gray-700 dark:text-gray-300 flex-1 break-all">{tx.id}</code>
              <button
                type="button"
                onClick={() => copy(tx.id)}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CSV download ─────────────────────────────────────────────────────────────

function downloadCsv(rows: Tx[]) {
  const header = ['date', 'type', 'amount', 'fee', 'net', 'status', 'reference'];
  const lines = [
    header.join(','),
    ...rows.map((t) =>
      [
        new Date(t.created_at).toISOString(),
        t.type,
        t.amount,
        t.fee_amount,
        t.net_amount || t.amount,
        t.status,
        (t.reference || '').replace(/,/g, ';'),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `infinder-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user, logout, updateProfile, refreshMe } = useAuth();

  const [txs, setTxs] = useState<Tx[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [learnPct, setLearnPct] = useState(0);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [editingCard, setEditingCard] = useState(false);
  const [pmHolder, setPmHolder] = useState('');
  const [pmLast4, setPmLast4] = useState('');
  const [pmExpiry, setPmExpiry] = useState('');
  const [pmSaving, setPmSaving] = useState(false);
  const [pmExpiryErr, setPmExpiryErr] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    api.get('/api/payments/history').then((r) => setTxs(r.data.transactions || [])).catch(() => {});
    api.get('/api/learning/modules').then((r) => {
      const mods = r.data.modules || [];
      const total = mods.reduce((s: number, m: { lesson_count?: number }) => s + (m.lesson_count || 0), 0);
      const done = mods.reduce((s: number, m: { completed_lessons?: number }) => s + (m.completed_lessons || 0), 0);
      setLearnPct(total ? Math.round((done / total) * 100) : 0);
    }).catch(() => {});
    api.get('/api/kyc/status').then((r) => setKycData(r.data)).catch(() => {});
    api.get('/api/investments/positions').then((r) => setPositions(r.data.positions || [])).catch(() => {});
  }, []);

  const filteredTxs = useMemo(() => {
    if (txFilter === 'all') return txs;
    return txs.filter((tx) => tx.type === txFilter);
  }, [txs, txFilter]);

  const totalInvested = useMemo(
    () => positions.reduce((s, p) => s + (p.amount ?? 0), 0),
    [positions]
  );

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName || undefined, phone: phone || undefined });
      await refreshMe();
      showToast(t('profile_saved'));
    } catch {
      showAlert(t('profile_save_error'), t('profile_save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function savePaymentMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!pmHolder.trim() || pmLast4.replace(/\D/g, '').length !== 4 || pmExpiry.length < 4) return;
    if (!isExpiryValid(pmExpiry)) { setPmExpiryErr(true); return; }
    setPmSaving(true);
    try {
      await updateProfile({
        payment_method_type: 'card',
        payment_method_data: { holder_name: pmHolder.trim().toUpperCase(), last4: pmLast4.replace(/\D/g, '').slice(-4), expiry: pmExpiry },
      });
      setEditingCard(false);
      showToast(t('pm_saved'));
    } catch {
      showAlert(t('pm_save_error'), t('pm_save_error'));
    } finally {
      setPmSaving(false);
    }
  }

  async function removePaymentMethod() {
    try {
      await updateProfile({ payment_method_type: null, payment_method_data: null });
      showToast(t('pm_removed'));
    } catch {
      showAlert(t('pm_remove_error'), t('pm_remove_error'));
    }
  }

  function copyRef() {
    if (user?.deposit_ref_code) {
      navigator.clipboard.writeText(user.deposit_ref_code);
      showToast(t('profile_ref_copied'));
    }
  }

  async function handleDeleteAccount() {
    const step1 = await Swal.fire({
      title: 'Delete your account?',
      text: 'This will permanently remove your account and KYC documents. Transactions are kept for legal/audit purposes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, continue',
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#ffffff',
      confirmButtonColor: '#ef4444',
    });
    if (!step1.isConfirmed) return;

    const step2 = await Swal.fire({
      title: 'Type DELETE to confirm',
      input: 'text',
      inputPlaceholder: 'DELETE',
      showCancelButton: true,
      confirmButtonText: 'Delete my account',
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#ffffff',
      confirmButtonColor: '#ef4444',
      inputValidator: (val) => {
        if (val !== 'DELETE') return 'You must type DELETE exactly to confirm';
      },
    });
    if (!step2.isConfirmed) return;

    showLoading('Deleting account…');
    try {
      await api.delete('/api/auth/account');
      closeLoading();
      logout();
      nav('/', { replace: true });
    } catch (err: unknown) {
      closeLoading();
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showError('Cannot delete account', msg || 'Please try again.');
    }
  }

  if (!user) return null;

  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();

  const FILTER_CHIPS: { key: TxFilter; label: string }[] = [
    { key: 'all',        label: 'All' },
    { key: 'investment', label: 'Investments' },
    { key: 'deposit',    label: 'Deposits' },
    { key: 'withdrawal', label: 'Withdrawals' },
    { key: 'return',     label: 'Returns' },
  ];

  return (
    <SubpageShell>
      {/* ── Profile header ── */}
      <div className="rounded-2xl bg-infinder-black text-white p-7 relative overflow-hidden mb-8">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-infinder-lime/8 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-infinder-lime flex items-center justify-center text-2xl font-bold text-infinder-black shrink-0">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.full_name || t('profile_investor')}</h1>
            <p className="text-white/60 text-sm">{user.email}</p>
            {user.created_at && (
              <p className="text-xs text-white/40 mt-1">{t('profile_member_since')} {new Date(user.created_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 items-center justify-between">
          {kycData ? (
            <div className="flex items-center gap-2 flex-wrap">
              {kycData.kyc_status === 'approved' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">Verified ✓</span>
              )}
              {kycData.kyc_status === 'pending' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">Under Review</span>
              )}
              {kycData.kyc_status === 'rejected' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Rejected</span>
              )}
              {kycData.kyc_status === 'not_started' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50">KYC Not Started</span>
              )}
              {(kycData.kyc_status === 'not_started' || kycData.kyc_status === 'rejected') && (
                <button type="button" onClick={() => nav('/register')}
                  className="text-xs px-2 py-0.5 rounded-full font-medium bg-infinder-lime/20 text-infinder-black dark:text-infinder-lime border border-infinder-lime/30 hover:bg-infinder-lime/30 transition">
                  {kycData.kyc_status === 'rejected' ? 'Resubmit' : 'Complete KYC'}
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/40">{user.kyc_status}</span>
          )}
          <div className="flex gap-2 ml-auto">
            <Link to="/reports" className="rounded-full bg-white/10 text-white text-xs font-medium px-3 py-1.5 hover:bg-white/20 transition">{t('profile_analytics_btn')}</Link>
            <Link to="/funding" className="rounded-full bg-infinder-lime text-infinder-black text-xs font-semibold px-3 py-1.5">{t('profile_funding_btn')}</Link>
          </div>
        </div>
        {kycData?.kyc_rejection_reason && (
          <p className="text-xs text-red-400 mt-3">{kycData.kyc_rejection_reason}</p>
        )}
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* ── PART 3: Portfolio summary ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Portfolio Summary</h2>
              <Link to="/reports" className="text-xs text-infinder-green dark:text-infinder-lime font-medium hover:underline">
                View detailed reports →
              </Link>
            </div>

            {positions.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                <div className="mb-2"><BarChart2 className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" /></div>
                No investments yet
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Invested</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">EGP {totalInvested.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                    {/* TODO: replace with live price data */}
                    <p className="font-bold text-gray-900 dark:text-white text-sm">EGP {totalInvested.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Returns</p>
                    <p className="font-bold text-gray-400 dark:text-gray-500 text-sm">—</p>
                  </div>
                </div>

                {/* Aggregate allocation bar */}
                {(() => {
                  const totals: Record<string, number> = { stocks: 0, baskets: 0, bonds: 0, gold: 0 };
                  let totalWeight = 0;
                  for (const p of positions) {
                    const amt = p.amount ?? 0;
                    totalWeight += amt;
                    for (const [k, v] of Object.entries(p.allocation ?? {})) {
                      totals[k] = (totals[k] || 0) + (v / 100) * amt;
                    }
                  }
                  const colors: Record<string, string> = {
                    stocks: 'bg-blue-400', baskets: 'bg-purple-400', bonds: 'bg-amber-400', gold: 'bg-yellow-400',
                  };
                  const segments = Object.entries(totals)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => ({ k, pct: totalWeight > 0 ? (v / totalWeight) * 100 : 0 }));
                  return (
                    <div>
                      <div className="flex rounded-full overflow-hidden h-2 mb-2">
                        {segments.map(({ k, pct }) => (
                          <div key={k} className={colors[k] || 'bg-gray-400'} style={{ width: `${pct}%` }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {segments.map(({ k, pct }) => (
                          <span key={k} className="capitalize">{k} {pct.toFixed(0)}%</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* ── Account details ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('profile_account_details')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile_account_sub')}</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('profile_full_name')}</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('profile_phone')}</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 …"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveProfile}
              className="mt-4 rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2 text-sm disabled:opacity-50"
            >
              {saving ? t('profile_saving') : t('profile_save')}
            </button>
          </div>

          {/* ── Payment method ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('pm_section_title')}</h2>

            {user.payment_method_type === 'card' && user.payment_method_data && !editingCard ? (
              <div className="mt-4">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] px-4 py-3">
                  <svg className="w-8 h-8 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white tracking-widest">
                      •••• •••• •••• {user.payment_method_data.last4}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {user.payment_method_data.holder_name} · Expires {user.payment_method_data.expiry}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPmHolder(user.payment_method_data?.holder_name ?? '');
                      setPmLast4(user.payment_method_data?.last4 ?? '');
                      setPmExpiry(user.payment_method_data?.expiry ?? '');
                      setEditingCard(true);
                    }}
                    className="rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 text-sm hover:border-gray-500 dark:hover:border-gray-500 transition-colors"
                  >
                    {t('pm_edit')}
                  </button>
                  <button
                    type="button"
                    onClick={removePaymentMethod}
                    className="rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-4 py-1.5 text-sm hover:border-red-400 dark:hover:border-red-700 transition-colors"
                  >
                    {t('pm_remove')}
                  </button>
                </div>
              </div>
            ) : !editingCard ? (
              <div className="mt-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('pm_none')}</p>
                <button
                  type="button"
                  onClick={() => { setPmHolder(''); setPmLast4(''); setPmExpiry(''); setEditingCard(true); }}
                  className="mt-3 rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2 text-sm"
                >
                  {t('pm_add')}
                </button>
              </div>
            ) : null}

            {editingCard && (
              <form onSubmit={savePaymentMethod} className="mt-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">Card Holder Name</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm uppercase focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      placeholder="JOHN DOE"
                      value={pmHolder}
                      onChange={(e) => setPmHolder(e.target.value.toUpperCase())}
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">Last 4 Digits</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      placeholder="1234"
                      value={pmLast4}
                      onChange={(e) => setPmLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      inputMode="numeric"
                      maxLength={4}
                      required
                    />
                  </label>
                  <div className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">Expiry (MM/YY)</span>
                    <input
                      className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-mono bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 ${pmExpiryErr ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500'}`}
                      placeholder="MM/YY"
                      value={pmExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const val = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                        setPmExpiry(val);
                        if (val.length === 5) setPmExpiryErr(!isExpiryValid(val));
                        else setPmExpiryErr(false);
                      }}
                      inputMode="numeric"
                      maxLength={5}
                      required
                    />
                    {pmExpiryErr && <p className="mt-1 text-xs text-red-500">Card has expired</p>}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={pmSaving}
                    className="rounded-full bg-infinder-lime text-infinder-black font-semibold px-5 py-2 text-sm disabled:opacity-50"
                  >
                    {pmSaving ? 'Saving…' : t('pm_save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCard(false)}
                    className="rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm hover:border-gray-500 dark:hover:border-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Deposit reference ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('profile_deposit_ref')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('profile_deposit_ref_sub')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] px-4 py-3">
              <code className="text-lg font-bold text-infinder-green tracking-tight">{user.deposit_ref_code || '—'}</code>
              <button type="button" onClick={copyRef} className="text-sm underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors" disabled={!user.deposit_ref_code}>
                {t('profile_copy')}
              </button>
            </div>
          </div>

          {/* ── Wallet ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('profile_wallet')}</h2>
              <button type="button" onClick={() => downloadCsv(txs)} className="text-sm font-medium text-infinder-black dark:text-white underline" disabled={txs.length === 0}>
                {t('profile_export_csv')}
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/[0.04] px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('profile_available')}</span>
              <span className="font-semibold text-gray-900 dark:text-white">EGP {user.wallet_balance.toFixed(2)}</span>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Link to="/funding" className="flex-1 min-w-[120px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white py-3 text-center font-medium hover:border-infinder-black dark:hover:border-gray-500 transition-colors">
                {t('profile_add_funds')}
              </Link>
              <Link to="/funding" className="flex-1 min-w-[120px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 text-center hover:border-infinder-black dark:hover:border-gray-500 transition-colors">
                {t('profile_withdraw')}
              </Link>
            </div>
          </div>

          {/* ── PART 1+2: Transactions with filter chips ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('profile_transactions')}</h2>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {FILTER_CHIPS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTxFilter(key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    txFilter === key
                      ? 'bg-infinder-lime text-infinder-black border-infinder-lime'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredTxs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No transactions found</p>
            ) : (
              <ul className="space-y-1 max-h-96 overflow-y-auto">
                {filteredTxs.map((tx) => {
                  const subtitle = txSubtitle(tx);
                  const credit = isCredit(tx.type);
                  return (
                    <li key={tx.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${TX_COLOR[tx.type] ?? 'bg-gray-100'}`}>
                          {(() => { const Icon = TX_ICON[tx.type]; return Icon ? <Icon className="w-4 h-4" /> : <span>·</span>; })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{tx.type}</span>
                            {subtitle && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</span>}
                            <StatusBadge status={tx.status} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {tx.reference && (
                              <code className="text-[10px] text-gray-300 dark:text-gray-600 font-mono truncate max-w-[80px]">
                                {tx.reference.slice(0, 12)}…
                              </code>
                            )}
                          </div>
                        </div>
                        <span className={`font-bold text-sm shrink-0 ${credit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {credit ? '+' : '−'}EGP {tx.amount.toFixed(2)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Sharia mode ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0"><Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{t('profile_sharia_mode')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile_sharia_desc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={user.sharia_mode}
                onClick={() => updateProfile({ sharia_mode: !user.sharia_mode })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${user.sharia_mode ? 'bg-infinder-green' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${user.sharia_mode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <button type="button" className="mt-6 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2" onClick={() => { logout(); window.location.href = '/'; }}>
              {t('profile_sign_out')}
            </button>
          </div>

          {/* ── PART 4: Danger zone ── */}
          <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-red-700 dark:text-red-400 mb-1">Danger zone</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete your account, KYC documents, and personal data. Transaction records are kept for legal and audit purposes. Funds in your wallet must be withdrawn first.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium text-sm px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors"
            >
              Delete my account
            </button>
          </div>

          {/* ── PART 5: Legal links ── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Legal &amp; Support</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: 'Terms of Service',  href: '/legal/terms' },
                { label: 'Privacy Policy',    href: '/legal/privacy' },
                { label: 'Risk Disclosure',   href: '/legal/risk' },
                { label: 'Contact Support',   href: '/support' },
                { label: 'Help Center',       href: '/help' },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  to={href}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 py-1"
                >
                  {label} <span className="text-gray-300 dark:text-gray-600">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-5 text-sm text-gray-600 dark:text-gray-400">
            <h2 className="font-semibold text-infinder-black dark:text-white mb-3">{t('profile_achievements')}</h2>
            <p>{t('profile_achievements_sub')}</p>
            <Link to="/rewards" className="inline-block mt-3 text-infinder-black dark:text-white font-medium underline text-sm">
              {t('profile_open_rewards')}
            </Link>
          </div>
          <div className="rounded-2xl bg-infinder-black text-white p-5">
            <h2 className="font-semibold">{t('profile_learning')}</h2>
            <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-infinder-lime rounded-full transition-all" style={{ width: `${learnPct}%` }} />
            </div>
            <p className="text-xs text-white/70 mt-2">{learnPct}{t('profile_learning_pct')}</p>
            <Link to="/learn" className="mt-4 inline-block w-full text-center rounded-full border border-white py-2 text-sm font-medium">
              {t('profile_continue_learning')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Transaction detail modal ── */}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </SubpageShell>
  );
}
