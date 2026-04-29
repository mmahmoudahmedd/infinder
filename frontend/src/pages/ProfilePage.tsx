import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

type Tx = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  status: string;
  reference?: string | null;
};

function downloadCsv(rows: Tx[]) {
  const header = ['date', 'type', 'amount', 'status', 'reference'];
  const lines = [
    header.join(','),
    ...rows.map((t) =>
      [
        new Date(t.created_at).toISOString(),
        t.type,
        t.amount,
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

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout, updateProfile, refreshMe } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [learnPct, setLearnPct] = useState(0);

  const kycLabel: Record<string, string> = {
    pending: t('profile_kyc_pending'),
    under_review: t('profile_kyc_under_review'),
    approved: t('profile_kyc_approved'),
    rejected: t('profile_kyc_rejected'),
  };

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    api
      .get('/api/payments/history')
      .then((r) => setTxs(r.data.transactions))
      .catch(() => {});
    api
      .get('/api/learning/modules')
      .then((r) => {
        const mods = r.data.modules || [];
        const total = mods.reduce((s: number, m: { lesson_count?: number }) => s + (m.lesson_count || 0), 0);
        const done = mods.reduce((s: number, m: { completed_lessons?: number }) => s + (m.completed_lessons || 0), 0);
        setLearnPct(total ? Math.round((done / total) * 100) : 0);
      })
      .catch(() => {});
  }, []);

  const investmentRows = useMemo(() => txs.filter((tx) => tx.type === 'investment'), [txs]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setMsg('');
    try {
      await updateProfile({ full_name: fullName || undefined, phone: phone || undefined });
      await refreshMe();
      setMsg(t('profile_saved'));
    } catch {
      setMsg(t('profile_save_error'));
    } finally {
      setSaving(false);
    }
  }

  function copyRef() {
    if (user?.deposit_ref_code) {
      navigator.clipboard.writeText(user.deposit_ref_code);
      setMsg(t('profile_ref_copied'));
    }
  }

  if (!user) return null;

  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();

  return (
    <SubpageShell>
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            user.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
            user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
          }`}>
            {kycLabel[user.kyc_status] || user.kyc_status}
          </span>
          <div className="flex gap-2 ml-auto">
            <Link to="/reports" className="rounded-full bg-white/10 text-white text-xs font-medium px-3 py-1.5 hover:bg-white/20 transition">{t('profile_analytics_btn')}</Link>
            <Link to="/funding" className="rounded-full bg-infinder-lime text-infinder-black text-xs font-semibold px-3 py-1.5">{t('profile_funding_btn')}</Link>
          </div>
        </div>
        {user.kyc_rejection_reason && <p className="text-xs text-red-400 mt-3">{user.kyc_rejection_reason}</p>}
      </div>

      {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-lg">{t('profile_account_details')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('profile_account_sub')}</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-600">{t('profile_full_name')}</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">{t('profile_phone')}</span>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-lg">{t('profile_deposit_ref')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('profile_deposit_ref_sub')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-gray-100 px-4 py-3">
              <code className="text-lg font-bold text-infinder-green tracking-tight">{user.deposit_ref_code || '—'}</code>
              <button
                type="button"
                onClick={copyRef}
                className="text-sm underline text-gray-700"
                disabled={!user.deposit_ref_code}
              >
                {t('profile_copy')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <h2 className="font-semibold text-lg">{t('profile_wallet')}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsv(txs)}
                  className="text-sm font-medium text-infinder-black underline"
                  disabled={txs.length === 0}
                >
                  {t('profile_export_csv')}
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-600">{t('profile_available')}</span>
              <span className="font-semibold">EGP {user.wallet_balance.toFixed(2)}</span>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Link
                to="/funding"
                className="flex-1 min-w-[120px] rounded-xl border border-gray-200 py-3 text-center font-medium hover:border-infinder-black"
              >
                {t('profile_add_funds')}
              </Link>
              <Link
                to="/funding"
                className="flex-1 min-w-[120px] rounded-xl border border-gray-200 py-3 text-center text-gray-700 hover:border-infinder-black"
              >
                {t('profile_withdraw')}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">{t('profile_investments')}</h2>
            {investmentRows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                <div className="text-3xl mb-2">📅</div>
                {t('profile_no_investments')}
              </div>
            ) : (
              <ul className="mt-4 space-y-2 text-sm max-h-64 overflow-y-auto">
                {investmentRows.map((tx) => (
                  <li key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0">📈</div>
                      <span className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <span className="font-semibold text-blue-700">EGP {tx.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">{t('profile_transactions')}</h2>
            {txs.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">{t('profile_no_transactions')}</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm max-h-72 overflow-y-auto">
                {txs.map((tx) => (
                  <li key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                        tx.type === 'deposit' ? 'bg-green-100' : tx.type === 'withdrawal' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {tx.type === 'deposit' ? '💵' : tx.type === 'withdrawal' ? '↩️' : '📈'}
                      </div>
                      <div>
                        <span className="text-sm font-medium capitalize text-gray-700">{tx.type}</span>
                        <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${
                      tx.type === 'deposit' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-600' : 'text-blue-700'
                    }`}>
                      {tx.type === 'withdrawal' ? '−' : '+'}EGP {tx.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg shrink-0">☪️</div>
              <div className="flex-1">
                <p className="font-medium">{t('profile_sharia_mode')}</p>
                <p className="text-sm text-gray-600">{t('profile_sharia_desc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={user.sharia_mode}
                onClick={() => updateProfile({ sharia_mode: !user.sharia_mode })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${user.sharia_mode ? 'bg-infinder-green' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${user.sharia_mode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <button
              type="button"
              className="mt-6 text-red-600 text-sm font-medium flex items-center gap-2"
              onClick={() => { logout(); window.location.href = '/'; }}
            >
              {t('profile_sign_out')}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            <h2 className="font-semibold text-infinder-black mb-3">{t('profile_achievements')}</h2>
            <p>{t('profile_achievements_sub')}</p>
            <Link to="/rewards" className="inline-block mt-3 text-infinder-black font-medium underline text-sm">
              {t('profile_open_rewards')}
            </Link>
          </div>
          <div className="rounded-2xl bg-infinder-black text-white p-5">
            <h2 className="font-semibold">{t('profile_learning')}</h2>
            <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-infinder-lime rounded-full transition-all"
                style={{ width: `${learnPct}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-2">{learnPct}{t('profile_learning_pct')}</p>
            <Link
              to="/learn"
              className="mt-4 inline-block w-full text-center rounded-full border border-white py-2 text-sm font-medium"
            >
              {t('profile_continue_learning')}
            </Link>
          </div>
        </div>
      </div>
    </SubpageShell>
  );
}
