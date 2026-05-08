import { useNavigate } from 'react-router-dom';
import { SubpageShell } from './AppShell';

export type LegalSection = {
  heading?: string;
  body: string;
};

type Props = {
  title: string;
  sections: LegalSection[];
};

export default function LegalPage({ title, sections }: Props) {
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

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{title}</h1>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h2 className="text-sm font-semibold text-infinder-lime uppercase tracking-wider mb-2">
                  {s.heading}
                </h2>
              )}
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">
          Last updated: May 2026
        </p>
      </div>
    </SubpageShell>
  );
}
