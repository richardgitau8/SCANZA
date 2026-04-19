import { useState } from "react";

const faqs = [
  {
    q: "How are computations finalized?",
    a: "Evaluations complete automatically within 4 to 8 minutes. Review reports natively online at convenience.",
  },
  {
    q: "Can workloads scale independently?",
    a: "Absolutely. Acquire dynamic capacities natively with scalable integrations built-in.",
  },
  {
    q: "Are transactions monitored securely?",
    a: "Standard TLS protocols apply. Customer parameters remain locked.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  
  return (
    <section id="faq" className="relative px-6 py-20 md:py-28 select-none">
      <div className="mx-auto max-w-4xl relative z-10">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Assistance Center
          </div>
          <h2 className="mt-4 text-2xl font-black md:text-4xl text-white">
            Helpful Explanations
          </h2>
        </div>

        <div className="mt-12 space-y-3.5">
          {faqs.map((f, i) => {
            const active = open === i;
            return (
              <div
                key={f.q}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  active ? "border-emerald-500/20 bg-zinc-900/30" : "border-zinc-800 bg-zinc-950/10"
                }`}
              >
                <button
                  onClick={() => setOpen(active ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                >
                  <span className="text-sm font-bold text-zinc-200">{f.q}</span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-emerald-400 transition-transform ${
                      active ? "rotate-45" : ""
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-xs font-medium leading-relaxed text-zinc-400">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}