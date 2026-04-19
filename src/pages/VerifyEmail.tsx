import { motion } from 'framer-motion';
import { MailCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function VerifyEmail() {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  // Fall back to the most recently registered email if the user reloads.
  const email = stateEmail || localStorage.getItem('scanza_pending_email') || 'your email';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden antialiased">
      {/* Ambient luxury glows */}
      <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-emerald-500/10 blur-[160px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-purple-600/10 blur-[160px] rounded-full animate-pulse" />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

      <div className="w-full max-w-md relative">
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-purple-600 shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
              <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-2xl font-extrabold tracking-wider text-white">
              SCANZA <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/80 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 pointer-events-none" />

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 180 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative z-10"
          >
            <MailCheck size={40} className="text-white" />
          </motion.div>

          <h1 className="text-2xl font-extrabold tracking-tight mb-3 relative z-10">
            Verify Your Email
          </h1>

          <p className="text-sm text-white/70 leading-relaxed mb-8 relative z-10">
            We have sent you a verification email to{' '}
            <span className="text-emerald-400 font-semibold break-all">{email}</span>
            . Please verify it and log in.
          </p>

          <Link
            to="/login"
            className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-purple-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:brightness-110 transition-all duration-300 group"
          >
            Login
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <p className="text-center mt-6 text-xs text-white/40 font-medium">
          Didn’t receive it? Check your spam folder or try signing in to resend.
        </p>
      </div>
    </div>
  );
}
