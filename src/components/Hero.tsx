import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Shield, Zap, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const blob1X = useTransform(springX, [-500, 500], [-30, 30]);
  const blob1Y = useTransform(springY, [-500, 500], [-30, 30]);
  const blob2X = useTransform(springX, [-500, 500], [25, -25]);
  const blob2Y = useTransform(springY, [-500, 500], [25, -25]);
  const orbX = useTransform(springX, [-500, 500], [-15, 15]);
  const orbY = useTransform(springY, [-500, 500], [-15, 15]);

  const spotX = useTransform(springX, [-500, 500], ['30%', '70%']);
  const spotY = useTransform(springY, [-500, 500], ['30%', '70%']);

  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-28"
    >
      <div className="absolute inset-0 -z-20 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)',
          }}
        />
      </div>

      <motion.div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background: useTransform(
            [spotX, spotY],
            ([x, y]) =>
              `radial-gradient(600px circle at ${x} ${y}, rgba(16,185,129,0.15), rgba(168,85,247,0.08) 40%, transparent 70%)`
          ),
        }}
      />

      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500 via-emerald-500/30 to-purple-600/30 opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </motion.div>

      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      >
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-emerald-400/20 via-purple-500/30 to-purple-600/15 opacity-40 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
      </motion.div>

      <motion.div
        style={{ x: orbX, y: orbY }}
        className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_5px_rgba(16,185,129,0.5)]"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        style={{ x: orbX, y: orbY }}
        className="absolute right-[15%] top-[35%] h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_15px_4px_rgba(168,85,247,0.5)]"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.div
        style={{ x: orbX, y: orbY }}
        className="absolute left-[20%] bottom-[25%] h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_12px_3px_rgba(110,231,183,0.5)]"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        style={{ x: orbX, y: orbY }}
        className="absolute right-[20%] bottom-[20%] h-2 w-2 rounded-full bg-purple-300 shadow-[0_0_18px_5px_rgba(216,180,254,0.5)]"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 1.5 }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 mb-8 backdrop-blur-sm cursor-default"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="font-bold text-emerald-300">LIVE</span>
                <span>Academic Integrity Platform — Kenya</span>
              </motion.div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl xl:text-7xl"
            >
              Instant AI &amp; Plagiarism
              <br />
              <motion.span
                className="inline-block bg-gradient-to-r from-emerald-400 via-white to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto]"
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                Reports You Can Trust
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg"
            >
              Upload your document and receive accurate Turnitin AI detection and plagiarism
              results instantly. Built for students, researchers, and academic professionals who
              need fast, reliable originality checks with secure M-Pesa payments in Kenya.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link
                to="/register"
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.03] hover:brightness-110 hover:shadow-emerald-500/40 sm:w-auto"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>

              <a
                href="#pricing"
                className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 text-sm font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_16px_50px_-20px_rgba(16,185,129,0.45)] sm:w-auto"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/10 to-purple-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-500/20 to-purple-500/20 text-emerald-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="relative">View Pricing</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 grid gap-3 text-left sm:grid-cols-3"
            >
              <motion.div
                whileHover={{ y: -2, color: '#34d399' }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Secure Checks
                </div>
                <p className="text-xs leading-6 text-zinc-400">Private academic screening with trusted handling.</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2, color: '#c084fc' }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Zap className="h-4 w-4 text-purple-400" />
                  Two Reports
                </div>
                <p className="text-xs leading-6 text-zinc-400">Separate AI report and plagiarism report for each scan.</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2, color: '#34d399' }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  Kenya Support
                </div>
                <p className="text-xs leading-6 text-zinc-400">Fast WhatsApp support and M-Pesa-friendly checkout.</p>
              </motion.div>
            </motion.div>
          </div>
      </div>

      <a
        href="https://wa.me/254727028535?text=Hello%20SCANZA%20AI%20Support"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          const url = 'https://wa.me/254727028535?text=Hello%20SCANZA%20AI%20Support';
          const w = window.open(url, '_blank', 'noopener,noreferrer');
          if (!w) window.top!.location.href = url;
        }}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-110"
      >
        <MessageCircle size={26} className="text-white" />
        <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Chat on WhatsApp
        </span>
      </a>
    </section>
  );
}
