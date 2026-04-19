import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BackButtonProps {
  to?: string;
  label?: string;
  showHome?: boolean;
}

/**
 * Floating back-navigation pill used on every interior page.
 * - Click "Back" → goes to previous page (or to `to` if provided)
 * - Click "Home" → returns to landing page
 */
export default function BackButton({ to, label = 'Back', showHome = true }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) navigate(to);
    else if (window.history.length > 2) navigate(-1);
    else navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-5 left-5 z-50 flex items-center gap-2"
    >
      <button
        onClick={handleBack}
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        <span>{label}</span>
      </button>

      {showHome && (
        <Link
          to="/"
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-300"
        >
          <Home size={14} />
          <span className="hidden sm:inline">Home</span>
        </Link>
      )}
    </motion.div>
  );
}
