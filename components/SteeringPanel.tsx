"use client";
import type { Policy } from "@/lib/types";

const PRIORITIES: { key: keyof Policy["weights"]; label: string; hint: string }[] = [
  { key: "geo", label: "Avoid distance / transit risk", hint: "favor shorter, safer lanes" },
  { key: "compliance", label: "Compliance strictness", hint: "weight sanctioned-region exposure" },
  { key: "cost", label: "Minimize cost", hint: "penalize long, expensive routes" },
  { key: "speed", label: "Prioritize speed", hint: "penalize slow lead times" },
];

export function SteeringPanel({
  policy,
  setPolicy,
  constraint,
  setConstraint,
  onApplyConstraint,
  canSteer,
  busy,
}: {
  policy: Policy;
  setPolicy: (p: Policy) => void;
  constraint: string;
  setConstraint: (s: string) => void;
  onApplyConstraint: () => void;
  canSteer: boolean;
  busy: boolean;
}) {
  function setWeight(key: keyof Policy["weights"], value: number) {
    setPolicy({ ...policy, weights: { ...policy.weights, [key]: value } });
  }
  function setReview(value: number) {
    setPolicy({ ...policy, thresholds: { ...policy.thresholds, reviewAbove: value } });
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-edge">
        <span className="font-display font-semibold text-sm tracking-wide">Steering</span>
        <p className="text-[11px] text-muted mt-0.5">
          Re-prioritize and routes re-rank instantly — no model call.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Routing priorities</div>
          {PRIORITIES.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-xs mb-1">
                <span title={p.hint}>{p.label}</span>
                <span className="font-mono text-accent tabular-nums">
                  {policy.weights[p.key].toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={policy.weights[p.key]}
                onChange={(e) => setWeight(p.key, parseFloat(e.target.value))}
                disabled={!canSteer}
                className="w-full"
                aria-label={p.label}
              />
            </div>
          ))}
        </div>

        <div className="pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">Review threshold</span>
            <span className="font-mono text-warn tabular-nums">{policy.thresholds.reviewAbove}</span>
          </div>
          <input
            type="range"
            min={30}
            max={80}
            step={1}
            value={policy.thresholds.reviewAbove}
            onChange={(e) => setReview(parseInt(e.target.value))}
            disabled={!canSteer}
            className="w-full"
            aria-label="Review threshold"
          />
          <p className="text-[11px] text-muted mt-1">
            Routes scoring above this get flagged for a human.
          </p>
        </div>

        <div className="pt-2 border-t border-edge">
          <label className="text-[11px] uppercase tracking-wider text-muted">
            Constraint (re-runs specialists)
          </label>
          <textarea
            value={constraint}
            onChange={(e) => setConstraint(e.target.value)}
            disabled={!canSteer}
            placeholder='e.g. "Never route expedites over 8,000 km"'
            rows={2}
            className="mt-1 w-full rounded-lg bg-panel2 border border-edge px-3 py-2 text-sm text-ink placeholder:text-muted/70 resize-none focus:border-accent"
          />
          <button
            onClick={onApplyConstraint}
            disabled={!canSteer || busy}
            className="mt-2 w-full rounded-lg bg-accent/15 border border-accent/40 text-accent font-medium text-sm py-2 hover:bg-accent/25 disabled:opacity-40 transition-colors"
          >
            {busy ? "Re-evaluating…" : "Apply & re-run"}
          </button>
        </div>
      </div>
    </div>
  );
}
