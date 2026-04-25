import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
        <h1 className="text-2xl font-bold">{t('admin_title')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('admin_sub')}</p>
        {msg && <p className="text-sm text-gray-700 mt-3">{msg}</p>}

        <div className="mt-6 space-y-4">
          {rows.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('admin_none')}</p>
          ) : (
            rows.map((u) => (
              <div key={u.id} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold">{u.full_name || '—'}</p>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{u.phone || t('admin_no_phone')} · {u.kyc_status}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
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
                      className="rounded-full border border-red-300 text-red-700 text-sm font-medium px-4 py-2"
                    >
                      {t('admin_reject')}
                    </button>
                  </div>
                  <input
                    className="text-xs border rounded-lg px-2 py-1 w-full sm:w-64"
                    placeholder={t('admin_reason_placeholder')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
