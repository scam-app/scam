"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DecisionTrace, Policy, Request } from "@/lib/types";
import { rankAndDecide } from "@/lib/routing";
import requestsData from "@/data/requests.json";
import policyData from "@/data/policy.json";
import { Queue } from "@/components/Queue";
import { Verdict } from "@/components/Verdict";
import { TracePanel } from "@/components/TracePanel";
import { WorldMap } from "@/components/WorldMap";
import { SteeringPanel } from "@/components/SteeringPanel";

const REQUESTS = requestsData as unknown as Request[];

export default function Home() {
  const [policy, setPolicy] = useState<Policy>(policyData as Policy);
  const [selected, setSelected] = useState<Request | null>(null);
  const [decision, setDecision] = useState<DecisionTrace | null>(null);
  const [constraint, setConstraint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSteer = decision !== null && decision.routes.length > 0;

  // Run a fresh decision through the API (calls the LLM specialists server-side).
  async function runFresh(req: Request, withPolicy: Policy) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: req, policy: withPolicy }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      const data: DecisionTrace = await res.json();
      setDecision(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  function onSelect(req: Request) {
    setSelected(req);
    setConstraint("");
    runFresh(req, policy);
  }

  // INSTANT re-rank on priority change — pure code, no network, no LLM.
  function onPolicyChange(next: Policy) {
    setPolicy(next);
    if (decision && decision.routes.length > 0) {
      const r = rankAndDecide(decision.routes, decision.proposedLoc, decision.qty, next);
      setDecision({
        ...decision,
        routes: r.routes,
        action: r.action,
        recommendedLoc: r.recommendedLoc,
        weightedRisk: r.weightedRisk,
        routerExplanation: r.explanation,
        trace: [
          ...decision.trace.filter((t) => t.kind !== "decide"),
          {
            kind: "decide",
            label: "router",
            detail: `${r.action} — ${r.explanation}`,
            data: { action: r.action, recommendedLoc: r.recommendedLoc },
          },
        ],
      });
    }
  }

  // Constraint changes meaning -> specialists must re-reason -> full re-run.
  function onApplyConstraint() {
    if (!selected) return;
    runFresh(selected, { ...policy, constraint });
  }

  const seededHint = useMemo(
    () => "Try REQ-003: raise 'prioritize speed' and watch it reroute.",
    []
  );

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 group">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              S<span className="text-accent">C</span>AM
            </h1>
            <span className="text-[11px] text-muted group-hover:text-ink transition-colors">
              / console
            </span>
          </Link>
          <p className="text-muted text-sm mt-1">
            Pick a request — watch it reason, then steer it.
          </p>
        </div>
        <div className="text-[11px] text-muted font-mono hidden sm:block">
          {seededHint}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-bad/40 bg-bad/10 text-bad text-sm px-4 py-2">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_1fr_300px] gap-5">
        <Queue
          requests={REQUESTS}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
        />

        <div className="space-y-5 min-w-0">
          <Verdict decision={decision} busy={busy} />
          <WorldMap decision={decision} />
          <TracePanel decision={decision} />
        </div>

        <SteeringPanel
          policy={policy}
          setPolicy={onPolicyChange}
          constraint={constraint}
          setConstraint={setConstraint}
          onApplyConstraint={onApplyConstraint}
          canSteer={canSteer}
          busy={busy}
        />
      </div>

      <footer className="mt-8 text-center text-[11px] text-muted font-mono">
        SCAM · multi-agent risk assessment · deterministic routing ·
        live steering
      </footer>
    </main>
  );
}
