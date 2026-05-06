import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { SubpageShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../lib/swal';

type Msg = { role: 'user' | 'assistant'; content: string };
type Alloc = { stocks: number; baskets: number; bonds: number; gold: number };

const COLORS = ['#BEF35E', '#76D74F', '#9CA3AF', '#FBBF24'];

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function SmartAssistant() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const [mode, setMode] = useState<'chat' | 'wizard'>('chat');

  // Label maps (inside component so t() is available)
  const GOAL_LABELS: Record<string, string> = {
    preserve: t('wizard_goal_preserve_label'),
    grow: t('wizard_goal_grow_label'),
  };
  const HORIZON_LABELS: Record<string, string> = {
    short: t('wizard_horizon_short_label'),
    medium: t('wizard_horizon_medium_label'),
    long: t('wizard_horizon_long_label'),
  };
  const RISK_LABELS: Record<string, string> = {
    low: t('wizard_risk_low_label'),
    medium: t('wizard_risk_medium_label'),
    high: t('wizard_risk_high_label'),
  };

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alloc, setAlloc] = useState<Alloc | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isSharia, setIsSharia] = useState<boolean | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<string | null>(null);
  const [risk, setRisk] = useState<string | null>(null);
  const [sharia, setSharia] = useState<boolean | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [wizardAlloc, setWizardAlloc] = useState<Alloc | null>(null);
  const [wizardLabel, setWizardLabel] = useState('');
  const [wizardExplanation, setWizardExplanation] = useState('');

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

  const breakdownRows = useMemo(() => {
    const a = mode === 'chat' ? alloc : wizardAlloc;
    const amt = Number(investAmount);
    if (!a || !amt || amt <= 0) return [];
    const labels: Record<string, string> = {
      stocks: 'Stocks',
      baskets: 'Baskets',
      bonds: 'Bonds',
      gold: 'Gold',
    };
    return (['stocks', 'baskets', 'bonds', 'gold'] as const)
      .filter((k) => a[k] > 0)
      .map((k) => ({ key: k, label: labels[k], egp: (a[k] / 100) * amt }));
  }, [alloc, wizardAlloc, investAmount, mode]);

  const overBalance = !!user && Number(investAmount) > 0 && Number(investAmount) > user.wallet_balance;

  async function sendChat() {
    const text = input.trim();
    if (!text) return;
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
      setMessages((m) => [...m, { role: 'assistant', content: data.message || '' }]);
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
      showAlert('Request failed', t('chat_error_failed'));
    } finally {
      setLoading(false);
    }
  }

  async function confirmWizard() {
    if (!goal || !horizon || !risk || sharia === null) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/investments/robo', {
        goal,
        horizon,
        risk,
        isSharia: sharia,
      });
      setWizardAlloc(data.allocation);
      setWizardLabel(data.label || 'Suggested portfolio');
      setWizardExplanation(data.explanation || '');
      setWizardStep(6);
    } catch {
      showAlert('Error', t('wizard_error_robo'));
    } finally {
      setLoading(false);
    }
  }

  async function confirmInvest() {
    const amount = Number(investAmount);
    const a = mode === 'chat' ? alloc : wizardAlloc;
    if (!a || !amount || amount <= 0) {
      showAlert('Invalid amount', t('common_invest_error'), 'warning');
      return;
    }
    try {
      await api.post('/api/investments/apply', {
        amount,
        allocation: a,
        reasoning: mode === 'chat' ? reasoning : wizardExplanation,
        is_sharia: mode === 'chat' ? !!isSharia : !!sharia,
        name: wizardLabel,
      });
      await refreshMe();
      setInvestAmount('');
      if (mode === 'chat') {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: t('chat_invest_recorded') },
        ]);
      } else {
        resetWizard();
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } } };
      showAlert('Investment failed', ax.response?.data?.error || t('common_invest_failed'));
    }
  }

  function resetChat() {
    setMessages([]);
    setAlloc(null);
    setReasoning(null);
    setIsSharia(null);
    setInvestAmount('');
  }

  function resetWizard() {
    setWizardStep(0);
    setGoal(null);
    setHorizon(null);
    setRisk(null);
    setSharia(null);
    setWizardAlloc(null);
    setWizardLabel('');
    setWizardExplanation('');
    setInvestAmount('');
  }

  if (!user) return null;

  return (
    <SubpageShell>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setMode('chat'); resetWizard(); }}
          className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'chat' ? 'bg-infinder-black text-white' : 'border border-gray-300'}`}
        >
          {t('chat_mode_btn')}
        </button>
        <button
          type="button"
          onClick={() => { setMode('wizard'); resetChat(); resetWizard(); }}
          className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'wizard' ? 'bg-infinder-black text-white' : 'border border-gray-300'}`}
        >
          {t('wizard_mode_btn')}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-6">
        {t('chat_disclaimer')}
      </p>

      {/* CHAT MODE */}
      {mode === 'chat' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl border border-gray-200 bg-white flex flex-col h-[480px]">
            <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-infinder-green" />
              {t('chat_title')}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {messages.length === 0 && (
                <p className="text-gray-600">
                  {t('chat_greeting')}
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span
                    className={`inline-block rounded-2xl px-3 py-2 max-w-[95%] ${
                      m.role === 'user'
                        ? 'bg-infinder-lime text-infinder-black'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {loading && <p className="text-gray-500 text-sm">{t('chat_thinking')}</p>}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder={t('chat_placeholder')}
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
                {t('chat_send')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {alloc ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-semibold text-lg">{t('chat_alloc_title')}</h2>
                <div className="h-56 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {reasoning && <p className="text-sm text-gray-700 mt-2">{reasoning}</p>}
                {isSharia !== null && (
                  <p className="text-xs text-gray-500 mt-2">{t('chat_sharia_pref')} {isSharia ? t('chat_sharia_yes') : t('chat_sharia_no')}</p>
                )}
                <label className="block mt-4 text-sm font-medium">{t('common_invest_amount_label')}</label>
                <div className="mt-1 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-3 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-2 outline-none text-sm"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() => setInvestAmount(String(user.wallet_balance))}
                    className="px-3 text-xs font-semibold text-infinder-black bg-infinder-lime/80 hover:bg-infinder-lime transition shrink-0"
                  >
                    {t('invest_all_btn')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: EGP {user.wallet_balance.toFixed(2)}</p>
                {overBalance && (
                  <p className="text-xs text-red-500 mt-1">{t('invest_insufficient')}</p>
                )}
                {breakdownRows.length > 0 && (
                  <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 space-y-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('invest_breakdown_title')}</p>
                    {breakdownRows.map((r) => (
                      <div key={r.key} className="flex justify-between text-xs text-gray-700">
                        <span>{r.label}</span>
                        <span className="font-medium">EGP {r.egp.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={confirmInvest}
                  disabled={overBalance || !investAmount || Number(investAmount) <= 0}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('common_invest_confirm')}
                </button>
                <button type="button" onClick={resetChat} className="mt-3 w-full rounded-xl border border-gray-300 py-2 text-sm">
                  {t('common_start_over')}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
                {t('chat_alloc_placeholder')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WIZARD MODE */}
      {mode === 'wizard' && (
        <div className="max-w-xl mx-auto">
          {wizardStep < 6 && (
            <div className="flex items-center gap-3 mb-6">
              {wizardStep > 0 && (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => s - 1)}
                  className="text-sm text-gray-500 hover:text-infinder-black flex items-center gap-1 shrink-0"
                >
                  {t('common_back')}
                </button>
              )}
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      wizardStep > s
                        ? 'bg-infinder-green'
                        : wizardStep === s
                        ? 'bg-infinder-lime'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {wizardStep === 0 && (
              <motion.div key="s0" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_goal_title')}</h2>
                <p className="text-center text-sm text-gray-600 mt-1">{t('wizard_goal_sub')}</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  {[
                    { id: 'preserve', title: t('wizard_goal_preserve'), desc: t('wizard_goal_preserve_desc') },
                    { id: 'grow', title: t('wizard_goal_grow'), desc: t('wizard_goal_grow_desc') },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { setGoal(opt.id); setWizardStep(1); }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green transition-colors"
                    >
                      <p className="font-semibold">{opt.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {wizardStep === 1 && (
              <motion.div key="s1" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_horizon_title')}</h2>
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                  {[
                    { id: 'short', t: t('wizard_horizon_short'), d: t('wizard_horizon_short_desc') },
                    { id: 'medium', t: t('wizard_horizon_medium'), d: t('wizard_horizon_medium_desc') },
                    { id: 'long', t: t('wizard_horizon_long'), d: t('wizard_horizon_long_desc') },
                  ].map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => { setHorizon(h.id); setWizardStep(2); }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green transition-colors text-sm"
                    >
                      <p className="font-semibold">{h.t}</p>
                      <p className="text-gray-600 mt-1">{h.d}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {wizardStep === 2 && (
              <motion.div key="s2" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_risk_title')}</h2>
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                  {[
                    { id: 'low', t: t('wizard_risk_low'), d: t('wizard_risk_low_desc') },
                    { id: 'medium', t: t('wizard_risk_medium'), d: t('wizard_risk_medium_desc') },
                    { id: 'high', t: t('wizard_risk_high'), d: t('wizard_risk_high_desc') },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { setRisk(r.id); setWizardStep(3); }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green transition-colors"
                    >
                      <p className="font-semibold text-sm">{r.t}</p>
                      <p className="text-gray-500 mt-1 text-xs">{r.d}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {wizardStep === 3 && (
              <motion.div key="s3" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_sharia_title')}</h2>
                <p className="text-center text-sm text-gray-600 mt-1">{t('wizard_sharia_sub')}</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  {[
                    { id: true, title: t('wizard_sharia_yes'), desc: t('wizard_sharia_yes_desc') },
                    { id: false, title: t('wizard_sharia_no'), desc: t('wizard_sharia_no_desc') },
                  ].map((opt) => (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => { setSharia(opt.id); setWizardStep(4); }}
                      className="rounded-2xl border border-gray-200 p-4 text-left hover:border-infinder-green transition-colors"
                    >
                      <p className="font-semibold">{opt.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {wizardStep === 4 && (
              <motion.div key="s4" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_amount_title')}</h2>
                <p className="text-center text-sm text-gray-600 mt-1">
                  {t('wizard_amount_available')} EGP {user.wallet_balance.toFixed(2)}
                </p>
                <div className="mt-6 flex rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-4 flex items-center bg-gray-50 text-sm text-gray-600">EGP</span>
                  <input
                    className="flex-1 px-3 py-3 outline-none text-sm"
                    placeholder={t('wizard_amount_placeholder')}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    inputMode="decimal"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setInvestAmount(String(user.wallet_balance))}
                    className="px-3 text-xs font-semibold text-infinder-black bg-infinder-lime/80 hover:bg-infinder-lime transition shrink-0"
                  >
                    {t('invest_all_btn')}
                  </button>
                </div>
                {overBalance && (
                  <p className="text-xs text-red-500 mt-1">{t('invest_insufficient')}</p>
                )}
                <button
                  type="button"
                  disabled={!investAmount || Number(investAmount) <= 0 || overBalance}
                  onClick={() => setWizardStep(5)}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-40 transition-opacity"
                >
                  {t('wizard_continue')}
                </button>
              </motion.div>
            )}

            {wizardStep === 5 && (
              <motion.div key="s5" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-center">{t('wizard_confirm_title')}</h2>
                <div className="mt-6 rounded-xl bg-gray-50 p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('wizard_goal_label')}</span>
                    <span className="font-medium">{goal ? GOAL_LABELS[goal] : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('wizard_horizon_label')}</span>
                    <span className="font-medium">{horizon ? HORIZON_LABELS[horizon] : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('wizard_risk_label')}</span>
                    <span className="font-medium">{risk ? RISK_LABELS[risk] : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('wizard_sharia_label')}</span>
                    <span className="font-medium">{sharia ? t('wizard_sharia_yes') : t('wizard_sharia_no')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-gray-500">{t('wizard_amount_label')}</span>
                    <span className="font-semibold">EGP {Number(investAmount).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={confirmWizard}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 disabled:opacity-50"
                >
                  {loading ? t('wizard_loading') : t('wizard_get_portfolio')}
                </button>
              </motion.div>
            )}

            {wizardStep === 6 && wizardAlloc && (
              <motion.div key="s6" {...slide} transition={{ duration: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold">{wizardLabel}</h2>
                {wizardExplanation && (
                  <p className="text-sm text-gray-600 mt-2">{wizardExplanation}</p>
                )}
                <div className="h-56 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  {t('wizard_investing_label')} <span className="font-semibold text-infinder-black">EGP {Number(investAmount).toLocaleString()}</span>
                </p>
                <button
                  type="button"
                  onClick={confirmInvest}
                  className="mt-4 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3"
                >
                  {t('wizard_invest_now')}
                </button>
                <button type="button" onClick={resetWizard} className="mt-3 w-full rounded-xl border border-gray-300 py-2 text-sm">
                  {t('common_start_over')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p className="mt-8 text-sm">
        <Link to="/dashboard" className="underline">
          {t('chat_back_dashboard')}
        </Link>
      </p>
    </SubpageShell>
  );
}
