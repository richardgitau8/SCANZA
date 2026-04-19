import { useState } from "react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    slots: 1,
    price: 130,
    perSlot: "130",
    perks: ["1 Document Check", "AI Detection Report", "Plagiarism Report", "No Discount Applied"],
    highlight: false,
  },
  {
    name: "Bronze",
    slots: 5,
    price: 585,
    perSlot: "117",
    perks: [
      "5 Document Checks",
      "Dual AI + Plagiarism Reports",
      "PDF Downloads Included",
      "Save 10% on every slot",
    ],
    highlight: true,
  },
  {
    name: "Gold",
    slots: 20,
    price: 2288,
    perSlot: "114.40",
    perks: [
      "20 Document Checks",
      "Priority Processing",
      "Detailed AI + Similarity Results",
      "Save 12% on every slot",
    ],
    highlight: false,
  },
];

const formatKes = (value: number) =>
  value.toLocaleString("en-KE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export default function Pricing() {
  const [slots, setSlots] = useState(5);
  const basePrice = 130;

  const getDiscount = (s: number) => {
    if (s >= 100) return 0.4;
    if (s >= 50) return 0.25;
    if (s >= 20) return 0.12;
    if (s >= 10) return 0.11;
    if (s >= 5) return 0.1;
    return 0;
  };

  const discount = getDiscount(slots);
  const unitPrice = Number((basePrice * (1 - discount)).toFixed(2));
  const total = Number((slots * unitPrice).toFixed(2));

  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-20 select-none md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">Simple Pricing</div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">Pay As You Go</h2>
          <p className="mt-4 text-sm font-medium text-zinc-400">
            Clear token pricing for students and professionals in Kenya. Discounts increase gradually, with the
            biggest savings reserved for large-volume purchases.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative overflow-hidden rounded-3xl border p-8 transition-all duration-500 hover:border-zinc-700 ${
                p.highlight
                  ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-purple-500/5 shadow-[0_0_40px_rgba(16,185,129,0.05)]"
                  : "border-zinc-800/60 bg-zinc-900/10"
              }`}
            >
              {p.highlight && (
                <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{p.name}</div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-sm font-semibold text-zinc-400">KES</span>
                <span className="text-4xl font-extrabold tracking-tight text-white">{formatKes(p.price)}</span>
              </div>
              <div className="mt-1 text-xs font-medium text-emerald-400">@ KES {p.perSlot} per check • {p.slots} slots</div>

              <ul className="mt-8 space-y-3.5 border-t border-zinc-800/80 pt-6">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-xs font-medium text-zinc-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="mt-0.5 h-3.5 w-3.5 text-emerald-400">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                state={{ selectedPackage: p }}
                className={`mt-8 block cursor-pointer rounded-xl py-4 text-center text-xs font-bold tracking-wide transition-all duration-300 ${
                  p.highlight
                    ? "bg-gradient-to-r from-emerald-500 via-emerald-600 to-purple-600 text-white shadow-lg hover:brightness-110"
                    : "border border-zinc-800 bg-zinc-900/50 text-white hover:border-zinc-700 hover:bg-zinc-800"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <div className="relative mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/20 p-8 md:p-10">
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Custom Volume</div>
              <h3 className="mt-2 text-xl font-bold text-white">Buy Exactly What You Need</h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-400">
                Slide to select your exact number of slots. Discounts scale moderately from 5 slots upward, while
                100-slot purchases retain the full 40% discount.
              </p>

              <div className="mt-8">
                <div className="mb-3 flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <span>Slots Selected</span>
                  <span className="text-emerald-400">{slots} Slots</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={slots}
                  onChange={(e) => setSlots(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
                />
                <div className="mt-2 flex justify-between text-[10px] font-bold text-zinc-600">
                  <span>1 Slot</span>
                  <span>100 Slots</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {[5, 10, 20, 50, 100].map((tier) => (
                  <div
                    key={tier}
                    className={`rounded border px-2 py-1 text-[10px] font-bold transition ${
                      slots >= tier
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                        : "border-zinc-800 bg-zinc-800/50 text-zinc-500"
                    }`}
                  >
                    {tier}+ = Save {getDiscount(tier) * 100}%
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-black/40 p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Unit Price</span>
                  <span className="text-xs font-bold text-zinc-200">KES {formatKes(unitPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Quantity</span>
                  <span className="text-xs font-bold text-zinc-200">{slots} slots</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Discount</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {discount > 0 ? `Save ${(discount * 100).toFixed(0)}%` : "No discount"}
                  </span>
                </div>
              </div>

              <div className="my-5 border-t border-zinc-800" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">Total</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-zinc-400">KES</span>
                  <span className="text-3xl font-black text-emerald-400">{formatKes(total)}</span>
                </div>
              </div>

              <Link
                to="/register"
                state={{ customSlots: slots, customPrice: total }}
                className="mt-6 w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 py-3.5 text-center text-xs font-bold text-white shadow-xl transition-all duration-300 hover:brightness-110"
              >
                Purchase {slots} Slots
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
