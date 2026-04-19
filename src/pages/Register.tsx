import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, CheckCircle2, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, RefreshCcw, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, AuthErrorCodes } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../lib/firebase';
import {
  initiateMpesaStkPush,
  waitForPaymentCompletion,
  normalizeKenyanPhone,
  type PackageId,
} from '../services/scanService';
import { subscribeToPayment } from '../services/userService';

const packages: { id: number; packageId: PackageId; name: string; tokens: number; price: number; popular: boolean }[] = [
  { id: 1, packageId: 'starter',     name: 'Starter',     tokens: 1,   price: 130,  popular: false },
  { id: 2, packageId: 'bronze',      name: 'Bronze',      tokens: 5,   price: 585,  popular: true  },
  { id: 3, packageId: 'silver',      name: 'Silver',      tokens: 10,  price: 1157, popular: false },
  { id: 4, packageId: 'gold',        name: 'Gold',        tokens: 20,  price: 2288, popular: false },
  { id: 5, packageId: 'institution', name: 'Institution', tokens: 100, price: 7800, popular: false },
];

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [paymentStage, setPaymentStage] = useState<
    'idle' | 'initiating' | 'awaiting_pin' | 'completed' | 'failed'
  >('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const paymentUnsubRef = useRef<(() => void) | null>(null);

  // Cleanup payment subscription on unmount
  useEffect(() => {
    return () => {
      paymentUnsubRef.current?.();
      paymentUnsubRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Handle pre-selected package from pricing page
    if (location.state) {
      const state = location.state as any;
      if (state.selectedPackage) {
        const pkgIndex = packages.findIndex(p => p.name === state.selectedPackage.name);
        if (pkgIndex >= 0) setSelectedPackage(pkgIndex + 1);
      }
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (signupError) setSignupError(null);
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    try {
      // 1. Validate the M-Pesa phone client-side before creating the account
      //    (so we don't end up with an orphan account if the phone is junk).
      const normalizedPhone = normalizeKenyanPhone(formData.phone);
      if (!normalizedPhone) {
        setSignupError('Enter a valid Safaricom number (e.g. 0712345678 or 254712345678).');
        setSignupLoading(false);
        return;
      }

      // 2. Create the Firebase user (this signs them in automatically — we
      //    NEED them signed in for the next step's authenticated callable).
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // 3. Cache the email so the verify-email screen has it on reload.
      localStorage.setItem('scanza_pending_email', formData.email);

      // 4. Move to step 2 — payment screen — where M-Pesa STK Push happens.
      setStep(2);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === AuthErrorCodes.EMAIL_EXISTS) {
        setSignupError('User already exists. Please sign in');
      } else if (err instanceof FirebaseError && err.code === AuthErrorCodes.WEAK_PASSWORD) {
        setSignupError('Password should be at least 6 characters');
      } else if (err instanceof FirebaseError && err.code === AuthErrorCodes.INVALID_EMAIL) {
        setSignupError('Please enter a valid email address');
      } else {
        if (import.meta.env.DEV) console.error('Firebase sign-up error:', err);
        setSignupError('Could not create your account. Please try again.');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    setPaymentStage('initiating');
    setPaymentMessage('Sending request to M-Pesa...');

    const chosen = packages[selectedPackage - 1];
    const normalizedPhone = normalizeKenyanPhone(formData.phone);

    if (!normalizedPhone) {
      setPaymentStage('failed');
      setPaymentMessage('Phone number is invalid. Go back and re-enter it.');
      setLoading(false);
      return;
    }

    // Cleanup any previous subscription
    paymentUnsubRef.current?.();
    paymentUnsubRef.current = null;

    let completedHandled = false;

    try {
      // 1. Initiate STK Push (server validates package price + phone + writes
      //    pending payment doc under /users/{uid}/payments/{apiRef}).
      const stk = await initiateMpesaStkPush(chosen.packageId, normalizedPhone);

      setPaymentStage('awaiting_pin');
      setPaymentMessage(
        `M-Pesa prompt sent to ${stk.phone}. Enter your PIN on your phone to complete the KES ${stk.amount} payment.`
      );

      // 2. Real-time subscription — webhook flips status the moment IntaSend confirms.
      const uid = auth.currentUser?.uid;
      if (uid) {
        paymentUnsubRef.current = subscribeToPayment(uid, stk.apiRef, async (p) => {
          if (!p || completedHandled) return;
          if (p.status === 'completed') {
            completedHandled = true;
            await finalizeRegistration();
          } else if (p.status === 'failed') {
            setPaymentStage('failed');
            setPaymentMessage(p.failedReason ?? 'Payment failed. Please try again.');
            setLoading(false);
          }
        });
      }

      // 3. Polling fallback in case the webhook isn't configured / is delayed.
      const final = await waitForPaymentCompletion(stk.invoiceId, stk.apiRef);
      if (!completedHandled) {
        if (final.status === 'completed') {
          completedHandled = true;
          await finalizeRegistration();
        } else if (final.status === 'failed') {
          setPaymentStage('failed');
          setPaymentMessage(final.reason ?? 'Payment failed. Please try again.');
          setLoading(false);
        } else {
          setPaymentStage('failed');
          setPaymentMessage(
            "Timed out waiting for payment confirmation. If you completed the M-Pesa prompt, your tokens will appear once you sign in."
          );
          setLoading(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setPaymentStage('failed');
      setPaymentMessage(message);
      setLoading(false);
    }
  };

  // Once the payment is confirmed, send verify email + sign out + go to success.
  const finalizeRegistration = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        try {
          await sendEmailVerification(currentUser);
        } catch (verifyErr) {
          if (import.meta.env.DEV) console.error('Failed to send verification email:', verifyErr);
        }
      }
      // Sign out so the user must verify before accessing the dashboard.
      await signOut(auth);
    } finally {
      paymentUnsubRef.current?.();
      paymentUnsubRef.current = null;
      setPaymentStage('completed');
      setPaymentMessage('Payment received! Account ready.');
      setStep(3);
      setLoading(false);
    }
  };

  const handleGoToVerify = () => {
    navigate('/verify-email', { state: { email: formData.email } });
  };

  const selectedPkg = packages[selectedPackage - 1];

  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center p-4 relative overflow-hidden antialiased select-none">
      {/* Luxury Background Glow Elements */}
      <div className="absolute top-[-25%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/15 blur-[160px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-25%] right-[-20%] w-[60%] h-[60%] bg-purple-600/15 blur-[160px] rounded-full animate-pulse duration-7000" />
      
      {/* Visual background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px] opacity-40" />

      <div className="w-full max-w-2xl relative">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-purple-600 shadow-xl shadow-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            SCANZA <span className="text-emerald-400 font-bold text-base">AI</span>
          </span>
        </Link>

        {/* Step Indicator */}
        <div className="flex justify-between mb-10 px-6 relative">
          <div className="absolute top-[18px] left-[15%] right-[15%] h-[2px] bg-zinc-800 pointer-events-none" />
          <div 
            className="absolute top-[18px] left-[15%] h-[2px] bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-500 pointer-events-none"
            style={{ width: `${(step - 1) * 35}%` }}
          />

          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                step >= s 
                  ? 'border-emerald-400 bg-black text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'border-zinc-800 bg-zinc-950 text-zinc-600'
              }`}>
                {step > s ? <CheckCircle2 size={18} className="text-emerald-400" /> : <span className="text-sm font-bold">{s}</span>}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= s ? 'text-emerald-300' : 'text-zinc-500'}`}>
                {s === 1 ? 'Account' : s === 2 ? 'Payment' : 'Complete'}
              </span>
            </div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl shadow-black relative overflow-hidden"
        >
          {/* Top Decorative Border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleNext}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-extrabold mb-2 tracking-tight">
                    Create Your Account
                  </h1>
                  <p className="text-sm text-zinc-400 font-medium">Google Cloud OAuth ready. Add keys in .env configuration.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/60" size={18} />
                      <input 
                        required
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/60" size={18} />
                      <input 
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">M-Pesa Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/60" size={18} />
                      <input 
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="254712345678"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/60" size={18} />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <input 
                        required
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Package Selection - Mandatory Minimum */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1 flex items-center gap-2">
                    Select Token Package <span className="text-emerald-400">*</span>
                  </label>
                  <p className="text-[11px] text-zinc-500">Minimum purchase required: Starter package (1 token) to activate your account.</p>
                  
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={`relative p-3 rounded-xl border transition-all duration-300 text-center ${
                          selectedPackage === pkg.id
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                            : 'border-zinc-800 bg-black/30 hover:border-zinc-700'
                        } ${pkg.popular ? 'ring-1 ring-purple-500/50' : ''}`}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-purple-500 text-[8px] font-black text-white">
                            POPULAR
                          </div>
                        )}
                        <div className="text-lg font-black text-white">{pkg.tokens}</div>
                        <div className="text-[9px] text-zinc-500 font-medium">{pkg.name}</div>
                        <div className="text-xs font-bold text-emerald-400 mt-1">KES {pkg.price}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Selected: {selectedPkg.name} ({selectedPkg.tokens} tokens)</span>
                      <span className="text-xl font-black text-emerald-400">KES {selectedPkg.price}</span>
                    </div>
                  </div>
                </div>

                {signupError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{signupError}</span>
                    {signupError.includes('already exists') && (
                      <Link to="/login" className="ml-auto text-red-200 underline font-semibold whitespace-nowrap">
                        Go to sign in
                      </Link>
                    )}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-sm font-bold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {signupLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-zinc-500">
                  Already have an account? <Link to="/login" className="text-emerald-400 hover:underline font-bold">Sign In</Link>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-extrabold mb-2 tracking-tight">
                    Complete Payment
                  </h1>
                  <p className="text-sm text-zinc-400 font-medium">M-Pesa STK push will be sent to your phone.</p>
                </div>

                {/* Order Summary */}
                <div className="p-6 rounded-2xl bg-black/40 border border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Package: {selectedPkg.name}</span>
                      <span className="text-white font-bold">{selectedPkg.tokens} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Account Email</span>
                      <span className="text-white font-bold">{formData.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">M-Pesa Number</span>
                      <span className="text-white font-bold">{formData.phone || 'Not provided'}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between">
                      <span className="text-white font-bold">Total Amount</span>
                      <span className="text-xl font-black text-emerald-400">KES {selectedPkg.price}</span>
                    </div>
                  </div>
                </div>

                {/* M-Pesa Payment Section */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-6" />
                    <span className="text-sm font-black text-emerald-400 uppercase tracking-widest">IntaSend · M-Pesa</span>
                  </div>
                  <p className="text-sm text-zinc-300 mb-2">
                    Click below to initiate the M-Pesa STK Push. You will receive a prompt on your phone — enter your PIN to complete the payment.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tokens are credited automatically the moment IntaSend confirms payment.
                  </p>
                </div>

                {paymentMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2 p-4 rounded-xl text-sm ${
                      paymentStage === 'completed'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : paymentStage === 'failed'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                        : 'bg-purple-500/10 border border-purple-500/30 text-purple-200'
                    }`}
                  >
                    {paymentStage === 'completed' ? (
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    ) : paymentStage === 'failed' ? (
                      <X size={16} className="shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCcw size={16} className="shrink-0 mt-0.5 animate-spin" />
                    )}
                    <span className="leading-relaxed">{paymentMessage}</span>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 py-4 rounded-xl border border-zinc-800 text-sm font-bold text-zinc-400 hover:bg-zinc-800/30 transition-all duration-300 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-sm font-bold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        {paymentStage === 'awaiting_pin' ? 'Waiting for PIN...' :
                         paymentStage === 'completed' ? 'Confirmed' :
                         'Sending STK Push...'}
                      </>
                    ) : (
                      `Pay KES ${selectedPkg.price} via M-Pesa`
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="text-center py-8"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
                >
                  <CheckCircle2 size={40} className="text-white" />
                </motion.div>

                <h2 className="text-3xl font-extrabold mb-3">Welcome to SCANZA AI!</h2>
                <p className="text-zinc-400 mb-2">Your account has been created successfully.</p>
                <p className="text-emerald-400 font-bold mb-2">{selectedPkg.tokens} tokens have been credited to your account.</p>
                <p className="text-zinc-400 mb-8 text-sm">
                  Please verify your email to activate your account and start scanning.
                </p>

                <button 
                  onClick={handleGoToVerify}
                  className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-sm font-bold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20"
                >
                  Verify Email & Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Google Cloud Integration Notice */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <p className="text-[10px] text-zinc-500 text-center">
            <span className="text-emerald-400 font-bold">🔐 Google Cloud OAuth Ready</span> • Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables for social authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
