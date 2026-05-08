import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

type StatusData = {
  kyc_status: KycStatus;
  kyc_rejection_reason: string | null;
};

export default function KycReviewPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const res = await api.get('/api/kyc/status');
      setData(res.data);
    } catch {
      // keep existing data on transient error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Poll every 30s while pending
    const interval = setInterval(() => {
      if (data?.kyc_status === 'pending') fetchStatus();
    }, 30_000);
    return () => clearInterval(interval);
  }, [data?.kyc_status]);

  const stepLabels = [t('kyc_step_personal'), t('kyc_step_verification'), t('kyc_step_review')];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinder-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <Logo />
      </div>

      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-8 w-full max-w-md justify-center">
        <span className="text-infinder-green font-semibold">{stepLabels[0]}</span>
        <span className="text-infinder-green font-semibold">{stepLabels[1]}</span>
        <span className="font-semibold text-infinder-black dark:text-white">{stepLabels[2]}</span>
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] p-10 shadow-sm dark:shadow-none text-center">
        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-infinder-lime border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Checking status…</p>
          </div>
        ) : data?.kyc_status === 'not_started' ? (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-2xl mb-4">
              📋
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Identity</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              You haven't submitted your identity documents yet. Complete KYC to unlock investing and deposits.
            </p>
            <button
              type="button"
              onClick={() => nav('/register')}
              className="mt-8 inline-block w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
            >
              Complete KYC
            </button>
            <Link to="/dashboard" className="mt-3 block text-sm text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition">
              Go to Dashboard
            </Link>
          </>
        ) : data?.kyc_status === 'approved' ? (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl mb-4">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Verified</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Your identity has been verified. You can now invest and deposit funds.
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-block w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
            >
              {t('kyc_go_dashboard')}
            </Link>
          </>
        ) : data?.kyc_status === 'rejected' ? (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl mb-4">
              ✗
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h1>
            {data.kyc_rejection_reason && (
              <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-left">
                {data.kyc_rejection_reason}
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              Please re-submit with clearer, valid documents.
            </p>
            <button
              type="button"
              onClick={() => nav('/register')}
              className="mt-6 inline-block w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
            >
              Resubmit Documents
            </button>
            <Link to="/dashboard" className="mt-3 block text-sm text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition">
              Go to Dashboard
            </Link>
          </>
        ) : (
          /* pending */
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-infinder-lime flex items-center justify-center text-2xl mb-4">
              ⏱
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('kyc_title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{t('kyc_sub')}</p>
            <div className="mt-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] p-4 text-left text-sm">
              <div className="flex justify-between mb-3">
                <span className="text-gray-600 dark:text-gray-400">{t('kyc_progress_label')}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">Under review</span>
              </div>
              <div className="flex gap-2">
                {['Documents received', 'Identity check', 'Compliance review'].map((s, i) => (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-full h-1.5 rounded-full ${i === 0 ? 'bg-infinder-green' : 'bg-gray-200 dark:bg-white/10'}`} />
                    <span className="text-[10px] text-gray-400 dark:text-white/30 text-center leading-tight">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              to="/dashboard"
              className="mt-8 inline-block w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
            >
              {t('kyc_go_dashboard')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
