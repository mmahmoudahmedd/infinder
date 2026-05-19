import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ShieldCheck, ArrowDownCircle, Package, BarChart2,
  ArrowLeftRight, LayoutDashboard, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Search, Edit2, ToggleLeft, ToggleRight,
  Plus, X, Trash2, BookOpen, Briefcase, ChevronDown, ChevronUp, Eye,
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

type AdminUserDetail = {
  user: AdminUser & { phone: string | null };
  portfolios: { id: string; name: string; status: string; amount: number; is_sharia: boolean; created_at: string }[];
  recent_transactions: { id: string; type: string; amount: number; net_amount: number; status: string; created_at: string }[];
};

type Portfolio = {
  id: string;
  name: string;
  status: 'active' | 'closed';
  allocation: Record<string, unknown> | null;
  amount: number;
  is_sharia: boolean;
  created_at: string;
  user: { id: string; email: string; full_name: string | null };
};

type LearningModule = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string;
  duration_minutes: number;
  order_index: number;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content: string;
  order_index: number;
  duration_minutes: number;
  quiz: Record<string, unknown> | null;
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

const EMPTY_USER_FORM = { email: '', password: '', full_name: '', phone: '', role: 'user' };

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
  // create
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_USER_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  // delete
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // detail
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
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

  async function submitCreate() {
    setCreateLoading(true);
    setCreateMsg('');
    try {
      await api.post('/api/admin/users', createForm);
      setCreatingUser(false);
      setCreateForm(EMPTY_USER_FORM);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setCreateMsg(err?.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/admin/users/${deletingUser.id}`);
      setDeletingUser(null);
      load();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openDetail(u: AdminUser) {
    setDetailUser(null);
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/admin/users/${u.id}`);
      setDetailUser(r.data);
    } finally {
      setDetailLoading(false);
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
        <button
          onClick={() => { setCreatingUser(true); setCreateForm(EMPTY_USER_FORM); setCreateMsg(''); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold flex-shrink-0"
        >
          <Plus size={15} /> New User
        </button>
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
                    <button
                      className="hover:underline text-left"
                      onClick={() => openDetail(u)}
                    >
                      {u.email}
                    </button>
                    {u.deleted_at && <span className="ml-1 text-xs text-red-500 line-through">{t('admin_users_deleted')}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{u.full_name || '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.kyc_status} /></td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {u.wallet_balance.toLocaleString()}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button title="View details" onClick={() => openDetail(u)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Eye size={14} />
                      </button>
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
                      {!u.deleted_at && (
                        <button
                          title="Delete user"
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
        {/* Wallet Adjustment Modal */}
        {adjustingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setAdjustingUser(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
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
                <button onClick={() => setAdjustingUser(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                  {t('admin_adjust_cancel')}
                </button>
                <button onClick={submitAdjustment} disabled={adjustLoading || !adjustAmount} className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50">
                  {adjustLoading ? '…' : t('admin_adjust_confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create User Modal */}
        {creatingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setCreatingUser(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Create User</h3>
                <button onClick={() => setCreatingUser(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                {([['Email', 'email', 'email'], ['Password', 'password', 'password'], ['Full Name', 'full_name', 'text'], ['Phone', 'phone', 'tel']] as [string, keyof typeof createForm, string][]).map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type={type}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400"
                      value={createForm[key]}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] rounded-xl text-gray-900 dark:text-white focus:outline-none"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              {createMsg && <p className="text-xs text-red-500 mt-2">{createMsg}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setCreatingUser(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button
                  onClick={submitCreate}
                  disabled={createLoading || !createForm.email || !createForm.password || !createForm.full_name}
                  className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50"
                >
                  {createLoading ? '…' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingUser(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete User</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Soft-delete <span className="font-mono text-xs">{deletingUser.email}</span>? They won't be able to log in.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingUser(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {deleteLoading ? '…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* User Detail Slide-over */}
        {(detailLoading || detailUser) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) { setDetailUser(null); } }}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-700 w-full max-w-sm h-full overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">User Detail</h3>
                <button onClick={() => setDetailUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>

              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin" />
                </div>
              ) : detailUser ? (
                <div className="p-5 space-y-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{detailUser.user.full_name || '—'}</p>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{detailUser.user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{detailUser.user.phone || 'No phone'}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <StatusBadge status={detailUser.user.role} />
                      <StatusBadge status={detailUser.user.kyc_status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Wallet: <span className="font-semibold text-gray-800 dark:text-gray-200">EGP {Number(detailUser.user.wallet_balance ?? 0).toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Joined {new Date(detailUser.user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Portfolios ({detailUser.portfolios?.length ?? 0})</p>
                    {(detailUser.portfolios?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-400">No portfolios.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailUser.portfolios.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2 text-xs">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                              <p className="text-gray-400">EGP {Number(p.amount || 0).toLocaleString()} · {p.is_sharia ? 'Sharia' : 'Conventional'}</p>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent Transactions</p>
                    {(detailUser.recent_transactions?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-400">No transactions.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailUser.recent_transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2 text-xs">
                            <div>
                              <StatusBadge status={tx.type} />
                              <p className="text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-800 dark:text-gray-200">EGP {Number(tx.amount).toLocaleString()}</p>
                              <StatusBadge status={tx.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
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
  const [errDetail, setErrDetail] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMsg('');
    setErrDetail('');
    try {
      const r = await api.get('/api/kyc/admin/pending');
      setRows(r.data.submissions);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const status = err?.response?.status;
      const detail = err?.response?.data?.error || err?.message || 'Unknown error';
      setErrDetail(`${status ? `HTTP ${status}: ` : ''}${detail}`);
      setMsg(t('admin_load_error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
      {msg ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{msg}</p>
            <button onClick={load} className="text-xs text-red-600 dark:text-red-400 underline ml-3 flex-shrink-0">Retry</button>
          </div>
          {errDetail && <p className="text-xs text-red-500 dark:text-red-500 mt-1 font-mono">{errDetail}</p>}
        </div>
      ) : rows.length === 0 ? (
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
  const [deletingProduct, setDeletingProduct] = useState<Investment | null>(null);
  const [deleteProductLoading, setDeleteProductLoading] = useState(false);

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

  async function confirmDeleteProduct() {
    if (!deletingProduct) return;
    setDeleteProductLoading(true);
    try {
      await api.delete(`/api/admin/investments/${deletingProduct.id}`);
      setDeletingProduct(null);
      load();
    } catch {
      // ignore
    } finally {
      setDeleteProductLoading(false);
    }
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
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeletingProduct(p)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={14} />
                      </button>
                    </div>
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

        {/* Delete Product Confirmation */}
        {deletingProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingProduct(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Product</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Permanently delete <span className="font-semibold">{deletingProduct.title}</span>? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingProduct(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={confirmDeleteProduct} disabled={deleteProductLoading} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                  {deleteProductLoading ? '…' : 'Delete'}
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
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {Number(row.total_fees).toLocaleString()}</td>
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

// ─── Section: Learning ───────────────────────────────────────────────────────

const EMPTY_MODULE_FORM: Partial<LearningModule> = { title: '', slug: '', description: '', difficulty: 'beginner', duration_minutes: 30, order_index: 0 };
const EMPTY_LESSON_FORM: Partial<Lesson> = { title: '', content: '', order_index: 0, duration_minutes: 10 };

function LearningSection() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [moduleForm, setModuleForm] = useState<Partial<LearningModule>>(EMPTY_MODULE_FORM);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>(EMPTY_LESSON_FORM);
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [deletingModule, setDeletingModule] = useState<LearningModule | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadModules() {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/learning/modules');
      setModules(r.data.modules);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadModules(); }, []);

  async function loadLessons(moduleId: string) {
    const r = await api.get(`/api/admin/learning/modules/${moduleId}/lessons`);
    setLessons((prev) => ({ ...prev, [moduleId]: r.data.lessons }));
  }

  async function toggleExpand(moduleId: string) {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      if (!lessons[moduleId]) await loadLessons(moduleId);
    }
  }

  async function saveModule() {
    setModuleSaving(true);
    setMsg('');
    try {
      if (editingModule) {
        await api.patch(`/api/admin/learning/modules/${editingModule.id}`, moduleForm);
      } else {
        await api.post('/api/admin/learning/modules', moduleForm);
      }
      setModuleFormOpen(false);
      loadModules();
    } catch {
      setMsg('Save failed.');
    } finally {
      setModuleSaving(false);
    }
  }

  async function saveLesson() {
    if (!activeLessonModuleId) return;
    setLessonSaving(true);
    setMsg('');
    try {
      let quizParsed: Record<string, unknown> | null = null;
      if (lessonForm.quiz && typeof lessonForm.quiz === 'string') {
        try { quizParsed = JSON.parse(lessonForm.quiz as unknown as string); } catch { setMsg('Quiz JSON is invalid.'); setLessonSaving(false); return; }
      }
      const payload = { ...lessonForm, quiz: quizParsed ?? (lessonForm.quiz || null) };
      if (editingLesson) {
        await api.patch(`/api/admin/learning/lessons/${editingLesson.id}`, payload);
      } else {
        await api.post(`/api/admin/learning/modules/${activeLessonModuleId}/lessons`, payload);
      }
      setLessonFormOpen(false);
      await loadLessons(activeLessonModuleId);
    } catch {
      setMsg('Save failed.');
    } finally {
      setLessonSaving(false);
    }
  }

  async function confirmDeleteModule() {
    if (!deletingModule) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/learning/modules/${deletingModule.id}`);
      setDeletingModule(null);
      if (expandedModule === deletingModule.id) setExpandedModule(null);
      loadModules();
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteLesson() {
    if (!deletingLesson || !activeLessonModuleId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/learning/lessons/${deletingLesson.id}`);
      setDeletingLesson(null);
      await loadLessons(activeLessonModuleId);
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400';
  const selectCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] rounded-xl text-gray-900 dark:text-white focus:outline-none';

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditingModule(null); setModuleForm(EMPTY_MODULE_FORM); setModuleFormOpen(true); setMsg(''); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold"
        >
          <Plus size={15} /> New Module
        </button>
      </div>

      {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}

      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : modules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No learning modules yet.</p>
      ) : (
        <div className="space-y-2">
          {modules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">#{m.order_index}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.difficulty} · {m.duration_minutes}min</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingModule(m); setModuleForm(m); setModuleFormOpen(true); setMsg(''); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => { setDeletingModule(m); setActiveLessonModuleId(m.id); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => toggleExpand(m.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    {expandedModule === m.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expandedModule === m.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lessons</p>
                    <button
                      onClick={() => { setEditingLesson(null); setLessonForm(EMPTY_LESSON_FORM); setActiveLessonModuleId(m.id); setLessonFormOpen(true); setMsg(''); }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-infinder-lime text-infinder-black text-xs font-semibold"
                    >
                      <Plus size={12} /> Add Lesson
                    </button>
                  </div>

                  {!lessons[m.id] ? (
                    <div className="w-5 h-5 rounded-full border-2 border-infinder-green border-t-transparent animate-spin" />
                  ) : lessons[m.id].length === 0 ? (
                    <p className="text-xs text-gray-400">No lessons yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {lessons[m.id].map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-3 py-2">
                          <div className="min-w-0">
                            <span className="text-xs text-gray-400 mr-2">#{l.order_index}</span>
                            <span className="text-sm text-gray-800 dark:text-gray-200">{l.title}</span>
                            <span className="text-xs text-gray-400 ml-2">{l.duration_minutes}min</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => { setEditingLesson(l); setLessonForm({ ...l, quiz: l.quiz ? JSON.stringify(l.quiz, null, 2) as unknown as Record<string, unknown> : null }); setActiveLessonModuleId(m.id); setLessonFormOpen(true); setMsg(''); }}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => { setDeletingLesson(l); setActiveLessonModuleId(m.id); }}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {/* Module Form Modal */}
        {moduleFormOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setModuleFormOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl my-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{editingModule ? 'Edit Module' : 'New Module'}</h3>
                <button onClick={() => setModuleFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                {([['Title', 'title'], ['Slug', 'slug']] as [string, keyof LearningModule][]).map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input type="text" className={inputCls} value={(moduleForm[key] as string) ?? ''} onChange={(e) => setModuleForm((p) => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                  <textarea rows={2} className={`${inputCls} resize-none`} value={(moduleForm.description as string) ?? ''} onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulty</label>
                  <select className={selectCls} value={(moduleForm.difficulty as string) ?? 'beginner'} onChange={(e) => setModuleForm((p) => ({ ...p, difficulty: e.target.value }))}>
                    {['beginner', 'intermediate', 'advanced'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                    <input type="number" className={inputCls} value={moduleForm.duration_minutes ?? ''} onChange={(e) => setModuleForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order Index</label>
                    <input type="number" className={inputCls} value={moduleForm.order_index ?? ''} onChange={(e) => setModuleForm((p) => ({ ...p, order_index: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              {msg && <p className="text-xs text-red-500 mt-2">{msg}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setModuleFormOpen(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={saveModule} disabled={moduleSaving || !moduleForm.title || !moduleForm.slug} className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50">
                  {moduleSaving ? '…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Lesson Form Modal */}
        {lessonFormOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setLessonFormOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl my-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{editingLesson ? 'Edit Lesson' : 'New Lesson'}</h3>
                <button onClick={() => setLessonFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title</label>
                  <input type="text" className={inputCls} value={(lessonForm.title as string) ?? ''} onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Content</label>
                  <textarea rows={5} className={`${inputCls} resize-none`} value={(lessonForm.content as string) ?? ''} onChange={(e) => setLessonForm((p) => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                    <input type="number" className={inputCls} value={lessonForm.duration_minutes ?? ''} onChange={(e) => setLessonForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order Index</label>
                    <input type="number" className={inputCls} value={lessonForm.order_index ?? ''} onChange={(e) => setLessonForm((p) => ({ ...p, order_index: Number(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quiz JSON (optional)</label>
                  <textarea rows={3} className={`${inputCls} resize-none font-mono text-xs`} placeholder='{"question": "...", "options": [...], "answer": 0}' value={(lessonForm.quiz as unknown as string) ?? ''} onChange={(e) => setLessonForm((p) => ({ ...p, quiz: e.target.value as unknown as Record<string, unknown> }))} />
                </div>
              </div>
              {msg && <p className="text-xs text-red-500 mt-2">{msg}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setLessonFormOpen(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={saveLesson} disabled={lessonSaving || !lessonForm.title || !lessonForm.content} className="flex-1 py-2 rounded-xl bg-infinder-lime text-infinder-black text-sm font-semibold disabled:opacity-50">
                  {lessonSaving ? '…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Module Confirmation */}
        {deletingModule && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingModule(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Module</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Delete <span className="font-semibold">{deletingModule.title}</span> and all its lessons? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingModule(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={confirmDeleteModule} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Lesson Confirmation */}
        {deletingLesson && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingLesson(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Lesson</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Delete <span className="font-semibold">{deletingLesson.title}</span>? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingLesson(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={confirmDeleteLesson} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                  {deleting ? '…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section: Portfolios ─────────────────────────────────────────────────────

function PortfoliosSection() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [closingPortfolio, setClosingPortfolio] = useState<Portfolio | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/portfolios', { params: { page } });
      setPortfolios(r.data.portfolios);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function confirmClose() {
    if (!closingPortfolio) return;
    setCloseLoading(true);
    try {
      await api.patch(`/api/admin/portfolios/${closingPortfolio.id}`, { status: 'closed' });
      setClosingPortfolio(null);
      load();
    } finally {
      setCloseLoading(false);
    }
  }

  return (
    <div>
      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-infinder-green border-t-transparent animate-spin mx-auto mt-8" />
      ) : portfolios.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No portfolios found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['User', 'Portfolio', 'Status', 'Sharia', 'Amount', 'Assets', 'Created', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {portfolios.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="text-xs text-gray-700 dark:text-gray-300">{p.user?.email}</p>
                    <p className="text-xs text-gray-400">{p.user?.full_name || '—'}</p>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white text-sm">{p.name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                    {p.is_sharia ? <CheckCircle size={14} className="text-green-500" /> : <X size={14} className="text-gray-400" />}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">EGP {Number(p.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                    {p.allocation ? Object.keys(p.allocation).length : 0}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    {p.status === 'active' && (
                      <button
                        onClick={() => setClosingPortfolio(p)}
                        className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-medium"
                      >
                        Close
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

      <AnimatePresence>
        {closingPortfolio && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setClosingPortfolio(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Force-Close Portfolio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Close <span className="font-semibold">{closingPortfolio.name}</span> for {closingPortfolio.user?.email}? This cannot be reopened.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setClosingPortfolio(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={confirmClose} disabled={closeLoading} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                  {closeLoading ? '…' : 'Close Portfolio'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Section = 'overview' | 'users' | 'kyc' | 'deposits' | 'products' | 'revenue' | 'transactions' | 'learning' | 'portfolios';

const NAV: { id: Section; icon: React.FC<{ size?: number; className?: string }>; labelKey: string }[] = [
  { id: 'overview',     icon: LayoutDashboard, labelKey: 'admin_nav_overview' },
  { id: 'users',        icon: Users,           labelKey: 'admin_nav_users' },
  { id: 'kyc',          icon: ShieldCheck,     labelKey: 'admin_nav_kyc' },
  { id: 'deposits',     icon: ArrowDownCircle, labelKey: 'admin_nav_deposits' },
  { id: 'products',     icon: Package,         labelKey: 'admin_nav_products' },
  { id: 'revenue',      icon: BarChart2,       labelKey: 'admin_nav_revenue' },
  { id: 'transactions', icon: ArrowLeftRight,  labelKey: 'admin_nav_transactions' },
  { id: 'learning',     icon: BookOpen,        labelKey: 'Learning' },
  { id: 'portfolios',   icon: Briefcase,       labelKey: 'Portfolios' },
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
                {active === 'learning'     && <LearningSection />}
                {active === 'portfolios'   && <PortfoliosSection />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
