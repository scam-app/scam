"use client";
import type { DecisionTrace, TraceEntry } from "@/lib/types";
import { dimensionLabel, riskColor } from "./ui";

const kindMeta: Record<TraceEntry["kind"], { tag: string; color: string }> = {
  lookup: { tag: "LOOKUP", color: "#8595AD" },
  route: { tag: "ROUTE", color: "#38BDF8" },
  specialist: { tag: "AGENT", color: "#8B7DF6" },
  decide: { tag: "DECIDE", color: "#2DD4BF" },
};

export function TracePanel({ decision }: { decision: DecisionTrace | null }) {
  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
        <span className="font-display font-semibold text-sm tracking-wide">
          Decision trace
        </span>
        <span className="text-[11px] text-muted font-mono">
          every route weighed, transparently
        </span>
      </div>

      <div className="readout p-4 space-y-1.5 overflow-y-auto max-h-[46vh]">
        {!decision && <div className="text-muted">// waiting for a request…</div>}
        {decision?.trace.map((e, i) => {
          const m = kindMeta[e.kind];
          return (
            <div
              key={`${decision.requestId}-${i}`}
              className="line-in flex gap-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="shrink-0 w-[54px] font-bold" style={{ color: m.color }}>
                {m.tag}
              </span>
              <span className="text-ink/90">
                <span className="text-accent">{e.label}</span>
                <span className="text-muted"> → </span>
                {e.detail}
              </span>
            </div>
          );
        })}
      </div>

      {decision && decision.verdicts.length > 0 && (
        <div className="border-t border-edge p-4 grid sm:grid-cols-3 gap-3">
          {decision.verdicts.map((v) => (
            <div key={v.dimension} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  {dimensionLabel[v.dimension] ?? v.dimension}
                </span>
                <span
                  className="font-display font-bold tabular-nums text-sm"
                  style={{ color: riskColor(v.score) }}
                >
                  {v.score}
                </span>
              </div>
              <div className="mt-1.5 text-[12px] text-ink/80 leading-snug">
                {v.rationale}
              </div>
              {v.evidence.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {v.evidence.slice(0, 3).map((ev, j) => (
                    <li key={j} className="text-[11px] text-muted font-mono truncate" title={ev}>
                      · {ev}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
