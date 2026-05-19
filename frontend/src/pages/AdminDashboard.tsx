import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ShieldCheck, ArrowDownCircle, Package, BarChart2,
  ArrowLeftRight, LayoutDashboard, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Search, Edit2, ToggleLeft, ToggleRight,
  Plus, X,
} from 'lucide-react';
import api from '../lib/api';
import { AppShell } from '../components/AppShell';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  users: { total: number; kyc_pending: number };
  wallet: { total_balance: number; total_invested: number };
  deposits: { pending_count: number; pending_amount: number };
  revenue: { total_fees: number; this_month: number };
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  kyc_status: string;
  wallet_balance: number;
  created_at: string;
  deleted_at: string | null;
};

type Deposit = {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  method: string;
  reference_code: string;
  status: string;
  created_at: string;
  user: { id: string; email: string; full_name: string | null };
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  meta: Record<string, unknown> | null;
  user: { id: string; email: string; full_name: string | null };
};

type Investment = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  min_investment: number;
  max_investment: number | null;
  expected_return_low: number | null;
  expected_return_high: number | null;
  risk_level: string;
  is_halal: boolean;
  active: boolean;
};

type KycSubmission = {
  id: string;
  status: string;
  submitted_at: string;
  user: { id: string; email: string; full_name: string | null; phone: string | null; kyc_status: string };
};

// ─── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    credited: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] ?? colors.user}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, amber }: { label: string; value: string; sub?: string; amber?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${amber ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="p-1.5 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="p-1.5 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ stats, onNavigate }: { stats: Stats | null; onNavigate: (s: string) => void }) {
  const { t } = useTranslation();
  if (!stats) return <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mt-8 mx-auto" />;
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label={t('admin_stat_users')} value={stats.users.total.toLocaleString()} />
        <StatCard label={t('admin_stat_kyc_pending')} value={stats.users.kyc_pending.toLocaleString()} amber={stats.users.kyc_pending > 0} />
        <StatCard label={t('admin_stat_wallet')} value={`EGP ${stats.wallet.total_balance.toLocaleString()}`} />
        <StatCard label={t('admin_stat_invested')} value={`EGP ${stats.wallet.total_invested.toLocaleString()}`} />
        <StatCard label={t('admin_stat_revenue')} value={`EGP ${stats.revenue.this_month.toLocaleString()}`} />
        <StatCard label={t('admin_stat_pending_deposits')} value={stats.deposits.pending_count.toString()} sub={`EGP ${stats.deposits.pending_amount.toLocaleString()}`} amber={stats.deposits.pending_count > 0} />
      </div>

      <div className="mt-6 space-y-2">
        {stats.users.kyc_pending > 0 && (
          <button
            onClick={() => onNavigate('kyc')}
            className="w-full flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{stats.users.kyc_pending} {t('admin_alert_kyc')}</span>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-500">{t('admin_alert_review')} →</span>
          </button>
        )}
        {stats.deposits.pending_count > 0 && (
          <button
            onClick={() => onNavigate('deposits')}
            className="w-full flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ArrowDownCircle size={16} />
              <span className="text-sm font-medium">{stats.deposits.pending_count} {t('admin_alert_deposits')}</span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-500">{t('admin_alert_review')} →</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section: Users ──────────────────────────────────────────────────────────

function UsersSection() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustingUser, setAdjustingUser] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/users', { params: { q: debouncedQ, page, limit: 20 } });
      setUsers(r.data.users);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page]);

  useEffect(() => { load(); }, [load]);

  async function toggleRole(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await api.patch(`/api/admin/users/${user.id}`, { role: newRole });
    load();
  }

  async function submitAdjustment() {
    if (!adjustingUser) return;
    setAdjustLoading(true);
    setMsg('');
    try {
      await api.patch(`/api/admin/users/${adjustingUser.id}`, {
        wallet_adjustment: Number(adjustAmount),
        note: adjustNote,
      });
      setMsg(t('admin_adjust_success'));
      setAdjustingUser(null);
      setAdjustAmount('');
      setAdjustNote('');
      load();
    } catch {
      setMsg(t('admin_adjust_error'));
    } finally {
      setAdjustLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
            placeholder={t('admin_users_search')}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {msg && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{msg}</p>}

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_users_no_results')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['admin_users_col_email','admin_users_col_name','admin_users_col_kyc','admin_users_col_balance','admin_users_col_role','admin_users_col_joined','admin_users_col_actions'].map((k) => (
                  <th key={k} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className={`${u.deleted_at ? 'opacity-50' : ''} hover:bg-gray-50 dark:hover:bg-white/5`}>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white font-mono text-xs">
                    {u.email}
                    {u.deleted_at && <span className="ml-1 text-xs text-red-500 line-through">{t('admin_users_deleted')}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{u.full_name || '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.kyc_status} /></td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {u.wallet_balance.toLocaleString()}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        title={u.role === 'admin' ? t('admin_action_demote') : t('admin_action_promote')}
                        onClick={() => toggleRole(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {u.role === 'admin' ? <ToggleRight size={16} className="text-indigo-500" /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        title={t('admin_action_adjust_wallet')}
                        onClick={() => { setAdjustingUser(u); setAdjustAmount(''); setAdjustNote(''); setMsg(''); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} total={total} limit={20} onPage={setPage} />

      <AnimatePresence>
        {adjustingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setAdjustingUser(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin_adjust_title')}</h3>
                <button onClick={() => setAdjustingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{adjustingUser.email}</p>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_adjust_amount')}</label>
              <input
                type="number"
                className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_adjust_note')}</label>
              <input
                type="text"
                className="w-full mb-4 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {t('admin_adjust_cancel')}
                </button>
                <button
                  onClick={submitAdjustment}
                  disabled={adjustLoading || !adjustAmount}
                  className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50"
                >
                  {adjustLoading ? '…' : t('admin_adjust_confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section: KYC ────────────────────────────────────────────────────────────

function KycSection() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<KycSubmission[]>([]);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/kyc/admin/pending');
      setRows(r.data.submissions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => setMsg(t('admin_load_error'))); }, []);

  async function approve(id: string) {
    setMsg('');
    await api.post(`/api/kyc/${id}/approve`);
    setMsg(t('admin_approved_msg'));
    load();
  }

  async function reject(id: string) {
    setMsg('');
    await api.post(`/api/kyc/${id}/reject`, { reason: reason || 'Please resubmit documents.' });
    setMsg(t('admin_rejected_msg'));
    setReason('');
    load();
  }

  if (loading) return <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />;

  return (
    <div>
      {msg && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{msg}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_none')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{s.user.full_name || '—'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.user.email}</p>
                <p className="text-xs text-gray-500 mt-1">{s.user.phone || t('admin_no_phone')}</p>
                <div className="mt-2"><StatusBadge status={s.status} /></div>
              </div>
              <div className="flex flex-col sm:items-end gap-2 sm:min-w-[220px]">
                <div className="flex gap-2">
                  <button onClick={() => approve(s.id)} className="rounded-full bg-infinder-lime text-infinder-black text-sm font-semibold px-4 py-1.5">
                    {t('admin_approve')}
                  </button>
                  <button onClick={() => reject(s.id)} className="rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-medium px-4 py-1.5">
                    {t('admin_reject')}
                  </button>
                </div>
                <input
                  className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 w-full focus:outline-none"
                  placeholder={t('admin_reason_placeholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Deposits ───────────────────────────────────────────────────────

function DepositsSection() {
  const { t } = useTranslation();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [crediting, setCrediting] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/deposits', { params: { status: tab === 'pending' ? 'pending' : '', page } });
      setDeposits(r.data.deposits);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  async function credit(id: string) {
    setCrediting(id);
    setMsg('');
    try {
      await api.post(`/api/deposits/${id}/credit`);
      setMsg('Credited successfully.');
      load();
    } catch {
      setMsg('Credit failed.');
    } finally {
      setCrediting(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'all'] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => { setTab(t2); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t2 ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t2 === 'pending' ? t('admin_deposits_tab_pending') : t('admin_deposits_tab_all')}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{msg}</p>}

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : deposits.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_deposits_none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['admin_deposits_col_user','admin_deposits_col_method','admin_deposits_col_amount','admin_deposits_col_ref','admin_deposits_col_date','admin_deposits_col_status',''].map((k, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{k ? t(k) : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{d.user.email}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 uppercase text-xs">{d.method}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {d.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{d.reference_code}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-2.5">
                    {d.status === 'pending' && (
                      <button
                        onClick={() => credit(d.id)}
                        disabled={crediting === d.id}
                        className="px-3 py-1 rounded-full bg-infinder-lime text-infinder-black text-xs font-semibold disabled:opacity-50"
                      >
                        {crediting === d.id ? '…' : t('admin_deposits_credit')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} limit={20} onPage={setPage} />
    </div>
  );
}

// ─── Section: Investment Products ────────────────────────────────────────────

const EMPTY_PRODUCT: Partial<Investment> = {
  title: '', description: '', category: 'stocks', min_investment: 100,
  max_investment: null, expected_return_low: null, expected_return_high: null,
  risk_level: 'medium', is_halal: false, active: true,
};

function ProductsSection() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [form, setForm] = useState<Partial<Investment>>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/investments');
      setProducts(r.data.investments);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY_PRODUCT); setFormOpen(true); setMsg(''); }
  function openEdit(p: Investment) { setEditing(p); setForm(p); setFormOpen(true); setMsg(''); }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      if (editing) {
        await api.patch(`/api/admin/investments/${editing.id}`, form);
      } else {
        await api.post('/api/admin/investments', form);
      }
      setFormOpen(false);
      load();
    } catch {
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Investment) {
    await api.patch(`/api/admin/investments/${p.id}`, { active: !p.active });
    load();
  }

  const field = (key: keyof Investment) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold">
          <Plus size={15} /> {t('admin_products_add')}
        </button>
      </div>

      {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_products_none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['admin_products_col_title','admin_products_col_category','admin_products_col_min','admin_products_col_returns','admin_products_col_risk','admin_products_col_halal','admin_products_col_active',''].map((k, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{k ? t(k) : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white max-w-[180px] truncate">{p.title}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 uppercase text-xs">{p.category}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {Number(p.min_investment).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs">
                    {p.expected_return_low != null ? `${p.expected_return_low}–${p.expected_return_high}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{p.risk_level}</td>
                  <td className="px-4 py-2.5">
                    {p.is_halal ? <CheckCircle size={14} className="text-green-500" /> : <X size={14} className="text-gray-400" />}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActive(p)}>
                      {p.active ? <ToggleRight size={20} className="text-infinder-green" /> : <ToggleLeft size={20} className="text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8"
            onClick={(e) => { if (e.target === e.currentTarget) setFormOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl my-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {editing ? t('admin_products_edit_title') : t('admin_products_new_title')}
                </h3>
                <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>

              <div className="space-y-3">
                {([
                  ['admin_products_form_title', 'title', 'text'],
                  ['admin_products_form_min', 'min_investment', 'number'],
                  ['admin_products_form_max', 'max_investment', 'number'],
                  ['admin_products_form_returns', 'expected_return_low', 'number'],
                ] as [string, keyof Investment, string][]).map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t(label)}</label>
                    <input
                      type={type}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400"
                      value={(form[key] as string | number) ?? ''}
                      onChange={field(key)}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_products_form_desc')}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 resize-none"
                    value={(form.description as string) ?? ''}
                    onChange={field('description')}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_products_form_category')}</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] rounded-xl text-gray-900 dark:text-white focus:outline-none"
                    value={(form.category as string) ?? 'stocks'}
                    onChange={field('category')}
                  >
                    {['stocks', 'baskets', 'bonds', 'gold'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_products_form_risk')}</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] rounded-xl text-gray-900 dark:text-white focus:outline-none"
                    value={(form.risk_level as string) ?? 'medium'}
                    onChange={field('risk_level')}
                  >
                    {['low', 'medium', 'high'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={!!form.is_halal} onChange={field('is_halal')} className="rounded" />
                    {t('admin_products_form_halal')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={!!form.active} onChange={field('active')} className="rounded" />
                    {t('admin_products_form_active')}
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setFormOpen(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  {t('admin_products_cancel')}
                </button>
                <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50">
                  {saving ? '…' : t('admin_products_save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section: Revenue ────────────────────────────────────────────────────────

type FeeData = { total: number; by_type: Record<string, number>; breakdown: { day: string; amount: number; type: string }[] };

function RevenueSection() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'day' | 'month' | 'all'>('month');
  const [data, setData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/payments/admin/fees', { params: { period } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['day', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${period === p ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {t(`admin_revenue_period_${p}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label={t('admin_revenue_total')} value={`EGP ${data.total.toLocaleString()}`} />
            <StatCard label={t('admin_revenue_investment')} value={`EGP ${(data.by_type.investment || 0).toLocaleString()}`} />
            <StatCard label={t('admin_revenue_withdrawal')} value={`EGP ${(data.by_type.withdrawal || 0).toLocaleString()}`} />
          </div>

          {data.breakdown?.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('admin_revenue_breakdown')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.breakdown.slice(0, 30).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{row.day}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{row.type}</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {Number(row.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Section: Transactions ───────────────────────────────────────────────────

const TX_TYPES = ['', 'investment', 'deposit', 'withdrawal', 'return', 'adjustment', 'course_purchase'];

function TransactionsSection() {
  const { t } = useTranslation();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/transactions', { params: { page, limit: 50, type: typeFilter } });
      setTxs(r.data.transactions);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TX_TYPES.map((tp) => (
          <button
            key={tp}
            onClick={() => { setTypeFilter(tp); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === tp ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {tp || t('admin_tx_filter_all')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : txs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_tx_none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['admin_tx_col_user','admin_tx_col_type','admin_tx_col_amount','admin_tx_col_fee','admin_tx_col_status','admin_tx_col_date'].map((k) => (
                  <th key={k} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{tx.user.email}</td>
                  <td className="px-4 py-2.5 text-xs"><StatusBadge status={tx.type} /></td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{tx.fee_amount > 0 ? `EGP ${tx.fee_amount.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} limit={50} onPage={setPage} />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Section = 'overview' | 'users' | 'kyc' | 'deposits' | 'products' | 'revenue' | 'transactions';

const NAV: { id: Section; icon: React.FC<{ size?: number; className?: string }>; labelKey: string }[] = [
  { id: 'overview',     icon: LayoutDashboard, labelKey: 'admin_nav_overview' },
  { id: 'users',        icon: Users,           labelKey: 'admin_nav_users' },
  { id: 'kyc',          icon: ShieldCheck,     labelKey: 'admin_nav_kyc' },
  { id: 'deposits',     icon: ArrowDownCircle, labelKey: 'admin_nav_deposits' },
  { id: 'products',     icon: Package,         labelKey: 'admin_nav_products' },
  { id: 'revenue',      icon: BarChart2,       labelKey: 'admin_nav_revenue' },
  { id: 'transactions', icon: ArrowLeftRight,  labelKey: 'admin_nav_transactions' },
];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Section>('overview');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/api/admin/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const sectionTitle = useMemo(() => NAV.find((n) => n.id === active)?.labelKey ?? 'admin_nav_overview', [active]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
          <h1 className="text-2xl md:text-3xl font-bold text-infinder-black dark:text-white">{t('admin_dashboard_title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('admin_dashboard_sub')}</p>
        </div>

        {/* Mobile nav tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 md:hidden scrollbar-none">
          {NAV.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active === id ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <Icon size={12} />
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="flex gap-6 mt-4">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col gap-1 w-44 flex-shrink-0">
            {NAV.map(({ id, icon: Icon, labelKey }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${active === id ? 'bg-infinder-lime text-infinder-black' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <Icon size={16} />
                {t(labelKey)}
              </button>
            ))}
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t(sectionTitle)}</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {active === 'overview'     && <OverviewSection stats={stats} onNavigate={(s) => setActive(s as Section)} />}
                {active === 'users'        && <UsersSection />}
                {active === 'kyc'          && <KycSection />}
                {active === 'deposits'     && <DepositsSection />}
                {active === 'products'     && <ProductsSection />}
                {active === 'revenue'      && <RevenueSection />}
                {active === 'transactions' && <TransactionsSection />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
