import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const steps = [
  { title: 'Learn', desc: 'Master investing basics with bite-sized lessons.', icon: '📘', num: '01' },
  { title: 'Fund', desc: 'Add money easily with Instapay or bank transfer.', icon: '👛', num: '02' },
  { title: 'Invest', desc: 'Choose from stocks, bonds, gold, or smart baskets.', icon: '📈', num: '03' },
  { title: 'Grow', desc: 'Watch your investments compound over time.', icon: '🌱', num: '04' },
];

const features = [
  { icon: '🛡️', title: 'Safe & secure', desc: 'KYC identity checks and clear flows keep onboarding understandable and your funds protected.' },
  { icon: '📚', title: 'Learn as you go', desc: 'Short modules explain every concept before you commit a single pound.' },
  { icon: '✨', title: 'Smart guidance', desc: 'Chat with the AI assistant for a portfolio mix tailored to your goals and risk comfort.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-infinder-black">
      {/* Fixed header */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-infinder-black/80 backdrop-blur-md border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">
            i
          </span>
          <span className="font-bold tracking-tight text-white">INFINDER</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/learn" className="text-white/50 hover:text-white transition hidden sm:inline">
            Learn
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-white/20 px-4 py-2 font-medium text-white hover:bg-white/10 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-infinder-lime/8 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-infinder-lime/5 blur-[100px] pointer-events-none" />

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-infinder-lime/25 bg-infinder-lime/10 px-4 py-1.5 text-xs font-medium text-infinder-lime tracking-wide">
            🇪🇬 Built for Egypt · EGP-native
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white text-center max-w-4xl leading-[1.1]"
        >
          Your money,{' '}
          <span className="text-infinder-lime">working smarter.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-7 text-white/55 max-w-xl text-center text-lg leading-relaxed"
        >
          Beginner-friendly investing with education, AI guidance, and Sharia-aware options — all in EGP.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/register"
            className="rounded-full bg-infinder-lime text-infinder-black px-8 py-3.5 font-semibold text-sm shadow-[0_0_40px_rgba(190,243,94,0.35)] hover:shadow-[0_0_60px_rgba(190,243,94,0.5)] hover:scale-[1.02] transition-all duration-200"
          >
            Get started — it's free
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-white/20 text-white px-8 py-3.5 font-medium text-sm hover:bg-white/8 transition"
          >
            I have an account
          </Link>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mt-14 flex flex-wrap justify-center gap-6 text-white/30 text-xs tracking-wide"
        >
          <span>✓ KYC verified</span>
          <span>✓ Sharia-compliant options</span>
          <span>✓ AI-powered guidance</span>
          <span>✓ No hidden fees</span>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-infinder-lime text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              How it works
            </p>
            <h2 className="text-white text-3xl md:text-4xl font-bold">
              Four steps to grow your wealth
            </h2>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 hover:bg-white/[0.07] hover:border-infinder-lime/25 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-5">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs font-mono text-white/20 group-hover:text-infinder-lime/40 transition">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-lg">{s.title}</h3>
                <p className="text-white/45 text-sm mt-1.5 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-infinder-green text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Why INFINDER
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Built for beginners</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group p-7 rounded-2xl border border-gray-100 hover:border-infinder-lime/50 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-infinder-black flex items-center justify-center text-lg mb-5">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-infinder-lime px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <h2 className="text-infinder-black text-2xl md:text-3xl font-bold">
              Ready to start investing?
            </h2>
            <p className="text-infinder-black/55 text-sm mt-1.5">
              Create your account in under 2 minutes. No experience needed.
            </p>
          </div>
          <Link
            to="/register"
            className="rounded-full bg-infinder-black text-white font-semibold px-8 py-3.5 text-sm hover:opacity-85 transition shrink-0 shadow-lg"
          >
            Create free account →
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
