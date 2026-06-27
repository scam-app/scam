"use client";
import { useState } from "react";
import type { DecisionTrace, TraceEntry } from "@/lib/types";

const kindMeta: Record<TraceEntry["kind"], { tag: string; color: string }> = {
  lookup: { tag: "LOOKUP", color: "#8595AD" },
  route: { tag: "ROUTE", color: "#38BDF8" },
  specialist: { tag: "AGENT", color: "#8B7DF6" },
  decide: { tag: "DECIDE", color: "#2DD4BF" },
};

export function TracePanel({ decision }: { decision: DecisionTrace | null }) {
  const [open, setOpen] = useState(false);
  if (!decision) return null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="font-display font-semibold text-sm tracking-wide">
          Full decision trace
        </span>
        <span className="text-[11px] text-muted font-mono flex items-center gap-2">
          {decision.trace.length} steps
          <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        </span>
      </button>

      {open && (
        <div className="readout px-4 pb-4 pt-1 space-y-1.5 overflow-y-auto max-h-[40vh] border-t border-edge">
          {decision.trace.map((e, i) => {
            const m = kindMeta[e.kind];
            return (
              <div key={i} className="flex gap-3 pt-1.5">
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
      )}
    </div>
  );
}
