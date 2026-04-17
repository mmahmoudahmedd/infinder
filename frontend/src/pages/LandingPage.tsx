import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';

const steps = [
  { title: 'Learn', desc: 'Master investing basics with bite-sized lessons.', icon: '📘' },
  { title: 'Fund', desc: 'Add money easily with Instapay or bank transfer.', icon: '👛' },
  { title: 'Invest', desc: 'Choose from stocks, bonds, gold, or smart baskets.', icon: '📈' },
  { title: 'Grow', desc: 'Watch your investments grow over time.', icon: '➡️' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <Link to="/learn" className="text-gray-600 hover:text-infinder-black hidden sm:inline">
            Learn
          </Link>
          <Link to="/login" className="rounded-full border border-infinder-black px-4 py-2 font-medium hover:bg-infinder-black hover:text-white transition">
            Sign In
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Find your smart investment
        </motion.h1>
        <p className="mt-4 text-gray-600 max-w-xl mx-auto">Beginner-friendly, educational, and Sharia-aware — built for real life in EGP.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="rounded-full bg-infinder-lime text-infinder-black px-8 py-3 font-semibold shadow-glow hover:opacity-95"
          >
            Get started
          </Link>
          <Link to="/login" className="rounded-full border border-gray-300 px-8 py-3 font-medium hover:border-infinder-black">
            I have an account
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h3 className="font-semibold text-lg">{s.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{s.desc}</p>
          </motion.div>
        ))}
      </section>

      <section className="bg-infinder-black text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold">Built for beginners</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-8 text-sm text-gray-200">
            <div>
              <div className="text-infinder-lime text-xl mb-2">🛡️</div>
              <h3 className="text-white font-semibold mb-1">Safe &amp; secure</h3>
              <p>Identity checks and clear flows keep onboarding understandable.</p>
            </div>
            <div>
              <div className="text-infinder-lime text-xl mb-2">📚</div>
              <h3 className="text-white font-semibold mb-1">Learn as you go</h3>
              <p>Short modules explain concepts before you commit.</p>
            </div>
            <div>
              <div className="text-infinder-lime text-xl mb-2">✨</div>
              <h3 className="text-white font-semibold mb-1">Smart guidance</h3>
              <p>Chat with the assistant for explanations tailored to you.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
