const features = [
  {
    title: "Buy Slots",
    desc: "Purchase slots in Kenyan Shillings. You can buy one slot or many, depending on your needs.",
    icon: (
      <path d="M3 7h18M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-13 0v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M9 11h6M9 15h4" />
    ),
    accent: "from-emerald-400/20 to-emerald-400/5 text-emerald-300",
  },
  {
    title: "Submit Your File",
    desc: "One slot is used for one check. Upload your document and submit it through the platform.",
    icon: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5M12 3v12" />
      </>
    ),
    accent: "from-cyan-400/20 to-cyan-400/5 text-cyan-300",
  },
  {
    title: "Get Both Reports",
    desc: "Once processing is complete, you receive both the AI report and the plagiarism report.",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13l2 2 4-4" />
      </>
    ),
    accent: "from-indigo-400/20 to-indigo-400/5 text-indigo-300",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            What You Get
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Clear reports. Simple process.
          </h2>
          <p className="mt-4 text-slate-300">
            SCANZA AI is focused on one clear service: buy slots, submit your file, and receive
            both Turnitin AI and plagiarism reports.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition group-hover:opacity-100 ${f.accent.split(" ").slice(0, 2).join(" ")}`} />
              <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  {f.icon}
                </svg>
              </div>
              <h3 className="relative mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
