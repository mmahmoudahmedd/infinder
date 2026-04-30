import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { AppShell } from '../components/AppShell';

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const color = colorMap[normalized] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await api.get('/api/admin/kyc');
    setRows(r.data.submissions);
  }

  useEffect(() => {
    load().catch(() => setMsg(t('admin_load_error')));
  }, []);

  async function approve(id: string) {
    setMsg('');
    await api.post('/api/admin/kyc/approve', { userId: id });
    setMsg(t('admin_approved_msg'));
    await load();
  }

  async function reject(id: string) {
    setMsg('');
    await api.post('/api/admin/kyc/reject', { userId: id, reason: reason || 'Please resubmit documents.' });
    setMsg(t('admin_rejected_msg'));
    setReason('');
    await load();
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl font-bold">{t('admin_title')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('admin_sub')}</p>
        {msg && <p className="text-sm text-gray-700 mt-3">{msg}</p>}

        <div className="mt-6 space-y-0">
          {rows.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('admin_none')}</p>
          ) : (
            rows.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 mb-3"
              >
                <div>
                  <p className="font-semibold">{u.full_name || '—'}</p>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{u.phone || t('admin_no_phone')}</p>
                  <div className="mt-2">
                    <StatusBadge status={u.kyc_status} />
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2 sm:min-w-[200px]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => approve(u.id)}
                      className="rounded-full bg-infinder-lime text-infinder-black text-sm font-semibold px-4 py-2"
                    >
                      {t('admin_approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(u.id)}
                      className="rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors text-sm font-medium px-4 py-2"
                    >
                      {t('admin_reject')}
                    </button>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs text-gray-500 mb-1">{t('admin_reason_placeholder')}</label>
                    <input
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full"
                      placeholder={t('admin_reason_placeholder')}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
