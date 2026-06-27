"use client";
import type { DecisionTrace } from "@/lib/types";
import { dimensionLabel, riskColor } from "./ui";

export function SpecialistCards({ decision }: { decision: DecisionTrace | null }) {
  if (!decision || decision.verdicts.length === 0) {
    if (decision && decision.path === "fast") {
      return (
        <div className="glass rounded-xl px-5 py-4 text-sm text-muted">
          Clean optimal route — auto-approved via the fast path, no specialist panel needed.
        </div>
      );
    }
    return null;
  }
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-edge">
        <span className="font-display font-semibold text-sm tracking-wide">
          Specialist assessment
        </span>
        <span className="text-[11px] text-muted ml-2">of the recommended route</span>
      </div>
      <div className="p-4 grid sm:grid-cols-3 gap-3">
        {decision.verdicts.map((v) => (
          <div key={v.dimension} className="glass rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                {dimensionLabel[v.dimension] ?? v.dimension}
              </span>
              <span
                className="font-display font-bold tabular-nums text-lg"
                style={{ color: riskColor(v.score) }}
              >
                {v.score}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-ink/85 leading-snug">{v.rationale}</div>
            {v.evidence.length > 0 && (
              <ul className="mt-2.5 space-y-1 border-t border-edge pt-2">
                {v.evidence.slice(0, 3).map((ev, j) => (
                  <li key={j} className="text-[11px] text-muted leading-snug">
                    · {ev}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
