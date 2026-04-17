import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await register({ email, password, full_name, phone, sharia_mode });
      nav('/onboarding/review', { replace: true });
    } catch {
      setErr('Could not create account. Email may already be in use.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <Logo />
        <Link to="/login" className="text-sm text-gray-600">
          Sign in
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <form onSubmit={onSubmit} className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex gap-2 text-xs text-gray-500 mb-6">
            <span className="font-semibold text-infinder-black">1. Personal</span>
            <span>—</span>
            <span>2. Verification</span>
            <span>—</span>
            <span>3. Review</span>
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-gray-600 text-sm mt-1">Let&apos;s get started with some basic information.</p>
          {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
          <label className="block mt-6 text-sm font-medium">Full name</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="Enter your full name"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <label className="block mt-4 text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="block mt-4 text-sm font-medium">Phone</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="+20 xxx xxx xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label className="block mt-4 text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <label className="mt-6 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 cursor-pointer">
            <input type="checkbox" checked={sharia_mode} onChange={(e) => setSharia(e.target.checked)} className="mt-1" />
            <span>
              <span className="font-medium block">Enable Sharia-compliant mode</span>
              <span className="text-sm text-gray-600">Only show halal investment options where applicable.</span>
            </span>
          </label>
          <button
            type="submit"
            className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
          >
            Continue to verification
          </button>
        </form>
      </div>
    </div>
  );
}
