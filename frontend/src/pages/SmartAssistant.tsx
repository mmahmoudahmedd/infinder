import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

type Msg = { role: 'user' | 'assistant'; content: string };
type Alloc = { stocks: number; baskets: number; bonds: number; gold: number };

const COLORS = ['#BEF35E', '#76D74F', '#9CA3AF', '#FBBF24'];

export default function SmartAssistant() {
  const { user, refreshMe } = useAuth();
  const [mode, setMode] = useState<'chat' | 'wizard'>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alloc, setAlloc] = useState<Alloc | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isSharia, setIsSharia] = useState<boolean | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [wizardStep, setWizardStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<string | null>(null);
  const [risk, setRisk] = useState<string | null>(null);
  const [wizardAlloc, setWizardAlloc] = useState<Alloc | null>(null);
  const [wizardLabel, setWizardLabel] = useState('');
  const [err, setErr] = useState('');

  const chartData = useMemo(() => {
    const a = mode === 'chat' ? alloc : wizardAlloc;
    if (!a) return [];
    return [
      { name: 'Stocks', value: a.stocks },
      { name: 'Baskets', value: a.baskets },
      { name: 'Bonds', value: a.bonds },
      { name: 'Gold', value: a.gold },
    ].filter((d) => d.value > 0);
  }, [alloc, wizardAlloc, mode]);

  async function sendChat() {
    const text = input.trim();
    if (!text) return;
    setErr('');
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data } = await api.post('/api/assistant/chat', {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        userProfile: {
          wallet_balance: user?.wallet_balance,
          sharia_mode: user?.sharia_mode,
          kyc_status: user?.kyc_status,
        },
      });
      const assistantText = data.message || '';
      setMessages((m) => [...m, { role: 'assistant', content: assistantText }]);
      if (data.allocation) {
        setAlloc(data.allocation);
        setReasoning(data.reasoning || null);
        setIsSharia(!!data.isSharia);
      } else {
        setAlloc(null);
        setReasoning(null);
        setIsSharia(null);
      }
    } catch {
      setErr('Assistant request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function finishWizardWithRisk(selectedRisk: string) {
    if (!goal || !horizon) return;
    setRisk(selectedRisk);
    const { data } = await api.post('/api/investments/robo', { goal, horizon, risk: selectedRisk });
    setWizardAlloc(data.allocation);
    setWizardLabel(data.label || 'Suggested portfolio');
    setWizardStep(3);
  }

  async function confirmInvest() {
    setErr('');
    const amount = Number(investAmount);
    const a = mode === 'chat' ? alloc : wizardAlloc;
    if (!a || !amount || amount <= 0) {
      setErr('Enter an amount and ensure you have a plan.');
      return;
    }
    try {
      await api.post('/api/investments/apply', {
        amount,
        allocation: a,
        reasoning: mode === 'chat' ? reasoning : `Wizard: ${wizardLabel}`,
        is_sharia: mode === 'chat' ? !!isSharia : user?.sharia_mode,
        name: wizardLabel,
      });
      await refreshMe();
      setErr('');
      setInvestAmount('');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Your investment was recorded. Check Profile for history.' },
      ]);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } } };
      setErr(ax.response?.data?.error || 'Could not invest.');
    }
  }

  function resetChat() {
    setMessages([]);
    setAlloc(null);
    setReasoning(null);
    setIsSharia(null);
    setInvestAmount('');
    setErr('');
  }

  function resetWizard() {
    setWizardStep(0);
    setGoal(null);
    setHorizon(null);
    setRisk(null);
    setWizardAlloc(null);
    setWizardLabel('');
    setInvestAmount('');
    setErr('');
  }

  if (!user) return null;

  return (
    <SubpageShell>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('chat');
            resetWizard();
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'chat' ? 'bg-infinder-black text-white' : 'border border-gray-300'}`}
        >
          Chat with AI
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('wizard');
            resetChat();
            resetWizard();
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'wizard' ? 'bg-infinder-black text-white' : 'border border-gray-300'}`}
        >
          Quick wizard
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-6">
        Educational only — not personalized financial advice. Speak with a licensed professional for your situation.
      </p>

      {mode === 'chat' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl border border-gray-200 bg-white flex flex-col h-[480px]">
            <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-infinder-green" />
              INFINDER Smart Assistant
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {messages.length === 0 && (
                <p className="text-gray-600">
                  Hi! I&apos;m here to help you think through goals, risk, and a simple mix across stocks, baskets, bonds, and gold.
                  What would you like to achieve?
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span
                    className={`inline-block rounded-2xl px-3 py-2 max-w-[95%] ${
                      m.role === 'user' ? 'bg-infinder-lime text-infinder-black' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {loading && <p className="text-gray-500 text-sm">Thinking…</p>}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Type your answer…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button
                type="button"
                onClick={sendChat}
                disabled={loading}
                className="rounded-xl bg-infinder-lime text-infinder-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {alloc && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-semibold text-lg">Your personalized allocation</h2>
                <div className="h-56 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {reasoning && <p className="text-sm text-gray-700 mt-2">{reasoning}</p>}
                {isSharia !== null && (
                  <p className="text-xs text-gray-500 mt-2">Sharia preference noted: {isSharia ? 'yes' : 'no'}</p>
                )}
                <label className="block mt-4 text-sm font-medium">How much would you like to invest?</label>
                <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-2 outline-none text-sm"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
                <button
                  type="button"
                  onClick={confirmInvest}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3"
                >
                  Confirm &amp; invest
                </button>
                <button type="button" onClick={resetChat} className="mt-3 w-full rounded-xl border border-gray-300 py-2 text-sm">
                  Start over
                </button>
              </div>
            )}
            {!alloc && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
                After a few messages, the assistant can output a suggested mix. It will appear here as a donut chart.
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'wizard' && (
        <div className="max-w-xl mx-auto">
          {wizardStep < 3 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex gap-1 mb-6">
                {[0, 1, 2].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${wizardStep >= s ? 'bg-infinder-green' : 'bg-gray-200'}`} />
                ))}
              </div>
              {wizardStep === 0 && (
                <>
                  <h2 className="text-xl font-semibold text-center">What&apos;s your primary goal?</h2>
                  <p className="text-center text-sm text-gray-600 mt-1">This helps us understand your objective.</p>
                  <div className="mt-6 grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setGoal('preserve');
                        setWizardStep(1);
                      }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green"
                    >
                      <p className="font-semibold">Save &amp; preserve</p>
                      <p className="text-sm text-gray-600 mt-1">Stable, lower-risk focus.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoal('grow');
                        setWizardStep(1);
                      }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green"
                    >
                      <p className="font-semibold">Grow &amp; build</p>
                      <p className="text-sm text-gray-600 mt-1">More growth-oriented mix.</p>
                    </button>
                  </div>
                </>
              )}
              {wizardStep === 1 && (
                <>
                  <h2 className="text-xl font-semibold text-center">How long do you plan to invest?</h2>
                  <div className="mt-6 grid sm:grid-cols-3 gap-3">
                    {[
                      { id: 'short', t: 'Short-term', d: 'Less than 2 years' },
                      { id: 'medium', t: 'Medium-term', d: '2–5 years' },
                      { id: 'long', t: 'Long-term', d: '5+ years' },
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setHorizon(h.id);
                          setWizardStep(2);
                        }}
                        className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green text-sm"
                      >
                        <p className="font-semibold">{h.t}</p>
                        <p className="text-gray-600 mt-1">{h.d}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {wizardStep === 2 && (
                <>
                  <h2 className="text-xl font-semibold text-center">How do you feel about risk?</h2>
                  <div className="mt-6 grid sm:grid-cols-3 gap-3">
                    {[
                      { id: 'low', t: 'Lower' },
                      { id: 'medium', t: 'Balanced' },
                      { id: 'high', t: 'Higher' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => finishWizardWithRisk(r.id)}
                        className="rounded-2xl border border-gray-200 py-4 font-medium hover:border-infinder-green"
                      >
                        {r.t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {wizardStep === 3 && wizardAlloc && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold">{wizardLabel}</h2>
              <p className="text-sm text-gray-600 mt-1">Mix of growth and stability (template).</p>
              <div className="h-56 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <label className="block mt-4 text-sm font-medium">How much would you like to invest?</label>
              <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
                <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                <input
                  className="flex-1 px-3 py-2 outline-none text-sm"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
              <button
                type="button"
                onClick={confirmInvest}
                className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3"
              >
                Invest now
              </button>
              <button type="button" onClick={resetWizard} className="mt-3 w-full rounded-xl border border-gray-300 py-2 text-sm">
                Start over
              </button>
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <p className="mt-8 text-sm">
        <Link to="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </SubpageShell>
  );
}
