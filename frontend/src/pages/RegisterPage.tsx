import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sharia_mode, setSharia] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await register({ email, password, full_name, phone, sharia_mode });
      nav('/onboarding/review', { replace: true });
    } catch {
      setErr('Could not create account. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-infinder-black flex flex-col">
      {/* Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-infinder-lime/8 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative p-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-white">INFINDER</span>
        </Link>
        <Link to="/login" className="text-sm text-white/45 hover:text-white transition">
          Sign in
        </Link>
      </div>

      {/* Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-lg bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm"
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs mb-6">
            <span className="font-semibold text-infinder-lime bg-infinder-lime/10 border border-infinder-lime/25 rounded-full px-3 py-1">
              1. Personal
            </span>
            <span className="text-white/25">—</span>
            <span className="text-white/30">2. Verification</span>
            <span className="text-white/25">—</span>
            <span className="text-white/30">3. Review</span>
          </div>

          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-white/45 text-sm mt-1">Let's get started with some basic information.</p>

          {err && (
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
              {err}
            </div>
          )}

          {[
            { label: 'Full name', value: full_name, setter: setFullName, type: 'text', placeholder: 'Your full name' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'you@example.com' },
            { label: 'Phone', value: phone, setter: setPhone, type: 'tel', placeholder: '+20 xxx xxx xxxx' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '••••••••', minLength: 6 },
          ].map(({ label, value, setter, type, placeholder, minLength }) => (
            <div key={label} className="mt-5">
              <label className="block text-sm font-medium text-white/70">{label}</label>
              <input
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required={type !== 'tel'}
                minLength={minLength}
              />
            </div>
          ))}

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer hover:border-infinder-lime/25 transition">
            <input
              type="checkbox"
              checked={sharia_mode}
              onChange={(e) => setSharia(e.target.checked)}
              className="mt-0.5 accent-infinder-lime"
            />
            <span>
              <span className="font-medium text-white block text-sm">Enable Sharia-compliant mode</span>
              <span className="text-xs text-white/40 mt-0.5 block">Only show halal investment options where applicable.</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3.5 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(190,243,94,0.2)]"
          >
            {loading ? 'Creating account…' : 'Continue to verification →'}
          </button>
        </form>
      </div>
    </div>
  );
}
