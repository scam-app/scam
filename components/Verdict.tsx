"use client";
import type { DecisionTrace } from "@/lib/types";
import { actionMeta, riskColor } from "./ui";

export function Verdict({
  decision,
  busy,
}: {
  decision: DecisionTrace | null;
  busy: boolean;
}) {
  if (!decision) {
    return (
      <div className="glass rounded-xl px-6 py-8 text-center text-muted">
        Select a request to evaluate its shipping routes.
      </div>
    );
  }
  const meta = actionMeta[decision.action];
  const risk = decision.weightedRisk;
  const rec = decision.routes.find((r) => r.isRecommended);
  const proposed = decision.routes.find((r) => r.isProposed);
  const rerouted = decision.action === "REROUTE";

  return (
    <div className="glass rounded-xl p-5" style={{ borderColor: meta.border }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted">
            Routing decision
          </div>
          <div
            className="font-display text-2xl font-bold mt-1"
            style={{ color: meta.color }}
          >
            {busy ? "Re-evaluating…" : meta.label}
          </div>
          {/* recommended route line */}
          <div className="text-sm mt-2 font-mono">
            {decision.action === "BLOCKED" ? (
              <span className="text-bad">no viable route</span>
            ) : (
              <span className="text-ink/90">
                ship{" "}
                {rerouted && proposed && (
                  <span className="text-muted line-through mr-1">
                    {proposed.source?.code}
                  </span>
                )}
                <span style={{ color: meta.color }}>{rec?.source?.name}</span>
                <span className="text-muted"> → {decision.destination?.name}</span>
                {rec && (
                  <span className="text-muted">
                    {" "}· {rec.distanceKm.toLocaleString()}km · {rec.leadTimeDays}d
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {decision.action !== "BLOCKED" && (
          <div className="text-right shrink-0">
            <div className="text-[11px] uppercase tracking-widest text-muted">
              Route score
            </div>
            <div
              className="font-display text-3xl font-bold tabular-nums"
              style={{ color: riskColor(risk) }}
            >
              {risk}
            </div>
            <div className="w-32 h-1.5 rounded-full bg-edge mt-1 overflow-hidden ml-auto">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, risk)}%`, background: riskColor(risk) }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-edge text-xs font-mono text-muted">
        {decision.routerExplanation}
      </div>
      {rec && decision.action !== "BLOCKED" && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted">
          <span>score {risk} =</span>
          <span>transit {rec.metrics.geo}</span>
          <span>· compliance {rec.metrics.compliance}</span>
          <span>· cost {rec.metrics.cost}</span>
          <span>· speed {rec.metrics.speed}</span>
          <span className="text-muted/60">(weighted; lower is better)</span>
        </div>
      )}
      <div className="mt-1 text-[10px] text-muted/70 font-mono">
        bands: &lt;50 ship · ≥50 review · sanctioned / out-of-stock routes removed → blocked
      </div>
    </div>
  );
}
