import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageShell } from '../components/AppShell';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I complete KYC verification?',
    a: 'After registering, you will be prompted to upload your National ID (front and back) and a selfie holding your ID. An optional address proof can also be submitted. Our compliance team reviews submissions within 1–3 business days. You will be notified of the outcome via your profile page.',
  },
  {
    q: 'How do I deposit funds?',
    a: 'Go to the Funding page and choose your preferred method: InstaPay, Bank Transfer, or Card. InstaPay and Bank Transfer generate a reference code — send the payment with that code as the reference and our team will credit your wallet. Card deposits are instant and credited automatically.',
  },
  {
    q: 'How long do withdrawals take?',
    a: 'Withdrawal requests are processed within 1–3 business days. Funds are sent to the bank account or InstaPay number associated with your account. A platform fee of 0.25% (minimum EGP 1.00) applies to each withdrawal.',
  },
  {
    q: 'What fees does INFINDER charge?',
    a: 'There are two fees: a 0.25% platform fee (minimum EGP 1.00) on investments and withdrawals, and a 2% card processing fee on card deposits. All fees are shown clearly before you confirm any transaction. There are no subscription or account maintenance fees.',
  },
  {
    q: 'How do I exit an investment?',
    a: 'Navigate to Invest → My Active Positions. Each active position has an Exit button. Confirming the exit closes the position and returns the original invested amount to your wallet. Exiting is irreversible and returns only the original amount — no simulated gains or losses are applied.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white">{q}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
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

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Help Center</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Answers to the most common questions about using INFINDER.
        </p>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-5">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 text-center">
          Still need help?{' '}
          <a href="/support" className="text-infinder-lime font-medium hover:underline">
            Contact support →
          </a>
        </p>

        <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">Last updated: May 2026</p>
      </div>
    </SubpageShell>
  );
}
