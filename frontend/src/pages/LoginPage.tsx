import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await login(email, password);
      nav(loc.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      setErr('Invalid email or password.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4">
        <Logo />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-600 text-sm mt-1">Sign in to continue to your dashboard.</p>
          {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
          <label className="block mt-6 text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <label className="block mt-4 text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          <button
            type="submit"
            className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3 hover:opacity-95"
          >
            Sign in
          </button>
          <p className="text-center text-sm text-gray-600 mt-4">
            No account?{' '}
            <Link to="/register" className="font-medium text-infinder-black underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
