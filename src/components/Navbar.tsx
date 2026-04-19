import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { smoothScrollToId } from "../lib/smoothScroll";

type Props = {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

type NavLink = {
  label: string;
  section?: string;   // scroll-to id on home page
  to?: string;        // hard route (non-home pages)
};

const links: NavLink[] = [
  { label: "Features", section: "features" },
  { label: "Pricing",  section: "pricing"  },
  { label: "FAQ",      section: "faq"      },
  { label: "Contact",  to: "/contact"      },
];

// Use the shared eased smooth-scroll helper (accounts for sticky navbar offset)
const scrollToId = smoothScrollToId;

export default function Navbar({ mobileOpen, setMobileOpen }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  function handleNavClick(link: NavLink) {
    setMobileOpen(false);
    if (link.to) {
      navigate(link.to);
      return;
    }
    if (link.section) {
      // If already on home page just scroll
      if (location.pathname === "/") {
        scrollToId(link.section);
      } else {
        // Navigate home first, then scroll after the page renders
        navigate("/");
        setTimeout(() => scrollToId(link.section!), 220);
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-[#020204]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.08 }}
            transition={{ duration: 0.5 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-purple-500 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/60 transition-shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-900" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15a2 2 0 0 1 2-2h11l3 3v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </motion.div>
          <span className="text-lg font-bold tracking-tight text-white">
            SCANZA <span className="text-emerald-400 group-hover:text-purple-400 transition-colors duration-300">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul
          className="relative hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {links.map((l, idx) => (
            <li
              key={l.label}
              className="relative"
              onMouseEnter={() => setHoveredIndex(idx)}
            >
              <button
                onClick={() => handleNavClick(l)}
                className="relative z-10 block cursor-pointer px-4 py-2 text-sm font-medium text-slate-300 transition-colors duration-300 hover:text-white"
              >
                {l.label}
              </button>

              {/* Magnetic glow background */}
              {hoveredIndex === idx && (
                <motion.span
                  layoutId="nav-hover-bg"
                  className="absolute inset-0 -z-0 rounded-lg bg-gradient-to-br from-emerald-500/15 via-white/5 to-purple-500/15 border border-white/10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              {/* Active dot indicator */}
              {hoveredIndex === idx && (
                <motion.span
                  layoutId="nav-hover-dot"
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="group relative text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign in
            <span className="absolute left-0 -bottom-0.5 h-[1.5px] w-0 bg-gradient-to-r from-emerald-400 to-purple-500 transition-all duration-300 group-hover:w-full" />
          </Link>
          <Link
            to="/register"
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.04]"
          >
            <span className="relative z-10">Get Started</span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 transition hover:border-emerald-400/50 hover:bg-white/5 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-white">
            {mobileOpen
              ? <path d="M6 6l12 12M18 6L6 18" />
              : <path d="M3 6h18M3 12h18M3 18h18" />
            }
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-white/5 px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {links.map((l, idx) => (
              <motion.li
                key={l.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={() => handleNavClick(l)}
                  className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-all hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-purple-500/10 hover:text-white hover:translate-x-1"
                >
                  <span>{l.label}</span>
                  <span className="text-emerald-400 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">→</span>
                </button>
              </motion.li>
            ))}
            <li className="pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full bg-zinc-900 border border-zinc-800 text-slate-100 py-2.5 text-center text-sm font-medium hover:bg-zinc-800 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-purple-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-lg"
              >
                Get Started
              </Link>
            </li>
          </ul>
        </motion.div>
      )}
    </header>
  );
}
