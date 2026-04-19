const steps = [
  {
    n: "01",
    title: "Secure Account Allocations",
    desc: "Register credentials to secure priority positions instantaneously.",
  },
  {
    n: "02",
    title: "Deploy Active Vouchers",
    desc: "Purchase individual slots directly depending on your active evaluation goals.",
  },
  {
    n: "03",
    title: "Upload & Match Documents",
    desc: "Assign resources dynamically towards target diagnostic evaluations safely.",
  },
  {
    n: "04",
    title: "Receive Holistic Audits",
    desc: "Examine detailed report breakdowns compiled explicitly on command.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-20 md:py-28 select-none">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Automated Operations
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl text-white">
            Simple Procedures. Proven Accuracy.
          </h2>
        </div>

        <div className="relative mt-20">
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-zinc-800 to-transparent lg:block" />

          <ol className="space-y-12">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""}`}
              >
                <div className="relative">
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-8 hover:border-zinc-700 transition duration-500">
                    <div className="text-6xl font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.15)]">
                      {s.n}
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-400">{s.desc}</p>
                  </div>
                </div>

                <div className="relative flex justify-center">
                  <div className="relative h-32 w-32 lg:h-36 lg:w-36">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/10 blur-2xl" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-3xl font-extrabold text-emerald-400 shadow-xl">
                      {i + 1}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Important notice */}
        <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-sm border border-emerald-500/20">
              !
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Essential Protocol</div>
              <p className="mt-1.5 text-xs text-zinc-400 font-medium leading-relaxed">
                Slots provide comprehensive validations without delays. Submit assignments optimally through dedicated cloud instances immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}