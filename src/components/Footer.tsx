import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { smoothScrollToId } from '../lib/smoothScroll';

type FooterLink = {
  label: string;
  section?: string; // scroll-to id on home page
  to?: string;      // react-router route
};

// Use the shared eased smooth-scroll helper (accounts for sticky navbar offset)
const scrollToId = smoothScrollToId;

// Custom brand icons (lucide-react v1.8 doesn't ship Linkedin/Instagram)
const LinkedinIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socials = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/richard-chege08/',
    icon: LinkedinIcon,
    hoverColor: 'hover:text-[#0A66C2]',
    glowColor: 'group-hover:shadow-[#0A66C2]/40',
    borderColor: 'group-hover:border-[#0A66C2]/50',
    bgGlow: 'group-hover:bg-[#0A66C2]/10',
  },
  {
    name: 'X',
    href: 'https://x.com',
    icon: XIcon,
    hoverColor: 'hover:text-white',
    glowColor: 'group-hover:shadow-white/30',
    borderColor: 'group-hover:border-white/60',
    bgGlow: 'group-hover:bg-white/10',
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com',
    icon: InstagramIcon,
    hoverColor: 'hover:text-pink-500',
    glowColor: 'group-hover:shadow-pink-500/40',
    borderColor: 'group-hover:border-pink-500/50',
    bgGlow: 'group-hover:bg-pink-500/10',
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/254727028535',
    icon: MessageCircle,
    hoverColor: 'hover:text-emerald-400',
    glowColor: 'group-hover:shadow-emerald-500/40',
    borderColor: 'group-hover:border-emerald-500/50',
    bgGlow: 'group-hover:bg-emerald-500/10',
  },
];

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleFooterNav(link: FooterLink, e: React.MouseEvent) {
    // For section anchors: navigate home if needed, then smooth-scroll
    if (link.section) {
      e.preventDefault();
      if (location.pathname === '/') {
        scrollToId(link.section);
      } else {
        navigate('/');
        setTimeout(() => scrollToId(link.section!), 220);
      }
    }
    // route links handled by <Link>'s default behaviour
  }

  const linkColumns: { title: string; links: FooterLink[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', section: 'features' },
        { label: 'Pricing',  section: 'pricing'  },
        { label: 'FAQ',      section: 'faq'      },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy',   to: '/privacy' },
        { label: 'Terms of Service', to: '/terms'   },
        { label: 'Refund Policy',    to: '/terms'   },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Us',  to: '/contact' },
        { label: 'Help Center', to: '/contact' },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-white/5 px-6 py-14 bg-[#020204] overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="group flex items-center gap-2.5 w-fit">
              <motion.div
                whileHover={{ rotate: [0, -8, 8, -4, 0] }}
                transition={{ duration: 0.5 }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-purple-500 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/60 transition-shadow"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-900" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15a2 2 0 0 1 2-2h11l3 3v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </motion.div>
              <span className="text-lg font-bold tracking-tight text-white">
                SCANZA <span className="text-emerald-400 group-hover:text-purple-400 transition-colors">AI</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-slate-400 leading-relaxed">
              Fast Turnitin AI & Plagiarism reports for students.
              Secure, instant, and professional.
            </p>

            {/* Beautiful animated social icons */}
            <div className="mt-6 flex gap-3">
              {socials.map((social, i) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      // Force open in a true top-level window so external sites
                      // (LinkedIn, WhatsApp, etc.) that send X-Frame-Options: DENY
                      // are not blocked when the app is viewed inside an iframe.
                      const w = window.open(social.href, '_blank', 'noopener,noreferrer');
                      if (!w) {
                        // Popup blocked — fall back to top-level navigation
                        window.top!.location.href = social.href;
                      }
                    }}
                    aria-label={social.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -4, scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 backdrop-blur-sm transition-all duration-300 ${social.hoverColor} ${social.borderColor} ${social.bgGlow} hover:shadow-lg ${social.glowColor}`}
                  >
                    {/* Rotating gradient ring on hover */}
                    <span className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(16,185,129,0.4), transparent, rgba(168,85,247,0.4), transparent)',
                        animation: 'spin 3s linear infinite',
                        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        padding: '1px',
                      }}
                    />
                    <Icon size={18} />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Footer link columns with hover effects */}
          {linkColumns.map((col) => (
            <div key={col.title}>
              <div className="text-sm font-semibold text-white uppercase tracking-wider">{col.title}</div>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => {
                  const sharedClass =
                    'group inline-flex items-center gap-1.5 text-slate-400 transition-all duration-300 hover:text-emerald-400 hover:translate-x-1';
                  const inner = (
                    <>
                      <span className="h-px w-0 bg-gradient-to-r from-emerald-400 to-purple-500 transition-all duration-300 group-hover:w-4" />
                      <span>{link.label}</span>
                    </>
                  );

                  return (
                    <li key={link.label}>
                      {link.to ? (
                        <Link to={link.to} className={sharedClass}>
                          {inner}
                        </Link>
                      ) : (
                        <a
                          href={`/#${link.section}`}
                          onClick={(e) => handleFooterNav(link, e)}
                          className={sharedClass}
                        >
                          {inner}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-slate-500 sm:flex-row">
          <div>© {new Date().getFullYear()} SCANZA AI. All rights reserved.</div>
          <div className="flex items-center gap-1">
            Proudly serving students in Kenya 🇰🇪
          </div>
        </div>
      </div>
    </footer>
  );
}
