import { useNavigate } from 'react-router-dom';
import { SubpageShell } from '../components/AppShell';

export default function SupportPage() {
  const navigate = useNavigate();

  return (
    <SubpageShell>
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contact Support</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-10">
          Our support team is here to help with account issues, KYC verification, deposits, withdrawals, and anything else you need.
        </p>

        <div className="rounded-2xl bg-infinder-black text-white p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-infinder-lime/15 border border-infinder-lime/30 flex items-center justify-center text-2xl mb-4">
            ✉️
          </div>
          <p className="text-white/60 text-sm mb-2">Send us an email at</p>
          <a
            href="mailto:support@infinder.com"
            className="text-xl font-semibold text-infinder-lime hover:underline"
          >
            support@infinder.com
          </a>
          <p className="text-white/40 text-xs mt-4">Expected response time: within 24–48 hours</p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium text-gray-900 dark:text-white">When contacting support, please include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your registered email address</li>
            <li>A description of the issue</li>
            <li>Any relevant transaction IDs or reference codes</li>
          </ul>
        </div>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">Last updated: May 2026</p>
      </div>
    </SubpageShell>
  );
}
