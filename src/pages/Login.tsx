import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import BackButton from '../components/BackButton';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, formData.email, formData.password);

      // Block access if the email isn't verified yet. Resend the verification
      // email as a courtesy, sign the user out, and route them to the
      // verification screen.
      if (!credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } catch (resendErr) {
          console.error('Failed to resend verification email:', resendErr);
        }
        const pendingEmail = credential.user.email || formData.email;
        localStorage.setItem('scanza_pending_email', pendingEmail);
        await signOut(auth);
        navigate('/verify-email', { state: { email: pendingEmail } });
        return;
      }

      // Initialise token balance for first-time logins so the dashboard
      // can read it without showing 0 unexpectedly.
      if (localStorage.getItem('scanza_tokens') === null) {
        localStorage.setItem('scanza_tokens', '0');
      }

      navigate('/dashboard');
    } catch (err) {
      // Per spec: any sign-in failure shows the same friendly message.
      console.error('Firebase sign-in error:', err);
      setErrorMessage('Email or password is incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden antialiased select-none">
      <BackButton />
      {/* Luxury Ambient Glows */}
      <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-emerald-500/10 blur-[160px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-purple-600/10 blur-[160px] rounded-full animate-pulse duration-5000" />
      
      {/* Elegant Line Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

      <div className="w-full max-w-md relative">
        {/* Logo / Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-purple-600 shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
              <Shield className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-2xl font-extrabold tracking-wider text-white">
              SCANZA <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome <span className="text-emerald-400">Back</span>
          </h1>
          <p className="mt-2 text-sm text-white/50 font-medium">
            Login to access secure Turnitin AI scans instantly.
          </p>
        </motion.div>

        {/* Login Form Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-700"
        >
          {/* Subtle Border Glow Highlight */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400/60 transition-colors group-focus-within:text-emerald-400" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-light text-sm"
                  placeholder="name@university.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Password
                </label>
                <a href="#forgot" className="text-xs text-purple-400 hover:text-purple-300 transition font-medium">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/60" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all font-light text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Login Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-emerald-500/20 cursor-pointer text-sm tracking-wide"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <>
                  Secure Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          {/* Social Proof Or divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-[#0b0b0e] px-4 text-xs font-semibold text-white/30 uppercase tracking-widest absolute">
              OR
            </span>
          </div>

          {/* Quick SSO Actions */}
          <div className="grid grid-cols-1 gap-3">
            <button className="w-full py-3.5 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 rounded-xl flex items-center justify-center gap-3 transition duration-300 group">
              <svg className="h-4 w-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.64 24.55c0-1.65-.15-3.23-.42-4.75H24v9.01h12.7c-.55 2.87-2.22 5.3-4.66 6.91l7.26 5.64C43.54 37.07 46.64 31.42 46.64 24.55z"/>
                <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.26-5.64c-2.2.14-4.61.34-6.85.34-6.13 0-11.45-4.13-13.31-9.71l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="text-sm font-medium text-white/80 group-hover:text-white transition">Continue with Google</span>
            </button>
          </div>
        </motion.div>

        {/* Footer Link */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mt-8 text-sm text-white/40 font-medium"
        >
          New to SCANZA AI?{" "}
          <Link 
            to="/register" 
            className="relative inline-flex items-center gap-1 group overflow-hidden px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-300"
          >
            <span className="relative z-10 font-bold">Create an account</span>
            <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.p>
      </div>
    </div>
  );
};

export default Login;