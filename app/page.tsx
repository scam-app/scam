import Link from "next/link";

const FEATURES = [
  { title: "Sees every route", body: "Scores all candidate lanes on risk, cost, and speed — in the open.", accent: "#38BDF8" },
  { title: "Suggests the better one", body: "Flags weak routes and reroutes to the strongest available option.", accent: "#2DD4BF" },
  { title: "Stays under your command", body: "Re-prioritize and the recommendation re-ranks live — no black box.", accent: "#8B7DF6" },
];

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="max-w-[1100px] w-full mx-auto px-6 py-5 flex items-center justify-between">
        <span className="font-display text-xl font-bold tracking-tight">
          S<span className="text-accent">C</span>AM
        </span>
        <Link
          href="/console"
          className="text-sm rounded-lg border border-edge px-4 py-1.5 hover:border-accent hover:text-accent transition-colors"
        >
          Open console
        </Link>
      </nav>

      <section className="max-w-[1100px] w-full mx-auto px-6 flex-1 flex flex-col justify-center py-16">
        <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase mb-5">
          Supply-chain route intelligence
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight max-w-3xl">
          Ship the <span className="text-accent">right route</span>.
          <br />
          <span className="text-muted">Every time.</span>
        </h1>
        <p className="mt-6 text-lg text-ink/80 max-w-lg leading-relaxed">
          SCAM evaluates every shipping route for a request, blocks the risky ones,
          and recommends the best — transparently, under human command. The AI
          decision layer on top of your ERP.
        </p>
        <div className="mt-9">
          <Link
            href="/console"
            className="rounded-lg bg-accent text-bg font-semibold px-7 py-3.5 hover:brightness-110 transition inline-block"
          >
            Launch the console →
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-xl p-5">
              <span className="inline-block w-6 h-1 rounded-full mb-3" style={{ background: f.accent }} />
              <h3 className="font-display text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-edge">
        <div className="max-w-[1100px] w-full mx-auto px-6 py-5 text-[11px] text-muted font-mono">
          SCAM · candidate-route scoring · deterministic ranking · live steering
        </div>
      </footer>
    </main>
  );
}
